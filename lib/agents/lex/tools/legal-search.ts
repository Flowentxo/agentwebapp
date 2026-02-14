/**
 * Legal Search Tool
 *
 * Semantic search in a built-in legal knowledge base.
 * Keyword matching against common German legal topics.
 */

export interface LegalSearchInput {
  query: string;
  category?: 'vertragsrecht' | 'arbeitsrecht' | 'datenschutz' | 'handelsrecht' | 'strafrecht';
  max_results?: number;
}

export interface LegalSearchResultItem {
  topic: string;
  content: string;
  relevance: number;
}

export interface LegalSearchResult {
  results: LegalSearchResultItem[];
  summary: string;
  formatted_output: string;
}

export const LEGAL_SEARCH_TOOL = {
  name: 'legal_search',
  description: 'Durchsuche die juristische Wissensdatenbank nach deutschen Rechtsthemen. Unterstuetzt Vertragsrecht, Arbeitsrecht, Datenschutz, Handelsrecht und Strafrecht. Gibt relevante Rechtsgrundlagen und Erlaeuterungen zurueck.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Suchanfrage (z.B. "Kuendigungsfrist Arbeitsvertrag", "DSGVO Einwilligung")',
      },
      category: {
        type: 'string',
        enum: ['vertragsrecht', 'arbeitsrecht', 'datenschutz', 'handelsrecht', 'strafrecht'],
        description: 'Rechtsgebiet zur Einschraenkung der Suche (optional)',
      },
      max_results: {
        type: 'number',
        description: 'Maximale Anzahl der Ergebnisse (default: 5, max: 10)',
      },
    },
    required: ['query'],
  },
};

interface KnowledgeEntry {
  topic: string;
  category: string;
  keywords: string[];
  content: string;
}

/**
 * Built-in German legal knowledge base
 */
