/**
 * FLOWENT AI STUDIO - NODE DEFINITIONS
 *
 * Master registry of all available node types organized by category.
 * This powers the hierarchical node selector modal (n8n-style).
 *
 * @version 2.0.0
 */

import { LucideIcon } from 'lucide-react';

// ============================================================================
// NODE CATEGORY TYPES
// ============================================================================

export type NodeCategory =
  | 'triggers'
  | 'ai'
  | 'data'
  | 'flow'
  | 'core'
  | 'integrations'
  | 'crm'
  | 'communication'
  | 'productivity';

export type NodeSubCategory =
  // AI subcategories
  | 'agents'
  | 'chains'
  | 'memory'
  | 'vector-stores'
  | 'document-loaders'
  | 'embeddings'
  // Data subcategories
  | 'transform'
  | 'filter'
  | 'aggregate'
  // Flow subcategories
  | 'control'
  | 'error-handling'
  // Integration subcategories
  | 'email'
  | 'messaging'
  | 'storage'
  | 'database';

// ============================================================================
// NODE DEFINITION SCHEMA
// ============================================================================

export interface NodeFieldOption {
  label: string;
  value: string;
  description?: string;
}

export interface NodeFieldDefinition {
  /** Unique field identifier */
  id: string;

  /** Display label */
  label: string;

  /** Field type for form rendering */
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'boolean'
    | 'json'
    | 'code'
    | 'cron'
    | 'expression'
    | 'variable'
    | 'credential'
    | 'keyvalue'
    | 'condition'
    | 'color'
    | 'date'
    | 'datetime'
    | 'url'
    | 'email'
    | 'file';

  /** Placeholder text */
  placeholder?: string;

  /** Help text shown below field */
  description?: string;

  /** Whether field is required */
  required?: boolean;

  /** Default value */
  default?: any;

  /** Options for select/multiselect */
  options?: NodeFieldOption[];

  /** Validation pattern (regex) */
  pattern?: string;

  /** Minimum value for number */
  min?: number;

  /** Maximum value for number */
  max?: number;

  /** Show field conditionally based on other field values */
  showWhen?: {
    field: string;
    equals: any;
  };

  /** Group fields visually */
  group?: string;

  /** Advanced option (collapsed by default) */
  advanced?: boolean;
}

export interface NodeOutput {
  id: string;
  name: string;
  type: 'data' | 'boolean' | 'array' | 'object' | 'string' | 'number' | 'any';
  description?: string;
}

export interface NodeInput {
  id: string;
  name: string;
  type: 'data' | 'trigger' | 'any';
  required?: boolean;
  description?: string;
}

export interface NodeDefinition {
  /** Unique node type identifier */
  id: string;

  /** Display name */
  name: string;

  /** Detailed description */
  description: string;

  /** Short tagline for quick reference */
  tagline?: string;

  /** Primary category */
  category: NodeCategory;

  /** Optional subcategory for nested navigation */
  subcategory?: NodeSubCategory;

  /** Lucide icon name */
  icon: string;

  /** Accent color (hex) */
  color: string;

  /** Configuration fields schema */
  fields: NodeFieldDefinition[];

  /** Input ports */
  inputs: NodeInput[];

  /** Output ports */
  outputs: NodeOutput[];

  /** Default configuration values */
  defaults?: Record<string, any>;

  /** Searchable keywords */
  keywords?: string[];

  /** Is this a popular/featured node */
  popular?: boolean;

  /** Is node in beta/experimental */
  beta?: boolean;

  /** Is node deprecated */
  deprecated?: boolean;

  /** Deprecation message and replacement */
  deprecationInfo?: {
    message: string;
    replacement?: string;
  };

  /** Documentation URL */
  docsUrl?: string;

  /** Required credentials/integrations */
  requiredCredentials?: string[];

  /** Usage count for popularity sorting */
  usageCount?: number;

  /** Version */
  version?: string;
}

export interface NodeCategoryDefinition {
  id: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const NODE_CATEGORIES: NodeCategoryDefinition[] = [
  {
    id: 'triggers',
    name: 'Triggers',
    description: 'Start your workflow based on events or schedules',
    icon: 'Zap',
    color: '#10B981',
    order: 1,
  },
  {
    id: 'ai',
    name: 'AI & LLM',
    description: 'AI agents, language models, and intelligent processing',
    icon: 'Brain',
    color: '#8B5CF6',
    order: 2,
  },
  {
    id: 'data',
    name: 'Data Transform',
    description: 'Filter, transform, and manipulate data',
    icon: 'Database',
    color: '#3B82F6',
    order: 3,
  },
  {
    id: 'flow',
    name: 'Flow Control',
    description: 'Control workflow execution with conditions and loops',
    icon: 'GitBranch',
    color: '#F59E0B',
    order: 4,
  },
  {
    id: 'core',
    name: 'Core',
    description: 'Essential nodes for API calls, code, and sub-workflows',
    icon: 'Code',
    color: '#6366F1',
    order: 5,
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Connect with external services and APIs',
    icon: 'Plug',
    color: '#EC4899',
    order: 6,
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management actions',
    icon: 'Users',
    color: '#14B8A6',
    order: 7,
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Email, SMS, and messaging',
    icon: 'MessageSquare',
    color: '#F97316',
    order: 8,
  },
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Tasks, calendars, and notes',
    icon: 'CheckSquare',
    color: '#22C55E',
    order: 9,
  },
];

// ============================================================================
// TRIGGER NODES
// ============================================================================

