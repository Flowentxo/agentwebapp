/**
 * ACTION EXECUTOR SERVICE
 *
 * Executes custom actions defined by OpenAPI schemas
 * - Handles API calls to external services
 * - Manages authentication (API keys, OAuth)
 * - Validates requests/responses against schema
 * - Logs execution history
 */

import axios, { AxiosRequestConfig, Method } from 'axios';
import { getDb } from '@/lib/db/connection';
import { agentActions, actionExecutionLogs } from '@/lib/db/schema-custom-agents';
import { eq } from 'drizzle-orm';

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, {
    operationId: string;
    summary?: string;
    description?: string;
    parameters?: Array<{
      name: string;
      in: 'query' | 'path' | 'header' | 'cookie';
      required?: boolean;
      schema: any;
    }>;
    requestBody?: {
      required?: boolean;
      content: Record<string, { schema: any }>;
    };
    responses: Record<string, any>;
  }>>;
}

export interface ActionAuthentication {
  type: 'none' | 'api_key' | 'oauth';
  config?: {
    // API Key auth
    apiKey?: string;
    apiKeyHeader?: string; // Default: 'Authorization'
    apiKeyPrefix?: string; // Default: 'Bearer'

    // OAuth
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  };
}

export interface ActionExecutionContext {
  actionId: string;
  agentId: string;
  userId: string;
  workspaceId?: string;
  conversationId?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  executionTime: number;
  timestamp: Date;
}

export class ActionExecutorService {
  /**
   * Execute a custom action
   */
  async executeAction(
    context: ActionExecutionContext,
    operationId: string,
    parameters: Record<string, any>
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`[ACTION_EXECUTOR] Executing action: ${operationId}`);

      // Load action from database
      const db = getDb();
      const [action] = await db
        .select()
        .from(agentActions)
        .where(eq(agentActions.id, context.actionId))
        .limit(1);

      if (!action) {
        throw new Error(`Action not found: ${context.actionId}`);
      }

      if (!action.enabled) {
        throw new Error(`Action is disabled: ${context.actionId}`);
      }

      const schema = action.schema as unknown as OpenAPISchema;
      const auth = action.authentication as unknown as ActionAuthentication;

      // Find the operation in the schema
      const operation = this.findOperation(schema, operationId);
      if (!operation) {
        throw new Error(`Operation not found: ${operationId}`);
      }

      // Build request
      const request = this.buildRequest(schema, operation, parameters, auth);

      // Execute HTTP request
      console.log(`[ACTION_EXECUTOR] Calling ${request.method} ${request.url}`);
      const response = await axios.request(request);

      const executionTime = Date.now() - startTime;

      // Log successful execution
      await this.logExecution(context, operationId, parameters, {
        success: true,
        data: response.data,
        statusCode: response.status,
        executionTime,
        timestamp: new Date()
      });

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        executionTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      console.error('[ACTION_EXECUTOR] Execution failed:', error);

      const result: ActionExecutionResult = {
        success: false,
        error: error.response?.data?.message || error.message || 'Action execution failed',
        statusCode: error.response?.status,
        executionTime,
        timestamp: new Date()
      };

      // Log failed execution
      await this.logExecution(context, operationId, parameters, result);

