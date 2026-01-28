import OpenAI from 'openai';

export interface EmbeddingConfig {
  model: string;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-large',
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
};

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not configured. Embeddings will use fallback.');
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock embedding for development/testing
 */
function mockEmbedding(dimension = 1536): number[] {
  return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  config: Partial<EmbeddingConfig> = {}
): Promise<number[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const client = getOpenAIClient();

  if (!client) {
    console.warn('Using mock embedding for text');
    return mockEmbedding();
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: finalConfig.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      lastError = error as Error;
      console.error(`Embedding attempt ${attempt + 1} failed:`, error);

      if (attempt < finalConfig.maxRetries - 1) {
        const delay = finalConfig.retryDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error('All embedding attempts failed. Using mock embedding.');
  return mockEmbedding();
}

/**
 * Generate embeddings for multiple texts in batches
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: Partial<EmbeddingConfig> = {},
  onProgress?: (completed: number, total: number) => void
): Promise<number[][]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const client = getOpenAIClient();

  if (!client) {
    console.warn('Using mock embeddings for batch');
    return texts.map(() => mockEmbedding());
  }

  const embeddings: number[][] = [];
  const batches: string[][] = [];

  // Split into batches
  for (let i = 0; i < texts.length; i += finalConfig.batchSize) {
    batches.push(texts.slice(i, i + finalConfig.batchSize));
  }

  console.log(`Processing ${texts.length} texts in ${batches.length} batch(es)`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    let lastError: Error | null = null;
    let success = false;

    for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
      try {
        const response = await client.embeddings.create({
          model: finalConfig.model,
          input: batch,
        });

        const batchEmbeddings = response.data.map((d) => d.embedding);
        embeddings.push(...batchEmbeddings);
        success = true;

        if (onProgress) {
          onProgress(embeddings.length, texts.length);
        }

        break;
      } catch (error) {
        lastError = error as Error;
        console.error(`Batch ${batchIdx + 1} attempt ${attempt + 1} failed:`, error);

        if (attempt < finalConfig.maxRetries - 1) {
          const delay = finalConfig.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying batch in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    if (!success) {
      console.error(`Batch ${batchIdx + 1} failed after all retries. Using mock embeddings.`);
      embeddings.push(...batch.map(() => mockEmbedding()));

      if (onProgress) {
        onProgress(embeddings.length, texts.length);
      }
    }

    // Rate limiting: small delay between batches
    if (batchIdx < batches.length - 1) {
      await sleep(200);
    }
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalize vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;
  return vector.map((val) => val / norm);
}
