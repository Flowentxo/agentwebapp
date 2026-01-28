/**
 * Brain Service - RAG Query Interface with Hybrid Search
 * Combines vector search (70%) and full-text search (30%) for optimal retrieval
 * Provides context-aware query interface for agents and users
 */

import { getDb } from '@/lib/db';
import { brainDocuments, brainQueryLogs, type BrainDocument } from '@/lib/db/schema';
import { embeddingService } from './EmbeddingService';
import { contextManager } from './ContextManager';
import { sql, eq, and, desc, or } from 'drizzle-orm';

export interface QueryOptions {
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  searchType?: 'semantic' | 'hybrid' | 'fulltext';
  limit?: number;
  minSimilarity?: number;
  includeContext?: boolean;
  contextWeight?: number;
  filters?: {
    tags?: string[];
    category?: string;
    sourceType?: string;
  };
}

export interface QueryResult {
  documents: Array<BrainDocument & { similarity?: number; rank?: number }>;
  context?: string;
  suggestions?: string[];
  totalResults: number;
  searchType: string;
  responseTime: number;
}

export interface SuggestionOptions {
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  limit?: number;
  contextBased?: boolean;
}

export class BrainService {
  private static instance: BrainService;
  private db = getDb();

  // Hybrid search weights
  private semanticWeight: number = 0.7; // 70% vector similarity
  private fulltextWeight: number = 0.3; // 30% keyword match

  private constructor() {}

  public static getInstance(): BrainService {
    if (!BrainService.instance) {
      BrainService.instance = new BrainService();
    }
    return BrainService.instance;
  }

  /**
   * Query knowledge base with hybrid search
   */
  public async query(
    queryText: string,
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    const startTime = Date.now();

    const {
      workspaceId = 'default-workspace',
      userId,
      agentId,
      searchType = 'hybrid',
      limit = 10,
      minSimilarity = 0.6,
      includeContext = false,
      contextWeight = 0.2,
      filters,
    } = options;

    let documents: Array<BrainDocument & { similarity?: number; rank?: number }> = [];
    let context: string | undefined;

    // Get session context if needed
    if (includeContext && userId) {
      const sessionContexts = await contextManager.findSimilarContexts(queryText, {
        workspaceId,
        userId,
        limit: 3,
      });

      if (sessionContexts.length > 0) {
        context = this.assembleContext(sessionContexts);
      }
    }

    // Execute search based on type
    switch (searchType) {
      case 'semantic':
        documents = await this.semanticSearch(queryText, {
          workspaceId,
          limit,
          minSimilarity,
          filters,
        });
        break;

      case 'fulltext':
        documents = await this.fulltextSearch(queryText, {
          workspaceId,
          limit,
          filters,
        });
        break;

      case 'hybrid':
      default:
        documents = await this.hybridSearch(queryText, {
          workspaceId,
          limit,
          minSimilarity,
          filters,
        });
        break;
    }

    // Re-rank with context if available
    if (context && contextWeight > 0) {
      documents = this.reRankWithContext(documents, context, contextWeight);
    }

    const responseTime = Date.now() - startTime;

    // Log query for analytics
    this.logQuery(queryText, {
      workspaceId,
      userId,
      agentId,
      resultCount: documents.length,
      responseTime,
      searchType,
      topResultIds: documents.slice(0, 5).map(d => d.id),
    }).catch(err => console.error('[BrainService] Failed to log query:', err));

    // Generate suggestions
    const suggestions = await this.generateSuggestions(queryText, documents);

    return {
      documents,
      context,
      suggestions,
      totalResults: documents.length,
      searchType,
      responseTime,
    };
  }

