/**
 * Cost Optimization Service
 * Analyzes user prompts and recommends optimal AI models for cost savings
 */

import { getModelConfig, AI_MODELS } from '@/lib/ai/model-config';
import { estimateTokens } from '@/lib/ai/openai-service';

export interface ModelRecommendation {
  recommendedModel: string;
  currentModel: string;
  reasoning: string;
  potentialSavings: number;
  potentialSavingsPercent: number;
  confidenceScore: number; // 0-100
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

export interface CostComparison {
  modelId: string;
  modelName: string;
  estimatedCost: number;
  estimatedTokens: number;
  qualityScore: number; // Relative quality 0-100
  speedScore: number; // Relative speed 0-100
  capabilities: string[];
  recommended: boolean;
}

export interface PromptComplexity {
  score: number; // 0-100
  category: 'simple' | 'medium' | 'complex' | 'advanced';
  factors: {
    length: number;
    technicalTerms: number;
    codeBlocks: number;
    multipleQuestions: number;
    contextRequired: boolean;
  };
}

export class CostOptimizationService {
  /**
   * Analyze prompt complexity to determine appropriate model tier
   */
  analyzePromptComplexity(prompt: string): PromptComplexity {
    const length = prompt.length;
    const words = prompt.split(/\s+/).length;

    // Detect technical terms
    const technicalPatterns = [
      /\b(API|algorithm|database|function|variable|class|interface|async|await|promise)\b/gi,
      /\b(SQL|JSON|XML|HTTP|REST|GraphQL)\b/gi,
      /\b(React|Vue|Angular|Node|Python|Java|TypeScript)\b/gi,
    ];
    const technicalTerms = technicalPatterns.reduce(
      (count, pattern) => count + (prompt.match(pattern)?.length || 0),
      0
    );

    // Detect code blocks
    const codeBlocks = (prompt.match(/```/g)?.length || 0) / 2;

    // Detect multiple questions
    const multipleQuestions = (prompt.match(/\?/g)?.length || 0) > 1;

    // Check if context/history is needed
    const contextRequired = /\b(previous|earlier|before|last time|continue|follow up|as mentioned)\b/i.test(prompt);

    // Calculate complexity score
    let score = 0;

    // Length factor (0-25 points)
    if (words < 10) score += 5;
    else if (words < 30) score += 15;
    else if (words < 100) score += 20;
    else score += 25;

    // Technical complexity (0-30 points)
    score += Math.min(technicalTerms * 3, 30);

    // Code blocks (0-20 points)
    score += Math.min(codeBlocks * 10, 20);

    // Multiple questions (0-15 points)
    if (multipleQuestions) score += 15;

    // Context required (0-10 points)
    if (contextRequired) score += 10;

    // Determine category
    let category: 'simple' | 'medium' | 'complex' | 'advanced';
    if (score < 25) category = 'simple';
    else if (score < 50) category = 'medium';
    else if (score < 75) category = 'complex';
    else category = 'advanced';

    return {
      score: Math.min(score, 100),
      category,
      factors: {
        length: words,
        technicalTerms,
        codeBlocks,
        multipleQuestions: multipleQuestions ? 1 : 0,
        contextRequired,
      },
    };
  }

  /**
   * Recommend optimal model based on prompt complexity and current model
   */
  recommendModel(
    prompt: string,
    currentModel: string,
    conversationHistory: any[] = []
  ): ModelRecommendation {
    const complexity = this.analyzePromptComplexity(prompt);
    const hasContext = conversationHistory.length > 0;

    // Estimate tokens
    const estimatedInputTokens = estimateTokens(prompt) +
      (hasContext ? conversationHistory.reduce((sum, msg) => sum + estimateTokens(msg.content || ''), 0) : 0);
    const estimatedOutputTokens = 500; // Conservative estimate

    // Calculate current cost
    const currentConfig = getModelConfig(currentModel);
    const currentCost = currentConfig
      ? (estimatedInputTokens / 1_000_000) * currentConfig.pricing.inputPerMillionTokens +
        (estimatedOutputTokens / 1_000_000) * currentConfig.pricing.outputPerMillionTokens
      : 0;

    // Determine recommended model based on complexity
    let recommendedModel = currentModel;
    let reasoning = '';
    let qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant' = 'none';

    if (complexity.category === 'simple' && currentModel !== 'gpt-4o-mini') {
      // Simple tasks can use mini model
      recommendedModel = 'gpt-4o-mini';
      reasoning = 'This is a simple query that can be handled effectively by a lighter model, saving significant costs.';
      qualityImpact = 'minimal';
    } else if (complexity.category === 'medium' && currentModel === 'gpt-4') {
      // Medium tasks can use GPT-4o instead of GPT-4
      recommendedModel = 'gpt-4o';
      reasoning = 'This task can be handled by GPT-4o with similar quality at lower cost than GPT-4.';
      qualityImpact = 'minimal';
    } else if (complexity.category === 'advanced' && currentModel === 'gpt-4o-mini') {
      // Advanced tasks need better models
      recommendedModel = 'gpt-4o';
      reasoning = 'This complex task may benefit from a more capable model for better quality results.';
      qualityImpact = 'moderate';
    } else if (complexity.category === 'complex' && currentModel === 'gpt-3.5-turbo') {
      // Complex tasks might benefit from GPT-4o
      recommendedModel = 'gpt-4o';
      reasoning = 'This task complexity suggests using a more advanced model for better results.';
      qualityImpact = 'moderate';
    } else {
      // Current model is appropriate
      reasoning = 'Your current model choice is optimal for this task complexity.';
      qualityImpact = 'none';
    }

    // Calculate recommended cost
    const recommendedConfig = getModelConfig(recommendedModel);
    const recommendedCost = recommendedConfig
      ? (estimatedInputTokens / 1_000_000) * recommendedConfig.pricing.inputPerMillionTokens +
        (estimatedOutputTokens / 1_000_000) * recommendedConfig.pricing.outputPerMillionTokens
      : currentCost;

    const potentialSavings = currentCost - recommendedCost;
    const potentialSavingsPercent = currentCost > 0 ? (potentialSavings / currentCost) * 100 : 0;

    // Calculate confidence score
    let confidenceScore = 80;
    if (complexity.score < 20 || complexity.score > 80) confidenceScore = 95; // Very clear cases
    if (hasContext) confidenceScore -= 10; // Less confident with context
    if (complexity.factors.codeBlocks > 0) confidenceScore -= 5; // Code is tricky

    return {
      recommendedModel,
      currentModel,
      reasoning,
      potentialSavings,
      potentialSavingsPercent,
      confidenceScore: Math.max(confidenceScore, 50),
      qualityImpact,
    };
  }

  /**
   * Compare costs across all available models for a given prompt
   */
  compareCosts(prompt: string, availableModels: string[]): CostComparison[] {
    const estimatedInputTokens = estimateTokens(prompt) + 200; // Add system prompt estimate
    const estimatedOutputTokens = 500; // Conservative estimate

    const comparisons: CostComparison[] = [];

    for (const modelId of availableModels) {
      const config = getModelConfig(modelId);
      if (!config) continue;

      const estimatedCost =
        (estimatedInputTokens / 1_000_000) * config.pricing.inputPerMillionTokens +
        (estimatedOutputTokens / 1_000_000) * config.pricing.outputPerMillionTokens;

      // Assign quality and speed scores based on model
      let qualityScore = 70;
      let speedScore = 70;
      let capabilities: string[] = [];

      if (modelId.includes('gpt-4')) {
        qualityScore = 95;
        speedScore = 85;
      } else if (modelId.includes('gpt-4o')) {
        qualityScore = 90;
        speedScore = 95;
      } else if (modelId.includes('gpt-3.5')) {
        qualityScore = 75;
        speedScore = 95;
      } else if (modelId.includes('mini')) {
        qualityScore = 80;
        speedScore = 98;
      }

      if (config.capabilities.supportsVision) capabilities.push('Vision');
      if (config.capabilities.supportsFunctions) capabilities.push('Function Calling');
      if (config.capabilities.maxTokens > 100000) capabilities.push('Long Context');

      comparisons.push({
        modelId,
        modelName: modelId,
        estimatedCost,
        estimatedTokens: estimatedInputTokens + estimatedOutputTokens,
        qualityScore,
        speedScore,
        capabilities,
        recommended: false, // Will be set by caller
      });
    }

    // Sort by cost (cheapest first)
    comparisons.sort((a, b) => a.estimatedCost - b.estimatedCost);

    return comparisons;
  }

  /**
   * Get cost savings achieved by user over time
   */
  async getUserSavings(userId: string): Promise<{
    totalSavings: number;
    savingsThisMonth: number;
    optimizationsAccepted: number;
    optimizationsRejected: number;
  }> {
    // TODO: Implement tracking of accepted/rejected recommendations
    // This would require a new database table to track optimization decisions
    return {
      totalSavings: 0,
      savingsThisMonth: 0,
      optimizationsAccepted: 0,
      optimizationsRejected: 0,
    };
  }

  /**
   * Suggest model based on historical usage patterns
   */
  suggestModelForAgent(
    agentId: string,
    userHistory: Array<{ model: string; cost: number; satisfaction?: number }>
  ): string {
    if (userHistory.length === 0) return 'gpt-4o-mini'; // Default to cheapest

    // Find most used model
    const modelCounts = userHistory.reduce((acc, item) => {
      acc[item.model] = (acc[item.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedModel = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return mostUsedModel || 'gpt-4o-mini';
  }
}

// Singleton instance
export const costOptimizationService = new CostOptimizationService();
