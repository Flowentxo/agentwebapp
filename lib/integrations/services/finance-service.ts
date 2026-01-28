/**
 * Finance Integration Services
 * Handles QuickBooks, Stripe, PayPal, Xero
 */

import { BaseIntegrationService, PaginatedResponse } from './base-service';

// ============================================
// QUICKBOOKS TYPES
// ============================================
export interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
    Country?: string;
  };
  Balance?: number;
  BalanceWithJobs?: number;
  Active: boolean;
  CreateTime: string;
  LastUpdatedTime: string;
}

export interface QuickBooksInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name: string };
  Line: Array<{
    Id: string;
    LineNum?: number;
    Description?: string;
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
      ItemRef: { value: string; name: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  BillEmail?: { Address: string };
  EmailStatus?: string;
  CreateTime: string;
  LastUpdatedTime: string;
}

export interface QuickBooksPayment {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  CustomerRef: { value: string; name: string };
  PaymentMethodRef?: { value: string; name: string };
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{ TxnId: string; TxnType: string }>;
  }>;
  CreateTime: string;
  LastUpdatedTime: string;
}

export interface QuickBooksAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance: number;
  CurrentBalanceWithSubAccounts?: number;
  Active: boolean;
  Classification: string;
  CreateTime: string;
  LastUpdatedTime: string;
}

// ============================================
// STRIPE TYPES
// ============================================
export interface StripeCustomer {
  id: string;
  object: 'customer';
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  balance: number;
  currency?: string;
  default_source?: string;
  metadata: Record<string, string>;
  created: number;
  livemode: boolean;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface StripeCharge {
  id: string;
  object: 'charge';
  amount: number;
  amount_captured: number;
  amount_refunded: number;
  currency: string;
  customer?: string;
  description?: string;
  paid: boolean;
  refunded: boolean;
  status: 'succeeded' | 'pending' | 'failed';
  receipt_url?: string;
  created: number;
  metadata: Record<string, string>;
}

export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amount_received: number;
  currency: string;
  customer?: string;
  description?: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  receipt_email?: string;
  created: number;
  metadata: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount?: number;
        currency: string;
        recurring?: { interval: string; interval_count: number };
      };
      quantity: number;
    }>;
  };
  metadata: Record<string, string>;
  created: number;
}

export interface StripeInvoice {
  id: string;
  object: 'invoice';
  customer: string;
  subscription?: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  due_date?: number;
  created: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  lines: {
    data: Array<{
      id: string;
      description?: string;
      amount: number;
      quantity?: number;
    }>;
  };
}

// ============================================
// PAYPAL TYPES
// ============================================
export interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_event_code: string;
    transaction_initiation_date: string;
    transaction_updated_date: string;
    transaction_amount: {
      currency_code: string;
      value: string;
    };
    transaction_status: string;
  };
  payer_info?: {
    email_address?: string;
    payer_name?: {
      given_name?: string;
      surname?: string;
    };
  };
  cart_info?: {
    item_details?: Array<{
      item_name?: string;
      item_quantity?: string;
      item_unit_price?: { currency_code: string; value: string };
    }>;
  };
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: Array<{
    reference_id?: string;
    amount: {
      currency_code: string;
      value: string;
      breakdown?: {
        item_total?: { currency_code: string; value: string };
        shipping?: { currency_code: string; value: string };
        tax_total?: { currency_code: string; value: string };
      };
    };
    payee?: {
      email_address?: string;
      merchant_id?: string;
    };
    items?: Array<{
      name: string;
      quantity: string;
      unit_amount: { currency_code: string; value: string };
    }>;
  }>;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
    payer_id?: string;
  };
  create_time: string;
  update_time?: string;
}

