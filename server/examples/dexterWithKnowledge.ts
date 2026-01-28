/**
 * Example: Dexter Agent with Shared Knowledge Integration
 *
 * This demonstrates how Dexter (data analyst) can access the shared knowledge base
 */

import { createAgentKnowledgeManager } from '../services/AgentKnowledgeManager'
import OpenAI from 'openai'

interface DexterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class DexterWithKnowledge {
  private userId: string
  private knowledgeManager: any
  private openai: OpenAI
  private analysisHistory: DexterMessage[] = []

  constructor(userId: string) {
    this.userId = userId

    // Initialize knowledge manager
    this.knowledgeManager = createAgentKnowledgeManager(userId, 'Dexter')

    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY || ''
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Initialize the agent - load shared knowledge
   */
  async initialize() {
    console.log('🔬 Initializing Dexter with shared knowledge...')

    // Load knowledge into memory
    const initialContext = await this.knowledgeManager.initialize()

    // Set system prompt with knowledge context
    const systemPrompt = `You are Dexter, an advanced AI data analyst and insights specialist.

Your role is to analyze data, generate insights, create visualizations, and write analysis code.

${initialContext ? `\n📊 KNOWLEDGE BASE:\n${initialContext}\n\nYou have access to uploaded documents and data files. Use this information for analysis and insights generation.` : ''}

Capabilities:
- Statistical analysis and data interpretation
- Python/SQL code generation for data processing
- Chart and visualization recommendations
- Trend identification and forecasting
- Data quality assessment

Be analytical, precise, and thorough in your responses. Provide actionable insights.`

    this.analysisHistory = [
      { role: 'system', content: systemPrompt }
    ]

    const stats = this.knowledgeManager.getStats()
    console.log(`✅ Dexter initialized with ${stats.userStats.totalDocuments} documents, ${stats.userStats.totalChunks} knowledge chunks`)
  }

  /**
   * Analyze a query with knowledge augmentation
   */
  async analyze(query: string): Promise<{
    analysis: string
    code?: string
    insights: string[]
  }> {
    console.log(`🔍 Analysis Query: ${query}`)

    // Query knowledge base for relevant data/context
    const knowledgeContext = await this.knowledgeManager.query(query, 5, 0.6)

    // Build augmented analysis prompt
    let augmentedQuery = query

    if (knowledgeContext) {
      augmentedQuery = `[Analysis Request]: ${query}

[Available Data/Context from Knowledge Base]:
${knowledgeContext}

Based on the available data above, provide:
1. A detailed analysis
2. Python code (if applicable) for processing/visualization
3. Key insights and recommendations

Format your response clearly with sections.`
    }

    // Add to history
    this.analysisHistory.push({
      role: 'user',
      content: augmentedQuery
    })

    // Generate analysis
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: this.analysisHistory,
      temperature: 0.3, // Lower temperature for analytical precision
      max_tokens: 1500
    })

    const assistantMessage = response.choices[0].message.content || 'Analysis could not be completed.'

    // Add to history
    this.analysisHistory.push({
      role: 'assistant',
      content: assistantMessage
    })

    // Parse response (simple extraction)
    const codeMatch = assistantMessage.match(/```python\n([\s\S]*?)\n```/)
    const code = codeMatch ? codeMatch[1] : undefined

    const insights = this.extractInsights(assistantMessage)

    console.log(`📈 Dexter Analysis Complete`)

    return {
      analysis: assistantMessage,
      code,
      insights
    }
  }

  /**
   * Extract insights from response
   */
  private extractInsights(text: string): string[] {
    const insights: string[] = []

    // Simple pattern matching for insights
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.match(/^[-*•]\s+/)) {
        insights.push(line.replace(/^[-*•]\s+/, '').trim())
      }
    }

    return insights.slice(0, 5) // Top 5 insights
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
 * const dexter = new DexterWithKnowledge('user-123')
 * await dexter.initialize()
 *
 * // User uploads sales_data.csv to knowledge base
 * // The knowledge manager automatically detects the update and refreshes
 *
 * // User requests analysis
 * const result = await dexter.analyze('Analyze sales trends for Q4 2024')
 * // Dexter will:
 * // 1. Query knowledge base for sales_data.csv content
 * // 2. Generate analysis based on the data
 * // 3. Provide code, insights, and recommendations
 *
 * console.log(result.analysis)
 * console.log(result.code)
 * console.log(result.insights)
 */