export const TRIGGER_NODES: NodeDefinition[] = [
  {
    id: 'webhook-trigger',
    name: 'Webhook',
    description: 'Start workflow when an HTTP request is received',
    tagline: 'Receive HTTP requests',
    category: 'triggers',
    icon: 'Webhook',
    color: '#10B981',
    popular: true,
    keywords: ['http', 'api', 'endpoint', 'receive', 'post', 'get'],
    inputs: [],
    outputs: [
      { id: 'output', name: 'Data', type: 'object', description: 'Request body and headers' }
    ],
    fields: [
      {
        id: 'method',
        label: 'HTTP Method',
        type: 'select',
        default: 'POST',
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      {
        id: 'path',
        label: 'Path',
        type: 'text',
        placeholder: '/my-webhook',
        description: 'The URL path for this webhook',
        required: true,
      },
      {
        id: 'authentication',
        label: 'Authentication',
        type: 'select',
        default: 'none',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Header Auth', value: 'header' },
          { label: 'Basic Auth', value: 'basic' },
          { label: 'JWT', value: 'jwt' },
        ],
      },
      {
        id: 'responseMode',
        label: 'Response Mode',
        type: 'select',
        default: 'immediate',
        options: [
          { label: 'Respond Immediately', value: 'immediate' },
          { label: 'Wait for Workflow', value: 'wait' },
        ],
        advanced: true,
      },
    ],
    defaults: {
      method: 'POST',
      authentication: 'none',
      responseMode: 'immediate',
    },
  },
  {
    id: 'schedule-trigger',
    name: 'Schedule',
    description: 'Run workflow on a schedule using cron expressions',
    tagline: 'Time-based automation',
    category: 'triggers',
    icon: 'Clock',
    color: '#10B981',
    popular: true,
    keywords: ['cron', 'timer', 'recurring', 'daily', 'hourly', 'weekly'],
    inputs: [],
    outputs: [
      { id: 'output', name: 'Trigger Data', type: 'object' }
    ],
    fields: [
      {
        id: 'scheduleType',
        label: 'Schedule Type',
        type: 'select',
        default: 'interval',
        options: [
          { label: 'Interval', value: 'interval' },
          { label: 'Cron Expression', value: 'cron' },
          { label: 'Specific Times', value: 'times' },
        ],
      },
      {
        id: 'interval',
        label: 'Run Every',
        type: 'number',
        default: 60,
        min: 1,
        showWhen: { field: 'scheduleType', equals: 'interval' },
      },
      {
        id: 'intervalUnit',
        label: 'Unit',
        type: 'select',
        default: 'minutes',
        options: [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
        ],
        showWhen: { field: 'scheduleType', equals: 'interval' },
      },
      {
        id: 'cronExpression',
        label: 'Cron Expression',
        type: 'cron',
        placeholder: '0 9 * * *',
        description: 'Standard cron format (minute hour day month weekday)',
        showWhen: { field: 'scheduleType', equals: 'cron' },
      },
      {
        id: 'timezone',
        label: 'Timezone',
        type: 'select',
        default: 'UTC',
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'America/New_York', value: 'America/New_York' },
          { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
          { label: 'Europe/London', value: 'Europe/London' },
          { label: 'Europe/Berlin', value: 'Europe/Berlin' },
          { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
        ],
        advanced: true,
      },
    ],
    defaults: {
      scheduleType: 'interval',
      interval: 60,
      intervalUnit: 'minutes',
      timezone: 'UTC',
    },
  },
  {
    id: 'manual-trigger',
    name: 'Manual Trigger',
    description: 'Start workflow manually with custom input',
    tagline: 'On-demand execution',
    category: 'triggers',
    icon: 'Play',
    color: '#10B981',
    keywords: ['start', 'run', 'execute', 'button'],
    inputs: [],
    outputs: [
      { id: 'output', name: 'Input Data', type: 'object' }
    ],
    fields: [
      {
        id: 'inputSchema',
        label: 'Input Fields',
        type: 'json',
        description: 'Define the input fields for manual execution',
        default: '[]',
      },
    ],
    defaults: {
      inputSchema: '[]',
    },
  },
  {
    id: 'email-trigger',
    name: 'Email Received',
    description: 'Trigger when a new email arrives',
    tagline: 'React to incoming emails',
    category: 'triggers',
    icon: 'Mail',
    color: '#10B981',
    keywords: ['inbox', 'gmail', 'outlook', 'message'],
    requiredCredentials: ['email'],
    inputs: [],
    outputs: [
      { id: 'output', name: 'Email', type: 'object' }
    ],
    fields: [
      {
        id: 'provider',
        label: 'Email Provider',
        type: 'select',
        options: [
          { label: 'Gmail', value: 'gmail' },
          { label: 'Outlook', value: 'outlook' },
          { label: 'IMAP', value: 'imap' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'folder',
        label: 'Folder',
        type: 'text',
        default: 'INBOX',
      },
      {
        id: 'filterFrom',
        label: 'From Filter',
        type: 'text',
        placeholder: 'sender@example.com',
        advanced: true,
      },
      {
        id: 'filterSubject',
        label: 'Subject Contains',
        type: 'text',
        placeholder: 'Order confirmation',
        advanced: true,
      },
    ],
    defaults: {
      folder: 'INBOX',
    },
  },
  {
    id: 'app-event-trigger',
    name: 'App Event',
    description: 'Trigger on events from connected apps',
    tagline: 'React to app events',
    category: 'triggers',
    icon: 'Bell',
    color: '#10B981',
    keywords: ['event', 'notification', 'app', 'integration'],
    inputs: [],
    outputs: [
      { id: 'output', name: 'Event Data', type: 'object' }
    ],
    fields: [
      {
        id: 'app',
        label: 'Application',
        type: 'select',
        options: [
          { label: 'HubSpot', value: 'hubspot' },
          { label: 'Salesforce', value: 'salesforce' },
          { label: 'Slack', value: 'slack' },
          { label: 'Stripe', value: 'stripe' },
          { label: 'GitHub', value: 'github' },
        ],
        required: true,
      },
      {
        id: 'event',
        label: 'Event Type',
        type: 'select',
        options: [
          { label: 'Contact Created', value: 'contact.created' },
          { label: 'Deal Updated', value: 'deal.updated' },
          { label: 'Payment Received', value: 'payment.received' },
          { label: 'Message Received', value: 'message.received' },
        ],
        required: true,
      },
    ],
  },
];

// ============================================================================
// AI & LLM NODES
// ============================================================================

export const AI_NODES: NodeDefinition[] = [
  // Agents
  {
    id: 'ai-agent',
    name: 'AI Agent',
    description: 'Autonomous AI agent that can use tools and make decisions',
    tagline: 'Intelligent automation',
    category: 'ai',
    subcategory: 'agents',
    icon: 'Bot',
    color: '#8B5CF6',
    popular: true,
    keywords: ['gpt', 'claude', 'llm', 'assistant', 'chatbot', 'autonomous'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Response', type: 'string' },
      { id: 'toolCalls', name: 'Tool Calls', type: 'array' }
    ],
    fields: [
      {
        id: 'agentType',
        label: 'Agent Type',
        type: 'select',
        default: 'general',
        options: [
          { label: 'General Purpose', value: 'general', description: 'Versatile agent for various tasks' },
          { label: 'Data Analyst', value: 'data-analyst', description: 'Specialized in data analysis' },
          { label: 'Code Assistant', value: 'code-assistant', description: 'Programming and debugging' },
          { label: 'Customer Support', value: 'customer-support', description: 'Customer service tasks' },
          { label: 'Research', value: 'research', description: 'Research and information gathering' },
          { label: 'Custom', value: 'custom', description: 'Define your own agent behavior' },
        ],
      },
      {
        id: 'model',
        label: 'Model',
        type: 'select',
        default: 'gpt-4o',
        options: [
          { label: 'GPT-4o (Recommended)', value: 'gpt-4o' },
          { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
          { label: 'Claude 3 Opus', value: 'claude-3-opus' },
        ],
      },
      {
        id: 'systemPrompt',
        label: 'System Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant...',
        description: 'Define the agent\'s behavior and personality',
        showWhen: { field: 'agentType', equals: 'custom' },
      },
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        description: 'Higher values make output more creative, lower more deterministic',
        advanced: true,
      },
      {
        id: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        default: 4096,
        min: 1,
        max: 128000,
        advanced: true,
      },
      {
        id: 'tools',
        label: 'Available Tools',
        type: 'multiselect',
        options: [
          { label: 'Web Search', value: 'web-search' },
          { label: 'Calculator', value: 'calculator' },
          { label: 'Code Interpreter', value: 'code-interpreter' },
          { label: 'File Operations', value: 'file-ops' },
          { label: 'Database Query', value: 'database' },
        ],
        advanced: true,
      },
    ],
    defaults: {
      agentType: 'general',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
    },
  },
  {
    id: 'chat-completion',
    name: 'Chat Completion',
    description: 'Send a prompt to an LLM and get a response',
    tagline: 'Single prompt/response',
    category: 'ai',
    subcategory: 'chains',
    icon: 'MessageSquare',
    color: '#8B5CF6',
    popular: true,
    keywords: ['gpt', 'prompt', 'completion', 'generate', 'text'],
    inputs: [
      { id: 'input', name: 'Prompt', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Response', type: 'string' }
    ],
    fields: [
      {
        id: 'model',
        label: 'Model',
        type: 'select',
        default: 'gpt-4o',
        options: [
          { label: 'GPT-4o', value: 'gpt-4o' },
          { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
        ],
      },
      {
        id: 'systemPrompt',
        label: 'System Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant...',
      },
      {
        id: 'prompt',
        label: 'User Prompt',
        type: 'textarea',
        placeholder: 'Enter your prompt or use {{variable}}',
        required: true,
      },
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        advanced: true,
      },
      {
        id: 'jsonMode',
        label: 'JSON Mode',
        type: 'boolean',
        default: false,
        description: 'Force output to be valid JSON',
        advanced: true,
      },
    ],
    defaults: {
      model: 'gpt-4o',
      temperature: 0.7,
      jsonMode: false,
    },
  },
  {
    id: 'embeddings',
    name: 'Generate Embeddings',
    description: 'Convert text to vector embeddings for semantic search',
    tagline: 'Text to vectors',
    category: 'ai',
    subcategory: 'embeddings',
    icon: 'Hash',
    color: '#8B5CF6',
    keywords: ['vector', 'embedding', 'semantic', 'search', 'similarity'],
    inputs: [
      { id: 'input', name: 'Text', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Embeddings', type: 'array' }
    ],
    fields: [
      {
        id: 'model',
        label: 'Model',
        type: 'select',
        default: 'text-embedding-3-small',
        options: [
          { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
          { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
          { label: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
        ],
      },
      {
        id: 'dimensions',
        label: 'Dimensions',
        type: 'number',
        default: 1536,
        advanced: true,
      },
    ],
    defaults: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
    },
  },
  {
    id: 'vector-store-query',
    name: 'Vector Store Query',
    description: 'Search a vector database for similar content',
    tagline: 'Semantic search',
    category: 'ai',
    subcategory: 'vector-stores',
    icon: 'Search',
    color: '#8B5CF6',
    keywords: ['vector', 'search', 'similarity', 'rag', 'retrieval'],
    inputs: [
      { id: 'query', name: 'Query', type: 'data', required: true }
    ],
    outputs: [
      { id: 'results', name: 'Results', type: 'array' }
    ],
    fields: [
      {
        id: 'vectorStore',
        label: 'Vector Store',
        type: 'select',
        options: [
          { label: 'Pinecone', value: 'pinecone' },
          { label: 'Supabase', value: 'supabase' },
          { label: 'Weaviate', value: 'weaviate' },
          { label: 'Qdrant', value: 'qdrant' },
          { label: 'pgvector', value: 'pgvector' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Connection',
        type: 'credential',
        required: true,
      },
      {
        id: 'topK',
        label: 'Top K Results',
        type: 'number',
        default: 5,
        min: 1,
        max: 100,
      },
      {
        id: 'minScore',
        label: 'Minimum Score',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 1,
        advanced: true,
      },
      {
        id: 'filter',
        label: 'Metadata Filter',
        type: 'json',
        placeholder: '{"category": "docs"}',
        advanced: true,
      },
    ],
    defaults: {
      topK: 5,
      minScore: 0.7,
    },
  },
  {
    id: 'document-loader',
    name: 'Document Loader',
    description: 'Load and parse documents from various sources',
    tagline: 'Extract document content',
    category: 'ai',
    subcategory: 'document-loaders',
    icon: 'FileText',
    color: '#8B5CF6',
    keywords: ['pdf', 'document', 'file', 'extract', 'parse'],
    inputs: [
      { id: 'source', name: 'Source', type: 'data', required: true }
    ],
    outputs: [
      { id: 'documents', name: 'Documents', type: 'array' }
    ],
    fields: [
      {
        id: 'sourceType',
        label: 'Source Type',
        type: 'select',
        options: [
          { label: 'PDF', value: 'pdf' },
          { label: 'Text File', value: 'text' },
          { label: 'Web Page', value: 'web' },
          { label: 'CSV', value: 'csv' },
          { label: 'JSON', value: 'json' },
          { label: 'Markdown', value: 'markdown' },
        ],
        required: true,
      },
      {
        id: 'splitType',
        label: 'Split Strategy',
        type: 'select',
        default: 'recursive',
        options: [
          { label: 'Recursive Character', value: 'recursive' },
          { label: 'By Character', value: 'character' },
          { label: 'By Token', value: 'token' },
          { label: 'By Sentence', value: 'sentence' },
          { label: 'By Paragraph', value: 'paragraph' },
        ],
      },
      {
        id: 'chunkSize',
        label: 'Chunk Size',
        type: 'number',
        default: 1000,
        min: 100,
        max: 10000,
      },
      {
        id: 'chunkOverlap',
        label: 'Chunk Overlap',
        type: 'number',
        default: 200,
        min: 0,
        max: 1000,
      },
    ],
    defaults: {
      splitType: 'recursive',
      chunkSize: 1000,
      chunkOverlap: 200,
    },
  },
  {
    id: 'memory-store',
    name: 'Memory Store',
    description: 'Store and retrieve conversation memory for context',
    tagline: 'Persistent context',
    category: 'ai',
    subcategory: 'memory',
    icon: 'HardDrive',
    color: '#8B5CF6',
    keywords: ['memory', 'context', 'history', 'conversation', 'store'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'memory', name: 'Memory', type: 'object' }
    ],
    fields: [
      {
        id: 'memoryType',
        label: 'Memory Type',
        type: 'select',
        default: 'buffer',
        options: [
          { label: 'Buffer (Recent Messages)', value: 'buffer' },
          { label: 'Summary', value: 'summary' },
          { label: 'Entity', value: 'entity' },
          { label: 'Vector Store', value: 'vector' },
        ],
      },
      {
        id: 'maxMessages',
        label: 'Max Messages',
        type: 'number',
        default: 10,
        showWhen: { field: 'memoryType', equals: 'buffer' },
      },
      {
        id: 'sessionId',
        label: 'Session ID',
        type: 'expression',
        placeholder: '{{$json.sessionId}}',
        description: 'Unique identifier for conversation context',
      },
    ],
    defaults: {
      memoryType: 'buffer',
      maxMessages: 10,
    },
  },
];

// ============================================================================
// DATA TRANSFORM NODES
// ============================================================================

export const DATA_NODES: NodeDefinition[] = [
  {
    id: 'filter',
    name: 'Filter',
    description: 'Filter items based on conditions',
    tagline: 'Keep matching items',
    category: 'data',
    subcategory: 'filter',
    icon: 'Filter',
    color: '#3B82F6',
    popular: true,
    keywords: ['filter', 'where', 'condition', 'remove', 'keep'],
    inputs: [
      { id: 'input', name: 'Items', type: 'data', required: true }
    ],
    outputs: [
      { id: 'matched', name: 'Matched', type: 'array' },
      { id: 'unmatched', name: 'Unmatched', type: 'array' }
    ],
    fields: [
      {
        id: 'conditions',
        label: 'Filter Conditions',
        type: 'condition',
        required: true,
      },
      {
        id: 'combineWith',
        label: 'Combine Conditions',
        type: 'select',
        default: 'and',
        options: [
          { label: 'AND (all must match)', value: 'and' },
          { label: 'OR (any can match)', value: 'or' },
        ],
      },
    ],
    defaults: {
      combineWith: 'and',
    },
  },
  {
    id: 'set-variable',
    name: 'Set Variable',
    description: 'Set or modify values in your data',
    tagline: 'Edit fields',
    category: 'data',
    subcategory: 'transform',
    icon: 'PenLine',
    color: '#3B82F6',
    popular: true,
    keywords: ['set', 'variable', 'edit', 'field', 'assign', 'value'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'object' }
    ],
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'manual',
        options: [
          { label: 'Manual Mapping', value: 'manual' },
          { label: 'JSON', value: 'json' },
        ],
      },
      {
        id: 'assignments',
        label: 'Field Assignments',
        type: 'keyvalue',
        showWhen: { field: 'mode', equals: 'manual' },
      },
      {
        id: 'jsonData',
        label: 'JSON Data',
        type: 'json',
        showWhen: { field: 'mode', equals: 'json' },
      },
      {
        id: 'keepExisting',
        label: 'Keep Existing Fields',
        type: 'boolean',
        default: true,
        description: 'Include fields from input that are not being set',
      },
    ],
    defaults: {
      mode: 'manual',
      keepExisting: true,
    },
  },
  {
    id: 'limit',
    name: 'Limit',
    description: 'Limit the number of items to process',
    tagline: 'Cap item count',
    category: 'data',
    subcategory: 'filter',
    icon: 'ListEnd',
    color: '#3B82F6',
    keywords: ['limit', 'top', 'first', 'take', 'slice'],
    inputs: [
      { id: 'input', name: 'Items', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Limited Items', type: 'array' }
    ],
    fields: [
      {
        id: 'maxItems',
        label: 'Max Items',
        type: 'number',
        default: 10,
        min: 1,
        required: true,
      },
      {
        id: 'offset',
        label: 'Skip First',
        type: 'number',
        default: 0,
        min: 0,
        advanced: true,
      },
    ],
    defaults: {
      maxItems: 10,
      offset: 0,
    },
  },
  {
    id: 'aggregate',
    name: 'Aggregate',
    description: 'Group and aggregate data with calculations',
    tagline: 'Sum, count, average',
    category: 'data',
    subcategory: 'aggregate',
    icon: 'Calculator',
    color: '#3B82F6',
    keywords: ['aggregate', 'sum', 'count', 'average', 'group', 'total'],
    inputs: [
      { id: 'input', name: 'Items', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Aggregated', type: 'object' }
    ],
    fields: [
      {
        id: 'groupBy',
        label: 'Group By',
        type: 'text',
        placeholder: 'fieldName',
        description: 'Field to group items by (leave empty for all items)',
      },
      {
        id: 'aggregations',
        label: 'Aggregations',
        type: 'keyvalue',
        description: 'Define aggregation operations',
      },
      {
        id: 'operation',
        label: 'Default Operation',
        type: 'select',
        default: 'sum',
        options: [
          { label: 'Sum', value: 'sum' },
          { label: 'Count', value: 'count' },
          { label: 'Average', value: 'avg' },
          { label: 'Min', value: 'min' },
          { label: 'Max', value: 'max' },
          { label: 'First', value: 'first' },
          { label: 'Last', value: 'last' },
        ],
      },
    ],
    defaults: {
      operation: 'sum',
    },
  },
  {
    id: 'map',
    name: 'Map',
    description: 'Transform each item in an array',
    tagline: 'Transform items',
    category: 'data',
    subcategory: 'transform',
    icon: 'Repeat',
    color: '#3B82F6',
    keywords: ['map', 'transform', 'each', 'iterate'],
    inputs: [
      { id: 'input', name: 'Items', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Transformed', type: 'array' }
    ],
    fields: [
      {
        id: 'expression',
        label: 'Transform Expression',
        type: 'expression',
        placeholder: '{{ { name: $item.firstName + " " + $item.lastName } }}',
        required: true,
      },
    ],
  },
  {
    id: 'datetime',
    name: 'Date/Time',
    description: 'Parse, format, and manipulate dates',
    tagline: 'Date operations',
    category: 'data',
    subcategory: 'transform',
    icon: 'Calendar',
    color: '#3B82F6',
    keywords: ['date', 'time', 'format', 'parse', 'now', 'today'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'output', name: 'Date', type: 'string' }
    ],
    fields: [
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        default: 'now',
        options: [
          { label: 'Current Time', value: 'now' },
          { label: 'Parse Date', value: 'parse' },
          { label: 'Format Date', value: 'format' },
          { label: 'Add/Subtract', value: 'modify' },
          { label: 'Difference', value: 'diff' },
        ],
      },
      {
        id: 'inputFormat',
        label: 'Input Format',
        type: 'text',
        placeholder: 'YYYY-MM-DD',
        showWhen: { field: 'operation', equals: 'parse' },
      },
      {
        id: 'outputFormat',
        label: 'Output Format',
        type: 'text',
        default: 'YYYY-MM-DD HH:mm:ss',
        placeholder: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        id: 'timezone',
        label: 'Timezone',
        type: 'select',
        default: 'UTC',
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'Local', value: 'local' },
          { label: 'America/New_York', value: 'America/New_York' },
          { label: 'Europe/London', value: 'Europe/London' },
        ],
        advanced: true,
      },
    ],
    defaults: {
      operation: 'now',
      outputFormat: 'YYYY-MM-DD HH:mm:ss',
      timezone: 'UTC',
    },
  },
  {
    id: 'split-items',
    name: 'Split Items',
    description: 'Split a single item into multiple items',
    tagline: 'Expand arrays',
    category: 'data',
    subcategory: 'transform',
    icon: 'Split',
    color: '#3B82F6',
    keywords: ['split', 'expand', 'array', 'explode'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Items', type: 'array' }
    ],
    fields: [
      {
        id: 'fieldToSplit',
        label: 'Field to Split',
        type: 'text',
        placeholder: 'items',
        required: true,
      },
      {
        id: 'includeParent',
        label: 'Include Parent Fields',
        type: 'boolean',
        default: true,
      },
    ],
    defaults: {
      includeParent: true,
    },
  },
  {
    id: 'merge-items',
    name: 'Merge Items',
    description: 'Combine multiple items into one',
    tagline: 'Combine arrays',
    category: 'data',
    subcategory: 'transform',
    icon: 'Merge',
    color: '#3B82F6',
    keywords: ['merge', 'combine', 'join', 'array'],
    inputs: [
      { id: 'input1', name: 'Input 1', type: 'data', required: true },
      { id: 'input2', name: 'Input 2', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Merged', type: 'array' }
    ],
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'append',
        options: [
          { label: 'Append (Stack All)', value: 'append' },
          { label: 'Merge by Key', value: 'mergeByKey' },
          { label: 'Merge by Position', value: 'mergeByPosition' },
          { label: 'Keep Matches', value: 'keepMatches' },
        ],
      },
      {
        id: 'mergeKey',
        label: 'Merge Key',
        type: 'text',
        placeholder: 'id',
        showWhen: { field: 'mode', equals: 'mergeByKey' },
      },
    ],
    defaults: {
      mode: 'append',
    },
  },
];

// ============================================================================
// FLOW CONTROL NODES
// ============================================================================

export const FLOW_NODES: NodeDefinition[] = [
  {
    id: 'if-condition',
    name: 'IF',
    description: 'Branch workflow based on conditions',
    tagline: 'Conditional branching',
    category: 'flow',
    subcategory: 'control',
    icon: 'GitBranch',
    color: '#F59E0B',
    popular: true,
    keywords: ['if', 'condition', 'branch', 'else', 'decision'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'true', name: 'True', type: 'data' },
      { id: 'false', name: 'False', type: 'data' }
    ],
    fields: [
      {
        id: 'conditions',
        label: 'Conditions',
        type: 'condition',
        required: true,
      },
      {
        id: 'combineWith',
        label: 'Combine With',
        type: 'select',
        default: 'and',
        options: [
          { label: 'AND', value: 'and' },
          { label: 'OR', value: 'or' },
        ],
      },
    ],
    defaults: {
      combineWith: 'and',
    },
  },
  {
    id: 'switch',
    name: 'Switch',
    description: 'Route to multiple paths based on value',
    tagline: 'Multi-path routing',
    category: 'flow',
    subcategory: 'control',
    icon: 'Route',
    color: '#F59E0B',
    keywords: ['switch', 'case', 'route', 'multiple', 'branch'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'case1', name: 'Case 1', type: 'data' },
      { id: 'case2', name: 'Case 2', type: 'data' },
      { id: 'case3', name: 'Case 3', type: 'data' },
      { id: 'default', name: 'Default', type: 'data' }
    ],
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'value',
        options: [
          { label: 'Match Value', value: 'value' },
          { label: 'Match Expression', value: 'expression' },
        ],
      },
      {
        id: 'valueToMatch',
        label: 'Value to Match',
        type: 'expression',
        placeholder: '{{$json.status}}',
        required: true,
      },
      {
        id: 'cases',
        label: 'Cases',
        type: 'keyvalue',
        description: 'Output name → Value to match',
      },
    ],
    defaults: {
      mode: 'value',
    },
  },
  {
    id: 'loop',
    name: 'Loop',
    description: 'Repeat operations for each item or N times',
    tagline: 'Iterate over items',
    category: 'flow',
    subcategory: 'control',
    icon: 'Repeat',
    color: '#F59E0B',
    popular: true,
    keywords: ['loop', 'for', 'each', 'iterate', 'repeat'],
    inputs: [
      { id: 'input', name: 'Items', type: 'data', required: true }
    ],
    outputs: [
      { id: 'item', name: 'Current Item', type: 'data' },
      { id: 'done', name: 'Done', type: 'data' }
    ],
    fields: [
      {
        id: 'loopType',
        label: 'Loop Type',
        type: 'select',
        default: 'forEach',
        options: [
          { label: 'For Each Item', value: 'forEach' },
          { label: 'Fixed Count', value: 'count' },
          { label: 'While Condition', value: 'while' },
        ],
      },
      {
        id: 'count',
        label: 'Iterations',
        type: 'number',
        default: 10,
        min: 1,
        showWhen: { field: 'loopType', equals: 'count' },
      },
      {
        id: 'condition',
        label: 'Continue While',
        type: 'condition',
        showWhen: { field: 'loopType', equals: 'while' },
      },
      {
        id: 'batchSize',
        label: 'Batch Size',
        type: 'number',
        default: 1,
        min: 1,
        description: 'Process items in batches',
        advanced: true,
      },
    ],
    defaults: {
      loopType: 'forEach',
      count: 10,
      batchSize: 1,
    },
  },
  {
    id: 'wait',
    name: 'Wait',
    description: 'Pause workflow execution',
    tagline: 'Delay execution',
    category: 'flow',
    subcategory: 'control',
    icon: 'Timer',
    color: '#F59E0B',
    keywords: ['wait', 'delay', 'pause', 'sleep', 'timeout'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'data' }
    ],
    fields: [
      {
        id: 'waitType',
        label: 'Wait Type',
        type: 'select',
        default: 'duration',
        options: [
          { label: 'Fixed Duration', value: 'duration' },
          { label: 'Until Date/Time', value: 'until' },
          { label: 'For Webhook', value: 'webhook' },
        ],
      },
      {
        id: 'duration',
        label: 'Duration',
        type: 'number',
        default: 5,
        min: 0,
        showWhen: { field: 'waitType', equals: 'duration' },
      },
      {
        id: 'unit',
        label: 'Unit',
        type: 'select',
        default: 'seconds',
        options: [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
        ],
        showWhen: { field: 'waitType', equals: 'duration' },
      },
      {
        id: 'resumeDate',
        label: 'Resume At',
        type: 'datetime',
        showWhen: { field: 'waitType', equals: 'until' },
      },
    ],
    defaults: {
      waitType: 'duration',
      duration: 5,
      unit: 'seconds',
    },
  },
  {
    id: 'parallel',
    name: 'Run in Parallel',
    description: 'Execute multiple branches simultaneously',
    tagline: 'Parallel execution',
    category: 'flow',
    subcategory: 'control',
    icon: 'GitFork',
    color: '#F59E0B',
    keywords: ['parallel', 'concurrent', 'async', 'simultaneous'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'branch1', name: 'Branch 1', type: 'data' },
      { id: 'branch2', name: 'Branch 2', type: 'data' },
      { id: 'branch3', name: 'Branch 3', type: 'data' }
    ],
    fields: [
      {
        id: 'waitForAll',
        label: 'Wait for All',
        type: 'boolean',
        default: true,
        description: 'Wait for all branches to complete before continuing',
      },
      {
        id: 'maxConcurrency',
        label: 'Max Concurrency',
        type: 'number',
        default: 10,
        min: 1,
        advanced: true,
      },
    ],
    defaults: {
      waitForAll: true,
      maxConcurrency: 10,
    },
  },
  {
    id: 'error-handler',
    name: 'Error Handler',
    description: 'Catch and handle errors in workflow',
    tagline: 'Error recovery',
    category: 'flow',
    subcategory: 'error-handling',
    icon: 'ShieldAlert',
    color: '#F59E0B',
    keywords: ['error', 'catch', 'exception', 'handler', 'try'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'success', name: 'Success', type: 'data' },
      { id: 'error', name: 'On Error', type: 'data' }
    ],
    fields: [
      {
        id: 'continueOnError',
        label: 'Continue on Error',
        type: 'boolean',
        default: true,
      },
      {
        id: 'retryOnFail',
        label: 'Retry on Fail',
        type: 'boolean',
        default: false,
      },
      {
        id: 'maxRetries',
        label: 'Max Retries',
        type: 'number',
        default: 3,
        min: 1,
        max: 10,
        showWhen: { field: 'retryOnFail', equals: true },
      },
      {
        id: 'retryDelay',
        label: 'Retry Delay (ms)',
        type: 'number',
        default: 1000,
        showWhen: { field: 'retryOnFail', equals: true },
      },
    ],
    defaults: {
      continueOnError: true,
      retryOnFail: false,
      maxRetries: 3,
      retryDelay: 1000,
    },
  },
  {
    id: 'human-approval',
    name: 'Human Approval',
    description: 'Pause workflow for human review and approval',
    tagline: 'Manual checkpoint',
    category: 'flow',
    subcategory: 'control',
    icon: 'UserCheck',
    color: '#F59E0B',
    keywords: ['approval', 'human', 'review', 'checkpoint', 'manual'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'approved', name: 'Approved', type: 'data' },
      { id: 'rejected', name: 'Rejected', type: 'data' }
    ],
    fields: [
      {
        id: 'title',
        label: 'Approval Title',
        type: 'text',
        placeholder: 'Review this action',
        required: true,
      },
      {
        id: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe what needs to be reviewed...',
      },
      {
        id: 'assignTo',
        label: 'Assign To',
        type: 'text',
        placeholder: 'email@example.com',
      },
      {
        id: 'timeout',
        label: 'Timeout (hours)',
        type: 'number',
        default: 24,
        min: 1,
        description: 'Auto-reject after timeout',
      },
    ],
    defaults: {
      timeout: 24,
    },
  },
];

