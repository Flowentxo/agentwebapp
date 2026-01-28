/**
 * Tool Definitions - Frontend Schema for Action Configuration
 * Phase 13: Action Configuration UI & Variable Mapping
 *
 * Static tool configurations for the Action Config Panel.
 * Each tool has input fields that can be rendered dynamically.
 */

import { ToolCategory } from './interfaces';

// ============================================================================
// FIELD TYPES
// ============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'select'
  | 'boolean'
  | 'json';

export interface ToolFieldDefinition {
  /** Unique field key (camelCase) */
  key: string;
  /** Display label */
  label: string;
  /** Field type */
  type: FieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Field description/help text */
  description?: string;
  /** Validation pattern (regex) */
  pattern?: string;
  /** Select options (for type: 'select') */
  options?: Array<{ label: string; value: string }>;
  /** Whether this field supports variable interpolation */
  supportsVariables?: boolean;
  /** Minimum value (for type: 'number') */
  min?: number;
  /** Maximum value (for type: 'number') */
  max?: number;
  /** Rows for textarea */
  rows?: number;
}

export interface ToolDefinition {
  /** Unique tool identifier */
  id: string;
  /** Display name */
  name: string;
  /** Tool description */
  description: string;
  /** Category for grouping */
  category: ToolCategory;
  /** Provider (e.g., 'google', 'hubspot') */
  provider: string;
  /** Icon name for UI */
  icon: string;
  /** Primary color for UI */
  color: string;
  /** Input field definitions */
  fields: ToolFieldDefinition[];
  /** Output schema for variable picker */
  outputs: Array<{
    key: string;
    label: string;
    type: string;
    description?: string;
  }>;
  /** Required OAuth/API connection */
  requiredConnection?: string;
  /** Whether the tool is beta/experimental */
  isBeta?: boolean;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  // =========================================================================
  // GMAIL TOOLS
  // =========================================================================
  'gmail-send': {
    id: 'gmail-send',
    name: 'Gmail: Send Email',
    description: 'Send an email via Gmail API',
    category: 'communication',
    provider: 'google',
    icon: 'Mail',
    color: '#EA4335',
    requiredConnection: 'google',
    fields: [
      {
        key: 'to',
        label: 'To',
        type: 'email',
        placeholder: 'recipient@example.com or {{trigger.email}}',
        required: true,
        description: 'Recipient email address. Supports multiple addresses separated by comma.',
        supportsVariables: true,
      },
      {
        key: 'cc',
        label: 'CC',
        type: 'text',
        placeholder: 'cc@example.com',
        required: false,
        description: 'Carbon copy recipients (comma-separated)',
        supportsVariables: true,
      },
      {
        key: 'bcc',
        label: 'BCC',
        type: 'text',
        placeholder: 'bcc@example.com',
        required: false,
        description: 'Blind carbon copy recipients (comma-separated)',
        supportsVariables: true,
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'Enter email subject...',
        required: true,
        description: 'Email subject line',
        supportsVariables: true,
      },
      {
        key: 'body',
        label: 'Body',
        type: 'textarea',
        placeholder: 'Enter email content... Use {{variables}} for dynamic content.',
        required: true,
        description: 'Email body content. Supports HTML and variable interpolation.',
        supportsVariables: true,
        rows: 8,
      },
      {
        key: 'isHtml',
        label: 'Send as HTML',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable to send HTML formatted emails',
      },
    ],
    outputs: [
      { key: 'messageId', label: 'Message ID', type: 'string', description: 'Gmail message ID' },
      { key: 'threadId', label: 'Thread ID', type: 'string', description: 'Email thread ID' },
      { key: 'labelIds', label: 'Label IDs', type: 'array', description: 'Applied labels' },
    ],
  },

