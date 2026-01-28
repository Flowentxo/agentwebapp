/**
 * EnterpriseToolFactory - Factory for creating AI-powered enterprise tools
 *
 * This factory provides helper methods for creating consistent,
 * AI-powered tool implementations across all Motion agents.
 *
 * NO MOCKS - All tools use real AI processing
 */

import { motionAI } from '../services/MotionAIService';
import { toolExecutor, ToolExecutionContext } from '../services/ToolExecutionService';
import { memoryService } from '../services/MemoryService';
import type { MotionTool, MotionAgentContext, ToolExecutionResult, MotionAgentId } from './types';

// ============================================
// ENTERPRISE TOOL HELPERS
// ============================================

/**
 * Create an AI-powered content generation tool
 */
export function createContentGenerationTool<TInput extends { content?: string; purpose?: string }, TOutput>(
  config: {
    name: string;
    displayName: string;
    description: string;
    category: 'communication' | 'document' | 'content';
    creditCost: number;
    requiresApproval?: boolean;
    contentType: 'email' | 'message' | 'document' | 'post' | 'report';
    systemPrompt: string;
    outputTransform: (aiResult: { content: string; tokensUsed: number }, input: TInput) => TOutput;
    inputSchema: Record<string, unknown>;
  }
): MotionTool<TInput, TOutput> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    category: config.category,
    creditCost: config.creditCost,
    requiresApproval: config.requiresApproval || false,
    inputSchema: {
      type: 'object',
      properties: config.inputSchema,
      required: Object.keys(config.inputSchema).filter((k) => !k.startsWith('optional_')),
    },
    execute: async (input: TInput, context: MotionAgentContext): Promise<TOutput> => {
      const prompt = input.purpose || input.content || JSON.stringify(input);

      const result = await motionAI.generateContent(prompt, config.systemPrompt, {
        style: 'professional',
        format: config.contentType === 'document' ? 'markdown' : 'text',
      });

      return config.outputTransform(
        { content: result.content, tokensUsed: result.metadata.tokensUsed },
        input
      );
    },
  };
}

/**
 * Create an AI-powered analysis tool
 */
export function createAnalysisTool<TInput, TOutput>(
  config: {
    name: string;
    displayName: string;
    description: string;
    category: 'analytics' | 'data';
    creditCost: number;
    analysisType: string;
    systemPrompt: string;
    outputSchema: Record<string, unknown>;
    inputSchema: Record<string, unknown>;
    postProcess?: (result: TOutput, input: TInput) => TOutput;
  }
): MotionTool<TInput, TOutput> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    category: config.category,
    creditCost: config.creditCost,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: config.inputSchema,
      required: Object.keys(config.inputSchema).filter((k) => !k.startsWith('optional_')),
    },
    execute: async (input: TInput, context: MotionAgentContext): Promise<TOutput> => {
      const result = await motionAI.analyzeData<TOutput>({
        data: input,
        analysisType: config.analysisType,
        outputSchema: config.outputSchema,
      });

      let output = result.result;
      if (config.postProcess) {
        output = config.postProcess(output, input);
      }

      return output;
    },
  };
}

/**
 * Create an AI-powered scoring/evaluation tool
 */
export function createScoringTool<TInput extends { data?: unknown }, TOutput>(
  config: {
    name: string;
    displayName: string;
    description: string;
    category: 'analytics';
    creditCost: number;
    scoringSubject: string;
    criteria: Array<{ name: string; weight: number; description: string }>;
    inputSchema: Record<string, unknown>;
    outputTransform: (
      scoreResult: {
        overallScore: number;
        criteriaScores: Array<{
          criterion: string;
          score: number;
          maxScore: number;
          reasoning: string;
        }>;
        summary: string;
      },
      input: TInput
    ) => TOutput;
  }
): MotionTool<TInput, TOutput> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    category: config.category,
    creditCost: config.creditCost,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: config.inputSchema,
      required: Object.keys(config.inputSchema).filter((k) => !k.startsWith('optional_')),
    },
    execute: async (input: TInput, context: MotionAgentContext): Promise<TOutput> => {
      const result = await motionAI.generateScore({
        subject: config.scoringSubject,
        criteria: config.criteria,
        data: input.data || input,
        maxScore: 100,
      });

      return config.outputTransform(result, input);
    },
  };
}

/**
 * Create an AI-powered recommendation tool
 */
export function createRecommendationTool<TInput, TOutput>(
  config: {
    name: string;
    displayName: string;
    description: string;
    category: 'analytics' | 'project';
    creditCost: number;
    contextDescription: string;
    focusAreas?: string[];
    maxRecommendations?: number;
    inputSchema: Record<string, unknown>;
    outputTransform: (
      recommendations: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        impact: string;
        effort: string;
      }>,
      input: TInput
    ) => TOutput;
  }
): MotionTool<TInput, TOutput> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    category: config.category,
    creditCost: config.creditCost,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: config.inputSchema,
      required: Object.keys(config.inputSchema).filter((k) => !k.startsWith('optional_')),
    },
    execute: async (input: TInput, context: MotionAgentContext): Promise<TOutput> => {
      const result = await motionAI.generateRecommendations({
        context: config.contextDescription,
        data: input,
        focusAreas: config.focusAreas,
        maxRecommendations: config.maxRecommendations || 5,
      });

      return config.outputTransform(result.recommendations, input);
    },
  };
}

