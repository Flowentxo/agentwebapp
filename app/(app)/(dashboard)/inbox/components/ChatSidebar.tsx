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
  Bot,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import type { Thread } from '@/types/inbox';
import { NewChatModal } from './NewChatModal';

interface ChatSidebarProps {
  searchInputRef: RefObject<HTMLInputElement>;
  onSelectThread?: () => void;
}

// Date group helpers
function getDateGroup(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return 'This Week';
  return 'Earlier';
}

function groupThreadsByDate(threads: Thread[]): Map<string, Thread[]> {
  const groups = new Map<string, Thread[]>();
  const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];

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

export function ChatSidebar({ searchInputRef, onSelectThread }: ChatSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const currentThreadId = params?.threadId as string | undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  const { viewMode, setViewMode } = useInboxStore();

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
    status: viewMode === 'archive' ? 'archived' : 'active',
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
    <div className="flex flex-col h-full bg-transparent">
      {/* Header - Grok-style ultra minimal */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-600 dark:text-zinc-400">Chats</h2>
            {/* Real-time connection status */}
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-muted text-muted-foreground'
              )}
              title={isConnected ? 'Real-time updates active' : 'Connecting...'}
            >
              {isConnected ? (
                <Wifi className="w-2.5 h-2.5" />
              ) : (
                <WifiOff className="w-2.5 h-2.5" />
              )}
            </div>
          </div>
          <button
            onClick={handleNewChatClick}
            className="p-1.5 rounded-lg text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-white/5
              hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input - Ultra minimal */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-600 group-focus-within:text-gray-600 dark:group-focus-within:text-white transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-gray-300 dark:focus:border-white/20 transition-all"
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

        {/* View Mode Toggle - Ultra minimal */}
        <div className="flex mt-3 gap-1">
          <button
            onClick={() => setViewMode('all')}
            className={cn(
              'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              viewMode === 'all'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400'
            )}
          >
            Active
          </button>
          <button
            onClick={() => setViewMode('archive')}
            className={cn(
              'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              viewMode === 'archive'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400'
            )}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Divider - Ultra minimal */}
      <div className="h-px bg-gray-100 dark:bg-white/[0.03] mx-4" />

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
                ? 'No matches found'
                : viewMode === 'archive'
                ? 'No archived chats'
                : 'No conversations yet'}
            </p>
            {!searchQuery && viewMode !== 'archive' && (
              <button
                onClick={handleNewChatClick}
                className="mt-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
              >
                Start conversation
              </button>
            )}
          </div>
        ) : (
          <div className="py-1">
            {Array.from(groupedThreads.entries()).map(([group, groupThreads]) => (
              <div key={group}>
                {/* Date Group Header - Ultra minimal */}
                <div className="px-4 py-1.5 text-[10px] font-medium text-gray-400 dark:text-zinc-600 uppercase tracking-wider">
                  {group}
                </div>

                {/* Threads in Group */}
                {groupThreads.map((thread) => (
                  <ConversationItem
                    key={thread.id}
                    thread={thread}
                    isActive={currentThreadId === thread.id}
                    onSelect={() => handleSelectThread(thread.id)}
                    onArchive={() => handleArchive(thread.id)}
                    onDelete={() => handleDelete(thread.id)}
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
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
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
}

function ConversationItem({
  thread,
  isActive,
  onSelect,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  const hasUnread = (thread.unreadCount || 0) > 0;
  const lastMessageTime = thread.updatedAt || thread.createdAt;
  const formattedTime = lastMessageTime
    ? isToday(parseISO(lastMessageTime))
      ? format(parseISO(lastMessageTime), 'HH:mm')
      : format(parseISO(lastMessageTime), 'MMM d')
    : '';

  return (
    <div
      className={cn(
        'group relative mx-2 mb-0.5 rounded-xl transition-all cursor-pointer',
        isActive
          ? 'bg-gray-100 dark:bg-white/[0.06]'
          : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2" onClick={onSelect}>
        {/* Avatar - Minimal */}
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3
              className={cn(
                'text-sm truncate',
                hasUnread ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-zinc-400'
              )}
            >
              {thread.subject || 'New Conversation'}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-zinc-600 flex-shrink-0">{formattedTime}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-600 truncate">
            {thread.preview || thread.agentName || 'AI Assistant'}
          </p>
        </div>

        {/* Unread indicator */}
        {hasUnread && (
          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />
        )}
      </div>

      {/* Context Menu with Portal - fixes clipping issue */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute top-2.5 right-2.5 p-1 rounded-lg transition-opacity',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
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
              'bg-card border-2 border-border rounded-xl shadow-lg',
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
              Archive
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
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
