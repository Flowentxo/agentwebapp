/**
 * Flowent Inbox v2 - React Query Hooks with Socket.IO Integration
 * Provides data fetching, caching, and real-time updates for the inbox
 *
 * Phase 1 Fixes:
 * - Typing Indicator: useState with safety timeout (5s auto-clear)
 * - Streaming Race Condition: Upsert logic for message:stream
 * - Error Handling: Standardized with toast notifications and rollback
 */

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useInboxSocket as useSocketContext } from '@/lib/socket';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import {
  getThreads,
  getThread,
  getThreadMessages,
  getThreadsPaginated,
  getThreadMessagesPaginated,
  sendMessage,
  markThreadAsRead,
  markThreadAsUnread,
  archiveThread,
  unarchiveThread,
  deleteThread,
  createThread,
  getArtifacts,
  getArtifactContent,
  updateArtifact,
  approveWorkflow,
  rejectWorkflow,
  type ThreadsPageResponse,
  type MessagesPageResponse,
} from '@/lib/api/inbox-service';
import type {
  Thread,
  InboxMessage,
  ChatMessage,
  Artifact,
  ArtifactSummary,
  TypingIndicator,
  transformThreadToView,
  transformMessageToChat,
} from '@/types/inbox';

// =====================================================
// QUERY KEYS
// =====================================================

export const inboxKeys = {
  all: ['inbox'] as const,
  threads: () => [...inboxKeys.all, 'threads'] as const,
  threadsInfinite: (filters?: { status?: string; search?: string; agentId?: string }) =>
    [...inboxKeys.all, 'threads', 'infinite', filters] as const,
  thread: (id: string) => [...inboxKeys.threads(), id] as const,
  messages: (threadId: string) => [...inboxKeys.thread(threadId), 'messages'] as const,
  messagesInfinite: (threadId: string) => [...inboxKeys.thread(threadId), 'messages', 'infinite'] as const,
  artifacts: (threadId: string) => [...inboxKeys.thread(threadId), 'artifacts'] as const,
  artifact: (id: string) => [...inboxKeys.all, 'artifact', id] as const,
};

// =====================================================
// THREADS HOOK
// =====================================================

export interface UseThreadsOptions {
  status?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching and managing threads
 */
export function useThreads(options?: UseThreadsOptions) {
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();

  const query = useQuery({
    queryKey: inboxKeys.threads(),
    queryFn: () => getThreads({ status: options?.status }),
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Listen for thread updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleThreadUpdate = (updatedThread: Partial<Thread> & { id: string }) => {
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((thread) =>
          thread.id === updatedThread.id ? { ...thread, ...updatedThread } : thread
        );
      });
    };

    socket.on('thread:update', handleThreadUpdate);

    return () => {
      socket.off('thread:update', handleThreadUpdate);
    };
  }, [queryClient, socket]);

  return query;
}

// =====================================================
// THREADS INFINITE HOOK (Phase 2 - Pagination, Phase 3 - Search)
// =====================================================

