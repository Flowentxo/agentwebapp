'use client';

/**
 * Flowent Inbox v3 - ToolSuggestionCard Component
 *
 * Renders inline tool action suggestions within message bubbles.
 * Features Grok-style violet glow design with approve/reject actions.
 *
 * Integrates with ToolActionParser types for consistent action handling.
 */

import { useState, memo, useCallback } from 'react';
import {
  Mail,
  Users,
  Calendar,
  Database,
  FileSpreadsheet,
  Workflow,
  Globe,
  File,
  Zap,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES (aligned with ToolActionParser)
// ============================================================================

export type ToolActionType =
  | 'gmail-send-message'
  | 'gmail-draft-email'
  | 'gmail-reply'
  | 'hubspot-create-contact'
  | 'hubspot-update-deal'
  | 'hubspot-create-task'
  | 'hubspot-log-activity'
  | 'calendar-create-event'
  | 'calendar-reschedule'
  | 'data-export'
  | 'data-transform'
  | 'spreadsheet-update'
  | 'workflow-trigger'
  | 'workflow-schedule'
  | 'external-api-call'
  | 'file-operation'
  | 'custom';

export interface ToolAction {
  id: string;
  type: ToolActionType;
  params: Record<string, unknown>;
  preview?: string;
}

export interface ToolSuggestionCardProps {
  action: ToolAction;
  agentName?: string;
  agentColor?: string;
  onApprove: (actionId: string) => Promise<void>;
  onReject: (actionId: string, reason?: string) => Promise<void>;
  isProcessing?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const TOOL_ICONS: Record<ToolActionType, React.ElementType> = {
  'gmail-send-message': Mail,
  'gmail-draft-email': Mail,
  'gmail-reply': Mail,
  'hubspot-create-contact': Users,
  'hubspot-update-deal': Users,
  'hubspot-create-task': Users,
  'hubspot-log-activity': Users,
  'calendar-create-event': Calendar,
  'calendar-reschedule': Calendar,
  'data-export': Database,
  'data-transform': Database,
  'spreadsheet-update': FileSpreadsheet,
  'workflow-trigger': Workflow,
  'workflow-schedule': Workflow,
  'external-api-call': Globe,
  'file-operation': File,
  'custom': Zap,
};

const TOOL_COLORS: Record<ToolActionType, string> = {
  'gmail-send-message': '#EA4335',
  'gmail-draft-email': '#EA4335',
  'gmail-reply': '#EA4335',
  'hubspot-create-contact': '#FF7A59',
  'hubspot-update-deal': '#FF7A59',
  'hubspot-create-task': '#FF7A59',
  'hubspot-log-activity': '#FF7A59',
  'calendar-create-event': '#4285F4',
  'calendar-reschedule': '#4285F4',
  'data-export': '#10B981',
  'data-transform': '#10B981',
  'spreadsheet-update': '#34A853',
  'workflow-trigger': '#8B5CF6',
  'workflow-schedule': '#8B5CF6',
  'external-api-call': '#6366F1',
  'file-operation': '#F59E0B',
  'custom': '#8B5CF6',
};

const TOOL_LABELS: Record<ToolActionType, string> = {
  'gmail-send-message': 'Send Email',
  'gmail-draft-email': 'Draft Email',
  'gmail-reply': 'Reply to Email',
  'hubspot-create-contact': 'Create Contact',
  'hubspot-update-deal': 'Update Deal',
  'hubspot-create-task': 'Create Task',
  'hubspot-log-activity': 'Log Activity',
  'calendar-create-event': 'Create Event',
  'calendar-reschedule': 'Reschedule Event',
  'data-export': 'Export Data',
  'data-transform': 'Transform Data',
  'spreadsheet-update': 'Update Spreadsheet',
  'workflow-trigger': 'Trigger Workflow',
  'workflow-schedule': 'Schedule Workflow',
  'external-api-call': 'External API Call',
  'file-operation': 'File Operation',
  'custom': 'Custom Action',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generatePreview(action: ToolAction): string {
  if (action.preview) return action.preview;

  const params = action.params;

  switch (action.type) {
    case 'gmail-send-message':
    case 'gmail-draft-email':
      return `To: ${params.to || 'recipient'}\nSubject: ${params.subject || 'No subject'}`;
    case 'gmail-reply':
      return `Reply to thread: ${params.threadId || 'unknown'}`;
    case 'hubspot-create-contact':
      return `Contact: ${params.email || params.name || 'New contact'}`;
    case 'hubspot-update-deal':
      return `Deal: ${params.dealName || params.dealId || 'Update deal'}`;
    case 'hubspot-create-task':
      return `Task: ${params.subject || 'New task'}`;
    case 'calendar-create-event':
      return `Event: ${params.title || 'New event'}\nTime: ${params.startTime || 'TBD'}`;
    case 'calendar-reschedule':
      return `Reschedule: ${params.eventId || 'event'}`;
    case 'data-export':
      return `Export: ${params.format || 'CSV'} - ${params.dataSource || 'data'}`;
    case 'data-transform':
      return `Transform: ${params.operation || 'process'} data`;
    case 'spreadsheet-update':
      return `Sheet: ${params.sheetName || 'Sheet1'}\nCell: ${params.range || 'A1'}`;
    case 'workflow-trigger':
      return `Workflow: ${params.workflowName || params.workflowId || 'workflow'}`;
    case 'workflow-schedule':
      return `Schedule: ${params.schedule || 'on demand'}`;
    case 'external-api-call':
      return `API: ${params.method || 'GET'} ${params.url || 'endpoint'}`;
    case 'file-operation':
      return `File: ${params.operation || 'process'} ${params.fileName || 'file'}`;
    default:
      return JSON.stringify(params, null, 2).slice(0, 100);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

function ToolSuggestionCardComponent({
  action,
  agentName = 'AI Assistant',
  agentColor = '#8b5cf6',
  onApprove,
  onReject,
  isProcessing = false,
  status = 'pending',
}: ToolSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localProcessing, setLocalProcessing] = useState<'approve' | 'reject' | null>(null);

  const Icon = TOOL_ICONS[action.type] || Zap;
  const toolColor = TOOL_COLORS[action.type] || '#8B5CF6';
  const toolLabel = TOOL_LABELS[action.type] || 'Action';
  const preview = generatePreview(action);
  const isPending = status === 'pending';

  const handleApprove = useCallback(async () => {
    if (isProcessing || localProcessing) return;
    setLocalProcessing('approve');
    try {
      await onApprove(action.id);
    } finally {
      setLocalProcessing(null);
    }
  }, [action.id, isProcessing, localProcessing, onApprove]);

  const handleReject = useCallback(async () => {
    if (isProcessing || localProcessing) return;
    setLocalProcessing('reject');
    try {
      await onReject(action.id);
    } finally {
      setLocalProcessing(null);
    }
  }, [action.id, isProcessing, localProcessing, onReject]);

  const processingState = isProcessing || localProcessing;

  // Status-based styling
  const statusStyles = {
    pending: {
      border: 'border-violet-500/40',
      bg: 'bg-violet-500/5',
      glow: 'shadow-lg shadow-violet-500/20',
      pulse: true,
    },
    approved: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      glow: '',
      pulse: false,
    },
    rejected: {
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
      glow: '',
      pulse: false,
    },
    expired: {
      border: 'border-border',
      bg: 'bg-muted',
      glow: '',
      pulse: false,
    },
  };

  const currentStyle = statusStyles[status];

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 overflow-hidden transition-all duration-300',
        currentStyle.border,
        currentStyle.bg,
        currentStyle.glow,
        isPending && 'hover:border-violet-400/60 hover:shadow-violet-500/30'
      )}
    >
      {/* Animated glow effect for pending state */}
      {isPending && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -inset-2 opacity-20 blur-xl animate-pulse"
            style={{
              background: `radial-gradient(ellipse at center, ${toolColor}40 0%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 py-3 border-b border-border">
        {/* Tool Icon with color */}
        <div
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
            isPending && 'animate-pulse'
          )}
          style={{ backgroundColor: `${toolColor}20` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: toolColor }} />
        </div>

        {/* Action Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{toolLabel}</span>
            {isPending && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded text-[10px] font-medium text-primary">
                <Sparkles className="w-2.5 h-2.5" />
                Suggested
              </span>
            )}
            {status === 'approved' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 rounded text-[10px] font-medium text-emerald-500">
                <Check className="w-2.5 h-2.5" />
                Approved
              </span>
            )}
            {status === 'rejected' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 rounded text-[10px] font-medium text-red-600">
                <X className="w-2.5 h-2.5" />
                Rejected
              </span>
            )}
            {status === 'expired' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                Expired
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Proposed by <span className="text-foreground">{agentName}</span>
          </p>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Preview (collapsible) */}
      {isExpanded && (
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {preview}
          </pre>
        </div>
      )}

      {/* Action Buttons (only for pending) */}
      {isPending && (
        <div className="relative px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Approve Button - Green with glow */}
            <button
              onClick={handleApprove}
              disabled={!!processingState}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200',
                'bg-emerald-600 hover:bg-emerald-500 text-white',
                'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
                'hover:scale-[1.02] active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-emerald-600'
              )}
            >
              {localProcessing === 'approve' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Ausführen
            </button>

            {/* Reject Button */}
            <button
              onClick={handleReject}
              disabled={!!processingState}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                'bg-muted hover:bg-slate-200 text-foreground hover:text-foreground',
                'border-2 border-border hover:border-red-300',
                'hover:bg-red-500/10',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted disabled:hover:border-border'
              )}
            >
              {localProcessing === 'reject' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Ablehnen
            </button>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>This action requires your approval before execution</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const ToolSuggestionCard = memo(ToolSuggestionCardComponent);

// ============================================================================
// INLINE TOOL ACTION RENDERER
// ============================================================================

interface InlineToolActionsProps {
  actions: ToolAction[];
  agentName?: string;
  agentColor?: string;
  onApprove: (actionId: string) => Promise<void>;
  onReject: (actionId: string, reason?: string) => Promise<void>;
  isProcessing?: boolean;
  processingId?: string;
  resolvedActions?: Record<string, 'approved' | 'rejected' | 'expired'>;
}

export function InlineToolActions({
  actions,
  agentName,
  agentColor,
  onApprove,
  onReject,
  isProcessing = false,
  processingId,
  resolvedActions = {},
}: InlineToolActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {actions.map((action) => (
        <ToolSuggestionCard
          key={action.id}
          action={action}
          agentName={agentName}
          agentColor={agentColor}
          onApprove={onApprove}
          onReject={onReject}
          isProcessing={isProcessing && processingId === action.id}
          status={resolvedActions[action.id] || 'pending'}
        />
      ))}
    </div>
  );
}
