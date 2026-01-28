/**
 * PHASE 9: Event Bus Service
 * Redis PubSub-basierter Event Bus für Inter-Agent Kommunikation
 * Updated to support Redis Cloud TLS connections.
 */

import { Redis } from 'ioredis';
import { getDb } from '@/lib/db';
import { AgentEventType } from '@/lib/agents/shared/types';
import { getRedisOptions, isRedisConfigured } from '@/lib/redis/connection';

// ============================================
// EVENT TYPES
// ============================================

export interface AgentEvent<T = unknown> {
  id: string;
  type: AgentEventType;
  source: {
    agentId: string;
    toolName?: string;
    userId?: string;
    workspaceId?: string;
  };
  target?: {
    agentId?: string;
    userId?: string;
    workspaceId?: string;
  };
  payload: T;
  metadata: {
    correlationId: string;
    timestamp: Date;
    version: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    retryCount?: number;
    ttl?: number; // Time to live in seconds
  };
}

export interface EventSubscription {
  id: string;
  eventType: AgentEventType | '*';
  agentId?: string;
  callback: (event: AgentEvent) => Promise<void>;
  filter?: (event: AgentEvent) => boolean;
}

export interface EventBusConfig {
  redisUrl?: string;
  channelPrefix?: string;
  enableHistory?: boolean;
  historyRetentionDays?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

// ============================================
// EVENT BUS CLASS
// ============================================

class EventBus {
  private static instance: EventBus;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private isConnected: boolean = false;
  private errorLogged: boolean = false; // Prevent Redis error spam
  private config: EventBusConfig;
  private localSubscribers: Map<AgentEventType | '*', Set<(event: AgentEvent) => Promise<void>>> = new Map();