export interface UseThreadsInfiniteOptions {
  status?: string;
  search?: string;
  agentId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching threads with infinite scroll pagination and server-side search
 * Uses cursor-based pagination with timestamps
 *
 * Phase 3: Added search parameter for server-side filtering
 * Phase 4: Added agentId parameter for agent filtering
 * - When search/agentId changes, query key changes, triggering a fresh fetch from page 1
 * - Filters are passed to the backend API
 *
 * @returns Query result with infinite scroll helpers:
 *   - data.pages: Array of thread pages
 *   - threads: Flattened array of all threads
 *   - fetchNextPage: Function to load next page
 *   - hasNextPage: Boolean indicating if more pages exist
 *   - isFetchingNextPage: Boolean for loading state
 *   - isSearching: Boolean indicating if a search query is active
 *   - isFilteringByAgent: Boolean indicating if filtering by agent
 */
export function useThreadsInfinite(options?: UseThreadsInfiniteOptions) {
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const limit = options?.limit || 20;

  // Normalize empty search to undefined for consistent query key
  const normalizedSearch = options?.search?.trim() || undefined;
  const normalizedAgentId = options?.agentId || undefined;

  // Build filters object for query key (ensures re-fetch when filters change)
  const filters = {
    status: options?.status,
    search: normalizedSearch,
    agentId: normalizedAgentId,
  };

  const query = useInfiniteQuery({
    queryKey: inboxKeys.threadsInfinite(filters),
    queryFn: async ({ pageParam }) => {
      console.log('[useThreadsInfinite] Fetching threads...', { pageParam, filters });
      const response = await getThreadsPaginated({
        cursor: pageParam as string | undefined,
        limit,
        status: options?.status,
        search: normalizedSearch,
        agentId: normalizedAgentId,
      });
      console.log('[useThreadsInfinite] Response:', { count: response.threads.length, hasMore: response.hasMore });
      return response;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ThreadsPageResponse) => {
      // Return the cursor for the next page, or undefined if no more pages
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    enabled: options?.enabled !== false,
    staleTime: normalizedSearch ? 10000 : 60000, // Longer stale time to reduce refetches
    // =====================================================
    // CRITICAL: Disable ALL automatic refetching to stop 401 loops
    // The user must manually refresh or navigate to trigger new fetches
    // =====================================================
    refetchOnWindowFocus: false, // DISABLED: Prevents refetch spam when clicking console
    refetchOnMount: false, // DISABLED: Prevents refetch when component remounts
    refetchOnReconnect: false, // DISABLED: Prevents refetch on network reconnect
    // Prevent infinite retry loop on auth errors (401/403)
    retry: (failureCount, error) => {
      // Check if it's an axios error with response status
      const axiosError = error as { response?: { status?: number } };
      const status = axiosError?.response?.status;

      // Don't retry on auth errors - fail immediately
      if (status === 401 || status === 403) {
        console.log('[useThreadsInfinite] Auth error (401/403), stopping all retries');
        return false;
      }

      // For network errors, retry once only
      return failureCount < 1;
    },
  });

  // Flatten all pages into a single array of threads for easy access
  const allThreads = query.data?.pages.flatMap((page) => page.threads) || [];

  // Log errors when they occur
  if (query.isError && query.error) {
    console.error('[useThreadsInfinite] Query Error:', {
      message: query.error.message,
      error: query.error,
    });
  }

  // Listen for thread updates via socket (only when not searching to avoid stale updates)
  useEffect(() => {
    if (!socket) return;
    // Don't update cache from socket events when searching
    // as the results are filtered server-side
    if (normalizedSearch) return;

    const handleThreadUpdate = (updatedThread: Partial<Thread> & { id: string }) => {
      queryClient.setQueryData(
        inboxKeys.threadsInfinite(filters),
        (oldData: { pages: ThreadsPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              threads: page.threads.map((thread) =>
                thread.id === updatedThread.id ? { ...thread, ...updatedThread } : thread
              ),
            })),
          };
        }
      );
    };

    // Handle new thread - prepend to first page
    const handleNewThread = (newThread: Thread) => {
      queryClient.setQueryData(
        inboxKeys.threadsInfinite(filters),
        (oldData: { pages: ThreadsPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData || oldData.pages.length === 0) return oldData;

          // Check if thread already exists
          const exists = oldData.pages.some((page) =>
            page.threads.some((t) => t.id === newThread.id)
          );
          if (exists) return oldData;

          // Prepend to first page
          const firstPage = oldData.pages[0];
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                threads: [newThread, ...firstPage.threads],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      );
    };

    socket.on('thread:update', handleThreadUpdate);
    socket.on('thread:new', handleNewThread);

    return () => {
      socket.off('thread:update', handleThreadUpdate);
      socket.off('thread:new', handleNewThread);
    };
  }, [queryClient, socket, filters, normalizedSearch]);

  return {
    ...query,
    threads: allThreads,
    // Expose helpers explicitly for clarity
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    // Search state helpers
    isSearching: !!normalizedSearch,
    searchQuery: normalizedSearch,
    // Agent filter helpers
    isFilteringByAgent: !!normalizedAgentId,
    activeAgentId: normalizedAgentId,
  };
}

// =====================================================
// THREAD MESSAGES HOOK
// =====================================================

export interface UseThreadMessagesOptions {
  enabled?: boolean;
  onNewMessage?: (message: InboxMessage) => void;
}

/**
 * Hook for fetching thread messages with real-time updates
 */
