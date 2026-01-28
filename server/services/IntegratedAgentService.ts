/**
 * Integrated Agent Service
 * Manages local agents
 */

import { Agent, AgentConfig, AgentLog, SystemMetrics } from '../../types/agent'

export class IntegratedAgentService {
  private localAgents: Agent[]

  constructor() {
    this.localAgents = []
    console.log(`[IntegratedAgentService] Initialized with ${this.localAgents.length} agent(s)`)
  }

  /**
   * Get all agents
   */
  async getAllAgents(): Promise<Agent[]> {
    return this.localAgents.map(agent => ({
      ...agent,
      updatedAt: new Date().toISOString()
    }))
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<Agent | null> {
    const agent = this.localAgents.find(a => a.id === id)
    return agent ? { ...agent, updatedAt: new Date().toISOString() } : null
  }

  /**
   * Start agent
   */
  async startAgent(id: string): Promise<Agent | null> {
    const agentIndex = this.localAgents.findIndex(a => a.id === id)
    if (agentIndex === -1) return null

    this.localAgents[agentIndex] = {
      ...this.localAgents[agentIndex],
      status: 'active',
      updatedAt: new Date().toISOString()
    }

    return this.localAgents[agentIndex]
  }

  /**
   * Stop agent
   */
  async stopAgent(id: string): Promise<Agent | null> {
    const agentIndex = this.localAgents.findIndex(a => a.id === id)
    if (agentIndex === -1) return null

    this.localAgents[agentIndex] = {
      ...this.localAgents[agentIndex],
      status: 'inactive',
      updatedAt: new Date().toISOString()
    }

    return this.localAgents[agentIndex]
  }

  /**
   * Restart agent
   */
  async restartAgent(id: string): Promise<Agent | null> {
    await this.stopAgent(id)
    return await this.startAgent(id)
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(id: string, config: Partial<AgentConfig>): Promise<Agent | null> {
    const agentIndex = this.localAgents.findIndex(a => a.id === id)
    if (agentIndex === -1) return null

    this.localAgents[agentIndex] = {
      ...this.localAgents[agentIndex],
      config: { ...this.localAgents[agentIndex].config, ...config },
      updatedAt: new Date().toISOString()
    }

    return this.localAgents[agentIndex]
  }

  /**
   * Get agent logs
   */
  async getAgentLogs(agentId: string, limit: number = 50): Promise<AgentLog[]> {
    // Mock logs for now
    return []
  }

  /**
   * Execute agent task
   */
  async executeAgentTask(agentId: string, task: string, params?: any): Promise<any> {
    const agent = this.localAgents.find(a => a.id === agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    // Mock response
    return {
      success: true,
      agentId,
      task,
      result: {
        message: 'Task executed successfully',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const activeAgents = this.localAgents.filter(a => a.status === 'active').length
    const inactiveAgents = this.localAgents.filter(a => a.status === 'inactive').length
    const errorAgents = this.localAgents.filter(a => a.status === 'error').length

    return {
      totalAgents: this.localAgents.length,
      activeAgents,
      inactiveAgents,
      errorAgents,
      cpuUsage: Math.random() * 40 + 20,
      memoryUsage: Math.random() * 30 + 40,
      alerts: 0
    }
  }
}

// Export singleton instance
export const integratedAgentService = new IntegratedAgentService()
