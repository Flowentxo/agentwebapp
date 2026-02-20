/**
 * Notice Generator Tool
 *
 * Generates legally compliant landlord-tenant notices based on BGB Mietrecht.
 * Supports: Kuendigung, Mieterhoehung, Mahnung, Abmahnung, BK-Abrechnung,
 * Modernisierungsankuendigung, and general information letters.
 */

import { NOTICE_TYPES, DELIVERY_METHODS, formatEurCents, formatGermanDate, type NoticeType } from '../config';

// ── Types ─────────────────────────────────────────────────────────

export interface NoticeGeneratorInput {
  notice_type: NoticeType;
  landlord: {
    name: string;
    address: string;
    company?: string;
  };
  tenant: {
    name: string;
    address: string;
  };
  property: {
    address: string;
    unit?: string;
    area_sqm?: number;
    rooms?: number;
  };
  contract_details?: {
    start_date?: string;
    current_rent_cents?: number;
    new_rent_cents?: number;
    prepayment_cents?: number;
    deposit_cents?: number;
  };
  reason?: string;
  deadline_date?: string;
  custom_text?: string;
}

export interface NoticeResult {
  document: string;
  legal_references: string[];
  warnings: string[];
  delivery_method: string;
  formatted_output: string;
}

// ── Tool Definition ───────────────────────────────────────────────

export const NOTICE_GENERATOR_TOOL = {
  name: 'notice_generator',
  description: 'Erstellt rechtssichere Schreiben im Mietrecht: Kuendigung, Mieterhoehung, Mahnung, Abmahnung, Betriebskostenabrechnung, Modernisierungsankuendigung, oder allgemeine Mieterinformation.',
  input_schema: {
    type: 'object',
    properties: {
      notice_type: {
        type: 'string',
        enum: Object.keys(NOTICE_TYPES),
        description: 'Art des Schreibens',
      },
      landlord: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          company: { type: 'string' },
        },
        required: ['name', 'address'],
      },
      tenant: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
        },
        required: ['name', 'address'],
      },
      property: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          unit: { type: 'string' },
          area_sqm: { type: 'number' },
          rooms: { type: 'number' },
        },
        required: ['address'],
      },
      contract_details: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'DD.MM.YYYY' },
          current_rent_cents: { type: 'integer', description: 'Aktuelle Kaltmiete in Cent' },
          new_rent_cents: { type: 'integer', description: 'Neue Kaltmiete in Cent (fuer Mieterhoehung)' },
          prepayment_cents: { type: 'integer', description: 'Betriebskostenvorauszahlung in Cent' },
          deposit_cents: { type: 'integer', description: 'Kaution in Cent' },
        },
      },
      reason: { type: 'string', description: 'Begruendung (Eigenbedarf, Zahlungsverzug, etc.)' },
      deadline_date: { type: 'string', description: 'Gewuenschtes Fristende DD.MM.YYYY' },
      custom_text: { type: 'string', description: 'Zusaetzlicher Freitext' },
    },
    required: ['notice_type', 'landlord', 'tenant', 'property'],
  },
};

// ── Generator ─────────────────────────────────────────────────────

