/**
 * useExecutionStreamV2 Hook
 *
 * Real-time execution state streaming for Pipeline Studio V2
 * Consumes rich events from WorkflowExecutionEngineV2 including:
 * - state-update: Full ExecutionState with node outputs and variables
 * - node-start/node-complete: Individual node status updates
 * - fatal-error: Non-recoverable workflow errors
 *
 * Part of Phase 2: Frontend State Integration
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// TYPES - Matching backend ExecutionState
// ============================================================================

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'waiting_approval'
  | 'skipped'
  | 'cancelled';

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'waiting_approval' | 'suspended' | 'cancelled';

/**
 * Global state from ExecutionState.global
 */
export interface GlobalState {
  userId: string;
  userEmail?: string;
  userName?: string;
  workspaceId?: string;
  env: Record<string, string>;
  timestamp: number;
  isTest: boolean;
  [key: string]: unknown;
}

/**
 * Node output state from ExecutionState.nodes
 */
export interface NodeState {
  output: unknown;
  meta: {
    status: NodeExecutionStatus;
    startedAt?: number;
    completedAt?: number;
    durationMs?: number;
    error?: string;
    retryCount?: number;
  };
}

/**
 * Trigger state from ExecutionState.trigger
 */
export interface TriggerState {
  type: 'manual' | 'webhook' | 'scheduled' | 'api';
  payload: unknown;
  timestamp: number;
}

/**
 * Full execution state (matches backend ExecutionState)
 */
export interface ExecutionState {
  global: GlobalState;
  nodes: Record<string, NodeState>;
  variables: Record<string, unknown>;
  trigger: TriggerState;
}

/**
 * Execution log entry
 */
export interface ExecutionLogEntry {
  timestamp: string;
  nodeId: string;
  nodeName: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: unknown;
}

/**
 * Approval request data for HITL (Human-in-the-Loop)
 */
export interface ApprovalData {
  approvalId: string;
  nodeId: string;
  nodeName: string;
  title: string;
  description: string;
  contextData: Record<string, unknown>;
  expiresAt: string;
  requestedAt: string;
}

/**
 * Hook return type
 */
export interface ExecutionStreamV2Return {
  // Full execution state (from state-update events)
  executionState: ExecutionState | null;

  // Active node tracking
  activeNodeId: string | null;

  // Execution logs
  logs: ExecutionLogEntry[];

  // Overall status
  status: ExecutionStatus;

  // Progress (0-100)
  progress: number;

  // Error info
  error: string | null;
  errorCode: string | null;

  // Execution metadata
  executionId: string | null;
  workflowId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalCost: number;
  durationMs: number;

  // Connection state
  isConnected: boolean;

  // HITL (Human-in-the-Loop) state
  isSuspended: boolean;
  approvalData: ApprovalData | null;

  // Actions
  subscribe: (workflowId: string, executionId: string) => void;
  unsubscribe: () => void;
  reset: () => void;

  // Helpers
  getNodeOutput: (nodeId: string) => unknown;
  getNodeStatus: (nodeId: string) => NodeExecutionStatus;
  getVariable: (name: string) => unknown;
  isNodeRunning: (nodeId: string) => boolean;
  isExecuting: boolean;
}

// ============================================================================
// SOCKET EVENT TYPES (matching backend SocketEvent interfaces)
// ============================================================================

interface SocketStateUpdateEvent {
  type: 'state-update';
  executionId: string;
  state: ExecutionState;
  currentNodeId: string | null;
  progress: number;
  timestamp: string;
}

interface SocketWorkflowCompleteEvent {
  type: 'workflow-complete';
  executionId: string;
  workflowId: string;
  state: ExecutionState;
  totalDurationMs: number;
  totalCost: number;
  timestamp: string;
}

interface SocketFatalErrorEvent {
  type: 'fatal-error';
  executionId: string;
  workflowId: string;
  message: string;
  errorCode: string;
  timestamp: string;
}

// HITL (Human-in-the-Loop) events
interface SocketNodeSuspendedEvent {
  type: 'node-suspended';
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  approvalId: string;
  reason: string;
  expiresAt: string;
  timestamp: string;
}