/**
 * Create an AI-powered document generation tool
 */
export function createDocumentTool<TInput extends { title?: string; context?: string }, TOutput>(
  config: {
    name: string;
    displayName: string;
    description: string;
    category: 'document';
    creditCost: number;
    requiresApproval?: boolean;
    documentType: 'report' | 'plan' | 'proposal' | 'summary' | 'analysis';
    sections: string[];
    inputSchema: Record<string, unknown>;
    outputTransform: (
      document: {
        title: string;
        content: string;
        sections: Array<{ title: string; content: string }>;
      },
      input: TInput
    ) => TOutput;
  }
): MotionTool<TInput, TOutput> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    category: config.category,
    creditCost: config.creditCost,
    requiresApproval: config.requiresApproval || false,
    inputSchema: {
      type: 'object',
      properties: config.inputSchema,
      required: Object.keys(config.inputSchema).filter((k) => !k.startsWith('optional_')),
    },
    execute: async (input: TInput, context: MotionAgentContext): Promise<TOutput> => {
      const result = await motionAI.generateDocument({
        type: config.documentType,
        title: input.title || config.displayName,
        sections: config.sections,
        context: input.context || JSON.stringify(input),
        data: input,
        format: 'markdown',
      });

      return config.outputTransform(result, input);
    },
  };
}

/**
 * Create an AI-powered extraction tool
 */
export function createExtractionTool<TInput extends { content: string }, TOutput>(
  config: {
    name: string;
    displayName: string;
    description: string;
    category: 'analytics' | 'data';
    creditCost: number;
    extractionType: string;
    outputSchema: Record<string, unknown>;
    inputSchema: Record<string, unknown>;
  }
): MotionTool<TInput, TOutput> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    category: config.category,
    creditCost: config.creditCost,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: config.inputSchema,
      required: ['content'],
    },
    execute: async (input: TInput, context: MotionAgentContext): Promise<TOutput> => {
      const result = await motionAI.extractData<TOutput>({
        content: input.content,
        extractionType: config.extractionType,
        schema: config.outputSchema,
      });

      return result.result;
    },
  };
}

// ============================================
// EXECUTION WRAPPER
// ============================================

/**
 * Wrap a tool execution with full tracking
 */
export async function executeWithTracking<TInput, TOutput>(
  agentId: MotionAgentId,
  toolName: string,
  input: TInput,
  context: MotionAgentContext,
  executor: (input: TInput) => Promise<TOutput>,
  creditCost: number
): Promise<ToolExecutionResult<TOutput>> {
  const execContext: ToolExecutionContext = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    agentId,
    toolName,
    sessionId: context.sessionId,
  };

  return toolExecutor.execute<TInput, TOutput>(
    execContext,
    input,
    async (inp) => executor(inp),
    { creditCost }
  );
}

// ============================================
// CONTEXT ENRICHMENT
// ============================================

/**
 * Enrich tool input with user context
 */
export async function enrichWithContext<T extends Record<string, unknown>>(
  input: T,
  context: MotionAgentContext,
  agentId: MotionAgentId
): Promise<T & { _context: Record<string, unknown> }> {
  const memoryContext = await memoryService.buildAgentContext({
    userId: context.userId,
    workspaceId: context.workspaceId,
    agentId,
  });

  return {
    ...input,
    _context: {
      userProfile: memoryContext.userProfile,
      recentContext: memoryContext.contextSummary,
      preferences: memoryContext.userProfile.preferences,
    },
  };
}

// ============================================
// COMMON OUTPUT STRUCTURES
// ============================================

export interface StandardToolOutput {
  success: boolean;
  message?: string;
  data?: unknown;
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    source?: string;
  };
}

export interface EmailOutput {
  subject: string;
  body: string;
  recipients?: string[];
  cc?: string[];
  bcc?: string[];
  attachments?: string[];
  scheduledFor?: string;
  metadata?: {
    tone: string;
    wordCount: number;
    tokensUsed: number;
  };
}

export interface ReportOutput {
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    charts?: Array<{ type: string; data: unknown }>;
  }>;
  recommendations?: string[];
  generatedAt: string;
  metadata?: {
    tokensUsed: number;
    pageCount: number;
  };
}

export interface AnalysisOutput {
  score?: number;
  insights: string[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: string;
    impact: string;
  }>;
  risks?: string[];
  opportunities?: string[];
  metadata?: {
    confidence: number;
    tokensUsed: number;
    dataPoints: number;
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate required input fields
 */
export function validateInput<T extends Record<string, unknown>>(
  input: T,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter(
    (field) => input[field] === undefined || input[field] === null || input[field] === ''
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Sanitize output for API response
 */
export function sanitizeOutput<T>(output: T): T {
  if (typeof output === 'object' && output !== null) {
    const sanitized = { ...output } as Record<string, unknown>;
    // Remove internal fields
    delete sanitized._context;
    delete sanitized._internal;
    return sanitized as T;
  }
  return output;
}

export default {
  createContentGenerationTool,
  createAnalysisTool,
  createScoringTool,
  createRecommendationTool,
  createDocumentTool,
  createExtractionTool,
  executeWithTracking,
  enrichWithContext,
  validateInput,
  sanitizeOutput,
};
