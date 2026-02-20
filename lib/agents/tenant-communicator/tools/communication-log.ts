/**
 * Communication Log Tool
 *
 * Maintains a chronological log of all landlord-tenant communications.
 * Supports: add, list, search, timeline, and export actions.
 */

import { getDb } from '@/lib/db/connection';
import { tenantCommunications } from '@/lib/db/schema-tenant-comms';
import { eq, and, desc, ilike, gte, lte, sql } from 'drizzle-orm';
import { formatGermanDate } from '../config';

// ── Types ─────────────────────────────────────────────────────────

export type EventType =
  | 'schreiben_gesendet'
  | 'schreiben_empfangen'
  | 'zustellung_bestaetigt'
  | 'antwort_erhalten'
  | 'frist_gesetzt'
  | 'frist_abgelaufen'
  | 'telefonat'
  | 'meeting'
  | 'notiz';

export interface CommunicationLogInput {
  action: 'add' | 'list' | 'search' | 'timeline' | 'export';
  entry?: {
    tenant_name: string;
    property_address: string;
    event_type: EventType;
    subject: string;
    content?: string;
    date?: string; // DD.MM.YYYY
    attachments?: string[];
    deadline_date?: string; // DD.MM.YYYY
  };
  filter?: {
    tenant_name?: string;
    property_address?: string;
    event_type?: string;
    date_from?: string;
    date_to?: string;
  };
  export_format?: 'markdown' | 'csv' | 'pdf_ready';
}

export interface LogEntry {
  id: string;
  tenant_name: string;
  property_address: string;
  event_type: string;
  subject: string;
  content?: string | null;
  date: string;
  deadline_date?: string | null;
  delivery_status?: string | null;
}

export interface CommunicationLogResult {
  entries?: LogEntry[];
  timeline?: string;
  exported?: string;
  formatted_output: string;
}

// ── Tool Definition ───────────────────────────────────────────────

export const COMMUNICATION_LOG_TOOL = {
  name: 'communication_log',
  description: 'Fuehrt ein chronologisches Kommunikationsprotokoll pro Mieter/Objekt. Speichert gesendete Schreiben, Zustellnachweise, Antworten und Fristen.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['add', 'list', 'search', 'timeline', 'export'],
        description: 'Aktion',
      },
      entry: {
        type: 'object',
        properties: {
          tenant_name: { type: 'string' },
          property_address: { type: 'string' },
          event_type: {
            type: 'string',
            enum: [
              'schreiben_gesendet', 'schreiben_empfangen', 'zustellung_bestaetigt',
              'antwort_erhalten', 'frist_gesetzt', 'frist_abgelaufen',
              'telefonat', 'meeting', 'notiz',
            ],
          },
          subject: { type: 'string' },
          content: { type: 'string' },
          date: { type: 'string', description: 'DD.MM.YYYY' },
          attachments: { type: 'array', items: { type: 'string' } },
          deadline_date: { type: 'string', description: 'Zugehoerige Frist DD.MM.YYYY' },
        },
      },
      filter: {
        type: 'object',
        properties: {
          tenant_name: { type: 'string' },
          property_address: { type: 'string' },
          event_type: { type: 'string' },
          date_from: { type: 'string' },
          date_to: { type: 'string' },
        },
      },
      export_format: {
        type: 'string',
        enum: ['markdown', 'csv', 'pdf_ready'],
      },
    },
    required: ['action'],
  },
};

// ── Executor ──────────────────────────────────────────────────────

export async function manageCommunicationLog(
  input: CommunicationLogInput,
  userId: string,
): Promise<CommunicationLogResult> {
  switch (input.action) {
    case 'add':
      return addEntry(input, userId);
    case 'list':
      return listEntries(input, userId);
    case 'search':
      return searchEntries(input, userId);
    case 'timeline':
      return getTimeline(input, userId);
    case 'export':
      return exportEntries(input, userId);
    default:
      return { formatted_output: `Unbekannte Aktion: ${input.action}` };
  }
}

// ── Add Entry ─────────────────────────────────────────────────────

