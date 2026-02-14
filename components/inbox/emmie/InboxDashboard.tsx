'use client';

/**
 * Emmie Inbox Intelligence Dashboard
 *
 * Features:
 * - Stats cards: Unread, Starred, Important, Drafts
 * - AI Inbox Summary (1-click, cached)
 * - Action Items extraction as checklist
 * - Quick access buttons
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Star,
  AlertTriangle,
  FileEdit,
  Sparkles,
  CheckSquare,
  Loader2,
  RefreshCw,
  Inbox,
  ArrowRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxStats {
  unreadCount: number;
  starredCount: number;
  importantCount: number;
  totalInbox: number;
  draftsCount: number;
}

interface ActionItem {
  text: string;
  done: boolean;
}

interface InboxDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPrompt: (prompt: string) => void;
  agentColor?: string;
}

export function InboxDashboard({
  isOpen,
  onClose,
  onSendPrompt,
  agentColor = '#8B5CF6',
}: InboxDashboardProps) {
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  // Load stats on open
  useEffect(() => {
    if (isOpen && !stats) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      // Trigger stats via chat prompt to Emmie
      onSendPrompt('Zeige mir meine aktuellen Inbox-Statistiken: Ungelesene, Markierte, Wichtige und Entwuerfe.');
      // For now, show placeholder - real data would come from gmail_stats tool response
      setStats({
        unreadCount: 0,
        starredCount: 0,
        importantCount: 0,
        totalInbox: 0,
        draftsCount: 0,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [onSendPrompt]);

  const loadSummary = useCallback(() => {
    setIsLoadingSummary(true);
    onSendPrompt('Fasse meinen Posteingang zusammen: Was sind die wichtigsten ungelesenen Emails? Gruppiere nach Prioritaet.');
    // Summary will appear in chat
    setTimeout(() => setIsLoadingSummary(false), 1000);
  }, [onSendPrompt]);

  const loadActionItems = useCallback(() => {
    setIsLoadingActions(true);
    onSendPrompt('Extrahiere alle Action Items und TODOs aus meinen letzten 20 Emails. Liste sie als Checklist auf.');
    setTimeout(() => setIsLoadingActions(false), 1000);
  }, [onSendPrompt]);

  const toggleActionItem = useCallback((index: number) => {
    setActionItems(prev => prev.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    ));
  }, []);

  if (!isOpen) return null;

  const statCards = [
    { icon: Mail, label: 'Ungelesen', value: stats?.unreadCount ?? '—', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: Star, label: 'Markiert', value: stats?.starredCount ?? '—', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { icon: AlertTriangle, label: 'Wichtig', value: stats?.importantCount ?? '—', color: 'text-red-400', bg: 'bg-red-500/10' },
    { icon: FileEdit, label: 'Entwuerfe', value: stats?.draftsCount ?? '—', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  const quickActions = [
    { label: 'Ungelesene oeffnen', prompt: 'Zeige mir meine ungelesenen Emails sortiert nach Datum.' },
    { label: 'Wichtige zuerst', prompt: 'Zeige mir die wichtigsten Emails die sofortige Aufmerksamkeit brauchen.' },
    { label: 'Newsletter aufraumen', prompt: 'Finde Newsletter und Mailing-Listen in meinem Posteingang. Welche kann ich abbestellen?' },
    { label: 'Unbeantwortete finden', prompt: 'Finde Emails auf die ich noch nicht geantwortet habe und die eine Antwort erwarten.' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4" style={{ color: agentColor }} />
          <h2 className="text-sm font-medium text-white">Inbox Dashboard</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex items-center gap-3 p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.bg)}>
                  <Icon className={cn('w-4.5 h-4.5', card.color)} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{card.value}</p>
                  <p className="text-[11px] text-white/40">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Summary Section */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-medium text-white">AI Inbox-Zusammenfassung</h3>
            </div>
            <button
              onClick={loadSummary}
              disabled={isLoadingSummary}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/40 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
            >
              {isLoadingSummary ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{summary ? 'Aktualisieren' : 'Generieren'}</span>
            </button>
          </div>
          {summary ? (
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{summary}</p>
          ) : (
            <p className="text-sm text-white/30 italic">
              Klicke "Generieren" um eine AI-Zusammenfassung deines Posteingangs zu erhalten.
              Die Antwort erscheint im Chat.
            </p>
          )}
        </div>

        {/* Action Items Section */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-white">Action Items</h3>
            </div>
            <button
              onClick={loadActionItems}
              disabled={isLoadingActions}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
            >
              {isLoadingActions ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Extrahieren</span>
            </button>
          </div>
          {actionItems.length > 0 ? (
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleActionItem(i)}
                  className="w-full flex items-start gap-2.5 px-2 py-1.5 text-left rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                    item.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-white/20 hover:border-white/40'
                  )}>
                    {item.done && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={cn(
                    'text-sm',
                    item.done ? 'text-white/30 line-through' : 'text-white/70'
                  )}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 italic">
              TODOs und Deadlines aus deinen Emails extrahieren.
              Die Ergebnisse erscheinen im Chat.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Schnellzugriff</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => { onSendPrompt(action.prompt); onClose(); }}
                className="flex items-center justify-between px-3 py-2.5 text-xs text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:text-white/80 transition-all group"
              >
                <span>{action.label}</span>
                <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
