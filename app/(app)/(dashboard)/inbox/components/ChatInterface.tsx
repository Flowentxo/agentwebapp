'use client';

/**
 * Flowent Inbox v3 - ChatInterface Component
 * Main chat interface combining MessageStream and StickyComposer
 *
 * Features:
 * - Header with agent info
 * - Message stream with real-time updates
 * - Sticky composer at bottom
 * - Streaming support
 * - Artifact panel integration
 */

import { useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useThreads,
  useThreadMessages,
  useSendMessage,
  useTypingIndicator,
} from '@/lib/hooks/useInbox';
import { MessageStream } from './MessageStream';
import { StickyComposer } from './StickyComposer';
import { ArtifactPanel } from './artifacts/ArtifactPanel';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { cn } from '@/lib/utils';
import { ArrowLeft, Bot, User, MoreHorizontal, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/inbox';

interface ChatInterfaceProps {
  threadId: string;
}

export function ChatInterface({ threadId }: ChatInterfaceProps) {
  const router = useRouter();
  const composerRef = useRef<{ focus: () => void }>(null);

  // Zustand store for artifact panel
  const { isArtifactPanelOpen } = useInboxStore();

  // Fetch all threads and find the current one
  const { data: threads, isLoading: isLoadingThreads } = useThreads();
  const thread = useMemo(() => {
    return threads?.find((t) => t.id === threadId);
  }, [threads, threadId]);

  // Fetch messages for the thread
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useThreadMessages(threadId);

  // Typing indicator - returns array of typing agents
  const typingAgents = useTypingIndicator(threadId);
  const isTyping = typingAgents.length > 0;

  // Send message mutation
  const sendMutation = useSendMessage(threadId);

  // Transform messages to ChatMessage format
  const messages: ChatMessage[] = useMemo(() => {
    if (!messagesData) return [];
    return messagesData.map((msg) => ({
      id: msg.id,
      threadId: msg.threadId,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      createdAt: msg.createdAt,
      metadata: msg.metadata,
    }));
  }, [messagesData]);

  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMutation.mutateAsync(content);
      // Focus composer after sending (handled in StickyComposer now)
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [sendMutation]);

  const handleBack = () => {
    router.push('/inbox');
  };

  // Agent info (from thread)
  const agentName = thread?.agentName || thread?.agentId || 'AI Assistant';
  const agentColor = '#8b5cf6'; // Default violet

  // Loading state
  if (isLoadingThreads || isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Thread not found
  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-muted-foreground mb-2">Conversation not found</p>
          <button
            onClick={handleBack}
            className="text-sm text-primary hover:text-primary/80"
          >
            Go back to inbox
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (messagesError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 mb-2">Failed to load messages</p>
          <button
            onClick={handleBack}
            className="text-sm text-primary hover:text-primary/80"
          >
            Go back to inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Main Chat Area */}
      <div className={cn(
        'flex flex-col flex-1 min-w-0 transition-all duration-300',
        isArtifactPanelOpen && 'lg:w-[60%]'
      )}>
        {/* Header */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
          {/* Back button (mobile) */}
          <button
            onClick={handleBack}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Agent Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${agentColor}20` }}
          >
            <Bot className="w-5 h-5" style={{ color: agentColor }} />
          </div>

          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate">
              {thread.subject || agentName}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {isTyping ? (
                <span className="text-primary">Typing...</span>
              ) : (
                `${messages.length} messages`
              )}
            </p>
          </div>

          {/* Actions */}
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            title="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </header>

        {/* Message Stream */}
        <MessageStream
          messages={messages}
          isLoading={isLoadingMessages}
          isTyping={isTyping}
          agentName={agentName}
          agentColor={agentColor}
        />

        {/* Composer */}
        <StickyComposer
          onSend={handleSendMessage}
          isLoading={sendMutation.isPending}
          placeholder={`Message ${agentName}...`}
        />
      </div>

      {/* Artifact Panel (slides in from right) */}
      {isArtifactPanelOpen && (
        <div className="hidden lg:flex w-[40%] min-w-[400px] max-w-[600px]">
          <ArtifactPanel />
        </div>
      )}
    </div>
  );
}
