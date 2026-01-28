/**
 * PHASE 5: Base Agent Class
 * Abstrakte Basis-Klasse für alle Enterprise Agents
 */

import { getDb } from '@/lib/db';
import { agentExecutions, agentAuditLogs, agentConversations } from '@/lib/db/schema-agents';
import { eq, and, desc } from 'drizzle-orm';
import {
  AgentContext,
  AgentResponse,
  AgentToolDefinition,
  AgentError,
  AgentErrorCode,
  ConversationMessage,
  ExecutionStatus,
} from '../shared/types';

// ============================================
// AGENT TOOL INTERFACE
// ============================================

export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  displayName: string;
  description: string;
  category: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  requiresAuth?: boolean;
  requiredIntegrations?: string[];
  rateLimitPerMinute?: number;
  timeout?: number;
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>;
}

// ============================================
// BASE AGENT CLASS
// ============================================

export abstract class BaseAgent {
  // Abstract properties - must be implemented by each agent
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;
  abstract readonly category: string;
  abstract readonly icon: string;
  abstract readonly color: string;

  // Tool registry
  protected tools: Map<string, AgentTool> = new Map();

  // Database instance
  protected db = getDb();

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor() {
    // Register tools in subclass
    this.registerTools();
  }

  // ============================================
  // ABSTRACT METHODS
  // ============================================

  /**
   * Register all tools for this agent
   * Must be implemented by each agent
   */
  protected abstract registerTools(): void;

