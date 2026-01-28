/**
 * PHASE 5: Unified Embedding Service for Enterprise Agents
 * Provides cached, batched embedding generation for all agents
 */

import OpenAI from 'openai';
import { RedisCache, redisCache } from '@/lib/brain/RedisCache';

export interface EmbeddingServiceConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions: number;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  cacheTTL: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  cached: boolean;
  model: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
  cachedCount: number;
  processedCount: number;
}

const DEFAULT_CONFIG: EmbeddingServiceConfig = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 100,
  maxRetries: 3,
  retryDelayMs: 1000,
  cacheTTL: 86400 * 7, // 7 days
};

/**
 * Unified Embedding Service
 * Used by Cassie (Knowledge Base), Dexter (Document Analysis), and Aura (Workflow Context)
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private openai: OpenAI | null = null;
  private config: EmbeddingServiceConfig;
  private cache: RedisCache;
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    totalTokens: 0,
    errors: 0,
  };

  private constructor(config: Partial<EmbeddingServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = redisCache;
    this.initializeOpenAI();
  }

  public static getInstance(config?: Partial<EmbeddingServiceConfig>): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(config);
    }
    return EmbeddingService.instance;
  }

  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      console.log('[EmbeddingService] OpenAI client initialized');
    } else {
      console.warn('[EmbeddingService] OPENAI_API_KEY not set - using mock embeddings');
    }
  }

  /**
   * Generate embedding for a single text with caching
   */
  public async generateEmbedding(text: string): Promise<EmbeddingResult> {
    this.metrics.totalRequests++;
    const normalizedText = this.normalizeText(text);
    const cacheKey = this.getCacheKey(normalizedText);

    // Check cache first
    const cached = await this.cache.getCachedEmbedding(normalizedText);
    if (cached) {
      this.metrics.cacheHits++;
      return {
        embedding: cached.embedding,
        tokens: cached.tokens,
        cached: true,
        model: this.config.model,
      };
    }

    this.metrics.cacheMisses++;

    // Generate new embedding
    const result = await this.generateWithRetry(normalizedText);

    // Cache the result
    await this.cache.cacheEmbedding(normalizedText, result.embedding, result.tokens);

    return {
      ...result,
      cached: false,
      model: this.config.model,
    };
  }

  /**
   * Generate embeddings for multiple texts with batching and caching
   */
  public async generateEmbeddings(
    texts: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchEmbeddingResult> {
    const normalizedTexts = texts.map((t) => this.normalizeText(t));
    const results: number[][] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];
    let totalTokens = 0;
    let cachedCount = 0;

    // Check cache for all texts
    for (let i = 0; i < normalizedTexts.length; i++) {
      const cached = await this.cache.getCachedEmbedding(normalizedTexts[i]);
      if (cached) {
        results[i] = cached.embedding;
        totalTokens += cached.tokens;
        cachedCount++;
        this.metrics.cacheHits++;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(normalizedTexts[i]);
        this.metrics.cacheMisses++;
      }
    }

    if (onProgress) {
      onProgress(cachedCount, texts.length);
    }

    // Process uncached texts in batches
    if (uncachedTexts.length > 0) {
      const batchResults = await this.processBatches(uncachedTexts, (completed) => {
        if (onProgress) {
          onProgress(cachedCount + completed, texts.length);
        }
      });

      // Assign results and cache
      for (let i = 0; i < uncachedIndices.length; i++) {
        const originalIndex = uncachedIndices[i];
        const embedding = batchResults.embeddings[i];
        const tokens = batchResults.tokensPerItem[i];

        results[originalIndex] = embedding;
        totalTokens += tokens;

        // Cache the result
        await this.cache.cacheEmbedding(uncachedTexts[i], embedding, tokens);
      }
    }

    return {
      embeddings: results,
      totalTokens,
      cachedCount,
      processedCount: uncachedTexts.length,
    };
  }

  /**
   * Process texts in batches
   */
  private async processBatches(
    texts: string[],
    onProgress?: (completed: number) => void
  ): Promise<{ embeddings: number[][]; tokensPerItem: number[] }> {
    const embeddings: number[][] = [];
    const tokensPerItem: number[] = [];
    const batches: string[][] = [];

    // Split into batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      batches.push(texts.slice(i, i + this.config.batchSize));
    }

    console.log(`[EmbeddingService] Processing ${texts.length} texts in ${batches.length} batches`);

    for (const batch of batches) {
      const result = await this.generateBatchWithRetry(batch);
      embeddings.push(...result.embeddings);
      tokensPerItem.push(...result.tokensPerItem);

      if (onProgress) {
        onProgress(embeddings.length);
      }

      // Small delay between batches for rate limiting
      if (batches.length > 1) {
        await this.sleep(100);
      }
    }

    return { embeddings, tokensPerItem };
  }

  /**
   * Generate embedding with retry logic
   */
  private async generateWithRetry(text: string): Promise<{ embedding: number[]; tokens: number }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        if (!this.openai) {
          return { embedding: this.mockEmbedding(), tokens: Math.ceil(text.length / 4) };
        }

        this.metrics.apiCalls++;
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: text,
          dimensions: this.config.dimensions,
        });

        const tokens = response.usage?.total_tokens || Math.ceil(text.length / 4);
        this.metrics.totalTokens += tokens;

        return {
          embedding: response.data[0].embedding,
          tokens,
        };
      } catch (error) {
        lastError = error as Error;
        this.metrics.errors++;
        console.error(`[EmbeddingService] Attempt ${attempt + 1} failed:`, error);

        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    console.error('[EmbeddingService] All retries failed, using mock embedding');
    return { embedding: this.mockEmbedding(), tokens: Math.ceil(text.length / 4) };
  }

  /**
   * Generate batch embeddings with retry
   */
  private async generateBatchWithRetry(
    texts: string[]
  ): Promise<{ embeddings: number[][]; tokensPerItem: number[] }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        if (!this.openai) {
          return {
            embeddings: texts.map(() => this.mockEmbedding()),
            tokensPerItem: texts.map((t) => Math.ceil(t.length / 4)),
          };
        }

        this.metrics.apiCalls++;
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: texts,
          dimensions: this.config.dimensions,
        });

        const totalTokens = response.usage?.total_tokens || 0;
        this.metrics.totalTokens += totalTokens;

        // Estimate tokens per item
        const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
        const tokensPerItem = texts.map((t) =>
          Math.ceil((t.length / totalChars) * totalTokens)
        );

        return {
          embeddings: response.data.map((d) => d.embedding),
          tokensPerItem,
        };
      } catch (error) {
        lastError = error as Error;
        this.metrics.errors++;
        console.error(`[EmbeddingService] Batch attempt ${attempt + 1} failed:`, error);

        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    console.error('[EmbeddingService] All batch retries failed, using mock embeddings');
    return {
      embeddings: texts.map(() => this.mockEmbedding()),
      tokensPerItem: texts.map((t) => Math.ceil(t.length / 4)),
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  public cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar items from a list
   */
  public findMostSimilar(
    queryEmbedding: number[],
    items: Array<{ id: string; embedding: number[]; [key: string]: unknown }>,
    topK: number = 10,
    threshold: number = 0.5
  ): Array<{ id: string; score: number; [key: string]: unknown }> {
    const scored = items
      .map((item) => ({
        ...item,
        score: this.cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  /**
   * Normalize text for consistent caching
   */
  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 8000);
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `emb:${this.config.model}:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generate mock embedding for development
   */
  private mockEmbedding(): number[] {
    return Array.from({ length: this.config.dimensions }, () => Math.random() * 2 - 1);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get service metrics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      totalTokens: 0,
      errors: 0,
    };
  }
}

// Export singleton instance
export const embeddingService = EmbeddingService.getInstance();
