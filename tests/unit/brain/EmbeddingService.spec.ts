/**
 * Unit Tests for EmbeddingService
 * Tests OpenAI integration, caching, and similarity calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbeddingService } from '@/lib/brain/EmbeddingService';

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    embeddingService = EmbeddingService.getInstance();
    embeddingService.clearCache();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const text = 'This is a test sentence for embedding generation.';
      const result = await embeddingService.generateEmbedding(text);

      expect(result).toBeDefined();
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding.length).toBe(1536); // text-embedding-3-small dimension
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should cache embeddings when useCache is true', async () => {
      const text = 'Cacheable text';

      // First call - should hit API
      const result1 = await embeddingService.generateEmbedding(text, true);

      // Second call - should hit cache
      const result2 = await embeddingService.generateEmbedding(text, true);

      expect(result1.embedding).toEqual(result2.embedding);
      expect(result1.tokens).toBe(result2.tokens);
    });

    it('should not cache when useCache is false', async () => {
      const text = 'Non-cacheable text';

      await embeddingService.generateEmbedding(text, false);
      const stats = embeddingService.getCacheStats();

      expect(stats.size).toBe(0);
    });

    it('should handle empty text', async () => {
      await expect(
        embeddingService.generateEmbedding('')
      ).rejects.toThrow();
    });
  });

  describe('generateEmbeddings (batch)', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'First text for testing',
        'Second text for testing',
        'Third text for testing',
      ];

      const result = await embeddingService.generateEmbeddings(texts);

      expect(result.embeddings).toHaveLength(3);
      expect(result.embeddings[0]).toHaveLength(1536);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should use cache for previously embedded texts', async () => {
      const texts = ['Text A', 'Text B'];

      // Pre-cache "Text A"
      await embeddingService.generateEmbedding('Text A', true);

      // Batch should use cache for "Text A"
      const result = await embeddingService.generateEmbeddings(texts, true);

      expect(result.embeddings).toHaveLength(2);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity between identical vectors', () => {
      const vector = new Array(1536).fill(0.5);
      const similarity = EmbeddingService.cosineSimilarity(vector, vector);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should calculate similarity between different vectors', () => {
      const vector1 = new Array(1536).fill(1);
      const vector2 = new Array(1536).fill(0.5);
      const similarity = EmbeddingService.cosineSimilarity(vector1, vector2);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should throw error for vectors with different dimensions', () => {
      const vector1 = new Array(1536).fill(1);
      const vector2 = new Array(768).fill(1);

      expect(() =>
        EmbeddingService.cosineSimilarity(vector1, vector2)
      ).toThrow('Embeddings must have the same dimension');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const text = 'This is a test sentence with multiple words.';
      const tokens = EmbeddingService.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Rough check
    });

    it('should handle empty text', () => {
      const tokens = EmbeddingService.estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await embeddingService.generateEmbedding('Test text', true);
      expect(embeddingService.getCacheStats().size).toBeGreaterThan(0);

      embeddingService.clearCache();
      expect(embeddingService.getCacheStats().size).toBe(0);
    });

    it('should respect maxCacheSize with LRU eviction', async () => {
      const maxSize = 1000;

      // Generate more embeddings than cache size
      for (let i = 0; i < maxSize + 10; i++) {
        await embeddingService.generateEmbedding(`Text ${i}`, true);
      }

      const stats = embeddingService.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });
});
