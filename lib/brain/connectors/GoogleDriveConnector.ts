/**
 * Brain AI v2.0 - Google Drive Connector
 *
 * Integration for Google Drive:
 * - OAuth 2.0 authentication
 * - File listing and incremental sync
 * - Content extraction (Docs, Sheets, PDFs)
 * - Change detection via Drive API
 */

import { google, drive_v3 } from 'googleapis';
import {
  connectedSearchService,
  DocumentMetadata,
  OAuthTokens,
} from '../ConnectedSearchService';

// ============================================
// TYPES
// ============================================

export interface GoogleDriveConfig {
  syncFolders?: string[];
  includeTrashed?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  owners?: { displayName: string; emailAddress: string }[];
  permissions?: drive_v3.Schema$Permission[];
}

// Supported MIME types for content extraction
const EXTRACTABLE_TYPES = [
  'application/vnd.google-apps.document', // Google Docs
  'application/vnd.google-apps.spreadsheet', // Google Sheets
  'application/vnd.google-apps.presentation', // Google Slides
  'text/plain',
  'text/markdown',
  'text/html',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
];

// ============================================
// GOOGLE DRIVE CONNECTOR
// ============================================

export class GoogleDriveConnector {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private drive: drive_v3.Drive | null = null;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // ============================================
  // OAUTH METHODS
  // ============================================

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope || undefined,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      scope: credentials.scope,
    };
  }

  /**
   * Get user info from token
   */
  async getUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();

    return {
      email: data.email || '',
      name: data.name || '',
    };
  }

  // ============================================
  // DRIVE OPERATIONS
  // ============================================

  /**
   * Initialize Drive client with tokens
   */
  private initDrive(accessToken: string, refreshToken?: string): void {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * List files from Google Drive
   */
  async listFiles(
    accessToken: string,
    refreshToken: string | undefined,
    config: GoogleDriveConfig = {}
  ): Promise<GoogleDriveFile[]> {
    this.initDrive(accessToken, refreshToken);

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const files: GoogleDriveFile[] = [];
    let pageToken: string | undefined;

    // Build query
    const queryParts: string[] = [];

    // File type filter
    if (config.fileTypes && config.fileTypes.length > 0) {
      const mimeFilters = config.fileTypes
        .map(type => `mimeType='${type}'`)
        .join(' or ');
      queryParts.push(`(${mimeFilters})`);
    } else {
      // Default: exclude folders
      queryParts.push("mimeType != 'application/vnd.google-apps.folder'");
    }

    // Folder filter
    if (config.syncFolders && config.syncFolders.length > 0) {
      const folderFilters = config.syncFolders
        .map(folderId => `'${folderId}' in parents`)
        .join(' or ');
      queryParts.push(`(${folderFilters})`);
    }

    // Trash filter
    if (!config.includeTrashed) {
      queryParts.push('trashed = false');
    }

    const query = queryParts.join(' and ');
    const maxResults = config.maxResults || 1000;

    console.log(`[GDRIVE] Listing files with query: ${query}`);

    do {
      const response = await this.drive.files.list({
        q: query,
        pageSize: Math.min(100, maxResults - files.length),
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, parents, createdTime, modifiedTime, size, owners, permissions)',
      });

      if (response.data.files) {
        files.push(...(response.data.files as GoogleDriveFile[]));
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken && files.length < maxResults);

    console.log(`[GDRIVE] Found ${files.length} files`);

    return files;
  }

  /**
   * Get file content
   */
  async getFileContent(
    accessToken: string,
    refreshToken: string | undefined,
    fileId: string,
    mimeType: string
  ): Promise<string> {
    this.initDrive(accessToken, refreshToken);

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    try {
      // Google Workspace files need export
      if (mimeType.startsWith('application/vnd.google-apps.')) {
        return await this.exportGoogleFile(fileId, mimeType);
      }

      // Regular files - download content
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' }
      );

      return response.data as string;
    } catch (error) {
      console.error(`[GDRIVE] Failed to get content for ${fileId}:`, error);
      return '';
    }
  }

  /**
   * Export Google Workspace file to plain text
   */
  private async exportGoogleFile(fileId: string, mimeType: string): Promise<string> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    // Map Google Workspace types to export formats
    const exportMimeType =
      mimeType === 'application/vnd.google-apps.document'
        ? 'text/plain'
        : mimeType === 'application/vnd.google-apps.spreadsheet'
        ? 'text/csv'
        : mimeType === 'application/vnd.google-apps.presentation'
        ? 'text/plain'
        : 'text/plain';

    const response = await this.drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: 'text' }
    );

    return response.data as string;
  }

  /**
   * Get file path (folder hierarchy)
   */
  async getFilePath(
    accessToken: string,
    refreshToken: string | undefined,
    file: GoogleDriveFile
  ): Promise<string> {
    this.initDrive(accessToken, refreshToken);

    if (!this.drive || !file.parents || file.parents.length === 0) {
      return `/${file.name}`;
    }

    const pathParts: string[] = [file.name];
    let parentId: string | undefined = file.parents[0];

    // Walk up the folder tree (max 10 levels)
    for (let i = 0; i < 10 && parentId; i++) {
      try {
        const parentResponse: { data: { id?: string | null; name?: string | null; parents?: string[] | null } } = await this.drive.files.get({
          fileId: parentId,
          fields: 'id, name, parents',
        });

        if (parentResponse.data.name) {
          pathParts.unshift(parentResponse.data.name);
        }

        parentId = parentResponse.data.parents?.[0];
      } catch {
        break;
      }
    }

    return '/' + pathParts.join('/');
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  /**
   * Full sync from Google Drive
   */
  async syncSource(
    sourceId: string,
    accessToken: string,
    refreshToken: string | undefined,
    config: GoogleDriveConfig = {}
  ): Promise<{ indexed: number; updated: number; errors: string[] }> {
    const startTime = Date.now();

    console.log(`[GDRIVE] Starting sync for source: ${sourceId}`);

    // Update status to syncing
    await connectedSearchService.updateSyncStatus(sourceId, 'syncing');

    try {
      // List all files
      const files = await this.listFiles(accessToken, refreshToken, config);

      // Filter to extractable types
      const indexableFiles = files.filter(f =>
        EXTRACTABLE_TYPES.includes(f.mimeType)
      );

      console.log(`[GDRIVE] ${indexableFiles.length} indexable files out of ${files.length} total`);

      // Convert to DocumentMetadata
      const documents: DocumentMetadata[] = [];

      for (const file of indexableFiles) {
        try {
          const content = await this.getFileContent(
            accessToken,
            refreshToken,
            file.id,
            file.mimeType
          );

          if (!content || content.trim().length === 0) {
            continue;
          }

          const path = await this.getFilePath(accessToken, refreshToken, file);

          documents.push({
            externalId: file.id,
            externalUrl: file.webViewLink,
            externalPath: path,
            title: file.name,
            content,
            mimeType: file.mimeType,
            fileSize: file.size ? parseInt(file.size) : undefined,
            authorName: file.owners?.[0]?.displayName,
            authorEmail: file.owners?.[0]?.emailAddress,
            createdAt: file.createdTime ? new Date(file.createdTime) : undefined,
            modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
            permissions: this.mapPermissions(file.permissions),
          });
        } catch (error) {
          console.error(`[GDRIVE] Failed to process file ${file.name}:`, error);
        }
      }

      // Index documents
      const result = await connectedSearchService.indexDocuments(sourceId, documents);

      // Update status to completed
      await connectedSearchService.updateSyncStatus(sourceId, 'completed');

      const duration = Date.now() - startTime;
      console.log(`[GDRIVE] Sync completed in ${duration}ms`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GDRIVE] Sync failed:`, error);

      await connectedSearchService.updateSyncStatus(sourceId, 'failed', errorMessage);

      throw error;
    }
  }

  /**
   * Map Google Drive permissions to our format
   */
  private mapPermissions(
    permissions?: drive_v3.Schema$Permission[]
  ): Record<string, unknown> {
    if (!permissions) {
      return { isPublic: false, viewers: [], editors: [] };
    }

    const viewers: string[] = [];
    const editors: string[] = [];
    let isPublic = false;

    for (const perm of permissions) {
      if (perm.type === 'anyone') {
        isPublic = true;
        continue;
      }

      const email = perm.emailAddress;
      if (!email) continue;

      if (perm.role === 'reader' || perm.role === 'commenter') {
        viewers.push(email);
      } else if (perm.role === 'writer' || perm.role === 'owner') {
        editors.push(email);
      }
    }

    return { isPublic, viewers, editors };
  }

  /**
   * List available folders for sync configuration
   */
  async listFolders(
    accessToken: string,
    refreshToken?: string
  ): Promise<{ id: string; name: string; path?: string }[]> {
    this.initDrive(accessToken, refreshToken);

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const response = await this.drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      pageSize: 100,
      fields: 'files(id, name, parents)',
    });

    return (response.data.files || []).map(folder => ({
      id: folder.id!,
      name: folder.name!,
    }));
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const googleDriveConnector = new GoogleDriveConnector();
