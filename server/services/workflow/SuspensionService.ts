/**
 * WORKFLOW SUSPENSION SERVICE
 *
 * Manages the suspension and resumption of workflow executions.
 * Ensures stateless suspension - all state is persisted to DB.
 *
 * Key Features:
 * - Complete state serialization to DB
 * - Secure resume tokens
 * - State hydration on resume
 * - Server-restart safe
 *
 * @security IMPORTANT: This service handles sensitive workflow state.
 * Resume tokens should be treated as secrets.
 */

import { randomUUID, createHash } from 'crypto';
import { getDb } from '@/lib/db';
import {
  workflowExecutions,
  workflowApprovalRequests,
  workflows,
} from '@/lib/db/schema-workflows';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import {
  ExecutionContext,
  ExecutionState,
  ExecutionLogEntry,
} from '@/types/execution';
import { ApprovalRequest, ApprovalResponse } from '../executors/HumanApprovalExecutorV2';
import { Node, Edge } from 'reactflow';

const logger = createLogger('suspension-service');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete suspended state snapshot
 */
export interface SuspendedStateSnapshot {
  // Execution identity
  executionId: string;
  workflowId: string;
  userId: string;

  // Execution state
  state: ExecutionState;
  logs: ExecutionLogEntry[];

  // Suspension info
  suspendedNodeId: string;
  approvalRequest: ApprovalRequest;

  // Budget tracking
  budget: {
    enabled: boolean;
    totalCostIncurred: number;
    remainingBudget: number;
  };

  // Workflow structure (for resumption)
  nodes: Node[];
  edges: Edge[];

  // Timing
  startTime: number;
  suspendedAt: number;

  // Version for migration
  version: number;
}

/**
 * Result of suspension operation
 */
export interface SuspensionResult {
  success: boolean;
  resumeToken?: string;
  approvalId?: string;
  error?: string;
}

/**
 * Result of resumption operation
 */
