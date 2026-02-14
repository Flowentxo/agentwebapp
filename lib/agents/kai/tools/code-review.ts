/**
 * Code Review Tool
 *
 * AI-powered code review using OpenAI. Provides structured feedback
 * on code quality, best practices, and potential improvements.
 */

import OpenAI from 'openai';

export interface CodeReviewInput {
  code: string;
  language?: string;
  context?: string;
  focus?: 'bugs' | 'performance' | 'security' | 'readability' | 'all';
}

export interface CodeReviewResult {
  rating: number; // 1-10
  summary: string;
  strengths: string[];
  improvements: string[];
  bugs: string[];
  formatted_output: string;
}

export const CODE_REVIEW_TOOL = {
  name: 'code_review',
  description: 'AI-gestuetztes Code Review. Analysiert Code auf Bugs, Performance, Sicherheit und Lesbarkeit. Gibt strukturiertes Feedback mit Bewertung und konkreten Verbesserungsvorschlaegen.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Der zu reviewende Code' },
      language: { type: 'string', description: 'Programmiersprache' },
      context: { type: 'string', description: 'Optionaler Kontext (z.B. "React Component", "Express Middleware")' },
      focus: {
        type: 'string',
        enum: ['bugs', 'performance', 'security', 'readability', 'all'],
        description: 'Review-Fokus (default: all)',
      },
    },
    required: ['code'],
  },
};

export async function reviewCode(input: CodeReviewInput): Promise<CodeReviewResult> {
  const { code, language = 'auto-detect', context = '', focus = 'all' } = input;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

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
          content: `Du bist ein erfahrener Code-Reviewer. Analysiere den Code und gib strukturiertes Feedback.
Antworte NUR als JSON mit diesem Schema:
{
  "rating": <1-10>,
  "summary": "<1-2 Saetze Zusammenfassung>",
  "strengths": ["<Staerke 1>", ...],
  "improvements": ["<Verbesserung 1>", ...],
  "bugs": ["<Bug/Problem 1>", ...]
}
Fokus: ${focus}. Sprache: Deutsch.`,
        },
        {
          role: 'user',
          content: `Review diesen ${language} Code${context ? ` (${context})` : ''}:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const rating = Math.min(10, Math.max(1, parsed.rating || 5));
    const ratingEmoji = rating >= 8 ? '🟢' : rating >= 5 ? '🟡' : '🔴';

    const formatted = [
      `${ratingEmoji} **Code Review: ${rating}/10**`,
      '',
      `**Zusammenfassung:** ${parsed.summary || 'Keine Zusammenfassung'}`,
      '',
      ...(parsed.strengths?.length > 0 ? [
        '**Staerken:**',
        ...parsed.strengths.map((s: string) => `- ✅ ${s}`),
        '',
      ] : []),
      ...(parsed.improvements?.length > 0 ? [
        '**Verbesserungen:**',
        ...parsed.improvements.map((i: string) => `- 💡 ${i}`),
        '',
      ] : []),
      ...(parsed.bugs?.length > 0 ? [
        '**Bugs/Probleme:**',
        ...parsed.bugs.map((b: string) => `- 🐛 ${b}`),
      ] : []),
    ].join('\n');

    return {
      rating,
      summary: parsed.summary || '',
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      bugs: parsed.bugs || [],
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      rating: 0,
      summary: `Review fehlgeschlagen: ${error.message}`,
      strengths: [],
      improvements: [],
      bugs: [],
      formatted_output: `❌ Code Review fehlgeschlagen: ${error.message}`,
    };
  }
}
