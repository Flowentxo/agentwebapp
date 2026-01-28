/**
 * RateLimitService - Enterprise Rate Limiting System
 *
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Sliding window for burst protection
 * - Per-user, per-agent, and global limits
 * - Redis-backed for distributed systems
 * - Graceful degradation without Redis
 * - Request queuing with priority
 * - Automatic retry with exponential backoff
 * - Real-time metrics and monitoring
 */

import { EventEmitter } from 'events';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RateLimitConfig {
  // Token bucket settings
  tokensPerInterval: number;
  interval: number; // in milliseconds
  maxBurst: number;

  // Sliding window settings
  windowSize: number; // in milliseconds
  maxRequestsPerWindow: number;

  // Queue settings
  maxQueueSize: number;
  queueTimeout: number; // in milliseconds

  // Retry settings
  maxRetries: number;
  baseRetryDelay: number; // in milliseconds
  maxRetryDelay: number; // in milliseconds
}

export interface RateLimitContext {
  userId: string;
  agentId?: string;
  workspaceId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  operation?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  remainingRequests: number;
  resetTime: number; // Unix timestamp
  retryAfter?: number; // milliseconds
  queuePosition?: number;
  waitTime?: number; // estimated wait time in ms
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  queuedRequests: number;
  averageWaitTime: number;
  peakRequestsPerSecond: number;
  currentTokens: Record<string, number>;
  windowCounts: Record<string, number>;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface SlidingWindow {
  requests: number[];
  count: number;
}

interface QueuedRequest {
  id: string;
  context: RateLimitContext;
  priority: number;
  timestamp: number;
  resolve: (result: RateLimitResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // OpenAI API limits (conservative)
  openai: {
    tokensPerInterval: 10000, // 10k tokens per minute
    interval: 60000,
    maxBurst: 5000,
    windowSize: 60000,
    maxRequestsPerWindow: 60, // 60 requests per minute
    maxQueueSize: 100,
    queueTimeout: 30000,
    maxRetries: 3,
    baseRetryDelay: 1000,
    maxRetryDelay: 30000,
  },

  // Per-user limits
  user: {
    tokensPerInterval: 5000,
    interval: 60000,
    maxBurst: 2000,
    windowSize: 60000,
    maxRequestsPerWindow: 30,
    maxQueueSize: 20,
    queueTimeout: 15000,
    maxRetries: 2,
    baseRetryDelay: 500,
    maxRetryDelay: 10000,
  },

  // Per-agent limits
  agent: {
    tokensPerInterval: 3000,
    interval: 60000,
    maxBurst: 1500,
    windowSize: 60000,
    maxRequestsPerWindow: 20,
    maxQueueSize: 50,
    queueTimeout: 20000,
    maxRetries: 2,
    baseRetryDelay: 500,
    maxRetryDelay: 15000,
  },

  // Global system limits
  global: {
    tokensPerInterval: 50000,
    interval: 60000,
    maxBurst: 20000,
    windowSize: 60000,
    maxRequestsPerWindow: 500,
    maxQueueSize: 500,
    queueTimeout: 60000,
    maxRetries: 3,
    baseRetryDelay: 1000,
    maxRetryDelay: 60000,
  },
};

// Priority weights for queue ordering
const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// ============================================
// RATE LIMIT SERVICE
// ============================================

export class RateLimitService extends EventEmitter {
  private static instance: RateLimitService;

  // In-memory storage (Redis-backed in production)
  private tokenBuckets: Map<string, TokenBucket> = new Map();
  private slidingWindows: Map<string, SlidingWindow> = new Map();
  private requestQueues: Map<string, QueuedRequest[]> = new Map();

  // Metrics
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    queuedRequests: 0,
    averageWaitTime: 0,
    peakRequestsPerSecond: 0,
    currentTokens: {},
    windowCounts: {},
  };

  // Request tracking for metrics
  private requestsPerSecond: number[] = [];
  private waitTimes: number[] = [];

  // Configuration
  private configs: Map<string, RateLimitConfig> = new Map();

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Redis client (optional)
  private redisClient: any = null;
  private useRedis: boolean = false;

