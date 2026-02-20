/**
 * Tenant Communicator Configuration
 *
 * Constants for notice templates, deadline tables, delivery methods,
 * and German federal holiday calendar.
 */

// ── Notice Types ──────────────────────────────────────────────────
export const NOTICE_TYPES = {
  kuendigung_ordentlich: {
    label: 'Ordentliche Kuendigung',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: true, // §568 BGB
    legalBasis: '§573 BGB',
  },
  kuendigung_fristlos: {
    label: 'Fristlose Kuendigung',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: true, // §568 BGB
    legalBasis: '§543 BGB',
  },
  mieterhoehung_mietspiegel: {
    label: 'Mieterhoehung (Mietspiegel)',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: true, // §558a BGB
    legalBasis: '§558 BGB',
  },
  mieterhoehung_modernisierung: {
    label: 'Mieterhoehung (Modernisierung)',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: true,
    legalBasis: '§559 BGB',
  },
  mahnung_miete: {
    label: 'Mahnung Mietzahlung',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: false,
    legalBasis: '§286 BGB',
  },
  abmahnung: {
    label: 'Abmahnung',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: false,
    legalBasis: '§541 BGB',
  },
  betriebskosten_abrechnung: {
    label: 'Betriebskostenabrechnung',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: false,
    legalBasis: '§556 Abs. 3 BGB',
  },
  modernisierung_ankuendigung: {
    label: 'Modernisierungsankuendigung',
    deliveryMethod: 'einschreiben_einwurf',
    requiresWrittenForm: true, // §555c BGB
    legalBasis: '§555c BGB',
  },
  info_schreiben: {
    label: 'Allgemeines Informationsschreiben',
    deliveryMethod: 'email',
    requiresWrittenForm: false,
    legalBasis: '',
  },
} as const;

export type NoticeType = keyof typeof NOTICE_TYPES;

// ── Delivery Methods ──────────────────────────────────────────────
export const DELIVERY_METHODS = {
  einschreiben_einwurf: {
    label: 'Einschreiben/Einwurf',
    proofLevel: 'high',
    description: 'Brief wird in den Briefkasten eingeworfen, Einlieferungsbeleg + Einwurfbestaetigung durch Deutsche Post.',
    legalNote: 'Empfohlen fuer Kuendigungen und Mieterhoehungen. Der Zugang gilt als bewiesen.',
  },
  einschreiben_rueckschein: {
    label: 'Einschreiben/Rueckschein',
    proofLevel: 'medium',
    description: 'Empfaenger muss persoenlich quittieren. ACHTUNG: Empfaenger kann Annahme verweigern!',
    legalNote: 'NICHT empfohlen fuer Kuendigungen! Bei Annahmeverweigerung gilt das Schreiben als NICHT zugegangen.',
  },
  bote: {
    label: 'Boten-Zustellung',
    proofLevel: 'high',
    description: 'Ein Bote (nicht der Vermieter selbst) wirft das Schreiben in den Briefkasten und bezeugt dies.',
    legalNote: 'Sehr sichere Zustellmethode. Der Bote muss den Inhalt kennen und als Zeuge aussagen koennen.',
  },
  persoenlich_quittung: {
    label: 'Persoenliche Uebergabe mit Quittung',
    proofLevel: 'high',
    description: 'Uebergabe an den Mieter mit Empfangsbestaetigung.',
    legalNote: 'Sicherste Methode, wenn Mieter kooperativ. Empfangsbestaetigung unterschreiben lassen.',
  },
  email: {
    label: 'E-Mail',
    proofLevel: 'low',
    description: 'Elektronischer Versand.',
    legalNote: 'Nicht ausreichend fuer formgebundene Erklaerungen (Kuendigung, Mieterhoehung). Nur fuer Informationsschreiben.',
  },
  fax: {
    label: 'Fax mit Sendebericht',
    proofLevel: 'medium',
    description: 'Fax mit OK-Sendebericht.',
    legalNote: 'Sendebericht beweist nur Versand, nicht Zugang. Textform (§126b BGB) ist erfuellt.',
  },
} as const;

export type DeliveryMethod = keyof typeof DELIVERY_METHODS;

// ── Kuendigungsfristen (§573c BGB) ───────────────────────────────
export const LANDLORD_NOTICE_PERIODS = [
  { maxMonths: 60, periodMonths: 3, label: 'Bis 5 Jahre Mietdauer', legalBasis: '§573c Abs. 1 S. 1 BGB' },
  { maxMonths: 96, periodMonths: 6, label: '5 bis 8 Jahre Mietdauer', legalBasis: '§573c Abs. 1 S. 2 BGB' },
  { maxMonths: Infinity, periodMonths: 9, label: 'Ueber 8 Jahre Mietdauer', legalBasis: '§573c Abs. 1 S. 3 BGB' },
] as const;

export const TENANT_NOTICE_PERIOD_MONTHS = 3; // §573c Abs. 1 BGB — immer 3 Monate