export async function generateNotice(input: NoticeGeneratorInput): Promise<NoticeResult> {
  const { notice_type, landlord, tenant, property, contract_details, reason, deadline_date, custom_text } = input;

  const config = NOTICE_TYPES[notice_type];
  if (!config) {
    return {
      document: '',
      legal_references: [],
      warnings: [`Unbekannter Schreiben-Typ: ${notice_type}`],
      delivery_method: 'einschreiben_einwurf',
      formatted_output: `Fehler: Unbekannter Schreiben-Typ "${notice_type}"`,
    };
  }

  const today = formatGermanDate(new Date());
  const legalRefs: string[] = [];
  const warnings: string[] = [];

  if (config.legalBasis) legalRefs.push(config.legalBasis);

  // Build header
  const header = buildHeader(landlord, tenant, property, today);

  // Build body based on notice type
  let body = '';
  switch (notice_type) {
    case 'kuendigung_ordentlich':
      body = buildKuendigungOrdentlich(tenant, property, contract_details, reason, deadline_date);
      legalRefs.push('§573 BGB', '§573c BGB', '§568 BGB');
      warnings.push('Kuendigung muss eigenhaendig unterschrieben werden (§568 BGB).');
      warnings.push('Alle Vermieter muessen unterschreiben, Kuendigung muss an alle Mieter gerichtet sein.');
      break;

    case 'kuendigung_fristlos':
      body = buildKuendigungFristlos(tenant, property, reason);
      legalRefs.push('§543 BGB', '§569 BGB');
      warnings.push('Fristlose Kuendigung erfordert in der Regel vorherige Abmahnung (Ausnahme: §543 Abs. 2 Nr. 3 BGB bei Zahlungsverzug).');
      warnings.push('Kuendigung muss eigenhaendig unterschrieben werden (§568 BGB).');
      break;

    case 'mieterhoehung_mietspiegel':
      body = buildMieterhoehungMietspiegel(tenant, property, contract_details, reason);
      legalRefs.push('§558 BGB', '§558a BGB', '§558b BGB');
      if (!reason) warnings.push('Mieterhoehung muss begruendet werden (Mietspiegel, Vergleichswohnungen oder Gutachten).');
      warnings.push('Kappungsgrenze beachten: Max. 20% (bzw. 15% in angespannten Maerkten) innerhalb von 3 Jahren.');
      break;

    case 'mieterhoehung_modernisierung':
      body = buildMieterhoehungModernisierung(tenant, property, contract_details, reason);
      legalRefs.push('§559 BGB', '§559a BGB', '§555c BGB');
      warnings.push('Max. 8% der Modernisierungskosten pro Jahr auf die Miete umlegbar (§559 Abs. 1 BGB).');
      break;

    case 'mahnung_miete':
      body = buildMahnungMiete(tenant, property, contract_details, deadline_date);
      legalRefs.push('§286 BGB', '§535 Abs. 2 BGB');
      break;

    case 'abmahnung':
      body = buildAbmahnung(tenant, property, reason);
      legalRefs.push('§541 BGB');
      warnings.push('Abmahnung ist Voraussetzung fuer spaetere Kuendigung (ausser bei Zahlungsverzug).');
      break;

    case 'betriebskosten_abrechnung':
      body = buildBetriebskostenAbrechnung(tenant, property, contract_details);
      legalRefs.push('§556 BGB', '§556 Abs. 3 BGB', 'BetrKV');
      warnings.push('Abrechnung muss innerhalb von 12 Monaten nach Ende des Abrechnungszeitraums zugehen (§556 Abs. 3 S. 2 BGB).');
      break;

    case 'modernisierung_ankuendigung':
      body = buildModernisierungAnkuendigung(tenant, property, reason, contract_details);
      legalRefs.push('§555c BGB', '§555b BGB');
      warnings.push('Modernisierung muss 3 Monate vor Beginn angekuendigt werden (§555c Abs. 1 BGB).');
      break;

    case 'info_schreiben':
    default:
      body = buildInfoSchreiben(tenant, property, custom_text || reason || '');
      break;
  }

  // Build footer
  const footer = buildFooter(landlord, config.requiresWrittenForm);

  const document = [header, '', body, '', footer].join('\n');

  // Delivery recommendation
  const deliveryMethodKey = config.deliveryMethod;
  const deliveryInfo = DELIVERY_METHODS[deliveryMethodKey as keyof typeof DELIVERY_METHODS];

  const formatted = [
    `📄 **${config.label}** erstellt`,
    '',
    `**Zustellempfehlung:** ${deliveryInfo?.label || deliveryMethodKey}`,
    deliveryInfo ? `> ${deliveryInfo.legalNote}` : '',
    '',
    '**Rechtliche Grundlagen:**',
    ...legalRefs.map(r => `- ${r}`),
    '',
    ...(warnings.length > 0 ? [
      '⚠️ **Wichtige Hinweise:**',
      ...warnings.map(w => `- ${w}`),
      '',
    ] : []),
    '---',
    '',
    document,
    '',
    '---',
    '*Dies ist eine Vorlage. Lassen Sie rechtlich relevante Schreiben von einem Anwalt pruefen.*',
  ].join('\n');

  return {
    document,
    legal_references: [...new Set(legalRefs)],
    warnings,
    delivery_method: deliveryMethodKey,
    formatted_output: formatted,
  };
}

