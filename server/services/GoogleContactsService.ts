/**
 * GOOGLE CONTACTS SERVICE
 * 
 * Handles Google Contacts (People API) operations: list, search
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

interface Contact {
  resourceName: string;
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  photoUrl?: string;
}

export class GoogleContactsService {
  private static instance: GoogleContactsService;

  private constructor() {}

  public static getInstance(): GoogleContactsService {
    if (!GoogleContactsService.instance) {
      GoogleContactsService.instance = new GoogleContactsService();
    }
    return GoogleContactsService.instance;
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
   * List contacts
   */
  public async listContacts(
    userId: string,
    pageSize: number = 50
  ): Promise<{ success: boolean; contacts?: Contact[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const people = google.people({ version: 'v1', auth: oauth2Client });

      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
      });

      const contacts: Contact[] = (response.data.connections || []).map(person => ({
        resourceName: person.resourceName || '',
        name: person.names?.[0]?.displayName,
        email: person.emailAddresses?.[0]?.value,
        phone: person.phoneNumbers?.[0]?.value,
        organization: person.organizations?.[0]?.name,
        photoUrl: person.photos?.[0]?.url,
      }));

      return { success: true, contacts };
    } catch (error: any) {
      console.error('[GOOGLE_CONTACTS] List contacts failed:', error);
      return { success: false, error: error.message || 'Failed to list contacts' };
    }
  }

  /**
   * Search contacts
   */
  public async searchContacts(
    userId: string,
    query: string
  ): Promise<{ success: boolean; contacts?: Contact[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const people = google.people({ version: 'v1', auth: oauth2Client });

      const response = await people.people.searchContacts({
        query,
        readMask: 'names,emailAddresses,phoneNumbers,organizations',
        pageSize: 20,
      });

      const contacts: Contact[] = (response.data.results || []).map(result => ({
        resourceName: result.person?.resourceName || '',
        name: result.person?.names?.[0]?.displayName,
        email: result.person?.emailAddresses?.[0]?.value,
        phone: result.person?.phoneNumbers?.[0]?.value,
        organization: result.person?.organizations?.[0]?.name,
      }));

      return { success: true, contacts };
    } catch (error: any) {
      console.error('[GOOGLE_CONTACTS] Search contacts failed:', error);
      return { success: false, error: error.message || 'Failed to search contacts' };
    }
  }
}

export const googleContactsService = GoogleContactsService.getInstance();
