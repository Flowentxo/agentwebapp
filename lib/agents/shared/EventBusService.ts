/**
 * PHASE 5: Inter-Agent Event Bus Service
 * Enables real-time communication between Dexter, Cassie, and Aura
 */

import { RedisCache, redisCache } from '@/lib/brain/RedisCache';
import { EventEmitter } from 'events';

export interface AgentEvent {
  id: string;
  type: string;
  source: {
    agentId: string;
    agentName: string;
  };
  target?: {
    agentId?: string;
    broadcast?: boolean;
  };
  payload: Record<string, unknown>;
  metadata: {
    workspaceId: string;
    userId: string;
    correlationId?: string;
    timestamp: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };
}

export interface EventSubscription {
  id: string;
  agentId: string;
  eventTypes: string[];
  callback: (event: AgentEvent) => Promise<void>;
}

export type EventHandler = (event: AgentEvent) => Promise<void>;

/**
 * Event types used across agents
 */
export const EVENT_TYPES = {
  // Dexter Events
  DEXTER_REVENUE_ALERT: 'dexter:revenue:alert',
  DEXTER_FORECAST_READY: 'dexter:forecast:ready',
  DEXTER_ANOMALY_DETECTED: 'dexter:anomaly:detected',
  DEXTER_REPORT_GENERATED: 'dexter:report:generated',

  // Cassie Events
  CASSIE_TICKET_CREATED: 'cassie:ticket:created',
  CASSIE_TICKET_ESCALATED: 'cassie:ticket:escalated',
  CASSIE_SENTIMENT_ALERT: 'cassie:sentiment:alert',
  CASSIE_KB_UPDATED: 'cassie:kb:updated',

  // Aura Events
  AURA_WORKFLOW_STARTED: 'aura:workflow:started',
  AURA_WORKFLOW_COMPLETED: 'aura:workflow:completed',
  AURA_WORKFLOW_FAILED: 'aura:workflow:failed',
  AURA_TASK_SCHEDULED: 'aura:task:scheduled',
  AURA_RULE_TRIGGERED: 'aura:rule:triggered',

  // System Events
  SYSTEM_AGENT_HEALTH: 'system:agent:health',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_NOTIFICATION: 'system:notification',
} as const;

/**
 * Event Bus Service
 * Provides Pub/Sub functionality for inter-agent communication
 */
export class EventBusService extends EventEmitter {
  private static instance: EventBusService;
  private cache: RedisCache;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: AgentEvent[] = [];
  private readonly maxHistorySize = 1000;
  private isUsingRedis = false;
  private redisSubscriber: any = null;

  private metrics = {
    eventsPublished: 0,
    eventsDelivered: 0,
    eventsFailed: 0,
    activeSubscriptions: 0,
  };

  private constructor() {
    super();
    this.cache = redisCache;
    this.setMaxListeners(100);
    this.initializeRedisSubscriber();
  }

