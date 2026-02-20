'use client';

/**
 * Flowent Inbox v3 - ChatSidebar Component
 * Grok-style chat list with conversation previews
 *
 * Features:
 * - Search input with keyboard shortcut
 * - New chat button with Agent Selection Modal
 * - Grouped conversations by date (Today, Yesterday, This Week, Earlier)
 * - Conversation preview with last message, time, unread indicator
 * - Context menu (archive, delete) with Portal for proper z-index
 */

import { useMemo, useState, RefObject, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useThreadsInfinite, useArchiveThread, useDeleteThread } from '@/lib/hooks/useInbox';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { useInboxSocket } from '@/lib/socket';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Search,
  Plus,
  MessageSquare,
  Archive,
  Trash2,
  MoreHorizontal,
  Check,
  CheckSquare,
  Square,
  X,
  Mail,
  PanelLeftClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import type { Thread } from '@/types/inbox';
import { getAgentById } from '@/lib/agents/personas';
import { NewChatModal } from './NewChatModal';
import { AgentStack } from './AgentStack';

interface ChatSidebarProps {
  searchInputRef: RefObject<HTMLInputElement>;
  onSelectThread?: () => void;
}

// Date group helpers
function getDateGroup(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Heute';
  if (isYesterday(d)) return 'Gestern';
  if (isThisWeek(d)) return 'Diese Woche';
  return 'Früher';
}

