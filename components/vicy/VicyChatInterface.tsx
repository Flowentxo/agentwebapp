'use client';

import { useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useThreads,
  useThreadMessages,
  useSendMessage,
  useTypingIndicator,
} from '@/lib/hooks/useInbox';
import { MessageStream } from '@/app/(app)/(classic)/inbox/components/MessageStream';
import { ArtifactPanel } from '@/app/(app)/(classic)/inbox/components/artifacts/ArtifactPanel';
import { VicyComposer } from './VicyComposer';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { getAgentById } from '@/lib/agents/personas';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import type { ChatMessage } from '@/types/inbox';

interface VicyChatInterfaceProps {
  threadId: string;
}

export function VicyChatInterface({ threadId }: VicyChatInterfaceProps) {
  const router = useRouter();

  const { isArtifactPanelOpen, openArtifactById, routingFeedback, clearRoutingFeedback } = useInboxStore();

  const { data: threads, isLoading: isLoadingThreads } = useThreads();
  const thread = useMemo(() => {
    return threads?.find((t) => t.id === threadId);
  }, [threads, threadId]);

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useThreadMessages(threadId);

  const typingAgents = useTypingIndicator(threadId);
  const isTyping = typingAgents.length > 0;
  const sendMutation = useSendMessage(threadId);

  const messages: ChatMessage[] = useMemo(() => {
    if (!messagesData) return [];
    return messagesData.map((msg) => ({
      id: msg.id,
      threadId: msg.threadId,
      role: msg.role as 'user' | 'agent' | 'system',
      content: msg.content,
      createdAt: msg.createdAt,
      metadata: msg.metadata,
      artifactId: msg.artifactId,
    }));
  }, [messagesData]);

  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMutation.mutateAsync(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [sendMutation]);

  const handleBack = () => {
    router.push('/v4');
  };

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
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.artifactId) {
        openArtifactById(lastMessage.artifactId);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, openArtifactById]);

  // Agent info
  const agentName = thread?.agentName || thread?.agentId || 'AI Assistant';
  const agentPersona = getAgentById(thread?.agentId || '');
  const agentColor = agentPersona?.color || '#8b5cf6';

  // Routing feedback
  const currentRoutingFeedback = routingFeedback[threadId];
  const routedAgentId = currentRoutingFeedback?.agentId || thread?.agentId;
  const routedAgent = routedAgentId ? getAgentById(routedAgentId) : agentPersona;
  const displayAgentName = routedAgent?.name || currentRoutingFeedback?.agentName || agentName;
  const displayAgentColor = routedAgent?.color || agentColor;

  if (isLoadingThreads || isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--vicy-bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--vicy-text-tertiary)' }} />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--vicy-bg)' }}>
        <div className="text-center px-4">
          <p className="text-sm mb-2" style={{ color: 'var(--vicy-text-secondary)' }}>Conversation not found</p>
          <button
            onClick={handleBack}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--vicy-bg)' }}>
        <div className="text-center px-4">
          <p className="text-sm text-red-400 mb-2">Failed to load messages</p>
          <button
            onClick={handleBack}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--vicy-bg)' }}>
      {/* Main Chat Area */}
      <div className={cn(
        'flex flex-col flex-1 min-w-0 transition-all duration-300',
        isArtifactPanelOpen && 'lg:w-[60%]'
      )}>
        {/* Minimal Header */}
        <header
          className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b"
          style={{ borderColor: 'var(--vicy-border)' }}
        >
          <button
            onClick={handleBack}
            className="vicy-icon-btn !w-8 !h-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Agent dot + name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: displayAgentColor }}
            />
            <span className="text-sm font-medium truncate" style={{ color: 'var(--vicy-text-primary)' }}>
              {thread.subject || displayAgentName}
            </span>
            {isTyping && (
              <span className="text-xs text-violet-400 flex-shrink-0">typing...</span>
            )}
          </div>

          {/* Artifacts toggle */}
          {!isArtifactPanelOpen && threadHasArtifacts && latestArtifactId && (
            <button
              onClick={() => openArtifactById(latestArtifactId)}
              className="vicy-icon-btn !w-8 !h-8"
              title="Open results"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </header>

        {/* Routing feedback as inline system message */}
        {currentRoutingFeedback && (
          <div
            className="flex items-center gap-2 px-6 py-2 text-xs border-b"
            style={{
              borderColor: 'var(--vicy-border)',
              color: 'var(--vicy-text-tertiary)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: displayAgentColor }}
            />
            <span>
              Routed to <span style={{ color: displayAgentColor }}>{displayAgentName}</span>
              {currentRoutingFeedback.confidence >= 0.8 && ' — high confidence'}
            </span>
            <button
              onClick={() => clearRoutingFeedback(threadId)}
              className="ml-auto hover:text-zinc-400 transition-colors"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Message Stream */}
        <MessageStream
          messages={messages}
          isLoading={isLoadingMessages}
          isTyping={isTyping}
          agentName={displayAgentName}
          agentColor={displayAgentColor}
        />

        {/* Composer */}
        <VicyComposer
          onSend={handleSendMessage}
          isLoading={sendMutation.isPending}
          placeholder={`Message ${displayAgentName}...`}
          activeAgentId={routedAgentId}
          activeAgentName={displayAgentName}
          activeAgentColor={displayAgentColor}
        />
      </div>

      {/* Artifact Panel */}
      {isArtifactPanelOpen && (
        <div className="hidden lg:flex w-[40%] min-w-[400px] max-w-[600px]">
          <ArtifactPanel />
        </div>
      )}
    </div>
  );
}
