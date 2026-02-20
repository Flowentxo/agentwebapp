"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { ConversationsList } from './ConversationsList';
import { AgentChat } from './AgentChat';
import { ContextSidebar } from './ContextSidebar';
import {
  generateConversations,
  getQuickPrompts,
  slashCommands,
  getAgentContext,
  getAgentIncidents,
  getAgentTasks,
} from './demoData';
import { type Agent } from '../AgentsTable';
import { type Conversation, type ComposerMode, type ChatMessage, type MessageFeedback } from './types';
import { useToast } from '@/components/ui/toast';

interface ToolCallInfo {
  status: 'start' | 'complete';
  tool: string;
  displayName: string;
  args?: Record<string, any>;
  result?: {
    success: boolean;
    summary: string;
    data?: any;
  };
}

interface ChatInterfaceProps {
  agents: Agent[];
}

export function ChatInterface({ agents }: ChatInterfaceProps) {
  // Initialize conversations from agents
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    generateConversations(agents)
  );

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    conversations[0]?.id
  );

  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { push: showToast } = useToast();

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handle sending a message with real API call
  const handleSendMessage = useCallback(async (message: string, mode: ComposerMode) => {
    if (!activeConversation) return;

    const agentId = activeConversation.agentId;

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      type: 'text',
      content: message,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              lastMessage: message.slice(0, 60) + '...',
              lastActivity: new Date(),
            }
          : conv
      )
    );

    setIsLoading(true);
    setStreamingContent('');
    setActiveToolCalls([]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': 'default',
        },
        body: JSON.stringify({
          content: message,
          mode: mode // Send the composer mode (chat, ask, instruct)
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error codes
        if (errorData.errorCode === 'BUDGET_EXCEEDED') {
          showToast({
            title: 'Budget Limit erreicht',
            description: errorData.budgetDetails
              ? `Tagesbudget von $${errorData.budgetDetails.dailyLimit.toFixed(2)} ausgeschöpft. Bitte morgen erneut versuchen oder Plan upgraden.`
              : 'Dein Budget-Limit wurde erreicht. Bitte aufladen oder morgen erneut versuchen.',
            variant: 'error',
            duration: 8000,
          });
          throw new Error('Budget-Limit erreicht');
        }

        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                accumulatedResponse += data.chunk;
                setStreamingContent(accumulatedResponse);
              }

              // Handle tool calls (Emmie agentic behavior)
              if (data.toolCall) {
                const toolInfo = data.toolCall as ToolCallInfo;

                if (toolInfo.status === 'start') {
                  // Add new tool call to active list
                  setActiveToolCalls((prev) => [...prev, toolInfo]);

                  // Add tool start message to conversation
                  const toolStartMessage: ChatMessage = {
                    id: `tool-start-${Date.now()}-${toolInfo.tool}`,
                    role: 'agent',
                    type: 'tool-output',
                    content: `${toolInfo.displayName}...`,
                    timestamp: new Date(),
                    agentId: activeConversation.agentId,
                    agentName: activeConversation.agentName,
                    toolName: toolInfo.tool,
                    metadata: { status: 'running', args: toolInfo.args },
                  };

                  setConversations((prev) =>
                    prev.map((conv) =>
                      conv.id === activeConversationId
                        ? { ...conv, messages: [...conv.messages, toolStartMessage] }
                        : conv
                    )
                  );
                } else if (toolInfo.status === 'complete') {
                  // Update the tool message with result
                  setConversations((prev) =>
                    prev.map((conv) =>
                      conv.id === activeConversationId
                        ? {
                            ...conv,
                            messages: conv.messages.map((msg) =>
                              msg.toolName === toolInfo.tool && msg.metadata?.status === 'running'
                                ? {
                                    ...msg,
                                    content: toolInfo.result?.success
                                      ? `${toolInfo.displayName}: ${toolInfo.result.summary}`
                                      : `${toolInfo.displayName}: Fehler - ${toolInfo.result?.summary}`,
                                    metadata: {
                                      ...msg.metadata,
                                      status: toolInfo.result?.success ? 'success' : 'error',
                                      result: toolInfo.result,
                                    },
                                  }
                                : msg
                            ),
                          }
                        : conv
                    )
                  );

                  // Remove from active tool calls
                  setActiveToolCalls((prev) =>
                    prev.filter((tc) => tc.tool !== toolInfo.tool)
                  );
                }
              }

              if (data.done) {
                // Add final agent message
                const agentMessage: ChatMessage = {
                  id: `msg-${Date.now() + 1}`,
                  role: 'agent',
                  type: 'text',
                  content: accumulatedResponse,
                  timestamp: new Date(),
                  agentId: activeConversation.agentId,
                  agentName: activeConversation.agentName,
                  tokens: data.metrics?.tokens,
                  latency: data.metrics?.latencyMs ? data.metrics.latencyMs / 1000 : undefined,
                };

                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === activeConversationId
                      ? {
                          ...conv,
                          messages: [...conv.messages, agentMessage],
                          lastMessage: accumulatedResponse.slice(0, 60) + '...',
                          lastActivity: new Date(),
                        }
                      : conv
                  )
                );

                setStreamingContent('');
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);

      if (error.name !== 'AbortError') {
        // Suppress auth errors — forceLogout() handles redirect silently
        const errMsg = (error.message || '').toLowerCase();
        if (errMsg.includes('auth') || errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('token')) {
          return;
        }

        // Add error message to conversation
        const errorMessage: ChatMessage = {
          id: `msg-error-${Date.now()}`,
          role: 'agent',
          type: 'text',
          content: `Fehler: ${error.message || 'Nachricht konnte nicht gesendet werden.'}`,
          timestamp: new Date(),
          agentId: activeConversation.agentId,
          agentName: activeConversation.agentName,
        };

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, errorMessage],
                  lastMessage: 'Fehler aufgetreten',
                  lastActivity: new Date(),
                }
              : conv
          )
        );
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      setActiveToolCalls([]);
      abortControllerRef.current = null;
    }
  }, [activeConversation, activeConversationId]);

  // Handle feedback
  const handleFeedback = useCallback((messageId: string, feedback: MessageFeedback) => {
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        messages: conv.messages.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg
        ),
      }))
    );
  }, []);

  // Handle re-run
  const handleReRun = useCallback((messageId: string) => {
    console.log('Re-run message:', messageId);
    // Find the message and re-send it
    if (!activeConversation) return;

    const message = activeConversation.messages.find(m => m.id === messageId);
    if (message && message.role === 'user') {
      handleSendMessage(message.content, 'question');
    }
  }, [activeConversation, handleSendMessage]);

  // Handle pin toggle
  const handleTogglePin = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, isPinned: !conv.isPinned } : conv
      )
    );
  }, []);

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        Wähle einen Agent aus der Liste
      </div>
    );
  }

  // Create a modified conversation with streaming content if active
  const displayConversation = streamingContent
    ? {
        ...activeConversation,
        messages: [
          ...activeConversation.messages,
          {
            id: 'streaming',
            role: 'agent' as const,
            type: 'text' as const,
            content: streamingContent,
            timestamp: new Date(),
            agentId: activeConversation.agentId,
            agentName: activeConversation.agentName,
          },
        ],
      }
    : activeConversation;

  return (
    <div className="grid h-full grid-cols-[300px_1fr_320px] gap-0">
      {/* Left: Conversations List */}
      <ConversationsList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onTogglePin={handleTogglePin}
      />

      {/* Center: Agent Chat */}
      <AgentChat
        conversation={displayConversation}
        onSendMessage={handleSendMessage}
        onFeedback={handleFeedback}
        onReRun={handleReRun}
        quickPrompts={getQuickPrompts(activeConversation.agentId)}
        slashCommands={slashCommands}
        isLoading={isLoading && !streamingContent}
      />

      {/* Right: Context Sidebar */}
      <ContextSidebar
        agentContext={getAgentContext(activeConversation.agentId)}
        incidents={getAgentIncidents(activeConversation.agentId)}
        tasks={getAgentTasks(activeConversation.agentId)}
      />
    </div>
  );
}