  /**
   * Semantic search using vector similarity
   */
  private async semanticSearch(
    queryText: string,
    options: {
      workspaceId: string;
      limit: number;
      minSimilarity: number;
      filters?: QueryOptions['filters'];
    }
  ): Promise<Array<BrainDocument & { similarity: number }>> {
    const { workspaceId, limit, minSimilarity, filters } = options;

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(queryText);

    // Build filter conditions
    let filterConditions = '';
    if (filters?.tags && filters.tags.length > 0) {
      const tagsJson = JSON.stringify(filters.tags);
      filterConditions += sql` AND metadata->'tags' ?| ${tagsJson}`.toString();
    }
    if (filters?.category) {
      filterConditions += sql` AND metadata->>'category' = ${filters.category}`.toString();
    }
    if (filters?.sourceType) {
      filterConditions += sql` AND metadata->>'sourceType' = ${filters.sourceType}`.toString();
    }

    // Vector similarity search
    // Format embedding as PostgreSQL vector: [0.1,0.2,0.3,...]
    const embeddingString = `[${queryEmbedding.embedding.join(',')}]`;
    const results = await this.db.execute(sql`
      SELECT
        *,
        1 - (embedding <=> ${sql.raw(`'${embeddingString}'::vector`)}) as similarity
      FROM brain_documents
      WHERE
        workspace_id = ${workspaceId}
        AND is_active = true
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${sql.raw(`'${embeddingString}'::vector`)}) >= ${minSimilarity}
        ${sql.raw(filterConditions)}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return results.rows as any[];
  }

  /**
   * Full-text search using PostgreSQL tsvector
   */
  private async fulltextSearch(
    queryText: string,
    options: {
      workspaceId: string;
      limit: number;
      filters?: QueryOptions['filters'];
    }
  ): Promise<Array<BrainDocument & { rank: number }>> {
    const { workspaceId, limit, filters } = options;

    // Build filter conditions
    const conditions = [
      eq(brainDocuments.workspaceId, workspaceId),
      eq(brainDocuments.isActive, true),
    ];

    if (filters?.category) {
      conditions.push(sql`metadata->>'category' = ${filters.category}`);
    }

    // Full-text search with ranking
    const results = await this.db.execute(sql`
      SELECT
        *,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${queryText})) as rank
      FROM brain_documents
      WHERE
        workspace_id = ${workspaceId}
        AND is_active = true
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${queryText})
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return results.rows as any[];
  }

  /**
   * Hybrid search combining semantic and full-text (70/30 split)
   */
  private async hybridSearch(
    queryText: string,
    options: {
      workspaceId: string;
      limit: number;
      minSimilarity: number;
      filters?: QueryOptions['filters'];
    }
  ): Promise<Array<BrainDocument & { similarity?: number; rank?: number }>> {
    const { workspaceId, limit, minSimilarity, filters } = options;

    // Run both searches in parallel
    const [semanticResults, fulltextResults] = await Promise.all([
      this.semanticSearch(queryText, {
        workspaceId,
        limit: limit * 2,
        minSimilarity,
        filters,
      }),
      this.fulltextSearch(queryText, {
        workspaceId,
        limit: limit * 2,
        filters,
      }),
    ]);

    // Normalize scores to 0-1 range
    const maxSimilarity = Math.max(...semanticResults.map(r => r.similarity || 0), 0.001);
    const maxRank = Math.max(...fulltextResults.map(r => r.rank || 0), 0.001);

    // Create combined score map
    const scoreMap = new Map<string, { doc: BrainDocument; score: number }>();

    // Add semantic results
    for (const result of semanticResults) {
      const normalizedSimilarity = (result.similarity || 0) / maxSimilarity;
      const score = normalizedSimilarity * this.semanticWeight;

      scoreMap.set(result.id, {
        doc: result,
        score,
      });
    }

    // Add/merge fulltext results
    for (const result of fulltextResults) {
      const normalizedRank = (result.rank || 0) / maxRank;
      const fulltextScore = normalizedRank * this.fulltextWeight;

      const existing = scoreMap.get(result.id);
      if (existing) {
        // Combine scores
        existing.score += fulltextScore;
      } else {
        scoreMap.set(result.id, {
          doc: result,
          score: fulltextScore,
        });
      }
    }

    // Sort by combined score and return top results
    const combined = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        ...item.doc,
        similarity: item.score,
      }));

    return combined;
  }

  /**
   * Re-rank results using context relevance
   */
  private reRankWithContext(
    documents: Array<BrainDocument & { similarity?: number }>,
    context: string,
    contextWeight: number
  ): Array<BrainDocument & { similarity?: number }> {
    // Simple re-ranking: boost documents that mention context keywords
    const contextKeywords = this.extractKeywords(context);

    return documents.map(doc => {
      const contentLower = doc.content.toLowerCase();
      const keywordMatches = contextKeywords.filter(keyword =>
        contentLower.includes(keyword.toLowerCase())
      ).length;

      const contextBoost = (keywordMatches / contextKeywords.length) * contextWeight;
      const boostedScore = (doc.similarity || 0) + contextBoost;

      return {
        ...doc,
        similarity: Math.min(boostedScore, 1.0),
      };
    }).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction: get unique words > 3 chars
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    return Array.from(new Set(words));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
      'was', 'one', 'our', 'out', 'this', 'that', 'have', 'from', 'with',
    ]);
    return stopWords.has(word);
  }

  /**
   * Assemble context from multiple context snapshots
   */
  private assembleContext(contexts: any[]): string {
    return contexts
      .map(ctx => {
        const snapshot = ctx.contextSnapshot || {};
        return snapshot.summary || snapshot.intent || '';
      })
      .filter(Boolean)
      .join(' | ');
  }

  /**
   * Generate query suggestions based on results
   */
  private async generateSuggestions(
    queryText: string,
    documents: BrainDocument[]
  ): Promise<string[]> {
    if (documents.length === 0) return [];

    // Extract unique tags and topics from top documents
    const suggestions = new Set<string>();

    for (const doc of documents.slice(0, 5)) {
      const metadata = doc.metadata as any;
      if (metadata?.tags) {
        metadata.tags.forEach((tag: string) => suggestions.add(tag));
      }
      if (metadata?.category) {
        suggestions.add(metadata.category);
      }
    }

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Log query for analytics
   */
  private async logQuery(
    query: string,
    options: {
      workspaceId: string;
      userId?: string;
      agentId?: string;
      resultCount: number;
      responseTime: number;
      searchType: string;
      topResultIds: string[];
    }
  ): Promise<void> {
    const { workspaceId, userId, agentId, resultCount, responseTime, searchType, topResultIds } = options;

    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      await this.db.insert(brainQueryLogs).values({
        workspaceId,
        userId,
        agentId,
        query,
        queryEmbedding: queryEmbedding.embedding as any,
        resultCount,
        topResultIds: topResultIds as any,
        responseTime,
        metadata: {
          searchType,
        } as any,
      });
    } catch (error) {
      // Don't throw - logging is non-critical
      console.error('[BrainService] Query logging failed:', error);
    }
  }

  /**
   * Get popular queries for suggestions
   */
  public async getPopularQueries(options: SuggestionOptions = {}): Promise<string[]> {
    const { workspaceId = 'default-workspace', limit = 10 } = options;

    const results = await this.db.execute(sql`
      SELECT query, COUNT(*) as count
      FROM brain_query_logs
      WHERE workspace_id = ${workspaceId}
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT ${limit}
    `);

    return (results.rows as any[]).map(row => row.query);
  }

  /**
   * Get suggested topics based on user activity
   */
  public async getSuggestedTopics(options: SuggestionOptions = {}): Promise<string[]> {
    const { workspaceId = 'default-workspace', userId, limit = 10 } = options;

    let whereClause = sql`workspace_id = ${workspaceId} AND is_active = true`;
    if (userId) {
      whereClause = sql`${whereClause} AND created_by = ${userId}`;
    }

    const results = await this.db.execute(sql`
      SELECT DISTINCT jsonb_array_elements_text(metadata->'tags') as topic
      FROM brain_documents
      WHERE ${whereClause}
      LIMIT ${limit}
    `);

    return (results.rows as any[]).map(row => row.topic).filter(Boolean);
  }
}

export const brainService = BrainService.getInstance();