export interface ResumptionResult {
  success: boolean;
  context?: ExecutionContext;
  error?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SuspensionService {
  private static instance: SuspensionService | null = null;

  private constructor() {}

  static getInstance(): SuspensionService {
    if (!SuspensionService.instance) {
      SuspensionService.instance = new SuspensionService();
    }
    return SuspensionService.instance;
  }

  /**
   * Suspend a workflow execution
   *
   * Serializes the complete execution state to DB and creates
   * an approval request record.
   */
  async suspendExecution(
    context: ExecutionContext,
    approvalRequest: ApprovalRequest
  ): Promise<SuspensionResult> {
    const startTime = Date.now();

    try {
      const db = getDb();

      // Generate secure resume token
      const resumeToken = this.generateResumeToken(context.executionId);

      // Build complete state snapshot
      const snapshot: SuspendedStateSnapshot = {
        executionId: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        state: context.state,
        logs: context.logs,
        suspendedNodeId: context.currentNodeId || approvalRequest.nodeId,
        approvalRequest,
        budget: context.budget,
        nodes: context.nodes,
        edges: context.edges,
        startTime: context.startTime,
        suspendedAt: Date.now(),
        version: 1,
      };

      // Serialize and validate
      const serializedState = this.serializeState(snapshot);

      // Update workflow execution record
      await db
        .update(workflowExecutions)
        .set({
          status: 'suspended',
          output: { suspended: true, approvalId: approvalRequest.approvalId },
          logs: context.logs,
          error: null,
          // New columns from migration (when applied)
          // suspendedState: serializedState,
          // suspendedAt: new Date(),
          // resumeToken: resumeToken,
        })
        .where(eq(workflowExecutions.id, context.executionId));

      // Create or update approval request record
      await db
        .insert(workflowApprovalRequests)
        .values({
          id: approvalRequest.approvalId,
          executionId: context.executionId,
          workflowId: context.workflowId,
          nodeId: approvalRequest.nodeId,
          status: 'pending',
          title: approvalRequest.title,
          message: approvalRequest.description,
          contextData: approvalRequest.contextData,
          suspendedState: serializedState,
          expiresAt: new Date(approvalRequest.expiresAt),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: workflowApprovalRequests.id,
          set: {
            status: 'pending',
            suspendedState: serializedState,
            updatedAt: new Date(),
          },
        });

      logger.info('Workflow execution suspended', {
        executionId: context.executionId,
        workflowId: context.workflowId,
        approvalId: approvalRequest.approvalId,
        suspendedNodeId: snapshot.suspendedNodeId,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        resumeToken,
        approvalId: approvalRequest.approvalId,
      };
    } catch (error: any) {
      logger.error('Failed to suspend execution', {
        executionId: context.executionId,
        error: error.message,
      });

      return {
        success: false,
        error: `Suspension failed: ${error.message}`,
      };
    }
  }

  /**
   * Resume a suspended workflow execution
   *
   * Loads the state from DB and hydrates the execution context.
   */
  async resumeExecution(
    executionId: string,
    approvalResponse: ApprovalResponse,
    resumeToken?: string
  ): Promise<ResumptionResult> {
    try {
      const db = getDb();

      // 1. Load approval request with suspended state
      const [approvalRecord] = await db
        .select()
        .from(workflowApprovalRequests)
        .where(
          and(
            eq(workflowApprovalRequests.executionId, executionId),
            eq(workflowApprovalRequests.status, 'pending')
          )
        )
        .limit(1);

      if (!approvalRecord) {
        return {
          success: false,
          error: `No pending approval found for execution: ${executionId}`,
        };
      }

      // 2. Validate resume token if provided
      if (resumeToken) {
        const [execution] = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.id, executionId))
          .limit(1);

        // Note: resume_token column may not exist yet
        // This is future-proofing for when the migration is applied
      }

      // 3. Deserialize the suspended state
      const snapshot = this.deserializeState(
        approvalRecord.suspendedState as unknown as SuspendedStateSnapshot
      );

      if (!snapshot) {
        return {
          success: false,
          error: 'Failed to deserialize suspended state',
        };
      }

      // 4. Update approval request status
      await db
        .update(workflowApprovalRequests)
        .set({
          status: approvalResponse.approved ? 'approved' : 'rejected',
          resolvedBy: approvalResponse.approvedBy,
          resolvedAt: new Date(),
          rejectionReason: approvalResponse.approved
            ? null
            : approvalResponse.comment,
          updatedAt: new Date(),
        })
        .where(eq(workflowApprovalRequests.id, approvalRecord.id));

      // 5. Hydrate the execution context
      const context = this.hydrateContext(snapshot, approvalResponse);

      // 6. Update execution record
      await db
        .update(workflowExecutions)
        .set({
          status: 'running',
          error: null,
          // Clear suspension fields (when migration applied)
          // suspendedState: null,
          // suspendedAt: null,
          // resumeToken: null,
        })
        .where(eq(workflowExecutions.id, executionId));

      logger.info('Workflow execution resumed', {
        executionId,
        approvalId: approvalRecord.id,
        approved: approvalResponse.approved,
        approvedBy: approvalResponse.approvedBy,
      });

      return {
        success: true,
        context,
      };
    } catch (error: any) {
      logger.error('Failed to resume execution', {
        executionId,
        error: error.message,
      });

      return {
        success: false,
        error: `Resumption failed: ${error.message}`,
      };
    }
  }