// ============================================
// XERO TYPES
// ============================================
export interface XeroContact {
  ContactID: string;
  ContactNumber?: string;
  ContactStatus: 'ACTIVE' | 'ARCHIVED' | 'GDPRREQUEST';
  Name: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  Phones?: Array<{
    PhoneType: string;
    PhoneNumber?: string;
  }>;
  Addresses?: Array<{
    AddressType: string;
    AddressLine1?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
  }>;
  AccountsReceivableTaxType?: string;
  AccountsPayableTaxType?: string;
  IsSupplier: boolean;
  IsCustomer: boolean;
  UpdatedDateUTC: string;
}

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: 'ACCPAY' | 'ACCREC';
  Contact: { ContactID: string; Name: string };
  Date: string;
  DueDate: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED' | 'DELETED';
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  CurrencyCode: string;
  LineItems: Array<{
    LineItemID: string;
    Description: string;
    Quantity: number;
    UnitAmount: number;
    LineAmount: number;
    AccountCode?: string;
    TaxType?: string;
  }>;
  UpdatedDateUTC: string;
}

export interface XeroPayment {
  PaymentID: string;
  Date: string;
  Amount: number;
  Reference?: string;
  Status: 'AUTHORISED' | 'DELETED';
  PaymentType: 'ACCRECPAYMENT' | 'ACCPAYPAYMENT' | 'ARCREDITPAYMENT' | 'APCREDITPAYMENT';
  Invoice?: { InvoiceID: string; InvoiceNumber: string };
  Account?: { AccountID: string; Code: string };
  UpdatedDateUTC: string;
}

export interface XeroAccount {
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
  Status: 'ACTIVE' | 'ARCHIVED';
  Class: 'ASSET' | 'EQUITY' | 'EXPENSE' | 'LIABILITY' | 'REVENUE';
  TaxType?: string;
  EnablePaymentsToAccount?: boolean;
  Description?: string;
  UpdatedDateUTC: string;
}

// ============================================
// QUICKBOOKS SERVICE
// ============================================
export class QuickBooksService extends BaseIntegrationService {
  constructor() {
    super('quickbooks');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const queryResponse = response.QueryResponse as Record<string, unknown> | undefined;

    // QuickBooks wraps results in different keys based on entity type
    const keys = ['Customer', 'Invoice', 'Payment', 'Account', 'Item', 'Vendor'];
    let items: T[] = [];

    if (queryResponse) {
      for (const key of keys) {
        if (queryResponse[key]) {
          items = queryResponse[key] as T[];
          break;
        }
      }
    }

    return {
      items,
      hasMore: false, // QuickBooks uses offset-based pagination
      total: queryResponse?.totalCount as number | undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getCompanyInfo(userId);
      return true;
    } catch {
      return false;
    }
  }

  private getRealmId(userId: string): string {
    // This should be stored in integration metadata
    // For now, we'll need to get it from the integration record
    return ''; // Will be populated from integration metadata
  }

