/**
 * Cassie Support Tools
 *
 * Customer support tools: ticket management, knowledge base search, escalation.
 */

import { ticketManager } from './TicketManager';

// ─── create_ticket ───────────────────────────────────────────────

export interface CreateTicketInput {
  user: string;
  issue: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TicketResult {
  ticket_id: string;
  user: string;
  issue: string;
  priority: string;
  status: string;
  created_at: string;
  estimated_response_time: string;
}

export const CREATE_TICKET_TOOL = {
  name: 'create_ticket',
  description: 'Erstelle ein neues Support-Ticket fuer einen Kunden. Gibt eine Ticket-ID, Status und geschaetzte Antwortzeit zurueck.',
  input_schema: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'Name oder E-Mail des Kunden',
      },
      issue: {
        type: 'string',
        description: 'Beschreibung des Problems oder Anliegens',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Prioritaet des Tickets (default: medium)',
      },
    },
    required: ['user', 'issue'],
  },
};

const RESPONSE_TIMES: Record<string, string> = {
  low: '48 Stunden',
  medium: '24 Stunden',
  high: '4 Stunden',
  urgent: '1 Stunde',
};

export async function createTicket(input: CreateTicketInput, workspaceId: string): Promise<TicketResult> {
  const { user, issue, priority = 'medium' } = input;

  const ticket = await ticketManager.createTicket(workspaceId, {
    subject: issue.slice(0, 100),
    description: issue,
    status: 'new',
    priority: priority as 'low' | 'medium' | 'high' | 'urgent',
    channel: 'chat',
    customerEmail: user.includes('@') ? user : `${user.toLowerCase().replace(/\s+/g, '.')}@customer.local`,
    customerName: user,
    category: 'general',
    tags: [],
  });

  return {
    ticket_id: ticket.id,
    user,
    issue,
    priority,
    status: ticket.status,
    created_at: ticket.createdAt.toISOString(),
    estimated_response_time: RESPONSE_TIMES[priority] || '24 Stunden',
  };
}

// ─── check_ticket_status ─────────────────────────────────────────

export interface CheckTicketInput {
  ticket_id: string;
}

export interface TicketStatusResult {
  ticket_id: string;
  status: string;
  priority: string;
  user: string;
  issue: string;
  created_at: string;
  last_updated: string;
  assigned_to: string;
}

export const CHECK_TICKET_STATUS_TOOL = {
  name: 'check_ticket_status',
  description: 'Pruefe den aktuellen Status eines Support-Tickets anhand der Ticket-ID.',
  input_schema: {
    type: 'object',
    properties: {
      ticket_id: {
        type: 'string',
        description: 'Die Ticket-ID (z.B. TKT-ABC123)',
      },
    },
    required: ['ticket_id'],
  },
};

export async function checkTicketStatus(input: CheckTicketInput, workspaceId: string): Promise<TicketStatusResult> {
  const { ticket_id } = input;

  const ticket = await ticketManager.getTicketById(workspaceId, ticket_id);
  if (!ticket) {
    throw new Error(`Ticket ${ticket_id} nicht gefunden`);
  }

  return {
    ticket_id: ticket.id,
    status: ticket.status,
    priority: ticket.priority,
    user: ticket.customerName || ticket.customerEmail,
    issue: ticket.description,
    created_at: ticket.createdAt.toISOString(),
    last_updated: ticket.updatedAt.toISOString(),
    assigned_to: ticket.assignedTo || 'Noch nicht zugewiesen',
  };
}

// ─── search_knowledge_base ───────────────────────────────────────

export interface SearchKBInput {
  query: string;
}

export interface KBSearchResult {
  query: string;
  results: Array<{
    title: string;
    content: string;
    category: string;
    relevance: number;
  }>;
  total_results: number;
}

export const SEARCH_KNOWLEDGE_BASE_TOOL = {
  name: 'search_knowledge_base',
  description: 'Durchsuche die Wissensdatenbank nach Loesungen, FAQs und Anleitungen zu einem Thema.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Suchbegriff oder Frage',
      },
    },
    required: ['query'],
  },
};

