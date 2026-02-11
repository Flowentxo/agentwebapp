/**
 * STRATEGY GENERATION API
 *
 * Phase I: Dynamic Discovery Engine
 *
 * Generates 1-3 strategy proposals based on business persona and pain points.
 * Does NOT generate full pipelines - just strategy summaries for the user to choose from.
 *
 * POST /api/pipelines/generate-strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OPENAI_MODEL } from '@/lib/ai/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STRATEGY_SYSTEM_PROMPT = `Du bist ein KI-Automatisierungsberater für kleine und mittlere Unternehmen.

Deine Aufgabe: Erstelle 2-3 konkrete Automatisierungsstrategien basierend auf der Branche und den Herausforderungen des Kunden.

Jede Strategie muss enthalten:
- name: Ein klarer, beschreibender Name (deutsch)
- description: 2-3 Sätze die erklären was die Strategie macht und welchen Nutzen sie bringt (deutsch)
- nodeCount: Geschätzte Anzahl der Workflow-Schritte (5-15)
- complexity: "simple" | "medium" | "advanced"
- integrations: Liste der benötigten Tools/Integrationen (z.B. "HubSpot", "Slack", "E-Mail", "Webhook")
- estimatedSetupMinutes: Geschätzte Einrichtungszeit in Minuten (5-30)

REGELN:
1. Die erste Strategie sollte immer die einfachste und schnellste sein ("Quick Win")
2. Die zweite Strategie sollte umfassender sein
3. Eine optionale dritte Strategie kann eine "Premium"-Lösung sein
4. Alle Strategien müssen realistisch umsetzbar sein
5. Verwende nur bekannte Integrationen: HubSpot, Slack, E-Mail, Webhook, Datenbank, Kalender
6. Jede Strategie sollte einen Human-Approval-Schritt für kritische Aktionen beinhalten

Antworte NUR mit validem JSON:
{
  "strategies": [...]
}`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { persona, painPoints, language = 'de' } = body;

    if (!persona || !painPoints || !Array.isArray(painPoints) || painPoints.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Persona and at least one pain point are required' },
        { status: 400 }
      );
    }

    console.log(
      `[STRATEGY_GENERATE] Generating strategies for persona: ${persona.titleDE}, painPoints: ${painPoints.length}`
    );

    const userPrompt = [
      `Branche: ${persona.titleDE}`,
      `Beschreibung: ${persona.descriptionDE}`,
      ``,
      `Herausforderungen:`,
      ...painPoints.map(
        (pp: any) => `- ${pp.titleDE}: ${pp.descriptionDE} (Priorität: ${pp.severity})`
      ),
      ``,
      `Erstelle 2-3 passende Automatisierungsstrategien für diesen Kunden.`,
    ].join('\n');

    const model = process.env.OPENAI_MODEL || OPENAI_MODEL;
    const maxTokensKey =
      model.includes('gpt-5') || model.includes('gpt-4o')
        ? 'max_completion_tokens'
        : 'max_tokens';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: STRATEGY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      [maxTokensKey]: 2000,
      response_format: { type: 'json_object' },
    } as any);

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 422 }
      );
    }

    let parsed: { strategies: any[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[STRATEGY_GENERATE] Failed to parse AI response:', content);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 422 }
      );
    }

    if (!parsed.strategies || !Array.isArray(parsed.strategies)) {
      return NextResponse.json(
        { success: false, error: 'Invalid strategy format from AI' },
        { status: 422 }
      );
    }

    // Validate and normalize strategies
    const strategies = parsed.strategies.slice(0, 3).map((s: any) => ({
      name: s.name || 'Unbenannte Strategie',
      description: s.description || '',
      nodeCount: Math.max(3, Math.min(20, s.nodeCount || 5)),
      complexity: ['simple', 'medium', 'advanced'].includes(s.complexity)
        ? s.complexity
        : 'medium',
      integrations: Array.isArray(s.integrations) ? s.integrations : [],
      estimatedSetupMinutes: Math.max(5, Math.min(60, s.estimatedSetupMinutes || 10)),
    }));

    console.log(
      `[STRATEGY_GENERATE] Generated ${strategies.length} strategies: ${strategies.map((s: any) => s.name).join(', ')}`
    );

    return NextResponse.json({ success: true, strategies });
  } catch (error: any) {
    console.error('[STRATEGY_GENERATE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate strategies', message: error.message },
      { status: 500 }
    );
  }
}
