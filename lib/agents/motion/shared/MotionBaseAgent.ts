/**
 * MotionBaseAgent - Extended Base Class for Usemotion-style AI Agents
 *
 * Features:
 * - Skill System Integration
 * - Context Memory Management
 * - Human-in-the-Loop Approvals
 * - Credit Tracking & Billing
 * - Multi-Step Reasoning
 * - Integration Hub
 */

import { BaseAgent, AgentTool } from '@/lib/agents/base/BaseAgent';
import { AgentContext, AgentResponse, ConversationMessage } from '@/lib/agents/shared/types';
import { getDb } from '@/lib/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import type { LucideIcon } from 'lucide-react';
import {
  MotionAgentContext,
  MotionAgentResponse,
  MotionTool,
  ToolExecutionResult,
  ToolError,
  ToolErrorCode,
  Skill,
  SkillExecution,
  SkillExecutionStatus,
  ApprovalRequest,
  ApprovalStatus,
  CreditUsage,
  MotionMessage,
  MotionAgentId,
  AgentCategory,
} from './types';
import {
  CREDIT_COSTS,
  TOOL_ERROR_CODES,
  TIMEOUTS,
  MOTION_EVENT_TYPES,
  APPROVAL_STATUS,
  SKILL_EXECUTION_STATUS,
} from './constants';
import { MOTION_AGENTS, DEFAULT_APPROVAL_CONFIG, type ApprovalRequiredAction } from '../config';

// ============================================
// MOTION AGENT INTERFACE
// ============================================

export interface MotionAgentInfo {
  id: MotionAgentId;
  name: string;
  role: string;
  description: string;
  category: AgentCategory;
  color: string;
  icon: LucideIcon;
  specialties: string[];
  version: string;
  toolCount: number;
  skillCount?: number;
}

// ============================================
// MOTION BASE AGENT CLASS
// ============================================

export abstract class MotionBaseAgent extends BaseAgent {
  // Motion-specific properties
  abstract readonly motionId: MotionAgentId;
  abstract readonly role: string;
  abstract readonly agentCategory: AgentCategory;
  abstract readonly specialties: string[];
  abstract readonly lucideIcon: LucideIcon;

  // Credit cost multiplier for this agent
  protected creditMultiplier: number = 1.0;

  // Motion-specific tools registry
  protected motionTools: Map<string, MotionTool> = new Map();

  // Pending approvals cache
  protected pendingApprovals: Map<string, ApprovalRequest> = new Map();

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor() {
    super();
    this.initializeMotionFeatures();
  }

  /**
   * Initialize Motion-specific features
   */
  protected initializeMotionFeatures(): void {
    const agentConfig = MOTION_AGENTS[this.motionId];
    if (agentConfig) {
      this.creditMultiplier = agentConfig.creditCostMultiplier;
    }
  }

  // ============================================
  // ABSTRACT METHODS
  // ============================================

  /**
   * Register Motion-specific tools
   * Must be implemented by each Motion agent
   */
  protected abstract registerMotionTools(): void;

  /**
   * Get agent-specific context enrichment
   * Override to add agent-specific context
   */
  protected async getAgentSpecificContext(
    context: MotionAgentContext
  ): Promise<Record<string, unknown>> {
    return {};
  }

  // ============================================
  // TOOL REGISTRATION
  // ============================================

  /**
   * Register a Motion tool with credit tracking and approval support
   */
  protected registerMotionTool<TInput, TOutput>(tool: MotionTool<TInput, TOutput>): void {
    this.motionTools.set(tool.name, tool as MotionTool);

    // Also register as regular tool for compatibility
    const compatibleTool: AgentTool<TInput, TOutput> = {
      ...tool,
      inputSchema: tool.inputSchema as Record<string, unknown>,
      outputSchema: tool.outputSchema as Record<string, unknown>,
      execute: async (input: TInput, ctx: AgentContext) => {
        const motionContext = this.convertToMotionContext(ctx);
        return tool.execute(input, motionContext);
      },
    };
    this.registerTool(compatibleTool);
  }