// ============================================================================
// CORE NODES
// ============================================================================

export const CORE_NODES: NodeDefinition[] = [
  {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'Make HTTP requests to any API',
    tagline: 'Call any API',
    category: 'core',
    icon: 'Globe',
    color: '#6366F1',
    popular: true,
    keywords: ['http', 'api', 'request', 'rest', 'fetch', 'get', 'post'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'object' }
    ],
    fields: [
      {
        id: 'method',
        label: 'Method',
        type: 'select',
        default: 'GET',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      {
        id: 'url',
        label: 'URL',
        type: 'url',
        placeholder: 'https://api.example.com/endpoint',
        required: true,
      },
      {
        id: 'headers',
        label: 'Headers',
        type: 'keyvalue',
      },
      {
        id: 'queryParams',
        label: 'Query Parameters',
        type: 'keyvalue',
        advanced: true,
      },
      {
        id: 'body',
        label: 'Body',
        type: 'json',
        showWhen: { field: 'method', equals: 'POST' },
      },
      {
        id: 'authentication',
        label: 'Authentication',
        type: 'select',
        default: 'none',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Header Auth', value: 'header' },
          { label: 'Basic Auth', value: 'basic' },
          { label: 'Bearer Token', value: 'bearer' },
          { label: 'OAuth2', value: 'oauth2' },
        ],
        advanced: true,
      },
      {
        id: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        default: 30000,
        advanced: true,
      },
    ],
    defaults: {
      method: 'GET',
      authentication: 'none',
      timeout: 30000,
    },
  },
  {
    id: 'code',
    name: 'Code',
    description: 'Execute custom JavaScript or Python code',
    tagline: 'Run custom code',
    category: 'core',
    icon: 'Code',
    color: '#6366F1',
    popular: true,
    keywords: ['code', 'javascript', 'python', 'script', 'custom', 'function'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'any' }
    ],
    fields: [
      {
        id: 'language',
        label: 'Language',
        type: 'select',
        default: 'javascript',
        options: [
          { label: 'JavaScript', value: 'javascript' },
          { label: 'Python', value: 'python' },
        ],
      },
      {
        id: 'code',
        label: 'Code',
        type: 'code',
        required: true,
        default: '// Access input data with: items\n// Return the processed items\nreturn items;',
      },
      {
        id: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        default: 10000,
        min: 1000,
        max: 60000,
        advanced: true,
      },
    ],
    defaults: {
      language: 'javascript',
      code: '// Access input data with: items\n// Return the processed items\nreturn items;',
      timeout: 10000,
    },
  },
  {
    id: 'sub-workflow',
    name: 'Sub-Workflow',
    description: 'Execute another workflow as a step',
    tagline: 'Call another workflow',
    category: 'core',
    icon: 'Workflow',
    color: '#6366F1',
    keywords: ['sub', 'workflow', 'nested', 'call', 'reuse'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Output', type: 'any' }
    ],
    fields: [
      {
        id: 'workflowId',
        label: 'Workflow',
        type: 'select',
        required: true,
        options: [], // Populated dynamically
      },
      {
        id: 'passInput',
        label: 'Pass Input Data',
        type: 'boolean',
        default: true,
      },
      {
        id: 'waitForCompletion',
        label: 'Wait for Completion',
        type: 'boolean',
        default: true,
      },
    ],
    defaults: {
      passInput: true,
      waitForCompletion: true,
    },
  },
  {
    id: 'respond',
    name: 'Respond',
    description: 'Send response back (for webhook workflows)',
    tagline: 'Return response',
    category: 'core',
    icon: 'Send',
    color: '#6366F1',
    keywords: ['respond', 'response', 'return', 'output', 'webhook'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [],
    fields: [
      {
        id: 'responseType',
        label: 'Response Type',
        type: 'select',
        default: 'json',
        options: [
          { label: 'JSON', value: 'json' },
          { label: 'Text', value: 'text' },
          { label: 'HTML', value: 'html' },
          { label: 'Binary', value: 'binary' },
        ],
      },
      {
        id: 'statusCode',
        label: 'Status Code',
        type: 'number',
        default: 200,
      },
      {
        id: 'responseData',
        label: 'Response Data',
        type: 'expression',
        placeholder: '{{$json}}',
      },
      {
        id: 'headers',
        label: 'Response Headers',
        type: 'keyvalue',
        advanced: true,
      },
    ],
    defaults: {
      responseType: 'json',
      statusCode: 200,
    },
  },
];

