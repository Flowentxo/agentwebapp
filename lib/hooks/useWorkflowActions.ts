'use client';

/**
 * Flowent Inbox v2 - Workflow Actions Hook
 * Handles HITL approval/rejection with optimistic updates
 */

import { useState, useCallback } from 'react';
import type { ApprovalStatus, ApprovalActionPayload } from '@/types/inbox';

interface ApprovalResult {
  success: boolean;
  error?: string;
  approvalId: string;
  status: ApprovalStatus;
  resolvedAt: Date;
  resolvedBy: string;
}

interface UseWorkflowActionsOptions {
  onApprovalSuccess?: (result: ApprovalResult) => void;
  onApprovalError?: (error: Error, payload: ApprovalActionPayload) => void;
}

interface UseWorkflowActionsReturn {
  approveWorkflow: (payload: ApprovalActionPayload) => Promise<ApprovalResult>;
  rejectWorkflow: (payload: ApprovalActionPayload) => Promise<ApprovalResult>;
  isProcessing: boolean;
  processingId: string | null;
  lastError: Error | null;
}

// Simulated API delay for development
const MOCK_API_DELAY = 800;

// Mock API call for approvals
async function mockApprovalApi(
  payload: ApprovalActionPayload
): Promise<ApprovalResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY));

  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Network error: Failed to process approval. Please try again.');
  }

  return {
    success: true,
    approvalId: payload.messageId,
    status: payload.action === 'approve' ? 'approved' : 'rejected',
    resolvedAt: new Date(),
    resolvedBy: 'current-user', // Would come from auth context
  };
}

export function useWorkflowActions(
  options: UseWorkflowActionsOptions = {}
): UseWorkflowActionsReturn {
  const { onApprovalSuccess, onApprovalError } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const processApproval = useCallback(
    async (payload: ApprovalActionPayload): Promise<ApprovalResult> => {
      setIsProcessing(true);
      setProcessingId(payload.messageId);
      setLastError(null);

      try {
        // In production, this would call the real API:
        // const response = await fetch(`/api/workflows/executions/${payload.threadId}/approve`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(payload),
        // });
        // const result = await response.json();

        const result = await mockApprovalApi(payload);

        onApprovalSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setLastError(err);
        onApprovalError?.(err, payload);
        throw err;
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [onApprovalSuccess, onApprovalError]
  );

  const approveWorkflow = useCallback(
    (payload: ApprovalActionPayload) => {
      return processApproval({ ...payload, action: 'approve' });
    },
    [processApproval]
  );

  const rejectWorkflow = useCallback(
    (payload: ApprovalActionPayload) => {
      return processApproval({ ...payload, action: 'reject' });
    },
    [processApproval]
  );

  return {
    approveWorkflow,
    rejectWorkflow,
    isProcessing,
    processingId,
    lastError,
  };
}

// Helper to format action types for display
export function formatActionType(actionType: string): string {
  const actionLabels: Record<string, string> = {
    send_email: 'send an email',
    budget_increase: 'increase the budget',
    external_api_call: 'make an external API call',
    data_modification: 'modify data',
    workflow_continuation: 'continue the workflow',
    high_cost_operation: 'execute a high-cost operation',
  };

  return actionLabels[actionType] || actionType.replace(/_/g, ' ');
}

// Helper to format cost for display
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

// Helper to estimate tokens to cost
export function tokensToCost(tokens: number, model: string = 'gpt-4o-mini'): number {
  const costPerMillionTokens: Record<string, number> = {
    'gpt-4o': 5.0,
    'gpt-4o-mini': 0.15,
    'gpt-4-turbo': 10.0,
    'claude-3-opus': 15.0,
    'claude-3-sonnet': 3.0,
  };

  const rate = costPerMillionTokens[model] || 0.15;
  return (tokens / 1_000_000) * rate;
}
