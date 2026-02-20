import { describe, it, expect, vi } from 'vitest';
import { manageCommunicationLog, type CommunicationLogInput } from '@/lib/agents/tenant-communicator/tools/communication-log';

// Mock DB with chainable query builder
vi.mock('@/lib/db/connection', () => ({
  getDb: () => ({
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{
          id: 'test-uuid-1',
          tenantName: 'Max Mustermann',
          propertyAddress: 'Musterstr. 1',
          eventType: 'schreiben_gesendet',
          subject: 'Test Betreff',
          content: null,
          createdAt: new Date(2026, 1, 18),
          updatedAt: new Date(2026, 1, 18),
          deadlineDate: null,
          deliveryStatus: 'pending',
        }]),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    }),
  }),
}));

describe('communication_log', () => {
  describe('add action', () => {
    it('requires entry parameter', async () => {
      const result = await manageCommunicationLog({ action: 'add' }, 'test-user');
      expect(result.formatted_output).toContain('erforderlich');
    });

    it('requires tenant_name, property_address, event_type, subject', async () => {
      const result = await manageCommunicationLog({
        action: 'add',
        entry: {
          tenant_name: '',
          property_address: '',
          event_type: 'notiz',
          subject: '',
        },
      }, 'test-user');
      expect(result.formatted_output).toContain('Pflichtfelder');
    });

    it('adds entry with all required fields', async () => {
      const result = await manageCommunicationLog({
        action: 'add',
        entry: {
          tenant_name: 'Max Mustermann',
          property_address: 'Musterstr. 1, Berlin',
          event_type: 'schreiben_gesendet',
          subject: 'Kuendigung gesendet',
        },
      }, 'test-user');
      expect(result.formatted_output).toContain('hinzugefuegt');
      expect(result.formatted_output).toContain('Max Mustermann');
    });

    it('returns log entry with ID', async () => {
      const result = await manageCommunicationLog({
        action: 'add',
        entry: {
          tenant_name: 'Max Mustermann',
          property_address: 'Musterstr. 1',
          event_type: 'schreiben_gesendet',
          subject: 'Test',
        },
      }, 'test-user');
      expect(result.entries).toBeDefined();
      expect(result.entries!.length).toBe(1);
      expect(result.entries![0].id).toBe('test-uuid-1');
    });
  });

  describe('list action', () => {
    it('returns empty list when no entries', async () => {
      const result = await manageCommunicationLog({ action: 'list' }, 'test-user');
      expect(result.formatted_output).toContain('Keine');
    });

    it('accepts filter parameters', async () => {
      const result = await manageCommunicationLog({
        action: 'list',
        filter: { tenant_name: 'Mustermann' },
      }, 'test-user');
      // Should not throw
      expect(result.formatted_output).toBeDefined();
    });
  });

  describe('search action', () => {
    it('works like list with filters', async () => {
      const result = await manageCommunicationLog({
        action: 'search',
        filter: { event_type: 'schreiben_gesendet' },
      }, 'test-user');
      expect(result.formatted_output).toBeDefined();
    });
  });

  describe('timeline action', () => {
    it('returns formatted timeline', async () => {
      const result = await manageCommunicationLog({
        action: 'timeline',
        filter: { tenant_name: 'Mustermann' },
      }, 'test-user');
      expect(result.formatted_output).toContain('Timeline');
    });
  });

  describe('export action', () => {
    it('returns empty message when no entries', async () => {
      const result = await manageCommunicationLog({
        action: 'export',
        export_format: 'markdown',
      }, 'test-user');
      expect(result.formatted_output).toContain('Keine');
    });

    it('accepts csv format parameter', async () => {
      const result = await manageCommunicationLog({
        action: 'export',
        export_format: 'csv',
      }, 'test-user');
      expect(result.formatted_output).toBeDefined();
    });

    it('accepts pdf_ready format parameter', async () => {
      const result = await manageCommunicationLog({
        action: 'export',
        export_format: 'pdf_ready',
      }, 'test-user');
      expect(result.formatted_output).toBeDefined();
    });
  });

  describe('unknown action', () => {
    it('handles gracefully', async () => {
      const result = await manageCommunicationLog({
        action: 'unknown' as any,
      }, 'test-user');
      expect(result.formatted_output).toContain('Unbekannte');
    });
  });
});