const LEGAL_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    topic: 'DSGVO - Grundprinzipien',
    category: 'datenschutz',
    keywords: ['dsgvo', 'datenschutz', 'grundverordnung', 'personenbezogene daten', 'gdpr', 'eu verordnung'],
    content: `Die Datenschutz-Grundverordnung (DSGVO/EU 2016/679) regelt die Verarbeitung personenbezogener Daten. Grundprinzipien (Art. 5): Rechtmaessigkeit, Verarbeitung nach Treu und Glauben, Transparenz, Zweckbindung, Datenminimierung, Richtigkeit, Speicherbegrenzung, Integritaet und Vertraulichkeit, Rechenschaftspflicht. Bussgelder: bis 20 Mio. EUR oder 4% des weltweiten Jahresumsatzes.`,
  },
  {
    topic: 'DSGVO - Einwilligung',
    category: 'datenschutz',
    keywords: ['einwilligung', 'consent', 'zustimmung', 'opt-in', 'dsgvo einwilligung', 'datenschutz einwilligung'],
    content: `Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO muss freiwillig, fuer den bestimmten Fall, informiert und unmissverstaendlich sein. Fuer besondere Kategorien (Art. 9) muss sie ausdruecklich erfolgen. Die Einwilligung muss jederzeit widerrufbar sein (Art. 7 Abs. 3). Koppelungsverbot: Die Einwilligung darf nicht an die Erfuellung eines Vertrages gekoppelt werden, wenn die Verarbeitung nicht erforderlich ist.`,
  },
  {
    topic: 'DSGVO - Betroffenenrechte',
    category: 'datenschutz',
    keywords: ['betroffenenrechte', 'auskunft', 'loeschung', 'recht auf vergessen', 'datenportabilitaet', 'widerspruch'],
    content: `Betroffenenrechte der DSGVO: Auskunftsrecht (Art. 15), Recht auf Berichtigung (Art. 16), Recht auf Loeschung/"Recht auf Vergessen" (Art. 17), Recht auf Einschraenkung der Verarbeitung (Art. 18), Recht auf Datenuebertragbarkeit (Art. 20), Widerspruchsrecht (Art. 21). Fristen: Antwort innerhalb eines Monats, Verlaengerung um zwei Monate bei Komplexitaet moeglich.`,
  },
  {
    topic: 'DSGVO - Auftragsverarbeitung',
    category: 'datenschutz',
    keywords: ['auftragsverarbeitung', 'avv', 'auftragsverarbeiter', 'datenverarbeitung', 'unterauftragnehmer', 'art 28'],
    content: `Auftragsverarbeitung (Art. 28 DSGVO): Wenn ein Dritter (Auftragsverarbeiter) personenbezogene Daten im Auftrag verarbeitet, ist ein Auftragsverarbeitungsvertrag (AVV) erforderlich. Pflichtinhalte: Gegenstand, Dauer, Art der Daten, Kategorien Betroffener, Pflichten des Auftragsverarbeiters, technische und organisatorische Massnahmen, Unterauftragsverarbeiter, Unterstuetzungspflichten.`,
  },
  {
    topic: 'Kuendigungsschutz',
    category: 'arbeitsrecht',
    keywords: ['kuendigung', 'kuendigungsschutz', 'kuendigungsfrist', 'arbeitsvertrag kuendigung', 'abfindung', 'kuendigungsschutzgesetz'],
    content: `Kuendigungsschutzgesetz (KSchG): Gilt ab 10 Arbeitnehmern und 6 Monaten Betriebszugehoerigkeit. Kuendigung muss sozial gerechtfertigt sein: personenbedingt, verhaltensbedingt oder betriebsbedingt. Gesetzliche Kuendigungsfristen (§ 622 BGB): 4 Wochen in Probezeit, danach gestaffelt nach Betriebszugehoerigkeit (bis 7 Monate bei 20 Jahren). Sonderkuendigungsschutz: Schwangere, Betriebsraete, Schwerbehinderte, Auszubildende.`,
  },
  {
    topic: 'Arbeitsvertrag - Pflichtinhalte',
    category: 'arbeitsrecht',
    keywords: ['arbeitsvertrag', 'nachweisgesetz', 'pflichtinhalte', 'arbeitszeit', 'verguetung', 'probezeit'],
    content: `Nach dem Nachweisgesetz (NachwG, seit 01.08.2022 verschaerft) muessen Arbeitsvertraege folgende Angaben enthalten: Name und Anschrift der Parteien, Arbeitsort, Taetigkeitsbeschreibung, Beginn und ggf. Dauer, Arbeitszeit, Verguetung (einschl. Zuschlaege), Urlaub, Kuendigungsfristen, Hinweis auf Tarifvertraege/Betriebsvereinbarungen, betriebliche Altersversorgung, Fortbildungsanspruch. Frist: Wesentliche Bedingungen muessen am ersten Arbeitstag schriftlich vorliegen.`,
  },
  {
    topic: 'Befristeter Arbeitsvertrag',
    category: 'arbeitsrecht',
    keywords: ['befristung', 'befristeter vertrag', 'sachgrund', 'teilzeit befristungsgesetz', 'tzbfg', 'zeitvertrag'],
    content: `Teilzeit- und Befristungsgesetz (TzBfG): Befristung mit Sachgrund (§ 14 Abs. 1) ist bei voruebergehendem Bedarf, Vertretung, Erprobung etc. moeglich. Befristung ohne Sachgrund (§ 14 Abs. 2) ist bis zu 2 Jahre zulaessig (max. 3 Verlaengerungen), nicht bei vorheriger Beschaeftigung beim selben Arbeitgeber. Schriftformerfordernis: Befristungsabrede muss vor Arbeitsantritt schriftlich vorliegen, sonst gilt unbefristetes Arbeitsverhaeltnis.`,
  },
  {
    topic: 'AGB-Recht - Grundlagen',
    category: 'vertragsrecht',
    keywords: ['agb', 'allgemeine geschaeftsbedingungen', 'klauselrecht', 'agb kontrolle', 'verbraucher', 'bgb 305'],
    content: `AGB-Recht (§§ 305-310 BGB): AGB sind vorformulierte Vertragsbedingungen fuer eine Vielzahl von Vertraegen. Einbeziehung: Ausdruecklicher Hinweis, zumutbare Kenntnisnahme, Einverstaendnis. Inhaltskontrolle: Klauselverbote ohne Wertungsmoeglichkeit (§ 309), Klauselverbote mit Wertungsmoeglichkeit (§ 308), Generelle Kontrolle nach § 307 (unangemessene Benachteiligung, Transparenzgebot). Im B2B-Bereich gelten §§ 308, 309 nicht direkt, aber als Indiz fuer § 307.`,
  },
  {
    topic: 'AGB - Unwirksame Klauseln',
    category: 'vertragsrecht',
    keywords: ['unwirksame klausel', 'agb unwirksam', 'klauselverbot', 'haftungsausschluss', 'gewaehrleistung agb'],
    content: `Haeufig unwirksame AGB-Klauseln: Pauschalier Haftungsausschluss fuer Vorsatz/grobe Fahrlaessigkeit, ueberlange Gewaehrleistungsfristen-Verkuerzung (unter 1 Jahr B2C), unangemessene Vertragsstrafen, automatische Vertragsverlaengerung ueber 1 Jahr, Abtretungsverbote ohne sachlichen Grund, Preiserhoehungsklauseln ohne Transparenz. Rechtsfolge: Unwirksame Klausel faellt weg, dispositives Gesetzesrecht tritt an ihre Stelle (§ 306 BGB).`,
  },
  {
    topic: 'GmbH-Gruendung',
    category: 'handelsrecht',
    keywords: ['gmbh', 'gruendung', 'stammkapital', 'gesellschaftsvertrag', 'handelsregister', 'geschaeftsfuehrer', 'ug'],
    content: `GmbH-Gruendung (GmbHG): Mindeststammkapital 25.000 EUR (UG ab 1 EUR). Schritte: 1. Gesellschaftsvertrag (notarielle Beurkundung), 2. Einzahlung Stammkapital (mind. 50% + voller Aufschlag), 3. Anmeldung Handelsregister, 4. Eintragung (konstitutiv). Pflichtorgane: Geschaeftsfuehrer (§ 35), Gesellschafterversammlung (§ 48). Optional: Aufsichtsrat (ab 500 AN pflicht). Geschaeftsfuehrer-Haftung: § 43 GmbHG (Sorgfalt ordentlicher Geschaeftsmann).`,
  },
  {
    topic: 'Handelsregister und Firmierung',
    category: 'handelsrecht',
    keywords: ['handelsregister', 'firma', 'firmierung', 'kaufmann', 'hgb', 'eintragung'],
    content: `Handelsregister (§§ 8-16 HGB): Oeffentliches Register bei den Amtsgerichten. Abteilung A: Einzelkaufleute, OHG, KG, Niederlassungen. Abteilung B: Kapitalgesellschaften (GmbH, AG, SE). Firmenrecht: Firma ist der Handelsname (§ 17 HGB). Grundsaetze: Firmenwahrheit, Firmenklarheit, Firmenbestaendigkeit, Firmeneinheit, Firmenoeffentlichkeit. Rechtsformzusatz ist Pflicht (z.B. GmbH, AG, e.K.).`,
  },
  {
    topic: 'Werkvertrag vs. Dienstvertrag',
    category: 'vertragsrecht',
    keywords: ['werkvertrag', 'dienstvertrag', 'bgb 611', 'bgb 631', 'abnahme', 'gewaehrleistung', 'maengel'],
    content: `Werkvertrag (§ 631 BGB): Herstellung eines Werkes geschuldet, Erfolg geschuldet. Abnahme erforderlich (§ 640). Gewaehrleistung: Nacherfuellung, Ruecktritt, Minderung, Schadensersatz. Verjaehrung: 2 Jahre (bewegliche Sachen), 5 Jahre (Bauwerke). Dienstvertrag (§ 611 BGB): Leistung der Dienste geschuldet, kein Erfolg geschuldet. Wichtig fuer Abgrenzung zu Scheinselbstaendigkeit bei Freelancern.`,
  },
  {
    topic: 'Kaufvertrag',
    category: 'vertragsrecht',
    keywords: ['kaufvertrag', 'gewaehrleistung', 'mangel', 'sachmangel', 'rechtsmangel', 'bgb 433', 'ruecktritt'],
    content: `Kaufvertrag (§ 433 BGB): Verpflichtung zur Uebergabe und Eigentumsuebertragung (Verkaeufer) sowie Zahlung (Kaeufer). Sachmangel (§ 434): Sache entspricht nicht der vereinbarten Beschaffenheit. Gewaehrleistungsrechte: Nacherfuellung (§ 439), Ruecktritt (§ 323), Minderung (§ 441), Schadensersatz (§ 280). Verjaehrung: 2 Jahre ab Ablieferung (§ 438). B2C: Beweislastumkehr 1 Jahr (seit 01.01.2022).`,
  },
  {
    topic: 'Mietrecht - Kuendigung',
    category: 'vertragsrecht',
    keywords: ['mietvertrag', 'mietrecht', 'kuendigung mietvertrag', 'eigenbedarfskuendigung', 'mieterhoehung', 'mieterschutz'],
    content: `Mietrecht (§§ 535 ff. BGB): Kuendigung durch Vermieter nur bei berechtigtem Interesse (§ 573): Pflichtverletzung des Mieters, Eigenbedarf, Verwertungshinderung. Kuendigungsfristen Vermieter: 3 Monate (bis 5 Jahre), 6 Monate (5-8 Jahre), 9 Monate (ueber 8 Jahre). Mieter: immer 3 Monate. Kuendigungssperrfrist bei Umwandlung in Eigentum: mind. 3 Jahre (laenderspezifisch bis 10 Jahre). Mietpreisbremse in angespannten Wohnungsmaerkten.`,
  },
  {
    topic: 'Widerrufsrecht (Fernabsatz)',
    category: 'vertragsrecht',
    keywords: ['widerruf', 'widerrufsrecht', 'fernabsatz', 'online shop', 'widerrufsbelehrung', '14 tage', 'verbraucher'],
    content: `Widerrufsrecht bei Fernabsatzvertraegen (§§ 312g, 355 BGB): 14 Tage ab Warenerhalt (bei Dienstleistungen: ab Vertragsschluss). Widerrufsbelehrung Pflicht - fehlerhafte Belehrung verlaengert Frist auf 12 Monate + 14 Tage. Ausnahmen: Verderbliche Waren, versiegelte Hygieneartikel nach Oeffnung, massgeschneiderte Waren, digitale Inhalte nach Zustimmung zum Verzicht. Ruecksendekosten: Verbraucher traegt sie, wenn belehrt.`,
  },
  {
    topic: 'Impressumspflicht',
    category: 'handelsrecht',
    keywords: ['impressum', 'anbieterkennzeichnung', 'tmg', 'telemediengesetz', 'pflichtangaben', 'website'],
    content: `Impressumspflicht (§ 5 TMG / DDG): Jeder geschaeftsmaessige Online-Dienst benoetigt ein Impressum. Pflichtangaben: Name/Firma, Anschrift (kein Postfach), E-Mail, Telefon/Kontaktformular, Rechtsform und Vertretungsberechtigte, Handelsregister-Nr., USt-IdNr., bei reglementierten Berufen: Kammer, Berufsbezeichnung, berufsrechtliche Regelungen. Verstoss: Abmahnung, Bussgeld bis 50.000 EUR.`,
  },
  {
    topic: 'Scheinselbstaendigkeit',
    category: 'arbeitsrecht',
    keywords: ['scheinselbstaendigkeit', 'freelancer', 'selbstaendig', 'abhaengig', 'sozialversicherung', 'rentenversicherung'],
    content: `Scheinselbstaendigkeit: Liegt vor, wenn ein formal Selbstaendiger wie ein Arbeitnehmer taetig wird. Kriterien: Weisungsgebundenheit (Ort, Zeit, Inhalt), Eingliederung in Betriebsorganisation, keine eigenen Betriebsmittel, keine unternehmerischen Risiken, dauerhaft nur ein Auftraggeber. Folgen: Nachzahlung Sozialversicherungsbeitraege (bis 4 Jahre rueckwirkend), Bussgelder, strafrechtliche Konsequenzen bei Vorsatz. Statusfeststellungsverfahren bei der DRV Bund moeglich.`,
  },
  {
    topic: 'Urheberrecht - Grundlagen',
    category: 'vertragsrecht',
    keywords: ['urheberrecht', 'copyright', 'nutzungsrechte', 'lizenz', 'urhg', 'geistiges eigentum'],
    content: `Urheberrechtsgesetz (UrhG): Schuetzt persoenliche geistige Schoepfungen (§ 2). Geschuetzt: Sprach-, Musik-, Filmwerke, Software, Datenbanken, Fotografien. Schutz entsteht automatisch mit Schoepfung (keine Registrierung). Dauer: 70 Jahre nach Tod des Urhebers. Nutzungsrechte: Einfaches (§ 31 Abs. 2) oder ausschliessliches (§ 31 Abs. 3) Nutzungsrecht. Zweckuebertragungslehre (§ 31 Abs. 5): Im Zweifel nur so weit wie der Vertragszweck erfordert.`,
  },
  {
    topic: 'Markenrecht',
    category: 'handelsrecht',
    keywords: ['marke', 'markenrecht', 'markenschutz', 'dpma', 'markenanmeldung', 'markenverletzung'],
    content: `Markengesetz (MarkenG): Schutz von Zeichen zur Unterscheidung von Waren/Dienstleistungen. Eintragung beim DPMA (national) oder EUIPO (EU-Marke). Schutzvoraussetzungen: Unterscheidungskraft, keine absoluten Schutzhindernisse. Schutzdauer: 10 Jahre, unbegrenzt verlaengerbar. Verletzungsfolgen: Unterlassung, Schadensersatz, Vernichtung, Auskunft. Recherche vor Anmeldung dringend empfohlen (aeltere Rechte pruefen).`,
  },
  {
    topic: 'Strafrecht - Betrug',
    category: 'strafrecht',
    keywords: ['betrug', 'stgb 263', 'taeuschung', 'vermoegensvorteil', 'strafrecht', 'anzeige'],
    content: `Betrug (§ 263 StGB): Taeuschung ueber Tatsachen, Erregung eines Irrtums, Vermoegensverfuegung, Vermogensschaden, Bereicherungsabsicht. Strafe: bis 5 Jahre Freiheitsstrafe oder Geldstrafe. Gewerbsmaessiger/Bandenbetrug (§ 263 Abs. 3): 6 Monate bis 10 Jahre. Wichtig: Auch Unterlassen kann Taeuschung sein (Garantenstellung). Verjaehrung: 5 Jahre. Anzeige bei der Polizei oder Staatsanwaltschaft.`,
  },
  {
    topic: 'Strafrecht - Untreue',
    category: 'strafrecht',
    keywords: ['untreue', 'stgb 266', 'treuepflicht', 'vermoegensfuersorgepflicht', 'geschaeftsfuehrer haftung'],
    content: `Untreue (§ 266 StGB): Missbrauch einer Befugnis ueber fremdes Vermoegen zu verfuegen oder Verletzung einer Vermoegensfuersorgepflicht. Typische Faelle: Geschaeftsfuehrer-Untreue, Gesellschafter-Untreue, Bankuntreue. Strafe: bis 5 Jahre Freiheitsstrafe oder Geldstrafe, in schweren Faellen (§ 266 Abs. 2 i.V.m. § 263 Abs. 3) bis 10 Jahre. Besonders relevant fuer GmbH-Geschaeftsfuehrer und Vorstaende.`,
  },
];

