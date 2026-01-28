/**
 * CENTRAL AI CONFIGURATION
 *
 * Single source of truth for all AI-related settings.
 * All services (Agents, Brain, Pipelines, Wizard) must use this config.
 *
 * DO NOT hardcode model names or settings in other files!
 */

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

/**
 * Primary model for all AI operations
 * Change this single value to switch the entire system
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Embedding model for RAG and vector operations
 */
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

/**
 * Fallback model if primary is unavailable
 */
export const FALLBACK_MODEL = 'gpt-4o-mini';

// ============================================================================
// GENERATION PARAMETERS
// ============================================================================

/**
 * Default temperature for AI responses
 * 0.0 = deterministic, 1.0 = creative
 */
export const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');

/**
 * Maximum tokens for response generation
 */
export const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '4000', 10);

/**
 * Maximum tokens for context (input)
 */
export const MAX_CONTEXT_TOKENS = parseInt(process.env.AI_MAX_CONTEXT_TOKENS || '8000', 10);

/**
 * Presence penalty to reduce repetition
 */
export const PRESENCE_PENALTY = parseFloat(process.env.AI_PRESENCE_PENALTY || '0.6');

/**
 * Frequency penalty to encourage diverse vocabulary
 */
export const FREQUENCY_PENALTY = parseFloat(process.env.AI_FREQUENCY_PENALTY || '0.5');

// ============================================================================
// RETRY & TIMEOUT CONFIGURATION
// ============================================================================

/**
 * Maximum retry attempts for failed API calls
 */
export const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3', 10);

/**
 * Base delay in ms for exponential backoff
 */
export const RETRY_BASE_DELAY = parseInt(process.env.AI_RETRY_DELAY || '1000', 10);

/**
 * Request timeout in ms
 * FIX-006: Reduced from 60s to 30s to prevent indefinite hangs
 * OpenAI calls should complete within 30s; if not, better to fail fast
 */
export const REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10);

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Maximum requests per minute per user
 */
export const RATE_LIMIT_RPM = parseInt(process.env.AI_RATE_LIMIT_RPM || '60', 10);

/**
 * Maximum tokens per minute per user
 */
export const RATE_LIMIT_TPM = parseInt(process.env.AI_RATE_LIMIT_TPM || '100000', 10);

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * Cost per 1K input tokens (in USD)
 */
export const COST_PER_1K_INPUT = parseFloat(process.env.AI_COST_INPUT || '0.00015');

/**
 * Cost per 1K output tokens (in USD)
 */
export const COST_PER_1K_OUTPUT = parseFloat(process.env.AI_COST_OUTPUT || '0.0006');

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Enable streaming responses
 */
export const ENABLE_STREAMING = process.env.AI_ENABLE_STREAMING !== 'false';

/**
 * Enable function calling / tool use
 */
export const ENABLE_TOOLS = process.env.AI_ENABLE_TOOLS !== 'false';

/**
 * Enable verbose logging for debugging
 */
export const VERBOSE_LOGGING = process.env.AI_VERBOSE_LOGGING === 'true';

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that required environment variables are set
 * Call this at server startup
 */
export function validateAIConfig(): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  CRITICAL ERROR: OPENAI_API_KEY is not configured!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('  Please add your OpenAI API key to .env.local:');
    console.error('');
    console.error('  OPENAI_API_KEY=sk-your-key-here');
    console.error('  OPENAI_MODEL=gpt-4o-mini');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    throw new Error('CRITICAL: No OpenAI API key found. Server cannot start.');
  }

  if (!apiKey.startsWith('sk-')) {
    console.warn('[AI_CONFIG] Warning: OPENAI_API_KEY does not start with "sk-". Verify key format.');
  }

  console.log('[AI_CONFIG] ═══════════════════════════════════════════');
  console.log(`[AI_CONFIG] Primary Model:    ${OPENAI_MODEL}`);
  console.log(`[AI_CONFIG] Embedding Model:  ${EMBEDDING_MODEL}`);
  console.log(`[AI_CONFIG] Temperature:      ${AI_TEMPERATURE}`);
  console.log(`[AI_CONFIG] Max Tokens:       ${MAX_TOKENS}`);
  console.log(`[AI_CONFIG] Streaming:        ${ENABLE_STREAMING ? 'enabled' : 'disabled'}`);
  console.log(`[AI_CONFIG] Tools/Functions:  ${ENABLE_TOOLS ? 'enabled' : 'disabled'}`);
  console.log('[AI_CONFIG] ═══════════════════════════════════════════');
}

/**
 * Get the complete AI configuration as an object
 */
export function getAIConfig() {
  return {
    model: OPENAI_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    fallbackModel: FALLBACK_MODEL,
    temperature: AI_TEMPERATURE,
    maxTokens: MAX_TOKENS,
    maxContextTokens: MAX_CONTEXT_TOKENS,
    presencePenalty: PRESENCE_PENALTY,
    frequencyPenalty: FREQUENCY_PENALTY,
    maxRetries: MAX_RETRIES,
    retryBaseDelay: RETRY_BASE_DELAY,
    requestTimeout: REQUEST_TIMEOUT,
    rateLimitRpm: RATE_LIMIT_RPM,
    rateLimitTpm: RATE_LIMIT_TPM,
    costPer1kInput: COST_PER_1K_INPUT,
    costPer1kOutput: COST_PER_1K_OUTPUT,
    enableStreaming: ENABLE_STREAMING,
    enableTools: ENABLE_TOOLS,
    verboseLogging: VERBOSE_LOGGING,
  };
}

/**
 * Calculate cost for a given number of tokens
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * COST_PER_1K_INPUT + (outputTokens / 1000) * COST_PER_1K_OUTPUT;
}

// Export type for config object
export type AIConfig = ReturnType<typeof getAIConfig>;
