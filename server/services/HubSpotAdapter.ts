/**
 * HUBSPOT API ADAPTER
 *
 * Type-safe adapter for HubSpot CRM API operations
 * Handles Contacts, Deals, Companies, and Engagements (Notes, Emails)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { hubspotOAuthService } from './HubSpotOAuthService';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// ========================================
// TYPES
// ========================================

export interface HubSpotContact {
  id?: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    website?: string;
    hs_lead_status?: string;
    [key: string]: any;
  };
}

export interface HubSpotDeal {
  id?: string;
  properties: {
    dealname?: string;
    amount?: string | number;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    hs_priority?: string;
    [key: string]: any;
  };
  associations?: {
    contacts?: string[];
    companies?: string[];
  };
}

export interface HubSpotCompany {
  id?: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    [key: string]: any;
  };
}

export interface HubSpotNote {
  properties: {
    hs_note_body: string;
    hs_timestamp?: string;
  };
  associations?: Array<{
    to: { id: string };
    types: Array<{ associationCategory: string; associationTypeId: number }>;
  }>;
}

export interface HubSpotSearchFilter {
  propertyName: string;
  operator: 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE' | 'CONTAINS' | 'NOT_CONTAINS';
  value: string | number;
}

// ========================================
// HUBSPOT ADAPTER
// ========================================

export class HubSpotAdapter {
  private userId: string;
  private client: AxiosInstance;

  constructor(userId: string) {
    this.userId = userId;

    // Create axios instance with base config
    this.client = axios.create({
      baseURL: HUBSPOT_API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Add request interceptor to inject access token
    this.client.interceptors.request.use(async (config) => {
      try {
        const accessToken = await hubspotOAuthService.getAccessToken(this.userId);
        config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
      } catch (error: any) {
        throw new Error(`Failed to get access token: ${error.message}`);
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        await this.handleError(error);
        throw error;
      }
    );
  }

  // ========================================
  // CONTACT OPERATIONS
  // ========================================

  /**
   * Create a new contact in HubSpot
   *
   * @param contactData - Contact properties
   * @returns Created contact with ID
   */
  async createContact(contactData: HubSpotContact): Promise<HubSpotContact> {
    try {
      const response = await this.client.post('/crm/v3/objects/contacts', {
        properties: contactData.properties,
      });

      await hubspotOAuthService.logUsage(this.userId, 'create_contact', 'success');

      return {
        id: response.data.id,
        properties: response.data.properties,
      };
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'create_contact', 'error', error.message);
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  /**
   * Update an existing contact
   *
   * @param contactId - HubSpot contact ID
   * @param properties - Properties to update
   * @returns Updated contact
   */
  async updateContact(contactId: string, properties: Record<string, any>): Promise<HubSpotContact> {
    try {
      const response = await this.client.patch(`/crm/v3/objects/contacts/${contactId}`, {
        properties,
      });

      await hubspotOAuthService.logUsage(this.userId, 'update_contact', 'success');

      return {
        id: response.data.id,
        properties: response.data.properties,
      };
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'update_contact', 'error', error.message);
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  /**
   * Get a contact by ID
   *
   * @param contactId - HubSpot contact ID
   * @param properties - Optional array of properties to retrieve
   * @returns Contact data
   */
  async getContact(contactId: string, properties?: string[]): Promise<HubSpotContact> {
    try {
      const params: any = {};
      if (properties && properties.length > 0) {
        params.properties = properties.join(',');
      }

      const response = await this.client.get(`/crm/v3/objects/contacts/${contactId}`, { params });

      await hubspotOAuthService.logUsage(this.userId, 'get_contact', 'success');

      return {
        id: response.data.id,
        properties: response.data.properties,
      };
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'get_contact', 'error', error.message);
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }

  /**
   * Search contacts with filters
   *
   * @param filters - Array of filters
   * @param limit - Maximum number of results (default: 100)
   * @returns Array of contacts
   */
  async searchContacts(filters: HubSpotSearchFilter[], limit: number = 100): Promise<HubSpotContact[]> {
    try {
      const response = await this.client.post('/crm/v3/objects/contacts/search', {
        filterGroups: [
          {
            filters: filters.map((filter) => ({
              propertyName: filter.propertyName,
              operator: filter.operator,
              value: filter.value,
            })),
          },
        ],
        limit,
      });

      await hubspotOAuthService.logUsage(this.userId, 'search_contacts', 'success');

      return response.data.results.map((contact: any) => ({
        id: contact.id,
        properties: contact.properties,
      }));
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'search_contacts', 'error', error.message);
      throw new Error(`Failed to search contacts: ${error.message}`);
    }
  }

  // ========================================
  // DEAL OPERATIONS
  // ========================================

  /**
   * Create a new deal in HubSpot
   *
   * @param dealData - Deal properties and associations
   * @returns Created deal with ID
   */
  async createDeal(dealData: HubSpotDeal): Promise<HubSpotDeal> {
    try {
      const payload: any = {
        properties: dealData.properties,
      };

      // Add associations if provided
      if (dealData.associations) {
        payload.associations = [];

        if (dealData.associations.contacts && dealData.associations.contacts.length > 0) {
          dealData.associations.contacts.forEach((contactId) => {
            payload.associations.push({
              to: { id: contactId },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 3, // Deal to Contact association
                },
              ],
            });
          });
        }

        if (dealData.associations.companies && dealData.associations.companies.length > 0) {
          dealData.associations.companies.forEach((companyId) => {
            payload.associations.push({
              to: { id: companyId },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 5, // Deal to Company association
                },
              ],
            });
          });
        }
      }

      const response = await this.client.post('/crm/v3/objects/deals', payload);

      await hubspotOAuthService.logUsage(this.userId, 'create_deal', 'success');

      return {
        id: response.data.id,
        properties: response.data.properties,
      };
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'create_deal', 'error', error.message);
      throw new Error(`Failed to create deal: ${error.message}`);
    }
  }

  /**
   * Update an existing deal
   *
   * @param dealId - HubSpot deal ID
   * @param properties - Properties to update
   * @returns Updated deal
   */
  async updateDeal(dealId: string, properties: Record<string, any>): Promise<HubSpotDeal> {
    try {
      const response = await this.client.patch(`/crm/v3/objects/deals/${dealId}`, {
        properties,
      });

      await hubspotOAuthService.logUsage(this.userId, 'update_deal', 'success');

      return {
        id: response.data.id,
        properties: response.data.properties,
      };
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'update_deal', 'error', error.message);
      throw new Error(`Failed to update deal: ${error.message}`);
    }
  }

  /**
   * Get a deal by ID
   *
   * @param dealId - HubSpot deal ID
   * @param properties - Optional array of properties to retrieve
   * @returns Deal data
   */
  async getDeal(dealId: string, properties?: string[]): Promise<HubSpotDeal> {
    try {
      const params: any = {};
      if (properties && properties.length > 0) {
        params.properties = properties.join(',');
      }

      const response = await this.client.get(`/crm/v3/objects/deals/${dealId}`, { params });

      await hubspotOAuthService.logUsage(this.userId, 'get_deal', 'success');

      return {
        id: response.data.id,
        properties: response.data.properties,
      };
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'get_deal', 'error', error.message);
      throw new Error(`Failed to get deal: ${error.message}`);
    }
  }

  // ========================================
  // ENGAGEMENT OPERATIONS (Notes, Emails)
  // ========================================

  /**
   * Add a note to a contact
   *
   * @param contactId - HubSpot contact ID
   * @param noteText - Note content
   * @returns Created note ID
   */
  async addNoteToContact(contactId: string, noteText: string): Promise<string> {
    try {
      const response = await this.client.post('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: noteText,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 202, // Note to Contact association
              },
            ],
          },
        ],
      });

      await hubspotOAuthService.logUsage(this.userId, 'add_note', 'success');

      return response.data.id;
    } catch (error: any) {
      await hubspotOAuthService.logUsage(this.userId, 'add_note', 'error', error.message);
      throw new Error(`Failed to add note: ${error.message}`);
    }
  }

  // ========================================
  // ERROR HANDLING
  // ========================================

  /**
   * Handle API errors with retry logic and logging
   */
  private async handleError(error: AxiosError) {
    if (error.response) {
      const statusCode = error.response.status;
      const data: any = error.response.data;

      // Log rate limiting
      if (statusCode === 429) {
        await hubspotOAuthService.logUsage(this.userId, 'api_call', 'rate_limited', 'HubSpot API rate limit exceeded');
        console.error('[HUBSPOT_ADAPTER] Rate limit exceeded:', data);
      }

      // Log authentication errors
      if (statusCode === 401 || statusCode === 403) {
        await hubspotOAuthService.logUsage(this.userId, 'api_call', 'error', 'Authentication failed');
        console.error('[HUBSPOT_ADAPTER] Authentication error:', data);
      }

      // Log other errors
      console.error(`[HUBSPOT_ADAPTER] API Error (${statusCode}):`, data);
    } else {
      console.error('[HUBSPOT_ADAPTER] Network error:', error.message);
    }
  }
}

/**
 * Create a HubSpot adapter instance for a user
 *
 * @param userId - User ID
 * @returns HubSpot adapter instance
 */
export function createHubSpotAdapter(userId: string): HubSpotAdapter {
  return new HubSpotAdapter(userId);
}
