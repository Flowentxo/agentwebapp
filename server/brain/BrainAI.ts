/**
 * Brain AI - Central Intelligence Hub
 * Manages shared context, memory, and inter-agent communication for all 12 agents
 *
 * V2 UPGRADE: Now uses PostgreSQL-backed persistent storage
 * ✅ Survives restarts
 * ✅ Redis caching for performance
 * ✅ ACID compliance
 */

import { MemoryStoreV2 as MemoryStore, MemoryRecord, MemoryQuery } from './MemoryStoreV2'
import { ContextSyncV2 as ContextSync, ContextMessage, ContextShare } from './ContextSyncV2'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

export interface AgentRegistration {
  agentId: string
  name: string
  type: string
  capabilities: string[]
  endpoints: string[]
  registeredAt: string
}

export interface BrainQuery {
  query: string
  agentId: string
  context?: any
  filters?: {
    tags?: string[]
    agents?: string[]
    dateRange?: { start: string; end: string }
    minImportance?: number
  }
}

export interface BrainResponse {
  success: boolean
  data?: any
  insights?: string[]
  relatedMemories?: MemoryRecord[]
  suggestedAgents?: string[]
  error?: string
}

export class BrainAI {
  private static instance: BrainAI
  private memoryStore: MemoryStore
  private contextSync: ContextSync
  private registeredAgents: Map<string, AgentRegistration>
  private isInitialized: boolean

  private constructor() {
    this.memoryStore = MemoryStore.getInstance()
    this.contextSync = ContextSync.getInstance()
    this.registeredAgents = new Map()
    this.isInitialized = false

    // Auto-cleanup expired memories every 5 minutes (V2: now async)
    setInterval(async () => {
      try {
        await this.memoryStore.cleanupExpired()
      } catch (error) {
        logger.error('[BrainAI] Cleanup error:', error)
      }
    }, 5 * 60 * 1000)

    logger.info('🧠 Brain AI initialized')
  }

  public static getInstance(): BrainAI {
    if (!BrainAI.instance) {
      BrainAI.instance = new BrainAI()
    }
    return BrainAI.instance
  }

  /**
   * Initialize Brain AI
   */
  public initialize(): void {
    if (this.isInitialized) {
      logger.warn('[BrainAI] Already initialized')
      return
    }

    this.isInitialized = true
    logger.info('🧠 Brain AI ready for agent registration')
  }

  /**
   * Register an agent with Brain AI
   */
  public async registerAgent(registration: Omit<AgentRegistration, 'registeredAt'>): Promise<void> {
    const fullRegistration: AgentRegistration = {
      ...registration,
      registeredAt: new Date().toISOString()
    }

    this.registeredAgents.set(registration.agentId, fullRegistration)
    logger.info(`🧠 Agent registered: ${registration.name} (${registration.agentId})`)

    // Store registration in memory
    const memoryRecord: MemoryRecord = {
      id: uuidv4(),
      agentId: 'brain',
      timestamp: fullRegistration.registeredAt,
      context: {
        type: 'agent_registration',
        agent: fullRegistration
      },
      tags: ['registration', registration.agentId, registration.type],
      importance: 8
    }
    await this.memoryStore.store(memoryRecord)
  }

  /**
   * Store context from an agent
   */
  public async storeContext(agentId: string, context: any, tags: string[] = [], importance: number = 5): Promise<string> {
    const memoryId = uuidv4()

    const memoryRecord: MemoryRecord = {
      id: memoryId,
      agentId,
      timestamp: new Date().toISOString(),
      context,
      tags: [agentId, ...tags],
      importance
    }

    await this.memoryStore.store(memoryRecord)
    logger.info(`🧠 Context stored from ${agentId}: ${memoryId}`)

    return memoryId
  }

