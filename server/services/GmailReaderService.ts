/**
 * Gmail Reader Service
 *
 * Reads emails from user's Gmail account using the stored OAuth tokens
 * from the integrations table.
 */

import { google } from 'googleapis';
import { getDb } from '@/lib/db/connection';
import { integrations } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { decrypt } from '@/lib/auth/oauth';

interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  labels: string[];
  body?: string;
}

interface GmailReadOptions {
  maxResults?: number;
  query?: string; // Gmail search query
  includeBody?: boolean;
  onlyUnread?: boolean;
}

export class GmailReaderService {
  constructor() {}

  /**
   * Get Gmail connection for a user from the integrations table
   */
  private async getGmailConnection(userId: string) {
    console.log('[GMAIL_READER] getGmailConnection looking for userId:', userId);
    const db = getDb();

    // Look for gmail or all service with google provider
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

    console.log('[GMAIL_READER] Connection found:', connection ? 'YES' : 'NO');
    if (connection) {
      console.log('[GMAIL_READER] Connection details: provider=%s, service=%s, status=%s',
        connection.provider, connection.service, connection.status);
    }

    return connection;
  }

  /**
   * Create authenticated Gmail client
   */
  private async createGmailClient(userId: string) {
    const connection = await this.getGmailConnection(userId);

    if (!connection) {
      throw new Error('Gmail not connected. Please connect Gmail in the Integrations page.');
    }

    // Decrypt the access token
    let accessToken: string;
    try {
      accessToken = decrypt(connection.accessToken);
    } catch (error) {
      console.error('[GMAIL_READER] Failed to decrypt token:', error);
      throw new Error('Failed to decrypt Gmail token. Please reconnect Gmail.');
    }

    // Check if token is expired
    const now = new Date();
    if (connection.expiresAt && new Date(connection.expiresAt) <= now) {
      // Token expired, need to refresh
      if (!connection.refreshToken) {
        throw new Error('Gmail token expired. Please reconnect Gmail.');
      }

      try {
        const refreshedToken = await this.refreshAccessToken(connection);
        accessToken = refreshedToken;
      } catch (error) {
        console.error('[GMAIL_READER] Failed to refresh token:', error);
        throw new Error('Failed to refresh Gmail token. Please reconnect Gmail.');
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
      throw new Error('Failed to refresh access token');
    }

    // Update stored token - import encrypt from oauth
    const { encrypt } = await import('@/lib/auth/oauth');
    const db = getDb();
    await db
      .update(integrations)
      .set({
        accessToken: encrypt(credentials.access_token),
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600000),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, connection.id));

    return credentials.access_token;
  }

  /**
   * Read emails from Gmail
   */
  async readEmails(userId: string, options: GmailReadOptions = {}): Promise<Email[]> {
    const {
      maxResults = 10,
      query = '',
      includeBody = false,
      onlyUnread = false,
    } = options;

    try {
      const gmail = await this.createGmailClient(userId);

      // Build search query
      let searchQuery = query;
      if (onlyUnread) {
        searchQuery = searchQuery ? `${searchQuery} is:unread` : 'is:unread';
      }

      // List messages
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: searchQuery || undefined,
      });

      const messages = listResponse.data.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Fetch message details
      const emails: Email[] = [];

      for (const message of messages) {
        try {
          const msgResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: includeBody ? 'full' : 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });

          const msg = msgResponse.data;
          const headers = msg.payload?.headers || [];

          const getHeader = (name: string) =>
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          let body = '';
          if (includeBody && msg.payload) {
            body = this.extractBody(msg.payload);
          }

          emails.push({
            id: msg.id!,
            threadId: msg.threadId!,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            snippet: msg.snippet || '',
            date: getHeader('Date'),
            isUnread: msg.labelIds?.includes('UNREAD') || false,
            labels: msg.labelIds || [],
            body: body || undefined,
          });
        } catch (msgError) {
          console.error(`[GMAIL_READER] Failed to fetch message ${message.id}:`, msgError);
        }
      }

      return emails;
    } catch (error: any) {
      console.error('[GMAIL_READER] Failed to read emails:', error);
      throw new Error(`Failed to read emails: ${error.message}`);
    }
  }

  /**
   * Extract body from message payload
   */
  private extractBody(payload: any): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          // Strip HTML tags for a clean text version
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          return html.replace(/<[^>]*>/g, '').trim();
        }
        if (part.parts) {
          const nestedBody = this.extractBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return '';
  }

  /**
   * Check if Gmail is connected for a user
   */
  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.getGmailConnection(userId);
    return !!connection;
  }

  /**
   * Get email summary for agent context
   * Returns a formatted string suitable for injecting into system prompts
   */
  async getEmailContext(userId: string, maxEmails: number = 5): Promise<string> {
    console.log('[GMAIL_READER] getEmailContext called for userId:', userId);
    try {
      const isConnected = await this.isConnected(userId);
      console.log('[GMAIL_READER] isConnected:', isConnected);

      if (!isConnected) {
        console.log('[GMAIL_READER] User not connected to Gmail');
        return '[Gmail nicht verbunden. Der Nutzer muss Gmail in den Integrationen verbinden.]';
      }

      const emails = await this.readEmails(userId, {
        maxResults: maxEmails,
        onlyUnread: false,
      });

      if (emails.length === 0) {
        return '[Keine Emails im Posteingang gefunden.]';
      }

      const emailSummary = emails.map((email, index) => {
        const date = new Date(email.date).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return `${index + 1}. Von: ${email.from}
   Betreff: ${email.subject}
   Datum: ${date}
   Vorschau: ${email.snippet.substring(0, 150)}...
   Status: ${email.isUnread ? 'UNGELESEN' : 'Gelesen'}`;
      }).join('\n\n');

      return `=== AKTUELLE EMAILS (${emails.length}) ===\n\n${emailSummary}`;
    } catch (error: any) {
      console.error('[GMAIL_READER] Failed to get email context:', error);
      return `[Fehler beim Lesen der Emails: ${error.message}]`;
    }
  }
}

// Singleton instance
export const gmailReaderService = new GmailReaderService();
