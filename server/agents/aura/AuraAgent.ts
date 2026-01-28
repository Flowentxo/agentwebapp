/**
 * Aura Agent - Workflow Orchestration & Automation (ENHANCED v2.0)
 * Automates cross-agent triggers and manages complex workflow chains
 * Real data mode enforced with Brain AI integration
 */

import { BaseAgent, AgentTask } from '../base/BaseAgent'
import { logger } from '../../utils/logger'

interface Workflow {
  id: string
  name: string
  trigger: {
    type: 'agent_event' | 'schedule' | 'manual' | 'condition'
    source?: string
    eventType?: string
    condition?: string
    schedule?: string
  }
  actions: Array<{
    agentId: string
    taskType: string
    input: any
    order: number
  }>
  status: 'active' | 'inactive' | 'running' | 'paused'
  createdAt: string
  lastRun?: string
  runCount: number
  successCount: number
  errorCount: number
}

interface WorkflowExecution {
  executionId: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'partial'
  startedAt: string
  completedAt?: string
  steps: Array<{
    agentId: string
    taskType: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    result?: any
    error?: string
    duration?: number
  }>
}

export class AuraAgent extends BaseAgent {
  private workflows: Map<string, Workflow>
  private activeExecutions: Map<string, WorkflowExecution>
  private scheduledTasks: Map<string, NodeJS.Timeout>

  constructor() {
    super({
      agentId: 'aura',
      name: 'Aura',
      type: 'orchestration',
      version: '2.0.0',
      realDataMode: true,
      capabilities: [
        'workflow_automation',
        'task_scheduling',
        'inter_agent_coordination',
        'trigger_management',
        'process_optimization',
        'event_handling',
        'conditional_logic',
        'parallel_execution'
      ],
      endpoints: [
        '/api/agents/aura/trigger',
        '/api/agents/aura/workflows',
        '/api/agents/aura/status',
        '/api/agents/aura/executions',
        '/api/agents/aura/health'
      ],
      apiKeyRequired: false,
      dataSourceRequired: false
    })

    this.workflows = new Map()
    this.activeExecutions = new Map()
    this.scheduledTasks = new Map()
  }

  protected async onInitialize(): Promise<void> {
    logger.info('[Aura] Initializing workflow orchestration capabilities')

    // Create default workflows
    await this.createDefaultWorkflows()

    // Store initialization in Brain AI
    this.storeContext({
      type: 'initialization',
      message: 'Aura workflow orchestration started',
      capabilities: this.config.capabilities,
      workflowCount: this.workflows.size
    }, ['initialization', 'orchestration'], 8)

    logger.info(`[Aura] ${this.workflows.size} workflows initialized`)
  }

  protected async onExecute(task: AgentTask): Promise<any> {
    switch (task.taskType) {
      case 'trigger_workflow':
        return await this.triggerWorkflow(task.input)
      case 'create_workflow':
        return await this.createWorkflow(task.input)
      case 'update_workflow':
        return await this.updateWorkflow(task.input)
      case 'delete_workflow':
        return await this.deleteWorkflow(task.input)
      case 'list_workflows':
        return await this.listWorkflows(task.input)
      case 'get_execution_status':
        return await this.getExecutionStatus(task.input)
      case 'list_executions':
        return await this.listExecutions(task.input)
      case 'coordinate_agents':
        return await this.coordinateAgents(task.input)
      default:
        throw new Error(`Unknown task type: ${task.taskType}`)
    }
  }

  protected async validateRealDataMode(): Promise<void> {
    const brainHealth = this.brainAI.health()
    if (!brainHealth.initialized) {
      throw new Error('Brain AI not initialized. Aura requires Brain AI for workflow coordination.')
    }
  }

  protected checkApiKey(): boolean {
    return true // Aura doesn't need external API key
  }

  protected checkDataSource(): boolean {
    return true // Uses Brain AI
  }

