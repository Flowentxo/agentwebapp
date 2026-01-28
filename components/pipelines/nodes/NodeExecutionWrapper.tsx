'use client';

/**
 * NodeExecutionWrapper Component
 *
 * Wraps pipeline nodes with execution status styling and animations
 * Part of Phase 5: Live Visualization
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';
import { CheckCircle, XCircle, Loader2, Clock, AlertTriangle, SkipForward } from 'lucide-react';

interface NodeExecutionWrapperProps {
  children: ReactNode;
  executionStatus?: NodeExecutionStatus;
  selected?: boolean;
  baseColor: string; // e.g., 'green', 'blue', 'purple'
  className?: string;
}

// Status-specific styles
const statusStyles: Record<NodeExecutionStatus, {
  borderClass: string;
  glowClass: string;
  iconBg: string;
}> = {
  pending: {
    borderClass: 'border-gray-600',
    glowClass: '',
    iconBg: 'bg-gray-600',
  },
  running: {
    borderClass: 'border-blue-400',
    glowClass: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    iconBg: 'bg-blue-500',
  },
  completed: {
    borderClass: 'border-green-400',
    glowClass: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]',
    iconBg: 'bg-green-500',
  },
  error: {
    borderClass: 'border-red-500',
    glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    iconBg: 'bg-red-500',
  },
  waiting_approval: {
    borderClass: 'border-orange-400',
    glowClass: 'shadow-[0_0_20px_rgba(251,146,60,0.5)]',
    iconBg: 'bg-orange-500',
  },
  skipped: {
    borderClass: 'border-gray-500',
    glowClass: '',
    iconBg: 'bg-muted/500',
  },
};

// Animation variants
const pulseAnimation = {
  running: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  waiting_approval: {
    opacity: [1, 0.6, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  default: {},
};

export function NodeExecutionWrapper({
  children,
  executionStatus = 'pending',
  selected = false,
  baseColor,
  className = '',
}: NodeExecutionWrapperProps) {
  const status = statusStyles[executionStatus] || statusStyles.pending;

  // Determine animation state
  const animationState = executionStatus === 'running'
    ? 'running'
    : executionStatus === 'waiting_approval'
      ? 'waiting_approval'
      : 'default';

  return (
    <motion.div
      className={`relative ${className}`}
      variants={pulseAnimation}
      animate={animationState}
    >
      {/* Execution Status Badge */}
      {executionStatus !== 'pending' && (
        <div className="absolute -top-2 -right-2 z-10">
          <StatusBadge status={executionStatus} />
        </div>
      )}

      {/* Running indicator ring */}
      {executionStatus === 'running' && (
        <div className="absolute inset-0 rounded-xl">
          <div className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-ping opacity-30" />
        </div>
      )}

      {/* Node content with status styling */}
      <div
        className={`
          rounded-xl border-2 transition-all duration-300
          ${status.borderClass}
          ${status.glowClass}
          ${selected ? 'ring-2 ring-white/30' : ''}
        `}
      >
        {children}
      </div>

      {/* Progress bar for running state */}
      {executionStatus === 'running' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-xl overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: NodeExecutionStatus }) {
  const style = statusStyles[status];

  const icons: Record<NodeExecutionStatus, ReactNode> = {
    pending: <Clock size={12} className="text-gray-300" />,
    running: <Loader2 size={12} className="text-white animate-spin" />,
    completed: <CheckCircle size={12} className="text-white" />,
    error: <XCircle size={12} className="text-white" />,
    waiting_approval: <AlertTriangle size={12} className="text-white" />,
    skipped: <SkipForward size={12} className="text-white" />,
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`
        p-1 rounded-full ${style.iconBg}
        shadow-lg
      `}
    >
      {icons[status]}
    </motion.div>
  );
}

// Duration display helper
export function ExecutionDuration({ startedAt, completedAt }: { startedAt?: string; completedAt?: string }) {
  if (!startedAt) return null;

  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <span className="text-[10px] text-muted-foreground">
      {formatDuration(durationMs)}
    </span>
  );
}

export default NodeExecutionWrapper;
