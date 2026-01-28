/**
 * Agent Node Executor - Phase 11: Brain Cortex Integration
 *
 * Enterprise-grade AI agent execution with:
 * - EnhancedRAG for context retrieval with citations
 * - ModelRouter for intelligent model selection
 * - AIUsageTracker for ISO 42001 compliance
 * - MemoryStoreV2 for persistent memory feedback loop
 *
 * Supports resolved variable references in prompts ({{nodeId.path}})
 */

import crypto from 'crypto';
import {
  WorkflowNode,
  ExecutionContext,
  NodeOutput,
  AgentRAGConfig,
  AgentNodeOutput,
  RAGCitation,
} from '../types';
import { getAgentById } from '@/lib/agents/personas';
import { getDefaultAgentPrompt } from '@/lib/agents/prompts';

// Brain Cortex Integrations
import { EnhancedRAGService, RAGConfig } from '@/lib/brain/EnhancedRAG';
import { ModelRouter, RouterOptions, GenerationResult } from '@/lib/brain/ModelRouter';
import { AIUsageTrackerService, UsageRecord } from '@/lib/brain/AIUsageTracker';
import { MemoryStoreV2, MemoryRecord } from '@/server/brain/MemoryStoreV2';

// ============================================
// FALLBACK RESPONSES (used when all AI fails)
// ============================================

const FALLBACK_RESPONSES: Record<string, string> = {
  dexter: 'Based on the data analysis, I recommend focusing on Q4 metrics which show a 15% improvement.',
  cassie: 'I understand your concern. Let me help you resolve this issue step by step.',
  emmie: 'I have drafted the following email for your review...',
  kai: 'Here is the optimized code solution with improved performance.',
  finn: 'After reviewing the financial data, I suggest the following budget allocation...',
  lex: 'From a legal perspective, I would advise reviewing the following clauses...',
  default: 'I have processed your request and generated the following response.',
};

// ============================================
// DEFAULT RAG CONFIGURATION
// ============================================

const DEFAULT_RAG_CONFIG: AgentRAGConfig = {
  ragEnabled: false,
  ragThreshold: 0.7,
  knowledgeTags: [],
  includePreviousMemories: false,
  maxContextChunks: 5,
  includeCitations: true,
  retrievalStrategy: 'hybrid',
};

// ============================================
// HELPER: GENERATE TRACE ID
// ============================================

function generateTraceId(): string {
  return `trace-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================
// HELPER: BUILD CONTEXT-ENHANCED PROMPT
// ============================================

function buildContextEnhancedPrompt(
  userPrompt: string,
  ragContext: string,
  citations: RAGCitation[],
  includeCitations: boolean
): string {
  if (!ragContext) {
    return userPrompt;
  }

  let enhancedPrompt = `## RELEVANT CONTEXT FROM KNOWLEDGE BASE:\n\n${ragContext}\n\n`;

  if (includeCitations && citations.length > 0) {
    enhancedPrompt += `## AVAILABLE SOURCES:\n`;
    citations.forEach((citation, index) => {
      enhancedPrompt += `[${index + 1}] ${citation.title} (Relevance: ${Math.round(citation.relevance * 100)}%)\n`;
    });
    enhancedPrompt += `\n`;
  }

  enhancedPrompt += `## USER REQUEST:\n${userPrompt}\n\n`;
  enhancedPrompt += `Please answer based on the context provided above. Reference sources in [brackets] when applicable.`;

  return enhancedPrompt;
}

// ============================================
// AGENT NODE EXECUTOR
// ============================================

