'use client';

/**
 * ApprovalRequestCard Component
 *
 * High-visibility card/dialog for Human-in-the-Loop (HITL) approval requests.
 * Displays when a workflow is suspended waiting for human approval.
 *
 * Features:
 * - Prominent "Approval Required" banner
 * - Context data display
 * - Approve/Reject buttons with optional comment
 * - Expiration countdown
 * - Loading states during API calls
 *
 * Part of Phase 3: Human-in-the-Loop Implementation
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Calendar,
} from 'lucide-react';
import type { ApprovalData } from '@/hooks/useExecutionStreamV2';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalRequestCardProps {
  /** Approval data from the execution stream */
  approvalData: ApprovalData;
  /** Pipeline/Workflow ID for the API call */
  pipelineId: string;
  /** Execution ID for the API call */
  executionId: string;
  /** Callback when approval is submitted */
  onApprovalComplete?: (approved: boolean) => void;
  /** Callback to close/dismiss the card */
  onClose?: () => void;
}

interface ApprovalResponse {
  success: boolean;
  action: 'approved' | 'rejected';
  message?: string;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApprovalRequestCard({
  approvalData,
  pipelineId,
  executionId,
  onApprovalComplete,
  onClose,
}: ApprovalRequestCardProps) {
  const [comment, setComment] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(() =>
    formatTimeRemaining(approvalData.expiresAt)
  );

  // Update time remaining every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(approvalData.expiresAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [approvalData.expiresAt]);

  // Handle approval/rejection
  const handleSubmit = useCallback(
    async (approved: boolean) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await fetch(`/api/pipelines/${pipelineId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            executionId,
            action: approved ? 'approve' : 'reject',
            comment: comment.trim() || undefined,
          }),
        });

        const data: ApprovalResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit approval');
        }

        onApprovalComplete?.(approved);
      } catch (error) {
        console.error('[APPROVAL_CARD] Submit error:', error);
        setSubmitError(
          error instanceof Error ? error.message : 'Failed to submit approval'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [pipelineId, executionId, comment, onApprovalComplete]
  );

  const isExpired = new Date(approvalData.expiresAt) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 top-20 mx-auto max-w-lg z-50 p-4"
    >
      <div className="bg-card border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-white animate-pulse" />
              <span className="text-white font-bold text-lg">
                Approval Required
              </span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
                title="Minimize"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title & Description */}
          <div>
            <h3 className="text-foreground font-semibold text-lg">
              {approvalData.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {approvalData.description}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>Node: {approvalData.nodeName}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Requested: {formatDate(approvalData.requestedAt)}</span>
            </div>
            <div
              className={`flex items-center gap-1 ${
                isExpired ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeRemaining}</span>
            </div>
          </div>

          {/* Context Data Toggle */}
          {Object.keys(approvalData.contextData).length > 0 && (
            <div>
              <button
                onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showContext ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>
                  {showContext ? 'Hide' : 'Show'} Context Data
                </span>
              </button>

              <AnimatePresence>
                {showContext && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs text-foreground overflow-x-auto max-h-40 border border-border">
                      {JSON.stringify(approvalData.contextData, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Comment Input */}
          <div>
            <label className="flex items-center gap-1 text-sm text-muted-foreground mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isSubmitting || isExpired}
            />
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-red-600 text-sm">{submitError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {/* Reject Button */}
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isExpired}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-muted disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Reject
            </button>

            {/* Approve Button */}
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || isExpired}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-muted disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve
            </button>
          </div>

          {/* Expired Warning */}
          {isExpired && (
            <div className="flex items-center justify-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
              <span className="text-red-600 text-sm">
                This approval request has expired
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ApprovalRequestCard;
