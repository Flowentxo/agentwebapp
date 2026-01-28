/**
 * PHASE 7: CRM Adapter Interface
 * Einheitliches Interface für alle CRM-Systeme
 */

import { CRMContact, CRMDeal, CRMTicket } from '@/lib/agents/shared/types';

// ============================================
// LIST OPTIONS
// ============================================

export interface CRMListOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  updatedAfter?: Date;
  updatedBefore?: Date;
  filters?: CRMFilter[];
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  properties?: string[]; // Specific fields to fetch
}

export interface CRMFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

// ============================================
// PAGINATED RESULT
// ============================================

export interface CRMPaginatedResult<T> {
  data: T[];
  total?: number;
  hasMore: boolean;
  cursor?: string;
}

// ============================================
// SEARCH OPTIONS
// ============================================

export interface CRMSearchOptions {
  query: string;
  limit?: number;
  fields?: string[];
}

// ============================================
// BULK OPERATIONS
// ============================================

export interface CRMBulkResult {
  success: number;
  failed: number;
  errors: Array<{
    id?: string;
    index?: number;
    error: string;
  }>;
}

// ============================================
// SYNC RESULT
// ============================================

export interface CRMSyncResult {
  contacts: {
    created: number;
    updated: number;
    failed: number;
  };
  deals: {
    created: number;
    updated: number;
    failed: number;
  };
  tickets: {
    created: number;
    updated: number;
    failed: number;
  };
  cursor?: string;
  hasMore: boolean;
}

// ============================================
// ABSTRACT CRM ADAPTER
// ============================================

export abstract class CRMAdapter {
  abstract readonly provider: string;
  abstract readonly version: string;

  protected accessToken: string;
  protected instanceUrl?: string;
  protected rateLimitRemaining?: number;
  protected rateLimitReset?: Date;

  constructor(accessToken: string, instanceUrl?: string) {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
  }

  // ============================================
  // CONTACTS
  // ============================================

  /**
   * List contacts with pagination
   */
  abstract listContacts(options?: CRMListOptions): Promise<CRMPaginatedResult<CRMContact>>;

  /**
   * Get single contact by ID
   */
  abstract getContact(id: string): Promise<CRMContact | null>;

  /**
   * Search contacts
   */
  abstract searchContacts(options: CRMSearchOptions): Promise<CRMContact[]>;

  /**
   * Create new contact
   */
  abstract createContact(data: Partial<CRMContact>): Promise<CRMContact>;

  /**
   * Update existing contact
   */
  abstract updateContact(id: string, data: Partial<CRMContact>): Promise<CRMContact>;

  /**
   * Delete contact
   */
  abstract deleteContact(id: string): Promise<boolean>;

  /**
   * Bulk create contacts
   */
  abstract bulkCreateContacts(contacts: Partial<CRMContact>[]): Promise<CRMBulkResult>;

  /**
   * Bulk update contacts
   */
  abstract bulkUpdateContacts(
    updates: Array<{ id: string; data: Partial<CRMContact> }>
  ): Promise<CRMBulkResult>;

  // ============================================
  // DEALS / OPPORTUNITIES
  // ============================================

  /**
   * List deals with pagination
   */
  abstract listDeals(options?: CRMListOptions): Promise<CRMPaginatedResult<CRMDeal>>;

  /**
   * Get single deal by ID
   */
  abstract getDeal(id: string): Promise<CRMDeal | null>;

  /**
   * Search deals
   */
  abstract searchDeals(options: CRMSearchOptions): Promise<CRMDeal[]>;

  /**
   * Create new deal
   */
  abstract createDeal(data: Partial<CRMDeal>): Promise<CRMDeal>;

  /**
   * Update existing deal
   */
  abstract updateDeal(id: string, data: Partial<CRMDeal>): Promise<CRMDeal>;

  /**
   * Delete deal
   */
  abstract deleteDeal(id: string): Promise<boolean>;

  /**
   * Get deal stages/pipeline
   */
  abstract getDealStages(): Promise<Array<{ id: string; name: string; order: number }>>;

  // ============================================
  // TICKETS / SUPPORT
  // ============================================