export function useThreadMessages(threadId: string | null, options?: UseThreadMessagesOptions) {
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const typingIndicatorRef = useRef<TypingIndicator | null>(null);

  const query = useQuery({
    queryKey: inboxKeys.messages(threadId || ''),
    queryFn: () => (threadId ? getThreadMessages(threadId) : Promise.resolve([])),
    enabled: !!threadId && options?.enabled !== false,
    staleTime: 10000, // 10 seconds
  });

  // Join/leave thread room
  useEffect(() => {
    if (!threadId || !socket) return;

    socket.emit('thread:join', { threadId });
    console.log('[INBOX_SOCKET] Joined thread:', threadId);

    return () => {
      socket.emit('thread:leave', { threadId });
      console.log('[INBOX_SOCKET] Left thread:', threadId);
    };
  }, [threadId, socket]);

  // Listen for real-time message events
  useEffect(() => {
    if (!threadId || !socket) return;

    // New message arrived - FIXED: Merge with placeholder if streaming started first
    const handleNewMessage = (message: InboxMessage) => {
      if (message.threadId !== threadId) return;

      // Clear processing stage when a new message arrives
      useInboxStore.getState().clearProcessingStage(threadId);

      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (oldData) => {
        if (!oldData) return [message];

        const existingIndex = oldData.findIndex((m) => m.id === message.id);

        if (existingIndex !== -1) {
          // Message already exists (placeholder from streaming) - merge data
          // Keep the accumulated content from streaming, but update other fields
          const existing = oldData[existingIndex];
          const mergedMessage: InboxMessage = {
            ...message,
            // If streaming content is longer, keep it (handles race condition)
            content: existing.content.length > message.content.length
              ? existing.content
              : message.content,
            // Preserve streaming state
            isStreaming: existing.isStreaming,
          };

          return oldData.map((msg, idx) =>
            idx === existingIndex ? mergedMessage : msg
          );
        }

        // New message - add to list
        return [...oldData, message];
      });

      options?.onNewMessage?.(message);
    };

    // Message streaming (partial content) - FIXED: Upsert logic for race condition
    const handleMessageStream = (data: { messageId: string; content: string; agentId?: string; agentName?: string }) => {
      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (oldData) => {
        const messages = oldData || [];
        const existingIndex = messages.findIndex((msg) => msg.id === data.messageId);

        if (existingIndex !== -1) {
          // Message exists - append content
          return messages.map((msg, idx) =>
            idx === existingIndex
              ? { ...msg, content: msg.content + data.content, isStreaming: true }
              : msg
          );
        } else {
          // Message doesn't exist - create placeholder (race condition fix)
          // This handles the case where message:stream arrives before message:new
          console.log(`[INBOX_SOCKET] Creating placeholder for streaming message: ${data.messageId}`);
          const placeholderMessage: InboxMessage = {
            id: data.messageId,
            threadId,
            role: 'agent',
            type: 'text',
            content: data.content,
            agentId: data.agentId,
            agentName: data.agentName,
            isStreaming: true,
            isOptimistic: false,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          return [...messages, placeholderMessage];
        }
      });
    };

    // Message streaming complete - FIXED: Handle case where message might not exist
    const handleMessageComplete = (data: string | { messageId: string }) => {
      const messageId = typeof data === 'string' ? data : data.messageId;

      // Clear processing stage on stream completion
      useInboxStore.getState().clearProcessingStage(threadId);

      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (oldData) => {
        if (!oldData) return oldData;

        const messageExists = oldData.some((msg) => msg.id === messageId);
        if (!messageExists) {
          console.warn(`[INBOX_SOCKET] message:complete received for unknown message: ${messageId}`);
          return oldData;
        }

        return oldData.map((msg) =>
          msg.id === messageId ? { ...msg, isStreaming: false } : msg
        );
      });
    };

    // Approval status updated
    const handleApprovalUpdate = (data: {
      approvalId: string;
      status: 'approved' | 'rejected' | 'expired';
      resolvedBy?: string;
      resolvedAt?: string;
    }) => {
      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((msg) =>
          msg.approval?.approvalId === data.approvalId
            ? {
                ...msg,
                approval: {
                  ...msg.approval,
                  status: data.status,
                  resolvedBy: data.resolvedBy,
                  resolvedAt: data.resolvedAt,
                },
              }
            : msg
        );
      });

      // Invalidate threads to update status
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
    };

    // Artifact created
    const handleArtifactCreated = (data: { id: string; type: string; title: string }) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.artifacts(threadId) });
    };

    // System event
    const handleSystemEvent = (event: {
      id: string;
      type: string;
      content: string;
      metadata?: Record<string, unknown>;
      timestamp: string;
    }) => {
      // Processing stage events are transient UI indicators, not persisted messages
      if (event.metadata?.eventType === 'processing_stage') {
        useInboxStore.getState().setProcessingStage(threadId, {
          stage: event.metadata.stage as string,
          agentName: event.metadata.agentName as string,
          label: event.content,
        });
        return;
      }

      const systemMessage: InboxMessage = {
        id: event.id,
        threadId,
        role: 'system',
        type: 'system_event',
        content: event.content,
        metadata: event.metadata,
        isStreaming: false,
        isOptimistic: false,
        timestamp: event.timestamp,
        createdAt: event.timestamp,
      };

      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (oldData) => {
        if (!oldData) return [systemMessage];
        if (oldData.some((m) => m.id === event.id)) return oldData;
        return [...oldData, systemMessage];
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:stream', handleMessageStream);
    socket.on('message:complete', handleMessageComplete);
    socket.on('approval:update', handleApprovalUpdate);
    socket.on('artifact:created', handleArtifactCreated);
    socket.on('system:event', handleSystemEvent);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:stream', handleMessageStream);
      socket.off('message:complete', handleMessageComplete);
      socket.off('approval:update', handleApprovalUpdate);
      socket.off('artifact:created', handleArtifactCreated);
      socket.off('system:event', handleSystemEvent);
    };
  }, [threadId, queryClient, socket, options]);

  return query;
}

