/**
 * PHASE 8: HubSpot Adapter Implementation
 * Vollständige HubSpot CRM Integration
 */

import {
  CRMAdapter,
  CRMListOptions,
  CRMPaginatedResult,
  CRMSearchOptions,
  CRMBulkResult,
  CRMSyncResult,
  CRMError,
  registerCRMAdapter,
} from './CRMAdapter';
import { CRMContact, CRMDeal, CRMTicket } from '@/lib/agents/shared/types';

// ============================================
// HUBSPOT API TYPES
// ============================================

interface HubSpotObject {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

interface HubSpotResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
  total?: number;
}

interface HubSpotSearchResponse<T> {
  results: T[];
  total: number;
  paging?: {
    next?: {
      after: string;
    };
  };
}

// ============================================
// HUBSPOT ADAPTER
// ============================================

export class HubSpotAdapter extends CRMAdapter {
  readonly provider = 'hubspot';
  readonly version = '3.0';
  private baseUrl = 'https://api.hubapi.com';

  // ============================================
  // CONTACTS
  // ============================================

  async listContacts(options: CRMListOptions = {}): Promise<CRMPaginatedResult<CRMContact>> {
    const limit = Math.min(options.limit || 100, 100);
    const properties = options.properties || [
      'email',
      'firstname',
      'lastname',
      'phone',
      'company',
      'jobtitle',
      'lifecyclestage',
      'hs_lead_status',
      'hubspot_owner_id',
    ];

    const params = new URLSearchParams({
      limit: String(limit),
      properties: properties.join(','),
    });

    if (options.cursor) {
      params.set('after', options.cursor);
    }

    const response = await this.request<HubSpotResponse<HubSpotObject>>(
      `${this.baseUrl}/crm/v3/objects/contacts?${params}`
    );

    return {
      data: response.results.map((obj) => this.mapContact(obj)),
      hasMore: !!response.paging?.next,
      cursor: response.paging?.next?.after,
      total: response.total,
    };
  }

  async getContact(id: string): Promise<CRMContact | null> {
    try {
      const properties = [
        'email',
        'firstname',
        'lastname',
        'phone',
        'company',
        'jobtitle',
        'lifecyclestage',
        'hs_lead_status',
        'hubspot_owner_id',
      ];

      const obj = await this.request<HubSpotObject>(
        `${this.baseUrl}/crm/v3/objects/contacts/${id}?properties=${properties.join(',')}`
      );

      return this.mapContact(obj);
    } catch (error) {
      if (error instanceof CRMError && error.isNotFound) {
        return null;
      }
      throw error;
    }
  }

