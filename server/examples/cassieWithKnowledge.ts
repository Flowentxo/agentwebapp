/**
 * Example: Cassie Agent with Shared Knowledge Integration
 *
 * This demonstrates how to integrate the shared knowledge base with an agent.
 */

import { createAgentKnowledgeManager } from '../services/AgentKnowledgeManager'
import OpenAI from 'openai'

interface CassieMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class CassieWithKnowledge {
  private userId: string
  private knowledgeManager: any
  private openai: OpenAI
  private conversationHistory: CassieMessage[] = []

  constructor(userId: string) {
    this.userId = userId

    // Initialize knowledge manager
    this.knowledgeManager = createAgentKnowledgeManager(userId, 'Cassie')

    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY || ''
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Initialize the agent - load shared knowledge
   */
  async initialize() {
    console.log('🔷 Initializing Cassie with shared knowledge...')

    // Load knowledge into memory
    const initialContext = await this.knowledgeManager.initialize()

    // Set system prompt with knowledge context
    const systemPrompt = `You are Cassie, a friendly and efficient customer support agent.

Your role is to assist customers with their inquiries, resolve issues quickly, and provide empathetic, professional support.

${initialContext ? `\n📚 KNOWLEDGE BASE:\n${initialContext}\n\nUse this information to answer questions accurately. If the knowledge base has relevant information, reference it in your responses.` : ''}

Guidelines:
- Be friendly, professional, and empathetic
- Provide accurate information based on the knowledge base
- If you don't know something, be honest about it
- Always prioritize customer satisfaction`

    this.conversationHistory = [
      { role: 'system', content: systemPrompt }
    ]

    const stats = this.knowledgeManager.getStats()
    console.log(`✅ Cassie initialized with ${stats.userStats.totalDocuments} documents, ${stats.userStats.totalChunks} knowledge chunks`)
  }

  /**
   * Process a customer message with knowledge augmentation
   */
  async processMessage(userMessage: string): Promise<string> {
    console.log(`👤 User: ${userMessage}`)

    // Query knowledge base for relevant context
    const knowledgeContext = await this.knowledgeManager.query(userMessage, 3, 0.6)

    // Build augmented user message
    let augmentedMessage = userMessage

    if (knowledgeContext) {
      augmentedMessage = `[Customer Question]: ${userMessage}

[Relevant Knowledge Base Information]:
${knowledgeContext}

Please answer the customer's question using the relevant knowledge base information above. Be conversational and helpful.`
    }

    // Add to conversation
    this.conversationHistory.push({
      role: 'user',
      content: augmentedMessage
    })

    // Generate response
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: this.conversationHistory,
      temperature: 0.7,
      max_tokens: 500
    })

    const assistantMessage = response.choices[0].message.content || 'I apologize, I could not generate a response.'

    // Add to history
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    })

    console.log(`🤖 Cassie: ${assistantMessage}`)

    return assistantMessage
  }

  /**
   * Get knowledge stats
   */
  getKnowledgeStats() {
    return this.knowledgeManager.getStats()
  }
}

/**
 * Example Usage:
 *
 * const cassie = new CassieWithKnowledge('user-123')
 * await cassie.initialize()
 *
 * // User uploads a document to knowledge base
 * // The knowledge manager automatically detects the update and refreshes
 *
 * // Customer asks a question
 * const response = await cassie.processMessage('What are your return policies?')
 * // Cassie will query the knowledge base, find relevant info, and answer
 */