export async function searchLegal(input: LegalSearchInput): Promise<LegalSearchResult> {
  const { query, category, max_results = 5 } = input;
  const clampedMax = Math.min(Math.max(1, max_results), 10);

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Score each knowledge entry
  const scored: Array<{ entry: KnowledgeEntry; score: number }> = [];

  for (const entry of LEGAL_KNOWLEDGE_BASE) {
    // Filter by category if specified
    if (category && entry.category !== category) continue;

    let score = 0;

    // Keyword matching
    for (const keyword of entry.keywords) {
      if (queryLower.includes(keyword)) {
        score += 3;
      } else {
        // Partial match
        for (const word of queryWords) {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 1;
          }
        }
      }
    }

    // Topic matching
    const topicLower = entry.topic.toLowerCase();
    for (const word of queryWords) {
      if (topicLower.includes(word)) {
        score += 2;
      }
    }

    // Content matching
    const contentLower = entry.content.toLowerCase();
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 0.5;
      }
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top results
  const topResults = scored.slice(0, clampedMax);
  const maxScore = topResults.length > 0 ? topResults[0].score : 1;

  const results: LegalSearchResultItem[] = topResults.map(({ entry, score }) => ({
    topic: entry.topic,
    content: entry.content,
    relevance: Math.round((score / maxScore) * 100),
  }));

  const summary = results.length > 0
    ? `${results.length} relevante Ergebnisse fuer "${query}" gefunden.`
    : `Keine Ergebnisse fuer "${query}" gefunden. Versuchen Sie andere Suchbegriffe.`;

  const formatted = [
    `**Rechtsrecherche:** "${query}"${category ? ` (Kategorie: ${category})` : ''}`,
    '',
    `*${summary}*`,
    '',
    ...(results.length > 0 ? results.map((r, i) => [
      `### ${i + 1}. ${r.topic} (Relevanz: ${r.relevance}%)`,
      '',
      r.content,
      '',
    ].join('\n')) : ['Keine passenden Eintraege in der Wissensdatenbank gefunden.']),
    '---',
    '*Hinweis: Diese Informationen dienen der allgemeinen Orientierung und ersetzen keine Rechtsberatung.*',
  ].join('\n');

  return {
    results,
    summary,
    formatted_output: formatted,
  };
}
