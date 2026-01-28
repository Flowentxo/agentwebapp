/**
 * ToolExecutionService - Enterprise-Grade Tool Execution Engine
 *
 * This service handles the execution of all Motion agent tools with:
 * - Real AI-powered processing (no mocks)
 * - Database persistence
 * - Credit tracking
 * - Execution logging
 * - Error handling & retries
 */

import { getDb } from '@/lib/db';
import {
  motionSkillExecutions,
  motionCreditUsage,
  motionEvents,
  motionAgentContext,
} from '@/lib/db/schema-motion';
import { motionAI } from './MotionAIService';
import { eq, and, desc } from 'drizzle-orm';
import type { MotionAgentId, MotionAgentContext, ToolExecutionResult } from '../shared/types';

// ============================================
// TYPES
// ============================================

export interface ToolExecutionContext {
  userId: string;
  workspaceId: string;
  agentId: MotionAgentId;
  toolName: string;
  sessionId?: string;
  correlationId?: string;
}

export interface ExecutionMetrics {
  startTime: number;
  endTime: number;
  executionTimeMs: number;
  tokensUsed: number;
  creditsUsed: number;
  retryCount: number;
}

export interface ExecutionLog {
  id: string;
  context: ToolExecutionContext;
  input: unknown;
  output: unknown;
  metrics: ExecutionMetrics;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  error?: string;
  createdAt: Date;
}

// ============================================
// TOOL EXECUTION SERVICE
// ============================================

export class ToolExecutionService {
  private static instance: ToolExecutionService;
  private executionLogs: Map<string, ExecutionLog> = new Map();

  private constructor() {}

  public static getInstance(): ToolExecutionService {
    if (!ToolExecutionService.instance) {
      ToolExecutionService.instance = new ToolExecutionService();
    }
    return ToolExecutionService.instance;
  }

  // ============================================
  // EXECUTION MANAGEMENT
  // ============================================

  /**
   * Execute a tool with full tracking and AI integration
   */
  async execute<TInput, TOutput>(
    context: ToolExecutionContext,
    input: TInput,
    executor: (input: TInput, ai: typeof motionAI) => Promise<TOutput>,
    options: {
      creditCost: number;
      timeout?: number;
      retries?: number;
    }
  ): Promise<ToolExecutionResult<TOutput>> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options.retries || 2;

    // Create execution log
    const log: ExecutionLog = {
      id: executionId,
      context,
      input,
      output: null,
      metrics: {
        startTime,
        endTime: 0,
        executionTimeMs: 0,
        tokensUsed: 0,
        creditsUsed: 0,
        retryCount: 0,
      },
      status: 'pending',
      createdAt: new Date(),
    };
    this.executionLogs.set(executionId, log);

    // Log execution start
    await this.logEvent(context, 'tool_execution_started', { executionId, toolName: context.toolName });

