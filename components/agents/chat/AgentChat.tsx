"use client";

import { useRef, useEffect } from 'react';
import { MessageCard } from './MessageCard';
import { ChatComposer } from './ChatComposer';
import { type Conversation, type ComposerMode, type QuickPrompt, type SlashCommand, type MessageFeedback } from './types';
import { Loader2, Bot } from 'lucide-react';

interface AgentChatProps {
  conversation: Conversation;
  onSendMessage: (message: string, mode: ComposerMode) => void;
  onFeedback?: (messageId: string, feedback: MessageFeedback) => void;
  onReRun?: (messageId: string) => void;
  quickPrompts?: QuickPrompt[];
  slashCommands?: SlashCommand[];
  isLoading?: boolean;
}

export function AgentChat({
  conversation,
  onSendMessage,
  onFeedback,
  onReRun,
  quickPrompts,
  slashCommands,
  isLoading = false,
}: AgentChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  return (
    <div className="flex h-full flex-col bg-surface-1">
      {/* Chat Header */}
      <div className="border-b border-white/6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {conversation.agentName.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <h2 className="text-lg font-semibold text-text">
                {conversation.agentName}
              </h2>
              {conversation.agentDescription && (
                <p className="text-sm text-text-muted">
                  {conversation.agentDescription}
                </p>
              )}
            </div>
          </div>

          {/* Status Chip */}
          <div
            className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${
              conversation.status === 'healthy'
                ? 'bg-success/10 text-success'
                : conversation.status === 'degraded'
                ? 'bg-warning/10 text-warning'
                : 'bg-error/10 text-error'
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                conversation.status === 'healthy'
                  ? 'bg-success'
                  : conversation.status === 'degraded'
                  ? 'bg-warning'
                  : 'bg-error'
              }`}
              aria-label={conversation.status}
            />
            {conversation.status === 'healthy'
              ? 'OK'
              : conversation.status === 'degraded'
              ? 'Eingeschränkt'
              : 'Fehler'}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4" role="log" aria-live="polite" aria-atomic="false">
        {conversation.messages.length === 0 ? (
          // Empty State
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-16 w-16 text-text-subtle opacity-50" />
            <div>
              <h3 className="text-lg font-semibold text-text">
                Starte eine Konversation mit {conversation.agentName}
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Stelle eine Frage, gib einen Befehl ein oder nutze die Quick-Prompts.
              </p>
            </div>
          </div>
        ) : (
          // Messages List
          <div className="space-y-6">
            {conversation.messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                onFeedback={onFeedback}
                onReRun={onReRun}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {conversation.agentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Denkt nach...</span>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <ChatComposer
        onSend={onSendMessage}
        quickPrompts={quickPrompts}
        slashCommands={slashCommands}
        isLoading={isLoading}
      />
    </div>
  );
}
