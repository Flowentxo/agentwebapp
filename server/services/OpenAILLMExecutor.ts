/**
 * OPENAI LLM EXECUTOR
 *
 * Real AI-powered LLM Agent execution using OpenAI GPT-4
 * Instrumented with AI Telemetry for cost tracking and performance monitoring.
 */

import OpenAI from 'openai';
import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutor } from './WorkflowExecutionEngine';
import { AITelemetryService } from './AITelemetryService';

/**
 * BANT Scoring Template for Lead Qualification
 */
const BANT_PROMPT_TEMPLATE = `Du bist ein B2B-Sales-Experte für die Maschinenbau-Branche.

Analysiere folgenden Lead und erstelle ein BANT-Scoring:

Lead-Daten:
{leadData}

Bewerte nach BANT-Kriterien:
1. **Budget**: Hat der Lead ausreichend Budget? (0-25 Punkte)
2. **Authority**: Ist die Kontaktperson ein Entscheider? (0-25 Punkte)
3. **Need**: Besteht ein echter, konkreter Bedarf? (0-25 Punkte)
4. **Timeline**: Wie dringend ist der Bedarf? (0-25 Punkte)

Antworte NUR im folgenden JSON-Format (keine zusätzlichen Texte):
{
  "score": <Gesamtscore 0-100>,
  "priority": "<A|B|C>",
  "budget_rating": <0-25>,
  "authority_rating": <0-25>,
  "need_rating": <0-25>,
  "timeline_rating": <0-25>,
  "reasoning": "<Kurze Begründung in 1-2 Sätzen>",
  "followUpEmail": "<Professional follow-up email text in German>",
  "nextSteps": "<Empfohlene nächste Schritte>"
}

Bewertungskriterien:
- A-Priority: Score > 75 (Hot Lead, sofort kontaktieren)
- B-Priority: Score 50-75 (Warm Lead, Follow-up planen)
- C-Priority: Score < 50 (Cold Lead, Nurturing)`;

/**
 * LLM Agent Executor - Real OpenAI Integration
 * Instrumented with AI Telemetry for automatic cost and performance tracking.
 */
export class OpenAILLMExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const {
      agentId,
      prompt,
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 1000,
    } = node.data;

    // Start telemetry timer
    const timer = AITelemetryService.startTimer();
    let status: 'success' | 'failed' | 'rate_limited' = 'success';
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    let promptTokens = 0;
    let completionTokens = 0;
    let usedModel = model;

    console.log(`[OpenAI_LLM] Executing node: ${node.data.label || 'Unnamed'}`);
    console.log(`[OpenAI_LLM] Model: ${model}, Temperature: ${temperature}`);

    try {
      // Variable interpolation in prompt
      const interpolatedPrompt = this.interpolateVariables(prompt, inputs, context);

      console.log(`[OpenAI_LLM] Prompt length: ${interpolatedPrompt.length} chars`);

      // Check if OpenAI API key is configured
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('YOUR_')) {
        console.warn('[OpenAI_LLM] ⚠️  No OPENAI_API_KEY configured - using mock response');
        usedModel = 'mock-response';
        return this.getMockResponse(interpolatedPrompt, inputs);
      }

      // Initialize OpenAI client with current API key
      const openai = new OpenAI({ apiKey });

      console.log(`[OpenAI_LLM] ✅ Using API key: ${apiKey.substring(0, 20)}...`);

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'Du bist ein B2B-Sales-Experte für die Maschinenbau-Branche. Antworte präzise und strukturiert im JSON-Format.'
          },
          {
            role: 'user',
            content: interpolatedPrompt
          }
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }, // Ensure JSON response
      });

      const aiResponse = response.choices[0].message.content || '{}';

      // Capture token usage for telemetry
      promptTokens = response.usage?.prompt_tokens || 0;
      completionTokens = response.usage?.completion_tokens || 0;
      usedModel = response.model;

      console.log(`[OpenAI_LLM] ✅ Response received: ${aiResponse.length} chars`);
      console.log(`[OpenAI_LLM] Tokens used: ${response.usage?.total_tokens || 0}`);

      // Parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('[OpenAI_LLM] Failed to parse AI response as JSON:', aiResponse);
        throw new Error('AI response was not valid JSON');
      }

      return {
        success: true,
        ...parsedResponse,
        _meta: {
          model: response.model,
          tokensUsed: response.usage?.total_tokens || 0,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          agentId,
        }
      };

    } catch (error: any) {
      console.error('[OpenAI_LLM] ❌ Execution failed:', error.message);

      // Capture error for telemetry
      status = error.status === 429 ? 'rate_limited' : 'failed';
      errorCode = error.status?.toString() || 'UNKNOWN';
      errorMessage = error.message;

      // Return error response
      return {
        success: false,
        error: error.message,
        score: 0,
        priority: 'C',
        reasoning: `Error: ${error.message}`,
      };
    } finally {
      // Log telemetry (fire-and-forget, never blocks)
      const responseTimeMs = timer.stop();

      AITelemetryService.logTrace({
        provider: 'openai',
        model: usedModel,
        requestType: 'chat',
        agentId,
        workspaceId: context.workflowId,
        promptTokens,
        completionTokens,
        responseTimeMs,
        status,
        errorCode,
        errorMessage,
        metadata: {
          temperature,
          maxTokens,
        },
      });
    }
  }

  /**
   * Interpolate variables in prompt template
   */
  private interpolateVariables(template: string, inputs: any, context: ExecutionContext): string {
    if (!template) return '';

    let result = template;

    // Replace {leadData} with formatted lead data
    if (inputs) {
      const leadDataFormatted = Object.entries(inputs)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');

      result = result.replace(/\{leadData\}/g, leadDataFormatted);
    }

    // Replace {{input}} with actual input JSON
    result = result.replace(/\{\{input\}\}/g, JSON.stringify(inputs, null, 2));

    // Replace {{trigger.payload.xxx}} with values
    result = result.replace(/\{\{trigger\.payload\.(\w+)\}\}/g, (match, key) => {
      const value = inputs?.[key];
      return value !== undefined ? String(value) : match;
    });

    // Replace {{variable.path}} with context variables
    const variableRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
    result = result.replace(variableRegex, (match, path) => {
      const value = this.getNestedValue(context.variables, path);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  /**
   * Get nested value from object by dot-notation path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Mock response when API key is not configured
   */
  private getMockResponse(prompt: string, inputs: any): any {
    const budget = inputs?.budget || 0;
    const mockScore = budget > 100000 ? 85 : budget > 50000 ? 65 : 45;

    return {
      success: true,
      score: mockScore,
      priority: mockScore > 75 ? 'A' : mockScore > 50 ? 'B' : 'C',
      budget_rating: Math.min(25, Math.floor(budget / 5000)),
      authority_rating: 20,
      need_rating: 18,
      timeline_rating: 15,
      reasoning: `[MOCK] Lead mit Budget ${budget}€ wurde automatisch bewertet. Bitte OPENAI_API_KEY konfigurieren für echte AI-Analyse.`,
      followUpEmail: `Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Interesse. Gerne besprechen wir Ihre Anforderungen im Detail.\n\nMit freundlichen Grüßen`,
      nextSteps: 'Termin für Bedarfsanalyse vereinbaren',
      _meta: {
        mock: true,
        model: 'mock-response',
        tokensUsed: 0,
      }
    };
  }
}
