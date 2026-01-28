/**
 * GMAIL OAUTH SERVICE
 *
 * Handles Gmail OAuth flow and email sending
 *
 * SECURITY: All tokens are encrypted at rest using AES-256-GCM.
 * The ENCRYPTION_KEY must be set in environment variables.
 */

import { google } from 'googleapis';
import { getDb } from '../../lib/db/connection';
import { oauthConnections, integrationUsage } from '../../lib/db/schema-integrations';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '../../lib/auth/oauth';

import { getProviderConfig } from '../../lib/integrations/settings';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

// Helper to create OAuth client dynamically
const createOAuthClient = (clientId: string, clientSecret: string, redirectUri: string) => {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

export class GmailOAuthService {
  // No static client in constructor
  constructor() {}

  private async getConfig(userId: string) {
    // Try 'gmail' first, then 'google' (shared)
    let config = await getProviderConfig(userId, 'gmail');
    if (!config) {
        config = await getProviderConfig(userId, 'google');
    }

    // Fallback to global env vars
    if (!config && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback',
        provider: 'gmail'
      };
    }

    if (!config) {
      throw new Error('Gmail/Google configuration not found for this user.');
    }
    return config;
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthUrl(userId: string): Promise<string> {
    const config = await this.getConfig(userId);
    const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';

    const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      state: Buffer.from(JSON.stringify({ userId, provider: 'gmail' })).toString('base64'),
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  async handleCallback(code: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getConfig(userId);
      const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';

      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        return { success: false, error: 'No access token received' };
      }

      const db = getDb();

      // Deactivate existing connections
      await db
        .update(oauthConnections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, 'gmail')
          )
        );

      // Store new connection with encrypted tokens
      await db.insert(oauthConnections).values({
        userId,
        provider: 'gmail',
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenType: tokens.token_type || 'Bearer',
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || GMAIL_SCOPES.join(' '),
        isActive: true,
        metadata: {
          // Do NOT store raw tokens in metadata
          scope: tokens.scope,
          tokenType: tokens.token_type,
        },
      });

      console.log('[GMAIL_OAUTH] Successfully connected for user:', userId);

      return { success: true };
    } catch (error: any) {
      console.error('[GMAIL_OAUTH] Callback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active OAuth connection for user
   */
  private async getConnection(userId: string) {
    const db = getDb();

    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, 'gmail'),
          eq(oauthConnections.isActive, true)
        )
      )
      .limit(1);

    return connection;
  }

  /**
   * Refresh access token if expired
   * Decrypts refresh token from storage and encrypts new access token before storing.
   */
  private async refreshAccessToken(connection: any): Promise<string> {
    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Decrypt the stored refresh token
    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = decrypt(connection.refreshToken);
      if (!decryptedRefreshToken) {
        throw new Error('Refresh token decryption returned empty value');
      }
    } catch (error: any) {
      console.error('[GMAIL_OAUTH] Refresh token decryption failed:', error.message);
      throw new Error('Gmail token invalid. Please reconnect Gmail in Integrations.');
    }

    const config = await this.getConfig(connection.userId);
    const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';
    const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

    oauth2Client.setCredentials({
      refresh_token: decryptedRefreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    // Update stored token with encrypted value
    const db = getDb();
    await db
      .update(oauthConnections)
      .set({
        accessToken: encrypt(credentials.access_token),
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, connection.id));

    return credentials.access_token;
  }

  /**
   * Get valid access token (refresh if needed)
   * Decrypts the stored token before returning.
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new Error('Gmail not connected. Please authorize first.');
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : null;

    if (expiresAt && expiresAt <= now) {
      console.log('[GMAIL_OAUTH] Token expired, refreshing...');
      return await this.refreshAccessToken(connection);
    }

    // Decrypt the stored access token
    try {
      const decryptedToken = decrypt(connection.accessToken);
      if (!decryptedToken) {
        throw new Error('Token decryption returned empty value');
      }
      return decryptedToken;
    } catch (error: any) {
      console.error('[GMAIL_OAUTH] Token decryption failed:', error.message);
      throw new Error('Gmail token invalid. Please reconnect Gmail in Integrations.');
    }
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(userId: string, options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get valid access token
      const accessToken = await this.getValidAccessToken(userId);

      // Get config to create client (needed for initialization even if we set credentials manually)
      const config = await this.getConfig(userId);
      const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

      // Set credentials
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Create Gmail client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email message
      const message = this.createEmailMessage(options);

      // Send email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      // Log usage
      const connection = await this.getConnection(userId);
      if (connection) {
        const db = getDb();
        await db.insert(integrationUsage).values({
          userId,
          connectionId: connection.id,
          provider: 'gmail',
          action: 'send_email',
          status: 'success',
          metadata: {
            to: options.to,
            subject: options.subject,
            messageId: response.data.id,
          },
        });
      }

      console.log('[GMAIL_OAUTH] Email sent:', response.data.id);

      return {
        success: true,
        messageId: response.data.id || undefined,
      };
    } catch (error: any) {
      console.error('[GMAIL_OAUTH] Send email error:', error);

      // Log error
      const connection = await this.getConnection(userId);
      if (connection) {
        const db = getDb();
        await db.insert(integrationUsage).values({
          userId,
          connectionId: connection.id,
          provider: 'gmail',
          action: 'send_email',
          status: 'error',
          errorMessage: error.message,
          metadata: {
            to: options.to,
            subject: options.subject,
          },
        });
      }

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Create RFC 2822 formatted email message
   */
  private createEmailMessage(options: EmailOptions): string {
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

    lines.push('Content-Type: text/html; charset=utf-8');
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

  /**
   * Check if user has Gmail connected
   */
  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.getConnection(userId);
    return !!connection;
  }

  /**
   * Disconnect Gmail
   */
  async disconnect(userId: string): Promise<void> {
    const db = getDb();

    await db
      .update(oauthConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, 'gmail')
        )
      );

    console.log('[GMAIL_OAUTH] Disconnected for user:', userId);
  }
}

// Singleton instance
export const gmailOAuthService = new GmailOAuthService();
