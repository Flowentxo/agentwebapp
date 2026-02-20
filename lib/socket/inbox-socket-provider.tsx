'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getValidToken, ensureValidToken } from '@/lib/auth/get-token';
import { useInboxStore } from '@/lib/stores/useInboxStore';

// ============================================================================
// TYPES
// ============================================================================

interface ThreadUpdate {
  id: string;
  subject: string;
  preview?: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
}

interface InboxMessage {
  id: string;
  threadId: string;
  role: 'user' | 'agent' | 'system';
  type: 'text' | 'approval_request' | 'system_event' | 'artifact';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: string;
  approval?: {
    approvalId: string;
    actionType: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
  };
}

interface ApprovalUpdate {
  approvalId: string;
  status: 'approved' | 'rejected' | 'expired';
  resolvedBy?: string;
  resolvedAt?: string;
  comment?: string;
}

interface TypingIndicator {
  threadId: string;
  agentId: string;
  agentName: string;
  isTyping: boolean;
}

interface AgentRoutedEvent {
  threadId: string;
  agentId: string;
  agentName: string;
  confidence: number;
  reasoning: string;
  previousAgent?: string;
}

interface InboxSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Actions
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  subscribeToThread: (threadId: string) => void;
  unsubscribeFromThread: (threadId: string) => void;
  startTyping: (threadId: string, agentId: string, agentName: string) => void;
  stopTyping: (threadId: string, agentId: string, agentName: string) => void;

  // Event listeners
  onNewMessage: (callback: (message: InboxMessage) => void) => () => void;
  onThreadUpdate: (callback: (thread: ThreadUpdate) => void) => () => void;
  onApprovalUpdate: (callback: (approval: ApprovalUpdate) => void) => () => void;
  onTypingStart: (callback: (indicator: TypingIndicator) => void) => () => void;
  onTypingStop: (callback: (indicator: TypingIndicator) => void) => () => void;
  onAgentRouted: (callback: (data: AgentRoutedEvent) => void) => () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const InboxSocketContext = createContext<InboxSocketContextValue | null>(null);

// ============================================================================
// PROVIDER - Hardened Singleton Architecture
// ============================================================================

interface InboxSocketProviderProps {
  children: React.ReactNode;
}