  private constructor() {
    super();
    this.initializeDefaultConfigs();
    this.startCleanupInterval();
    this.startMetricsCollection();
  }

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeDefaultConfigs(): void {
    for (const [key, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
      this.configs.set(key, config);
    }
  }

  /**
   * Connect to Redis for distributed rate limiting
   */
  public async connectRedis(redisUrl: string): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency
      const { createClient } = await import('redis');
      this.redisClient = createClient({ url: redisUrl });
      await this.redisClient.connect();
      this.useRedis = true;
      console.log('[RATE_LIMIT] Connected to Redis for distributed rate limiting');
    } catch (error) {
      console.warn('[RATE_LIMIT] Redis not available, using in-memory rate limiting:', error);
      this.useRedis = false;
    }
  }

  /**
   * Configure rate limits for a specific scope
   */
  public configure(scope: string, config: Partial<RateLimitConfig>): void {
    const existing = this.configs.get(scope) || DEFAULT_RATE_LIMITS.user;
    this.configs.set(scope, { ...existing, ...config });
  }

  // ============================================
  // CORE RATE LIMITING
  // ============================================

  /**
   * Check if a request is allowed
   */
  public async checkLimit(context: RateLimitContext): Promise<RateLimitResult> {
    this.metrics.totalRequests++;

    const keys = this.generateKeys(context);
    const results: RateLimitResult[] = [];

    // Check all applicable limits
    for (const { key, scope } of keys) {
      const config = this.configs.get(scope) || DEFAULT_RATE_LIMITS.user;
      const result = await this.checkSingleLimit(key, config);
      results.push(result);
    }

    // Return the most restrictive result
    const mostRestrictive = this.getMostRestrictiveResult(results);

    if (mostRestrictive.allowed) {
      this.metrics.allowedRequests++;
      this.emit('request:allowed', { context, result: mostRestrictive });
    } else {
      this.metrics.deniedRequests++;
      this.emit('request:denied', { context, result: mostRestrictive });
    }

    return mostRestrictive;
  }

  /**
   * Consume tokens for a request
   */
  public async consumeTokens(
    context: RateLimitContext,
    tokenCount: number
  ): Promise<RateLimitResult> {
    const keys = this.generateKeys(context);

    for (const { key, scope } of keys) {
      const config = this.configs.get(scope) || DEFAULT_RATE_LIMITS.user;
      await this.consumeFromBucket(key, tokenCount, config);
    }

    return this.checkLimit(context);
  }

