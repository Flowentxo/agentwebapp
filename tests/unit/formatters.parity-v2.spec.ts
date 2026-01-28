import { describe, it, expect } from 'vitest';
import {
  formatThousandsDE,
  formatPercentDE,
  formatMsToSecOneDecimal,
  formatTrendDE,
} from '@/lib/format/number';

describe('Dashboard Parity V2 - Number Formatters', () => {
  describe('formatThousandsDE', () => {
    it('should format numbers with German thousand separators', () => {
      expect(formatThousandsDE(1000)).toBe('1.000');
      expect(formatThousandsDE(1234567)).toBe('1.234.567');
      expect(formatThousandsDE(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(formatThousandsDE(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatThousandsDE(-1000)).toBe('-1.000');
      expect(formatThousandsDE(-1234567)).toBe('-1.234.567');
    });

    it('should handle very large numbers', () => {
      expect(formatThousandsDE(1000000000)).toBe('1.000.000.000');
      expect(formatThousandsDE(999999999999)).toBe('999.999.999.999');
    });

    it('should handle decimal numbers by rounding', () => {
      expect(formatThousandsDE(1234.56)).toBe('1.235');
      expect(formatThousandsDE(999.4)).toBe('999');
    });

    it('should handle single digit numbers', () => {
      expect(formatThousandsDE(1)).toBe('1');
      expect(formatThousandsDE(9)).toBe('9');
    });

    it('should handle numbers just below thousand threshold', () => {
      expect(formatThousandsDE(999)).toBe('999');
      expect(formatThousandsDE(998)).toBe('998');
    });

    it('should handle numbers just above thousand threshold', () => {
      expect(formatThousandsDE(1000)).toBe('1.000');
      expect(formatThousandsDE(1001)).toBe('1.001');
    });
  });

  describe('formatPercentDE', () => {
    it('should format percentages with German decimal separator', () => {
      expect(formatPercentDE(0.95)).toBe('95,0 %');
      expect(formatPercentDE(0.9876)).toBe('98,8 %');
      expect(formatPercentDE(0.123)).toBe('12,3 %');
    });

    it('should handle 100%', () => {
      expect(formatPercentDE(1.0)).toBe('100,0 %');
    });

    it('should handle 0%', () => {
      expect(formatPercentDE(0.0)).toBe('0,0 %');
    });

    it('should handle very small percentages', () => {
      expect(formatPercentDE(0.001)).toBe('0,1 %');
      expect(formatPercentDE(0.0001)).toBe('0,0 %');
    });

    it('should round to one decimal place', () => {
      expect(formatPercentDE(0.9876)).toBe('98,8 %');
      expect(formatPercentDE(0.9872)).toBe('98,7 %');
    });

    it('should handle edge cases near 100%', () => {
      expect(formatPercentDE(0.999)).toBe('99,9 %');
      expect(formatPercentDE(0.9999)).toBe('100,0 %');
    });

    it('should handle values slightly over 100%', () => {
      expect(formatPercentDE(1.01)).toBe('101,0 %');
      expect(formatPercentDE(1.5)).toBe('150,0 %');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentDE(-0.05)).toBe('-5,0 %');
    });
  });

  describe('formatMsToSecOneDecimal', () => {
    it('should convert milliseconds to seconds with one decimal', () => {
      expect(formatMsToSecOneDecimal(1000)).toBe('1,0 s');
      expect(formatMsToSecOneDecimal(1500)).toBe('1,5 s');
      expect(formatMsToSecOneDecimal(2345)).toBe('2,3 s');
    });

    it('should handle zero milliseconds', () => {
      expect(formatMsToSecOneDecimal(0)).toBe('0,0 s');
    });

    it('should handle sub-second values', () => {
      expect(formatMsToSecOneDecimal(100)).toBe('0,1 s');
      expect(formatMsToSecOneDecimal(500)).toBe('0,5 s');
      expect(formatMsToSecOneDecimal(999)).toBe('1,0 s');
    });

    it('should round to one decimal place', () => {
      expect(formatMsToSecOneDecimal(1234)).toBe('1,2 s');
      expect(formatMsToSecOneDecimal(1567)).toBe('1,6 s');
    });

    it('should handle large values', () => {
      expect(formatMsToSecOneDecimal(10000)).toBe('10,0 s');
      expect(formatMsToSecOneDecimal(60000)).toBe('60,0 s');
    });

    it('should handle very small values', () => {
      expect(formatMsToSecOneDecimal(1)).toBe('0,0 s');
      expect(formatMsToSecOneDecimal(50)).toBe('0,1 s');
    });

    it('should use German decimal separator', () => {
      const result = formatMsToSecOneDecimal(1500);
      expect(result).toContain(',');
      expect(result).not.toContain('.');
    });
  });

  describe('formatTrendDE', () => {
    it('should format positive trends with + sign', () => {
      expect(formatTrendDE(0.05)).toBe('+5,0 %');
      expect(formatTrendDE(0.123)).toBe('+12,3 %');
      expect(formatTrendDE(0.5)).toBe('+50,0 %');
    });

    it('should format negative trends with - sign', () => {
      expect(formatTrendDE(-0.05)).toBe('-5,0 %');
      expect(formatTrendDE(-0.123)).toBe('-12,3 %');
      expect(formatTrendDE(-0.5)).toBe('-50,0 %');
    });

    it('should format zero trend', () => {
      expect(formatTrendDE(0)).toBe('+0,0 %');
    });

    it('should round to one decimal place', () => {
      expect(formatTrendDE(0.1234)).toBe('+12,3 %');
      expect(formatTrendDE(-0.1567)).toBe('-15,7 %');
    });

    it('should handle very small positive trends', () => {
      expect(formatTrendDE(0.001)).toBe('+0,1 %');
      expect(formatTrendDE(0.0001)).toBe('+0,0 %');
    });

    it('should handle very small negative trends', () => {
      expect(formatTrendDE(-0.001)).toBe('-0,1 %');
      expect(formatTrendDE(-0.0001)).toBe('-0,0 %');
    });

    it('should handle large positive trends', () => {
      expect(formatTrendDE(1.0)).toBe('+100,0 %');
      expect(formatTrendDE(2.5)).toBe('+250,0 %');
    });

    it('should handle large negative trends', () => {
      expect(formatTrendDE(-1.0)).toBe('-100,0 %');
      expect(formatTrendDE(-0.99)).toBe('-99,0 %');
    });

    it('should use German decimal separator', () => {
      const result = formatTrendDE(0.123);
      expect(result).toContain(',');
      expect(result).not.toContain('.');
    });

    it('should handle edge case near zero positive', () => {
      expect(formatTrendDE(0.00001)).toBe('+0,0 %');
    });

    it('should handle edge case near zero negative', () => {
      expect(formatTrendDE(-0.00001)).toBe('-0,0 %');
    });
  });
});

describe('Dashboard Parity V2 - Edge Cases', () => {
  describe('Infinity and NaN handling', () => {
    it('should handle Infinity in formatThousandsDE', () => {
      const result = formatThousandsDE(Infinity);
      expect(result).toBe('∞');
    });

    it('should handle -Infinity in formatThousandsDE', () => {
      const result = formatThousandsDE(-Infinity);
      expect(result).toBe('-∞');
    });

    it('should handle NaN in formatThousandsDE', () => {
      const result = formatThousandsDE(NaN);
      expect(result).toBe('—');
    });

    it('should handle Infinity in formatPercentDE', () => {
      const result = formatPercentDE(Infinity);
      expect(result).toBe('∞ %');
    });

    it('should handle NaN in formatPercentDE', () => {
      const result = formatPercentDE(NaN);
      expect(result).toBe('— %');
    });

    it('should handle Infinity in formatMsToSecOneDecimal', () => {
      const result = formatMsToSecOneDecimal(Infinity);
      expect(result).toBe('∞ s');
    });

    it('should handle NaN in formatMsToSecOneDecimal', () => {
      const result = formatMsToSecOneDecimal(NaN);
      expect(result).toBe('— s');
    });

    it('should handle Infinity in formatTrendDE', () => {
      const result = formatTrendDE(Infinity);
      expect(result).toBe('+∞ %');
    });

    it('should handle NaN in formatTrendDE', () => {
      const result = formatTrendDE(NaN);
      expect(result).toBe('— %');
    });
  });

  describe('Precision and rounding edge cases', () => {
    it('should handle floating point precision issues', () => {
      // JavaScript floating point quirks
      expect(formatPercentDE(0.1 + 0.2)).toBe('30,0 %');
    });

    it('should consistently round 0.5 values', () => {
      // Banker's rounding or standard rounding
      expect(formatTrendDE(0.125)).toBe('+12,5 %');
      expect(formatTrendDE(0.135)).toBe('+13,5 %');
    });

    it('should handle very long decimal numbers', () => {
      expect(formatPercentDE(0.123456789012345)).toBe('12,3 %');
    });
  });
});

describe('Dashboard Parity V2 - Internationalization', () => {
  it('should consistently use German number formatting', () => {
    // All formatters should use comma for decimal, not period
    expect(formatPercentDE(0.5)).toContain(',');
    expect(formatMsToSecOneDecimal(1500)).toContain(',');
    expect(formatTrendDE(0.5)).toContain(',');
  });

  it('should use German thousand separator', () => {
    // Period for thousands, not comma
    expect(formatThousandsDE(1000)).toContain('.');
    expect(formatThousandsDE(1000)).not.toContain(',');
  });

  it('should use proper German units and symbols', () => {
    expect(formatPercentDE(0.5)).toContain('%');
    expect(formatPercentDE(0.5)).toContain(' '); // Space before %
    expect(formatMsToSecOneDecimal(1000)).toContain('s');
    expect(formatMsToSecOneDecimal(1000)).toContain(' '); // Space before s
  });
});

describe('Dashboard Parity V2 - Performance', () => {
  it('should format large batches efficiently', () => {
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      formatThousandsDE(i * 1000);
      formatPercentDE(i / 10000);
      formatMsToSecOneDecimal(i);
      formatTrendDE((i - 5000) / 10000);
    }

    const duration = performance.now() - start;

    // Should complete 40,000 format operations in under 1 second
    expect(duration).toBeLessThan(1000);
  });
});