  /**
   * Get all Motion tools
   */
  public getMotionTools(): MotionTool[] {
    return Array.from(this.motionTools.values());
  }

  // ============================================
  // TOOL EXECUTION WITH CREDITS & APPROVALS
  // ============================================

  /**
   * Execute a Motion tool with full credit tracking and approval workflow
   */
  public async executeMotionTool<TInput, TOutput>(
    toolName: string,
    input: TInput,
    context: MotionAgentContext
  ): Promise<ToolExecutionResult<TOutput>> {
    const startTime = Date.now();
    const correlationId = crypto.randomUUID();

    try {
      // Get tool
      const tool = this.motionTools.get(toolName);
      if (!tool) {
        return this.createToolError('TOOL_NOT_FOUND', `Tool "${toolName}" not found`, startTime);
      }

      // Check credits
      const creditCheck = await this.checkCredits(context, tool.creditCost);
      if (!creditCheck.sufficient) {
        return this.createToolError(
          'INSUFFICIENT_CREDITS',
          `Insufficient credits. Required: ${tool.creditCost}, Available: ${creditCheck.available}`,
          startTime
        );
      }

      // Check if approval is required
      if (tool.requiresApproval) {
        const approvalId = await this.requestApproval(tool, input, context);
        return {
          success: false,
          executionTimeMs: Date.now() - startTime,
          creditsUsed: 0,
          requiresApproval: true,
          approvalId,
        };
      }

      // Execute tool
      const result = await this.executeWithTimeout(
        () => tool.execute(input, context),
        tool.timeout || TIMEOUTS.TOOL_EXECUTION
      );

      const executionTimeMs = Date.now() - startTime;
      const creditsUsed = this.calculateCredits(tool.creditCost);

      // Record credit usage
      await this.recordCreditUsage(context, toolName, creditsUsed, 'tool_execution');

      return {
        success: true,
        data: result as TOutput,
        executionTimeMs,
        creditsUsed,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return this.createToolError('EXECUTION_FAILED', errorMessage, startTime);
    }
  }

  /**
   * Execute a tool after approval
   */
  public async executeApprovedTool<TInput, TOutput>(
    approvalId: string,
    context: MotionAgentContext
  ): Promise<ToolExecutionResult<TOutput>> {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      return this.createToolError('APPROVAL_DENIED', 'Approval not found or expired', Date.now());
    }

    if (approval.status !== 'approved') {
      return this.createToolError('APPROVAL_DENIED', `Approval status: ${approval.status}`, Date.now());
    }

    // Get the tool and execute
    const tool = this.motionTools.get(approval.actionType);
    if (!tool) {
      return this.createToolError('TOOL_NOT_FOUND', `Tool "${approval.actionType}" not found`, Date.now());
    }

    // Remove from pending and execute
    this.pendingApprovals.delete(approvalId);

    const startTime = Date.now();
    try {
      const result = await tool.execute(approval.payload as TInput, context);
      const executionTimeMs = Date.now() - startTime;
      const creditsUsed = this.calculateCredits(tool.creditCost);

      await this.recordCreditUsage(context, approval.actionType, creditsUsed, 'tool_execution');

      return {
        success: true,
        data: result as TOutput,
        executionTimeMs,
        creditsUsed,
      };
    } catch (error) {
      return this.createToolError(
        'EXECUTION_FAILED',
        error instanceof Error ? error.message : String(error),
        startTime
      );
    }
  }

  // ============================================
  // APPROVAL WORKFLOW
  // ============================================

  /**
   * Request human approval for an action
   */
  protected async requestApproval<TInput>(
    tool: MotionTool<TInput, unknown>,
    input: TInput,
    context: MotionAgentContext
  ): Promise<string> {
    const approvalId = crypto.randomUUID();

    const approval: ApprovalRequest = {
      id: approvalId,
      agentId: this.motionId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      action: tool.displayName,
      actionType: tool.name,
      description: tool.description,
      payload: input as Record<string, unknown>,
      preview: await this.generatePreview(tool, input),
      status: 'pending',
      expiresAt: new Date(Date.now() + TIMEOUTS.APPROVAL_DEFAULT),
      createdAt: new Date(),
    };

    this.pendingApprovals.set(approvalId, approval);

    // Emit approval request event
    await this.emitEvent(MOTION_EVENT_TYPES.APPROVAL_REQUESTED, {
      approvalId,
      agentId: this.motionId,
      action: tool.name,
      userId: context.userId,
    });

    return approvalId;
  }

