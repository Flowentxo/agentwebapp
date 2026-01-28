/**
 * Tool Execution Layer - Interfaces
 * Phase 12: Connecting Engine to APIs
 *
 * Standard interfaces to decouple the Workflow Engine from specific API implementations
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Context provided to every tool execution
 */
export interface ToolContext {
  /** User ID executing the tool */
  userId: string;
  /** Workspace ID for multi-tenant isolation */
  workspaceId: string;
  /** Optional execution ID for tracing */
  executionId?: string;
  /** Optional node ID within workflow */
  nodeId?: string;
  /** Additional context variables */
  variables?: Record<string, unknown>;
}

/**
 * Result returned from tool execution
 */
export interface ToolResult<T = unknown> {
  /** Whether the execution succeeded */
  success: boolean;
  /** Output data from the tool */
  data: T;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
  /** Execution metadata */
  metadata?: {
    /** Time taken in milliseconds */
    durationMs?: number;
    /** API calls made */
    apiCalls?: number;
    /** Rate limit info */
    rateLimit?: {
      remaining: number;
      resetAt: Date;
    };
  };
}

/**
 * Tool parameter definition for UI/validation
 */
export interface ToolParameter {
  /** Parameter name (camelCase) */
  name: string;
  /** Display label */
  label: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'url';
  /** Whether required */
  required: boolean;
  /** Default value */
  default?: unknown;
  /** Description for UI */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Validation pattern (regex) */
  pattern?: string;
  /** Enum values for select */
  options?: Array<{ label: string; value: string }>;
}

/**
 * Tool definition interface
 */
export interface ITool<TInput = unknown, TOutput = unknown> {
  /** Unique tool identifier (e.g., 'gmail-send-message') */
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
  /** Input parameter definitions */
  parameters: ToolParameter[];
  /** Output schema description */
  outputSchema?: Record<string, unknown>;
  /** Required OAuth scopes */
  requiredScopes?: string[];
  /** Execute the tool */
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;
}

/**
 * Tool categories
 */
export type ToolCategory =
  | 'communication'  // Email, messaging
  | 'crm'           // Contact/deal management
  | 'calendar'      // Event scheduling
  | 'storage'       // File operations
  | 'data'          // Data processing
  | 'ai'            // AI/ML operations
  | 'utility';      // General utilities

// ============================================================================
// GMAIL TOOL TYPES
// ============================================================================

export interface GmailSendMessageInput {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    mimeType: string;
  }>;
}

export interface GmailSendMessageOutput {
  messageId: string;
  threadId: string;
  labelIds: string[];
}

export interface GmailReadMessagesInput {
  query?: string;
  maxResults?: number;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  body?: string;
  date: Date;
  labels: string[];
  isUnread: boolean;
}

// ============================================================================
// HUBSPOT TOOL TYPES
// ============================================================================

export interface HubSpotCreateContactInput {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  jobtitle?: string;
  lifecyclestage?: 'subscriber' | 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead' | 'opportunity' | 'customer' | 'evangelist' | 'other';
  customProperties?: Record<string, string>;
}

export interface HubSpotContactOutput {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  createdAt: Date;
  updatedAt: Date;
  properties: Record<string, string>;
}

export interface HubSpotCreateDealInput {
  dealname: string;
  pipeline?: string;
  dealstage?: string;
  amount?: number;
  closedate?: string;
  hubspot_owner_id?: string;
  associatedContactIds?: string[];
  associatedCompanyIds?: string[];
  customProperties?: Record<string, string>;
}

export interface HubSpotDealOutput {
  id: string;
  dealname: string;
  amount?: number;
  dealstage: string;
  pipeline: string;
  createdAt: Date;
  updatedAt: Date;
  properties: Record<string, string>;
}

// ============================================================================
// SLACK TOOL TYPES
// ============================================================================

export interface SlackSendMessageInput {
  channel: string;
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
  thread_ts?: string;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

export interface SlackMessageOutput {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    user: string;
    ts: string;
  };
}

// ============================================================================
// TOOL REGISTRY TYPES
// ============================================================================

export interface ToolRegistryConfig {
  /** Enable execution logging */
  enableLogging?: boolean;
  /** Default timeout in ms */
  defaultTimeout?: number;
  /** Max retries on failure */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

export interface ToolExecutionLog {
  id: string;
  toolId: string;
  userId: string;
  workspaceId: string;
  executionId?: string;
  input: Record<string, unknown>;
  output?: ToolResult;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  status: 'running' | 'success' | 'error';
  errorMessage?: string;
}
