import { describe, it, expect } from 'vitest';
import {
  formatEurCents,
  parseEurToCents,
  parseGermanDate,
  formatGermanDate,
  isHoliday,
  isWeekend,
  adjustToBusinessDay,
  NOTICE_TYPES,
  DELIVERY_METHODS,
  LANDLORD_NOTICE_PERIODS,
  TENANT_NOTICE_PERIOD_MONTHS,
} from '@/lib/agents/tenant-communicator/config';

describe('formatEurCents', () => {
  it('formats integer cents to EUR string', () => {
    const result = formatEurCents(75000);
    expect(result).toContain('750');
    expect(result).toContain('€');
  });

  it('handles zero', () => {
    const result = formatEurCents(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('handles single-digit cents', () => {
    const result = formatEurCents(1);
    expect(result).toContain('€');
  });

  it('handles large amounts', () => {
    const result = formatEurCents(123456789);
    expect(result).toContain('€');
  });
});

describe('parseEurToCents', () => {
  it('parses German EUR string to integer cents', () => {
    expect(parseEurToCents('750,00')).toBe(75000);
  });

  it('parses EUR string with € symbol', () => {
    const result = parseEurToCents('750,00 €');
    expect(result).toBe(75000);
  });

  it('handles decimal precision', () => {
    expect(parseEurToCents('10,50')).toBe(1050);
  });
});

describe('parseGermanDate', () => {
  it('parses DD.MM.YYYY to Date', () => {
    const date = parseGermanDate('15.03.2026');
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(2); // March = 2
    expect(date.getFullYear()).toBe(2026);
  });

  it('parses first day of year', () => {
    const date = parseGermanDate('01.01.2026');
    expect(date.getDate()).toBe(1);
    expect(date.getMonth()).toBe(0);
    expect(date.getFullYear()).toBe(2026);
  });

  it('parses last day of year', () => {
    const date = parseGermanDate('31.12.2026');
    expect(date.getDate()).toBe(31);
    expect(date.getMonth()).toBe(11);
  });
});

describe('formatGermanDate', () => {
  it('formats Date to DD.MM.YYYY', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026
    expect(formatGermanDate(date)).toBe('15.03.2026');
  });

  it('pads single-digit days and months', () => {
    const date = new Date(2026, 0, 5); // Jan 5
    expect(formatGermanDate(date)).toBe('05.01.2026');
  });

  it('roundtrips with parseGermanDate', () => {
    const original = '28.02.2026';
    const parsed = parseGermanDate(original);
    expect(formatGermanDate(parsed)).toBe(original);
  });
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    // 2026-02-21 is a Saturday
    expect(isWeekend(new Date(2026, 1, 21))).toBe(true);
  });

  it('returns true for Sunday', () => {
    // 2026-02-22 is a Sunday
    expect(isWeekend(new Date(2026, 1, 22))).toBe(true);
  });

  it('returns false for Monday', () => {
    // 2026-02-23 is a Monday
    expect(isWeekend(new Date(2026, 1, 23))).toBe(false);
  });

  it('returns false for Wednesday', () => {
    // 2026-02-18 is a Wednesday
    expect(isWeekend(new Date(2026, 1, 18))).toBe(false);
  });
});

describe('isHoliday', () => {
  it('detects Neujahr (Jan 1)', () => {
    expect(isHoliday(new Date(2026, 0, 1))).toBe(true);
  });

  it('detects Tag der Deutschen Einheit (Oct 3)', () => {
    expect(isHoliday(new Date(2026, 9, 3))).toBe(true);
  });

  it('detects 1. Weihnachtsfeiertag (Dec 25)', () => {
    expect(isHoliday(new Date(2026, 11, 25))).toBe(true);
  });

  it('detects 2. Weihnachtsfeiertag (Dec 26)', () => {
    expect(isHoliday(new Date(2026, 11, 26))).toBe(true);
  });

  it('does not flag a regular work day', () => {
    // 2026-03-10 is a Tuesday, not a holiday
    expect(isHoliday(new Date(2026, 2, 10))).toBe(false);
  });

  it('detects Karfreitag (Easter-dependent)', () => {
    // Easter 2026 is April 5 → Karfreitag is April 3
    expect(isHoliday(new Date(2026, 3, 3))).toBe(true);
  });

  it('detects Ostermontag (Easter-dependent)', () => {
    // Easter 2026 is April 5 → Ostermontag is April 6
    expect(isHoliday(new Date(2026, 3, 6))).toBe(true);
  });

  it('detects state-specific Heilige Drei Koenige in BW', () => {
    expect(isHoliday(new Date(2026, 0, 6), 'BW')).toBe(true);
  });

  it('does not detect Heilige Drei Koenige in Berlin', () => {
    expect(isHoliday(new Date(2026, 0, 6), 'BE')).toBe(false);
  });

  it('detects Reformationstag in Brandenburg', () => {
    expect(isHoliday(new Date(2026, 9, 31), 'BB')).toBe(true);
  });
});

describe('adjustToBusinessDay', () => {
  it('does not adjust a weekday non-holiday', () => {
    const date = new Date(2026, 2, 10); // Tuesday March 10
    const result = adjustToBusinessDay(date);
    expect(result.adjusted).toBe(false);
  });

  it('adjusts Saturday to Monday', () => {
    const date = new Date(2026, 1, 21); // Saturday
    const result = adjustToBusinessDay(date);
    expect(result.adjusted).toBe(true);
    expect(result.date.getDay()).toBe(1); // Monday
  });

  it('adjusts Sunday to Monday', () => {
    const date = new Date(2026, 1, 22); // Sunday
    const result = adjustToBusinessDay(date);
    expect(result.adjusted).toBe(true);
    expect(result.date.getDay()).toBe(1); // Monday
  });

  it('provides reason for adjustment', () => {
    const date = new Date(2026, 1, 21); // Saturday
    const result = adjustToBusinessDay(date);
    expect(result.reason).toContain('§193 BGB');
  });

  it('adjusts holiday to next business day', () => {
    const date = new Date(2026, 0, 1); // Neujahr (Thursday)
    const result = adjustToBusinessDay(date);
    expect(result.adjusted).toBe(true);
    expect(result.date.getDate()).toBe(2); // Friday Jan 2
  });
});

describe('Constants', () => {
  it('NOTICE_TYPES has 9 entries', () => {
    expect(Object.keys(NOTICE_TYPES).length).toBe(9);
  });

  it('DELIVERY_METHODS has 6 entries', () => {
    expect(Object.keys(DELIVERY_METHODS).length).toBe(6);
  });

  it('LANDLORD_NOTICE_PERIODS has 3 tiers', () => {
    expect(LANDLORD_NOTICE_PERIODS.length).toBe(3);
  });

  it('TENANT_NOTICE_PERIOD_MONTHS is 3', () => {
    expect(TENANT_NOTICE_PERIOD_MONTHS).toBe(3);
  });

  it('all notice types have legalBasis field', () => {
    for (const [key, config] of Object.entries(NOTICE_TYPES)) {
      expect(config).toHaveProperty('legalBasis');
      expect(config).toHaveProperty('deliveryMethod');
      expect(config).toHaveProperty('requiresWrittenForm');
    }
  });

  it('all delivery methods have proofLevel', () => {
    for (const [key, method] of Object.entries(DELIVERY_METHODS)) {
      expect(['high', 'medium', 'low']).toContain(method.proofLevel);
    }
  });
});
