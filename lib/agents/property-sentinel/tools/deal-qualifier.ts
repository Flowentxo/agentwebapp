/**
 * Deal Qualifier Tool
 *
 * KI-gesteuerte Bewertung von Listings via OpenAI.
 * Scores listings on 4 categories (25 pts each), detects red flags,
 * and estimates yield / Nebenkosten.
 */

import { getDb } from '@/lib/db/connection';
import {
  sentinelSearchProfiles,
  sentinelSeenListings,
  type LocationFilter,
  type ScoreBreakdown,
} from '@/lib/db/schema-sentinel';
import { eq, and, inArray } from 'drizzle-orm';
import { SCORING_CONFIG, GRUNDERWERBSTEUER } from '../config';

// ── Types ─────────────────────────────────────────────────────

export interface DealQualifierInput {
  listing_ids: string[];
  profile_id: string;
}

export interface ListingEvaluation {
  listing_id: string;
  title: string;
  portal: string;
  score: number;
  breakdown: ScoreBreakdown;
  yield_estimate: number;
  kaufpreisfaktor: number;
  risk_flags: string[];
  summary: string;
  nebenkosten_estimate: {
    grunderwerbsteuer_pct: number;
    notar_pct: number;
    makler_pct: number;
    grundbuch_pct: number;
    total_pct: number;
    total_eur: number;
  };
}

export interface QualificationSummary {
  total_evaluated: number;
  avg_score: number;
  top_deal: { listing_id: string; title: string; score: number } | null;
  qualified_count: number;
  risk_flag_distribution: Record<string, number>;
}

export interface DealQualifierResult {
  evaluations: ListingEvaluation[];
  summary: QualificationSummary;
  formatted_output: string;
}

export const DEAL_QUALIFIER_TOOL = {
  name: 'deal_qualifier',
  description: 'Bewertet ein oder mehrere Immobilien-Inserate anhand der Suchkriterien des Nutzers mittels KI-Scoring. Gibt einen Score (0-100), Rendite-Schaetzung und Risiko-Flags zurueck.',
  input_schema: {
    type: 'object',
    properties: {
      listing_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'UUIDs der zu bewertenden Listings aus sentinel_seen_listings.',
        maxItems: 10,
      },
      profile_id: {
        type: 'string',
        description: 'UUID des Suchprofils (fuer Kriterien-Kontext bei der Bewertung).',
      },
    },
    required: ['listing_ids', 'profile_id'],
  },
};

// ── Scoring System Prompt ─────────────────────────────────────

const DEAL_QUALIFIER_SYSTEM_PROMPT = `Du bist ein erfahrener Immobilien-Investment-Analyst. Bewerte die folgenden Inserate anhand der Suchkriterien des Nutzers.

BEWERTUNGSSYSTEM (0-100 Punkte):

1. LAGE-MATCH (0-25): Passt die Lage zu den Suchkriterien? Mikrolage-Qualitaet, Infrastruktur, Anbindung.
2. PREIS-LEISTUNG (0-25): Preis pro qm vs. Durchschnitt der Lage, Zustand beruecksichtigen.
3. RENDITE-POTENZIAL (0-25): Bruttomietrendite, Kaufpreisfaktor, Wertsteigerungspotenzial.
4. RISIKO-BEWERTUNG (0-25): 25 = geringes Risiko. Abzuege fuer: Sanierungsbedarf, Rechtsrisiken, Marktrisiken.

RISIKO-FLAGS (falls zutreffend):
- erbpacht: Erbbaurecht vorhanden
- sanierungsstau: Erheblicher Sanierungsbedarf
- denkmalschutz: Denkmalschutz-Auflagen
- wohnrecht: Niessbrauch/Wohnrecht eingetragen
- altlasten: Bodenkontamination
- schimmel: Schimmel-/Feuchtigkeitsschaeden
- laerm: Erhoehte Laermbelastung
- ueberschwemmung: Hochwassergebiet

ANTWORT-FORMAT (JSON):
{
  "evaluations": [
    {
      "listing_index": 0,
      "score": 75,
      "breakdown": { "location": 20, "value": 18, "yield": 22, "risk": 15 },
      "yield_estimate": 5.2,
      "kaufpreisfaktor": 19.2,
      "risk_flags": ["sanierungsstau"],
      "summary": "Solides Investment mit gutem Renditepotenzial..."
    }
  ]
}

Antworte AUSSCHLIESSLICH mit validem JSON. Keine Erklaerungen ausserhalb des JSON.`;

// ── Executor ──────────────────────────────────────────────────

