'use client';

/**
 * BuddyInsightCard Component
 *
 * A visually stunning component that displays AI-generated financial insights
 * with an Apple-style glassmorphism design, animated health score ring,
 * and Buddy's AI analysis.
 *
 * Features:
 * - Animated radial progress bar for health score
 * - Color-coded status indicators
 * - Highlights and recommendations
 * - Anomaly warnings
 * - "Ask Buddy" CTA button
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  MessageCircle,
  RefreshCw,
  ChevronRight,
  Zap,
  Target,
  Shield,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { useChatStore, createFinanceContext } from '@/store/chatStore';

// =====================================================
// TYPES
// =====================================================

export interface BuddyInsight {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
  summary: string;
  highlights: string[];
  recommendations: string[];
  anomalies: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  forecast: {
    projectedMonthEnd: number;
    projectedOverage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    runOutDate: string | null;
    confidenceScore: number;
  } | null;
  budget: {
    monthlyLimit: number;
    currentSpend: number;
    remaining: number;
    utilization: number;
    daysRemaining: number;
  };
  tokens: {
    limit: number;
    used: number;
    utilization: number;
  };
  lastSyncedAt: string;
  alerts: {
    total: number;
    highSeverity: number;
    latest: Array<{
      type: string;
      severity: string;
      message: string;
    }>;
  };
}

interface BuddyInsightCardProps {
  insight: BuddyInsight | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onAskBuddy?: () => void;
  compact?: boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const STATUS_CONFIG = {
  excellent: {
    color: 'from-emerald-400 to-green-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
    label: 'Excellent',
    icon: Sparkles,
  },
  good: {
    color: 'from-green-400 to-teal-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    textColor: 'text-green-400',
    label: 'Good',
    icon: Shield,
  },
  fair: {
    color: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    textColor: 'text-yellow-400',
    label: 'Fair',
    icon: Target,
  },
  warning: {
    color: 'from-orange-400 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    textColor: 'text-orange-400',
    label: 'Warning',
    icon: AlertTriangle,
  },
  critical: {
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    textColor: 'text-red-400',
    label: 'Critical',
    icon: AlertTriangle,
  },
};

// =====================================================
// ANIMATED HEALTH SCORE RING
// =====================================================

interface HealthScoreRingProps {
  score: number;
  status: keyof typeof STATUS_CONFIG;
  size?: number;
}

const HealthScoreRing: React.FC<HealthScoreRingProps> = ({
  score,
  status,
  size = 140,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
      </svg>

      {/* Progress ring */}
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id={`gradient-${status}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={`text-${config.color.split(' ')[0].replace('from-', '')}`} stopColor="currentColor" />
            <stop offset="100%" className={`text-${config.color.split(' ')[1].replace('to-', '')}`} stopColor="currentColor" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${status})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="drop-shadow-lg"
          style={{
            filter: `drop-shadow(0 0 8px ${status === 'excellent' || status === 'good' ? '#22c55e' : status === 'fair' ? '#eab308' : '#ef4444'})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className={`p-2 rounded-full ${config.bgColor} mb-1`}
        >
          <StatusIcon className={`w-5 h-5 ${config.textColor}`} />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-3xl font-bold text-white"
        >
          {animatedScore}
        </motion.span>
        <span className="text-xs text-white/50 uppercase tracking-wider">Health</span>
      </div>
    </div>
  );
};

// =====================================================
// TREND ICON
// =====================================================

