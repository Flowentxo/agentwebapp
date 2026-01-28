'use client';

/**
 * PendingApprovalsWidget Component
 *
 * Dashboard widget showing:
 * - Number of pending workflow approvals
 * - Most recent pending approval requests
 * - Quick approve/reject actions
 * - Link to full approvals inbox
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  GitBranch,
  ChevronRight,
  Loader2,
  Bell,
  AlertTriangle,
} from 'lucide-react';

interface ApprovalRequest {
  id: string;
  executionId: string;
  workflowId: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt?: string;
  workflow?: {
    id: string;
    name: string;
  };
}

interface PendingApprovalsWidgetProps {
  index?: number;
  isLoading?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function PendingApprovalsWidget({ index = 0, isLoading = false }: PendingApprovalsWidgetProps) {
  const router = useRouter();
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch pending approvals
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/workflows/approvals?status=pending&limit=5');

        if (response.ok) {
          const data = await response.json();
          setPendingApprovals(data.approvals || []);
          setPendingCount(data.stats?.pending || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending approvals:', error);
        // Use mock data for demo
        setPendingApprovals([]);
        setPendingCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchApprovals, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickApprove = async (approval: ApprovalRequest) => {
    setActionLoading(approval.id);
    try {
      const response = await fetch(`/api/workflows/executions/${approval.executionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        // Remove from list
        setPendingApprovals(prev => prev.filter(a => a.id !== approval.id));
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Quick approve failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickReject = async (approval: ApprovalRequest) => {
    setActionLoading(approval.id);
    try {
      const response = await fetch(`/api/workflows/executions/${approval.executionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({ action: 'reject', reason: 'Quick rejected from dashboard' }),
      });

      if (response.ok) {
        setPendingApprovals(prev => prev.filter(a => a.id !== approval.id));
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Quick reject failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="rounded-2xl p-5 animate-pulse
          bg-white dark:bg-zinc-900/40
          dark:backdrop-blur-xl
          border border-gray-200 dark:border-white/[0.06]
          shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
          dark:ring-1 dark:ring-inset dark:ring-white/[0.02]"
      >
        <div className="h-6 w-40 bg-gray-100 dark:bg-white/[0.04] rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
          <div className="h-12 bg-gray-100 dark:bg-white/[0.04] rounded-lg" />
          <div className="h-12 bg-gray-100 dark:bg-white/[0.04] rounded-lg" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative rounded-2xl overflow-hidden transition-all duration-300
        bg-white dark:bg-zinc-900/40
        dark:backdrop-blur-xl
        border border-gray-200 dark:border-white/[0.06]
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
        dark:ring-1 dark:ring-inset dark:ring-white/[0.02]
        hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] dark:hover:ring-orange-500/10 dark:hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]"
    >
      {/* Subtle top accent line - only in dark mode */}
      <div className="absolute top-0 left-0 right-0 h-px hidden dark:block bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              Pending Approvals
            </h2>
            <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground mt-0.5">Human-in-the-loop decisions</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400">
                  {pendingCount} PENDING
                </span>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/[0.06] border-b border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-orange-500">
            <Bell className="w-4 h-4" />
            {pendingCount}
          </div>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Pending</p>
        </div>
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-green-500">
            <CheckCircle className="w-4 h-4" />
            --
          </div>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Approved Today</p>
        </div>
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-red-500">
            <XCircle className="w-4 h-4" />
            --
          </div>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Rejected Today</p>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">Awaiting Decision</p>
          <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 mx-auto text-green-500/50 mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70 mt-1">No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {pendingApprovals.map((approval, i) => {
                const isExpired = approval.expiresAt && new Date(approval.expiresAt) < new Date();
                const isProcessing = actionLoading === approval.id;

                return (
                  <motion.div
                    key={approval.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${isExpired
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <p className="text-sm font-medium text-foreground truncate">
                            {approval.workflow?.name || 'Workflow'}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {approval.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(approval.createdAt)}
                          {isExpired && (
                            <span className="text-yellow-600 flex items-center gap-0.5 ml-1">
                              <AlertTriangle className="w-3 h-3" />
                              Expired
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickApprove(approval);
                              }}
                              className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-600 transition-colors"
                              title="Quick Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickReject(approval);
                              }}
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 transition-colors"
                              title="Quick Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
        <button
          onClick={() => router.push('/inbox?tab=approvals')}
          className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-sm font-medium text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          View All Approvals
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default PendingApprovalsWidget;