  /**
   * Query context from Brain AI
   */
  public async queryContext(query: BrainQuery): Promise<BrainResponse> {
    try {
      const memoryQuery: MemoryQuery = {
        agentId: query.filters?.agents?.[0],
        tags: query.filters?.tags,
        startDate: query.filters?.dateRange?.start,
        endDate: query.filters?.dateRange?.end,
        minImportance: query.filters?.minImportance || 5,
        limit: 20
      }

      const memories = await this.memoryStore.query(memoryQuery)

      // Generate insights based on memories
      const insights = this.generateInsights(memories, query.query)

      // Suggest relevant agents
      const suggestedAgents = this.suggestAgents(query.query, memories)

      return {
        success: true,
        data: memories.map(m => m.context),
        insights,
        relatedMemories: memories,
        suggestedAgents
      }
    } catch (error: any) {
      logger.error('[BrainAI] Query error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Share context between agents
   */
  public async shareContext(shareData: ContextShare): Promise<ContextMessage> {
    const message = await this.contextSync.share(shareData)
    logger.info(`🧠 Context shared: ${shareData.sourceAgent} → ${shareData.targetAgent}`)
    return message
  }

  /**
   * Broadcast to all agents
   */
  public async broadcast(fromAgent: string, context: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<ContextMessage> {
    const message = await this.contextSync.broadcast(fromAgent, context, priority)
    logger.info(`🧠 Broadcast from ${fromAgent} (priority: ${priority})`)
    return message
  }

  /**
   * Get agent history
   */
  public async getAgentHistory(agentId: string, limit: number = 50): Promise<MemoryRecord[]> {
    return await this.memoryStore.getAgentMemories(agentId, limit)
  }

  /**
   * Get cross-agent insights
   */
  public async getCrossAgentInsights(agentIds: string[], tags?: string[]): Promise<BrainResponse> {
    try {
      const allMemories: MemoryRecord[] = []

      for (const agentId of agentIds) {
        const memories = await this.memoryStore.query({
          agentId,
          tags,
          limit: 10,
          minImportance: 6
        })
        allMemories.push(...memories)
      }

      // Sort by importance and timestamp
      allMemories.sort((a, b) => {
        if (a.importance !== b.importance) {
          return b.importance - a.importance
        }
        return b.timestamp.localeCompare(a.timestamp)
      })

      const insights = this.generateCrossAgentInsights(allMemories, agentIds)

      return {
        success: true,
        data: allMemories,
        insights,
        relatedMemories: allMemories.slice(0, 10)
      }
    } catch (error: any) {
      logger.error('[BrainAI] Cross-agent insights error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get all registered agents
   */
  public getRegisteredAgents(): AgentRegistration[] {
    return Array.from(this.registeredAgents.values())
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): AgentRegistration | undefined {
    return this.registeredAgents.get(agentId)
  }

  /**
   * Get Brain AI statistics
   */
  public async getStats(): Promise<{
    registeredAgents: number
    totalMemories: number
    contextMessages: number
    memoryByAgent: Record<string, number>
    agents: AgentRegistration[]
  }> {
    const memoryStats = await this.memoryStore.getStats()
    const contextStats = await this.contextSync.getStats()

    return {
      registeredAgents: this.registeredAgents.size,
      totalMemories: memoryStats.totalMemories,
      contextMessages: contextStats.totalMessages,
      memoryByAgent: memoryStats.memoryByAgent,
      agents: this.getRegisteredAgents()
    }
  }

  /**
   * Health check
   */
  public async health(): Promise<{
    status: string
    initialized: boolean
    registeredAgents: number
    memoryStats: any
    contextStats: any
  }> {
    return {
      status: 'ok',
      initialized: this.isInitialized,
      registeredAgents: this.registeredAgents.size,
      memoryStats: await this.memoryStore.getStats(),
      contextStats: await this.contextSync.getStats()
    }
  }

  /**
   * Generate insights from memories
   */
  private generateInsights(memories: MemoryRecord[], query: string): string[] {
    const insights: string[] = []

    if (memories.length === 0) {
      insights.push('No relevant memories found for this query')
      return insights
    }

    // Analyze memory patterns
    const agentCounts = new Map<string, number>()
    const tagCounts = new Map<string, number>()

    memories.forEach(memory => {
      agentCounts.set(memory.agentId, (agentCounts.get(memory.agentId) || 0) + 1)
      memory.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    // Most active agent
    const mostActiveAgent = Array.from(agentCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]
    if (mostActiveAgent) {
      insights.push(`Most relevant agent: ${mostActiveAgent[0]} (${mostActiveAgent[1]} related memories)`)
    }

    // Common tags
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(t => t[0])
    if (topTags.length > 0) {
      insights.push(`Key topics: ${topTags.join(', ')}`)
    }

    // Recent activity
    const recentMemories = memories.filter(m => {
      const hoursSince = (Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60 * 60)
      return hoursSince < 24
    })
    if (recentMemories.length > 0) {
      insights.push(`${recentMemories.length} recent activities in the last 24 hours`)
    }

    return insights
  }

  /**
   * Generate cross-agent insights
   */
  private generateCrossAgentInsights(memories: MemoryRecord[], agentIds: string[]): string[] {
    const insights: string[] = []

    // Analyze collaboration patterns
    const collaborationMap = new Map<string, Set<string>>()

    memories.forEach(memory => {
      if (memory.context?.type === 'context_share') {
        const source = memory.agentId
        const target = memory.context.targetAgent

        if (!collaborationMap.has(source)) {
          collaborationMap.set(source, new Set())
        }
        collaborationMap.get(source)!.add(target)
      }
    })

    if (collaborationMap.size > 0) {
      insights.push(`Active collaboration between ${collaborationMap.size} agent pairs`)
    }

    // High-importance memories
    const highImportanceMemories = memories.filter(m => m.importance >= 8)
    if (highImportanceMemories.length > 0) {
      insights.push(`${highImportanceMemories.length} high-priority insights identified`)
    }

    return insights
  }

  /**
   * Suggest relevant agents for a query
   */
  private suggestAgents(query: string, memories: MemoryRecord[]): string[] {
    const queryLower = query.toLowerCase()
    const suggestedAgents: Set<string> = new Set()

    // Keyword-based suggestions
    const keywordMap: Record<string, string[]> = {
      'data': ['dexter', 'nova', 'vera'],
      'analysis': ['dexter', 'nova', 'finn'],
      'customer': ['cassie', 'emmie'],
      'marketing': ['emmie', 'nova'],
      'workflow': ['aura', 'omni'],
      'report': ['nova', 'vera'],
      'knowledge': ['kai', 'nova'],
      'legal': ['lex'],
      'finance': ['finn', 'dexter'],
      'ai': ['ari'],
      'notification': ['echo'],
      'visual': ['vera'],
      'monitor': ['omni']
    }

    Object.keys(keywordMap).forEach(keyword => {
      if (queryLower.includes(keyword)) {
        keywordMap[keyword].forEach(agent => suggestedAgents.add(agent))
      }
    })

    // Memory-based suggestions
    memories.slice(0, 5).forEach(memory => {
      suggestedAgents.add(memory.agentId)
    })

    return Array.from(suggestedAgents).slice(0, 3)
  }

  /**
   * Clear all data (use with caution)
   */
  public async clearAll(): Promise<void> {
    await this.memoryStore.clear()
    await this.contextSync.clear()
    this.registeredAgents.clear()
    logger.warn('🧠 Brain AI cleared all data')
  }
}

export const brainAI = BrainAI.getInstance()
