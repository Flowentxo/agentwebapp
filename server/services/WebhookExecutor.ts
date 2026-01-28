/**
 * WEBHOOK EXECUTOR
 *
 * Executes webhooks with retry logic, authentication, and response validation
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getDb } from '@/lib/db';
import { webhooks, credentials, toolExecutionLogs } from '@/lib/db/schema-custom-tools';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

// ============================================================
// TYPES
// ============================================================

interface WebhookConfig {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  payloadTemplate: string | null;
  payloadType: 'json' | 'form' | 'xml' | 'text';
  authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';
  credentialId: string | null;
  retryEnabled: boolean;
  retryConfig: {
    maxRetries: number;
    backoff: 'exponential' | 'linear' | 'fixed';
    initialDelay: number;
  };
  timeout: number;
  expectedStatus: number[];
  responseSchema: any | null;
}

interface WebhookCredential {
  type: string;
  encryptedData: string;
}

interface ExecutionResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  durationMs: number;
  retryCount?: number;
}

// ============================================================
// WEBHOOK EXECUTOR
// ============================================================

export class WebhookExecutor {
  /**
   * Execute a webhook
   */
  static async execute(
    webhookId: string,
    parameters: Record<string, any>,
    userId?: string,
    workspaceId?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Load webhook configuration
      const webhookConfig = await this.loadWebhookConfig(webhookId);
      if (!webhookConfig) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      // Execute with retry logic
      const result = await this.executeWithRetry(webhookConfig, parameters);

      const durationMs = Date.now() - startTime;

      // Log execution
      await this.logExecution({
        webhookId,
        userId,
        workspaceId,
        input: parameters,
        output: result.data,
        status: 'success',
        statusCode: result.statusCode,
        durationMs,
        retryCount: result.retryCount || 0,
      });

      return {
        ...result,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      logger.error(`[WebhookExecutor] Webhook execution failed:`, error);

      // Log error
      await this.logExecution({
        webhookId,
        userId,
        workspaceId,
        input: parameters,
        status: 'error',
        errorMessage: error.message,
        errorStack: error.stack,
        durationMs,
      });

      return {
        success: false,
        error: error.message,
        durationMs,
      };
    }
  }

  /**
   * Execute webhook with retry logic
   */
  private static async executeWithRetry(
    config: WebhookConfig,
    parameters: Record<string, any>
  ): Promise<ExecutionResult> {
    let lastError: Error | null = null;
    let retryCount = 0;
    const maxRetries = config.retryEnabled ? config.retryConfig.maxRetries : 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Calculate delay for retry (exponential backoff)
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(
            attempt,
            config.retryConfig.backoff,
            config.retryConfig.initialDelay
          );
          logger.info(`[WebhookExecutor] Retrying after ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await this.sleep(delay);
        }

        // Execute HTTP request
        const result = await this.executeHttpRequest(config, parameters);

        // Update success count
        await this.updateStats(config.id, true);

        return {
          success: true,
          statusCode: result.statusCode,
          data: result.data,
          durationMs: result.durationMs,
          retryCount,
        };
      } catch (error: any) {
        lastError = error;
        retryCount = attempt;

        // Don't retry on non-retryable errors (4xx client errors except 429)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          if (error.response.status !== 429) {
            // 429 = Too Many Requests (retryable)
            break;
          }
        }

        logger.warn(`[WebhookExecutor] Attempt ${attempt + 1} failed:`, error.message);
      }
    }

    // All retries exhausted
    await this.updateStats(config.id, false);

    throw new Error(
      `Webhook execution failed after ${retryCount + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Execute HTTP request
   */
  private static async executeHttpRequest(
    config: WebhookConfig,
    parameters: Record<string, any>
  ): Promise<{ statusCode: number; data: any; durationMs: number }> {
    const startTime = Date.now();

    // Build request configuration
    const requestConfig: AxiosRequestConfig = {
      method: config.method,
      url: config.url,
      headers: { ...config.headers },
      timeout: config.timeout,
    };

    // Add authentication
    if (config.authType !== 'none' && config.credentialId) {
      await this.applyAuthentication(requestConfig, config.authType, config.credentialId);
    }

    // Add payload (for POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(config.method)) {
      requestConfig.data = this.buildPayload(config, parameters);

      // Set content type based on payload type
      if (!requestConfig.headers!['Content-Type']) {
        switch (config.payloadType) {
          case 'json':
            requestConfig.headers!['Content-Type'] = 'application/json';
            break;
          case 'form':
            requestConfig.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
            break;
          case 'xml':
            requestConfig.headers!['Content-Type'] = 'application/xml';
            break;
          case 'text':
            requestConfig.headers!['Content-Type'] = 'text/plain';
            break;
        }
      }
    }

    // Execute request
    const response: AxiosResponse = await axios(requestConfig);

    const durationMs = Date.now() - startTime;

    // Validate response status
    if (!config.expectedStatus.includes(response.status)) {
      throw new Error(
        `Unexpected status code: ${response.status} (expected: ${config.expectedStatus.join(', ')})`
      );
    }

    // Validate response schema (if provided)
    if (config.responseSchema) {
      this.validateResponseSchema(response.data, config.responseSchema);
    }

    return {
      statusCode: response.status,
      data: response.data,
      durationMs,
    };
  }

  /**
   * Build payload from template and parameters
   */
  private static buildPayload(
    config: WebhookConfig,
    parameters: Record<string, any>
  ): any {
    if (!config.payloadTemplate) {
      return parameters;
    }

    // Interpolate variables in template
    let payload = config.payloadTemplate;

    // Replace {{variableName}} with actual values
    for (const [key, value] of Object.entries(parameters)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      payload = payload.replace(regex, String(value));
    }

    // Parse payload based on type
    switch (config.payloadType) {
      case 'json':
        try {
          return JSON.parse(payload);
        } catch {
          return payload;
        }

      case 'form':
        // Convert to URLSearchParams
        try {
          const parsed = JSON.parse(payload);
          return new URLSearchParams(parsed).toString();
        } catch {
          return payload;
        }

      case 'xml':
      case 'text':
      default:
        return payload;
    }
  }

  /**
   * Apply authentication to request
   */
  private static async applyAuthentication(
    requestConfig: AxiosRequestConfig,
    authType: string,
    credentialId: string
  ): Promise<void> {
    const credential = await this.loadCredential(credentialId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Decrypt credential data
    const credentialData = this.decryptCredential(credential.encryptedData);

    switch (authType) {
      case 'bearer':
        requestConfig.headers!['Authorization'] = `Bearer ${credentialData.token}`;
        break;

      case 'basic':
        const basicAuth = Buffer.from(`${credentialData.username}:${credentialData.password}`).toString('base64');
        requestConfig.headers!['Authorization'] = `Basic ${basicAuth}`;
        break;

      case 'api_key':
        // API key can be in header or query param
        if (credentialData.location === 'header') {
          requestConfig.headers![credentialData.headerName || 'X-API-Key'] = credentialData.apiKey;
        } else {
          requestConfig.params = {
            ...requestConfig.params,
            [credentialData.paramName || 'api_key']: credentialData.apiKey,
          };
        }
        break;

      case 'oauth2':
        requestConfig.headers!['Authorization'] = `Bearer ${credentialData.accessToken}`;
        break;

      default:
        logger.warn(`[WebhookExecutor] Unsupported auth type: ${authType}`);
    }
  }

  /**
   * Validate response against JSON schema
   */
  private static validateResponseSchema(data: any, schema: any): void {
    // TODO: Implement JSON Schema validation (use ajv library)
    // For now, just log a placeholder
    logger.info(`[WebhookExecutor] Response schema validation not yet implemented`);
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private static calculateRetryDelay(
    attempt: number,
    backoff: 'exponential' | 'linear' | 'fixed',
    initialDelay: number
  ): number {
    switch (backoff) {
      case 'exponential':
        return initialDelay * Math.pow(2, attempt - 1);

      case 'linear':
        return initialDelay * attempt;

      case 'fixed':
      default:
        return initialDelay;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Load webhook configuration from database
   */
  private static async loadWebhookConfig(webhookId: string): Promise<WebhookConfig | null> {
    const db = getDb();

    const [webhookRecord] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId))
      .limit(1);

    if (!webhookRecord) {
      return null;
    }

    return {
      id: webhookRecord.id,
      url: webhookRecord.url,
      method: webhookRecord.method as WebhookConfig['method'],
      headers: webhookRecord.headers as Record<string, string>,
      payloadTemplate: webhookRecord.payloadTemplate,
      payloadType: webhookRecord.payloadType as WebhookConfig['payloadType'],
      authType: (webhookRecord.authType || 'none') as WebhookConfig['authType'],
      credentialId: webhookRecord.credentialId || null,
      retryEnabled: webhookRecord.retryEnabled,
      retryConfig: webhookRecord.retryConfig as WebhookConfig['retryConfig'],
      timeout: webhookRecord.timeout,
      expectedStatus: webhookRecord.expectedStatus as number[],
      responseSchema: webhookRecord.responseSchema,
    };
  }

  /**
   * Load credential from database
   */
  private static async loadCredential(credentialId: string): Promise<WebhookCredential | null> {
    const db = getDb();

    const [credentialRecord] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credentialId))
      .limit(1);

    if (!credentialRecord) {
      return null;
    }

    return {
      type: credentialRecord.type,
      encryptedData: credentialRecord.encryptedData,
    };
  }

  /**
   * Decrypt credential data
   */
  private static decryptCredential(encrypted: string): any {
    // TODO: Implement proper encryption/decryption with crypto module
    // For now, assume it's stored as base64-encoded JSON
    try {
      const decrypted = Buffer.from(encrypted, 'base64').toString('utf-8');
      return JSON.parse(decrypted);
    } catch {
      // If not base64, assume it's plain JSON (for development)
      try {
        return JSON.parse(encrypted);
      } catch {
        return { token: encrypted }; // Fallback: assume it's a plain token
      }
    }
  }

  /**
   * Update webhook statistics
   */
  private static async updateStats(webhookId: string, success: boolean): Promise<void> {
    try {
      const db = getDb();

      const updates: any = {
        callCount: (webhooks.callCount as any) + 1,
        lastCalledAt: new Date(),
      };

      if (success) {
        updates.successCount = (webhooks.successCount as any) + 1;
      } else {
        updates.errorCount = (webhooks.errorCount as any) + 1;
      }

      await db.update(webhooks).set(updates).where(eq(webhooks.id, webhookId));
    } catch (error) {
      logger.error(`[WebhookExecutor] Failed to update stats:`, error);
    }
  }

  /**
   * Log webhook execution
   */
  private static async logExecution(logData: {
    webhookId: string;
    userId?: string;
    workspaceId?: string;
    input: any;
    output?: any;
    status: 'success' | 'error';
    statusCode?: number;
    errorMessage?: string;
    errorStack?: string;
    durationMs: number;
    retryCount?: number;
  }): Promise<void> {
    try {
      const db = getDb();

      await db.insert(toolExecutionLogs).values({
        toolId: logData.webhookId,
        workspaceId: logData.workspaceId || null,
        executedBy: logData.userId || null,
        executionType: 'webhook',
        input: logData.input,
        output: logData.output || null,
        status: logData.status,
        errorMessage: logData.errorMessage || null,
        errorStack: logData.errorStack || null,
        durationMs: logData.durationMs,
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } catch (error) {
      logger.error(`[WebhookExecutor] Failed to log execution:`, error);
    }
  }
}

export default WebhookExecutor;
