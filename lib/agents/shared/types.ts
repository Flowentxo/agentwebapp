/**
 * PHASE 1: Shared Types & Interfaces für alle Agents
 * Zentrale TypeScript Interfaces für das Enterprise Agent System
 */

// ============================================
// CUSTOMER PROFILE
// ============================================

export interface UnifiedCustomerProfile {
  id: string;
  workspaceId: string;

  // External IDs from integrations
  externalIds: {
    salesforceId?: string;
    hubspotId?: string;
    zendeskId?: string;
    stripeId?: string;
    intercomId?: string;
  };

  // Contact Information
  contact: {
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    company?: string;
    title?: string;
    avatar?: string;
  };

  // Engagement Metrics
  engagement: {
    totalInteractions: number;
    lastContactDate: Date | null;
    preferredChannel: 'email' | 'chat' | 'phone' | 'social';
    csat?: number; // 1-5
    nps?: number; // -100 to +100
    responseRate?: number; // 0-100
  };

  // Financial Metrics
  financials: {
    ltv: number;
    mrr: number;
    totalSpent: number;
    paymentStatus: 'current' | 'overdue' | 'churned' | 'trial';
    churnRisk: number; // 0-100
    contractValue?: number;
    renewalDate?: Date;
  };

  // Product Usage
  usage?: {
    lastLogin?: Date;
    loginFrequency?: number; // per month
    activeFeatures?: string[];
    utilizationScore?: number; // 0-100
    adoptionStage?: 'onboarding' | 'growing' | 'mature' | 'declining';
  };

