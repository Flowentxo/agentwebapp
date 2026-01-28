/**
 * PHASE 36-40: Ticket Manager Tool
 * Advanced ticket management and automation
 */

import { getDb } from '@/lib/db';
import { unifiedTickets, unifiedCustomers, customerInteractions } from '@/lib/db/schema-integrations-v2';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

export interface Ticket {
  id: string;
  externalId?: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  subcategory?: string;
  tags: string[];
  customerId?: string;
  customerEmail: string;
  customerName?: string;
  assignedTo?: string;
  assignedTeam?: string;
  channel: 'email' | 'chat' | 'phone' | 'web' | 'social';
  createdAt: Date;
  updatedAt: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  slaDeadline?: Date;
  slaBreach: boolean;
  satisfaction?: number;
  metadata?: Record<string, unknown>;
}

export interface TicketFilter {
  status?: string[];
  priority?: string[];
  category?: string[];
  assignedTo?: string;
  assignedTeam?: string;
  channel?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  customerId?: string;
  tags?: string[];
  slaBreach?: boolean;
}

export interface TicketStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byChannel: Record<string, number>;
  avgResolutionTime: number;
  avgFirstResponseTime: number;
  slaBreachCount: number;
  slaBreachRate: number;
}

export interface TicketQueue {
  name: string;
  tickets: Ticket[];
  stats: {
    count: number;
    avgAge: number;
    oldestTicket: number; // hours
    slaAtRisk: number;
  };
}

// ============================================
// TICKET MANAGER CLASS
// ============================================

export class TicketManager {
  private db = getDb();