  /**
   * Create default workflow automations
   */
  private async createDefaultWorkflows(): Promise<void> {
    // Workflow 1: Analysis → Report → Notify
    const analysisWorkflow: Workflow = {
      id: 'wf_analysis_to_report',
      name: 'Analysis Complete → Generate Report → Notify',
      trigger: {
        type: 'agent_event',
        source: 'dexter',
        eventType: 'analysis_complete'
      },
      actions: [
        {
          agentId: 'nova',
          taskType: 'create_report',
          input: { reportType: 'executive' },
          order: 1
        },
        {
          agentId: 'echo',
          taskType: 'send_notification',
          input: {
            type: 'in-app',
            priority: 'medium',
            recipients: ['admin@agent-system.com'],
            subject: 'Analysis Report Ready',
            body: 'Your analysis report has been generated'
          },
          order: 2
        }
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      runCount: 0,
      successCount: 0,
      errorCount: 0
    }

    // Workflow 2: Health Alert
    const healthWorkflow: Workflow = {
      id: 'wf_health_alert',
      name: 'System Health Critical → Send Alert',
      trigger: {
        type: 'agent_event',
        source: 'omni',
        eventType: 'health_critical'
      },
      actions: [
        {
          agentId: 'echo',
          taskType: 'send_notification',
          input: {
            type: 'in-app',
            priority: 'critical',
            recipients: ['admin@agent-system.com'],
            subject: 'CRITICAL: System Health Alert',
            body: 'System health has degraded to critical status'
          },
          order: 1
        }
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      runCount: 0,
      successCount: 0,
      errorCount: 0
    }

    // Workflow 3: Daily Report Generation
    const dailyReportWorkflow: Workflow = {
      id: 'wf_daily_report',
      name: 'Daily System Report',
      trigger: {
        type: 'schedule',
        schedule: '0 9 * * *' // Every day at 9 AM
      },
      actions: [
        {
          agentId: 'omni',
          taskType: 'check_health',
          input: {},
          order: 1
        },
        {
          agentId: 'nova',
          taskType: 'create_report',
          input: { reportType: 'executive' },
          order: 2
        },
        {
          agentId: 'echo',
          taskType: 'send_notification',
          input: {
            type: 'in-app',
            priority: 'low',
            recipients: ['admin@agent-system.com'],
            subject: 'Daily System Report',
            body: 'Your daily system report is ready'
          },
          order: 3
        }
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      runCount: 0,
      successCount: 0,
      errorCount: 0
    }

    this.workflows.set(analysisWorkflow.id, analysisWorkflow)
    this.workflows.set(healthWorkflow.id, healthWorkflow)
    this.workflows.set(dailyReportWorkflow.id, dailyReportWorkflow)
  }

  /**
   * Trigger a workflow execution
   */
  private async triggerWorkflow(input: any): Promise<any> {
    const { workflowId, triggerData } = input

    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active`)
    }

    // Create execution
    const execution: WorkflowExecution = {
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps: workflow.actions.map(action => ({
        agentId: action.agentId,
        taskType: action.taskType,
        status: 'pending'
      }))
    }

    this.activeExecutions.set(execution.executionId, execution)

    // Store trigger in Brain AI
    this.storeContext({
      type: 'workflow_triggered',
      workflowId,
      executionId: execution.executionId,
      workflowName: workflow.name,
      actionCount: workflow.actions.length
    }, ['workflow', 'trigger', workflowId], 7)

    // Execute workflow asynchronously
    this.executeWorkflow(workflow, execution, triggerData).catch(error => {
      logger.error(`[Aura] Workflow execution failed:`, error)
    })

    // Update workflow stats
    workflow.runCount++
    workflow.lastRun = new Date().toISOString()

    return {
      executionId: execution.executionId,
      workflowId,
      workflowName: workflow.name,
      status: 'started',
      steps: workflow.actions.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeWorkflow(
    workflow: Workflow,
    execution: WorkflowExecution,
    triggerData: any
  ): Promise<void> {
    const startTime = Date.now()

    try {
      // Sort actions by order
      const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order)

      for (let i = 0; i < sortedActions.length; i++) {
        const action = sortedActions[i]
        const step = execution.steps[i]

        step.status = 'running'

        const stepStartTime = Date.now()

        try {
          // Share context with target agent via Brain AI
          const result = this.shareWith(action.agentId, {
            type: 'workflow_action',
            workflowId: workflow.id,
            executionId: execution.executionId,
            taskType: action.taskType,
            input: { ...action.input, triggerData }
          })

          step.status = 'completed'
          step.result = result
          step.duration = Date.now() - stepStartTime

          logger.info(`[Aura] Workflow step completed: ${action.agentId}.${action.taskType}`)
        } catch (error: any) {
          step.status = 'failed'
          step.error = error.message
          step.duration = Date.now() - stepStartTime

          logger.error(`[Aura] Workflow step failed: ${action.agentId}.${action.taskType}`, error)

          // Mark execution as partial failure but continue
          execution.status = 'partial'
          workflow.errorCount++
        }
      }

      // Mark execution as completed if no failures
      if (!execution.steps.some(s => s.status === 'failed')) {
        execution.status = 'completed'
        workflow.successCount++
      } else {
        execution.status = 'partial'
      }

      execution.completedAt = new Date().toISOString()

      // Store completion in Brain AI
      this.storeContext({
        type: 'workflow_completed',
        workflowId: workflow.id,
        executionId: execution.executionId,
        status: execution.status,
        duration: Date.now() - startTime,
        steps: execution.steps.length,
        failed: execution.steps.filter(s => s.status === 'failed').length
      }, ['workflow', 'completed', workflow.id], 6)

      // Broadcast completion
      this.broadcast({
        type: 'workflow_completed',
        workflowId: workflow.id,
        executionId: execution.executionId,
        status: execution.status
      }, 'medium')

    } catch (error: any) {
      execution.status = 'failed'
      execution.completedAt = new Date().toISOString()
      workflow.errorCount++

      logger.error(`[Aura] Workflow execution failed:`, error)

      // Store error in Brain AI
      this.storeContext({
        type: 'workflow_failed',
        workflowId: workflow.id,
        executionId: execution.executionId,
        error: error.message,
        duration: Date.now() - startTime
      }, ['workflow', 'error', workflow.id], 8)
    }
  }

  /**
   * Create a new workflow
   */
  private async createWorkflow(input: any): Promise<any> {
    const { name, trigger, actions } = input

    if (!name || !trigger || !actions || actions.length === 0) {
      throw new Error('name, trigger, and actions are required')
    }

    const workflow: Workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      trigger,
      actions: actions.map((action: any, index: number) => ({
        ...action,
        order: action.order !== undefined ? action.order : index + 1
      })),
      status: 'active',
      createdAt: new Date().toISOString(),
      runCount: 0,
      successCount: 0,
      errorCount: 0
    }

    this.workflows.set(workflow.id, workflow)

    // Store in Brain AI
    this.storeContext({
      type: 'workflow_created',
      workflowId: workflow.id,
      workflowName: name,
      triggerType: trigger.type,
      actionCount: actions.length
    }, ['workflow', 'created'], 7)

    logger.info(`[Aura] Workflow created: ${workflow.id} - ${name}`)

    return {
      workflowId: workflow.id,
      name: workflow.name,
      status: workflow.status,
      actions: workflow.actions.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Update existing workflow
   */
  private async updateWorkflow(input: any): Promise<any> {
    const { workflowId, updates } = input

    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    // Update workflow properties
    if (updates.name) workflow.name = updates.name
    if (updates.status) workflow.status = updates.status
    if (updates.trigger) workflow.trigger = updates.trigger
    if (updates.actions) {
      workflow.actions = updates.actions.map((action: any, index: number) => ({
        ...action,
        order: action.order !== undefined ? action.order : index + 1
      }))
    }

    // Store update in Brain AI
    this.storeContext({
      type: 'workflow_updated',
      workflowId,
      updates: Object.keys(updates)
    }, ['workflow', 'updated', workflowId], 6)

    return {
      workflowId,
      name: workflow.name,
      status: workflow.status,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Delete workflow
   */
  private async deleteWorkflow(input: any): Promise<any> {
    const { workflowId } = input

    if (!this.workflows.has(workflowId)) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    this.workflows.delete(workflowId)

    // Cancel any scheduled tasks
    if (this.scheduledTasks.has(workflowId)) {
      clearInterval(this.scheduledTasks.get(workflowId)!)
      this.scheduledTasks.delete(workflowId)
    }

    // Store deletion in Brain AI
    this.storeContext({
      type: 'workflow_deleted',
      workflowId
    }, ['workflow', 'deleted'], 6)

    return {
      workflowId,
      status: 'deleted',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * List all workflows
   */
  private async listWorkflows(input: any): Promise<any> {
    const { status, limit } = input

    let workflows = Array.from(this.workflows.values())

    if (status) {
      workflows = workflows.filter(w => w.status === status)
    }

    if (limit) {
      workflows = workflows.slice(0, limit)
    }

    return {
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        trigger: w.trigger,
        actions: w.actions.length,
        runCount: w.runCount,
        successCount: w.successCount,
        errorCount: w.errorCount,
        lastRun: w.lastRun,
        createdAt: w.createdAt
      })),
      total: workflows.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get execution status
   */
  private async getExecutionStatus(input: any): Promise<any> {
    const { executionId } = input

    const execution = this.activeExecutions.get(executionId)
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`)
    }

    return {
      ...execution,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * List recent executions
   */
  private async listExecutions(input: any): Promise<any> {
    const { workflowId, status, limit } = input

    let executions = Array.from(this.activeExecutions.values())

    if (workflowId) {
      executions = executions.filter(e => e.workflowId === workflowId)
    }

    if (status) {
      executions = executions.filter(e => e.status === status)
    }

    // Sort by most recent
    executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

    if (limit) {
      executions = executions.slice(0, limit)
    }

    return {
      executions,
      total: executions.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Coordinate multiple agents
   */
  private async coordinateAgents(input: any): Promise<any> {
    const { agents, task } = input

    if (!agents || agents.length === 0) {
      throw new Error('No agents specified for coordination')
    }

    const coordinationId = `coord_${Date.now()}`

    // Share coordination task with all agents
    for (const agentId of agents) {
      this.shareWith(agentId, {
        type: 'coordination',
        coordinationId,
        task,
        participants: agents
      })
    }

    // Store coordination in Brain AI
    this.storeContext({
      type: 'agent_coordination',
      coordinationId,
      agents,
      task
    }, ['coordination', ...agents], 7)

    return {
      coordinationId,
      agents,
      status: 'coordinated',
      timestamp: new Date().toISOString()
    }
  }
}
