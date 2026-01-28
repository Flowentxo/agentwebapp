/**
 * Generic Agent - Base implementation for agents without specialized logic
 * Uses OpenAI for all responses based on the agent's persona
 */

import { BaseAgent, AgentTask } from '../base/BaseAgent'
import { logger } from '../../utils/logger'
import { OpenAIService } from '../../services/OpenAIService'
import { agentPersonas, AgentPersona } from '../../../lib/agents/personas'
import { getAgentSystemPrompt } from '../../../lib/agents/prompts'

interface GenericAgentConfig {
  agentId: string
  name: string
  type: string
  version: string
  capabilities: string[]
  endpoints: string[]
  persona: AgentPersona
}

export class GenericAgent extends BaseAgent {
  private openAIService: OpenAIService
  private persona: AgentPersona

  constructor(config: GenericAgentConfig) {
    super({
      agentId: config.agentId,
      name: config.name,
      type: config.type,
      version: config.version || '1.0.0',
      realDataMode: true,
      capabilities: config.capabilities,
      endpoints: config.endpoints,
      apiKeyRequired: true,
      dataSourceRequired: false
    })

    this.persona = config.persona
    this.openAIService = new OpenAIService()
  }

  protected async onInitialize(): Promise<void> {
    logger.info(`[${this.config.name}] Initializing generic agent capabilities`)

    // Store initialization in Brain AI
    this.storeContext({
      type: 'initialization',
      message: `${this.config.name} initialized`,
      capabilities: this.config.capabilities,
      role: this.persona.role
    }, ['initialization', this.config.agentId], 7)

    logger.info(`[${this.config.name}] Ready with ${this.config.capabilities.length} capabilities`)
  }

  protected async onExecute(task: AgentTask): Promise<any> {
    switch (task.taskType) {
      case 'chat':
        return await this.handleChat(task.input)
      case 'process':
        return await this.processTask(task.input)
      case 'analyze':
        return await this.analyzeContent(task.input)
      case 'generate':
        return await this.generateContent(task.input)
      default:
        // For unknown task types, try to handle via chat
        return await this.handleChat({ message: task.input.message || JSON.stringify(task.input) })
    }
  }

  protected async validateRealDataMode(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required.')
    }

    const brainHealth = this.brainAI.health()
    if (!brainHealth.initialized) {
      throw new Error('Brain AI not initialized.')
    }
  }

  protected checkApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  protected checkDataSource(): boolean {
    return true // Uses Brain AI
  }

  /**
   * Handle chat message with persona-specific responses
   */
  private async handleChat(input: any): Promise<any> {
    const { message, conversationHistory = [] } = input

    if (!message) {
      throw new Error('Message is required')
    }

    try {
      // Get system prompt for this agent
      const systemPrompt = getAgentSystemPrompt(this.persona)

      // Build messages array
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map((h: any) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content
        })),
        { role: 'user' as const, content: message }
      ]

      // Generate response using OpenAI
      const result = await this.openAIService.generateChatCompletion(messages)
      const response = result.message

      // Store in Brain AI
      this.storeContext({
        type: 'chat_response',
        messagePreview: message.substring(0, 100),
        responsePreview: response.substring(0, 100)
      }, ['chat', this.config.agentId], 5)

      return {
        response,
        agent: this.config.agentId,
        name: this.config.name,
        timestamp: new Date().toISOString()
      }
    } catch (error: any) {
      logger.error(`[${this.config.name}] Chat error:`, error)
      throw new Error('Failed to generate response')
    }
  }

  /**
   * Process a generic task
   */
  private async processTask(input: any): Promise<any> {
    const { task, context = {} } = input

    if (!task) {
      throw new Error('Task description is required')
    }

    try {
      const systemPrompt = getAgentSystemPrompt(this.persona)
      const prompt = `Task: ${task}\nContext: ${JSON.stringify(context)}\n\nPlease complete this task based on your specialties.`

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt }
      ]
      const result = await this.openAIService.generateChatCompletion(messages)
      const response = result.message

      // Store in Brain AI
      this.storeContext({
        type: 'task_processed',
        task: task.substring(0, 100)
      }, ['task', this.config.agentId], 6)

      return {
        result: response,
        agent: this.config.agentId,
        name: this.config.name,
        timestamp: new Date().toISOString()
      }
    } catch (error: any) {
      logger.error(`[${this.config.name}] Task processing error:`, error)
      throw new Error('Failed to process task')
    }
  }

  /**
   * Analyze content
   */
  private async analyzeContent(input: any): Promise<any> {
    const { content, analysisType = 'general' } = input

    if (!content) {
      throw new Error('Content is required for analysis')
    }

    try {
      const systemPrompt = getAgentSystemPrompt(this.persona)
      const prompt = `Analyze the following content (${analysisType} analysis):\n\n${content}`

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt }
      ]
      const result = await this.openAIService.generateChatCompletion(messages)
      const response = result.message

      // Store in Brain AI
      this.storeContext({
        type: 'content_analyzed',
        analysisType,
        contentPreview: content.substring(0, 100)
      }, ['analysis', this.config.agentId, analysisType], 6)

      return {
        analysis: response,
        type: analysisType,
        agent: this.config.agentId,
        name: this.config.name,
        timestamp: new Date().toISOString()
      }
    } catch (error: any) {
      logger.error(`[${this.config.name}] Analysis error:`, error)
      throw new Error('Failed to analyze content')
    }
  }

  /**
   * Generate content
   */
  private async generateContent(input: any): Promise<any> {
    const { prompt, format = 'text', context = {} } = input

    if (!prompt) {
      throw new Error('Prompt is required for content generation')
    }

    try {
      const systemPrompt = getAgentSystemPrompt(this.persona)
      const fullPrompt = `Generate the following (format: ${format}):\n${prompt}\n\nContext: ${JSON.stringify(context)}`

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: fullPrompt }
      ]
      const result = await this.openAIService.generateChatCompletion(messages)
      const response = result.message

      // Store in Brain AI
      this.storeContext({
        type: 'content_generated',
        format,
        promptPreview: prompt.substring(0, 100)
      }, ['generation', this.config.agentId, format], 6)

      return {
        content: response,
        format,
        agent: this.config.agentId,
        name: this.config.name,
        timestamp: new Date().toISOString()
      }
    } catch (error: any) {
      logger.error(`[${this.config.name}] Generation error:`, error)
      throw new Error('Failed to generate content')
    }
  }

  /**
   * Get persona info
   */
  public getPersona(): AgentPersona {
    return this.persona
  }
}

/**
 * Factory function to create generic agents from personas
 */
export function createGenericAgent(agentId: string): GenericAgent | null {
  const persona = agentPersonas.find(p => p.id === agentId)

  if (!persona) {
    logger.error(`[GenericAgent] Persona not found for agent: ${agentId}`)
    return null
  }

  return new GenericAgent({
    agentId: persona.id,
    name: persona.name,
    type: persona.category || 'general',
    version: '1.0.0',
    capabilities: persona.specialties,
    endpoints: [
      `/api/agents/${persona.id}/chat`,
      `/api/agents/${persona.id}/process`,
      `/api/agents/${persona.id}/health`
    ],
    persona
  })
}