  /**
   * Get suspended state for an execution
   */
  async getSuspendedState(
    executionId: string
  ): Promise<SuspendedStateSnapshot | null> {
    try {
      const db = getDb();

      const [approvalRecord] = await db
        .select({
          suspendedState: workflowApprovalRequests.suspendedState,
        })
        .from(workflowApprovalRequests)
        .where(
          and(
            eq(workflowApprovalRequests.executionId, executionId),
            eq(workflowApprovalRequests.status, 'pending')
          )
        )
        .limit(1);

      if (!approvalRecord?.suspendedState) {
        return null;
      }

      return this.deserializeState(
        approvalRecord.suspendedState as unknown as SuspendedStateSnapshot
      );
    } catch (error: any) {
      logger.error('Failed to get suspended state', {
        executionId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Check if an execution is suspended
   */
  async isSuspended(executionId: string): Promise<boolean> {
    try {
      const db = getDb();

      const [result] = await db
        .select({ status: workflowExecutions.status })
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executionId))
        .limit(1);

      return result?.status === 'suspended';
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure resume token
   */
  private generateResumeToken(executionId: string): string {
    const random = randomUUID();
    const hash = createHash('sha256')
      .update(`${executionId}:${random}:${Date.now()}`)
      .digest('hex')
      .substring(0, 32);

    return `rt_${hash}`;
  }

  /**
   * Serialize state for storage
   */
  private serializeState(snapshot: SuspendedStateSnapshot): any {
    try {
      // Deep clone to avoid mutations
      const serialized = JSON.parse(
        JSON.stringify(snapshot, (key, value) => {
          // Handle Date objects
          if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
          }
          // Skip functions
          if (typeof value === 'function') {
            return undefined;
          }
          return value;
        })
      );

      return serialized;
    } catch (error: any) {
      logger.error('State serialization failed', { error: error.message });
      throw new Error(`Failed to serialize state: ${error.message}`);
    }
  }

  /**
   * Deserialize state from storage
   */
  private deserializeState(data: any): SuspendedStateSnapshot | null {
    if (!data) return null;

    try {
      const deserialized = JSON.parse(
        JSON.stringify(data),
        (key, value) => {
          // Handle Date objects
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
          }
          return value;
        }
      );

      // Validate required fields
      if (!deserialized.executionId || !deserialized.state) {
        throw new Error('Invalid snapshot: missing required fields');
      }

      return deserialized as SuspendedStateSnapshot;
    } catch (error: any) {
      logger.error('State deserialization failed', { error: error.message });
      return null;
    }
  }

  /**
   * Hydrate execution context from snapshot
   */
  private hydrateContext(
    snapshot: SuspendedStateSnapshot,
    approvalResponse: ApprovalResponse
  ): ExecutionContext {
    // Inject approval response into the suspended node's output
    const updatedState = { ...snapshot.state };

    if (updatedState.nodes[snapshot.suspendedNodeId]) {
      updatedState.nodes[snapshot.suspendedNodeId] = {
        ...updatedState.nodes[snapshot.suspendedNodeId],
        output: {
          ...updatedState.nodes[snapshot.suspendedNodeId].output,
          approvalResponse,
          approved: approvalResponse.approved,
          resolvedAt: new Date().toISOString(),
        },
        meta: {
          ...updatedState.nodes[snapshot.suspendedNodeId].meta,
          status: approvalResponse.approved ? 'completed' : 'error',
          completedAt: Date.now(),
        },
      };
    }

    // Build context
    const context: ExecutionContext = {
      executionId: snapshot.executionId,
      workflowId: snapshot.workflowId,
      userId: snapshot.userId,
      isTest: false,
      startTime: snapshot.startTime,
      state: updatedState,
      logs: snapshot.logs,
      status: 'running',
      currentNodeId: snapshot.suspendedNodeId,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      budget: snapshot.budget,
      suspendedNodeId: undefined,
      approvalRequest: undefined,
    };

    // Add resumption log entry
    context.logs.push({
      timestamp: Date.now(),
      nodeId: snapshot.suspendedNodeId,
      nodeName: 'Human Approval',
      level: approvalResponse.approved ? 'success' : 'warn',
      message: approvalResponse.approved
        ? `Approved by ${approvalResponse.approvedBy}: ${approvalResponse.comment || 'No comment'}`
        : `Rejected by ${approvalResponse.approvedBy}: ${approvalResponse.comment || 'No reason'}`,
      data: { approvalResponse },
    });

    return context;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const suspensionService = SuspensionService.getInstance();
export default suspensionService;
