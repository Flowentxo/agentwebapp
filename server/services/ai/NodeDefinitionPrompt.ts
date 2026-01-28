/**
 * Node Definition Prompts for Workflow Architect AI
 * Phase 8: AI-Powered Workflow Generation
 *
 * This module provides system prompts that describe our node library
 * to the LLM, enabling accurate workflow generation.
 */

// ============================================================================
// Types
// ============================================================================

export interface NodeDefinition {
  type: string;
  category: 'trigger' | 'action' | 'logic' | 'transform' | 'integration';
  name: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema: ConfigField[];
  examples?: string[];
}

export interface NodePort {
  id: string;
  name: string;
  type: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'template' | 'json';
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  placeholder?: string;
}

// ============================================================================
// Node Library Definition
// ============================================================================

export const NODE_LIBRARY: NodeDefinition[] = [
  // -------------------------------------------------------------------------
  // TRIGGERS
  // -------------------------------------------------------------------------
  {
    type: 'trigger_webhook',
    category: 'trigger',
    name: 'Webhook Trigger',
    description: 'Starts the workflow when an HTTP request is received. Captures the request body, headers, and query parameters.',
    inputs: [],
    outputs: [
      { id: 'body', name: 'Body', type: 'object', description: 'The JSON body of the incoming request' },
      { id: 'headers', name: 'Headers', type: 'object', description: 'HTTP headers from the request' },
      { id: 'query', name: 'Query', type: 'object', description: 'URL query parameters' },
      { id: 'method', name: 'Method', type: 'string', description: 'HTTP method (GET, POST, etc.)' },
    ],
    configSchema: [
      { key: 'path', label: 'Webhook Path', type: 'string', required: true, placeholder: '/my-webhook' },
      { key: 'method', label: 'HTTP Method', type: 'select', options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
      ], default: 'POST' },
      { key: 'authRequired', label: 'Require Authentication', type: 'boolean', default: false },
    ],
    examples: [
      'When I receive a webhook',
      'On new form submission',
      'When external system calls my API',
    ],
  },
  {
    type: 'trigger_schedule',
    category: 'trigger',
    name: 'Schedule Trigger',
    description: 'Runs the workflow on a schedule (cron expression or interval).',
    inputs: [],
    outputs: [
      { id: 'timestamp', name: 'Timestamp', type: 'string', description: 'ISO timestamp when triggered' },
      { id: 'scheduleName', name: 'Schedule Name', type: 'string', description: 'Name of the schedule' },
    ],
    configSchema: [
      { key: 'cronExpression', label: 'Cron Expression', type: 'string', placeholder: '0 9 * * *' },
      { key: 'timezone', label: 'Timezone', type: 'string', default: 'UTC' },
      { key: 'name', label: 'Schedule Name', type: 'string' },
    ],
    examples: [
      'Every day at 9am',
      'Every hour',
      'On the first of every month',
    ],
  },
  {
    type: 'trigger_event',
    category: 'trigger',
    name: 'Event Trigger',
    description: 'Starts when a specific internal event occurs (e.g., new user, payment received).',
    inputs: [],
    outputs: [
      { id: 'eventType', name: 'Event Type', type: 'string' },
      { id: 'payload', name: 'Payload', type: 'object' },
      { id: 'timestamp', name: 'Timestamp', type: 'string' },
    ],
    configSchema: [
      { key: 'eventType', label: 'Event Type', type: 'select', options: [
        { value: 'user.created', label: 'User Created' },
        { value: 'user.updated', label: 'User Updated' },
        { value: 'payment.received', label: 'Payment Received' },
        { value: 'order.placed', label: 'Order Placed' },
        { value: 'lead.created', label: 'Lead Created' },
        { value: 'custom', label: 'Custom Event' },
      ]},
      { key: 'customEventName', label: 'Custom Event Name', type: 'string' },
    ],
    examples: [
      'When a new user signs up',
      'When payment is received',
      'On new lead',
    ],
  },

  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------
  {
    type: 'action_http',
    category: 'action',
    name: 'HTTP Request',
    description: 'Makes an HTTP request to an external API. Supports all methods and custom headers.',
    inputs: [
      { id: 'url', name: 'URL', type: 'string', description: 'Target URL (can use variables)' },
      { id: 'body', name: 'Body', type: 'object', description: 'Request body for POST/PUT' },
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'object', description: 'The parsed JSON response' },
      { id: 'statusCode', name: 'Status Code', type: 'number' },
      { id: 'headers', name: 'Response Headers', type: 'object' },
    ],
    configSchema: [
      { key: 'url', label: 'URL', type: 'template', required: true, placeholder: 'https://api.example.com/{{path}}' },
      { key: 'method', label: 'Method', type: 'select', options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
        { value: 'DELETE', label: 'DELETE' },
      ], default: 'GET' },
      { key: 'headers', label: 'Headers', type: 'json', default: {} },
      { key: 'body', label: 'Body', type: 'json' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000 },
    ],
    examples: [
      'Call external API',
      'Fetch data from URL',
      'Send POST request to webhook',
    ],
  },
  {
    type: 'action_email',
    category: 'action',
    name: 'Send Email',
    description: 'Sends an email using the configured email provider.',
    inputs: [
      { id: 'to', name: 'To', type: 'string', required: true },
      { id: 'subject', name: 'Subject', type: 'string', required: true },
      { id: 'body', name: 'Body', type: 'string' },
    ],
    outputs: [
      { id: 'messageId', name: 'Message ID', type: 'string' },
      { id: 'success', name: 'Success', type: 'boolean' },
    ],
    configSchema: [
      { key: 'to', label: 'To', type: 'template', required: true, placeholder: '{{contact.email}}' },
      { key: 'cc', label: 'CC', type: 'template' },
      { key: 'bcc', label: 'BCC', type: 'template' },
      { key: 'subject', label: 'Subject', type: 'template', required: true },
      { key: 'bodyType', label: 'Body Type', type: 'select', options: [
        { value: 'text', label: 'Plain Text' },
        { value: 'html', label: 'HTML' },
      ], default: 'text' },
      { key: 'body', label: 'Body', type: 'template', required: true },
      { key: 'from', label: 'From (optional)', type: 'string' },
    ],
    examples: [
      'Send welcome email',
      'Email notification to user',
      'Send confirmation email',
    ],
  },
  {
    type: 'action_slack',
    category: 'action',
    name: 'Send Slack Message',
    description: 'Sends a message to a Slack channel or user.',
    inputs: [
      { id: 'channel', name: 'Channel', type: 'string', required: true },
      { id: 'message', name: 'Message', type: 'string', required: true },
    ],
    outputs: [
      { id: 'ts', name: 'Message Timestamp', type: 'string' },
      { id: 'success', name: 'Success', type: 'boolean' },
    ],
    configSchema: [
      { key: 'channel', label: 'Channel', type: 'template', required: true, placeholder: '#general' },
      { key: 'message', label: 'Message', type: 'template', required: true },
      { key: 'username', label: 'Bot Username', type: 'string' },
      { key: 'iconEmoji', label: 'Icon Emoji', type: 'string', placeholder: ':robot_face:' },
      { key: 'blocks', label: 'Block Kit JSON', type: 'json', description: 'Advanced Slack Block Kit layout' },
    ],
    examples: [
      'Send Slack notification',
      'Post to Slack channel',
      'Alert team on Slack',
    ],
  },
  {
    type: 'action_database',
    category: 'action',
    name: 'Database Query',
    description: 'Executes a SQL query against a connected database.',
    inputs: [
      { id: 'query', name: 'Query', type: 'string' },
      { id: 'params', name: 'Parameters', type: 'array' },
    ],
    outputs: [
      { id: 'rows', name: 'Rows', type: 'array', description: 'Query result rows' },
      { id: 'rowCount', name: 'Row Count', type: 'number' },
    ],
    configSchema: [
      { key: 'connectionId', label: 'Database Connection', type: 'select', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: [
        { value: 'select', label: 'SELECT' },
        { value: 'insert', label: 'INSERT' },
        { value: 'update', label: 'UPDATE' },
        { value: 'delete', label: 'DELETE' },
        { value: 'raw', label: 'Raw SQL' },
      ]},
      { key: 'table', label: 'Table', type: 'string' },
      { key: 'query', label: 'SQL Query', type: 'code' },
      { key: 'params', label: 'Query Parameters', type: 'json', default: [] },
    ],
    examples: [
      'Query database',
      'Insert into database',
      'Update database record',
    ],
  },
  {
    type: 'action_ai',
    category: 'action',
    name: 'AI Completion',
    description: 'Generates text using an AI model (GPT-4, Claude, etc.).',
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'string', required: true },
      { id: 'context', name: 'Context', type: 'string' },
    ],
    outputs: [
      { id: 'completion', name: 'Completion', type: 'string', description: 'The AI-generated text' },
      { id: 'tokensUsed', name: 'Tokens Used', type: 'number' },
    ],
    configSchema: [
      { key: 'model', label: 'Model', type: 'select', options: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      ], default: 'gpt-4o' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'template' },
      { key: 'prompt', label: 'User Prompt', type: 'template', required: true },
      { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000 },
    ],
    examples: [
      'Generate AI response',
      'Summarize with AI',
      'AI text completion',
    ],
  },

  // -------------------------------------------------------------------------
  // LOGIC
  // -------------------------------------------------------------------------
  {
    type: 'logic_if',
    category: 'logic',
    name: 'IF Condition',
    description: 'Branches the workflow based on a condition. Has TRUE and FALSE output paths.',
    inputs: [
      { id: 'value', name: 'Value', type: 'any', description: 'The value to evaluate' },
    ],
    outputs: [
      { id: 'true', name: 'True', type: 'any', description: 'Output when condition is true' },
      { id: 'false', name: 'False', type: 'any', description: 'Output when condition is false' },
    ],
    configSchema: [
      { key: 'leftOperand', label: 'Left Value', type: 'template', required: true },
      { key: 'operator', label: 'Operator', type: 'select', options: [
        { value: 'eq', label: 'Equals (==)' },
        { value: 'neq', label: 'Not Equals (!=)' },
        { value: 'gt', label: 'Greater Than (>)' },
        { value: 'gte', label: 'Greater or Equal (>=)' },
        { value: 'lt', label: 'Less Than (<)' },
        { value: 'lte', label: 'Less or Equal (<=)' },
        { value: 'contains', label: 'Contains' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
        { value: 'regex', label: 'Matches Regex' },
      ], required: true },
      { key: 'rightOperand', label: 'Right Value', type: 'template' },
    ],
    examples: [
      'If value equals',
      'Check condition',
      'Branch based on value',
    ],
  },
  {
    type: 'logic_switch',
    category: 'logic',
    name: 'Switch',
    description: 'Routes to different outputs based on multiple conditions (like a switch statement).',
    inputs: [
      { id: 'value', name: 'Value', type: 'any' },
    ],
    outputs: [
      { id: 'case_0', name: 'Case 1', type: 'any' },
      { id: 'case_1', name: 'Case 2', type: 'any' },
      { id: 'case_2', name: 'Case 3', type: 'any' },
      { id: 'default', name: 'Default', type: 'any' },
    ],
    configSchema: [
      { key: 'expression', label: 'Switch Expression', type: 'template', required: true },
      { key: 'cases', label: 'Cases', type: 'json', default: [
        { value: 'case1', output: 'case_0' },
        { value: 'case2', output: 'case_1' },
      ]},
    ],
    examples: [
      'Route based on type',
      'Switch on status',
      'Multiple conditions',
    ],
  },
  {
    type: 'logic_loop',
    category: 'logic',
    name: 'Loop / For Each',
    description: 'Iterates over an array, executing child nodes for each item.',
    inputs: [
      { id: 'items', name: 'Items', type: 'array', required: true, description: 'Array to iterate over' },
    ],
    outputs: [
      { id: 'item', name: 'Current Item', type: 'any', description: 'The current item in the loop' },
      { id: 'index', name: 'Index', type: 'number', description: 'Current iteration index' },
      { id: 'completed', name: 'Completed', type: 'array', description: 'Results after loop completes' },
    ],
    configSchema: [
      { key: 'items', label: 'Items Array', type: 'template', required: true, placeholder: '{{data.items}}' },
      { key: 'batchSize', label: 'Batch Size', type: 'number', default: 1, description: 'Process items in batches' },
      { key: 'concurrency', label: 'Concurrency', type: 'number', default: 1 },
    ],
    examples: [
      'Loop through items',
      'For each record',
      'Iterate over array',
    ],
  },
  {
    type: 'logic_wait',
    category: 'logic',
    name: 'Wait / Delay',
    description: 'Pauses the workflow for a specified duration.',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'continued', name: 'Continued', type: 'any' },
    ],
    configSchema: [
      { key: 'duration', label: 'Duration (seconds)', type: 'number', required: true, default: 5 },
      { key: 'waitUntil', label: 'Wait Until (ISO date)', type: 'template', description: 'Alternative: wait until specific time' },
    ],
    examples: [
      'Wait 5 seconds',
      'Delay before next step',
      'Pause workflow',
    ],
  },
  {
    type: 'logic_parallel',
    category: 'logic',
    name: 'Parallel',
    description: 'Executes multiple branches in parallel and waits for all to complete.',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'branch_0', name: 'Branch 1', type: 'any' },
      { id: 'branch_1', name: 'Branch 2', type: 'any' },
      { id: 'branch_2', name: 'Branch 3', type: 'any' },
      { id: 'merged', name: 'Merged Results', type: 'object', description: 'All branch results combined' },
    ],
    configSchema: [
      { key: 'branches', label: 'Number of Branches', type: 'number', default: 2 },
      { key: 'waitForAll', label: 'Wait for All', type: 'boolean', default: true },
    ],
    examples: [
      'Run in parallel',
      'Execute simultaneously',
      'Fork and join',
    ],
  },

  // -------------------------------------------------------------------------
  // TRANSFORM
  // -------------------------------------------------------------------------
  {
    type: 'transform_set',
    category: 'transform',
    name: 'Set Variable',
    description: 'Sets or creates variables that can be used by subsequent nodes.',
    inputs: [
      { id: 'input', name: 'Input', type: 'any' },
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'object', description: 'Object containing all set variables' },
    ],
    configSchema: [
      { key: 'variables', label: 'Variables', type: 'json', default: {}, description: 'Key-value pairs to set' },
      { key: 'mode', label: 'Mode', type: 'select', options: [
        { value: 'set', label: 'Set (overwrite)' },
        { value: 'merge', label: 'Merge with existing' },
      ], default: 'set' },
    ],
    examples: [
      'Set variable',
      'Define value',
      'Create variable',
    ],
  },
  {
    type: 'transform_map',
    category: 'transform',
    name: 'Map / Transform',
    description: 'Transforms data from one structure to another using a mapping template.',
    inputs: [
      { id: 'input', name: 'Input', type: 'any', required: true },
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'any' },
    ],
    configSchema: [
      { key: 'mapping', label: 'Mapping Template', type: 'json', required: true, description: 'JSON template with {{variable}} references' },
      { key: 'keepOriginal', label: 'Keep Original Fields', type: 'boolean', default: false },
    ],
    examples: [
      'Transform data',
      'Map fields',
      'Reshape object',
    ],
  },
  {
    type: 'transform_filter',
    category: 'transform',
    name: 'Filter Array',
    description: 'Filters an array based on a condition.',
    inputs: [
      { id: 'items', name: 'Items', type: 'array', required: true },
    ],
    outputs: [
      { id: 'filtered', name: 'Filtered Items', type: 'array' },
      { id: 'excluded', name: 'Excluded Items', type: 'array' },
    ],
    configSchema: [
      { key: 'items', label: 'Items Array', type: 'template', required: true },
      { key: 'condition', label: 'Filter Condition', type: 'template', required: true, placeholder: 'item.status === "active"' },
    ],
    examples: [
      'Filter array',
      'Remove items',
      'Select matching items',
    ],
  },
  {
    type: 'transform_aggregate',
    category: 'transform',
    name: 'Aggregate',
    description: 'Aggregates array data (sum, count, average, etc.).',
    inputs: [
      { id: 'items', name: 'Items', type: 'array', required: true },
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'any' },
    ],
    configSchema: [
      { key: 'items', label: 'Items Array', type: 'template', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: [
        { value: 'count', label: 'Count' },
        { value: 'sum', label: 'Sum' },
        { value: 'average', label: 'Average' },
        { value: 'min', label: 'Minimum' },
        { value: 'max', label: 'Maximum' },
        { value: 'first', label: 'First' },
        { value: 'last', label: 'Last' },
        { value: 'concat', label: 'Concatenate' },
      ], required: true },
      { key: 'field', label: 'Field (for sum/avg)', type: 'string' },
    ],
    examples: [
      'Sum values',
      'Count items',
      'Calculate average',
    ],
  },
  {
    type: 'transform_code',
    category: 'transform',
    name: 'Custom Code',
    description: 'Executes custom JavaScript code for advanced transformations.',
    inputs: [
      { id: 'input', name: 'Input', type: 'any' },
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'any' },
    ],
    configSchema: [
      { key: 'code', label: 'JavaScript Code', type: 'code', required: true, description: 'Must return a value. Access input via `input` variable.' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 5000 },
    ],
    examples: [
      'Custom transformation',
      'Run JavaScript',
      'Complex logic',
    ],
  },

  // -------------------------------------------------------------------------
  // INTEGRATIONS
  // -------------------------------------------------------------------------
  {
    type: 'integration_hubspot',
    category: 'integration',
    name: 'HubSpot',
    description: 'Interacts with HubSpot CRM (contacts, deals, companies).',
    inputs: [
      { id: 'data', name: 'Data', type: 'object' },
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'object' },
      { id: 'id', name: 'Record ID', type: 'string' },
    ],
    configSchema: [
      { key: 'operation', label: 'Operation', type: 'select', options: [
        { value: 'createContact', label: 'Create Contact' },
        { value: 'updateContact', label: 'Update Contact' },
        { value: 'getContact', label: 'Get Contact' },
        { value: 'createDeal', label: 'Create Deal' },
        { value: 'updateDeal', label: 'Update Deal' },
        { value: 'createCompany', label: 'Create Company' },
        { value: 'search', label: 'Search Records' },
      ], required: true },
      { key: 'objectType', label: 'Object Type', type: 'select', options: [
        { value: 'contact', label: 'Contact' },
        { value: 'deal', label: 'Deal' },
        { value: 'company', label: 'Company' },
        { value: 'ticket', label: 'Ticket' },
      ]},
      { key: 'properties', label: 'Properties', type: 'json' },
      { key: 'recordId', label: 'Record ID', type: 'template' },
    ],
    examples: [
      'Create HubSpot contact',
      'Update deal in HubSpot',
      'Get HubSpot company',
    ],
  },
  {
    type: 'integration_salesforce',
    category: 'integration',
    name: 'Salesforce',
    description: 'Interacts with Salesforce CRM.',
    inputs: [
      { id: 'data', name: 'Data', type: 'object' },
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'object' },
      { id: 'id', name: 'Record ID', type: 'string' },
    ],
    configSchema: [
      { key: 'operation', label: 'Operation', type: 'select', options: [
        { value: 'create', label: 'Create Record' },
        { value: 'update', label: 'Update Record' },
        { value: 'get', label: 'Get Record' },
        { value: 'query', label: 'SOQL Query' },
        { value: 'delete', label: 'Delete Record' },
      ], required: true },
      { key: 'objectType', label: 'Salesforce Object', type: 'string', placeholder: 'Account, Contact, Lead, etc.' },
      { key: 'fields', label: 'Fields', type: 'json' },
      { key: 'recordId', label: 'Record ID', type: 'template' },
      { key: 'query', label: 'SOQL Query', type: 'template' },
    ],
    examples: [
      'Create Salesforce lead',
      'Update Salesforce account',
      'Query Salesforce',
    ],
  },
  {
    type: 'integration_google_sheets',
    category: 'integration',
    name: 'Google Sheets',
    description: 'Read or write data to Google Sheets.',
    inputs: [
      { id: 'data', name: 'Data', type: 'any' },
    ],
    outputs: [
      { id: 'rows', name: 'Rows', type: 'array' },
      { id: 'updatedRange', name: 'Updated Range', type: 'string' },
    ],
    configSchema: [
      { key: 'operation', label: 'Operation', type: 'select', options: [
        { value: 'read', label: 'Read Range' },
        { value: 'append', label: 'Append Row' },
        { value: 'update', label: 'Update Range' },
        { value: 'clear', label: 'Clear Range' },
      ], required: true },
      { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
      { key: 'range', label: 'Range', type: 'string', placeholder: 'Sheet1!A1:D10' },
      { key: 'values', label: 'Values', type: 'json' },
    ],
    examples: [
      'Read from Google Sheets',
      'Append row to spreadsheet',
      'Update Google Sheet',
    ],
  },
];

