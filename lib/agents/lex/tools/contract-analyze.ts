/**
 * Contract Analyze Tool
 *
 * Static analysis of contract text: identifies clauses, parties, dates,
 * obligations, and risk areas using pattern-based analysis.
 */

import { DocumentParserService } from '@/server/services/DocumentParserService';

export interface ContractAnalyzeInput {
  document_text: string;
  document_type?: string;
  focus?: 'clauses' | 'risks' | 'obligations' | 'all';
}

export interface ContractClause {
  title: string;
  content: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ContractAnalyzeResult {
  parties: string[];
  clauses: ContractClause[];
  key_dates: string[];
  obligations: string[];
  formatted_output: string;
}

export const CONTRACT_ANALYZE_TOOL = {
  name: 'contract_analyze',
  description: 'Analysiere Vertragstexte statisch: Identifiziere Klauseln, Parteien, Termine, Pflichten und Risikobereiche. Unterstuetzt PDF/DOCX-Parsing ueber DocumentParserService.',
  input_schema: {
    type: 'object',
    properties: {
      document_text: {
        type: 'string',
        description: 'Der zu analysierende Vertragstext',
      },
      document_type: {
        type: 'string',
        description: 'Art des Dokuments (z.B. "Arbeitsvertrag", "NDA", "Mietvertrag", "Kaufvertrag")',
      },
      focus: {
        type: 'string',
        enum: ['clauses', 'risks', 'obligations', 'all'],
        description: 'Analysefokus (default: all)',
      },
    },
    required: ['document_text'],
  },
};

// Common German legal clause patterns
const CLAUSE_PATTERNS: Array<{ pattern: RegExp; title: string; risk_level: ContractClause['risk_level'] }> = [
  { pattern: /K[uü]ndigungsfrist[\s:]*([^\n.]+)/gi, title: 'Kuendigungsfrist', risk_level: 'medium' },
  { pattern: /Haftung[\s:]*([^\n.]+)/gi, title: 'Haftung', risk_level: 'high' },
  { pattern: /Vertraulichkeit[\s:]*([^\n.]+)/gi, title: 'Vertraulichkeit', risk_level: 'medium' },
  { pattern: /Laufzeit[\s:]*([^\n.]+)/gi, title: 'Laufzeit', risk_level: 'low' },
  { pattern: /Vertragsstrafe[\s:]*([^\n.]+)/gi, title: 'Vertragsstrafe', risk_level: 'high' },
  { pattern: /Gerichtsstand[\s:]*([^\n.]+)/gi, title: 'Gerichtsstand', risk_level: 'low' },
  { pattern: /Wettbewerbsverbot[\s:]*([^\n.]+)/gi, title: 'Wettbewerbsverbot', risk_level: 'high' },
  { pattern: /Gew[aä]hrleistung[\s:]*([^\n.]+)/gi, title: 'Gewaehrleistung', risk_level: 'medium' },
  { pattern: /Schadensersatz[\s:]*([^\n.]+)/gi, title: 'Schadensersatz', risk_level: 'high' },
  { pattern: /Datenschutz[\s:]*([^\n.]+)/gi, title: 'Datenschutz', risk_level: 'medium' },
  { pattern: /Verg[uü]tung[\s:]*([^\n.]+)/gi, title: 'Verguetung', risk_level: 'medium' },
  { pattern: /Zahlung(?:sbedingungen)?[\s:]*([^\n.]+)/gi, title: 'Zahlungsbedingungen', risk_level: 'medium' },
  { pattern: /Salvatorische\s+Klausel[\s:]*([^\n.]+)/gi, title: 'Salvatorische Klausel', risk_level: 'low' },
  { pattern: /Schriftform(?:erfordernis)?[\s:]*([^\n.]+)/gi, title: 'Schriftformerfordernis', risk_level: 'low' },
  { pattern: /[Üu]bergang\s+(?:von\s+)?(?:Rechten|Pflichten)[\s:]*([^\n.]+)/gi, title: 'Rechte-/Pflichtuebergang', risk_level: 'high' },
  { pattern: /Nutzungsrechte?[\s:]*([^\n.]+)/gi, title: 'Nutzungsrechte', risk_level: 'medium' },
  { pattern: /Geheimhaltung[\s:]*([^\n.]+)/gi, title: 'Geheimhaltung', risk_level: 'medium' },
  { pattern: /H[oö]here\s+Gewalt|Force\s+Majeure[\s:]*([^\n.]+)/gi, title: 'Hoehere Gewalt', risk_level: 'medium' },
];

// Date patterns in German format
const DATE_PATTERNS = [
  /\d{1,2}\.\s?\d{1,2}\.\s?\d{4}/g,          // DD.MM.YYYY
  /\d{1,2}\.\s?(?:Januar|Februar|M[aä]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}/gi,
  /(?:zum|ab|bis|per|am)\s+\d{1,2}\.\s?\d{1,2}\.\s?\d{4}/gi,
];

// Obligation patterns
const OBLIGATION_PATTERNS = [
  /(?:ist\s+verpflichtet|verpflichtet\s+sich|hat\s+(?:die\s+)?Pflicht|muss|soll|schuldet)[\s,]*([^.]+)/gi,
  /(?:Der\s+(?:Auftragnehmer|Arbeitnehmer|Mieter|K[aä]ufer|Verk[aä]ufer|Vertragspartner))[\s,]*(?:ist\s+verpflichtet|verpflichtet\s+sich|hat|muss)[\s,]*([^.]+)/gi,
];

// Party identification patterns
const PARTY_PATTERNS = [
  /(?:zwischen|Vertragspartner|Auftraggeber|Auftragnehmer|Arbeitgeber|Arbeitnehmer|Vermieter|Mieter|K[aä]ufer|Verk[aä]ufer)[\s:]*(?:die\s+)?([A-Z][^\n,()]+(?:GmbH|AG|e\.K\.|KG|OHG|UG|Ltd\.|Inc\.|SE)?)/gi,
  /(?:Firma|Herr|Frau|vertreten\s+durch)\s+([A-Z][^\n,()]+)/gi,
];

export async function analyzeContract(input: ContractAnalyzeInput): Promise<ContractAnalyzeResult> {
  const { document_text, document_type, focus = 'all' } = input;

  const parties: string[] = [];
  const clauses: ContractClause[] = [];
  const keyDates: string[] = [];
  const obligations: string[] = [];

  // --- Party Identification ---
  for (const pattern of PARTY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(document_text)) !== null) {
      const party = match[1]?.trim();
      if (party && party.length > 2 && party.length < 100 && !parties.includes(party)) {
        parties.push(party);
      }
    }
  }

  // --- Clause Detection ---
  if (focus === 'clauses' || focus === 'all') {
    for (const clausePattern of CLAUSE_PATTERNS) {
      const regex = new RegExp(clausePattern.pattern.source, clausePattern.pattern.flags);
      let match;
      while ((match = regex.exec(document_text)) !== null) {
        const content = match[1]?.trim() || match[0]?.trim();
        if (content && content.length > 5) {
          // Avoid duplicates
          if (!clauses.find(c => c.title === clausePattern.title && c.content === content)) {
            clauses.push({
              title: clausePattern.title,
              content: content.substring(0, 300),
              risk_level: clausePattern.risk_level,
            });
          }
        }
      }
    }

    // Section-based clause detection (numbered sections: "1.", "2.", "§ 1", etc.)
    const sectionRegex = /(?:(?:§\s*\d+)|(?:\d+\.))\s*([A-Z][^\n]+)\n([^§]*?)(?=(?:§\s*\d+|\d+\.)\s*[A-Z]|$)/g;
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(document_text)) !== null) {
      const title = sectionMatch[1]?.trim();
      const content = sectionMatch[2]?.trim();
      if (title && content && !clauses.find(c => c.title === title)) {
        // Assess risk based on keywords
        let risk: ContractClause['risk_level'] = 'low';
        const highRiskWords = ['haftung', 'strafe', 'schadensersatz', 'wettbewerbsverbot', 'kuendigung'];
        const mediumRiskWords = ['vertraulichkeit', 'geheimhaltung', 'datenschutz', 'verguetung', 'zahlung'];
        const titleLower = title.toLowerCase();
        if (highRiskWords.some(w => titleLower.includes(w))) risk = 'high';
        else if (mediumRiskWords.some(w => titleLower.includes(w))) risk = 'medium';

        clauses.push({
          title,
          content: content.substring(0, 300),
          risk_level: risk,
        });
      }
    }
  }

  // --- Date Extraction ---
  if (focus === 'clauses' || focus === 'all') {
    for (const datePattern of DATE_PATTERNS) {
      const regex = new RegExp(datePattern.source, datePattern.flags);
      let match;
      while ((match = regex.exec(document_text)) !== null) {
        const date = match[0]?.trim();
        if (date && !keyDates.includes(date)) {
          keyDates.push(date);
        }
      }
    }
  }

  // --- Obligation Detection ---
  if (focus === 'obligations' || focus === 'all') {
    for (const obligationPattern of OBLIGATION_PATTERNS) {
      const regex = new RegExp(obligationPattern.source, obligationPattern.flags);
      let match;
      while ((match = regex.exec(document_text)) !== null) {
        const obligation = match[0]?.trim();
        if (obligation && obligation.length > 10 && obligation.length < 500) {
          obligations.push(obligation.substring(0, 300));
        }
      }
    }
  }

  // --- Risk Summary ---
  const highRiskClauses = clauses.filter(c => c.risk_level === 'high');
  const mediumRiskClauses = clauses.filter(c => c.risk_level === 'medium');
  const lowRiskClauses = clauses.filter(c => c.risk_level === 'low');

  const riskEmoji = highRiskClauses.length > 0 ? '🔴' : mediumRiskClauses.length > 0 ? '🟡' : '🟢';

  const formatted = [
    `${riskEmoji} **Vertragsanalyse** ${document_type ? `(${document_type})` : ''}`,
    '',
    `**Dokumentlaenge:** ${document_text.length} Zeichen, ~${document_text.split(/\s+/).length} Woerter`,
    '',
    // Parties
    ...(parties.length > 0 ? [
      '**Vertragsparteien:**',
      ...parties.map(p => `- ${p}`),
      '',
    ] : ['**Vertragsparteien:** Keine automatisch erkannt', '']),
    // Clauses
    ...(clauses.length > 0 ? [
      `**Erkannte Klauseln:** (${clauses.length})`,
      ...clauses.map(c => {
        const riskIcon = c.risk_level === 'high' ? '🔴' : c.risk_level === 'medium' ? '🟡' : '🟢';
        return `- ${riskIcon} **${c.title}** [${c.risk_level.toUpperCase()}]: ${c.content.substring(0, 100)}...`;
      }),
      '',
    ] : []),
    // Risk Summary
    '**Risiko-Zusammenfassung:**',
    `- 🔴 Hohes Risiko: ${highRiskClauses.length} Klauseln`,
    `- 🟡 Mittleres Risiko: ${mediumRiskClauses.length} Klauseln`,
    `- 🟢 Niedriges Risiko: ${lowRiskClauses.length} Klauseln`,
    '',
    // Key Dates
    ...(keyDates.length > 0 ? [
      '**Wichtige Termine:**',
      ...keyDates.map(d => `- ${d}`),
      '',
    ] : []),
    // Obligations
    ...(obligations.length > 0 ? [
      '**Pflichten/Verpflichtungen:**',
      ...obligations.slice(0, 10).map(o => `- ${o}`),
      '',
    ] : []),
    '---',
    '*Hinweis: Dies ist eine automatische Analyse. Lassen Sie den Vertrag von einem Anwalt pruefen.*',
  ].join('\n');

  return {
    parties,
    clauses,
    key_dates: keyDates,
    obligations,
    formatted_output: formatted,
  };
}
