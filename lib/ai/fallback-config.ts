/**
 * AI MODEL FALLBACK CONFIGURATION
 *
 * Defines fallback chains for AI models to ensure high availability
 * and automatic failover when primary models are unavailable.
 */

export type AIProvider = 'openai' | 'anthropic';

export interface FallbackModel {
  provider: AIProvider;
  model: string;
  maxRetries: number;
  timeoutMs: number;
  priority: number; // Lower = higher priority
}

export interface FallbackChain {
  name: string;
  models: FallbackModel[];
  circuitBreakerThreshold: number; // Number of failures before circuit opens
  circuitBreakerResetTimeMs: number; // Time before trying again after circuit opens
}

/**
 * Default fallback chains for different use cases
 */
export const FALLBACK_CHAINS: Record<string, FallbackChain> = {
  // Standard fallback: GPT-5.1 → GPT-4o-mini → Claude Sonnet 4.5
  standard: {
    name: 'Standard Fallback Chain',
    models: [
      {
        provider: 'openai',
        model: 'gpt-5.1',
        maxRetries: 2,
        timeoutMs: 30000,
        priority: 1,
      },
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxRetries: 2,
        timeoutMs: 20000,
        priority: 2,
      },
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        maxRetries: 2,
        timeoutMs: 30000,
        priority: 3,
      },
    ],
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeMs: 60000, // 1 minute
  },

  // Performance-optimized: Fast models only
  fast: {
    name: 'Fast Response Chain',
    models: [
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxRetries: 1,
        timeoutMs: 10000,
        priority: 1,
      },
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        maxRetries: 1,
        timeoutMs: 8000,
        priority: 2,
      },
    ],
    circuitBreakerThreshold: 3,
    circuitBreakerResetTimeMs: 30000,
  },

  // Quality-optimized: Premium models only
  premium: {
    name: 'Premium Quality Chain',
    models: [
      {
        provider: 'openai',
        model: 'gpt-5.1',
        maxRetries: 3,
        timeoutMs: 45000,
        priority: 1,
      },
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        maxRetries: 3,
        timeoutMs: 45000,
        priority: 2,
      },
      {
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        maxRetries: 2,
        timeoutMs: 40000,
        priority: 3,
      },
    ],
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeMs: 120000, // 2 minutes
  },

  // Cost-optimized: Cheapest models first
  economical: {
    name: 'Cost-Optimized Chain',
    models: [
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxRetries: 2,
        timeoutMs: 15000,
        priority: 1,
      },
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        maxRetries: 2,
        timeoutMs: 12000,
        priority: 2,
      },
      {
        provider: 'openai',
        model: 'gpt-5.1',
        maxRetries: 1,
        timeoutMs: 30000,
        priority: 3,
      },
    ],
    circuitBreakerThreshold: 3,
    circuitBreakerResetTimeMs: 45000,
  },
};

/**
 * Get fallback chain by name or return default
 */
export function getFallbackChain(chainName?: string): FallbackChain {
  if (!chainName) {
    return FALLBACK_CHAINS.standard;
  }

  const chain = FALLBACK_CHAINS[chainName];
  if (!chain) {
    console.warn(`[FALLBACK] Chain "${chainName}" not found, using standard chain`);
    return FALLBACK_CHAINS.standard;
  }

  return chain;
}

/**
 * Agent-specific fallback chains
 * Override default chain for specific agents
 */
export const AGENT_FALLBACK_CHAINS: Record<string, string> = {
  // Data analysis needs accuracy
  dexter: 'premium',

  // Customer support needs fast responses
  cassie: 'fast',

  // General purpose agents use standard
  emmie: 'standard',
  aura: 'standard',
  kai: 'standard',

  // Legal/Financial need premium models
  lex: 'premium',
  finn: 'premium',
};

/**
 * Get fallback chain for a specific agent
 */
export function getAgentFallbackChain(agentId: string): FallbackChain {
  const chainName = AGENT_FALLBACK_CHAINS[agentId] || 'standard';
  return getFallbackChain(chainName);
}

/**
 * Error types that should trigger fallback
 */
export enum FallbackTrigger {
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  MODEL_UNAVAILABLE = 'model_unavailable',
  INVALID_REQUEST = 'invalid_request',
  AUTHENTICATION_ERROR = 'auth_error',
  CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
}

/**
 * Determine if error should trigger fallback
 */
export function shouldFallback(errorType: string): boolean {
  const fallbackTriggers = [
    FallbackTrigger.RATE_LIMIT,
    FallbackTrigger.TIMEOUT,
    FallbackTrigger.SERVER_ERROR,
    FallbackTrigger.MODEL_UNAVAILABLE,
  ];

  return fallbackTriggers.includes(errorType as FallbackTrigger);
}

/**
 * Determine if error should retry on same model
 */
export function shouldRetry(errorType: string): boolean {
  const retryableErrors = [
    FallbackTrigger.TIMEOUT,
    FallbackTrigger.SERVER_ERROR,
    FallbackTrigger.RATE_LIMIT,
  ];

  return retryableErrors.includes(errorType as FallbackTrigger);
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attemptNumber: number, baseDelayMs: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const exponentialDelay = baseDelayMs * Math.pow(2, attemptNumber - 1);

  // Add jitter (random 0-20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * Math.random();

  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}
