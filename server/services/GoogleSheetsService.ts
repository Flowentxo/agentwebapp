/**
 * GOOGLE SHEETS SERVICE
 * 
 * Handles Google Sheets operations: read, write, append
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

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;

  private constructor() {}

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
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

    return decrypt(integration.accessToken);
  }

  /**
   * Get spreadsheet metadata
   */
  public async getSpreadsheet(
    userId: string,
    spreadsheetId: string
  ): Promise<{ success: boolean; title?: string; sheets?: string[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.title',
      });

      const sheetNames = response.data.sheets?.map(s => s.properties?.title || '') || [];

      return {
        success: true,
        title: response.data.properties?.title || '',
        sheets: sheetNames,
      };
    } catch (error: any) {
      console.error('[GOOGLE_SHEETS] Get spreadsheet failed:', error);
      return { success: false, error: error.message || 'Failed to get spreadsheet' };
    }
  }

  /**
   * Read a range of cells
   */
  public async readRange(
    userId: string,
    spreadsheetId: string,
    range: string
  ): Promise<{ success: boolean; values?: string[][]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return {
        success: true,
        values: (response.data.values || []) as string[][],
      };
    } catch (error: any) {
      console.error('[GOOGLE_SHEETS] Read range failed:', error);
      return { success: false, error: error.message || 'Failed to read spreadsheet' };
    }
  }

  /**
   * Write values to a range
   */
  public async writeRange(
    userId: string,
    spreadsheetId: string,
    range: string,
    values: string[][]
  ): Promise<{ success: boolean; updatedCells?: number; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      console.log(`[GOOGLE_SHEETS] Updated ${response.data.updatedCells} cells`);

      return {
        success: true,
        updatedCells: response.data.updatedCells || 0,
      };
    } catch (error: any) {
      console.error('[GOOGLE_SHEETS] Write range failed:', error);
      return { success: false, error: error.message || 'Failed to write to spreadsheet' };
    }
  }

  /**
   * Append rows to a sheet
   */
  public async appendRows(
    userId: string,
    spreadsheetId: string,
    range: string,
    values: string[][]
  ): Promise<{ success: boolean; updatedRows?: number; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });

      console.log(`[GOOGLE_SHEETS] Appended ${values.length} rows`);

      return {
        success: true,
        updatedRows: values.length,
      };
    } catch (error: any) {
      console.error('[GOOGLE_SHEETS] Append rows failed:', error);
      return { success: false, error: error.message || 'Failed to append to spreadsheet' };
    }
  }
}

export const googleSheetsService = GoogleSheetsService.getInstance();
