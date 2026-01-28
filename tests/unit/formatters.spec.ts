import { describe, it, expect } from 'vitest';
import {
  formatThousandsDE,
  formatPercentDE,
  formatMsToSecOneDecimal,
  formatTrendDE,
  formatRelativeTime,
} from '@/lib/format/number';

describe('formatThousandsDE', () => {
  it('should format numbers below 1000', () => {
    expect(formatThousandsDE(500)).toBe('500');
    expect(formatThousandsDE(0)).toBe('0');
  });

  it('should format thousands with Tsd. suffix', () => {
    expect(formatThousandsDE(1000)).toBe('1 Tsd.');
    expect(formatThousandsDE(5400)).toBe('5,4 Tsd.');
    expect(formatThousandsDE(12345)).toBe('12,3 Tsd.');
  });

  it('should format millions with Mio. suffix', () => {
    expect(formatThousandsDE(1000000)).toBe('1 Mio.');
    expect(formatThousandsDE(1500000)).toBe('1,5 Mio.');
    expect(formatThousandsDE(12345678)).toBe('12,3 Mio.');
  });
});

describe('formatPercentDE', () => {
  it('should format percentages with comma as decimal separator', () => {
    expect(formatPercentDE(96.8)).toBe('96,8 %');
    expect(formatPercentDE(100)).toBe('100 %');
    expect(formatPercentDE(0.5)).toBe('0,5 %');
  });

  it('should round to one decimal place', () => {
    expect(formatPercentDE(96.88)).toBe('96,9 %');
    expect(formatPercentDE(96.82)).toBe('96,8 %');
  });
});

describe('formatMsToSecOneDecimal', () => {
  it('should convert milliseconds to seconds', () => {
    expect(formatMsToSecOneDecimal(1000)).toBe('1 s');
    expect(formatMsToSecOneDecimal(1200)).toBe('1,2 s');
    expect(formatMsToSecOneDecimal(800)).toBe('0,8 s');
  });

  it('should use comma as decimal separator', () => {
    expect(formatMsToSecOneDecimal(1500)).toBe('1,5 s');
    expect(formatMsToSecOneDecimal(2345)).toBe('2,3 s');
  });
});

describe('formatTrendDE', () => {
  it('should format positive trends with + sign', () => {
    expect(formatTrendDE(4.5)).toBe('+4,5 %');
    expect(formatTrendDE(0.1)).toBe('+0,1 %');
  });

  it('should format negative trends with - sign', () => {
    expect(formatTrendDE(-1.2)).toBe('-1,2 %');
    expect(formatTrendDE(-5.8)).toBe('-5,8 %');
  });

  it('should format zero with + sign', () => {
    expect(formatTrendDE(0)).toBe('+0 %');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date();

  it('should format recent times as "Gerade eben"', () => {
    const recent = new Date(now.getTime() - 30000); // 30 seconds ago
    expect(formatRelativeTime(recent.toISOString())).toBe('Gerade eben');
  });

  it('should format minutes', () => {
    const mins15 = new Date(now.getTime() - 15 * 60000); // 15 min ago
    expect(formatRelativeTime(mins15.toISOString())).toBe('vor 15 Min.');
  });

  it('should format hours', () => {
    const hours2 = new Date(now.getTime() - 2 * 3600000); // 2 hours ago
    expect(formatRelativeTime(hours2.toISOString())).toBe('vor 2 Std.');
  });

  it('should format days', () => {
    const days3 = new Date(now.getTime() - 3 * 86400000); // 3 days ago
    expect(formatRelativeTime(days3.toISOString())).toBe('vor 3 Tagen');
  });
});
