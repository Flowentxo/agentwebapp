/**
 * Base Integration Service
 * Abstract class providing common functionality for all integration services
 */

import { getValidAccessToken, IntegrationRecord } from '../providers/integration-repository';
import { getProviderConfig, ProviderConfig } from '../providers/provider-config';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export abstract class BaseIntegrationService {
  protected provider: string;
  protected baseUrl: string;
  protected config: ProviderConfig | null;

  constructor(provider: string, baseUrl?: string) {
    this.provider = provider;
    this.config = getProviderConfig(provider);
    // Use provided baseUrl or config baseApiUrl or empty string
    this.baseUrl = baseUrl || this.config?.baseApiUrl || '';
  }

  /**
   * Get default headers for requests (override per provider)
   */
  protected getDefaultHeaders(): Record<string, string> {
    return {};
  }

  /**
   * Get valid access token for user
   */
  protected async getAccessToken(
    userId: string,
    service: string = 'default'
  ): Promise<{ token: string; integration: IntegrationRecord }> {
    const result = await getValidAccessToken(userId, this.provider, service);
    if (!result) {
      throw new Error(`No valid connection found for ${this.provider}`);
    }
    return { token: result.accessToken, integration: result.integration };
  }

  /**
   * Make authenticated API request
   */
  protected async request<T>(
    userId: string,
    endpoint: string,
    options: ApiRequestOptions = {},
    overrideBaseUrl?: string
  ): Promise<T> {
    const { token, integration } = await this.getAccessToken(userId);

    const url = this.buildUrl(endpoint, options.params, integration, overrideBaseUrl);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...this.getDefaultHeaders(),
      ...options.headers,
    };

    // Handle body - check if it's already a string (like URLSearchParams)
    let body: string | undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        body = options.body;
        // Only set Content-Type if not already set
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else {
        body = JSON.stringify(options.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${this.provider.toUpperCase()}] API Error:`, response.status, errorText);
      throw new ApiError(
        `API request failed: ${response.status}`,
        response.status,
        errorText,
        this.provider
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Build full URL with query parameters
   */
  protected buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    integration?: IntegrationRecord,
    overrideBaseUrl?: string
  ): string {
    // Priority: overrideBaseUrl > integration metadata > this.baseUrl > config
    let baseUrl = overrideBaseUrl || this.baseUrl;

    if (!overrideBaseUrl && integration?.metadata?.instanceUrl) {
      baseUrl = integration.metadata.instanceUrl as string;
    }

    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/') && !endpoint.startsWith('http')) {
      endpoint = '/' + endpoint;
    }

    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const urlObj = new URL(url);

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          urlObj.searchParams.set(key, String(value));
        }
      });
    }

    return urlObj.toString();
  }

  /**
   * Paginated request helper
   */
  protected async paginatedRequest<T>(
    userId: string,
    endpoint: string,
    options: ApiRequestOptions = {},
    pageSize: number = 100,
    maxPages: number = 10,
    service: string = 'default'
  ): Promise<T[]> {
    const allItems: T[] = [];
    let cursor: string | undefined;
    let page = 0;

    while (page < maxPages) {
      const params = {
        ...options.params,
        limit: pageSize,
        ...(cursor ? this.getCursorParam(cursor) : {}),
      };

      const response = await this.request<unknown>(
        userId,
        endpoint,
        { ...options, params },
        service
      );

      const { items, nextCursor, hasMore } = this.parsePaginatedResponse<T>(response.data);
      allItems.push(...items);

      if (!hasMore || !nextCursor) break;

      cursor = nextCursor;
      page++;
    }

    return allItems;
  }

  /**
   * Get cursor parameter name (override per provider)
   */
  protected getCursorParam(cursor: string): Record<string, string> {
    return { cursor };
  }

  /**
   * Parse paginated response (override per provider)
   */
  protected abstract parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T>;

  /**
   * Test connection to provider
   */
  abstract testConnection(userId: string, service?: string): Promise<boolean>;
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
    public provider: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}
