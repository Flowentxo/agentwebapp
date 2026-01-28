/**
 * HUMAN APPROVAL EXECUTOR V2
 *
 * Human-in-the-Loop (HITL) node that pauses workflow execution
 * and waits for human approval before continuing.
 *
 * Features:
 * - Returns SUSPENDED status to halt execution
 * - Generates unique approval ID for tracking
 * - Configurable timeout for auto-rejection
 * - Notification triggers (email, Slack, etc.)
 * - Approval metadata capture (approver, comment, timestamp)
 *
 * Phase 3: Human-in-the-Loop Implementation
 */

import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';
import {
  INodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
} from '@/types/execution';

const logger = createLogger('human-approval-executor');

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalConfig {
  /** Title shown to approver */
  title?: string;
  /** Description/instructions for approver */
  description?: string;
  /** Timeout in milliseconds before auto-rejection (default: 7 days) */
  timeoutMs?: number;
  /** Email addresses to notify */
  notifyEmails?: string[];
  /** Slack channel ID to notify */
  slackChannel?: string;
  /** Custom fields to display to approver */
  displayFields?: { label: string; path: string }[];
  /** Require comment on approval/rejection */
  requireComment?: boolean;
  /** Auto-approve after timeout instead of reject */
  autoApproveOnTimeout?: boolean;
  /** Allowed approvers (user IDs) - if empty, anyone can approve */
  allowedApprovers?: string[];
}

