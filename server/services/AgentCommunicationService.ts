import { logger } from '../utils/logger'
import { brainAI } from './BrainAIService'

interface AgentMessage {
  id: string
  from: string // Agent ID
  to: string   // Agent ID or 'broadcast'
  content: string
  type: 'request' | 'response' | 'notification' | 'data'
  metadata?: {
    requestId?: string
    priority?: 'low' | 'normal' | 'high'
    requiresResponse?: boolean
  }
  timestamp: string
}

interface AgentTask {
  id: string
  agentId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: any
  output?: any
  error?: string
  startedAt?: string
  completedAt?: string
  retryCount: number
  maxRetries: number
}

/**
 * Agent Communication Service
 * Enables agents to communicate with each other and coordinate tasks
 */
export class AgentCommunicationService {
  private messageQueue: Map<string, AgentMessage[]> = new Map()
  private taskQueue: Map<string, AgentTask[]> = new Map()
  private listeners: Map<string, ((message: AgentMessage) => void)[]> = new Map()

  /**
   * Send a message from one agent to another
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const fullMessage: AgentMessage = {
      ...message,
      id: messageId,
      timestamp: new Date().toISOString()
    }

    // Store message in Brain AI for context
    await brainAI.storeMemory(
      `Agent ${message.from} → ${message.to}: ${message.content}`,
      {
        source: 'agent-communication',
        agentId: message.from,
        tags: ['agent-message', message.type],
        category: 'communication'
      }
    )

    // Add to recipient's queue
    if (message.to === 'broadcast') {
      // Broadcast to all agents
      for (const [agentId, _] of this.messageQueue.entries()) {
        if (agentId !== message.from) {
          this.addToQueue(agentId, fullMessage)
        }
      }
    } else {
      this.addToQueue(message.to, fullMessage)
    }

    // Notify listeners
    this.notifyListeners(message.to, fullMessage)

    logger.info(`Message sent: ${message.from} → ${message.to} (${message.type})`)

    return messageId
  }

  /**
   * Add message to agent's queue
   */
  private addToQueue(agentId: string, message: AgentMessage) {
    if (!this.messageQueue.has(agentId)) {
      this.messageQueue.set(agentId, [])
    }

    const queue = this.messageQueue.get(agentId)!
    queue.push(message)

    // Keep only last 100 messages
    if (queue.length > 100) {
      this.messageQueue.set(agentId, queue.slice(-100))
    }
  }

  /**
   * Get messages for an agent
   */
  getMessages(agentId: string, filter?: {
    type?: AgentMessage['type']
    from?: string
    unreadOnly?: boolean
  }): AgentMessage[] {
    let messages = this.messageQueue.get(agentId) || []

    if (filter?.type) {
      messages = messages.filter(m => m.type === filter.type)
    }

    if (filter?.from) {
      messages = messages.filter(m => m.from === filter.from)
    }

    return messages
  }

  /**
   * Mark messages as read/processed
   */
  markAsRead(agentId: string, messageIds: string[]) {
    const queue = this.messageQueue.get(agentId) || []
    const updated = queue.filter(m => !messageIds.includes(m.id))
    this.messageQueue.set(agentId, updated)
  }

