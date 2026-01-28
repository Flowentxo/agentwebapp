/**
 * AuthenticatedTool - Base Class
 * Phase 12: Tool Execution Layer
 *
 * Abstract base class for tools that require OAuth authentication
 * Automatically handles token retrieval and decryption from IntegrationService
 */

import {
  ITool,
  ToolContext,
  ToolResult,
  ToolParameter,
  ToolCategory,
} from '@/lib/tools/interfaces';
import { integrationService } from '@/server/services/integrations/IntegrationService';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AuthenticatedTool');

// ============================================================================
// AUTHENTICATED TOOL BASE CLASS
// ============================================================================

export abstract class AuthenticatedTool<TInput = unknown, TOutput = unknown>
  implements ITool<TInput, TOutput>
{
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract category: ToolCategory;
  abstract provider: string;
  abstract icon: string;
  abstract parameters: ToolParameter[];
  abstract requiredScopes?: string[];

  /**
   * Get decrypted access token for the provider
   */
  protected async getAccessToken(
    userId: string,
    workspaceId: string
  ): Promise<string> {
    try {
      // Get connection for this provider
      const connection = await integrationService.getConnectionByProvider(
        workspaceId,
        this.provider
      );

      if (!connection) {
        throw new Error(
          `No ${this.provider} connection found. Please connect your account first.`
        );
      }

      if (connection.status === 'error') {
        throw new Error(
          `${this.provider} connection is in error state. Please reconnect.`
        );
      }

      if (connection.status === 'expired') {
        throw new Error(
          `${this.provider} token has expired. Please reconnect.`
        );
      }

      // Get valid (possibly refreshed) token
      const token = await integrationService.getValidToken(connection.id);

      logger.debug(`[${this.id}] Retrieved token for ${this.provider}`);
      return token;
    } catch (error: any) {
      logger.error(`[${this.id}] Failed to get token:`, error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Validate input parameters
   */
  protected validateInput(input: TInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const inputObj = input as Record<string, unknown>;

    for (const param of this.parameters) {
      const value = inputObj[param.name];

      // Check required
      if (param.required && (value === undefined || value === null || value === '')) {
        errors.push(`${param.label} is required`);
        continue;
      }

      // Skip validation if not required and empty
      if (value === undefined || value === null) continue;

      // Type validation
      if (param.type === 'email' && typeof value === 'string') {
        if (!this.isValidEmail(value)) {
          errors.push(`${param.label} must be a valid email address`);
        }
      }

      if (param.type === 'url' && typeof value === 'string') {
        if (!this.isValidUrl(value)) {
          errors.push(`${param.label} must be a valid URL`);
        }
      }

      // Pattern validation
      if (param.pattern && typeof value === 'string') {
        const regex = new RegExp(param.pattern);
        if (!regex.test(value)) {
          errors.push(`${param.label} has invalid format`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * URL validation helper
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make authenticated API request
   */
  protected async apiRequest<T>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      headers?: Record<string, string>;
      accessToken: string;
    }
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, accessToken } = options;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.retryable = response.status >= 500 || response.status === 429;
      throw error;
    }

    return response.json();
  }

  /**
   * Create success result
   */
  protected success(data: TOutput, metadata?: ToolResult['metadata']): ToolResult<TOutput> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Create error result
   */
  protected error(
    message: string,
    errorCode?: string,
    data?: Partial<TOutput>
  ): ToolResult<TOutput> {
    return {
      success: false,
      data: (data || null) as TOutput,
      error: message,
      errorCode,
    };
  }

  /**
   * Execute the tool - must be implemented by subclasses
   */
  abstract execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;
}

// ============================================================================
// MOCK AUTHENTICATED TOOL (for testing)
// ============================================================================

export abstract class MockAuthenticatedTool<
  TInput = unknown,
  TOutput = unknown
> extends AuthenticatedTool<TInput, TOutput> {
  /**
   * Override to return mock token
   */
  protected async getAccessToken(
    userId: string,
    workspaceId: string
  ): Promise<string> {
    logger.debug(`[${this.id}] Using mock token for testing`);
    return `mock_${this.provider}_token_${userId}`;
  }
}
