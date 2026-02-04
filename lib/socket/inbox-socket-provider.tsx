'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getValidToken } from '@/lib/auth/get-token';
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
// PROVIDER
// ============================================================================

interface InboxSocketProviderProps {
  children: React.ReactNode;
}

export function InboxSocketProvider({ children }: InboxSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get token using centralized function
  const getToken = useCallback(() => {
    return getValidToken();
  }, []);

  // Listen for auth events to trigger reconnection
  useEffect(() => {
    const handleAuthLogin = (event: CustomEvent<{ token: string }>) => {
      console.log('[InboxSocket] auth:login detected, updating token');
      setAuthToken(event.detail.token);
    };

    const handleAuthLogout = () => {
      console.log('[InboxSocket] auth:logout detected, disconnecting');
      setAuthToken(null);
      socket?.disconnect();
    };

    // Listen for generic auth-state-change event (fired after token storage)
    const handleAuthStateChange = () => {
      console.log('[InboxSocket] auth-state-change detected, checking localStorage');
      const freshToken = localStorage.getItem('accessToken');
      console.log('[InboxSocket] Fresh token from localStorage:', freshToken ? `FOUND (${freshToken.substring(0, 8)}...)` : 'MISSING');
      if (freshToken && freshToken.length > 10) {
        setAuthToken(freshToken);
      }
    };

    window.addEventListener('auth:login', handleAuthLogin as EventListener);
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth-state-change', handleAuthStateChange);

    // Check for existing token on mount
    const existingToken = getToken();
    console.log('[InboxSocket] Initial token check:', existingToken ? `FOUND (${existingToken.substring(0, 8)}...)` : 'MISSING');
    if (existingToken) {
      setAuthToken(existingToken);
    }

    return () => {
      window.removeEventListener('auth:login', handleAuthLogin as EventListener);
      window.removeEventListener('auth:logout', handleAuthLogout);
      window.removeEventListener('auth-state-change', handleAuthStateChange);
    };
  }, [getToken, socket]);

  // Initialize socket connection
  useEffect(() => {
    // Use authToken state or fallback to getToken()
    const token = authToken || getToken();

    if (!token) {
      console.log('[InboxSocket] No token found, starting cascading retries...');
      // Cascading retries: token might not be in localStorage yet after login
      const retryDelays = [500, 1500, 3000];
      const timers: ReturnType<typeof setTimeout>[] = [];

      retryDelays.forEach((delay, i) => {
        timers.push(setTimeout(() => {
          const freshToken = getToken();
          console.log(`[InboxSocket] Retry ${i + 1}/${retryDelays.length}: token`, freshToken ? 'FOUND' : 'STILL MISSING');
          if (freshToken) {
            setAuthToken(freshToken);
          }
        }, delay));
      });

      return () => timers.forEach(t => clearTimeout(t));
    }

    console.log('[InboxSocket] Token available, initiating connection');

    setIsConnecting(true);
    setError(null);

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    console.log('[InboxSocket] Connecting to:', socketUrl);

    const newSocket = io(`${socketUrl}/inbox`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: baseReconnectDelay,
      reconnectionDelayMax: maxReconnectDelay,
      // Enable exponential backoff with jitter
      randomizationFactor: 0.25,
      timeout: 20000, // 20 second connection timeout
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('[InboxSocket] Connected:', newSocket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      reconnectAttempts.current = 0;
    });

    newSocket.on('connect_error', (err) => {
      console.error('[InboxSocket] Connection error:', err.message);
      setIsConnecting(false);
      setError(err.message);
      reconnectAttempts.current++;

      // On auth-specific errors, try refreshing the token
      const isAuthError = err.message === 'Authentication required' || err.message === 'Invalid or expired token';
      if (isAuthError) {
        console.log('[InboxSocket] Auth error detected, attempting token refresh...');
        const freshToken = getToken();
        if (freshToken && freshToken !== token) {
          console.log('[InboxSocket] Fresh token found, triggering reconnect');
          newSocket.disconnect();
          setAuthToken(freshToken);
          return; // useEffect will re-run with new authToken
        }
      }

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('[InboxSocket] Max reconnect attempts reached');
        newSocket.disconnect();
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[InboxSocket] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, don't auto-reconnect
        setError('Disconnected by server');
      }
    });

    // Auto-invalidate queries on thread updates
    newSocket.on('thread:update', (thread: ThreadUpdate) => {
      console.log('[InboxSocket] Thread update:', thread.id);
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', thread.id] });
    });

    // Auto-invalidate queries on new messages
    newSocket.on('message:new', (message: InboxMessage) => {
      console.log('[InboxSocket] New message in thread:', message.threadId);
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', message.threadId] });
      queryClient.invalidateQueries({ queryKey: ['messages', message.threadId] });
    });

    // Auto-invalidate queries on approval updates
    newSocket.on('approval:update', (approval: ApprovalUpdate) => {
      console.log('[InboxSocket] Approval update:', approval.approvalId);
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    });

    // Handle agent routing events - update store with routing feedback
    newSocket.on('agent:routed', (data: AgentRoutedEvent) => {
      console.log('[InboxSocket] Agent routed:', data.agentName, '(confidence:', data.confidence + ')');
      useInboxStore.getState().setRoutingFeedback(data.threadId, {
        agentId: data.agentId,
        agentName: data.agentName,
        confidence: data.confidence,
        reasoning: data.reasoning,
        previousAgent: data.previousAgent,
      });
      // Also refresh thread data since agent changed
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', data.threadId] });
    });

    setSocket(newSocket);

    return () => {
      console.log('[InboxSocket] Cleaning up connection');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [authToken, getToken, queryClient]);

  // Actions
  const joinThread = useCallback((threadId: string) => {
    socket?.emit('thread:join', { threadId });
  }, [socket]);

  const leaveThread = useCallback((threadId: string) => {
    socket?.emit('thread:leave', { threadId });
  }, [socket]);

  // Alias for joinThread - used for clarity in components
  const subscribeToThread = useCallback((threadId: string) => {
    socket?.emit('thread:join', { threadId });
  }, [socket]);

  // Alias for leaveThread - used for clarity in components
  const unsubscribeFromThread = useCallback((threadId: string) => {
    socket?.emit('thread:leave', { threadId });
  }, [socket]);

  const startTyping = useCallback((threadId: string, agentId: string, agentName: string) => {
    socket?.emit('typing:start', { threadId, agentId, agentName, isTyping: true });
  }, [socket]);

  const stopTyping = useCallback((threadId: string, agentId: string, agentName: string) => {
    socket?.emit('typing:stop', { threadId, agentId, agentName, isTyping: false });
  }, [socket]);

  // Event subscription helpers
  const onNewMessage = useCallback((callback: (message: InboxMessage) => void) => {
    if (!socket) return () => {};
    socket.on('message:new', callback);
    return () => socket.off('message:new', callback);
  }, [socket]);

  const onThreadUpdate = useCallback((callback: (thread: ThreadUpdate) => void) => {
    if (!socket) return () => {};
    socket.on('thread:update', callback);
    return () => socket.off('thread:update', callback);
  }, [socket]);

  const onApprovalUpdate = useCallback((callback: (approval: ApprovalUpdate) => void) => {
    if (!socket) return () => {};
    socket.on('approval:update', callback);
    return () => socket.off('approval:update', callback);
  }, [socket]);

  const onTypingStart = useCallback((callback: (indicator: TypingIndicator) => void) => {
    if (!socket) return () => {};
    socket.on('typing:start', callback);
    return () => socket.off('typing:start', callback);
  }, [socket]);

  const onTypingStop = useCallback((callback: (indicator: TypingIndicator) => void) => {
    if (!socket) return () => {};
    socket.on('typing:stop', callback);
    return () => socket.off('typing:stop', callback);
  }, [socket]);

  const onAgentRouted = useCallback((callback: (data: AgentRoutedEvent) => void) => {
    if (!socket) return () => {};
    socket.on('agent:routed', callback);
    return () => socket.off('agent:routed', callback);
  }, [socket]);

  const value: InboxSocketContextValue = {
    socket,
    isConnected,
    isConnecting,
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
  };

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
