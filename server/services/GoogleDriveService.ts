/**
 * GOOGLE DRIVE SERVICE
 * 
 * Handles Google Drive operations: list files, search, upload
 */

import { google } from 'googleapis';
import { getDb } from '../../lib/db/connection';
import { integrations } from '../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '../../lib/auth/oauth';
import { getProviderConfig } from '../../lib/integrations/settings';

const createOAuthClient = (clientId: string, clientSecret: string, redirectUri: string) => {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;

  private constructor() {}

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  private async getConfig(userId: string) {
    const config = await getProviderConfig(userId, 'google');
    
    if (!config && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback',
        provider: 'google'
      };
    }

    if (!config) {
      throw new Error('Google configuration not found for this user.');
    }
    return config;
  }

  private async getAccessToken(userId: string): Promise<string> {
    const db = getDb();
    
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'google'),
          eq(integrations.status, 'connected')
        )
      );

    if (!integration) {
      throw new Error('Google not connected. Please connect your Google account first.');
    }

    // Decrypt access token
    return decrypt(integration.accessToken);
  }

  /**
   * List files in Drive
   */
  public async listFiles(
    userId: string,
    options: {
      pageSize?: number;
      folderId?: string;
      mimeType?: string;
    } = {}
  ): Promise<{ success: boolean; files?: DriveFile[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      let query = 'trashed = false';
      if (options.folderId) {
        query += ` and '${options.folderId}' in parents`;
      }
      if (options.mimeType) {
        query += ` and mimeType = '${options.mimeType}'`;
      }

      const response = await drive.files.list({
        pageSize: options.pageSize || 20,
        q: query,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, parents)',
        orderBy: 'modifiedTime desc',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: file.size || undefined,
        createdTime: file.createdTime || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        iconLink: file.iconLink || undefined,
        parents: file.parents || undefined,
      }));

      return { success: true, files };
    } catch (error: any) {
      console.error('[GOOGLE_DRIVE] List files failed:', error);
      return { success: false, error: error.message || 'Failed to list files' };
    }
  }

  /**
   * Search files in Drive
   */
  public async searchFiles(
    userId: string,
    query: string,
    options: { pageSize?: number } = {}
  ): Promise<{ success: boolean; files?: DriveFile[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const response = await drive.files.list({
        pageSize: options.pageSize || 20,
        q: `name contains '${query}' and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
      });

      const files: DriveFile[] = (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
      }));

      return { success: true, files };
    } catch (error: any) {
      console.error('[GOOGLE_DRIVE] Search files failed:', error);
      return { success: false, error: error.message || 'Failed to search files' };
    }
  }

  /**
   * Get file content (for text-based files)
   */
  public async getFileContent(
    userId: string,
    fileId: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Get file metadata first
      const metadata = await drive.files.get({ fileId, fields: 'mimeType' });
      
      // For Google Docs, export as plain text
      if (metadata.data.mimeType?.includes('google-apps')) {
        const response = await drive.files.export({
          fileId,
          mimeType: 'text/plain',
        }, { responseType: 'text' });
        
        return { success: true, content: response.data as string };
      }

      // For regular files, download content
      const response = await drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'text' });

      return { success: true, content: response.data as string };
    } catch (error: any) {
      console.error('[GOOGLE_DRIVE] Get file content failed:', error);
      return { success: false, error: error.message || 'Failed to get file content' };
    }
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
