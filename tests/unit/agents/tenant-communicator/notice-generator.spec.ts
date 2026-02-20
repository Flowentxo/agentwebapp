import { describe, it, expect } from 'vitest';
import { generateNotice, type NoticeGeneratorInput } from '@/lib/agents/tenant-communicator/tools/notice-generator';

// Base input factory
function makeInput(overrides: Partial<NoticeGeneratorInput> = {}): NoticeGeneratorInput {
  return {
    notice_type: 'kuendigung_ordentlich',
    landlord: { name: 'Max Vermieter', address: 'Berliner Str. 1, 10115 Berlin' },
    tenant: { name: 'Anna Mieterin', address: 'Musterstr. 5, 10115 Berlin' },
    property: { address: 'Musterstr. 5, 10115 Berlin', unit: 'Wohnung 3.OG links' },
    ...overrides,
  };
}

describe('notice_generator', () => {
  describe('ordentliche Kuendigung', () => {
    it('generates document with correct Betreff', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('Ordentliche Kuendigung');
    });

    it('includes §573 BGB in legal references', async () => {
      const result = await generateNotice(makeInput());
      expect(result.legal_references).toContain('§573 BGB');
      expect(result.legal_references).toContain('§573c BGB');
      expect(result.legal_references).toContain('§568 BGB');
    });

    it('warns about eigenhaendige Unterschrift', async () => {
      const result = await generateNotice(makeInput());
      expect(result.warnings.some(w => w.includes('unterschrieben'))).toBe(true);
    });

    it('includes Widerspruchsrecht §574 BGB', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('§574 BGB');
    });

    it('includes reason when provided', async () => {
      const result = await generateNotice(makeInput({ reason: 'Eigenbedarf' }));
      expect(result.document).toContain('Eigenbedarf');
    });

    it('includes contract start date when provided', async () => {
      const result = await generateNotice(makeInput({
        contract_details: { start_date: '01.01.2020' },
      }));
      expect(result.document).toContain('01.01.2020');
    });

    it('recommends einschreiben_einwurf delivery', async () => {
      const result = await generateNotice(makeInput());
      expect(result.delivery_method).toBe('einschreiben_einwurf');
    });

    it('produces non-empty formatted_output', async () => {
      const result = await generateNotice(makeInput());
      expect(result.formatted_output.length).toBeGreaterThan(100);
    });

    it('includes disclaimer', async () => {
      const result = await generateNotice(makeInput());
      expect(result.formatted_output).toContain('Vorlage');
    });
  });

  describe('fristlose Kuendigung', () => {
    it('references §543 BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'kuendigung_fristlos' }));
      expect(result.legal_references).toContain('§543 BGB');
    });

    it('includes hilfsweise ordentliche Kuendigung', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'kuendigung_fristlos' }));
      expect(result.document.toLowerCase()).toContain('hilfsweise');
    });

    it('warns about Abmahnung requirement', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'kuendigung_fristlos' }));
      expect(result.warnings.some(w => w.toLowerCase().includes('abmahnung'))).toBe(true);
    });
  });

  describe('Mieterhoehung (Mietspiegel)', () => {
    it('references §558 BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mieterhoehung_mietspiegel' }));
      expect(result.legal_references).toContain('§558 BGB');
    });

    it('formats cent amounts correctly', async () => {
      const result = await generateNotice(makeInput({
        notice_type: 'mieterhoehung_mietspiegel',
        contract_details: { current_rent_cents: 75000, new_rent_cents: 82500 },
      }));
      expect(result.document).toContain('750');
      expect(result.document).toContain('825');
    });

    it('warns about Kappungsgrenze', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mieterhoehung_mietspiegel' }));
      expect(result.warnings.some(w => w.includes('Kappungsgrenze') || w.includes('20%'))).toBe(true);
    });

    it('warns when no reason provided', async () => {
      const result = await generateNotice(makeInput({
        notice_type: 'mieterhoehung_mietspiegel',
        reason: undefined,
      }));
      expect(result.warnings.some(w => w.includes('begruendet'))).toBe(true);
    });
  });

  describe('Mieterhoehung (Modernisierung)', () => {
    it('references §559 BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mieterhoehung_modernisierung' }));
      expect(result.legal_references).toContain('§559 BGB');
    });

    it('warns about 8% cap', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mieterhoehung_modernisierung' }));
      expect(result.warnings.some(w => w.includes('8%'))).toBe(true);
    });
  });

  describe('Mahnung Miete', () => {
    it('references §286 BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mahnung_miete' }));
      expect(result.legal_references).toContain('§286 BGB');
    });

    it('mentions Zahlungsverzug consequence', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mahnung_miete' }));
      expect(result.document).toContain('§543');
    });

    it('includes deadline_date when provided', async () => {
      const result = await generateNotice(makeInput({
        notice_type: 'mahnung_miete',
        deadline_date: '15.04.2026',
      }));
      expect(result.document).toContain('15.04.2026');
    });
  });

  describe('Abmahnung', () => {
    it('references §541 BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'abmahnung' }));
      expect(result.legal_references).toContain('§541 BGB');
    });

    it('warns about Kuendigung consequence', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'abmahnung' }));
      expect(result.warnings.some(w => w.includes('Kuendigung'))).toBe(true);
    });
  });

  describe('Betriebskostenabrechnung', () => {
    it('references §556 BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'betriebskosten_abrechnung' }));
      expect(result.legal_references).toContain('§556 BGB');
    });

    it('warns about 12-month Ausschlussfrist', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'betriebskosten_abrechnung' }));
      expect(result.warnings.some(w => w.includes('12 Monaten'))).toBe(true);
    });
  });

  describe('Modernisierungsankuendigung', () => {
    it('references §555c BGB', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'modernisierung_ankuendigung' }));
      expect(result.legal_references).toContain('§555c BGB');
    });

    it('warns about 3-month Ankuendigungsfrist', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'modernisierung_ankuendigung' }));
      expect(result.warnings.some(w => w.includes('3 Monate'))).toBe(true);
    });
  });

  describe('Info Schreiben', () => {
    it('generates simple info letter', async () => {
      const result = await generateNotice(makeInput({
        notice_type: 'info_schreiben',
        custom_text: 'Bitte beachten Sie den neuen Muellabfuhrplan.',
      }));
      expect(result.document).toContain('Muellabfuhrplan');
      expect(result.document).toContain('Mitteilung');
    });
  });

  describe('Header & Footer', () => {
    it('includes landlord name in header', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('Max Vermieter');
    });

    it('includes tenant name in header', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('Anna Mieterin');
    });

    it('includes property address', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('Musterstr. 5');
    });

    it('includes unit when provided', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('Wohnung 3.OG links');
    });

    it('includes signature line for Schriftform notices', async () => {
      const result = await generateNotice(makeInput());
      expect(result.document).toContain('Eigenhaendige Unterschrift');
    });

    it('does not include signature line for formfrei notices', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'mahnung_miete' }));
      expect(result.document).not.toContain('Eigenhaendige Unterschrift');
    });
  });

  describe('Error handling', () => {
    it('handles unknown notice type gracefully', async () => {
      const result = await generateNotice(makeInput({ notice_type: 'nonexistent' as any }));
      expect(result.document).toBe('');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