// ============================================================================
// COMMUNICATION NODES
// ============================================================================

export const COMMUNICATION_NODES: NodeDefinition[] = [
  {
    id: 'send-email',
    name: 'Send Email',
    description: 'Send emails via SMTP or email providers',
    tagline: 'Send email messages',
    category: 'communication',
    icon: 'Mail',
    color: '#F97316',
    popular: true,
    keywords: ['email', 'send', 'smtp', 'gmail', 'outlook'],
    requiredCredentials: ['email'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Result', type: 'object' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Email Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'to',
        label: 'To',
        type: 'email',
        placeholder: 'recipient@example.com',
        required: true,
      },
      {
        id: 'cc',
        label: 'CC',
        type: 'email',
        advanced: true,
      },
      {
        id: 'bcc',
        label: 'BCC',
        type: 'email',
        advanced: true,
      },
      {
        id: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'Email subject',
        required: true,
      },
      {
        id: 'contentType',
        label: 'Content Type',
        type: 'select',
        default: 'html',
        options: [
          { label: 'HTML', value: 'html' },
          { label: 'Plain Text', value: 'text' },
        ],
      },
      {
        id: 'body',
        label: 'Body',
        type: 'textarea',
        required: true,
      },
      {
        id: 'attachments',
        label: 'Attachments',
        type: 'file',
        advanced: true,
      },
    ],
    defaults: {
      contentType: 'html',
    },
  },
  {
    id: 'slack-message',
    name: 'Slack Message',
    description: 'Send messages to Slack channels or users',
    tagline: 'Post to Slack',
    category: 'communication',
    icon: 'MessageSquare',
    color: '#F97316',
    popular: true,
    keywords: ['slack', 'message', 'channel', 'notification'],
    requiredCredentials: ['slack'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Result', type: 'object' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Slack Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'destination',
        label: 'Send To',
        type: 'select',
        default: 'channel',
        options: [
          { label: 'Channel', value: 'channel' },
          { label: 'User', value: 'user' },
        ],
      },
      {
        id: 'channel',
        label: 'Channel',
        type: 'text',
        placeholder: '#general',
        showWhen: { field: 'destination', equals: 'channel' },
      },
      {
        id: 'user',
        label: 'User',
        type: 'text',
        placeholder: '@username',
        showWhen: { field: 'destination', equals: 'user' },
      },
      {
        id: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
      },
      {
        id: 'blocks',
        label: 'Block Kit JSON',
        type: 'json',
        description: 'Advanced Slack Block Kit formatting',
        advanced: true,
      },
    ],
    defaults: {
      destination: 'channel',
    },
  },
  {
    id: 'sms',
    name: 'Send SMS',
    description: 'Send SMS messages via Twilio or other providers',
    tagline: 'Text message',
    category: 'communication',
    icon: 'Smartphone',
    color: '#F97316',
    keywords: ['sms', 'text', 'twilio', 'phone'],
    requiredCredentials: ['twilio'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Result', type: 'object' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'SMS Provider',
        type: 'credential',
        required: true,
      },
      {
        id: 'to',
        label: 'Phone Number',
        type: 'text',
        placeholder: '+1234567890',
        required: true,
      },
      {
        id: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
      },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send WhatsApp messages',
    tagline: 'WhatsApp messaging',
    category: 'communication',
    icon: 'MessageCircle',
    color: '#F97316',
    keywords: ['whatsapp', 'message', 'chat'],
    requiredCredentials: ['whatsapp'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Result', type: 'object' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'WhatsApp Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'to',
        label: 'Phone Number',
        type: 'text',
        placeholder: '+1234567890',
        required: true,
      },
      {
        id: 'messageType',
        label: 'Message Type',
        type: 'select',
        default: 'text',
        options: [
          { label: 'Text', value: 'text' },
          { label: 'Template', value: 'template' },
        ],
      },
      {
        id: 'message',
        label: 'Message',
        type: 'textarea',
        showWhen: { field: 'messageType', equals: 'text' },
      },
      {
        id: 'templateId',
        label: 'Template ID',
        type: 'text',
        showWhen: { field: 'messageType', equals: 'template' },
      },
    ],
    defaults: {
      messageType: 'text',
    },
  },
];