function groupThreadsByDate(threads: Thread[]): Map<string, Thread[]> {
  const groups = new Map<string, Thread[]>();
  const order = ['Heute', 'Gestern', 'Diese Woche', 'Früher'];

  // Initialize groups in order
  order.forEach((group) => groups.set(group, []));

  threads.forEach((thread) => {
    const group = getDateGroup(thread.updatedAt || thread.createdAt);
    const existing = groups.get(group) || [];
    existing.push(thread);
    groups.set(group, existing);
  });

  // Remove empty groups
  order.forEach((group) => {
    if (groups.get(group)?.length === 0) {
      groups.delete(group);
    }
  });

  return groups;
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'jetzt';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function ChatSidebar({
  searchInputRef,
  onSelectThread,
}: ChatSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const currentThreadId = params?.threadId as string | undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { viewMode, setViewMode, toggleSidebar } = useInboxStore();

  // Batch selection handlers
  const toggleSelect = (threadId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === threads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(threads.map(t => t.id)));
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchArchive = async () => {
    for (const id of selectedIds) {
      await archiveMutation.mutateAsync(id);
    }
    exitSelectMode();
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync({ threadId: id });
    }
    if (currentThreadId && selectedIds.has(currentThreadId)) {
      router.push('/inbox');
    }
    exitSelectMode();
  };

  const handleBatchMarkRead = async () => {
    // Send batch mark-read via chat prompt (tool execution)
    const ids = Array.from(selectedIds);
    // For now, mark read individually - could be batched via Emmie tool
    exitSelectMode();
  };

  // Real-time socket connection for live updates
  const { isConnected, subscribeToThread, unsubscribeFromThread } = useInboxSocket();

  // Subscribe to current thread for real-time updates
  useEffect(() => {
    if (currentThreadId && isConnected) {
      subscribeToThread(currentThreadId);
      return () => unsubscribeFromThread(currentThreadId);
    }
  }, [currentThreadId, isConnected, subscribeToThread, unsubscribeFromThread]);

  // Fetch threads with search
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useThreadsInfinite({
    status: viewMode === 'completed' ? 'completed' : viewMode === 'drafts' ? 'suspended' : 'active',
    search: searchQuery || undefined,
    limit: 20,
  });

  // Mutations
  const archiveMutation = useArchiveThread();
  const deleteMutation = useDeleteThread();

  // Flatten and group threads
  const threads = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.threads || []);
  }, [data]);

  const groupedThreads = useMemo(() => groupThreadsByDate(threads), [threads]);

  const handleSelectThread = (threadId: string) => {
    router.push(`/inbox/${threadId}`);
    onSelectThread?.();
  };

  const handleNewChatClick = () => {
    setIsNewChatModalOpen(true);
  };

  const handleThreadCreated = (threadId: string) => {
    onSelectThread?.();
  };

  const handleArchive = async (threadId: string) => {
    await archiveMutation.mutateAsync(threadId);
  };

  const handleDelete = async (threadId: string) => {
    await deleteMutation.mutateAsync({ threadId });
    if (currentThreadId === threadId) {
      router.push('/inbox');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Grok-style ultra minimal */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              title="Sidebar schließen"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-medium text-white/50">Chats</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => isSelectMode ? exitSelectMode() : setIsSelectMode(true)}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                isSelectMode
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-white/40 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/70'
              )}
              title={isSelectMode ? 'Exit select mode (X)' : 'Select mode'}
            >
              {isSelectMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            </button>
            <button
              onClick={handleNewChatClick}
              className="p-1.5 rounded-lg text-white/40 bg-white/[0.04]
                hover:bg-white/[0.08] hover:text-white/70 transition-all"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input - Ultra minimal */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 group-focus-within:text-white/60 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chats durchsuchen..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-violet-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(139,92,246,0.1)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* View Mode Toggle - Task Board Tabs */}
        <div className="flex mt-3 gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
          {([
            { key: 'active' as const, label: 'Aktiv' },
            { key: 'completed' as const, label: 'Erledigt' },
            { key: 'drafts' as const, label: 'Entwürfe' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={cn(
                'flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === tab.key
                  ? 'bg-white/[0.10] text-white shadow-sm'
                  : 'text-white/35 hover:text-white/60'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Select Bar */}
      {isSelectMode && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-violet-500/[0.06] border-b border-violet-500/20">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            {selectedIds.size === threads.length && threads.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span>{selectedIds.size > 0 ? `${selectedIds.size} ausgewaehlt` : 'Alle auswaehlen'}</span>
          </button>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleBatchArchive}
                className="p-1.5 text-white/50 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Archivieren"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleBatchMarkRead}
                className="p-1.5 text-white/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Als gelesen markieren"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleBatchDelete}
                className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Loeschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Divider - Ultra minimal */}
      <div className="h-px bg-white/[0.04] mx-4" />

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {isLoading ? (
          <div className="px-4 py-2 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-muted-foreground text-xs">
              {searchQuery
                ? 'Keine Treffer'
                : viewMode === 'completed'
                ? 'Keine erledigten Chats'
                : viewMode === 'drafts'
                ? 'Noch keine Entwürfe'
                : 'Noch keine Chats'}
            </p>
            {!searchQuery && viewMode === 'active' && (
              <button
                onClick={handleNewChatClick}
                className="mt-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
              >
                Chat starten
              </button>
            )}
          </div>
        ) : (
          <div className="py-1">
            {Array.from(groupedThreads.entries()).map(([group, groupThreads]) => (
              <div key={group}>
                {/* Date Group Header */}
                <div className="px-4 py-1.5 mt-4 first:mt-0 text-[10px] font-medium text-zinc-500 uppercase tracking-widest border-t border-white/5 pt-3">
                  {group}
                </div>

                {/* Threads in Group */}
                {groupThreads.map((thread) => (
                  <ConversationItem
                    key={thread.id}
                    thread={thread}
                    isActive={currentThreadId === thread.id}
                    onSelect={() => isSelectMode ? toggleSelect(thread.id) : handleSelectThread(thread.id)}
                    onArchive={() => handleArchive(thread.id)}
                    onDelete={() => handleDelete(thread.id)}
                    isSelectMode={isSelectMode}
                    isSelected={selectedIds.has(thread.id)}
                    onToggleSelect={() => toggleSelect(thread.id)}
                  />
                ))}
              </div>
            ))}

            {/* Load More */}
            {hasNextPage && (
              <div className="px-4 py-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isFetchingNextPage ? 'Laden...' : 'Mehr laden'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Chat Modal with Agent Selection */}
      <NewChatModal
        open={isNewChatModalOpen}
        onOpenChange={setIsNewChatModalOpen}
        onThreadCreated={handleThreadCreated}
      />
    </div>
  );
}

// Individual conversation item
interface ConversationItemProps {
  thread: Thread;
  isActive: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function ConversationItem({
  thread,
  isActive,
  onSelect,
  onArchive,
  onDelete,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: ConversationItemProps) {
  const hasUnread = (thread.unreadCount || 0) > 0;

  // Get agent color for avatar
  const agent = getAgentById(thread.agentId);
  const agentColor = agent?.color || '#6b7280';
  const involvedAgents = thread.metadata?.involvedAgents;

  return (
    <div
      className={cn(
        'group relative mx-2 rounded-xl border-b border-white/[0.04] transition-all cursor-pointer',
        isSelected && isSelectMode
          ? 'bg-violet-500/[0.06] border-l-[3px] border-l-violet-500/50'
          : isActive
          ? 'bg-violet-500/[0.10] border-l-[3px] border-l-violet-500'
          : 'hover:bg-white/[0.04] border-l-[3px] border-l-transparent'
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-3" onClick={onSelect}>
        {/* Select Mode Checkbox */}
        {isSelectMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors"
            style={isSelected ? { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' } : { borderColor: 'rgba(255,255,255,0.2)' }}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* Agent Avatar */}
        <div className="relative flex-shrink-0">
          {involvedAgents && involvedAgents.length > 1 ? (
            <AgentStack agents={involvedAgents} max={3} size="sm" />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: agentColor + '18' }}
            >
              <span className="text-[11px] font-bold" style={{ color: agentColor }}>
                {(agent?.name || thread.agentName || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Online status dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1a]" />
        </div>

        {/* Title + timestamp */}
        {(() => {
          const raw = thread.subject || thread.preview?.slice(0, 45) || '';
          const cleaned = raw.trim();
          let title: string;
          if (!cleaned || /^(hey|hi|hallo|hello|yo|test|new chat|hej|moin|neues gespraech|unbenanntes projekt)$/i.test(cleaned)) {
            const preview = thread.preview?.trim();
            if (preview && preview.length > 5) {
              const words = preview.split(/\s+/);
              title = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
            } else {
              title = 'Unbenanntes Projekt';
            }
          } else {
            title = cleaned;
          }
          const isUntitled = title === 'Unbenanntes Projekt';
          return (
            <h3
              className={cn(
                'flex-1 min-w-0 text-sm truncate',
                isActive
                  ? 'font-semibold text-white'
                  : isUntitled
                    ? 'font-normal text-zinc-500 italic'
                    : 'font-medium text-zinc-300'
              )}
            >
              {title}
            </h3>
          );
        })()}

        {/* Timestamp removed for cleaner look */}

        {/* Unread indicator removed for cleaner look */}
      </div>

      {/* Context Menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute top-3 right-2.5 p-1 rounded-lg transition-opacity',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'opacity-0 sm:group-hover:opacity-100 focus:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className={cn(
              'z-50 min-w-[120px] py-1',
              'bg-[#111] border border-white/[0.08] rounded-xl shadow-lg backdrop-blur-xl',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
            )}
          >
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs text-foreground',
                'cursor-pointer outline-none',
                'hover:bg-muted focus:bg-muted transition-colors'
              )}
            >
              <Archive className="w-3.5 h-3.5" />
              Archivieren
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs text-red-600',
                'cursor-pointer outline-none',
                'hover:bg-red-500/10 focus:bg-red-500/10 transition-colors'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Löschen
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