const KNOWLEDGE_BASE: Array<{ title: string; content: string; category: string; keywords: string[] }> = [
  { title: 'Passwort zuruecksetzen', content: 'Gehen Sie zu Einstellungen > Sicherheit > Passwort aendern. Klicken Sie auf "Passwort vergessen" und folgen Sie den Anweisungen per E-Mail.', category: 'Account', keywords: ['passwort', 'password', 'reset', 'zuruecksetzen', 'vergessen'] },
  { title: 'Zwei-Faktor-Authentifizierung einrichten', content: 'Navigieren Sie zu Einstellungen > Sicherheit > 2FA. Scannen Sie den QR-Code mit einer Authenticator-App (Google Authenticator, Authy). Bewahren Sie die Backup-Codes sicher auf.', category: 'Sicherheit', keywords: ['2fa', 'zwei-faktor', 'authenticator', 'sicherheit', 'mfa'] },
  { title: 'Abo kuendigen', content: 'Gehen Sie zu Einstellungen > Abonnement > Kuendigung. Die Kuendigung wird zum Ende der aktuellen Abrechnungsperiode wirksam. Eine Rueckerstattung ist innerhalb von 14 Tagen moeglich.', category: 'Billing', keywords: ['kuendigen', 'abo', 'abonnement', 'cancel', 'subscription'] },
  { title: 'Rechnung herunterladen', content: 'Unter Einstellungen > Abonnement > Rechnungshistorie finden Sie alle Rechnungen als PDF. Sie koennen auch eine Sammelrechnung fuer das gesamte Jahr erstellen.', category: 'Billing', keywords: ['rechnung', 'invoice', 'pdf', 'download', 'billing'] },
  { title: 'API-Key erstellen', content: 'Navigieren Sie zu Einstellungen > Entwickler > API-Keys. Klicken Sie auf "Neuen Key erstellen", vergeben Sie einen Namen und kopieren Sie den Key sofort - er wird nur einmal angezeigt.', category: 'Entwickler', keywords: ['api', 'key', 'token', 'entwickler', 'developer'] },
  { title: 'Team-Mitglieder einladen', content: 'Gehen Sie zu Einstellungen > Team > Einladen. Geben Sie die E-Mail-Adresse ein und waehlen Sie eine Rolle (Admin, Editor, Viewer). Der Eingeladene erhaelt eine E-Mail mit Zugangslink.', category: 'Team', keywords: ['team', 'einladen', 'invite', 'mitglied', 'member', 'rolle'] },
  { title: 'Daten exportieren', content: 'Unter Einstellungen > Daten > Export koennen Sie alle Ihre Daten als CSV oder JSON exportieren. Der Export kann je nach Datenmenge einige Minuten dauern.', category: 'Daten', keywords: ['export', 'daten', 'csv', 'json', 'download', 'backup'] },
  { title: 'Benachrichtigungen konfigurieren', content: 'Gehen Sie zu Einstellungen > Benachrichtigungen. Waehlen Sie fuer jeden Kanal (E-Mail, Push, Slack) welche Events Sie benachrichtigt werden moechten.', category: 'Einstellungen', keywords: ['benachrichtigung', 'notification', 'email', 'push', 'slack', 'alert'] },
  { title: 'Integration mit Slack', content: 'Navigieren Sie zu Einstellungen > Integrationen > Slack. Klicken Sie auf "Mit Slack verbinden" und autorisieren Sie den Zugriff. Waehlen Sie dann den gewuenschten Kanal.', category: 'Integrationen', keywords: ['slack', 'integration', 'verbinden', 'kanal', 'channel'] },
  { title: 'Webhook einrichten', content: 'Unter Einstellungen > Entwickler > Webhooks koennen Sie Endpoints konfigurieren, die bei bestimmten Events benachrichtigt werden. Unterstuetzte Events: ticket.created, ticket.resolved, message.new.', category: 'Entwickler', keywords: ['webhook', 'endpoint', 'event', 'callback', 'api'] },
  { title: 'Account loeschen', content: 'ACHTUNG: Diese Aktion ist unwiderruflich! Gehen Sie zu Einstellungen > Account > Account loeschen. Alle Daten werden nach 30 Tagen endgueltig entfernt. Wir empfehlen vorher einen Daten-Export.', category: 'Account', keywords: ['loeschen', 'delete', 'account', 'entfernen', 'gdpr'] },
  { title: 'Mobile App einrichten', content: 'Laden Sie die App aus dem App Store (iOS) oder Play Store (Android) herunter. Melden Sie sich mit Ihren bestehenden Zugangsdaten an. Push-Benachrichtigungen muessen separat aktiviert werden.', category: 'Mobile', keywords: ['mobile', 'app', 'ios', 'android', 'phone', 'smartphone'] },
];