interface SocketWorkflowResumedEvent {
  type: 'workflow-resumed';
  executionId: string;
  workflowId: string;
  resumedFromNodeId: string;
  approvalData: {
    approved: boolean;
    approvedBy?: string;
    respondedAt?: string;
    comment?: string;
  };
  timestamp: string;
}

// Legacy workflow update event (for backwards compatibility)
interface LegacyWorkflowUpdateEvent {
  workflowId: string;
  executionId: string;
  status: string;
  stepId?: string;
  stepName?: string;
  progress?: number;
  output?: unknown;
  error?: string;
  timestamp: string;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useExecutionStreamV2(): ExecutionStreamV2Return {
  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  const subscriptionRef = useRef<{ workflowId: string; executionId: string } | null>(null);

  // Core state
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Metadata
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // HITL (Human-in-the-Loop) state
  const [isSuspended, setIsSuspended] = useState(false);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);

  // ============================================================================
  // ADD LOG HELPER
  // ============================================================================

  const addLog = useCallback((entry: Omit<ExecutionLogEntry, 'timestamp'> & { timestamp?: string }) => {
    setLogs(prev => [...prev, {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    }]);
  }, []);

  // ============================================================================
  // SOCKET CONNECTION
  // ============================================================================

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    // Connect to /pipelines namespace
    socketRef.current = io(`${socketUrl}/pipelines`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('[EXECUTION_STREAM_V2] Connected to /pipelines namespace');
      setIsConnected(true);

      // Re-subscribe if we have an active subscription
      if (subscriptionRef.current) {
        const { workflowId, executionId } = subscriptionRef.current;
        socketRef.current?.emit('subscribe', executionId);
        socketRef.current?.emit('subscribe:pipeline', workflowId);
        console.log('[EXECUTION_STREAM_V2] Re-subscribed after reconnect');
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('[EXECUTION_STREAM_V2] Disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('[EXECUTION_STREAM_V2] Connection error:', err.message);
      setIsConnected(false);
    });

    // ========================================================================
    // V2 EVENT HANDLERS
    // ========================================================================

    // State Update (main event for V2)
    socketRef.current.on('state:update', (event: SocketStateUpdateEvent) => {
      console.log('[EXECUTION_STREAM_V2] State update:', event);

      setExecutionState(event.state);
      setActiveNodeId(event.currentNodeId);
      setProgress(event.progress);
      setExecutionId(event.executionId);
      setStatus('running');
    });

    // Node Start
    socketRef.current.on('step:started', (event: { stepId: string; stepName: string; timestamp: string }) => {
      console.log('[EXECUTION_STREAM_V2] Node started:', event.stepId);

      setActiveNodeId(event.stepId);

      addLog({
        nodeId: event.stepId,
        nodeName: event.stepName,
        level: 'info',
        message: 'Node execution started',
        timestamp: event.timestamp,
      });
    });

    // Node Complete
    socketRef.current.on('step:completed', (event: { stepId: string; stepName: string; output: unknown; durationMs: number; timestamp: string }) => {
      console.log('[EXECUTION_STREAM_V2] Node completed:', event.stepId);

      // Update node in local state if we have it
      setExecutionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [event.stepId]: {
              output: event.output,
              meta: {
                status: 'completed',
                durationMs: event.durationMs,
                completedAt: Date.now(),
              },
            },
          },
        };
      });

      addLog({
        nodeId: event.stepId,
        nodeName: event.stepName,
        level: 'success',
        message: `Completed in ${event.durationMs}ms`,
        timestamp: event.timestamp,
        data: event.output,
      });
    });

    // Node Failed
    socketRef.current.on('step:failed', (event: { stepId: string; stepName: string; error: string; isRecoverable?: boolean; timestamp: string }) => {
      console.log('[EXECUTION_STREAM_V2] Node failed:', event.stepId, event.error);

      setExecutionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [event.stepId]: {
              output: null,
              meta: {
                status: 'error',
                error: event.error,
                completedAt: Date.now(),
              },
            },
          },
        };
      });

      addLog({
        nodeId: event.stepId,
        nodeName: event.stepName,
        level: 'error',
        message: event.error,
        timestamp: event.timestamp,
      });
    });

    // Workflow Complete
    socketRef.current.on('workflow:complete', (event: SocketWorkflowCompleteEvent) => {
      console.log('[EXECUTION_STREAM_V2] Workflow completed');

      setExecutionState(event.state);
      setStatus('completed');
      setProgress(100);
      setActiveNodeId(null);
      setCompletedAt(event.timestamp);
      setTotalCost(event.totalCost);
      setDurationMs(event.totalDurationMs);

      addLog({
        nodeId: 'workflow',
        nodeName: 'Workflow',
        level: 'success',
        message: `Completed successfully in ${event.totalDurationMs}ms (cost: $${event.totalCost.toFixed(4)})`,
        timestamp: event.timestamp,
      });
    });

    // Fatal Error
    socketRef.current.on('fatal:error', (event: SocketFatalErrorEvent) => {
      console.error('[EXECUTION_STREAM_V2] Fatal error:', event);

      setStatus('error');
      setError(event.message);
      setErrorCode(event.errorCode);
      setActiveNodeId(null);
      setCompletedAt(event.timestamp);

      addLog({
        nodeId: 'workflow',
        nodeName: 'Workflow',
        level: 'error',
        message: `Fatal error: ${event.message} (${event.errorCode})`,
        timestamp: event.timestamp,
      });
    });

    // ========================================================================
    // HITL (Human-in-the-Loop) EVENT HANDLERS
    // ========================================================================

    // Node Suspended (waiting for human approval)
    socketRef.current.on('node:suspended', (event: SocketNodeSuspendedEvent) => {
      console.log('[EXECUTION_STREAM_V2] Node suspended for approval:', event);

      setStatus('suspended');
      setIsSuspended(true);
      setActiveNodeId(event.nodeId);

      // Store approval data for the UI
      setApprovalData({
        approvalId: event.approvalId,
        nodeId: event.nodeId,
        nodeName: event.nodeName,
        title: `Approval Required: ${event.nodeName}`,
        description: event.reason,
        contextData: {},
        expiresAt: event.expiresAt,
        requestedAt: event.timestamp,
      });

      addLog({
        nodeId: event.nodeId,
        nodeName: event.nodeName,
        level: 'warn',
        message: `Workflow suspended: ${event.reason}`,
        timestamp: event.timestamp,
      });
    });

    // Workflow Resumed (after approval/rejection)
    socketRef.current.on('workflow:resumed', (event: SocketWorkflowResumedEvent) => {
      console.log('[EXECUTION_STREAM_V2] Workflow resumed:', event);

      setIsSuspended(false);
      setApprovalData(null);
      setStatus('running');

      const actionText = event.approvalData.approved ? 'approved' : 'rejected';
      const approverText = event.approvalData.approvedBy ? ` by ${event.approvalData.approvedBy}` : '';

      addLog({
        nodeId: event.resumedFromNodeId,
        nodeName: 'Human Approval',
        level: event.approvalData.approved ? 'success' : 'warn',
        message: `Workflow ${actionText}${approverText}${event.approvalData.comment ? `: ${event.approvalData.comment}` : ''}`,
        timestamp: event.timestamp,
      });
    });

    // ========================================================================
    // LEGACY EVENT HANDLERS (backwards compatibility)
    // ========================================================================

    socketRef.current.on('workflow:update', (event: LegacyWorkflowUpdateEvent) => {
      console.log('[EXECUTION_STREAM_V2] Legacy workflow update:', event);

      switch (event.status) {
        case 'started':
          setStatus('running');
          setStartedAt(event.timestamp);
          setWorkflowId(event.workflowId);
          setExecutionId(event.executionId);
          break;

        case 'completed':
          setStatus('completed');
          setProgress(100);
          setCompletedAt(event.timestamp);
          break;

        case 'failed':
          setStatus('error');
          setError(event.error || 'Unknown error');
          setCompletedAt(event.timestamp);
          break;

        case 'step_started':
          if (event.stepId) {
            setActiveNodeId(event.stepId);
          }
          break;

        case 'step_completed':
          if (event.stepId) {
            setExecutionState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                nodes: {
                  ...prev.nodes,
                  [event.stepId!]: {
                    output: event.output,
                    meta: { status: 'completed', completedAt: Date.now() },
                  },
                },
              };
            });
          }
          break;

        case 'step_failed':
          if (event.stepId) {
            setExecutionState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                nodes: {
                  ...prev.nodes,
                  [event.stepId!]: {
                    output: null,
                    meta: { status: 'error', error: event.error },
                  },
                },
              };
            });
          }
          break;
      }

      if (event.progress !== undefined) {
        setProgress(event.progress);
      }
    });

  }, [addLog]);

  // ============================================================================
  // SUBSCRIBE / UNSUBSCRIBE
  // ============================================================================

  const subscribe = useCallback((wfId: string, execId: string) => {
    connectSocket();

    subscriptionRef.current = { workflowId: wfId, executionId: execId };
    setWorkflowId(wfId);
    setExecutionId(execId);
    setStatus('running');
    setStartedAt(new Date().toISOString());

    // Create initial state
    setExecutionState({
      global: {
        userId: '',
        env: {},
        timestamp: Date.now(),
        isTest: false,
      },
      nodes: {},
      variables: {},
      trigger: {
        type: 'manual',
        payload: {},
        timestamp: Date.now(),
      },
    });

    // Wait for connection then subscribe
    const attemptSubscribe = () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('subscribe', execId);
        socketRef.current.emit('subscribe:pipeline', wfId);
        console.log('[EXECUTION_STREAM_V2] Subscribed to:', { workflowId: wfId, executionId: execId });

        addLog({
          nodeId: 'workflow',
          nodeName: 'Workflow',
          level: 'info',
          message: 'Connected to execution stream',
        });
      } else {
        setTimeout(attemptSubscribe, 100);
      }
    };

    attemptSubscribe();
  }, [connectSocket, addLog]);

  const unsubscribe = useCallback(() => {
    if (socketRef.current?.connected && subscriptionRef.current) {
      socketRef.current.emit('unsubscribe', subscriptionRef.current.executionId);
      socketRef.current.emit('unsubscribe:pipeline', subscriptionRef.current.workflowId);
      console.log('[EXECUTION_STREAM_V2] Unsubscribed');
    }
    subscriptionRef.current = null;
  }, []);

  // ============================================================================
  // RESET
  // ============================================================================

  const reset = useCallback(() => {
    setExecutionState(null);
    setActiveNodeId(null);
    setLogs([]);
    setStatus('idle');
    setProgress(0);
    setError(null);
    setErrorCode(null);
    setExecutionId(null);
    setWorkflowId(null);
    setStartedAt(null);
    setCompletedAt(null);
    setTotalCost(0);
    setDurationMs(0);
    // Reset HITL state
    setIsSuspended(false);
    setApprovalData(null);
  }, []);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getNodeOutput = useCallback((nodeId: string): unknown => {
    return executionState?.nodes[nodeId]?.output;
  }, [executionState]);

  const getNodeStatus = useCallback((nodeId: string): NodeExecutionStatus => {
    return executionState?.nodes[nodeId]?.meta.status || 'pending';
  }, [executionState]);

  const getVariable = useCallback((name: string): unknown => {
    return executionState?.variables[name];
  }, [executionState]);

  const isNodeRunning = useCallback((nodeId: string): boolean => {
    return activeNodeId === nodeId;
  }, [activeNodeId]);

  const isExecuting = useMemo(() => {
    return status === 'running' || activeNodeId !== null;
  }, [status, activeNodeId]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    executionState,
    activeNodeId,
    logs,
    status,
    progress,
    error,
    errorCode,
    executionId,
    workflowId,
    startedAt,
    completedAt,
    totalCost,
    durationMs,
    isConnected,
    // HITL state
    isSuspended,
    approvalData,
    // Actions
    subscribe,
    unsubscribe,
    reset,
    // Helpers
    getNodeOutput,
    getNodeStatus,
    getVariable,
    isNodeRunning,
    isExecuting,
  };
}

export default useExecutionStreamV2;
