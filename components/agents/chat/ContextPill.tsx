'use client';

/**
 * ContextPill Component
 *
 * A visual indicator shown in the chat interface when the conversation
 * was initiated from a specific context (e.g., Budget Dashboard alert).
 *
 * Features:
 * - Animated entrance
 * - Context-type specific styling
 * - Dismissible
 * - Shows source and type of context
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Wallet,
  AlertTriangle,
  TrendingUp,
  BrainCircuit,
  Workflow,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import type { ChatContextType } from '@/store/chatStore';

// =====================================================
// TYPES
// =====================================================

interface ContextPillProps {
  type: ChatContextType;
  source: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  onDismiss?: () => void;
  className?: string;
}

// =====================================================
// CONTEXT CONFIGURATION
// =====================================================

const CONTEXT_CONFIG: Record<
  ChatContextType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  finance_alert: {
    icon: AlertTriangle,
    label: 'Budget Alert',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-300',
    iconColor: 'text-red-400',
  },
  finance_insight: {
    icon: Wallet,
    label: 'Finance Insight',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-300',
    iconColor: 'text-emerald-400',
  },
  anomaly_detected: {
    icon: TrendingUp,
    label: 'Anomaly Detected',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-300',
    iconColor: 'text-orange-400',
  },
  budget_warning: {
    icon: Wallet,
    label: 'Budget Warning',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-300',
    iconColor: 'text-yellow-400',
  },
  general_query: {
    icon: BrainCircuit,
    label: 'Quick Query',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-300',
    iconColor: 'text-purple-400',
  },
  workflow_error: {
    icon: Workflow,
    label: 'Workflow Issue',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-300',
    iconColor: 'text-red-400',
  },
  support_ticket: {
    icon: HelpCircle,
    label: 'Support Request',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-300',
    iconColor: 'text-blue-400',
  },
};

// =====================================================
// SOURCE LABEL MAPPING
// =====================================================

const SOURCE_LABELS: Record<string, string> = {
  budget_dashboard: 'Budget Dashboard',
  workflow_editor: 'Workflow Editor',
  inbox: 'Inbox',
  agents_page: 'Agents',
  settings: 'Settings',
  analytics: 'Analytics',
  default: 'Dashboard',
};

// =====================================================
// COMPONENT
// =====================================================

export const ContextPill: React.FC<ContextPillProps> = ({
  type,
  source,
  priority = 'normal',
  onDismiss,
  className = '',
}) => {
  const config = CONTEXT_CONFIG[type] || CONTEXT_CONFIG.general_query;
  const Icon = config.icon;
  const sourceLabel = SOURCE_LABELS[source] || SOURCE_LABELS.default;

  const priorityBadge = priority === 'critical' || priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        ${config.bgColor} ${config.borderColor} border
        backdrop-blur-sm shadow-lg
        ${className}
      `}
    >
      {/* Icon with pulse animation for priority */}
      <div className="relative">
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        {priorityBadge && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"
          />
        )}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </span>

      {/* Source indicator */}
      <span className="text-xs text-white/40">
        from {sourceLabel}
      </span>

      {/* AI indicator */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-1 ml-1"
      >
        <Sparkles className="w-3 h-3 text-purple-400" />
      </motion.div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-1 p-0.5 rounded-full hover:bg-card/10 transition-colors"
          aria-label="Dismiss context"
        >
          <X className="w-3 h-3 text-white/40 hover:text-white/70" />
        </button>
      )}
    </motion.div>
  );
};

// =====================================================
// CONTEXT BANNER (Full Width Version)
// =====================================================

interface ContextBannerProps extends ContextPillProps {
  message?: string;
}

export const ContextBanner: React.FC<ContextBannerProps> = ({
  type,
  source,
  priority = 'normal',
  message,
  onDismiss,
  className = '',
}) => {
  const config = CONTEXT_CONFIG[type] || CONTEXT_CONFIG.general_query;
  const Icon = config.icon;
  const sourceLabel = SOURCE_LABELS[source] || SOURCE_LABELS.default;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`
        w-full p-3 rounded-xl
        ${config.bgColor} ${config.borderColor} border
        backdrop-blur-sm
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${config.textColor}`}>
              {config.label}
            </span>
            <span className="text-xs text-white/30">•</span>
            <span className="text-xs text-white/40">
              {sourceLabel}
            </span>
            {priority === 'critical' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 uppercase">
                Critical
              </span>
            )}
            {priority === 'high' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 uppercase">
                High Priority
              </span>
            )}
          </div>

          {message && (
            <p className="text-sm text-white/60 line-clamp-2">
              {message}
            </p>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-card/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-white/40 hover:text-white/70" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ContextPill;
