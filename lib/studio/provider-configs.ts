/**
 * FLOWENT AI STUDIO - PROVIDER CONFIGURATIONS
 *
 * Central registry of all external provider configurations.
 * Adding a new integration (e.g., Salesforce) requires ONLY adding an entry here.
 *
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type AuthType =
  | 'bearer'           // Authorization: Bearer <token>
  | 'api_key_header'   // X-Api-Key: <key> or custom header
  | 'api_key_query'    // ?api_key=<key>
  | 'basic'            // Authorization: Basic base64(user:pass)
  | 'oauth2'           // OAuth 2.0 with refresh token support
  | 'custom'           // Custom auth handler required
  | 'none';            // No authentication

export interface AuthSchema {
  type: AuthType;
  /** Header name for api_key_header type */
  headerName?: string;
  /** Query param name for api_key_query type */
  queryParamName?: string;
  /** OAuth2 token URL for refresh */
  tokenUrl?: string;
  /** OAuth2 scopes */
  scopes?: string[];
  /** Custom auth handler function name */
  customHandler?: string;
}

export interface RateLimitConfig {
  /** Requests per window */
  requests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Retry after header name */
  retryAfterHeader?: string;
}

export interface ProviderConfig {
  /** Provider identifier (matches node provider field) */
  id: string;
  /** Display name */
  name: string;
  /** Base URL for API requests */
  baseUrl: string;
  /** API version prefix (e.g., /v3, /api/v1) */
  apiVersion?: string;
  /** Authentication configuration */
  auth: AuthSchema;
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Response format */
  responseFormat?: 'json' | 'xml' | 'text';
  /** Pagination style */
  paginationStyle?: 'offset' | 'cursor' | 'page' | 'link';
  /** Error response path (e.g., 'error.message') */
  errorPath?: string;
  /** Success indicator path (e.g., 'success') */
  successPath?: string;
  /** Data wrapper path (e.g., 'data', 'results') */
  dataPath?: string;
  /** Sandbox/test base URL */
  sandboxUrl?: string;
  /** Documentation URL */
  docsUrl?: string;
  /** Icon name (Lucide icon) */
  icon?: string;
  /** Brand color */
  color?: string;
}

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  // -------------------------------------------------------------------------
  // CRM PROVIDERS
  // -------------------------------------------------------------------------
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    baseUrl: 'https://api.hubapi.com',
    apiVersion: '/crm/v3',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 100,
      windowSeconds: 10,
      retryAfterHeader: 'Retry-After',
    },
    paginationStyle: 'cursor',
    errorPath: 'message',
    dataPath: 'results',
    docsUrl: 'https://developers.hubspot.com/docs/api/overview',
    icon: 'Building2',
    color: '#FF7A59',
  },

  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    baseUrl: 'https://{instance}.salesforce.com',
    apiVersion: '/services/data/v58.0',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: ['api', 'refresh_token'],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 100,
      windowSeconds: 1,
    },
    paginationStyle: 'offset',
    errorPath: 'message',
    dataPath: 'records',
    sandboxUrl: 'https://test.salesforce.com',
    docsUrl: 'https://developer.salesforce.com/docs/apis',
    icon: 'Cloud',
    color: '#00A1E0',
  },

  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    baseUrl: 'https://api.pipedrive.com',
    apiVersion: '/v1',
    auth: {
      type: 'api_key_query',
      queryParamName: 'api_token',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 80,
      windowSeconds: 2,
    },
    paginationStyle: 'cursor',
    dataPath: 'data',
    successPath: 'success',
    docsUrl: 'https://developers.pipedrive.com/docs/api/v1',
    icon: 'Target',
    color: '#017737',
  },

  zoho_crm: {
    id: 'zoho_crm',
    name: 'Zoho CRM',
    baseUrl: 'https://www.zohoapis.com',
    apiVersion: '/crm/v2',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
      scopes: ['ZohoCRM.modules.ALL'],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'page',
    dataPath: 'data',
    docsUrl: 'https://www.zoho.com/crm/developer/docs/api/v2/',
    icon: 'Users',
    color: '#DC2626',
  },

  // -------------------------------------------------------------------------
  // COMMUNICATION PROVIDERS
  // -------------------------------------------------------------------------
  slack: {
    id: 'slack',
    name: 'Slack',
    baseUrl: 'https://slack.com',
    apiVersion: '/api',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    rateLimit: {
      requests: 50,
      windowSeconds: 60,
      retryAfterHeader: 'Retry-After',
    },
    paginationStyle: 'cursor',
    successPath: 'ok',
    errorPath: 'error',
    docsUrl: 'https://api.slack.com/methods',
    icon: 'MessageSquare',
    color: '#4A154B',
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    baseUrl: 'https://discord.com',
    apiVersion: '/api/v10',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 50,
      windowSeconds: 1,
      retryAfterHeader: 'X-RateLimit-Reset-After',
    },
    paginationStyle: 'cursor',
    docsUrl: 'https://discord.com/developers/docs',
    icon: 'MessageCircle',
    color: '#5865F2',
  },

  twilio: {
    id: 'twilio',
    name: 'Twilio',
    baseUrl: 'https://api.twilio.com',
    apiVersion: '/2010-04-01',
    auth: {
      type: 'basic',
    },
    defaultHeaders: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    responseFormat: 'json',
    docsUrl: 'https://www.twilio.com/docs/usage/api',
    icon: 'Phone',
    color: '#F22F46',
  },

  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    baseUrl: 'https://api.sendgrid.com',
    apiVersion: '/v3',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 600,
      windowSeconds: 60,
    },
    docsUrl: 'https://docs.sendgrid.com/api-reference',
    icon: 'Mail',
    color: '#1A82E2',
  },

  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    baseUrl: 'https://{dc}.api.mailchimp.com',
    apiVersion: '/3.0',
    auth: {
      type: 'basic',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'offset',
    docsUrl: 'https://mailchimp.com/developer/marketing/api/',
    icon: 'Mail',
    color: '#FFE01B',
  },

  // -------------------------------------------------------------------------
  // GOOGLE SERVICES
  // -------------------------------------------------------------------------
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    baseUrl: 'https://gmail.googleapis.com',
    apiVersion: '/gmail/v1',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'cursor',
    docsUrl: 'https://developers.google.com/gmail/api',
    icon: 'Mail',
    color: '#EA4335',
  },

  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar',
    baseUrl: 'https://www.googleapis.com',
    apiVersion: '/calendar/v3',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'cursor',
    docsUrl: 'https://developers.google.com/calendar/api',
    icon: 'Calendar',
    color: '#4285F4',
  },

  google_sheets: {
    id: 'google_sheets',
    name: 'Google Sheets',
    baseUrl: 'https://sheets.googleapis.com',
    apiVersion: '/v4',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    docsUrl: 'https://developers.google.com/sheets/api',
    icon: 'Table',
    color: '#0F9D58',
  },

  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    baseUrl: 'https://www.googleapis.com',
    apiVersion: '/drive/v3',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/drive',
      ],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'cursor',
    docsUrl: 'https://developers.google.com/drive/api',
    icon: 'HardDrive',
    color: '#4285F4',
  },

  // -------------------------------------------------------------------------
  // PRODUCTIVITY PROVIDERS
  // -------------------------------------------------------------------------
  notion: {
    id: 'notion',
    name: 'Notion',
    baseUrl: 'https://api.notion.com',
    apiVersion: '/v1',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    rateLimit: {
      requests: 3,
      windowSeconds: 1,
    },
    paginationStyle: 'cursor',
    docsUrl: 'https://developers.notion.com/',
    icon: 'BookOpen',
    color: '#000000',
  },

  airtable: {
    id: 'airtable',
    name: 'Airtable',
    baseUrl: 'https://api.airtable.com',
    apiVersion: '/v0',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 5,
      windowSeconds: 1,
    },
    paginationStyle: 'offset',
    dataPath: 'records',
    docsUrl: 'https://airtable.com/developers/web/api',
    icon: 'Table',
    color: '#18BFFF',
  },

  asana: {
    id: 'asana',
    name: 'Asana',
    baseUrl: 'https://app.asana.com',
    apiVersion: '/api/1.0',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 1500,
      windowSeconds: 60,
    },
    paginationStyle: 'cursor',
    dataPath: 'data',
    docsUrl: 'https://developers.asana.com/docs',
    icon: 'CheckSquare',
    color: '#F06A6A',
  },

  trello: {
    id: 'trello',
    name: 'Trello',
    baseUrl: 'https://api.trello.com',
    apiVersion: '/1',
    auth: {
      type: 'api_key_query',
      queryParamName: 'key',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 100,
      windowSeconds: 10,
    },
    docsUrl: 'https://developer.atlassian.com/cloud/trello/',
    icon: 'LayoutDashboard',
    color: '#0052CC',
  },

  jira: {
    id: 'jira',
    name: 'Jira',
    baseUrl: 'https://{domain}.atlassian.net',
    apiVersion: '/rest/api/3',
    auth: {
      type: 'basic',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'offset',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    icon: 'Bug',
    color: '#0052CC',
  },

  monday: {
    id: 'monday',
    name: 'Monday.com',
    baseUrl: 'https://api.monday.com',
    apiVersion: '/v2',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 60,
      windowSeconds: 60,
    },
    docsUrl: 'https://developer.monday.com/api-reference/',
    icon: 'Calendar',
    color: '#FF3D57',
  },

  // -------------------------------------------------------------------------
  // DEVELOPMENT PROVIDERS
  // -------------------------------------------------------------------------
  github: {
    id: 'github',
    name: 'GitHub',
    baseUrl: 'https://api.github.com',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    rateLimit: {
      requests: 5000,
      windowSeconds: 3600,
      retryAfterHeader: 'X-RateLimit-Reset',
    },
    paginationStyle: 'link',
    docsUrl: 'https://docs.github.com/en/rest',
    icon: 'Github',
    color: '#181717',
  },

  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    baseUrl: 'https://gitlab.com',
    apiVersion: '/api/v4',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    paginationStyle: 'page',
    docsUrl: 'https://docs.gitlab.com/ee/api/',
    icon: 'GitBranch',
    color: '#FC6D26',
  },

  linear: {
    id: 'linear',
    name: 'Linear',
    baseUrl: 'https://api.linear.app',
    apiVersion: '/graphql',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    docsUrl: 'https://developers.linear.app/docs',
    icon: 'Zap',
    color: '#5E6AD2',
  },

  // -------------------------------------------------------------------------
  // PAYMENT PROVIDERS
  // -------------------------------------------------------------------------
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    baseUrl: 'https://api.stripe.com',
    apiVersion: '/v1',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    rateLimit: {
      requests: 100,
      windowSeconds: 1,
    },
    paginationStyle: 'cursor',
    dataPath: 'data',
    docsUrl: 'https://stripe.com/docs/api',
    icon: 'CreditCard',
    color: '#635BFF',
  },

  paypal: {
    id: 'paypal',
    name: 'PayPal',
    baseUrl: 'https://api-m.paypal.com',
    apiVersion: '/v2',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://api-m.paypal.com/v1/oauth2/token',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    sandboxUrl: 'https://api-m.sandbox.paypal.com',
    docsUrl: 'https://developer.paypal.com/docs/api/',
    icon: 'CreditCard',
    color: '#003087',
  },

  // -------------------------------------------------------------------------
  // AI PROVIDERS
  // -------------------------------------------------------------------------
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    apiVersion: '/v1',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 60,
      windowSeconds: 60,
    },
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    icon: 'Bot',
    color: '#10A37F',
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiVersion: '/v1',
    auth: {
      type: 'api_key_header',
      headerName: 'x-api-key',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    docsUrl: 'https://docs.anthropic.com/en/api',
    icon: 'Brain',
    color: '#D97757',
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai',
    apiVersion: '/v1',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    docsUrl: 'https://docs.cohere.com/reference',
    icon: 'Sparkles',
    color: '#D18EE2',
  },

  // -------------------------------------------------------------------------
  // STORAGE PROVIDERS
  // -------------------------------------------------------------------------
  aws_s3: {
    id: 'aws_s3',
    name: 'AWS S3',
    baseUrl: 'https://{bucket}.s3.{region}.amazonaws.com',
    auth: {
      type: 'custom',
      customHandler: 'awsSignatureV4',
    },
    defaultHeaders: {
      'Content-Type': 'application/octet-stream',
    },
    docsUrl: 'https://docs.aws.amazon.com/s3/index.html',
    icon: 'Cloud',
    color: '#FF9900',
  },

  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    baseUrl: 'https://api.dropboxapi.com',
    apiVersion: '/2',
    auth: {
      type: 'bearer',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    docsUrl: 'https://www.dropbox.com/developers/documentation',
    icon: 'Box',
    color: '#0061FF',
  },

  // -------------------------------------------------------------------------
  // ANALYTICS PROVIDERS
  // -------------------------------------------------------------------------
  google_analytics: {
    id: 'google_analytics',
    name: 'Google Analytics',
    baseUrl: 'https://analyticsdata.googleapis.com',
    apiVersion: '/v1beta',
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
      ],
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting',
    icon: 'BarChart',
    color: '#E37400',
  },

  mixpanel: {
    id: 'mixpanel',
    name: 'Mixpanel',
    baseUrl: 'https://mixpanel.com',
    apiVersion: '/api/2.0',
    auth: {
      type: 'basic',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    docsUrl: 'https://developer.mixpanel.com/reference',
    icon: 'PieChart',
    color: '#7856FF',
  },

  // -------------------------------------------------------------------------
  // GENERIC HTTP (for custom endpoints)
  // -------------------------------------------------------------------------
  http: {
    id: 'http',
    name: 'HTTP Request',
    baseUrl: '', // Dynamic - set per request
    auth: {
      type: 'none',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    responseFormat: 'json',
    icon: 'Globe',
    color: '#6366F1',
  },

  webhook: {
    id: 'webhook',
    name: 'Webhook',
    baseUrl: '', // Dynamic - set per request
    auth: {
      type: 'none',
    },
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    icon: 'Webhook',
    color: '#8B5CF6',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get provider configuration by ID
 */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerId];
}

/**
 * Get all providers for a category
 */
export function getProvidersByCategory(category: string): ProviderConfig[] {
  const categoryMap: Record<string, string[]> = {
    crm: ['hubspot', 'salesforce', 'pipedrive', 'zoho_crm'],
    communication: ['slack', 'discord', 'twilio', 'sendgrid', 'mailchimp'],
    google: ['gmail', 'google_calendar', 'google_sheets', 'google_drive'],
    productivity: ['notion', 'airtable', 'asana', 'trello', 'jira', 'monday'],
    development: ['github', 'gitlab', 'linear'],
    payment: ['stripe', 'paypal'],
    ai: ['openai', 'anthropic', 'cohere'],
    storage: ['aws_s3', 'dropbox'],
    analytics: ['google_analytics', 'mixpanel'],
    generic: ['http', 'webhook'],
  };

  const providerIds = categoryMap[category] || [];
  return providerIds.map(id => PROVIDER_CONFIGS[id]).filter(Boolean);
}

/**
 * Check if provider requires OAuth2 flow
 */
export function requiresOAuth(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return config?.auth.type === 'oauth2';
}

/**
 * Get all OAuth2 providers
 */
export function getOAuthProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(p => p.auth.type === 'oauth2');
}

