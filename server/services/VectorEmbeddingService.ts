/**
 * VECTOR EMBEDDING SERVICE
 *
 * Generate embeddings and perform semantic search for RAG
 * - OpenAI text-embedding-3-small model
 * - Cosine similarity search
 * - Vector storage in PostgreSQL (pgvector extension)
 */

import OpenAI from 'openai';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, vector, timestamp, varchar, jsonb, index } from 'drizzle-orm/pg-core';

// Lazy initialization to prevent crash when API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Vector Embeddings Table Schema
export const documentEmbeddings = pgTable('document_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to source document
  fileId: uuid('file_id').notNull(),
  chunkId: varchar('chunk_id', { length: 255 }).notNull(),

  // Content
  content: text('content').notNull(),

  // Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),

  // Metadata
  metadata: jsonb('metadata').$type<{
    pageNumber?: number;
    startIndex: number;
    endIndex: number;
    wordCount: number;
    keywords?: string[];
  }>(),

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: uuid('workspace_id'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  fileIdIdx: index('document_embeddings_file_id_idx').on(table.fileId),
  userIdIdx: index('document_embeddings_user_id_idx').on(table.userId),
  // Vector similarity search index (using ivfflat or hnsw for performance)
  embeddingIdx: index('document_embeddings_embedding_idx').using('ivfflat', table.embedding)
}));

export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

export interface SearchResult {
  id: string;
  fileId: string;
  chunkId: string;
  content: string;
  similarity: number;
  metadata?: any;
}

export class VectorEmbeddingService {
  private static readonly MODEL = 'text-embedding-3-small';
  private static readonly DIMENSIONS = 1536;

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await getOpenAIClient().embeddings.create({
        model: VectorEmbeddingService.MODEL,
        input: text,
        encoding_format: 'float'
      });

      return {
        embedding: response.data[0].embedding,
        model: response.model,
        tokensUsed: response.usage.total_tokens
      };
    } catch (error: any) {
      console.error('[VectorEmbedding] Generation failed:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      // OpenAI supports batch embeddings (up to 2048 texts)
      const response = await getOpenAIClient().embeddings.create({
        model: VectorEmbeddingService.MODEL,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => ({
        embedding: item.embedding,
        model: response.model,
        tokensUsed: response.usage.total_tokens / texts.length // Average
      }));
    } catch (error: any) {
      console.error('[VectorEmbedding] Batch generation failed:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Store document chunks as embeddings
   */
  async storeDocumentEmbeddings(options: {
    fileId: string;
    userId: string;
    workspaceId?: string;
    chunks: Array<{
      id: string;
      text: string;
      metadata?: any;
    }>;
  }): Promise<void> {
    const { fileId, userId, workspaceId, chunks } = options;

    console.log('[VectorEmbedding] Storing embeddings for', chunks.length, 'chunks');

    try {
      // Generate embeddings for all chunks
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await this.generateEmbeddings(texts);

      // Store in database
      const db = getDb();

      const records = chunks.map((chunk, index) => ({
        fileId,
        chunkId: chunk.id,
        content: chunk.text,
        embedding: JSON.stringify(embeddings[index].embedding), // Store as JSON array
        metadata: chunk.metadata || {},
        userId,
        workspaceId
      }));

      // Batch insert (Drizzle ORM supports batch inserts)
      await db.insert(documentEmbeddings).values(records);

      console.log('[VectorEmbedding] ✅ Stored', records.length, 'embeddings');
    } catch (error: any) {
      console.error('[VectorEmbedding] Storage failed:', error);
      throw new Error(`Failed to store embeddings: ${error.message}`);
    }
  }

  /**
   * Semantic search using cosine similarity
   */
  async search(options: {
    query: string;
    userId: string;
    workspaceId?: string;
    fileId?: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<SearchResult[]> {
    const {
      query,
      userId,
      workspaceId,
      fileId,
      limit = 10,
      minSimilarity = 0.7
    } = options;

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Perform vector similarity search using PostgreSQL's pgvector
      const db = getDb();

      // Build WHERE conditions
      const conditions = [sql`user_id = ${userId}`];
      if (workspaceId) {
        conditions.push(sql`workspace_id = ${workspaceId}`);
      }
      if (fileId) {
        conditions.push(sql`file_id = ${fileId}`);
      }

      // Cosine similarity search query
      // Note: pgvector uses <=> operator for cosine distance (lower is better)
      // similarity = 1 - cosine_distance
      const results = await db.execute(sql`
        SELECT
          id,
          file_id,
          chunk_id,
          content,
          metadata,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector) as similarity
        FROM document_embeddings
        WHERE ${sql.join(conditions, sql` AND `)}
          AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector) >= ${minSimilarity}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector
        LIMIT ${limit}
      `);

      return results.rows.map((row: any) => ({
        id: row.id,
        fileId: row.file_id,
        chunkId: row.chunk_id,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata
      }));
    } catch (error: any) {
      console.error('[VectorEmbedding] Search failed:', error);
      throw new Error(`Failed to search embeddings: ${error.message}`);
    }
  }

  /**
   * Delete embeddings for a file
   */
  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      const db = getDb();
      await db.delete(documentEmbeddings).where(sql`file_id = ${fileId}`);
      console.log('[VectorEmbedding] Deleted embeddings for file:', fileId);
    } catch (error: any) {
      console.error('[VectorEmbedding] Deletion failed:', error);
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }

  /**
   * Get embedding statistics
   */
  async getStats(userId: string, workspaceId?: string): Promise<{
    totalEmbeddings: number;
    totalFiles: number;
    avgChunksPerFile: number;
  }> {
    try {
      const db = getDb();

      const conditions = [sql`user_id = ${userId}`];
      if (workspaceId) {
        conditions.push(sql`workspace_id = ${workspaceId}`);
      }

      const result = await db.execute(sql`
        SELECT
          COUNT(*) as total_embeddings,
          COUNT(DISTINCT file_id) as total_files,
          AVG(chunks_per_file) as avg_chunks_per_file
        FROM (
          SELECT
            file_id,
            COUNT(*) as chunks_per_file
          FROM document_embeddings
          WHERE ${sql.join(conditions, sql` AND `)}
          GROUP BY file_id
        ) as file_stats
      `);

      const row = result.rows[0] as any;

      return {
        totalEmbeddings: parseInt(row.total_embeddings || '0'),
        totalFiles: parseInt(row.total_files || '0'),
        avgChunksPerFile: parseFloat(row.avg_chunks_per_file || '0')
      };
    } catch (error: any) {
      console.error('[VectorEmbedding] Stats failed:', error);
      return {
        totalEmbeddings: 0,
        totalFiles: 0,
        avgChunksPerFile: 0
      };
    }
  }
}

// Singleton instance
export const vectorEmbeddingService = new VectorEmbeddingService();
