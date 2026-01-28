/**
 * Agent Manager - Central Management for SINTRA.AI Agents
 * Handles initialization, routing, and coordination
 *
 * ALL 15 AGENTS ARE NOW ACTIVE:
 * Core Agents:
 * - Dexter (Financial Analyst & Data Expert)
 * - Cassie (Customer Support)
 * - Emmie (Email Manager)
 * - Aura (Brand Strategist)
 * - Kai (Code Assistant)
 * - Lex (Legal Advisor)
 * - Finn (Finance Expert)
 * - Nova (Research & Insights)
 *
 * Motion Agents:
 * - Vince (Video Producer)
 * - Milo (Motion Designer)
 *
 * AI & Automation Agents:
 * - Ari (AI Automation Specialist)
 * - Vera (Security & Compliance)
 * - Echo (Voice & Audio Assistant)
 * - Omni (Multi-Agent Orchestrator)
 * - Buddy (Financial Intelligence Assistant)
 *
 * Last update: 2026-01-04
 */

import { BrainAI } from '../brain/BrainAI'
import { DexterAgent } from '../agents/dexter/DexterAgent'
import { CassieAgent } from '../agents/cassie/CassieAgent'
import { EmmieAgent } from '../agents/emmie/EmmieAgent'
import { AuraAgent } from '../agents/aura/AuraAgent'
import { BaseAgent } from '../agents/base/BaseAgent'
import { GenericAgent, createGenericAgent } from '../agents/generic/GenericAgent'
import { logger } from '../utils/logger'

// List of agents that use GenericAgent (no specialized implementation)
const GENERIC_AGENTS = ['kai', 'lex', 'finn', 'nova', 'vince', 'milo', 'ari', 'vera', 'echo', 'omni', 'buddy']

export class AgentManager {
  private static instance: AgentManager
  private agents: Map<string, BaseAgent>
  private brainAI: BrainAI
  private isInitialized: boolean

  private constructor() {
    this.agents = new Map()
    this.brainAI = BrainAI.getInstance()
    this.isInitialized = false
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager()
    }
    return AgentManager.instance
  }

  /**
   * Initialize all 15 agents
   */
  public async initializeAll(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[AgentManager] Already initialized')
      return
    }

    try {
      logger.info('🚀 [AgentManager] Initializing Brain AI...')
      this.brainAI.initialize()

      logger.info('🚀 [AgentManager] Initializing all 15 agents...')

      // Create specialized agents
      const dexter = new DexterAgent()
      const cassie = new CassieAgent()
      const emmie = new EmmieAgent()
      const aura = new AuraAgent()

      // Create generic agents for remaining agents
      const genericAgents: GenericAgent[] = []
      for (const agentId of GENERIC_AGENTS) {
        const agent = createGenericAgent(agentId)
        if (agent) {
          genericAgents.push(agent)
        } else {
          logger.warn(`[AgentManager] Failed to create generic agent: ${agentId}`)
        }
      }

      // Initialize all specialized agents in parallel
      const specializedAgents = [dexter, cassie, emmie, aura]
      await Promise.all([
        ...specializedAgents.map(a => a.initialize()),
        ...genericAgents.map(a => a.initialize())
      ])

      // Register specialized agents
      this.agents.set('dexter', dexter)
      this.agents.set('cassie', cassie)
      this.agents.set('emmie', emmie)
      this.agents.set('aura', aura)

      // Register generic agents
      for (const agent of genericAgents) {
        this.agents.set(agent.getInfo().agentId, agent)
      }

      this.isInitialized = true
      logger.info(`✅ [AgentManager] All ${this.agents.size} agents initialized successfully`)
      logger.info(`[AgentManager] Active agents: ${Array.from(this.agents.keys()).join(', ')}`)
    } catch (error: any) {
      logger.error('❌ [AgentManager] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Get an agent by ID
   */
  public getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Get all agents
   */
  public getAllAgents(): Map<string, BaseAgent> {
    return this.agents
  }

  /**
   * Get agent health status
   */
  public getAgentHealth(agentId: string): any {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return {
        status: 'error',
        message: `Agent ${agentId} not found`
      }
    }
    return agent.getHealth()
  }

  /**
   * Get all agents health
   */
  public getAllAgentsHealth(): any {
    const healthStatus: any = {}
    this.agents.forEach((agent, id) => {
      healthStatus[id] = agent.getHealth()
    })
    return {
      status: 'ok',
      agents: healthStatus,
      totalAgents: this.agents.size,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Execute task on specific agent
   */
  public async executeTask(agentId: string, task: any): Promise<any> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }
    return await agent.execute(task)
  }

  /**
   * Get system-wide statistics
   */
  public getSystemStats(): any {
    const stats: any = {
      totalAgents: this.agents.size,
      brainAI: this.brainAI.getStats(),
      agents: {}
    }

    this.agents.forEach((agent, id) => {
      const health = agent.getHealth()
      stats.agents[id] = {
        status: health.status,
        metrics: health.metrics,
        capabilities: health.capabilities
      }
    })

    return stats
  }

  /**
   * Check if all agents are operational
   */
  public isSystemHealthy(): boolean {
    if (!this.isInitialized) return false

    let healthy = true
    this.agents.forEach((agent) => {
      const health = agent.getHealth()
      if (health.status !== 'online') {
        healthy = false
      }
    })

    return healthy
  }

  /**
   * Get Brain AI instance
   */
  public getBrainAI(): BrainAI {
    return this.brainAI
  }
}

export const agentManager = AgentManager.getInstance()