// ── Template Builders ─────────────────────────────────────────────

function buildHeader(
  landlord: NoticeGeneratorInput['landlord'],
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  date: string,
): string {
  const lines: string[] = [];

  // Absender
  if (landlord.company) lines.push(landlord.company);
  lines.push(landlord.name);
  lines.push(landlord.address);
  lines.push('');

  // Empfaenger
  lines.push(tenant.name);
  lines.push(tenant.address);
  lines.push('');

  // Datum und Objekt
  lines.push(`Datum: ${date}`);
  lines.push(`Mietobjekt: ${property.address}${property.unit ? `, ${property.unit}` : ''}`);

  return lines.join('\n');
}

function buildFooter(landlord: NoticeGeneratorInput['landlord'], requiresSignature: boolean): string {
  const lines: string[] = [];
  lines.push('Mit freundlichen Gruessen');
  lines.push('');
  if (requiresSignature) {
    lines.push('____________________________');
    lines.push(`(Eigenhaendige Unterschrift: ${landlord.name})`);
  } else {
    lines.push(landlord.name);
    if (landlord.company) lines.push(landlord.company);
  }
  return lines.join('\n');
}

function buildKuendigungOrdentlich(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  contract_details?: NoticeGeneratorInput['contract_details'],
  reason?: string,
  deadline_date?: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Ordentliche Kuendigung des Mietverhaeltnisses`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`hiermit kuendige ich/kuendigen wir das Mietverhaeltnis ueber die Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}`);
  if (contract_details?.start_date) {
    lines.push(`(Mietvertrag vom ${contract_details.start_date})`);
  }
  lines.push(`ordentlich und fristgemaess gemaess §573 BGB.`);
  lines.push('');

  if (reason) {
    lines.push(`Begruendung der Kuendigung:`);
    lines.push(reason);
    lines.push('');
  }

  if (deadline_date) {
    lines.push(`Das Mietverhaeltnis endet zum ${deadline_date}.`);
  } else {
    lines.push(`Das Mietverhaeltnis endet unter Einhaltung der gesetzlichen Kuendigungsfrist gemaess §573c BGB zum naechstmoeglichen Zeitpunkt.`);
  }
  lines.push('');

  lines.push('Ich/Wir bitte(n) Sie, die Wohnung bis zum genannten Termin geraeumt und in ordnungsgemaessem Zustand zurueckzugeben.');
  lines.push('');
  lines.push('Hinweis: Sie haben das Recht, dieser Kuendigung gemaess §574 BGB wegen unzumutbarer Haerte zu widersprechen. Der Widerspruch muss spaetestens zwei Monate vor Beendigung des Mietverhaeltnisses schriftlich erfolgen (§574b BGB).');

  return lines.join('\n');
}

function buildKuendigungFristlos(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  reason?: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Fristlose Kuendigung des Mietverhaeltnisses`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`hiermit kuendige ich/kuendigen wir das Mietverhaeltnis ueber die Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}`);
  lines.push(`fristlos und ausserordentlich gemaess §543 BGB.`);
  lines.push('');

  if (reason) {
    lines.push(`Begruendung:`);
    lines.push(reason);
    lines.push('');
  }

  lines.push('Das Mietverhaeltnis endet mit Zugang dieser Kuendigung.');
  lines.push('Ich/Wir fordern Sie auf, die Wohnung unverzueglich zu raeumen und herauszugeben.');
  lines.push('');
  lines.push('Hilfsweise kuendige ich/kuendigen wir hiermit auch ordentlich zum naechstmoeglichen Termin.');

  return lines.join('\n');
}