  public static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Initialize Redis Pub/Sub subscriber
   */
  private async initializeRedisSubscriber(): Promise<void> {
    try {
      if (this.cache.isAvailable()) {
        const client = this.cache.getClient();
        if (client) {
          // Create a duplicate connection for subscribing
          this.redisSubscriber = client.duplicate();
          this.isUsingRedis = true;
          console.log('[EventBusService] Redis Pub/Sub initialized');
        }
      }
    } catch (error) {
      console.warn('[EventBusService] Redis not available, using in-memory events');
      this.isUsingRedis = false;
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Publish an event
   */
  public async publish(event: Omit<AgentEvent, 'id' | 'metadata'> & {
    metadata: Omit<AgentEvent['metadata'], 'timestamp'>;
  }): Promise<string> {
    const fullEvent: AgentEvent = {
      ...event,
      id: this.generateEventId(),
      metadata: {
        ...event.metadata,
        timestamp: new Date().toISOString(),
        priority: event.metadata.priority || 'normal',
      },
    };

    this.metrics.eventsPublished++;

    // Store in history
    this.addToHistory(fullEvent);

    // Publish via Redis if available
    if (this.isUsingRedis && this.cache.isAvailable()) {
      const channel = this.getChannel(fullEvent);
      await this.cache.publishUpdate(channel, fullEvent);
    }

    // Also emit locally for in-process subscribers
    this.emitEvent(fullEvent);

    console.log(`[EventBusService] Published event: ${fullEvent.type} (${fullEvent.id})`);
    return fullEvent.id;
  }

  /**
   * Subscribe to events
   */
  public subscribe(
    agentId: string,
    eventTypes: string[],
    callback: EventHandler
  ): string {
    const subscriptionId = `sub_${agentId}_${Date.now()}`;

    const subscription: EventSubscription = {
      id: subscriptionId,
      agentId,
      eventTypes,
      callback,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    // Register local event handlers
    for (const eventType of eventTypes) {
      this.on(eventType, async (event: AgentEvent) => {
        if (this.shouldDeliver(event, subscription)) {
          try {
            await callback(event);
            this.metrics.eventsDelivered++;
          } catch (error) {
            this.metrics.eventsFailed++;
            console.error(`[EventBusService] Handler error for ${eventType}:`, error);
          }
        }
      });
    }

    // Subscribe to Redis channels if available
    if (this.isUsingRedis && this.redisSubscriber) {
      for (const eventType of eventTypes) {
        const channel = `agents:events:${eventType}`;
        this.cache.subscribe(channel, async (event: AgentEvent) => {
          if (this.shouldDeliver(event, subscription)) {
            try {
              await callback(event);
              this.metrics.eventsDelivered++;
            } catch (error) {
              this.metrics.eventsFailed++;
              console.error(`[EventBusService] Redis handler error:`, error);
            }
          }
        });
      }
    }

    console.log(`[EventBusService] Subscription ${subscriptionId} created for ${agentId}`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Remove local listeners
    for (const eventType of subscription.eventTypes) {
      this.removeAllListeners(eventType);
    }

    this.subscriptions.delete(subscriptionId);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    console.log(`[EventBusService] Subscription ${subscriptionId} removed`);
    return true;
  }

  /**
   * Send request to another agent and wait for response
   */
  public async request(
    targetAgentId: string,
    requestType: string,
    payload: Record<string, unknown>,
    metadata: Omit<AgentEvent['metadata'], 'timestamp'>,
    timeoutMs: number = 30000
  ): Promise<AgentEvent | null> {
    return new Promise(async (resolve) => {
      const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const responseType = `response:${correlationId}`;

      // Set up response listener
      const timeout = setTimeout(() => {
        this.removeAllListeners(responseType);
        console.warn(`[EventBusService] Request ${correlationId} timed out`);
        resolve(null);
      }, timeoutMs);

      this.once(responseType, (response: AgentEvent) => {
        clearTimeout(timeout);
        resolve(response);
      });

      // Send request
      await this.publish({
        type: requestType,
        source: {
          agentId: metadata.workspaceId, // Use workspaceId as source for requests
          agentName: 'RequestClient',
        },
        target: {
          agentId: targetAgentId,
        },
        payload: {
          ...payload,
          _responseType: responseType,
        },
        metadata: {
          ...metadata,
          correlationId,
        },
      });
    });
  }

  /**
   * Send response to a request
   */
  public async respond(
    originalEvent: AgentEvent,
    responsePayload: Record<string, unknown>,
    agentId: string,
    agentName: string
  ): Promise<string> {
    const responseType = (originalEvent.payload._responseType as string) ||
      `response:${originalEvent.metadata.correlationId}`;

    return this.publish({
      type: responseType,
      source: {
        agentId,
        agentName,
      },
      target: {
        agentId: originalEvent.source.agentId,
      },
      payload: responsePayload,
      metadata: {
        workspaceId: originalEvent.metadata.workspaceId,
        userId: originalEvent.metadata.userId,
        correlationId: originalEvent.metadata.correlationId,
      },
    });
  }

  /**
   * Broadcast event to all agents
   */
  public async broadcast(
    type: string,
    payload: Record<string, unknown>,
    source: { agentId: string; agentName: string },
    metadata: Omit<AgentEvent['metadata'], 'timestamp'>
  ): Promise<string> {
    return this.publish({
      type,
      source,
      target: { broadcast: true },
      payload,
      metadata,
    });
  }

  /**
   * Get recent events for an agent
   */
  public getRecentEvents(
    agentId: string,
    limit: number = 50
  ): AgentEvent[] {
    return this.eventHistory
      .filter(event =>
        event.source.agentId === agentId ||
        event.target?.agentId === agentId ||
        event.target?.broadcast
      )
      .slice(-limit);
  }

  /**
   * Get events by type
   */
  public getEventsByType(
    eventType: string,
    limit: number = 100
  ): AgentEvent[] {
    return this.eventHistory
      .filter(event => event.type === eventType)
      .slice(-limit);
  }

  /**
   * Check if event should be delivered to subscription
   */
  private shouldDeliver(event: AgentEvent, subscription: EventSubscription): boolean {
    // Check if event type matches
    const typeMatches = subscription.eventTypes.some(type => {
      if (type.endsWith('*')) {
        return event.type.startsWith(type.slice(0, -1));
      }
      return event.type === type;
    });

    if (!typeMatches) return false;

    // Check if this is a targeted event
    if (event.target?.agentId && event.target.agentId !== subscription.agentId) {
      return false;
    }

    return true;
  }

  /**
   * Get channel name for Redis Pub/Sub
   */
  private getChannel(event: AgentEvent): string {
    if (event.target?.broadcast) {
      return `agents:events:broadcast`;
    }
    if (event.target?.agentId) {
      return `agents:events:${event.target.agentId}`;
    }
    return `agents:events:${event.type}`;
  }

  /**
   * Emit event locally
   */
  private emitEvent(event: AgentEvent): void {
    // Emit to specific event type listeners
    this.emit(event.type, event);

    // Emit to wildcard listeners for the agent
    const agentPrefix = event.type.split(':')[0];
    this.emit(`${agentPrefix}:*`, event);

    // Emit to broadcast listeners
    if (event.target?.broadcast) {
      this.emit('broadcast', event);
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: AgentEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get service metrics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get all active subscriptions
   */
  public getSubscriptions(): Array<{
    id: string;
    agentId: string;
    eventTypes: string[];
  }> {
    return Array.from(this.subscriptions.values()).map(sub => ({
      id: sub.id,
      agentId: sub.agentId,
      eventTypes: sub.eventTypes,
    }));
  }
}

// Export singleton instance
export const eventBus = EventBusService.getInstance();
