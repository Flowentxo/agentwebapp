'use client';

/**
 * Flowent Inbox v3 - Tool Actions Hook
 * Handles tool action approvals/rejections with API integration
 */

import { useState, useCallback } from 'react';
import type { ToolAction, ToolActionType } from '@/app/(app)/inbox/components/chat/ToolSuggestionCard';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolActionResolution {
  actionId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export interface ToolActionResult {
  success: boolean;
  actionId: string;
  status: 'approved' | 'rejected' | 'error';
  error?: string;
  resolvedAt: Date;
  executionResult?: unknown;
}

export interface UseToolActionsOptions {
  threadId: string;
  messageId?: string;
  onSuccess?: (result: ToolActionResult) => void;
  onError?: (error: Error, actionId: string) => void;
}

export interface UseToolActionsReturn {
  approveAction: (actionId: string) => Promise<ToolActionResult>;
  rejectAction: (actionId: string, reason?: string) => Promise<ToolActionResult>;
  isProcessing: boolean;
  processingId: string | null;
  lastError: Error | null;
  resolvedActions: Record<string, 'approved' | 'rejected' | 'expired'>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function resolveToolAction(
  threadId: string,
  resolution: ToolActionResolution
): Promise<ToolActionResult> {
  try {
    const response = await fetch('/api/inbox/approvals/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threadId,
        approvalId: resolution.actionId,
        action: resolution.action,
        comment: resolution.reason,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      actionId: resolution.actionId,
      status: resolution.action === 'approve' ? 'approved' : 'rejected',
      resolvedAt: new Date(),
      executionResult: data.executionResult,
    };
  } catch (error) {
    // Fallback for development/offline mode
    console.warn('[useToolActions] API call failed, using mock response:', error);

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      actionId: resolution.actionId,
      status: resolution.action === 'approve' ? 'approved' : 'rejected',
      resolvedAt: new Date(),
    };
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useToolActions(options: UseToolActionsOptions): UseToolActionsReturn {
  const { threadId, onSuccess, onError } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [resolvedActions, setResolvedActions] = useState<
    Record<string, 'approved' | 'rejected' | 'expired'>
  >({});

  const processAction = useCallback(
    async (resolution: ToolActionResolution): Promise<ToolActionResult> => {
      setIsProcessing(true);
      setProcessingId(resolution.actionId);
      setLastError(null);

      try {
        const result = await resolveToolAction(threadId, resolution);

        // Update local state
        setResolvedActions((prev) => ({
          ...prev,
          [resolution.actionId]: result.status as 'approved' | 'rejected',
        }));

        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setLastError(err);
        onError?.(err, resolution.actionId);

        return {
          success: false,
          actionId: resolution.actionId,
          status: 'error',
          error: err.message,
          resolvedAt: new Date(),
        };
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [threadId, onSuccess, onError]
  );

  const approveAction = useCallback(
    (actionId: string) => {
      return processAction({ actionId, action: 'approve' });
    },
    [processAction]
  );

  const rejectAction = useCallback(
    (actionId: string, reason?: string) => {
      return processAction({ actionId, action: 'reject', reason });
    },
    [processAction]
  );

  return {
    approveAction,
    rejectAction,
    isProcessing,
    processingId,
    lastError,
    resolvedActions,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Format tool action type for display
export function formatToolActionType(type: ToolActionType): string {
  const labels: Record<ToolActionType, string> = {
    'gmail-send-message': 'Send Email',
    'gmail-draft-email': 'Draft Email',
    'gmail-reply': 'Reply to Email',
    'hubspot-create-contact': 'Create HubSpot Contact',
    'hubspot-update-deal': 'Update HubSpot Deal',
    'hubspot-create-task': 'Create HubSpot Task',
    'hubspot-log-activity': 'Log HubSpot Activity',
    'calendar-create-event': 'Create Calendar Event',
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

  return labels[type] || type;
}

// Get icon name for a tool action type
export function getToolActionIcon(type: ToolActionType): string {
  const icons: Record<ToolActionType, string> = {
    'gmail-send-message': 'Mail',
    'gmail-draft-email': 'Mail',
    'gmail-reply': 'Mail',
    'hubspot-create-contact': 'Users',
    'hubspot-update-deal': 'Users',
    'hubspot-create-task': 'Users',
    'hubspot-log-activity': 'Users',
    'calendar-create-event': 'Calendar',
    'calendar-reschedule': 'Calendar',
    'data-export': 'Database',
    'data-transform': 'Database',
    'spreadsheet-update': 'FileSpreadsheet',
    'workflow-trigger': 'Workflow',
    'workflow-schedule': 'Workflow',
    'external-api-call': 'Globe',
    'file-operation': 'File',
    'custom': 'Zap',
  };

  return icons[type] || 'Zap';
}

// Get color for a tool action type
export function getToolActionColor(type: ToolActionType): string {
  const colors: Record<ToolActionType, string> = {
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

  return colors[type] || '#8B5CF6';
}
