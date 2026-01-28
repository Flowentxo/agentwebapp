/**
 * Motion Agents Shared Types
 * Type definitions for Usemotion-style AI Agents
 */

import type { LucideIcon } from 'lucide-react';

// ============================================
// AGENT TYPES
// ============================================

export type MotionAgentId = 'alfred' | 'suki' | 'millie' | 'chip' | 'dot' | 'clide' | 'spec';

export type AgentCategory = 'operations' | 'marketing' | 'sales' | 'hr' | 'support' | 'research';

export interface MotionAgentMetadata {
  id: MotionAgentId;
  name: string;
  role: string;
  description: string;
  category: AgentCategory;
  color: string;
  icon: LucideIcon;
  specialties: string[];
  version: string;
}

// ============================================
// CONTEXT TYPES
// ============================================

export interface MotionAgentContext {
  userId: string;
  workspaceId: string;
  sessionId: string;
  conversationId?: string;
  permissions: string[];
  integrations: ConnectedIntegration[];
  preferences: UserPreferences;
  locale: string;
  timezone: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectedIntegration {
  provider: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface UserPreferences {
  defaultEmailSignature?: string;
  communicationStyle: 'formal' | 'casual' | 'friendly';
  workingHours: {
    start: string; // HH:mm
    end: string;
    timezone: string;
    workDays: number[]; // 0-6, Sunday = 0
  };
  notificationPreferences: {
    email: boolean;
    slack: boolean;
    inApp: boolean;
  };
}

// ============================================
// TOOL TYPES
// ============================================

export interface MotionTool<TInput = unknown, TOutput = unknown> {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  inputSchema: JSONSchemaDefinition;
  outputSchema?: JSONSchemaDefinition;
  requiresAuth: boolean;
  requiredIntegrations?: string[];
  rateLimitPerMinute?: number;
  creditCost: number;
  requiresApproval?: boolean;
  timeout?: number;
  execute: (input: TInput, context: MotionAgentContext) => Promise<TOutput>;
}

export type ToolCategory =
  | 'email'
  | 'calendar'
  | 'communication'
  | 'crm'
  | 'project'
  | 'research'
  | 'content'
  | 'analytics'
  | 'document'
  | 'integration';

export interface JSONSchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaDefinition>;
  items?: JSONSchemaDefinition;
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

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
  executionTimeMs: number;
  creditsUsed: number;
  requiresApproval?: boolean;
  approvalId?: string;
}

export interface ToolError {
  code: ToolErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export type ToolErrorCode =
  | 'EXECUTION_FAILED'
  | 'TOOL_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'INTEGRATION_ERROR'
  | 'TIMEOUT'
  | 'INSUFFICIENT_CREDITS'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_DENIED';

// ============================================
// SKILL TYPES
// ============================================

export type SkillTriggerType = 'manual' | 'scheduled' | 'event';
export type SkillVisibility = 'private' | 'team' | 'workspace';
export type SkillStatus = 'draft' | 'active' | 'paused' | 'archived';
export type SkillStepType = 'tool' | 'prompt' | 'condition' | 'loop' | 'human_approval' | 'delay';

export interface Skill {
  id: string;
  agentId: MotionAgentId;
  workspaceId: string;
  userId: string;
  name: string;
  displayName: string;
  description: string;
  triggerType: SkillTriggerType;
  triggerConfig: SkillTriggerConfig;
  steps: SkillStep[];
  inputSchema?: JSONSchemaDefinition;
  outputFormat: 'text' | 'json' | 'markdown' | 'html';
  visibility: SkillVisibility;
  status: SkillStatus;
  runCount: number;
  lastRunAt?: Date;
  lastRunStatus?: SkillExecutionStatus;
  avgExecutionTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillTriggerConfig {
  // For scheduled triggers
  cronExpression?: string;
  timezone?: string;
  // For event triggers
  eventType?: string;
  eventFilter?: Record<string, unknown>;
  // For manual triggers
  inputPrompt?: string;
}

export interface SkillStep {
  id: string;
  type: SkillStepType;
  name: string;
  description?: string;
  config: SkillStepConfig;
  onSuccess?: string;
  onFailure?: string;
  timeout?: number;
}

export type SkillStepConfig =
  | ToolStepConfig
  | PromptStepConfig
  | ConditionStepConfig
  | LoopStepConfig
  | ApprovalStepConfig
  | DelayStepConfig;

export interface ToolStepConfig {
  type: 'tool';
  toolName: string;
  inputMapping: Record<string, string>; // Maps step input to tool input
  outputKey?: string; // Key to store result in context
}

export interface PromptStepConfig {
  type: 'prompt';
  prompt: string;
  model?: string;
  temperature?: number;
  outputKey?: string;
}

export interface ConditionStepConfig {
  type: 'condition';
  condition: string; // JavaScript expression
  trueBranch: string; // Step ID
  falseBranch: string; // Step ID
}

export interface LoopStepConfig {
  type: 'loop';
  collection: string; // Context key containing array
  itemKey: string; // Variable name for current item
  bodySteps: string[]; // Step IDs to execute for each item
}

export interface ApprovalStepConfig {
  type: 'human_approval';
  message: string;
  approvers?: string[]; // User IDs
  timeout?: number; // Auto-reject after timeout
  notifyVia?: ('email' | 'slack' | 'inApp')[];
}

export interface DelayStepConfig {
  type: 'delay';
  duration: number; // milliseconds
}

// ============================================
// SKILL EXECUTION TYPES
// ============================================

export type SkillExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'awaiting_approval';

export interface SkillExecution {
  id: string;
  skillId: string;
  userId: string;
  workspaceId: string;
  triggerSource: SkillTriggerType;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: SkillExecutionStatus;
  errorMessage?: string;
  stepsCompleted: SkillStepExecution[];
  currentStep: number;
  executionTimeMs?: number;
  tokensUsed?: number;
  creditsConsumed: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface SkillStepExecution {
  stepId: string;
  status: SkillExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
}

// ============================================
// APPROVAL TYPES
// ============================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalRequest {
  id: string;
  agentId: MotionAgentId;
  userId: string;
  workspaceId: string;
  action: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  preview?: string; // Preview of what will be done
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date;
  skillExecutionId?: string;
  createdAt: Date;
}

// ============================================
// CREDIT TYPES
// ============================================

export interface CreditUsage {
  id: string;
  workspaceId: string;
  userId: string;
  agentId: MotionAgentId;
  skillId?: string;
  toolName?: string;
  operationType: CreditOperationType;
  creditsUsed: number;
  creditType: 'standard' | 'premium' | 'enterprise';
  inputTokens?: number;
  outputTokens?: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  createdAt: Date;
}

export type CreditOperationType = 'chat' | 'tool_execution' | 'skill_run' | 'document_generation' | 'research';

export interface CreditAllocation {
  id: string;
  workspaceId: string;
  planType: 'starter' | 'light' | 'standard' | 'plus' | 'enterprise';
  monthlyCredits: number;
  rolloverCredits: number;
  periodStart: Date;
  periodEnd: Date;
  creditsUsed: number;
  creditsRemaining: number;
  overageRate: number;
  overageCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface MotionConversation {
  id: string;
  agentId: MotionAgentId;
  userId: string;
  workspaceId: string;
  sessionId: string;
  messages: MotionMessage[];
  context: Record<string, unknown>;
  isActive: boolean;
  summary?: string;
  messageCount: number;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

export interface MotionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  tokensUsed?: number;
  creditsUsed?: number;
  createdAt: Date;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface MotionAgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metadata: ResponseMetadata;
}

export interface AgentError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export interface ResponseMetadata {
  agentId: MotionAgentId;
  executionTimeMs: number;
  tokensUsed?: number;
  creditsUsed?: number;
  cached?: boolean;
  toolsUsed?: string[];
  correlationId?: string;
  approvalRequired?: boolean;
  approvalId?: string;
}

// ============================================
// EVENT TYPES
// ============================================

export type MotionEventType =
  // Agent events
  | 'agent.chat.started'
  | 'agent.chat.completed'
  | 'agent.tool.executed'
  | 'agent.error'
  // Skill events
  | 'skill.created'
  | 'skill.updated'
  | 'skill.deleted'
  | 'skill.execution.started'
  | 'skill.execution.completed'
  | 'skill.execution.failed'
  // Approval events
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired'
  // Credit events
  | 'credit.used'
  | 'credit.threshold.warning'
  | 'credit.exhausted';

export interface MotionEvent {
  id: string;
  type: MotionEventType;
  agentId?: MotionAgentId;
  userId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  correlationId?: string;
}

// ============================================
// HELPER TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

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
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: unknown;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: SortOptions[];
  filters?: FilterOptions[];
}
