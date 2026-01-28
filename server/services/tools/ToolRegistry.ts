/**
 * Tool Registry - Singleton Service
 * Phase 12: Tool Execution Layer
 *
 * Central registry for all executable tools with automatic token handling
 */

import {
  ITool,
  ToolContext,
  ToolResult,
  ToolRegistryConfig,
  ToolExecutionLog,
  ToolCategory,
} from '@/lib/tools/interfaces';
import { createLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('ToolRegistry');

// ============================================================================
// TOOL REGISTRY SINGLETON
// ============================================================================

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ITool> = new Map();
  private config: ToolRegistryConfig;
  private executionLogs: ToolExecutionLog[] = [];

  private constructor(config: ToolRegistryConfig = {}) {
    this.config = {
      enableLogging: true,
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ToolRegistryConfig): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry(config);
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.id)) {
      logger.warn(`Tool ${tool.id} already registered, overwriting...`);
    }
    this.tools.set(tool.id, tool);
    logger.info(`✅ Registered tool: ${tool.id} (${tool.name})`);
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: ITool[]): void {
    tools.forEach((tool) => this.register(tool));
    logger.info(`Registered ${tools.length} tools`);
  }

  /**
   * Get a tool by ID
   */
  getTool(toolId: string): ITool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): ITool[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }

  /**
   * Get tools by provider
   */
  getToolsByProvider(provider: string): ITool[] {
    return this.getAllTools().filter((tool) => tool.provider === provider);
  }

  /**
   * Check if a tool exists
   */
  hasTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Execute a tool with full context
   */
  async executeTool<TInput = unknown, TOutput = unknown>(
    toolId: string,
    input: TInput,
    context: ToolContext
  ): Promise<ToolResult<TOutput>> {
    const startTime = Date.now();
    const logId = uuidv4();

    // Get tool
    const tool = this.tools.get(toolId);
    if (!tool) {
      logger.error(`Tool not found: ${toolId}`);
      return {
        success: false,
        data: null as unknown as TOutput,
        error: `Tool '${toolId}' not found in registry`,
        errorCode: 'TOOL_NOT_FOUND',
      };
    }

    // Create execution log
    const log: ToolExecutionLog = {
      id: logId,
      toolId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      executionId: context.executionId,
      input: input as Record<string, unknown>,
      startedAt: new Date(),
      status: 'running',
    };

    if (this.config.enableLogging) {
      this.executionLogs.push(log);
    }

    logger.info(`[${toolId}] Executing for user ${context.userId}...`);

    try {
      // Execute with retry logic
      const result = await this.executeWithRetry<TInput, TOutput>(
        tool,
        input,
        context
      );

      // Update log
      const durationMs = Date.now() - startTime;
      log.completedAt = new Date();
      log.durationMs = durationMs;
      log.output = result as ToolResult;
      log.status = result.success ? 'success' : 'error';
      if (!result.success) {
        log.errorMessage = result.error;
      }

      // Add duration to result metadata
      result.metadata = {
        ...result.metadata,
        durationMs,
      };

      logger.info(
        `[${toolId}] ${result.success ? '✅ Success' : '❌ Failed'} in ${durationMs}ms`
      );

      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      // Update log
      log.completedAt = new Date();
      log.durationMs = durationMs;
      log.status = 'error';
      log.errorMessage = error.message;

      logger.error(`[${toolId}] Execution error:`, error);

      return {
        success: false,
        data: null as unknown as TOutput,
        error: error.message || 'Tool execution failed',
        errorCode: 'EXECUTION_ERROR',
        metadata: { durationMs },
      };
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<TInput, TOutput>(
    tool: ITool,
    input: TInput,
    context: ToolContext,
    attempt: number = 1
  ): Promise<ToolResult<TOutput>> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool execution timed out after ${this.config.defaultTimeout}ms`));
        }, this.config.defaultTimeout);
      });

      // Execute tool with timeout
      const result = await Promise.race([
        tool.execute(input, context),
        timeoutPromise,
      ]) as ToolResult<TOutput>;

      return result;
    } catch (error: any) {
      // Check if we should retry
      const isRetryable = this.isRetryableError(error);
      const maxRetries = this.config.maxRetries || 3;

      if (isRetryable && attempt < maxRetries) {
        const delay = (this.config.retryDelay || 1000) * attempt;
        logger.warn(
          `[${tool.id}] Attempt ${attempt} failed, retrying in ${delay}ms...`
        );

        await this.sleep(delay);
        return this.executeWithRetry(tool, input, context, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Rate limit errors
    if (error.status === 429) return true;
    // Server errors
    if (error.status >= 500 && error.status < 600) return true;
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    // Explicit retryable flag
    if (error.retryable === true) return true;

    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution logs (last N)
   */
  getExecutionLogs(limit: number = 100): ToolExecutionLog[] {
    return this.executionLogs.slice(-limit);
  }

  /**
   * Get logs for a specific user
   */
  getLogsForUser(userId: string, limit: number = 50): ToolExecutionLog[] {
    return this.executionLogs
      .filter((log) => log.userId === userId)
      .slice(-limit);
  }

  /**
   * Clear old logs
   */
  clearOldLogs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    this.executionLogs = this.executionLogs.filter(
      (log) => log.startedAt.getTime() > cutoff
    );
  }

  /**
   * Get tool catalog for UI
   */
  getCatalog(): Array<{
    id: string;
    name: string;
    description: string;
    category: ToolCategory;
    provider: string;
    icon: string;
    parameters: ITool['parameters'];
  }> {
    return this.getAllTools().map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      provider: tool.provider,
      icon: tool.icon,
      parameters: tool.parameters,
    }));
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();
