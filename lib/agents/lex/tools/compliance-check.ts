/**
 * Compliance Check Tool
 *
 * AI-powered compliance checking using OpenAI.
 * Checks text against specified German/EU regulations.
 */

import OpenAI from 'openai';

export interface ComplianceCheckInput {
  text: string;
  regulations: Array<'dsgvo' | 'agb_recht' | 'arbeitsrecht' | 'handelsrecht' | 'it_sicherheit'>;
  context?: string;
}

export interface ComplianceIssue {
  regulation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  score: number;
  issues: ComplianceIssue[];
  formatted_output: string;
}

const REGULATION_LABELS: Record<string, string> = {
  dsgvo: 'DSGVO (Datenschutz-Grundverordnung)',
  agb_recht: 'AGB-Recht (§§ 305-310 BGB)',
  arbeitsrecht: 'Arbeitsrecht',
  handelsrecht: 'Handelsrecht (HGB)',
  it_sicherheit: 'IT-Sicherheit (BSI / NIS2)',
};

export const COMPLIANCE_CHECK_TOOL = {
  name: 'compliance_check',
  description: 'Pruefe Texte auf Compliance mit deutschen/EU-Vorschriften: DSGVO, AGB-Recht, Arbeitsrecht, Handelsrecht, IT-Sicherheit. Gibt strukturierte Bewertung mit Empfehlungen.',
  input_schema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Der zu pruefende Text (z.B. AGB, Datenschutzerklaerung, Vertrag)',
      },
      regulations: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['dsgvo', 'agb_recht', 'arbeitsrecht', 'handelsrecht', 'it_sicherheit'],
        },
        description: 'Gegen welche Vorschriften geprueft werden soll',
      },
      context: {
        type: 'string',
        description: 'Optionaler Kontext (z.B. "Online-Shop", "B2B-Dienstleistung", "Personalverwaltung")',
      },
    },
    required: ['text', 'regulations'],
  },
};

export async function checkCompliance(input: ComplianceCheckInput): Promise<ComplianceCheckResult> {
  const { text, regulations, context = '' } = input;
  const regulationLabels = regulations.map(r => REGULATION_LABELS[r] || r).join(', ');

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
          content: `Du bist ein Compliance-Experte fuer deutsches und EU-Recht.
Pruefe den gegebenen Text auf Konformitaet mit folgenden Vorschriften: ${regulationLabels}.

Bewerte systematisch:
1. Identifiziere konkrete Verstoesse oder fehlende Elemente
2. Bewerte den Schweregrad jedes Problems
3. Gib konkrete Handlungsempfehlungen
4. Vergib einen Compliance-Score (0-100)

Antworte NUR als JSON:
{
  "compliant": <true/false>,
  "score": <0-100>,
  "issues": [
    {
      "regulation": "<Name der Vorschrift>",
      "severity": "<low|medium|high|critical>",
      "description": "<Beschreibung des Problems>",
      "recommendation": "<Konkrete Empfehlung>"
    }
  ]
}

Sprache: Deutsch.`,
        },
        {
          role: 'user',
          content: `Pruefe diesen Text auf Compliance${context ? ` (Kontext: ${context})` : ''}:\n\n---\n${text}\n---`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const compliant = parsed.compliant ?? false;
    const score = Math.min(100, Math.max(0, parsed.score ?? 0));
    const issues: ComplianceIssue[] = (parsed.issues || []).map((i: any) => ({
      regulation: i.regulation || 'Unbekannt',
      severity: i.severity || 'medium',
      description: i.description || '',
      recommendation: i.recommendation || '',
    }));

    const scoreEmoji = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴';
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    const formatted = [
      `${scoreEmoji} **Compliance-Pruefung** (Score: ${score}/100)`,
      '',
      `**Vorschriften:** ${regulationLabels}`,
      `**Status:** ${compliant ? '✅ Konform' : '❌ Nicht konform'}`,
      '',
      '**Problemverteilung:**',
      `- 🔴 Kritisch: ${criticalCount}`,
      `- 🟠 Hoch: ${highCount}`,
      `- 🟡 Mittel: ${mediumCount}`,
      `- 🟢 Niedrig: ${lowCount}`,
      '',
      ...(issues.length > 0 ? [
        '**Gefundene Probleme:**',
        '',
        ...issues.map((issue, idx) => {
          const severityIcon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢';
          return [
            `${idx + 1}. ${severityIcon} **${issue.regulation}** [${issue.severity.toUpperCase()}]`,
            `   Problem: ${issue.description}`,
            `   Empfehlung: ${issue.recommendation}`,
            '',
          ].join('\n');
        }),
      ] : ['✅ Keine Probleme gefunden.', '']),
      '---',
      '*Hinweis: Dies ist eine automatische Compliance-Pruefung. Eine professionelle Rechtsberatung wird empfohlen.*',
    ].join('\n');

    return {
      compliant,
      score,
      issues,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      compliant: false,
      score: 0,
      issues: [],
      formatted_output: `❌ Compliance-Pruefung fehlgeschlagen: ${error.message}`,
    };
  }
}
