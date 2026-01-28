/**
 * useExecutionStream Hook
 *
 * Real-time execution status streaming for Pipeline Studio
 * Listens to Socket.IO events and provides node status updates
 *
 * Part of Phase 5: Live Visualization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================
// TYPES
// ============================================

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'waiting_approval'
  | 'skipped';

export interface NodeStatusData {
  status: NodeExecutionStatus;
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  // Single node execution metrics (Phase 19)
  tokensUsed?: { prompt: number; completion: number; total: number };
  cost?: number;
  model?: string;
}

export interface ExecutionState {
  executionId: string | null;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  progress: number;
  currentStep: number;
  totalSteps: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ExecutionStreamReturn {
  // Node statuses
  nodeStatuses: Record<string, NodeStatusData>;

  // Execution state
  execution: ExecutionState;

  // Connection state
  isConnected: boolean;

  // Actions
  subscribe: (pipelineId: string, executionId?: string) => void;
  unsubscribe: () => void;
  reset: () => void;

  // Get specific node status
  getNodeStatus: (nodeId: string) => NodeStatusData;

  // Check if any node is running
  isExecuting: boolean;
}

// ============================================
// SOCKET EVENT INTERFACES
// ============================================

interface WorkflowUpdateEvent {
  workflowId: string;
  executionId: string;
  status: 'started' | 'step_started' | 'step_completed' | 'step_failed' | 'completed' | 'failed';
  stepId?: string;
  stepName?: string;
  progress?: number;
  output?: unknown;
  error?: string;
  timestamp: string;
}

interface ExecutionUpdateEvent {
  executionId: string;
  status: string;
  currentStep?: number;
  totalSteps?: number;
  stepId?: string;
  stepName?: string;
  output?: unknown;
  error?: string;
  timestamp: string;
}

// Single node execution event (Phase 19)
interface SingleNodeExecutionEvent {
  workflowId: string;
  nodeId: string;
  status: 'running' | 'success' | 'error';
  output?: unknown;
  error?: string | null;
  duration?: number;
  tokensUsed?: { prompt: number; completion: number; total: number };
  cost?: number;
  model?: string;
  timestamp: string;
}

// ============================================
// HOOK
// ============================================

export function useExecutionStream(): ExecutionStreamReturn {
  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  const pipelineIdRef = useRef<string | null>(null);

  // Node statuses
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatusData>>({});

  // Execution state
  const [execution, setExecution] = useState<ExecutionState>({
    executionId: null,
    status: 'idle',
    progress: 0,
    currentStep: 0,
    totalSteps: 0,
  });

  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // ============================================
  // SOCKET CONNECTION
  // ============================================

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    // Connect to /pipelines namespace
    socketRef.current = io(`${socketUrl}/pipelines`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('[EXECUTION_STREAM] Connected to /pipelines namespace');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('[EXECUTION_STREAM] Disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[EXECUTION_STREAM] Connection error:', error);
      setIsConnected(false);
    });

    // ============================================
    // EXECUTION UPDATE HANDLER
    // ============================================

    socketRef.current.on('execution:update', (event: ExecutionUpdateEvent) => {
      console.log('[EXECUTION_STREAM] Received update:', event);

      // Update execution state
      setExecution(prev => ({
        ...prev,
        executionId: event.executionId,
        currentStep: event.currentStep ?? prev.currentStep,
        totalSteps: event.totalSteps ?? prev.totalSteps,
        progress: event.totalSteps
          ? Math.round(((event.currentStep ?? 0) / event.totalSteps) * 100)
          : prev.progress,
        status: mapEventStatus(event.status),
        error: event.error,
        completedAt: ['completed', 'failed'].includes(event.status)
          ? event.timestamp
          : prev.completedAt,
      }));

      // Update node status if stepId provided
      if (event.stepId) {
        setNodeStatuses(prev => ({
          ...prev,
          [event.stepId!]: {
            status: mapNodeStatus(event.status),
            output: event.output,
            error: event.error,
            completedAt: ['step_completed', 'step_failed'].some(s => event.status.includes(s))
              ? event.timestamp
              : prev[event.stepId!]?.completedAt,
          },
        }));
      }
    });

    // ============================================
    // WORKFLOW UPDATE HANDLER (alternative event)
    // ============================================

    socketRef.current.on('workflow:update', (event: WorkflowUpdateEvent) => {
      console.log('[EXECUTION_STREAM] Workflow update:', event);

      // Map to execution update
      setExecution(prev => ({
        ...prev,
        executionId: event.executionId,
        status: mapEventStatus(event.status),
        progress: event.progress ?? prev.progress,
        error: event.error,
        startedAt: event.status === 'started' ? event.timestamp : prev.startedAt,
        completedAt: ['completed', 'failed'].includes(event.status)
          ? event.timestamp
          : prev.completedAt,
      }));

      // Update node status
      if (event.stepId) {
        setNodeStatuses(prev => {
          const nodeStatus = mapNodeStatus(event.status);
          return {
            ...prev,
            [event.stepId!]: {
              status: nodeStatus,
              output: event.output,
              error: event.error,
              startedAt: event.status === 'step_started'
                ? event.timestamp
                : prev[event.stepId!]?.startedAt,
              completedAt: ['step_completed', 'step_failed'].includes(event.status)
                ? event.timestamp
                : prev[event.stepId!]?.completedAt,
            },
          };
        });
      }
    });

    // ============================================
    // STEP-SPECIFIC EVENTS
    // ============================================

    socketRef.current.on('step:started', (data: { stepId: string; timestamp: string }) => {
      setNodeStatuses(prev => ({
        ...prev,
        [data.stepId]: {
          ...prev[data.stepId],
          status: 'running',
          startedAt: data.timestamp,
        },
      }));
    });

    socketRef.current.on('step:completed', (data: { stepId: string; output: unknown; timestamp: string }) => {
      setNodeStatuses(prev => ({
        ...prev,
        [data.stepId]: {
          ...prev[data.stepId],
          status: 'completed',
          output: data.output,
          completedAt: data.timestamp,
          duration: prev[data.stepId]?.startedAt
            ? new Date(data.timestamp).getTime() - new Date(prev[data.stepId].startedAt!).getTime()
            : undefined,
        },
      }));
    });

    socketRef.current.on('step:failed', (data: { stepId: string; error: string; timestamp: string }) => {
      setNodeStatuses(prev => ({
        ...prev,
        [data.stepId]: {
          ...prev[data.stepId],
          status: 'error',
          error: data.error,
          completedAt: data.timestamp,
        },
      }));
    });

    socketRef.current.on('step:waiting_approval', (data: { stepId: string; timestamp: string }) => {
      setNodeStatuses(prev => ({
        ...prev,
        [data.stepId]: {
          ...prev[data.stepId],
          status: 'waiting_approval',
        },
      }));

      setExecution(prev => ({
        ...prev,
        status: 'waiting_approval',
      }));
    });

    // ============================================
    // SINGLE NODE EXECUTION EVENT (Phase 19)
    // ============================================

    socketRef.current.on('node:single-execution', (event: SingleNodeExecutionEvent) => {
      console.log('[EXECUTION_STREAM] Single node execution:', event);

      // Map 'success' to 'completed' for node status
      const nodeStatus: NodeExecutionStatus =
        event.status === 'success' ? 'completed' :
        event.status === 'error' ? 'error' :
        'running';

      setNodeStatuses(prev => ({
        ...prev,
        [event.nodeId]: {
          ...prev[event.nodeId],
          status: nodeStatus,
          output: event.output,
          error: event.error ?? undefined,
          duration: event.duration,
          tokensUsed: event.tokensUsed,
          cost: event.cost,
          model: event.model,
          completedAt: ['success', 'error'].includes(event.status)
            ? event.timestamp
            : prev[event.nodeId]?.completedAt,
        },
      }));
    });

  }, []);

  // ============================================
  // SUBSCRIBE / UNSUBSCRIBE
  // ============================================

  const subscribe = useCallback((pipelineId: string, executionId?: string) => {
    connectSocket();
    pipelineIdRef.current = pipelineId;

    // Wait for connection, then subscribe
    const attemptSubscribe = () => {
      if (socketRef.current?.connected) {
        if (executionId) {
          socketRef.current.emit('subscribe', executionId);
          setExecution(prev => ({
            ...prev,
            executionId,
            status: 'running',
            startedAt: new Date().toISOString(),
          }));
        }
        socketRef.current.emit('subscribe:pipeline', pipelineId);
        console.log('[EXECUTION_STREAM] Subscribed to pipeline:', pipelineId, 'execution:', executionId);
      } else {
        setTimeout(attemptSubscribe, 100);
      }
    };

    attemptSubscribe();
  }, [connectSocket]);

  const unsubscribe = useCallback(() => {
    if (socketRef.current?.connected) {
      if (pipelineIdRef.current) {
        socketRef.current.emit('unsubscribe', execution.executionId);
      }
    }
    pipelineIdRef.current = null;
  }, [execution.executionId]);

  // ============================================
  // RESET
  // ============================================

  const reset = useCallback(() => {
    setNodeStatuses({});
    setExecution({
      executionId: null,
      status: 'idle',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
    });
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  const getNodeStatus = useCallback((nodeId: string): NodeStatusData => {
    return nodeStatuses[nodeId] || { status: 'pending' };
  }, [nodeStatuses]);

  const isExecuting = Object.values(nodeStatuses).some(
    status => status.status === 'running'
  ) || execution.status === 'running';

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    nodeStatuses,
    execution,
    isConnected,
    subscribe,
    unsubscribe,
    reset,
    getNodeStatus,
    isExecuting,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapEventStatus(status: string): ExecutionState['status'] {
  switch (status) {
    case 'started':
    case 'step_started':
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'error':
    case 'step_failed':
      return 'failed';
    case 'waiting_approval':
      return 'waiting_approval';
    default:
      return 'idle';
  }
}

function mapNodeStatus(status: string): NodeExecutionStatus {
  switch (status) {
    case 'step_started':
    case 'running':
      return 'running';
    case 'step_completed':
    case 'completed':
      return 'completed';
    case 'step_failed':
    case 'failed':
    case 'error':
      return 'error';
    case 'waiting_approval':
      return 'waiting_approval';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

export default useExecutionStream;
