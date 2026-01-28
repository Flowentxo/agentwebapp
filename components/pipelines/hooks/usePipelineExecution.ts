'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
  usePipelineStore,
  NodeExecutionStatus,
  NodeExecutionOutput,
} from '../store/usePipelineStore';

// ============================================
// TYPES
// ============================================

interface StepStartedEvent {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  timestamp: string;
}

interface StepCompletedEvent {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  output?: any;
  duration?: number;
  timestamp: string;
}

interface StepFailedEvent {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  error: string;
  timestamp: string;
}

interface NodeSuspendedEvent {
  nodeId: string;
  nodeName?: string;
  reason?: string;
  approvalRequestId?: string;
  timestamp: string;
}

interface NodeSkippedEvent {
  nodeId: string;
  nodeName?: string;
  reason?: string;
  timestamp: string;
}

interface WorkflowCompleteEvent {
  executionId: string;
  status: 'success' | 'error';
  duration: number;
  nodesExecuted: number;
  output?: any;
  timestamp: string;
}

interface FatalErrorEvent {
  executionId: string;
  error: string;
  nodeId?: string;
  timestamp: string;
}

// ============================================
// HOOK
// ============================================

export function usePipelineExecution() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const executionId = usePipelineStore((state) => state.executionId);
  const isRunning = usePipelineStore((state) => state.isRunning);
  const updateNodeStatus = usePipelineStore((state) => state.updateNodeStatus);
  const stopExecution = usePipelineStore((state) => state.stopExecution);

  // Get backend URL from environment or default
  const getSocketUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return baseUrl;
  }, []);

  // Handle step:started event
  const handleStepStarted = useCallback(
    (data: StepStartedEvent) => {
      console.log('[SOCKET] step:started', data);
      updateNodeStatus(data.nodeId, 'running', {
        timestamp: data.timestamp,
      });
    },
    [updateNodeStatus]
  );

  // Handle step:completed event
  const handleStepCompleted = useCallback(
    (data: StepCompletedEvent) => {
      console.log('[SOCKET] step:completed', data);
      updateNodeStatus(data.nodeId, 'success', {
        data: data.output,
        duration: data.duration,
        timestamp: data.timestamp,
      });
    },
    [updateNodeStatus]
  );

  // Handle step:failed event
  const handleStepFailed = useCallback(
    (data: StepFailedEvent) => {
      console.log('[SOCKET] step:failed', data);
      updateNodeStatus(data.nodeId, 'error', {
        error: data.error,
        timestamp: data.timestamp,
      });
      toast.error(`Node failed: ${data.nodeName || data.nodeId}`, {
        description: data.error,
      });
    },
    [updateNodeStatus]
  );

  // Handle node:suspended event (for approval nodes)
  const handleNodeSuspended = useCallback(
    (data: NodeSuspendedEvent) => {
      console.log('[SOCKET] node:suspended', data);
      updateNodeStatus(data.nodeId, 'suspended', {
        data: { approvalRequestId: data.approvalRequestId },
        timestamp: data.timestamp,
      });
      toast.info('Workflow paused for approval', {
        description: data.reason || 'Manual approval required',
        duration: 10000,
      });
    },
    [updateNodeStatus]
  );

  // Handle node:skipped event
  const handleNodeSkipped = useCallback(
    (data: NodeSkippedEvent) => {
      console.log('[SOCKET] node:skipped', data);
      updateNodeStatus(data.nodeId, 'skipped', {
        data: { reason: data.reason },
        timestamp: data.timestamp,
      });
    },
    [updateNodeStatus]
  );

  // Handle workflow:complete event
  const handleWorkflowComplete = useCallback(
    (data: WorkflowCompleteEvent) => {
      console.log('[SOCKET] workflow:complete', data);
      stopExecution();

      if (data.status === 'success') {
        toast.success('Pipeline completed successfully!', {
          description: `Executed ${data.nodesExecuted} nodes in ${data.duration}ms`,
        });
      } else {
        toast.error('Pipeline completed with errors', {
          description: `Duration: ${data.duration}ms`,
        });
      }
    },
    [stopExecution]
  );

  // Handle fatal:error event
  const handleFatalError = useCallback(
    (data: FatalErrorEvent) => {
      console.log('[SOCKET] fatal:error', data);
      stopExecution(data.error);

      if (data.nodeId) {
        updateNodeStatus(data.nodeId, 'error', {
          error: data.error,
          timestamp: data.timestamp,
        });
      }

      toast.error('Pipeline execution failed', {
        description: data.error,
        duration: 10000,
      });
    },
    [stopExecution, updateNodeStatus]
  );

  // Connect to socket when execution starts
  useEffect(() => {
    if (!executionId || !isRunning) {
      // Cleanup if execution stopped
      if (socketRef.current) {
        console.log('[SOCKET] Disconnecting - execution ended');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Already connected
    if (socketRef.current?.connected) {
      return;
    }

    const socketUrl = getSocketUrl();
    console.log('[SOCKET] Connecting to:', socketUrl, 'for execution:', executionId);

    // Create socket connection to /pipelines namespace
    const socket = io(`${socketUrl}/pipelines`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: {
        executionId,
      },
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[SOCKET] Connected to /pipelines namespace');
      reconnectAttempts.current = 0;

      // Join execution room
      socket.emit('join:execution', { executionId });
      console.log('[SOCKET] Joined execution room:', executionId);
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast.error('Lost connection to execution', {
          description: 'Please check your network connection',
        });
        stopExecution('Connection lost');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't reconnect automatically
        socket.connect();
      }
    });

    // Execution events
    socket.on('step:started', handleStepStarted);
    socket.on('step:completed', handleStepCompleted);
    socket.on('step:failed', handleStepFailed);
    socket.on('node:suspended', handleNodeSuspended);
    socket.on('node:skipped', handleNodeSkipped);
    socket.on('workflow:complete', handleWorkflowComplete);
    socket.on('fatal:error', handleFatalError);

    // Acknowledgment that we joined the room
    socket.on('joined:execution', (data: { executionId: string }) => {
      console.log('[SOCKET] Confirmed joined execution:', data.executionId);
    });

    // Cleanup function
    return () => {
      console.log('[SOCKET] Cleaning up connection');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('step:started', handleStepStarted);
      socket.off('step:completed', handleStepCompleted);
      socket.off('step:failed', handleStepFailed);
      socket.off('node:suspended', handleNodeSuspended);
      socket.off('node:skipped', handleNodeSkipped);
      socket.off('workflow:complete', handleWorkflowComplete);
      socket.off('fatal:error', handleFatalError);
      socket.off('joined:execution');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    executionId,
    isRunning,
    getSocketUrl,
    handleStepStarted,
    handleStepCompleted,
    handleStepFailed,
    handleNodeSuspended,
    handleNodeSkipped,
    handleWorkflowComplete,
    handleFatalError,
    stopExecution,
  ]);

  // Return socket connection status
  return {
    isConnected: socketRef.current?.connected ?? false,
    socket: socketRef.current,
  };
}

// ============================================
// EXPORTS
// ============================================

export default usePipelineExecution;
