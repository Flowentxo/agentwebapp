'use client';

/**
 * Approvals Dashboard Page
 *
 * Enterprise Human-in-the-Loop (HITL) approval management.
 * Lists all pending workflow approvals with Flight Recorder state view.
 *
 * Features:
 * - List all PENDING approval requests
 * - View Flight Recorder state for suspended workflows
 * - Approve/Reject with optional comments
 * - Context data diff viewer for data modification
 * - Real-time updates via Socket.IO
 *
 * Part of Phase 20: Human-in-the-Loop Implementation
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Eye,
  Edit3,
  MessageSquare,
  User,
  Calendar,
  Loader2,
  LayoutGrid,
  List,
  History,
  GitBranch,
  Database,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalRequest {
  id: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  title: string;
  message: string | null;
  contextData: Record<string, unknown>;
  previewData: Record<string, unknown> | null;
  suspendedState: {
    variables: Record<string, unknown>;
    nodeOutputs: Record<string, unknown>;
    currentNodeId: string;
  } | null;
  assignedUserId: string | null;
  expiresAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface FlightRecorderStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'expired';

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: ApprovalRequest['status']): string {
  switch (status) {
    case 'pending':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'approved':
      return 'text-green-400 bg-green-500/10 border-green-500/30';
    case 'rejected':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'expired':
      return 'text-muted-foreground bg-muted/500/10 border-gray-500/30';
    default:
      return 'text-muted-foreground bg-muted/500/10 border-gray-500/30';
  }
}

function getStatusIcon(status: ApprovalRequest['status']) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'approved':
      return <CheckCircle className="w-4 h-4" />;
    case 'rejected':
      return <XCircle className="w-4 h-4" />;
    case 'expired':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

// ============================================================================
// APPROVAL CARD COMPONENT
// ============================================================================

interface ApprovalCardProps {
  approval: ApprovalRequest;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, comment?: string) => Promise<void>;
  viewMode: ViewMode;
}

function ApprovalCard({
  approval,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  viewMode,
}: ApprovalCardProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComment, setShowComment] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(approval.id, comment);
      setComment('');
      setShowComment(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(approval.id, comment);
      setComment('');
      setShowComment(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = approval.status === 'pending';
  const isExpired = approval.expiresAt && new Date(approval.expiresAt) <= new Date();

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`
          flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer
          ${isSelected
            ? 'bg-indigo-500/10 border-indigo-500/50'
            : 'bg-card/50 border-border hover:bg-card hover:border-muted-foreground/30'
          }
        `}
        onClick={() => onSelect(approval.id)}
      >
        {/* Status Icon */}
        <div className={`p-2 rounded-lg ${getStatusColor(approval.status)}`}>
          {getStatusIcon(approval.status)}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{approval.title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(approval.status)}`}>
              {approval.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5" />
              {approval.workflowName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(approval.createdAt)}
            </span>
            {approval.expiresAt && (
              <span className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                {formatTimeRemaining(approval.expiresAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleReject(); }}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Reject
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleApprove(); }}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Approve
            </button>
          </div>
        )}

        {/* Expand Icon */}
        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        p-4 rounded-xl border transition-all cursor-pointer
        ${isSelected
          ? 'bg-indigo-500/10 border-indigo-500/50 ring-2 ring-indigo-500/30'
          : 'bg-card/50 border-border hover:bg-card hover:border-muted-foreground/30'
        }
      `}
      onClick={() => onSelect(approval.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${getStatusColor(approval.status)}`}>
          {getStatusIcon(approval.status)}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(approval.status)}`}>
          {approval.status.toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white font-medium mb-1 line-clamp-2">{approval.title}</h3>

      {/* Workflow */}
      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
        <GitBranch className="w-3.5 h-3.5" />
        {approval.workflowName}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span>{formatDate(approval.createdAt)}</span>
        {approval.expiresAt && (
          <span className={isExpired ? 'text-red-400' : 'text-amber-400'}>
            {formatTimeRemaining(approval.expiresAt)}
          </span>
        )}
      </div>

      {/* Actions */}
      {isPending && !isExpired && (
        <div className="space-y-2">
          <AnimatePresence>
            {showComment && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowComment(!showComment); }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 hover:bg-muted text-gray-300 text-sm rounded-lg transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReject(); }}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleApprove(); }}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// FLIGHT RECORDER PANEL
