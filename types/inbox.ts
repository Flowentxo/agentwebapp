/**
 * Flowent Inbox v2 - Type Definitions
 * Mission Control Inbox for Enterprise AI Agent Platform
 *
 * Aligned with backend Drizzle schema (lib/db/schema-inbox.ts)
 */

// =====================================================
// ENUMS (matching DB enums)
// =====================================================

// Filter types for inbox navigation
export type InboxFilter = 'all' | 'mentions' | 'approvals' | 'unread';

// Thread status types (matches threadStatusEnum)
export type ThreadStatus = 'active' | 'suspended' | 'completed' | 'archived';

// Priority levels (matches threadPriorityEnum)
export type ThreadPriority = 'low' | 'medium' | 'high' | 'urgent';

// Message types (matches messageTypeEnum)
export type MessageType = 'text' | 'approval_request' | 'system_event' | 'artifact';

// Message roles (matches messageRoleEnum)
export type MessageRole = 'user' | 'agent' | 'system';

// Artifact types (matches artifactTypeEnum)
export type ArtifactType = 'code' | 'markdown' | 'email_draft' | 'data_table' | 'json' | 'html';

// Approval status (matches approvalStatusDbEnum)
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// Approval action types (matches approvalActionTypeEnum)
export type ApprovalActionType =
  | 'send_email'
  | 'external_api_call'
  | 'database_write'
  | 'file_operation'
  | 'budget_spend'
  | 'other';

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface ThreadsResponse {
  success: boolean;
  threads: Thread[];
  count: number;
}

export interface ThreadDetailResponse {
  success: boolean;
  thread: Thread;
  messages: InboxMessage[];
}

export interface ArtifactsListResponse {
  success: boolean;
  artifacts: ArtifactSummary[];
  count: number;
}

export interface ArtifactResponse {
  success: boolean;
  artifact: Artifact;
}

export interface ApprovalResponse {
  success: boolean;
  approval: InboxApproval;
}

export interface MessageResponse {
  success: boolean;
  message: InboxMessage;
}

// =====================================================
// CORE TYPES (matching Drizzle schema)
// =====================================================

/**
 * Thread interface (matches inboxThreads table)
 */
export interface ThreadOrchestrationMetadata {
  workflowId?: string;
  executionId?: string;
  tags?: string[];
  context?: Record<string, unknown>;
  involvedAgents?: { id: string; name: string; color: string }[];
  routingHistory?: { agentId: string; agentName: string; confidence: number; reasoning: string; timestamp: string }[];
  workflowProgress?: { current: number; total: number; currentStep: string };
}

export interface Thread {
  id: string;
  userId: string;
  workspaceId?: string | null;
  subject: string;
  preview?: string | null;
  agentId: string;
  agentName: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  unreadCount: number;
  messageCount: number;
  pendingApprovalId?: string | null;
  metadata: ThreadOrchestrationMetadata;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Inbox Message interface (matches inboxMessages table)
 */
export interface InboxMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  agentId?: string | null;
  agentName?: string | null;
  artifactId?: string | null;
  approval?: ApprovalData | null;
  metadata?: MessageMetadata | null;
  isStreaming: boolean;
  isOptimistic: boolean;
  timestamp: string;
  createdAt: string;
}

/**
 * Approval data embedded in message
 */
export interface ApprovalData {
  approvalId: string;
  actionType: string;
  status: ApprovalStatus;
  cost?: number;
  estimatedTokens?: number;
  payload?: Record<string, unknown>;
  previewData?: string;
  expiresAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  comment?: string;
  rejectionReason?: string;
}

/**
 * Message metadata for system events
 */
export interface MessageMetadata {
  eventType?: string;
  workflowName?: string;
  fromAgent?: string;
  toAgent?: string;
  reason?: string;
  details?: string;
  agentName?: string;
  action?: string;
  approvedBy?: string;
  priority?: string;
  toolCalls?: ToolCall[];
  model?: string;
  tokens?: number;
  [key: string]: unknown;
}

/**
 * Artifact summary (lightweight, for lists)
 */