// =====================================================
// THREAD MESSAGES INFINITE HOOK (Phase 2 - Pagination)
// =====================================================

export interface UseThreadMessagesInfiniteOptions {
  limit?: number;
  enabled?: boolean;
  onNewMessage?: (message: InboxMessage) => void;
}

/**
 * Hook for fetching thread messages with infinite scroll pagination
 * Uses cursor-based pagination with timestamps (oldest messages first)
 *
 * Messages are fetched in reverse chronological order from the API,
 * then reversed for display (oldest at top, newest at bottom).
 *
 * For "reverse infinite scroll" (loading older messages at top),
 * use fetchNextPage when user scrolls near the top.
 *
 * @returns Query result with infinite scroll helpers:
 *   - data.pages: Array of message pages
 *   - messages: Flattened array of all messages (chronological order)
 *   - fetchNextPage: Function to load older messages
 *   - hasNextPage: Boolean indicating if more older messages exist
 *   - isFetchingNextPage: Boolean for loading state
 */
export function useThreadMessagesInfinite(
  threadId: string | null,
  options?: UseThreadMessagesInfiniteOptions
) {
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const limit = options?.limit || 50;

  const query = useInfiniteQuery({
    queryKey: inboxKeys.messagesInfinite(threadId || ''),
    queryFn: async ({ pageParam }) => {
      if (!threadId) {
        return { messages: [], nextCursor: null, hasMore: false };
      }
      const response = await getThreadMessagesPaginated(threadId, {
        cursor: pageParam as string | undefined,
        limit,
      });
      return response;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: MessagesPageResponse) => {
      // Return the cursor for the next page (older messages), or undefined if no more
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    enabled: !!threadId && options?.enabled !== false,
    staleTime: 10000, // 10 seconds
  });

  // Flatten all pages into a single array of messages
  // Pages are in reverse order (newest page first), so we need to:
  // 1. Reverse the pages array
  // 2. Flatten the messages from each page
  // Result: chronological order (oldest to newest)
  const allMessages = query.data?.pages
    ? [...query.data.pages].reverse().flatMap((page) => page.messages)
    : [];

  // Join/leave thread room
  useEffect(() => {
    if (!threadId || !socket) return;

    socket.emit('thread:join', { threadId });
    console.log('[INBOX_SOCKET] Joined thread (infinite):', threadId);

    return () => {
      socket.emit('thread:leave', { threadId });
      console.log('[INBOX_SOCKET] Left thread (infinite):', threadId);
    };
  }, [threadId, socket]);

  // Listen for real-time message events
  useEffect(() => {
    if (!threadId || !socket) return;

    // New message arrived - append to the most recent page (first page)
    const handleNewMessage = (message: InboxMessage) => {
      if (message.threadId !== threadId) return;

      // Clear processing stage when a new message arrives
      useInboxStore.getState().clearProcessingStage(threadId);

      queryClient.setQueryData(
        inboxKeys.messagesInfinite(threadId),
        (oldData: { pages: MessagesPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData || oldData.pages.length === 0) {
            // Create initial page with this message
            return {
              pages: [{ messages: [message], nextCursor: null, hasMore: false }],
              pageParams: [undefined],
            };
          }

          // Check if message already exists (from streaming placeholder)
          const exists = oldData.pages.some((page) =>
            page.messages.some((m) => m.id === message.id)
          );

          if (exists) {
            // Merge with existing message (from streaming)
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) => {
                  if (m.id === message.id) {
                    // Keep the longer content (handles race condition)
                    return {
                      ...message,
                      content: m.content.length > message.content.length ? m.content : message.content,
                      isStreaming: m.isStreaming,
                    };
                  }
                  return m;
                }),
              })),
            };
          }

          // Append to first page (most recent)
          const firstPage = oldData.pages[0];
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                messages: [...firstPage.messages, message],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      );

      options?.onNewMessage?.(message);
    };

    // Message streaming (partial content) - with upsert logic
    const handleMessageStream = (data: { messageId: string; content: string; agentId?: string; agentName?: string }) => {
      queryClient.setQueryData(
        inboxKeys.messagesInfinite(threadId),
        (oldData: { pages: MessagesPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData || oldData.pages.length === 0) {
            // Create placeholder in new page
            const placeholderMessage: InboxMessage = {
              id: data.messageId,
              threadId,
              role: 'agent',
              type: 'text',
              content: data.content,
              agentId: data.agentId,
              agentName: data.agentName,
              isStreaming: true,
              isOptimistic: false,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            return {
              pages: [{ messages: [placeholderMessage], nextCursor: null, hasMore: false }],
              pageParams: [undefined],
            };
          }

          // Find which page contains the message
          let foundPage = -1;
          let foundIndex = -1;
          for (let p = 0; p < oldData.pages.length; p++) {
            const idx = oldData.pages[p].messages.findIndex((m) => m.id === data.messageId);
            if (idx !== -1) {
              foundPage = p;
              foundIndex = idx;
              break;
            }
          }

          if (foundPage !== -1) {
            // Message exists - append content
            return {
              ...oldData,
              pages: oldData.pages.map((page, p) =>
                p === foundPage
                  ? {
                      ...page,
                      messages: page.messages.map((msg, idx) =>
                        idx === foundIndex
                          ? { ...msg, content: msg.content + data.content, isStreaming: true }
                          : msg
                      ),
                    }
                  : page
              ),
            };
          } else {
            // Message doesn't exist - create placeholder in first page
            console.log(`[INBOX_SOCKET] Creating placeholder for streaming message (infinite): ${data.messageId}`);
            const placeholderMessage: InboxMessage = {
              id: data.messageId,
              threadId,
              role: 'agent',
              type: 'text',
              content: data.content,
              agentId: data.agentId,
              agentName: data.agentName,
              isStreaming: true,
              isOptimistic: false,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            const firstPage = oldData.pages[0];
            return {
              ...oldData,
              pages: [
                {
                  ...firstPage,
                  messages: [...firstPage.messages, placeholderMessage],
                },
                ...oldData.pages.slice(1),
              ],
            };
          }
        }
      );
    };

    // Message streaming complete
    const handleMessageComplete = (data: string | { messageId: string }) => {
      const messageId = typeof data === 'string' ? data : data.messageId;

      // Clear processing stage on stream completion
      useInboxStore.getState().clearProcessingStage(threadId);

      queryClient.setQueryData(
        inboxKeys.messagesInfinite(threadId),
        (oldData: { pages: MessagesPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === messageId ? { ...msg, isStreaming: false } : msg
              ),
            })),
          };
        }
      );
    };

    // Approval status updated
    const handleApprovalUpdate = (data: {
      approvalId: string;
      status: 'approved' | 'rejected' | 'expired';
      resolvedBy?: string;
      resolvedAt?: string;
    }) => {
      queryClient.setQueryData(
        inboxKeys.messagesInfinite(threadId),
        (oldData: { pages: MessagesPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.approval?.approvalId === data.approvalId
                  ? {
                      ...msg,
                      approval: {
                        ...msg.approval,
                        status: data.status,
                        resolvedBy: data.resolvedBy,
                        resolvedAt: data.resolvedAt,
                      },
                    }
                  : msg
              ),
            })),
          };
        }
      );

      // Invalidate threads to update status
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
      queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });
    };

    // System event
    const handleSystemEvent = (event: {
      id: string;
      type: string;
      content: string;
      metadata?: Record<string, unknown>;
      timestamp: string;
    }) => {
      // Processing stage events are transient UI indicators, not persisted messages
      if (event.metadata?.eventType === 'processing_stage') {
        useInboxStore.getState().setProcessingStage(threadId, {
          stage: event.metadata.stage as string,
          agentName: event.metadata.agentName as string,
          label: event.content,
        });
        return;
      }

      const systemMessage: InboxMessage = {
        id: event.id,
        threadId,
        role: 'system',
        type: 'system_event',
        content: event.content,
        metadata: event.metadata,
        isStreaming: false,
        isOptimistic: false,
        timestamp: event.timestamp,
        createdAt: event.timestamp,
      };

      queryClient.setQueryData(
        inboxKeys.messagesInfinite(threadId),
        (oldData: { pages: MessagesPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData || oldData.pages.length === 0) {
            return {
              pages: [{ messages: [systemMessage], nextCursor: null, hasMore: false }],
              pageParams: [undefined],
            };
          }

          // Check if event already exists
          const exists = oldData.pages.some((page) =>
            page.messages.some((m) => m.id === event.id)
          );
          if (exists) return oldData;

          // Add to first page (most recent)
          const firstPage = oldData.pages[0];
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                messages: [...firstPage.messages, systemMessage],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:stream', handleMessageStream);
    socket.on('message:complete', handleMessageComplete);
    socket.on('approval:update', handleApprovalUpdate);
    socket.on('system:event', handleSystemEvent);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:stream', handleMessageStream);
      socket.off('message:complete', handleMessageComplete);
      socket.off('approval:update', handleApprovalUpdate);
      socket.off('system:event', handleSystemEvent);
    };
  }, [threadId, queryClient, socket, options]);

  return {
    ...query,
    messages: allMessages,
    // Expose helpers explicitly for clarity
    fetchNextPage: query.fetchNextPage, // Load older messages
    hasNextPage: query.hasNextPage, // More older messages exist
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

// =====================================================
// TYPING INDICATOR HOOK (FIXED - Phase 1)
// =====================================================

// Safety timeout for typing indicators (5 seconds)
const TYPING_TIMEOUT_MS = 5000;

export interface TypingAgent {
  agentId: string;
  agentName: string;
  startedAt: number;
}

/**
 * Hook for typing indicators with safety timeout
 * - Uses useState for proper re-renders
 * - Auto-clears typing state after 5 seconds if no stop event received
 * - Returns array of currently typing agents
 */
export function useTypingIndicator(threadId: string | null): TypingAgent[] {
  const { socket } = useSocketContext();
  const [typingAgents, setTypingAgents] = useState<Map<string, TypingAgent>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!threadId || !socket) {
      // Clear all typing state when leaving thread or no socket
      setTypingAgents(new Map());
      return;
    }

    const handleTypingStart = (data: TypingIndicator) => {
      if (data.threadId !== threadId) return;

      const agentId = data.agentId;

      // Clear existing timeout for this agent
      const existingTimeout = timeoutRefs.current.get(agentId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add agent to typing state
      setTypingAgents((prev) => {
        const updated = new Map(prev);
        updated.set(agentId, {
          agentId,
          agentName: data.agentName || agentId,
          startedAt: Date.now(),
        });
        return updated;
      });

      // Set safety timeout to auto-clear after 5 seconds
      const timeout = setTimeout(() => {
        setTypingAgents((prev) => {
          const updated = new Map(prev);
          updated.delete(agentId);
          return updated;
        });
        timeoutRefs.current.delete(agentId);
        console.log(`[TYPING] Safety timeout cleared typing for agent: ${agentId}`);
      }, TYPING_TIMEOUT_MS);

      timeoutRefs.current.set(agentId, timeout);
    };

    const handleTypingStop = (data: TypingIndicator) => {
      if (data.threadId !== threadId) return;

      const agentId = data.agentId;

      // Clear timeout
      const existingTimeout = timeoutRefs.current.get(agentId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(agentId);
      }

      // Remove agent from typing state
      setTypingAgents((prev) => {
        const updated = new Map(prev);
        updated.delete(agentId);
        return updated;
      });
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);

      // Clear all timeouts on cleanup
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, [threadId, socket]);

  // Convert Map to array for easier consumption
  return Array.from(typingAgents.values());
}

