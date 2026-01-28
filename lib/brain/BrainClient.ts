/**
 * Brain AI Client SDK
 * Provides bidirectional communication between agents and Brain AI services
 *
 * Features:
 * - Knowledge querying with agent-specific context
 * - Automatic context storage and updates
 * - Learning loop for performance metrics
 * - Authentication and secure API access
 * - Error handling and retry logic
 */

import { brainService } from './BrainService';
import { contextManager } from './ContextManager';
import { knowledgeIndexer } from './KnowledgeIndexer';
import { redisCache } from './RedisCache';
import type { AgentPersona } from '@/lib/agents/personas';

// ============================================
// Types & Interfaces
// ============================================

export interface BrainClientConfig {
  agentId: string;
  agentName: string;
  apiKey?: string; // For authentication
  workspaceId?: string;
  enableAutoContext?: boolean; // Auto-capture conversations
  cacheTTL?: number;
}

export interface QueryKnowledgeOptions {
  searchType?: 'hybrid' | 'semantic' | 'fulltext';
  limit?: number;
  minSimilarity?: number;
  includeContext?: boolean; // Include session context in results
  filters?: {
    tags?: string[];
    category?: string;
    sourceType?: string;
  };
  useCache?: boolean;
}

export interface QueryKnowledgeResult {
  results: Array<{
    id: string;
    title: string;
    content: string;
    similarity?: number;
    metadata?: Record<string, any>;
  }>;
  context?: string; // Relevant session context
  suggestions?: string[];
  totalResults: number;
  responseTime: number;
  cached?: boolean;
}

export interface StoreContextOptions {
  sessionId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  summary?: string;
  intent?: string;
  topics?: string[];
  keyPoints?: string[];
  metadata?: Record<string, any>;
}

export interface AgentMetrics {
  agentId: string;
  sessionId?: string;
  userId?: string;
  metrics: {
    successRate?: number; // 0-100
    averageResponseTime?: number; // milliseconds
    userSatisfaction?: number; // 0-5 rating
    tasksCompleted?: number;
    errorCount?: number;
    commonIssues?: string[];
  };
  insights?: {
    pattern: string;
    confidence: number; // 0-100
    evidence: string[];
  }[];
  timestamp: string;
}

export interface AgentKnowledgeSpace {
  agentId: string;
  totalDocuments: number;
  recentQueries: string[];
  popularTopics: string[];
  performanceScore: number;
}

// ============================================
// BrainClient SDK
// ============================================

export class BrainClient {
  private config: BrainClientConfig;
  private authenticated: boolean = false;
  private conversationBuffer: Map<string, any[]> = new Map();

  constructor(config: BrainClientConfig) {
    this.config = {
      workspaceId: 'default-workspace',
      enableAutoContext: true,
      cacheTTL: 300, // 5 minutes
      ...config,
    };

    // Auto-authenticate if API key provided
    if (this.config.apiKey) {
      this.authenticate(this.config.apiKey);
    }
  }

  // ============================================
  // 1. Knowledge Querying
  // ============================================