// ── German Federal Holidays ──────────────────────────────────────
// Fixed holidays (same every year)
export const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Neujahr' },
  { month: 5, day: 1, name: 'Tag der Arbeit' },
  { month: 10, day: 3, name: 'Tag der Deutschen Einheit' },
  { month: 12, day: 25, name: '1. Weihnachtsfeiertag' },
  { month: 12, day: 26, name: '2. Weihnachtsfeiertag' },
] as const;

// State-specific holidays
export const STATE_HOLIDAYS: Record<string, Array<{ month: number; day: number; name: string }>> = {
  BW: [{ month: 1, day: 6, name: 'Heilige Drei Koenige' }, { month: 11, day: 1, name: 'Allerheiligen' }],
  BY: [{ month: 1, day: 6, name: 'Heilige Drei Koenige' }, { month: 8, day: 15, name: 'Maria Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }],
  BE: [{ month: 3, day: 8, name: 'Internationaler Frauentag' }],
  BB: [{ month: 10, day: 31, name: 'Reformationstag' }],
  HB: [{ month: 10, day: 31, name: 'Reformationstag' }],
  HH: [{ month: 10, day: 31, name: 'Reformationstag' }],
  HE: [],
  MV: [{ month: 10, day: 31, name: 'Reformationstag' }],
  NI: [{ month: 10, day: 31, name: 'Reformationstag' }],
  NW: [{ month: 11, day: 1, name: 'Allerheiligen' }],
  RP: [{ month: 11, day: 1, name: 'Allerheiligen' }],
  SL: [{ month: 8, day: 15, name: 'Maria Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }],
  SN: [{ month: 10, day: 31, name: 'Reformationstag' }, { month: 11, day: 20, name: 'Buss- und Bettag' }],
  ST: [{ month: 1, day: 6, name: 'Heilige Drei Koenige' }, { month: 10, day: 31, name: 'Reformationstag' }],
  SH: [{ month: 10, day: 31, name: 'Reformationstag' }],
  TH: [{ month: 10, day: 31, name: 'Reformationstag' }, { month: 9, day: 20, name: 'Weltkindertag' }],
};

// ── Currency Helper ──────────────────────────────────────────────
/**
 * Format integer cents to EUR display string
 * @param cents Amount in cents (e.g., 75000 = 750,00 €)
 */
export function formatEurCents(cents: number): string {
  const euros = cents / 100;
  return euros.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

/**
 * Parse German EUR string to integer cents
 * @param eurString e.g. "750,00 €" or "750.00"
 */
export function parseEurToCents(eurString: string): number {
  const cleaned = eurString.replace(/[€\s.]/g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned) * 100);
}

// ── Date Helper ──────────────────────────────────────────────────
/**
 * Parse DD.MM.YYYY to Date object
 */
export function parseGermanDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format Date to DD.MM.YYYY
 */
export function formatGermanDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Check if a date is a holiday in a given state
 */
export function isHoliday(date: Date, state?: string): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Check fixed holidays
  if (FIXED_HOLIDAYS.some(h => h.month === month && h.day === day)) return true;

  // Check state-specific holidays
  if (state && STATE_HOLIDAYS[state]) {
    if (STATE_HOLIDAYS[state].some(h => h.month === month && h.day === day)) return true;
  }

  // Easter-dependent holidays (Karfreitag, Ostermontag, Christi Himmelfahrt, Pfingstmontag)
  // Simplified: use Gauss Easter algorithm
  const year = date.getFullYear();
  const easter = calculateEasterDate(year);
  const easterDependentOffsets = [
    { offset: -2, name: 'Karfreitag' },
    { offset: 1, name: 'Ostermontag' },
    { offset: 39, name: 'Christi Himmelfahrt' },
    { offset: 50, name: 'Pfingstmontag' },
    { offset: 60, name: 'Fronleichnam' }, // Only BW, BY, HE, NW, RP, SL
  ];

  for (const { offset, name } of easterDependentOffsets) {
    const holiday = new Date(easter);
    holiday.setDate(holiday.getDate() + offset);
    if (holiday.getMonth() === date.getMonth() && holiday.getDate() === date.getDate()) {
      // Fronleichnam only in certain states
      if (name === 'Fronleichnam') {
        const fronleichnamStates = ['BW', 'BY', 'HE', 'NW', 'RP', 'SL', 'SN', 'TH'];
        return state ? fronleichnamStates.includes(state) : false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Adjust date to next business day if it falls on weekend/holiday (§193 BGB)
 */
export function adjustToBusinessDay(date: Date, state?: string): { date: Date; adjusted: boolean; reason?: string } {
  const original = new Date(date);
  let adjusted = false;
  let reason: string | undefined;

  while (isWeekend(date) || isHoliday(date, state)) {
    if (isWeekend(date)) {
      reason = `Fristende fiel auf ${date.getDay() === 0 ? 'Sonntag' : 'Samstag'}, verschoben auf naechsten Werktag (§193 BGB)`;
    } else {
      reason = `Fristende fiel auf Feiertag, verschoben auf naechsten Werktag (§193 BGB)`;
    }
    date.setDate(date.getDate() + 1);
    adjusted = true;
  }

  return { date, adjusted, reason };
}

/**
 * Calculate Easter date using Gauss algorithm
 */
function calculateEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
