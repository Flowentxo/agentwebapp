/**
 * Synthesize Results Tool
 *
 * Combines results from multiple agent delegations into
 * a coherent, unified response using AI.
 */

import OpenAI from 'openai';

export interface SynthesizeResultsInput {
  results: Array<{
    agent_id: string;
    agent_name: string;
    task: string;
    response: string;
  }>;
  original_task: string;
  format?: 'summary' | 'detailed' | 'executive';
}

export interface SynthesizeResultsResult {
  synthesis: string;
  key_findings: string[];
  agent_contributions: Array<{ agent: string; contribution: string }>;
  formatted_output: string;
}

export const SYNTHESIZE_RESULTS_TOOL = {
  name: 'synthesize_results',
  description: 'Fasse die Ergebnisse mehrerer Agent-Delegationen zu einem kohaerenten Gesamtergebnis zusammen. Nutze dies nach delegate_to_agent um die Einzelergebnisse zu vereinen.',
  input_schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            agent_id: { type: 'string' },
            agent_name: { type: 'string' },
            task: { type: 'string' },
            response: { type: 'string' },
          },
          required: ['agent_id', 'agent_name', 'task', 'response'],
        },
        description: 'Array der Agent-Ergebnisse',
      },
      original_task: { type: 'string', description: 'Die urspruengliche Gesamtaufgabe' },
      format: {
        type: 'string',
        enum: ['summary', 'detailed', 'executive'],
        description: 'Ausgabeformat (default: detailed)',
      },
    },
    required: ['results', 'original_task'],
  },
};

export async function synthesizeResults(input: SynthesizeResultsInput): Promise<SynthesizeResultsResult> {
  const { results, original_task, format = 'detailed' } = input;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const formatPrompt = format === 'summary'
      ? 'Fasse kurz in 3-5 Saetzen zusammen.'
      : format === 'executive'
        ? 'Erstelle eine Executive Summary mit Kernpunkten und Handlungsempfehlungen.'
        : 'Erstelle eine detaillierte Zusammenfassung mit allen wichtigen Erkenntnissen.';

    const agentResults = results.map(r =>
      `### ${r.agent_name} (${r.agent_id})\n**Aufgabe:** ${r.task}\n**Ergebnis:** ${r.response}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model,
      ...(model.includes('gpt-5') ? {} : { temperature: 0.4 }),
      ...(model.includes('gpt-5') || model.includes('gpt-4o')
        ? { max_completion_tokens: 2000 }
        : { max_tokens: 2000 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein Ergebnis-Synthesizer. Kombiniere die Ergebnisse mehrerer AI-Agenten zu einem kohaerenten Gesamtbild.
${formatPrompt}

Antworte NUR als JSON:
{
  "synthesis": "<Zusammengefuehrtes Ergebnis>",
  "key_findings": ["<Erkenntnis 1>", ...],
  "agent_contributions": [
    {"agent": "<Name>", "contribution": "<Kernbeitrag>"}
  ]
}

Sprache: Deutsch. Vermeide Redundanzen. Hebe Synergien und Widersprueche hervor.`,
        },
        {
          role: 'user',
          content: `**Urspruengliche Aufgabe:** ${original_task}\n\n**Agent-Ergebnisse:**\n\n${agentResults}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const contributions = (parsed.agent_contributions || []).map((c: any) => ({
      agent: c.agent || '',
      contribution: c.contribution || '',
    }));

    const formatted = [
      `🔗 **Synthese** (${results.length} Agenten)`,
      '',
      parsed.synthesis || 'Keine Synthese verfuegbar.',
      '',
      ...(parsed.key_findings?.length > 0 ? [
        '**Kernergebnisse:**',
        ...parsed.key_findings.map((f: string) => `- 💡 ${f}`),
        '',
      ] : []),
      ...(contributions.length > 0 ? [
        '**Agent-Beitraege:**',
        ...contributions.map((c: any) => `- 🤖 **${c.agent}:** ${c.contribution}`),
      ] : []),
    ].join('\n');

    return {
      synthesis: parsed.synthesis || '',
      key_findings: parsed.key_findings || [],
      agent_contributions: contributions,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      synthesis: `Synthese fehlgeschlagen: ${error.message}`,
      key_findings: [],
      agent_contributions: [],
      formatted_output: `❌ Ergebnis-Synthese fehlgeschlagen: ${error.message}`,
    };
  }
}
