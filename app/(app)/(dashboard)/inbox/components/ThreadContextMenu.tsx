'use client';

/**
 * Flowent Inbox v2 - Thread Context Menu
 * Right-click or "..." button menu for thread actions
 *
 * Phase 4: Thread management actions (Archive, Mark Unread, Delete)
 */

import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  CircleDot,
  Check,
  Trash2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Thread } from '@/types/inbox';

interface ThreadContextMenuProps {
  thread: Thread;
  onArchive: (threadId: string) => void;
  onUnarchive: (threadId: string) => void;
  onMarkUnread: (threadId: string) => void;
  onMarkRead: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  children?: React.ReactNode;
  asContextMenu?: boolean;
}

export function ThreadContextMenu({
  thread,
  onArchive,
  onUnarchive,
  onMarkUnread,
  onMarkRead,
  onDelete,
  children,
  asContextMenu = false,
}: ThreadContextMenuProps) {
  const [open, setOpen] = useState(false);

  const isArchived = thread.status === 'archived';
  const isUnread = thread.unreadCount > 0;

  const handleArchive = () => {
    if (isArchived) {
      onUnarchive(thread.id);
    } else {
      onArchive(thread.id);
    }
    setOpen(false);
  };

  const handleToggleRead = () => {
    if (isUnread) {
      onMarkRead(thread.id);
    } else {
      onMarkUnread(thread.id);
    }
    setOpen(false);
  };

  const handleDelete = () => {
    onDelete(thread.id);
    setOpen(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(thread.id);
    setOpen(false);
  };

  const menuContent = (
    <DropdownMenu.Content
      className={cn(
        'min-w-[180px] bg-card border-2 border-border rounded-xl shadow-lg py-1 z-50',
        'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2'
      )}
      sideOffset={5}
      align="end"
    >
      {/* Read/Unread Toggle */}
      <DropdownMenu.Item
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer outline-none transition-colors"
        onSelect={handleToggleRead}
      >
        {isUnread ? (
          <>
            <Check className="w-4 h-4" />
            <span>Mark as read</span>
          </>
        ) : (
          <>
            <CircleDot className="w-4 h-4" />
            <span>Mark as unread</span>
          </>
        )}
      </DropdownMenu.Item>

      {/* Archive/Unarchive */}
      <DropdownMenu.Item
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer outline-none transition-colors"
        onSelect={handleArchive}
      >
        {isArchived ? (
          <>
            <ArchiveRestore className="w-4 h-4" />
            <span>Restore from archive</span>
          </>
        ) : (
          <>
            <Archive className="w-4 h-4" />
            <span>Archive</span>
          </>
        )}
      </DropdownMenu.Item>

      <DropdownMenu.Separator className="h-px bg-slate-200 my-1" />

      {/* Copy Thread ID */}
      <DropdownMenu.Item
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer outline-none transition-colors"
        onSelect={handleCopyId}
      >
        <Copy className="w-4 h-4" />
        <span>Copy thread ID</span>
      </DropdownMenu.Item>

      {/* Open in New Tab (placeholder) */}
      <DropdownMenu.Item
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer outline-none transition-colors"
        onSelect={() => {
          window.open(`/inbox/${thread.id}`, '_blank');
          setOpen(false);
        }}
      >
        <ExternalLink className="w-4 h-4" />
        <span>Open in new tab</span>
      </DropdownMenu.Item>

      <DropdownMenu.Separator className="h-px bg-slate-200 my-1" />

      {/* Delete */}
      <DropdownMenu.Item
        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-500/10 cursor-pointer outline-none transition-colors"
        onSelect={handleDelete}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  );

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {children || (
          <button
            data-testid="thread-actions"
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              open && 'bg-muted text-foreground'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>{menuContent}</DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Standalone trigger button for the context menu
 * Shows on hover over thread items
 */
export function ThreadActionsButton({
  thread,
  onArchive,
  onUnarchive,
  onMarkUnread,
  onMarkRead,
  onDelete,
  className,
}: Omit<ThreadContextMenuProps, 'children' | 'asContextMenu'> & {
  className?: string;
}) {
  return (
    <div
      className={cn('opacity-0 group-hover:opacity-100 transition-opacity', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <ThreadContextMenu
        thread={thread}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onMarkUnread={onMarkUnread}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
      />
    </div>
  );
}