// =====================================================
// SEND MESSAGE MUTATION (ENHANCED - Phase 1)
// =====================================================

/**
 * Hook for sending messages with improved error handling
 * - Optimistic updates with proper rollback
 * - User-friendly error messages
 * - Retry suggestion on failure
 */
export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => sendMessage(threadId, content),
    onMutate: async (content) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.messages(threadId) });

      // Snapshot the previous value for rollback
      const previousMessages = queryClient.getQueryData<InboxMessage[]>(
        inboxKeys.messages(threadId)
      );

      // Optimistically add the new message
      const optimisticMessage: InboxMessage = {
        id: `optimistic-${Date.now()}`,
        threadId,
        role: 'user',
        type: 'text',
        content,
        isStreaming: false,
        isOptimistic: true,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      return { previousMessages, optimisticMessage };
    },
    onError: (err, content, context) => {
      console.error('[SEND_MESSAGE] Error:', err);

      // Rollback to previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(inboxKeys.messages(threadId), context.previousMessages);
      }

      // Show user-friendly error with action
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error('Failed to send message', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => {
            // Re-attempt sending - user can click retry
            toast.info('Please try sending your message again');
          },
        },
      });
    },
    onSuccess: (newMessage, content, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (old) => {
        if (!old) return [newMessage];
        return old.map((msg) =>
          msg.id === context?.optimisticMessage.id ? newMessage : msg
        );
      });
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages(threadId) });
    },
  });
}

