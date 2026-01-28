import { Agent, AgentConfig, AgentLog, SystemMetrics } from '../../src/types/agent'
import { initialAgentsData } from '../../src/data/agentsData'

export class AgentService {
  private agents: Agent[] = [...initialAgentsData]

  async getAllAgents(): Promise<Agent[]> {
    return this.agents
  }

  async getAgentById(id: string): Promise<Agent | undefined> {
    return this.agents.find(agent => agent.id === id)
  }

  async startAgent(id: string): Promise<Agent> {
    const agent = this.agents.find(a => a.id === id)
    if (!agent) throw new Error('Agent not found')

    agent.status = 'active'
    agent.lastAction = 'Agent gestartet'
    agent.updatedAt = new Date().toISOString()
    agent.metrics.lastActivity = new Date().toISOString()

    return agent
  }

  async stopAgent(id: string): Promise<Agent> {
    const agent = this.agents.find(a => a.id === id)
    if (!agent) throw new Error('Agent not found')

    agent.status = 'inactive'
    agent.lastAction = 'Agent gestoppt'
    agent.updatedAt = new Date().toISOString()

    return agent
  }

  async restartAgent(id: string): Promise<Agent> {
    await this.stopAgent(id)
    await new Promise(resolve => setTimeout(resolve, 1000))
    return await this.startAgent(id)
  }

  async getAgentLogs(id: string): Promise<AgentLog[]> {
    const agent = this.agents.find(a => a.id === id)
    if (!agent) throw new Error('Agent not found')

    return agent.logs
  }

  async updateAgentConfig(id: string, config: Partial<AgentConfig>): Promise<Agent> {
    const agent = this.agents.find(a => a.id === id)
    if (!agent) throw new Error('Agent not found')

    agent.config = { ...agent.config, ...config }
    agent.updatedAt = new Date().toISOString()
    agent.lastAction = 'Konfiguration aktualisiert'

    return agent
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const totalAgents = this.agents.length
    const activeAgents = this.agents.filter(a => a.status === 'active').length
    const inactiveAgents = this.agents.filter(a => a.status === 'inactive').length
    const errorAgents = this.agents.filter(a => a.status === 'error').length

    return {
      totalAgents,
      activeAgents,
      inactiveAgents,
      errorAgents,
      cpuUsage: Math.random() * 40 + 30,
      memoryUsage: Math.random() * 30 + 50,
      alerts: errorAgents
    }
  }
}
