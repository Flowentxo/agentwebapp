/**
 * Delegate Task Tool
 *
 * Delegates a task to a specific agent and returns the result.
 * Uses OpenAI non-streaming call with the target agent's system prompt and tools.
 */

import OpenAI from 'openai';
import { loadAgent } from '@/lib/agents/agent-loader';
import { getAgentSystemPrompt } from '@/lib/agents/prompts';
import { getKaiToolsForOpenAI, executeKaiTool } from '@/lib/agents/kai/tools';
import { getLexToolsForOpenAI, executeLexTool } from '@/lib/agents/lex/tools';
import { getNovaToolsForOpenAI, executeNovaTool } from '@/lib/agents/nova/tools';
import { getDexterToolsForOpenAI, executeDexterTool } from '@/lib/agents/dexter/tools';
import { getBuddyToolsForOpenAI, executeBuddyTool } from '@/server/agents/buddy/executor';
import { getCassieToolsForOpenAI, executeCassieTool } from '@/lib/agents/cassie/tools';
import { getVeraToolsForOpenAI, executeVeraTool } from '@/lib/agents/vera/tools';
import { getAriToolsForOpenAI, executeAriTool } from '@/lib/agents/ari/tools';
import { getAuraToolsForOpenAI, executeAuraTool } from '@/lib/agents/aura/tools';
import { getVinceToolsForOpenAI, executeVinceTool } from '@/lib/agents/vince/tools';
import { getMiloToolsForOpenAI, executeMiloTool } from '@/lib/agents/milo/tools';
import { getEchoToolsForOpenAI, executeEchoTool } from '@/lib/agents/echo/tools';
import { getFinnToolsForOpenAI, executeFinnTool } from '@/lib/agents/finn/tools';

export interface DelegateTaskInput {
  agent_id: string;
  task: string;
  context?: string;
}

export interface DelegateTaskResult {
  agent_id: string;
  agent_name: string;
  response: string;
  tools_used: string[];
  success: boolean;
  formatted_output: string;
}

export const DELEGATE_TASK_TOOL = {
  name: 'delegate_to_agent',
  description: 'Delegiere eine Aufgabe an einen spezifischen Agenten. Der Agent bearbeitet die Aufgabe mit seinen eigenen Tools und gibt das Ergebnis zurueck. Verfuegbare Agenten: dexter (Daten/Finanzen), kai (Code), lex (Legal), nova (Research), buddy (Budget), cassie (Support), vera (Security/DSGVO), ari (Automation), aura (Marketing/Brand), vince (Video), milo (Motion/CSS), echo (Audio/TTS), finn (Finanzstrategie).',
  input_schema: {
    type: 'object',
    properties: {
      agent_id: {
        type: 'string',
        enum: ['dexter', 'kai', 'lex', 'nova', 'buddy', 'cassie', 'vera', 'ari', 'aura', 'vince', 'milo', 'echo', 'finn'],
        description: 'ID des Ziel-Agenten',
      },
      task: { type: 'string', description: 'Die zu delegierende Aufgabe' },
      context: { type: 'string', description: 'Optionaler Kontext fuer den Agenten' },
    },
    required: ['agent_id', 'task'],
  },
};

/**
 * Get tools for a specific agent
 */
function getToolsForAgent(agentId: string): any[] {
  switch (agentId) {
    case 'kai': return getKaiToolsForOpenAI();
    case 'lex': return getLexToolsForOpenAI();
    case 'nova': return getNovaToolsForOpenAI();
    case 'dexter': return getDexterToolsForOpenAI();
    case 'buddy': return getBuddyToolsForOpenAI();
    case 'cassie': return getCassieToolsForOpenAI();
    case 'vera': return getVeraToolsForOpenAI();
    case 'ari': return getAriToolsForOpenAI();
    case 'aura': return getAuraToolsForOpenAI();
    case 'vince': return getVinceToolsForOpenAI();
    case 'milo': return getMiloToolsForOpenAI();
    case 'echo': return getEchoToolsForOpenAI();
    case 'finn': return getFinnToolsForOpenAI();
    default: return [];
  }
}

/**
 * Execute a tool for a specific agent
 */
async function executeToolForAgent(
  agentId: string,
  toolName: string,
  args: Record<string, any>,
  context: { userId: string; workspaceId?: string; sessionId?: string }
): Promise<any> {
  switch (agentId) {
    case 'kai':
      return executeKaiTool(toolName, args, context);
    case 'lex':
      return executeLexTool(toolName, args, context);
    case 'nova':
      return executeNovaTool(toolName, args, context);
    case 'dexter':
      return executeDexterTool(toolName, args, context);
    case 'buddy':
      return executeBuddyTool(toolName, args, context);
    case 'cassie':
      return executeCassieTool(toolName, args, context);
    case 'vera':
      return executeVeraTool(toolName, args, context);
    case 'ari':
      return executeAriTool(toolName, args, context);
    case 'aura':
      return executeAuraTool(toolName, args, context);
    case 'vince':
      return executeVinceTool(toolName, args, context);
    case 'milo':
      return executeMiloTool(toolName, args, context);
    case 'echo':
      return executeEchoTool(toolName, args, context);
    case 'finn':
      return executeFinnTool(toolName, args, context);
    default:
      return { success: false, error: `Unbekannter Agent: ${agentId}`, summary: 'Agent nicht gefunden' };
  }
}