  /**
   * Handle chat messages
   * Must be implemented by each agent
   */
  public abstract handleChat(
    message: string,
    context: AgentContext,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse<string>>;

  /**
   * Get system prompt for this agent
   * Can be overridden for custom prompts
   */
  public abstract getSystemPrompt(): string;

  // ============================================
  // TOOL MANAGEMENT
  // ============================================

  /**
   * Get all registered tools
   */
  public getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  public getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if tool exists
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Register a new tool
   */
  protected registerTool<TInput, TOutput>(tool: AgentTool<TInput, TOutput>): void {
    this.tools.set(tool.name, tool as AgentTool);
  }

  // ============================================
  // TOOL EXECUTION
  // ============================================

  /**
   * Execute a tool with full tracking and error handling
   */
  public async executeTool<TInput, TOutput>(
    toolName: string,
    input: TInput,
    context: AgentContext
  ): Promise<AgentResponse<TOutput>> {
    const startTime = Date.now();
    const executionId = crypto.randomUUID();
    const correlationId = context.metadata?.correlationId as string || crypto.randomUUID();

    try {
      // Get tool
      const tool = this.tools.get(toolName);
      if (!tool) {
        return this.createErrorResponse(
          'TOOL_NOT_FOUND',
          `Tool "${toolName}" not found in agent "${this.id}"`,
          startTime
        );
      }

      // Check permissions
      const permissionCheck = await this.checkPermissions(toolName, context);
      if (!permissionCheck.allowed) {
        return this.createErrorResponse(
          'PERMISSION_DENIED',
          permissionCheck.reason || 'Permission denied',
          startTime
        );
      }

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(toolName, context, tool.rateLimitPerMinute);
      if (!rateLimitCheck.allowed) {
        return this.createErrorResponse(
          'RATE_LIMITED',
          rateLimitCheck.reason || 'Rate limit exceeded',
          startTime
        );
      }

      // Log execution start
      await this.logExecutionStart(executionId, toolName, input as Record<string, unknown>, context, correlationId);

      // Execute tool with timeout
      const timeout = tool.timeout || 30000; // Default 30s
      const result = await this.executeWithTimeout(
        () => tool.execute(input, context),
        timeout
      );

      const executionTimeMs = Date.now() - startTime;

      // Log execution complete
      await this.logExecutionComplete(executionId, result as Record<string, unknown>, executionTimeMs);

      // Log to audit
      await this.logAudit({
        action: `tool.${toolName}`,
        toolName,
        input: input as Record<string, unknown>,
        output: result as Record<string, unknown>,
        success: true,
        executionTimeMs,
        context,
        correlationId,
      });

      return {
        success: true,
        data: result as TOutput,
        metadata: {
          agentId: this.id,
          executionTimeMs,
          toolsUsed: [toolName],
          correlationId,
        },
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = this.getErrorCode(error);

      // Log execution error
      await this.logExecutionError(executionId, errorMessage, executionTimeMs);

      // Log to audit
      await this.logAudit({
        action: `tool.${toolName}`,
        toolName,
        input: input as Record<string, unknown>,
        success: false,
        errorCode,
        errorMessage,
        executionTimeMs,
        context,
        correlationId,
      });

      return this.createErrorResponse(errorCode, errorMessage, startTime);
    }
  }

  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================

  /**
   * Get or create conversation
   */
  public async getOrCreateConversation(
    context: AgentContext
  ): Promise<{ id: string; messages: ConversationMessage[] }> {
    const existing = await this.db
      .select()
      .from(agentConversations)
      .where(
        and(
          eq(agentConversations.agentId, this.id),
          eq(agentConversations.userId, context.userId),
          eq(agentConversations.sessionId, context.sessionId),
          eq(agentConversations.isActive, true)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        messages: (existing[0].messages as ConversationMessage[]) || [],
      };
    }

    // Create new conversation
    const [newConv] = await this.db
      .insert(agentConversations)
      .values({
        agentId: this.id,
        userId: context.userId,
        workspaceId: context.workspaceId,
        sessionId: context.sessionId,
        messages: [],
        isActive: true,
      })
      .returning();

    return {
      id: newConv.id,
      messages: [],
    };
  }

  /**
   * Add message to conversation
   */
  public async addMessageToConversation(
    conversationId: string,
    message: ConversationMessage
  ): Promise<void> {
    const [conv] = await this.db
      .select()
      .from(agentConversations)
      .where(eq(agentConversations.id, conversationId))
      .limit(1);

    if (!conv) return;

    const messages = [...((conv.messages as ConversationMessage[]) || []), message];
    const tokensUsed = message.tokensUsed || 0;

    await this.db
      .update(agentConversations)
      .set({
        messages,
        messageCount: messages.length,
        totalTokens: (conv.totalTokens || 0) + tokensUsed,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentConversations.id, conversationId));
  }

  /**
   * Get recent conversation history
   */
  public async getConversationHistory(
    context: AgentContext,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    const [conv] = await this.db
      .select()
      .from(agentConversations)
      .where(
        and(
          eq(agentConversations.agentId, this.id),
          eq(agentConversations.userId, context.userId),
          eq(agentConversations.sessionId, context.sessionId),
          eq(agentConversations.isActive, true)
        )
      )
      .orderBy(desc(agentConversations.updatedAt))
      .limit(1);

    if (!conv) return [];

    const messages = (conv.messages as ConversationMessage[]) || [];
    return messages.slice(-limit);
  }

  // ============================================
  // PERMISSION & RATE LIMITING
  // ============================================

  /**
   * Check if user has permission to execute tool
   */
  protected async checkPermissions(
    toolName: string,
    context: AgentContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Default: allow all
    // Override in subclasses for specific permission logic
    return { allowed: true };
  }

  /**
   * Check rate limit for tool
   */
  protected async checkRateLimit(
    toolName: string,
    context: AgentContext,
    limitPerMinute?: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!limitPerMinute) return { allowed: true };

    // Count executions in last minute
    const oneMinuteAgo = new Date(Date.now() - 60000);

    const recentExecutions = await this.db
      .select()
      .from(agentExecutions)
      .where(
        and(
          eq(agentExecutions.agentId, this.id),
          eq(agentExecutions.userId, context.userId),
          eq(agentExecutions.toolName, toolName)
        )
      )
      .limit(limitPerMinute + 1);

    const recentCount = recentExecutions.filter(
      e => e.createdAt && e.createdAt > oneMinuteAgo
    ).length;

    if (recentCount >= limitPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. Maximum ${limitPerMinute} executions per minute.`,
      };
    }

    return { allowed: true };
  }

  // ============================================
  // EXECUTION LOGGING
  // ============================================

  /**
   * Log execution start
   */
  protected async logExecutionStart(
    executionId: string,
    toolName: string,
    input: Record<string, unknown>,
    context: AgentContext,
    correlationId: string
  ): Promise<void> {
    await this.db.insert(agentExecutions).values({
      id: executionId,
      agentId: this.id,
      userId: context.userId,
      workspaceId: context.workspaceId,
      toolName,
      input,
      status: 'running' as ExecutionStatus,
      correlationId,
      startedAt: new Date(),
    });
  }

  /**
   * Log execution complete
   */
  protected async logExecutionComplete(
    executionId: string,
    output: Record<string, unknown>,
    executionTimeMs: number,
    tokensUsed?: number
  ): Promise<void> {
    await this.db
      .update(agentExecutions)
      .set({
        output,
        status: 'completed' as ExecutionStatus,
        executionTimeMs,
        tokensUsed,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));
  }

  /**
   * Log execution error
   */
  protected async logExecutionError(
    executionId: string,
    errorMessage: string,
    executionTimeMs: number
  ): Promise<void> {
    await this.db
      .update(agentExecutions)
      .set({
        status: 'failed' as ExecutionStatus,
        errorMessage,
        executionTimeMs,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  /**
   * Log action to audit trail
   */
  protected async logAudit(params: {
    action: string;
    toolName?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    executionTimeMs: number;
    tokensUsed?: number;
    context: AgentContext;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.db.insert(agentAuditLogs).values({
        agentId: this.id,
        userId: params.context.userId,
        workspaceId: params.context.workspaceId,
        action: params.action,
        toolName: params.toolName,
        input: params.input,
        output: params.output,
        success: params.success,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        executionTimeMs: params.executionTimeMs,
        tokensUsed: params.tokensUsed,
        correlationId: params.correlationId,
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('[AUDIT_LOG_ERROR]', error);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Execute function with timeout
   */
  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Create error response
   */
  protected createErrorResponse<T>(
    code: AgentErrorCode,
    message: string,
    startTime: number
  ): AgentResponse<T> {
    return {
      success: false,
      error: {
        code,
        message,
        retryable: this.isRetryableError(code),
      },
      metadata: {
        agentId: this.id,
        executionTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Get error code from error
   */
  protected getErrorCode(error: unknown): AgentErrorCode {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) return 'TIMEOUT';
      if (message.includes('rate limit')) return 'RATE_LIMITED';
      if (message.includes('permission') || message.includes('unauthorized')) return 'PERMISSION_DENIED';
      if (message.includes('invalid') || message.includes('validation')) return 'INVALID_INPUT';
      if (message.includes('integration')) return 'INTEGRATION_ERROR';
    }
    return 'EXECUTION_FAILED';
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(code: AgentErrorCode): boolean {
    return ['TIMEOUT', 'RATE_LIMITED', 'INTEGRATION_ERROR'].includes(code);
  }

  /**
   * Get agent info for API responses
   */
  public getInfo(): {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    icon: string;
    color: string;
    tools: Array<{ name: string; displayName: string; description: string; category: string }>;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      category: this.category,
      icon: this.icon,
      color: this.color,
      tools: this.getAvailableTools().map(t => ({
        name: t.name,
        displayName: t.displayName,
        description: t.description,
        category: t.category,
      })),
    };
  }
}

// ============================================
// AGENT REGISTRY
// ============================================

class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  /**
   * Register an agent
   */
  register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Get agent by ID
   */
  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent exists
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Get agent IDs
   */
  getIds(): string[] {
    return Array.from(this.agents.keys());
  }
}

// Export singleton registry
export const agentRegistry = new AgentRegistry();
