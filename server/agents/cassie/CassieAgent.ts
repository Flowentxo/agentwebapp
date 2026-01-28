/**
 * Cassie Agent - Communication & CRM (ENHANCED v2.0)
 * Manages customer conversations, CRM tickets, and sentiment analysis
 * Real data mode enforced with Brain AI integration
 */

import { BaseAgent, AgentTask } from '../base/BaseAgent'
import { logger } from '../../utils/logger'
import { OpenAIService } from '../../services/OpenAIService'

interface Conversation {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  assignedTo?: string
  tags: string[]
  sentiment?: {
    score: number
    label: 'positive' | 'neutral' | 'negative'
    confidence: number
  }
}

interface Message {
  id: string
  sender: 'customer' | 'agent' | 'system'
  content: string
  timestamp: string
  sentiment?: {
    score: number
    label: string
  }
}

interface Ticket {
  id: string
  conversationId: string
  type: 'bug' | 'feature' | 'question' | 'complaint'
  status: 'new' | 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  createdAt: string
  resolvedAt?: string
  assignedTo?: string
  resolutionNotes?: string
}

export class CassieAgent extends BaseAgent {
  private conversations: Map<string, Conversation>
  private tickets: Map<string, Ticket>
  private openAIService: OpenAIService

  constructor() {
    super({
      agentId: 'cassie',
      name: 'Cassie',
      type: 'support',
      version: '2.0.0',
      realDataMode: true,
      capabilities: [
        'customer_support',
        'conversation_management',
        'sentiment_analysis',
        'ticket_management',
        'email_handling',
        'crm_integration',
        'response_generation',
        'customer_insights'
      ],
      endpoints: [
        '/api/agents/cassie/conversations',
        '/api/agents/cassie/reply',
        '/api/agents/cassie/tickets',
        '/api/agents/cassie/sentiment',
        '/api/agents/cassie/health'
      ],
      apiKeyRequired: true,
      dataSourceRequired: false
    })

    this.conversations = new Map()
    this.tickets = new Map()
    this.openAIService = new OpenAIService()
  }

  protected async onInitialize(): Promise<void> {
    logger.info('[Cassie] Initializing communication and CRM capabilities')

    // Create sample conversations for demo
    await this.createSampleData()

    // Store initialization in Brain AI
    this.storeContext({
      type: 'initialization',
      message: 'Cassie CRM system started',
      capabilities: this.config.capabilities,
      conversationCount: this.conversations.size,
      ticketCount: this.tickets.size
    }, ['initialization', 'crm'], 8)

    logger.info(`[Cassie] ${this.conversations.size} conversations, ${this.tickets.size} tickets loaded`)
  }

  protected async onExecute(task: AgentTask): Promise<any> {
    switch (task.taskType) {
      case 'get_conversations':
        return await this.getConversations(task.input)
      case 'get_conversation':
        return await this.getConversation(task.input)
      case 'send_message':
        return await this.sendMessage(task.input)
      case 'create_ticket':
        return await this.createTicket(task.input)
      case 'update_ticket':
        return await this.updateTicket(task.input)
      case 'get_tickets':
        return await this.getTickets(task.input)
      case 'analyze_sentiment':
        return await this.analyzeSentiment(task.input)
      case 'get_customer_insights':
        return await this.getCustomerInsights(task.input)
      case 'generate_reply':
        return await this.generateReply(task.input)
      default:
        throw new Error(`Unknown task type: ${task.taskType}`)
    }
  }

  protected async validateRealDataMode(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for sentiment analysis and AI responses.')
    }