  private constructor(config: EventBusConfig = {}) {
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      channelPrefix: 'agent_events',
      enableHistory: true,
      historyRetentionDays: 30,
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: EventBusConfig): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(config);
    }
    return EventBus.instance;
  }

  /**
   * Initialize Redis connections with TLS support
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    // Skip if Redis not configured
    if (!isRedisConfigured()) {
      console.log('[EVENT_BUS] Redis not configured, running in local-only mode');
      return;
    }

    try {
      // Use unified Redis options with TLS support
      const options = getRedisOptions();
      this.publisher = new Redis(options);
      this.subscriber = new Redis(options);

      // Handle connection events
      this.publisher.on('connect', () => {
        console.log('[EVENT_BUS] Publisher connected');
        this.errorLogged = false; // Reset error flag on successful connection
      });

      this.subscriber.on('connect', () => {
        console.log('[EVENT_BUS] Subscriber connected');
        this.errorLogged = false; // Reset error flag on successful connection
      });

      this.publisher.on('error', (err) => {
        if (!this.errorLogged) {
          console.warn('[EVENT_BUS] Publisher error:', err?.message || 'Connection failed');
          this.errorLogged = true;
        }
      });

      this.subscriber.on('error', (err) => {
        if (!this.errorLogged) {
          console.warn('[EVENT_BUS] Subscriber error:', err?.message || 'Connection failed');
          this.errorLogged = true;
        }
      });

      // Subscribe to pattern for all agent events
      await this.subscriber.psubscribe(`${this.config.channelPrefix}:*`);

      // Handle incoming messages
      this.subscriber.on('pmessage', async (pattern, channel, message) => {
        await this.handleIncomingMessage(channel, message);
      });

      this.isConnected = true;
      console.log('[EVENT_BUS] Connected successfully');
    } catch (error) {
      console.error('[EVENT_BUS] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.isConnected = false;
    console.log('[EVENT_BUS] Disconnected');
  }

  /**
   * Publish an event
   */
  public async publish<T>(event: Omit<AgentEvent<T>, 'id' | 'metadata'> & { metadata?: Partial<AgentEvent<T>['metadata']> }): Promise<string> {
    const eventId = crypto.randomUUID();
    const fullEvent: AgentEvent<T> = {
      ...event,
      id: eventId,
      metadata: {
        correlationId: event.metadata?.correlationId || crypto.randomUUID(),
        timestamp: new Date(),
        version: '1.0.0',
        priority: event.metadata?.priority || 'normal',
        retryCount: event.metadata?.retryCount || 0,
        ttl: event.metadata?.ttl,
        ...event.metadata,
      },
    };

    const channel = this.getChannel(event.type);
    const message = JSON.stringify(fullEvent);

    // Publish to Redis if connected
    if (this.publisher && this.isConnected) {
      await this.publisher.publish(channel, message);
    }

    // Also notify local subscribers
    await this.notifyLocalSubscribers(fullEvent);

    // Store in history if enabled
    if (this.config.enableHistory) {
      await this.storeEventHistory(fullEvent);
    }

    console.log(`[EVENT_BUS] Published event: ${event.type} (${eventId})`);
    return eventId;
  }

  /**
   * Subscribe to events
   */
  public subscribe(
    eventType: AgentEventType | '*',
    callback: (event: AgentEvent) => Promise<void>,
    options?: { agentId?: string; filter?: (event: AgentEvent) => boolean }
  ): string {
    const subscriptionId = crypto.randomUUID();

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      agentId: options?.agentId,
      callback,
      filter: options?.filter,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Add to local subscribers map
    if (!this.localSubscribers.has(eventType)) {
      this.localSubscribers.set(eventType, new Set());
    }
    this.localSubscribers.get(eventType)!.add(callback);

    console.log(`[EVENT_BUS] Subscribed to ${eventType} (${subscriptionId})`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Remove from local subscribers
    const callbacks = this.localSubscribers.get(subscription.eventType);
    if (callbacks) {
      callbacks.delete(subscription.callback);
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`[EVENT_BUS] Unsubscribed (${subscriptionId})`);
    return true;
  }

  /**
   * Handle incoming Redis messages
   */
  private async handleIncomingMessage(channel: string, message: string): Promise<void> {
    try {
      const event = JSON.parse(message) as AgentEvent;

      // Process through all matching subscriptions
      for (const subscription of this.subscriptions.values()) {
        if (this.matchesSubscription(event, subscription)) {
          try {
            await this.executeWithRetry(
              () => subscription.callback(event),
              this.config.maxRetries!
            );
          } catch (error) {
            console.error(`[EVENT_BUS] Subscription callback failed:`, error);
            await this.handleFailedEvent(event, error);
          }
        }
      }
    } catch (error) {
      console.error('[EVENT_BUS] Failed to process message:', error);
    }
  }

  /**
   * Notify local subscribers (for non-Redis mode)
   */
  private async notifyLocalSubscribers(event: AgentEvent): Promise<void> {
    // Notify specific event type subscribers
    const typeSubscribers = this.localSubscribers.get(event.type);
    if (typeSubscribers) {
      for (const callback of typeSubscribers) {
        try {
          await callback(event);
        } catch (error) {
          console.error(`[EVENT_BUS] Local subscriber callback failed:`, error);
        }
      }
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = this.localSubscribers.get('*');
    if (wildcardSubscribers) {
      for (const callback of wildcardSubscribers) {
        try {
          await callback(event);
        } catch (error) {
          console.error(`[EVENT_BUS] Wildcard subscriber callback failed:`, error);
        }
      }
    }
  }

  /**
   * Check if event matches subscription criteria
   */
  private matchesSubscription(event: AgentEvent, subscription: EventSubscription): boolean {
    // Check event type (wildcard matches all)
    if (subscription.eventType !== '*' && subscription.eventType !== event.type) {
      return false;
    }

    // Check agent filter
    if (subscription.agentId && event.target?.agentId !== subscription.agentId) {
      return false;
    }

    // Apply custom filter
    if (subscription.filter && !subscription.filter(event)) {
      return false;
    }

    return true;
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry(
    fn: () => Promise<void>,
    maxRetries: number,
    currentRetry: number = 0
  ): Promise<void> {
    try {
      await fn();
    } catch (error) {
      if (currentRetry < maxRetries) {
        const delay = this.config.retryDelayMs! * Math.pow(2, currentRetry);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, maxRetries, currentRetry + 1);
      }
      throw error;
    }
  }

  /**
   * Store event in history
   */
  private async storeEventHistory(event: AgentEvent): Promise<void> {
    try {
      if (this.publisher) {
        const historyKey = `${this.config.channelPrefix}:history:${event.type}`;
        const ttlSeconds = (this.config.historyRetentionDays || 30) * 24 * 60 * 60;

        await this.publisher.lpush(historyKey, JSON.stringify(event));
        await this.publisher.ltrim(historyKey, 0, 9999); // Keep last 10000 events per type
        await this.publisher.expire(historyKey, ttlSeconds);
      }
    } catch (error) {
      console.error('[EVENT_BUS] Failed to store event history:', error);
    }
  }

  /**
   * Get event history
   */
  public async getEventHistory(
    eventType: AgentEventType,
    options?: { limit?: number; offset?: number }
  ): Promise<AgentEvent[]> {
    if (!this.publisher) return [];

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const historyKey = `${this.config.channelPrefix}:history:${eventType}`;

    try {
      const events = await this.publisher.lrange(historyKey, offset, offset + limit - 1);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      console.error('[EVENT_BUS] Failed to get event history:', error);
      return [];
    }
  }

  /**
   * Handle failed events (dead letter queue)
   */
  private async handleFailedEvent(event: AgentEvent, error: unknown): Promise<void> {
    try {
      if (this.publisher) {
        const dlqKey = `${this.config.channelPrefix}:dlq`;
        const failedEvent = {
          ...event,
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString(),
        };
        await this.publisher.lpush(dlqKey, JSON.stringify(failedEvent));
      }
    } catch (err) {
      console.error('[EVENT_BUS] Failed to store in DLQ:', err);
    }
  }

  /**
   * Get channel name for event type
   */
  private getChannel(eventType: AgentEventType): string {
    return `${this.config.channelPrefix}:${eventType}`;
  }

  /**
   * Check if connected
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get subscription count
   */
  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Get Event Bus instance
 */
export function getEventBus(config?: EventBusConfig): EventBus {
  return EventBus.getInstance(config);
}

/**
 * Publish agent event
 */
export async function publishAgentEvent<T>(
  type: AgentEventType,
  source: AgentEvent['source'],
  payload: T,
  options?: {
    target?: AgentEvent['target'];
    priority?: AgentEvent['metadata']['priority'];
    correlationId?: string;
  }
): Promise<string> {
  const eventBus = getEventBus();
  return eventBus.publish({
    type,
    source,
    target: options?.target,
    payload,
    metadata: {
      correlationId: options?.correlationId || crypto.randomUUID(),
      timestamp: new Date(),
      version: '1.0.0',
      priority: options?.priority || 'normal',
    },
  });
}

/**
 * Subscribe to agent events
 */
export function subscribeToAgentEvents(
  eventType: AgentEventType | '*',
  callback: (event: AgentEvent) => Promise<void>,
  options?: { agentId?: string; filter?: (event: AgentEvent) => boolean }
): string {
  const eventBus = getEventBus();
  return eventBus.subscribe(eventType, callback, options);
}

// ============================================
// PREDEFINED EVENT PUBLISHERS
// ============================================

/**
 * Publish tool execution event
 */
export async function emitToolExecuted(
  agentId: string,
  toolName: string,
  result: unknown,
  context: { userId: string; workspaceId: string; correlationId?: string }
): Promise<string> {
  return publishAgentEvent(
    'tool.executed',
    { agentId, toolName, userId: context.userId, workspaceId: context.workspaceId },
    { toolName, result, executedAt: new Date() },
    { correlationId: context.correlationId }
  );
}

/**
 * Publish customer updated event
 */
export async function emitCustomerUpdated(
  agentId: string,
  customerId: string,
  changes: Record<string, unknown>,
  context: { userId: string; workspaceId: string }
): Promise<string> {
  return publishAgentEvent(
    'customer.updated',
    { agentId, userId: context.userId, workspaceId: context.workspaceId },
    { customerId, changes, updatedAt: new Date() }
  );
}

/**
 * Publish deal created event
 */
export async function emitDealCreated(
  agentId: string,
  deal: { id: string; name: string; value: number; stage: string },
  context: { userId: string; workspaceId: string }
): Promise<string> {
  return publishAgentEvent(
    'deal.created',
    { agentId, userId: context.userId, workspaceId: context.workspaceId },
    { deal, createdAt: new Date() }
  );
}

/**
 * Publish ticket resolved event
 */
export async function emitTicketResolved(
  agentId: string,
  ticketId: string,
  resolution: { summary: string; satisfaction?: number },
  context: { userId: string; workspaceId: string }
): Promise<string> {
  return publishAgentEvent(
    'ticket.resolved',
    { agentId, userId: context.userId, workspaceId: context.workspaceId },
    { ticketId, resolution, resolvedAt: new Date() }
  );
}

/**
 * Publish workflow completed event
 */
export async function emitWorkflowCompleted(
  agentId: string,
  workflowId: string,
  result: { success: boolean; output?: unknown; error?: string },
  context: { userId: string; workspaceId: string }
): Promise<string> {
  return publishAgentEvent(
    'workflow.completed',
    { agentId, userId: context.userId, workspaceId: context.workspaceId },
    { workflowId, result, completedAt: new Date() }
  );
}

/**
 * Publish integration sync event
 */
export async function emitIntegrationSynced(
  agentId: string,
  provider: string,
  syncResult: { recordsProcessed: number; errors: number },
  context: { userId: string; workspaceId: string }
): Promise<string> {
  return publishAgentEvent(
    'integration.synced',
    { agentId, userId: context.userId, workspaceId: context.workspaceId },
    { provider, syncResult, syncedAt: new Date() }
  );
}

/**
 * Publish error event
 */
export async function emitAgentError(
  agentId: string,
  error: { code: string; message: string; stack?: string },
  context: { userId?: string; workspaceId?: string; toolName?: string }
): Promise<string> {
  return publishAgentEvent(
    'agent.error',
    { agentId, toolName: context.toolName, userId: context.userId, workspaceId: context.workspaceId },
    { error, occurredAt: new Date() },
    { priority: 'high' }
  );
}

// Export the EventBus class for direct use
export { EventBus };
