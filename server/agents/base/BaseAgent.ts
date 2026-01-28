/**
 * Base Agent Class
 * Foundation for all 12 SINTRA.AI agents
 * Provides common functionality: Brain AI integration, validation, logging, health checks
 */

import { BrainAI } from '../../brain/BrainAI'
import { logger } from '../../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export interface AgentConfig {
  agentId: string
  name: string
  type: string
  version: string
  realDataMode: boolean
  capabilities: string[]
  endpoints: string[]
  apiKeyRequired?: boolean
  dataSourceRequired?: boolean
}

export interface AgentTask {
  id: string
  taskType: string
  input: any
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface AgentResult {
  success: boolean
  taskId: string
  data?: any
  error?: string
  timestamp: string
  duration?: number
  metadata?: any
}

export interface HealthStatus {
  status: 'online' | 'degraded' | 'offline'
  agent: string
  version: string
  realDataMode: boolean
  capabilities: string[]
  lastActivity: string
  metrics: {
    totalTasks: number
    successRate: number
    avgDuration: number
    errorCount: number
  }
  dependencies: {
    brainAI: boolean
    apiKey?: boolean
    dataSource?: boolean
  }
}

export abstract class BaseAgent {
  protected config: AgentConfig
  protected brainAI: BrainAI
  protected taskHistory: Map<string, AgentResult>
  protected metrics: {
    totalTasks: number
    successfulTasks: number
    failedTasks: number
    totalDuration: number
  }
  protected isInitialized: boolean

  constructor(config: AgentConfig) {
    this.config = config
    this.brainAI = BrainAI.getInstance()
    this.taskHistory = new Map()
    this.metrics = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      totalDuration: 0
    }
    this.isInitialized = false
  }

  /**
   * Initialize agent and register with Brain AI
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(`[${this.config.name}] Already initialized`)
      return
    }

    try {
      // Register with Brain AI
      this.brainAI.registerAgent({
        agentId: this.config.agentId,
        name: this.config.name,
        type: this.config.type,
        capabilities: this.config.capabilities,
        endpoints: this.config.endpoints
      })

      // Perform agent-specific initialization
      await this.onInitialize()

      this.isInitialized = true
      logger.info(`✅ [${this.config.name}] Initialized successfully`)

      // Store initialization in Brain AI
      this.storeContext({
        type: 'initialization',
        timestamp: new Date().toISOString(),
        version: this.config.version
      }, ['init'], 7)
    } catch (error: any) {
      logger.error(`❌ [${this.config.name}] Initialization failed:`, error)
      throw error
    }
  }

  /**
   * Execute a task
   */
  public async execute(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now()

    try {
      // Validate initialization
      if (!this.isInitialized) {
        throw new Error('Agent not initialized. Call initialize() first.')
      }

      // Validate real data mode
      if (this.config.realDataMode) {
        await this.validateRealDataMode()
      }

      // Execute agent-specific task
      logger.info(`[${this.config.name}] Executing task ${task.id} (type: ${task.taskType})`)

      const result = await this.onExecute(task)

      const duration = Date.now() - startTime

      const agentResult: AgentResult = {
        success: true,
        taskId: task.id,
        data: result,
        timestamp: new Date().toISOString(),
        duration,
        metadata: {
          agent: this.config.name,
          type: task.taskType
        }
      }

      // Update metrics
      this.metrics.totalTasks++
      this.metrics.successfulTasks++
      this.metrics.totalDuration += duration

      // Store in history
      this.taskHistory.set(task.id, agentResult)

      // Store in Brain AI
      this.storeContext({
        type: 'task_execution',
        task: task.taskType,
        result: 'success',
        duration
      }, [task.taskType, 'success'], 6)

      logger.info(`✅ [${this.config.name}] Task ${task.id} completed in ${duration}ms`)

      return agentResult
    } catch (error: any) {
      const duration = Date.now() - startTime

      const agentResult: AgentResult = {
        success: false,
        taskId: task.id,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration,
        metadata: {
          agent: this.config.name,
          type: task.taskType
        }
      }

      // Update metrics
      this.metrics.totalTasks++
      this.metrics.failedTasks++
      this.metrics.totalDuration += duration

      // Store in history
      this.taskHistory.set(task.id, agentResult)

      // Store error in Brain AI
      this.storeContext({
        type: 'task_error',
        task: task.taskType,
        error: error.message,
        duration
      }, [task.taskType, 'error'], 8)

      logger.error(`❌ [${this.config.name}] Task ${task.id} failed:`, error.message)

      return agentResult
    }
  }

  /**
   * Get health status
   */
  public getHealth(): HealthStatus {
    const successRate = this.metrics.totalTasks > 0
      ? (this.metrics.successfulTasks / this.metrics.totalTasks) * 100
      : 100

    const avgDuration = this.metrics.totalTasks > 0
      ? this.metrics.totalDuration / this.metrics.totalTasks
      : 0

    const status: HealthStatus = {
      status: this.isInitialized ? 'online' : 'offline',
      agent: this.config.name,
      version: this.config.version,
      realDataMode: this.config.realDataMode,
      capabilities: this.config.capabilities,
      lastActivity: new Date().toISOString(),
      metrics: {
        totalTasks: this.metrics.totalTasks,
        successRate: Math.round(successRate * 10) / 10,
        avgDuration: Math.round(avgDuration),
        errorCount: this.metrics.failedTasks
      },
      dependencies: {
        brainAI: true,
        apiKey: this.config.apiKeyRequired ? this.checkApiKey() : undefined,
        dataSource: this.config.dataSourceRequired ? this.checkDataSource() : undefined
      }
    }

    return status
  }

  /**
   * Store context in Brain AI
   */
  protected storeContext(context: any, tags: string[] = [], importance: number = 5): string {
    return this.brainAI.storeContext(this.config.agentId, context, tags, importance)
  }

  /**
   * Share context with another agent
   */
  protected shareWith(targetAgent: string, context: any, metadata?: any): void {
    this.brainAI.shareContext({
      sourceAgent: this.config.agentId,
      targetAgent,
      context,
      metadata
    })
  }

  /**
   * Broadcast to all agents
   */
  protected broadcast(context: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.brainAI.broadcast(this.config.agentId, context, priority)
  }

  /**
   * Get task history
   */
  public getTaskHistory(limit: number = 10): AgentResult[] {
    return Array.from(this.taskHistory.values())
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit)
  }

  /**
   * Create a task
   */
  public createTask(taskType: string, input: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): AgentTask {
    return {
      id: uuidv4(),
      taskType,
      input,
      timestamp: new Date().toISOString(),
      priority
    }
  }

  /**
   * Abstract methods to be implemented by specific agents
   */
  protected abstract onInitialize(): Promise<void>
  protected abstract onExecute(task: AgentTask): Promise<any>
  protected abstract validateRealDataMode(): Promise<void>
  protected abstract checkApiKey(): boolean
  protected abstract checkDataSource(): boolean

  /**
   * Get agent info
   */
  public getInfo(): AgentConfig {
    return { ...this.config }
  }

  /**
   * Get metrics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }
}
