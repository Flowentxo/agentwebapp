/**
 * CRM Integration Services
 * Handles HubSpot, Salesforce, Pipedrive
 */

import { BaseIntegrationService, PaginatedResponse } from './base-service';

// ============================================
// COMMON CRM TYPES
// ============================================
export interface CRMContact {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  customFields?: Record<string, unknown>;
}

export interface CRMDeal {
  id: string;
  name: string;
  amount?: number;
  currency?: string;
  stage: string;
  pipeline?: string;
  probability?: number;
  closeDate?: string;
  ownerId?: string;
  contactIds?: string[];
  companyId?: string;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, unknown>;
}

export interface CRMCompany {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  employeeCount?: number;
  annualRevenue?: number;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, unknown>;
}

export interface CRMPipeline {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    probability?: number;
    order: number;
  }>;
}

// ============================================
// HUBSPOT TYPES
// ============================================
export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    createdate?: string;
    lastmodifieddate?: string;
    hs_lead_status?: string;
    lifecyclestage?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    hubspot_owner_id?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    numberofemployees?: string;
    annualrevenue?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// ============================================
// SALESFORCE TYPES
// ============================================
export interface SalesforceContact {
  Id: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  Title?: string;
  AccountId?: string;
  Account?: { Name: string };
  CreatedDate: string;
  LastModifiedDate: string;
  OwnerId?: string;
  [key: string]: unknown;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount?: number;
  StageName: string;
  Probability?: number;
  CloseDate?: string;
  AccountId?: string;
  Account?: { Name: string };
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: unknown;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Website?: string;
  Industry?: string;
  Phone?: string;
  BillingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  NumberOfEmployees?: number;
  AnnualRevenue?: number;
  CreatedDate: string;
  LastModifiedDate: string;
  OwnerId?: string;
  [key: string]: unknown;
}

// ============================================
// PIPEDRIVE TYPES
// ============================================
export interface PipedriveContact {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: Array<{ value: string; primary: boolean }>;
  phone: Array<{ value: string; primary: boolean }>;
  org_id?: number;
  org_name?: string;
  owner_id?: number;
  add_time: string;
  update_time: string;
  [key: string]: unknown;
}

export interface PipedriveDeal {
  id: number;
  title: string;
  value: number;
  currency: string;
  stage_id: number;
  pipeline_id: number;
  status: 'open' | 'won' | 'lost' | 'deleted';
  probability?: number;
  expected_close_date?: string;
  person_id?: number;
  org_id?: number;
  owner_id?: number;
  add_time: string;
  update_time: string;
  [key: string]: unknown;
}

export interface PipedriveOrganization {
  id: number;
  name: string;
  address?: string;
  owner_id?: number;
  add_time: string;
  update_time: string;
  [key: string]: unknown;
}

// ============================================
// HUBSPOT SERVICE
// ============================================
export class HubSpotService extends BaseIntegrationService {
  constructor() {
    super('hubspot');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const paging = response.paging as Record<string, { after?: string }> | undefined;

    return {
      items: (response.results || []) as T[],
      nextCursor: paging?.next?.after,
      hasMore: !!paging?.next?.after,
      total: response.total as number | undefined,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { after: cursor };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.request(userId, '/crm/v3/objects/contacts', { params: { limit: 1 } });
      return true;
    } catch {
      return false;
    }
  }

  // --- CONTACTS ---

  async listContacts(
    userId: string,
    options: { limit?: number; properties?: string[] } = {}
  ): Promise<HubSpotContact[]> {
    const properties = options.properties || [
      'email', 'firstname', 'lastname', 'phone', 'company',
      'jobtitle', 'createdate', 'lastmodifieddate', 'lifecyclestage'
    ];

    const response = await this.request<{ results: HubSpotContact[] }>(
      userId,
      '/crm/v3/objects/contacts',
      {
        params: {
          limit: options.limit || 100,
          properties: properties.join(','),
        },
      }
    );
    return response.data.results || [];
  }

  async getContact(userId: string, contactId: string): Promise<HubSpotContact> {
    const response = await this.request<HubSpotContact>(
      userId,
      `/crm/v3/objects/contacts/${contactId}`,
      {
        params: {
          properties: 'email,firstname,lastname,phone,company,jobtitle,createdate,lastmodifieddate,lifecyclestage',
        },
      }
    );
    return response.data;
  }

