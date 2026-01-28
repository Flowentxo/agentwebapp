/**
 * Workflow Execution Types
 *
 * Phase 11: Enhanced with RAG configuration for Brain Cortex integration
 */

// RAG Configuration for Agent Nodes
export interface AgentRAGConfig {
  // Enable RAG context retrieval
  ragEnabled: boolean;
  // Minimum relevance threshold (0.0-1.0)
  ragThreshold: number;
  // Filter knowledge by tags
  knowledgeTags: string[];
  // Include conversation/session memories
  includePreviousMemories: boolean;
  // Maximum number of context chunks
  maxContextChunks?: number;
  // Whether to include source citations in output
  includeCitations?: boolean;
  // Retrieval strategy
  retrievalStrategy?: 'hybrid' | 'semantic' | 'keyword';
}

// Node data as stored in the database
export interface WorkflowNodeData {
  label: string;
  type: 'trigger' | 'action' | 'agent' | 'condition' | 'output';
  icon?: string;
  color?: string;
  description?: string;
  config?: Record<string, unknown>;
  // Phase 11: RAG configuration for agent nodes
  ragConfig?: AgentRAGConfig;
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Execution context passed between nodes
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  startedAt: Date;
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, NodeOutput>;
  triggerData?: unknown;
}

// Citation from RAG context retrieval
export interface RAGCitation {
  id: string;
  title: string;
  excerpt: string;
  relevance: number;
  sourceType: 'document' | 'meeting' | 'email' | 'external' | 'idea';
  metadata?: Record<string, unknown>;
}

// ISO 42001 Compliance tracking
export interface AIUsageCompliance {
  workspaceId: string;
  userId: string;
  model: string;
  provider: string;
  operation: string;
  tokensPrompt: number;
  tokensCompletion: number;
  latencyMs: number;
  success: boolean;
  traceId: string;
}

// Enhanced output with RAG context and compliance
export interface AgentNodeOutput {
  // AI Response
  response: string;
  agentId: string;
  agentName: string;

  // Model information
  model: string;
  provider: string;
  temperature: number;

  // Token usage
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;

  // RAG Context (Phase 11)
  ragContext?: {
    enabled: boolean;
    sourcesUsed: number;
    citations: RAGCitation[];
    confidenceScore: number;
    retrievalStrategy: string;
  };

  // Compliance tracking (ISO 42001)
  compliance?: AIUsageCompliance;

  // Memory persistence
  memoryId?: string;
  sessionId?: string;

  // Trace ID for debugging
  traceId: string;

  // Processing metadata
  processingTime: number;
  timestamp: string;
  confidence: number;
  usedFallback: boolean;
}

// Output from a single node execution
export interface NodeOutput {
  success: boolean;
  data: unknown;
  error?: string;
  duration: number;
  timestamp: Date;
}

// Result of the entire workflow execution
export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'failed' | 'partial';
  startedAt: Date;
  completedAt: Date;
  duration: number;
  nodeResults: Record<string, NodeOutput>;
  finalOutput?: unknown;
  error?: string;
}

// Executor function signature
export type NodeExecutor = (
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
) => Promise<NodeOutput>;

// Event types for real-time updates (future Socket.IO integration)
export type ExecutionEventType =
  | 'execution:started'
  | 'execution:node:started'
  | 'execution:node:completed'
  | 'execution:node:failed'
  | 'execution:completed'
  | 'execution:failed';

export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  workflowId: string;
  nodeId?: string;
  data?: unknown;
  timestamp: Date;
}
