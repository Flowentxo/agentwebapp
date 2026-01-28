/**
 * CONTEXT-AWARE LLM EXECUTOR
 *
 * Enhanced LLM Agent execution with Pipeline Context integration.
 * Automatically injects context from previous pipeline steps and
 * stores results in shared context for downstream agents.
 */

import OpenAI from 'openai';
import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutor } from '../WorkflowExecutionEngine';
import {
  pipelineContextManager,
  ContextEntry,
  ContextArtifact
} from '../PipelineContextManager';

// =====================================================
// TYPES
// =====================================================

interface LLMNodeConfig {
  agentId?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  // Context-aware options
  injectContext?: boolean;
  contextFormat?: 'narrative' | 'structured' | 'compact';
  maxContextLength?: number;
  focusNodes?: string[];
  storeInContext?: boolean;
  contextKey?: string;
  generateSummary?: boolean;
}

interface LLMExecutionResult {
  success: boolean;
  response: string;
  parsed?: any;
  context?: {
    summary: string;
    entriesCount: number;
    artifactsCount: number;
  };
  _meta: {
    model: string;
    tokensUsed: number;
    promptTokens: number;
    completionTokens: number;
    agentId?: string;
    contextInjected: boolean;
    contextStored: boolean;
  };
}

// =====================================================
// CONTEXT PROMPT TEMPLATES
// =====================================================

const CONTEXT_INJECTION_TEMPLATE = `
## Pipeline Context (Vorherige Schritte)

Die folgenden Informationen stammen aus vorherigen Schritten dieser Pipeline-Ausführung.
Nutze dieses Wissen, um deine Aufgabe besser zu erfüllen.

{CONTEXT_SUMMARY}

---

## Deine aktuelle Aufgabe

`;

const CONTEXT_AWARE_SYSTEM_PROMPT = `Du bist ein intelligenter AI-Agent in einer Pipeline.
Du hast Zugriff auf den Kontext vorheriger Pipeline-Schritte.
Nutze dieses Vorwissen, um präzisere und kontextbezogene Antworten zu geben.
Wenn du auf Ergebnisse vorheriger Agenten verweist, sei spezifisch.`;

// =====================================================
// EXECUTOR
// =====================================================

