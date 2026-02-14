/**
 * AgentMemoryService
 *
 * Persistent long-term memory for all AI agents.
 * Uses pgvector for semantic search via cosine similarity.
 * Falls back to text-based search if pgvector is not available.
 */

import { getDb, getPool } from '@/lib/db';
import { agentMemories, type AgentMemory, type NewAgentMemory } from '@/lib/db/schema-agent-memory';
import { embeddingService } from './EmbeddingService';
import { eq, and, desc, sql } from 'drizzle-orm';

export class AgentMemoryService {
  private vectorEnabled: boolean | null = null;

  /**
   * Check if pgvector embedding column exists
   */
  private async isVectorEnabled(): Promise<boolean> {
    if (this.vectorEnabled !== null) return this.vectorEnabled;

    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'agent_memories' AND column_name = 'embedding'`
      );
      this.vectorEnabled = result.rows.length > 0;
    } catch {
      this.vectorEnabled = false;
    }

    return this.vectorEnabled;
  }

  /**
   * Save a memory with optional embedding
   */
  async saveMemory(
    agentId: string,
    userId: string,
    content: string,
    category: string,
    source: string,
    tags?: string[],
    metadata?: Record<string, any>
  ): Promise<AgentMemory | null> {
    try {
      const db = getDb();
      const pool = getPool();
      const hasVector = await this.isVectorEnabled();

      // Insert base record via Drizzle
      const [record] = await db
        .insert(agentMemories)
        .values({
          agentId,
          userId,
          content,
          category,
          tags: tags || [],
          source,
          metadata: metadata || {},
          relevanceScore: 0,
          accessCount: 0,
        })
        .returning();

      // If vector is enabled, generate and store embedding
      if (hasVector && record) {
        try {
          const embedding = await embeddingService.generateEmbedding(content);
          const vectorStr = `[${embedding.join(',')}]`;
          await pool.query(
            `UPDATE agent_memories SET embedding = $1::vector WHERE id = $2`,
            [vectorStr, record.id]
          );
        } catch (embErr) {
          console.error('[AGENT_MEMORY] Embedding generation failed, record saved without vector:', embErr);
        }
      }

      console.log(`[AGENT_MEMORY] Saved: ${category}/${source} for ${agentId} (vector: ${hasVector})`);
      return record;
    } catch (error) {
      console.error('[AGENT_MEMORY] saveMemory failed:', error);
      return null;
    }
  }

  /**
   * Semantic search for memories relevant to a query
   * Uses cosine similarity with pgvector, falls back to text search
   */
  async searchMemories(
    agentId: string,
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<AgentMemory[]> {
    try {
      const hasVector = await this.isVectorEnabled();

      if (hasVector) {
        return this.vectorSearch(agentId, userId, query, limit);
      } else {
        return this.textSearch(agentId, userId, query, limit);
      }
    } catch (error) {
      console.error('[AGENT_MEMORY] searchMemories failed:', error);
      return [];
    }
  }

  /**
   * Cross-agent memory search (for Omni orchestrator)
   * Searches across ALL agents for a given user
   */
  async searchCrossAgentMemories(
    userId: string,
    query: string,
    limit: number = 5,
    agentFilter?: string
  ): Promise<(AgentMemory & { similarity?: number })[]> {
    try {
      const hasVector = await this.isVectorEnabled();
      const pool = getPool();

      if (hasVector) {
        const embedding = await embeddingService.generateEmbedding(query);
        const vectorStr = `[${embedding.join(',')}]`;

        const agentClause = agentFilter
          ? `AND agent_id = $3`
          : '';
        const params = agentFilter
          ? [userId, vectorStr, agentFilter, limit]
          : [userId, vectorStr, limit];
        const limitParam = agentFilter ? '$4' : '$3';

        const result = await pool.query(
          `SELECT *, 1 - (embedding <=> $2::vector) as similarity
           FROM agent_memories
           WHERE user_id = $1 ${agentClause}
             AND embedding IS NOT NULL
           ORDER BY embedding <=> $2::vector
           LIMIT ${limitParam}`,
          params
        );

        return result.rows;
      } else {
        // Fallback: text search across agents
        const db = getDb();
        const conditions = [eq(agentMemories.userId, userId)];
        if (agentFilter) {
          conditions.push(eq(agentMemories.agentId, agentFilter));
        }

        return db
          .select()
          .from(agentMemories)
          .where(and(...conditions))
          .orderBy(desc(agentMemories.createdAt))
          .limit(limit);
      }
    } catch (error) {
      console.error('[AGENT_MEMORY] searchCrossAgentMemories failed:', error);
      return [];
    }
  }

  /**
   * Get recent memories for an agent (no semantic search, just chronological)
   */
  async getRecentMemories(
    agentId: string,
    userId: string,
    limit: number = 10
  ): Promise<AgentMemory[]> {
    try {
      const db = getDb();
      return db
        .select()
        .from(agentMemories)
        .where(
          and(
            eq(agentMemories.agentId, agentId),
            eq(agentMemories.userId, userId)
          )
        )
        .orderBy(desc(agentMemories.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('[AGENT_MEMORY] getRecentMemories failed:', error);
      return [];
    }
  }

  /**
   * Increment access count when a memory is retrieved and used
   */
  async incrementAccessCount(memoryId: string): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(agentMemories)
        .set({
          accessCount: sql`${agentMemories.accessCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(agentMemories.id, memoryId));
    } catch (error) {
      console.error('[AGENT_MEMORY] incrementAccessCount failed:', error);
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<void> {
    try {
      const db = getDb();
      await db
        .delete(agentMemories)
        .where(eq(agentMemories.id, memoryId));
    } catch (error) {
      console.error('[AGENT_MEMORY] deleteMemory failed:', error);
    }
  }

  // ──────────────── Private Methods ────────────────

  /**
   * Vector-based semantic search using pgvector cosine distance
   */
  private async vectorSearch(
    agentId: string,
    userId: string,
    query: string,
    limit: number
  ): Promise<AgentMemory[]> {
    const pool = getPool();
    const embedding = await embeddingService.generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `SELECT id, content, agent_id as "agentId", user_id as "userId",
              category, tags, source, metadata,
              relevance_score as "relevanceScore",
              access_count as "accessCount",
              last_accessed_at as "lastAccessedAt",
              created_at as "createdAt",
              updated_at as "updatedAt",
              1 - (embedding <=> $3::vector) as similarity
       FROM agent_memories
       WHERE agent_id = $1 AND user_id = $2
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $3::vector
       LIMIT $4`,
      [agentId, userId, vectorStr, limit]
    );

    return result.rows;
  }

  /**
   * Fallback text-based search using ILIKE
   */
  private async textSearch(
    agentId: string,
    userId: string,
    query: string,
    limit: number
  ): Promise<AgentMemory[]> {
    const pool = getPool();
    const searchTerms = query.split(/\s+/).filter(t => t.length > 2).slice(0, 5);

    if (searchTerms.length === 0) {
      // No meaningful search terms — return recent
      return this.getRecentMemories(agentId, userId, limit);
    }

    // Build ILIKE conditions for each term
    const conditions = searchTerms
      .map((_, i) => `content ILIKE $${i + 3}`)
      .join(' OR ');
    const params = [
      agentId,
      userId,
      ...searchTerms.map(t => `%${t}%`),
      limit,
    ];

    const result = await pool.query(
      `SELECT id, content, agent_id as "agentId", user_id as "userId",
              category, tags, source, metadata,
              relevance_score as "relevanceScore",
              access_count as "accessCount",
              last_accessed_at as "lastAccessedAt",
              created_at as "createdAt",
              updated_at as "updatedAt"
       FROM agent_memories
       WHERE agent_id = $1 AND user_id = $2
         AND (${conditions})
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return result.rows;
  }
}

// Singleton
export const agentMemoryService = new AgentMemoryService();
