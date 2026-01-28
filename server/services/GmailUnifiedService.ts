/**
 * Gmail Unified Service
 *
 * Combines and extends GmailReaderService + GmailOAuthService functionality
 * for use with Emmie's agentic email tools.
 *
 * All methods require an authenticated userId with valid Gmail OAuth tokens.
 */

import { google, gmail_v1 } from 'googleapis';
import { getDb } from '@/lib/db/connection';
import { integrations } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { decrypt, encrypt } from '@/lib/auth/oauth';

// Types
export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  labels: string[];
  attachments?: AttachmentInfo[];
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailThread {
  id: string;
  messages: Email[];
  subject: string;
  participants: string[];
  messageCount: number;
  latestDate: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  isHtml?: boolean;
}

export interface ReplyEmailOptions {
  messageId: string;
  body: string;
  replyAll?: boolean;
}

export interface SearchOptions {
  query: string;
  maxResults?: number;
  includeBody?: boolean;
  pageToken?: string;
}

export interface InboxStats {
  unreadCount: number;
  starredCount: number;
  importantCount: number;
  totalInbox: number;
  draftsCount: number;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface TokenHealth {
  isConnected: boolean;
  isValid: boolean;
  expiresAt?: Date;
  expiresIn?: number; // seconds until expiry
  needsRefresh: boolean;
  lastRefreshed?: Date;
  refreshAttempts: number;
  lastError?: string;
}

// Token refresh tracking per user
interface TokenRefreshState {
  lastRefreshAttempt?: Date;
  refreshAttempts: number;
  lastError?: string;
  consecutiveFailures: number;
}

export class GmailUnifiedService {
  private static instance: GmailUnifiedService;

  // Token refresh state tracking per user
  private tokenStates: Map<string, TokenRefreshState> = new Map();

  // Token refresh thresholds
  private static readonly TOKEN_REFRESH_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry
  private static readonly MAX_CONSECUTIVE_FAILURES = 3;
  private static readonly REFRESH_COOLDOWN_MS = 60000; // 1 minute between refresh attempts

  private constructor() {}

  public static getInstance(): GmailUnifiedService {
    if (!GmailUnifiedService.instance) {
      GmailUnifiedService.instance = new GmailUnifiedService();
    }
    return GmailUnifiedService.instance;
  }

  // ============================================================
  // Connection & Authentication
  // ============================================================

