/**
 * Deadline Calculator Tool
 *
 * Calculates legal deadlines according to BGB Mietrecht.
 * Supports: Kuendigungsfristen (§573c), Mieterhoehungsfristen (§558b),
 * Betriebskosten-Abrechnungsfrist (§556 Abs. 3), and more.
 * Accounts for weekends and German federal holidays (§193 BGB).
 */

import {
  LANDLORD_NOTICE_PERIODS,
  TENANT_NOTICE_PERIOD_MONTHS,
  parseGermanDate,
  formatGermanDate,
  adjustToBusinessDay,
} from '../config';

// ── Types ─────────────────────────────────────────────────────────

export type DeadlineType =
  | 'kuendigung_vermieter'
  | 'kuendigung_mieter'
  | 'kuendigung_fristlos'
  | 'mieterhoehung_ankuendigung'
  | 'mieterhoehung_zustimmung'
  | 'betriebskosten_abrechnung'
  | 'betriebskosten_widerspruch'
  | 'mahnung_zahlungsfrist'
  | 'modernisierung_ankuendigung'
  | 'widerspruch_kuendigung'
  | 'kaution_rueckzahlung';

export interface DeadlineCalculatorInput {
  deadline_type: DeadlineType;
  reference_date: string; // DD.MM.YYYY
  tenancy_duration_months?: number;
  abrechnungszeitraum_end?: string; // DD.MM.YYYY
  state?: string; // Bundesland
}

export interface DeadlineResult {
  deadline_date: string;
  legal_basis: string;
  calculation_steps: string[];
  warnings: string[];
  is_holiday_adjusted: boolean;
  formatted_output: string;
}

// ── Tool Definition ───────────────────────────────────────────────

export const DEADLINE_CALCULATOR_TOOL = {
  name: 'deadline_calculator',
  description: 'Berechnet mietrechtliche Fristen: Kuendigungsfristen (§573c BGB), Mieterhoehungsfristen (§558b), Mahnfristen, Widerspruchsfristen, Betriebskosten-Abrechnungsfrist (§556 Abs. 3). Beruecksichtigt Sonn-/Feiertage.',
  input_schema: {
    type: 'object',
    properties: {
      deadline_type: {
        type: 'string',
        enum: [
          'kuendigung_vermieter',
          'kuendigung_mieter',
          'kuendigung_fristlos',
          'mieterhoehung_ankuendigung',
          'mieterhoehung_zustimmung',
          'betriebskosten_abrechnung',
          'betriebskosten_widerspruch',
          'mahnung_zahlungsfrist',
          'modernisierung_ankuendigung',
          'widerspruch_kuendigung',
          'kaution_rueckzahlung',
        ],
        description: 'Art der Frist',
      },
      reference_date: {
        type: 'string',
        description: 'Ausgangsdatum DD.MM.YYYY',
      },
      tenancy_duration_months: {
        type: 'integer',
        description: 'Mietdauer in Monaten (relevant fuer Kuendigungsfrist §573c)',
      },
      abrechnungszeitraum_end: {
        type: 'string',
        description: 'Ende des Abrechnungszeitraums DD.MM.YYYY (fuer Betriebskosten)',
      },
      state: {
        type: 'string',
        description: 'Bundesland (fuer Feiertags-Berechnung)',
        enum: ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'],
      },
    },
    required: ['deadline_type', 'reference_date'],
  },
};

// ── Calculator ────────────────────────────────────────────────────

