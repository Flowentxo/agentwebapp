/**
 * PHASE 3: Cassie Knowledge Base Service - Production-Ready
 * Implements real pgvector-based semantic search for Knowledge Base
 */

import { getDb } from '@/lib/db';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { kbChunks, kbEntries, kbRevisions, knowledgeBases } from '@/lib/db/schema';
import { embeddingService } from '@/lib/agents/shared/EmbeddingService';
import { redisCache } from '@/lib/brain/RedisCache';

export interface KBSearchResult {
  id: string;
  entryId: string;
  title: string;
  content: string;
  score: number;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface KBEntry {
  id: string;
  kbId: string;
  title: string;
  content: string;
  status: string;
  category?: string;
  tags: string[];
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  tags: string[];
  relevanceScore: number;
}

/**
 * Knowledge Base Service
 * Provides real semantic search using pgvector
 */
export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;
  private db = getDb();
  private cachePrefix = 'cassie:kb';
  private cacheTTL = 600; // 10 minutes
  private similarityThreshold = 0.5;
  private maxResults = 10;

  private constructor() {}

  public static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  // ============================================
  // SEMANTIC SEARCH
  // ============================================

  /**
   * Search Knowledge Base using semantic similarity
   */
  public async semanticSearch(
    query: string,
    kbId?: string,
    options: {
      limit?: number;
      threshold?: number;
      categories?: string[];
      tags?: string[];
    } = {}
  ): Promise<KBSearchResult[]> {
    const limit = options.limit || this.maxResults;
    const threshold = options.threshold || this.similarityThreshold;

    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Build the similarity search query using pgvector
      // Using cosine similarity: 1 - (embedding <=> query_embedding)
      const embeddingArray = `[${queryEmbedding.embedding.join(',')}]`;

      let searchQuery = this.db
        .select({
          chunkId: kbChunks.id,
          entryId: kbChunks.revisionId,
          text: kbChunks.text,
          meta: kbChunks.meta,
          similarity: sql<number>`1 - (embedding <=> '${sql.raw(embeddingArray)}'::vector)`,
        })
        .from(kbChunks)
        .where(
          and(
            sql`embedding IS NOT NULL`,
            eq(kbChunks.isDeleted, false),
            sql`1 - (embedding <=> '${sql.raw(embeddingArray)}'::vector) > ${threshold}`
          )
        )
        .orderBy(sql`embedding <=> '${sql.raw(embeddingArray)}'::vector`)
        .limit(limit);

      const chunks = await searchQuery;

      if (chunks.length === 0) {
        console.log('[KnowledgeBaseService] No results found via semantic search, falling back to keyword search');
        return this.keywordSearch(query, kbId, { limit });
      }

      // Enrich results with entry details
      const results: KBSearchResult[] = [];

      for (const chunk of chunks) {
        // Get entry details
        const revision = await this.db
          .select({
            entryId: kbRevisions.entryId,
          })
          .from(kbRevisions)
          .where(eq(kbRevisions.id, chunk.entryId))
          .limit(1);

        if (revision.length > 0) {
          const entry = await this.db
            .select({
              id: kbEntries.id,
              title: kbEntries.title,
              category: kbEntries.category,
              tags: kbEntries.tags,
            })
            .from(kbEntries)
            .where(eq(kbEntries.id, revision[0].entryId))
            .limit(1);

          if (entry.length > 0) {
            // Apply category/tag filters if provided
            if (options.categories?.length && !options.categories.includes(entry[0].category || '')) {
              continue;
            }
            if (options.tags?.length) {
              const entryTags = entry[0].tags as string[];
              if (!options.tags.some(t => entryTags.includes(t))) {
                continue;
              }
            }

            results.push({
              id: chunk.chunkId,
              entryId: entry[0].id,
              title: entry[0].title,
              content: chunk.text,
              score: chunk.similarity,
              category: entry[0].category || undefined,
              tags: entry[0].tags as string[],
              metadata: chunk.meta as Record<string, unknown>,
            });
          }
        }
      }

      console.log(`[KnowledgeBaseService] Found ${results.length} results for query: "${query.substring(0, 50)}..."`);
      return results;
    } catch (error) {
      console.error('[KnowledgeBaseService] semanticSearch error:', error);
      // Fallback to keyword search
      return this.keywordSearch(query, kbId, { limit });
    }
  }

  /**
   * Keyword-based search as fallback
   */
  public async keywordSearch(
    query: string,
    kbId?: string,
    options: { limit?: number } = {}
  ): Promise<KBSearchResult[]> {
    const limit = options.limit || this.maxResults;

    try {
      // Split query into words for better matching
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      if (words.length === 0) {
        return [];
      }

      // Build search conditions
      const searchConditions = words.map(word =>
        or(
          ilike(kbChunks.text, `%${word}%`),
          sql`meta->>'heading' ILIKE ${'%' + word + '%'}`
        )
      );

      const chunks = await this.db
        .select({
          chunkId: kbChunks.id,
          revisionId: kbChunks.revisionId,
          text: kbChunks.text,
          meta: kbChunks.meta,
        })
        .from(kbChunks)
        .where(
          and(
            eq(kbChunks.isDeleted, false),
            or(...searchConditions)
          )
        )
        .limit(limit * 2); // Get more and rank

      // Calculate relevance score based on word matches
      const scoredResults = chunks.map(chunk => {
        const textLower = chunk.text.toLowerCase();
        const matchCount = words.filter(word => textLower.includes(word)).length;
        const score = matchCount / words.length;

        return { ...chunk, score };
      });

      // Sort by score and limit
      scoredResults.sort((a, b) => b.score - a.score);
      const topResults = scoredResults.slice(0, limit);

      // Enrich with entry details
      const results: KBSearchResult[] = [];

      for (const chunk of topResults) {
        const revision = await this.db
          .select({ entryId: kbRevisions.entryId })
          .from(kbRevisions)
          .where(eq(kbRevisions.id, chunk.revisionId))
          .limit(1);

        if (revision.length > 0) {
          const entry = await this.db
            .select({
              id: kbEntries.id,
              title: kbEntries.title,
              category: kbEntries.category,
              tags: kbEntries.tags,
            })
            .from(kbEntries)
            .where(eq(kbEntries.id, revision[0].entryId))
            .limit(1);

          if (entry.length > 0) {
            results.push({
              id: chunk.chunkId,
              entryId: entry[0].id,
              title: entry[0].title,
              content: chunk.text,
              score: chunk.score,
              category: entry[0].category || undefined,
              tags: entry[0].tags as string[],
              metadata: chunk.meta as Record<string, unknown>,
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('[KnowledgeBaseService] keywordSearch error:', error);
      return [];
    }
  }

  // ============================================
  // ARTICLE MANAGEMENT
  // ============================================

  /**
   * Get articles by category
   */
  public async getArticlesByCategory(
    category: string,
    limit: number = 10
  ): Promise<KBArticle[]> {
    const cacheKey = `${this.cachePrefix}:category:${category}:${limit}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached as KBArticle[];

    try {
      const entries = await this.db
        .select({
          id: kbEntries.id,
          title: kbEntries.title,
          category: kbEntries.category,
          tags: kbEntries.tags,
          currentRevisionId: kbEntries.currentRevisionId,
        })
        .from(kbEntries)
        .where(
          and(
            eq(kbEntries.category, category),
            eq(kbEntries.status, 'published')
          )
        )
        .orderBy(desc(kbEntries.updatedAt))
        .limit(limit);

      const articles: KBArticle[] = [];

      for (const entry of entries) {
        if (entry.currentRevisionId) {
          const revision = await this.db
            .select({ contentMd: kbRevisions.contentMd })
            .from(kbRevisions)
            .where(eq(kbRevisions.id, entry.currentRevisionId))
            .limit(1);

          if (revision.length > 0) {
            articles.push({
              id: entry.id,
              title: entry.title,
              content: revision[0].contentMd,
              summary: revision[0].contentMd.substring(0, 200) + '...',
              category: entry.category || undefined,
              tags: entry.tags as string[],
              relevanceScore: 1,
            });
          }
        }
      }

      await redisCache.set(cacheKey, articles, { ttl: this.cacheTTL });
      return articles;
    } catch (error) {
      console.error('[KnowledgeBaseService] getArticlesByCategory error:', error);
      return [];
    }
  }

  /**
   * Get article by ID
   */
  public async getArticle(entryId: string): Promise<KBArticle | null> {
    const cacheKey = `${this.cachePrefix}:article:${entryId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached as KBArticle;

    try {
      const entry = await this.db
        .select()
        .from(kbEntries)
        .where(eq(kbEntries.id, entryId))
        .limit(1);

      if (entry.length === 0) return null;

      const revision = entry[0].currentRevisionId
        ? await this.db
            .select()
            .from(kbRevisions)
            .where(eq(kbRevisions.id, entry[0].currentRevisionId))
            .limit(1)
        : [];

      const article: KBArticle = {
        id: entry[0].id,
        title: entry[0].title,
        content: revision[0]?.contentMd || '',
        summary: revision[0]?.contentMd?.substring(0, 200) + '...',
        category: entry[0].category || undefined,
        tags: entry[0].tags as string[],
        relevanceScore: 1,
      };

      await redisCache.set(cacheKey, article, { ttl: this.cacheTTL });
      return article;
    } catch (error) {
      console.error('[KnowledgeBaseService] getArticle error:', error);
      return null;
    }
  }

  // ============================================
  // INDEXING
  // ============================================

  /**
   * Index an article for semantic search
   */
  public async indexArticle(
    entryId: string,
    revisionId: string,
    content: string
  ): Promise<boolean> {
    try {
      // Split content into chunks
      const chunks = this.splitIntoChunks(content);

      console.log(`[KnowledgeBaseService] Indexing ${chunks.length} chunks for entry ${entryId}`);

      // Generate embeddings for all chunks
      const embeddings = await embeddingService.generateEmbeddings(
        chunks.map(c => c.text),
        (completed, total) => {
          console.log(`[KnowledgeBaseService] Embedding progress: ${completed}/${total}`);
        }
      );

      // Mark existing chunks as deleted
      await this.db
        .update(kbChunks)
        .set({ isDeleted: true })
        .where(eq(kbChunks.revisionId, revisionId));

      // Insert new chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        await this.db.insert(kbChunks).values({
          revisionId,
          idx: i,
          text: chunks[i].text,
          tokens: Math.ceil(chunks[i].text.length / 4),
          embedding: embeddings.embeddings[i],
          meta: {
            heading: chunks[i].heading,
            section: chunks[i].section,
          },
        });
      }

      console.log(`[KnowledgeBaseService] Successfully indexed ${chunks.length} chunks`);

      // Clear cache
      await redisCache.delete(`${this.cachePrefix}:article:${entryId}`);

      return true;
    } catch (error) {
      console.error('[KnowledgeBaseService] indexArticle error:', error);
      return false;
    }
  }

  /**
   * Split content into chunks for embedding
   */
  private splitIntoChunks(
    content: string,
    maxChunkSize: number = 500,
    overlap: number = 50
  ): Array<{ text: string; heading?: string; section?: string }> {
    const chunks: Array<{ text: string; heading?: string; section?: string }> = [];

    // Split by headings first
    const sections = content.split(/^(#{1,3}\s+.+)$/gm);
    let currentHeading = '';
    let currentSection = '';

    for (const section of sections) {
      if (section.startsWith('#')) {
        currentHeading = section.replace(/^#+\s+/, '').trim();
        currentSection = section;
        continue;
      }

      // Split section into paragraphs
      const paragraphs = section.split(/\n\n+/);

      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) continue;

        // If paragraph is short enough, use as is
        if (trimmed.length <= maxChunkSize) {
          chunks.push({
            text: trimmed,
            heading: currentHeading,
            section: currentSection,
          });
        } else {
          // Split longer paragraphs with overlap
          const words = trimmed.split(/\s+/);
          let currentChunk: string[] = [];
          let currentLength = 0;

          for (const word of words) {
            if (currentLength + word.length + 1 > maxChunkSize && currentChunk.length > 0) {
              chunks.push({
                text: currentChunk.join(' '),
                heading: currentHeading,
                section: currentSection,
              });

              // Keep last few words for overlap
              const overlapWords = Math.ceil(overlap / 5);
              currentChunk = currentChunk.slice(-overlapWords);
              currentLength = currentChunk.join(' ').length;
            }

            currentChunk.push(word);
            currentLength += word.length + 1;
          }

          if (currentChunk.length > 0) {
            chunks.push({
              text: currentChunk.join(' '),
              heading: currentHeading,
              section: currentSection,
            });
          }
        }
      }
    }

    return chunks;
  }

  // ============================================
  // RESPONSE GENERATION
  // ============================================

  /**
   * Generate a response suggestion based on KB search
   */
  public async generateResponseSuggestion(
    query: string,
    context?: {
      ticketCategory?: string;
      customerTier?: string;
      previousMessages?: string[];
    }
  ): Promise<{
    suggestedResponse: string;
    sources: KBSearchResult[];
    confidence: number;
  }> {
    // Search for relevant articles
    const results = await this.semanticSearch(query, undefined, {
      limit: 5,
      threshold: 0.6,
    });

    if (results.length === 0) {
      return {
        suggestedResponse: '',
        sources: [],
        confidence: 0,
      };
    }

    // Combine top results into a suggested response
    const topResult = results[0];
    const additionalContext = results.slice(1, 3).map(r => r.content).join('\n\n');

    // Calculate confidence based on scores
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const confidence = Math.min(avgScore * 1.2, 1); // Slight boost, cap at 1

    // Build suggested response
    let suggestedResponse = topResult.content;

    // Truncate if too long
    if (suggestedResponse.length > 1000) {
      suggestedResponse = suggestedResponse.substring(0, 997) + '...';
    }

    return {
      suggestedResponse,
      sources: results,
      confidence,
    };
  }

  // ============================================
  // STATS
  // ============================================

  /**
   * Get Knowledge Base statistics
   */
  public async getStats(kbId?: string): Promise<{
    totalArticles: number;
    totalChunks: number;
    indexedChunks: number;
    categories: { name: string; count: number }[];
  }> {
    try {
      // Count articles
      const articleCount = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(kbEntries)
        .where(eq(kbEntries.status, 'published'));

      // Count chunks
      const chunkCount = await this.db
        .select({
          total: sql<number>`COUNT(*)`,
          indexed: sql<number>`COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END)`,
        })
        .from(kbChunks)
        .where(eq(kbChunks.isDeleted, false));

      // Get category counts
      const categories = await this.db
        .select({
          category: kbEntries.category,
          count: sql<number>`COUNT(*)`,
        })
        .from(kbEntries)
        .where(eq(kbEntries.status, 'published'))
        .groupBy(kbEntries.category);

      return {
        totalArticles: Number(articleCount[0]?.count || 0),
        totalChunks: Number(chunkCount[0]?.total || 0),
        indexedChunks: Number(chunkCount[0]?.indexed || 0),
        categories: categories.map(c => ({
          name: c.category || 'Uncategorized',
          count: Number(c.count),
        })),
      };
    } catch (error) {
      console.error('[KnowledgeBaseService] getStats error:', error);
      return {
        totalArticles: 0,
        totalChunks: 0,
        indexedChunks: 0,
        categories: [],
      };
    }
  }
}

// Export singleton instance
export const knowledgeBaseService = KnowledgeBaseService.getInstance();
