'use client';

import { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ChevronDown,
  X,
  Download,
  RefreshCw,
  Eye,
  Copy,
  Loader2,
  Bot,
  FileText,
  Send,
  MessageSquare,
  User,
  Sparkles,
} from 'lucide-react';
import type { LogEntry, LogEntryOutput, ToolInvocation as ToolInvocationType } from './types';
import { useDashboardStore, useStreamingContent, useToolInvocations } from '@/store/useDashboardStore';
import { ToolInvocation } from './ToolInvocation';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Client-only relative time component to avoid hydration mismatch
function RelativeTime({ date }: { date: Date }) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    setMounted(true);
    setTime(formatRelativeTime(date));

    // Update every minute
    const interval = setInterval(() => {
      setTime(formatRelativeTime(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  // Render empty on server, actual time on client
  if (!mounted) return <span className="text-[10px] text-muted-foreground">...</span>;

  return <span className="text-[10px] text-muted-foreground">{time}</span>;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function getLogStyles(type: LogEntry['type']) {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-400',
        hoverBg: 'hover:bg-green-500/5',
      };
    case 'error':
      return {
        icon: XCircle,
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        hoverBg: 'hover:bg-red-500/5',
      };
    case 'warning':
      return {
        icon: AlertCircle,
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        text: 'text-yellow-400',
        hoverBg: 'hover:bg-yellow-500/5',
      };
    default:
      return {
        icon: Info,
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        hoverBg: 'hover:bg-blue-500/5',
      };
  }
}

// ============================================================================
// OUTPUT VIEWER COMPONENT
// ============================================================================

function OutputViewer({ output, onCopy }: { output: LogEntryOutput; onCopy: () => void }) {
  const handleDownload = () => {
    if (!output.downloadable || !output.filename) return;
    const blob = new Blob([output.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = output.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (output.type) {
      case 'json':
        return (
          <pre className="text-xs text-foreground bg-muted rounded-xl p-4 overflow-x-auto font-mono border-2 border-border">
            {output.content}
          </pre>
        );
      case 'code':
        return (
          <pre className="text-xs text-foreground bg-muted rounded-xl p-4 overflow-x-auto font-mono border-2 border-border">
            {output.content}
          </pre>
        );
      case 'report':
        // Level 5: Rich Markdown Rendering for Reports
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:text-foreground prose-headings:font-semibold
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
            prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
            prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1
            prose-p:text-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:text-foreground prose-ol:text-foreground
            prose-li:marker:text-primary
            prose-table:border-collapse
            prose-th:bg-muted prose-th:text-foreground prose-th:text-left prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-border
            prose-td:text-muted-foreground prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
            prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-hr:border-border
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {output.content}
            </ReactMarkdown>
          </div>
        );
      case 'text':
      default:
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {output.content}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {output.type === 'report' && (
            <FileText className="w-4 h-4 text-primary" />
          )}
          <h4 className="text-sm font-semibold text-foreground">{output.title || 'Output'}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
          {output.downloadable && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors border border-primary/20"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
        </div>
      </div>
      {renderContent()}
    </div>
  );
}

// ============================================================================
// Level 9: CONVERSATION DRAWER COMPONENT (Chat UI)
// ============================================================================

interface ConversationDrawerProps {
  entry: LogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (entry: LogEntry) => void;
}

function ConversationDrawer({ entry, isOpen, onClose, onRetry }: ConversationDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store hooks
  const replyToLog = useDashboardStore((state) => state.replyToLog);
  const getThreadHistory = useDashboardStore((state) => state.getThreadHistory);
  const isProcessing = useDashboardStore((state) => state.isProcessing);
  const streamingContent = useStreamingContent();
  const toolInvocations = useToolInvocations(); // Level 10: Get tool invocations

  // Get thread history for this entry
  const threadHistory = entry ? getThreadHistory(entry.id) : [];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadHistory, streamingContent]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleSubmitReply = useCallback(async () => {
    if (!replyInput.trim() || !entry || isProcessing) return;

    setIsSubmitting(true);
    const message = replyInput;
    setReplyInput('');

    try {
      await replyToLog(entry.id, message);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [replyInput, entry, isProcessing, replyToLog]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  if (!entry) return null;

  const styles = getLogStyles(entry.type);
  const Icon = styles.icon;

  // Render a single message in the thread
  const renderMessage = (logEntry: LogEntry, index: number) => {
    const isUser = logEntry.threadDepth !== undefined && logEntry.threadDepth > 0 && !logEntry.output;
    const hasOutput = logEntry.output?.content;
    const isRunning = logEntry.status === 'running';

    return (
      <div key={logEntry.id} className="space-y-3">
        {/* User Request */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex justify-end"
        >
          <div className="max-w-[85%] flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
              <p className="text-sm">
                {logEntry.originalCommand || logEntry.message.replace(`${logEntry.agent} completed: `, '').replace(`${logEntry.agent} is processing: `, '').replace(`${logEntry.agent} is refining: `, '').replace(`${logEntry.agent} refined: `, '')}
              </p>
              <div className="text-[10px] text-primary-foreground/70 mt-1">
                <RelativeTime date={logEntry.timestamp} />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        </motion.div>

        {/* Agent Response */}
        {(hasOutput || isRunning) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.1 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] flex items-start gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                style={{
                  backgroundColor: `${logEntry.agentColor}15`,
                  borderColor: `${logEntry.agentColor}30`,
                }}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: logEntry.agentColor }} />
                ) : (
                  <Bot className="w-4 h-4" style={{ color: logEntry.agentColor }} />
                )}
              </div>
              <div className="bg-card border-2 border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                {/* Level 10: Show tool invocations during processing */}
                {isRunning && toolInvocations.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {toolInvocations.map((inv) => (
                      <ToolInvocation
                        key={inv.toolCallId}
                        invocation={inv}
                        agentColor={logEntry.agentColor}
                      />
                    ))}
                  </div>
                )}

                {isRunning && streamingContent ? (
                  <div className="prose prose-sm max-w-none prose-slate">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  </div>
                ) : isRunning && !toolInvocations.length ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="w-4 h-4 animate-pulse text-primary" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : isRunning ? null : (
                  <>
                    {/* Level 10: Show tool invocations for completed entries */}
                    {logEntry.toolInvocations && logEntry.toolInvocations.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {logEntry.toolInvocations.map((inv) => (
                          <ToolInvocation
                            key={inv.toolCallId}
                            invocation={inv}
                            agentColor={logEntry.agentColor}
                          />
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none
                      prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2
                      prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2
                      prose-ul:text-foreground prose-ol:text-foreground
                      prose-li:marker:text-primary
                      prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {logEntry.output?.content || ''}
                      </ReactMarkdown>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <RelativeTime date={logEntry.timestamp} />
                        {logEntry.tokensUsed && <span> · {logEntry.tokensUsed} tokens</span>}
                      </div>
                      <button
                        onClick={() => handleCopy(logEntry.output?.content || '')}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg border"
                  style={{
                    backgroundColor: `${entry.agentColor}15`,
                    borderColor: `${entry.agentColor}30`,
                  }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: entry.agentColor }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    Conversation with {entry.agent}
                    {threadHistory.length > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {threadHistory.length} messages
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {entry.originalCommand || entry.message}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {threadHistory.map((logEntry, index) => renderMessage(logEntry, index))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-card/95 backdrop-blur-sm">
              {/* Quick Refinement Suggestions */}
              {entry.status === 'completed' && !isProcessing && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Make it shorter', 'Make it more professional', 'Add more details', 'Simplify the language'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setReplyInput(suggestion)}
                      className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Refine this result... (e.g., 'Make it more concise')"
                    disabled={isProcessing || entry.status === 'running'}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/50 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyInput.trim() || isProcessing || entry.status === 'running'}
                  className={`p-3 rounded-xl transition-all ${
                    replyInput.trim() && !isProcessing
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Retry option for errors */}
              {entry.type === 'error' && onRetry && (
                <button
                  onClick={() => onRetry(entry)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Original Request
                </button>
              )}
            </div>

            {/* Copied Toast */}
            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm"
                >
                  Copied to clipboard!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  entry: LogEntry;
  index: number;
  onView: (entry: LogEntry) => void;
  onRetry?: (entry: LogEntry) => void;
}

const ActivityItem = forwardRef<HTMLDivElement, ActivityItemProps>(
  function ActivityItem({ entry, index, onView, onRetry }, ref) {
    const [isHovered, setIsHovered] = useState(false);
    const styles = getLogStyles(entry.type);
    const Icon = styles.icon;

    // Level 9: Get thread count for this entry
    const getThreadHistory = useDashboardStore((state) => state.getThreadHistory);
    const threadHistory = getThreadHistory(entry.id);
    const hasThread = threadHistory.length > 1;

    // Don't show child entries in main feed (they're shown in thread drawer)
    if (entry.parentId) return null;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onView(entry)}
        className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all ${styles.hoverBg} border border-transparent hover:border-border`}
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${styles.bg} ${styles.border}`}>
          {entry.status === 'running' ? (
            <Loader2 className={`h-4 w-4 ${styles.text} animate-spin`} />
          ) : (
            <Icon className={`h-4 w-4 ${styles.text}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground truncate">{entry.message}</p>
            {entry.agent && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${entry.agentColor}15`,
                  color: entry.agentColor,
                }}
              >
                {entry.agent}
              </span>
            )}
            {/* Level 9: Thread indicator */}
            {hasThread && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] font-medium text-primary">
                <MessageSquare className="w-2.5 h-2.5" />
                {threadHistory.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <RelativeTime date={entry.timestamp} />
            {entry.duration && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <p className="text-[10px] text-muted-foreground">{formatDuration(entry.duration)}</p>
              </>
            )}
          </div>
        </div>

        {/* Hover Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-1"
            >
              {entry.type === 'error' && onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(entry);
                  }}
                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors border border-amber-500/20"
                  title="Retry"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(entry);
                }}
                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                title="View Output"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

// ============================================================================
// MAIN ACTIVITY FEED COMPONENT
// ============================================================================

interface ActivityFeedProps {
  activities: LogEntry[];
  isLive?: boolean;
  onLoadMore?: () => void;
  onRetry?: (entry: LogEntry) => void;
}

export function ActivityFeed({ activities, isLive = true, onLoadMore, onRetry }: ActivityFeedProps) {
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleView = useCallback((entry: LogEntry) => {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedEntry(null), 300);
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="relative rounded-2xl overflow-hidden transition-all duration-300
          bg-white dark:bg-zinc-900/40
          dark:backdrop-blur-xl
          border border-gray-200 dark:border-white/[0.06]
          shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
          dark:ring-1 dark:ring-inset dark:ring-white/[0.02]
          hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] dark:hover:ring-primary/10 dark:hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]"
      >
        {/* Subtle top accent line - only in dark mode */}
        <div className="absolute top-0 left-0 right-0 h-px hidden dark:block bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500 dark:bg-primary/10">
                <Clock className="w-4 h-4 text-white dark:text-primary" />
              </div>
              Recent Activity
            </h3>
            {isLive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity List */}
        <div className="p-3 space-y-1 max-h-[450px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {activities.map((entry, index) => (
              <ActivityItem
                key={entry.id}
                entry={entry}
                index={index}
                onView={handleView}
                onRetry={onRetry}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Load More */}
        {onLoadMore && (
          <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
            <button
              onClick={onLoadMore}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-sm font-medium text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2"
            >
              Load More
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Level 9: Conversation Drawer (Chat UI) */}
      <ConversationDrawer
        entry={selectedEntry}
        isOpen={isDrawerOpen}
        onClose={handleClose}
        onRetry={onRetry}
      />
    </>
  );
}

export default ActivityFeed;
