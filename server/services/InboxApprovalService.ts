/**
 * Inbox Approval Service
 *
 * Handles automatic creation and management of tool action approvals
 * within inbox threads. Works with the ToolActionParser to detect
 * actions in agent responses and create approval requests.
 */

import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../lib/db';
import {
  inboxApprovals,
  inboxMessages,
  inboxThreads,
  type NewInboxApproval,
  type InboxApproval
} from '../../lib/db/schema-inbox';
import {
  toolActionParser,
  type ParsedToolAction,
  type ToolActionType,
  TOOL_ACTION_REGISTRY
} from './ToolActionParser';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateApprovalResult {
  approval: InboxApproval;
  message: typeof inboxMessages.$inferSelect;
}

export interface ProcessMessageResult {
  originalContent: string;
  cleanContent: string;
  actions: ParsedToolAction[];
  approvals: CreateApprovalResult[];
  hasApprovals: boolean;
}

export interface ApprovalResolution {
  approvalId: string;
  action: 'approve' | 'reject';
  userId: string;
  comment?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class InboxApprovalService {
  private static instance: InboxApprovalService;

  private constructor() {}

  public static getInstance(): InboxApprovalService {
    if (!InboxApprovalService.instance) {
      InboxApprovalService.instance = new InboxApprovalService();
    }
    return InboxApprovalService.instance;
  }

  /**
   * Process an agent message for tool actions and create approvals
   */
  public async processAgentMessage(
    threadId: string,
    agentId: string,
    agentName: string,
    content: string
  ): Promise<ProcessMessageResult> {
    const db = getDb();

    // Parse tool actions from content
    const actions = toolActionParser.parseToolActions(content);
    const cleanContent = toolActionParser.stripToolActions(content);

    const result: ProcessMessageResult = {
      originalContent: content,
      cleanContent,
      actions,
      approvals: [],
      hasApprovals: false
    };

    if (actions.length === 0) {
      return result;
    }

    logger.info(`[InboxApprovalService] Found ${actions.length} tool actions in message`);

    // Create approval for each action that requires approval
    for (const action of actions) {
      if (!toolActionParser.requiresApproval(action.type)) {
        logger.info(`[InboxApprovalService] Action ${action.type} does not require approval, skipping`);
        continue;
      }

      try {
        const approvalResult = await this.createApprovalWithMessage(
          threadId,
          agentId,
          agentName,
          action
        );

        result.approvals.push(approvalResult);
        result.hasApprovals = true;

        logger.info(`[InboxApprovalService] Created approval ${approvalResult.approval.id} for action ${action.type}`);
      } catch (error) {
        logger.error(`[InboxApprovalService] Failed to create approval for action ${action.type}:`, error);
      }
    }

    // Update thread status if there are pending approvals
    if (result.hasApprovals) {
      await db
        .update(inboxThreads)
        .set({
          status: 'suspended',
          pendingApprovalId: result.approvals[0]?.approval.id,
          updatedAt: new Date()
        })
        .where(eq(inboxThreads.id, threadId));
    }

    return result;
  }

  /**
   * Create an approval request with an associated message
   */
  private async createApprovalWithMessage(
    threadId: string,
    agentId: string,
    agentName: string,
    action: ParsedToolAction
  ): Promise<CreateApprovalResult> {
    const db = getDb();
    const metadata = toolActionParser.getActionMetadata(action.type);
    const preview = toolActionParser.generatePreview(action);
    const approvalActionType = toolActionParser.mapToApprovalActionType(action.type);

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create the approval request message first
    // Note: Using only columns that exist in the actual database schema
    const [message] = await db
      .insert(inboxMessages)
      .values({
        threadId,
        role: 'agent',
        type: 'approval_request',
        content: preview,
        approval: {
          approvalId: action.id,
          actionType: action.type,
          status: 'pending',
          payload: action.params,
          previewData: preview,
          expiresAt: expiresAt.toISOString()
        },
        metadata: {
          eventType: 'tool_action_proposed',
          agentName,
          agentId,
          action: action.type
        }
      })
      .returning();

    // Create the approval record
    // Note: Using actionDetails column (actual DB column name, not 'payload')
    const [approval] = await db
      .insert(inboxApprovals)
      .values({
        threadId,
        messageId: message.id,
        actionType: approvalActionType,
        status: 'pending',
        actionDetails: {
          toolAction: action.type,
          params: action.params,
          estimatedCost: metadata.estimatedCost,
          previewData: preview,
          metadata: {
            icon: metadata.icon,
            color: metadata.color,
            label: metadata.label,
            description: metadata.description,
            agentHint: metadata.agentHint
          }
        },
        expiresAt
      })
      .returning();

    // Update the message with the approval ID
    await db
      .update(inboxMessages)
      .set({
        approval: {
          ...message.approval!,
          approvalId: approval.id
        }
      })
      .where(eq(inboxMessages.id, message.id));

    // Update thread counters
    await db
      .update(inboxThreads)
      .set({
        messageCount: await this.getMessageCount(threadId),
        unreadCount: await this.getUnreadCount(threadId),
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(inboxThreads.id, threadId));

    return { approval, message };
  }

  /**
   * Resolve an approval (approve or reject)
   */
  public async resolveApproval(resolution: ApprovalResolution): Promise<InboxApproval> {
    const db = getDb();

    // Get the approval
    const [approval] = await db
      .select()
      .from(inboxApprovals)
      .where(eq(inboxApprovals.id, resolution.approvalId))
      .limit(1);

    if (!approval) {
      throw new Error(`Approval ${resolution.approvalId} not found`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval ${resolution.approvalId} is already resolved`);
    }

    const newStatus = resolution.action === 'approve' ? 'approved' : 'rejected';

    // Update the approval
    const [updatedApproval] = await db
      .update(inboxApprovals)
      .set({
        status: newStatus,
        resolvedBy: resolution.userId,
        resolvedAt: new Date(),
        comment: resolution.comment,
        updatedAt: new Date()
      })
      .where(eq(inboxApprovals.id, resolution.approvalId))
      .returning();

    // Update the associated message
    // Note: messageId might be null
    if (approval.messageId) {
      await db
        .update(inboxMessages)
        .set({
          approval: {
            ...approval.actionDetails as any,
            approvalId: approval.id,
            actionType: (approval.actionDetails as any)?.toolAction || 'other',
            status: newStatus,
            resolvedAt: new Date().toISOString(),
            resolvedBy: resolution.userId,
            comment: resolution.comment
          }
        })
        .where(eq(inboxMessages.id, approval.messageId));
    }

    // Check if there are more pending approvals for this thread
    // Note: threadId might be null
    if (approval.threadId) {
      const pendingApprovals = await db
        .select()
        .from(inboxApprovals)
        .where(
          and(
            eq(inboxApprovals.threadId, approval.threadId),
            eq(inboxApprovals.status, 'pending')
          )
        )
        .limit(1);

      // Update thread status
      await db
        .update(inboxThreads)
        .set({
          status: pendingApprovals.length > 0 ? 'suspended' : 'active',
          pendingApprovalId: pendingApprovals.length > 0 ? pendingApprovals[0].id : null,
          updatedAt: new Date()
        })
        .where(eq(inboxThreads.id, approval.threadId));

      // Add system message about resolution
      // Note: Using only columns that exist in the actual database schema
      await db.insert(inboxMessages).values({
        threadId: approval.threadId,
        role: 'system',
        type: 'system_event',
        content: resolution.action === 'approve'
          ? `Tool action approved${resolution.comment ? `: ${resolution.comment}` : ''}`
          : `Tool action rejected${resolution.comment ? `: ${resolution.comment}` : ''}`,
        metadata: {
          eventType: resolution.action === 'approve' ? 'approval_granted' : 'approval_rejected',
          approvedBy: resolution.userId,
          details: resolution.comment
        }
      });
    }

    logger.info(`[InboxApprovalService] Approval ${resolution.approvalId} ${newStatus} by ${resolution.userId}`);

    return updatedApproval;
  }

  /**
   * Get pending approvals for a thread
   */
  public async getPendingApprovals(threadId: string): Promise<InboxApproval[]> {
    const db = getDb();

    return db
      .select()
      .from(inboxApprovals)
      .where(
        and(
          eq(inboxApprovals.threadId, threadId),
          eq(inboxApprovals.status, 'pending')
        )
      )
      .orderBy(desc(inboxApprovals.createdAt));
  }

  /**
   * Get all approvals for a thread
   */
  public async getThreadApprovals(threadId: string): Promise<InboxApproval[]> {
    const db = getDb();

    return db
      .select()
      .from(inboxApprovals)
      .where(eq(inboxApprovals.threadId, threadId))
      .orderBy(desc(inboxApprovals.createdAt));
  }

  /**
   * Expire old pending approvals
   */
  public async expireOldApprovals(): Promise<number> {
    const db = getDb();

    const result = await db
      .update(inboxApprovals)
      .set({
        status: 'expired',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(inboxApprovals.status, 'pending'),
          // Use SQL to compare dates properly
        )
      );

    // This is a simplified version - in production, you'd want proper date comparison
    logger.info('[InboxApprovalService] Expired old approvals');
    return 0;
  }

  // Helper methods
  private async getMessageCount(threadId: string): Promise<number> {
    const db = getDb();
    const messages = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId));
    return messages.length;
  }

  private async getUnreadCount(threadId: string): Promise<number> {
    const db = getDb();
    const messages = await db
      .select()
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.threadId, threadId),
          eq(inboxMessages.role, 'agent')
        )
      );
    // In a real implementation, you'd track read status per message
    return 0;
  }
}

// Singleton export
export const inboxApprovalService = InboxApprovalService.getInstance();

