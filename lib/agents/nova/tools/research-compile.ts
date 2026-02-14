/**
 * Research Compile Tool
 *
 * Kompiliert mehrere Quellen zu einem zusammenhaengenden Forschungsergebnis mittels OpenAI.
 */

import OpenAI from 'openai';

export interface ResearchCompileInput {
  topic: string;
  sources: Array<{ title: string; content: string }>;
  format?: 'summary' | 'report' | 'bullet_points';
  max_length?: number;
}

export interface ResearchCompileResult {
  compiled: string;
  key_findings: string[];
  source_count: number;
  formatted_output: string;
}

export const RESEARCH_COMPILE_TOOL = {
  name: 'research_compile',
  description: 'Kompiliere und synthetisiere mehrere Quellen zu einem zusammenhaengenden Forschungsergebnis. Ideal fuer die Zusammenfassung von Recherche-Ergebnissen mit Quellenangaben und Kernerkenntnissen.',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Das Forschungsthema' },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Titel der Quelle' },
            content: { type: 'string', description: 'Inhalt / Textauszug der Quelle' },
          },
          required: ['title', 'content'],
        },
        description: 'Liste der Quellen mit Titel und Inhalt',
      },
      format: {
        type: 'string',
        enum: ['summary', 'report', 'bullet_points'],
        description: 'Ausgabeformat (default: summary)',
      },
      max_length: { type: 'number', description: 'Maximale Laenge der Ausgabe in Woertern (default: 500)' },
    },
    required: ['topic', 'sources'],
  },
};

export async function researchCompile(input: ResearchCompileInput): Promise<ResearchCompileResult> {
  const { topic, sources, format = 'summary', max_length = 500 } = input;

  if (!sources || sources.length === 0) {
    return {
      compiled: 'Keine Quellen zum Kompilieren bereitgestellt.',
      key_findings: [],
      source_count: 0,
      formatted_output: '❌ Keine Quellen bereitgestellt.',
    };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const formatInstruction = format === 'report'
      ? 'Erstelle einen strukturierten Bericht mit Einleitung, Hauptteil und Fazit.'
      : format === 'bullet_points'
      ? 'Erstelle eine uebersichtliche Aufzaehlung der wichtigsten Punkte.'
      : 'Erstelle eine praegnante Zusammenfassung.';

    const sourcesText = sources
      .map((s, i) => `[Quelle ${i + 1}: ${s.title}]\n${s.content}`)
      .join('\n\n---\n\n');

    const response = await openai.chat.completions.create({
      model,
      ...(model.includes('gpt-5') ? {} : { temperature: 0.3 }),
      ...(model.includes('gpt-5') || model.includes('gpt-4o')
        ? { max_completion_tokens: 2000 }
        : { max_tokens: 2000 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein erfahrener Research-Analyst. Synthetisiere die bereitgestellten Quellen zu einem zusammenhaengenden Forschungsergebnis.
${formatInstruction}
Maximale Laenge: ca. ${max_length} Woerter.
Zitiere die Quellen als [Quelle X].
Identifiziere die wichtigsten Erkenntnisse.

Antworte NUR als JSON:
{
  "compiled": "<Kompilierter Text auf Deutsch>",
  "key_findings": ["<Erkenntnis 1>", "<Erkenntnis 2>", ...]
}
Sprache: Deutsch.`,
        },
        {
          role: 'user',
          content: `Thema: ${topic}\n\nAnzahl Quellen: ${sources.length}\n\n${sourcesText}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const compiled = parsed.compiled || 'Keine Zusammenstellung generiert.';
    const keyFindings: string[] = parsed.key_findings || [];

    const formatted = [
      `📚 **Research-Zusammenstellung:** ${topic}`,
      `**Format:** ${format === 'report' ? 'Bericht' : format === 'bullet_points' ? 'Aufzaehlung' : 'Zusammenfassung'}`,
      `**Quellen:** ${sources.length}`,
      '',
      compiled,
      '',
      ...(keyFindings.length > 0 ? [
        '**Kernerkenntnisse:**',
        ...keyFindings.map((f: string) => `- 🔑 ${f}`),
        '',
      ] : []),
      '**Verwendete Quellen:**',
      ...sources.map((s, i) => `${i + 1}. ${s.title}`),
    ].join('\n');

    return {
      compiled,
      key_findings: keyFindings,
      source_count: sources.length,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      compiled: `Fehler bei der Zusammenstellung: ${error.message}`,
      key_findings: [],
      source_count: sources.length,
      formatted_output: `❌ Research-Zusammenstellung fehlgeschlagen: ${error.message}`,
    };
  }
}
