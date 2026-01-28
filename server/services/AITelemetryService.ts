/**
 * AI TELEMETRY SERVICE
 *
 * Async, non-blocking telemetry for all AI/LLM requests.
 * Logs traces to PostgreSQL for cost tracking, performance monitoring,
 * and debugging.
 *
 * Key Design Principles:
 * - Fire-and-forget: Never blocks the main AI request
 * - Fault-tolerant: Logging failures never crash the app
 * - Accurate cost tracking: Per-model pricing
 */

import { getDb } from '@/lib/db';
import {
  aiRequestTraces,
  type NewAIRequestTrace,
} from '@/lib/db/schema-observability';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// MODEL COST DEFINITIONS (USD per 1M tokens)
// ============================================================================

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * Cost per 1 million tokens for various AI models
 * Updated: December 2024
 */
const MODEL_COSTS: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gpt-4o-2024-11-20': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-4o-2024-08-06': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-4-turbo': { inputPerMillion: 10.00, outputPerMillion: 30.00 },
  'gpt-4-turbo-preview': { inputPerMillion: 10.00, outputPerMillion: 30.00 },
  'gpt-4': { inputPerMillion: 30.00, outputPerMillion: 60.00 },
  'gpt-4-32k': { inputPerMillion: 60.00, outputPerMillion: 120.00 },
  'gpt-3.5-turbo': { inputPerMillion: 0.50, outputPerMillion: 1.50 },
  'gpt-3.5-turbo-0125': { inputPerMillion: 0.50, outputPerMillion: 1.50 },
  'o1-preview': { inputPerMillion: 15.00, outputPerMillion: 60.00 },
  'o1-mini': { inputPerMillion: 3.00, outputPerMillion: 12.00 },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-3-5-sonnet-latest': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-sonnet-4-20250514': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-3-opus-20240229': { inputPerMillion: 15.00, outputPerMillion: 75.00 },
  'claude-3-sonnet-20240229': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-3-haiku-20240307': { inputPerMillion: 0.25, outputPerMillion: 1.25 },

  // Default fallback
  'default': { inputPerMillion: 2.00, outputPerMillion: 8.00 },
};

// ============================================================================
// TRACE DATA INTERFACE
// ============================================================================

export interface TraceData {
  /** Unique trace ID (generated if not provided) */
  traceId?: string;

  /** User who initiated the request */
  userId?: string;

  /** Agent handling the request */
  agentId?: string;

  /** Workspace context */
  workspaceId?: string;

  /** Session ID for correlation */
  sessionId?: string;

  /** AI provider (openai, anthropic, etc.) */
  provider: 'openai' | 'anthropic' | 'google' | 'azure_openai' | 'local' | 'fallback';

  /** Model used */
  model: string;

  /** Request type (chat, completion, embedding) */
  requestType: 'chat' | 'completion' | 'embedding' | 'function_call' | 'streaming';

  /** Number of prompt tokens */
  promptTokens?: number;

  /** Number of completion tokens */
  completionTokens?: number;

  /** Whether this was a streaming request */
  isStreaming?: boolean;

  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Request status */
  status: 'success' | 'failed' | 'timeout' | 'rate_limited' | 'cancelled';

  /** Finish reason from AI provider */
  finishReason?: string;

  /** Error code if failed */
  errorCode?: string;

  /** Error message if failed */
  errorMessage?: string;

  /** Additional metadata */
  metadata?: {
    temperature?: number;
    maxTokens?: number;
    systemPromptHash?: string;
    functionCalls?: string[];
    retryCount?: number;
    fallbackUsed?: boolean;
    cacheHit?: boolean;
  };
}

// ============================================================================
// AI TELEMETRY SERVICE
// ============================================================================

class AITelemetryServiceImpl {
  private db = getDb();
  private isInitialized = false;
  private pendingTraces: NewAIRequestTrace[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // Batch flush every 5 seconds for efficiency
    this.flushInterval = setInterval(() => {
      this.flushPendingTraces();
    }, 5000);

    this.isInitialized = true;
    logger.info('[AI_TELEMETRY] Service initialized');
  }