const TrendIcon: React.FC<{ trend: 'increasing' | 'stable' | 'decreasing' }> = ({ trend }) => {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="w-4 h-4 text-red-400" />;
    case 'decreasing':
      return <TrendingDown className="w-4 h-4 text-green-400" />;
    default:
      return <Minus className="w-4 h-4 text-yellow-400" />;
  }
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const BuddyInsightCard: React.FC<BuddyInsightCardProps> = ({
  insight,
  isLoading = false,
  onRefresh,
  onAskBuddy,
  compact = false,
}) => {
  const router = useRouter();
  const setContext = useChatStore((state) => state.setContext);

  /**
   * Handle "Ask Buddy" button click with context-aware handoff
   */
  const handleAskBuddyClick = useCallback(() => {
    if (!insight) return;

    // Create finance context with intelligent prompt
    const context = createFinanceContext(insight, {
      autoSend: false, // Let user review the prompt first
      source: 'budget_dashboard',
    });

    // Store context in ChatStore
    setContext(context);

    console.log('[BuddyInsightCard] Context set for handoff:', {
      type: context.type,
      healthScore: insight.healthScore,
      promptPreview: context.initialPrompt.substring(0, 100) + '...',
    });

    // Call external handler if provided, otherwise navigate directly
    if (onAskBuddy) {
      onAskBuddy();
    } else {
      // Default navigation to Buddy chat
      router.push('/agents/buddy/chat');
    }
  }, [insight, setContext, onAskBuddy, router]);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 p-6">
        <div className="flex items-center justify-center h-48">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <BrainCircuit className="w-12 h-12 text-purple-400/50" />
          </motion.div>
          <span className="ml-4 text-white/50">Buddy is analyzing...</span>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 p-6">
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <BrainCircuit className="w-12 h-12 text-purple-400/30 mb-4" />
          <p className="text-white/50">No insights available</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              Generate Insights
            </button>
          )}
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[insight.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border ${config.borderColor} shadow-2xl`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            background: [
              `radial-gradient(circle at 20% 20%, ${config.bgColor.replace('bg-', 'rgba(').replace('/10', ', 0.1)')} 0%, transparent 50%)`,
              `radial-gradient(circle at 80% 80%, ${config.bgColor.replace('bg-', 'rgba(').replace('/10', ', 0.1)')} 0%, transparent 50%)`,
              `radial-gradient(circle at 20% 20%, ${config.bgColor.replace('bg-', 'rgba(').replace('/10', ', 0.1)')} 0%, transparent 50%)`,
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 opacity-50"
        />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
              <BrainCircuit className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Buddy's Analysis
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300"
                >
                  AI
                </motion.span>
              </h3>
              <p className="text-xs text-white/40">
                Last updated: {new Date(insight.lastSyncedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-card/5 transition-colors group"
              title="Refresh insights"
            >
              <RefreshCw className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
            </button>
          )}
        </div>

        {/* Main content */}
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
          {/* Health Score */}
          <div className="flex flex-col items-center lg:items-start">
            <HealthScoreRing score={insight.healthScore} status={insight.status} />
            <div className="mt-4 text-center lg:text-left">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}>
                {React.createElement(config.icon, { className: 'w-4 h-4' })}
                {config.label}
              </span>
            </div>
          </div>

          {/* Summary & Highlights */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-card/5 border border-white/5">
              <p className="text-sm text-white/80 leading-relaxed">
                {insight.summary.split('\n')[0]}
              </p>
            </div>

            {/* Highlights */}
            {insight.highlights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Key Highlights
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insight.highlights.map((highlight, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card/5 text-white/70 border border-white/5"
                    >
                      <ChevronRight className="w-3 h-3 text-purple-400" />
                      {highlight}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Forecast */}
            {insight.forecast && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-card/5 border border-white/5">
                  <p className="text-xs text-white/40 mb-1">Projected</p>
                  <p className="text-lg font-semibold text-white">
                    ${insight.forecast.projectedMonthEnd.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card/5 border border-white/5">
                  <p className="text-xs text-white/40 mb-1">Trend</p>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={insight.forecast.trend} />
                    <span className="text-sm text-white capitalize">
                      {insight.forecast.trend}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-card/5 border border-white/5">
                  <p className="text-xs text-white/40 mb-1">Remaining</p>
                  <p className="text-lg font-semibold text-white">
                    ${insight.budget.remaining.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card/5 border border-white/5">
                  <p className="text-xs text-white/40 mb-1">Days Left</p>
                  <p className="text-lg font-semibold text-white">
                    {insight.budget.daysRemaining}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Anomalies Warning */}
        <AnimatePresence>
          {insight.anomalies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-400 mb-2">
                      {insight.anomalies.length} Anomal{insight.anomalies.length === 1 ? 'y' : 'ies'} Detected
                    </h4>
                    <ul className="space-y-1">
                      {insight.anomalies.slice(0, 3).map((anomaly, i) => (
                        <li key={i} className="text-xs text-red-300/70">
                          • {anomaly.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommendations */}
        {insight.recommendations.length > 0 && !compact && (
          <div className="mt-6">
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Lightbulb className="w-3 h-3" />
              Buddy's Recommendations
            </h4>
            <div className="space-y-2">
              {insight.recommendations.slice(0, 3).map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-card/5 border border-white/5"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <p className="text-sm text-white/70">{rec}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button - Always show, use internal handler */}
        <motion.button
          onClick={handleAskBuddyClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow group"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Ask Buddy for Details</span>
          <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default BuddyInsightCard;
