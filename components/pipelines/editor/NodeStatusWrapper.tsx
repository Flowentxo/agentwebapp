'use client';

import React from 'react';
import { Loader2, Check, X, Pause, SkipForward, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useNodeStatus, useNodeOutput, NodeExecutionStatus } from '../store/usePipelineStore';

// ============================================
// TYPES
// ============================================

interface NodeStatusWrapperProps {
  nodeId: string;
  children: React.ReactNode;
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: NodeExecutionStatus;
  retryAttempt?: number;
  maxAttempts?: number;
}

function StatusBadge({ status, retryAttempt, maxAttempts }: StatusBadgeProps) {
  switch (status) {
    case 'running':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium shadow-lg animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Running</span>
        </div>
      );
    case 'success':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-medium shadow-lg">
          <Check className="w-3 h-3" />
          <span>Done</span>
        </div>
      );
    case 'error':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium shadow-lg">
          <X className="w-3 h-3" />
          <span>Error</span>
        </div>
      );
    case 'suspended':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium shadow-lg animate-pulse">
          <Pause className="w-3 h-3" />
          <span>Paused</span>
        </div>
      );
    case 'skipped':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/500 text-white text-xs font-medium shadow-lg">
          <SkipForward className="w-3 h-3" />
          <span>Skipped</span>
        </div>
      );
    // Phase 7: Retrying status - yellow/amber with spinning icon
    case 'retrying':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-medium shadow-lg animate-pulse">
          <RefreshCcw className="w-3 h-3 animate-spin" />
          <span>
            Retry {retryAttempt || 1}/{maxAttempts || 3}
          </span>
        </div>
      );
    // Phase 7: Continued status - orange/warning with alert icon
    case 'continued':
      return (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-medium shadow-lg">
          <AlertTriangle className="w-3 h-3" />
          <span>Warning</span>
        </div>
      );
    default:
      return null;
  }
}

// ============================================
// STATUS RING STYLES
// ============================================

function getStatusRingStyles(status: NodeExecutionStatus | null): string {
  if (!status) return '';

  const baseRing = 'ring-2 ring-offset-2 ring-offset-card';

  switch (status) {
    case 'pending':
      return ''; // No ring for pending
    case 'running':
      return `${baseRing} ring-blue-500 animate-pulse shadow-lg shadow-blue-500/30`;
    case 'success':
      return `${baseRing} ring-green-500 shadow-lg shadow-green-500/20`;
    case 'error':
      return `${baseRing} ring-red-500 shadow-lg shadow-red-500/30`;
    case 'suspended':
      return `${baseRing} ring-amber-500 animate-pulse shadow-lg shadow-amber-500/30`;
    case 'skipped':
      return `${baseRing} ring-slate-500 opacity-60`;
    // Phase 7: Retrying - yellow ring with pulse animation
    case 'retrying':
      return `${baseRing} ring-yellow-500 animate-pulse shadow-lg shadow-yellow-500/30`;
    // Phase 7: Continued - orange ring (warning indicator)
    case 'continued':
      return `${baseRing} ring-orange-500 shadow-lg shadow-orange-500/20`;
    default:
      return '';
  }
}

// ============================================
// DURATION DISPLAY
// ============================================

function DurationBadge({ duration }: { duration?: number }) {
  if (!duration) return null;

  const formatted = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;

  return (
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-700 text-white/60 text-[10px] font-mono">
      {formatted}
    </div>
  );
}

// ============================================
// ERROR TOOLTIP
// ============================================

function ErrorTooltip({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="max-w-xs p-2 rounded-lg bg-red-900/90 border border-red-500/50 text-xs text-red-200 shadow-xl">
        <p className="font-medium text-red-100 mb-1">Error</p>
        <p className="break-words">{error}</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN WRAPPER COMPONENT
// ============================================

export function NodeStatusWrapper({ nodeId, children }: NodeStatusWrapperProps) {
  const status = useNodeStatus(nodeId);
  const output = useNodeOutput(nodeId);

  const ringStyles = getStatusRingStyles(status);
  const showBadge = status && status !== 'pending';
  const showDuration = status === 'success' && output?.duration;
  const showError = status === 'error' && output?.error;

  return (
    <div className={`relative transition-all duration-300 ${ringStyles}`}>
      {/* Status Badge - Pass retry info for retrying status */}
      {showBadge && (
        <StatusBadge
          status={status}
          retryAttempt={output?.retryAttempt}
          maxAttempts={output?.maxAttempts}
        />
      )}

      {/* Duration Badge */}
      {showDuration && <DurationBadge duration={output.duration} />}

      {/* Error Tooltip (shown on hover via group) */}
      <div className="group">
        {children}
        {showError && (
          <div className="hidden group-hover:block">
            <ErrorTooltip error={output.error} />
          </div>
        )}
      </div>

      {/* Suspended Overlay */}
      {status === 'suspended' && (
        <div className="absolute inset-0 bg-amber-500/10 rounded-lg pointer-events-none" />
      )}

      {/* Skipped Overlay */}
      {status === 'skipped' && (
        <div className="absolute inset-0 bg-card/40 rounded-lg pointer-events-none" />
      )}

      {/* Phase 7: Retrying Overlay - subtle yellow pulse */}
      {status === 'retrying' && (
        <div className="absolute inset-0 bg-yellow-500/10 rounded-lg pointer-events-none animate-pulse" />
      )}

      {/* Phase 7: Continued (with error) Overlay - subtle orange tint */}
      {status === 'continued' && (
        <div className="absolute inset-0 bg-orange-500/10 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default NodeStatusWrapper;