async function addEntry(input: CommunicationLogInput, userId: string): Promise<CommunicationLogResult> {
  const { entry } = input;
  if (!entry) {
    return { formatted_output: 'Fehler: "entry" ist erforderlich fuer Aktion "add".' };
  }

  if (!entry.tenant_name || !entry.property_address || !entry.event_type || !entry.subject) {
    return { formatted_output: 'Fehler: tenant_name, property_address, event_type und subject sind Pflichtfelder.' };
  }

  try {
    const db = getDb();
    const entryDate = entry.date ? parseDate(entry.date) : new Date();
    const deadlineDate = entry.deadline_date ? parseDate(entry.deadline_date) : null;

    const [inserted] = await db.insert(tenantCommunications).values({
      userId,
      tenantName: entry.tenant_name,
      propertyAddress: entry.property_address,
      eventType: entry.event_type,
      subject: entry.subject,
      content: entry.content || null,
      deadlineDate,
      metadata: entry.attachments ? { attachments: entry.attachments } : {},
      createdAt: entryDate,
      updatedAt: new Date(),
    }).returning();

    const eventLabel = getEventTypeLabel(entry.event_type);
    const formatted = [
      `✅ **Eintrag hinzugefuegt**`,
      '',
      `**Typ:** ${eventLabel}`,
      `**Mieter:** ${entry.tenant_name}`,
      `**Objekt:** ${entry.property_address}`,
      `**Betreff:** ${entry.subject}`,
      `**Datum:** ${entry.date || formatGermanDate(new Date())}`,
      entry.deadline_date ? `**Frist:** ${entry.deadline_date}` : '',
      entry.content ? `\n**Details:**\n${entry.content}` : '',
    ].filter(Boolean).join('\n');

    return {
      entries: [mapToLogEntry(inserted)],
      formatted_output: formatted,
    };
  } catch (error: any) {
    return { formatted_output: `Fehler beim Speichern: ${error.message}` };
  }
}

// ── List Entries ──────────────────────────────────────────────────

async function listEntries(input: CommunicationLogInput, userId: string): Promise<CommunicationLogResult> {
  try {
    const db = getDb();
    const conditions = [eq(tenantCommunications.userId, userId)];

    if (input.filter?.tenant_name) {
      conditions.push(ilike(tenantCommunications.tenantName, `%${input.filter.tenant_name}%`));
    }
    if (input.filter?.property_address) {
      conditions.push(ilike(tenantCommunications.propertyAddress, `%${input.filter.property_address}%`));
    }
    if (input.filter?.event_type) {
      conditions.push(eq(tenantCommunications.eventType, input.filter.event_type));
    }

    const entries = await db.select()
      .from(tenantCommunications)
      .where(and(...conditions))
      .orderBy(desc(tenantCommunications.createdAt))
      .limit(30);

    const logEntries = entries.map(mapToLogEntry);

    if (logEntries.length === 0) {
      return {
        entries: [],
        formatted_output: '📋 **Kommunikationsprotokoll**\n\nKeine Eintraege gefunden.',
      };
    }

    const lines = [
      `📋 **Kommunikationsprotokoll** (${logEntries.length} Eintraege)`,
      '',
    ];

    for (const entry of logEntries) {
      const icon = getEventTypeIcon(entry.event_type);
      lines.push(`${icon} **${entry.date}** — ${getEventTypeLabel(entry.event_type)}`);
      lines.push(`   ${entry.subject}`);
      lines.push(`   Mieter: ${entry.tenant_name} | Objekt: ${entry.property_address}`);
      if (entry.deadline_date) {
        lines.push(`   📅 Frist: ${entry.deadline_date}`);
      }
      lines.push('');
    }

    return {
      entries: logEntries,
      formatted_output: lines.join('\n'),
    };
  } catch (error: any) {
    return { formatted_output: `Fehler beim Laden: ${error.message}` };
  }
}

// ── Search Entries ────────────────────────────────────────────────

async function searchEntries(input: CommunicationLogInput, userId: string): Promise<CommunicationLogResult> {
  // Search is the same as list but with filters
  return listEntries(input, userId);
}

// ── Timeline ──────────────────────────────────────────────────────

async function getTimeline(input: CommunicationLogInput, userId: string): Promise<CommunicationLogResult> {
  try {
    const db = getDb();
    const conditions = [eq(tenantCommunications.userId, userId)];

    if (input.filter?.tenant_name) {
      conditions.push(ilike(tenantCommunications.tenantName, `%${input.filter.tenant_name}%`));
    }
    if (input.filter?.property_address) {
      conditions.push(ilike(tenantCommunications.propertyAddress, `%${input.filter.property_address}%`));
    }

    const entries = await db.select()
      .from(tenantCommunications)
      .where(and(...conditions))
      .orderBy(desc(tenantCommunications.createdAt))
      .limit(50);

    if (entries.length === 0) {
      return {
        timeline: 'Keine Eintraege gefunden.',
        formatted_output: '📅 **Timeline**\n\nKeine Eintraege gefunden.',
      };
    }

    const tenantName = input.filter?.tenant_name || entries[0].tenantName;
    const lines = [
      `📅 **Kommunikations-Timeline: ${tenantName}**`,
      '',
    ];

    // Group by month
    let currentMonth = '';
    for (const entry of entries) {
      const date = entry.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });

      if (monthKey !== currentMonth) {
        currentMonth = monthKey;
        lines.push(`### ${monthLabel}`);
        lines.push('');
      }

      const icon = getEventTypeIcon(entry.eventType);
      const dateStr = formatGermanDate(date);
      lines.push(`${icon} **${dateStr}** — ${entry.subject}`);
      if (entry.deadlineDate) {
        lines.push(`   📅 Frist: ${formatGermanDate(entry.deadlineDate)}`);
      }
      lines.push('');
    }

    const timeline = lines.join('\n');
    return {
      entries: entries.map(mapToLogEntry),
      timeline,
      formatted_output: timeline,
    };
  } catch (error: any) {
    return { formatted_output: `Fehler: ${error.message}` };
  }
}