  /**
   * Get company info
   */
  async getCompanyInfo(userId: string): Promise<{
    CompanyName: string;
    Country: string;
    Email: { Address: string };
  }> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request<{
      CompanyInfo: { CompanyName: string; Country: string; Email: { Address: string } };
    }>(
      userId,
      `/company/${realmId}/companyinfo/${realmId}`
    );
    return response.data.CompanyInfo;
  }

  /**
   * Query endpoint helper
   */
  private async query<T>(userId: string, sql: string): Promise<T[]> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request<{ QueryResponse: Record<string, T[]> }>(
      userId,
      `/company/${realmId}/query`,
      {
        params: { query: sql },
      }
    );

    const qr = response.data.QueryResponse;
    const keys = Object.keys(qr).filter(k => k !== 'startPosition' && k !== 'maxResults' && k !== 'totalCount');
    return qr[keys[0]] || [];
  }

  // --- CUSTOMERS ---

  async listCustomers(userId: string, limit: number = 100): Promise<QuickBooksCustomer[]> {
    return this.query<QuickBooksCustomer>(
      userId,
      `SELECT * FROM Customer MAXRESULTS ${limit}`
    );
  }

  async getCustomer(userId: string, customerId: string): Promise<QuickBooksCustomer> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request<{ Customer: QuickBooksCustomer }>(
      userId,
      `/company/${realmId}/customer/${customerId}`
    );
    return response.data.Customer;
  }

  async createCustomer(
    userId: string,
    customer: { DisplayName: string; GivenName?: string; FamilyName?: string; PrimaryEmailAddr?: { Address: string } }
  ): Promise<QuickBooksCustomer> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request<{ Customer: QuickBooksCustomer }>(
      userId,
      `/company/${realmId}/customer`,
      {
        method: 'POST',
        body: customer,
      }
    );
    return response.data.Customer;
  }

  // --- INVOICES ---

  async listInvoices(userId: string, limit: number = 100): Promise<QuickBooksInvoice[]> {
    return this.query<QuickBooksInvoice>(
      userId,
      `SELECT * FROM Invoice MAXRESULTS ${limit}`
    );
  }

  async getInvoice(userId: string, invoiceId: string): Promise<QuickBooksInvoice> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request<{ Invoice: QuickBooksInvoice }>(
      userId,
      `/company/${realmId}/invoice/${invoiceId}`
    );
    return response.data.Invoice;
  }

  async createInvoice(
    userId: string,
    invoice: {
      CustomerRef: { value: string };
      Line: Array<{
        Amount: number;
        DetailType: 'SalesItemLineDetail';
        SalesItemLineDetail: { ItemRef: { value: string }; Qty?: number; UnitPrice?: number };
      }>;
    }
  ): Promise<QuickBooksInvoice> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request<{ Invoice: QuickBooksInvoice }>(
      userId,
      `/company/${realmId}/invoice`,
      {
        method: 'POST',
        body: invoice,
      }
    );
    return response.data.Invoice;
  }

  // --- PAYMENTS ---

  async listPayments(userId: string, limit: number = 100): Promise<QuickBooksPayment[]> {
    return this.query<QuickBooksPayment>(
      userId,
      `SELECT * FROM Payment MAXRESULTS ${limit}`
    );
  }

  // --- ACCOUNTS ---

  async listAccounts(userId: string): Promise<QuickBooksAccount[]> {
    return this.query<QuickBooksAccount>(userId, 'SELECT * FROM Account');
  }

  // --- REPORTS ---

  async getBalanceSheet(
    userId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<unknown> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request(
      userId,
      `/company/${realmId}/reports/BalanceSheet`,
      { params: options }
    );
    return response.data;
  }

  async getProfitAndLoss(
    userId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<unknown> {
    const { integration } = await this.getAccessToken(userId);
    const realmId = integration.metadata?.realmId as string;

    const response = await this.request(
      userId,
      `/company/${realmId}/reports/ProfitAndLoss`,
      { params: options }
    );
    return response.data;
  }
}

// ============================================
// STRIPE SERVICE
// ============================================
export class StripeService extends BaseIntegrationService {
  constructor() {
    super('stripe');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;

    return {
      items: (response.data || []) as T[],
      nextCursor: response.has_more ? (response.data as Array<{ id: string }>)?.slice(-1)[0]?.id : undefined,
      hasMore: response.has_more as boolean || false,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { starting_after: cursor };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.request(userId, '/balance');
      return true;
    } catch {
      return false;
    }
  }

  // --- CUSTOMERS ---

  async listCustomers(userId: string, limit: number = 100): Promise<StripeCustomer[]> {
    const response = await this.request<{ data: StripeCustomer[] }>(
      userId,
      '/customers',
      { params: { limit } }
    );
    return response.data.data || [];
  }

  async getCustomer(userId: string, customerId: string): Promise<StripeCustomer> {
    const response = await this.request<StripeCustomer>(
      userId,
      `/customers/${customerId}`
    );
    return response.data;
  }

