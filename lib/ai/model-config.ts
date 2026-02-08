/**
 * AI MODEL CONFIGURATION
 *
 * Centralized configuration for all supported AI models with pricing and capabilities
 */

export type ModelProvider = 'openai' | 'anthropic';

export interface ModelPricing {
  inputPerMillionTokens: number;  // Cost per 1M input tokens
  outputPerMillionTokens: number; // Cost per 1M output tokens
  inputPerToken: number;           // Cost per single input token
  outputPerToken: number;          // Cost per single output token
}

export interface ModelCapabilities {
  maxTokens: number;              // Maximum context window
  supportsVision: boolean;        // Supports image input
  supportsStreaming: boolean;     // Supports response streaming
  supportsFunctionCalling: boolean; // Supports function/tool calling
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  pricing: ModelPricing;
  capabilities: ModelCapabilities;
  recommended: boolean;           // Is this a recommended model?
  deprecated: boolean;            // Is this model deprecated?
}

/**
 * All supported AI models with their configurations
 */
export const AI_MODELS: Record<string, ModelConfig> = {
  // =========================================
  // OPENAI MODELS
  // =========================================

  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'GPT-5 Mini - Cost-optimized next-gen model with excellent reasoning.',
    pricing: {
      inputPerMillionTokens: 0.50,   // $0.50 per 1M tokens (estimated)
      outputPerMillionTokens: 1.50,  // $1.50 per 1M tokens (estimated)
      inputPerToken: 0.0000005,
      outputPerToken: 0.0000015,
    },
    capabilities: {
      maxTokens: 200000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: true,
    deprecated: false,
  },

  'gpt-5.1': {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    description: 'Latest GPT-5.1 model with enhanced capabilities. State-of-the-art reasoning and understanding.',
    pricing: {
      inputPerMillionTokens: 10.00,   // $10.00 per 1M tokens (estimated)
      outputPerMillionTokens: 30.00,  // $30.00 per 1M tokens (estimated)
      inputPerToken: 0.00001,
      outputPerToken: 0.00003,
    },
    capabilities: {
      maxTokens: 200000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: false,
  },

  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, affordable model for most tasks. Best cost/performance ratio.',
    pricing: {
      inputPerMillionTokens: 0.150,   // $0.150 per 1M tokens
      outputPerMillionTokens: 0.600,  // $0.600 per 1M tokens
      inputPerToken: 0.00000015,
      outputPerToken: 0.0000006,
    },
    capabilities: {
      maxTokens: 128000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: false,
  },

  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable GPT-4 model with vision and function calling.',
    pricing: {
      inputPerMillionTokens: 5.00,
      outputPerMillionTokens: 15.00,
      inputPerToken: 0.000005,
      outputPerToken: 0.000015,
    },
    capabilities: {
      maxTokens: 128000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: false,
  },

  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Previous generation GPT-4 with good performance.',
    pricing: {
      inputPerMillionTokens: 10.00,
      outputPerMillionTokens: 30.00,
      inputPerToken: 0.00001,
      outputPerToken: 0.00003,
    },
    capabilities: {
      maxTokens: 128000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: false,
  },

  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Legacy fast model. Use GPT-4o-mini for better quality.',
    pricing: {
      inputPerMillionTokens: 0.50,
      outputPerMillionTokens: 1.50,
      inputPerToken: 0.0000005,
      outputPerToken: 0.0000015,
    },
    capabilities: {
      maxTokens: 16385,
      supportsVision: false,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: true,
  },

  // =========================================
  // ANTHROPIC MODELS
  // =========================================

  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Most intelligent Claude model. Excellent for complex reasoning.',
    pricing: {
      inputPerMillionTokens: 3.00,
      outputPerMillionTokens: 15.00,
      inputPerToken: 0.000003,
      outputPerToken: 0.000015,
    },
    capabilities: {
      maxTokens: 200000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: true,
    deprecated: false,
  },

  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most capable Claude model for complex tasks.',
    pricing: {
      inputPerMillionTokens: 15.00,
      outputPerMillionTokens: 75.00,
      inputPerToken: 0.000015,
      outputPerToken: 0.000075,
    },
    capabilities: {
      maxTokens: 200000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: false,
  },

  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: 'Fastest, most affordable Claude model.',
    pricing: {
      inputPerMillionTokens: 0.25,
      outputPerMillionTokens: 1.25,
      inputPerToken: 0.00000025,
      outputPerToken: 0.00000125,
    },
    capabilities: {
      maxTokens: 200000,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    recommended: false,
    deprecated: false,
  },
};

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | null {
  return AI_MODELS[modelId] || null;
}

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return Object.values(AI_MODELS).filter(m => m.provider === provider);
}

/**
 * Get recommended models
 */
export function getRecommendedModels(): ModelConfig[] {
  return Object.values(AI_MODELS).filter(m => m.recommended && !m.deprecated);
}

/**
 * Calculate cost for a completion
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelConfig(modelId);
  if (!model) return 0;

  const inputCost = inputTokens * model.pricing.inputPerToken;
  const outputCost = outputTokens * model.pricing.outputPerToken;

  return inputCost + outputCost;
}

/**
 * Format cost as currency
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(4)}m`; // Show in thousandths of cent
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Get default model based on environment or fallback
 */
export function getDefaultModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-5-mini';
}

/**
 * Validate if a model ID is supported
 */
export function isValidModel(modelId: string): boolean {
  return modelId in AI_MODELS;
}