export async function searchKnowledgeBase(input: SearchKBInput): Promise<KBSearchResult> {
  const { query } = input;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = KNOWLEDGE_BASE.map(article => {
    let relevance = 0;
    for (const word of queryWords) {
      for (const keyword of article.keywords) {
        if (keyword.includes(word) || word.includes(keyword)) {
          relevance += 1;
        }
      }
      if (article.title.toLowerCase().includes(word)) relevance += 2;
      if (article.content.toLowerCase().includes(word)) relevance += 0.5;
    }
    return { ...article, relevance };
  })
    .filter(a => a.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .map(({ keywords, ...rest }) => rest);

  return {
    query,
    results: scored,
    total_results: scored.length,
  };
}

// ─── escalate_to_human ───────────────────────────────────────────

export interface EscalateInput {
  ticket_id: string;
  reason: string;
}

export interface EscalationResult {
  ticket_id: string;
  escalated: boolean;
  new_priority: string;
  assigned_team: string;
  estimated_human_response: string;
  escalation_id: string;
}

export const ESCALATE_TO_HUMAN_TOOL = {
  name: 'escalate_to_human',
  description: 'Eskaliere ein Ticket an einen menschlichen Support-Mitarbeiter. Verwende dies wenn das Problem zu komplex ist oder der Kunde einen menschlichen Ansprechpartner wuenscht.',
  input_schema: {
    type: 'object',
    properties: {
      ticket_id: {
        type: 'string',
        description: 'Die Ticket-ID die eskaliert werden soll',
      },
      reason: {
        type: 'string',
        description: 'Grund fuer die Eskalation',
      },
    },
    required: ['ticket_id', 'reason'],
  },
};

export async function escalateToHuman(input: EscalateInput, workspaceId: string): Promise<EscalationResult> {
  const { ticket_id, reason } = input;

  const ticket = await ticketManager.getTicketById(workspaceId, ticket_id);
  if (!ticket) {
    throw new Error(`Ticket ${ticket_id} nicht gefunden — kann nicht eskaliert werden`);
  }

  // Update priority and status
  await ticketManager.updateTicket(workspaceId, ticket_id, {
    status: 'pending',
    priority: 'urgent',
    metadata: { ...(ticket.metadata as Record<string, unknown> || {}), escalation_reason: reason },
  });

  // Auto-assign to appropriate team
  const assignments = await ticketManager.autoAssign(workspaceId, [ticket_id]);
  const assignedTeam = assignments[0]?.assignedTeam || 'Tier-2 Support';

  return {
    ticket_id,
    escalated: true,
    new_priority: 'urgent',
    assigned_team: assignedTeam,
    estimated_human_response: '15-30 Minuten',
    escalation_id: `ESC-${Date.now().toString(36).toUpperCase()}`,
  };
}

// ─── get_ticket_stats ───────────────────────────────────────────

export interface GetTicketStatsInput {
  days?: number;
}

export interface TicketStatsResult {
  period_days: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  total_tickets: number;
  avg_resolution_hours: number;
  sla_breach_rate: string;
  formatted_output: string;
}

export const GET_TICKET_STATS_TOOL = {
  name: 'get_ticket_stats',
  description: 'Zeige Ticket-Statistiken: Anzahl nach Status/Prioritaet, Loesungszeit, SLA-Verstoesse.',
  input_schema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Zeitraum in Tagen (default: 30)',
      },
    },
    required: [],
  },
};

export async function getTicketStats(input: GetTicketStatsInput, workspaceId: string): Promise<TicketStatsResult> {
  const days = input.days || 30;
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await ticketManager.getStats({
    workspaceId,
    dateRange: { start: dateFrom, end: new Date() },
  });

  const byStatus = stats.byStatus || {};
  const byPriority = stats.byPriority || {};
  const total = stats.total || 0;
  const avgHours = stats.avgResolutionTime ?? 0;
  const slaRate = stats.slaBreachRate != null ? `${(stats.slaBreachRate * 100).toFixed(1)}%` : 'N/A';

  const formatted = [
    `📊 **Ticket-Statistiken** (letzte ${days} Tage)`,
    '',
    `**Gesamt:** ${total} Tickets`,
    '',
    '**Nach Status:**',
    ...Object.entries(byStatus).map(([s, c]) => `  - ${s}: ${c}`),
    '',
    '**Nach Prioritaet:**',
    ...Object.entries(byPriority).map(([p, c]) => `  - ${p}: ${c}`),
    '',
    `**Durchschn. Loesungszeit:** ${avgHours.toFixed(1)} Stunden`,
    `**SLA-Verstossrate:** ${slaRate}`,
  ].join('\n');

  return {
    period_days: days,
    by_status: byStatus,
    by_priority: byPriority,
    total_tickets: total,
    avg_resolution_hours: avgHours,
    sla_breach_rate: slaRate,
    formatted_output: formatted,
  };
}
