'use client';

/**
 * Flowent Inbox v3 - MessageStream Component
 * Scrollable message list with date separators and auto-scroll
 *
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Date separators between message groups
 * - Loading states (skeleton, streaming indicator)
 * - Empty state
 * - Typing indicator
 */

import { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';
import { MessageBubble } from './MessageBubble';
import { WorkflowPipelineCard, type PipelineStep } from './chat/WorkflowPipelineCard';
import { Bot, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/inbox';
import { getAgentById } from '@/lib/agents/personas';

interface MessageStreamProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  streamingContent?: string;
  agentName?: string;
  agentColor?: string;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
}

// Date separator helper
function formatDateSeparator(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

// Group messages by date
function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate: string | null = null;
  let currentGroup: ChatMessage[] = [];

  messages.forEach((message) => {
    const messageDate = message.createdAt
      ? format(parseISO(message.createdAt), 'yyyy-MM-dd')
      : 'unknown';

    if (messageDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate!, messages: currentGroup });
      }
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate!, messages: currentGroup });
  }

  return groups;
}

// Extract workflow pipeline steps from system event messages
function extractWorkflowSteps(messages: ChatMessage[]): PipelineStep[] | null {
  const workflowMessages = messages.filter(
    (m) => m.type === 'system_event' && m.metadata?.eventType?.startsWith('workflow_')
  );
  if (workflowMessages.length === 0) return null;

  // Build steps from workflow system events
  const steps: PipelineStep[] = [];
  const seen = new Set<string>();
  for (const msg of workflowMessages) {
    const meta = msg.metadata as Record<string, unknown> | undefined;
    if (!meta) continue;
    const stepId = (meta.stepId as string) || msg.id;
    if (seen.has(stepId)) continue;
    seen.add(stepId);

    const agentId = (meta.agentId as string) || '';
    const agent = getAgentById(agentId);
    const eventType = meta.eventType as string;

    let status: PipelineStep['status'] = 'pending';
    if (eventType === 'workflow_completed' || eventType === 'workflow_step_completed') status = 'completed';
    else if (eventType === 'workflow_started' || eventType === 'workflow_step_started') status = 'in_progress';
    else if (eventType === 'workflow_failed' || eventType === 'workflow_step_failed') status = 'failed';
    else if (eventType === 'workflow_paused') status = 'pending';

    steps.push({
      id: stepId,
      label: (meta.stepLabel as string) || (meta.label as string) || msg.content || 'Processing...',
      agentName: agent?.name || (meta.agentName as string) || 'Agent',
      agentColor: agent?.color || '#8b5cf6',
      status,
    });
  }

  return steps.length > 0 ? steps : null;
}

export function MessageStream({
  messages,
  isLoading = false,
  isTyping = false,
  streamingContent,
  agentName = 'AI Assistant',
  agentColor = '#8b5cf6',
  onLoadMore,
  hasMoreMessages = false,
}: MessageStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Group messages by date
  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Extract workflow pipeline steps (if any)
  const workflowSteps = useMemo(() => extractWorkflowSteps(messages), [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  // Track scroll position for auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScroll.current = isNearBottom;

    // Load more when scrolling to top
    if (scrollTop < 50 && hasMoreMessages && onLoadMore) {
      onLoadMore();
    }
  };

  // Loading skeleton
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3 animate-pulse',
              i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div
              className={cn(
                'flex-1 max-w-[60%]',
                i % 2 === 0 ? 'mr-auto' : 'ml-auto'
              )}
            >
              <div className="h-4 w-20 bg-zinc-800 rounded mb-2" />
              <div className="h-16 bg-zinc-800 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${agentColor}20` }}
        >
          <Bot className="w-8 h-8" style={{ color: agentColor }} />
        </div>
        <h3 className="text-lg font-medium text-zinc-100 mb-2">{agentName}</h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Start a conversation. Ask questions, get help with tasks, or just chat.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      onScroll={handleScroll}
    >
      {/* Load more indicator */}
      {hasMoreMessages && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Load earlier messages
          </button>
        </div>
      )}

      {/* Workflow Pipeline Visualization */}
      {workflowSteps && <WorkflowPipelineCard steps={workflowSteps} />}

      {/* Message groups with date separators */}
      {messageGroups.map((group) => (
        <div key={group.date}>
          {/* Date Separator */}
          <div className="flex items-center justify-center my-4 px-4">
            <div className="h-px flex-1 bg-card/5" />
            <span className="px-4 text-xs text-zinc-500 font-medium">
              {formatDateSeparator(group.date)}
            </span>
            <div className="h-px flex-1 bg-card/5" />
          </div>

          {/* Messages */}
          {group.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              agentName={agentName}
              agentColor={agentColor}
            />
          ))}
        </div>
      ))}

      {/* Streaming message */}
      {streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            threadId: '',
            role: 'assistant',
            content: streamingContent,
            createdAt: new Date().toISOString(),
          }}
          isStreaming={true}
          agentName={agentName}
          agentColor={agentColor}
        />
      )}

      {/* Typing indicator */}
      {isTyping && !streamingContent && (
        <div className="flex gap-3 px-4 py-3">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${agentColor}20` }}
          >
            <Bot className="w-4 h-4" style={{ color: agentColor }} />
          </div>
          <div className="flex items-center gap-1 px-4 py-2.5 bg-zinc-800/80 rounded-2xl rounded-bl-md border border-white/5">
            <span
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: agentColor, animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: agentColor, animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: agentColor, animationDelay: '300ms' }}
            />
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