// =====================================================
// ARTIFACT HOOKS
// =====================================================

/**
 * Hook for fetching artifacts list (lightweight)
 */
export function useArtifacts(threadId: string | null) {
  return useQuery({
    queryKey: inboxKeys.artifacts(threadId || ''),
    queryFn: () => (threadId ? getArtifacts(threadId) : Promise.resolve([])),
    enabled: !!threadId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for fetching single artifact with full content
 */
export function useArtifact(artifactId: string | null) {
  return useQuery({
    queryKey: inboxKeys.artifact(artifactId || ''),
    queryFn: () => (artifactId ? getArtifactContent(artifactId) : Promise.resolve(null)),
    enabled: !!artifactId,
    staleTime: 300000, // 5 minutes (content rarely changes)
  });
}

/**
 * Hook for updating artifact
 */
export function useUpdateArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      artifactId,
      data,
    }: {
      artifactId: string;
      data: { content?: string; title?: string };
    }) => updateArtifact(artifactId, data),
    onSuccess: (updatedArtifact) => {
      // Update the artifact in cache
      queryClient.setQueryData(inboxKeys.artifact(updatedArtifact.id), updatedArtifact);

      // Invalidate artifacts list if threadId exists
      if (updatedArtifact.threadId) {
        queryClient.invalidateQueries({ queryKey: inboxKeys.artifacts(updatedArtifact.threadId) });
      }

      toast.success('Artifact saved');
    },
    onError: () => {
      toast.error('Failed to save artifact');
    },
  });
}