// ── Export ─────────────────────────────────────────────────────────

async function exportEntries(input: CommunicationLogInput, userId: string): Promise<CommunicationLogResult> {
  const result = await listEntries(input, userId);
  const entries = result.entries || [];
  const format = input.export_format || 'markdown';

  if (entries.length === 0) {
    return { formatted_output: 'Keine Eintraege zum Exportieren.' };
  }

  let exported: string;

  switch (format) {
    case 'csv': {
      const header = 'Datum;Typ;Mieter;Objekt;Betreff;Frist;Status';
      const rows = entries.map(e =>
        `${e.date};${getEventTypeLabel(e.event_type)};${e.tenant_name};${e.property_address};${e.subject};${e.deadline_date || ''};${e.delivery_status || ''}`
      );
      exported = [header, ...rows].join('\n');
      break;
    }

    case 'pdf_ready': {
      exported = [
        '# Kommunikationsprotokoll',
        '',
        `Erstellt am: ${formatGermanDate(new Date())}`,
        `Eintraege: ${entries.length}`,
        '',
        '---',
        '',
        ...entries.map(e => [
          `## ${e.date} — ${getEventTypeLabel(e.event_type)}`,
          `**Mieter:** ${e.tenant_name}`,
          `**Objekt:** ${e.property_address}`,
          `**Betreff:** ${e.subject}`,
          e.content ? `\n${e.content}` : '',
          e.deadline_date ? `**Frist:** ${e.deadline_date}` : '',
          '',
          '---',
          '',
        ].filter(Boolean).join('\n')),
      ].join('\n');
      break;
    }

    case 'markdown':
    default: {
      exported = [
        `# Kommunikationsprotokoll (${entries.length} Eintraege)`,
        '',
        '| Datum | Typ | Mieter | Objekt | Betreff |',
        '|-------|-----|--------|--------|---------|',
        ...entries.map(e =>
          `| ${e.date} | ${getEventTypeLabel(e.event_type)} | ${e.tenant_name} | ${e.property_address} | ${e.subject} |`
        ),
      ].join('\n');
      break;
    }
  }

  return {
    entries,
    exported,
    formatted_output: [
      `📤 **Export** (${format.toUpperCase()}, ${entries.length} Eintraege)`,
      '',
      '```',
      exported,
      '```',
    ].join('\n'),
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function mapToLogEntry(row: any): LogEntry {
  return {
    id: row.id,
    tenant_name: row.tenantName,
    property_address: row.propertyAddress,
    event_type: row.eventType,
    subject: row.subject,
    content: row.content,
    date: formatGermanDate(row.createdAt),
    deadline_date: row.deadlineDate ? formatGermanDate(row.deadlineDate) : null,
    delivery_status: row.deliveryStatus,
  };
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    schreiben_gesendet: 'Schreiben gesendet',
    schreiben_empfangen: 'Schreiben empfangen',
    zustellung_bestaetigt: 'Zustellung bestaetigt',
    antwort_erhalten: 'Antwort erhalten',
    frist_gesetzt: 'Frist gesetzt',
    frist_abgelaufen: 'Frist abgelaufen',
    telefonat: 'Telefonat',
    meeting: 'Meeting/Termin',
    notiz: 'Notiz',
  };
  return labels[type] || type;
}

function getEventTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    schreiben_gesendet: '📤',
    schreiben_empfangen: '📥',
    zustellung_bestaetigt: '✅',
    antwort_erhalten: '💬',
    frist_gesetzt: '📅',
    frist_abgelaufen: '⏰',
    telefonat: '📞',
    meeting: '🤝',
    notiz: '📝',
  };
  return icons[type] || '📌';
}
