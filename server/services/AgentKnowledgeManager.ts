import { sharedKnowledgeManager } from './SharedKnowledgeManager'
import { knowledgeEvents } from './KnowledgeEventEmitter'
import { logger } from '../utils/logger'

/**
 * AgentKnowledgeManager - Interface for agents to access shared knowledge
 *
 * Each agent instance should create one of these and subscribe to knowledge updates
 */
export class AgentKnowledgeManager {
  private userId: string
  private agentName: string
  private knowledgeCache: Map<string, string> = new Map()
  private lastRefresh: Date | null = null

  constructor(userId: string, agentName: string) {
    this.userId = userId
    this.agentName = agentName

    // Subscribe to knowledge updates
    this.subscribeToKnowledgeEvents()

    logger.info(`AgentKnowledgeManager initialized for ${agentName} (user: ${userId})`)
  }

  /**
   * Subscribe to knowledge update events
   */
  private subscribeToKnowledgeEvents() {
    // Listen for knowledge updates
    knowledgeEvents.onKnowledgeUpdated((data) => {
      if (data.userId === this.userId) {
        logger.info(`${this.agentName} detected knowledge update: ${data.chunkCount} new chunks`)
        this.refreshKnowledge()
      }
    })

    // Listen for knowledge deletions
    knowledgeEvents.onKnowledgeDeleted((data) => {
      if (data.userId === this.userId) {
        logger.info(`${this.agentName} detected knowledge deletion: ${data.documentId}`)
        this.refreshKnowledge()
      }
    })

    // Listen for refresh requests
    knowledgeEvents.onAgentRefreshRequested((data) => {
      if (data.userId === this.userId) {
        if (!data.agentName || data.agentName === this.agentName) {
          logger.info(`${this.agentName} received refresh request`)
          this.refreshKnowledge()
        }
      }
    })
  }

  /**
   * Refresh the knowledge cache
   */
  async refreshKnowledge(): Promise<void> {
    try {
      // Clear existing cache
      this.knowledgeCache.clear()

      // Load initial context
      const context = await sharedKnowledgeManager.getInitialContext(
        this.userId,
        'general knowledge overview'
      )

      this.knowledgeCache.set('initial_context', context)
      this.lastRefresh = new Date()

      logger.info(`${this.agentName} knowledge refreshed`)
    } catch (error: any) {
      logger.error(`${this.agentName} knowledge refresh failed: ${error.message}`)
    }
  }

  /**
   * Query the shared knowledge base
   */
  async query(query: string, topK: number = 5, threshold: number = 0.7): Promise<string> {
    try {
      const results = await sharedKnowledgeManager.query({
        userId: this.userId,
        query,
        agentName: this.agentName,
        topK,
        threshold
      })

      if (results.length === 0) {
        return ''
      }

      // Format results as context
      const context = results
        .map((r, i) => {
          const score = (r.score * 100).toFixed(1)
          return `[${i + 1}. ${r.chunk.filename} (${score}% relevant)]\n${r.chunk.content}`
        })
        .join('\n\n---\n\n')

      return context
    } catch (error: any) {
      logger.error(`${this.agentName} knowledge query failed: ${error.message}`)
      return ''
    }
  }

  /**
   * Get cached knowledge context
   */
  getCachedContext(key: string = 'initial_context'): string {
    return this.knowledgeCache.get(key) || ''
  }

  /**
   * Get knowledge stats
   */
  getStats(): {
    lastRefresh: Date | null
    cacheSize: number
    userStats: any
  } {
    return {
      lastRefresh: this.lastRefresh,
      cacheSize: this.knowledgeCache.size,
      userStats: sharedKnowledgeManager.getUserStats(this.userId)
    }
  }

  /**
   * Initialize knowledge on agent startup
   */
  async initialize(): Promise<string> {
    await this.refreshKnowledge()
    return this.getCachedContext()
  }
}

/**
 * Factory function to create agent knowledge managers
 */
export function createAgentKnowledgeManager(
  userId: string,
  agentName: string
): AgentKnowledgeManager {
  return new AgentKnowledgeManager(userId, agentName)
}
