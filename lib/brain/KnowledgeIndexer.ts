/**
 * Knowledge Indexer - Document Processing & Chunking
 * Handles document ingestion, chunking, and indexing into Brain AI
 */

import { getDb } from '@/lib/db';
import { brainDocuments, type NewBrainDocument } from '@/lib/db/schema';
import { embeddingService } from './EmbeddingService';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';

export interface ChunkConfig {
  chunkSize?: number; // Characters per chunk
  chunkOverlap?: number; // Overlap between chunks
  minChunkSize?: number; // Minimum chunk size
}

export interface DocumentInput {
  title: string;
  content: string;
  workspaceId?: string;
  createdBy: string;
  metadata?: {
    source?: string;
    sourceType?: 'upload' | 'url' | 'agent' | 'conversation';
    tags?: string[];
    category?: string;
    language?: string;
    fileType?: string;
    url?: string;
  };
}

export interface IndexedDocument {
  id: string;
  chunkCount: number;
  totalTokens: number;
}

export class KnowledgeIndexer {
  private static instance: KnowledgeIndexer;
  private db = getDb();

  private defaultChunkConfig: ChunkConfig = {
    chunkSize: 1000, // ~250 tokens
    chunkOverlap: 200, // 50 characters overlap
    minChunkSize: 100,
  };

  private constructor() {}

  public static getInstance(): KnowledgeIndexer {
    if (!KnowledgeIndexer.instance) {
      KnowledgeIndexer.instance = new KnowledgeIndexer();
    }
    return KnowledgeIndexer.instance;
  }

  /**
   * Index a document into Brain AI
   */
  public async indexDocument(
    input: DocumentInput,
    config: ChunkConfig = {}
  ): Promise<IndexedDocument> {
    const chunkConfig = { ...this.defaultChunkConfig, ...config };

    // Generate content hash for deduplication
    const contentHash = this.generateContentHash(input.content);

    // Check if document already exists
    const existing = await this.db
      .select()
      .from(brainDocuments)
      .where(sql`${brainDocuments.contentHash} = ${contentHash}`)
      .limit(1);

    if (existing.length > 0) {
      console.log('[KnowledgeIndexer] Document already indexed:', contentHash);
      return {
        id: existing[0].id,
        chunkCount: 1,
        totalTokens: existing[0].tokenCount,
      };
    }

    // Split document into chunks
    const chunks = this.chunkText(input.content, chunkConfig);
    console.log(`[KnowledgeIndexer] Split into ${chunks.length} chunks`);

    // If small enough, store as single document
    if (chunks.length === 1) {
      const result = await this.indexSingleChunk(input, contentHash, chunks[0]);
      return {
        id: result.id,
        chunkCount: 1,
        totalTokens: result.tokenCount,
      };
    }

    // Store as multiple chunks with parent reference
    const parentId = crypto.randomUUID();
    const chunkRecords: NewBrainDocument[] = [];
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embeddingService.generateEmbedding(chunk);

      chunkRecords.push({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId || 'default-workspace',
        title: `${input.title} (Chunk ${i + 1}/${chunks.length})`,
        content: chunk,
        contentHash: i === 0 ? contentHash : undefined, // Only first chunk has hash
        metadata: {
          ...input.metadata,
          chunkNumber: i + 1,
          totalChunks: chunks.length,
        } as any,
        embedding: embedding.embedding as any,
        chunkIndex: i,
        parentDocId: parentId,
        tokenCount: embedding.tokens,
        createdBy: input.createdBy,
      });

      totalTokens += embedding.tokens;
    }

    // Insert all chunks
    await this.db.insert(brainDocuments).values(chunkRecords);

    console.log(`[KnowledgeIndexer] Indexed ${chunks.length} chunks, ${totalTokens} tokens`);

    return {
      id: parentId,
      chunkCount: chunks.length,
      totalTokens,
    };
  }

  /**
   * Index a single chunk (optimized path)
   */
  private async indexSingleChunk(
    input: DocumentInput,
    contentHash: string,
    content: string
  ) {
    const embedding = await embeddingService.generateEmbedding(content);

    const [result] = await this.db
      .insert(brainDocuments)
      .values({
        workspaceId: input.workspaceId || 'default-workspace',
        title: input.title,
        content,
        contentHash,
        metadata: input.metadata as any,
        embedding: embedding.embedding as any,
        tokenCount: embedding.tokens,
        createdBy: input.createdBy,
      })
      .returning();

    return result;
  }

  /**
   * Split text into chunks with overlap
   */
  private chunkText(text: string, config: ChunkConfig): string[] {
    const { chunkSize = 1000, chunkOverlap = 200, minChunkSize = 100 } = config;
    const chunks: string[] = [];

    // Normalize whitespace
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    if (normalizedText.length <= chunkSize) {
      return [normalizedText];
    }

    let start = 0;
    while (start < normalizedText.length) {
      let end = start + chunkSize;

      // Find last sentence boundary before chunk size
      if (end < normalizedText.length) {
        const sentenceEnd = this.findSentenceBoundary(normalizedText, end);
        if (sentenceEnd > start + minChunkSize) {
          end = sentenceEnd;
        }
      } else {
        end = normalizedText.length;
      }

      const chunk = normalizedText.slice(start, end).trim();
      if (chunk.length >= minChunkSize) {
        chunks.push(chunk);
      }

      // Move start with overlap
      start = end - chunkOverlap;
      if (start >= normalizedText.length) break;
    }

    return chunks;
  }

  /**
   * Find nearest sentence boundary
   */
  private findSentenceBoundary(text: string, position: number): number {
    const searchText = text.slice(Math.max(0, position - 200), position + 200);
    const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

    let bestPosition = position;
    let minDistance = Infinity;

    for (const ending of sentenceEndings) {
      const offset = Math.max(0, position - 200);
      let idx = searchText.lastIndexOf(ending, position - offset);

      if (idx !== -1) {
        const actualPosition = offset + idx + ending.length;
        const distance = Math.abs(actualPosition - position);

        if (distance < minDistance && actualPosition > position - 200) {
          minDistance = distance;
          bestPosition = actualPosition;
        }
      }
    }

    return bestPosition;
  }

  /**
   * Generate SHA-256 hash of content
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Batch index multiple documents
   */
  public async indexDocuments(
    documents: DocumentInput[],
    config?: ChunkConfig
  ): Promise<IndexedDocument[]> {
    const results: IndexedDocument[] = [];

    for (const doc of documents) {
      try {
        const result = await this.indexDocument(doc, config);
        results.push(result);
      } catch (error) {
        console.error('[KnowledgeIndexer] Error indexing document:', doc.title, error);
        // Continue with other documents
      }
    }

    return results;
  }

  /**
   * Re-index existing document (update embeddings)
   */
  public async reindexDocument(documentId: string): Promise<boolean> {
    const doc = await this.db
      .select()
      .from(brainDocuments)
      .where(sql`${brainDocuments.id} = ${documentId}`)
      .limit(1);

    if (doc.length === 0) {
      return false;
    }

    // Generate new embedding
    const embedding = await embeddingService.generateEmbedding(doc[0].content);

    // Update document
    await this.db
      .update(brainDocuments)
      .set({
        embedding: embedding.embedding as any,
        tokenCount: embedding.tokens,
        updatedAt: new Date(),
      })
      .where(sql`${brainDocuments.id} = ${documentId}`);

    return true;
  }
}

export const knowledgeIndexer = KnowledgeIndexer.getInstance();