function buildMieterhoehungMietspiegel(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  contract_details?: NoticeGeneratorInput['contract_details'],
  reason?: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Mieterhoehung gemaess §558 BGB`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');

  if (contract_details?.current_rent_cents && contract_details?.new_rent_cents) {
    const currentRent = formatEurCents(contract_details.current_rent_cents);
    const newRent = formatEurCents(contract_details.new_rent_cents);
    const diff = formatEurCents(contract_details.new_rent_cents - contract_details.current_rent_cents);

    lines.push(`ich/wir bitten Sie um Zustimmung zur Erhoehung der Nettokaltmiete fuer die Wohnung`);
    lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}`);
    lines.push('');
    lines.push(`Aktuelle Nettokaltmiete: ${currentRent}`);
    lines.push(`Neue Nettokaltmiete:     ${newRent}`);
    lines.push(`Erhoehung:               ${diff}`);
  } else {
    lines.push(`ich/wir bitten Sie um Zustimmung zur Erhoehung der Nettokaltmiete fuer die Wohnung`);
    lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}.`);
  }
  lines.push('');

  if (reason) {
    lines.push('Begruendung:');
    lines.push(reason);
    lines.push('');
  } else {
    lines.push('Begruendung: [Bitte Mietspiegel-Referenz, Vergleichswohnungen oder Gutachten einfuegen]');
    lines.push('');
  }

  lines.push('Gemaess §558b Abs. 2 BGB bitte ich/bitten wir Sie, Ihre Zustimmung innerhalb der Zustimmungsfrist von zwei Monaten (bis zum Ende des uebernachsten Monats nach Zugang dieses Schreibens) zu erklaeren.');
  lines.push('');
  lines.push('Die neue Miete gilt ab dem dritten Kalendermonat nach Zugang dieses Schreibens.');

  return lines.join('\n');
}

function buildMieterhoehungModernisierung(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  contract_details?: NoticeGeneratorInput['contract_details'],
  reason?: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Mieterhoehung nach Modernisierung gemaess §559 BGB`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`nach Abschluss der Modernisierungsmassnahmen an der Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}`);
  lines.push(`erhoehe ich/erhoehen wir die Miete gemaess §559 BGB.`);
  lines.push('');

  if (reason) {
    lines.push('Durchgefuehrte Massnahmen:');
    lines.push(reason);
    lines.push('');
  }

  if (contract_details?.current_rent_cents && contract_details?.new_rent_cents) {
    lines.push(`Bisherige Nettokaltmiete: ${formatEurCents(contract_details.current_rent_cents)}`);
    lines.push(`Neue Nettokaltmiete:      ${formatEurCents(contract_details.new_rent_cents)}`);
    lines.push('');
  }

  lines.push('Die Mieterhoehung wird mit Beginn des dritten Monats nach Zugang dieser Erklaerung wirksam.');

  return lines.join('\n');
}

function buildMahnungMiete(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  contract_details?: NoticeGeneratorInput['contract_details'],
  deadline_date?: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Mahnung — Rueckstaendige Mietzahlung`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`ich/wir stellen fest, dass fuer die Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}`);
  lines.push('die Mietzahlung aussteht.');
  lines.push('');

  if (contract_details?.current_rent_cents) {
    lines.push(`Offener Betrag: ${formatEurCents(contract_details.current_rent_cents)}`);
    lines.push('');
  }

  lines.push(`Ich/Wir fordern Sie auf, den ausstehenden Betrag bis zum ${deadline_date || '[Datum einfuegen]'} auf das bekannte Konto zu ueberweisen.`);
  lines.push('');
  lines.push('Bitte beachten Sie: Bei Zahlungsverzug von mehr als zwei Monatsmieten besteht das Recht zur fristlosen Kuendigung gemaess §543 Abs. 2 Nr. 3 BGB.');
  lines.push('');
  lines.push('Sollte die Zahlung bereits veranlasst sein, betrachten Sie dieses Schreiben bitte als gegenstandslos.');

  return lines.join('\n');
}

function buildAbmahnung(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  reason?: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Abmahnung`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`hiermit mahne ich/mahnen wir Sie bezueglich der Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}`);
  lines.push(`wegen folgenden Sachverhalts ab:`);
  lines.push('');

  if (reason) {
    lines.push(reason);
  } else {
    lines.push('[Sachverhalt hier beschreiben]');
  }
  lines.push('');

  lines.push('Ich/Wir fordern Sie auf, das beanstandete Verhalten unverzueglich einzustellen.');
  lines.push('');
  lines.push('Sollte keine Aenderung eintreten, behalte ich mir/behalten wir uns weitere rechtliche Schritte, einschliesslich einer Kuendigung des Mietverhaeltnisses, ausdruecklich vor.');

  return lines.join('\n');
}