export interface ArtifactSummary {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string | null;
  version: number;
  metadata: ArtifactMetadata;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full Artifact (includes content)
 */
export interface Artifact extends ArtifactSummary {
  threadId?: string | null;
  messageId?: string | null;
  workflowExecutionId?: string | null;
  content: string;
  parentArtifactId?: string | null;
  userId: string;
  workspaceId?: string | null;
}

/**
 * Artifact metadata
 */
export interface ArtifactMetadata {
  lineCount?: number;
  wordCount?: number;
  fileSize?: number;
  encoding?: string;
  mimeType?: string;
  createdBy?: string;
  agentId?: string;
  agentName?: string;
  workflowStep?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Inbox Approval (matches inboxApprovals table)
 */
export interface InboxApproval {
  id: string;
  threadId: string;
  messageId: string;
  actionType: ApprovalActionType;
  status: ApprovalStatus;
  estimatedCost?: number | null;
  estimatedTokens?: number | null;
  payload: Record<string, unknown>;
  previewData?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  comment?: string | null;
  expiresAt?: string | null;
  workflowExecutionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// FRONTEND VIEW TYPES (derived from API types)
// =====================================================

/**
 * Thread for display (transformed from API response)
 */
export interface ThreadView {
  id: string;
  userId: string;
  workspaceId?: string | null;
  subject: string;
  preview?: string | null;
  agentId: string;
  agentName: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  unreadCount: number;
  messageCount: number;
  pendingApprovalId?: string | null;
  metadata: ThreadOrchestrationMetadata;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields for UI
  title: string;
  previewText: string;
  lastActivityAt: Date;
  tags: string[];
  isMention: boolean;
  requiresApproval: boolean;
}

/**
 * Tool action parsed from agent response
 */
export interface ParsedToolAction {
  id: string;
  type: string;
  params: Record<string, unknown>;
  preview?: string;
}

/**
 * Chat message for display (transformed from InboxMessage)
 */
export interface ChatMessage {
  id: string;
  threadId: string;
  type: MessageType;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  isStreaming?: boolean;
  isOptimistic?: boolean;
  approval?: ApprovalData;
  artifact?: Artifact;
  artifactId?: string | null;
  metadata?: MessageMetadata;
  toolActions?: ParsedToolAction[];
  createdAt?: string;
}

// =====================================================
// SOCKET TYPES
// =====================================================

export type ChatSocketEvent =
  | 'connect'
  | 'disconnect'
  | 'message:new'
  | 'message:stream'
  | 'message:complete'
  | 'typing:start'
  | 'typing:stop'
  | 'thread:update'
  | 'thread:history'
  | 'approval:update'
  | 'artifact:created'
  | 'agent:routed'
  | 'system:event'
  | 'error';

export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TypingIndicator {
  threadId: string;
  agentId: string;
  agentName: string;
  isTyping: boolean;
}

export interface AgentRoutedData {
  threadId: string;
  agentId: string;
  agentName: string;
  confidence: number;
  reasoning: string;
  previousAgent?: string;
}

// =====================================================
// ACTION PAYLOADS
// =====================================================

export interface SendMessagePayload {
  threadId: string;
  content: string;
  attachments?: string[];
}

export interface ApprovalActionPayload {
  threadId: string;
  messageId: string;
  action: 'approve' | 'reject';
  comment?: string;
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  args?: Record<string, any>;
  result?: { success?: boolean; data?: any; error?: string; summary?: string };
  displayName?: string;
}

export interface InboxAgent {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  activeThreads: number;
}

// =====================================================
// TRANSFORMATION HELPERS
// =====================================================

/**
 * Transform API Thread to ThreadView for UI
 */
export function transformThreadToView(thread: Thread): ThreadView {
  return {
    ...thread,
    title: thread.subject,
    previewText: thread.preview || '',
    lastActivityAt: new Date(thread.lastMessageAt),
    tags: thread.metadata?.tags || [],
    isMention: false, // Could be computed from messages
    requiresApproval: thread.status === 'suspended' && !!thread.pendingApprovalId,
  };
}

/**
 * Transform API InboxMessage to ChatMessage for UI
 */
export function transformMessageToChat(message: InboxMessage, artifact?: Artifact): ChatMessage {
  return {
    id: message.id,
    threadId: message.threadId,
    type: message.type,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp),
    agentId: message.agentId || undefined,
    agentName: message.agentName || undefined,
    isStreaming: message.isStreaming,
    isOptimistic: message.isOptimistic,
    approval: message.approval || undefined,
    artifact: artifact,
    artifactId: message.artifactId || undefined,
    metadata: message.metadata || undefined,
  };
}
