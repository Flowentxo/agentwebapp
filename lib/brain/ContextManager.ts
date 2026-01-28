/**
 * Context Manager - Session & Context Tracking
 * Manages conversation contexts, session states, and context snapshots
 * Uses Redis for ephemeral storage and PostgreSQL for persistence
 */

import { getDb } from '@/lib/db';
import { brainContexts, type NewBrainContext, type BrainContext } from '@/lib/db/schema';
import { embeddingService, EmbeddingService } from './EmbeddingService';
import { sql, eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

export interface SessionContext {
  sessionId: string;
  userId: string;
  agentId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  summary?: string;
  intent?: string;
  entities?: Record<string, any>;
  topics?: string[];
  keyPoints?: string[];
  metadata?: Record<string, any>;
}

export interface ContextSnapshot {
  id: string;
  sessionId: string;
  summary: string;
  embedding?: number[];
  relevanceScore: number;
  createdAt: Date;
}

export interface ContextQuery {
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  limit?: number;
  includeInactive?: boolean;
}

export class ContextManager {
  private static instance: ContextManager;
  private db = getDb();
  private sessionCache: Map<string, SessionContext> = new Map();
  private maxCacheSize: number = 100;

  private constructor() {
    // Start cleanup job for expired contexts
    this.startCleanupJob();
  }

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Create or update session context
   */
  public async upsertSessionContext(context: SessionContext): Promise<string> {
    const { sessionId, userId, agentId, messages, summary, intent, entities, topics, keyPoints, metadata } = context;

    // Generate summary if not provided
    const contextSummary = summary || this.generateSummary(messages);

    // Generate embedding for context summary
    const embedding = await embeddingService.generateEmbedding(contextSummary);

    // Calculate token count
    const tokenCount = messages.reduce((sum, msg) =>
      sum + EmbeddingService.estimateTokens(msg.content), 0
    );

    // Calculate relevance score based on recency and message count
    const relevanceScore = this.calculateRelevanceScore(messages);

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const contextSnapshot = {
      messages,
      summary: contextSummary,
      intent,
      entities,
      topics,
      keyPoints,
      metadata,
    };

    // Check if context already exists
    const existing = await this.db
      .select()
      .from(brainContexts)
      .where(
        and(
          eq(brainContexts.sessionId, sessionId),
          eq(brainContexts.isActive, true)
        )
      )
      .limit(1);

    let contextId: string;

    if (existing.length > 0) {
      // Update existing context
      const [updated] = await this.db
        .update(brainContexts)
        .set({
          contextSnapshot: contextSnapshot as any,
          embedding: embedding.embedding as any,
          relevanceScore,
          tokenCount,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(brainContexts.id, existing[0].id))
        .returning();

      contextId = updated.id;
    } else {
      // Create new context
      const [created] = await this.db
        .insert(brainContexts)
        .values({
          sessionId,
          userId,
          agentId,
          contextType: 'conversation',
          contextSnapshot: contextSnapshot as any,
          embedding: embedding.embedding as any,
          relevanceScore,
          tokenCount,
          expiresAt,
        })
        .returning();

      contextId = created.id;
    }

    // Update cache
    this.cacheSession(sessionId, context);

    console.log(`[ContextManager] Context upserted: ${contextId}`);
    return contextId;
  }

  /**
   * Get session context from cache or DB
   */
  public async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    // Check cache first
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    // Query from DB
    const contexts = await this.db
      .select()
      .from(brainContexts)
      .where(
        and(
          eq(brainContexts.sessionId, sessionId),
          eq(brainContexts.isActive, true)
        )
      )
      .orderBy(desc(brainContexts.createdAt))
      .limit(1);

    if (contexts.length === 0) {
      return null;
    }

    const context = contexts[0];
    const snapshot = context.contextSnapshot as any;

    const sessionContext: SessionContext = {
      sessionId,
      userId: context.userId,
      agentId: context.agentId || undefined,
      messages: snapshot.messages || [],
      summary: snapshot.summary,
      intent: snapshot.intent,
      entities: snapshot.entities,
      topics: snapshot.topics,
      keyPoints: snapshot.keyPoints,
      metadata: snapshot.metadata,
    };

    // Cache it
    this.cacheSession(sessionId, sessionContext);

    return sessionContext;
  }

  /**
   * Query contexts with filters
   */
  public async queryContexts(query: ContextQuery): Promise<BrainContext[]> {
    const { workspaceId, userId, agentId, sessionId, limit = 10, includeInactive = false } = query;

    let conditions = [];

    if (workspaceId) {
      conditions.push(eq(brainContexts.workspaceId, workspaceId));
    }
    if (userId) {
      conditions.push(eq(brainContexts.userId, userId));
    }
    if (agentId) {
      conditions.push(eq(brainContexts.agentId, agentId));
    }
    if (sessionId) {
      conditions.push(eq(brainContexts.sessionId, sessionId));
    }
    if (!includeInactive) {
      conditions.push(eq(brainContexts.isActive, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.db
      .select()
      .from(brainContexts)
      .where(whereClause)
      .orderBy(desc(brainContexts.createdAt))
      .limit(limit);

    return results;
  }

  /**
   * Find similar contexts using vector similarity
   */
  public async findSimilarContexts(
    query: string,
    options: {
      workspaceId?: string;
      userId?: string;
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<Array<BrainContext & { similarity: number }>> {
    const { workspaceId = 'default-workspace', userId, limit = 5, minSimilarity = 0.7 } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Build query conditions
      const conditions = [
        eq(brainContexts.workspaceId, workspaceId),
        eq(brainContexts.isActive, true),
      ];

      if (userId) {
        conditions.push(eq(brainContexts.userId, userId));
      }

      // Vector similarity search
      const results = await this.db.execute(sql`
        SELECT
          *,
          1 - (embedding <=> ${queryEmbedding.embedding}::vector) as similarity
        FROM brain_contexts
        WHERE
          workspace_id = ${workspaceId}
          AND is_active = true
          ${userId ? sql`AND user_id = ${userId}` : sql``}
          AND 1 - (embedding <=> ${queryEmbedding.embedding}::vector) >= ${minSimilarity}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return results.rows as any[];
    } catch (error) {
      console.warn('[ContextManager] Vector search failed, falling back to recent contexts:', error);

      // Fallback: Return most recent contexts without vector similarity
      const conditions = [
        eq(brainContexts.workspaceId, workspaceId),
        eq(brainContexts.isActive, true),
      ];

      if (userId) {
        conditions.push(eq(brainContexts.userId, userId));
      }

      const results = await this.db
        .select()
        .from(brainContexts)
        .where(and(...conditions))
        .orderBy(desc(brainContexts.createdAt))
        .limit(limit);

      // Add a default similarity score
      return results.map(ctx => ({ ...ctx, similarity: 0.5 }));
    }
  }

  /**
   * Archive old or inactive contexts
   */
  public async archiveContext(contextId: string): Promise<boolean> {
    const result = await this.db
      .update(brainContexts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(brainContexts.id, contextId))
      .returning();

    return result.length > 0;
  }

  /**
   * Delete expired contexts (cleanup job)
   */
  public async cleanupExpiredContexts(): Promise<number> {
    const now = new Date();

    const result = await this.db
      .delete(brainContexts)
      .where(
        and(
          sql`${brainContexts.expiresAt} IS NOT NULL`,
          sql`${brainContexts.expiresAt} < ${now}`
        )
      )
      .returning();

    if (result.length > 0) {
      console.log(`[ContextManager] Cleaned up ${result.length} expired contexts`);
    }

    return result.length;
  }

  /**
   * Generate summary from messages
   */
  private generateSummary(messages: SessionContext['messages']): string {
    if (messages.length === 0) return '';

    // Simple extractive summary: last 3 messages
    const recentMessages = messages.slice(-3);
    const summary = recentMessages
      .map(msg => `${msg.role}: ${msg.content.slice(0, 100)}`)
      .join(' | ');

    return summary;
  }

  /**
   * Calculate relevance score based on recency and activity
   */
  private calculateRelevanceScore(messages: SessionContext['messages']): number {
    if (messages.length === 0) return 0;

    // Factors:
    // - Message count (0-40 points)
    // - Recency (0-60 points)

    const messageScore = Math.min(messages.length * 2, 40);

    const now = Date.now();
    const lastMessage = new Date(messages[messages.length - 1].timestamp).getTime();
    const ageInHours = (now - lastMessage) / (1000 * 60 * 60);

    // Decay: 60 points at 0 hours, 0 points at 168 hours (7 days)
    const recencyScore = Math.max(0, 60 * (1 - ageInHours / 168));

    return Math.round(messageScore + recencyScore);
  }

  /**
   * Cache session with LRU eviction
   */
  private cacheSession(sessionId: string, context: SessionContext): void {
    if (this.sessionCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.sessionCache.keys().next().value;
      if (firstKey) {
        this.sessionCache.delete(firstKey);
      }
    }
    this.sessionCache.set(sessionId, context);
  }

  /**
   * Clear session cache
   */
  public clearCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Start cleanup job (runs every hour)
   */
  private startCleanupJob(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredContexts().catch(error => {
        console.error('[ContextManager] Cleanup job failed:', error);
      });
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup after 5 minutes
    setTimeout(() => {
      this.cleanupExpiredContexts().catch(error => {
        console.error('[ContextManager] Initial cleanup failed:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.sessionCache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

export const contextManager = ContextManager.getInstance();
