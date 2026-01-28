/**
 * EXECUTIONS CLIENT API
 *
 * Client-side functions for workflow execution monitoring
 */

import { apiClient } from './client';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: 'running' | 'success' | 'error';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  logs: ExecutionLog[];
  nodeResults: Record<string, any>;
  currentNodeId?: string;
}

export interface ExecutionLog {
  timestamp: number;
  nodeId: string;
  nodeName: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ExecutionStats {
  total: number;
  success: number;
  error: number;
  running: number;
  avgDuration: number;
  successRate: number;
}

export interface ExecutionListResponse {
  executions: WorkflowExecution[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExecutionDetailResponse {
  execution: WorkflowExecution;
  isLive: boolean;
}

export interface ExecutionLogsResponse {
  logs: ExecutionLog[];
  isLive: boolean;
}

/**
 * Get list of workflow executions with filtering and pagination
 */
export async function getExecutions(params: {
  workflowId?: string;
  status?: 'running' | 'success' | 'error';
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<ExecutionListResponse> {
  const queryParams = new URLSearchParams();

  if (params.workflowId) queryParams.append('workflowId', params.workflowId);
  if (params.status) queryParams.append('status', params.status);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.startDate) queryParams.append('startDate', params.startDate.toISOString());
  if (params.endDate) queryParams.append('endDate', params.endDate.toISOString());

  const { data } = await apiClient.get<ExecutionListResponse>(
    `/workflow-executions?${queryParams.toString()}`
  );

  return data;
}

/**
 * Get detailed execution information
 */
export async function getExecution(executionId: string): Promise<ExecutionDetailResponse> {
  const { data } = await apiClient.get<ExecutionDetailResponse>(
    `/workflow-executions/${executionId}`
  );
  return data;
}

/**
 * Get execution logs
 */
export async function getExecutionLogs(executionId: string): Promise<ExecutionLogsResponse> {
  const { data } = await apiClient.get<ExecutionLogsResponse>(
    `/workflow-executions/${executionId}/logs`
  );
  return data;
}

/**
 * Get execution statistics
 */
export async function getExecutionStats(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<ExecutionStats> {
  const { data } = await apiClient.get<ExecutionStats>(
    `/workflow-executions/stats/summary?timeRange=${timeRange}`
  );
  return data;
}

/**
 * Cancel a running execution
 */
export async function cancelExecution(executionId: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `/workflow-executions/${executionId}/cancel`
  );
  return data;
}

/**
 * Create EventSource for live execution streaming
 */
export function createExecutionStream(
  executionId: string,
  onUpdate: (execution: Partial<WorkflowExecution>) => void,
  onComplete: () => void,
  onError: (error: string) => void
): EventSource {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const eventSource = new EventSource(`${baseUrl}/v1/workflow-executions/${executionId}/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          console.log('[EXECUTION_STREAM] Connected:', data.executionId);
          break;

        case 'update':
          onUpdate(data.execution);
          break;

        case 'finished':
          onComplete();
          eventSource.close();
          break;

        case 'completed':
          onComplete();
          eventSource.close();
          break;

        case 'error':
          onError(data.message);
          eventSource.close();
          break;
      }
    } catch (error) {
      console.error('[EXECUTION_STREAM] Parse error:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('[EXECUTION_STREAM] Connection error:', error);
    onError('Stream connection failed');
    eventSource.close();
  };

  return eventSource;
}