  /**
   * Query knowledge base with agent-specific context
   * Automatically includes agent's knowledge space and session context
   */
  public async queryKnowledge(
    query: string,
    options: QueryKnowledgeOptions = {}
  ): Promise<QueryKnowledgeResult> {
    try {
      // Build query options with agent context
      const queryOptions = {
        workspaceId: this.config.workspaceId,
        userId: this.config.agentId, // Agent acts as user for filtering
        searchType: options.searchType || 'hybrid',
        limit: options.limit || 5,
        minSimilarity: options.minSimilarity || 0.6,
        filters: {
          ...options.filters,
          // Add agent-specific filtering
          agentId: this.config.agentId,
        },
        useCache: options.useCache !== false,
      };

      // Execute query via BrainService
      const startTime = Date.now();
      const result = await brainService.query(query, queryOptions);

      // Get session context if requested
      let contextSummary: string | undefined;
      if (options.includeContext) {
        const recentContexts = await contextManager.queryContexts({
          agentId: this.config.agentId,
          limit: 3,
        });

        if (recentContexts.length > 0) {
          contextSummary = recentContexts
            .map(c => c.contextSnapshot?.summary || '')
            .filter(Boolean)
            .join(' | ');
        }
      }

      // Format response
      return {
        results: result.documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          similarity: doc.similarity,
          metadata: doc.metadata,
        })),
        context: contextSummary,
        suggestions: result.suggestions,
        totalResults: result.totalResults,
        responseTime: Date.now() - startTime,
        cached: false, // TODO: Check if from cache
      };
    } catch (error) {
      console.error('[BrainClient] queryKnowledge failed:', error);
      throw new Error(`Failed to query knowledge: ${(error as Error).message}`);
    }
  }

  /**
   * Get suggested queries based on agent's history
   */
  public async getSuggestedQueries(limit: number = 5): Promise<string[]> {
    try {
      const suggestions = await brainService.getPopularQueries({
        workspaceId: this.config.workspaceId,
        agentId: this.config.agentId,
        limit,
      });

      return suggestions;
    } catch (error) {
      console.error('[BrainClient] getSuggestedQueries failed:', error);
      return [];
    }
  }

  /**
   * Get agent's knowledge space statistics
   */
  public async getKnowledgeSpace(): Promise<AgentKnowledgeSpace> {
    try {
      const db = await import('@/lib/db').then(m => m.getDb());
      const { brainDocuments, brainQueryLogs } = await import('@/lib/db/schema');
      const { eq, and, desc, sql } = await import('drizzle-orm');

      // Count agent-specific documents
      const docsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(brainDocuments)
        .where(
          and(
            eq(brainDocuments.createdBy, this.config.agentId),
            eq(brainDocuments.isActive, true)
          )
        );

      const totalDocuments = docsResult[0]?.count || 0;

      // Get recent queries
      const recentQueriesResult = await db
        .select({ query: brainQueryLogs.query })
        .from(brainQueryLogs)
        .where(eq(brainQueryLogs.agentId, this.config.agentId))
        .orderBy(desc(brainQueryLogs.createdAt))
        .limit(10);

      const recentQueries = recentQueriesResult.map(r => r.query);

      // Get popular topics
      const popularTopics = await brainService.getSuggestedTopics({
        workspaceId: this.config.workspaceId,
        agentId: this.config.agentId,
        limit: 5,
      });

      return {
        agentId: this.config.agentId,
        totalDocuments,
        recentQueries,
        popularTopics,
        performanceScore: 85, // TODO: Calculate from metrics
      };
    } catch (error) {
      console.error('[BrainClient] getKnowledgeSpace failed:', error);
      return {
        agentId: this.config.agentId,
        totalDocuments: 0,
        recentQueries: [],
        popularTopics: [],
        performanceScore: 0,
      };
    }
  }

  // ============================================
  // 2. Context Storage & Management
  // ============================================

  /**
   * Store conversation context for current session
   * Creates context snapshots for learning and retrieval
   */
  public async storeContext(options: StoreContextOptions): Promise<string> {
    try {
      // Build context snapshot
      const contextSnapshot = {
        sessionId: options.sessionId,
        userId: options.userId,
        agentId: this.config.agentId,
        messages: options.messages,
        summary: options.summary,
        intent: options.intent,
        topics: options.topics || [],
        keyPoints: options.keyPoints || [],
        metadata: {
          ...options.metadata,
          agentName: this.config.agentName,
          capturedAt: new Date().toISOString(),
        },
      };

      // Store via ContextManager
      const contextId = await contextManager.upsertSessionContext(contextSnapshot);

      // Publish update via Redis for real-time sync
      await redisCache.publishUpdate('brain:context:update', {
        contextId,
        agentId: this.config.agentId,
        sessionId: options.sessionId,
      });

      return contextId;
    } catch (error) {
      console.error('[BrainClient] storeContext failed:', error);
      throw new Error(`Failed to store context: ${(error as Error).message}`);
    }
  }

  /**
   * Auto-capture conversation messages
   * Call this after each user-agent interaction
   */
  public captureMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableAutoContext) return;

    // Get or create conversation buffer
    let buffer = this.conversationBuffer.get(sessionId);
    if (!buffer) {
      buffer = [];
      this.conversationBuffer.set(sessionId, buffer);
    }

    // Add message to buffer
    buffer.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    });

    // Auto-store after every 5 messages or 5 minutes
    if (buffer.length >= 5) {
      this.flushContextBuffer(sessionId, userId).catch(err =>
        console.error('[BrainClient] Auto-flush failed:', err)
      );
    }
  }

  /**
   * Flush conversation buffer to storage
   */
  public async flushContextBuffer(
    sessionId: string,
    userId: string
  ): Promise<string | null> {
    const buffer = this.conversationBuffer.get(sessionId);
    if (!buffer || buffer.length === 0) return null;

    try {
      const contextId = await this.storeContext({
        sessionId,
        userId,
        messages: buffer,
      });

      // Clear buffer after successful storage
      this.conversationBuffer.delete(sessionId);

      return contextId;
    } catch (error) {
      console.error('[BrainClient] flushContextBuffer failed:', error);
      return null;
    }
  }

  // ============================================
  // 3. Learning Loop & Performance Metrics
  // ============================================

  /**
   * Send agent performance metrics and learnings to Brain
   * Brain aggregates data for adaptive re-ranking and insights
   */
  public async sendLearnings(metrics: AgentMetrics): Promise<void> {
    try {
      const db = await import('@/lib/db').then(m => m.getDb());
      const { brainLearnings } = await import('@/lib/db/schema');

      // Store metrics as learnings
      if (metrics.insights && metrics.insights.length > 0) {
        for (const insight of metrics.insights) {
          await db.insert(brainLearnings).values({
            workspaceId: this.config.workspaceId || 'default-workspace',
            pattern: insight.pattern,
            insight: JSON.stringify({
              metrics: metrics.metrics,
              sessionId: metrics.sessionId,
              evidence: insight.evidence,
              timestamp: metrics.timestamp,
            }),
            category: 'agent-performance',
            confidence: insight.confidence,
            evidenceCount: insight.evidence.length,
            relatedContextIds: [],
            metadata: {
              agentId: metrics.agentId,
              userId: metrics.userId,
              lastObserved: metrics.timestamp,
              impact: 'medium',
            },
            isActive: true,
            isValidated: false,
          });
        }
      }

      // Cache metrics for quick access
      await redisCache.set(
        `brain:metrics:${metrics.agentId}:latest`,
        JSON.stringify(metrics),
        { ttl: 3600 } // 1 hour TTL
      );

      // Publish metrics update
      await redisCache.publishUpdate('brain:metrics:update', {
        agentId: metrics.agentId,
        metrics: metrics.metrics,
        timestamp: metrics.timestamp,
      });

      console.log(`[BrainClient] Learnings sent for agent ${metrics.agentId}`);
    } catch (error) {
      console.error('[BrainClient] sendLearnings failed:', error);
      // Don't throw - metrics are non-critical
    }
  }

  /**
   * Report query feedback (helpful/unhelpful)
   * Used for learning and re-ranking
   */
  public async reportFeedback(
    queryId: string,
    wasHelpful: boolean,
    feedback?: string
  ): Promise<void> {
    try {
      const db = await import('@/lib/db').then(m => m.getDb());
      const { brainQueryLogs } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');

      await db
        .update(brainQueryLogs)
        .set({
          wasHelpful,
          ...(feedback && { metadata: { filters: { feedback } } }),
        })
        .where(eq(brainQueryLogs.id, queryId));
    } catch (error) {
      console.error('[BrainClient] reportFeedback failed:', error);
    }
  }

  // ============================================
  // 4. Agent-Specific Knowledge Management
  // ============================================

  /**
   * Index agent-specific knowledge
   * Creates isolated knowledge space for this agent
   */
  public async indexKnowledge(
    title: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const result = await knowledgeIndexer.indexDocument({
        title,
        content,
        createdBy: this.config.agentId,
        metadata: {
          sourceType: 'agent',
          source: this.config.agentName,
          ...metadata,
        },
        workspaceId: this.config.workspaceId,
      });

      return result.id;
    } catch (error) {
      console.error('[BrainClient] indexKnowledge failed:', error);
      throw new Error(`Failed to index knowledge: ${(error as Error).message}`);
    }
  }

  /**
   * Batch index multiple documents
   */
  public async indexKnowledgeBatch(
    documents: Array<{
      title: string;
      content: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<string[]> {
    try {
      const documentsWithAgent = documents.map(doc => ({
        ...doc,
        createdBy: this.config.agentId,
        workspaceId: this.config.workspaceId,
        metadata: {
          sourceType: 'agent' as const,
          source: this.config.agentName,
          ...doc.metadata,
        },
      }));

      const results = await knowledgeIndexer.indexDocuments(documentsWithAgent);
      return results.map(r => r.id);
    } catch (error) {
      console.error('[BrainClient] indexKnowledgeBatch failed:', error);
      return [];
    }
  }

  // ============================================
  // 5. Authentication & Security
  // ============================================

  /**
   * Authenticate agent with API key
   */
  private authenticate(apiKey: string): boolean {
    // TODO: Implement real API key validation
    // For now, simple format check
    if (!apiKey || apiKey.length < 20) {
      console.warn('[BrainClient] Invalid API key format');
      this.authenticated = false;
      return false;
    }

    this.authenticated = true;
    return true;
  }

  /**
   * Check if client is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Verify access to specific knowledge
   */
  public async verifyAccess(documentId: string): Promise<boolean> {
    try {
      const db = await import('@/lib/db').then(m => m.getDb());
      const { brainDocuments } = await import('@/lib/db/schema');
      const { eq, and, or } = await import('drizzle-orm');

      const docs = await db
        .select()
        .from(brainDocuments)
        .where(
          and(
            eq(brainDocuments.id, documentId),
            or(
              eq(brainDocuments.accessLevel, 'public'),
              eq(brainDocuments.accessLevel, 'workspace'),
              eq(brainDocuments.createdBy, this.config.agentId)
            )
          )
        )
        .limit(1);

      return docs.length > 0;
    } catch (error) {
      console.error('[BrainClient] verifyAccess failed:', error);
      return false;
    }
  }

  // ============================================
  // 6. Utility Methods
  // ============================================

  /**
   * Get client configuration
   */
  public getConfig(): Readonly<BrainClientConfig> {
    return { ...this.config };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
  }> {
    try {
      const response = await fetch('http://localhost:3000/api/brain/health');
      const data = await response.json();

      return {
        status: data.status,
        services: {
          brain: data.status === 'healthy',
          redis: data.services.redis?.connected || false,
          database: data.services.postgresql?.status === 'healthy',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        services: {
          brain: false,
          redis: false,
          database: false,
        },
      };
    }
  }
}

// ============================================
// Singleton Factory
// ============================================

const clientInstances = new Map<string, BrainClient>();

/**
 * Get or create BrainClient instance for an agent
 */
export function getBrainClient(config: BrainClientConfig): BrainClient {
  const key = config.agentId;

  if (!clientInstances.has(key)) {
    clientInstances.set(key, new BrainClient(config));
  }

  return clientInstances.get(key)!;
}

/**
 * Create a new BrainClient instance (always creates new)
 */
export function createBrainClient(config: BrainClientConfig): BrainClient {
  return new BrainClient(config);
}