  /**
   * Calculate cost based on model and token usage
   */
  calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): { promptCost: number; completionCost: number; totalCost: number } {
    // Find matching pricing (partial match for model variants)
    let pricing = MODEL_COSTS['default'];

    for (const [key, value] of Object.entries(MODEL_COSTS)) {
      if (key !== 'default' && model.toLowerCase().includes(key.toLowerCase())) {
        pricing = value;
        break;
      }
    }

    // Also check exact match
    if (MODEL_COSTS[model]) {
      pricing = MODEL_COSTS[model];
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
    const completionCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;
    const totalCost = promptCost + completionCost;

    return {
      promptCost: Math.round(promptCost * 1_000_000) / 1_000_000, // 6 decimal precision
      completionCost: Math.round(completionCost * 1_000_000) / 1_000_000,
      totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
    };
  }

  /**
   * Log a trace asynchronously (fire-and-forget)
   *
   * This method NEVER throws. All errors are caught and logged.
   * The main AI request is never affected by telemetry failures.
   */
  logTrace(data: TraceData): void {
    // Fire and forget - don't await
    this.logTraceAsync(data).catch((error) => {
      // Silently log to console, never throw
      console.error('[AI_TELEMETRY] Failed to log trace (non-blocking):', error.message);
    });
  }

  /**
   * Internal async trace logging with full error isolation
   */
  private async logTraceAsync(data: TraceData): Promise<void> {
    try {
      const traceId = data.traceId || uuidv4();
      const promptTokens = data.promptTokens || 0;
      const completionTokens = data.completionTokens || 0;
      const totalTokens = promptTokens + completionTokens;

      // Calculate costs
      const costs = this.calculateCost(data.model, promptTokens, completionTokens);

      const trace: NewAIRequestTrace = {
        traceId,
        userId: data.userId || null,
        agentId: data.agentId || null,
        workspaceId: data.workspaceId || null,
        sessionId: data.sessionId || null,
        provider: data.provider,
        model: data.model,
        endpoint: null,
        requestType: data.requestType,
        promptTokens,
        completionTokens,
        totalTokens,
        isStreaming: data.isStreaming || false,
        status: data.status,
        responseTimeMs: data.responseTimeMs,
        finishReason: data.finishReason || null,
        promptCost: costs.promptCost.toString(),
        completionCost: costs.completionCost.toString(),
        totalCost: costs.totalCost.toString(),
        errorCode: data.errorCode || null,
        errorMessage: data.errorMessage || null,
        metadata: data.metadata || {},
        startedAt: new Date(Date.now() - data.responseTimeMs),
        completedAt: new Date(),
      };

      // Add to pending batch
      this.pendingTraces.push(trace);

      // Immediate flush if batch is large
      if (this.pendingTraces.length >= 10) {
        await this.flushPendingTraces();
      }
    } catch (error: any) {
      // Never throw - just log to console
      console.error('[AI_TELEMETRY] Error preparing trace:', error.message);
    }
  }

  /**
   * Flush pending traces to database
   */
  private async flushPendingTraces(): Promise<void> {
    if (this.pendingTraces.length === 0) return;

    const tracesToFlush = [...this.pendingTraces];
    this.pendingTraces = [];

    try {
      await this.db.insert(aiRequestTraces).values(tracesToFlush);

      logger.debug(`[AI_TELEMETRY] Flushed ${tracesToFlush.length} traces to database`);
    } catch (error: any) {
      // Log error but don't throw - traces are lost but app continues
      console.error('[AI_TELEMETRY] Failed to flush traces:', error.message);

      // Optionally: re-add traces for retry (with limit to prevent memory leak)
      if (this.pendingTraces.length < 100) {
        this.pendingTraces.push(...tracesToFlush);
      }
    }
  }

  /**
   * Helper: Create a trace timer for measuring request duration
   */
  startTimer(): { stop: () => number } {
    const startTime = Date.now();
    return {
      stop: () => Date.now() - startTime,
    };
  }

  /**
   * Get usage statistics for a user
   */
  async getUserStats(userId: string, days: number = 30): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  }> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const traces = await this.db
        .select()
        .from(aiRequestTraces)
        .where(
          (table) =>
            table.userId === userId &&
            table.startedAt >= cutoff
        );

      const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
      let totalRequests = 0;
      let totalTokens = 0;
      let totalCost = 0;

      for (const trace of traces) {
        totalRequests++;
        totalTokens += trace.totalTokens || 0;
        totalCost += parseFloat(trace.totalCost || '0');

        const model = trace.model;
        if (!byModel[model]) {
          byModel[model] = { requests: 0, tokens: 0, cost: 0 };
        }
        byModel[model].requests++;
        byModel[model].tokens += trace.totalTokens || 0;
        byModel[model].cost += parseFloat(trace.totalCost || '0');
      }

      return { totalRequests, totalTokens, totalCost, byModel };
    } catch (error: any) {
      console.error('[AI_TELEMETRY] Failed to get user stats:', error.message);
      return { totalRequests: 0, totalTokens: 0, totalCost: 0, byModel: {} };
    }
  }

  /**
   * Cleanup: Stop background flush interval
   */
  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    this.flushPendingTraces().catch(() => {});

    logger.info('[AI_TELEMETRY] Service shutdown');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: AITelemetryServiceImpl | null = null;

export function getAITelemetryService(): AITelemetryServiceImpl {
  if (!instance) {
    instance = new AITelemetryServiceImpl();
  }
  return instance;
}

export const AITelemetryService = {
  logTrace: (data: TraceData) => getAITelemetryService().logTrace(data),
  startTimer: () => getAITelemetryService().startTimer(),
  calculateCost: (model: string, promptTokens: number, completionTokens: number) =>
    getAITelemetryService().calculateCost(model, promptTokens, completionTokens),
  getUserStats: (userId: string, days?: number) =>
    getAITelemetryService().getUserStats(userId, days),
  shutdown: () => getAITelemetryService().shutdown(),
};

export default AITelemetryService;
