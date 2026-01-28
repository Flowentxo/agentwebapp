/**
 * Memory Store for Brain AI
 * Stores contextual data, embeddings, and shared intelligence between agents
 */

export interface MemoryRecord {
  id: string
  agentId: string
  timestamp: string
  context: any
  embeddings?: number[]
  tags: string[]
  importance: number // 1-10
  expiresAt?: string
}

export interface MemoryQuery {
  agentId?: string
  tags?: string[]
  startDate?: string
  endDate?: string
  limit?: number
  minImportance?: number
}

export class MemoryStore {
  private static instance: MemoryStore
  private memories: Map<string, MemoryRecord>
  private agentIndex: Map<string, Set<string>>
  private tagIndex: Map<string, Set<string>>

  private constructor() {
    this.memories = new Map()
    this.agentIndex = new Map()
    this.tagIndex = new Map()
    console.log('[MemoryStore] Initialized')
  }

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore()
    }
    return MemoryStore.instance
  }

  /**
   * Store a memory record
   */
  public store(record: MemoryRecord): void {
    this.memories.set(record.id, record)

    // Update agent index
    if (!this.agentIndex.has(record.agentId)) {
      this.agentIndex.set(record.agentId, new Set())
    }
    this.agentIndex.get(record.agentId)!.add(record.id)

    // Update tag index
    record.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(record.id)
    })

    console.log(`[MemoryStore] Stored memory ${record.id} from agent ${record.agentId}`)
  }

  /**
   * Query memories with filters
   */
  public query(query: MemoryQuery): MemoryRecord[] {
    let results: MemoryRecord[] = Array.from(this.memories.values())

    // Filter by agent
    if (query.agentId) {
      const agentMemoryIds = this.agentIndex.get(query.agentId)
      if (agentMemoryIds) {
        results = results.filter(r => agentMemoryIds.has(r.id))
      } else {
        return []
      }
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(r =>
        query.tags!.some(tag => r.tags.includes(tag))
      )
    }

    // Filter by date range
    if (query.startDate) {
      results = results.filter(r => r.timestamp >= query.startDate!)
    }
    if (query.endDate) {
      results = results.filter(r => r.timestamp <= query.endDate!)
    }

    // Filter by importance
    if (query.minImportance) {
      results = results.filter(r => r.importance >= query.minImportance!)
    }

    // Clean up expired memories
    const now = new Date().toISOString()
    results = results.filter(r => !r.expiresAt || r.expiresAt > now)

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    // Limit results
    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Get memory by ID
   */
  public get(id: string): MemoryRecord | undefined {
    return this.memories.get(id)
  }

  /**
   * Delete memory by ID
   */
  public delete(id: string): boolean {
    const memory = this.memories.get(id)
    if (!memory) return false

    // Remove from agent index
    const agentMemories = this.agentIndex.get(memory.agentId)
    if (agentMemories) {
      agentMemories.delete(id)
    }

    // Remove from tag index
    memory.tags.forEach(tag => {
      const tagMemories = this.tagIndex.get(tag)
      if (tagMemories) {
        tagMemories.delete(id)
      }
    })

    this.memories.delete(id)
    console.log(`[MemoryStore] Deleted memory ${id}`)
    return true
  }

  /**
   * Get all memories for an agent
   */
  public getAgentMemories(agentId: string, limit?: number): MemoryRecord[] {
    return this.query({ agentId, limit })
  }

  /**
   * Get memories by tags
   */
  public getByTags(tags: string[], limit?: number): MemoryRecord[] {
    return this.query({ tags, limit })
  }

  /**
   * Clear all memories (use with caution)
   */
  public clear(): void {
    this.memories.clear()
    this.agentIndex.clear()
    this.tagIndex.clear()
    console.log('[MemoryStore] Cleared all memories')
  }

  /**
   * Get statistics
   */
  public getStats(): {
    totalMemories: number
    agentCount: number
    tagCount: number
    memoryByAgent: Record<string, number>
  } {
    const memoryByAgent: Record<string, number> = {}
    this.agentIndex.forEach((memories, agentId) => {
      memoryByAgent[agentId] = memories.size
    })

    return {
      totalMemories: this.memories.size,
      agentCount: this.agentIndex.size,
      tagCount: this.tagIndex.size,
      memoryByAgent
    }
  }

  /**
   * Cleanup expired memories
   */
  public cleanupExpired(): number {
    const now = new Date().toISOString()
    let deletedCount = 0

    this.memories.forEach((memory, id) => {
      if (memory.expiresAt && memory.expiresAt <= now) {
        this.delete(id)
        deletedCount++
      }
    })

    if (deletedCount > 0) {
      console.log(`[MemoryStore] Cleaned up ${deletedCount} expired memories`)
    }

    return deletedCount
  }
}