// ============================================================================
// System Prompt Generator
// ============================================================================

/**
 * Generates the system prompt for the Workflow Architect AI
 */
export function generateArchitectSystemPrompt(): string {
  return `You are the Workflow Architect, an AI assistant specialized in building automation workflows for Flowent AI Studio.

## YOUR CAPABILITIES

You can design, generate, and modify workflows that automate business processes. You understand:
- Triggers: Events that start workflows (webhooks, schedules, events)
- Actions: Tasks the workflow performs (send emails, API calls, database queries)
- Logic: Branching and flow control (if/else, loops, parallel execution)
- Transformations: Data manipulation (set variables, map, filter, aggregate)
- Integrations: Third-party services (HubSpot, Salesforce, Google Sheets, Slack)

## NODE LIBRARY

${generateNodeLibraryDescription()}

## VARIABLE SYNTAX

Variables use the \`{{nodeId.outputName}}\` or \`{{nodeId.outputName.property}}\` syntax:

Examples:
- \`{{trigger_1.body.email}}\` - Email from webhook body
- \`{{http_1.response.data}}\` - Response data from HTTP request
- \`{{if_1.true}}\` - Output from true branch of condition
- \`{{loop_1.item.name}}\` - Current item's name in a loop

## OUTPUT FORMAT

When generating workflows, you MUST output valid JSON in this exact format:

\`\`\`json
{
  "nodes": [
    {
      "id": "unique_node_id",
      "type": "node_type_from_library",
      "position": { "x": number, "y": number },
      "data": {
        "label": "Human readable name",
        "config": {
          // Node-specific configuration
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "sourceHandle": "output_handle_id",
      "targetHandle": "input_handle_id"
    }
  ]
}
\`\`\`

## RULES

1. **Valid Node Types**: Only use node types from the library (trigger_webhook, action_email, etc.)
2. **Unique IDs**: Each node must have a unique ID (e.g., "webhook_1", "email_1", "if_1")
3. **Proper Connections**: Edges must connect valid output handles to input handles
4. **Variable References**: Use correct variable syntax referencing actual node outputs
5. **Layout**: Position nodes logically (triggers at top, flow downward)
6. **Config Values**: Populate node configs with the user's requirements

## EXAMPLES

User: "When I get a webhook, send an email to the contact"

Response:
\`\`\`json
{
  "nodes": [
    {
      "id": "webhook_1",
      "type": "trigger_webhook",
      "position": { "x": 250, "y": 50 },
      "data": {
        "label": "Receive Webhook",
        "config": {
          "path": "/new-contact",
          "method": "POST"
        }
      }
    },
    {
      "id": "email_1",
      "type": "action_email",
      "position": { "x": 250, "y": 200 },
      "data": {
        "label": "Send Welcome Email",
        "config": {
          "to": "{{webhook_1.body.email}}",
          "subject": "Welcome!",
          "body": "Hello {{webhook_1.body.name}}, thanks for signing up!"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "webhook_1",
      "target": "email_1",
      "sourceHandle": "body",
      "targetHandle": "to"
    }
  ]
}
\`\`\`

## CONVERSATION STYLE

- Be concise and focused on the workflow
- Ask clarifying questions if the user's intent is unclear
- Explain your design decisions briefly
- Suggest improvements when appropriate
- When modifying existing workflows, preserve unchanged parts`;
}

