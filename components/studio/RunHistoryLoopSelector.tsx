'use client';

/**
 * RunHistoryLoopSelector.tsx
 * Phase 6: Builder Experience Enhancement
 *
 * Loop iteration navigator for the Flight Recorder.
 * Allows users to browse through loop iterations and view
 * detailed execution data for each iteration.
 *
 * Features:
 * - "Iteration: [1] of 50" selector
 * - Previous/Next navigation
 * - Direct iteration jump
 * - Iteration summary stats
 * - Error indicator for failed iterations
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Repeat,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export interface IterationStats {
  runIndex: number;
  nodeCount: number;
  completedCount: number;
  errorCount: number;
  skippedCount: number;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
}

export interface LoopGroupSummary {
  loopId: string;
  loopName: string;
  totalIterations: number;
  completedIterations: number;
  failedIterations: number;
  skippedIterations: number;
  totalDurationMs: number;
  averageDurationMs: number;
  iterations: IterationStats[];
}

export interface RunHistoryLoopSelectorProps {
  /** Execution ID */
  executionId: string;
  /** Loop group summary data */
  loopGroup?: LoopGroupSummary | null;
  /** Currently selected iteration index */
  selectedIteration: number;
  /** Callback when iteration changes */
  onIterationChange: (index: number) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Compact mode (less UI) */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// ITERATION STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  IterationStats['status'],
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: { icon: Clock, color: '#6B7280', label: 'Pending' },
  running: { icon: Loader2, color: '#3B82F6', label: 'Running' },
  success: { icon: CheckCircle2, color: '#22C55E', label: 'Success' },
  error: { icon: XCircle, color: '#EF4444', label: 'Error' },
  skipped: { icon: AlertTriangle, color: '#EAB308', label: 'Skipped' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface IterationDotProps {
  iteration: IterationStats;
  isSelected: boolean;
  onClick: () => void;
}

function IterationDot({ iteration, isSelected, onClick }: IterationDotProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const config = STATUS_CONFIG[iteration.status];
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-6 h-6 rounded-full flex items-center justify-center transition-all',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
          : 'hover:scale-105'
      )}
      style={{ backgroundColor: `${config.color}20` }}
      title={`Iteration ${iteration.runIndex + 1}: ${config.label}`}
    >
      <StatusIcon
        className={cn('w-3.5 h-3.5', iteration.status === 'running' && 'animate-spin')}
        style={{ color: config.color }}
      />
      {/* Error indicator */}
      {iteration.errorCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center"
          title={`${iteration.errorCount} error(s)`}
        >
          !
        </span>
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RunHistoryLoopSelector({
  executionId,
  loopGroup,
  selectedIteration,
  onIterationChange,
  isLoading = false,
  compact = false,
  className,
}: RunHistoryLoopSelectorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [showAllIterations, setShowAllIterations] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Update input when selected iteration changes
  useEffect(() => {
    setInputValue((selectedIteration + 1).toString());
  }, [selectedIteration]);

  const totalIterations = loopGroup?.totalIterations ?? 0;
  const currentStats = loopGroup?.iterations[selectedIteration];

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const goToFirst = useCallback(() => {
    onIterationChange(0);
  }, [onIterationChange]);

  const goToPrevious = useCallback(() => {
    if (selectedIteration > 0) {
      onIterationChange(selectedIteration - 1);
    }
  }, [selectedIteration, onIterationChange]);

  const goToNext = useCallback(() => {
    if (selectedIteration < totalIterations - 1) {
      onIterationChange(selectedIteration + 1);
    }
  }, [selectedIteration, totalIterations, onIterationChange]);

  const goToLast = useCallback(() => {
    onIterationChange(totalIterations - 1);
  }, [totalIterations, onIterationChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 1 && num <= totalIterations) {
        onIterationChange(num - 1);
      }
    },
    [totalIterations, onIterationChange]
  );

  const handleInputBlur = useCallback(() => {
    // Reset to current iteration if invalid
    setInputValue((selectedIteration + 1).toString());
  }, [selectedIteration]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Home':
          e.preventDefault();
          goToFirst();
          break;
        case 'End':
          e.preventDefault();
          goToLast();
          break;
      }
    },
    [goToPrevious, goToNext, goToFirst, goToLast]
  );

  // ============================================================================
  // VISIBLE ITERATIONS (for dot display)
  // ============================================================================

  const visibleIterations = useMemo(() => {
    if (!loopGroup?.iterations) return [];

    const all = loopGroup.iterations;
    const maxVisible = 10;

    if (all.length <= maxVisible || showAllIterations) {
      return all;
    }

    // Show first 3, selected ±1, last 3
    const indices = new Set<number>();

    // First 3
    for (let i = 0; i < 3 && i < all.length; i++) {
      indices.add(i);
    }

    // Around selected
    for (let i = Math.max(0, selectedIteration - 1); i <= Math.min(all.length - 1, selectedIteration + 1); i++) {
      indices.add(i);
    }

    // Last 3
    for (let i = Math.max(0, all.length - 3); i < all.length; i++) {
      indices.add(i);
    }

    return Array.from(indices)
      .sort((a, b) => a - b)
      .map((i) => all[i]);
  }, [loopGroup?.iterations, selectedIteration, showAllIterations]);

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-3',
          isDark ? 'bg-zinc-900' : 'bg-white',
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          Loading iterations...
        </span>
      </div>
    );
  }

  // ============================================================================
  // RENDER - NO DATA
  // ============================================================================

  if (!loopGroup || totalIterations === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-3',
          isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400',
          className
        )}
      >
        <Repeat className="w-4 h-4" />
        <span className="text-sm">No loop iterations</span>
      </div>
    );
  }

  // ============================================================================
  // RENDER - COMPACT
  // ============================================================================

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-100',
          className
        )}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <Repeat className="w-3.5 h-3.5 text-purple-400" />
        <button
          onClick={goToPrevious}
          disabled={selectedIteration === 0}
          className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
          {selectedIteration + 1} / {totalIterations}
        </span>
        <button
          onClick={goToNext}
          disabled={selectedIteration === totalIterations - 1}
          className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ============================================================================
  // RENDER - FULL
  // ============================================================================

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        isDark ? 'bg-zinc-900 border border-white/10' : 'bg-white border border-zinc-200',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-2 flex items-center justify-between border-b',
          isDark ? 'border-white/10 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'
        )}
      >
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-purple-400" />
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
            {loopGroup.loopName || 'Loop'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            {loopGroup.completedIterations}
          </span>
          {loopGroup.failedIterations > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3 h-3" />
              {loopGroup.failedIterations}
            </span>
          )}
          <span className={cn('flex items-center gap-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            <Clock className="w-3 h-3" />
            {formatDuration(loopGroup.totalDurationMs)}
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div
        className={cn('px-4 py-3 flex items-center gap-4', isDark ? 'bg-zinc-900' : 'bg-white')}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* First/Previous Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToFirst}
            disabled={selectedIteration === 0}
            className={cn(
              'p-1.5 rounded-md transition-colors disabled:opacity-30',
              isDark
                ? 'hover:bg-white/5 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="First iteration (Home)"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToPrevious}
            disabled={selectedIteration === 0}
            className={cn(
              'p-1.5 rounded-md transition-colors disabled:opacity-30',
              isDark
                ? 'hover:bg-white/5 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Previous iteration (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Iteration Input */}
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Iteration:
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={cn(
              'w-14 h-8 px-2 text-center text-sm font-medium rounded-md border transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              isDark
                ? 'bg-zinc-800 border-white/10 text-white'
                : 'bg-white border-zinc-200 text-zinc-900'
            )}
          />
          <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            of {totalIterations}
          </span>
        </div>

        {/* Next/Last Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToNext}
            disabled={selectedIteration === totalIterations - 1}
            className={cn(
              'p-1.5 rounded-md transition-colors disabled:opacity-30',
              isDark
                ? 'hover:bg-white/5 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Next iteration (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToLast}
            disabled={selectedIteration === totalIterations - 1}
            className={cn(
              'p-1.5 rounded-md transition-colors disabled:opacity-30',
              isDark
                ? 'hover:bg-white/5 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Last iteration (End)"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Iteration Stats */}
        {currentStats && (
          <div
            className={cn(
              'ml-auto flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
            )}
          >
            <span className="flex items-center gap-1">
              {(() => {
                const config = STATUS_CONFIG[currentStats.status];
                const Icon = config.icon;
                return (
                  <>
                    <Icon
                      className={cn('w-3.5 h-3.5', currentStats.status === 'running' && 'animate-spin')}
                      style={{ color: config.color }}
                    />
                    <span style={{ color: config.color }}>{config.label}</span>
                  </>
                );
              })()}
            </span>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>|</span>
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              {currentStats.completedCount}/{currentStats.nodeCount} nodes
            </span>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>|</span>
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              {formatDuration(currentStats.durationMs)}
            </span>
          </div>
        )}
      </div>

      {/* Iteration Dots */}
      {totalIterations > 1 && (
        <div
          className={cn(
            'px-4 py-2 flex items-center gap-2 flex-wrap border-t',
            isDark ? 'border-white/10' : 'border-zinc-100'
          )}
        >
          {visibleIterations.map((iteration, idx) => {
            // Add ellipsis indicator
            const prevVisible = idx > 0 ? visibleIterations[idx - 1] : null;
            const showEllipsis = prevVisible && iteration.runIndex - prevVisible.runIndex > 1;

            return (
              <div key={iteration.runIndex} className="flex items-center gap-2">
                {showEllipsis && (
                  <span className={isDark ? 'text-zinc-600' : 'text-zinc-400'}>...</span>
                )}
                <IterationDot
                  iteration={iteration}
                  isSelected={selectedIteration === iteration.runIndex}
                  onClick={() => onIterationChange(iteration.runIndex)}
                />
              </div>
            );
          })}

          {/* Show All Button */}
          {totalIterations > 10 && !showAllIterations && (
            <button
              onClick={() => setShowAllIterations(true)}
              className={cn(
                'text-xs px-2 py-1 rounded-md transition-colors',
                isDark
                  ? 'text-zinc-400 hover:bg-white/5'
                  : 'text-zinc-500 hover:bg-zinc-100'
              )}
            >
              Show all ({totalIterations})
            </button>
          )}
        </div>
      )}

      {/* Footer - Average Stats */}
      <div
        className={cn(
          'px-4 py-2 flex items-center justify-between text-[10px] border-t',
          isDark ? 'border-white/10 text-zinc-500 bg-zinc-800/30' : 'border-zinc-100 text-zinc-400 bg-zinc-50'
        )}
      >
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          <span>Avg. duration: {formatDuration(loopGroup.averageDurationMs)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>← → Navigate</span>
          <span>Home/End Jump</span>
        </div>
      </div>
    </div>
  );
}

export default RunHistoryLoopSelector;