export class ContextAwareLLMExecutor implements NodeExecutor {
  private openai: OpenAI | null = null;

  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && !apiKey.includes('YOUR_')) {
      this.openai = new OpenAI({ apiKey });
      console.log('[ContextAwareLLM] OpenAI client initialized');
    } else {
      console.warn('[ContextAwareLLM] No valid OPENAI_API_KEY - will use mock responses');
    }
  }

  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<LLMExecutionResult> {
    const config = this.extractConfig(node);
    const startTime = Date.now();

    console.log(`[ContextAwareLLM] Executing: ${node.data.label || 'Unnamed'}`);
    console.log(`[ContextAwareLLM] Context injection: ${config.injectContext ? 'enabled' : 'disabled'}`);

    try {
      // =====================================================
      // STEP 1: Prepare Context Augmented Prompt
      // =====================================================
      let augmentedPrompt = config.prompt;
      let contextSummary = '';
      let contextEntriesCount = 0;
      let contextArtifactsCount = 0;

      if (config.injectContext) {
        const contextData = await this.fetchContextSummary(
          context.executionId,
          config
        );

        contextSummary = contextData.summary;
        contextEntriesCount = contextData.entriesCount;
        contextArtifactsCount = contextData.artifactsCount;

        if (contextSummary && contextSummary.length > 0) {
          // Prepend context to the user's prompt
          const contextBlock = CONTEXT_INJECTION_TEMPLATE.replace(
            '{CONTEXT_SUMMARY}',
            contextSummary
          );
          augmentedPrompt = contextBlock + augmentedPrompt;

          console.log(`[ContextAwareLLM] Injected ${contextEntriesCount} context entries, ${contextArtifactsCount} artifacts`);
        }
      }

      // Interpolate variables in prompt
      const finalPrompt = this.interpolateVariables(augmentedPrompt, inputs, context);

      // =====================================================
      // STEP 2: Call LLM
      // =====================================================
      let result: LLMExecutionResult;

      if (!this.openai) {
        result = this.getMockResponse(finalPrompt, inputs, config, contextSummary);
      } else {
        result = await this.callOpenAI(finalPrompt, config, contextSummary);
      }

      // Add context metadata
      result.context = {
        summary: contextSummary ? contextSummary.substring(0, 200) + '...' : '',
        entriesCount: contextEntriesCount,
        artifactsCount: contextArtifactsCount,
      };
      result._meta.contextInjected = config.injectContext && contextEntriesCount > 0;

      // =====================================================
      // STEP 3: Store Result in Context
      // =====================================================
      if (config.storeInContext) {
        await this.storeResultInContext(
          context.executionId,
          node,
          result,
          config
        );
        result._meta.contextStored = true;
      }

      const duration = Date.now() - startTime;
      console.log(`[ContextAwareLLM] ✅ Completed in ${duration}ms`);

      return result;

    } catch (error: any) {
      console.error('[ContextAwareLLM] ❌ Execution failed:', error.message);

      // Store error in context for visibility
      if (config.storeInContext) {
        await pipelineContextManager.addToContext(
          context.executionId,
          config.contextKey || `${node.id}_error`,
          { error: error.message, timestamp: Date.now() },
          node.id,
          { nodeType: 'llm-agent', summary: `Error: ${error.message}` }
        );
      }

      return {
        success: false,
        response: '',
        _meta: {
          model: config.model || 'unknown',
          tokensUsed: 0,
          promptTokens: 0,
          completionTokens: 0,
          agentId: config.agentId,
          contextInjected: false,
          contextStored: false,
        },
      };
    }
  }

  // =====================================================
  // CONTEXT FETCHING
  // =====================================================

  private async fetchContextSummary(
    executionId: string,
    config: LLMNodeConfig
  ): Promise<{
    summary: string;
    entriesCount: number;
    artifactsCount: number;
  }> {
    try {
      const summary = await pipelineContextManager.getContextSummary(executionId, {
        maxLength: config.maxContextLength || 2000,
        format: config.contextFormat || 'narrative',
        focusNodes: config.focusNodes,
        includeArtifacts: true,
      });

      const entries = await pipelineContextManager.getContextEntries(executionId);
      const artifacts = await pipelineContextManager.getArtifacts(executionId);

      return {
        summary,
        entriesCount: entries.length,
        artifactsCount: artifacts.length,
      };
    } catch (error) {
      console.warn('[ContextAwareLLM] Failed to fetch context:', error);
      return { summary: '', entriesCount: 0, artifactsCount: 0 };
    }
  }

  // =====================================================
  // OPENAI CALL
  // =====================================================

  private async callOpenAI(
    prompt: string,
    config: LLMNodeConfig,
    contextSummary: string
  ): Promise<LLMExecutionResult> {
    const model = config.model || 'gpt-4o-mini';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens || 1000;

    // Build system prompt
    let systemPrompt = config.systemPrompt || CONTEXT_AWARE_SYSTEM_PROMPT;

    // Add context awareness hint to system prompt
    if (contextSummary) {
      systemPrompt += '\n\nDu hast Zugriff auf Kontext aus vorherigen Pipeline-Schritten.';
    }

    console.log(`[ContextAwareLLM] Calling OpenAI: ${model}, temp=${temperature}, maxTokens=${maxTokens}`);

    const response = await this.openai!.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0].message.content || '';
    const usage = response.usage;

    // Try to parse as JSON if applicable
    let parsed: any = undefined;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Not JSON, that's okay
    }

    return {
      success: true,
      response: content,
      parsed,
      _meta: {
        model: response.model,
        tokensUsed: usage?.total_tokens || 0,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        agentId: config.agentId,
        contextInjected: false,
        contextStored: false,
      },
    };
  }

  // =====================================================
  // STORE RESULT IN CONTEXT
  // =====================================================

  private async storeResultInContext(
    executionId: string,
    node: Node,
    result: LLMExecutionResult,
    config: LLMNodeConfig
  ): Promise<void> {
    const contextKey = config.contextKey || `${node.id}_output`;

    // Generate human-readable summary if requested
    let summary: string | undefined;
    if (config.generateSummary && result.response) {
      summary = this.generateResultSummary(result, node);
    }

    // Store main output
    await pipelineContextManager.addToContext(
      executionId,
      contextKey,
      {
        response: result.response,
        parsed: result.parsed,
        tokensUsed: result._meta.tokensUsed,
      },
      node.id,
      {
        nodeType: 'llm-agent',
        summary,
      }
    );

    // If result contains structured data, also store individual fields
    if (result.parsed && typeof result.parsed === 'object') {
      for (const [key, value] of Object.entries(result.parsed)) {
        if (this.isSignificantValue(value)) {
          await pipelineContextManager.addToContext(
            executionId,
            `${contextKey}.${key}`,
            value,
            node.id,
            { nodeType: 'llm-agent' }
          );
        }
      }
    }

    console.log(`[ContextAwareLLM] Stored result in context: ${contextKey}`);
  }

  private generateResultSummary(result: LLMExecutionResult, node: Node): string {
    const label = node.data.label || 'LLM Agent';
    const tokenInfo = `(${result._meta.tokensUsed} tokens)`;

    if (result.parsed) {
      const keys = Object.keys(result.parsed);
      return `${label} produced ${keys.length} outputs: ${keys.slice(0, 5).join(', ')} ${tokenInfo}`;
    }

    const responsePreview = result.response.substring(0, 100);
    return `${label}: "${responsePreview}..." ${tokenInfo}`;
  }

  private isSignificantValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.length === 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  // =====================================================
  // VARIABLE INTERPOLATION
  // =====================================================

  private interpolateVariables(
    template: string,
    inputs: any,
    context: ExecutionContext
  ): string {
    if (!template) return '';

    let result = template;

    // Replace {leadData} with formatted data (legacy support)
    if (inputs) {
      const dataFormatted = Object.entries(inputs)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
      result = result.replace(/\{leadData\}/g, dataFormatted);
    }

    // Replace {{input}} with input JSON
    result = result.replace(/\{\{input\}\}/g, JSON.stringify(inputs, null, 2));

    // Replace {{trigger.payload.xxx}}
    result = result.replace(/\{\{trigger\.payload\.(\w+)\}\}/g, (match, key) => {
      const value = inputs?.[key];
      return value !== undefined ? String(value) : match;
    });

    // Replace {{node_id.field}} with node outputs
    result = result.replace(/\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.]+)\}\}/g, (match, nodeId, path) => {
      const nodeOutput = context.nodeOutputs.get(nodeId);
      if (nodeOutput) {
        const value = this.getNestedValue(nodeOutput, path);
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      }
      return match;
    });

    // Replace {{variable.path}} with context variables
    result = result.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.variables, path);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // =====================================================
  // CONFIG EXTRACTION
  // =====================================================

  private extractConfig(node: Node): LLMNodeConfig {
    const data = node.data || {};
    return {
      agentId: data.agentId,
      prompt: data.prompt || '',
      model: data.model || data.selectedModel || 'gpt-4o-mini',
      temperature: data.temperature ?? 0.7,
      maxTokens: data.maxTokens || 1000,
      systemPrompt: data.systemPrompt,
      // Context-aware options (defaults to enabled)
      injectContext: data.injectContext !== false,
      contextFormat: data.contextFormat || 'narrative',
      maxContextLength: data.maxContextLength || 2000,
      focusNodes: data.focusNodes,
      storeInContext: data.storeInContext !== false,
      contextKey: data.contextKey,
      generateSummary: data.generateSummary !== false,
    };
  }

  // =====================================================
  // MOCK RESPONSE
  // =====================================================

  private getMockResponse(
    prompt: string,
    inputs: any,
    config: LLMNodeConfig,
    contextSummary: string
  ): LLMExecutionResult {
    console.log('[ContextAwareLLM] Using mock response (no API key)');

    const hasContext = contextSummary && contextSummary.length > 0;
    const contextNote = hasContext
      ? '\n\n[MOCK] Kontext aus vorherigen Schritten wurde berücksichtigt.'
      : '';

    const mockResponse = `[MOCK RESPONSE]

Basierend auf der Eingabe habe ich folgende Analyse durchgeführt:

Input: ${JSON.stringify(inputs).substring(0, 200)}...

${contextNote}

Bitte konfigurieren Sie OPENAI_API_KEY in .env.local für echte AI-Antworten.`;

    return {
      success: true,
      response: mockResponse,
      parsed: {
        mock: true,
        inputReceived: !!inputs,
        contextInjected: hasContext,
      },
      _meta: {
        model: 'mock-response',
        tokensUsed: 0,
        promptTokens: 0,
        completionTokens: 0,
        agentId: config.agentId,
        contextInjected: hasContext,
        contextStored: false,
      },
    };
  }
}

// Export singleton instance
export const contextAwareLLMExecutor = new ContextAwareLLMExecutor();