  'gmail-read': {
    id: 'gmail-read',
    name: 'Gmail: Read Messages',
    description: 'Read emails from Gmail inbox',
    category: 'communication',
    provider: 'google',
    icon: 'Inbox',
    color: '#EA4335',
    requiredConnection: 'google',
    fields: [
      {
        key: 'query',
        label: 'Search Query',
        type: 'text',
        placeholder: 'is:unread from:{{trigger.senderEmail}}',
        required: false,
        description: 'Gmail search query (e.g., "is:unread", "from:someone@example.com")',
        supportsVariables: true,
      },
      {
        key: 'maxResults',
        label: 'Max Results',
        type: 'number',
        defaultValue: 10,
        min: 1,
        max: 100,
        description: 'Maximum number of emails to retrieve',
      },
      {
        key: 'labelIds',
        label: 'Label Filter',
        type: 'select',
        options: [
          { label: 'All', value: '' },
          { label: 'Inbox', value: 'INBOX' },
          { label: 'Sent', value: 'SENT' },
          { label: 'Drafts', value: 'DRAFT' },
          { label: 'Spam', value: 'SPAM' },
          { label: 'Trash', value: 'TRASH' },
        ],
        description: 'Filter by Gmail label',
      },
    ],
    outputs: [
      { key: 'messages', label: 'Messages', type: 'array', description: 'List of email messages' },
      { key: 'count', label: 'Count', type: 'number', description: 'Number of messages found' },
    ],
  },

