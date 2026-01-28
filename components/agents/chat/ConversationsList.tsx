"use client";

import { Pin, PinOff } from 'lucide-react';
import { type Conversation } from './types';

interface ConversationsListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onTogglePin?: (conversationId: string) => void;
}

function formatLastActivity(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins}m`;
  if (diffHours < 24) return `vor ${diffHours}h`;
  if (diffDays < 7) return `vor ${diffDays}d`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function ConversationsList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onTogglePin,
}: ConversationsListProps) {
  const pinnedConversations = conversations.filter((c) => c.isPinned);
  const unpinnedConversations = conversations.filter((c) => !c.isPinned);

  const renderConversation = (conversation: Conversation, isPinned: boolean) => {
    const isActive = activeConversationId === conversation.id;

    return (
      <button
        key={conversation.id}
        onClick={() => onSelectConversation(conversation.id)}
        className={`
          group relative flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors
          ${
            isActive
              ? 'bg-card/10 text-text'
              : 'text-text-muted hover:bg-card/5 hover:text-text'
          }
        `}
        aria-label={`Konversation mit ${conversation.agentName}`}
        aria-current={isActive ? 'true' : undefined}
      >
        {/* Status Dot + Avatar */}
        <div className="relative flex-shrink-0 pt-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-text">
            {conversation.agentName.slice(0, 2).toUpperCase()}
          </div>
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-1 ${
              conversation.status === 'healthy'
                ? 'bg-success'
                : conversation.status === 'degraded'
                ? 'bg-warning'
                : 'bg-error'
            }`}
            aria-label={conversation.status}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm truncate ${
                conversation.unreadCount && conversation.unreadCount > 0
                  ? 'font-bold text-text'
                  : 'font-semibold text-text'
              }`}
            >
              {conversation.agentName}
            </h3>
            <time
              className="flex-shrink-0 text-[10px] leading-tight text-text-subtle tabular-nums"
              dateTime={conversation.lastActivity.toISOString()}
            >
              {formatLastActivity(conversation.lastActivity)}
            </time>
          </div>

          <p
            className={`mt-0.5 text-xs line-clamp-2 ${
              conversation.unreadCount && conversation.unreadCount > 0
                ? 'font-medium text-text-muted'
                : 'text-text-muted'
            }`}
          >
            {conversation.lastMessage || conversation.agentDescription || 'Keine Nachrichten'}
          </p>

          {/* Unread Badge */}
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <div className="mt-1 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {conversation.unreadCount}
            </div>
          )}
        </div>

        {/* Pin Toggle */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(conversation.id);
            }}
            aria-label={isPinned ? 'Konversation loslösen' : 'Konversation anheften'}
            className={`
              absolute top-2 right-2 rounded p-1 opacity-0 transition-all
              group-hover:opacity-100 focus-visible:opacity-100
              hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${isPinned ? 'text-primary opacity-100' : 'text-text-subtle'}
            `}
          >
            {isPinned ? (
              <Pin className="h-3.5 w-3.5" fill="currentColor" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-white/6 bg-surface-1">
      {/* Header */}
      <div className="border-b border-white/6 px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Konversationen</h2>
        <p className="text-xs text-text-muted">
          {conversations.length} {conversations.length === 1 ? 'Agent' : 'Agents'}
        </p>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto" role="list">
        {/* Pinned Section */}
        {pinnedConversations.length > 0 && (
          <div className="mb-2">
            <div className="px-4 py-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Favoriten
              </h3>
            </div>
            <div className="space-y-0.5 px-2">
              {pinnedConversations.map((conv) => renderConversation(conv, true))}
            </div>
          </div>
        )}

        {/* Unpinned Section */}
        {unpinnedConversations.length > 0 && (
          <div>
            <div className="px-4 py-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Zuletzt aktiv
              </h3>
            </div>
            <div className="space-y-0.5 px-2">
              {unpinnedConversations.map((conv) => renderConversation(conv, false))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">
              Keine Konversationen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
