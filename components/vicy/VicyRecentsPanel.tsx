'use client';

import { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useThreads } from '@/lib/hooks/useInbox';
import { getAgentById } from '@/lib/agents/personas';
import { X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import type { Thread } from '@/types/inbox';

interface VicyRecentsPanelProps {
  onClose: () => void;
}

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

  for (const label of order) {
    groups.set(label, []);
  }

  for (const thread of threads) {
    const group = getDateGroup(thread.lastMessageAt || thread.createdAt);
    const existing = groups.get(group) || [];
    existing.push(thread);
    groups.set(group, existing);
  }

  // Remove empty groups
  for (const [key, value] of groups) {
    if (value.length === 0) groups.delete(key);
  }

  return groups;
}

export function VicyRecentsPanel({ onClose }: VicyRecentsPanelProps) {
  const router = useRouter();
  const params = useParams();
  const activeThreadId = params?.threadId as string | undefined;

  const { data: threads, isLoading } = useThreads();

  const grouped = useMemo(() => {
    if (!threads) return new Map();
    const sorted = [...threads].sort((a, b) => {
      const aDate = a.lastMessageAt || a.createdAt;
      const bDate = b.lastMessageAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return groupThreadsByDate(sorted);
  }, [threads]);

  const handleSelectThread = (threadId: string) => {
    router.push(`/v4/${threadId}`);
  };

  return (
    <div
      className="w-[280px] h-full flex flex-col border-r vicy-panel-enter"
      style={{
        backgroundColor: '#0D0D0D',
        borderColor: 'var(--vicy-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--vicy-border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--vicy-text-primary)' }}>
          Recents
        </span>
        <button
          onClick={onClose}
          className="vicy-icon-btn !w-7 !h-7"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : grouped.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="w-8 h-8 mb-3" style={{ color: 'var(--vicy-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--vicy-text-secondary)' }}>
              No conversations yet
            </p>
          </div>
        ) : (
          Array.from(grouped).map(([group, groupThreads]) => (
            <div key={group}>
              <div className="px-4 py-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--vicy-text-tertiary)' }}>
                  {group}
                </span>
              </div>
              {groupThreads.map((thread) => {
                const agent = getAgentById(thread.agentId);
                const isActive = thread.id === activeThreadId;

                return (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 transition-colors',
                      isActive
                        ? 'bg-white/[0.06]'
                        : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Agent Color Dot */}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: agent?.color || '#6b7280' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--vicy-text-primary)' }}>
                          {thread.subject || 'Untitled'}
                        </p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--vicy-text-tertiary)' }}>
                          {agent?.name || thread.agentName || 'AI'}
                          {thread.lastMessageAt && (
                            <> &middot; {format(parseISO(thread.lastMessageAt), 'h:mm a')}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