  async createCustomer(
    userId: string,
    customer: { email?: string; name?: string; description?: string; metadata?: Record<string, string> }
  ): Promise<StripeCustomer> {
    const response = await this.request<StripeCustomer>(
      userId,
      '/customers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(customer as Record<string, string>).toString(),
      }
    );
    return response.data;
  }

  async updateCustomer(
    userId: string,
    customerId: string,
    updates: Partial<{ email: string; name: string; description: string }>
  ): Promise<StripeCustomer> {
    const response = await this.request<StripeCustomer>(
      userId,
      `/customers/${customerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(updates as Record<string, string>).toString(),
      }
    );
    return response.data;
  }

  // --- CHARGES ---

  async listCharges(userId: string, limit: number = 100): Promise<StripeCharge[]> {
    const response = await this.request<{ data: StripeCharge[] }>(
      userId,
      '/charges',
      { params: { limit } }
    );
    return response.data.data || [];
  }

  async getCharge(userId: string, chargeId: string): Promise<StripeCharge> {
    const response = await this.request<StripeCharge>(
      userId,
      `/charges/${chargeId}`
    );
    return response.data;
  }

  // --- PAYMENT INTENTS ---

  async listPaymentIntents(userId: string, limit: number = 100): Promise<StripePaymentIntent[]> {
    const response = await this.request<{ data: StripePaymentIntent[] }>(
      userId,
      '/payment_intents',
      { params: { limit } }
    );
    return response.data.data || [];
  }

  async getPaymentIntent(userId: string, paymentIntentId: string): Promise<StripePaymentIntent> {
    const response = await this.request<StripePaymentIntent>(
      userId,
      `/payment_intents/${paymentIntentId}`
    );
    return response.data;
  }

  // --- SUBSCRIPTIONS ---

  async listSubscriptions(userId: string, limit: number = 100): Promise<StripeSubscription[]> {
    const response = await this.request<{ data: StripeSubscription[] }>(
      userId,
      '/subscriptions',
      { params: { limit } }
    );
    return response.data.data || [];
  }

  async getSubscription(userId: string, subscriptionId: string): Promise<StripeSubscription> {
    const response = await this.request<StripeSubscription>(
      userId,
      `/subscriptions/${subscriptionId}`
    );
    return response.data;
  }

  async cancelSubscription(userId: string, subscriptionId: string): Promise<StripeSubscription> {
    const response = await this.request<StripeSubscription>(
      userId,
      `/subscriptions/${subscriptionId}`,
      { method: 'DELETE' }
    );
    return response.data;
  }

  // --- INVOICES ---

  async listInvoices(userId: string, limit: number = 100): Promise<StripeInvoice[]> {
    const response = await this.request<{ data: StripeInvoice[] }>(
      userId,
      '/invoices',
      { params: { limit } }
    );
    return response.data.data || [];
  }

  async getInvoice(userId: string, invoiceId: string): Promise<StripeInvoice> {
    const response = await this.request<StripeInvoice>(
      userId,
      `/invoices/${invoiceId}`
    );
    return response.data;
  }

  // --- BALANCE ---

  async getBalance(userId: string): Promise<{
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
  }> {
    const response = await this.request<{
      available: Array<{ amount: number; currency: string }>;
      pending: Array<{ amount: number; currency: string }>;
    }>(
      userId,
      '/balance'
    );
    return response.data;
  }

  // --- PRODUCTS ---

  async listProducts(userId: string, limit: number = 100): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    active: boolean;
    metadata: Record<string, string>;
  }>> {
    const response = await this.request<{
      data: Array<{ id: string; name: string; description?: string; active: boolean; metadata: Record<string, string> }>;
    }>(
      userId,
      '/products',
      { params: { limit } }
    );
    return response.data.data || [];
  }
}

// ============================================
// PAYPAL SERVICE
// ============================================
export class PayPalService extends BaseIntegrationService {
  constructor() {
    super('paypal');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;

    return {
      items: (response.transaction_details || response.orders || []) as T[],
      nextCursor: (response.links as Array<{ rel: string; href: string }>)?.find(l => l.rel === 'next')?.href,
      hasMore: !!(response.links as Array<{ rel: string }>)?.find(l => l.rel === 'next'),
      total: response.total_items as number || response.total_pages as number,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.request(userId, '/v1/identity/oauth2/userinfo?schema=paypalv1.1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<{
    user_id: string;
    name: string;
    emails: Array<{ value: string; primary: boolean }>;
  }> {
    const response = await this.request<{
      user_id: string;
      name: string;
      emails: Array<{ value: string; primary: boolean }>;
    }>(
      userId,
      '/v1/identity/oauth2/userinfo',
      { params: { schema: 'paypalv1.1' } }
    );
    return response.data;
  }

  // --- TRANSACTIONS ---

  async listTransactions(
    userId: string,
    options: {
      start_date: string;
      end_date: string;
      transaction_status?: string;
    }
  ): Promise<PayPalTransaction[]> {
    const response = await this.request<{ transaction_details: PayPalTransaction[] }>(
      userId,
      '/v1/reporting/transactions',
      {
        params: {
          start_date: options.start_date,
          end_date: options.end_date,
          transaction_status: options.transaction_status,
          fields: 'transaction_info,payer_info,cart_info',
        },
      }
    );
    return response.data.transaction_details || [];
  }

  // --- ORDERS ---

  async getOrder(userId: string, orderId: string): Promise<PayPalOrder> {
    const response = await this.request<PayPalOrder>(
      userId,
      `/v2/checkout/orders/${orderId}`
    );
    return response.data;
  }

  async createOrder(
    userId: string,
    order: {
      intent: 'CAPTURE' | 'AUTHORIZE';
      purchase_units: Array<{
        amount: { currency_code: string; value: string };
        description?: string;
      }>;
    }
  ): Promise<PayPalOrder> {
    const response = await this.request<PayPalOrder>(
      userId,
      '/v2/checkout/orders',
      {
        method: 'POST',
        body: order,
      }
    );
    return response.data;
  }

  async captureOrder(userId: string, orderId: string): Promise<PayPalOrder> {
    const response = await this.request<PayPalOrder>(
      userId,
      `/v2/checkout/orders/${orderId}/capture`,
      { method: 'POST' }
    );
    return response.data;
  }

  // --- PAYOUTS ---

  async createPayout(
    userId: string,
    payout: {
      sender_batch_header: {
        sender_batch_id: string;
        email_subject?: string;
        email_message?: string;
      };
      items: Array<{
        recipient_type: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
        amount: { value: string; currency: string };
        receiver: string;
        note?: string;
      }>;
    }
  ): Promise<{ batch_header: { payout_batch_id: string; batch_status: string } }> {
    const response = await this.request<{ batch_header: { payout_batch_id: string; batch_status: string } }>(
      userId,
      '/v1/payments/payouts',
      {
        method: 'POST',
        body: payout,
      }
    );
    return response.data;
  }

  async getPayoutBatch(userId: string, payoutBatchId: string): Promise<{
    batch_header: { payout_batch_id: string; batch_status: string; amount: { value: string; currency: string } };
    items: Array<{ payout_item_id: string; transaction_status: string }>;
  }> {
    const response = await this.request<{
      batch_header: { payout_batch_id: string; batch_status: string; amount: { value: string; currency: string } };
      items: Array<{ payout_item_id: string; transaction_status: string }>;
    }>(
      userId,
      `/v1/payments/payouts/${payoutBatchId}`
    );
    return response.data;
  }
}

// ============================================
// XERO SERVICE
// ============================================
export class XeroService extends BaseIntegrationService {
  constructor() {
    super('xero');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;

    // Xero wraps results in entity-specific keys
    const keys = ['Contacts', 'Invoices', 'Payments', 'Accounts', 'Items'];
    let items: T[] = [];

    for (const key of keys) {
      if (response[key]) {
        items = response[key] as T[];
        break;
      }
    }

    return {
      items,
      hasMore: false,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.request(userId, '/api.xro/2.0/Organisation', {
        headers: { 'xero-tenant-id': await this.getTenantId(userId) },
      });
      return true;
    } catch {
      return false;
    }
  }

  private async getTenantId(userId: string): Promise<string> {
    const { integration } = await this.getAccessToken(userId);
    return integration.metadata?.tenantId as string || '';
  }

  /**
   * Get organization info
   */
  async getOrganisation(userId: string): Promise<{ Name: string; CountryCode: string; BaseCurrency: string }> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{
      Organisations: Array<{ Name: string; CountryCode: string; BaseCurrency: string }>;
    }>(
      userId,
      '/api.xro/2.0/Organisation',
      {
        headers: { 'xero-tenant-id': tenantId },
      }
    );
    return response.data.Organisations[0];
  }

  // --- CONTACTS ---

  async listContacts(userId: string): Promise<XeroContact[]> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Contacts: XeroContact[] }>(
      userId,
      '/api.xro/2.0/Contacts',
      {
        headers: { 'xero-tenant-id': tenantId },
      }
    );
    return response.data.Contacts || [];
  }

  async getContact(userId: string, contactId: string): Promise<XeroContact> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Contacts: XeroContact[] }>(
      userId,
      `/api.xro/2.0/Contacts/${contactId}`,
      {
        headers: { 'xero-tenant-id': tenantId },
      }
    );
    return response.data.Contacts[0];
  }

  async createContact(
    userId: string,
    contact: { Name: string; EmailAddress?: string; FirstName?: string; LastName?: string }
  ): Promise<XeroContact> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Contacts: XeroContact[] }>(
      userId,
      '/api.xro/2.0/Contacts',
      {
        method: 'POST',
        headers: { 'xero-tenant-id': tenantId },
        body: { Contacts: [contact] },
      }
    );
    return response.data.Contacts[0];
  }

  // --- INVOICES ---

  async listInvoices(userId: string, options: { Status?: string } = {}): Promise<XeroInvoice[]> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Invoices: XeroInvoice[] }>(
      userId,
      '/api.xro/2.0/Invoices',
      {
        headers: { 'xero-tenant-id': tenantId },
        params: options,
      }
    );
    return response.data.Invoices || [];
  }

  async getInvoice(userId: string, invoiceId: string): Promise<XeroInvoice> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Invoices: XeroInvoice[] }>(
      userId,
      `/api.xro/2.0/Invoices/${invoiceId}`,
      {
        headers: { 'xero-tenant-id': tenantId },
      }
    );
    return response.data.Invoices[0];
  }

  async createInvoice(
    userId: string,
    invoice: {
      Type: 'ACCREC' | 'ACCPAY';
      Contact: { ContactID: string };
      Date: string;
      DueDate: string;
      LineItems: Array<{
        Description: string;
        Quantity: number;
        UnitAmount: number;
        AccountCode: string;
      }>;
    }
  ): Promise<XeroInvoice> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Invoices: XeroInvoice[] }>(
      userId,
      '/api.xro/2.0/Invoices',
      {
        method: 'POST',
        headers: { 'xero-tenant-id': tenantId },
        body: { Invoices: [invoice] },
      }
    );
    return response.data.Invoices[0];
  }

  // --- PAYMENTS ---

  async listPayments(userId: string): Promise<XeroPayment[]> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Payments: XeroPayment[] }>(
      userId,
      '/api.xro/2.0/Payments',
      {
        headers: { 'xero-tenant-id': tenantId },
      }
    );
    return response.data.Payments || [];
  }

  async createPayment(
    userId: string,
    payment: {
      Invoice: { InvoiceID: string };
      Account: { Code: string };
      Date: string;
      Amount: number;
    }
  ): Promise<XeroPayment> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Payments: XeroPayment[] }>(
      userId,
      '/api.xro/2.0/Payments',
      {
        method: 'POST',
        headers: { 'xero-tenant-id': tenantId },
        body: { Payments: [payment] },
      }
    );
    return response.data.Payments[0];
  }

  // --- ACCOUNTS ---

  async listAccounts(userId: string): Promise<XeroAccount[]> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request<{ Accounts: XeroAccount[] }>(
      userId,
      '/api.xro/2.0/Accounts',
      {
        headers: { 'xero-tenant-id': tenantId },
      }
    );
    return response.data.Accounts || [];
  }

  // --- REPORTS ---

  async getBalanceSheet(userId: string, date?: string): Promise<unknown> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request(
      userId,
      '/api.xro/2.0/Reports/BalanceSheet',
      {
        headers: { 'xero-tenant-id': tenantId },
        params: date ? { date } : undefined,
      }
    );
    return response.data;
  }

  async getProfitAndLoss(
    userId: string,
    options: { fromDate?: string; toDate?: string } = {}
  ): Promise<unknown> {
    const tenantId = await this.getTenantId(userId);
    const response = await this.request(
      userId,
      '/api.xro/2.0/Reports/ProfitAndLoss',
      {
        headers: { 'xero-tenant-id': tenantId },
        params: options,
      }
    );
    return response.data;
  }
}

// Export singleton instances
export const quickbooksService = new QuickBooksService();
export const stripeService = new StripeService();
export const paypalService = new PayPalService();
export const xeroService = new XeroService();
