import { describe, it, expect, vi } from 'vitest';
import { trackDelivery, type DeliveryTrackerInput } from '@/lib/agents/tenant-communicator/tools/delivery-tracker';

// Mock DB
vi.mock('@/lib/db/connection', () => ({
  getDb: () => ({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  }),
}));

describe('delivery_tracker', () => {
  describe('recommend action', () => {
    it('returns general recommendation without notice_type', async () => {
      const result = await trackDelivery({ action: 'recommend' }, 'test-user');
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation!.primary.method).toBe('einschreiben_einwurf');
    });

    it('recommends einschreiben_einwurf for Kuendigung', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'kuendigung_ordentlich',
      }, 'test-user');
      expect(result.recommendation!.primary.method).toBe('einschreiben_einwurf');
    });

    it('warns against einschreiben_rueckschein for Kuendigung', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'kuendigung_ordentlich',
      }, 'test-user');
      expect(result.recommendation!.avoid).toBeDefined();
      expect(result.recommendation!.avoid!.method).toBe('einschreiben_rueckschein');
    });

    it('recommends bote as alternative for Kuendigung', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'kuendigung_fristlos',
      }, 'test-user');
      expect(result.recommendation!.alternative.method).toBe('bote');
    });

    it('recommends email for info_schreiben', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'info_schreiben',
      }, 'test-user');
      expect(result.recommendation!.primary.method).toBe('email');
    });

    it('notes Schriftform requirement for form-bound notices', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'kuendigung_ordentlich',
      }, 'test-user');
      expect(result.legal_notes.some(n => n.includes('Schriftform'))).toBe(true);
    });

    it('recommends persoenlich_quittung for Mieterhoehung', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'mieterhoehung_mietspiegel',
      }, 'test-user');
      expect(result.recommendation!.alternative.method).toBe('persoenlich_quittung');
    });

    it('mentions Textform for Mieterhoehung', async () => {
      const result = await trackDelivery({
        action: 'recommend',
        notice_type: 'mieterhoehung_mietspiegel',
      }, 'test-user');
      expect(result.legal_notes.some(n => n.includes('Textform'))).toBe(true);
    });
  });

  describe('verify action', () => {
    it('returns error without delivery_method', async () => {
      const result = await trackDelivery({ action: 'verify' }, 'test-user');
      expect(result.formatted_output).toContain('erforderlich');
    });

    it('verifies einschreiben_einwurf with tracking number', async () => {
      const result = await trackDelivery({
        action: 'verify',
        delivery_method: 'einschreiben_einwurf',
        tracking_number: 'RR123456789DE',
      }, 'test-user');
      expect(result.formatted_output).toContain('RR123456789DE');
      expect(result.formatted_output).toContain('Hoch');
    });

    it('verifies bote with witness name', async () => {
      const result = await trackDelivery({
        action: 'verify',
        delivery_method: 'bote',
        witness_name: 'Peter Zeuge',
      }, 'test-user');
      expect(result.formatted_output).toContain('Peter Zeuge');
      expect(result.legal_notes.some(n => n.includes('Zeuge'))).toBe(true);
    });

    it('warns about einschreiben_rueckschein Annahmeverweigerung', async () => {
      const result = await trackDelivery({
        action: 'verify',
        delivery_method: 'einschreiben_rueckschein',
      }, 'test-user');
      expect(result.formatted_output).toContain('verweigert');
    });

    it('warns about email not meeting Schriftform', async () => {
      const result = await trackDelivery({
        action: 'verify',
        delivery_method: 'email',
      }, 'test-user');
      expect(result.formatted_output).toContain('Schriftform');
    });

    it('shows proof level indicator', async () => {
      const result = await trackDelivery({
        action: 'verify',
        delivery_method: 'einschreiben_einwurf',
      }, 'test-user');
      expect(result.formatted_output).toContain('Hoch');
    });

    it('handles unknown delivery method', async () => {
      const result = await trackDelivery({
        action: 'verify',
        delivery_method: 'pigeon_post' as any,
      }, 'test-user');
      expect(result.formatted_output).toContain('Unbekannte');
    });
  });

  describe('list action', () => {
    it('returns empty list when no entries', async () => {
      const result = await trackDelivery({ action: 'list' }, 'test-user');
      expect(result.formatted_output).toContain('Keine');
    });
  });

  describe('track action', () => {
    it('requires notice_id', async () => {
      const result = await trackDelivery({ action: 'track' }, 'test-user');
      expect(result.formatted_output).toContain('notice_id');
    });
  });

  describe('unknown action', () => {
    it('handles gracefully', async () => {
      const result = await trackDelivery({ action: 'unknown' as any }, 'test-user');
      expect(result.formatted_output).toContain('Unbekannte');
    });
  });
});
