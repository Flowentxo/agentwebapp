/**
 * Risk Assessment Tool
 *
 * AI-powered risk assessment using OpenAI.
 * Provides structured risk analysis for legal, financial, and operational scenarios.
 */

import OpenAI from 'openai';

export interface RiskAssessInput {
  scenario: string;
  context?: string;
  risk_type?: 'legal' | 'financial' | 'operational' | 'all';
}

export interface RiskItem {
  category: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface RiskAssessResult {
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  risks: RiskItem[];
  recommendations: string[];
  formatted_output: string;
}

export const RISK_ASSESS_TOOL = {
  name: 'risk_assess',
  description: 'Bewerte Risiken fuer rechtliche, finanzielle und operative Szenarien. AI-gestuetzte Analyse mit strukturierter Risikobewertung, Eintrittswahrscheinlichkeit, Auswirkung und Mitigationsstrategien.',
  input_schema: {
    type: 'object',
    properties: {
      scenario: {
        type: 'string',
        description: 'Beschreibung des zu bewertenden Szenarios',
      },
      context: {
        type: 'string',
        description: 'Zusaetzlicher Kontext (z.B. Branche, Unternehmensgrossee, Region)',
      },
      risk_type: {
        type: 'string',
        enum: ['legal', 'financial', 'operational', 'all'],
        description: 'Art der Risikoanalyse (default: all)',
      },
    },
    required: ['scenario'],
  },
};

const RISK_TYPE_LABELS: Record<string, string> = {
  legal: 'Rechtliche Risiken',
  financial: 'Finanzielle Risiken',
  operational: 'Operative Risiken',
  all: 'Alle Risikobereiche',
};

export async function assessRisk(input: RiskAssessInput): Promise<RiskAssessResult> {
  const { scenario, context = '', risk_type = 'all' } = input;
  const riskLabel = RISK_TYPE_LABELS[risk_type] || 'Alle Risikobereiche';

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

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
          content: `Du bist ein Risikomanagement-Experte mit juristischem Hintergrund.
Analysiere das gegebene Szenario und bewerte die Risiken systematisch.

Fokus: ${riskLabel}

Bewerte:
1. Einzelne Risiken mit Kategorie, Beschreibung, Eintrittswahrscheinlichkeit und Auswirkung
2. Fuer jedes Risiko eine konkrete Mitigationsstrategie
3. Gesamtrisiko-Bewertung (low/medium/high/critical) und Score (1-100)
4. Uebergreifende Handlungsempfehlungen

Antworte NUR als JSON:
{
  "overall_risk": "<low|medium|high|critical>",
  "score": <1-100>,
  "risks": [
    {
      "category": "<Kategorie>",
      "description": "<Risikobeschreibung>",
      "likelihood": "<low|medium|high>",
      "impact": "<low|medium|high|critical>",
      "mitigation": "<Mitigationsstrategie>"
    }
  ],
  "recommendations": ["<Empfehlung 1>", "<Empfehlung 2>", ...]
}

Sprache: Deutsch.`,
        },
        {
          role: 'user',
          content: `Bewerte die Risiken fuer folgendes Szenario:\n\n${scenario}${context ? `\n\nKontext: ${context}` : ''}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const overallRisk = parsed.overall_risk || 'medium';
    const score = Math.min(100, Math.max(1, parsed.score ?? 50));
    const risks: RiskItem[] = (parsed.risks || []).map((r: any) => ({
      category: r.category || 'Allgemein',
      description: r.description || '',
      likelihood: r.likelihood || 'medium',
      impact: r.impact || 'medium',
      mitigation: r.mitigation || '',
    }));
    const recommendations: string[] = parsed.recommendations || [];

    const riskEmoji = overallRisk === 'critical' ? '🔴' : overallRisk === 'high' ? '🟠' : overallRisk === 'medium' ? '🟡' : '🟢';
    const riskLabelDE = overallRisk === 'critical' ? 'KRITISCH' : overallRisk === 'high' ? 'HOCH' : overallRisk === 'medium' ? 'MITTEL' : 'NIEDRIG';

    const formatted = [
      `${riskEmoji} **Risiko-Bewertung** (${riskLabelDE} - Score: ${score}/100)`,
      '',
      `**Analysefokus:** ${riskLabel}`,
      `**Gesamtrisiko:** ${riskLabelDE}`,
      '',
      ...(risks.length > 0 ? [
        '**Identifizierte Risiken:**',
        '',
        ...risks.map((risk, idx) => {
          const likelihoodDE = risk.likelihood === 'high' ? 'Hoch' : risk.likelihood === 'medium' ? 'Mittel' : 'Niedrig';
          const impactDE = risk.impact === 'critical' ? 'Kritisch' : risk.impact === 'high' ? 'Hoch' : risk.impact === 'medium' ? 'Mittel' : 'Niedrig';
          const impactEmoji = risk.impact === 'critical' ? '🔴' : risk.impact === 'high' ? '🟠' : risk.impact === 'medium' ? '🟡' : '🟢';

          return [
            `${idx + 1}. ${impactEmoji} **${risk.category}**`,
            `   Beschreibung: ${risk.description}`,
            `   Wahrscheinlichkeit: ${likelihoodDE} | Auswirkung: ${impactDE}`,
            `   Mitigation: ${risk.mitigation}`,
            '',
          ].join('\n');
        }),
      ] : ['Keine spezifischen Risiken identifiziert.', '']),
      ...(recommendations.length > 0 ? [
        '**Handlungsempfehlungen:**',
        ...recommendations.map((r, i) => `${i + 1}. ${r}`),
        '',
      ] : []),
      '---',
      '*Hinweis: Dies ist eine automatische Risikoanalyse. Eine professionelle Beratung wird empfohlen.*',
    ].join('\n');

    return {
      overall_risk: overallRisk,
      score,
      risks,
      recommendations,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      overall_risk: 'high',
      score: 0,
      risks: [],
      recommendations: [],
      formatted_output: `❌ Risiko-Bewertung fehlgeschlagen: ${error.message}`,
    };
  }
}