/**
 * Generates a condensed description of all nodes for the system prompt
 */
function generateNodeLibraryDescription(): string {
  const categories: Record<string, NodeDefinition[]> = {};

  for (const node of NODE_LIBRARY) {
    if (!categories[node.category]) {
      categories[node.category] = [];
    }
    categories[node.category].push(node);
  }

  let description = '';

  for (const [category, nodes] of Object.entries(categories)) {
    description += `\n### ${category.toUpperCase()}\n\n`;

    for (const node of nodes) {
      description += `**${node.type}** - ${node.name}\n`;
      description += `  ${node.description}\n`;
      description += `  Outputs: ${node.outputs.map((o) => `${o.id} (${o.type})`).join(', ')}\n`;
      if (node.configSchema.length > 0) {
        const requiredConfigs = node.configSchema.filter((c) => c.required);
        if (requiredConfigs.length > 0) {
          description += `  Required Config: ${requiredConfigs.map((c) => c.key).join(', ')}\n`;
        }
      }
      description += '\n';
    }
  }

  return description;
}

/**
 * Generates context about the current workflow for editing
 */
export function generateCurrentWorkflowContext(
  nodes: any[],
  edges: any[]
): string {
  if (!nodes || nodes.length === 0) {
    return 'The canvas is currently empty. Create a new workflow from scratch.';
  }

  let context = `\n## CURRENT WORKFLOW\n\n`;
  context += `The workflow has ${nodes.length} nodes and ${edges.length} connections.\n\n`;

  context += '### Nodes:\n';
  for (const node of nodes) {
    context += `- **${node.id}** (${node.type}): "${node.data?.label || 'Unnamed'}"\n`;
    if (node.data?.config) {
      const configStr = JSON.stringify(node.data.config, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      context += `  Config:\n${configStr}\n`;
    }
  }

  context += '\n### Connections:\n';
  for (const edge of edges) {
    context += `- ${edge.source} (${edge.sourceHandle}) → ${edge.target} (${edge.targetHandle})\n`;
  }

  return context;
}

/**
 * Generates context for error analysis
 */
export function generateErrorAnalysisContext(
  error: {
    message: string;
    stack?: string;
    nodeId?: string;
    nodeName?: string;
    input?: any;
    output?: any;
  },
  nodes: any[],
  edges: any[]
): string {
  let context = `\n## ERROR DETAILS\n\n`;
  context += `**Error Message**: ${error.message}\n`;

  if (error.nodeId) {
    const node = nodes.find((n) => n.id === error.nodeId);
    context += `**Failed Node**: ${error.nodeId} (${node?.type || 'unknown'})\n`;
    context += `**Node Label**: ${error.nodeName || node?.data?.label || 'Unknown'}\n`;

    if (node?.data?.config) {
      context += `**Node Configuration**:\n\`\`\`json\n${JSON.stringify(node.data.config, null, 2)}\n\`\`\`\n`;
    }
  }

  if (error.input) {
    context += `\n**Input Data**:\n\`\`\`json\n${JSON.stringify(error.input, null, 2)}\n\`\`\`\n`;
  }

  if (error.stack) {
    context += `\n**Stack Trace**:\n\`\`\`\n${error.stack}\n\`\`\`\n`;
  }

  context += generateCurrentWorkflowContext(nodes, edges);

  return context;
}

/**
 * Gets the node definition for a specific node type
 */
export function getNodeDefinition(nodeType: string): NodeDefinition | undefined {
  return NODE_LIBRARY.find((n) => n.type === nodeType);
}

/**
 * Gets all node types by category
 */
export function getNodesByCategory(category: string): NodeDefinition[] {
  return NODE_LIBRARY.filter((n) => n.category === category);
}

/**
 * Validates that a node type exists in the library
 */
export function isValidNodeType(nodeType: string): boolean {
  return NODE_LIBRARY.some((n) => n.type === nodeType);
}

/**
 * Gets output schema for a node (used for variable suggestions)
 */
export function getNodeOutputSchema(nodeType: string): NodePort[] {
  const node = getNodeDefinition(nodeType);
  return node?.outputs || [];
}

export default {
  NODE_LIBRARY,
  generateArchitectSystemPrompt,
  generateCurrentWorkflowContext,
  generateErrorAnalysisContext,
  getNodeDefinition,
  getNodesByCategory,
  isValidNodeType,
  getNodeOutputSchema,
};
