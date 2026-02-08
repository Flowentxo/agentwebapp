'use client';

/**
 * NodeStatusWrapper Component
 *
 * Enhanced execution status visualization for pipeline nodes.
 * Vicy-Style: Deep Black (#050505) + Violet Glow + Status-specific effects
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X, Pause, SkipForward, RefreshCcw, AlertTriangle, Clock } from 'lucide-react';
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
  const badgeVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
  };

  const content = (() => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </div>
        );
      case 'running':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500 text-white text-xs font-medium shadow-lg shadow-violet-500/40">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-medium shadow-lg shadow-emerald-500/40">
            <Check className="w-3 h-3" />
            <span>Done</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium shadow-lg shadow-red-500/40">
            <X className="w-3 h-3" />
            <span>Error</span>
          </div>
        );
      case 'suspended':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium shadow-lg shadow-amber-500/40">
            <Pause className="w-3 h-3" />
            <span>Awaiting</span>
          </div>
        );
      case 'skipped':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500 text-white/80 text-xs font-medium shadow-lg">
            <SkipForward className="w-3 h-3" />
            <span>Skipped</span>
          </div>
        );
      case 'retrying':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium shadow-lg shadow-amber-500/40">
            <RefreshCcw className="w-3 h-3 animate-spin" />
            <span>Retry {retryAttempt || 1}/{maxAttempts || 3}</span>
          </div>
        );
      case 'continued':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-medium shadow-lg shadow-orange-500/40">
            <AlertTriangle className="w-3 h-3" />
            <span>Warning</span>
          </div>
        );
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <motion.div
      className="absolute -top-3 -right-3 z-20"
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      {content}
    </motion.div>
  );
}

// ============================================
// STATUS CONFIGURATION - Vicy Style
// ============================================

const STATUS_CONFIG: Record<string, {
  ringColor: string;
  glowColor: string;
  overlayColor: string;
  animate: boolean;
}> = {
  pending: {
    ringColor: 'ring-white/20',
    glowColor: '',
    overlayColor: '',
    animate: false,
  },
  running: {
    ringColor: 'ring-violet-500',
    glowColor: 'shadow-[0_0_25px_rgba(139,92,246,0.4)]',
    overlayColor: 'bg-violet-500/5',
    animate: true,
  },
  success: {
    ringColor: 'ring-emerald-500',
    glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    overlayColor: 'bg-emerald-500/5',
    animate: false,
  },
  error: {
    ringColor: 'ring-red-500',
    glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    overlayColor: 'bg-red-500/10',
    animate: false,
  },
  suspended: {
    ringColor: 'ring-amber-500',
    glowColor: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    overlayColor: 'bg-amber-500/10',
    animate: true,
  },
  skipped: {
    ringColor: 'ring-slate-500/50',
    glowColor: '',
    overlayColor: 'bg-slate-900/40',
    animate: false,
  },
  retrying: {
    ringColor: 'ring-amber-400',
    glowColor: 'shadow-[0_0_20px_rgba(251,191,36,0.35)]',
    overlayColor: 'bg-amber-500/10',
    animate: true,
  },
  continued: {
    ringColor: 'ring-orange-500',
    glowColor: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    overlayColor: 'bg-orange-500/5',
    animate: false,
  },
};

function getStatusStyles(status: NodeExecutionStatus | null): string {
  if (!status || status === 'pending') return '';

  const config = STATUS_CONFIG[status];
  if (!config) return '';

  const baseRing = 'ring-2 ring-offset-1 ring-offset-[#050505]';
  const animation = config.animate ? 'animate-pulse' : '';

  return `${baseRing} ${config.ringColor} ${config.glowColor} ${animation}`;
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

  const statusStyles = getStatusStyles(status);
  const config = status ? STATUS_CONFIG[status] : null;
  const showBadge = status && status !== 'pending';
  const showDuration = status === 'success' && output?.duration;
  const showError = status === 'error' && output?.error;

  return (
    <motion.div
      className={`relative transition-all duration-300 rounded-xl ${statusStyles}`}
      initial={false}
      animate={{
        scale: status === 'running' ? [1, 1.02, 1] : 1,
      }}
      transition={{
        scale: {
          repeat: status === 'running' ? Infinity : 0,
          duration: 1.5,
          ease: 'easeInOut',
        },
      }}
    >
      {/* Status Badge */}
      <AnimatePresence mode="wait">
        {showBadge && (
          <StatusBadge
            key={status}
            status={status}
            retryAttempt={output?.retryAttempt}
            maxAttempts={output?.maxAttempts}
          />
        )}
      </AnimatePresence>

      {/* Duration Badge */}
      <AnimatePresence>
        {showDuration && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <DurationBadge duration={output.duration} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Tooltip (shown on hover via group) */}
      <div className="group">
        {children}
        {showError && (
          <div className="hidden group-hover:block">
            <ErrorTooltip error={output.error} />
          </div>
        )}
      </div>

      {/* Status-specific Overlay Effects */}
      <AnimatePresence>
        {config?.overlayColor && status !== 'pending' && (
          <motion.div
            className={`absolute inset-0 rounded-xl pointer-events-none ${config.overlayColor}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Running: Animated border glow */}
      {status === 'running' && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.2), transparent)',
            backgroundSize: '200% 100%',
          }}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Suspended: Pulsing amber glow */}
      {status === 'suspended' && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
          }}
          animate={{
            boxShadow: [
              '0 0 20px rgba(245, 158, 11, 0.2)',
              '0 0 30px rgba(245, 158, 11, 0.4)',
              '0 0 20px rgba(245, 158, 11, 0.2)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Success: Brief green flash */}
      {status === 'success' && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)',
            opacity: 1,
          }}
          animate={{
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
            opacity: 0.5,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {/* Error: Red shake effect via CSS */}
      {status === 'error' && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ x: 0 }}
          animate={{ x: [0, -3, 3, -3, 3, 0] }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)',
          }}
        />
      )}
    </motion.div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default NodeStatusWrapper;