  /**
   * Get tickets with filtering and pagination
   */
  public async getTickets(options: {
    workspaceId: string;
    filter?: TicketFilter;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    tickets: Ticket[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const {
      workspaceId,
      filter = {},
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build query conditions
    const conditions = [eq(unifiedTickets.workspaceId, workspaceId)];

    if (filter.status?.length) {
      conditions.push(inArray(unifiedTickets.status, filter.status));
    }

    if (filter.priority?.length) {
      conditions.push(inArray(unifiedTickets.priority, filter.priority));
    }

    if (filter.createdAfter) {
      conditions.push(gte(unifiedTickets.createdAt, filter.createdAfter));
    }

    if (filter.createdBefore) {
      conditions.push(lte(unifiedTickets.createdAt, filter.createdBefore));
    }

    if (filter.customerId) {
      conditions.push(eq(unifiedTickets.customerId, filter.customerId));
    }

    // Execute query
    const tickets = await this.db
      .select()
      .from(unifiedTickets)
      .where(and(...conditions))
      .orderBy(desc(unifiedTickets.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(unifiedTickets)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    return {
      tickets: tickets.map(this.mapToTicket),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /**
   * Get ticket by ID
   */
  public async getTicketById(
    workspaceId: string,
    ticketId: string
  ): Promise<Ticket | null> {
    const [ticket] = await this.db
      .select()
      .from(unifiedTickets)
      .where(
        and(
          eq(unifiedTickets.workspaceId, workspaceId),
          eq(unifiedTickets.id, ticketId)
        )
      )
      .limit(1);

    return ticket ? this.mapToTicket(ticket) : null;
  }

  /**
   * Create new ticket
   */
  public async createTicket(
    workspaceId: string,
    data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'slaBreach'>
  ): Promise<Ticket> {
    const slaDeadline = this.calculateSLADeadline(data.priority);

    const [created] = await this.db
      .insert(unifiedTickets)
      .values({
        workspaceId,
        externalId: data.externalId || `TKT-${Date.now().toString(36).toUpperCase()}`,
        subject: data.subject,
        description: data.description,
        status: data.status || 'new',
        priority: data.priority || 'medium',
        source: data.channel,
        customerId: data.customerId,
        customFields: {
          category: data.category,
          subcategory: data.subcategory,
          tags: data.tags,
          assignedTo: data.assignedTo,
          assignedTeam: data.assignedTeam,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          slaDeadline: slaDeadline.toISOString(),
          metadata: data.metadata,
        },
      })
      .returning();

    return this.mapToTicket(created);
  }

  /**
   * Update ticket
   */
  public async updateTicket(
    workspaceId: string,
    ticketId: string,
    updates: Partial<Ticket>
  ): Promise<Ticket | null> {
    const existing = await this.getTicketById(workspaceId, ticketId);
    if (!existing) return null;

    const [updated] = await this.db
      .update(unifiedTickets)
      .set({
        status: updates.status || existing.status,
        priority: updates.priority || existing.priority,
        customFields: {
          ...(existing.metadata as Record<string, unknown> || {}),
          ...(updates.category && { category: updates.category }),
          ...(updates.assignedTo && { assignedTo: updates.assignedTo }),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.resolvedAt && { resolvedAt: updates.resolvedAt.toISOString() }),
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(unifiedTickets.workspaceId, workspaceId),
          eq(unifiedTickets.id, ticketId)
        )
      )
      .returning();

    return updated ? this.mapToTicket(updated) : null;
  }

  /**
   * Get ticket statistics
   */
  public async getStats(options: {
    workspaceId: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<TicketStats> {
    const { workspaceId, dateRange } = options;

    const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateRange?.end || new Date();

    const tickets = await this.db
      .select()
      .from(unifiedTickets)
      .where(
        and(
          eq(unifiedTickets.workspaceId, workspaceId),
          gte(unifiedTickets.createdAt, start),
          lte(unifiedTickets.createdAt, end)
        )
      );

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byChannel: Record<string, number> = {};

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let totalFirstResponseTime = 0;
    let respondedCount = 0;
    let slaBreachCount = 0;

    for (const ticket of tickets) {
      const status = ticket.status || 'unknown';
      const priority = ticket.priority || 'medium';
      const channel = ticket.source || 'unknown';
      const customFields = ticket.customFields as Record<string, unknown> || {};
      const category = (customFields.category as string) || 'uncategorized';

      byStatus[status] = (byStatus[status] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
      byChannel[channel] = (byChannel[channel] || 0) + 1;

      // Resolution time
      if (ticket.status === 'solved' || ticket.status === 'closed') {
        const resolvedAt = customFields.resolvedAt
          ? new Date(customFields.resolvedAt as string)
          : ticket.updatedAt;

        if (resolvedAt && ticket.createdAt) {
          totalResolutionTime += (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          resolvedCount++;
        }
      }

      // SLA breach check
      const slaDeadline = customFields.slaDeadline
        ? new Date(customFields.slaDeadline as string)
        : null;

      if (slaDeadline && new Date() > slaDeadline && ticket.status !== 'solved' && ticket.status !== 'closed') {
        slaBreachCount++;
      }
    }

    return {
      total: tickets.length,
      byStatus,
      byPriority,
      byCategory,
      byChannel,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      avgFirstResponseTime: respondedCount > 0 ? totalFirstResponseTime / respondedCount : 0,
      slaBreachCount,
      slaBreachRate: tickets.length > 0 ? slaBreachCount / tickets.length : 0,
    };
  }

  /**
   * Get ticket queues for agents/teams
   */
  public async getQueues(
    workspaceId: string
  ): Promise<TicketQueue[]> {
    const tickets = await this.db
      .select()
      .from(unifiedTickets)
      .where(
        and(
          eq(unifiedTickets.workspaceId, workspaceId),
          inArray(unifiedTickets.status, ['new', 'open', 'pending'])
        )
      );

    // Group by assigned team
    const teamQueues = new Map<string, Ticket[]>();
    const now = new Date();

    for (const ticket of tickets) {
      const customFields = ticket.customFields as Record<string, unknown> || {};
      const team = (customFields.assignedTeam as string) || 'Unassigned';

      if (!teamQueues.has(team)) {
        teamQueues.set(team, []);
      }
      teamQueues.get(team)!.push(this.mapToTicket(ticket));
    }

    return Array.from(teamQueues.entries()).map(([name, tickets]) => {
      const ages = tickets.map(t =>
        (now.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60)
      );

      const slaAtRisk = tickets.filter(t => {
        if (!t.slaDeadline) return false;
        const hoursToDeadline = (t.slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursToDeadline < 2 && hoursToDeadline > 0;
      }).length;

      return {
        name,
        tickets,
        stats: {
          count: tickets.length,
          avgAge: ages.reduce((a, b) => a + b, 0) / ages.length || 0,
          oldestTicket: Math.max(...ages) || 0,
          slaAtRisk,
        },
      };
    });
  }

  /**
   * Bulk update tickets
   */
  public async bulkUpdate(
    workspaceId: string,
    ticketIds: string[],
    updates: Partial<Pick<Ticket, 'status' | 'priority' | 'assignedTo' | 'assignedTeam' | 'tags'>>
  ): Promise<{ updated: number; failed: string[] }> {
    let updated = 0;
    const failed: string[] = [];

    for (const ticketId of ticketIds) {
      try {
        const result = await this.updateTicket(workspaceId, ticketId, updates);
        if (result) {
          updated++;
        } else {
          failed.push(ticketId);
        }
      } catch {
        failed.push(ticketId);
      }
    }

    return { updated, failed };
  }

  /**
   * Get SLA status for tickets
   */
  public async getSLAStatus(
    workspaceId: string,
    ticketIds?: string[]
  ): Promise<Array<{
    ticketId: string;
    slaDeadline: Date | null;
    status: 'ok' | 'at_risk' | 'breached';
    timeRemaining: number | null; // hours
    priority: string;
  }>> {
    let tickets;

    if (ticketIds?.length) {
      tickets = await this.db
        .select()
        .from(unifiedTickets)
        .where(
          and(
            eq(unifiedTickets.workspaceId, workspaceId),
            inArray(unifiedTickets.id, ticketIds)
          )
        );
    } else {
      tickets = await this.db
        .select()
        .from(unifiedTickets)
        .where(
          and(
            eq(unifiedTickets.workspaceId, workspaceId),
            inArray(unifiedTickets.status, ['new', 'open', 'pending'])
          )
        );
    }

    const now = new Date();

    return tickets.map(ticket => {
      const customFields = ticket.customFields as Record<string, unknown> || {};
      const slaDeadline = customFields.slaDeadline
        ? new Date(customFields.slaDeadline as string)
        : null;

      let status: 'ok' | 'at_risk' | 'breached' = 'ok';
      let timeRemaining: number | null = null;

      if (slaDeadline) {
        timeRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (timeRemaining < 0) {
          status = 'breached';
        } else if (timeRemaining < 2) {
          status = 'at_risk';
        }
      }

      return {
        ticketId: ticket.id,
        slaDeadline,
        status,
        timeRemaining,
        priority: ticket.priority || 'medium',
      };
    });
  }

  /**
   * Auto-assign tickets based on rules
   */
  public async autoAssign(
    workspaceId: string,
    ticketIds?: string[]
  ): Promise<Array<{
    ticketId: string;
    assignedTo: string;
    assignedTeam: string;
    reason: string;
  }>> {
    const assignments: Array<{
      ticketId: string;
      assignedTo: string;
      assignedTeam: string;
      reason: string;
    }> = [];

    // Define assignment rules
    const rules: Array<{
      condition: (ticket: Ticket) => boolean;
      team: string;
      agent?: string;
      reason: string;
    }> = [
      {
        condition: t => t.priority === 'urgent',
        team: 'Senior Support',
        reason: 'Urgent priority requires senior attention',
      },
      {
        condition: t => t.category === 'Billing',
        team: 'Billing Team',
        reason: 'Category-based routing',
      },
      {
        condition: t => t.category === 'Technical Issue',
        team: 'Technical Support',
        reason: 'Category-based routing',
      },
      {
        condition: t => t.channel === 'phone',
        team: 'Phone Support',
        reason: 'Channel-based routing',
      },
      {
        condition: () => true,
        team: 'General Support',
        reason: 'Default assignment',
      },
    ];

    const tickets = ticketIds
      ? await Promise.all(ticketIds.map(id => this.getTicketById(workspaceId, id)))
      : (await this.getTickets({
        workspaceId,
        filter: { status: ['new'] },
        pageSize: 100,
      })).tickets;

    for (const ticket of tickets) {
      if (!ticket) continue;

      for (const rule of rules) {
        if (rule.condition(ticket)) {
          await this.updateTicket(workspaceId, ticket.id, {
            assignedTeam: rule.team,
            assignedTo: rule.agent,
          });

          assignments.push({
            ticketId: ticket.id,
            assignedTo: rule.agent || 'Unassigned',
            assignedTeam: rule.team,
            reason: rule.reason,
          });

          break;
        }
      }
    }

    return assignments;
  }

  /**
   * Merge duplicate tickets
   */
  public async mergeTickets(
    workspaceId: string,
    primaryTicketId: string,
    duplicateTicketIds: string[]
  ): Promise<{
    success: boolean;
    primaryTicket: Ticket | null;
    mergedCount: number;
  }> {
    const primaryTicket = await this.getTicketById(workspaceId, primaryTicketId);
    if (!primaryTicket) {
      return { success: false, primaryTicket: null, mergedCount: 0 };
    }

    let mergedCount = 0;

    for (const duplicateId of duplicateTicketIds) {
      const duplicate = await this.getTicketById(workspaceId, duplicateId);
      if (!duplicate) continue;

      // Add note to primary ticket about merge
      await this.updateTicket(workspaceId, primaryTicketId, {
        metadata: {
          ...(primaryTicket.metadata || {}),
          mergedTickets: [
            ...((primaryTicket.metadata?.mergedTickets as string[]) || []),
            duplicateId,
          ],
        },
      });

      // Close duplicate
      await this.updateTicket(workspaceId, duplicateId, {
        status: 'closed',
        metadata: {
          ...(duplicate.metadata || {}),
          mergedInto: primaryTicketId,
        },
      });

      mergedCount++;
    }

    return {
      success: true,
      primaryTicket: await this.getTicketById(workspaceId, primaryTicketId),
      mergedCount,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private mapToTicket(row: typeof unifiedTickets.$inferSelect): Ticket {
    const customFields = row.customFields as Record<string, unknown> || {};

    return {
      id: row.id,
      externalId: row.externalId || undefined,
      subject: row.subject,
      description: row.description || '',
      status: (row.status || 'open') as Ticket['status'],
      priority: (row.priority || 'medium') as Ticket['priority'],
      category: (customFields.category as string) || 'General',
      subcategory: customFields.subcategory as string | undefined,
      tags: (customFields.tags as string[]) || [],
      customerId: row.customerId || undefined,
      customerEmail: (customFields.customerEmail as string) || '',
      customerName: customFields.customerName as string | undefined,
      assignedTo: customFields.assignedTo as string | undefined,
      assignedTeam: customFields.assignedTeam as string | undefined,
      channel: (row.source || 'web') as Ticket['channel'],
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
      firstResponseAt: customFields.firstResponseAt
        ? new Date(customFields.firstResponseAt as string)
        : undefined,
      resolvedAt: customFields.resolvedAt
        ? new Date(customFields.resolvedAt as string)
        : undefined,
      slaDeadline: customFields.slaDeadline
        ? new Date(customFields.slaDeadline as string)
        : undefined,
      slaBreach: customFields.slaBreach as boolean || false,
      satisfaction: customFields.satisfaction as number | undefined,
      metadata: customFields.metadata as Record<string, unknown> | undefined,
    };
  }

  private calculateSLADeadline(priority: string): Date {
    const now = new Date();
    const hours: Record<string, number> = {
      urgent: 1,
      high: 4,
      medium: 8,
      low: 24,
    };

    now.setHours(now.getHours() + (hours[priority] || 8));
    return now;
  }
}

export const ticketManager = new TicketManager();