// =====================================================
// APPROVAL MUTATIONS (ENHANCED - Phase 1)
// =====================================================

/**
 * Hook for approving a workflow with optimistic updates
 */
export function useApproveWorkflow(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) => approveWorkflow(approvalId),
    onMutate: async (approvalId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.messages(threadId) });

      // Snapshot previous state for rollback
      const previousMessages = queryClient.getQueryData<InboxMessage[]>(
        inboxKeys.messages(threadId)
      );
      const previousThreads = queryClient.getQueryData<Thread[]>(inboxKeys.threads());

      // Optimistically update approval status
      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (old) =>
        old?.map((msg) =>
          msg.approval?.approvalId === approvalId
            ? {
                ...msg,
                approval: {
                  ...msg.approval,
                  status: 'approved' as const,
                  resolvedAt: new Date().toISOString(),
                },
              }
            : msg
        )
      );

      // Optimistically update thread status
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old?.map((thread) =>
          thread.id === threadId
            ? { ...thread, status: 'active' as const, pendingApprovalId: undefined }
            : thread
        )
      );

      return { previousMessages, previousThreads, approvalId };
    },
    onError: (err, approvalId, context) => {
      console.error('[APPROVE_WORKFLOW] Error:', err);

      // Rollback to previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(inboxKeys.messages(threadId), context.previousMessages);
      }
      if (context?.previousThreads) {
        queryClient.setQueryData(inboxKeys.threads(), context.previousThreads);
      }

      const errorMessage = err instanceof Error ? err.message : 'Please try again';
      toast.error('Failed to approve workflow', {
        description: errorMessage,
      });
    },
    onSuccess: () => {
      toast.success('Workflow approved successfully');
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages(threadId) });
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
    },
  });
}

/**
 * Hook for rejecting a workflow with optimistic updates
 */
export function useRejectWorkflow(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, comment }: { approvalId: string; comment?: string }) =>
      rejectWorkflow(approvalId, comment),
    onMutate: async ({ approvalId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.messages(threadId) });

      // Snapshot previous state for rollback
      const previousMessages = queryClient.getQueryData<InboxMessage[]>(
        inboxKeys.messages(threadId)
      );
      const previousThreads = queryClient.getQueryData<Thread[]>(inboxKeys.threads());

      // Optimistically update approval status
      queryClient.setQueryData<InboxMessage[]>(inboxKeys.messages(threadId), (old) =>
        old?.map((msg) =>
          msg.approval?.approvalId === approvalId
            ? {
                ...msg,
                approval: {
                  ...msg.approval,
                  status: 'rejected' as const,
                  resolvedAt: new Date().toISOString(),
                },
              }
            : msg
        )
      );

      // Optimistically update thread status
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old?.map((thread) =>
          thread.id === threadId
            ? { ...thread, status: 'active' as const, pendingApprovalId: undefined }
            : thread
        )
      );

      return { previousMessages, previousThreads, approvalId };
    },
    onError: (err, variables, context) => {
      console.error('[REJECT_WORKFLOW] Error:', err);

      // Rollback to previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(inboxKeys.messages(threadId), context.previousMessages);
      }
      if (context?.previousThreads) {
        queryClient.setQueryData(inboxKeys.threads(), context.previousThreads);
      }

      const errorMessage = err instanceof Error ? err.message : 'Please try again';
      toast.error('Failed to reject workflow', {
        description: errorMessage,
      });
    },
    onSuccess: () => {
      toast.success('Workflow rejected');
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages(threadId) });
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
    },
  });
}

// =====================================================
// MARK AS READ MUTATION
// =====================================================

/**
 * Hook for marking thread as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => markThreadAsRead(threadId),
    onSuccess: (_, threadId) => {
      // Optimistically update the thread
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old?.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      );
    },
  });
}

// =====================================================
// MARK AS UNREAD MUTATION
// =====================================================

/**
 * Hook for marking thread as unread with optimistic update
 */
export function useMarkAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => markThreadAsUnread(threadId),
    onMutate: async (threadId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.threads() });
      await queryClient.cancelQueries({ queryKey: inboxKeys.threadsInfinite() });

      // Snapshot previous state
      const previousThreads = queryClient.getQueryData<Thread[]>(inboxKeys.threads());

      // Optimistically update thread to show as unread
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old?.map((t) => (t.id === threadId ? { ...t, unreadCount: 1 } : t))
      );

      // Also update infinite query cache
      queryClient.setQueriesData(
        { queryKey: inboxKeys.threadsInfinite() },
        (oldData: { pages: ThreadsPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              threads: page.threads.map((t) =>
                t.id === threadId ? { ...t, unreadCount: 1 } : t
              ),
            })),
          };
        }
      );

      return { previousThreads };
    },
    onError: (err, threadId, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(inboxKeys.threads(), context.previousThreads);
      }
      toast.error('Failed to mark as unread');
    },
    onSuccess: () => {
      toast.success('Marked as unread');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
      queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });
    },
  });
}