  /**
   * Execute a function with rate limiting
   */
  public async executeWithLimit<T>(
    context: RateLimitContext,
    fn: () => Promise<T>,
    options: {
      tokenCost?: number;
      waitForSlot?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { tokenCost = 1, waitForSlot = true, timeout = 30000 } = options;

    // Check initial limit
    let result = await this.checkLimit(context);

    if (!result.allowed) {
      if (waitForSlot) {
        // Queue the request
        result = await this.queueRequest(context, timeout);

        if (!result.allowed) {
          throw new RateLimitError(
            'Rate limit exceeded and queue timeout reached',
            result.retryAfter || 5000,
            result
          );
        }
      } else {
        throw new RateLimitError(
          'Rate limit exceeded',
          result.retryAfter || 5000,
          result
        );
      }
    }

    // Consume tokens
    await this.consumeTokens(context, tokenCost);

    // Execute the function
    const startTime = Date.now();
    try {
      const response = await fn();
      this.trackWaitTime(Date.now() - startTime);
      return response;
    } catch (error: any) {
      // Handle rate limit errors from external APIs
      if (this.isRateLimitError(error)) {
        const retryAfter = this.extractRetryAfter(error);
        await this.handleExternalRateLimit(context, retryAfter);
        throw new RateLimitError(
          'External API rate limit hit',
          retryAfter,
          result
        );
      }
      throw error;
    }
  }

  /**
   * Execute with automatic retry on rate limits
   */
  public async executeWithRetry<T>(
    context: RateLimitContext,
    fn: () => Promise<T>,
    options: {
      tokenCost?: number;
      maxRetries?: number;
      baseDelay?: number;
    } = {}
  ): Promise<T> {
    const config = this.getConfigForContext(context);
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const baseDelay = options.baseDelay ?? config.baseRetryDelay;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWithLimit(context, fn, {
          tokenCost: options.tokenCost,
          waitForSlot: true,
          timeout: config.queueTimeout,
        });
      } catch (error: any) {
        lastError = error;

        if (error instanceof RateLimitError && attempt < maxRetries) {
          const delay = Math.min(
            baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
            config.maxRetryDelay
          );

          console.log(
            `[RATE_LIMIT] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`
          );

          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // ============================================
  // TOKEN BUCKET IMPLEMENTATION
  // ============================================

  private async checkSingleLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Get or create token bucket
    const bucket = await this.getOrCreateBucket(key, config);

    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / config.interval) * config.tokensPerInterval;
    bucket.tokens = Math.min(config.maxBurst, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Get sliding window
    const window = await this.getOrCreateWindow(key);

    // Clean old requests from window
    const windowStart = now - config.windowSize;
    window.requests = window.requests.filter(t => t > windowStart);
    window.count = window.requests.length;

    // Check limits
    const hasTokens = bucket.tokens >= 1;
    const withinWindow = window.count < config.maxRequestsPerWindow;
    const allowed = hasTokens && withinWindow;

    // Calculate reset time
    const tokenResetTime = bucket.tokens < 1
      ? now + ((1 - bucket.tokens) / config.tokensPerInterval) * config.interval
      : now;

    const windowResetTime = window.requests.length > 0
      ? window.requests[0] + config.windowSize
      : now;

    const resetTime = Math.max(tokenResetTime, windowResetTime);

    // Update metrics
    this.metrics.currentTokens[key] = bucket.tokens;
    this.metrics.windowCounts[key] = window.count;

    // If allowed, record the request in the window
    if (allowed) {
      window.requests.push(now);
      window.count++;
      await this.saveWindow(key, window);
    }

    await this.saveBucket(key, bucket);

    return {
      allowed,
      remainingTokens: Math.floor(bucket.tokens),
      remainingRequests: Math.max(0, config.maxRequestsPerWindow - window.count),
      resetTime: Math.ceil(resetTime / 1000),
      retryAfter: allowed ? undefined : Math.ceil(resetTime - now),
    };
  }

  private async getOrCreateBucket(
    key: string,
    config: RateLimitConfig
  ): Promise<TokenBucket> {
    if (this.useRedis && this.redisClient) {
      const data = await this.redisClient.get(`ratelimit:bucket:${key}`);
      if (data) {
        return JSON.parse(data);
      }
    }

    const existing = this.tokenBuckets.get(key);
    if (existing) {
      return existing;
    }

    const bucket: TokenBucket = {
      tokens: config.maxBurst,
      lastRefill: Date.now(),
    };

    this.tokenBuckets.set(key, bucket);
    return bucket;
  }

  private async saveBucket(key: string, bucket: TokenBucket): Promise<void> {
    this.tokenBuckets.set(key, bucket);

    if (this.useRedis && this.redisClient) {
      await this.redisClient.setEx(
        `ratelimit:bucket:${key}`,
        300, // 5 minute TTL
        JSON.stringify(bucket)
      );
    }
  }

  private async consumeFromBucket(
    key: string,
    tokens: number,
    config: RateLimitConfig
  ): Promise<void> {
    const bucket = await this.getOrCreateBucket(key, config);
    bucket.tokens = Math.max(0, bucket.tokens - tokens);
    await this.saveBucket(key, bucket);
  }

  // ============================================
  // SLIDING WINDOW IMPLEMENTATION
  // ============================================

  private async getOrCreateWindow(key: string): Promise<SlidingWindow> {
    if (this.useRedis && this.redisClient) {
      const data = await this.redisClient.get(`ratelimit:window:${key}`);
      if (data) {
        return JSON.parse(data);
      }
    }

    const existing = this.slidingWindows.get(key);
    if (existing) {
      return existing;
    }

    const window: SlidingWindow = {
      requests: [],
      count: 0,
    };

    this.slidingWindows.set(key, window);
    return window;
  }

  private async saveWindow(key: string, window: SlidingWindow): Promise<void> {
    this.slidingWindows.set(key, window);

    if (this.useRedis && this.redisClient) {
      await this.redisClient.setEx(
        `ratelimit:window:${key}`,
        300, // 5 minute TTL
        JSON.stringify(window)
      );
    }
  }

  // ============================================
  // REQUEST QUEUE
  // ============================================

  private async queueRequest(
    context: RateLimitContext,
    timeout: number
  ): Promise<RateLimitResult> {
    const queueKey = this.getQueueKey(context);
    const config = this.getConfigForContext(context);

    // Check queue size
    const queue = this.requestQueues.get(queueKey) || [];
    if (queue.length >= config.maxQueueSize) {
      return {
        allowed: false,
        remainingTokens: 0,
        remainingRequests: 0,
        resetTime: Math.ceil(Date.now() / 1000) + 60,
        retryAfter: 60000,
        queuePosition: -1,
      };
    }

    this.metrics.queuedRequests++;

    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const priority = PRIORITY_WEIGHTS[context.priority || 'normal'];

      const timeoutHandle = setTimeout(() => {
        this.removeFromQueue(queueKey, requestId);
        resolve({
          allowed: false,
          remainingTokens: 0,
          remainingRequests: 0,
          resetTime: Math.ceil(Date.now() / 1000) + 60,
          retryAfter: 60000,
        });
      }, timeout);

      const queuedRequest: QueuedRequest = {
        id: requestId,
        context,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
        timeout: timeoutHandle,
      };

      // Insert in priority order
      const newQueue = [...queue, queuedRequest].sort(
        (a, b) => b.priority - a.priority || a.timestamp - b.timestamp
      );

      this.requestQueues.set(queueKey, newQueue);

      // Start processing queue if not already running
      this.processQueue(queueKey);
    });
  }

