'use client';

/**
 * Flowent Inbox v2 - Chat Stream Component
 * Scrollable message list with auto-scroll to bottom
 * Supports text messages, approval decision cards, artifacts, and system events
 *
 * Phase 2: Added infinite scroll with useThreadMessagesInfinite
 * - Uses reverse infinite scroll (load older messages when scrolling to top)
 * - Preserves scroll position when loading older messages
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { DecisionCard } from './DecisionCard';
import { SystemMessage, DayDivider } from './SystemMessage';
import { ArtifactBlock } from '../artifacts/ArtifactBlock';
import { useThreadMessagesInfinite, useTypingIndicator, useApproveWorkflow, useRejectWorkflow } from '@/lib/hooks/useInbox';
import { cn } from '@/lib/utils';
import type { ChatMessage, InboxMessage, ApprovalActionPayload, transformMessageToChat } from '@/types/inbox';

interface ChatStreamProps {
  threadId: string;
  agentColor?: string;
}

// Transform InboxMessage to ChatMessage for display
function transformToDisplayMessage(message: InboxMessage): ChatMessage {
  return {
    id: message.id,
    threadId: message.threadId,
    type: message.type,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp),
    agentId: message.agentId || undefined,
    agentName: message.agentName || undefined,
    isStreaming: message.isStreaming,
    isOptimistic: message.isOptimistic,
    approval: message.approval || undefined,
    metadata: message.metadata || undefined,
  };
}

export function ChatStream({
  threadId,
  agentColor = '#8b5cf6',
}: ChatStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const previousScrollHeightRef = useRef<number>(0);
  const isLoadingOlderRef = useRef(false);

  // Fetch messages using React Query infinite scroll with Socket.IO updates
  const {
    messages: rawMessages,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useThreadMessagesInfinite(threadId);

  // Get typing agents (now returns array with safety timeout)
  const typingAgents = useTypingIndicator(threadId);

  // Approval mutations
  const approveWorkflowMutation = useApproveWorkflow(threadId);
  const rejectWorkflowMutation = useRejectWorkflow(threadId);

  // Track which approval is being processed
  const processingApprovalId = approveWorkflowMutation.isPending
    ? approveWorkflowMutation.variables
    : rejectWorkflowMutation.isPending
      ? rejectWorkflowMutation.variables?.approvalId
      : null;

  // Transform messages for display
  const messages = useMemo(() => {
    if (!rawMessages) return [];
    return rawMessages.map(transformToDisplayMessage);
  }, [rawMessages]);

  // Check if scrolled to bottom
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const threshold = 100; // pixels from bottom
    const isBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

    setIsAtBottom(isBottom);
    setShowScrollButton(!isBottom && messages.length > 0);
  }, [messages.length]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  // Auto-scroll when new messages arrive (if at bottom)
  useEffect(() => {
    if (isAtBottom && !isLoadingOlderRef.current) {
      scrollToBottom(false);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      scrollToBottom(false);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition);
    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [checkScrollPosition]);

  // Preserve scroll position when loading older messages
  useEffect(() => {
    if (isFetchingNextPage) {
      // Store scroll height before loading
      const container = containerRef.current;
      if (container) {
        previousScrollHeightRef.current = container.scrollHeight;
        isLoadingOlderRef.current = true;
      }
    } else if (isLoadingOlderRef.current) {
      // After loading, restore scroll position
      const container = containerRef.current;
      if (container) {
        const newScrollHeight = container.scrollHeight;
        const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
        container.scrollTop += scrollDiff;
      }
      isLoadingOlderRef.current = false;
    }
  }, [isFetchingNextPage]);

  // Set up Intersection Observer for reverse infinite scroll (load older at top)
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // When the top sentinel becomes visible and we have more pages, fetch older messages
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
          console.log('[CHAT_STREAM] Loading older messages...');
          fetchNextPage();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px', // trigger 100px before reaching the sentinel
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // Handle approval action
  const handleApprove = useCallback(
    async (payload: ApprovalActionPayload) => {
      await approveWorkflowMutation.mutateAsync(payload.messageId);
    },
    [approveWorkflowMutation]
  );

  // Handle rejection action
  const handleReject = useCallback(
    async (payload: ApprovalActionPayload) => {
      await rejectWorkflowMutation.mutateAsync({
        approvalId: payload.messageId,
        comment: payload.comment,
      });
    },
    [rejectWorkflowMutation]
  );

  // Group messages by date
  const groupedMessages = useMemo(() => {
    return messages.reduce<{ date: string; messages: ChatMessage[] }[]>((groups, message) => {
      const date = new Date(message.timestamp).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }

      return groups;
    }, []);
  }, [messages]);

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Message container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth px-4 py-6"
      >
        {/* Initial loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 border-2 border-red-500/30">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Failed to load messages
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-muted hover:bg-slate-200 text-foreground text-sm font-medium rounded-xl border-2 border-border transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Top sentinel for reverse infinite scroll (load older messages) */}
        <div ref={topSentinelRef} className="h-1" />

        {/* Loading indicator at top (for loading more) */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {/* "Load more" indicator when there are more older messages */}
        {!isLoading && !isFetchingNextPage && hasNextPage && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-muted-foreground">Scroll up for older messages</span>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoading && !isError && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 border-2 border-primary/20">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Start the conversation
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Send a message to begin working with this AI agent
            </p>
          </div>
        )}

        {/* Messages grouped by date */}
        {!isLoading && !isError && (
          <div className="max-w-3xl mx-auto space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date separator */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <span className="text-xs text-muted-foreground font-medium px-3 py-1 bg-card rounded-full border-2 border-border shadow-sm">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
                </div>

                {/* Messages in this group */}
                {group.messages.map((message) => {
                  // Render DecisionCard for approval requests
                  if (message.type === 'approval_request' && message.approval) {
                    return (
                      <DecisionCard
                        key={message.id}
                        message={message}
                        agentColor={agentColor}
                        isProcessing={processingApprovalId === message.approval.approvalId}
                        onApprove={async () => {
                          if (message.approval) {
                            await handleApprove({
                              threadId: message.threadId,
                              messageId: message.approval.approvalId,
                              action: 'approve',
                            });
                          }
                        }}
                        onReject={async (reason) => {
                          if (message.approval) {
                            await handleReject({
                              threadId: message.threadId,
                              messageId: message.approval.approvalId,
                              action: 'reject',
                              comment: reason,
                            });
                          }
                        }}
                      />
                    );
                  }

                  // Render ArtifactBlock for artifact messages
                  if (message.type === 'artifact' && message.artifact) {
                    return (
                      <div key={message.id} className="mb-4">
                        {/* Agent header for artifact */}
                        <div className="flex items-start gap-3 mb-2">
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                            style={{ backgroundColor: agentColor }}
                          >
                            {message.agentName?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-white">
                              {message.agentName || 'Agent'}
                            </span>
                            <span className="text-xs text-white/40 ml-2">
                              generated an artifact
                            </span>
                          </div>
                        </div>
                        {/* Artifact block - indented to align with message content */}
                        <div className="ml-11">
                          <ArtifactBlock
                            artifact={message.artifact}
                            agentColor={agentColor}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Render SystemMessage for system events (handoffs, workflow updates)
                  if (message.type === 'system_event') {
                    return <SystemMessage key={message.id} message={message} />;
                  }

                  // Render MessageBubble for text messages
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      agentColor={agentColor}
                    />
                  );
                })}
              </div>
            ))}

            {/* Typing indicator - Now supports multiple typing agents */}
            {typingAgents.length > 0 && (
              <div className="space-y-2">
                {typingAgents.map((agent) => (
                  <div key={agent.agentId} className="flex items-start gap-3 mb-4">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: agentColor }}
                    >
                      {agent.agentName?.charAt(0) || 'A'}
                    </div>
                    <div className="px-4 py-3 bg-card rounded-2xl rounded-bl-md border-2 border-border shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          {agent.agentName} is typing
                        </span>
                        <span className="flex gap-0.5">
                          <span
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Scroll to bottom button */}
      <button
        onClick={() => scrollToBottom(true)}
        className={cn(
          'absolute bottom-4 right-4 p-3 rounded-full bg-card border-2 border-border shadow-lg transition-all duration-200',
          showScrollButton
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
        title="Scroll to bottom"
      >
        <ArrowDown className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