// ============================================================================
// CRM NODES
// ============================================================================

export const CRM_NODES: NodeDefinition[] = [
  {
    id: 'crm-get-contacts',
    name: 'Get Contacts',
    description: 'Retrieve contacts from CRM',
    tagline: 'Fetch CRM contacts',
    category: 'crm',
    icon: 'Users',
    color: '#14B8A6',
    popular: true,
    keywords: ['crm', 'contacts', 'leads', 'hubspot', 'salesforce'],
    requiredCredentials: ['crm'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'contacts', name: 'Contacts', type: 'array' }
    ],
    fields: [
      {
        id: 'provider',
        label: 'CRM Provider',
        type: 'select',
        options: [
          { label: 'HubSpot', value: 'hubspot' },
          { label: 'Salesforce', value: 'salesforce' },
          { label: 'Pipedrive', value: 'pipedrive' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'filter',
        label: 'Filter',
        type: 'condition',
      },
      {
        id: 'limit',
        label: 'Limit',
        type: 'number',
        default: 100,
      },
      {
        id: 'properties',
        label: 'Properties to Fetch',
        type: 'multiselect',
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Name', value: 'name' },
          { label: 'Phone', value: 'phone' },
          { label: 'Company', value: 'company' },
          { label: 'All', value: 'all' },
        ],
        default: ['all'],
      },
    ],
    defaults: {
      limit: 100,
      properties: ['all'],
    },
  },
  {
    id: 'crm-update-contact',
    name: 'Update Contact',
    description: 'Update contact properties in CRM',
    tagline: 'Modify CRM contact',
    category: 'crm',
    icon: 'UserPen',
    color: '#14B8A6',
    popular: true,
    keywords: ['crm', 'update', 'contact', 'modify'],
    requiredCredentials: ['crm'],
    inputs: [
      { id: 'input', name: 'Contact Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Updated Contact', type: 'object' }
    ],
    fields: [
      {
        id: 'provider',
        label: 'CRM Provider',
        type: 'select',
        options: [
          { label: 'HubSpot', value: 'hubspot' },
          { label: 'Salesforce', value: 'salesforce' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'contactId',
        label: 'Contact ID',
        type: 'expression',
        placeholder: '{{$json.contactId}}',
        required: true,
      },
      {
        id: 'properties',
        label: 'Properties to Update',
        type: 'keyvalue',
      },
    ],
  },
  {
    id: 'crm-create-deal',
    name: 'Create Deal',
    description: 'Create a new deal/opportunity in CRM',
    tagline: 'New CRM deal',
    category: 'crm',
    icon: 'DollarSign',
    color: '#14B8A6',
    keywords: ['crm', 'deal', 'opportunity', 'sales'],
    requiredCredentials: ['crm'],
    inputs: [
      { id: 'input', name: 'Deal Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Created Deal', type: 'object' }
    ],
    fields: [
      {
        id: 'provider',
        label: 'CRM Provider',
        type: 'select',
        options: [
          { label: 'HubSpot', value: 'hubspot' },
          { label: 'Salesforce', value: 'salesforce' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'dealName',
        label: 'Deal Name',
        type: 'text',
        required: true,
      },
      {
        id: 'amount',
        label: 'Amount',
        type: 'number',
      },
      {
        id: 'stage',
        label: 'Stage',
        type: 'select',
        options: [], // Populated dynamically from CRM
      },
      {
        id: 'contactId',
        label: 'Associated Contact',
        type: 'expression',
        placeholder: '{{$json.contactId}}',
      },
    ],
  },
  {
    id: 'crm-log-activity',
    name: 'Log Activity',
    description: 'Log a call, meeting, or note in CRM',
    tagline: 'Record CRM activity',
    category: 'crm',
    icon: 'ClipboardList',
    color: '#14B8A6',
    keywords: ['crm', 'log', 'activity', 'call', 'meeting', 'note'],
    requiredCredentials: ['crm'],
    inputs: [
      { id: 'input', name: 'Activity Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Logged Activity', type: 'object' }
    ],
    fields: [
      {
        id: 'provider',
        label: 'CRM Provider',
        type: 'select',
        options: [
          { label: 'HubSpot', value: 'hubspot' },
          { label: 'Salesforce', value: 'salesforce' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'activityType',
        label: 'Activity Type',
        type: 'select',
        options: [
          { label: 'Call', value: 'call' },
          { label: 'Meeting', value: 'meeting' },
          { label: 'Email', value: 'email' },
          { label: 'Note', value: 'note' },
          { label: 'Task', value: 'task' },
        ],
        required: true,
      },
      {
        id: 'contactId',
        label: 'Contact ID',
        type: 'expression',
        placeholder: '{{$json.contactId}}',
        required: true,
      },
      {
        id: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
      },
      {
        id: 'body',
        label: 'Body/Notes',
        type: 'textarea',
      },
      {
        id: 'outcome',
        label: 'Outcome',
        type: 'select',
        options: [
          { label: 'Connected', value: 'connected' },
          { label: 'Left Voicemail', value: 'voicemail' },
          { label: 'No Answer', value: 'no_answer' },
          { label: 'Busy', value: 'busy' },
        ],
        showWhen: { field: 'activityType', equals: 'call' },
      },
    ],
  },
];

// ============================================================================
// INTEGRATION NODES
// ============================================================================

export const INTEGRATION_NODES: NodeDefinition[] = [
  {
    id: 'database-query',
    name: 'Database Query',
    description: 'Execute SQL queries on your database',
    tagline: 'Run SQL queries',
    category: 'integrations',
    subcategory: 'database',
    icon: 'Database',
    color: '#EC4899',
    popular: true,
    keywords: ['database', 'sql', 'query', 'postgres', 'mysql'],
    requiredCredentials: ['database'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'rows', name: 'Rows', type: 'array' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Database Connection',
        type: 'credential',
        required: true,
      },
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        default: 'select',
        options: [
          { label: 'Select', value: 'select' },
          { label: 'Insert', value: 'insert' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Raw Query', value: 'raw' },
        ],
      },
      {
        id: 'table',
        label: 'Table',
        type: 'text',
        placeholder: 'users',
        showWhen: { field: 'operation', equals: 'select' },
      },
      {
        id: 'query',
        label: 'SQL Query',
        type: 'code',
        placeholder: 'SELECT * FROM users WHERE id = $1',
        showWhen: { field: 'operation', equals: 'raw' },
      },
      {
        id: 'parameters',
        label: 'Query Parameters',
        type: 'json',
        placeholder: '["value1", "value2"]',
        advanced: true,
      },
    ],
    defaults: {
      operation: 'select',
    },
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read and write data to Google Sheets',
    tagline: 'Spreadsheet operations',
    category: 'integrations',
    icon: 'Sheet',
    color: '#EC4899',
    popular: true,
    keywords: ['google', 'sheets', 'spreadsheet', 'excel'],
    requiredCredentials: ['google'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'output', name: 'Data', type: 'array' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Google Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { label: 'Read Rows', value: 'read' },
          { label: 'Append Row', value: 'append' },
          { label: 'Update Row', value: 'update' },
          { label: 'Delete Row', value: 'delete' },
          { label: 'Clear Sheet', value: 'clear' },
        ],
        required: true,
      },
      {
        id: 'spreadsheetId',
        label: 'Spreadsheet ID',
        type: 'text',
        required: true,
      },
      {
        id: 'sheetName',
        label: 'Sheet Name',
        type: 'text',
        default: 'Sheet1',
      },
      {
        id: 'range',
        label: 'Range',
        type: 'text',
        placeholder: 'A1:Z100',
        showWhen: { field: 'operation', equals: 'read' },
      },
      {
        id: 'data',
        label: 'Row Data',
        type: 'keyvalue',
        showWhen: { field: 'operation', equals: 'append' },
      },
    ],
    defaults: {
      sheetName: 'Sheet1',
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Create and manage Notion pages and databases',
    tagline: 'Notion integration',
    category: 'integrations',
    icon: 'BookOpen',
    color: '#EC4899',
    keywords: ['notion', 'page', 'database', 'wiki'],
    requiredCredentials: ['notion'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'output', name: 'Result', type: 'object' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Notion Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { label: 'Create Page', value: 'createPage' },
          { label: 'Update Page', value: 'updatePage' },
          { label: 'Query Database', value: 'queryDatabase' },
          { label: 'Create Database Entry', value: 'createEntry' },
        ],
        required: true,
      },
      {
        id: 'databaseId',
        label: 'Database ID',
        type: 'text',
        showWhen: { field: 'operation', equals: 'queryDatabase' },
      },
      {
        id: 'pageId',
        label: 'Parent Page ID',
        type: 'text',
        showWhen: { field: 'operation', equals: 'createPage' },
      },
      {
        id: 'title',
        label: 'Page Title',
        type: 'text',
        showWhen: { field: 'operation', equals: 'createPage' },
      },
      {
        id: 'content',
        label: 'Content',
        type: 'textarea',
        showWhen: { field: 'operation', equals: 'createPage' },
      },
      {
        id: 'properties',
        label: 'Properties',
        type: 'keyvalue',
      },
    ],
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Read and write Airtable records',
    tagline: 'Airtable operations',
    category: 'integrations',
    icon: 'Table',
    color: '#EC4899',
    keywords: ['airtable', 'table', 'database', 'records'],
    requiredCredentials: ['airtable'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'output', name: 'Records', type: 'array' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Airtable Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { label: 'List Records', value: 'list' },
          { label: 'Get Record', value: 'get' },
          { label: 'Create Record', value: 'create' },
          { label: 'Update Record', value: 'update' },
          { label: 'Delete Record', value: 'delete' },
        ],
        required: true,
      },
      {
        id: 'baseId',
        label: 'Base ID',
        type: 'text',
        required: true,
      },
      {
        id: 'tableId',
        label: 'Table',
        type: 'text',
        required: true,
      },
      {
        id: 'recordId',
        label: 'Record ID',
        type: 'expression',
        showWhen: { field: 'operation', equals: 'get' },
      },
      {
        id: 'fields',
        label: 'Fields',
        type: 'keyvalue',
        showWhen: { field: 'operation', equals: 'create' },
      },
      {
        id: 'filter',
        label: 'Filter Formula',
        type: 'text',
        placeholder: '{Status} = "Active"',
        showWhen: { field: 'operation', equals: 'list' },
        advanced: true,
      },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories',
    tagline: 'GitHub integration',
    category: 'integrations',
    icon: 'Github',
    color: '#EC4899',
    keywords: ['github', 'git', 'repository', 'code', 'issue', 'pr'],
    requiredCredentials: ['github'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'output', name: 'Result', type: 'object' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'GitHub Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { label: 'Create Issue', value: 'createIssue' },
          { label: 'Create Pull Request', value: 'createPR' },
          { label: 'Get Repository', value: 'getRepo' },
          { label: 'List Issues', value: 'listIssues' },
          { label: 'Create Comment', value: 'createComment' },
        ],
        required: true,
      },
      {
        id: 'owner',
        label: 'Owner',
        type: 'text',
        required: true,
      },
      {
        id: 'repo',
        label: 'Repository',
        type: 'text',
        required: true,
      },
      {
        id: 'title',
        label: 'Title',
        type: 'text',
        showWhen: { field: 'operation', equals: 'createIssue' },
      },
      {
        id: 'body',
        label: 'Body',
        type: 'textarea',
      },
      {
        id: 'labels',
        label: 'Labels',
        type: 'multiselect',
        options: [
          { label: 'bug', value: 'bug' },
          { label: 'enhancement', value: 'enhancement' },
          { label: 'documentation', value: 'documentation' },
        ],
        showWhen: { field: 'operation', equals: 'createIssue' },
      },
    ],
  },
];