  /**
   * Subscribe to incoming messages
   */
  subscribe(agentId: string, listener: (message: AgentMessage) => void): () => void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, [])
    }

    this.listeners.get(agentId)!.push(listener)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(agentId) || []
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify listeners of new message
   */
  private notifyListeners(agentId: string, message: AgentMessage) {
    const listeners = this.listeners.get(agentId) || []
    listeners.forEach(listener => {
      try {
        listener(message)
      } catch (error) {
        logger.error(`Error in message listener for ${agentId}:`, error)
      }
    })
  }

  /**
   * Request task execution from another agent
   */
  async requestTask(options: {
    fromAgent: string
    toAgent: string
    taskType: string
    input: any
    priority?: 'low' | 'normal' | 'high'
    maxRetries?: number
  }): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const task: AgentTask = {
      id: taskId,
      agentId: options.toAgent,
      status: 'pending',
      input: options.input,
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    }

    // Add to task queue
    if (!this.taskQueue.has(options.toAgent)) {
      this.taskQueue.set(options.toAgent, [])
    }
    this.taskQueue.get(options.toAgent)!.push(task)

    // Send notification message
    await this.sendMessage({
      from: options.fromAgent,
      to: options.toAgent,
      type: 'request',
      content: `New task request: ${options.taskType}`,
      metadata: {
        priority: options.priority || 'normal',
        requiresResponse: true
      }
    })

    logger.info(`Task requested: ${taskId} (${options.fromAgent} → ${options.toAgent})`)

    return taskId
  }

  /**
   * Get pending tasks for an agent
   */
  getPendingTasks(agentId: string): AgentTask[] {
    const tasks = this.taskQueue.get(agentId) || []
    return tasks.filter(t => t.status === 'pending')
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    taskId: string,
    status: AgentTask['status'],
    result?: { output?: any; error?: string }
  ): boolean {
    for (const [agentId, tasks] of this.taskQueue.entries()) {
      const task = tasks.find(t => t.id === taskId)

      if (task) {
        task.status = status

        if (status === 'running' && !task.startedAt) {
          task.startedAt = new Date().toISOString()
        }

        if (status === 'completed' || status === 'failed') {
          task.completedAt = new Date().toISOString()
          if (result) {
            task.output = result.output
            task.error = result.error
          }
        }

        // Retry logic for failed tasks
        if (status === 'failed' && task.retryCount < task.maxRetries) {
          task.retryCount++
          task.status = 'pending'
          logger.info(`Retrying task ${taskId} (attempt ${task.retryCount}/${task.maxRetries})`)
        }

        return true
      }
    }

    return false
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | null {
    for (const tasks of this.taskQueue.values()) {
      const task = tasks.find(t => t.id === taskId)
      if (task) return task
    }
    return null
  }

  /**
   * Orchestrate a multi-agent workflow
   */
  async orchestrateWorkflow(workflow: {
    name: string
    steps: Array<{
      agentId: string
      taskType: string
      input: any | ((previousOutput: any) => any)
    }>
  }): Promise<{
    success: boolean
    results: any[]
    errors: string[]
  }> {
    const results: any[] = []
    const errors: string[] = []
    let previousOutput: any = null

    logger.info(`Starting workflow: ${workflow.name} (${workflow.steps.length} steps)`)

    for (const step of workflow.steps) {
      try {
        // Prepare input (may depend on previous step)
        const input = typeof step.input === 'function'
          ? step.input(previousOutput)
          : step.input

        // Request task from agent
        const taskId = await this.requestTask({
          fromAgent: 'workflow-orchestrator',
          toAgent: step.agentId,
          taskType: step.taskType,
          input,
          priority: 'normal'
        })

        // Wait for task completion (simplified - in production, use event-based approach)
        const result = await this.waitForTask(taskId, 30000) // 30 second timeout

        if (result.status === 'completed') {
          results.push(result.output)
          previousOutput = result.output
        } else {
          errors.push(`Step ${step.agentId} failed: ${result.error}`)
          break // Stop workflow on error
        }
      } catch (error: any) {
        errors.push(`Step ${step.agentId} error: ${error.message}`)
        break
      }
    }

    const success = errors.length === 0

    logger.info(`Workflow ${workflow.name} ${success ? 'completed' : 'failed'}`)

    return { success, results, errors }
  }

  /**
   * Wait for task to complete (helper method)
   */
  private async waitForTask(taskId: string, timeout: number): Promise<AgentTask> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.getTask(taskId)

        if (!task) {
          clearInterval(checkInterval)
          reject(new Error('Task not found'))
          return
        }

        if (task.status === 'completed' || task.status === 'failed') {
          clearInterval(checkInterval)
          resolve(task)
          return
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error('Task timeout'))
        }
      }, 500)
    })
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    totalMessages: number
    totalTasks: number
    activeAgents: number
    messagesByType: Record<string, number>
    tasksByStatus: Record<string, number>
  } {
    let totalMessages = 0
    const messagesByType: Record<string, number> = {}

    for (const messages of this.messageQueue.values()) {
      totalMessages += messages.length
      for (const msg of messages) {
        messagesByType[msg.type] = (messagesByType[msg.type] || 0) + 1
      }
    }

    let totalTasks = 0
    const tasksByStatus: Record<string, number> = {}

    for (const tasks of this.taskQueue.values()) {
      totalTasks += tasks.length
      for (const task of tasks) {
        tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1
      }
    }

    return {
      totalMessages,
      totalTasks,
      activeAgents: this.messageQueue.size,
      messagesByType,
      tasksByStatus
    }
  }
}

// Export singleton instance
export const agentComm = new AgentCommunicationService()