export function InboxSocketProvider({ children }: InboxSocketProviderProps) {
  // Socket lives in ref for lifecycle management (no re-render on create)
  // State is set ONLY on connect (one re-render) for consumers
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Mount tracking for cleanup safety (React Strict Mode)
  const isMountedRef = useRef(true);

  // Stable ref for queryClient to avoid dependency churn
  const queryClientRef = useRef(useQueryClient());
  queryClientRef.current = useQueryClient();

  // ========================================================================
  // Mount tracking
  // ========================================================================
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ========================================================================
  // Auth event listeners
  // ========================================================================
  useEffect(() => {
    const handleAuthLogin = (event: CustomEvent<{ token: string }>) => {
      console.log('[InboxSocket] auth:login detected, updating token');
      setAuthToken(event.detail.token);
    };

    const handleAuthLogout = () => {
      console.log('[InboxSocket] auth:logout detected, disconnecting');
      setAuthToken(null);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };

    const handleAuthStateChange = () => {
      const freshToken = localStorage.getItem('accessToken');
      if (freshToken && freshToken !== 'undefined' && freshToken.length > 10) {
        setAuthToken(freshToken);
      }
    };

    window.addEventListener('auth:login', handleAuthLogin as EventListener);
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth-state-change', handleAuthStateChange);

    // Check for existing token on mount
    const existingToken = getValidToken();
    if (existingToken) {
      setAuthToken(existingToken);
    }

    return () => {
      window.removeEventListener('auth:login', handleAuthLogin as EventListener);
      window.removeEventListener('auth:logout', handleAuthLogout);
      window.removeEventListener('auth-state-change', handleAuthStateChange);
    };
  }, []);

  // ========================================================================
  // Main connection effect - Singleton pattern
  // ========================================================================
  useEffect(() => {
    const token = authToken || getValidToken();

    if (!token) {
      // Cascading retries: token might not be in localStorage yet after login
      const retryDelays = [500, 1500, 3000];
      const timers: ReturnType<typeof setTimeout>[] = [];

      retryDelays.forEach((delay, i) => {
        timers.push(setTimeout(() => {
          const freshToken = getValidToken();
          if (freshToken) {
            setAuthToken(freshToken);
          }
        }, delay));
      });

      return () => timers.forEach(t => clearTimeout(t));
    }

    // SINGLETON: Don't recreate if socket exists, isn't disconnected, and token hasn't changed
    if (socketRef.current && !socketRef.current.disconnected) {
      const currentSocketToken = (socketRef.current as any).auth?.token;
      if (currentSocketToken === token) {
        return;
      }
      // Token changed - disconnect old socket to reconnect with new token
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clean up any stale socket before creating new one
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    console.log('[InboxSocket] Connecting to:', socketUrl);

    const newSocket = io(`${socketUrl}/inbox`, {
      auth: { token },
      query: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      autoConnect: false,
    });

    // Wire ALL handlers BEFORE calling .connect()

    newSocket.on('connect', () => {
      console.log('[InboxSocket] Connected:', newSocket.id);
      if (!isMountedRef.current) return;
      setSocket(newSocket);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('connect_error', async (err) => {
      console.error('[InboxSocket] Connection error:', err.message);
      const isAuthError = err.message.includes('Authentication') || err.message.includes('token');

      if (isAuthError) {
        // Auth error - try to refresh the token before giving up
        console.log('[InboxSocket] Auth error, attempting token refresh...');
        newSocket.disconnect();
        socketRef.current = null;

        const refreshedToken = await ensureValidToken();
        if (refreshedToken && isMountedRef.current) {
          console.log('[InboxSocket] Token refreshed, reconnecting...');
          setAuthToken(refreshedToken);
          return;
        }

        // Refresh failed - stop permanently
        console.error('[InboxSocket] Token refresh failed. Stopping.');
        if (isMountedRef.current) {
          setSocket(null);
          setIsConnected(false);
          setError(err.message);
        }
        return;
      }
      // Network errors: socket.io handles reconnection (up to 5 attempts)
      if (isMountedRef.current) {
        setError(err.message);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[InboxSocket] Disconnected:', reason);
      if (!isMountedRef.current) return;
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setError('Disconnected by server');
      }
    });

    // Auto-invalidate queries on thread updates
    newSocket.on('thread:update', (thread: ThreadUpdate) => {
      queryClientRef.current.invalidateQueries({ queryKey: ['threads'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['thread', thread.id] });
    });

    // Auto-invalidate queries on new messages
    newSocket.on('message:new', (message: InboxMessage) => {
      queryClientRef.current.invalidateQueries({ queryKey: ['threads'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['thread', message.threadId] });
      queryClientRef.current.invalidateQueries({ queryKey: ['messages', message.threadId] });
    });

    // Auto-invalidate queries on approval updates
    newSocket.on('approval:update', () => {
      queryClientRef.current.invalidateQueries({ queryKey: ['threads'] });
    });

    // Handle agent routing events
    newSocket.on('agent:routed', (data: AgentRoutedEvent) => {
      console.log('[InboxSocket] Agent routed:', data.agentName, '(confidence:', data.confidence + ')');
      useInboxStore.getState().setRoutingFeedback(data.threadId, {
        agentId: data.agentId,
        agentName: data.agentName,
        confidence: data.confidence,
        reasoning: data.reasoning,
        previousAgent: data.previousAgent,
      });
      queryClientRef.current.invalidateQueries({ queryKey: ['threads'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['thread', data.threadId] });
    });

    // Store ref BEFORE connecting
    socketRef.current = newSocket;

    // Manual connect - handlers are already wired
    newSocket.connect();

    return () => {
      // Delayed cleanup: survive React Strict Mode double-mount
      const socketToClean = newSocket;
      setTimeout(() => {
        // Only disconnect if component truly unmounted AND this is still our socket
        if (!isMountedRef.current && socketRef.current === socketToClean) {
          console.log('[InboxSocket] Unmount cleanup executing');
          socketToClean.removeAllListeners();
          socketToClean.disconnect();
          socketRef.current = null;
        }
      }, 200);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // ========================================================================
  // Actions - use socketRef directly (stable, no re-render deps)
  // ========================================================================

  const joinThread = useCallback((threadId: string) => {
    socketRef.current?.emit('thread:join', { threadId });
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    socketRef.current?.emit('thread:leave', { threadId });
  }, []);

  const subscribeToThread = useCallback((threadId: string) => {
    socketRef.current?.emit('thread:join', { threadId });
  }, []);

  const unsubscribeFromThread = useCallback((threadId: string) => {
    socketRef.current?.emit('thread:leave', { threadId });
  }, []);

  const startTyping = useCallback((threadId: string, agentId: string, agentName: string) => {
    socketRef.current?.emit('typing:start', { threadId, agentId, agentName, isTyping: true });
  }, []);

  const stopTyping = useCallback((threadId: string, agentId: string, agentName: string) => {
    socketRef.current?.emit('typing:stop', { threadId, agentId, agentName, isTyping: false });
  }, []);

  // ========================================================================
  // Event subscription helpers - re-bind only when connection state changes
  // ========================================================================

  const onNewMessage = useCallback((callback: (message: InboxMessage) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('message:new', callback);
    return () => { s.off('message:new', callback); };
  }, [isConnected]);

  const onThreadUpdate = useCallback((callback: (thread: ThreadUpdate) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('thread:update', callback);
    return () => { s.off('thread:update', callback); };
  }, [isConnected]);

  const onApprovalUpdate = useCallback((callback: (approval: ApprovalUpdate) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('approval:update', callback);
    return () => { s.off('approval:update', callback); };
  }, [isConnected]);

  const onTypingStart = useCallback((callback: (indicator: TypingIndicator) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('typing:start', callback);
    return () => { s.off('typing:start', callback); };
  }, [isConnected]);

  const onTypingStop = useCallback((callback: (indicator: TypingIndicator) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('typing:stop', callback);
    return () => { s.off('typing:stop', callback); };
  }, [isConnected]);

  const onAgentRouted = useCallback((callback: (data: AgentRoutedEvent) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('agent:routed', callback);
    return () => { s.off('agent:routed', callback); };
  }, [isConnected]);

  // ========================================================================
  // Context value - memoized, updates only on connection state change
  // ========================================================================

  const value: InboxSocketContextValue = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    isConnecting: !isConnected && !!authToken,
    error,
    joinThread,
    leaveThread,
    subscribeToThread,
    unsubscribeFromThread,
    startTyping,
    stopTyping,
    onNewMessage,
    onThreadUpdate,
    onApprovalUpdate,
    onTypingStart,
    onTypingStop,
    onAgentRouted,
  }), [
    isConnected, authToken, error,
    joinThread, leaveThread, subscribeToThread, unsubscribeFromThread,
    startTyping, stopTyping,
    onNewMessage, onThreadUpdate, onApprovalUpdate,
    onTypingStart, onTypingStop, onAgentRouted,
  ]);

  return (
    <InboxSocketContext.Provider value={value}>
      {children}
    </InboxSocketContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useInboxSocket() {
  const context = useContext(InboxSocketContext);
  if (!context) {
    throw new Error('useInboxSocket must be used within an InboxSocketProvider');
  }
  return context;
}

// ============================================================================
// OPTIONAL: Hook for individual thread subscription
// ============================================================================

export function useThreadSocket(threadId: string | null) {
  const { socket, joinThread, leaveThread, onNewMessage, onTypingStart, onTypingStop } = useInboxSocket();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [typingAgents, setTypingAgents] = useState<Map<string, TypingIndicator>>(new Map());

  useEffect(() => {
    if (!threadId || !socket) return;

    // Join thread room
    joinThread(threadId);

    // Listen for new messages
    const unsubMessage = onNewMessage((message) => {
      if (message.threadId === threadId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for typing
    const unsubTypingStart = onTypingStart((indicator) => {
      if (indicator.threadId === threadId) {
        setTypingAgents((prev) => new Map(prev).set(indicator.agentId, indicator));
      }
    });

    const unsubTypingStop = onTypingStop((indicator) => {
      if (indicator.threadId === threadId) {
        setTypingAgents((prev) => {
          const next = new Map(prev);
          next.delete(indicator.agentId);
          return next;
        });
      }
    });

    return () => {
      leaveThread(threadId);
      unsubMessage();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [threadId, socket, joinThread, leaveThread, onNewMessage, onTypingStart, onTypingStop]);

  return {
    messages,
    typingAgents: Array.from(typingAgents.values()),
    clearMessages: () => setMessages([]),
  };
}
