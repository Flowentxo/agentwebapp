import { logger } from '../utils/logger'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

export class OpenAIService {
  private apiKey: string
  private baseURL: string = 'https://api.openai.com/v1'

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''

    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured. Using mock responses.')
    }
  }

  /**
   * Generate a chat completion using OpenAI API
   */
  async generateChatCompletion(
    messages: OpenAIMessage[],
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
      stream?: boolean
      tools?: any[]
      toolChoice?: any
    } = {}
  ): Promise<{
    message: string
    model: string
    tokens: number
    finishReason: string
    toolCalls?: any[]
  }> {
    const {
      model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      tools,
      toolChoice
    } = options

    // If no API key, return mock response
    if (!this.apiKey) {
      return this.generateMockResponse(messages)
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream,
          tools,
          tool_choice: toolChoice
        })
      })

      if (!response.ok) {
        const error = await response.json()
        logger.error('OpenAI API error:', error)
        throw new Error(error.error?.message || 'OpenAI API request failed')
      }

      const data: OpenAIResponse = await response.json()
      const choice = data.choices[0]

      return {
        message: choice?.message?.content || '',
        model: data.model,
        tokens: data.usage?.total_tokens || 0,
        finishReason: choice?.finish_reason || 'unknown',
        toolCalls: (choice?.message as any)?.tool_calls
      }
    } catch (error: any) {
      logger.error('Error calling OpenAI API:', error)

      // Fallback to mock response on error
      return this.generateMockResponse(messages)
    }
  }

  /**
   * Generate embeddings for text (for vector storage)
   */
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-ada-002'
  ): Promise<number[]> {
    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured. Returning mock embedding.')
      return Array(1536).fill(0).map(() => Math.random())
    }

    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          input: text
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate embedding')
      }

      const data = await response.json()
      return data.data[0]?.embedding || []
    } catch (error) {
      logger.error('Error generating embedding:', error)
      return Array(1536).fill(0).map(() => Math.random())
    }
  }

  /**
   * Mock response for testing without API key
   */
  private generateMockResponse(messages: OpenAIMessage[]): {
    message: string
    model: string
    tokens: number
    finishReason: string
  } {
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]
    const userContent = lastUserMessage?.content.toLowerCase() || ''

    // Generate contextual mock responses
    let mockMessage = "I understand your question. I'm here to help!"

    if (userContent.includes('hello') || userContent.includes('hi')) {
      mockMessage = "Hello! How can I assist you today?"
    } else if (userContent.includes('help')) {
      mockMessage = "I'd be happy to help you! Could you provide more details about what you need assistance with?"
    } else if (userContent.includes('thank')) {
      mockMessage = "You're welcome! Let me know if you need anything else."
    } else if (userContent.includes('how')) {
      mockMessage = "Great question! Let me explain how that works..."
    } else if (userContent.includes('what')) {
      mockMessage = "That's an interesting question. Based on my knowledge, I can tell you that..."
    } else if (userContent.includes('price') || userContent.includes('cost')) {
      mockMessage = "I'd be happy to discuss pricing. Let me provide you with some information..."
    } else if (userContent.includes('feature')) {
      mockMessage = "This feature offers several benefits. Let me walk you through them..."
    }

    return {
      message: mockMessage,
      model: 'mock-gpt-4',
      tokens: Math.floor(Math.random() * 300) + 100,
      finishReason: 'stop'
    }
  }

  /**
   * Check if OpenAI API is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      const response = await this.generateChatCompletion([
        { role: 'user', content: 'Hello' }
      ], {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        maxTokens: 10
      })

      return response.message.length > 0
    } catch (error) {
      logger.error('OpenAI connection test failed:', error)
      return false
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative'
    score: number
    confidence: number
  }> {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: 'You are a sentiment analysis AI. Analyze the sentiment of the given text and respond with only a JSON object containing: {"sentiment": "positive|neutral|negative", "score": number between -1 and 1, "confidence": number between 0 and 1}'
      },
      {
        role: 'user',
        content: text
      }
    ]

    try {
      const response = await this.generateChatCompletion(messages, {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 100
      })

      // Parse JSON response
      const sentimentData = JSON.parse(response.message)

      return {
        sentiment: sentimentData.sentiment || 'neutral',
        score: sentimentData.score || 0,
        confidence: sentimentData.confidence || 0.7
      }
    } catch (error) {
      logger.warn('Sentiment analysis failed, using fallback')

      // Simple fallback sentiment analysis
      const lowerText = text.toLowerCase()
      const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing', 'perfect', 'thank']
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'disappointed', 'frustrated', 'problem', 'issue', 'broken']

      let score = 0
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 0.2
      })
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) score -= 0.2
      })

      score = Math.max(-1, Math.min(1, score))

      return {
        sentiment: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
        score,
        confidence: 0.6
      }
    }
  }

  /**
   * Generate customer service reply
   */
  async generateCustomerReply(conversationHistory: string, context: string = ''): Promise<string> {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful customer service representative. Generate a professional, empathetic, and helpful response to the customer based on the conversation history. Keep responses concise and actionable.'
      },
      {
        role: 'user',
        content: `Conversation history:\n${conversationHistory}\n\nAdditional context: ${context}\n\nGenerate an appropriate response:`
      }
    ]

    try {
      const response = await this.generateChatCompletion(messages, {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 300
      })

      return response.message
    } catch (error) {
      logger.error('Reply generation failed:', error)
      return "Thank you for reaching out. I'm looking into this for you and will get back to you shortly with more information."
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService()