  /**
   * List tickets with pagination
   */
  abstract listTickets(options?: CRMListOptions): Promise<CRMPaginatedResult<CRMTicket>>;

  /**
   * Get single ticket by ID
   */
  abstract getTicket(id: string): Promise<CRMTicket | null>;

  /**
   * Search tickets
   */
  abstract searchTickets(options: CRMSearchOptions): Promise<CRMTicket[]>;

  /**
   * Create new ticket
   */
  abstract createTicket(data: Partial<CRMTicket>): Promise<CRMTicket>;

  /**
   * Update existing ticket
   */
  abstract updateTicket(id: string, data: Partial<CRMTicket>): Promise<CRMTicket>;

  /**
   * Delete ticket
   */
  abstract deleteTicket(id: string): Promise<boolean>;

  /**
   * Add comment to ticket
   */
  abstract addTicketComment(
    ticketId: string,
    comment: { body: string; isPublic?: boolean }
  ): Promise<{ id: string }>;

  // ============================================
  // ASSOCIATIONS / RELATIONS
  // ============================================

  /**
   * Get contacts associated with a deal
   */
  abstract getDealContacts(dealId: string): Promise<CRMContact[]>;

  /**
   * Get deals associated with a contact
   */
  abstract getContactDeals(contactId: string): Promise<CRMDeal[]>;

  /**
   * Get tickets associated with a contact
   */
  abstract getContactTickets(contactId: string): Promise<CRMTicket[]>;

  /**
   * Associate contact with deal
   */
  abstract associateContactWithDeal(contactId: string, dealId: string): Promise<boolean>;

  /**
   * Associate contact with ticket
   */
  abstract associateContactWithTicket(contactId: string, ticketId: string): Promise<boolean>;

  // ============================================
  // SYNC
  // ============================================

  /**
   * Full sync - get all records
   */
  abstract syncAll(options?: {
    since?: Date;
    cursor?: string;
  }): Promise<CRMSyncResult>;

  /**
   * Incremental sync - get changed records
   */
  abstract syncIncremental(cursor: string): Promise<CRMSyncResult>;

  // ============================================
  // METADATA
  // ============================================

  /**
   * Get custom fields/properties
   */
  abstract getCustomFields(
    objectType: 'contact' | 'deal' | 'ticket'
  ): Promise<Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>>;

  /**
   * Get available pipelines
   */
  abstract getPipelines(): Promise<Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string; order: number }>;
  }>>;

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Make authenticated API request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.instanceUrl
      ? `${this.instanceUrl}${endpoint}`
      : endpoint;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Track rate limits
    const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
    const rateLimitReset = response.headers.get('x-rate-limit-reset');

    if (rateLimitRemaining) {
      this.rateLimitRemaining = parseInt(rateLimitRemaining, 10);
    }
    if (rateLimitReset) {
      this.rateLimitReset = new Date(parseInt(rateLimitReset, 10) * 1000);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new CRMError(
        `${this.provider} API Error: ${error.message || response.statusText}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining?: number; reset?: Date } {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
    };
  }

  /**
   * Test connection
   */
  abstract testConnection(): Promise<{
    success: boolean;
    accountId?: string;
    accountName?: string;
    error?: string;
  }>;
}

// ============================================
// CRM ERROR CLASS
// ============================================

export class CRMError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CRMError';
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422;
  }
}

// ============================================
// ADAPTER FACTORY
// ============================================

export type CRMAdapterFactory = (
  accessToken: string,
  instanceUrl?: string
) => CRMAdapter;

const adapterFactories: Record<string, CRMAdapterFactory> = {};

export function registerCRMAdapter(
  provider: string,
  factory: CRMAdapterFactory
): void {
  adapterFactories[provider] = factory;
}

export function createCRMAdapter(
  provider: string,
  accessToken: string,
  instanceUrl?: string
): CRMAdapter {
  const factory = adapterFactories[provider];
  if (!factory) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return factory(accessToken, instanceUrl);
}

export function getRegisteredAdapters(): string[] {
  return Object.keys(adapterFactories);
}