// ============================================================================
// PRODUCTIVITY NODES
// ============================================================================

export const PRODUCTIVITY_NODES: NodeDefinition[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Create and manage calendar events',
    tagline: 'Calendar management',
    category: 'productivity',
    icon: 'Calendar',
    color: '#22C55E',
    keywords: ['calendar', 'google', 'event', 'meeting', 'schedule'],
    requiredCredentials: ['google'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'output', name: 'Events', type: 'array' }
    ],
    fields: [
      {
        id: 'credential',
        label: 'Google Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { label: 'Create Event', value: 'create' },
          { label: 'Get Events', value: 'list' },
          { label: 'Update Event', value: 'update' },
          { label: 'Delete Event', value: 'delete' },
        ],
        required: true,
      },
      {
        id: 'calendarId',
        label: 'Calendar',
        type: 'text',
        default: 'primary',
      },
      {
        id: 'title',
        label: 'Event Title',
        type: 'text',
        showWhen: { field: 'operation', equals: 'create' },
      },
      {
        id: 'startTime',
        label: 'Start Time',
        type: 'datetime',
        showWhen: { field: 'operation', equals: 'create' },
      },
      {
        id: 'endTime',
        label: 'End Time',
        type: 'datetime',
        showWhen: { field: 'operation', equals: 'create' },
      },
      {
        id: 'attendees',
        label: 'Attendees',
        type: 'text',
        placeholder: 'email1@example.com, email2@example.com',
        showWhen: { field: 'operation', equals: 'create' },
      },
    ],
    defaults: {
      calendarId: 'primary',
    },
  },
  {
    id: 'create-task',
    name: 'Create Task',
    description: 'Create tasks in task management tools',
    tagline: 'Task management',
    category: 'productivity',
    icon: 'CheckSquare',
    color: '#22C55E',
    keywords: ['task', 'todo', 'asana', 'trello', 'jira'],
    inputs: [
      { id: 'input', name: 'Input', type: 'data', required: true }
    ],
    outputs: [
      { id: 'output', name: 'Task', type: 'object' }
    ],
    fields: [
      {
        id: 'provider',
        label: 'Task Provider',
        type: 'select',
        options: [
          { label: 'Asana', value: 'asana' },
          { label: 'Trello', value: 'trello' },
          { label: 'Jira', value: 'jira' },
          { label: 'Todoist', value: 'todoist' },
          { label: 'ClickUp', value: 'clickup' },
        ],
        required: true,
      },
      {
        id: 'credential',
        label: 'Account',
        type: 'credential',
        required: true,
      },
      {
        id: 'title',
        label: 'Task Title',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        label: 'Description',
        type: 'textarea',
      },
      {
        id: 'project',
        label: 'Project',
        type: 'text',
      },
      {
        id: 'assignee',
        label: 'Assignee',
        type: 'text',
      },
      {
        id: 'dueDate',
        label: 'Due Date',
        type: 'date',
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ],
        default: 'medium',
      },
    ],
    defaults: {
      priority: 'medium',
    },
  },
];