export async function executeDealQualifier(
  input: DealQualifierInput,
  context: { userId: string },
): Promise<DealQualifierResult> {
  const { listing_ids, profile_id } = input;
  const { userId } = context;
  const db = getDb();

  // Load profile
  const [profile] = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(eq(sentinelSearchProfiles.id, profile_id), eq(sentinelSearchProfiles.userId, userId)));

  if (!profile) {
    return emptyResult(`Suchprofil ${profile_id} nicht gefunden.`);
  }

  // Load listings
  const listings = await db
    .select()
    .from(sentinelSeenListings)
    .where(and(
      inArray(sentinelSeenListings.id, listing_ids),
      eq(sentinelSeenListings.profileId, profile_id),
    ));

  if (listings.length === 0) {
    return emptyResult('Keine Listings gefunden fuer die angegebenen IDs.');
  }

  // Batch processing (max 5 per OpenAI call)
  const BATCH_SIZE = SCORING_CONFIG.categories ? 5 : 5;
  const evaluations: ListingEvaluation[] = [];
  const skippedCount = 0;

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);

    // Build user prompt
    const location = profile.location as LocationFilter;
    const criteriaContext = [
      `Suchkriterien:`,
      `  Stadt: ${location.city}`,
      `  Bundesland: ${location.state || 'unbekannt'}`,
      `  Objekttyp: ${profile.propertyType}`,
      `  Kauf/Miete: ${profile.purchaseType}`,
      `  Preis: ${profile.priceMin || '—'} – ${profile.priceMax || '—'} EUR`,
      `  Flaeche: ${profile.areaMin || '—'} – ${profile.areaMax || '—'} m²`,
      `  Zimmer: ab ${profile.roomsMin || '1'}`,
      `  Mindest-Rendite: ${profile.yieldMin || '—'}%`,
    ].join('\n');

    const listingsContext = batch.map((listing, idx) => {
      const detail = listing.detailData as Record<string, any> | null;
      return [
        `--- Inserat ${idx + 1} ---`,
        `Titel: ${listing.title || 'Unbekannt'}`,
        `Portal: ${listing.portal}`,
        `Preis: ${listing.price ? listing.price.toLocaleString('de-DE') + ' EUR' : 'k.A.'}`,
        `Flaeche: ${listing.areaSqm || 'k.A.'} m²`,
        `Zimmer: ${listing.rooms || 'k.A.'}`,
        `Adresse: ${listing.addressRaw || 'unbekannt'}`,
        `URL: ${listing.listingUrl}`,
        detail ? `Detail-Daten: ${JSON.stringify(detail, null, 2)}` : 'Detail-Daten: nicht vorhanden',
      ].join('\n');
    }).join('\n\n');

    const userMessage = `${criteriaContext}\n\n${listingsContext}`;

    try {
      // Dynamic import to avoid circular dependencies
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      const model = SCORING_CONFIG.scoringModel;
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: DEAL_QUALIFIER_SYSTEM_PROMPT },
          { role: 'user', content: `Bewerte die folgenden ${batch.length} Inserate:\n\n${userMessage}` },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 4000,
      });

      const responseText = response.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        console.error('[DEAL_QUALIFIER] Failed to parse OpenAI response:', responseText.substring(0, 200));
        parsed = { evaluations: [] };
      }

      const batchEvals = Array.isArray(parsed.evaluations) ? parsed.evaluations : [parsed];

      for (let j = 0; j < batch.length; j++) {
        const listing = batch[j];
        const ev = batchEvals[j] || {
          score: 0,
          breakdown: { location: 0, value: 0, yield: 0, risk: 0 },
          summary: 'Bewertung fehlgeschlagen',
        };

        const score = clamp(ev.score || 0, 0, 100);
        const breakdown: ScoreBreakdown = {
          location: clamp(ev.breakdown?.location || 0, 0, 25),
          value: clamp(ev.breakdown?.value || 0, 0, 25),
          yield: clamp(ev.breakdown?.yield || 0, 0, 25),
          risk: clamp(ev.breakdown?.risk || 0, 0, 25),
        };

        const nebenkosten = calculateNebenkosten(
          listing.price || 0,
          (profile.location as LocationFilter).state,
        );

        const evaluation: ListingEvaluation = {
          listing_id: listing.id,
          title: listing.title || 'Ohne Titel',
          portal: listing.portal,
          score,
          breakdown,
          yield_estimate: ev.yield_estimate || 0,
          kaufpreisfaktor: ev.kaufpreisfaktor || 0,
          risk_flags: Array.isArray(ev.risk_flags) ? ev.risk_flags : [],
          summary: ev.summary || '',
          nebenkosten_estimate: nebenkosten,
        };

        evaluations.push(evaluation);

        // Update listing in DB
        try {
          await db
            .update(sentinelSeenListings)
            .set({
              aiScored: true,
              aiScore: score,
              aiScoreBreakdown: breakdown,
              aiYieldEst: String(ev.yield_estimate || 0),
              aiRiskFlags: evaluation.risk_flags,
              aiSummary: ev.summary || '',
              aiScoredAt: new Date(),
            })
            .where(eq(sentinelSeenListings.id, listing.id));
        } catch (err: any) {
          console.error(`[DEAL_QUALIFIER] DB update failed for ${listing.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('[DEAL_QUALIFIER] OpenAI call failed:', err.message);
      // Fill with zero scores for failed batch
      for (const listing of batch) {
        evaluations.push({
          listing_id: listing.id,
          title: listing.title || 'Ohne Titel',
          portal: listing.portal,
          score: 0,
          breakdown: { location: 0, value: 0, yield: 0, risk: 0 },
          yield_estimate: 0,
          kaufpreisfaktor: 0,
          risk_flags: [],
          summary: `Bewertung fehlgeschlagen: ${err.message}`,
          nebenkosten_estimate: calculateNebenkosten(listing.price || 0, (profile.location as LocationFilter).state),
        });
      }
    }
  }

  // Build summary
  const scoredEvals = evaluations.filter(e => e.score > 0);
  const avgScore = scoredEvals.length > 0
    ? scoredEvals.reduce((s, e) => s + e.score, 0) / scoredEvals.length
    : 0;
  const sorted = [...evaluations].sort((a, b) => b.score - a.score);
  const topDeal = sorted[0] && sorted[0].score > 0
    ? { listing_id: sorted[0].listing_id, title: sorted[0].title, score: sorted[0].score }
    : null;
  const qualifiedCount = evaluations.filter(e => e.score >= profile.minScore).length;

  const riskFlagDist: Record<string, number> = {};
  evaluations.forEach(e =>
    e.risk_flags.forEach(f => {
      riskFlagDist[f] = (riskFlagDist[f] || 0) + 1;
    }),
  );

  const summary: QualificationSummary = {
    total_evaluated: evaluations.length,
    avg_score: Math.round(avgScore * 10) / 10,
    top_deal: topDeal,
    qualified_count: qualifiedCount,
    risk_flag_distribution: riskFlagDist,
  };

  // Format output
  const lines = [
    `KI-Bewertung: ${evaluations.length} Inserate bewertet`,
    `════════════════════════════════════`,
    ``,
    `Durchschnitt: ${summary.avg_score}/100 | Qualifiziert (>=${profile.minScore}): ${qualifiedCount}/${evaluations.length}`,
  ];

  if (topDeal) {
    lines.push(`Top Deal: ${topDeal.title} (Score: ${topDeal.score})`);
  }

  lines.push(``);

  for (const ev of sorted) {
    const scoreIcon = ev.score >= 70 ? '[**]' : ev.score >= profile.minScore ? '[* ]' : '[  ]';
    const yieldStr = ev.yield_estimate > 0 ? `${ev.yield_estimate.toFixed(1)}%` : 'k.A.';
    const flagStr = ev.risk_flags.length > 0 ? ev.risk_flags.join(', ') : '—';
    lines.push(`${scoreIcon} ${ev.title}`);
    lines.push(`     Score: ${ev.score} | Rendite: ${yieldStr} | Risiko: ${flagStr}`);
    if (ev.summary) {
      lines.push(`     ${ev.summary.substring(0, 120)}`);
    }
    lines.push(``);
  }

  if (skippedCount > 0) {
    lines.push(`Hinweis: ${skippedCount} Listings ohne Detail-Daten uebersprungen.`);
  }

  if (Object.keys(riskFlagDist).length > 0) {
    const flagSummary = Object.entries(riskFlagDist)
      .map(([flag, count]) => `${flag} (${count}x)`)
      .join(', ');
    lines.push(`Risiko-Flags: ${flagSummary}`);
  }

  lines.push(``);
  lines.push(`Nutze "pipeline_sync" um qualifizierte Deals in die Pipeline zu uebernehmen.`);

  return {
    evaluations,
    summary,
    formatted_output: lines.join('\n'),
  };
}

// ── Helpers ───────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateNebenkosten(
  price: number,
  state?: string,
): ListingEvaluation['nebenkosten_estimate'] {
  const grunderwerbsteuerPct = GRUNDERWERBSTEUER[state || 'BE'] || 6.0;
  const notarPct = 1.5;
  const maklerPct = 3.57;
  const grundbuchPct = 0.5;
  const totalPct = grunderwerbsteuerPct + notarPct + maklerPct + grundbuchPct;

  return {
    grunderwerbsteuer_pct: grunderwerbsteuerPct,
    notar_pct: notarPct,
    makler_pct: maklerPct,
    grundbuch_pct: grundbuchPct,
    total_pct: Math.round(totalPct * 100) / 100,
    total_eur: Math.round(price * totalPct / 100),
  };
}

function emptyResult(message: string): DealQualifierResult {
  return {
    evaluations: [],
    summary: {
      total_evaluated: 0,
      avg_score: 0,
      top_deal: null,
      qualified_count: 0,
      risk_flag_distribution: {},
    },
    formatted_output: message,
  };
}
