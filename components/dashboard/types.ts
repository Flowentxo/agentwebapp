// ============================================================================
// DASHBOARD TYPES & INTERFACES
// ============================================================================

export type LogEntryType = 'info' | 'success' | 'error' | 'warning';
export type LogEntryStatus = 'completed' | 'pending' | 'failed' | 'running';

// ============================================================================
// AGENT CONFIGURATION (Level 4)
// ============================================================================

export interface AgentCapabilities {
  internetAccess: boolean;
  longTermMemory: boolean;
  codeExecution: boolean;
}

export interface AgentConfig {
  temperature: number; // 0.0 - 1.0
  capabilities: AgentCapabilities;
  maxTokensPerRequest?: number;
  systemPromptOverride?: string;
}

// For partial updates to AgentConfig
export interface AgentConfigUpdate {
  temperature?: number;
  capabilities?: Partial<AgentCapabilities>;
  maxTokensPerRequest?: number;
  systemPromptOverride?: string;
}

// ============================================================================
// KNOWLEDGE BASE / RAG STATUS (Level 4)
// ============================================================================

export interface KnowledgeBaseStatus {
  documentCount: number;
  lastSyncedAt: Date;
  isSyncing: boolean;
  totalChunks: number;
  vectorDimensions: number;
  storageUsedMb: number;
}

export interface LogEntry {
  id: string;
  type: LogEntryType;
  status: LogEntryStatus;
  message: string;
  timestamp: Date;
  agent?: string;
  agentColor?: string;
  duration?: number; // in milliseconds
  tokensUsed?: number;
  cost?: number;
  output?: LogEntryOutput;
  metadata?: Record<string, unknown>;

  // Level 9: Thread/Conversation Support
  parentId?: string; // Reference to parent log entry for threaded conversations
  originalCommand?: string; // The original command that started this thread
  threadDepth?: number; // How deep in the conversation thread (0 = root)

  // Level 10: Tool Invocations
  toolInvocations?: ToolInvocation[];
}

// Level 9: Thread message for conversation history
export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ============================================================================
// LEVEL 10: TOOL INVOCATIONS
// ============================================================================

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'partial-call' | 'call' | 'result';
  result?: unknown;
}

export interface LogEntryOutput {
  type: 'text' | 'json' | 'report' | 'code';
  title?: string;
  content: string;
  downloadable?: boolean;
  filename?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  color: string;
  status: 'active' | 'idle' | 'busy' | 'offline' | 'error';
  lastActivity?: Date;
  requests24h: number;
  successRate24h: number;
  avgResponseTime: number;
  tokensUsed24h: number;
  costToday: number;
}

export interface Metric {
  id: string;
  label: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  details?: MetricDetail[];
}

export interface MetricDetail {
  label: string;
  value: number | string;
  percentage?: number;
  color?: string;
}

export interface CommandSuggestion {
  command: string;
  description: string;
  icon?: string;
  category?: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  pendingJobs: number;
  tokenUsage: number;
  totalCost: number;
  systemHealth: number;
  agentCosts: AgentCostBreakdown[];
}

export interface AgentCostBreakdown {
  agentId: string;
  agentName: string;
  agentColor: string;
  tokens: number;
  cost: number;
  percentage: number;
}

// ============================================================================
// EXTENDED DASHBOARD STATS (Level 4)
// ============================================================================

export interface DashboardStatsExtended extends DashboardStats {
  knowledgeBase: KnowledgeBaseStatus;
}