  // =========================================================================
  // HUBSPOT TOOLS
  // =========================================================================
  'hubspot-create-contact': {
    id: 'hubspot-create-contact',
    name: 'HubSpot: Create Contact',
    description: 'Create a new contact in HubSpot CRM',
    category: 'crm',
    provider: 'hubspot',
    icon: 'UserPlus',
    color: '#FF7A59',
    requiredConnection: 'hubspot',
    fields: [
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        placeholder: '{{trigger.email}}',
        required: true,
        description: 'Contact email address (required, must be unique)',
        supportsVariables: true,
      },
      {
        key: 'firstname',
        label: 'First Name',
        type: 'text',
        placeholder: '{{trigger.firstName}}',
        required: false,
        description: 'Contact first name',
        supportsVariables: true,
      },
      {
        key: 'lastname',
        label: 'Last Name',
        type: 'text',
        placeholder: '{{trigger.lastName}}',
        required: false,
        description: 'Contact last name',
        supportsVariables: true,
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'text',
        placeholder: '+1 (555) 123-4567',
        required: false,
        description: 'Contact phone number',
        supportsVariables: true,
      },
      {
        key: 'company',
        label: 'Company',
        type: 'text',
        placeholder: '{{trigger.company}}',
        required: false,
        description: 'Company name',
        supportsVariables: true,
      },
      {
        key: 'jobtitle',
        label: 'Job Title',
        type: 'text',
        placeholder: 'CEO, Manager, Developer...',
        required: false,
        description: 'Contact job title',
        supportsVariables: true,
      },
      {
        key: 'lifecyclestage',
        label: 'Lifecycle Stage',
        type: 'select',
        defaultValue: 'lead',
        options: [
          { label: 'Subscriber', value: 'subscriber' },
          { label: 'Lead', value: 'lead' },
          { label: 'Marketing Qualified Lead', value: 'marketingqualifiedlead' },
          { label: 'Sales Qualified Lead', value: 'salesqualifiedlead' },
          { label: 'Opportunity', value: 'opportunity' },
          { label: 'Customer', value: 'customer' },
          { label: 'Evangelist', value: 'evangelist' },
          { label: 'Other', value: 'other' },
        ],
        description: 'Contact lifecycle stage in the sales funnel',
      },
    ],
    outputs: [
      { key: 'id', label: 'Contact ID', type: 'string', description: 'HubSpot contact ID' },
      { key: 'email', label: 'Email', type: 'string', description: 'Contact email' },
      { key: 'createdAt', label: 'Created At', type: 'date', description: 'Creation timestamp' },
      { key: 'properties', label: 'Properties', type: 'object', description: 'All contact properties' },
    ],
  },

  'hubspot-update-contact': {
    id: 'hubspot-update-contact',
    name: 'HubSpot: Update Contact',
    description: 'Update an existing contact in HubSpot CRM',
    category: 'crm',
    provider: 'hubspot',
    icon: 'UserCog',
    color: '#FF7A59',
    requiredConnection: 'hubspot',
    fields: [
      {
        key: 'contactId',
        label: 'Contact ID',
        type: 'text',
        placeholder: '{{node_1.output.id}}',
        required: true,
        description: 'HubSpot contact ID to update',
        supportsVariables: true,
      },
      {
        key: 'firstname',
        label: 'First Name',
        type: 'text',
        placeholder: 'Leave empty to keep current value',
        required: false,
        supportsVariables: true,
      },
      {
        key: 'lastname',
        label: 'Last Name',
        type: 'text',
        placeholder: 'Leave empty to keep current value',
        required: false,
        supportsVariables: true,
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'text',
        required: false,
        supportsVariables: true,
      },
      {
        key: 'company',
        label: 'Company',
        type: 'text',
        required: false,
        supportsVariables: true,
      },
      {
        key: 'lifecyclestage',
        label: 'Lifecycle Stage',
        type: 'select',
        options: [
          { label: 'Keep Current', value: '' },
          { label: 'Subscriber', value: 'subscriber' },
          { label: 'Lead', value: 'lead' },
          { label: 'Marketing Qualified Lead', value: 'marketingqualifiedlead' },
          { label: 'Sales Qualified Lead', value: 'salesqualifiedlead' },
          { label: 'Opportunity', value: 'opportunity' },
          { label: 'Customer', value: 'customer' },
        ],
      },
    ],
    outputs: [
      { key: 'id', label: 'Contact ID', type: 'string' },
      { key: 'updatedAt', label: 'Updated At', type: 'date' },
      { key: 'properties', label: 'Properties', type: 'object' },
    ],
  },

  'hubspot-create-deal': {
    id: 'hubspot-create-deal',
    name: 'HubSpot: Create Deal',
    description: 'Create a new deal in HubSpot CRM',
    category: 'crm',
    provider: 'hubspot',
    icon: 'DollarSign',
    color: '#FF7A59',
    requiredConnection: 'hubspot',
    fields: [
      {
        key: 'dealname',
        label: 'Deal Name',
        type: 'text',
        placeholder: '{{trigger.dealName}} - New Opportunity',
        required: true,
        supportsVariables: true,
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'number',
        placeholder: '10000',
        required: false,
        min: 0,
        description: 'Deal value in default currency',
      },
      {
        key: 'pipeline',
        label: 'Pipeline',
        type: 'select',
        defaultValue: 'default',
        options: [
          { label: 'Default Pipeline', value: 'default' },
          { label: 'Sales Pipeline', value: 'sales' },
          { label: 'Enterprise Pipeline', value: 'enterprise' },
        ],
      },
      {
        key: 'dealstage',
        label: 'Deal Stage',
        type: 'select',
        defaultValue: 'appointmentscheduled',
        options: [
          { label: 'Appointment Scheduled', value: 'appointmentscheduled' },
          { label: 'Qualified to Buy', value: 'qualifiedtobuy' },
          { label: 'Presentation Scheduled', value: 'presentationscheduled' },
          { label: 'Decision Maker Bought-In', value: 'decisionmakerboughtin' },
          { label: 'Contract Sent', value: 'contractsent' },
          { label: 'Closed Won', value: 'closedwon' },
          { label: 'Closed Lost', value: 'closedlost' },
        ],
      },
      {
        key: 'closedate',
        label: 'Expected Close Date',
        type: 'text',
        placeholder: 'YYYY-MM-DD',
        required: false,
        supportsVariables: true,
      },
    ],
    outputs: [
      { key: 'id', label: 'Deal ID', type: 'string' },
      { key: 'dealname', label: 'Deal Name', type: 'string' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'dealstage', label: 'Stage', type: 'string' },
      { key: 'createdAt', label: 'Created At', type: 'date' },
    ],
  },

  // =========================================================================
  // UTILITY TOOLS
  // =========================================================================
  'web-search': {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web and retrieve results',
    category: 'utility',
    provider: 'internal',
    icon: 'Search',
    color: '#3B82F6',
    fields: [
      {
        key: 'query',
        label: 'Search Query',
        type: 'text',
        placeholder: '{{trigger.searchTerm}} latest news',
        required: true,
        description: 'Search query string',
        supportsVariables: true,
      },
      {
        key: 'numResults',
        label: 'Number of Results',
        type: 'number',
        defaultValue: 10,
        min: 1,
        max: 50,
        description: 'Maximum number of results to return',
      },
      {
        key: 'provider',
        label: 'Search Provider',
        type: 'select',
        defaultValue: 'duckduckgo',
        options: [
          { label: 'DuckDuckGo (Free)', value: 'duckduckgo' },
          { label: 'Brave Search', value: 'brave' },
          { label: 'Google Search', value: 'google' },
        ],
      },
    ],
    outputs: [
      { key: 'results', label: 'Results', type: 'array', description: 'List of search results' },
      { key: 'count', label: 'Result Count', type: 'number' },
    ],
  },

  'http-request': {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'Make an HTTP request to any API',
    category: 'utility',
    provider: 'internal',
    icon: 'Globe',
    color: '#10B981',
    fields: [
      {
        key: 'url',
        label: 'URL',
        type: 'url',
        placeholder: 'https://api.example.com/endpoint',
        required: true,
        supportsVariables: true,
      },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        defaultValue: 'GET',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      {
        key: 'headers',
        label: 'Headers',
        type: 'json',
        placeholder: '{"Authorization": "Bearer {{secrets.apiKey}}"}',
        required: false,
        description: 'Request headers as JSON object',
        supportsVariables: true,
      },
      {
        key: 'body',
        label: 'Request Body',
        type: 'json',
        placeholder: '{"key": "{{trigger.value}}"}',
        required: false,
        description: 'Request body as JSON (for POST/PUT/PATCH)',
        supportsVariables: true,
        rows: 6,
      },
    ],
    outputs: [
      { key: 'statusCode', label: 'Status Code', type: 'number' },
      { key: 'data', label: 'Response Data', type: 'object' },
      { key: 'headers', label: 'Response Headers', type: 'object' },
    ],
  },

  'slack-send': {
    id: 'slack-send',
    name: 'Slack: Send Message',
    description: 'Send a message to a Slack channel',
    category: 'communication',
    provider: 'slack',
    icon: 'MessageSquare',
    color: '#4A154B',
    requiredConnection: 'slack',
    fields: [
      {
        key: 'channel',
        label: 'Channel',
        type: 'text',
        placeholder: '#general or {{trigger.slackChannel}}',
        required: true,
        description: 'Channel name (with #) or channel ID',
        supportsVariables: true,
      },
      {
        key: 'text',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Hello from the workflow! Deal {{trigger.dealName}} was created.',
        required: true,
        description: 'Message text (supports Slack markdown)',
        supportsVariables: true,
        rows: 4,
      },
      {
        key: 'thread_ts',
        label: 'Reply to Thread',
        type: 'text',
        placeholder: '{{node_1.output.ts}}',
        required: false,
        description: 'Thread timestamp to reply to',
        supportsVariables: true,
      },
    ],
    outputs: [
      { key: 'ok', label: 'Success', type: 'boolean' },
      { key: 'ts', label: 'Message Timestamp', type: 'string' },
      { key: 'channel', label: 'Channel ID', type: 'string' },
    ],
  },

  'delay': {
    id: 'delay',
    name: 'Delay',
    description: 'Wait for a specified amount of time',
    category: 'utility',
    provider: 'internal',
    icon: 'Clock',
    color: '#6366F1',
    fields: [
      {
        key: 'duration',
        label: 'Duration',
        type: 'number',
        defaultValue: 5,
        min: 1,
        max: 86400,
        required: true,
        description: 'Time to wait',
      },
      {
        key: 'unit',
        label: 'Unit',
        type: 'select',
        defaultValue: 'seconds',
        options: [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
        ],
      },
    ],
    outputs: [
      { key: 'waited', label: 'Waited (ms)', type: 'number' },
      { key: 'completedAt', label: 'Completed At', type: 'date' },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all tools grouped by category
 */
export function getToolsByCategory(): Record<ToolCategory, ToolDefinition[]> {
  const grouped: Record<string, ToolDefinition[]> = {};

  for (const tool of Object.values(TOOL_DEFINITIONS)) {
    if (!grouped[tool.category]) {
      grouped[tool.category] = [];
    }
    grouped[tool.category].push(tool);
  }

  return grouped as Record<ToolCategory, ToolDefinition[]>;
}

/**
 * Get all tools as a flat array
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS);
}

/**
 * Get a tool by its ID
 */
export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[id];
}

/**
 * Get tools by provider
 */
export function getToolsByProvider(provider: string): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS).filter(t => t.provider === provider);
}

/**
 * Icon mapping for tools (used in UI)
 */
export const TOOL_ICON_MAP: Record<string, string> = {
  Mail: 'Mail',
  Inbox: 'Inbox',
  UserPlus: 'UserPlus',
  UserCog: 'UserCog',
  DollarSign: 'DollarSign',
  Search: 'Search',
  Globe: 'Globe',
  MessageSquare: 'MessageSquare',
  Clock: 'Clock',
};
