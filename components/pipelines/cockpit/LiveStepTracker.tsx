'use client';

/**
 * LiveStepTracker Component
 *
 * Real-time execution feed showing pipeline steps as a vertical timeline.
 * Features status badges, duration tracking, token/cost info, and auto-scroll.
 *
 * Vicy-Style: Deep Black (#050505) + Status-specific colors
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CheckCircle,
  XCircle,
  Pause,
  SkipForward,
  RefreshCcw,
  AlertTriangle,
  Clock,
  Zap,
  DollarSign,
  ChevronRight,
  Bot,
  Code,
  Mail,
  Database,
  Webhook,
  GitBranch,
  FileText,
  MessageSquare,
  Loader2,
  Lightbulb,
  RotateCcw,
  FastForward,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeExecutionStatus } from '../store/usePipelineStore';

// ============================================
// TYPES
// ============================================

export interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  output?: unknown;
  error?: string;
  tokensUsed?: number;
  costUsd?: string;
  retryAttempt?: number;
  maxAttempts?: number;
  // NEW: Retry Support
  canRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  // NEW: Error Details
  errorCode?: string;
  errorCategory?: 'network' | 'auth' | 'validation' | 'timeout' | 'rate_limit' | 'unknown';
  suggestedFix?: string;
}

interface LiveStepTrackerProps {
  steps: ExecutionStep[];
  isRunning: boolean;
  isDryRun?: boolean;
  activeNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  onRetryStep?: (stepId: string, nodeId: string) => Promise<void>;
  onSkipStep?: (stepId: string, nodeId: string) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getNodeIcon(nodeType: string) {
  const iconMap: Record<string, React.ElementType> = {
    llm: Bot,
    agent: Bot,
    code: Code,
    email: Mail,
    database: Database,
    webhook: Webhook,
    branch: GitBranch,
    condition: GitBranch,
    output: FileText,
    message: MessageSquare,
    trigger: Play,
    human_approval: Pause,
  };

  return iconMap[nodeType.toLowerCase()] || Zap;
}

function getStatusConfig(status: NodeExecutionStatus) {
  const configs: Record<
    NodeExecutionStatus,
    { icon: React.ElementType; color: string; bgColor: string; label: string }
  > = {
    pending: {
      icon: Clock,
      color: 'text-white/40',
      bgColor: 'bg-white/[0.04]',
      label: 'Pending',
    },
    running: {
      icon: Loader2,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      label: 'Running',
    },
    success: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      label: 'Success',
    },
    error: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Error',
    },
    suspended: {
      icon: Pause,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: 'Awaiting',
    },
    skipped: {
      icon: SkipForward,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      label: 'Skipped',
    },
    retrying: {
      icon: RefreshCcw,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: 'Retrying',
    },
    continued: {
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      label: 'Warning',
    },
  };

  return configs[status] || configs.pending;
}

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatCost(cost?: string): string {
  if (!cost) return '-';
  const num = parseFloat(cost);
  if (num < 0.01) return `<$0.01`;
  return `$${num.toFixed(2)}`;
}

// ============================================
// STEP ITEM COMPONENT
// ============================================

interface StepItemProps {
  step: ExecutionStep;
  isActive: boolean;
  isLast: boolean;
  onClick?: () => void;
  onRetry?: () => Promise<void>;
  onSkip?: () => void;
  isRetrying?: boolean;
}

function StepItem({ step, isActive, isLast, onClick, onRetry, onSkip, isRetrying }: StepItemProps) {
  const config = getStatusConfig(step.status);
  const StatusIcon = config.icon;
  const NodeIcon = getNodeIcon(step.nodeType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative"
    >
      {/* Timeline Connector */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-5 top-12 w-0.5 h-[calc(100%-24px)]',
            step.status === 'success'
              ? 'bg-emerald-500/30'
              : step.status === 'running'
              ? 'bg-violet-500/30 animate-pulse'
              : 'bg-white/[0.06]'
          )}
        />
      )}

      {/* Step Card */}
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left',
          'hover:bg-white/[0.02]',
          isActive && 'bg-violet-500/5 ring-1 ring-violet-500/20'
        )}
      >
        {/* Status Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            config.bgColor,
            step.status === 'running' && 'ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/20'
          )}
        >
          <StatusIcon
            className={cn(
              'w-5 h-5',
              config.color,
              step.status === 'running' && 'animate-spin'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <NodeIcon size={14} className="text-white/30" />
            <span className="text-sm font-medium text-white truncate">
              {step.nodeName}
            </span>
            {step.retryAttempt && (
              <span className="text-[10px] text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                Retry {step.retryAttempt}/{step.maxAttempts || 3}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium',
                config.bgColor,
                config.color
              )}
            >
              {config.label}
            </span>
            {step.durationMs && (
              <span className="text-xs text-white/30 flex items-center gap-1">
                <Clock size={10} />
                {formatDuration(step.durationMs)}
              </span>
            )}
          </div>

          {/* Token & Cost Info */}
          {(step.tokensUsed || step.costUsd) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
              {step.tokensUsed && (
                <span className="flex items-center gap-1">
                  <Zap size={10} />
                  {step.tokensUsed.toLocaleString()} tokens
                </span>
              )}
              {step.costUsd && (
                <span className="flex items-center gap-1">
                  <DollarSign size={10} />
                  {formatCost(step.costUsd)}
                </span>
              )}
            </div>
          )}

          {/* Error Message with Suggested Fix */}
          {step.error && (
            <div className="mt-2 space-y-2">
              {/* Error Details */}
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-400 line-clamp-2">{step.error}</p>
                    {step.errorCategory && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 uppercase">
                        {step.errorCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggested Fix */}
              {step.suggestedFix && (
                <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-amber-300/60 uppercase tracking-wider mb-0.5">
                        Lösungsvorschlag
                      </p>
                      <p className="text-xs text-amber-200/80">{step.suggestedFix}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Retry/Skip Actions */}
              {step.status === 'error' && (step.canRetry !== false) && (
                <div className="flex items-center gap-2 pt-1">
                  {onRetry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry();
                      }}
                      disabled={isRetrying}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                        'bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20',
                        'text-violet-400 hover:text-violet-300 transition-all',
                        isRetrying && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isRetrying ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Retry...
                        </>
                      ) : (
                        <>
                          <RotateCcw size={12} />
                          Retry
                          {step.retryCount !== undefined && step.maxRetries && (
                            <span className="text-violet-400/60">
                              ({step.retryCount}/{step.maxRetries})
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                  {onSkip && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkip();
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                        'bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06]',
                        'text-white/40 hover:text-white/60 transition-all'
                      )}
                    >
                      <FastForward size={12} />
                      Skip
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight size={14} className="flex-shrink-0 text-white/20 mt-1" />
      </button>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveStepTracker({
  steps,
  isRunning,
  isDryRun = false,
  activeNodeId,
  onNodeClick,
  onRetryStep,
  onSkipStep,
}: LiveStepTrackerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [retryingStepId, setRetryingStepId] = useState<string | null>(null);

  // Handle retry with loading state
  const handleRetry = async (stepId: string, nodeId: string) => {
    if (!onRetryStep) return;
    setRetryingStepId(stepId);
    try {
      await onRetryStep(stepId, nodeId);
    } finally {
      setRetryingStepId(null);
    }
  };

  // Auto-scroll to current step
  useEffect(() => {
    if (isRunning && scrollRef.current) {
      const runningStep = steps.find((s) => s.status === 'running');
      if (runningStep) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [steps, isRunning]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const completed = steps.filter((s) => s.status === 'success').length;
    const failed = steps.filter((s) => s.status === 'error').length;
    const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);
    const totalTokens = steps.reduce((sum, s) => sum + (s.tokensUsed || 0), 0);
    const totalCost = steps.reduce(
      (sum, s) => sum + (s.costUsd ? parseFloat(s.costUsd) : 0),
      0
    );

    return { completed, failed, totalDuration, totalTokens, totalCost };
  }, [steps]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-white/20" />
            )}
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
              {isRunning ? 'Live Execution' : 'Execution Log'}
            </span>
            {isDryRun && (
              <span className="text-[10px] text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 uppercase">
                Test Mode
              </span>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-white">{steps.length}</p>
            <p className="text-[10px] text-white/30">Steps</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-emerald-400">
              {stats.completed}
            </p>
            <p className="text-[10px] text-white/30">Done</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-white/60">
              {formatDuration(stats.totalDuration)}
            </p>
            <p className="text-[10px] text-white/30">Time</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-white/60">
              {stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '-'}
            </p>
            <p className="text-[10px] text-white/30">Tokens</p>
          </div>
        </div>
      </div>

      {/* Step List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-3">
              <Play className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-sm text-white/40">No execution steps yet</p>
            <p className="text-xs text-white/20 mt-1">
              Start the pipeline to see live progress
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {steps.map((step, index) => (
              <StepItem
                key={step.id}
                step={step}
                isActive={step.nodeId === activeNodeId}
                isLast={index === steps.length - 1}
                onClick={() => onNodeClick?.(step.nodeId)}
                onRetry={onRetryStep ? () => handleRetry(step.id, step.nodeId) : undefined}
                onSkip={onSkipStep ? () => onSkipStep(step.id, step.nodeId) : undefined}
                isRetrying={retryingStepId === step.id}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Running Indicator */}
        {isRunning && steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-3 text-violet-400"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Processing...</span>
          </motion.div>
        )}
      </div>

      {/* Footer with Cost */}
      {stats.totalCost > 0 && (
        <div className="flex-shrink-0 p-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30">Estimated Cost</span>
            <span className="text-white/50 font-mono">
              ${stats.totalCost.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveStepTracker;
