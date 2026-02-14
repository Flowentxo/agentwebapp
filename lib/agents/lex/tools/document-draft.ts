/**
 * Document Draft Tool
 *
 * AI-powered legal document generation using OpenAI.
 * Generates draft legal documents based on type, parties, and key terms.
 */

import OpenAI from 'openai';

export interface DocumentDraftInput {
  document_type: 'nda' | 'contract' | 'agb' | 'privacy_policy' | 'employment' | 'freelancer';
  parties: string[];
  key_terms?: string;
  language?: string;
}

export interface DocumentDraftResult {
  document: string;
  sections: string[];
  disclaimer: string;
  formatted_output: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  nda: 'Geheimhaltungsvereinbarung (NDA)',
  contract: 'Allgemeiner Vertrag',
  agb: 'Allgemeine Geschaeftsbedingungen (AGB)',
  privacy_policy: 'Datenschutzerklaerung',
  employment: 'Arbeitsvertrag',
  freelancer: 'Freelancer-Vertrag / Werkvertrag',
};

export const DOCUMENT_DRAFT_TOOL = {
  name: 'document_draft',
  description: 'Erstelle rechtliche Dokumententwuerfe: NDA, Vertraege, AGB, Datenschutzerklaerungen, Arbeitsvertraege und Freelancer-Vertraege. AI-gestuetzte Generierung mit branchenueblichen Klauseln.',
  input_schema: {
    type: 'object',
    properties: {
      document_type: {
        type: 'string',
        enum: ['nda', 'contract', 'agb', 'privacy_policy', 'employment', 'freelancer'],
        description: 'Art des Dokuments',
      },
      parties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Vertragsparteien (z.B. ["Firma A GmbH", "Firma B AG"])',
      },
      key_terms: {
        type: 'string',
        description: 'Wichtige Vertragsbedingungen und spezifische Anforderungen (optional)',
      },
      language: {
        type: 'string',
        description: 'Sprache des Dokuments (default: "deutsch")',
      },
    },
    required: ['document_type', 'parties'],
  },
};

const DISCLAIMER = 'Dies ist ein Entwurf und keine Rechtsberatung. Lassen Sie das Dokument von einem Anwalt pruefen.';

export async function draftDocument(input: DocumentDraftInput): Promise<DocumentDraftResult> {
  const { document_type, parties, key_terms = '', language = 'deutsch' } = input;
  const docLabel = DOCUMENT_TYPE_LABELS[document_type] || document_type;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const partiesText = parties.map((p, i) => `Partei ${i + 1}: ${p}`).join('\n');

    const response = await openai.chat.completions.create({
      model,
      ...(model.includes('gpt-5') ? {} : { temperature: 0.3 }),
      ...(model.includes('gpt-5') || model.includes('gpt-4o')
        ? { max_completion_tokens: 3000 }
        : { max_tokens: 3000 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein erfahrener Rechtsanwalt und erstellst rechtliche Dokumententwuerfe.
Erstelle ein professionelles ${docLabel} auf ${language}.

Anforderungen:
- Professionelle juristische Sprache
- Branchenuebliche Klauseln
- Nummerierte Paragraphen/Abschnitte
- Platzhalter fuer spezifische Angaben in [eckigen Klammern]
- Schlussklauseln (Salvatorische Klausel, Gerichtsstand, Schriftform)

Antworte NUR als JSON:
{
  "document": "<Vollstaendiger Dokumenttext mit Formatierung>",
  "sections": ["<Abschnitt 1 Titel>", "<Abschnitt 2 Titel>", ...]
}`,
        },
        {
          role: 'user',
          content: `Erstelle ein ${docLabel}.

Parteien:
${partiesText}

${key_terms ? `Besondere Bedingungen/Anforderungen:\n${key_terms}` : 'Keine besonderen Bedingungen angegeben.'}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    let document = parsed.document || '';
    const sections = parsed.sections || [];

    // Safety net: ensure disclaimer is present in the document body
    const DISCLAIMER_PATTERN = /keine?\s+rechtsberatung|not?\s+legal\s+advice|disclaimer/i;
    if (document && !DISCLAIMER_PATTERN.test(document)) {
      document += '\n\n---\n' + DISCLAIMER;
    }

    const formatted = [
      `**${docLabel}** - Entwurf`,
      '',
      '---',
      '',
      document,
      '',
      '---',
      '',
      ...(sections.length > 0 ? [
        '**Inhaltsverzeichnis:**',
        ...sections.map((s: string, i: number) => `${i + 1}. ${s}`),
        '',
      ] : []),
      `**Disclaimer:** ${DISCLAIMER}`,
    ].join('\n');

    return {
      document,
      sections,
      disclaimer: DISCLAIMER,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      document: '',
      sections: [],
      disclaimer: DISCLAIMER,
      formatted_output: `Dokument-Erstellung fehlgeschlagen: ${error.message}\n\n**Disclaimer:** ${DISCLAIMER}`,
    };
  }
}
