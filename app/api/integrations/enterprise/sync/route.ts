/**
 * PHASE 10: Integration Sync API Routes
 * API für Daten-Synchronisation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  integrationConnections,
  integrationSyncLogs,
  unifiedCustomers,
  unifiedDeals,
  unifiedTickets,
} from '@/lib/db/schema-integrations-v2';
import { CRMAdapterFactory } from '@/lib/integrations/adapters/CRMAdapter';
import { eq, and, desc, sql } from 'drizzle-orm';
import { publishAgentEvent } from '@/lib/events/EventBus';

// ============================================
// POST: Trigger sync
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { connectionId, workspaceId, syncType, options } = body;

    if (!connectionId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'connectionId and workspaceId are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get connection
    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Connection is not active' },
        { status: 400 }
      );
    }

    // Create sync log entry
    const [syncLog] = await db
      .insert(integrationSyncLogs)
      .values({
        connectionId,
        workspaceId,
        syncType: syncType || 'full',
        status: 'running',
        startedAt: new Date(),
      })
      .returning();

    try {
      // Get CRM adapter
      const adapter = await CRMAdapterFactory.create(
        connection.provider as 'hubspot' | 'salesforce' | 'zendesk',
        connection.accessToken!,
        { baseUrl: (connection.metadata as Record<string, string>)?.baseUrl }
      );

      // Perform sync based on type
      let result;
      const startTime = Date.now();

      switch (syncType) {
        case 'contacts':
          result = await syncContacts(adapter, workspaceId, connection.provider, options);
          break;
        case 'deals':
          result = await syncDeals(adapter, workspaceId, connection.provider, options);
          break;
        case 'tickets':
          result = await syncTickets(adapter, workspaceId, connection.provider, options);
          break;
        case 'full':
        default:
          result = await fullSync(adapter, workspaceId, connection.provider, options);
          break;
      }

      // Update sync log
      await db
        .update(integrationSyncLogs)
        .set({
          status: 'completed',
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsFailed: result.recordsFailed,
          completedAt: new Date(),
        })
        .where(eq(integrationSyncLogs.id, syncLog.id));

      // Update connection last sync
      await db
        .update(integrationConnections)
        .set({
          lastSyncAt: new Date(),
          syncStatus: 'success',
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, connectionId));

      // Emit sync event
      await publishAgentEvent(
        'integration.synced',
        { agentId: 'system', workspaceId },
        {
          provider: connection.provider,
          syncType,
          result,
          durationMs: Date.now() - startTime,
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          syncLogId: syncLog.id,
          ...result,
        },
      });
    } catch (syncError) {
      // Update sync log with error
      await db
        .update(integrationSyncLogs)
        .set({
          status: 'failed',
          errorMessage: syncError instanceof Error ? syncError.message : 'Sync failed',
          completedAt: new Date(),
        })
        .where(eq(integrationSyncLogs.id, syncLog.id));

      // Update connection status
      await db
        .update(integrationConnections)
        .set({
          syncStatus: 'error',
          lastError: syncError instanceof Error ? syncError.message : 'Sync failed',
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, connectionId));

      throw syncError;
    }
  } catch (error) {
    console.error('[SYNC_API_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get sync history
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    let query = db
      .select()
      .from(integrationSyncLogs)
      .where(eq(integrationSyncLogs.workspaceId, workspaceId))
      .orderBy(desc(integrationSyncLogs.startedAt))
      .limit(limit);

    if (connectionId) {
      query = db
        .select()
        .from(integrationSyncLogs)
        .where(
          and(
            eq(integrationSyncLogs.workspaceId, workspaceId),
            eq(integrationSyncLogs.connectionId, connectionId)
          )
        )
        .orderBy(desc(integrationSyncLogs.startedAt))
        .limit(limit);
    }

    const syncLogs = await query;

    return NextResponse.json({
      success: true,
      data: { syncLogs },
    });
  } catch (error) {
    console.error('[SYNC_API_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync history' },
      { status: 500 }
    );
  }
}

// ============================================
// SYNC HELPER FUNCTIONS
// ============================================

interface SyncResult {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
}

async function syncContacts(
  adapter: Awaited<ReturnType<typeof CRMAdapterFactory.create>>,
  workspaceId: string,
  provider: string,
  options?: { since?: Date; limit?: number }
): Promise<SyncResult> {
  const result: SyncResult = {
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
  };

  const db = getDb();
  let cursor: string | undefined;

  do {
    const response = await adapter.listContacts({
      limit: options?.limit || 100,
      cursor,
      updatedAfter: options?.since,
    });

    for (const contact of response.data) {
      result.recordsProcessed++;

      try {
        // Check if customer exists
        const existing = await db
          .select()
          .from(unifiedCustomers)
          .where(
            and(
              eq(unifiedCustomers.workspaceId, workspaceId),
              provider === 'hubspot'
                ? eq(unifiedCustomers.hubspotId, contact.id)
                : provider === 'salesforce'
                ? eq(unifiedCustomers.salesforceId, contact.id)
                : sql`1=0`
            )
          )
          .limit(1);

        const customerData = {
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          company: contact.company,
          title: contact.title,
          source: provider,
          customFields: contact.customFields,
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          // Update existing
          await db
            .update(unifiedCustomers)
            .set(customerData)
            .where(eq(unifiedCustomers.id, existing[0].id));
          result.recordsUpdated++;
        } else {
          // Create new
          await db.insert(unifiedCustomers).values({
            workspaceId,
            ...customerData,
            [provider === 'hubspot' ? 'hubspotId' : 'salesforceId']: contact.id,
          });
          result.recordsCreated++;
        }
      } catch (err) {
        result.recordsFailed++;
        result.errors.push(`Contact ${contact.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    cursor = response.nextCursor;
  } while (cursor && result.recordsProcessed < (options?.limit || 10000));

  return result;
}

async function syncDeals(
  adapter: Awaited<ReturnType<typeof CRMAdapterFactory.create>>,
  workspaceId: string,
  provider: string,
  options?: { since?: Date; limit?: number }
): Promise<SyncResult> {
  const result: SyncResult = {
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
  };

  const db = getDb();
  let cursor: string | undefined;

  do {
    const response = await adapter.listDeals({
      limit: options?.limit || 100,
      cursor,
      updatedAfter: options?.since,
    });

    for (const deal of response.data) {
      result.recordsProcessed++;

      try {
        const existing = await db
          .select()
          .from(unifiedDeals)
          .where(
            and(
              eq(unifiedDeals.workspaceId, workspaceId),
              eq(unifiedDeals.externalId, deal.id),
              eq(unifiedDeals.source, provider)
            )
          )
          .limit(1);

        const dealData = {
          name: deal.name,
          value: deal.value?.toString() || '0',
          currency: deal.currency || 'USD',
          stage: deal.stage,
          probability: deal.probability,
          expectedCloseDate: deal.expectedCloseDate,
          source: provider,
          customFields: deal.customFields,
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(unifiedDeals)
            .set(dealData)
            .where(eq(unifiedDeals.id, existing[0].id));
          result.recordsUpdated++;
        } else {
          await db.insert(unifiedDeals).values({
            workspaceId,
            externalId: deal.id,
            ...dealData,
          });
          result.recordsCreated++;
        }
      } catch (err) {
        result.recordsFailed++;
        result.errors.push(`Deal ${deal.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    cursor = response.nextCursor;
  } while (cursor && result.recordsProcessed < (options?.limit || 10000));

  return result;
}

async function syncTickets(
  adapter: Awaited<ReturnType<typeof CRMAdapterFactory.create>>,
  workspaceId: string,
  provider: string,
  options?: { since?: Date; limit?: number }
): Promise<SyncResult> {
  const result: SyncResult = {
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
  };

  const db = getDb();
  let cursor: string | undefined;

  do {
    const response = await adapter.listTickets({
      limit: options?.limit || 100,
      cursor,
      updatedAfter: options?.since,
    });

    for (const ticket of response.data) {
      result.recordsProcessed++;

      try {
        const existing = await db
          .select()
          .from(unifiedTickets)
          .where(
            and(
              eq(unifiedTickets.workspaceId, workspaceId),
              eq(unifiedTickets.externalId, ticket.id),
              eq(unifiedTickets.source, provider)
            )
          )
          .limit(1);

        const ticketData = {
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          source: provider,
          customFields: ticket.customFields,
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(unifiedTickets)
            .set(ticketData)
            .where(eq(unifiedTickets.id, existing[0].id));
          result.recordsUpdated++;
        } else {
          await db.insert(unifiedTickets).values({
            workspaceId,
            externalId: ticket.id,
            ...ticketData,
          });
          result.recordsCreated++;
        }
      } catch (err) {
        result.recordsFailed++;
        result.errors.push(`Ticket ${ticket.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    cursor = response.nextCursor;
  } while (cursor && result.recordsProcessed < (options?.limit || 10000));

  return result;
}

async function fullSync(
  adapter: Awaited<ReturnType<typeof CRMAdapterFactory.create>>,
  workspaceId: string,
  provider: string,
  options?: { since?: Date; limit?: number }
): Promise<SyncResult> {
  const contacts = await syncContacts(adapter, workspaceId, provider, options);
  const deals = await syncDeals(adapter, workspaceId, provider, options);
  const tickets = await syncTickets(adapter, workspaceId, provider, options);

  return {
    recordsProcessed: contacts.recordsProcessed + deals.recordsProcessed + tickets.recordsProcessed,
    recordsCreated: contacts.recordsCreated + deals.recordsCreated + tickets.recordsCreated,
    recordsUpdated: contacts.recordsUpdated + deals.recordsUpdated + tickets.recordsUpdated,
    recordsFailed: contacts.recordsFailed + deals.recordsFailed + tickets.recordsFailed,
    errors: [...contacts.errors, ...deals.errors, ...tickets.errors],
  };
}
