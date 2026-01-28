/**
 * useExecutionSocket Hook
 *
 * Connects to the Socket.IO /pipelines namespace to receive real-time
 * execution updates and dispatch them to the pipeline store.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePipelineStore } from '../store/usePipelineStore';

// Socket.IO server URL - uses backend port
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// Event payload types
interface ExecutionStartPayload {
  executionId: string;
  workflowId: string;
  totalNodes: number;
  timestamp: string;
}

interface NodeStartPayload {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  timestamp: string;
}

interface NodeFinishPayload {
  executionId: string;
  workflowId: string;
  nodeId: string;
  success: boolean;
  output?: unknown;
  duration: number;
  timestamp: string;
}

interface NodeErrorPayload {
  executionId: string;
  workflowId: string;
  nodeId: string;
  error: string;
  timestamp: string;
}

interface ExecutionFinishPayload {
  executionId: string;
  workflowId: string;
  status: 'success' | 'failed' | 'partial';
  duration: number;
  nodeCount: number;
  timestamp: string;
}

export function useExecutionSocket() {
  const socketRef = useRef<Socket | null>(null);
  const currentExecutionIdRef = useRef<string | null>(null);

  // Get store actions
  const startExecution = usePipelineStore((state) => state.startExecution);
  const updateNodeStatus = usePipelineStore((state) => state.updateNodeStatus);
  const stopExecution = usePipelineStore((state) => state.stopExecution);
  const pipelineId = usePipelineStore((state) => state.pipelineId);

  // Subscribe to an execution
  const subscribe = useCallback((executionId: string) => {
    if (!socketRef.current) {
      console.warn('[ExecutionSocket] Socket not connected');
      return;
    }

    console.log('[ExecutionSocket] Subscribing to execution:', executionId);
    currentExecutionIdRef.current = executionId;
    socketRef.current.emit('subscribe', executionId);
  }, []);

  // Unsubscribe from an execution
  const unsubscribe = useCallback((executionId: string) => {
    if (!socketRef.current) return;

    console.log('[ExecutionSocket] Unsubscribing from execution:', executionId);
    socketRef.current.emit('unsubscribe', executionId);
    currentExecutionIdRef.current = null;
  }, []);

  // Initialize socket connection
  useEffect(() => {
    console.log('[ExecutionSocket] Connecting to:', SOCKET_URL);

    // Connect to /pipelines namespace
    const socket = io(`${SOCKET_URL}/pipelines`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[ExecutionSocket] Connected to /pipelines namespace');
    });

    socket.on('disconnect', (reason) => {
      console.log('[ExecutionSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[ExecutionSocket] Connection error:', error.message);
    });

    // Execution events
    socket.on('execution:start', (payload: ExecutionStartPayload) => {
      console.log('[ExecutionSocket] Execution started:', payload);
      startExecution(payload.executionId);
    });

    socket.on('node:start', (payload: NodeStartPayload) => {
      console.log('[ExecutionSocket] Node started:', payload.nodeId);
      updateNodeStatus(payload.nodeId, 'running');
    });

    socket.on('node:finish', (payload: NodeFinishPayload) => {
      console.log('[ExecutionSocket] Node finished:', payload.nodeId, payload.success);
      updateNodeStatus(
        payload.nodeId,
        payload.success ? 'success' : 'error',
        {
          data: payload.output,
          duration: payload.duration,
          timestamp: payload.timestamp,
        }
      );
    });

    socket.on('node:error', (payload: NodeErrorPayload) => {
      console.log('[ExecutionSocket] Node error:', payload.nodeId, payload.error);
      updateNodeStatus(payload.nodeId, 'error', {
        error: payload.error,
        timestamp: payload.timestamp,
      });
    });

    socket.on('execution:finish', (payload: ExecutionFinishPayload) => {
      console.log('[ExecutionSocket] Execution finished:', payload.status);
      stopExecution(payload.status === 'failed' ? 'Execution failed' : undefined);
    });

    // Cleanup on unmount
    return () => {
      console.log('[ExecutionSocket] Cleaning up...');
      if (currentExecutionIdRef.current) {
        socket.emit('unsubscribe', currentExecutionIdRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [startExecution, updateNodeStatus, stopExecution]);

  return {
    subscribe,
    unsubscribe,
    isConnected: socketRef.current?.connected ?? false,
  };
}