// ============================================================================
// COMBINED NODE REGISTRY
// ============================================================================

export const ALL_NODES: NodeDefinition[] = [
  ...TRIGGER_NODES,
  ...AI_NODES,
  ...DATA_NODES,
  ...FLOW_NODES,
  ...CORE_NODES,
  ...COMMUNICATION_NODES,
  ...CRM_NODES,
  ...INTEGRATION_NODES,
  ...PRODUCTIVITY_NODES,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all nodes in a specific category
 */
export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return ALL_NODES.filter(node => node.category === category);
}

/**
 * Get popular nodes across all categories
 */
export function getPopularNodes(): NodeDefinition[] {
  return ALL_NODES.filter(node => node.popular);
}

/**
 * Search nodes by keyword
 */
export function searchNodes(query: string): NodeDefinition[] {
  const lowerQuery = query.toLowerCase();
  return ALL_NODES.filter(node => {
    const searchableText = [
      node.name,
      node.description,
      node.tagline,
      ...(node.keywords || []),
    ].join(' ').toLowerCase();
    return searchableText.includes(lowerQuery);
  });
}

/**
 * Get node by ID
 */
export function getNodeById(id: string): NodeDefinition | undefined {
  return ALL_NODES.find(node => node.id === id);
}

/**
 * Get nodes grouped by category
 */
export function getNodesGroupedByCategory(): Record<NodeCategory, NodeDefinition[]> {
  const grouped: Record<NodeCategory, NodeDefinition[]> = {
    triggers: [],
    ai: [],
    data: [],
    flow: [],
    core: [],
    integrations: [],
    crm: [],
    communication: [],
    productivity: [],
  };

  ALL_NODES.forEach(node => {
    grouped[node.category].push(node);
  });

  return grouped;
}

/**
 * Convert NodeDefinition to ModuleTemplate for compatibility
 */
export function nodeDefToModuleTemplate(nodeDef: NodeDefinition): any {
  return {
    id: nodeDef.id,
    category: nodeDef.category === 'triggers' ? 'trigger' :
              nodeDef.category === 'ai' ? 'skill' :
              nodeDef.category === 'flow' ? 'logic' :
              nodeDef.category === 'core' ? 'action' :
              nodeDef.category,
    type: nodeDef.id,
    name: nodeDef.name,
    description: nodeDef.description,
    icon: nodeDef.icon,
    color: nodeDef.color,
    defaultConfig: nodeDef.defaults || {},
    inputs: nodeDef.inputs,
    outputs: nodeDef.outputs,
    fields: nodeDef.fields,
  };
}
