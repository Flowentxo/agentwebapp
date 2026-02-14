/**
 * Code Explain Tool
 *
 * Uses AI to explain code in natural language (German).
 */

import OpenAI from 'openai';

export interface CodeExplainInput {
  code: string;
  language?: string;
  detail_level?: 'brief' | 'detailed' | 'beginner';
}

export interface CodeExplainResult {
  explanation: string;
  key_concepts: string[];
  formatted_output: string;
}

export const CODE_EXPLAIN_TOOL = {
  name: 'code_explain',
  description: 'Erklaere Code in natuerlicher Sprache. Ideal fuer komplexe Algorithmen, unbekannte Patterns oder Lern-Szenarien. Erklaerung auf Deutsch.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Der zu erklaerende Code' },
      language: { type: 'string', description: 'Programmiersprache' },
      detail_level: {
        type: 'string',
        enum: ['brief', 'detailed', 'beginner'],
        description: 'Detailgrad der Erklaerung (default: detailed)',
      },
    },
    required: ['code'],
  },
};

export async function explainCode(input: CodeExplainInput): Promise<CodeExplainResult> {
  const { code, language = 'auto-detect', detail_level = 'detailed' } = input;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const detailPrompt = detail_level === 'brief'
      ? 'Erklaere kurz in 2-3 Saetzen was der Code macht.'
      : detail_level === 'beginner'
      ? 'Erklaere den Code so, als wuerde der Leser gerade programmieren lernen. Schritt fuer Schritt, einfache Sprache.'
      : 'Erklaere den Code detailliert: Was macht er, wie funktioniert er, welche Patterns werden verwendet.';

    const response = await openai.chat.completions.create({
      model,
      ...(model.includes('gpt-5') ? {} : { temperature: 0.3 }),
      ...(model.includes('gpt-5') || model.includes('gpt-4o')
        ? { max_completion_tokens: 1500 }
        : { max_tokens: 1500 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein Code-Erklaerer. ${detailPrompt}
Antworte NUR als JSON:
{
  "explanation": "<Erklaerung auf Deutsch>",
  "key_concepts": ["<Konzept 1>", "<Konzept 2>", ...]
}`,
        },
        {
          role: 'user',
          content: `Erklaere diesen ${language} Code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const formatted = [
      `📖 **Code-Erklaerung** (${detail_level})`,
      '',
      parsed.explanation || 'Keine Erklaerung verfuegbar',
      '',
      ...(parsed.key_concepts?.length > 0 ? [
        '**Schluesselkonzepte:**',
        ...parsed.key_concepts.map((c: string) => `- 🔑 ${c}`),
      ] : []),
    ].join('\n');

    return {
      explanation: parsed.explanation || '',
      key_concepts: parsed.key_concepts || [],
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      explanation: `Fehler: ${error.message}`,
      key_concepts: [],
      formatted_output: `❌ Erklaerung fehlgeschlagen: ${error.message}`,
    };
  }
}
