'use client';

/**
 * Flowent Inbox v2 - Decision Card Component
 * HITL approval/rejection interface for suspended workflows
 */

import { useState, memo } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Zap,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatActionType, formatCost } from '@/lib/hooks/useWorkflowActions';
import type { ChatMessage, ApprovalStatus } from '@/types/inbox';

interface DecisionCardProps {
  message: ChatMessage;
  agentColor?: string;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  isProcessing?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusConfig(status: ApprovalStatus) {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle2,
        label: 'Approved',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        textColor: 'text-emerald-400',
        iconColor: 'text-emerald-400',
      };
    case 'rejected':
      return {
        icon: XCircle,
        label: 'Rejected',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
        iconColor: 'text-red-400',
      };
    case 'expired':
      return {
        icon: Timer,
        label: 'Expired',
        bgColor: 'bg-muted',
        borderColor: 'border-border',
        textColor: 'text-muted-foreground',
        iconColor: 'text-muted-foreground',
      };
    case 'pending':
    default:
      return {
        icon: AlertTriangle,
        label: 'Pending',
        bgColor: 'bg-amber-500/5',
        borderColor: 'border-amber-500/30',
        textColor: 'text-amber-400',
        iconColor: 'text-amber-400',
      };
  }
}

function DecisionCardComponent({
  message,
  agentColor = '#8b5cf6',
  onApprove,
  onReject,
  isProcessing = false,
}: DecisionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localProcessing, setLocalProcessing] = useState<'approve' | 'reject' | null>(null);

  const approval = message.approval;
  if (!approval) return null;

  const status = approval.status;
  const isPending = status === 'pending';
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const handleApprove = async () => {
    if (isProcessing || localProcessing) return;
    setLocalProcessing('approve');
    try {
      await onApprove();
    } finally {
      setLocalProcessing(null);
    }
  };

  const handleReject = async () => {
    if (isProcessing || localProcessing) return;
    setLocalProcessing('reject');
    try {
      await onReject();
    } finally {
      setLocalProcessing(null);
    }
  };

  const processingState = isProcessing || localProcessing;

  return (
    <div className="flex gap-3 mb-4">
      {/* Agent Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: agentColor }}
      >
        {message.agentName?.charAt(0) || 'A'}
      </div>

      {/* Decision Card */}
      <div className="flex-1 min-w-0 max-w-[85%]">
        {/* Agent name and timestamp */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">
            {message.agentName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>

        {/* Main Card */}
        <div
          className={cn(
            'rounded-xl border-2 overflow-hidden transition-all duration-200',
            statusConfig.bgColor,
            statusConfig.borderColor
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'p-1.5 rounded-lg',
                  isPending ? 'bg-amber-500/20' : 'bg-muted'
                )}
              >
                <StatusIcon
                  className={cn(
                    'w-4 h-4',
                    statusConfig.iconColor,
                    isPending && 'animate-pulse'
                  )}
                />
              </div>
              <div className="flex-1">
                <h4 className={cn('text-sm font-semibold', statusConfig.textColor)}>
                  {isPending ? 'Approval Required' : statusConfig.label}
                </h4>
                {!isPending && approval.resolvedAt && (
                  <p className="text-xs text-muted-foreground">
                    {status === 'approved' ? 'Approved' : 'Rejected'} by you at{' '}
                    {new Date(approval.resolvedAt).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              {/* Status Badge for non-pending */}
              {!isPending && (
                <span
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    status === 'approved' && 'bg-emerald-500/20 text-emerald-500',
                    status === 'rejected' && 'bg-red-500/20 text-red-600',
                    status === 'expired' && 'bg-muted text-muted-foreground'
                  )}
                >
                  {statusConfig.label}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            {/* Action Description */}
            <p className="text-sm text-muted-foreground mb-3">
              <span className="font-medium text-foreground">{message.agentName}</span>
              {' wants to '}
              <span className="font-medium text-foreground">
                {formatActionType(approval.actionType)}
              </span>
              {approval.cost !== undefined && (
                <>
                  {' for '}
                  <span className="font-semibold text-amber-600">
                    {formatCost(approval.cost)}
                  </span>
                </>
              )}
            </p>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
              {approval.cost !== undefined && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Est. Cost: {formatCost(approval.cost)}
                </span>
              )}
              {approval.estimatedTokens !== undefined && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  ~{approval.estimatedTokens.toLocaleString()} tokens
                </span>
              )}
              {approval.expiresAt && isPending && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires in{' '}
                  {Math.max(
                    0,
                    Math.round(
                      (new Date(approval.expiresAt).getTime() - Date.now()) /
                        (1000 * 60)
                    )
                  )}
                  m
                </span>
              )}
            </div>

            {/* Context Message */}
            <p className="text-sm text-muted-foreground mb-3">{message.content}</p>

            {/* Expandable Preview */}
            {approval.previewData && (
              <div className="mb-3">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {isExpanded ? 'Hide' : 'Show'} details
                </button>
                {isExpanded && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-xl border-2 border-border overflow-x-auto">
                    <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                      {typeof approval.previewData === 'string'
                        ? approval.previewData
                        : JSON.stringify(approval.previewData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Rejection Reason (if rejected) */}
            {status === 'rejected' && approval.rejectionReason && (
              <div className="p-3 bg-red-500/10 rounded-xl border-2 border-red-500/30 mb-3">
                <p className="text-xs text-red-600">
                  <span className="font-medium">Reason:</span>{' '}
                  {approval.rejectionReason}
                </p>
              </div>
            )}

            {/* Action Buttons (only for pending) */}
            {isPending && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={!!processingState}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200',
                    'bg-emerald-600 hover:bg-emerald-500 text-white',
                    'shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600'
                  )}
                >
                  {localProcessing === 'approve' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!processingState}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                    'bg-muted hover:bg-slate-200 text-foreground hover:text-foreground',
                    'border-2 border-border hover:border-border',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted'
                  )}
                >
                  {localProcessing === 'reject' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Reject
                </button>
              </div>
            )}
          </div>

          {/* Security Notice */}
          {isPending && (
            <div className="px-4 py-2 bg-muted/50 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span>
                  This action requires your explicit approval before proceeding.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const DecisionCard = memo(DecisionCardComponent);
