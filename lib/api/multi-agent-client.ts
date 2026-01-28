/**
 * MULTI-AGENT COMMUNICATION CLIENT API
 *
 * Client-side functions for multi-agent communication
 */

import { apiClient } from './client';

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  messageType: 'request' | 'response' | 'delegate' | 'notify' | 'handoff';
  subject?: string;
  content: string;
  metadata?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    taskId?: string;
    workflowId?: string;
    context?: Record<string, any>;
  };
  status: 'pending' | 'delivered' | 'read' | 'processed' | 'failed';
  processedAt?: string;
  requiresResponse: boolean;
  responseReceived: boolean;
  createdAt: string;
  deliveredAt?: string;
}

export interface AgentDelegation {
  id: string;
  taskId: string;
  taskName: string;
  taskDescription?: string;
  delegatedBy: string;
  delegatedTo: string;
  taskData?: {
    input?: any;
    context?: Record<string, any>;
    requirements?: string[];
    deadline?: string;
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  result?: any;
  error?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MultiAgentStats {
  totalMessages: number;
  totalDelegations: number;
  activeDelegations: number;
  completedDelegations: number;
}

/**
 * Send message from one agent to another
 */
export async function sendAgentMessage(options: {
  fromAgentId: string;
  toAgentId: string;
  messageType: 'request' | 'response' | 'delegate' | 'notify' | 'handoff';
  subject?: string;
  content: string;
  metadata?: any;
  requiresResponse?: boolean;
  replyToId?: string;
}): Promise<{
  success: boolean;
  message: AgentMessage;
}> {
  const { data } = await apiClient.post('/multi-agent/messages', options);
  return data;
}

/**
 * Get messages for an agent
 */
export async function getAgentMessages(options: {
  agentId: string;
  status?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  messages: AgentMessage[];
  count: number;
}> {
  const { agentId, status, limit } = options;
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());

  const { data } = await apiClient.get(
    `/multi-agent/messages/${agentId}?${params.toString()}`
  );
  return data;
}

/**
 * Mark message as processed
 */
export async function markMessageProcessed(messageId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.put(`/multi-agent/messages/${messageId}/processed`);
  return data;
}

/**
 * Delegate task to another agent
 */
export async function delegateTask(options: {
  taskId: string;
  taskName: string;
  taskDescription?: string;
  delegatedBy: string;
  delegatedTo: string;
  taskData?: any;
}): Promise<{
  success: boolean;
  delegation: AgentDelegation;
}> {
  const { data } = await apiClient.post('/multi-agent/delegations', options);
  return data;
}

/**
 * Get delegations for an agent
 */
export async function getAgentDelegations(options: {
  agentId: string;
  direction?: 'delegated_by' | 'delegated_to';
  status?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  delegations: AgentDelegation[];
  count: number;
}> {
  const { agentId, direction, status, limit } = options;
  const params = new URLSearchParams();
  if (direction) params.append('direction', direction);
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());

  const { data } = await apiClient.get(
    `/multi-agent/delegations/${agentId}?${params.toString()}`
  );
  return data;
}

/**
 * Accept delegated task
 */
export async function acceptDelegation(delegationId: string): Promise<{
  success: boolean;
  delegation: AgentDelegation;
}> {
  const { data } = await apiClient.put(`/multi-agent/delegations/${delegationId}/accept`);
  return data;
}

/**
 * Start delegated task
 */
export async function startDelegation(delegationId: string): Promise<{
  success: boolean;
  delegation: AgentDelegation;
}> {
  const { data} = await apiClient.put(`/multi-agent/delegations/${delegationId}/start`);
  return data;
}

/**
 * Complete delegated task
 */
export async function completeDelegation(
  delegationId: string,
  result: any
): Promise<{
  success: boolean;
  delegation: AgentDelegation;
}> {
  const { data } = await apiClient.put(`/multi-agent/delegations/${delegationId}/complete`, {
    result
  });
  return data;
}

/**
 * Fail delegated task
 */
export async function failDelegation(
  delegationId: string,
  error: string
): Promise<{
  success: boolean;
  delegation: AgentDelegation;
}> {
  const { data } = await apiClient.put(`/multi-agent/delegations/${delegationId}/fail`, {
    error
  });
  return data;
}

/**
 * Get multi-agent communication statistics
 */
export async function getMultiAgentStats(): Promise<{
  success: boolean;
  stats: MultiAgentStats;
}> {
  const { data } = await apiClient.get('/multi-agent/stats');
  return data;
}

/**
 * Create SSE stream for real-time agent communications
 */
export function createAgentCommunicationStream(
  agentId: string,
  onMessage: (message: AgentMessage) => void,
  onDelegation: (delegation: AgentDelegation) => void,
  onError: (error: string) => void
): EventSource {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const eventSource = new EventSource(`${baseUrl}/v1/multi-agent/stream?agentId=${agentId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          console.log('[AgentStream] Connected:', data.agentId);
          break;

        case 'message':
          onMessage(data.message);
          break;

        case 'delegation':
          onDelegation(data.delegation);
          break;

        case 'error':
          onError(data.message);
          eventSource.close();
          break;
      }
    } catch (error) {
      console.error('[AgentStream] Parse error:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('[AgentStream] Connection error:', error);
    onError('Stream connection failed');
    eventSource.close();
  };

  return eventSource;
}
