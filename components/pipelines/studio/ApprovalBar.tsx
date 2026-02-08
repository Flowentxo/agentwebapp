'use client';

/**
 * ApprovalBar Component
 *
 * Fixed bottom bar for Human-in-the-Loop approval during pipeline execution.
 * Appears when a HumanApprovalNode is reached and awaiting user decision.
 *
 * Vicy-Style: Deep Black (#050505) + Violet Glow
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  User,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface ApprovalBarProps {
  isVisible: boolean;
  nodeId: string;
  nodeName: string;
  nodeDescription?: string;
  context?: {
    previousOutput?: string;
    instruction?: string;
    data?: Record<string, unknown>;
  };
  onApprove: (comment?: string) => void;
  onReject: (reason?: string) => void;
  onExpand?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ApprovalBar({
  isVisible,
  nodeId,
  nodeName,
  nodeDescription,
  context,
  onApprove,
  onReject,
  onExpand,
}: ApprovalBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleApprove = () => {
    onApprove(comment || undefined);
    setComment('');
    setShowRejectInput(false);
  };

  const handleReject = () => {
    if (showRejectInput) {
      onReject(rejectReason || undefined);
      setRejectReason('');
      setShowRejectInput(false);
    } else {
      setShowRejectInput(true);
    }
  };

  const handleCancel = () => {
    setShowRejectInput(false);
    setRejectReason('');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            marginLeft: '288px', // Sidebar width
          }}
        >
          {/* Glow Effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(139, 92, 246, 0.08), transparent)',
              filter: 'blur(40px)',
            }}
          />

          <div
            className="relative border-t border-violet-500/30"
            style={{
              background: '#050505',
              boxShadow: '0 -10px 60px rgba(139, 92, 246, 0.1)',
            }}
          >
            {/* Main Bar */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                    bg-amber-500/10 ring-1 ring-amber-500/30"
                >
                  <AlertCircle className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 uppercase tracking-wider font-medium">
                      Action Required
                    </span>
                    <span className="text-white/30">·</span>
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Clock size={12} />
                      Awaiting approval
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mt-1">
                    {nodeName}
                  </h3>
                  {nodeDescription && (
                    <p className="text-sm text-white/50 mt-0.5 line-clamp-1">
                      {nodeDescription}
                    </p>
                  )}
                </div>

                {/* Expand Button */}
                {context && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg
                      text-white/40 hover:text-white/60 hover:bg-white/[0.04]
                      transition-colors text-sm"
                  >
                    <FileText size={16} />
                    Context
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronUp size={14} />
                    )}
                  </button>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {showRejectInput ? (
                    <>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]
                          text-white placeholder-white/30 text-sm w-64
                          focus:outline-none focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20"
                        autoFocus
                      />
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium
                          text-white/50 hover:text-white/70 hover:bg-white/[0.04]
                          transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium
                          bg-red-500/20 text-red-400 hover:bg-red-500/30
                          transition-colors flex items-center gap-2"
                      >
                        <XCircle size={16} />
                        Confirm Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleReject}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium
                          bg-white/[0.04] border border-white/[0.08] text-white/60
                          hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400
                          transition-all flex items-center gap-2"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                      <button
                        onClick={handleApprove}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium
                          bg-gradient-to-r from-emerald-600 to-emerald-500 text-white
                          hover:from-emerald-500 hover:to-emerald-400
                          shadow-lg shadow-emerald-500/20
                          transition-all flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Approve & Continue
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Context */}
            <AnimatePresence>
              {isExpanded && context && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/[0.06] overflow-hidden"
                >
                  <div className="px-6 py-4 space-y-4">
                    {/* Previous Output */}
                    {context.previousOutput && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <MessageSquare size={12} />
                          Previous Step Output
                        </p>
                        <pre className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm text-white/70 font-mono overflow-x-auto max-h-32">
                          {context.previousOutput}
                        </pre>
                      </div>
                    )}

                    {/* Instruction */}
                    {context.instruction && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                          Instruction
                        </p>
                        <p className="text-sm text-white/60">
                          {context.instruction}
                        </p>
                      </div>
                    )}

                    {/* Additional Data */}
                    {context.data && Object.keys(context.data).length > 0 && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                          Data
                        </p>
                        <pre className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm text-white/50 font-mono overflow-x-auto max-h-32">
                          {JSON.stringify(context.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Comment Input */}
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <User size={12} />
                        Add Comment (Optional)
                      </p>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add a note for the audit trail..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]
                          text-white placeholder-white/20 text-sm resize-none
                          focus:outline-none focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ApprovalBar;