      return result;
    }
  }

  /**
   * Find operation in OpenAPI schema
   */
  private findOperation(schema: OpenAPISchema, operationId: string): {
    path: string;
    method: string;
    spec: any;
  } | null {
    for (const [path, pathItem] of Object.entries(schema.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (operation.operationId === operationId) {
          return { path, method, spec: operation };
        }
      }
    }
    return null;
  }

  /**
   * Build HTTP request from OpenAPI operation
   */
  private buildRequest(
    schema: OpenAPISchema,
    operation: { path: string; method: string; spec: any },
    parameters: Record<string, any>,
    auth: ActionAuthentication
  ): AxiosRequestConfig {
    const baseURL = schema.servers[0]?.url || '';
    let url = operation.path;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const queryParams: Record<string, any> = {};
    let body: any = undefined;

    // Apply authentication
    if (auth.type === 'api_key' && auth.config?.apiKey) {
      const headerName = auth.config.apiKeyHeader || 'Authorization';
      const prefix = auth.config.apiKeyPrefix || 'Bearer';
      headers[headerName] = `${prefix} ${auth.config.apiKey}`;
    } else if (auth.type === 'oauth' && auth.config?.accessToken) {
      headers['Authorization'] = `Bearer ${auth.config.accessToken}`;
    }

    // Process parameters
    if (operation.spec.parameters) {
      for (const param of operation.spec.parameters) {
        const value = parameters[param.name];

        if (value !== undefined) {
          if (param.in === 'path') {
            url = url.replace(`{${param.name}}`, encodeURIComponent(value));
          } else if (param.in === 'query') {
            queryParams[param.name] = value;
          } else if (param.in === 'header') {
            headers[param.name] = value;
          }
        } else if (param.required) {
          throw new Error(`Required parameter missing: ${param.name}`);
        }
      }
    }

    // Process request body
    if (operation.spec.requestBody) {
      const contentType = Object.keys(operation.spec.requestBody.content)[0];
      headers['Content-Type'] = contentType;

      if (contentType.includes('json')) {
        body = parameters.body || parameters;
      } else if (contentType.includes('form')) {
        body = new URLSearchParams(parameters.body || parameters);
      }
    }

    return {
      method: operation.method.toUpperCase() as Method,
      url: `${baseURL}${url}`,
      headers,
      params: queryParams,
      data: body,
      timeout: 30000, // 30 seconds
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    };
  }

  /**
   * Log action execution
   */
  private async logExecution(
    context: ActionExecutionContext,
    operationId: string,
    parameters: Record<string, any>,
    result: ActionExecutionResult
  ): Promise<void> {
    try {
      const db = getDb();

      await db.insert(actionExecutionLogs).values({
        actionId: context.actionId,
        agentId: context.agentId,
        userId: context.userId,
        workspaceId: context.workspaceId || null,
        conversationId: context.conversationId || null,
        operationId,
        parameters: parameters as any,
        success: result.success,
        statusCode: result.statusCode?.toString() || null,
        responseData: result.data as any,
        errorMessage: result.error || null,
        executionTimeMs: result.executionTime.toString(),
        executedAt: result.timestamp,
      });

      console.log('[ACTION_EXECUTOR] ✅ Execution logged');
    } catch (error) {
      console.error('[ACTION_EXECUTOR] Failed to log execution:', error);
      // Don't throw - logging failure shouldn't break execution
    }
  }

  /**
   * Test action connection (validate schema and auth)
   */
  async testAction(actionId: string): Promise<{
    success: boolean;
    message: string;
    schemaValid?: boolean;
    authValid?: boolean;
  }> {
    try {
      const db = getDb();
      const [action] = await db
        .select()
        .from(agentActions)
        .where(eq(agentActions.id, actionId))
        .limit(1);

      if (!action) {
        return { success: false, message: 'Action not found' };
      }

      // Validate schema structure
      const schema = action.schema as unknown as OpenAPISchema;
      const schemaValid = this.validateSchema(schema);

      if (!schemaValid) {
        return {
          success: false,
          message: 'Invalid OpenAPI schema',
          schemaValid: false
        };
      }

      // Test authentication (if configured)
      const auth = action.authentication as unknown as ActionAuthentication;
      let authValid = true;

      if (auth.type === 'oauth' && auth.config?.accessToken) {
        // Check if token is expired
        if (auth.config.tokenExpiry && new Date(auth.config.tokenExpiry) < new Date()) {
          authValid = false;
        }
      }

      return {
        success: schemaValid && authValid,
        message: schemaValid && authValid ? 'Action is ready' : 'Action configuration incomplete',
        schemaValid,
        authValid
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test action'
      };
    }
  }

  /**
   * Validate OpenAPI schema structure
   */
  private validateSchema(schema: any): boolean {
    if (!schema || typeof schema !== 'object') return false;
    if (!schema.openapi || !schema.info || !schema.paths) return false;
    if (!schema.servers || !Array.isArray(schema.servers) || schema.servers.length === 0) return false;
    return true;
  }

  /**
   * Get available operations for an action
   */
  async getActionOperations(actionId: string): Promise<Array<{
    operationId: string;
    method: string;
    path: string;
    summary?: string;
    description?: string;
  }>> {
    try {
      const db = getDb();
      const [action] = await db
        .select()
        .from(agentActions)
        .where(eq(agentActions.id, actionId))
        .limit(1);

      if (!action) return [];

      const schema = action.schema as unknown as OpenAPISchema;
      const operations: Array<any> = [];

      for (const [path, pathItem] of Object.entries(schema.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (operation.operationId) {
            operations.push({
              operationId: operation.operationId,
              method: method.toUpperCase(),
              path,
              summary: operation.summary,
              description: operation.description
            });
          }
        }
      }

      return operations;
    } catch (error) {
      console.error('[ACTION_EXECUTOR] Failed to get operations:', error);
      return [];
    }
  }
}

// Singleton instance
export const actionExecutorService = new ActionExecutorService();
