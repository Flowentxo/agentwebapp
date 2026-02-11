'use client';

/**
 * ActionDeck Component - "Tinder-like" Swipeable Approval Cards
 *
 * Renders as an overlay centered on CockpitCanvas.
 * Users can swipe right to approve, left to reject, or use fallback buttons.
 *
 * Part of Phase III: Operational Cockpit
 */

import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Mail,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApprovalRequest } from './ApprovalQueuePanel';

// ============================================
// TYPES
// ============================================

interface ActionDeckProps {
  approvals: ApprovalRequest[];
  onApprove: (approvalId: string, comment?: string) => Promise<void>;
  onReject: (approvalId: string, reason?: string) => Promise<void>;
  isProcessing?: boolean;
}

type SwipeDirection = 'left' | 'right' | null;

// ============================================
// SWIPE THRESHOLD
// ============================================

const SWIPE_THRESHOLD = 150;

// ============================================
// APPROVAL CARD
// ============================================

function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isTop,
}: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0.5, 1, 1, 1, 0.5]);

  // Background overlays for swipe direction
  const approveOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const [exitDirection, setExitDirection] = useState<SwipeDirection>(null);

  const handleDragEnd = useCallback(
    (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
      const swipeX = info.offset.x;
      const velocityX = info.velocity.x;

      // Approve: drag right past threshold or high velocity right
      if (swipeX > SWIPE_THRESHOLD || velocityX > 500) {
        setExitDirection('right');
        onApprove();
        return;
      }

      // Reject: drag left past threshold or high velocity left
      if (swipeX < -SWIPE_THRESHOLD || velocityX < -500) {
        setExitDirection('left');
        onReject();
        return;
      }
    },
    [onApprove, onReject]
  );

  const riskColor =
    approval.riskLevel === 'high'
      ? 'text-red-400'
      : approval.riskLevel === 'medium'
        ? 'text-amber-400'
        : 'text-emerald-400';

  return (
    <motion.div
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        isTop ? 'z-10' : 'z-0'
      )}
      style={{ pointerEvents: isTop ? 'auto' : 'none' }}
    >
      {/* Approve / Reject Background Labels */}
      {isTop && (
        <>
          <motion.div
            className="absolute left-8 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-2xl uppercase tracking-widest select-none"
            style={{ opacity: approveOpacity }}
          >
            Freigeben
          </motion.div>
          <motion.div
            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-400 font-bold text-2xl uppercase tracking-widest select-none"
            style={{ opacity: rejectOpacity }}
          >
            Ablehnen
          </motion.div>
        </>
      )}

      {/* Card */}
      <motion.div
        className="w-[420px] rounded-2xl border border-white/[0.08] bg-[#0c0c0c] shadow-2xl cursor-grab active:cursor-grabbing"
        style={isTop ? { x, rotate, opacity } : { scale: 0.95, y: 10, opacity: 0.5 }}
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={isTop ? handleDragEnd : undefined}
        exit={
          exitDirection === 'right'
            ? { x: 500, rotate: 20, opacity: 0 }
            : exitDirection === 'left'
              ? { x: -500, rotate: -20, opacity: 0 }
              : { opacity: 0 }
        }
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        {/* Card Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 uppercase tracking-wider">
              Genehmigung erforderlich
            </span>
            {approval.riskLevel && (
              <span className={cn('text-xs font-medium flex items-center gap-1', riskColor)}>
                <AlertTriangle className="w-3 h-3" />
                {approval.riskLevel === 'high'
                  ? 'Hohes Risiko'
                  : approval.riskLevel === 'medium'
                    ? 'Mittleres Risiko'
                    : 'Geringes Risiko'}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">{approval.nodeName}</h3>
          {approval.nodeType && (
            <p className="text-sm text-white/40 mt-0.5">{approval.nodeType}</p>
          )}
        </div>

        {/* Card Body - Context Data */}
        <div className="px-6 py-4 space-y-3">
          {/* AI Reasoning */}
          {approval.reasoning && (
            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
              <p className="text-xs text-violet-400 font-medium mb-1">KI-Begründung</p>
              <p className="text-sm text-white/70 leading-relaxed">{approval.reasoning}</p>
              {approval.confidenceScore != null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${approval.confidenceScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{approval.confidenceScore}%</span>
                </div>
              )}
            </div>
          )}

          {/* Context Fields */}
          {approval.contextData && (
            <div className="space-y-2">
              {approval.contextData.leadName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/60">{approval.contextData.leadName}</span>
                </div>
              )}
              {approval.contextData.leadEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/60">{approval.contextData.leadEmail}</span>
                </div>
              )}
              {approval.contextData.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/60">{approval.contextData.company}</span>
                </div>
              )}
              {approval.contextData.action && (
                <div className="flex items-center gap-2 text-sm">
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/60">{approval.contextData.action}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer - Fallback Buttons */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20
              text-red-400 text-sm font-medium
              hover:bg-red-500/20 hover:border-red-500/30 transition-all
              flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Ablehnen
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20
              text-emerald-400 text-sm font-medium
              hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all
              flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Freigeben
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ActionDeck({
  approvals,
  onApprove,
  onReject,
  isProcessing = false,
}: ActionDeckProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = useCallback(
    async (approvalId: string) => {
      if (processingId) return;
      setProcessingId(approvalId);
      try {
        await onApprove(approvalId);
      } finally {
        setProcessingId(null);
      }
    },
    [onApprove, processingId]
  );

  const handleReject = useCallback(
    async (approvalId: string) => {
      if (processingId) return;
      setProcessingId(approvalId);
      try {
        await onReject(approvalId);
      } finally {
        setProcessingId(null);
      }
    },
    [onReject, processingId]
  );

  if (approvals.length === 0) return null;

  // Show up to 2 cards (top card + peek of next)
  const visibleApprovals = approvals.slice(0, 2);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" />

      {/* Card count badge */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30">
          <span className="text-xs text-violet-300 font-medium">
            {approvals.length} {approvals.length === 1 ? 'Freigabe' : 'Freigaben'}
          </span>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <p className="text-xs text-white/30">
          ← Ablehnen · Freigeben →
        </p>
      </div>

      {/* Card Stack */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="popLayout">
          {visibleApprovals.map((approval, index) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              isTop={index === 0}
              onApprove={() => handleApprove(approval.id)}
              onReject={() => handleReject(approval.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ActionDeck;