  async createContact(
    userId: string,
    properties: Record<string, string>
  ): Promise<HubSpotContact> {
    const response = await this.request<HubSpotContact>(
      userId,
      '/crm/v3/objects/contacts',
      {
        method: 'POST',
        body: { properties },
      }
    );
    return response.data;
  }

  async updateContact(
    userId: string,
    contactId: string,
    properties: Record<string, string>
  ): Promise<HubSpotContact> {
    const response = await this.request<HubSpotContact>(
      userId,
      `/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        body: { properties },
      }
    );
    return response.data;
  }

  async deleteContact(userId: string, contactId: string): Promise<void> {
    await this.request(
      userId,
      `/crm/v3/objects/contacts/${contactId}`,
      { method: 'DELETE' }
    );
  }

  async searchContacts(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<HubSpotContact[]> {
    const response = await this.request<{ results: HubSpotContact[] }>(
      userId,
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: {
          query,
          limit,
          properties: ['email', 'firstname', 'lastname', 'phone', 'company'],
        },
      }
    );
    return response.data.results || [];
  }

  // --- DEALS ---

  async listDeals(
    userId: string,
    options: { limit?: number; properties?: string[] } = {}
  ): Promise<HubSpotDeal[]> {
    const properties = options.properties || [
      'dealname', 'amount', 'dealstage', 'pipeline',
      'closedate', 'hubspot_owner_id', 'createdate', 'hs_lastmodifieddate'
    ];

    const response = await this.request<{ results: HubSpotDeal[] }>(
      userId,
      '/crm/v3/objects/deals',
      {
        params: {
          limit: options.limit || 100,
          properties: properties.join(','),
        },
      }
    );
    return response.data.results || [];
  }

  async getDeal(userId: string, dealId: string): Promise<HubSpotDeal> {
    const response = await this.request<HubSpotDeal>(
      userId,
      `/crm/v3/objects/deals/${dealId}`,
      {
        params: {
          properties: 'dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id',
        },
      }
    );
    return response.data;
  }

  async createDeal(
    userId: string,
    properties: Record<string, string>
  ): Promise<HubSpotDeal> {
    const response = await this.request<HubSpotDeal>(
      userId,
      '/crm/v3/objects/deals',
      {
        method: 'POST',
        body: { properties },
      }
    );
    return response.data;
  }

  async updateDeal(
    userId: string,
    dealId: string,
    properties: Record<string, string>
  ): Promise<HubSpotDeal> {
    const response = await this.request<HubSpotDeal>(
      userId,
      `/crm/v3/objects/deals/${dealId}`,
      {
        method: 'PATCH',
        body: { properties },
      }
    );
    return response.data;
  }

  async deleteDeal(userId: string, dealId: string): Promise<void> {
    await this.request(
      userId,
      `/crm/v3/objects/deals/${dealId}`,
      { method: 'DELETE' }
    );
  }

  // --- COMPANIES ---

  async listCompanies(
    userId: string,
    options: { limit?: number } = {}
  ): Promise<HubSpotCompany[]> {
    const response = await this.request<{ results: HubSpotCompany[] }>(
      userId,
      '/crm/v3/objects/companies',
      {
        params: {
          limit: options.limit || 100,
          properties: 'name,domain,industry,phone,address,city,country,numberofemployees,annualrevenue',
        },
      }
    );
    return response.data.results || [];
  }

  async getCompany(userId: string, companyId: string): Promise<HubSpotCompany> {
    const response = await this.request<HubSpotCompany>(
      userId,
      `/crm/v3/objects/companies/${companyId}`
    );
    return response.data;
  }

  // --- PIPELINES ---

  async getDealPipelines(userId: string): Promise<CRMPipeline[]> {
    const response = await this.request<{ results: Array<{
      id: string;
      label: string;
      stages: Array<{ id: string; label: string; displayOrder: number; metadata?: { probability?: string } }>;
    }> }>(
      userId,
      '/crm/v3/pipelines/deals'
    );

    return response.data.results.map(p => ({
      id: p.id,
      name: p.label,
      stages: p.stages.map(s => ({
        id: s.id,
        name: s.label,
        order: s.displayOrder,
        probability: s.metadata?.probability ? parseFloat(s.metadata.probability) : undefined,
      })),
    }));
  }

  // --- OWNERS ---

  async getOwners(userId: string): Promise<Array<{ id: string; email: string; firstName: string; lastName: string }>> {
    const response = await this.request<{ results: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    }> }>(
      userId,
      '/crm/v3/owners'
    );
    return response.data.results || [];
  }
}

// ============================================
// SALESFORCE SERVICE
// ============================================
export class SalesforceService extends BaseIntegrationService {
  constructor() {
    super('salesforce');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;

    return {
      items: (response.records || []) as T[],
      nextCursor: response.nextRecordsUrl as string | undefined,
      hasMore: !response.done,
      total: response.totalSize as number | undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.request(userId, '/services/data/v58.0/sobjects');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute SOQL query
   */
  async query<T>(userId: string, soql: string): Promise<T[]> {
    const response = await this.request<{ records: T[]; done: boolean }>(
      userId,
      '/services/data/v58.0/query',
      {
        params: { q: soql },
      }
    );
    return response.data.records || [];
  }

  // --- CONTACTS ---

  async listContacts(userId: string, limit: number = 100): Promise<SalesforceContact[]> {
    return this.query<SalesforceContact>(
      userId,
      `SELECT Id, Email, FirstName, LastName, Phone, Title, AccountId, Account.Name, CreatedDate, LastModifiedDate, OwnerId FROM Contact ORDER BY LastModifiedDate DESC LIMIT ${limit}`
    );
  }

  async getContact(userId: string, contactId: string): Promise<SalesforceContact> {
    const response = await this.request<SalesforceContact>(
      userId,
      `/services/data/v58.0/sobjects/Contact/${contactId}`
    );
    return response.data;
  }

  async createContact(
    userId: string,
    contact: Partial<SalesforceContact>
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(
      userId,
      '/services/data/v58.0/sobjects/Contact',
      {
        method: 'POST',
        body: contact,
      }
    );
    return response.data;
  }

  async updateContact(
    userId: string,
    contactId: string,
    updates: Partial<SalesforceContact>
  ): Promise<void> {
    await this.request(
      userId,
      `/services/data/v58.0/sobjects/Contact/${contactId}`,
      {
        method: 'PATCH',
        body: updates,
      }
    );
  }

  async deleteContact(userId: string, contactId: string): Promise<void> {
    await this.request(
      userId,
      `/services/data/v58.0/sobjects/Contact/${contactId}`,
      { method: 'DELETE' }
    );
  }

  // --- OPPORTUNITIES ---

  async listOpportunities(userId: string, limit: number = 100): Promise<SalesforceOpportunity[]> {
    return this.query<SalesforceOpportunity>(
      userId,
      `SELECT Id, Name, Amount, StageName, Probability, CloseDate, AccountId, Account.Name, OwnerId, CreatedDate, LastModifiedDate FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT ${limit}`
    );
  }

  async getOpportunity(userId: string, opportunityId: string): Promise<SalesforceOpportunity> {
    const response = await this.request<SalesforceOpportunity>(
      userId,
      `/services/data/v58.0/sobjects/Opportunity/${opportunityId}`
    );
    return response.data;
  }

  async createOpportunity(
    userId: string,
    opportunity: Partial<SalesforceOpportunity>
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(
      userId,
      '/services/data/v58.0/sobjects/Opportunity',
      {
        method: 'POST',
        body: opportunity,
      }
    );
    return response.data;
  }

  async updateOpportunity(
    userId: string,
    opportunityId: string,
    updates: Partial<SalesforceOpportunity>
  ): Promise<void> {
    await this.request(
      userId,
      `/services/data/v58.0/sobjects/Opportunity/${opportunityId}`,
      {
        method: 'PATCH',
        body: updates,
      }
    );
  }

  // --- ACCOUNTS ---

  async listAccounts(userId: string, limit: number = 100): Promise<SalesforceAccount[]> {
    return this.query<SalesforceAccount>(
      userId,
      `SELECT Id, Name, Website, Industry, Phone, BillingAddress, NumberOfEmployees, AnnualRevenue, CreatedDate, LastModifiedDate FROM Account ORDER BY LastModifiedDate DESC LIMIT ${limit}`
    );
  }

  async getAccount(userId: string, accountId: string): Promise<SalesforceAccount> {
    const response = await this.request<SalesforceAccount>(
      userId,
      `/services/data/v58.0/sobjects/Account/${accountId}`
    );
    return response.data;
  }

  // --- SEARCH ---

  async search(userId: string, searchTerm: string): Promise<Array<{ Id: string; Name: string; Type: string }>> {
    const response = await this.request<{
      searchRecords: Array<{ Id: string; Name: string; attributes: { type: string } }>;
    }>(
      userId,
      '/services/data/v58.0/search',
      {
        params: {
          q: `FIND {${searchTerm}} IN ALL FIELDS RETURNING Contact(Id,Name), Account(Id,Name), Opportunity(Id,Name)`,
        },
      }
    );
    return response.data.searchRecords.map(r => ({
      Id: r.Id,
      Name: r.Name,
      Type: r.attributes.type,
    }));
  }

  // --- METADATA ---

  async describeObject(userId: string, objectName: string): Promise<{
    name: string;
    label: string;
    fields: Array<{ name: string; label: string; type: string }>;
  }> {
    const response = await this.request<{
      name: string;
      label: string;
      fields: Array<{ name: string; label: string; type: string }>;
    }>(
      userId,
      `/services/data/v58.0/sobjects/${objectName}/describe`
    );
    return response.data;
  }
}

// ============================================
// PIPEDRIVE SERVICE
// ============================================
export class PipedriveService extends BaseIntegrationService {
  constructor() {
    super('pipedrive');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const additionalData = response.additional_data as Record<string, unknown> | undefined;
    const pagination = additionalData?.pagination as Record<string, unknown> | undefined;

    return {
      items: (response.data || []) as T[],
      nextCursor: pagination?.next_start?.toString(),
      hasMore: pagination?.more_items_in_collection as boolean || false,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { start: cursor };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.request(userId, '/users/me');
      return true;
    } catch {
      return false;
    }
  }

  // --- PERSONS (CONTACTS) ---

  async listPersons(userId: string, limit: number = 100): Promise<PipedriveContact[]> {
    const response = await this.request<{ data: PipedriveContact[] }>(
      userId,
      '/persons',
      {
        params: { limit },
      }
    );
    return response.data.data || [];
  }

  async getPerson(userId: string, personId: number): Promise<PipedriveContact> {
    const response = await this.request<{ data: PipedriveContact }>(
      userId,
      `/persons/${personId}`
    );
    return response.data.data;
  }

  async createPerson(
    userId: string,
    person: { name: string; email?: string; phone?: string; org_id?: number }
  ): Promise<PipedriveContact> {
    const body: Record<string, unknown> = { name: person.name };
    if (person.email) body.email = [{ value: person.email, primary: true }];
    if (person.phone) body.phone = [{ value: person.phone, primary: true }];
    if (person.org_id) body.org_id = person.org_id;

    const response = await this.request<{ data: PipedriveContact }>(
      userId,
      '/persons',
      {
        method: 'POST',
        body,
      }
    );
    return response.data.data;
  }

  async updatePerson(
    userId: string,
    personId: number,
    updates: Partial<{ name: string; email: string; phone: string }>
  ): Promise<PipedriveContact> {
    const body: Record<string, unknown> = {};
    if (updates.name) body.name = updates.name;
    if (updates.email) body.email = [{ value: updates.email, primary: true }];
    if (updates.phone) body.phone = [{ value: updates.phone, primary: true }];

    const response = await this.request<{ data: PipedriveContact }>(
      userId,
      `/persons/${personId}`,
      {
        method: 'PUT',
        body,
      }
    );
    return response.data.data;
  }

  async deletePerson(userId: string, personId: number): Promise<void> {
    await this.request(
      userId,
      `/persons/${personId}`,
      { method: 'DELETE' }
    );
  }

  async searchPersons(userId: string, term: string): Promise<PipedriveContact[]> {
    const response = await this.request<{ data: { items: Array<{ item: PipedriveContact }> } }>(
      userId,
      '/persons/search',
      {
        params: { term },
      }
    );
    return response.data.data?.items.map(i => i.item) || [];
  }

  // --- DEALS ---

  async listDeals(userId: string, limit: number = 100): Promise<PipedriveDeal[]> {
    const response = await this.request<{ data: PipedriveDeal[] }>(
      userId,
      '/deals',
      {
        params: { limit },
      }
    );
    return response.data.data || [];
  }

  async getDeal(userId: string, dealId: number): Promise<PipedriveDeal> {
    const response = await this.request<{ data: PipedriveDeal }>(
      userId,
      `/deals/${dealId}`
    );
    return response.data.data;
  }

  async createDeal(
    userId: string,
    deal: { title: string; value?: number; currency?: string; stage_id?: number; person_id?: number; org_id?: number }
  ): Promise<PipedriveDeal> {
    const response = await this.request<{ data: PipedriveDeal }>(
      userId,
      '/deals',
      {
        method: 'POST',
        body: deal,
      }
    );
    return response.data.data;
  }

  async updateDeal(
    userId: string,
    dealId: number,
    updates: Partial<{ title: string; value: number; stage_id: number; status: string }>
  ): Promise<PipedriveDeal> {
    const response = await this.request<{ data: PipedriveDeal }>(
      userId,
      `/deals/${dealId}`,
      {
        method: 'PUT',
        body: updates,
      }
    );
    return response.data.data;
  }

  async deleteDeal(userId: string, dealId: number): Promise<void> {
    await this.request(
      userId,
      `/deals/${dealId}`,
      { method: 'DELETE' }
    );
  }

  // --- ORGANIZATIONS ---

  async listOrganizations(userId: string, limit: number = 100): Promise<PipedriveOrganization[]> {
    const response = await this.request<{ data: PipedriveOrganization[] }>(
      userId,
      '/organizations',
      {
        params: { limit },
      }
    );
    return response.data.data || [];
  }

  async getOrganization(userId: string, orgId: number): Promise<PipedriveOrganization> {
    const response = await this.request<{ data: PipedriveOrganization }>(
      userId,
      `/organizations/${orgId}`
    );
    return response.data.data;
  }

  async createOrganization(
    userId: string,
    org: { name: string; address?: string }
  ): Promise<PipedriveOrganization> {
    const response = await this.request<{ data: PipedriveOrganization }>(
      userId,
      '/organizations',
      {
        method: 'POST',
        body: org,
      }
    );
    return response.data.data;
  }

  // --- PIPELINES ---

  async getPipelines(userId: string): Promise<CRMPipeline[]> {
    const response = await this.request<{
      data: Array<{ id: number; name: string }>;
    }>(
      userId,
      '/pipelines'
    );

    const pipelines = response.data.data || [];
    const result: CRMPipeline[] = [];

    for (const p of pipelines) {
      const stagesResponse = await this.request<{
        data: Array<{ id: number; name: string; order_nr: number; deal_probability: number }>;
      }>(
        userId,
        `/stages`,
        { params: { pipeline_id: p.id } }
      );

      result.push({
        id: p.id.toString(),
        name: p.name,
        stages: (stagesResponse.data.data || []).map(s => ({
          id: s.id.toString(),
          name: s.name,
          order: s.order_nr,
          probability: s.deal_probability,
        })),
      });
    }

    return result;
  }

  // --- ACTIVITIES ---

  async listActivities(
    userId: string,
    options: { type?: string; done?: boolean; limit?: number } = {}
  ): Promise<Array<{
    id: number;
    type: string;
    subject: string;
    done: boolean;
    due_date?: string;
    due_time?: string;
    deal_id?: number;
    person_id?: number;
  }>> {
    const params: Record<string, unknown> = {
      limit: options.limit || 100,
    };
    if (options.type) params.type = options.type;
    if (options.done !== undefined) params.done = options.done ? 1 : 0;

    const response = await this.request<{
      data: Array<{
        id: number;
        type: string;
        subject: string;
        done: boolean;
        due_date?: string;
        due_time?: string;
        deal_id?: number;
        person_id?: number;
      }>;
    }>(
      userId,
      '/activities',
      { params }
    );
    return response.data.data || [];
  }

  async createActivity(
    userId: string,
    activity: {
      type: string;
      subject: string;
      due_date?: string;
      due_time?: string;
      deal_id?: number;
      person_id?: number;
      org_id?: number;
      note?: string;
    }
  ): Promise<{ id: number }> {
    const response = await this.request<{ data: { id: number } }>(
      userId,
      '/activities',
      {
        method: 'POST',
        body: activity,
      }
    );
    return response.data.data;
  }
}

// Export singleton instances
export const hubspotService = new HubSpotService();
export const salesforceService = new SalesforceService();
export const pipedriveService = new PipedriveService();
