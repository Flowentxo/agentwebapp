/**
 * PROMPT ANALYSIS API - Smart Entry
 *
 * Analyzes a raw user prompt to extract persona, pain points, and generate
 * strategy proposals in a single AI call. Enables skipping the manual
 * persona/pain-point wizard steps when the user already typed a detailed prompt.
 *
 * POST /api/pipelines/analyze-prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OPENAI_MODEL } from '@/lib/ai/config';
import { BUSINESS_PERSONAS } from '@/lib/pipelines/business-personas';
import { PAIN_POINTS } from '@/lib/pipelines/pain-points';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Build reference catalog for the system prompt
const PERSONA_CATALOG = BUSINESS_PERSONAS.map(
  (p) => `- id: "${p.id}", titleDE: "${p.titleDE}", description: "${p.descriptionDE}"`
).join('\n');

const PAIN_POINT_CATALOG = PAIN_POINTS.map(
  (pp) => `- id: "${pp.id}", titleDE: "${pp.titleDE}", personas: [${pp.applicablePersonas.join(', ')}]`
).join('\n');

const ANALYZE_SYSTEM_PROMPT = `Du bist ein KI-Automatisierungsberater. Deine Aufgabe: Analysiere eine Nutzer-Anfrage und extrahiere daraus die passende Branche, Herausforderungen und Lösungsstrategien.

VERFÜGBARE BRANCHEN (personaId):
${PERSONA_CATALOG}

VERFÜGBARE HERAUSFORDERUNGEN (painPointId):
${PAIN_POINT_CATALOG}

AUFGABE:
1. Ordne die Anfrage der am besten passenden Branche zu (personaId). Verwende "custom" wenn keine passt.
2. Wähle 1-3 passende Herausforderungen aus der Liste (painPointIds).
3. Erstelle 2-3 konkrete Automatisierungsstrategien.
4. Schreibe eine kurze Zusammenfassung was du verstanden hast (deutsch).
5. Gib eine Konfidenz an (0.0-1.0) wie gut du die Anfrage verstanden hast.

Jede Strategie muss enthalten:
- name: Klarer Name (deutsch)
- description: 2-3 Sätze (deutsch)
- nodeCount: Geschätzte Workflow-Schritte (5-15)
- complexity: "simple" | "medium" | "advanced"
- integrations: Liste der Tools (z.B. "HubSpot", "Slack", "E-Mail", "Webhook")
- estimatedSetupMinutes: Einrichtungszeit in Minuten (5-30)

REGELN:
- Verwende NUR personaIds und painPointIds aus den Listen oben
- Die erste Strategie sollte die einfachste sein ("Quick Win")
- Setze confidence < 0.4 wenn die Anfrage zu vage oder zu kurz ist
- Antworte NUR mit validem JSON

OUTPUT FORMAT:
{
  "personaId": "...",
  "painPointIds": ["...", "..."],
  "strategies": [...],
  "summary": "Kurze deutsche Zusammenfassung",
  "confidence": 0.85
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
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log(`[ANALYZE_PROMPT] Analyzing prompt: "${prompt.substring(0, 80)}..."`);

    const model = process.env.OPENAI_MODEL || OPENAI_MODEL;
    const maxTokensKey =
      model.includes('gpt-5') || model.includes('gpt-4o')
        ? 'max_completion_tokens'
        : 'max_tokens';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
        { role: 'user', content: `Analysiere diese Anfrage:\n\n"${prompt.trim()}"` },
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

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[ANALYZE_PROMPT] Failed to parse AI response:', content);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 422 }
      );
    }

    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    // Low confidence → signal fallback
    if (confidence < 0.4) {
      console.log(`[ANALYZE_PROMPT] Low confidence (${confidence}), signaling fallback`);
      return NextResponse.json({
        success: true,
        fallback: true,
        confidence,
      });
    }

    // Validate personaId
    const validPersonaIds = BUSINESS_PERSONAS.map((p) => p.id);
    const personaId = validPersonaIds.includes(parsed.personaId) ? parsed.personaId : 'custom';

    // Validate painPointIds
    const validPainPointIds = PAIN_POINTS.map((pp) => pp.id);
    const painPointIds = Array.isArray(parsed.painPointIds)
      ? parsed.painPointIds.filter((id: string) => validPainPointIds.includes(id))
      : [];

    // Validate and normalize strategies
    const strategies = Array.isArray(parsed.strategies)
      ? parsed.strategies.slice(0, 3).map((s: any) => ({
          name: s.name || 'Unbenannte Strategie',
          description: s.description || '',
          nodeCount: Math.max(3, Math.min(20, s.nodeCount || 5)),
          complexity: ['simple', 'medium', 'advanced'].includes(s.complexity)
            ? s.complexity
            : 'medium',
          integrations: Array.isArray(s.integrations) ? s.integrations : [],
          estimatedSetupMinutes: Math.max(5, Math.min(60, s.estimatedSetupMinutes || 10)),
        }))
      : [];

    if (strategies.length === 0) {
      return NextResponse.json({
        success: true,
        fallback: true,
        confidence: 0.3,
      });
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';

    console.log(
      `[ANALYZE_PROMPT] Success: persona=${personaId}, painPoints=${painPointIds.length}, strategies=${strategies.length}, confidence=${confidence}`
    );

    return NextResponse.json({
      success: true,
      fallback: false,
      personaId,
      painPointIds,
      strategies,
      summary,
      confidence,
    });
  } catch (error: any) {
    console.error('[ANALYZE_PROMPT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze prompt', message: error.message },
      { status: 500 }
    );
  }
}