  private async processQueue(queueKey: string): Promise<void> {
    const queue = this.requestQueues.get(queueKey);
    if (!queue || queue.length === 0) {
      return;
    }

    const request = queue[0];
    const result = await this.checkLimit(request.context);

    if (result.allowed) {
      // Remove from queue and resolve
      clearTimeout(request.timeout);
      queue.shift();
      this.requestQueues.set(queueKey, queue);

      const waitTime = Date.now() - request.timestamp;
      this.trackWaitTime(waitTime);

      request.resolve({
        ...result,
        queuePosition: 0,
        waitTime,
      });

      // Process next in queue
      if (queue.length > 0) {
        setImmediate(() => this.processQueue(queueKey));
      }
    } else {
      // Wait and retry
      const delay = Math.min(result.retryAfter || 1000, 5000);
      setTimeout(() => this.processQueue(queueKey), delay);
    }
  }

  private removeFromQueue(queueKey: string, requestId: string): void {
    const queue = this.requestQueues.get(queueKey);
    if (queue) {
      const filtered = queue.filter(r => r.id !== requestId);
      this.requestQueues.set(queueKey, filtered);
    }
  }

  private getQueueKey(context: RateLimitContext): string {
    return `queue:${context.workspaceId || 'global'}`;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateKeys(context: RateLimitContext): Array<{ key: string; scope: string }> {
    const keys: Array<{ key: string; scope: string }> = [];

    // Global limit
    keys.push({ key: 'global', scope: 'global' });

    // Workspace limit
    if (context.workspaceId) {
      keys.push({
        key: `workspace:${context.workspaceId}`,
        scope: 'user',
      });
    }

    // User limit
    keys.push({
      key: `user:${context.userId}`,
      scope: 'user',
    });

    // Agent limit
    if (context.agentId) {
      keys.push({
        key: `agent:${context.agentId}:${context.userId}`,
        scope: 'agent',
      });
    }

    // OpenAI specific limit
    if (context.operation?.includes('openai') || context.operation?.includes('ai')) {
      keys.push({
        key: `openai:${context.workspaceId || 'global'}`,
        scope: 'openai',
      });
    }

    return keys;
  }

  private getMostRestrictiveResult(results: RateLimitResult[]): RateLimitResult {
    // Find the result that is not allowed, or the one with lowest remaining
    const denied = results.find(r => !r.allowed);
    if (denied) {
      return denied;
    }

    // All allowed, return the one with lowest remaining tokens
    return results.reduce((min, curr) =>
      curr.remainingTokens < min.remainingTokens ? curr : min
    );
  }

  private getConfigForContext(context: RateLimitContext): RateLimitConfig {
    if (context.agentId) {
      return this.configs.get('agent') || DEFAULT_RATE_LIMITS.agent;
    }
    return this.configs.get('user') || DEFAULT_RATE_LIMITS.user;
  }

  private isRateLimitError(error: any): boolean {
    return (
      error?.status === 429 ||
      error?.code === 'rate_limit_exceeded' ||
      error?.message?.toLowerCase().includes('rate limit')
    );
  }

  private extractRetryAfter(error: any): number {
    // Try to extract from headers or error message
    const retryAfter = error?.headers?.['retry-after'] ||
                       error?.retryAfter ||
                       error?.data?.retryAfter;

    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed)) {
        return parsed * 1000; // Convert to ms if in seconds
      }
    }

    return 60000; // Default 1 minute
  }

  private async handleExternalRateLimit(
    context: RateLimitContext,
    retryAfter: number
  ): Promise<void> {
    // Temporarily reduce tokens for the affected scope
    const keys = this.generateKeys(context);

    for (const { key } of keys) {
      const bucket = this.tokenBuckets.get(key);
      if (bucket) {
        bucket.tokens = 0;
        bucket.lastRefill = Date.now() + retryAfter;
        await this.saveBucket(key, bucket);
      }
    }

    this.emit('external:ratelimit', { context, retryAfter });
  }

  private trackWaitTime(waitTime: number): void {
    this.waitTimes.push(waitTime);

    // Keep only last 1000 samples
    if (this.waitTimes.length > 1000) {
      this.waitTimes.shift();
    }

    // Update average
    this.metrics.averageWaitTime =
      this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // CLEANUP & METRICS
  // ============================================

  private startCleanupInterval(): void {
    // Clean up old data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes

    // Clean token buckets
    for (const [key, bucket] of this.tokenBuckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.tokenBuckets.delete(key);
      }
    }

    // Clean sliding windows
    for (const [key, window] of this.slidingWindows.entries()) {
      if (window.requests.length === 0 ||
          (window.requests.length > 0 && now - window.requests[window.requests.length - 1] > maxAge)) {
        this.slidingWindows.delete(key);
      }
    }

    console.log('[RATE_LIMIT] Cleanup completed');
  }

  private startMetricsCollection(): void {
    // Track requests per second
    setInterval(() => {
      const currentRPS = this.metrics.totalRequests - (this.requestsPerSecond[0] || 0);
      this.requestsPerSecond.unshift(this.metrics.totalRequests);

      if (this.requestsPerSecond.length > 60) {
        this.requestsPerSecond.pop();
      }

      if (currentRPS > this.metrics.peakRequestsPerSecond) {
        this.metrics.peakRequestsPerSecond = currentRPS;
      }
    }, 1000);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Get rate limit status for a context
   */
  public async getStatus(context: RateLimitContext): Promise<{
    buckets: Record<string, { tokens: number; maxBurst: number }>;
    windows: Record<string, { count: number; maxRequests: number }>;
    queueLength: number;
  }> {
    const keys = this.generateKeys(context);
    const buckets: Record<string, { tokens: number; maxBurst: number }> = {};
    const windows: Record<string, { count: number; maxRequests: number }> = {};

    for (const { key, scope } of keys) {
      const config = this.configs.get(scope) || DEFAULT_RATE_LIMITS.user;
      const bucket = await this.getOrCreateBucket(key, config);
      const window = await this.getOrCreateWindow(key);

      buckets[key] = {
        tokens: Math.floor(bucket.tokens),
        maxBurst: config.maxBurst,
      };

      windows[key] = {
        count: window.count,
        maxRequests: config.maxRequestsPerWindow,
      };
    }

    const queueKey = this.getQueueKey(context);
    const queue = this.requestQueues.get(queueKey) || [];

    return {
      buckets,
      windows,
      queueLength: queue.length,
    };
  }

  /**
   * Reset rate limits for a context (admin only)
   */
  public async reset(context: RateLimitContext): Promise<void> {
    const keys = this.generateKeys(context);

    for (const { key, scope } of keys) {
      const config = this.configs.get(scope) || DEFAULT_RATE_LIMITS.user;

      this.tokenBuckets.set(key, {
        tokens: config.maxBurst,
        lastRefill: Date.now(),
      });

      this.slidingWindows.set(key, {
        requests: [],
        count: 0,
      });

      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(`ratelimit:bucket:${key}`);
        await this.redisClient.del(`ratelimit:window:${key}`);
      }
    }

    console.log('[RATE_LIMIT] Reset completed for context:', context);
  }

  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    console.log('[RATE_LIMIT] Service shutdown');
  }
}

// ============================================
// RATE LIMIT ERROR
// ============================================

export class RateLimitError extends Error {
  public readonly retryAfter: number;
  public readonly result: RateLimitResult;
  public readonly isRateLimit = true;

  constructor(message: string, retryAfter: number, result: RateLimitResult) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.result = result;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const rateLimiter = RateLimitService.getInstance();

export default RateLimitService;