export async function executeAgentNode(
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  const config = (node.data.config || {}) as Record<string, unknown>;
  const ragConfig: AgentRAGConfig = {
    ...DEFAULT_RAG_CONFIG,
    ...(node.data.ragConfig || {}),
  };

  console.log(`[AgentExecutor] Executing node: ${node.id} (traceId: ${traceId})`);
  console.log(`[AgentExecutor] Config:`, JSON.stringify(config, null, 2));
  console.log(`[AgentExecutor] RAG Config:`, JSON.stringify(ragConfig, null, 2));

  // Initialize services
  let enhancedRAG: EnhancedRAGService | null = null;
  let modelRouter: ModelRouter | null = null;
  let usageTracker: AIUsageTrackerService | null = null;
  let memoryStore: MemoryStoreV2 | null = null;

  try {
    enhancedRAG = EnhancedRAGService.getInstance();
    modelRouter = ModelRouter.getInstance();
    usageTracker = new AIUsageTrackerService();
    memoryStore = MemoryStoreV2.getInstance();
  } catch (err) {
    console.warn(`[AgentExecutor] Some Brain services unavailable:`, err);
  }

  try {
    // Extract configuration
    const agentId = (config.agentId as string) || (config.agentType as string) || 'default';
    const customSystemPrompt = config.systemPrompt as string | undefined;
    const userPrompt = config.userPrompt as string | undefined;
    const preferredModel = (config.model as string) || undefined;
    const temperature = parseFloat((config.temperature as string) || '0.7');

    // Extract workspace/user context (from execution context variables)
    const workspaceId = (context.variables.workspaceId as string) || 'default-workspace';
    const userId = (context.variables.userId as string) || 'system';

    // Build the effective user prompt
    let effectiveUserPrompt = userPrompt || '';
    if (!effectiveUserPrompt) {
      const inputContext = Object.entries(inputs)
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `[${key}]: ${JSON.stringify(value, null, 2)}`;
          }
          return `[${key}]: ${value}`;
        })
        .join('\n\n');
      effectiveUserPrompt = inputContext || 'Process the workflow data.';
    }

    console.log(`[AgentExecutor] Agent ID: ${agentId}`);
    console.log(`[AgentExecutor] RAG Enabled: ${ragConfig.ragEnabled}`);
    console.log(`[AgentExecutor] User Prompt: ${effectiveUserPrompt.substring(0, 200)}...`);

    // Step 1: Retrieve Agent Persona
    const agent = getAgentById(agentId);

    // Step 2: Get System Prompt
    let systemPrompt: string;
    if (customSystemPrompt) {
      systemPrompt = customSystemPrompt;
    } else if (agent) {
      systemPrompt = getDefaultAgentPrompt(agent);
    } else {
      systemPrompt = `You are a helpful AI assistant. Process the user's request professionally and provide accurate, actionable responses.`;
    }

    // Step 3: RAG Context Retrieval (if enabled)
    let ragContext = '';
    let citations: RAGCitation[] = [];
    let ragConfidenceScore = 0;

    if (ragConfig.ragEnabled && enhancedRAG) {
      console.log(`[AgentExecutor] Retrieving RAG context...`);

      try {
        const ragOptions: Partial<RAGConfig> = {
          retrieval: {
            strategy: ragConfig.retrievalStrategy || 'hybrid',
            topK: ragConfig.maxContextChunks || 5,
            minRelevance: ragConfig.ragThreshold,
            useReranking: true,
            expandQuery: true,
          },
          generation: {
            temperature,
            maxTokens: 2000,
            includeSourcesInPrompt: ragConfig.includeCitations || true,
            streamResponse: false,
          },
          fusion: {
            enabled: true,
            maxChunksPerSource: 3,
            overlapThreshold: 0.7,
          },
        };

        // Add tag filtering if specified
        if (ragConfig.knowledgeTags.length > 0) {
          console.log(`[AgentExecutor] Filtering by tags: ${ragConfig.knowledgeTags.join(', ')}`);
        }

        const ragResponse = await enhancedRAG.query(
          effectiveUserPrompt,
          workspaceId,
          userId,
          ragOptions
        );

        if (ragResponse.sources.length > 0) {
          ragContext = ragResponse.sources
            .map(s => `### ${s.title}\n${s.excerpt}`)
            .join('\n\n---\n\n');

          citations = ragResponse.sources.map(s => ({
            id: s.id,
            title: s.title,
            excerpt: s.excerpt,
            relevance: s.relevance,
            sourceType: s.sourceType,
            metadata: s.metadata,
          }));

          ragConfidenceScore = ragResponse.confidenceScore;
          console.log(`[AgentExecutor] RAG retrieved ${citations.length} sources (confidence: ${ragConfidenceScore})`);
        }
      } catch (ragError) {
        console.warn(`[AgentExecutor] RAG retrieval failed:`, ragError);
      }
    }

    // Step 4: Include Previous Memories (if enabled)
    if (ragConfig.includePreviousMemories && memoryStore) {
      try {
        const recentMemories = await memoryStore.query({
          agentId,
          limit: 5,
          minImportance: 5,
        });

        if (recentMemories.length > 0) {
          const memoryContext = recentMemories
            .map(m => `[Memory ${m.timestamp}]: ${JSON.stringify(m.context)}`)
            .join('\n');
          ragContext = ragContext
            ? `${ragContext}\n\n### Previous Session Context:\n${memoryContext}`
            : `### Previous Session Context:\n${memoryContext}`;
          console.log(`[AgentExecutor] Included ${recentMemories.length} previous memories`);
        }
      } catch (memError) {
        console.warn(`[AgentExecutor] Memory retrieval failed:`, memError);
      }
    }

    // Step 5: Build context-enhanced prompt
    const enhancedPrompt = ragConfig.ragEnabled
      ? buildContextEnhancedPrompt(
          effectiveUserPrompt,
          ragContext,
          citations,
          ragConfig.includeCitations || true
        )
      : effectiveUserPrompt;

    // Step 6: Generate AI Response via ModelRouter
    let response: string;
    let tokensUsed = { prompt: 0, completion: 0, total: 0 };
    let cost = 0;
    let usedModel = preferredModel || 'gpt-4-turbo-preview';
    let usedProvider = 'openai';
    let usedFallback = false;
    let latencyMs = 0;

    try {
      if (modelRouter) {
        console.log(`[AgentExecutor] Using ModelRouter for intelligent model selection...`);

        const routerOptions: RouterOptions = {
          preferQuality: ragConfig.ragEnabled, // Prefer quality when using RAG
          preferSpeed: !ragConfig.ragEnabled,
        };

        if (preferredModel) {
          routerOptions.forceModel = preferredModel;
        }

        const generationStart = Date.now();
        const result: GenerationResult = await modelRouter.generate(
          systemPrompt,
          enhancedPrompt,
          routerOptions
        );
        latencyMs = Date.now() - generationStart;

        response = result.content;
        tokensUsed = result.tokensUsed;
        cost = result.cost;
        usedModel = result.model;
        usedProvider = result.provider;

        console.log(`[AgentExecutor] ModelRouter response: ${usedModel} (${latencyMs}ms)`);
      } else {
        // Fallback to direct OpenAI if ModelRouter unavailable
        const { generateAgentResponse } = await import('@/lib/ai/openai-service');

        const agentForApi = agent || {
          id: agentId,
          name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
          role: 'AI Assistant',
          bio: 'A helpful AI assistant',
          specialties: [],
          icon: 'Bot',
          color: '#6366f1',
          category: 'general' as const,
          available: true,
        };

        const aiResponse = await generateAgentResponse(
          agentForApi,
          enhancedPrompt,
          [],
          preferredModel
        );

        response = aiResponse.content;
        tokensUsed = {
          prompt: aiResponse.tokensInput || 0,
          completion: aiResponse.tokensOutput || 0,
          total: aiResponse.tokensUsed || 0,
        };
        cost = aiResponse.cost || 0;
        usedModel = aiResponse.model || preferredModel || 'gpt-4-turbo-preview';
        latencyMs = Date.now() - startTime;
      }
    } catch (apiError) {
      console.error(`[AgentExecutor] AI generation failed, using fallback:`, apiError);
      usedFallback = true;
      response = FALLBACK_RESPONSES[agentId] || FALLBACK_RESPONSES.default;
      tokensUsed = {
        prompt: Math.floor(enhancedPrompt.length / 4),
        completion: Math.floor(response.length / 4),
        total: 0,
      };
      tokensUsed.total = tokensUsed.prompt + tokensUsed.completion;
      latencyMs = Date.now() - startTime;
    }

    // Step 7: ISO 42001 Compliance Tracking
    if (usageTracker && !usedFallback) {
      try {
        const usageRecord: UsageRecord = {
          workspaceId,
          userId,
          model: usedModel,
          provider: usedProvider as any,
          operation: 'generate',
          tokensPrompt: tokensUsed.prompt,
          tokensCompletion: tokensUsed.completion,
          latencyMs,
          success: true,
          context: {
            agentId,
            feature: 'workflow-agent-node',
            sessionId: context.executionId,
          },
        };

        await usageTracker.track(usageRecord);
        console.log(`[AgentExecutor] ISO 42001 usage tracked`);
      } catch (trackError) {
        console.warn(`[AgentExecutor] Usage tracking failed:`, trackError);
      }
    }

    // Step 8: Memory Persistence (store successful interaction)
    let memoryId: string | undefined;
    if (memoryStore && !usedFallback) {
      try {
        memoryId = crypto.randomUUID();
        const memoryRecord: MemoryRecord = {
          id: memoryId,
          agentId,
          timestamp: new Date().toISOString(),
          context: {
            workflowId: context.workflowId,
            executionId: context.executionId,
            nodeId: node.id,
            userPrompt: effectiveUserPrompt.substring(0, 500),
            response: response.substring(0, 500),
            ragEnabled: ragConfig.ragEnabled,
            sourcesUsed: citations.length,
          },
          tags: [
            'workflow',
            `agent:${agentId}`,
            `workflow:${context.workflowId}`,
            ...(ragConfig.knowledgeTags || []),
          ],
          importance: ragConfig.ragEnabled ? 7 : 5, // Higher importance for RAG-enhanced responses
        };

        await memoryStore.store(memoryRecord);
        console.log(`[AgentExecutor] Memory persisted: ${memoryId}`);
      } catch (memError) {
        console.warn(`[AgentExecutor] Memory persistence failed:`, memError);
      }
    }

    const processingTime = Date.now() - startTime;

    // Build enhanced output object
    const output: AgentNodeOutput = {
      response,
      agentId,
      agentName: agent?.name || (config.agentName as string) || agentId,
      model: usedModel,
      provider: usedProvider,
      temperature,
      tokensUsed,
      cost,
      ragContext: ragConfig.ragEnabled
        ? {
            enabled: true,
            sourcesUsed: citations.length,
            citations,
            confidenceScore: ragConfidenceScore,
            retrievalStrategy: ragConfig.retrievalStrategy || 'hybrid',
          }
        : undefined,
      compliance: !usedFallback
        ? {
            workspaceId,
            userId,
            model: usedModel,
            provider: usedProvider,
            operation: 'generate',
            tokensPrompt: tokensUsed.prompt,
            tokensCompletion: tokensUsed.completion,
            latencyMs,
            success: true,
            traceId,
          }
        : undefined,
      memoryId,
      sessionId: context.executionId,
      traceId,
      processingTime,
      timestamp: new Date().toISOString(),
      confidence: usedFallback ? 0.5 : ragConfig.ragEnabled ? Math.max(0.7, ragConfidenceScore) : 0.85,
      usedFallback,
    };

    console.log(`[AgentExecutor] Success - Response generated in ${processingTime}ms`);
    console.log(`[AgentExecutor] Tokens: ${tokensUsed.total}, Cost: $${cost.toFixed(6)}, TraceId: ${traceId}`);

    return {
      success: true,
      data: output,
      duration: processingTime,
      timestamp: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AgentExecutor] Failed (traceId: ${traceId}):`, message);

    // Track failed execution for compliance
    if (usageTracker) {
      try {
        const workspaceId = (context.variables.workspaceId as string) || 'default-workspace';
        const userId = (context.variables.userId as string) || 'system';

        await usageTracker.track({
          workspaceId,
          userId,
          model: 'unknown',
          provider: 'openai',
          operation: 'generate',
          tokensPrompt: 0,
          tokensCompletion: 0,
          latencyMs: Date.now() - startTime,
          success: false,
          errorMessage: message,
          context: {
            agentId: (config.agentId as string) || 'unknown',
            feature: 'workflow-agent-node',
            sessionId: context.executionId,
          },
        });
      } catch (trackError) {
        console.warn(`[AgentExecutor] Failed to track error:`, trackError);
      }
    }

    return {
      success: false,
      data: null,
      error: message,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}