/**
 * Build full API URL for a provider
 */
export function buildApiUrl(
  providerId: string,
  endpoint: string,
  params?: Record<string, string>
): string {
  const config = getProviderConfig(providerId);
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  let baseUrl = config.baseUrl;

  // Replace template variables in baseUrl (e.g., {instance}, {dc})
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      baseUrl = baseUrl.replace(`{${key}}`, value);
    }
  }

  const version = config.apiVersion || '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return `${baseUrl}${version}${cleanEndpoint}`;
}

/**
 * Get default headers for a provider
 */
export function getDefaultHeaders(providerId: string): Record<string, string> {
  const config = getProviderConfig(providerId);
  return { ...(config?.defaultHeaders || {}) };
}

/**
 * Check if rate limit should be applied
 */
export function hasRateLimit(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return !!config?.rateLimit;
}

/**
 * Get rate limit config
 */
export function getRateLimitConfig(providerId: string): RateLimitConfig | undefined {
  return getProviderConfig(providerId)?.rateLimit;
}

// ============================================================================
// OPERATION TEMPLATES
// ============================================================================

/**
 * Common REST operation templates for providers
 */
export const OPERATION_TEMPLATES: Record<string, {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  description: string;
}> = {
  // CRM Operations
  'crm:contact:list': {
    method: 'GET',
    endpoint: '/objects/contacts',
    description: 'List all contacts',
  },
  'crm:contact:get': {
    method: 'GET',
    endpoint: '/objects/contacts/{id}',
    description: 'Get contact by ID',
  },
  'crm:contact:create': {
    method: 'POST',
    endpoint: '/objects/contacts',
    description: 'Create a new contact',
  },
  'crm:contact:update': {
    method: 'PATCH',
    endpoint: '/objects/contacts/{id}',
    description: 'Update a contact',
  },
  'crm:contact:delete': {
    method: 'DELETE',
    endpoint: '/objects/contacts/{id}',
    description: 'Delete a contact',
  },
  'crm:deal:list': {
    method: 'GET',
    endpoint: '/objects/deals',
    description: 'List all deals',
  },
  'crm:deal:create': {
    method: 'POST',
    endpoint: '/objects/deals',
    description: 'Create a new deal',
  },

  // Communication Operations
  'slack:message:send': {
    method: 'POST',
    endpoint: '/chat.postMessage',
    description: 'Send a message to a channel',
  },
  'slack:channel:list': {
    method: 'GET',
    endpoint: '/conversations.list',
    description: 'List all channels',
  },

  // Email Operations
  'email:send': {
    method: 'POST',
    endpoint: '/mail/send',
    description: 'Send an email',
  },
  'email:list': {
    method: 'GET',
    endpoint: '/messages',
    description: 'List emails',
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PROVIDER_CONFIGS;
