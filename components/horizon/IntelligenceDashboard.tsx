'use client';

/**
 * Flowent Horizon - Intelligence Dashboard
 * Zero-state view with contextual business chips and quick actions
 *
 * Features:
 * - Smart business intelligence chips
 * - Pending approvals counter
 * - Context-aware suggestions
 * - Quick action shortcuts
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  MessageSquare,
  Calendar,
  Mail,
  Users,
  BarChart3,
  Sparkles,
  ArrowRight,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface MetricChip {
  id: string;
  type: 'metric';
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ElementType;
  color: 'emerald' | 'amber' | 'red' | 'blue' | 'violet';
}

interface ActionChip {
  id: string;
  type: 'action';
  label: string;
  count?: number;
  icon: React.ElementType;
  color: 'orange' | 'purple' | 'cyan';
  onClick?: () => void;
}

interface ContextChip {
  id: string;
  type: 'context';
  label: string;
  description: string;
  icon: React.ElementType;
}

type Chip = MetricChip | ActionChip | ContextChip;

interface IntelligenceDashboardProps {
  pendingApprovals?: number;
  unreadMessages?: number;
  onStartConversation?: (prompt: string) => void;
  onViewApprovals?: () => void;
  className?: string;
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

const quickActions = [
  {
    id: 'email',
    label: 'Draft Email',
    description: 'Compose a professional email',
    icon: Mail,
    prompt: 'Help me draft an email to ',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'analyze',
    label: 'Analyze Data',
    description: 'Get insights from your data',
    icon: BarChart3,
    prompt: 'Analyze the following data: ',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'schedule',
    label: 'Schedule Meeting',
    description: 'Set up a calendar event',
    icon: Calendar,
    prompt: 'Help me schedule a meeting for ',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'automate',
    label: 'Create Automation',
    description: 'Build a workflow',
    icon: Zap,
    prompt: 'Create an automation that ',
    color: 'from-amber-500 to-orange-500',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function IntelligenceDashboard({
  pendingApprovals = 0,
  unreadMessages = 0,
  onStartConversation,
  onViewApprovals,
  className = '',
}: IntelligenceDashboardProps) {
  // Generate contextual chips based on current state
  const chips = useMemo<Chip[]>(() => {
    const result: Chip[] = [];

    // Pending approvals action chip
    if (pendingApprovals > 0) {
      result.push({
        id: 'approvals',
        type: 'action',
        label: `${pendingApprovals} Approval${pendingApprovals > 1 ? 's' : ''} pending`,
        count: pendingApprovals,
        icon: AlertCircle,
        color: 'orange',
        onClick: onViewApprovals,
      });
    }

    // Example metric chips (in production, these would come from real data)
    result.push({
      id: 'revenue',
      type: 'metric',
      label: 'Q4 Revenue',
      value: '+12%',
      trend: 'up',
      trendValue: 'vs last quarter',
      icon: TrendingUp,
      color: 'emerald',
    });

    result.push({
      id: 'tasks',
      type: 'metric',
      label: 'Tasks Completed',
      value: '24/30',
      trend: 'neutral',
      icon: CheckCircle,
      color: 'blue',
    });

    // Context chip
    result.push({
      id: 'context',
      type: 'context',
      label: 'Based on your last meeting',
      description: 'You discussed Q4 sales targets with the team',
      icon: Brain,
    });

    return result;
  }, [pendingApprovals, onViewApprovals]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={cn('flex flex-col items-center justify-center py-12', className)}
    >
      {/* Logo / Brand */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Flowent Horizon
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your intelligent workspace
          </p>
        </div>
      </motion.div>

      {/* Intelligence Chips */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap justify-center gap-3 max-w-2xl mb-10"
      >
        {chips.map((chip) => (
          <ChipComponent
            key={chip.id}
            chip={chip}
          />
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="w-full max-w-2xl">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 text-center">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartConversation?.(action.prompt)}
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl',
                  'bg-white dark:bg-card/50',
                  'border border-slate-200 dark:border-slate-800',
                  'hover:border-slate-300 dark:hover:border-slate-700',
                  'transition-all duration-200',
                  'group'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                    'bg-gradient-to-br',
                    action.color,
                    'text-white shadow-sm',
                    'group-hover:shadow-md transition-shadow'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  {action.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  {action.description}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Hint */}
      <motion.p
        variants={itemVariants}
        className="mt-10 text-sm text-slate-400 dark:text-slate-500"
      >
        Start a conversation or use voice mode with{' '}
        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs">
          ⌘ V
        </kbd>
      </motion.p>
    </motion.div>
  );
}

// ============================================================================
// CHIP COMPONENT
// ============================================================================

interface ChipComponentProps {
  chip: Chip;
}

function ChipComponent({ chip }: ChipComponentProps) {
  const Icon = chip.icon;

  if (chip.type === 'metric') {
    const colorClasses = {
      emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      red: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
      blue: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
      violet: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          'horizon-chip cursor-default',
          colorClasses[chip.color]
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium">{chip.label}:</span>
        <span className="font-bold">{chip.value}</span>
        {chip.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
        {chip.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
      </motion.div>
    );
  }

  if (chip.type === 'action') {
    const colorClasses = {
      orange: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20',
      purple: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20',
      cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20',
    };

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={chip.onClick}
        className={cn(
          'horizon-chip',
          colorClasses[chip.color]
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium">{chip.label}</span>
        <ArrowRight className="w-3 h-3" />
      </motion.button>
    );
  }

  // Context chip
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="horizon-chip horizon-chip-context"
    >
      <Icon className="w-4 h-4 text-cyan-500" />
      <span>{chip.label}</span>
    </motion.div>
  );
}

export default IntelligenceDashboard;
