import { EventEmitter } from 'events'
import { KnowledgeChunk, KnowledgeQueryResult } from '../types/knowledge'
import { logger } from '../utils/logger'

/**
 * VectorStoreService - In-memory vector database with cosine similarity search
 *
 * In production, replace with:
 * - Supabase Vector (pgvector)
 * - Pinecone
 * - Weaviate
 * - Qdrant
 */
export class VectorStoreService extends EventEmitter {
  private chunks: Map<string, KnowledgeChunk> = new Map()
  private userIndices: Map<string, Set<string>> = new Map() // userId -> chunkIds

  constructor() {
    super()
    logger.info('VectorStoreService initialized')
  }

  /**
   * Add a chunk to the vector store
   */
  async addChunk(chunk: KnowledgeChunk): Promise<void> {
    this.chunks.set(chunk.id, chunk)

    // Add to user index
    if (!this.userIndices.has(chunk.userId)) {
      this.userIndices.set(chunk.userId, new Set())
    }
    this.userIndices.get(chunk.userId)!.add(chunk.id)

    logger.info(`Chunk ${chunk.id} added for user ${chunk.userId}`)
  }

  /**
   * Add multiple chunks in batch
   */
  async addChunks(chunks: KnowledgeChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.addChunk(chunk)
    }
    logger.info(`${chunks.length} chunks added to vector store`)
  }

  /**
   * Query the vector store for similar chunks
   */
  async query(
    userId: string,
    queryEmbedding: number[],
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<KnowledgeQueryResult[]> {
    const userChunkIds = this.userIndices.get(userId)

    if (!userChunkIds || userChunkIds.size === 0) {
      logger.warn(`No chunks found for user ${userId}`)
      return []
    }

    // Calculate similarity scores for all user's chunks
    const results: KnowledgeQueryResult[] = []

    for (const chunkId of userChunkIds) {
      const chunk = this.chunks.get(chunkId)
      if (!chunk) continue

      const score = this.cosineSimilarity(queryEmbedding, chunk.embedding)

      if (score >= threshold) {
        results.push({ chunk, score })
      }
    }

    // Sort by score descending and take top K
    results.sort((a, b) => b.score - a.score)
    const topResults = results.slice(0, topK)

    logger.info(`Query for user ${userId} returned ${topResults.length} results`)
    return topResults
  }

  /**
   * Delete all chunks for a document
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const userChunkIds = this.userIndices.get(userId)
    if (!userChunkIds) return

    const deletedIds: string[] = []

    for (const chunkId of userChunkIds) {
      const chunk = this.chunks.get(chunkId)
      if (chunk?.metadata.documentId === documentId) {
        this.chunks.delete(chunkId)
        deletedIds.push(chunkId)
      }
    }

    // Remove from user index
    for (const id of deletedIds) {
      userChunkIds.delete(id)
    }

    logger.info(`Deleted ${deletedIds.length} chunks for document ${documentId}`)
  }

  /**
   * Get all chunks for a user
   */
  async getUserChunks(userId: string): Promise<KnowledgeChunk[]> {
    const userChunkIds = this.userIndices.get(userId)
    if (!userChunkIds) return []

    const chunks: KnowledgeChunk[] = []
    for (const chunkId of userChunkIds) {
      const chunk = this.chunks.get(chunkId)
      if (chunk) chunks.push(chunk)
    }

    return chunks
  }

  /**
   * Get total chunk count for a user
   */
  getUserChunkCount(userId: string): number {
    return this.userIndices.get(userId)?.size || 0
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)

    if (magnitude === 0) return 0

    return dotProduct / magnitude
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.chunks.clear()
    this.userIndices.clear()
    logger.info('VectorStoreService cleared')
  }
}

// Singleton instance
export const vectorStore = new VectorStoreService()
