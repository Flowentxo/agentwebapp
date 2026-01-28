/**
 * CUSTOM TOOL REGISTRY SERVICE
 *
 * Dynamic tool registration, validation, and execution orchestration
 */

import { getDb } from '@/lib/db/connection';
import {
  customTools,
  toolExecutionLogs,
} from '@/lib/db/schema-custom-tools';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface CustomTool {
  id: string;
  workspaceId?: string;
  createdBy?: string;
  name: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  type: 'api_call' | 'code_execution' | 'database_query' | 'webhook';
  config: any;
  parameters: ToolParameter[];
  outputSchema?: any;
  authType?: string;
  credentialId?: string;
  isActive: boolean;
  version: number;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolExecutionInput {
  toolId: string;
  workspaceId?: string;
  executedBy?: string;
  parameters: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  durationMs: number;
  logs?: string[];
}

// ============================================================
// CUSTOM TOOL REGISTRY SERVICE
// ============================================================

export class CustomToolRegistryService {
  private toolExecutors: Map<
    string,
    (tool: CustomTool, params: Record<string, any>) => Promise<any>
  > = new Map();

  constructor() {
    console.log('[TOOL_REGISTRY] Initializing Custom Tool Registry...');
  }

  // ========================================================
  // TOOL REGISTRATION
  // ========================================================

  /**
   * Register a custom tool
   */
  async registerTool(options: {
    workspaceId?: string;
    createdBy?: string;
    name: string;
    displayName: string;
    description?: string;
    category?: string;
    icon?: string;
    type: CustomTool['type'];
    config: any;
    parameters: ToolParameter[];
    outputSchema?: any;
    authType?: string;
    credentialId?: string;
  }): Promise<CustomTool> {
    const db = getDb();

    console.log(`[TOOL_REGISTRY] Registering tool: ${options.name}`);

    // Validate parameters
    this.validateParameters(options.parameters);

    // Check for name conflicts in workspace
    if (options.workspaceId) {
      const existing = await db
        .select()
        .from(customTools)
        .where(
          and(
            eq(customTools.workspaceId, options.workspaceId),
            eq(customTools.name, options.name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error(`Tool with name "${options.name}" already exists in this workspace`);
      }
    }

    // Insert tool
    const [tool] = await db
      .insert(customTools)
      .values({
        workspaceId: options.workspaceId || null,
        createdBy: options.createdBy || null,
        name: options.name,
        displayName: options.displayName,
        description: options.description || null,
        category: options.category || 'custom',
        icon: options.icon || null,
        type: options.type,
        config: options.config,
        parameters: options.parameters as any,
        outputSchema: options.outputSchema || null,
        authType: options.authType || null,
        credentialId: options.credentialId || null,
        isActive: true,
        version: 1,
        usageCount: 0,
      })
      .returning();

    console.log(`[TOOL_REGISTRY] ✅ Tool registered: ${tool.id}`);

    return tool as CustomTool;
  }

  /**
   * Update a tool
   */
  async updateTool(
    toolId: string,
    updates: Partial<Omit<CustomTool, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<CustomTool> {
    const db = getDb();

    console.log(`[TOOL_REGISTRY] Updating tool: ${toolId}`);

    if (updates.parameters) {
      this.validateParameters(updates.parameters);
    }

    const [updated] = await db
      .update(customTools)
      .set({
        ...updates,
        updatedAt: new Date(),
        version: updates.version ? updates.version + 1 : undefined,
      })
      .where(eq(customTools.id, toolId))
      .returning();

    if (!updated) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    return updated as CustomTool;
  }

  /**
   * Delete a tool
   */
  async deleteTool(toolId: string): Promise<void> {
    const db = getDb();

    console.log(`[TOOL_REGISTRY] Deleting tool: ${toolId}`);

    await db.delete(customTools).where(eq(customTools.id, toolId));
  }

  /**
   * Get tool by ID
   */
  async getTool(toolId: string): Promise<CustomTool | null> {
    const db = getDb();

    const [tool] = await db
      .select()
      .from(customTools)
      .where(eq(customTools.id, toolId))
      .limit(1);

    return tool ? (tool as CustomTool) : null;
  }

  /**
   * List all tools for a workspace
   */
  async listTools(options?: {
    workspaceId?: string;
    category?: string;
    type?: string;
    isActive?: boolean;
  }): Promise<CustomTool[]> {
    const db = getDb();

    let query = db.select().from(customTools);

    const conditions = [];
    if (options?.workspaceId) {
      conditions.push(eq(customTools.workspaceId, options.workspaceId));
    }
    if (options?.category) {
      conditions.push(eq(customTools.category, options.category));
    }
    if (options?.type) {
      conditions.push(eq(customTools.type, options.type as any));
    }
    if (options?.isActive !== undefined) {
      conditions.push(eq(customTools.isActive, options.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const tools = await query;

    return tools as CustomTool[];
  }

  // ========================================================
  // TOOL EXECUTION
  // ========================================================

  /**
   * Execute a tool
   */
  async executeTool(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`[${new Date().toISOString()}] Starting tool execution`);

      // Get tool
      const tool = await this.getTool(input.toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${input.toolId}`);
      }

      if (!tool.isActive) {
        throw new Error(`Tool is inactive: ${input.toolId}`);
      }

      logs.push(`Tool: ${tool.displayName} (${tool.type})`);

      // Validate parameters
      const validatedParams = this.validateAndNormalizeParams(
        input.parameters,
        tool.parameters
      );

      logs.push(`Parameters validated: ${Object.keys(validatedParams).length} params`);

      // Execute based on type
      let result: any;

      const executor = this.toolExecutors.get(tool.type);
      if (executor) {
        logs.push(`Executing with registered executor...`);
        result = await executor(tool, validatedParams);
      } else {
        logs.push(`No executor registered for type: ${tool.type}`);
        throw new Error(`No executor registered for tool type: ${tool.type}`);
      }

      const durationMs = Date.now() - startTime;
      logs.push(`✅ Execution completed in ${durationMs}ms`);

      // Update usage stats
      await this.updateToolUsage(input.toolId);

      // Log execution
      await this.logExecution({
        toolId: input.toolId,
        workspaceId: input.workspaceId,
        executedBy: input.executedBy,
        input: validatedParams,
        output: result,
        status: 'success',
        durationMs,
      });

      return {
        success: true,
        data: result,
        durationMs,
        logs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      logs.push(`❌ Execution failed: ${error.message}`);

      // Log failure
      await this.logExecution({
        toolId: input.toolId,
        workspaceId: input.workspaceId,
        executedBy: input.executedBy,
        input: input.parameters,
        output: null,
        status: 'error',
        errorMessage: error.message,
        errorStack: error.stack,
        durationMs,
      });

      return {
        success: false,
        error: error.message,
        durationMs,
        logs,
      };
    }
  }

  /**
   * Register a tool executor function
   */
  registerExecutor(
    type: string,
    executor: (tool: CustomTool, params: Record<string, any>) => Promise<any>
  ): void {
    console.log(`[TOOL_REGISTRY] Registering executor for type: ${type}`);
    this.toolExecutors.set(type, executor);
  }

  // ========================================================
  // VALIDATION HELPERS
  // ========================================================

  /**
   * Validate tool parameters schema
   */
  private validateParameters(parameters: ToolParameter[]): void {
    const names = new Set<string>();

    for (const param of parameters) {
      if (!param.name || typeof param.name !== 'string') {
        throw new Error('Parameter name is required and must be a string');
      }

      if (names.has(param.name)) {
        throw new Error(`Duplicate parameter name: ${param.name}`);
      }

      names.add(param.name);

      if (!['string', 'number', 'boolean', 'object', 'array'].includes(param.type)) {
        throw new Error(`Invalid parameter type: ${param.type}`);
      }
    }
  }

  /**
   * Validate and normalize execution parameters
   */
  private validateAndNormalizeParams(
    provided: Record<string, any>,
    schema: ToolParameter[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const param of schema) {
      const value = provided[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      // Use default if not provided
      if (value === undefined && param.default !== undefined) {
        result[param.name] = param.default;
        continue;
      }

      if (value === undefined) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (param.type === 'object' && actualType !== 'object') {
        throw new Error(`Parameter "${param.name}" must be an object`);
      }
      if (param.type !== 'object' && param.type !== actualType) {
        throw new Error(
          `Parameter "${param.name}" must be of type ${param.type}, got ${actualType}`
        );
      }

      // Enum validation
      if (param.enum && !param.enum.includes(value)) {
        throw new Error(
          `Parameter "${param.name}" must be one of: ${param.enum.join(', ')}`
        );
      }

      // Number validation
      if (param.type === 'number' && param.validation) {
        if (param.validation.min !== undefined && value < param.validation.min) {
          throw new Error(
            `Parameter "${param.name}" must be >= ${param.validation.min}`
          );
        }
        if (param.validation.max !== undefined && value > param.validation.max) {
          throw new Error(
            `Parameter "${param.name}" must be <= ${param.validation.max}`
          );
        }
      }

      // String validation
      if (param.type === 'string' && param.validation) {
        if (
          param.validation.minLength !== undefined &&
          value.length < param.validation.minLength
        ) {
          throw new Error(
            `Parameter "${param.name}" must have at least ${param.validation.minLength} characters`
          );
        }
        if (
          param.validation.maxLength !== undefined &&
          value.length > param.validation.maxLength
        ) {
          throw new Error(
            `Parameter "${param.name}" must have at most ${param.validation.maxLength} characters`
          );
        }
        if (param.validation.pattern) {
          const regex = new RegExp(param.validation.pattern);
          if (!regex.test(value)) {
            throw new Error(
              `Parameter "${param.name}" does not match required pattern`
            );
          }
        }
      }

      result[param.name] = value;
    }

    return result;
  }

  // ========================================================
  // USAGE & LOGGING
  // ========================================================

  /**
   * Update tool usage statistics
   */
  private async updateToolUsage(toolId: string): Promise<void> {
    const db = getDb();

    await db
      .update(customTools)
      .set({
        usageCount: (customTools.usageCount as any) + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(customTools.id, toolId));
  }

  /**
   * Log tool execution
   */
  private async logExecution(log: {
    toolId: string;
    workspaceId?: string;
    executedBy?: string;
    input: any;
    output: any;
    status: 'success' | 'error' | 'timeout';
    errorMessage?: string;
    errorStack?: string;
    durationMs: number;
  }): Promise<void> {
    const db = getDb();

    const tool = await this.getTool(log.toolId);
    if (!tool) return;

    await db.insert(toolExecutionLogs).values({
      toolId: log.toolId,
      workspaceId: log.workspaceId || null,
      executedBy: log.executedBy || null,
      executionType: tool.type,
      input: log.input,
      output: log.output,
      status: log.status,
      errorMessage: log.errorMessage || null,
      errorStack: log.errorStack || null,
      durationMs: log.durationMs,
      startedAt: new Date(Date.now() - log.durationMs),
      completedAt: new Date(),
    });
  }

  /**
   * Get execution logs for a tool
   */
  async getExecutionLogs(
    toolId: string,
    limit: number = 100
  ): Promise<any[]> {
    const db = getDb();

    const logs = await db
      .select()
      .from(toolExecutionLogs)
      .where(eq(toolExecutionLogs.toolId, toolId))
      .orderBy(desc(toolExecutionLogs.startedAt))
      .limit(limit);

    return logs;
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const customToolRegistry = new CustomToolRegistryService();
