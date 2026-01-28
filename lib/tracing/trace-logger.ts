/**
 * TRACE LOGGER
 * Track every agent interaction for debugging and optimization
 *
 * Philosophy: "If you can't measure it, you can't debug it"
 * - Log everything that matters
 * - Make traces queryable
 * - Enable step-by-step debugging
 */

export interface TraceEvent {
  // Identification
  traceId: string; // Unique ID for this conversation
  spanId: string; // Unique ID for this step
  parentSpanId?: string; // For nested operations

  // Agent Context
  agentId: string;
  userId: string;
  sessionId: string;

  // Event Details
  eventType:
    | 'user_message'
    | 'agent_response'
    | 'tool_call'
    | 'error'
    | 'system_event';
  timestamp: Date;

  // Message Content
  message?: string;
  role?: 'user' | 'assistant' | 'system';

  // AI Model Details
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // Token Usage
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;

  // Performance
  latencyMs?: number;
  startTime?: Date;
  endTime?: Date;

  // Cost
  costUsd?: number;

  // Error Info
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  // Additional Context
  metadata?: Record<string, any>;
}

export interface ConversationTrace {
  traceId: string;
  agentId: string;
  userId: string;
  sessionId: string;
  events: TraceEvent[];
  startedAt: Date;
  endedAt?: Date;
  totalTokens: number;
  totalCost: number;
  totalLatencyMs: number;
  status: 'active' | 'completed' | 'error';
}

/**
 * In-Memory Trace Store (for now)
 * In production, this would write to database
 */
class TraceStore {
  private traces: Map<string, ConversationTrace> = new Map();
  private maxTraces = 1000; // Keep last 1000 traces in memory

  /**
   * Start a new trace
   */
  startTrace(
    traceId: string,
    agentId: string,
    userId: string,
    sessionId: string
  ): void {
    this.traces.set(traceId, {
      traceId,
      agentId,
      userId,
      sessionId,
      events: [],
      startedAt: new Date(),
      totalTokens: 0,
      totalCost: 0,
      totalLatencyMs: 0,
      status: 'active',
    });

    // Cleanup old traces if needed
    if (this.traces.size > this.maxTraces) {
      const firstKey = this.traces.keys().next().value;
      this.traces.delete(firstKey);
    }
  }

  /**
   * Add event to trace
   */
  addEvent(traceId: string, event: Omit<TraceEvent, 'traceId'>): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[TRACE] Trace not found: ${traceId}`);
      return;
    }

    const fullEvent: TraceEvent = {
      ...event,
      traceId,
    };

    trace.events.push(fullEvent);

    // Update totals
    if (event.tokensTotal) {
      trace.totalTokens += event.tokensTotal;
    }
    if (event.costUsd) {
      trace.totalCost += event.costUsd;
    }
    if (event.latencyMs) {
      trace.totalLatencyMs += event.latencyMs;
    }

    // Update status based on event type
    if (event.eventType === 'error') {
      trace.status = 'error';
    }
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endedAt = new Date();
    if (trace.status === 'active') {
      trace.status = 'completed';
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): ConversationTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get all traces for an agent
   */
  getTracesByAgent(agentId: string): ConversationTrace[] {
    return Array.from(this.traces.values()).filter(
      (t) => t.agentId === agentId
    );
  }

  /**
   * Get all traces for a user
   */
  getTracesByUser(userId: string): ConversationTrace[] {
    return Array.from(this.traces.values()).filter((t) => t.userId === userId);
  }

  /**
   * Get all traces
   */
  getAllTraces(): ConversationTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear();
  }
}

// Singleton instance
const traceStore = new TraceStore();

/**
 * TRACE LOGGER
 * Main interface for logging traces
 */
export class TraceLogger {
  private traceId: string;
  private agentId: string;
  private userId: string;
  private sessionId: string;

  constructor(
    traceId: string,
    agentId: string,
    userId: string,
    sessionId: string
  ) {
    this.traceId = traceId;
    this.agentId = agentId;
    this.userId = userId;
    this.sessionId = sessionId;

    // Start trace
    traceStore.startTrace(traceId, agentId, userId, sessionId);
  }

  /**
   * Log user message
   */
  logUserMessage(message: string, metadata?: Record<string, any>): void {
    traceStore.addEvent(this.traceId, {
      spanId: this.generateSpanId(),
      agentId: this.agentId,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'user_message',
      timestamp: new Date(),
      message,
      role: 'user',
      metadata,
    });
  }

  /**
   * Log agent response
   */
  logAgentResponse(
    message: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tokensPrompt?: number;
      tokensCompletion?: number;
      tokensTotal?: number;
      latencyMs?: number;
      costUsd?: number;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    traceStore.addEvent(this.traceId, {
      spanId: this.generateSpanId(),
      agentId: this.agentId,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'agent_response',
      timestamp: new Date(),
      message,
      role: 'assistant',
      ...options,
    });
  }

  /**
   * Log error
   */
  logError(
    error: Error | string,
    metadata?: Record<string, any>
  ): void {
    const errorObj = typeof error === 'string'
      ? { message: error }
      : {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        };

    traceStore.addEvent(this.traceId, {
      spanId: this.generateSpanId(),
      agentId: this.agentId,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'error',
      timestamp: new Date(),
      error: errorObj,
      metadata,
    });
  }

  /**
   * Log system event
   */
  logSystemEvent(message: string, metadata?: Record<string, any>): void {
    traceStore.addEvent(this.traceId, {
      spanId: this.generateSpanId(),
      agentId: this.agentId,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'system_event',
      timestamp: new Date(),
      message,
      metadata,
    });
  }

  /**
   * End this trace
   */
  end(): void {
    traceStore.endTrace(this.traceId);
  }

  /**
   * Get the current trace
   */
  getTrace(): ConversationTrace | undefined {
    return traceStore.getTrace(this.traceId);
  }

  /**
   * Generate unique span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique trace ID
   */
  static generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * TRACE VIEWER
 * Query and retrieve traces
 */
export class TraceViewer {
  /**
   * Get trace by ID
   */
  static getTrace(traceId: string): ConversationTrace | undefined {
    return traceStore.getTrace(traceId);
  }

  /**
   * Get all traces for an agent
   */
  static getAgentTraces(agentId: string): ConversationTrace[] {
    return traceStore.getTracesByAgent(agentId);
  }

  /**
   * Get all traces for a user
   */
  static getUserTraces(userId: string): ConversationTrace[] {
    return traceStore.getTracesByUser(userId);
  }

  /**
   * Get recent traces (last N)
   */
  static getRecentTraces(limit: number = 20): ConversationTrace[] {
    return traceStore
      .getAllTraces()
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Calculate token cost (rough estimate)
   * GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
   */
  static calculateCost(tokensPrompt: number, tokensCompletion: number): number {
    const inputCostPer1M = 0.15;
    const outputCostPer1M = 0.60;

    const inputCost = (tokensPrompt / 1_000_000) * inputCostPer1M;
    const outputCost = (tokensCompletion / 1_000_000) * outputCostPer1M;

    return inputCost + outputCost;
  }
}

// Export singleton store for advanced use cases
export { traceStore };