  /**
   * Approve a pending action
   */
  public async approveAction(
    approvalId: string,
    approverId: string
  ): Promise<{ success: boolean; error?: string }> {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    if (approval.status !== 'pending') {
      return { success: false, error: `Approval already ${approval.status}` };
    }

    if (approval.expiresAt && new Date() > approval.expiresAt) {
      approval.status = 'expired';
      return { success: false, error: 'Approval has expired' };
    }

    approval.status = 'approved';
    approval.approvedBy = approverId;
    approval.approvedAt = new Date();

    await this.emitEvent(MOTION_EVENT_TYPES.APPROVAL_APPROVED, {
      approvalId,
      approverId,
      agentId: this.motionId,
    });

    return { success: true };
  }

  /**
   * Reject a pending action
   */
  public async rejectAction(
    approvalId: string,
    rejecterId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    approval.status = 'rejected';
    approval.rejectedBy = rejecterId;
    approval.rejectedAt = new Date();
    approval.rejectionReason = reason;

    await this.emitEvent(MOTION_EVENT_TYPES.APPROVAL_REJECTED, {
      approvalId,
      rejecterId,
      reason,
      agentId: this.motionId,
    });

    return { success: true };
  }

  /**
   * Get pending approvals for a user
   */
  public getPendingApprovals(userId: string): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(
      (a) => a.userId === userId && a.status === 'pending'
    );
  }

  /**
   * Generate a preview of what the action will do
   */
  protected async generatePreview<TInput>(
    tool: MotionTool<TInput, unknown>,
    input: TInput
  ): Promise<string> {
    // Default preview - override in subclasses for rich previews
    return `${tool.displayName}: ${JSON.stringify(input, null, 2)}`;
  }

  // ============================================
  // CREDIT MANAGEMENT
  // ============================================

  /**
   * Check if user has sufficient credits
   */
  protected async checkCredits(
    context: MotionAgentContext,
    requiredCredits: number
  ): Promise<{ sufficient: boolean; available: number }> {
    // TODO: Implement actual credit checking from database
    // For now, return sufficient credits
    return { sufficient: true, available: 100000 };
  }

  /**
   * Calculate credits with multiplier
   */
  protected calculateCredits(baseCost: number): number {
    return Math.ceil(baseCost * this.creditMultiplier);
  }

  /**
   * Record credit usage
   */
  protected async recordCreditUsage(
    context: MotionAgentContext,
    toolName: string,
    creditsUsed: number,
    operationType: string
  ): Promise<void> {
    // TODO: Implement actual credit recording to database
    console.log(`[CREDIT_USAGE] Agent: ${this.motionId}, Tool: ${toolName}, Credits: ${creditsUsed}`);
  }

  // ============================================
  // CONTEXT MANAGEMENT
  // ============================================

  /**
   * Convert legacy AgentContext to MotionAgentContext
   */
  protected convertToMotionContext(ctx: AgentContext): MotionAgentContext {
    return {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      sessionId: ctx.sessionId,
      permissions: ctx.permissions,
      integrations: (ctx.integrations || []).map((i) => ({
        provider: i.provider || 'unknown',
        isConnected: true,
        accessToken: i.accessToken,
        refreshToken: i.refreshToken,
        expiresAt: i.expiresAt,
        scopes: i.scopes || [],
      })),
      preferences: {
        communicationStyle: 'professional' as const,
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: ctx.timezone || 'UTC',
          workDays: [1, 2, 3, 4, 5],
        },
        notificationPreferences: {
          email: true,
          slack: true,
          inApp: true,
        },
      },
      locale: ctx.locale || 'en-US',
      timezone: ctx.timezone || 'UTC',
      metadata: ctx.metadata,
    };
  }

  /**
   * Enrich context with agent-specific data
   */
  protected async enrichContext(context: MotionAgentContext): Promise<MotionAgentContext> {
    const agentContext = await this.getAgentSpecificContext(context);
    return {
      ...context,
      metadata: {
        ...context.metadata,
        agentContext,
      },
    };
  }

  // ============================================
  // CHAT HANDLING
  // ============================================

  /**
   * Handle chat with Motion-specific features
   */
  public async handleMotionChat(
    message: string,
    context: MotionAgentContext,
    conversationHistory: MotionMessage[] = []
  ): Promise<MotionAgentResponse<string>> {
    const startTime = Date.now();
    const creditsUsed = CREDIT_COSTS.CHAT_MESSAGE;

    try {
      // Enrich context
      const enrichedContext = await this.enrichContext(context);

      // Convert to legacy format and call parent
      const legacyContext: AgentContext = {
        userId: context.userId,
        workspaceId: context.workspaceId,
        sessionId: context.sessionId,
        permissions: context.permissions,
        integrations: context.integrations.map((i) => ({
          provider: i.provider as any,
          accessToken: i.accessToken || '',
          refreshToken: i.refreshToken,
          expiresAt: i.expiresAt,
          scopes: i.scopes,
        })),
        locale: context.locale,
        timezone: context.timezone,
        metadata: enrichedContext.metadata,
      };

      const legacyHistory: ConversationMessage[] = conversationHistory.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        toolInput: m.toolInput,
        toolOutput: m.toolOutput,
        tokensUsed: m.tokensUsed,
        createdAt: m.createdAt,
      }));

      const response = await this.handleChat(message, legacyContext, legacyHistory);

      // Record credit usage
      await this.recordCreditUsage(context, 'chat', creditsUsed, 'chat');

      return {
        success: response.success,
        data: response.data,
        error: response.error
          ? {
              code: response.error.code,
              message: response.error.message,
              details: response.error.details,
              retryable: response.error.retryable || false,
            }
          : undefined,
        metadata: {
          agentId: this.motionId,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: response.metadata.tokensUsed,
          creditsUsed,
          toolsUsed: response.metadata.toolsUsed,
          correlationId: response.metadata.correlationId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
        metadata: {
          agentId: this.motionId,
          executionTimeMs: Date.now() - startTime,
          creditsUsed: 0,
        },
      };
    }
  }

  // ============================================
  // EVENT EMISSION
  // ============================================

  /**
   * Emit a Motion event
   */
  protected async emitEvent(type: string, payload: Record<string, unknown>): Promise<void> {
    // TODO: Implement event bus integration
    console.log(`[MOTION_EVENT] ${type}:`, payload);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Create a tool error result
   */
  protected createToolError(
    code: ToolErrorCode,
    message: string,
    startTime: number
  ): ToolExecutionResult<never> {
    return {
      success: false,
      error: {
        code,
        message,
        retryable: this.isRetryableToolError(code),
      },
      executionTimeMs: Date.now() - startTime,
      creditsUsed: 0,
    };
  }

  /**
   * Check if tool error is retryable
   */
  protected isRetryableToolError(code: ToolErrorCode): boolean {
    return ['TIMEOUT', 'RATE_LIMITED', 'INTEGRATION_ERROR'].includes(code);
  }

  /**
   * Get agent info for API responses
   */
  public getMotionInfo(): MotionAgentInfo {
    return {
      id: this.motionId,
      name: this.name,
      role: this.role,
      description: this.description,
      category: this.agentCategory,
      color: this.color,
      icon: this.lucideIcon,
      specialties: this.specialties,
      version: this.version,
      toolCount: this.motionTools.size,
    };
  }

  // ============================================
  // CAPABILITIES PROPERTY
  // ============================================

  /**
   * Get agent capabilities
   */
  public get capabilities(): string[] {
    return [
      ...this.specialties,
      ...Array.from(this.motionTools.values()).map((t) => t.displayName),
    ];
  }
}

export default MotionBaseAgent;
