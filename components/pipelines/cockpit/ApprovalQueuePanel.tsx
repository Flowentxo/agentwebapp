'use client';

/**
 * ApprovalQueuePanel Component
 *
 * HITL Module: Shows pending approval requests as interactive cards.
 * Each card displays Lead-Score, waiting time, and expiration countdown.
 *
 * Vicy-Style: Deep Black (#050505) + Violet Glow for active requests
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Slack,
  Archive,
  Timer,
  Brain,
  Shield,
  AlertTriangle,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReasoningCard, ConfidenceFactor, ReasoningData } from './ReasoningCard';

// ============================================
// TYPES
// ============================================

export interface ApprovalRequest {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: string;
  expiresAt?: string;
  contextData?: {
    leadScore?: number;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    company?: string;
    source?: string;
    action?: string;
    customFields?: Record<string, unknown>;
  };
  // NEW: AI Reasoning
  reasoning?: string;
  confidenceScore?: number;
  confidenceFactors?: ConfidenceFactor[];
  riskLevel?: 'low' | 'medium' | 'high';
  // NEW: Execution Context
  triggeredByNodeId?: string;
  triggeredByNodeName?: string;
  inputData?: Record<string, unknown>;
}

interface ApprovalQueuePanelProps {
  approvals: ApprovalRequest[];
  onApprove: (approvalId: string, comment?: string) => Promise<void>;
  onReject: (approvalId: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatTimeRemaining(dateString: string): string | null {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 60) return `${diffMin}m left`;
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m left`;
  return `${Math.floor(diffHr / 24)}d left`;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500/10';
  if (score >= 40) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

// ============================================
// APPROVAL CARD COMPONENT
// ============================================

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  isProcessing?: boolean;
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isProcessing = false,
}: ApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeAgo, setTimeAgo] = useState(formatTimeAgo(approval.requestedAt));
  const [timeRemaining, setTimeRemaining] = useState(
    approval.expiresAt ? formatTimeRemaining(approval.expiresAt) : null
  );

  // Update time displays periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(approval.requestedAt));
      if (approval.expiresAt) {
        setTimeRemaining(formatTimeRemaining(approval.expiresAt));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [approval.requestedAt, approval.expiresAt]);

  const leadScore = approval.contextData?.leadScore;
  const hasHighConfidence = approval.confidenceScore !== undefined && approval.confidenceScore >= 85;
  const isUrgent = timeRemaining === 'Expired' || (leadScore && leadScore >= 70) || hasHighConfidence;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'rounded-xl border transition-all duration-300',
        'bg-white/[0.02]',
        isUrgent
          ? 'border-violet-500/40 shadow-[0_0_40px_rgba(139,92,246,0.15)]'
          : 'border-white/[0.06]',
        isExpanded && 'ring-1 ring-violet-500/20'
      )}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-amber-500/10 ring-1 ring-amber-500/30'
            )}
          >
            <AlertCircle className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 uppercase tracking-wider font-medium">
                Pending
              </span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Clock size={10} />
                {timeAgo}
              </span>
              {timeRemaining && (
                <>
                  <span className="text-white/20">·</span>
                  <span
                    className={cn(
                      'text-xs flex items-center gap-1',
                      timeRemaining === 'Expired' ? 'text-red-400' : 'text-white/40'
                    )}
                  >
                    <Timer size={10} />
                    {timeRemaining}
                  </span>
                </>
              )}
            </div>

            {/* Lead Info */}
            {approval.contextData?.leadName && (
              <h4 className="text-base font-medium text-white truncate">
                {approval.contextData.leadName}
              </h4>
            )}

            {/* Node Name */}
            <p className="text-sm text-white/50 truncate">
              {approval.nodeName}
            </p>

            {/* Lead Score + Confidence Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {leadScore !== undefined && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
                    getScoreBgColor(leadScore)
                  )}
                >
                  <TrendingUp size={14} className={getScoreColor(leadScore)} />
                  <span className={cn('text-sm font-semibold', getScoreColor(leadScore))}>
                    {leadScore}
                  </span>
                  <span className="text-xs text-white/30">Score</span>
                </div>
              )}

              {/* Confidence Badge (wenn vorhanden) */}
              {approval.confidenceScore !== undefined && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
                    approval.confidenceScore >= 80
                      ? 'bg-violet-500/10'
                      : approval.confidenceScore >= 60
                      ? 'bg-amber-500/10'
                      : 'bg-white/[0.04]'
                  )}
                >
                  <Brain size={14} className={
                    approval.confidenceScore >= 80
                      ? 'text-violet-400'
                      : approval.confidenceScore >= 60
                      ? 'text-amber-400'
                      : 'text-white/40'
                  } />
                  <span className={cn(
                    'text-sm font-semibold',
                    approval.confidenceScore >= 80
                      ? 'text-violet-400'
                      : approval.confidenceScore >= 60
                      ? 'text-amber-400'
                      : 'text-white/50'
                  )}>
                    {approval.confidenceScore}%
                  </span>
                  <span className="text-xs text-white/30">Konfidenz</span>
                </div>
              )}

              {/* Risk Level Badge */}
              {approval.riskLevel && (
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium uppercase',
                    approval.riskLevel === 'low'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : approval.riskLevel === 'medium'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-red-500/10 text-red-400'
                  )}
                >
                  {approval.riskLevel === 'low' ? (
                    <Shield size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  {approval.riskLevel === 'low' ? 'Niedrig' : approval.riskLevel === 'medium' ? 'Mittel' : 'Hoch'}
                </div>
              )}
            </div>
          </div>

          {/* Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.04]"
          >
            <div className="p-4 space-y-3">
              {/* Contact Info */}
              {(approval.contextData?.leadEmail || approval.contextData?.leadPhone) && (
                <div className="space-y-2">
                  {approval.contextData.leadEmail && (
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Mail size={14} className="text-white/30" />
                      {approval.contextData.leadEmail}
                    </div>
                  )}
                  {approval.contextData.leadPhone && (
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Phone size={14} className="text-white/30" />
                      {approval.contextData.leadPhone}
                    </div>
                  )}
                </div>
              )}

              {/* Company & Source */}
              {(approval.contextData?.company || approval.contextData?.source) && (
                <div className="flex items-center gap-3 text-xs text-white/40">
                  {approval.contextData.company && (
                    <span>{approval.contextData.company}</span>
                  )}
                  {approval.contextData.source && (
                    <>
                      <span className="text-white/20">·</span>
                      <span>via {approval.contextData.source}</span>
                    </>
                  )}
                </div>
              )}

              {/* Action Info */}
              {approval.contextData?.action && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-1">
                    Proposed Action
                  </p>
                  <p className="text-sm text-white/60">
                    {approval.contextData.action}
                  </p>
                </div>
              )}

              {/* AI Reasoning Card */}
              {approval.reasoning && approval.confidenceScore !== undefined && (
                <ReasoningCard
                  data={{
                    reasoning: approval.reasoning,
                    confidenceScore: approval.confidenceScore,
                    confidenceFactors: approval.confidenceFactors,
                    riskLevel: approval.riskLevel,
                    source: {
                      model: 'GPT-4',
                      timestamp: approval.requestedAt,
                    },
                  }}
                  variant="full"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="p-3 pt-0 flex items-center gap-2">
        <button
          onClick={() => onReject()}
          disabled={isProcessing}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'text-sm font-medium transition-all',
            'bg-white/[0.04] border border-white/[0.06]',
            'text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Archive size={16} />
          Ablehnen
        </button>
        <button
          onClick={() => onApprove()}
          disabled={isProcessing}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'text-sm font-medium transition-all',
            'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white',
            'hover:from-emerald-500 hover:to-emerald-400',
            'shadow-lg shadow-emerald-500/20',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Slack size={16} />
          Freigeben
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ApprovalQueuePanel({
  approvals,
  onApprove,
  onReject,
  isLoading = false,
}: ApprovalQueuePanelProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filter only pending approvals
  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'pending'),
    [approvals]
  );

  const handleApprove = async (approvalId: string, comment?: string) => {
    setProcessingIds((prev) => new Set(prev).add(approvalId));
    try {
      await onApprove(approvalId, comment);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  const handleReject = async (approvalId: string, reason?: string) => {
    setProcessingIds((prev) => new Set(prev).add(approvalId));
    try {
      await onReject(approvalId, reason);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  if (pendingApprovals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
            Wartende Entscheidungen
          </span>
        </div>
        <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/[0.04]">
          {pendingApprovals.length}
        </span>
      </div>

      {/* Approval Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={(comment) => handleApprove(approval.id, comment)}
              onReject={(reason) => handleReject(approval.id, reason)}
              isProcessing={processingIds.has(approval.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default ApprovalQueuePanel;
