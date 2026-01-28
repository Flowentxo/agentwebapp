/**
 * Embedding Service - OpenAI Integration for Vector Embeddings
 * Generates embeddings for semantic search using text-embedding-3-small
 */

import OpenAI from 'openai';

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface EmbeddingBatchResult {
  embeddings: number[][];
  totalTokens: number;
  model: string;
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private openai: OpenAI;
  private model: string = 'text-embedding-3-small';
  private dimension: number = 1536;
  private cache: Map<string, EmbeddingResult> = new Map();
  private maxCacheSize: number = 1000;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate embedding for a single text
   */
  public async generateEmbedding(text: string, useCache: boolean = true): Promise<EmbeddingResult> {
    // Check cache first
    if (useCache && this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimension,
      });

      const result: EmbeddingResult = {
        embedding: response.data[0].embedding,
        tokens: response.usage.total_tokens,
        model: this.model,
      };

      // Cache result
      if (useCache) {
        this.cacheResult(text, result);
      }

      return result;
    } catch (error: any) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  public async generateEmbeddings(texts: string[], useCache: boolean = true): Promise<EmbeddingBatchResult> {
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];
    const embeddings: number[][] = new Array(texts.length);
    let totalTokens = 0;

    // Check cache for each text
    if (useCache) {
      texts.forEach((text, index) => {
        const cached = this.cache.get(text);
        if (cached) {
          embeddings[index] = cached.embedding;
          totalTokens += cached.tokens;
        } else {
          uncachedTexts.push(text);
          uncachedIndices.push(index);
        }
      });
    } else {
      uncachedTexts.push(...texts);
      uncachedIndices.push(...texts.map((_, i) => i));
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: uncachedTexts,
          dimensions: this.dimension,
        });

        response.data.forEach((item, i) => {
          const originalIndex = uncachedIndices[i];
          embeddings[originalIndex] = item.embedding;

          // Cache individual results
          if (useCache) {
            const result: EmbeddingResult = {
              embedding: item.embedding,
              tokens: Math.ceil(response.usage.total_tokens / uncachedTexts.length), // Estimate
              model: this.model,
            };
            this.cacheResult(uncachedTexts[i], result);
          }
        });

        totalTokens += response.usage.total_tokens;
      } catch (error: any) {
        console.error('[EmbeddingService] Error generating batch embeddings:', error);
        throw new Error(`Failed to generate batch embeddings: ${error.message}`);
      }
    }

    return {
      embeddings,
      totalTokens,
      model: this.model,
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  public static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Cache embedding result with LRU eviction
   */
  private cacheResult(text: string, result: EmbeddingResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry (first key)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(text, result);
  }

  /**
   * Clear embedding cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }
}

export const embeddingService = EmbeddingService.getInstance();
