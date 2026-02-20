import { describe, it, expect } from 'vitest';
import { calculateDeadline, type DeadlineCalculatorInput } from '@/lib/agents/tenant-communicator/tools/deadline-calculator';
import { parseGermanDate } from '@/lib/agents/tenant-communicator/config';

function makeInput(overrides: Partial<DeadlineCalculatorInput> = {}): DeadlineCalculatorInput {
  return {
    deadline_type: 'kuendigung_vermieter',
    reference_date: '01.01.2020',
    ...overrides,
  };
}

describe('deadline_calculator', () => {
  describe('kuendigung_vermieter', () => {
    it('returns legal basis §573c', async () => {
      const result = await calculateDeadline(makeInput({ tenancy_duration_months: 24 }));
      expect(result.legal_basis).toContain('§573c');
    });

    it('calculates 3-month frist for < 5 years', async () => {
      const result = await calculateDeadline(makeInput({ tenancy_duration_months: 24 }));
      expect(result.calculation_steps.some(s => s.includes('3 Monate'))).toBe(true);
    });

    it('calculates 6-month frist for 5-8 years', async () => {
      const result = await calculateDeadline(makeInput({ tenancy_duration_months: 72 }));
      expect(result.calculation_steps.some(s => s.includes('6 Monate'))).toBe(true);
    });

    it('calculates 9-month frist for > 8 years', async () => {
      const result = await calculateDeadline(makeInput({ tenancy_duration_months: 120 }));
      expect(result.calculation_steps.some(s => s.includes('9 Monate'))).toBe(true);
    });

    it('warns about 3. Werktag rule', async () => {
      const result = await calculateDeadline(makeInput({ tenancy_duration_months: 24 }));
      expect(result.warnings.some(w => w.includes('3. Werktag'))).toBe(true);
    });

    it('returns a valid DD.MM.YYYY deadline', async () => {
      const result = await calculateDeadline(makeInput({ tenancy_duration_months: 24 }));
      expect(result.deadline_date).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });
  });

  describe('kuendigung_mieter', () => {
    it('always uses 3-month frist', async () => {
      const result = await calculateDeadline(makeInput({ deadline_type: 'kuendigung_mieter' }));
      expect(result.calculation_steps.some(s => s.includes('3 Monate'))).toBe(true);
      expect(result.legal_basis).toContain('§573c');
    });
  });

  describe('kuendigung_fristlos', () => {
    it('is immediate', async () => {
      const result = await calculateDeadline(makeInput({ deadline_type: 'kuendigung_fristlos' }));
      expect(result.legal_basis).toContain('§543');
      expect(result.calculation_steps.some(s => s.includes('sofort'))).toBe(true);
    });

    it('warns about Abmahnung', async () => {
      const result = await calculateDeadline(makeInput({ deadline_type: 'kuendigung_fristlos' }));
      expect(result.warnings.some(w => w.toLowerCase().includes('abmahnung'))).toBe(true);
    });
  });

  describe('mieterhoehung_ankuendigung', () => {
    it('calculates end of 2nd month after Zugang', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'mieterhoehung_ankuendigung',
        reference_date: '15.01.2026',
      }));
      expect(result.legal_basis).toContain('§558b');
      // January + 2 months = end of March
      expect(result.deadline_date).toContain('03.2026');
    });
  });

  describe('mieterhoehung_zustimmung', () => {
    it('warns about Zustimmungsklage', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'mieterhoehung_zustimmung',
        reference_date: '15.01.2026',
      }));
      expect(result.warnings.some(w => w.includes('klagen'))).toBe(true);
    });
  });

  describe('betriebskosten_abrechnung', () => {
    it('calculates 12-month frist from period end', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'betriebskosten_abrechnung',
        reference_date: '31.12.2025',
        abrechnungszeitraum_end: '31.12.2025',
      }));
      expect(result.legal_basis).toContain('§556');
      expect(result.deadline_date).toContain('2026');
    });

    it('warns about Ausschlussfrist', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'betriebskosten_abrechnung',
        abrechnungszeitraum_end: '31.12.2025',
      }));
      expect(result.warnings.some(w => w.includes('AUSSCHLUSSFRIST'))).toBe(true);
    });
  });

  describe('betriebskosten_widerspruch', () => {
    it('calculates 12-month Widerspruchsfrist', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'betriebskosten_widerspruch',
        reference_date: '15.06.2026',
      }));
      expect(result.legal_basis).toContain('§556');
    });
  });

  describe('mahnung_zahlungsfrist', () => {
    it('calculates 14-day frist', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'mahnung_zahlungsfrist',
        reference_date: '01.03.2026',
      }));
      expect(result.calculation_steps.some(s => s.includes('14 Tage'))).toBe(true);
      // 15.03.2026 is a Sunday → §193 BGB adjusts to Monday 16.03
      expect(result.deadline_date).toContain('16.03.2026');
    });
  });

  describe('modernisierung_ankuendigung', () => {
    it('calculates 3-month Ankuendigungsfrist', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'modernisierung_ankuendigung',
        reference_date: '01.01.2026',
      }));
      expect(result.legal_basis).toContain('§555c');
      expect(result.deadline_date).toContain('04.2026');
    });
  });

  describe('widerspruch_kuendigung', () => {
    it('calculates 2 months before Mietende', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'widerspruch_kuendigung',
        reference_date: '30.06.2026',
      }));
      expect(result.legal_basis).toContain('§574b');
      expect(result.deadline_date).toContain('04.2026');
    });
  });

  describe('kaution_rueckzahlung', () => {
    it('calculates 6-month Pruefungsfrist', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'kaution_rueckzahlung',
        reference_date: '01.01.2026',
      }));
      expect(result.legal_basis).toContain('§551');
      expect(result.deadline_date).toContain('07.2026');
    });

    it('warns about BK Einbehalt', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'kaution_rueckzahlung',
      }));
      expect(result.warnings.some(w => w.includes('einbehalten'))).toBe(true);
    });
  });

  describe('§193 BGB adjustment', () => {
    it('adjusts deadline falling on Saturday', async () => {
      // 15.03.2026 is a Sunday → should adjust
      const result = await calculateDeadline(makeInput({
        deadline_type: 'mahnung_zahlungsfrist',
        reference_date: '01.03.2026', // +14 = 15.03 (Sunday)
      }));
      // The deadline should be adjusted to Monday 16.03.2026
      const deadlineDate = parseGermanDate(result.deadline_date);
      expect(deadlineDate.getDay()).not.toBe(0); // Not Sunday
      expect(deadlineDate.getDay()).not.toBe(6); // Not Saturday
    });

    it('produces non-empty formatted_output', async () => {
      const result = await calculateDeadline(makeInput());
      expect(result.formatted_output.length).toBeGreaterThan(50);
    });
  });

  describe('Error handling', () => {
    it('handles unknown deadline type', async () => {
      const result = await calculateDeadline(makeInput({
        deadline_type: 'nonexistent' as any,
      }));
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