function buildBetriebskostenAbrechnung(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  contract_details?: NoticeGeneratorInput['contract_details'],
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Betriebskostenabrechnung`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`anbei erhalten Sie die Betriebskostenabrechnung fuer die Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''}.`);
  lines.push('');
  lines.push('Abrechnungszeitraum: [Zeitraum einfuegen]');
  lines.push('');

  if (contract_details?.prepayment_cents) {
    lines.push(`Ihre monatliche Vorauszahlung: ${formatEurCents(contract_details.prepayment_cents)}`);
    lines.push('');
  }

  lines.push('[Detaillierte Kostenaufstellung hier einfuegen]');
  lines.push('');
  lines.push('Gemaess §556 Abs. 3 BGB haben Sie das Recht, innerhalb von 12 Monaten nach Zugang der Abrechnung Einwendungen zu erheben.');
  lines.push('');
  lines.push('Sie haben zudem das Recht, die Belege einzusehen. Bitte vereinbaren Sie hierzu einen Termin.');

  return lines.join('\n');
}

function buildModernisierungAnkuendigung(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  reason?: string,
  contract_details?: NoticeGeneratorInput['contract_details'],
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Ankuendigung von Modernisierungsmassnahmen gemaess §555c BGB`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(`ich/wir kuendigen hiermit Modernisierungsmassnahmen an der Wohnung`);
  lines.push(`${property.address}${property.unit ? `, ${property.unit}` : ''} an.`);
  lines.push('');

  if (reason) {
    lines.push('Art und Umfang der Massnahmen:');
    lines.push(reason);
    lines.push('');
  }

  lines.push('Voraussichtlicher Beginn: [Datum einfuegen]');
  lines.push('Voraussichtliche Dauer:   [Dauer einfuegen]');
  lines.push('');

  if (contract_details?.current_rent_cents && contract_details?.new_rent_cents) {
    lines.push(`Voraussichtliche Mieterhoehung nach §559 BGB: von ${formatEurCents(contract_details.current_rent_cents)} auf ${formatEurCents(contract_details.new_rent_cents)}`);
    lines.push('');
  }

  lines.push('Hinweis: Sie haben das Recht, unter den Voraussetzungen des §555d BGB wegen einer nicht zu rechtfertigenden Haerte Einwendungen zu erheben.');
  lines.push('Einwendungen muessen bis zum Ablauf des Monats, der auf den Zugang der Ankuendigung folgt, schriftlich erklaert werden.');

  return lines.join('\n');
}

function buildInfoSchreiben(
  tenant: NoticeGeneratorInput['tenant'],
  property: NoticeGeneratorInput['property'],
  text: string,
): string {
  const lines: string[] = [];
  lines.push(`Betreff: Mitteilung`);
  lines.push('');
  lines.push(`Sehr geehrte/r ${tenant.name},`);
  lines.push('');
  lines.push(text || '[Inhalt hier einfuegen]');
  lines.push('');
  lines.push(`Betrifft: ${property.address}${property.unit ? `, ${property.unit}` : ''}`);

  return lines.join('\n');
}