  /**
   * Get Gmail OAuth connection for a user
   */
  private async getConnection(userId: string) {
    const db = getDb();

    const [connection] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'google'),
          or(
            eq(integrations.service, 'gmail'),
            eq(integrations.service, 'all')
          ),
          eq(integrations.status, 'connected')
        )
      )
      .limit(1);

    return connection;
  }

  /**
   * Check if user has Gmail connected
   */
  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.getConnection(userId);
    return !!connection;
  }

  /**
   * Get token health status for a user
   * Returns detailed information about token expiry and refresh state
   */
  async getTokenHealth(userId: string): Promise<TokenHealth> {
    const connection = await this.getConnection(userId);
    const tokenState = this.tokenStates.get(userId) || {
      refreshAttempts: 0,
      consecutiveFailures: 0,
    };

    if (!connection) {
      return {
        isConnected: false,
        isValid: false,
        needsRefresh: false,
        refreshAttempts: 0,
      };
    }

    const now = new Date();
    const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : undefined;
    const expiresIn = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      : undefined;

    const needsRefresh = expiresIn !== undefined &&
      expiresIn < GmailUnifiedService.TOKEN_REFRESH_BUFFER_SECONDS;

    const isValid = !needsRefresh || !!connection.refreshToken;

    return {
      isConnected: true,
      isValid,
      expiresAt,
      expiresIn,
      needsRefresh,
      lastRefreshed: tokenState.lastRefreshAttempt,
      refreshAttempts: tokenState.refreshAttempts,
      lastError: tokenState.lastError,
    };
  }

  /**
   * Proactively refresh token if it's close to expiry
   * Returns true if token was refreshed, false if refresh wasn't needed
   */
  async proactiveTokenRefresh(userId: string): Promise<{ refreshed: boolean; error?: string }> {
    const health = await this.getTokenHealth(userId);

    if (!health.isConnected) {
      return { refreshed: false, error: 'Gmail nicht verbunden' };
    }

    if (!health.needsRefresh) {
      return { refreshed: false }; // Token is still valid
    }

    const tokenState = this.tokenStates.get(userId) || {
      refreshAttempts: 0,
      consecutiveFailures: 0,
    };

    // Check cooldown
    if (tokenState.lastRefreshAttempt) {
      const timeSinceLastAttempt = Date.now() - tokenState.lastRefreshAttempt.getTime();
      if (timeSinceLastAttempt < GmailUnifiedService.REFRESH_COOLDOWN_MS) {
        return {
          refreshed: false,
          error: `Bitte warten (${Math.ceil((GmailUnifiedService.REFRESH_COOLDOWN_MS - timeSinceLastAttempt) / 1000)}s)`,
        };
      }
    }

    // Check consecutive failures
    if (tokenState.consecutiveFailures >= GmailUnifiedService.MAX_CONSECUTIVE_FAILURES) {
      return {
        refreshed: false,
        error: 'Zu viele fehlgeschlagene Versuche. Bitte Gmail neu verbinden.',
      };
    }

    try {
      const connection = await this.getConnection(userId);
      if (!connection || !connection.refreshToken) {
        return { refreshed: false, error: 'Kein Refresh-Token vorhanden' };
      }

      // Update state before attempt
      tokenState.lastRefreshAttempt = new Date();
      tokenState.refreshAttempts++;
      this.tokenStates.set(userId, tokenState);

      await this.refreshAccessToken(connection);

      // Reset consecutive failures on success
      tokenState.consecutiveFailures = 0;
      tokenState.lastError = undefined;
      this.tokenStates.set(userId, tokenState);

      console.log(`[GMAIL_UNIFIED] Proactive token refresh successful for user ${userId}`);
      return { refreshed: true };

    } catch (error: any) {
      tokenState.consecutiveFailures++;
      tokenState.lastError = error.message;
      this.tokenStates.set(userId, tokenState);

      console.error(`[GMAIL_UNIFIED] Proactive token refresh failed for user ${userId}:`, error.message);
      return { refreshed: false, error: error.message };
    }
  }

  /**
   * Reset token state for a user (call after re-authentication)
   */
  resetTokenState(userId: string): void {
    this.tokenStates.delete(userId);
  }

  /**
   * Create authenticated Gmail client
   */
  private async createGmailClient(userId: string): Promise<gmail_v1.Gmail> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new Error('Gmail nicht verbunden. Bitte verbinde Gmail in den Integrationen.');
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decrypt(connection.accessToken);
      if (!accessToken) {
        throw new Error('Token konnte nicht entschlüsselt werden');
      }
    } catch (error) {
      console.error('[GMAIL_UNIFIED] Token decryption failed:', error);
      throw new Error('Gmail-Token ungültig. Bitte verbinde Gmail neu.');
    }

    // Check if token is expired or close to expiry
    const now = new Date();
    const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : null;
    const needsRefresh = expiresAt &&
      (expiresAt.getTime() - now.getTime()) < (GmailUnifiedService.TOKEN_REFRESH_BUFFER_SECONDS * 1000);

    if (needsRefresh) {
      if (!connection.refreshToken) {
        throw new Error('Gmail-Token abgelaufen. Bitte verbinde Gmail neu.');
      }

      // Get or initialize token state
      const tokenState = this.tokenStates.get(userId) || {
        refreshAttempts: 0,
        consecutiveFailures: 0,
      };

      // Check if we've hit max consecutive failures
      if (tokenState.consecutiveFailures >= GmailUnifiedService.MAX_CONSECUTIVE_FAILURES) {
        throw new Error('Gmail-Token konnte nicht erneuert werden (zu viele Versuche). Bitte verbinde Gmail neu.');
      }

      try {
        // Track refresh attempt
        tokenState.lastRefreshAttempt = new Date();
        tokenState.refreshAttempts++;
        this.tokenStates.set(userId, tokenState);

        accessToken = await this.refreshAccessToken(connection);

        // Reset failures on success
        tokenState.consecutiveFailures = 0;
        tokenState.lastError = undefined;
        this.tokenStates.set(userId, tokenState);

        console.log(`[GMAIL_UNIFIED] Token refreshed for user ${userId} (attempt ${tokenState.refreshAttempts})`);
      } catch (error: any) {
        // Track failure
        tokenState.consecutiveFailures++;
        tokenState.lastError = error.message;
        this.tokenStates.set(userId, tokenState);

        console.error(`[GMAIL_UNIFIED] Token refresh failed for user ${userId}:`, error.message);
        throw new Error('Gmail-Token konnte nicht erneuert werden. Bitte verbinde Gmail neu.');
      }
    }

    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(connection: any): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    const refreshToken = decrypt(connection.refreshToken);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Token refresh failed');
    }

    // Update stored token
    const db = getDb();
    await db
      .update(integrations)
      .set({
        accessToken: encrypt(credentials.access_token),
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600000),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, connection.id));

    return credentials.access_token;
  }

  // ============================================================
  // Email Reading Operations
  // ============================================================

  /**
   * Search emails
   */
  async searchEmails(userId: string, options: SearchOptions): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);
      const { query, maxResults = 10, includeBody = false } = options;

      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: Math.min(maxResults, 50),
      });

      const messages = listResponse.data.messages || [];

      if (messages.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Keine Emails gefunden für: "${query}"`,
        };
      }

      // Fetch message details
      const emails: Email[] = [];
      for (const msg of messages) {
        try {
          const email = await this.fetchEmailDetails(
            gmail,
            msg.id!,
            includeBody ? 'full' : 'metadata'
          );
          emails.push(email);
        } catch (err) {
          console.error(`[GMAIL_UNIFIED] Failed to fetch message ${msg.id}:`, err);
        }
      }

      return {
        success: true,
        data: emails,
        summary: `${emails.length} Email(s) gefunden für: "${query}"`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Search failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Suche fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Read a specific email
   */
  async getEmail(userId: string, messageId: string, includeAttachments = false): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);
      const email = await this.fetchEmailDetails(gmail, messageId, 'full');

      // Fetch attachments if requested
      if (includeAttachments && email.attachments && email.attachments.length > 0) {
        // Attachment data can be fetched separately if needed
      }

      return {
        success: true,
        data: email,
        summary: `Email gelesen: "${email.subject}" von ${email.from}`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Get email failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Email konnte nicht gelesen werden: ${error.message}`,
      };
    }
  }

  /**
   * Get a complete email thread
   */
  async getThread(userId: string, threadId: string): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      const threadResponse = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      const thread = threadResponse.data;
      const messages: Email[] = [];
      const participants = new Set<string>();

      for (const msg of thread.messages || []) {
        const email = this.parseMessage(msg);
        messages.push(email);
        participants.add(email.from);
        if (email.to) participants.add(email.to);
      }

      const emailThread: EmailThread = {
        id: thread.id!,
        messages,
        subject: messages[0]?.subject || '(Kein Betreff)',
        participants: Array.from(participants),
        messageCount: messages.length,
        latestDate: messages[messages.length - 1]?.date || '',
      };

      return {
        success: true,
        data: emailThread,
        summary: `Thread geladen: "${emailThread.subject}" (${emailThread.messageCount} Nachrichten)`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Get thread failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Thread konnte nicht geladen werden: ${error.message}`,
      };
    }
  }

  /**
   * Get inbox statistics
   */
  async getStats(userId: string): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      // Parallel queries for different stats
      const [unreadRes, starredRes, importantRes, inboxRes, draftsRes] = await Promise.all([
        gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 1 }),
        gmail.users.messages.list({ userId: 'me', q: 'is:starred', maxResults: 1 }),
        gmail.users.messages.list({ userId: 'me', q: 'is:important', maxResults: 1 }),
        gmail.users.messages.list({ userId: 'me', q: 'in:inbox', maxResults: 1 }),
        gmail.users.drafts.list({ userId: 'me', maxResults: 1 }),
      ]);

      const stats: InboxStats = {
        unreadCount: unreadRes.data.resultSizeEstimate || 0,
        starredCount: starredRes.data.resultSizeEstimate || 0,
        importantCount: importantRes.data.resultSizeEstimate || 0,
        totalInbox: inboxRes.data.resultSizeEstimate || 0,
        draftsCount: draftsRes.data.drafts?.length || 0,
      };

      return {
        success: true,
        data: stats,
        summary: `Postfach: ${stats.unreadCount} ungelesen, ${stats.starredCount} markiert, ${stats.totalInbox} gesamt`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Get stats failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Statistiken konnten nicht abgerufen werden: ${error.message}`,
      };
    }
  }

  // ============================================================
  // Email Sending Operations
  // ============================================================

  /**
   * Send a new email
   */
  async sendEmail(userId: string, options: SendEmailOptions): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      const message = this.createEmailMessage(options);

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      return {
        success: true,
        data: {
          messageId: response.data.id,
          threadId: response.data.threadId,
        },
        summary: `Email gesendet an ${options.to}: "${options.subject}"`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Send email failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Email konnte nicht gesendet werden: ${error.message}`,
      };
    }
  }

  /**
   * Reply to an email
   */
  async replyToEmail(userId: string, options: ReplyEmailOptions): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      // Get the original message for thread context
      const originalResult = await this.getEmail(userId, options.messageId);
      if (!originalResult.success || !originalResult.data) {
        return {
          success: false,
          error: 'Original-Email nicht gefunden',
          summary: 'Antwort fehlgeschlagen: Original-Email nicht gefunden',
        };
      }

      const original = originalResult.data as Email;

      // Build reply
      const replyTo = options.replyAll ? original.to : original.from;
      const subject = original.subject.startsWith('Re:')
        ? original.subject
        : `Re: ${original.subject}`;

      const message = this.createEmailMessage({
        to: replyTo,
        subject,
        body: options.body,
        isHtml: true,
      });

      // Add thread headers
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
          threadId: original.threadId,
        },
      });

      return {
        success: true,
        data: {
          messageId: response.data.id,
          threadId: response.data.threadId,
        },
        summary: `Antwort gesendet an ${replyTo}`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Reply failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Antwort konnte nicht gesendet werden: ${error.message}`,
      };
    }
  }

  /**
   * Create a draft
   */
  async createDraft(userId: string, options: SendEmailOptions): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      const message = this.createEmailMessage(options);

      const response = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: message,
          },
        },
      });

      return {
        success: true,
        data: {
          draftId: response.data.id,
          messageId: response.data.message?.id,
        },
        summary: `Entwurf erstellt: "${options.subject}" an ${options.to}`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Create draft failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Entwurf konnte nicht erstellt werden: ${error.message}`,
      };
    }
  }

  // ============================================================
  // Email Management Operations
  // ============================================================

  /**
   * Archive an email (remove INBOX label)
   */
  async archiveEmail(userId: string, messageId: string): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });

      return {
        success: true,
        data: { messageId },
        summary: 'Email archiviert',
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Archive failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Archivieren fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Move email to trash
   */
  async trashEmail(userId: string, messageId: string): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      await gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
      });

      return {
        success: true,
        data: { messageId },
        summary: 'Email in Papierkorb verschoben',
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Trash failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Löschen fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Modify email labels
   */
  async modifyLabels(
    userId: string,
    messageId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: addLabels || [],
          removeLabelIds: removeLabels || [],
        },
      });

      const actions: string[] = [];
      if (addLabels?.length) actions.push(`+${addLabels.join(', ')}`);
      if (removeLabels?.length) actions.push(`-${removeLabels.join(', ')}`);

      return {
        success: true,
        data: { messageId, addLabels, removeLabels },
        summary: `Labels geändert: ${actions.join(' ')}`,
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Modify labels failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Labels ändern fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Mark email as read or unread
   */
  async markAsRead(userId: string, messageId: string, read: boolean): Promise<ToolResult> {
    try {
      const gmail = await this.createGmailClient(userId);

      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: read
          ? { removeLabelIds: ['UNREAD'] }
          : { addLabelIds: ['UNREAD'] },
      });

      return {
        success: true,
        data: { messageId, read },
        summary: read ? 'Als gelesen markiert' : 'Als ungelesen markiert',
      };
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Mark as read failed:', error);
      return {
        success: false,
        error: error.message,
        summary: `Markieren fehlgeschlagen: ${error.message}`,
      };
    }
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Fetch email details from Gmail API
   */
  private async fetchEmailDetails(
    gmail: gmail_v1.Gmail,
    messageId: string,
    format: 'full' | 'metadata' = 'metadata'
  ): Promise<Email> {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format,
      metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date'],
    });

    return this.parseMessage(response.data);
  }

  /**
   * Parse Gmail API message to Email object
   */
  private parseMessage(msg: gmail_v1.Schema$Message): Email {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const labels = msg.labelIds || [];

    let body = '';
    let bodyHtml = '';
    if (msg.payload) {
      const extracted = this.extractBody(msg.payload);
      body = extracted.text;
      bodyHtml = extracted.html;
    }

    // Extract attachments info
    const attachments: AttachmentInfo[] = [];
    if (msg.payload?.parts) {
      for (const part of msg.payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
          });
        }
      }
    }

    return {
      id: msg.id!,
      threadId: msg.threadId!,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc') || undefined,
      bcc: getHeader('Bcc') || undefined,
      subject: getHeader('Subject') || '(Kein Betreff)',
      snippet: msg.snippet || '',
      body,
      bodyHtml,
      date: getHeader('Date'),
      isUnread: labels.includes('UNREAD'),
      isStarred: labels.includes('STARRED'),
      isImportant: labels.includes('IMPORTANT'),
      labels,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  /**
   * Extract body from message payload
   */
  private extractBody(payload: gmail_v1.Schema$MessagePart): { text: string; html: string } {
    let text = '';
    let html = '';

    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/html') {
        html = decoded;
        text = decoded.replace(/<[^>]*>/g, '').trim();
      } else {
        text = decoded;
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data && !text) {
          text = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body?.data && !html) {
          html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          if (!text) {
            text = html.replace(/<[^>]*>/g, '').trim();
          }
        }
        if (part.parts) {
          const nested = this.extractBody(part);
          if (!text && nested.text) text = nested.text;
          if (!html && nested.html) html = nested.html;
        }
      }
    }

    return { text, html };
  }

  /**
   * Create RFC 2822 formatted email message
   */
  private createEmailMessage(options: SendEmailOptions): string {
    const lines = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
    ];

    if (options.cc) {
      lines.push(`Cc: ${options.cc}`);
    }

    if (options.bcc) {
      lines.push(`Bcc: ${options.bcc}`);
    }

    if (options.replyTo) {
      lines.push(`Reply-To: ${options.replyTo}`);
    }

    const contentType = options.isHtml !== false
      ? 'text/html; charset=utf-8'
      : 'text/plain; charset=utf-8';

    lines.push(`Content-Type: ${contentType}`);
    lines.push('MIME-Version: 1.0');
    lines.push('');
    lines.push(options.body);

    const email = lines.join('\r\n');

    // Encode to base64url
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // ============================================================
  // Context Methods (for Emmie)
  // ============================================================

  /**
   * Get email context summary for Emmie's system prompt
   */
  async getEmailContext(userId: string, maxEmails = 10): Promise<string> {
    try {
      const isConnected = await this.isConnected(userId);
      if (!isConnected) {
        return '[Gmail nicht verbunden. Bitte verbinde Gmail in den Integrationen.]';
      }

      const searchResult = await this.searchEmails(userId, {
        query: 'in:inbox',
        maxResults: maxEmails,
        includeBody: false,
      });

      if (!searchResult.success || !searchResult.data?.length) {
        return '[Keine Emails im Posteingang gefunden.]';
      }

      const emails = searchResult.data as Email[];

      const emailSummary = emails.map((email, index) => {
        const dateStr = new Date(email.date).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return `${index + 1}. [ID: ${email.id}]
   Von: ${email.from}
   Betreff: ${email.subject}
   Datum: ${dateStr}
   Vorschau: ${email.snippet.substring(0, 120)}...
   Status: ${email.isUnread ? 'UNGELESEN' : 'Gelesen'}${email.isStarred ? ' ⭐' : ''}`;
      }).join('\n\n');

      return `=== AKTUELLE EMAILS (${emails.length}) ===\n\n${emailSummary}`;
    } catch (error: any) {
      console.error('[GMAIL_UNIFIED] Get email context failed:', error);
      return `[Fehler beim Lesen der Emails: ${error.message}]`;
    }
  }
}

// Singleton export
export const gmailUnifiedService = GmailUnifiedService.getInstance();
