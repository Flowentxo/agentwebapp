/**
 * Brain Database Service
 * Provides database persistence for Brain AI features
 * Replaces local storage with PostgreSQL + pgvector
 */

import { getDb } from '@/lib/db';
import { sql, eq, desc, and, ilike, or } from 'drizzle-orm';

// Types for Brain Documents
export interface BrainDocument {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  embedding?: number[];
  metadata: Record<string, unknown>;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentInput {
  workspaceId: string;
  userId: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult extends BrainDocument {
  similarity: number;
}

// Types for Business Ideas
export interface BusinessIdea {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description: string;
  category: 'efficiency' | 'revenue' | 'growth' | 'innovation';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  status: 'new' | 'in_progress' | 'implemented' | 'archived';
  votes: number;
  votedBy: string[];
  steps: string[];
  metrics: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Types for Learning Progress
export interface LearningProgress {
  id: string;
  userId: string;
  workspaceId: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  feedback: string;
  streakDay: number;
  createdAt: Date;
}

class BrainDatabaseService {
  private static instance: BrainDatabaseService;

  private constructor() {}

  public static getInstance(): BrainDatabaseService {
    if (!BrainDatabaseService.instance) {
      BrainDatabaseService.instance = new BrainDatabaseService();
    }
    return BrainDatabaseService.instance;
  }

  // ==================== Document Management ====================

  /**
   * Store a document with optional embedding
   */
  async storeDocument(input: CreateDocumentInput): Promise<BrainDocument> {
    const db = getDb();

    const tokenCount = Math.ceil(input.content.length / 4);
    const embeddingValue = input.embedding
      ? `[${input.embedding.join(',')}]`
      : null;

    const result = await db.execute(sql`
      INSERT INTO brain_documents (
        workspace_id, created_by, title, content,
        metadata, embedding, token_count, access_level
      ) VALUES (
        ${input.workspaceId},
        ${input.userId},
        ${input.title},
        ${input.content},
        ${JSON.stringify({
          category: input.category || 'general',
          tags: input.tags || [],
          ...input.metadata
        })}::jsonb,
        ${embeddingValue}::vector,
        ${tokenCount},
        'workspace'
      )
      RETURNING *
    `);

    const row = (result.rows as Record<string, unknown>[])[0];
    return this.mapRowToDocument(row);
  }

  /**
   * Get all documents for a workspace
   */
  async getDocuments(workspaceId: string, userId?: string, limit = 50): Promise<BrainDocument[]> {
    const db = getDb();

    let query = sql`
      SELECT * FROM brain_documents
      WHERE workspace_id = ${workspaceId}
      AND is_active = true
    `;

    if (userId) {
      query = sql`${query} AND created_by = ${userId}`;
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;

    const result = await db.execute(query);
    return (result.rows as Record<string, unknown>[]).map(row => this.mapRowToDocument(row));
  }

  /**
   * Semantic search using pgvector
   */
  async semanticSearch(
    workspaceId: string,
    queryEmbedding: number[],
    limit = 5
  ): Promise<SearchResult[]> {
    const db = getDb();

    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const result = await db.execute(sql`
      SELECT
        *,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM brain_documents
      WHERE workspace_id = ${workspaceId}
        AND is_active = true
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

    return (result.rows as Record<string, unknown>[]).map(row => ({
      ...this.mapRowToDocument(row),
      similarity: Number(row.similarity) || 0
    }));
  }

  /**
   * Hybrid search (semantic + fulltext)
   * @param filterDocumentIds - Optional list of document IDs to restrict search to
   */
  async hybridSearch(
    workspaceId: string,
    query: string,
    queryEmbedding?: number[],
    limit = 10,
    filterDocumentIds?: string[]
  ): Promise<SearchResult[]> {
    const db = getDb();

    // Build document filter clause
    const hasFilter = filterDocumentIds && filterDocumentIds.length > 0;
    const filterClause = hasFilter
      ? sql`AND id = ANY(${filterDocumentIds}::uuid[])`
      : sql``;

    // If we have an embedding, do hybrid search
    if (queryEmbedding && queryEmbedding.length > 0) {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      const result = await db.execute(sql`
        WITH semantic_results AS (
          SELECT
            id,
            1 - (embedding <=> ${embeddingStr}::vector) as semantic_score
          FROM brain_documents
          WHERE workspace_id = ${workspaceId}
            AND is_active = true
            AND embedding IS NOT NULL
            ${filterClause}
        ),
        fulltext_results AS (
          SELECT
            id,
            ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as fulltext_score
          FROM brain_documents
          WHERE workspace_id = ${workspaceId}
            AND is_active = true
            ${filterClause}
        )
        SELECT
          d.*,
          COALESCE(s.semantic_score, 0) * 0.7 + COALESCE(f.fulltext_score, 0) * 0.3 as similarity
        FROM brain_documents d
        LEFT JOIN semantic_results s ON d.id = s.id
        LEFT JOIN fulltext_results f ON d.id = f.id
        WHERE d.workspace_id = ${workspaceId}
          AND d.is_active = true
          ${filterClause}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return (result.rows as Record<string, unknown>[]).map(row => ({
        ...this.mapRowToDocument(row),
        similarity: Number(row.similarity) || 0
      }));
    }

    // Fallback to fulltext only
    return this.fulltextSearch(workspaceId, query, limit, filterDocumentIds);
  }

  /**
   * Fulltext search fallback
   * @param filterDocumentIds - Optional list of document IDs to restrict search to
   */
  async fulltextSearch(
    workspaceId: string,
    query: string,
    limit = 10,
    filterDocumentIds?: string[]
  ): Promise<SearchResult[]> {
    const db = getDb();

    // Build document filter clause
    const hasFilter = filterDocumentIds && filterDocumentIds.length > 0;
    const filterClause = hasFilter
      ? sql`AND id = ANY(${filterDocumentIds}::uuid[])`
      : sql``;

    const result = await db.execute(sql`
      SELECT
        *,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as similarity
      FROM brain_documents
      WHERE workspace_id = ${workspaceId}
        AND is_active = true
        ${filterClause}
        AND (
          to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
          OR title ILIKE ${'%' + query + '%'}
        )
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return (result.rows as Record<string, unknown>[]).map(row => ({
      ...this.mapRowToDocument(row),
      similarity: Number(row.similarity) || 0
    }));
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, workspaceId: string): Promise<boolean> {
    const db = getDb();

    await db.execute(sql`
      UPDATE brain_documents
      SET is_active = false, updated_at = NOW()
      WHERE id = ${documentId}::uuid
      AND workspace_id = ${workspaceId}
    `);

    return true;
  }

  // ==================== Business Ideas ====================

  /**
   * Store a business idea
   */
  async storeIdea(idea: Omit<BusinessIdea, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessIdea> {
    const db = getDb();

    // Check if business_ideas table exists, create if not
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_ideas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        impact VARCHAR(20) NOT NULL,
        effort VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        votes INTEGER NOT NULL DEFAULT 0,
        voted_by JSONB NOT NULL DEFAULT '[]',
        steps JSONB NOT NULL DEFAULT '[]',
        metrics JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await db.execute(sql`
      INSERT INTO business_ideas (
        workspace_id, user_id, title, description,
        category, impact, effort, status, votes, voted_by, steps, metrics
      ) VALUES (
        ${idea.workspaceId},
        ${idea.userId},
        ${idea.title},
        ${idea.description},
        ${idea.category},
        ${idea.impact},
        ${idea.effort},
        ${idea.status || 'new'},
        ${idea.votes || 0},
        ${JSON.stringify(idea.votedBy || [])}::jsonb,
        ${JSON.stringify(idea.steps || [])}::jsonb,
        ${JSON.stringify(idea.metrics || [])}::jsonb
      )
      RETURNING *
    `);

    return this.mapRowToIdea((result.rows as Record<string, unknown>[])[0]);
  }

  /**
   * Get ideas for a workspace
   */
  async getIdeas(workspaceId: string, limit = 50): Promise<BusinessIdea[]> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT * FROM business_ideas
        WHERE workspace_id = ${workspaceId}
        ORDER BY votes DESC, created_at DESC
        LIMIT ${limit}
      `);

      return (result.rows as Record<string, unknown>[]).map(row => this.mapRowToIdea(row));
    } catch {
      // Table doesn't exist yet
      return [];
    }
  }

  /**
   * Vote on an idea
   */
  async voteOnIdea(ideaId: string, userId: string, workspaceId: string): Promise<BusinessIdea | null> {
    const db = getDb();

    // Check if user already voted
    const existing = await db.execute(sql`
      SELECT voted_by FROM business_ideas
      WHERE id = ${ideaId}::uuid AND workspace_id = ${workspaceId}
    `);

    if (!existing.rows[0]) return null;

    const votedBy = (existing.rows[0] as Record<string, unknown>).voted_by as string[];

    if (votedBy.includes(userId)) {
      // Remove vote
      const result = await db.execute(sql`
        UPDATE business_ideas
        SET
          votes = votes - 1,
          voted_by = voted_by - ${userId},
          updated_at = NOW()
        WHERE id = ${ideaId}::uuid AND workspace_id = ${workspaceId}
        RETURNING *
      `);
      return this.mapRowToIdea((result.rows as Record<string, unknown>[])[0]);
    } else {
      // Add vote
      const result = await db.execute(sql`
        UPDATE business_ideas
        SET
          votes = votes + 1,
          voted_by = voted_by || ${JSON.stringify([userId])}::jsonb,
          updated_at = NOW()
        WHERE id = ${ideaId}::uuid AND workspace_id = ${workspaceId}
        RETURNING *
      `);
      return this.mapRowToIdea((result.rows as Record<string, unknown>[])[0]);
    }
  }

  // ==================== Learning Progress ====================

  /**
   * Store learning progress
   */
  async storeLearningProgress(progress: Omit<LearningProgress, 'id' | 'createdAt'>): Promise<LearningProgress> {
    const db = getDb();

    // Ensure table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        question_id VARCHAR(255) NOT NULL,
        answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT false,
        feedback TEXT,
        streak_day INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await db.execute(sql`
      INSERT INTO learning_progress (
        user_id, workspace_id, question_id, answer, is_correct, feedback, streak_day
      ) VALUES (
        ${progress.userId},
        ${progress.workspaceId},
        ${progress.questionId},
        ${progress.answer},
        ${progress.isCorrect},
        ${progress.feedback},
        ${progress.streakDay}
      )
      RETURNING *
    `);

    const row = (result.rows as Record<string, unknown>[])[0];
    return {
      id: String(row.id),
      userId: String(row.user_id),
      workspaceId: String(row.workspace_id),
      questionId: String(row.question_id),
      answer: String(row.answer),
      isCorrect: Boolean(row.is_correct),
      feedback: String(row.feedback || ''),
      streakDay: Number(row.streak_day),
      createdAt: new Date(row.created_at as string)
    };
  }

  /**
   * Get user's learning streak
   */
  async getLearningStreak(userId: string, workspaceId: string): Promise<{ currentStreak: number; totalAnswered: number; correctRate: number }> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
          MAX(streak_day) as max_streak
        FROM learning_progress
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      `);

      const row = (result.rows as Record<string, unknown>[])[0];
      const total = Number(row.total) || 0;
      const correct = Number(row.correct) || 0;

      return {
        currentStreak: Number(row.max_streak) || 0,
        totalAnswered: total,
        correctRate: total > 0 ? (correct / total) * 100 : 0
      };
    } catch {
      return { currentStreak: 0, totalAnswered: 0, correctRate: 0 };
    }
  }

  // ==================== Brain Memories ====================

  /**
   * Store a memory with context
   */
  async storeMemory(memory: {
    agentId: string;
    memoryType: string;
    content: Record<string, unknown>;
    context?: Record<string, unknown>;
    tags?: string[];
    importance?: number;
  }): Promise<{ id: string }> {
    const db = getDb();

    const result = await db.execute(sql`
      INSERT INTO brain_memories (
        agent_id, memory_type, content, context, tags, importance
      ) VALUES (
        ${memory.agentId},
        ${memory.memoryType},
        ${JSON.stringify(memory.content)}::jsonb,
        ${JSON.stringify(memory.context || {})}::jsonb,
        ${JSON.stringify(memory.tags || [])}::jsonb,
        ${memory.importance || 5}
      )
      RETURNING id
    `);

    return { id: String((result.rows as Record<string, unknown>[])[0].id) };
  }

  /**
   * Get memories for an agent
   */
  async getMemories(agentId: string, limit = 20): Promise<Array<{
    id: string;
    memoryType: string;
    content: Record<string, unknown>;
    context: Record<string, unknown>;
    tags: string[];
    importance: number;
    createdAt: Date;
  }>> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT * FROM brain_memories
      WHERE agent_id = ${agentId}
      ORDER BY importance DESC, created_at DESC
      LIMIT ${limit}
    `);

    return (result.rows as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      memoryType: String(row.memory_type),
      content: row.content as Record<string, unknown>,
      context: row.context as Record<string, unknown>,
      tags: row.tags as string[],
      importance: Number(row.importance),
      createdAt: new Date(row.created_at as string)
    }));
  }

  // ==================== Query Logging ====================

  /**
   * Log a query for analytics
   */
  async logQuery(query: {
    workspaceId: string;
    userId: string;
    queryText: string;
    resultsCount: number;
    responseTimeMs: number;
  }): Promise<void> {
    const db = getDb();

    await db.execute(sql`
      INSERT INTO brain_query_logs (
        workspace_id, user_id, query_text, results_count, response_time_ms
      ) VALUES (
        ${query.workspaceId},
        ${query.userId},
        ${query.queryText},
        ${query.resultsCount},
        ${query.responseTimeMs}
      )
    `);
  }

  // ==================== Statistics ====================

  /**
   * Get workspace statistics
   */
  async getStats(workspaceId: string): Promise<{
    documentsCount: number;
    ideasCount: number;
    queriesCount: number;
    totalTokens: number;
  }> {
    const db = getDb();

    const docsResult = await db.execute(sql`
      SELECT COUNT(*) as count, COALESCE(SUM(token_count), 0) as tokens
      FROM brain_documents
      WHERE workspace_id = ${workspaceId} AND is_active = true
    `);

    let ideasCount = 0;
    try {
      const ideasResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM business_ideas WHERE workspace_id = ${workspaceId}
      `);
      ideasCount = Number((ideasResult.rows as Record<string, unknown>[])[0].count);
    } catch {
      // Table doesn't exist
    }

    let queriesCount = 0;
    try {
      const queriesResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM brain_query_logs WHERE workspace_id = ${workspaceId}
      `);
      queriesCount = Number((queriesResult.rows as Record<string, unknown>[])[0].count);
    } catch {
      // Table doesn't exist
    }

    const docRow = (docsResult.rows as Record<string, unknown>[])[0];

    return {
      documentsCount: Number(docRow.count) || 0,
      ideasCount,
      queriesCount,
      totalTokens: Number(docRow.tokens) || 0
    };
  }

  // ==================== Helper Methods ====================

  private mapRowToDocument(row: Record<string, unknown>): BrainDocument {
    const metadata = row.metadata as Record<string, unknown> || {};
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      userId: String(row.created_by),
      title: String(row.title),
      content: String(row.content),
      category: String(metadata.category || 'general'),
      tags: (metadata.tags as string[]) || [],
      metadata,
      tokenCount: Number(row.token_count) || 0,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }

  private mapRowToIdea(row: Record<string, unknown>): BusinessIdea {
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      userId: String(row.user_id),
      title: String(row.title),
      description: String(row.description),
      category: row.category as BusinessIdea['category'],
      impact: row.impact as BusinessIdea['impact'],
      effort: row.effort as BusinessIdea['effort'],
      status: (row.status as BusinessIdea['status']) || 'new',
      votes: Number(row.votes) || 0,
      votedBy: (row.voted_by as string[]) || [],
      steps: (row.steps as string[]) || [],
      metrics: (row.metrics as string[]) || [],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}

export const brainDbService = BrainDatabaseService.getInstance();