export interface ApprovalRequest {
  /** Unique approval ID */
  approvalId: string;
  /** Execution ID this approval belongs to */
  executionId: string;
  /** Workflow ID */
  workflowId: string;
  /** Node ID that requested approval */
  nodeId: string;
  /** User ID who triggered the workflow */
  requestedBy: string;
  /** When approval was requested */
  requestedAt: string;
  /** When approval expires */
  expiresAt: string;
  /** Title for approval */
  title: string;
  /** Description for approval */
  description: string;
  /** Data to display to approver */
  contextData: Record<string, unknown>;
  /** Configuration */
  config: ApprovalConfig;
  /** Current status */
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface ApprovalResponse {
  /** Whether approved or rejected */
  approved: boolean;
  /** Approver user ID */
  approvedBy?: string;
  /** When approved/rejected */
  respondedAt?: string;
  /** Approver comment */
  comment?: string;
  /** Additional data from approver */
  additionalData?: Record<string, unknown>;
}

export interface HumanApprovalOutput {
  /** Status indicating execution should suspend */
  executionStatus: 'SUSPENDED';
  /** The approval request details */
  approvalRequest: ApprovalRequest;
  /** Reason for suspension */
  reason: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_TIMEOUT_MS = 60 * 1000; // 1 minute
const MAX_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Send notification about pending approval (mock implementation)
 */
async function sendApprovalNotification(
  request: ApprovalRequest,
  config: ApprovalConfig
): Promise<void> {
  // Email notification
  if (config.notifyEmails && config.notifyEmails.length > 0) {
    logger.info('Sending approval email notification', {
      approvalId: request.approvalId,
      recipients: config.notifyEmails,
      title: request.title,
    });

    // TODO: Integrate with actual email service (SendGrid, SES, etc.)
    // For now, just log the notification
    for (const email of config.notifyEmails) {
      logger.info(`[MOCK EMAIL] Sending to ${email}:`, {
        subject: `Approval Required: ${request.title}`,
        body: `
          A workflow is waiting for your approval.

          Title: ${request.title}
          Description: ${request.description}
          Requested By: ${request.requestedBy}
          Expires: ${request.expiresAt}

          Approval Link: /approve/${request.approvalId}
        `,
      });
    }
  }

  // Slack notification
  if (config.slackChannel) {
    logger.info('Sending Slack notification', {
      approvalId: request.approvalId,
      channel: config.slackChannel,
    });

    // TODO: Integrate with Slack API
    logger.info(`[MOCK SLACK] Posting to ${config.slackChannel}:`, {
      text: `🔔 *Approval Required: ${request.title}*\n${request.description}\nRequested by: ${request.requestedBy}`,
    });
  }
}

// ============================================================================
// EXECUTOR
// ============================================================================

export class HumanApprovalExecutorV2 implements INodeExecutor {
  /**
   * Execute the human approval node.
   * Returns SUSPENDED status to halt workflow execution.
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeData = node.data || {};

    logger.info('Human approval node triggered', {
      nodeId: node.id,
      nodeName: nodeData.label,
      executionId: context.executionId,
      workflowId: context.workflowId,
    });

    try {
      // Extract configuration
      const config: ApprovalConfig = {
        title: nodeData.approvalTitle || nodeData.title || 'Approval Required',
        description: nodeData.approvalDescription || nodeData.description || 'Please review and approve this request.',
        timeoutMs: this.parseTimeout(nodeData.timeoutMs || nodeData.timeout),
        notifyEmails: this.parseEmailList(nodeData.notifyEmails),
        slackChannel: nodeData.slackChannel,
        displayFields: nodeData.displayFields,
        requireComment: nodeData.requireComment ?? false,
        autoApproveOnTimeout: nodeData.autoApproveOnTimeout ?? false,
        allowedApprovers: nodeData.allowedApprovers,
      };

      // Generate unique approval ID
      const approvalId = `approval_${randomUUID()}`;

      // Calculate expiration
      const requestedAt = new Date();
      const expiresAt = new Date(requestedAt.getTime() + config.timeoutMs!);

      // Build context data to display to approver
      const contextData = this.buildContextData(inputs, nodeData, context);

      // Create approval request
      const approvalRequest: ApprovalRequest = {
        approvalId,
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId: node.id,
        requestedBy: context.userId,
        requestedAt: requestedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        title: config.title!,
        description: config.description!,
        contextData,
        config,
        status: 'pending',
      };

      // Send notifications
      await sendApprovalNotification(approvalRequest, config);

      logger.info('Approval request created, suspending workflow', {
        approvalId,
        executionId: context.executionId,
        expiresAt: expiresAt.toISOString(),
      });

      // Return SUSPENDED status
      const output: HumanApprovalOutput = {
        executionStatus: 'SUSPENDED',
        approvalRequest,
        reason: `Waiting for human approval: ${config.title}`,
      };

      return {
        data: output,
        success: true,
        meta: {
          suspended: true,
          approvalId,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Human approval node failed', {
        nodeId: node.id,
        error: errorMessage,
      });

      return {
        data: null,
        success: false,
        error: `Human approval setup failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Parse timeout value with bounds checking
   */
  private parseTimeout(value: unknown): number {
    if (typeof value === 'number') {
      return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, value));
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, parsed));
      }
    }
    return DEFAULT_TIMEOUT_MS;
  }

  /**
   * Parse email list from various formats
   */
  private parseEmailList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((v) => typeof v === 'string' && v.includes('@'));
    }
    if (typeof value === 'string') {
      return value
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
    }
    return [];
  }

  /**
   * Build context data for display to approver
   */
  private buildContextData(
    inputs: Record<string, unknown>,
    nodeData: Record<string, unknown>,
    context: { state: { trigger: { payload: unknown }; variables: Record<string, unknown> } }
  ): Record<string, unknown> {
    const contextData: Record<string, unknown> = {
      // Previous node output
      previousOutput: inputs.previousOutput,

      // Trigger data
      triggerData: context.state.trigger.payload,

      // Variables
      variables: context.state.variables,
    };

    // Add custom display fields if configured
    if (nodeData.displayFields && Array.isArray(nodeData.displayFields)) {
      const customFields: Record<string, unknown> = {};
      for (const field of nodeData.displayFields) {
        if (field.label && field.path) {
          customFields[field.label] = this.getValueByPath(inputs, field.path);
        }
      }
      contextData.customFields = customFields;
    }

    return contextData;
  }

  /**
   * Get nested value by path
   */
  private getValueByPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const humanApprovalExecutorV2 = new HumanApprovalExecutorV2();
export default humanApprovalExecutorV2;
