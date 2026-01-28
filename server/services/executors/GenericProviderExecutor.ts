/**
 * FLOWENT AI STUDIO - GENERIC PROVIDER EXECUTOR
 *
 * Universal execution engine that uses node-definitions metadata to perform
 * API operations without requiring provider-specific executor files.
 *
 * Adding a new provider requires ONLY:
 * 1. Adding entry to provider-configs.ts (Base URL, Auth schema)
 * 2. Adding node definition to node-definitions.ts (UI + field schema)
 *
 * @version 1.0.0
 */

import {
  getProviderConfig,
  buildApiUrl,
  getDefaultHeaders,
  ProviderConfig,
  OPERATION_TEMPLATES,
} from '@/lib/studio/provider-configs';
import {
  getNodeById,
  NodeDefinition,
} from '@/lib/studio/node-definitions';
import {
  getAuthResolverService,
  AuthResolverService,
  ResolvedAuth,
} from '@/server/services/execution/AuthResolverService';
import { CredentialAccessContext } from '@/server/services/security/CredentialService';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionContext {
  /** Workflow execution ID */
  executionId: string;
  /** Workflow ID */
  workflowId: string;
  /** User ID running the workflow */
  userId: string;
  /** Workspace ID */
  workspaceId?: string;
  /** Node ID being executed */
  nodeId: string;
  /** Variables available for expression resolution */
  variables: Record<string, unknown>;
  /** Previous node outputs */
  nodeOutputs: Map<string, unknown>;
  /** Request source */
  requestSource?: 'api' | 'ui' | 'workflow';
}

export interface NodeConfig {
  /** Node type ID (e.g., 'hubspot_contact_create') */
  type: string;
  /** Node configuration values */
  values: Record<string, unknown>;
  /** Credential ID if required */
  credentialId?: string;
  /** Custom timeout in ms */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
    statusCode?: number;
    details?: unknown;
  };
  /** Execution metadata */
  meta: {
    /** Duration in milliseconds */
    durationMs: number;
    /** Provider ID */
    providerId?: string;
    /** HTTP status code if applicable */
    statusCode?: number;
    /** Request details for debugging */
    request?: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: unknown;
    };
    /** Response details for debugging */
    response?: {
      headers: Record<string, string>;
      body?: unknown;
    };
    /** Rate limit info if available */
    rateLimit?: {
      remaining: number;
      resetAt?: Date;
    };
    /** Retry attempt number */
    attempt?: number;
  };
}

// ============================================================================
// GENERIC PROVIDER EXECUTOR
// ============================================================================

export class GenericProviderExecutor {
  private authResolver: AuthResolverService;

  constructor() {
    this.authResolver = getAuthResolverService();
  }

  // --------------------------------------------------------------------------
  // MAIN EXECUTION METHOD
  // --------------------------------------------------------------------------

  /**
   * Execute a node using its definition metadata
   */
  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Get node definition
      const nodeDef = getNodeById(nodeConfig.type);
      if (!nodeDef) {
        return this.errorResult(`Unknown node type: ${nodeConfig.type}`, startTime);
      }

      // Determine provider from node definition
      const providerId = nodeDef.provider || this.extractProviderId(nodeConfig.type);
      const providerConfig = providerId ? getProviderConfig(providerId) : null;

      // Route to appropriate execution method
      if (nodeDef.category === 'core' || nodeDef.category === 'flow') {
        return this.executeBuiltIn(nodeDef, nodeConfig, context, startTime);
      }

      if (!providerConfig) {
        return this.errorResult(`No provider config for: ${nodeConfig.type}`, startTime);
      }

