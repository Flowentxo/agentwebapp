/**
 * Code Convert Tool
 *
 * Converts code between programming languages using AI.
 */

import OpenAI from 'openai';

export interface CodeConvertInput {
  code: string;
  source_language: string;
  target_language: string;
  preserve_comments?: boolean;
}

export interface CodeConvertResult {
  converted_code: string;
  notes: string[];
  formatted_output: string;
}

export const CODE_CONVERT_TOOL = {
  name: 'code_convert',
  description: 'Konvertiere Code von einer Programmiersprache in eine andere. Unterstuetzt alle gaengigen Sprachen: JavaScript, TypeScript, Python, Java, C#, Go, Rust, etc.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Der zu konvertierende Code' },
      source_language: { type: 'string', description: 'Ausgangssprache (z.B. "javascript", "python")' },
      target_language: { type: 'string', description: 'Zielsprache (z.B. "typescript", "python")' },
      preserve_comments: { type: 'boolean', description: 'Kommentare beibehalten (default: true)' },
    },
    required: ['code', 'source_language', 'target_language'],
  },
};

export async function convertCode(input: CodeConvertInput): Promise<CodeConvertResult> {
  const { code, source_language, target_language, preserve_comments = true } = input;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const response = await openai.chat.completions.create({
      model,
      ...(model.includes('gpt-5') ? {} : { temperature: 0.2 }),
      ...(model.includes('gpt-5') || model.includes('gpt-4o')
        ? { max_completion_tokens: 2000 }
        : { max_tokens: 2000 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein Code-Konvertierer. Konvertiere Code praezise von ${source_language} nach ${target_language}.
${preserve_comments ? 'Behalte Kommentare bei und uebersetze sie.' : 'Entferne Kommentare.'}
Nutze idiomatische Patterns der Zielsprache.
Antworte NUR als JSON:
{
  "converted_code": "<konvertierter Code>",
  "notes": ["<Anmerkung 1>", ...]
}`,
        },
        {
          role: 'user',
          content: `Konvertiere von ${source_language} nach ${target_language}:\n\n\`\`\`${source_language}\n${code}\n\`\`\``,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const formatted = [
      `🔄 **Code konvertiert:** ${source_language} → ${target_language}`,
      '',
      `\`\`\`${target_language}`,
      parsed.converted_code || '// Konvertierung fehlgeschlagen',
      '```',
      '',
      ...(parsed.notes?.length > 0 ? [
        '**Anmerkungen:**',
        ...parsed.notes.map((n: string) => `- ℹ️ ${n}`),
      ] : []),
    ].join('\n');

    return {
      converted_code: parsed.converted_code || '',
      notes: parsed.notes || [],
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      converted_code: '',
      notes: [`Fehler: ${error.message}`],
      formatted_output: `❌ Konvertierung fehlgeschlagen: ${error.message}`,
    };
  }
}
