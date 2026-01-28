/**
 * RUN HEADER
 *
 * Phase 13: Flight Recorder - Visual Debugger
 *
 * Displays a banner at the top of the canvas when in debug mode.
 * Shows run information and provides quick actions.
 */

'use client';

import React from 'react';
import { format } from 'date-fns';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Timer,
  Play,
  Zap,
  Globe,
  Calendar,
  Code,
  RotateCcw,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePipelineStore,
  type WorkflowRun,
} from '@/components/pipelines/store/usePipelineStore';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/500/20',
    label: 'Pending',
  },
  running: {
    icon: Play,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Running',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Failed',
  },
  cancelled: {
    icon: X,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Cancelled',
  },
  suspended: {
    icon: Pause,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Suspended',
  },
  timeout: {
    icon: Timer,
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    label: 'Timeout',
  },
};

const triggerConfig: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  manual: { icon: PlayCircle, label: 'Manual' },
  webhook: { icon: Globe, label: 'Webhook' },
  schedule: { icon: Calendar, label: 'Scheduled' },
  api: { icon: Code, label: 'API' },
  event: { icon: Zap, label: 'Event' },
  resume: { icon: Play, label: 'Resumed' },
  retry: { icon: RotateCcw, label: 'Retry' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function RunHeader() {
  const {
    isDebugMode,
    currentRun,
    runSummary,
    exitDebugMode,
  } = usePipelineStore();

  if (!isDebugMode || !currentRun) return null;

  const status = statusConfig[currentRun.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const trigger = triggerConfig[currentRun.triggerType] || triggerConfig.manual;
  const TriggerIcon = trigger.icon;

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-50">
      {/* Main Banner */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5',
          'bg-gradient-to-r from-indigo-600/90 to-purple-600/90',
          'backdrop-blur-md border-b border-white/10',
          'shadow-lg shadow-indigo-500/20'
        )}
      >
        {/* Left: Run Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-white/80" />
            <span className="font-semibold text-white">
              Viewing Run #{currentRun.runNumber}
            </span>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              status.bgColor,
              status.color
            )}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status.label}</span>
          </div>

          {/* Trigger */}
          <div className="flex items-center gap-1.5 text-sm text-white/70">
            <TriggerIcon className="w-4 h-4" />
            <span>{trigger.label}</span>
          </div>

          {/* Time */}
          {currentRun.startedAt && (
            <span className="text-sm text-white/60">
              {format(new Date(currentRun.startedAt), 'MMM d, HH:mm:ss')}
            </span>
          )}

          {/* Duration */}
          <span className="text-sm text-white/60">
            Duration: {formatDuration(currentRun.totalDurationMs)}
          </span>
        </div>

        {/* Right: Stats & Actions */}
        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          {runSummary && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-green-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>{runSummary.successfulSteps}</span>
              </div>
              {runSummary.failedSteps > 0 && (
                <div className="flex items-center gap-1.5 text-red-300">
                  <XCircle className="w-4 h-4" />
                  <span>{runSummary.failedSteps}</span>
                </div>
              )}
              {runSummary.skippedSteps > 0 && (
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>{runSummary.skippedSteps}</span>
                </div>
              )}
              {runSummary.totalTokens > 0 && (
                <span className="text-white/60">
                  {runSummary.totalTokens.toLocaleString()} tokens
                </span>
              )}
              {runSummary.totalCost > 0 && (
                <span className="text-white/60">
                  ${runSummary.totalCost.toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Exit Button */}
          <button
            onClick={exitDebugMode}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              'bg-card/10 hover:bg-card/20 transition-colors',
              'text-white text-sm font-medium'
            )}
          >
            <X className="w-4 h-4" />
            <span>Exit Debug Mode</span>
          </button>
        </div>
      </div>

      {/* Error Banner (if failed) */}
      {currentRun.status === 'failed' && currentRun.errorMessage && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border-b border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-400 text-sm">
              {currentRun.errorCode
                ? `Error: ${currentRun.errorCode}`
                : 'Execution Failed'}
            </div>
            <div className="text-red-300/80 text-sm mt-0.5">
              {currentRun.errorMessage}
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Notice */}
      <div className="flex items-center justify-center gap-2 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>
          Read-only mode: You are viewing a past execution. Changes are disabled.
        </span>
      </div>
    </div>
  );
}

export default RunHeader;
