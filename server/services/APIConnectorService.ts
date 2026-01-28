/**
 * API CONNECTOR SERVICE
 *
 * Dynamic REST/GraphQL/SOAP API integration with authentication, retry, and rate limiting
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { getDb } from '@/lib/db/connection';
import {
  apiConnectors,
  apiEndpoints,
  credentials,
} from '@/lib/db/schema-custom-tools';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface APIConnector {
  id: string;
  workspaceId?: string;
  createdBy?: string;
  name: string;
  displayName: string;
  description?: string;
  baseUrl: string;
  apiType: 'rest' | 'graphql' | 'soap' | 'grpc';
  authType: 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer';
  credentialId?: string;
  defaultHeaders: Record<string, string>;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
  };
  rateLimitConfig?: {
    maxRequests: number;
    windowMs: number;
  };
  isActive: boolean;
  requestCount: number;
  lastRequestAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIEndpoint {
  id: string;
  connectorId: string;
  name: string;
  displayName: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  pathParams: ParameterDefinition[];
  queryParams: ParameterDefinition[];
  headers: ParameterDefinition[];
  bodySchema?: any;
  responseSchema?: any;
  successCodes: number[];
  timeout?: number;
  callCount: number;
  lastCalledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  default?: any;
}

export interface Credential {
  id: string;
  workspaceId?: string;
  name: string;
  type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
  encryptedData: string;
  tokenUrl?: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: Date;
  scopes: string[];
  isActive: boolean;
  lastValidated?: Date;
}

export interface APICallInput {
  endpointId: string;
  pathParams?: Record<string, any>;
  queryParams?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
}

export interface APICallResult {
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
  durationMs: number;
  retryCount: number;
}

// ============================================================
// ENCRYPTION UTILITIES
// ============================================================

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

function encryptCredential(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptCredential(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================
// RATE LIMITER
// ============================================================

class RateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // Reset window
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (record.count < maxRequests) {
      record.count++;
      return true;
    }

    return false;
  }

  getWaitTime(key: string): number {
    const record = this.requestCounts.get(key);
    if (!record) return 0;

    const now = Date.now();
    return Math.max(0, record.resetTime - now);
  }
}

// ============================================================
// API CONNECTOR SERVICE
// ============================================================

export class APIConnectorService {
  private axiosInstances: Map<string, AxiosInstance> = new Map();
  private rateLimiter = new RateLimiter();

  constructor() {
    console.log('[API_CONNECTOR] Initializing API Connector Service...');
  }

  // ========================================================
  // CONNECTOR MANAGEMENT
  // ========================================================

  /**
   * Register a new API connector
   */
  async registerConnector(options: {
    workspaceId?: string;
    createdBy?: string;
    name: string;
    displayName: string;
    description?: string;
    baseUrl: string;
    apiType?: 'rest' | 'graphql' | 'soap' | 'grpc';
    authType?: 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer';
    credentialId?: string;
    defaultHeaders?: Record<string, string>;
    timeout?: number;
    retryConfig?: { maxRetries: number; backoff: 'linear' | 'exponential' };
    rateLimitConfig?: { maxRequests: number; windowMs: number };
  }): Promise<APIConnector> {
    const db = getDb();

    console.log(`[API_CONNECTOR] Registering connector: ${options.name}`);

    // Validate base URL
    try {
      new URL(options.baseUrl);
    } catch (error) {
      throw new Error(`Invalid base URL: ${options.baseUrl}`);
    }

    // Insert connector
    const [connector] = await db
      .insert(apiConnectors)
      .values({
        workspaceId: options.workspaceId || null,
        createdBy: options.createdBy || null,
        name: options.name,
        displayName: options.displayName,
        description: options.description || null,
        baseUrl: options.baseUrl,
        apiType: options.apiType || 'rest',
        authType: options.authType || 'none',
        credentialId: options.credentialId || null,
        defaultHeaders: options.defaultHeaders || {},
        timeout: options.timeout || 30000,
        retryConfig: options.retryConfig || { maxRetries: 3, backoff: 'exponential' },
        rateLimitConfig: options.rateLimitConfig || null,
        isActive: true,
        requestCount: 0,
      })
      .returning();

    console.log(`[API_CONNECTOR] ✅ Connector registered: ${connector.id}`);

    return connector as APIConnector;
  }

  /**
   * Register an endpoint for a connector
   */
  async registerEndpoint(options: {
    connectorId: string;
    name: string;
    displayName: string;
    description?: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    pathParams?: ParameterDefinition[];
    queryParams?: ParameterDefinition[];
    headers?: ParameterDefinition[];
    bodySchema?: any;
    responseSchema?: any;
    successCodes?: number[];
    timeout?: number;
  }): Promise<APIEndpoint> {
    const db = getDb();

    console.log(`[API_CONNECTOR] Registering endpoint: ${options.name}`);

    const [endpoint] = await db
      .insert(apiEndpoints)
      .values({
        connectorId: options.connectorId,
        name: options.name,
        displayName: options.displayName,
        description: options.description || null,
        method: options.method,
        path: options.path,
        pathParams: (options.pathParams || []) as any,
        queryParams: (options.queryParams || []) as any,
        headers: (options.headers || []) as any,
        bodySchema: options.bodySchema || null,
        responseSchema: options.responseSchema || null,
        successCodes: options.successCodes || [200, 201],
        timeout: options.timeout || null,
        callCount: 0,
      })
      .returning();

    console.log(`[API_CONNECTOR] ✅ Endpoint registered: ${endpoint.id}`);

    return endpoint as APIEndpoint;
  }

  /**
   * Store encrypted credentials
   */
  async storeCredential(options: {
    workspaceId?: string;
    createdBy?: string;
    name: string;
    description?: string;
    type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
    data: Record<string, any>;
    tokenUrl?: string;
    scopes?: string[];
  }): Promise<Credential> {
    const db = getDb();

    console.log(`[API_CONNECTOR] Storing credential: ${options.name}`);

    // Encrypt the credential data
    const encryptedData = encryptCredential(JSON.stringify(options.data));

    const [credential] = await db
      .insert(credentials)
      .values({
        workspaceId: options.workspaceId || null,
        createdBy: options.createdBy || null,
        name: options.name,
        description: options.description || null,
        type: options.type,
        encryptedData,
        tokenUrl: options.tokenUrl || null,
        refreshToken: null,
        accessToken: null,
        expiresAt: null,
        scopes: options.scopes || [],
        isActive: true,
      })
      .returning();

    console.log(`[API_CONNECTOR] ✅ Credential stored: ${credential.id}`);

    return credential as Credential;
  }

  /**
   * Get credential and decrypt
   */
  async getCredential(credentialId: string): Promise<Record<string, any> | null> {
    const db = getDb();

    const [credential] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credentialId))
      .limit(1);

    if (!credential) {
      return null;
    }

    try {
      const decryptedData = decryptCredential(credential.encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error(`[API_CONNECTOR] Failed to decrypt credential: ${credentialId}`);
      return null;
    }
  }

  // ========================================================
  // API EXECUTION
  // ========================================================

  /**
   * Call an API endpoint
   */
  async callEndpoint(input: APICallInput): Promise<APICallResult> {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // Get endpoint
      const endpoint = await this.getEndpoint(input.endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${input.endpointId}`);
      }

      // Get connector
      const connector = await this.getConnector(endpoint.connectorId);
      if (!connector || !connector.isActive) {
        throw new Error(`Connector not found or inactive: ${endpoint.connectorId}`);
      }

      // Check rate limiting
      if (connector.rateLimitConfig) {
        const { maxRequests, windowMs } = connector.rateLimitConfig;
        if (!this.rateLimiter.isAllowed(connector.id, maxRequests, windowMs)) {
          const waitTime = this.rateLimiter.getWaitTime(connector.id);
          throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)}s`);
        }
      }

      // Build request
      const axiosConfig = await this.buildRequest(connector, endpoint, input);

      // Execute with retry
      const response = await this.executeWithRetry(
        axiosConfig,
        connector.retryConfig.maxRetries,
        connector.retryConfig.backoff
      );

      retryCount = response.retryCount;

      // Validate response
      if (!endpoint.successCodes.includes(response.status)) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      // Update usage stats
      await this.updateEndpointUsage(endpoint.id);
      await this.updateConnectorUsage(connector.id);

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
        durationMs,
        retryCount,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        durationMs,
        retryCount,
      };
    }
  }

  /**
   * Build Axios request config
   */
  private async buildRequest(
    connector: APIConnector,
    endpoint: APIEndpoint,
    input: APICallInput
  ): Promise<AxiosRequestConfig> {
    // Build URL with path params
    let url = `${connector.baseUrl}${endpoint.path}`;

    if (input.pathParams) {
      for (const [key, value] of Object.entries(input.pathParams)) {
        url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      ...connector.defaultHeaders,
      ...input.headers,
    };

    // Add authentication
    if (connector.authType !== 'none' && connector.credentialId) {
      const credData = await this.getCredential(connector.credentialId);

      if (credData) {
        switch (connector.authType) {
          case 'api_key':
            if (credData.header && credData.value) {
              headers[credData.header] = credData.value;
            }
            break;
          case 'bearer':
            if (credData.token) {
              headers['Authorization'] = `Bearer ${credData.token}`;
            }
            break;
          case 'basic':
            if (credData.username && credData.password) {
              const encoded = Buffer.from(`${credData.username}:${credData.password}`).toString('base64');
              headers['Authorization'] = `Basic ${encoded}`;
            }
            break;
          case 'oauth2':
            // OAuth2 would need token refresh logic
            if (credData.access_token) {
              headers['Authorization'] = `Bearer ${credData.access_token}`;
            }
            break;
        }
      }
    }

    // Build config
    const config: AxiosRequestConfig = {
      method: endpoint.method as Method,
      url,
      headers,
      params: input.queryParams,
      timeout: endpoint.timeout || connector.timeout,
    };

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && input.body) {
      config.data = input.body;
    }

    return config;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    config: AxiosRequestConfig,
    maxRetries: number,
    backoff: 'linear' | 'exponential'
  ): Promise<AxiosResponse & { retryCount: number }> {
    let lastError: any;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios(config);
        return { ...response, retryCount };
      } catch (error: any) {
        lastError = error;
        retryCount++;

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Don't retry if max attempts reached
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay
        const delay = backoff === 'exponential'
          ? Math.pow(2, attempt) * 1000
          : (attempt + 1) * 1000;

        console.log(`[API_CONNECTOR] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ========================================================
  // HELPER METHODS
  // ========================================================

  private async getConnector(connectorId: string): Promise<APIConnector | null> {
    const db = getDb();

    const [connector] = await db
      .select()
      .from(apiConnectors)
      .where(eq(apiConnectors.id, connectorId))
      .limit(1);

    return connector ? (connector as APIConnector) : null;
  }

  private async getEndpoint(endpointId: string): Promise<APIEndpoint | null> {
    const db = getDb();

    const [endpoint] = await db
      .select()
      .from(apiEndpoints)
      .where(eq(apiEndpoints.id, endpointId))
      .limit(1);

    return endpoint ? (endpoint as APIEndpoint) : null;
  }

  private async updateConnectorUsage(connectorId: string): Promise<void> {
    const db = getDb();

    await db
      .update(apiConnectors)
      .set({
        requestCount: (apiConnectors.requestCount as any) + 1,
        lastRequestAt: new Date(),
      })
      .where(eq(apiConnectors.id, connectorId));
  }

  private async updateEndpointUsage(endpointId: string): Promise<void> {
    const db = getDb();

    await db
      .update(apiEndpoints)
      .set({
        callCount: (apiEndpoints.callCount as any) + 1,
        lastCalledAt: new Date(),
      })
      .where(eq(apiEndpoints.id, endpointId));
  }

  /**
   * List all connectors for a workspace
   */
  async listConnectors(workspaceId?: string): Promise<APIConnector[]> {
    const db = getDb();

    let query = db.select().from(apiConnectors);

    if (workspaceId) {
      query = query.where(eq(apiConnectors.workspaceId, workspaceId)) as any;
    }

    const connectors = await query;
    return connectors as APIConnector[];
  }

  /**
   * List endpoints for a connector
   */
  async listEndpoints(connectorId: string): Promise<APIEndpoint[]> {
    const db = getDb();

    const endpoints = await db
      .select()
      .from(apiEndpoints)
      .where(eq(apiEndpoints.connectorId, connectorId));

    return endpoints as APIEndpoint[];
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const apiConnectorService = new APIConnectorService();