// ============================================================================

interface FlightRecorderPanelProps {
  approval: ApprovalRequest | null;
  steps: FlightRecorderStep[];
  isLoading: boolean;
}

function FlightRecorderPanel({ approval, steps, isLoading }: FlightRecorderPanelProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  if (!approval) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select an approval to view its execution state</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const currentStep = steps.find((s) => s.nodeId === approval.nodeId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Flight Recorder
          </h3>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${showDiff
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-muted'
              }
            `}
          >
            <Edit3 className="w-4 h-4 inline mr-1" />
            Edit Context
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Time-travel debugging for workflow execution
        </p>
      </div>

      {/* Suspended State */}
      {approval.suspendedState && (
        <div className="p-4 border-b border-border bg-amber-500/5">
          <h4 className="text-amber-400 font-medium text-sm mb-2 flex items-center gap-2">
            <Pause className="w-4 h-4" />
            Suspended at: {approval.nodeName}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Variables:</span>
              <span className="text-gray-300 ml-2">
                {Object.keys(approval.suspendedState.variables).length} items
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Node Outputs:</span>
              <span className="text-gray-300 ml-2">
                {Object.keys(approval.suspendedState.nodeOutputs).length} items
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Execution Steps Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCurrentNode = step.nodeId === approval.nodeId;
            const isSelected = selectedStep === step.id;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedStep(isSelected ? null : step.id)}
                className={`
                  relative pl-6 pb-3 cursor-pointer
                  ${index < steps.length - 1 ? 'border-l-2 border-border' : ''}
                `}
              >
                {/* Timeline Dot */}
                <div
                  className={`
                    absolute left-0 top-1 w-3 h-3 rounded-full -translate-x-1/2
                    ${isCurrentNode
                      ? 'bg-amber-500 ring-4 ring-amber-500/30'
                      : step.status === 'completed'
                        ? 'bg-green-500'
                        : step.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-muted/500'
                    }
                  `}
                />

                {/* Step Card */}
                <div
                  className={`
                    p-3 rounded-lg border transition-all
                    ${isSelected
                      ? 'bg-gray-700 border-indigo-500'
                      : isCurrentNode
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-card/50 border-border/50 hover:bg-card'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">{step.nodeName}</span>
                    <span className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${step.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : step.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : step.status === 'running'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-muted/500/20 text-muted-foreground'
                      }
                    `}>
                      {step.status}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {step.duration ? `${step.duration}ms` : 'Running...'}
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-gray-600 space-y-3">
                          {/* Input */}
                          <div>
                            <h5 className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> Input
                            </h5>
                            <pre className="p-2 bg-background rounded text-xs text-gray-300 overflow-x-auto max-h-32">
                              {JSON.stringify(step.input, null, 2)}
                            </pre>
                          </div>

                          {/* Output */}
                          {step.output && (
                            <div>
                              <h5 className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 rotate-180" /> Output
                              </h5>
                              <pre className="p-2 bg-background rounded text-xs text-gray-300 overflow-x-auto max-h-32">
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Error */}
                          {step.error && (
                            <div>
                              <h5 className="text-xs text-red-400 mb-1">Error</h5>
                              <pre className="p-2 bg-red-900/20 rounded text-xs text-red-300 overflow-x-auto">
                                {step.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Context Data Diff Viewer */}
      <AnimatePresence>
        {showDiff && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 bg-card/50">
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                Context Data Editor
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Modify context data before resuming the workflow
              </p>
              <textarea
                defaultValue={JSON.stringify(approval.contextData, null, 2)}
                className="w-full h-40 px-3 py-2 bg-background border border-border rounded-lg text-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowDiff(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-muted text-gray-300 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ApprovalsPage() {
  // State
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flightRecorderSteps, setFlightRecorderSteps] = useState<FlightRecorderStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/workflows/approvals?${params}`);
      if (!response.ok) throw new Error('Failed to fetch approvals');

      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (err) {
      console.error('[APPROVALS] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Fetch flight recorder steps when approval selected
  const fetchFlightRecorderSteps = useCallback(async (executionId: string) => {
    setIsLoadingSteps(true);

    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/steps`);
      if (!response.ok) throw new Error('Failed to fetch execution steps');

      const data = await response.json();
      setFlightRecorderSteps(data.steps || []);
    } catch (err) {
      console.error('[APPROVALS] Fetch steps error:', err);
      setFlightRecorderSteps([]);
    } finally {
      setIsLoadingSteps(false);
    }
  }, []);

  // Handle approval selection
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    const approval = approvals.find((a) => a.id === id);
    if (approval && id !== selectedId) {
      fetchFlightRecorderSteps(approval.executionId);
    }
  }, [approvals, selectedId, fetchFlightRecorderSteps]);

  // Handle approve
  const handleApprove = useCallback(async (id: string, comment?: string) => {
    const approval = approvals.find((a) => a.id === id);
    if (!approval) return;

    try {
      const response = await fetch(`/api/workflows/executions/${approval.executionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reason: comment,
        }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      // Refresh list
      fetchApprovals();
    } catch (err) {
      console.error('[APPROVALS] Approve error:', err);
    }
  }, [approvals, fetchApprovals]);

  // Handle reject
  const handleReject = useCallback(async (id: string, comment?: string) => {
    const approval = approvals.find((a) => a.id === id);
    if (!approval) return;

    try {
      const response = await fetch(`/api/workflows/executions/${approval.executionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: comment,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      // Refresh list
      fetchApprovals();
    } catch (err) {
      console.error('[APPROVALS] Reject error:', err);
    }
  }, [approvals, fetchApprovals]);

  // Initial fetch
  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Filter approvals by search
  const filteredApprovals = approvals.filter((approval) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      approval.title.toLowerCase().includes(query) ||
      approval.workflowName.toLowerCase().includes(query) ||
      approval.nodeName.toLowerCase().includes(query)
    );
  });

  const selectedApproval = approvals.find((a) => a.id === selectedId) || null;

  // Stats
  const stats = {
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
    expired: approvals.filter((a) => a.status === 'expired').length,
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              Approval Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Human-in-the-Loop workflow approvals
            </p>
          </div>

          <button
            onClick={fetchApprovals}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-muted disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Pending', value: stats.pending, color: 'amber' },
            { label: 'Approved', value: stats.approved, color: 'green' },
            { label: 'Rejected', value: stats.rejected, color: 'red' },
            { label: 'Expired', value: stats.expired, color: 'gray' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`p-4 rounded-xl border bg-${stat.color}-500/5 border-${stat.color}-500/20`}
            >
              <div className={`text-2xl font-bold text-${stat.color}-400`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search approvals..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 bg-card border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-card rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-muted-foreground hover:text-gray-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-muted-foreground hover:text-gray-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Approvals List */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-400">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No approval requests</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
              <AnimatePresence>
                {filteredApprovals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    isSelected={selectedId === approval.id}
                    onSelect={handleSelect}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    viewMode={viewMode}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Flight Recorder Panel */}
        <div className="w-96 border-l border-border flex flex-col min-h-0 bg-gray-850">
          <FlightRecorderPanel
            approval={selectedApproval}
            steps={flightRecorderSteps}
            isLoading={isLoadingSteps}
          />
        </div>
      </div>
    </div>
  );
}
