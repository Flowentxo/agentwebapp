/**
 * Trend Analyze Tool
 *
 * KI-gestuetzte Trendanalyse mittels OpenAI. Identifiziert Muster,
 * macht Vorhersagen und erkennt Chancen und Risiken.
 */

import OpenAI from 'openai';

export interface TrendAnalyzeInput {
  topic: string;
  data_points?: string[];
  timeframe?: string;
  industry?: string;
}

export interface TrendAnalyzeResult {
  trends: Array<{
    name: string;
    direction: 'up' | 'down' | 'stable';
    confidence: number;
    description: string;
  }>;
  predictions: string[];
  opportunities: string[];
  risks: string[];
  formatted_output: string;
}

export const TREND_ANALYZE_TOOL = {
  name: 'trend_analyze',
  description: 'Analysiere Trends zu einem Thema oder einer Branche. Identifiziert Muster, macht Vorhersagen und erkennt Chancen sowie Risiken. Ideal fuer strategische Entscheidungen und Marktanalysen.',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Das zu analysierende Thema oder Stichwort' },
      data_points: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optionale Datenpunkte oder Beobachtungen als Kontext',
      },
      timeframe: { type: 'string', description: 'Zeitraum der Analyse, z.B. "Q1 2025", "letzte 6 Monate", "2024-2025"' },
      industry: { type: 'string', description: 'Branche / Industrie, z.B. "SaaS", "E-Commerce", "Fintech"' },
    },
    required: ['topic'],
  },
};

export async function trendAnalyze(input: TrendAnalyzeInput): Promise<TrendAnalyzeResult> {
  const { topic, data_points = [], timeframe = 'aktuell', industry = '' } = input;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const dataContext = data_points.length > 0
      ? `\nVorhandene Datenpunkte:\n${data_points.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
      : '';

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
          content: `Du bist ein erfahrener Trend-Analyst und Marktforscher. Analysiere Trends basierend auf dem gegebenen Thema und Kontext.

Antworte NUR als JSON mit diesem Schema:
{
  "trends": [
    {
      "name": "<Trendname>",
      "direction": "up" | "down" | "stable",
      "confidence": <0.0-1.0>,
      "description": "<Kurzbeschreibung>"
    }
  ],
  "predictions": ["<Vorhersage 1>", ...],
  "opportunities": ["<Chance 1>", ...],
  "risks": ["<Risiko 1>", ...]
}

Regeln:
- Mindestens 3 Trends identifizieren
- Confidence als Dezimalzahl 0.0 bis 1.0
- Mindestens 2 Vorhersagen
- Mindestens 2 Chancen und 2 Risiken
- Sprache: Deutsch`,
        },
        {
          role: 'user',
          content: `Analysiere Trends fuer: ${topic}${industry ? `\nBranche: ${industry}` : ''}${timeframe ? `\nZeitraum: ${timeframe}` : ''}${dataContext}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const trends: TrendAnalyzeResult['trends'] = (parsed.trends || []).map((t: any) => ({
      name: t.name || 'Unbekannt',
      direction: (['up', 'down', 'stable'].includes(t.direction) ? t.direction : 'stable') as 'up' | 'down' | 'stable',
      confidence: Math.min(1, Math.max(0, t.confidence || 0.5)),
      description: t.description || '',
    }));
    const predictions: string[] = parsed.predictions || [];
    const opportunities: string[] = parsed.opportunities || [];
    const risks: string[] = parsed.risks || [];

    const directionEmoji = (d: string) => d === 'up' ? '📈' : d === 'down' ? '📉' : '➡️';
    const confidenceBar = (c: number) => {
      const filled = Math.round(c * 5);
      return '█'.repeat(filled) + '░'.repeat(5 - filled) + ` ${Math.round(c * 100)}%`;
    };

    const formatted = [
      `📊 **Trend-Analyse:** ${topic}`,
      ...(industry ? [`**Branche:** ${industry}`] : []),
      ...(timeframe ? [`**Zeitraum:** ${timeframe}`] : []),
      '',
      '**Identifizierte Trends:**',
      ...trends.map(t => [
        `${directionEmoji(t.direction)} **${t.name}** [${confidenceBar(t.confidence)}]`,
        `   ${t.description}`,
      ].join('\n')),
      '',
      ...(predictions.length > 0 ? [
        '**Vorhersagen:**',
        ...predictions.map(p => `- 🔮 ${p}`),
        '',
      ] : []),
      ...(opportunities.length > 0 ? [
        '**Chancen:**',
        ...opportunities.map(o => `- 💡 ${o}`),
        '',
      ] : []),
      ...(risks.length > 0 ? [
        '**Risiken:**',
        ...risks.map(r => `- ⚠️ ${r}`),
      ] : []),
    ].join('\n');

    return {
      trends,
      predictions,
      opportunities,
      risks,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      trends: [],
      predictions: [],
      opportunities: [],
      risks: [],
      formatted_output: `❌ Trend-Analyse fehlgeschlagen: ${error.message}`,
    };
  }
}
