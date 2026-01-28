// Chat Interface Types

export type MessageRole = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'code' | 'table' | 'chart' | 'tool-output' | 'error' | 'confirmation';
export type ComposerMode = 'question' | 'command' | 'system-hint';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  tokens?: number;
  latency?: number;
  toolName?: string;
  metadata?: Record<string, any>;
  feedback?: MessageFeedback;
  threadId?: string; // For nested conversations
}

export interface MessageFeedback {
  rating: 'positive' | 'negative';
  reasons?: ('hallucination' | 'latency' | 'format' | 'accuracy' | 'other')[];
  comment?: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  agentDescription?: string;
  lastMessage?: string;
  lastActivity: Date;
  status: 'healthy' | 'degraded' | 'error';
  unreadCount?: number;
  messages: ChatMessage[];
  isPinned?: boolean;
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface SlashCommand {
  command: string;
  description: string;
  args?: string[];
  category: 'deployment' | 'logs' | 'routing' | 'analysis' | 'system';
}

export interface AgentContext {
  dataSources: string[];
  scope?: string;
  permissions: ('read-logs' | 'write-ci' | 'read-db' | 'write-db' | 'deploy')[];
  memory: boolean;
}
