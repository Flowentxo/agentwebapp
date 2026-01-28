import OpenAI from 'openai'
import { logger } from '../utils/logger'

/**
 * EmbeddingService - Generate text embeddings using OpenAI
 *
 * Uses text-embedding-3-small for cost efficiency (1536 dimensions)
 * For production, consider text-embedding-3-large (3072 dimensions) for better quality
 */
export class EmbeddingService {
  private openai: OpenAI | null = null
  private model: string = 'text-embedding-3-small'
  private dimensions: number = 1536

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (apiKey) {
      this.openai = new OpenAI({ apiKey })
      logger.info('EmbeddingService initialized with OpenAI')
    } else {
      logger.warn('OPENAI_API_KEY not found - embeddings will use fallback')
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      // Fallback: Generate random embedding for testing
      logger.warn('Using fallback random embedding')
      return this.generateRandomEmbedding()
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions
      })

      return response.data[0].embedding
    } catch (error: any) {
      logger.error(`Embedding generation failed: ${error.message}`)
      // Fallback to random embedding
      return this.generateRandomEmbedding()
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      logger.warn('Using fallback random embeddings for batch')
      return texts.map(() => this.generateRandomEmbedding())
    }

    try {
      // OpenAI supports batch embedding (max 2048 texts)
      const batchSize = 100
      const allEmbeddings: number[][] = []

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
          dimensions: this.dimensions
        })

        const embeddings = response.data.map(d => d.embedding)
        allEmbeddings.push(...embeddings)
      }

      return allEmbeddings
    } catch (error: any) {
      logger.error(`Batch embedding generation failed: ${error.message}`)
      return texts.map(() => this.generateRandomEmbedding())
    }
  }

  /**
   * Fallback: Generate a random normalized embedding vector
   */
  private generateRandomEmbedding(): number[] {
    const vector: number[] = []
    let sumSquares = 0

    // Generate random vector
    for (let i = 0; i < this.dimensions; i++) {
      const val = Math.random() * 2 - 1 // Random between -1 and 1
      vector.push(val)
      sumSquares += val * val
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(sumSquares)
    return vector.map(v => v / magnitude)
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService()