    const brainHealth = this.brainAI.health()
    if (!brainHealth.initialized) {
      throw new Error('Brain AI not initialized. Cassie requires Brain AI for conversation storage.')
    }
  }

  protected checkApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  protected checkDataSource(): boolean {
    return true // Uses Brain AI
  }

  /**
   * Create sample data for demonstration
   */
  private async createSampleData(): Promise<void> {
    // Sample conversation 1
    const conv1: Conversation = {
      id: 'conv_001',
      customerId: 'cust_001',
      customerName: 'John Smith',
      customerEmail: 'john.smith@example.com',
      status: 'open',
      priority: 'high',
      subject: 'Issue with dashboard loading',
      messages: [
        {
          id: 'msg_001',
          sender: 'customer',
          content: 'Hi, my dashboard is not loading. It shows a blank screen.',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'msg_002',
          sender: 'agent',
          content: 'Hello John, I apologize for the inconvenience. Let me investigate this issue for you.',
          timestamp: new Date(Date.now() - 3000000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3000000).toISOString(),
      assignedTo: 'agent_admin',
      tags: ['technical', 'dashboard', 'urgent']
    }

    // Sample conversation 2
    const conv2: Conversation = {
      id: 'conv_002',
      customerId: 'cust_002',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.j@example.com',
      status: 'resolved',
      priority: 'medium',
      subject: 'Question about export features',
      messages: [
        {
          id: 'msg_003',
          sender: 'customer',
          content: 'Can I export reports to PDF format?',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'msg_004',
          sender: 'agent',
          content: 'Yes! You can export reports in PDF, CSV, and XLSX formats using the export button.',
          timestamp: new Date(Date.now() - 7000000).toISOString()
        },
        {
          id: 'msg_005',
          sender: 'customer',
          content: 'Perfect, thank you!',
          timestamp: new Date(Date.now() - 6900000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 6900000).toISOString(),
      tags: ['feature', 'export']
    }

    this.conversations.set(conv1.id, conv1)
    this.conversations.set(conv2.id, conv2)

    // Sample ticket
    const ticket1: Ticket = {
      id: 'ticket_001',
      conversationId: 'conv_001',
      type: 'bug',
      status: 'in-progress',
      priority: 'high',
      title: 'Dashboard blank screen issue',
      description: 'Customer reports dashboard shows blank screen after login',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      assignedTo: 'agent_admin'
    }

    this.tickets.set(ticket1.id, ticket1)
  }

  /**
   * Get conversations list
   */
  private async getConversations(input: any): Promise<any> {
    const { status, priority, limit, offset } = input

    let conversations = Array.from(this.conversations.values())

    // Filter by status
    if (status) {
      conversations = conversations.filter(c => c.status === status)
    }

    // Filter by priority
    if (priority) {
      conversations = conversations.filter(c => c.priority === priority)
    }

    // Sort by most recent
    conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    // Pagination
    const start = offset || 0
    const end = limit ? start + limit : conversations.length
    const paginatedConversations = conversations.slice(start, end)

    // Store query in Brain AI
    this.storeContext({
      type: 'conversations_queried',
      filters: { status, priority },
      resultCount: paginatedConversations.length
    }, ['conversation', 'query'], 5)

    return {
      conversations: paginatedConversations.map(c => ({
        ...c,
        messageCount: c.messages.length,
        lastMessage: c.messages[c.messages.length - 1]
      })),
      total: conversations.length,
      offset: start,
      limit: limit || conversations.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get single conversation with full details
   */
  private async getConversation(input: any): Promise<any> {
    const { conversationId } = input

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Analyze sentiment of recent messages if not done
    if (!conversation.sentiment) {
      const recentMessages = conversation.messages.slice(-3).map(m => m.content).join('\n')
      try {
        const sentiment = await this.performSentimentAnalysis(recentMessages)
        conversation.sentiment = sentiment
      } catch (error) {
        logger.warn('[Cassie] Sentiment analysis failed, skipping')
      }
    }

    return {
      ...conversation,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Send message in conversation
   */
  private async sendMessage(input: any): Promise<any> {
    const { conversationId, content, sender = 'agent' } = input

    if (!conversationId || !content) {
      throw new Error('conversationId and content are required')
    }

    let conversation = this.conversations.get(conversationId)

    // Create new conversation if doesn't exist
    if (!conversation) {
      conversation = {
        id: conversationId,
        customerId: input.customerId || 'unknown',
        customerName: input.customerName || 'Unknown Customer',
        customerEmail: input.customerEmail || '',
        status: 'open',
        priority: input.priority || 'medium',
        subject: input.subject || 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: input.tags || []
      }
      this.conversations.set(conversationId, conversation)
    }

    // Create message
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender,
      content,
      timestamp: new Date().toISOString()
    }

    // Analyze sentiment of message
    try {
      const sentiment = await this.performSentimentAnalysis(content)
      message.sentiment = sentiment
    } catch (error) {
      logger.warn('[Cassie] Sentiment analysis failed for message')
    }

    conversation.messages.push(message)
    conversation.updatedAt = new Date().toISOString()

    // Store in Brain AI
    this.storeContext({
      type: 'message_sent',
      conversationId,
      sender,
      messageId: message.id,
      sentiment: message.sentiment?.label
    }, ['conversation', conversationId, 'message'], 6)

    // Broadcast via WebSocket
    this.broadcast({
      type: 'message_sent',
      conversationId,
      message
    }, 'medium')

    // Notify via Echo if customer message
    if (sender === 'customer') {
      this.shareWith('echo', {
        type: 'new_customer_message',
        conversationId,
        customerId: conversation.customerId,
        content: content.substring(0, 100)
      })
    }

    return {
      messageId: message.id,
      conversationId,
      status: 'sent',
      sentiment: message.sentiment,
      timestamp: message.timestamp
    }
  }

  /**
   * Create support ticket
   */
  private async createTicket(input: any): Promise<any> {
    const { conversationId, type, title, description, priority = 'medium' } = input

    if (!title || !description) {
      throw new Error('title and description are required')
    }

    const ticket: Ticket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: conversationId || '',
      type: type || 'question',
      status: 'new',
      priority,
      title,
      description,
      createdAt: new Date().toISOString()
    }

    this.tickets.set(ticket.id, ticket)

    // Store in Brain AI
    this.storeContext({
      type: 'ticket_created',
      ticketId: ticket.id,
      ticketType: type,
      priority,
      conversationId
    }, ['ticket', 'created', ticket.id], 7)

    // Broadcast
    this.broadcast({
      type: 'ticket_created',
      ticket
    }, priority === 'urgent' ? 'high' : 'medium')

    logger.info(`[Cassie] Ticket created: ${ticket.id} - ${title}`)

    return {
      ticketId: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      timestamp: ticket.createdAt
    }
  }

  /**
   * Update ticket
   */
  private async updateTicket(input: any): Promise<any> {
    const { ticketId, updates } = input

    const ticket = this.tickets.get(ticketId)
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`)
    }

    // Update ticket properties
    if (updates.status) {
      ticket.status = updates.status
      if (updates.status === 'resolved' || updates.status === 'closed') {
        ticket.resolvedAt = new Date().toISOString()
      }
    }
    if (updates.priority) ticket.priority = updates.priority
    if (updates.assignedTo) ticket.assignedTo = updates.assignedTo
    if (updates.resolutionNotes) ticket.resolutionNotes = updates.resolutionNotes

    // Store update in Brain AI
    this.storeContext({
      type: 'ticket_updated',
      ticketId,
      updates: Object.keys(updates),
      newStatus: ticket.status
    }, ['ticket', 'updated', ticketId], 6)

    // Broadcast
    this.broadcast({
      type: 'ticket_updated',
      ticketId,
      ticket
    }, 'medium')

    return {
      ticketId,
      status: ticket.status,
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get tickets list
   */
  private async getTickets(input: any): Promise<any> {
    const { status, priority, type, limit } = input

    let tickets = Array.from(this.tickets.values())

    if (status) tickets = tickets.filter(t => t.status === status)
    if (priority) tickets = tickets.filter(t => t.priority === priority)
    if (type) tickets = tickets.filter(t => t.type === type)

    // Sort by most recent
    tickets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    if (limit) tickets = tickets.slice(0, limit)

    return {
      tickets,
      total: tickets.length,
      breakdown: {
        new: this.tickets.size && Array.from(this.tickets.values()).filter(t => t.status === 'new').length || 0,
        open: this.tickets.size && Array.from(this.tickets.values()).filter(t => t.status === 'open').length || 0,
        inProgress: this.tickets.size && Array.from(this.tickets.values()).filter(t => t.status === 'in-progress').length || 0,
        resolved: this.tickets.size && Array.from(this.tickets.values()).filter(t => t.status === 'resolved').length || 0
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Perform sentiment analysis using OpenAI
   */
  private async performSentimentAnalysis(text: string): Promise<any> {
    try {
      const response = await this.openAIService.analyzeSentiment(text)

      return {
        score: response.score,
        label: response.sentiment,
        confidence: response.confidence
      }
    } catch (error: any) {
      logger.error('[Cassie] Sentiment analysis failed:', error)
      // Return neutral sentiment as fallback
      return {
        score: 0,
        label: 'neutral',
        confidence: 0.5
      }
    }
  }

  /**
   * Analyze sentiment (public endpoint)
   */
  private async analyzeSentiment(input: any): Promise<any> {
    const { text } = input

    if (!text) {
      throw new Error('text is required for sentiment analysis')
    }

    const sentiment = await this.performSentimentAnalysis(text)

    // Store in Brain AI
    this.storeContext({
      type: 'sentiment_analyzed',
      sentiment: sentiment.label,
      confidence: sentiment.confidence
    }, ['sentiment', sentiment.label], 5)

    return {
      ...sentiment,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get customer insights
   */
  private async getCustomerInsights(input: any): Promise<any> {
    const { customerId } = input

    // Find all conversations for this customer
    const customerConversations = Array.from(this.conversations.values())
      .filter(c => c.customerId === customerId)

    // Calculate insights
    const totalConversations = customerConversations.length
    const openConversations = customerConversations.filter(c => c.status === 'open' || c.status === 'in-progress').length
    const resolvedConversations = customerConversations.filter(c => c.status === 'resolved').length

    // Average sentiment
    const sentiments = customerConversations
      .filter(c => c.sentiment)
      .map(c => c.sentiment!.score)
    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
      : 0

    // Common topics
    const allTags = customerConversations.flatMap(c => c.tags)
    const tagCounts = allTags.reduce((acc: any, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    }, {})
    const commonTopics = Object.entries(tagCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag)

    return {
      customerId,
      totalConversations,
      openConversations,
      resolvedConversations,
      averageSentiment: avgSentiment,
      sentimentLabel: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral',
      commonTopics,
      lastContact: customerConversations[0]?.updatedAt,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate AI reply suggestion
   */
  private async generateReply(input: any): Promise<any> {
    const { conversationId, context } = input

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Get recent conversation history
    const recentMessages = conversation.messages.slice(-5)
    const conversationHistory = recentMessages.map(m =>
      `${m.sender}: ${m.content}`
    ).join('\n')

    try {
      const reply = await this.openAIService.generateCustomerReply(
        conversationHistory,
        context || ''
      )

      return {
        suggestedReply: reply,
        conversationId,
        timestamp: new Date().toISOString()
      }
    } catch (error: any) {
      logger.error('[Cassie] Reply generation failed:', error)
      throw new Error('Failed to generate reply suggestion')
    }
  }
}