      // Execute provider API call
      return this.executeProviderCall(
        nodeDef,
        providerConfig,
        nodeConfig,
        context,
        startTime
      );
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Execution failed',
        startTime,
        error
      );
    }
  }

  // --------------------------------------------------------------------------
  // PROVIDER API EXECUTION
  // --------------------------------------------------------------------------

  /**
   * Execute a provider API call
   */
  private async executeProviderCall(
    nodeDef: NodeDefinition,
    providerConfig: ProviderConfig,
    nodeConfig: NodeConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    // Resolve authentication
    let resolvedAuth: ResolvedAuth | undefined;
    if (nodeConfig.credentialId) {
      const authContext: CredentialAccessContext = {
        userId: context.userId,
        workspaceId: context.workspaceId,
        workflowId: context.workflowId,
        executionId: context.executionId,
        nodeId: context.nodeId,
        requestSource: context.requestSource || 'workflow',
      };

      resolvedAuth = await this.authResolver.resolveAuth({
        providerId: providerConfig.id,
        credentialId: nodeConfig.credentialId,
        context: authContext,
        urlParams: this.extractUrlParams(nodeConfig.values),
      });
    }

    // Build request
    const request = await this.buildRequest(
      nodeDef,
      providerConfig,
      nodeConfig,
      context,
      resolvedAuth
    );

    // Execute with retry logic
    const retryConfig = nodeConfig.retry || { maxAttempts: 3, delayMs: 1000 };
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < retryConfig.maxAttempts) {
      attempt++;

      try {
        const result = await this.executeHttpRequest(
          request,
          providerConfig,
          nodeConfig.timeout,
          attempt,
          startTime
        );

        // Check if we should retry based on status code
        if (result.success || !this.isRetryable(result.meta.statusCode)) {
          return result;
        }

        lastError = new Error(result.error?.message || 'Request failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // Wait before retry with exponential backoff
      if (attempt < retryConfig.maxAttempts) {
        const delay = retryConfig.delayMs *
          Math.pow(retryConfig.backoffMultiplier || 2, attempt - 1);
        await this.delay(delay);
      }
    }

    return this.errorResult(
      lastError?.message || 'Max retries exceeded',
      startTime,
      lastError
    );
  }

  /**
   * Build HTTP request from node configuration
   */
  private async buildRequest(
    nodeDef: NodeDefinition,
    providerConfig: ProviderConfig,
    nodeConfig: NodeConfig,
    context: ExecutionContext,
    resolvedAuth?: ResolvedAuth
  ): Promise<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  }> {
    const values = await this.resolveExpressions(nodeConfig.values, context);

    // Determine HTTP method
    const method = this.getHttpMethod(nodeDef, values);

    // Build endpoint URL
    const endpoint = this.buildEndpoint(nodeDef, values);
    const url = resolvedAuth
      ? this.authResolver.buildProviderUrl(
          providerConfig.id,
          endpoint,
          resolvedAuth,
          this.extractUrlParams(values)
        )
      : buildApiUrl(providerConfig.id, endpoint, this.extractUrlParams(values));

    // Build headers
    const headers = this.authResolver.mergeHeaders(
      resolvedAuth || { headers: {}, queryParams: {} },
      this.buildCustomHeaders(values),
      getDefaultHeaders(providerConfig.id)
    );

    // Build body
    const body = this.buildRequestBody(nodeDef, values);

    return { method, url, headers, body };
  }

  /**
   * Execute the HTTP request
   */
  private async executeHttpRequest(
    request: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: unknown;
    },
    providerConfig: ProviderConfig,
    timeout?: number,
    attempt?: number,
    startTime?: number
  ): Promise<ExecutionResult> {
    const start = startTime || Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || 30000
    );

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: request.headers,
        signal: controller.signal,
      };

      if (request.body && !['GET', 'HEAD'].includes(request.method)) {
        fetchOptions.body = JSON.stringify(request.body);
      }

      const response = await fetch(request.url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else if (contentType.includes('text/')) {
        responseBody = await response.text();
      } else {
        responseBody = await response.arrayBuffer();
      }

      // Extract rate limit info
      const rateLimit = this.extractRateLimit(response.headers, providerConfig);

      // Build result
      const meta: ExecutionResult['meta'] = {
        durationMs: Date.now() - start,
        providerId: providerConfig.id,
        statusCode: response.status,
        request: {
          method: request.method,
          url: request.url,
          headers: this.sanitizeHeaders(request.headers),
          body: request.body,
        },
        response: {
          headers: responseHeaders,
          body: responseBody,
        },
        rateLimit,
        attempt,
      };

      if (!response.ok) {
        // Extract error from response
        const errorMessage = this.extractErrorMessage(
          responseBody,
          providerConfig,
          response.status
        );

        return {
          success: false,
          error: {
            message: errorMessage,
            statusCode: response.status,
            details: responseBody,
          },
          meta,
        };
      }

      // Extract data using provider's data path
      const data = this.extractData(responseBody, providerConfig);

      return {
        success: true,
        data,
        meta,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const message = isTimeout
        ? 'Request timed out'
        : error instanceof Error
        ? error.message
        : 'Request failed';

      return {
        success: false,
        error: {
          message,
          code: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
        },
        meta: {
          durationMs: Date.now() - start,
          providerId: providerConfig.id,
          request: {
            method: request.method,
            url: request.url,
            headers: this.sanitizeHeaders(request.headers),
            body: request.body,
          },
          attempt,
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // BUILT-IN NODE EXECUTION
  // --------------------------------------------------------------------------

  /**
   * Execute built-in core/flow nodes
   */
  private async executeBuiltIn(
    nodeDef: NodeDefinition,
    nodeConfig: NodeConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    const values = await this.resolveExpressions(nodeConfig.values, context);

    switch (nodeDef.type) {
      case 'http_request':
        return this.executeHttpNode(values, context, startTime);

      case 'code':
        return this.executeCodeNode(values, context, startTime);

      case 'set_variable':
        return this.executeSetVariable(values, context, startTime);

      case 'if':
        return this.executeIfNode(values, context, startTime);

      case 'switch':
        return this.executeSwitchNode(values, context, startTime);

      case 'loop':
        return this.executeLoopNode(values, context, startTime);

      case 'wait':
        return this.executeWaitNode(values, context, startTime);

      case 'filter':
        return this.executeFilterNode(values, context, startTime);

      case 'transform':
        return this.executeTransformNode(values, context, startTime);

      case 'aggregate':
        return this.executeAggregateNode(values, context, startTime);

      default:
        return this.errorResult(
          `Built-in node not implemented: ${nodeDef.type}`,
          startTime
        );
    }
  }

  /**
   * Execute HTTP Request node
   */
  private async executeHttpNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    const method = (values.method as string) || 'GET';
    const url = values.url as string;
    const headers = (values.headers as Record<string, string>) || {};
    const body = values.body;

    if (!url) {
      return this.errorResult('URL is required', startTime);
    }

    const request = { method, url, headers, body };

    // Use a generic provider config for HTTP
    const httpConfig = getProviderConfig('http')!;

    return this.executeHttpRequest(request, httpConfig, undefined, 1, startTime);
  }

  /**
   * Execute Code node (JavaScript)
   */
  private async executeCodeNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    const code = values.code as string;
    if (!code) {
      return this.errorResult('Code is required', startTime);
    }

    try {
      // Create a sandboxed function
      const fn = new Function(
        '$input',
        '$variables',
        '$outputs',
        `
        'use strict';
        ${code}
        `
      );

      // Execute with context
      const input = context.nodeOutputs.get(context.nodeId + '_input') || {};
      const result = await fn(
        input,
        context.variables,
        Object.fromEntries(context.nodeOutputs)
      );

      return {
        success: true,
        data: result,
        meta: { durationMs: Date.now() - startTime },
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Code execution failed',
        startTime
      );
    }
  }

  /**
   * Execute Set Variable node
   */
  private executeSetVariable(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): ExecutionResult {
    const variableName = values.name as string;
    const variableValue = values.value;

    if (!variableName) {
      return this.errorResult('Variable name is required', startTime);
    }

    // Set the variable in context
    context.variables[variableName] = variableValue;

    return {
      success: true,
      data: { [variableName]: variableValue },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute IF conditional node
   */
  private executeIfNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): ExecutionResult {
    const conditions = values.conditions as Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;

    const logicOperator = (values.logicOperator as string) || 'and';

    if (!conditions || conditions.length === 0) {
      return this.errorResult('At least one condition is required', startTime);
    }

    const results = conditions.map((condition) => {
      const fieldValue = this.getNestedValue(context.variables, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });

    const result = logicOperator === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);

    return {
      success: true,
      data: {
        result,
        branch: result ? 'true' : 'false',
      },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute Switch node
   */
  private executeSwitchNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): ExecutionResult {
    const switchValue = values.value;
    const cases = values.cases as Array<{ value: unknown; output: string }>;
    const defaultCase = values.default as string;

    const matchedCase = cases?.find((c) =>
      this.compareValues(switchValue, c.value)
    );

    return {
      success: true,
      data: {
        matched: matchedCase?.output || defaultCase || 'default',
        value: switchValue,
      },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute Loop node
   */
  private async executeLoopNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    const items = values.items as unknown[];
    const maxIterations = (values.maxIterations as number) || 1000;

    if (!Array.isArray(items)) {
      return this.errorResult('Items must be an array', startTime);
    }

    const limitedItems = items.slice(0, maxIterations);

    return {
      success: true,
      data: {
        items: limitedItems,
        total: items.length,
        processed: limitedItems.length,
      },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute Wait node
   */
  private async executeWaitNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    const duration = (values.duration as number) || 1000;
    const maxDuration = 300000; // 5 minutes max

    const actualDuration = Math.min(duration, maxDuration);

    await this.delay(actualDuration);

    return {
      success: true,
      data: { waited: actualDuration },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute Filter node
   */
  private executeFilterNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): ExecutionResult {
    const items = values.items as unknown[];
    const conditions = values.conditions as Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;

    if (!Array.isArray(items)) {
      return this.errorResult('Items must be an array', startTime);
    }

    const filtered = items.filter((item) => {
      if (!conditions || conditions.length === 0) return true;

      return conditions.every((condition) => {
        const fieldValue = this.getNestedValue(
          item as Record<string, unknown>,
          condition.field
        );
        return this.evaluateCondition(fieldValue, condition.operator, condition.value);
      });
    });

    return {
      success: true,
      data: {
        items: filtered,
        originalCount: items.length,
        filteredCount: filtered.length,
      },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute Transform node
   */
  private executeTransformNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): ExecutionResult {
    const input = values.input;
    const mappings = values.mappings as Array<{
      source: string;
      target: string;
      transform?: string;
    }>;

    if (!mappings || mappings.length === 0) {
      return {
        success: true,
        data: input,
        meta: { durationMs: Date.now() - startTime },
      };
    }

    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      let value = this.getNestedValue(
        input as Record<string, unknown>,
        mapping.source
      );

      // Apply transformation if specified
      if (mapping.transform) {
        value = this.applyTransform(value, mapping.transform);
      }

      this.setNestedValue(result, mapping.target, value);
    }

    return {
      success: true,
      data: result,
      meta: { durationMs: Date.now() - startTime },
    };
  }

  /**
   * Execute Aggregate node
   */
  private executeAggregateNode(
    values: Record<string, unknown>,
    context: ExecutionContext,
    startTime: number
  ): ExecutionResult {
    const items = values.items as unknown[];
    const operation = (values.operation as string) || 'count';
    const field = values.field as string;

    if (!Array.isArray(items)) {
      return this.errorResult('Items must be an array', startTime);
    }

    let result: unknown;

    switch (operation) {
      case 'count':
        result = items.length;
        break;

      case 'sum':
        result = items.reduce((sum, item) => {
          const val = field
            ? this.getNestedValue(item as Record<string, unknown>, field)
            : item;
          return sum + (Number(val) || 0);
        }, 0);
        break;

      case 'avg':
        const sumVal = items.reduce((sum, item) => {
          const val = field
            ? this.getNestedValue(item as Record<string, unknown>, field)
            : item;
          return sum + (Number(val) || 0);
        }, 0);
        result = items.length > 0 ? sumVal / items.length : 0;
        break;

      case 'min':
        const minVals = items.map((item) =>
          field
            ? this.getNestedValue(item as Record<string, unknown>, field)
            : item
        );
        result = Math.min(...minVals.map(Number).filter((n) => !isNaN(n)));
        break;

      case 'max':
        const maxVals = items.map((item) =>
          field
            ? this.getNestedValue(item as Record<string, unknown>, field)
            : item
        );
        result = Math.max(...maxVals.map(Number).filter((n) => !isNaN(n)));
        break;

      case 'first':
        result = items[0];
        break;

      case 'last':
        result = items[items.length - 1];
        break;

      case 'concat':
        result = items;
        break;

      default:
        return this.errorResult(`Unknown aggregation: ${operation}`, startTime);
    }

    return {
      success: true,
      data: { result, operation, count: items.length },
      meta: { durationMs: Date.now() - startTime },
    };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Extract provider ID from node type
   */
  private extractProviderId(nodeType: string): string | undefined {
    // Node types are formatted as: provider_resource_operation
    // e.g., hubspot_contact_create, slack_message_send
    const parts = nodeType.split('_');
    if (parts.length >= 2) {
      return parts[0];
    }
    return undefined;
  }

  /**
   * Get HTTP method from node definition or values
   */
  private getHttpMethod(
    nodeDef: NodeDefinition,
    values: Record<string, unknown>
  ): string {
    // Check if method is in values
    if (values.method) {
      return String(values.method).toUpperCase();
    }

    // Infer from operation in node type
    const type = nodeDef.type.toLowerCase();
    if (type.includes('create') || type.includes('send')) return 'POST';
    if (type.includes('update') || type.includes('edit')) return 'PATCH';
    if (type.includes('delete') || type.includes('remove')) return 'DELETE';
    if (type.includes('list') || type.includes('get') || type.includes('search')) return 'GET';

    return 'GET';
  }

  /**
   * Build API endpoint from node configuration
   */
  private buildEndpoint(
    nodeDef: NodeDefinition,
    values: Record<string, unknown>
  ): string {
    // Check for explicit endpoint in values
    if (values.endpoint) {
      return this.replacePathParams(String(values.endpoint), values);
    }

    // Check operation templates
    const opKey = `${nodeDef.category}:${nodeDef.resource || 'default'}:${nodeDef.operation || 'default'}`;
    const template = OPERATION_TEMPLATES[opKey];
    if (template) {
      return this.replacePathParams(template.endpoint, values);
    }

    // Build from resource and operation
    const resource = values.resource || nodeDef.resource;
    const id = values.id;

    if (!resource) {
      return '/';
    }

    let endpoint = `/${resource}`;
    if (id) {
      endpoint += `/${id}`;
    }

    return endpoint;
  }

  /**
   * Replace path parameters in endpoint
   */
  private replacePathParams(
    endpoint: string,
    values: Record<string, unknown>
  ): string {
    return endpoint.replace(/\{(\w+)\}/g, (_, key) => {
      const value = values[key];
      return value !== undefined ? String(value) : `{${key}}`;
    });
  }

  /**
   * Build custom headers from values
   */
  private buildCustomHeaders(values: Record<string, unknown>): Record<string, string> {
    const headers: Record<string, string> = {};

    if (values.headers && typeof values.headers === 'object') {
      for (const [key, value] of Object.entries(values.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }
    }

    return headers;
  }

  /**
   * Build request body from values
   */
  private buildRequestBody(
    nodeDef: NodeDefinition,
    values: Record<string, unknown>
  ): unknown {
    // Check for explicit body
    if (values.body !== undefined) {
      return values.body;
    }

    // Build body from field definitions
    const body: Record<string, unknown> = {};

    for (const field of nodeDef.fields || []) {
      if (field.id === 'body' || field.id === 'headers' || field.id === 'endpoint') {
        continue; // Skip meta fields
      }

      const value = values[field.id];
      if (value !== undefined) {
        body[field.id] = value;
      }
    }

    return Object.keys(body).length > 0 ? body : undefined;
  }

  /**
   * Extract URL template parameters
   */
  private extractUrlParams(values: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};

    // Common URL template parameters
    const urlParamKeys = ['instance', 'domain', 'dc', 'region', 'bucket'];

    for (const key of urlParamKeys) {
      if (values[key]) {
        params[key] = String(values[key]);
      }
    }

    return params;
  }

  /**
   * Resolve expressions in values
   */
  private async resolveExpressions(
    values: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string' && value.includes('{{')) {
        resolved[key] = this.resolveExpression(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = await this.resolveExpressions(
          value as Record<string, unknown>,
          context
        );
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolve a single expression
   */
  private resolveExpression(expression: string, context: ExecutionContext): string {
    return expression.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
      const trimmed = expr.trim();

      // $variables.name
      if (trimmed.startsWith('$variables.')) {
        const path = trimmed.substring('$variables.'.length);
        const value = this.getNestedValue(context.variables, path);
        return value !== undefined ? String(value) : '';
      }

      // $outputs.nodeId.field
      if (trimmed.startsWith('$outputs.')) {
        const path = trimmed.substring('$outputs.'.length);
        const [nodeId, ...rest] = path.split('.');
        const nodeOutput = context.nodeOutputs.get(nodeId);
        if (nodeOutput && rest.length > 0) {
          const value = this.getNestedValue(
            nodeOutput as Record<string, unknown>,
            rest.join('.')
          );
          return value !== undefined ? String(value) : '';
        }
        return nodeOutput !== undefined ? String(nodeOutput) : '';
      }

      // $env.VAR_NAME
      if (trimmed.startsWith('$env.')) {
        const envVar = trimmed.substring('$env.'.length);
        return process.env[envVar] || '';
      }

      return `{{${expr}}}`;
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    compareValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
      case '==':
        return fieldValue == compareValue;
      case 'strictEquals':
      case '===':
        return fieldValue === compareValue;
      case 'notEquals':
      case '!=':
        return fieldValue != compareValue;
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      case 'notContains':
        return !String(fieldValue).includes(String(compareValue));
      case 'startsWith':
        return String(fieldValue).startsWith(String(compareValue));
      case 'endsWith':
        return String(fieldValue).endsWith(String(compareValue));
      case 'greaterThan':
      case '>':
        return Number(fieldValue) > Number(compareValue);
      case 'lessThan':
      case '<':
        return Number(fieldValue) < Number(compareValue);
      case 'greaterThanOrEquals':
      case '>=':
        return Number(fieldValue) >= Number(compareValue);
      case 'lessThanOrEquals':
      case '<=':
        return Number(fieldValue) <= Number(compareValue);
      case 'isEmpty':
        return fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty':
        return !(
          fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        );
      case 'regex':
        try {
          const regex = new RegExp(String(compareValue));
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Compare two values
   */
  private compareValues(a: unknown, b: unknown): boolean {
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return a === b;
  }

  /**
   * Apply transformation to value
   */
  private applyTransform(value: unknown, transform: string): unknown {
    switch (transform) {
      case 'toString':
        return String(value);
      case 'toNumber':
        return Number(value);
      case 'toBoolean':
        return Boolean(value);
      case 'toUpperCase':
        return String(value).toUpperCase();
      case 'toLowerCase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'parseJson':
        try {
          return JSON.parse(String(value));
        } catch {
          return value;
        }
      case 'stringify':
        return JSON.stringify(value);
      default:
        return value;
    }
  }

  /**
   * Extract error message from response
   */
  private extractErrorMessage(
    responseBody: unknown,
    providerConfig: ProviderConfig,
    statusCode: number
  ): string {
    // Try provider-specific error path
    if (providerConfig.errorPath && typeof responseBody === 'object' && responseBody) {
      const error = this.getNestedValue(
        responseBody as Record<string, unknown>,
        providerConfig.errorPath
      );
      if (error) return String(error);
    }

    // Try common error paths
    const commonPaths = ['error', 'message', 'error.message', 'errors[0].message'];
    for (const path of commonPaths) {
      if (typeof responseBody === 'object' && responseBody) {
        const error = this.getNestedValue(
          responseBody as Record<string, unknown>,
          path
        );
        if (error) return String(error);
      }
    }

    // Default message based on status code
    const statusMessages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Rate Limited',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return statusMessages[statusCode] || `Request failed with status ${statusCode}`;
  }

  /**
   * Extract data from response using provider's data path
   */
  private extractData(
    responseBody: unknown,
    providerConfig: ProviderConfig
  ): unknown {
    if (!providerConfig.dataPath || typeof responseBody !== 'object') {
      return responseBody;
    }

    const data = this.getNestedValue(
      responseBody as Record<string, unknown>,
      providerConfig.dataPath
    );

    return data !== undefined ? data : responseBody;
  }

  /**
   * Extract rate limit info from response headers
   */
  private extractRateLimit(
    headers: Headers,
    providerConfig: ProviderConfig
  ): { remaining: number; resetAt?: Date } | undefined {
    const remaining = headers.get('x-ratelimit-remaining') ||
      headers.get('ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset') ||
      headers.get('ratelimit-reset') ||
      (providerConfig.rateLimit?.retryAfterHeader
        ? headers.get(providerConfig.rateLimit.retryAfterHeader)
        : null);

    if (!remaining) return undefined;

    const result: { remaining: number; resetAt?: Date } = {
      remaining: Number(remaining),
    };

    if (reset) {
      // Handle Unix timestamp or seconds
      const resetVal = Number(reset);
      if (resetVal > 1e10) {
        // Unix timestamp in milliseconds
        result.resetAt = new Date(resetVal);
      } else if (resetVal > 1e9) {
        // Unix timestamp in seconds
        result.resetAt = new Date(resetVal * 1000);
      } else {
        // Seconds from now
        result.resetAt = new Date(Date.now() + resetVal * 1000);
      }
    }

    return result;
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key'];
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(statusCode?: number): boolean {
    if (!statusCode) return true;
    return statusCode >= 500 || statusCode === 429;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create error result
   */
  private errorResult(
    message: string,
    startTime: number,
    error?: unknown
  ): ExecutionResult {
    return {
      success: false,
      error: {
        message,
        details: error instanceof Error ? error.stack : error,
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let executorInstance: GenericProviderExecutor | null = null;

export function getGenericProviderExecutor(): GenericProviderExecutor {
  if (!executorInstance) {
    executorInstance = new GenericProviderExecutor();
  }
  return executorInstance;
}

export default GenericProviderExecutor;