export async function delegateToAgent(
  input: DelegateTaskInput,
  executionContext: { userId: string; workspaceId?: string; sessionId?: string }
): Promise<DelegateTaskResult> {
  const { agent_id, task, context: taskContext } = input;
  const toolsUsed: string[] = [];

  try {
    // Load agent persona
    const agent = await loadAgent(agent_id);
    if (!agent) {
      return {
        agent_id,
        agent_name: agent_id,
        response: `Agent "${agent_id}" nicht gefunden.`,
        tools_used: [],
        success: false,
        formatted_output: `❌ Agent "${agent_id}" nicht gefunden.`,
      };
    }

    // Get system prompt and tools
    const systemPrompt = await getAgentSystemPrompt(agent, executionContext.userId);
    const tools = getToolsForAgent(agent_id);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (taskContext) {
      messages.push({ role: 'user', content: `Kontext: ${taskContext}` });
    }
    messages.push({ role: 'user', content: task });

    // Run agent with tool calling loop (max 5 iterations)
    let iterations = 0;
    const maxIterations = 5;
    let lastToolResults: string[] = [];

    while (iterations < maxIterations) {
      iterations++;

      console.log(`[DELEGATE] ${agent_id} iteration ${iterations}/${maxIterations}, messages: ${messages.length}`);

      const completion = await openai.chat.completions.create({
        model,
        messages,
        ...(tools.length > 0 ? { tools } : {}),
        ...(model.includes('gpt-5') ? {} : { temperature: 0.5 }),
        ...(model.includes('gpt-5') || model.includes('gpt-4o')
          ? { max_completion_tokens: 4000 }
          : { max_tokens: 4000 }),
      });

      const choice = completion.choices[0];
      const hasToolCalls = choice.message.tool_calls && choice.message.tool_calls.length > 0;

      console.log(`[DELEGATE] ${agent_id} finish_reason=${choice.finish_reason}, hasToolCalls=${hasToolCalls}, content=${choice.message?.content ? choice.message.content.substring(0, 100) + '...' : 'null'}`);

      if (hasToolCalls) {
        // Execute tool calls (check message.tool_calls directly, not finish_reason,
        // because gpt-5/gpt-4o may return finish_reason 'stop' even with tool_calls)
        messages.push(choice.message);
        lastToolResults = [];

        for (const toolCall of choice.message.tool_calls!) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          toolsUsed.push(toolName);

          try {
            const result = await executeToolForAgent(agent_id, toolName, toolArgs, executionContext);
            const resultStr = JSON.stringify(result);
            lastToolResults.push(resultStr);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: resultStr,
            });
          } catch (toolError: any) {
            const errorStr = JSON.stringify({ success: false, error: toolError.message });
            lastToolResults.push(errorStr);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: errorStr,
            });
          }
        }
      } else {
        // Agent finished with a text response (no tool calls)
        let response = choice.message?.content || '';

        // If model returned empty content but tools were used, extract summary from tool results
        if (!response && lastToolResults.length > 0) {
          console.log(`[DELEGATE] ${agent_id} empty content after tool use, extracting from tool results`);
          try {
            const summaries = lastToolResults.map(r => {
              const parsed = JSON.parse(r);
              return parsed.summary || parsed.data?.summary || parsed.content?.substring(0, 500) || '';
            }).filter(Boolean);
            response = summaries.join('\n\n') || 'Tool-Ergebnisse ohne Zusammenfassung.';
          } catch {
            response = 'Tool-Ergebnisse konnten nicht extrahiert werden.';
          }
        }

        if (!response) {
          response = 'Keine Antwort erhalten.';
        }

        const formatted = [
          `🤖 **${agent.name}** (delegiert)`,
          '',
          response,
          '',
          ...(toolsUsed.length > 0 ? [
            `*Tools verwendet: ${toolsUsed.join(', ')}*`,
          ] : []),
        ].join('\n');

        return {
          agent_id,
          agent_name: agent.name,
          response,
          tools_used: toolsUsed,
          success: true,
          formatted_output: formatted,
        };
      }
    }

    // Max iterations reached — try to extract from tool results
    let fallbackResponse = 'Max Iterationen erreicht.';
    if (lastToolResults.length > 0) {
      try {
        const summaries = lastToolResults.map(r => {
          const parsed = JSON.parse(r);
          return parsed.summary || parsed.data?.summary || parsed.content?.substring(0, 500) || '';
        }).filter(Boolean);
        if (summaries.length > 0) fallbackResponse = summaries.join('\n\n');
      } catch {}
    }
    const lastMessage = messages[messages.length - 1];
    if (typeof lastMessage?.content === 'string' && lastMessage.content) {
      fallbackResponse = lastMessage.content;
    }

    return {
      agent_id,
      agent_name: agent.name,
      response: fallbackResponse,
      tools_used: toolsUsed,
      success: true,
      formatted_output: `🤖 **${agent.name}** (delegiert)\n\n${fallbackResponse}\n\n*Tools: ${toolsUsed.join(', ')}*`,
    };
  } catch (error: any) {
    return {
      agent_id,
      agent_name: agent_id,
      response: `Delegation fehlgeschlagen: ${error.message}`,
      tools_used: toolsUsed,
      success: false,
      formatted_output: `❌ Delegation an ${agent_id} fehlgeschlagen: ${error.message}`,
    };
  }
}