    try {
      // Execute with retries
      let lastError: Error | null = null;
      let result: TOutput | null = null;

      while (retryCount <= maxRetries) {
        try {
          // Execute with timeout
          result = await this.executeWithTimeout(
            () => executor(input, motionAI),
            options.timeout || 60000
          );
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryCount++;

          if (retryCount <= maxRetries) {
            console.log(`[TOOL_EXEC] Retry ${retryCount}/${maxRetries} for ${context.toolName}`);
            await this.delay(1000 * retryCount); // Exponential backoff
          }
        }
      }

      if (!result && lastError) {
        throw lastError;
      }

      // Calculate metrics
      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;

      // Update log
      log.status = 'success';
      log.output = result;
      log.metrics = {
        startTime,
        endTime,
        executionTimeMs,
        tokensUsed: 0, // Will be updated by AI calls
        creditsUsed: options.creditCost,
        retryCount,
      };

      // Record credit usage
      await this.recordCreditUsage(context, options.creditCost);

      // Log execution complete
      await this.logEvent(context, 'tool_execution_completed', {
        executionId,
        toolName: context.toolName,
        executionTimeMs,
        creditsUsed: options.creditCost,
      });

      // Persist to database
      await this.persistExecution(log);

      return {
        success: true,
        data: result as TOutput,
        executionTimeMs,
        creditsUsed: options.creditCost,
      };
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update log
      log.status = 'failed';
      log.error = errorMessage;
      log.metrics.endTime = endTime;
      log.metrics.executionTimeMs = endTime - startTime;
      log.metrics.retryCount = retryCount;

      // Log execution failed
      await this.logEvent(context, 'tool_execution_failed', {
        executionId,
        toolName: context.toolName,
        error: errorMessage,
        retryCount,
      });

      // Persist to database
      await this.persistExecution(log);

      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: errorMessage,
          retryable: retryCount < maxRetries,
        },
        executionTimeMs: endTime - startTime,
        creditsUsed: 0,
      };
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // CREDIT MANAGEMENT
  // ============================================

  /**
   * Record credit usage in database
   */
  private async recordCreditUsage(
    context: ToolExecutionContext,
    creditsUsed: number
  ): Promise<void> {
    try {
      const db = getDb();
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await db.insert(motionCreditUsage).values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        agentId: context.agentId,
        toolName: context.toolName,
        creditsUsed: creditsUsed.toString(),
        creditType: 'standard',
        operationType: 'tool_execution',
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
      });
    } catch (error) {
      console.error('[TOOL_EXEC] Failed to record credit usage:', error);
    }
  }

  // ============================================
  // EVENT LOGGING
  // ============================================

  /**
   * Log an event
   */
  private async logEvent(
    context: ToolExecutionContext,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const db = getDb();
      await db.insert(motionEvents).values({
        eventType,
        agentId: context.agentId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        payload,
        correlationId: context.correlationId,
      });
    } catch (error) {
      console.error('[TOOL_EXEC] Failed to log event:', error);
    }
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Persist execution to database
   */
  private async persistExecution(log: ExecutionLog): Promise<void> {
    try {
      const db = getDb();
      await db.insert(motionSkillExecutions).values({
        skillId: null, // Will be linked if this is part of a skill
        userId: log.context.userId,
        workspaceId: log.context.workspaceId,
        triggerSource: 'direct',
        input: log.input as Record<string, unknown>,
        output: log.output as Record<string, unknown>,
        status: log.status === 'success' ? 'completed' : 'failed',
        errorMessage: log.error,
        executionTimeMs: log.metrics.executionTimeMs,
        tokensUsed: log.metrics.tokensUsed,
        creditsConsumed: log.metrics.creditsUsed.toString(),
        startedAt: new Date(log.metrics.startTime),
        completedAt: new Date(log.metrics.endTime),
      });
    } catch (error) {
      console.error('[TOOL_EXEC] Failed to persist execution:', error);
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get recent executions for a user
   */
  async getRecentExecutions(
    userId: string,
    workspaceId: string,
    limit: number = 20
  ): Promise<ExecutionLog[]> {
    try {
      const db = getDb();
      const executions = await db
        .select()
        .from(motionSkillExecutions)
        .where(
          and(
            eq(motionSkillExecutions.userId, userId),
            eq(motionSkillExecutions.workspaceId, workspaceId)
          )
        )
        .orderBy(desc(motionSkillExecutions.createdAt))
        .limit(limit);

      return executions.map((e) => ({
        id: e.id,
        context: {
          userId: e.userId,
          workspaceId: e.workspaceId,
          agentId: 'unknown' as MotionAgentId,
          toolName: 'unknown',
        },
        input: e.input,
        output: e.output,
        metrics: {
          startTime: e.startedAt?.getTime() || 0,
          endTime: e.completedAt?.getTime() || 0,
          executionTimeMs: e.executionTimeMs || 0,
          tokensUsed: e.tokensUsed || 0,
          creditsUsed: parseFloat(e.creditsConsumed?.toString() || '0'),
          retryCount: 0,
        },
        status: e.status as 'success' | 'failed' | 'pending',
        error: e.errorMessage || undefined,
        createdAt: e.createdAt || new Date(),
      }));
    } catch (error) {
      console.error('[TOOL_EXEC] Failed to get executions:', error);
      return [];
    }
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): ExecutionLog | undefined {
    return this.executionLogs.get(executionId);
  }
}

// Export singleton
export const toolExecutor = ToolExecutionService.getInstance();
export default ToolExecutionService;
