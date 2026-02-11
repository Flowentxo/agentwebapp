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

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
import { RoutingNotification } from './RoutingNotification';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { getAgentById } from '@/lib/agents/personas';
import { cn } from '@/lib/utils';
import { ArrowLeft, Bot, MoreHorizontal, Loader2, FileText } from 'lucide-react';
import { EmmieCapabilityBar } from '@/components/inbox/emmie/EmmieCapabilityBar';
import { EmmieTemplatePicker } from '@/components/inbox/emmie/EmmieTemplatePicker';
import type { ChatMessage } from '@/types/inbox';

interface ChatInterfaceProps {
  threadId: string;
}

export function ChatInterface({ threadId }: ChatInterfaceProps) {
  const router = useRouter();
  const composerRef = useRef<{ focus: () => void }>(null);

  // Zustand store for artifact panel + routing feedback + processing stages
  const { isArtifactPanelOpen, openArtifactById, routingFeedback, clearRoutingFeedback, processingStages } = useInboxStore();

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
      role: msg.role as 'user' | 'agent' | 'system',
      content: msg.content,
      createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
      metadata: msg.metadata,
      artifactId: msg.artifactId,
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

  // Check if thread has artifacts (for collapsed results tab)
  const threadHasArtifacts = useMemo(() => {
    return messages.some((m) => m.artifactId);
  }, [messages]);

  const latestArtifactId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].artifactId) return messages[i].artifactId;
    }
    return null;
  }, [messages]);

  // Auto-open artifact panel when a new artifact message arrives
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (!messages.length) return;
    // Only trigger on new messages (not initial load)
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.artifactId) {
        openArtifactById(lastMessage.artifactId);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, openArtifactById]);

  // Agent info (from thread) with real color
  const agentName = thread?.agentName || thread?.agentId || 'AI Assistant';
  const agentPersona = getAgentById(thread?.agentId || '');
  const agentColor = agentPersona?.color || '#8b5cf6';

  // Routing feedback for this thread
  const currentRoutingFeedback = routingFeedback[threadId];

  // Processing stage for this thread
  const processingStage = processingStages[threadId];

  // Emmie-specific state
  const isEmmie = thread?.agentId === 'emmie';
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Loading state
  if (isLoadingThreads || isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-sm text-white/40">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Thread not found
  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-white/40 mb-2">Conversation not found</p>
          <button
            onClick={handleBack}
            className="text-sm text-violet-400 hover:text-violet-300"
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
          <p className="text-red-400 mb-2">Failed to load messages</p>
          <button
            onClick={handleBack}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Go back to inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Main Chat Area */}
      <div className={cn(
        'flex flex-col flex-1 min-w-0 transition-all duration-300',
        isArtifactPanelOpen && 'lg:w-[60%]'
      )}>
        {/* Header */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-sm">
          {/* Back button (mobile) */}
          <button
            onClick={handleBack}
            className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
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
            <h2 className="text-sm font-medium text-white truncate">
              {thread.subject || agentName}
            </h2>
            <p className="text-xs text-white/40 truncate">
              {isTyping ? (
                <span className="text-violet-400">Typing...</span>
              ) : (
                `${messages.length} messages`
              )}
            </p>
          </div>

          {/* Actions */}
          <button
            className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
            title="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </header>

        {/* Routing Notification */}
        {currentRoutingFeedback && (
          <RoutingNotification
            agentId={currentRoutingFeedback.agentId}
            agentName={currentRoutingFeedback.agentName}
            confidence={currentRoutingFeedback.confidence}
            reasoning={currentRoutingFeedback.reasoning}
            previousAgent={currentRoutingFeedback.previousAgent}
            onDismiss={() => clearRoutingFeedback(threadId)}
          />
        )}

        {/* Processing Stage Indicator */}
        {processingStage && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: agentColor }} />
            <span className="text-xs text-white/60 truncate">{processingStage.label}</span>
          </div>
        )}

        {/* Emmie Capability Bar */}
        {isEmmie && (
          <EmmieCapabilityBar
            onAction={handleSendMessage}
            onOpenTemplates={() => setIsTemplatePickerOpen(true)}
            agentColor={agentColor}
          />
        )}

        {/* Message Stream */}
        <MessageStream
          messages={messages}
          isLoading={isLoadingMessages}
          isTyping={isTyping}
          agentName={agentName}
          agentColor={agentColor}
          agentId={thread?.agentId}
          onSuggestedPrompt={handleSendMessage}
        />

        {/* Composer */}
        <StickyComposer
          onSend={handleSendMessage}
          isLoading={sendMutation.isPending}
          placeholder={`Message ${agentName}...`}
        />
      </div>

      {/* Collapsed Results Tab (visible when panel closed but artifacts exist) */}
      {!isArtifactPanelOpen && threadHasArtifacts && latestArtifactId && (
        <button
          onClick={() => openArtifactById(latestArtifactId)}
          className="hidden lg:flex flex-col items-center justify-center w-10
                     bg-[#111] border-l border-white/[0.06]
                     hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4 text-white/30 mb-2" />
          <span className="text-[9px] text-white/30 writing-mode-vertical">Results</span>
        </button>
      )}

      {/* Artifact Panel (slides in from right) */}
      {isArtifactPanelOpen && (
        <div className="hidden lg:flex w-[40%] min-w-[400px] max-w-[600px]">
          <ArtifactPanel />
        </div>
      )}

      {/* Emmie Template Picker */}
      {isEmmie && (
        <EmmieTemplatePicker
          isOpen={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
          onSelectTemplate={(prompt) => {
            handleSendMessage(prompt);
            setIsTemplatePickerOpen(false);
          }}
          agentColor={agentColor}
        />
      )}
    </div>
  );
}