// =====================================================
// ARCHIVE THREAD MUTATION
// =====================================================

/**
 * Hook for archiving a thread with optimistic update
 * Thread is immediately removed from the active list
 */
export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => archiveThread(threadId),
    onMutate: async (threadId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.threads() });
      await queryClient.cancelQueries({ queryKey: inboxKeys.threadsInfinite() });

      // Snapshot previous state
      const previousThreads = queryClient.getQueryData<Thread[]>(inboxKeys.threads());

      // Optimistically remove thread from active list (or update status)
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old?.map((t) => (t.id === threadId ? { ...t, status: 'archived' as const } : t))
      );

      // Also update infinite query cache - filter out the archived thread
      queryClient.setQueriesData(
        { queryKey: inboxKeys.threadsInfinite() },
        (oldData: { pages: ThreadsPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              threads: page.threads.filter((t) => t.id !== threadId),
            })),
          };
        }
      );

      return { previousThreads, threadId };
    },
    onError: (err, threadId, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(inboxKeys.threads(), context.previousThreads);
      }
      // Refetch to restore infinite query state
      queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });

      toast.error('Failed to archive thread');
    },
    onSuccess: (_, threadId) => {
      toast.success('Thread archived', {
        action: {
          label: 'Undo',
          onClick: () => {
            // Unarchive the thread
            unarchiveThread(threadId).then(() => {
              queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
              queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });
              toast.success('Thread restored');
            });
          },
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
    },
  });
}

// =====================================================
// UNARCHIVE THREAD MUTATION
// =====================================================

/**
 * Hook for restoring an archived thread
 */
export function useUnarchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => unarchiveThread(threadId),
    onSuccess: () => {
      toast.success('Thread restored');
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
      queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });
    },
    onError: () => {
      toast.error('Failed to restore thread');
    },
  });
}

// =====================================================
// DELETE THREAD MUTATION
// =====================================================

/**
 * Hook for deleting a thread with optimistic update
 * Soft delete by default, with undo capability
 */
export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, permanent = false }: { threadId: string; permanent?: boolean }) =>
      deleteThread(threadId, permanent),
    onMutate: async ({ threadId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.threads() });
      await queryClient.cancelQueries({ queryKey: inboxKeys.threadsInfinite() });

      // Snapshot previous state for potential rollback
      const previousThreads = queryClient.getQueryData<Thread[]>(inboxKeys.threads());

      // Store the deleted thread for undo
      const deletedThread = previousThreads?.find((t) => t.id === threadId);

      // Optimistically remove thread from list
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old?.filter((t) => t.id !== threadId)
      );

      // Also update infinite query cache
      queryClient.setQueriesData(
        { queryKey: inboxKeys.threadsInfinite() },
        (oldData: { pages: ThreadsPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              threads: page.threads.filter((t) => t.id !== threadId),
            })),
          };
        }
      );

      return { previousThreads, deletedThread, threadId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(inboxKeys.threads(), context.previousThreads);
      }
      // Refetch to restore infinite query state
      queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });

      toast.error('Failed to delete thread');
    },
    onSuccess: (_, { threadId, permanent }) => {
      if (permanent) {
        toast.success('Thread permanently deleted');
      } else {
        toast.success('Thread moved to trash', {
          description: 'You can restore it from the trash',
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
    },
  });
}

// =====================================================
// CREATE THREAD MUTATION
// =====================================================

/**
 * Hook for creating a new thread
 * Returns the new thread and invalidates thread lists
 */
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: { subject?: string; agentId?: string; agentName?: string }) =>
      createThread(data),
    onSuccess: (newThread) => {
      // Add new thread to the beginning of the list
      queryClient.setQueryData<Thread[]>(inboxKeys.threads(), (old) =>
        old ? [newThread, ...old] : [newThread]
      );

      // Also update infinite query cache - prepend to first page
      queryClient.setQueriesData(
        { queryKey: inboxKeys.threadsInfinite() },
        (oldData: { pages: ThreadsPageResponse[]; pageParams: (string | undefined)[] } | undefined) => {
          if (!oldData || oldData.pages.length === 0) {
            return {
              pages: [{ threads: [newThread], nextCursor: null, hasMore: false }],
              pageParams: [undefined],
            };
          }

          const firstPage = oldData.pages[0];
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                threads: [newThread, ...firstPage.threads],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      );

      toast.success('New conversation started');
    },
    onError: (err) => {
      console.error('[CREATE_THREAD] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Please try again';
      toast.error('Failed to create conversation', {
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
      queryClient.invalidateQueries({ queryKey: inboxKeys.threadsInfinite() });
    },
  });
}