  async searchContacts(options: CRMSearchOptions): Promise<CRMContact[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotObject>>(
      `${this.baseUrl}/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          query: options.query,
          limit: options.limit || 10,
          properties: options.fields || [
            'email',
            'firstname',
            'lastname',
            'phone',
            'company',
          ],
        }),
      }
    );

    return response.results.map((obj) => this.mapContact(obj));
  }

  async createContact(data: Partial<CRMContact>): Promise<CRMContact> {
    const obj = await this.request<HubSpotObject>(
      `${this.baseUrl}/crm/v3/objects/contacts`,
      {
        method: 'POST',
        body: JSON.stringify({
          properties: this.unmapContact(data),
        }),
      }
    );

    return this.mapContact(obj);
  }

  async updateContact(id: string, data: Partial<CRMContact>): Promise<CRMContact> {
    const obj = await this.request<HubSpotObject>(
      `${this.baseUrl}/crm/v3/objects/contacts/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          properties: this.unmapContact(data),
        }),
      }
    );

    return this.mapContact(obj);
  }

  async deleteContact(id: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/crm/v3/objects/contacts/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async bulkCreateContacts(contacts: Partial<CRMContact>[]): Promise<CRMBulkResult> {
    const results: CRMBulkResult = { success: 0, failed: 0, errors: [] };

    // HubSpot batch limit is 100
    const batches = this.chunk(contacts, 100);

    for (const batch of batches) {
      try {
        const response = await this.request<{ results: HubSpotObject[] }>(
          `${this.baseUrl}/crm/v3/objects/contacts/batch/create`,
          {
            method: 'POST',
            body: JSON.stringify({
              inputs: batch.map((c) => ({ properties: this.unmapContact(c) })),
            }),
          }
        );
        results.success += response.results.length;
      } catch (error) {
        results.failed += batch.length;
        results.errors.push({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async bulkUpdateContacts(
    updates: Array<{ id: string; data: Partial<CRMContact> }>
  ): Promise<CRMBulkResult> {
    const results: CRMBulkResult = { success: 0, failed: 0, errors: [] };

    const batches = this.chunk(updates, 100);

    for (const batch of batches) {
      try {
        const response = await this.request<{ results: HubSpotObject[] }>(
          `${this.baseUrl}/crm/v3/objects/contacts/batch/update`,
          {
            method: 'POST',
            body: JSON.stringify({
              inputs: batch.map((u) => ({
                id: u.id,
                properties: this.unmapContact(u.data),
              })),
            }),
          }
        );
        results.success += response.results.length;
      } catch (error) {
        results.failed += batch.length;
        results.errors.push({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // ============================================
  // DEALS
  // ============================================

  async listDeals(options: CRMListOptions = {}): Promise<CRMPaginatedResult<CRMDeal>> {
    const limit = Math.min(options.limit || 100, 100);
    const properties = options.properties || [
      'dealname',
      'amount',
      'dealstage',
      'pipeline',
      'closedate',
      'hs_deal_stage_probability',
      'hubspot_owner_id',
    ];

    const params = new URLSearchParams({
      limit: String(limit),
      properties: properties.join(','),
    });

    if (options.cursor) {
      params.set('after', options.cursor);
    }

    const response = await this.request<HubSpotResponse<HubSpotObject>>(
      `${this.baseUrl}/crm/v3/objects/deals?${params}`
    );

    return {
      data: response.results.map((obj) => this.mapDeal(obj)),
      hasMore: !!response.paging?.next,
      cursor: response.paging?.next?.after,
      total: response.total,
    };
  }

  async getDeal(id: string): Promise<CRMDeal | null> {
    try {
      const properties = [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'closedate',
        'hs_deal_stage_probability',
        'hubspot_owner_id',
      ];

      const obj = await this.request<HubSpotObject>(
        `${this.baseUrl}/crm/v3/objects/deals/${id}?properties=${properties.join(',')}`
      );

      return this.mapDeal(obj);
    } catch (error) {
      if (error instanceof CRMError && error.isNotFound) {
        return null;
      }
      throw error;
    }
  }

  async searchDeals(options: CRMSearchOptions): Promise<CRMDeal[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotObject>>(
      `${this.baseUrl}/crm/v3/objects/deals/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          query: options.query,
          limit: options.limit || 10,
          properties: options.fields || ['dealname', 'amount', 'dealstage'],
        }),
      }
    );

    return response.results.map((obj) => this.mapDeal(obj));
  }

  async createDeal(data: Partial<CRMDeal>): Promise<CRMDeal> {
    const obj = await this.request<HubSpotObject>(
      `${this.baseUrl}/crm/v3/objects/deals`,
      {
        method: 'POST',
        body: JSON.stringify({
          properties: this.unmapDeal(data),
        }),
      }
    );

    return this.mapDeal(obj);
  }

  async updateDeal(id: string, data: Partial<CRMDeal>): Promise<CRMDeal> {
    const obj = await this.request<HubSpotObject>(
      `${this.baseUrl}/crm/v3/objects/deals/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          properties: this.unmapDeal(data),
        }),
      }
    );

    return this.mapDeal(obj);
  }

  async deleteDeal(id: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/crm/v3/objects/deals/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async getDealStages(): Promise<Array<{ id: string; name: string; order: number }>> {
    const pipelines = await this.getPipelines();
    const stages: Array<{ id: string; name: string; order: number }> = [];

    for (const pipeline of pipelines) {
      stages.push(...pipeline.stages);
    }

    return stages;
  }

  // ============================================
  // TICKETS
  // ============================================

  async listTickets(options: CRMListOptions = {}): Promise<CRMPaginatedResult<CRMTicket>> {
    const limit = Math.min(options.limit || 100, 100);
    const properties = options.properties || [
      'subject',
      'content',
      'hs_ticket_priority',
      'hs_pipeline_stage',
      'hs_ticket_category',
      'hubspot_owner_id',
      'createdate',
      'hs_lastmodifieddate',
    ];

    const params = new URLSearchParams({
      limit: String(limit),
      properties: properties.join(','),
    });

    if (options.cursor) {
      params.set('after', options.cursor);
    }

    const response = await this.request<HubSpotResponse<HubSpotObject>>(
      `${this.baseUrl}/crm/v3/objects/tickets?${params}`
    );

    return {
      data: response.results.map((obj) => this.mapTicket(obj)),
      hasMore: !!response.paging?.next,
      cursor: response.paging?.next?.after,
      total: response.total,
    };
  }

  async getTicket(id: string): Promise<CRMTicket | null> {
    try {
      const properties = [
        'subject',
        'content',
        'hs_ticket_priority',
        'hs_pipeline_stage',
        'hs_ticket_category',
        'hubspot_owner_id',
      ];

      const obj = await this.request<HubSpotObject>(
        `${this.baseUrl}/crm/v3/objects/tickets/${id}?properties=${properties.join(',')}`
      );

      return this.mapTicket(obj);
    } catch (error) {
      if (error instanceof CRMError && error.isNotFound) {
        return null;
      }
      throw error;
    }
  }

  async searchTickets(options: CRMSearchOptions): Promise<CRMTicket[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotObject>>(
      `${this.baseUrl}/crm/v3/objects/tickets/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          query: options.query,
          limit: options.limit || 10,
          properties: options.fields || ['subject', 'hs_ticket_priority', 'hs_pipeline_stage'],
        }),
      }
    );

    return response.results.map((obj) => this.mapTicket(obj));
  }

  async createTicket(data: Partial<CRMTicket>): Promise<CRMTicket> {
    const obj = await this.request<HubSpotObject>(
      `${this.baseUrl}/crm/v3/objects/tickets`,
      {
        method: 'POST',
        body: JSON.stringify({
          properties: this.unmapTicket(data),
        }),
      }
    );

    return this.mapTicket(obj);
  }

  async updateTicket(id: string, data: Partial<CRMTicket>): Promise<CRMTicket> {
    const obj = await this.request<HubSpotObject>(
      `${this.baseUrl}/crm/v3/objects/tickets/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          properties: this.unmapTicket(data),
        }),
      }
    );

    return this.mapTicket(obj);
  }

  async deleteTicket(id: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/crm/v3/objects/tickets/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async addTicketComment(
    ticketId: string,
    comment: { body: string; isPublic?: boolean }
  ): Promise<{ id: string }> {
    // HubSpot uses engagements for ticket comments
    const response = await this.request<{ id: string }>(
      `${this.baseUrl}/engagements/v1/engagements`,
      {
        method: 'POST',
        body: JSON.stringify({
          engagement: {
            active: true,
            type: 'NOTE',
          },
          associations: {
            ticketIds: [parseInt(ticketId, 10)],
          },
          metadata: {
            body: comment.body,
          },
        }),
      }
    );

    return { id: String(response.id) };
  }

  // ============================================
  // ASSOCIATIONS
  // ============================================

  async getDealContacts(dealId: string): Promise<CRMContact[]> {
    const response = await this.request<{ results: Array<{ id: string }> }>(
      `${this.baseUrl}/crm/v3/objects/deals/${dealId}/associations/contacts`
    );

    const contacts: CRMContact[] = [];
    for (const assoc of response.results) {
      const contact = await this.getContact(assoc.id);
      if (contact) {
        contacts.push(contact);
      }
    }

    return contacts;
  }

  async getContactDeals(contactId: string): Promise<CRMDeal[]> {
    const response = await this.request<{ results: Array<{ id: string }> }>(
      `${this.baseUrl}/crm/v3/objects/contacts/${contactId}/associations/deals`
    );

    const deals: CRMDeal[] = [];
    for (const assoc of response.results) {
      const deal = await this.getDeal(assoc.id);
      if (deal) {
        deals.push(deal);
      }
    }

    return deals;
  }

  async getContactTickets(contactId: string): Promise<CRMTicket[]> {
    const response = await this.request<{ results: Array<{ id: string }> }>(
      `${this.baseUrl}/crm/v3/objects/contacts/${contactId}/associations/tickets`
    );

    const tickets: CRMTicket[] = [];
    for (const assoc of response.results) {
      const ticket = await this.getTicket(assoc.id);
      if (ticket) {
        tickets.push(ticket);
      }
    }

    return tickets;
  }

  async associateContactWithDeal(contactId: string, dealId: string): Promise<boolean> {
    await this.request(
      `${this.baseUrl}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
      { method: 'PUT' }
    );
    return true;
  }

  async associateContactWithTicket(contactId: string, ticketId: string): Promise<boolean> {
    await this.request(
      `${this.baseUrl}/crm/v3/objects/tickets/${ticketId}/associations/contacts/${contactId}/ticket_to_contact`,
      { method: 'PUT' }
    );
    return true;
  }

  // ============================================
  // SYNC
  // ============================================

  async syncAll(options?: { since?: Date; cursor?: string }): Promise<CRMSyncResult> {
    const result: CRMSyncResult = {
      contacts: { created: 0, updated: 0, failed: 0 },
      deals: { created: 0, updated: 0, failed: 0 },
      tickets: { created: 0, updated: 0, failed: 0 },
      hasMore: false,
    };

    // Sync contacts
    let contactsResult = await this.listContacts({ limit: 100, cursor: options?.cursor });
    result.contacts.updated = contactsResult.data.length;
    result.hasMore = result.hasMore || contactsResult.hasMore;
    result.cursor = contactsResult.cursor;

    // Sync deals
    let dealsResult = await this.listDeals({ limit: 100, cursor: options?.cursor });
    result.deals.updated = dealsResult.data.length;
    result.hasMore = result.hasMore || dealsResult.hasMore;

    // Sync tickets
    let ticketsResult = await this.listTickets({ limit: 100, cursor: options?.cursor });
    result.tickets.updated = ticketsResult.data.length;
    result.hasMore = result.hasMore || ticketsResult.hasMore;

    return result;
  }

  async syncIncremental(cursor: string): Promise<CRMSyncResult> {
    return this.syncAll({ cursor });
  }

  // ============================================
  // METADATA
  // ============================================

  async getCustomFields(
    objectType: 'contact' | 'deal' | 'ticket'
  ): Promise<Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>> {
    const objectTypeMap: Record<string, string> = {
      contact: 'contacts',
      deal: 'deals',
      ticket: 'tickets',
    };

    const response = await this.request<{ results: Array<{
      name: string;
      label: string;
      type: string;
      fieldType: string;
      required: boolean;
      options?: Array<{ value: string; label: string }>;
    }> }>(
      `${this.baseUrl}/crm/v3/properties/${objectTypeMap[objectType]}`
    );

    return response.results.map((prop) => ({
      name: prop.name,
      label: prop.label,
      type: prop.fieldType || prop.type,
      required: prop.required,
      options: prop.options,
    }));
  }

  async getPipelines(): Promise<Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string; order: number }>;
  }>> {
    const response = await this.request<{ results: Array<{
      id: string;
      label: string;
      stages: Array<{ id: string; label: string; displayOrder: number }>;
    }> }>(
      `${this.baseUrl}/crm/v3/pipelines/deals`
    );

    return response.results.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.label,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.label,
        order: stage.displayOrder,
      })),
    }));
  }

  // ============================================
  // TEST CONNECTION
  // ============================================

  async testConnection(): Promise<{
    success: boolean;
    accountId?: string;
    accountName?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        portalId: number;
        companyName: string;
      }>(`${this.baseUrl}/account-info/v3/details`);

      return {
        success: true,
        accountId: String(response.portalId),
        accountName: response.companyName,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // MAPPING HELPERS
  // ============================================

  private mapContact(obj: HubSpotObject): CRMContact {
    const p = obj.properties;
    return {
      id: obj.id,
      externalId: obj.id,
      email: p.email || '',
      firstName: p.firstname || undefined,
      lastName: p.lastname || undefined,
      phone: p.phone || undefined,
      company: p.company || undefined,
      title: p.jobtitle || undefined,
      lifecycleStage: p.lifecyclestage || undefined,
      leadStatus: p.hs_lead_status || undefined,
      ownerId: p.hubspot_owner_id || undefined,
      customFields: {},
      createdAt: new Date(obj.createdAt),
      updatedAt: new Date(obj.updatedAt),
    };
  }

  private unmapContact(data: Partial<CRMContact>): Record<string, string> {
    const props: Record<string, string> = {};

    if (data.email) props.email = data.email;
    if (data.firstName) props.firstname = data.firstName;
    if (data.lastName) props.lastname = data.lastName;
    if (data.phone) props.phone = data.phone;
    if (data.company) props.company = data.company;
    if (data.title) props.jobtitle = data.title;
    if (data.lifecycleStage) props.lifecyclestage = data.lifecycleStage;
    if (data.leadStatus) props.hs_lead_status = data.leadStatus;

    return props;
  }

  private mapDeal(obj: HubSpotObject): CRMDeal {
    const p = obj.properties;
    return {
      id: obj.id,
      externalId: obj.id,
      name: p.dealname || '',
      amount: parseFloat(p.amount || '0'),
      currency: 'EUR',
      stage: p.dealstage || '',
      probability: p.hs_deal_stage_probability
        ? parseInt(p.hs_deal_stage_probability, 10)
        : undefined,
      closeDate: p.closedate ? new Date(p.closedate) : undefined,
      customFields: {},
      createdAt: new Date(obj.createdAt),
      updatedAt: new Date(obj.updatedAt),
    };
  }

  private unmapDeal(data: Partial<CRMDeal>): Record<string, string> {
    const props: Record<string, string> = {};

    if (data.name) props.dealname = data.name;
    if (data.amount !== undefined) props.amount = String(data.amount);
    if (data.stage) props.dealstage = data.stage;
    if (data.closeDate) props.closedate = data.closeDate.toISOString().split('T')[0];

    return props;
  }

  private mapTicket(obj: HubSpotObject): CRMTicket {
    const p = obj.properties;
    const priorityMap: Record<string, CRMTicket['priority']> = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      URGENT: 'urgent',
    };

    return {
      id: obj.id,
      externalId: obj.id,
      subject: p.subject || '',
      description: p.content || undefined,
      status: p.hs_pipeline_stage || 'new',
      priority: priorityMap[p.hs_ticket_priority || ''] || 'medium',
      tags: [],
      customFields: {},
      createdAt: new Date(obj.createdAt),
      updatedAt: new Date(obj.updatedAt),
    };
  }

  private unmapTicket(data: Partial<CRMTicket>): Record<string, string> {
    const props: Record<string, string> = {};
    const priorityMap: Record<CRMTicket['priority'], string> = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      urgent: 'URGENT',
    };

    if (data.subject) props.subject = data.subject;
    if (data.description) props.content = data.description;
    if (data.status) props.hs_pipeline_stage = data.status;
    if (data.priority) props.hs_ticket_priority = priorityMap[data.priority];

    return props;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Register adapter
registerCRMAdapter('hubspot', (token, url) => new HubSpotAdapter(token, url));
