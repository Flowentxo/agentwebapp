import { v4 as uuidv4 } from 'uuid'
import { KnowledgeChunk, KnowledgeDocument, KnowledgeQueryRequest, KnowledgeQueryResult } from '../types/knowledge'
import { vectorStore } from './VectorStoreService'
import { embeddingService } from './EmbeddingService'
import { documentProcessor } from './DocumentProcessingService'
import { knowledgeEvents } from './KnowledgeEventEmitter'
import { logger } from '../utils/logger'

/**
 * SharedKnowledgeManager - Orchestrates the shared knowledge base
 *
 * Responsibilities:
 * - Document upload and processing
 * - Text chunking and embedding
 * - Vector storage
 * - Query handling
 * - Event emission for agent sync
 */
export class SharedKnowledgeManager {
  // In-memory document storage (use real DB in production)
  private documents: Map<string, KnowledgeDocument> = new Map()
  private userDocuments: Map<string, Set<string>> = new Map() // userId -> documentIds

  /**
   * Upload and process a document
   */
  async uploadDocument(
    userId: string,
    filePath: string,
    filename: string,
    fileType: string,
    size: number,
    uploadedBy: string
  ): Promise<KnowledgeDocument> {
    const documentId = uuidv4()

    logger.info(`Processing document upload: ${filename} for user ${userId}`)

    // Extract text from document
    const text = await documentProcessor.extractText(filePath, fileType)

    // Generate summary
    const summary = documentProcessor.generateSummary(text)

    // Chunk the text
    const textChunks = documentProcessor.chunkText(text)

    if (textChunks.length === 0) {
      throw new Error('No text content found in document')
    }

    logger.info(`Document chunked into ${textChunks.length} pieces`)

    // Generate embeddings for all chunks
    const embeddings = await embeddingService.generateEmbeddings(textChunks)

    // Create knowledge chunks
    const chunks: KnowledgeChunk[] = textChunks.map((content, index) => ({
      id: uuidv4(),
      userId,
      content,
      embedding: embeddings[index],
      filename,
      fileType,
      createdAt: new Date(),
      source: 'knowledge-upload',
      metadata: {
        chunkIndex: index,
        totalChunks: textChunks.length,
        documentId,
        summary: index === 0 ? summary : undefined
      },
      shared: true
    }))

    // Store chunks in vector store
    await vectorStore.addChunks(chunks)

    // Create document record
    const document: KnowledgeDocument = {
      id: documentId,
      userId,
      title: filename,
      filename,
      fileType,
      size,
      uploadedBy,
      uploadedAt: new Date(),
      chunks: chunks.map(c => c.id),
      vectorized: true,
      tags: [],
      metadata: {
        summary,
        path: filePath,
        totalChunks: chunks.length
      }
    }

    // Store document
    this.documents.set(documentId, document)

    // Add to user index
    if (!this.userDocuments.has(userId)) {
      this.userDocuments.set(userId, new Set())
    }
    this.userDocuments.get(userId)!.add(documentId)

    // Emit event for agent sync
    knowledgeEvents.emitKnowledgeUpdated(userId, documentId, chunks.length)

    logger.info(`Document ${documentId} processed successfully with ${chunks.length} chunks`)

    return document
  }

  /**
   * Query the shared knowledge base
   */
  async query(request: KnowledgeQueryRequest): Promise<KnowledgeQueryResult[]> {
    const { userId, query, topK = 5, threshold = 0.7 } = request

    logger.info(`Knowledge query from ${request.agentName || 'unknown'} for user ${userId}`)

    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query)

    // Search vector store
    const results = await vectorStore.query(userId, queryEmbedding, topK, threshold)

    logger.info(`Query returned ${results.length} results`)

    return results
  }

  /**
   * Get all documents for a user
   */
  getUserDocuments(userId: string): KnowledgeDocument[] {
    const docIds = this.userDocuments.get(userId)
    if (!docIds) return []

    const docs: KnowledgeDocument[] = []
    for (const id of docIds) {
      const doc = this.documents.get(id)
      if (doc) docs.push(doc)
    }

    return docs
  }

  /**
   * Get a specific document
   */
  getDocument(documentId: string): KnowledgeDocument | undefined {
    return this.documents.get(documentId)
  }

  /**
   * Delete a document and all its chunks
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const doc = this.documents.get(documentId)

    if (!doc || doc.userId !== userId) {
      throw new Error('Document not found or access denied')
    }

    // Delete chunks from vector store
    await vectorStore.deleteDocument(userId, documentId)

    // Remove from document storage
    this.documents.delete(documentId)

    // Remove from user index
    this.userDocuments.get(userId)?.delete(documentId)

    // Emit event
    knowledgeEvents.emitKnowledgeDeleted(userId, documentId)

    logger.info(`Document ${documentId} deleted`)
  }

  /**
   * Get knowledge statistics for a user
   */
  getUserStats(userId: string): {
    totalDocuments: number
    totalChunks: number
    totalSize: number
  } {
    const docs = this.getUserDocuments(userId)

    return {
      totalDocuments: docs.length,
      totalChunks: vectorStore.getUserChunkCount(userId),
      totalSize: docs.reduce((sum, doc) => sum + doc.size, 0)
    }
  }

  /**
   * Get initial context for agent initialization
   */
  async getInitialContext(userId: string, contextQuery: string = 'general knowledge'): Promise<string> {
    const results = await this.query({
      userId,
      query: contextQuery,
      topK: 3,
      threshold: 0.6
    })

    if (results.length === 0) {
      return 'No knowledge base available yet.'
    }

    const context = results
      .map((r, i) => `[Source ${i + 1}: ${r.chunk.filename}]\n${r.chunk.content}`)
      .join('\n\n')

    return context
  }
}

// Singleton instance
export const sharedKnowledgeManager = new SharedKnowledgeManager()
