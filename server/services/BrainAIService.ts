import { logger } from '../utils/logger'
import { openAIService } from './OpenAIService'

interface MemoryEntry {
  id: string
  content: string
  embedding?: number[]
  metadata: {
    source: string
    agentId?: string
    userId?: string
    timestamp: string
    tags: string[]
    category: string
  }
  relevanceScore?: number
}

interface QueryResult {
  entry: MemoryEntry
  similarity: number
}

/**
 * Brain AI Service - Shared Memory System
 * Centralized knowledge base accessible to all agents
 */
export class BrainAIService {
  private memory: Map<string, MemoryEntry> = new Map()
  private vectors: Map<string, number[]> = new Map()

  /**
   * Store a memory entry with optional embedding
   */
  async storeMemory(content: string, metadata: Partial<MemoryEntry['metadata']>): Promise<string> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Generate embedding for semantic search
    let embedding: number[] | undefined
    try {
      embedding = await openAIService.generateEmbedding(content)
      this.vectors.set(id, embedding)
    } catch (error) {
      logger.warn('Failed to generate embedding, storing without vector:', error)
    }

    const entry: MemoryEntry = {
      id,
      content,
      embedding,
      metadata: {
        source: metadata.source || 'unknown',
        agentId: metadata.agentId,
        userId: metadata.userId,
        timestamp: new Date().toISOString(),
        tags: metadata.tags || [],
        category: metadata.category || 'general'
      }
    }

    this.memory.set(id, entry)
    logger.info(`Memory stored: ${id} (${content.substring(0, 50)}...)`)

    return id
  }

  /**
   * Query memory using semantic search
   */
  async queryMemory(query: string, options: {
    limit?: number
    category?: string
    agentId?: string
    threshold?: number
  } = {}): Promise<QueryResult[]> {
    const { limit = 5, category, agentId, threshold = 0.7 } = options

    try {
      // Generate query embedding
      const queryEmbedding = await openAIService.generateEmbedding(query)

      // Calculate similarities
      const results: QueryResult[] = []

      for (const [id, entry] of this.memory.entries()) {
        // Filter by category if specified
        if (category && entry.metadata.category !== category) continue

        // Filter by agentId if specified
        if (agentId && entry.metadata.agentId !== agentId) continue

        // Calculate cosine similarity
        const vector = this.vectors.get(id)
        if (!vector) continue

        const similarity = this.cosineSimilarity(queryEmbedding, vector)

        // Only include if above threshold
        if (similarity >= threshold) {
          results.push({ entry, similarity })
        }
      }

      // Sort by similarity (highest first) and limit
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

    } catch (error) {
      logger.error('Memory query failed:', error)

      // Fallback: simple text search
      return this.simpleTextSearch(query, { limit, category, agentId })
    }
  }

  /**
   * Fallback text search when embeddings are unavailable
   */
  private simpleTextSearch(query: string, options: {
    limit?: number
    category?: string
    agentId?: string
  }): QueryResult[] {
    const { limit = 5, category, agentId } = options
    const queryLower = query.toLowerCase()
    const results: QueryResult[] = []

    for (const entry of this.memory.values()) {
      if (category && entry.metadata.category !== category) continue
      if (agentId && entry.metadata.agentId !== agentId) continue

      const contentLower = entry.content.toLowerCase()
      if (contentLower.includes(queryLower)) {
        // Simple relevance score based on match position
        const position = contentLower.indexOf(queryLower)
        const similarity = 1 - (position / contentLower.length)

        results.push({ entry, similarity })
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Get memory by ID
   */
  getMemory(id: string): MemoryEntry | null {
    return this.memory.get(id) || null
  }

  /**
   * Get all memories for a specific agent
   */
  getAgentMemories(agentId: string): MemoryEntry[] {
    return Array.from(this.memory.values())
      .filter(entry => entry.metadata.agentId === agentId)
      .sort((a, b) =>
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      )
  }

  /**
   * Get memories by category
   */
  getMemoriesByCategory(category: string): MemoryEntry[] {
    return Array.from(this.memory.values())
      .filter(entry => entry.metadata.category === category)
  }

  /**
   * Get memories by tags
   */
  getMemoriesByTags(tags: string[]): MemoryEntry[] {
    return Array.from(this.memory.values())
      .filter(entry =>
        entry.metadata.tags.some(tag => tags.includes(tag))
      )
  }

  /**
   * Update memory entry
   */
  async updateMemory(id: string, updates: Partial<Pick<MemoryEntry, 'content' | 'metadata'>>): Promise<boolean> {
    const entry = this.memory.get(id)
    if (!entry) return false

    if (updates.content) {
      entry.content = updates.content

      // Re-generate embedding if content changed
      try {
        const embedding = await openAIService.generateEmbedding(updates.content)
        entry.embedding = embedding
        this.vectors.set(id, embedding)
      } catch (error) {
        logger.warn('Failed to update embedding:', error)
      }
    }

    if (updates.metadata) {
      entry.metadata = { ...entry.metadata, ...updates.metadata }
    }

    this.memory.set(id, entry)
    return true
  }

  /**
   * Delete memory
   */
  deleteMemory(id: string): boolean {
    this.vectors.delete(id)
    return this.memory.delete(id)
  }

  /**
   * Clear all memories (use with caution!)
   */
  clearAllMemories(): void {
    this.memory.clear()
    this.vectors.clear()
    logger.warn('All Brain AI memories cleared')
  }

  /**
   * Get statistics about the memory system
   */
  getStats(): {
    totalMemories: number
    totalVectors: number
    categories: Record<string, number>
    tags: Record<string, number>
  } {
    const categories: Record<string, number> = {}
    const tags: Record<string, number> = {}

    for (const entry of this.memory.values()) {
      // Count categories
      const cat = entry.metadata.category
      categories[cat] = (categories[cat] || 0) + 1

      // Count tags
      for (const tag of entry.metadata.tags) {
        tags[tag] = (tags[tag] || 0) + 1
      }
    }

    return {
      totalMemories: this.memory.size,
      totalVectors: this.vectors.size,
      categories,
      tags
    }
  }

  /**
   * Export all memories (for backup)
   */
  exportMemories(): MemoryEntry[] {
    return Array.from(this.memory.values())
  }

  /**
   * Import memories (from backup)
   */
  importMemories(memories: MemoryEntry[]): number {
    let imported = 0

    for (const memory of memories) {
      this.memory.set(memory.id, memory)
      if (memory.embedding) {
        this.vectors.set(memory.id, memory.embedding)
      }
      imported++
    }

    logger.info(`Imported ${imported} memories into Brain AI`)
    return imported
  }
}

// Export singleton instance
export const brainAI = new BrainAIService()