  // Segmentation
  segments: string[];
  tags: string[];
  customFields: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// AGENT CONTEXT & RESPONSE
// ============================================

export interface AgentContext {
  userId: string;
  workspaceId: string;
  sessionId: string;
  permissions: string[];
  integrations: IntegrationCredentials[];
  locale?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metadata: AgentResponseMetadata;
}

export interface AgentError {
  code: AgentErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export type AgentErrorCode =
  | 'EXECUTION_FAILED'
  | 'TOOL_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'INTEGRATION_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

export interface AgentResponseMetadata {
  agentId: string;
  executionTimeMs: number;
  tokensUsed?: number;
  cached?: boolean;
  toolsUsed?: string[];
  correlationId?: string;
}

// ============================================
// INTEGRATION CREDENTIALS
// ============================================

export interface IntegrationCredentials {
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

export type IntegrationProvider =
  | 'salesforce'
  | 'hubspot'
  | 'zendesk'
  | 'stripe'
  | 'slack'
  | 'gmail'
  | 'outlook'
  | 'intercom'
  | 'freshdesk'
  | 'jira'
  | 'asana'
  | 'notion';

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes: string[];
  metadata: Record<string, unknown>;
  lastSyncAt?: Date;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IntegrationStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'disconnected'
  | 'error';

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditLogEntry {
  id: string;
  agentId: string;
  userId: string;
  workspaceId: string;
  action: string;
  toolName?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  executionTimeMs: number;
  tokensUsed?: number;
  cost?: number;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  createdAt: Date;
}

// ============================================
// AGENT TOOL DEFINITIONS
// ============================================

export interface AgentToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  requiresAuth: boolean;
  requiredIntegrations?: IntegrationProvider[];
  rateLimitPerMinute?: number;
  timeout?: number; // ms
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>;
}

export type ToolCategory =
  | 'analysis'
  | 'calculation'
  | 'integration'
  | 'communication'
  | 'automation'
  | 'reporting'
  | 'data';

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

// ============================================
// AGENT EXECUTION
// ============================================

export interface AgentExecution {
  id: string;
  agentId: string;
  userId: string;
  workspaceId: string;
  toolName?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: ExecutionStatus;
  errorMessage?: string;
  executionTimeMs?: number;
  tokensUsed?: number;
  cost?: number;
  retryCount?: number;
  parentExecutionId?: string;
  correlationId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

// ============================================
// AGENT CONVERSATION
// ============================================

export interface AgentConversation {
  id: string;
  agentId: string;
  userId: string;
  workspaceId: string;
  sessionId: string;
  messages: ConversationMessage[];
  context?: Record<string, unknown>;
  isActive: boolean;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  tokensUsed?: number;
  createdAt: Date;
}

// ============================================
// WORKFLOW TYPES (for Aura)
// ============================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
  errorHandling: WorkflowErrorHandling;
  createdBy: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface WorkflowTrigger {
  type: 'webhook' | 'schedule' | 'event' | 'manual' | 'database';
  config: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export type WorkflowNodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'switch'
  | 'loop'
  | 'delay'
  | 'transform'
  | 'agent_call'
  | 'end';

export interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  required?: boolean;
}

export interface WorkflowErrorHandling {
  onError: 'stop' | 'continue' | 'retry' | 'fallback';
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier?: number;
  };
  fallbackWorkflowId?: string;
  notifyOnError?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  triggeredBy: string;
  triggerData?: Record<string, unknown>;
  nodeExecutions: NodeExecution[];
  variables: Record<string, unknown>;
  error?: {
    nodeId: string;
    message: string;
    stack?: string;
  };
  startedAt: Date;
  completedAt?: Date;
}

export interface NodeExecution {
  nodeId: string;
  status: ExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
}

// ============================================
// EVENT TYPES
// ============================================

export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  correlationId?: string;
}

export const AgentEventTypes = {
  // Dexter Events
  DEXTER_ANALYSIS_COMPLETED: 'dexter.analysis.completed',
  DEXTER_FORECAST_GENERATED: 'dexter.forecast.generated',
  DEXTER_ANOMALY_DETECTED: 'dexter.anomaly.detected',
  DEXTER_REPORT_GENERATED: 'dexter.report.generated',

  // Cassie Events
  CASSIE_TICKET_CREATED: 'cassie.ticket.created',
  CASSIE_TICKET_RESOLVED: 'cassie.ticket.resolved',
  CASSIE_SENTIMENT_ALERT: 'cassie.sentiment.alert',
  CASSIE_CHURN_RISK_DETECTED: 'cassie.churn.detected',
  CASSIE_ESCALATION_TRIGGERED: 'cassie.escalation.triggered',

  // Aura Events
  AURA_WORKFLOW_STARTED: 'aura.workflow.started',
  AURA_WORKFLOW_COMPLETED: 'aura.workflow.completed',
  AURA_WORKFLOW_FAILED: 'aura.workflow.failed',
  AURA_TRIGGER_FIRED: 'aura.trigger.fired',
  AURA_NODE_EXECUTED: 'aura.node.executed',

  // Emmie Events
  EMMIE_EMAIL_SENT: 'emmie.email.sent',
  EMMIE_EMAIL_DRAFTED: 'emmie.email.drafted',
  EMMIE_FOLLOWUP_SCHEDULED: 'emmie.followup.scheduled',

  // System Events
  SYSTEM_AGENT_ERROR: 'system.agent.error',
  SYSTEM_INTEGRATION_SYNCED: 'system.integration.synced',
  SYSTEM_INTEGRATION_ERROR: 'system.integration.error',
  SYSTEM_USER_ACTION: 'system.user.action',
  SYSTEM_RATE_LIMITED: 'system.rate.limited',
} as const;

export type AgentEventType = typeof AgentEventTypes[keyof typeof AgentEventTypes];

// ============================================
// CRM TYPES
// ============================================

export interface CRMContact {
  id: string;
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
  lifecycleStage?: string;
  leadStatus?: string;
  ownerId?: string;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMDeal {
  id: string;
  externalId: string;
  name: string;
  amount: number;
  currency: string;
  stage: string;
  probability?: number;
  closeDate?: Date;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMTicket {
  id: string;
  externalId: string;
  subject: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contactId?: string;
  assigneeId?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  firstResponseAt?: Date;
}

// ============================================
// FINANCIAL TYPES (for Dexter)
// ============================================

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface RevenueData {
  mrr: number;
  arr: number;
  totalPipelineValue: number;
  dealsByStage: Record<string, { count: number; value: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  topDeals: Array<{ name: string; value: number; stage: string; closeDate?: Date }>;
}

export interface PnLReport {
  period: FinancialPeriod;
  revenue: {
    total: number;
    byCategory: Record<string, number>;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
}

export interface CashFlowReport {
  period: FinancialPeriod;
  openingBalance: number;
  closingBalance: number;
  netCashFlow: number;
  inflows: Array<{ category: string; amount: number; date: Date }>;
  outflows: Array<{ category: string; amount: number; date: Date }>;
  runway?: number; // months
}

export interface ForecastResult {
  forecasts: Array<{
    period: string;
    predicted: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }>;
  method: string;
  accuracy: {
    mape: number;
    rmse: number;
    r2: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
}

// ============================================
// SUPPORT TYPES (for Cassie)
// ============================================

export interface TicketAnalysis {
  intent: string;
  confidence: number;
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'neutral' | 'negative';
  };
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  suggestedActions: string[];
  autoResolvable: boolean;
  escalationRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CustomerHealthScore {
  overall: number; // 0-100
  components: {
    usage: number;
    engagement: number;
    support: number;
    payment: number;
    sentiment: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  riskFactors: string[];
  recommendations: string[];
}

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaited<T> = T extends Promise<infer U> ? U : T;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: SortOptions[];
  filters?: FilterOptions[];
}
