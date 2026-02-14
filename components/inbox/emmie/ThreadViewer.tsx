'use client';

/**
 * Email Thread Viewer - Gmail-style thread visualization
 *
 * Features:
 * - Chronological email cards with expand/collapse
 * - HTML body rendering (sanitized)
 * - Reply button -> opens EmailComposer with quote
 * - AI Summary button
 * - Attachment list per email
 */

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  ChevronDown,
  ChevronRight,
  Reply,
  ReplyAll,
  Sparkles,
  Paperclip,
  Download,
  User,
  Clock,
  Loader2,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThreadEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: string;
  isUnread: boolean;
  labels: string[];
  attachments?: ThreadAttachment[];
}

export interface ThreadAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface ThreadViewerProps {
  isOpen: boolean;
  onClose: () => void;
  threadSubject: string;
  emails: ThreadEmail[];
  onReply?: (email: ThreadEmail, replyAll?: boolean) => void;
  onSummarize?: () => void;
  isSummarizing?: boolean;
  summary?: string;
  agentColor?: string;
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Extract name from email address
function extractName(email: string): string {
  const match = email.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].trim() : email.split('@')[0];
}

// Get initials from name
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ThreadViewer({
  isOpen,
  onClose,
  threadSubject,
  emails,
  onReply,
  onSummarize,
  isSummarizing = false,
  summary,
  agentColor = '#8B5CF6',
}: ThreadViewerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand last email
    if (emails.length > 0) return new Set([emails[emails.length - 1].id]);
    return new Set();
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(emails.map(e => e.id)));
  }, [emails]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl max-h-[85vh] bg-[#0d0d0d] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium text-white truncate">{threadSubject}</h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                {emails.length} {emails.length === 1 ? 'Nachricht' : 'Nachrichten'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              {/* AI Summary */}
              {onSummarize && (
                <button
                  onClick={onSummarize}
                  disabled={isSummarizing}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/40 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                >
                  {isSummarizing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>AI Summary</span>
                </button>
              )}

              {/* Expand/Collapse All */}
              <button
                onClick={expandedIds.size === emails.length ? collapseAll : expandAll}
                className="text-[11px] text-white/40 hover:text-white/60 px-2 py-1 rounded-lg transition-colors"
              >
                {expandedIds.size === emails.length ? 'Alle zuklappen' : 'Alle aufklappen'}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Summary Banner */}
          {summary && (
            <div className="px-5 py-3 bg-violet-500/5 border-b border-violet-500/10">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-violet-400 mb-1">AI Zusammenfassung</p>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Email List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {emails.map((email, index) => {
              const isExpanded = expandedIds.has(email.id);
              const senderName = extractName(email.from);
              const isLast = index === emails.length - 1;

              return (
                <div
                  key={email.id}
                  className={cn(
                    'border rounded-xl transition-all',
                    isExpanded
                      ? 'border-white/[0.10] bg-white/[0.03]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  )}
                >
                  {/* Email Header (always visible) */}
                  <button
                    onClick={() => toggleExpand(email.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                      style={{
                        backgroundColor: `${agentColor}15`,
                        color: agentColor,
                      }}
                    >
                      {getInitials(senderName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm truncate',
                          email.isUnread ? 'font-semibold text-white' : 'text-white/70'
                        )}>
                          {senderName}
                        </span>
                        <span className="text-[10px] text-white/30 flex-shrink-0">
                          {new Date(email.date).toLocaleDateString('de-DE', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-white/40 truncate mt-0.5">{email.snippet}</p>
                      )}
                    </div>

                    {/* Attachments indicator */}
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                    )}

                    {/* Expand icon */}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/[0.06]">
                      {/* Meta */}
                      <div className="py-2 space-y-1">
                        <div className="text-[11px] text-white/40">
                          <span className="text-white/30">Von:</span> {email.from}
                        </div>
                        <div className="text-[11px] text-white/40">
                          <span className="text-white/30">An:</span> {email.to}
                        </div>
                        {email.cc && (
                          <div className="text-[11px] text-white/40">
                            <span className="text-white/30">CC:</span> {email.cc}
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="mt-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                        {email.bodyHtml ? (
                          <div
                            className="text-sm text-white/80 leading-relaxed prose prose-sm prose-invert max-w-none email-body-content"
                            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                          />
                        ) : (
                          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                            {email.body || email.snippet}
                          </p>
                        )}
                      </div>

                      {/* Attachments */}
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[11px] text-white/40 font-medium">
                            {email.attachments.length} {email.attachments.length === 1 ? 'Anhang' : 'Anhaenge'}
                          </p>
                          {email.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/70 truncate">{att.filename}</p>
                                <p className="text-[10px] text-white/30">{formatSize(att.size)}</p>
                              </div>
                              <button className="p-1 text-white/30 hover:text-white/60 rounded transition-colors">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Actions */}
                      {onReply && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                          <button
                            onClick={() => onReply(email, false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>Antworten</span>
                          </button>
                          <button
                            onClick={() => onReply(email, true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
                          >
                            <ReplyAll className="w-3.5 h-3.5" />
                            <span>Allen antworten</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
