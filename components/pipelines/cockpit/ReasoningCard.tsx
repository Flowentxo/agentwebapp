'use client';

/**
 * ReasoningCard Component
 *
 * Displays AI reasoning and context for approval decisions.
 * Shows confidence score, risk level, and contributing factors.
 *
 * Vicy-Style: Deep Black (#050505) + Violet Glow for high confidence
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface ConfidenceFactor {
  label: string;
  score: number;
  impact: 'positive' | 'negative';
  description?: string;
}

export interface ReasoningData {
  /** AI-generated explanation for the decision */
  reasoning: string;
  /** Overall confidence score 0-100 */
  confidenceScore: number;
  /** Contributing factors with individual scores */
  confidenceFactors?: ConfidenceFactor[];
  /** Risk level assessment */
  riskLevel?: 'low' | 'medium' | 'high';
  /** Source of the reasoning (model, timestamp) */
  source?: {
    model?: string;
    timestamp?: string;
  };
}

interface ReasoningCardProps {
  data: ReasoningData;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  variant?: 'compact' | 'full';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getConfidenceColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function getConfidenceBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10';
  if (score >= 60) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function getConfidenceLabel(score: number): string {
  if (score >= 90) return 'Sehr Hoch';
  if (score >= 80) return 'Hoch';
  if (score >= 60) return 'Mittel';
  if (score >= 40) return 'Niedrig';
  return 'Sehr Niedrig';
}

function getRiskConfig(level: 'low' | 'medium' | 'high') {
  const configs = {
    low: {
      icon: Shield,
      label: 'Niedrig',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    medium: {
      icon: AlertTriangle,
      label: 'Mittel',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    high: {
      icon: AlertTriangle,
      label: 'Hoch',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
  };
  return configs[level];
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface ConfidenceBarProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function ConfidenceBar({ score, showLabel = true, size = 'md' }: ConfidenceBarProps) {
  const heightClass = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/40">Konfidenz</span>
          <span className={cn('text-xs font-medium', getConfidenceColor(score))}>
            {score}%
          </span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-white/[0.04] overflow-hidden', heightClass)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            score >= 80
              ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-400'
              : score >= 60
              ? 'bg-gradient-to-r from-amber-500/80 to-amber-400'
              : 'bg-gradient-to-r from-red-500/80 to-red-400'
          )}
        />
      </div>
    </div>
  );
}

interface FactorItemProps {
  factor: ConfidenceFactor;
}

function FactorItem({ factor }: FactorItemProps) {
  const isPositive = factor.impact === 'positive';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-lg',
        'bg-white/[0.02] border border-white/[0.04]',
        'hover:bg-white/[0.03] transition-colors'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'
        )}
      >
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{factor.label}</p>
        {factor.description && (
          <p className="text-xs text-white/40 truncate">{factor.description}</p>
        )}
      </div>

      <span
        className={cn(
          'flex-shrink-0 text-sm font-mono font-medium',
          isPositive ? 'text-emerald-400' : 'text-red-400'
        )}
      >
        {isPositive ? '+' : ''}{factor.score}
      </span>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ReasoningCard({
  data,
  isExpanded = false,
  onToggleExpand,
  className,
  variant = 'full',
}: ReasoningCardProps) {
  const { reasoning, confidenceScore, confidenceFactors, riskLevel, source } = data;

  const riskConfig = riskLevel ? getRiskConfig(riskLevel) : null;
  const RiskIcon = riskConfig?.icon || Info;

  // Sort factors by absolute score
  const sortedFactors = useMemo(() => {
    if (!confidenceFactors) return [];
    return [...confidenceFactors].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }, [confidenceFactors]);

  // Determine if this should have violet glow (high confidence)
  const hasVicyGlow = confidenceScore >= 85;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        'border border-white/[0.06]',
        hasVicyGlow && [
          'border-violet-500/30',
          'shadow-[0_0_60px_rgba(139,92,246,0.1)]',
        ],
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-4',
          'border-b border-white/[0.04]',
          hasVicyGlow && 'bg-violet-500/[0.02]'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              hasVicyGlow
                ? 'bg-violet-500/10 ring-1 ring-violet-500/20'
                : 'bg-white/[0.04]'
            )}
          >
            <Brain
              className={cn(
                'w-5 h-5',
                hasVicyGlow ? 'text-violet-400' : 'text-white/40'
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">KI-Begründung</h4>
              {hasVicyGlow && (
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              )}
            </div>
            <p className={cn('text-xs', getConfidenceColor(confidenceScore))}>
              {getConfidenceLabel(confidenceScore)} Konfidenz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {riskConfig && (
            <div
              className={cn(
                'px-2 py-1 rounded-lg flex items-center gap-1.5',
                riskConfig.bgColor,
                riskConfig.borderColor,
                'border'
              )}
            >
              <RiskIcon className={cn('w-3.5 h-3.5', riskConfig.color)} />
              <span className={cn('text-[10px] uppercase font-medium', riskConfig.color)}>
                Risiko: {riskConfig.label}
              </span>
            </div>
          )}

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-white/60 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Confidence Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ConfidenceBar score={confidenceScore} />
          </div>
          <div
            className={cn(
              'flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center',
              getConfidenceBgColor(confidenceScore)
            )}
          >
            <span className={cn('text-2xl font-bold', getConfidenceColor(confidenceScore))}>
              {confidenceScore}
            </span>
            <span className="text-[10px] text-white/30 uppercase">%</span>
          </div>
        </div>

        {/* Reasoning Text */}
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <p className="text-sm text-white/70 leading-relaxed">{reasoning}</p>
        </div>

        {/* Confidence Factors (Expandable) */}
        {(isExpanded || variant === 'full') && sortedFactors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/40 uppercase tracking-wider">
                Einflussfaktoren
              </span>
            </div>
            <div className="space-y-1.5">
              {sortedFactors.map((factor, index) => (
                <FactorItem key={index} factor={factor} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Source Info */}
        {source && (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Zap className="w-3 h-3" />
              <span>{source.model || 'GPT-4'}</span>
            </div>
            {source.timestamp && (
              <span className="text-xs text-white/20">
                {new Date(source.timestamp).toLocaleTimeString('de-DE')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPACT VARIANT
// ============================================

export function ReasoningCardCompact({
  data,
  className,
}: {
  data: ReasoningData;
  className?: string;
}) {
  const { confidenceScore, riskLevel } = data;
  const riskConfig = riskLevel ? getRiskConfig(riskLevel) : null;
  const hasVicyGlow = confidenceScore >= 85;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'border border-white/[0.06]',
        hasVicyGlow && 'border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.05)]',
        className
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          hasVicyGlow ? 'bg-violet-500/10' : 'bg-white/[0.04]'
        )}
      >
        <Brain className={cn('w-4 h-4', hasVicyGlow ? 'text-violet-400' : 'text-white/40')} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60 line-clamp-1">{data.reasoning}</p>
      </div>

      <div className="flex items-center gap-2">
        {riskConfig && (
          <riskConfig.icon className={cn('w-4 h-4', riskConfig.color)} />
        )}
        <div
          className={cn(
            'px-2 py-1 rounded-lg text-xs font-medium',
            getConfidenceBgColor(confidenceScore),
            getConfidenceColor(confidenceScore)
          )}
        >
          {confidenceScore}%
        </div>
      </div>
    </div>
  );
}

export default ReasoningCard;