export async function calculateDeadline(input: DeadlineCalculatorInput): Promise<DeadlineResult> {
  const { deadline_type, reference_date, tenancy_duration_months, abrechnungszeitraum_end, state } = input;

  const refDate = parseGermanDate(reference_date);
  const steps: string[] = [];
  const warnings: string[] = [];
  let legalBasis = '';
  let deadlineDate: Date;

  steps.push(`Ausgangsdatum: ${reference_date}`);

  switch (deadline_type) {
    case 'kuendigung_vermieter': {
      const duration = tenancy_duration_months || calculateMonthsBetween(refDate, new Date());
      const period = LANDLORD_NOTICE_PERIODS.find(p => duration < p.maxMonths) || LANDLORD_NOTICE_PERIODS[2];

      steps.push(`Mietdauer: ${duration} Monate (${period.label})`);
      steps.push(`Kuendigungsfrist: ${period.periodMonths} Monate (${period.legalBasis})`);

      // Kuendigung muss zum Monatsende erfolgen, Frist laeuft ab 3. Werktag des Monats
      const today = new Date();
      deadlineDate = addMonthsToEndOfMonth(today, period.periodMonths);

      steps.push(`Kuendigung muss spaetestens am 3. Werktag des Monats zugehen, damit die Frist ab diesem Monat laeuft`);
      steps.push(`Fruehestes Mietende: ${formatGermanDate(deadlineDate)}`);

      legalBasis = period.legalBasis;
      warnings.push(`Kuendigung muss dem Mieter bis zum 3. Werktag eines Monats zugehen, damit dieser Monat noch zaehlt.`);
      break;
    }

    case 'kuendigung_mieter': {
      steps.push(`Mieter-Kuendigungsfrist: immer ${TENANT_NOTICE_PERIOD_MONTHS} Monate (§573c Abs. 1 BGB)`);

      const today = new Date();
      deadlineDate = addMonthsToEndOfMonth(today, TENANT_NOTICE_PERIOD_MONTHS);

      steps.push(`Fruehestes Mietende: ${formatGermanDate(deadlineDate)}`);
      legalBasis = '§573c Abs. 1 BGB';
      break;
    }

    case 'kuendigung_fristlos': {
      deadlineDate = new Date(); // Sofort
      steps.push(`Fristlose Kuendigung wirkt sofort mit Zugang (§543 BGB)`);
      legalBasis = '§543 BGB';
      warnings.push('Fristlose Kuendigung erfordert in der Regel vorherige Abmahnung.');
      warnings.push('Ausnahme: §543 Abs. 2 Nr. 3 BGB (Zahlungsverzug >= 2 Monatsmieten)');
      break;
    }

    case 'mieterhoehung_ankuendigung': {
      // Mieterhoehung wird wirksam ab dem 3. Monat nach Zugang
      deadlineDate = new Date(refDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + 2);
      // Set to end of that month
      deadlineDate = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth() + 1, 0);

      steps.push(`Zugang des Erhoehungsverlangens: ${reference_date}`);
      steps.push(`Zustimmungsfrist: bis Ende des uebernachsten Monats (§558b Abs. 2 BGB)`);
      steps.push(`Neue Miete gilt ab: ${formatGermanDate(deadlineDate)}`);

      legalBasis = '§558b BGB';
      break;
    }

    case 'mieterhoehung_zustimmung': {
      // Mieter hat bis Ende des uebernachsten Monats Zeit zuzustimmen
      deadlineDate = new Date(refDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + 2);
      deadlineDate = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth() + 1, 0);

      steps.push(`Zugang Mieterhoehungsverlangen: ${reference_date}`);
      steps.push(`Zustimmungsfrist endet: ${formatGermanDate(deadlineDate)} (§558b Abs. 2 BGB)`);

      legalBasis = '§558b Abs. 2 BGB';
      warnings.push('Nach Ablauf der Frist ohne Zustimmung kann der Vermieter auf Zustimmung klagen (§558b Abs. 2 S. 2 BGB).');
      break;
    }

    case 'betriebskosten_abrechnung': {
      const endDate = abrechnungszeitraum_end ? parseGermanDate(abrechnungszeitraum_end) : refDate;
      deadlineDate = new Date(endDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + 12);

      steps.push(`Ende Abrechnungszeitraum: ${formatGermanDate(endDate)}`);
      steps.push(`Abrechnungsfrist: 12 Monate (§556 Abs. 3 S. 2 BGB)`);
      steps.push(`Abrechnung muss zugehen bis: ${formatGermanDate(deadlineDate)}`);

      legalBasis = '§556 Abs. 3 BGB';
      warnings.push('AUSSCHLUSSFRIST: Nach Ablauf kann der Vermieter keine Nachforderungen mehr geltend machen (§556 Abs. 3 S. 3 BGB).');
      break;
    }

    case 'betriebskosten_widerspruch': {
      // Mieter hat 12 Monate nach Zugang der Abrechnung Zeit fuer Einwendungen
      deadlineDate = new Date(refDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + 12);

      steps.push(`Zugang der Abrechnung: ${reference_date}`);
      steps.push(`Widerspruchsfrist: 12 Monate (§556 Abs. 3 S. 5 BGB)`);
      steps.push(`Einwendungen bis: ${formatGermanDate(deadlineDate)}`);

      legalBasis = '§556 Abs. 3 S. 5 BGB';
      break;
    }

    case 'mahnung_zahlungsfrist': {
      // Standard: 14 Tage Zahlungsfrist
      deadlineDate = new Date(refDate);
      deadlineDate.setDate(deadlineDate.getDate() + 14);

      steps.push(`Mahnung vom: ${reference_date}`);
      steps.push(`Zahlungsfrist: 14 Tage`);
      steps.push(`Frist endet: ${formatGermanDate(deadlineDate)}`);

      legalBasis = '§286 BGB';
      warnings.push('Miete ist gemaess §556b Abs. 1 BGB spaetestens bis zum 3. Werktag eines Monats faellig.');
      break;
    }

    case 'modernisierung_ankuendigung': {
      // Modernisierung muss 3 Monate vorher angekuendigt werden
      deadlineDate = new Date(refDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + 3);

      steps.push(`Fruehester Beginn der Massnahmen: ${formatGermanDate(deadlineDate)}`);
      steps.push(`Ankuendigungsfrist: 3 Monate vor Beginn (§555c Abs. 1 BGB)`);

      legalBasis = '§555c Abs. 1 BGB';
      break;
    }

    case 'widerspruch_kuendigung': {
      // Widerspruch spaetestens 2 Monate vor Mietende
      deadlineDate = new Date(refDate);
      deadlineDate.setMonth(deadlineDate.getMonth() - 2);

      steps.push(`Mietende laut Kuendigung: ${reference_date}`);
      steps.push(`Widerspruchsfrist: spaetestens 2 Monate vor Mietende (§574b BGB)`);
      steps.push(`Widerspruch muss zugehen bis: ${formatGermanDate(deadlineDate)}`);

      legalBasis = '§574b BGB';
      warnings.push('Widerspruch muss schriftlich erfolgen.');
      break;
    }

    case 'kaution_rueckzahlung': {
      // Kaution: angemessene Prüfungsfrist, üblicherweise 3-6 Monate
      deadlineDate = new Date(refDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + 6);

      steps.push(`Mietende/Rueckgabe: ${reference_date}`);
      steps.push(`Angemessene Pruefungsfrist: 3-6 Monate (Rechtsprechung)`);
      steps.push(`Spaeteste Rueckzahlung: ${formatGermanDate(deadlineDate)}`);

      legalBasis = '§551 BGB';
      warnings.push('Der Vermieter darf einen angemessenen Teil fuer noch ausstehende Betriebskostenabrechnungen einbehalten.');
      break;
    }

    default:
      return {
        deadline_date: reference_date,
        legal_basis: '',
        calculation_steps: [`Unbekannter Fristentyp: ${deadline_type}`],
        warnings: ['Fristentyp nicht erkannt'],
        is_holiday_adjusted: false,
        formatted_output: `Fehler: Unbekannter Fristentyp "${deadline_type}"`,
      };
  }

  // Adjust for weekends/holidays (§193 BGB)
  const adjustment = adjustToBusinessDay(deadlineDate, state);

  if (adjustment.adjusted && adjustment.reason) {
    steps.push(adjustment.reason);
  }

  const finalDate = formatGermanDate(adjustment.date);

  const formatted = [
    `📅 **Fristenberechnung: ${getDeadlineTypeLabel(deadline_type)}**`,
    '',
    `**Fristende:** ${finalDate}`,
    adjustment.adjusted ? `*(${adjustment.reason})*` : '',
    '',
    `**Rechtsgrundlage:** ${legalBasis}`,
    '',
    '**Berechnungsschritte:**',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...(warnings.length > 0 ? [
      '⚠️ **Hinweise:**',
      ...warnings.map(w => `- ${w}`),
    ] : []),
  ].filter(Boolean).join('\n');

  return {
    deadline_date: finalDate,
    legal_basis: legalBasis,
    calculation_steps: steps,
    warnings,
    is_holiday_adjusted: adjustment.adjusted,
    formatted_output: formatted,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function addMonthsToEndOfMonth(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  // Set to last day of that month
  return new Date(result.getFullYear(), result.getMonth() + 1, 0);
}

function calculateMonthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function getDeadlineTypeLabel(type: DeadlineType): string {
  const labels: Record<DeadlineType, string> = {
    kuendigung_vermieter: 'Kuendigungsfrist Vermieter',
    kuendigung_mieter: 'Kuendigungsfrist Mieter',
    kuendigung_fristlos: 'Fristlose Kuendigung',
    mieterhoehung_ankuendigung: 'Mieterhoehung — Wirksamkeit',
    mieterhoehung_zustimmung: 'Mieterhoehung — Zustimmungsfrist',
    betriebskosten_abrechnung: 'Betriebskostenabrechnung',
    betriebskosten_widerspruch: 'BK-Widerspruchsfrist',
    mahnung_zahlungsfrist: 'Zahlungsfrist Mahnung',
    modernisierung_ankuendigung: 'Modernisierungsankuendigung',
    widerspruch_kuendigung: 'Kuendigungs-Widerspruch',
    kaution_rueckzahlung: 'Kautionsrueckzahlung',
  };
  return labels[type] || type;
}
