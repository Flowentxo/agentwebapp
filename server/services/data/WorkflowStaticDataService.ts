/**
 * Workflow Static Data Service
 *
 * Phase 4: Active Polling & Error Triggers
 *
 * Provides CRUD operations for workflow static data, which is used by
 * polling nodes to persist state across executions (cursors, seen IDs, etc.).
 *
 * Key Features:
 * - Atomic updates with optimistic locking
 * - Automatic cleanup of stale data
 * - Efficient querying for polling triggers
 */

import { eq, and, sql, desc, lt, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  workflowStaticData,
  WorkflowStaticDataRecord,
  NewWorkflowStaticDataRecord,
  StaticDataContent,
} from '@/lib/db/schema-static-data';

// ============================================================================
// INTERFACES
// ============================================================================

export interface StaticDataUpdateResult {
  success: boolean;
  record?: WorkflowStaticDataRecord;
  error?: string;
  conflictDetected?: boolean;
}

export interface StaticDataQuery {
  workflowId?: string;
  nodeId?: string;
  nodeType?: string;
}

export interface StaticDataCleanupOptions {
  /** Delete data for workflows that no longer exist */
  cleanOrphaned?: boolean;
  /** Delete data older than this many days */
  olderThanDays?: number;
  /** Delete data for specific node types */
  nodeTypes?: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class WorkflowStaticDataService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Get static data for a specific workflow + node combination
   */
  async get(workflowId: string, nodeId: string): Promise<StaticDataContent | null> {
    const [record] = await this.db
      .select()
      .from(workflowStaticData)
      .where(
        and(
          eq(workflowStaticData.workflowId, workflowId),
          eq(workflowStaticData.nodeId, nodeId)
        )
      )
      .limit(1);

    return record?.data ?? null;
  }

  /**
   * Get the full record including metadata
   */
  async getRecord(workflowId: string, nodeId: string): Promise<WorkflowStaticDataRecord | null> {
    const [record] = await this.db
      .select()
      .from(workflowStaticData)
      .where(
        and(
          eq(workflowStaticData.workflowId, workflowId),
          eq(workflowStaticData.nodeId, nodeId)
        )
      )
      .limit(1);

    return record ?? null;
  }

  /**
   * Set static data for a workflow + node combination
   * Creates a new record if it doesn't exist, or updates the existing one
   */
  async set(
    workflowId: string,
    nodeId: string,
    data: StaticDataContent,
    options: {
      nodeType?: string;
      nodeName?: string;
      updatedBy?: string;
      executionId?: string;
    } = {}
  ): Promise<StaticDataUpdateResult> {
    try {
      const existing = await this.getRecord(workflowId, nodeId);

      if (existing) {
        // Update existing record
        const [updated] = await this.db
          .update(workflowStaticData)
          .set({
            data,
            version: existing.version + 1,
            nodeType: options.nodeType ?? existing.nodeType,
            nodeName: options.nodeName ?? existing.nodeName,
            lastUpdatedBy: options.updatedBy ?? 'execution',
            lastExecutionId: options.executionId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(workflowStaticData.id, existing.id),
              eq(workflowStaticData.version, existing.version) // Optimistic lock
            )
          )
          .returning();

        if (!updated) {
          return {
            success: false,
            error: 'Concurrent modification detected',
            conflictDetected: true,
          };
        }

        return { success: true, record: updated };
      } else {
        // Create new record
        const [created] = await this.db
          .insert(workflowStaticData)
          .values({
            workflowId,
            nodeId,
            data,
            nodeType: options.nodeType,
            nodeName: options.nodeName,
            lastUpdatedBy: options.updatedBy ?? 'execution',
            lastExecutionId: options.executionId,
          })
          .returning();

        return { success: true, record: created };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Atomically update static data with a transform function
   * Retries on conflict up to maxRetries times
   */
  async update(
    workflowId: string,
    nodeId: string,
    transform: (current: StaticDataContent) => StaticDataContent,
    options: {
      nodeType?: string;
      nodeName?: string;
      updatedBy?: string;
      executionId?: string;
      maxRetries?: number;
    } = {}
  ): Promise<StaticDataUpdateResult> {
    const maxRetries = options.maxRetries ?? 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const current = await this.get(workflowId, nodeId);
      const newData = transform(current ?? {});

      const result = await this.set(workflowId, nodeId, newData, options);

      if (result.success || !result.conflictDetected) {
        return result;
      }

      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }

    return {
      success: false,
      error: `Failed to update after ${maxRetries} attempts due to conflicts`,
      conflictDetected: true,
    };
  }

  /**
   * Delete static data for a workflow + node combination
   */
  async delete(workflowId: string, nodeId: string): Promise<boolean> {
    const result = await this.db
      .delete(workflowStaticData)
      .where(
        and(
          eq(workflowStaticData.workflowId, workflowId),
          eq(workflowStaticData.nodeId, nodeId)
        )
      )
      .returning({ id: workflowStaticData.id });

    return result.length > 0;
  }

  /**
   * Delete all static data for a workflow
   */
  async deleteForWorkflow(workflowId: string): Promise<number> {
    const result = await this.db
      .delete(workflowStaticData)
      .where(eq(workflowStaticData.workflowId, workflowId))
      .returning({ id: workflowStaticData.id });

    return result.length;
  }

  // --------------------------------------------------------------------------
  // QUERY OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * List all static data records matching the query
   */
  async list(query: StaticDataQuery = {}): Promise<WorkflowStaticDataRecord[]> {
    const conditions = [];

    if (query.workflowId) {
      conditions.push(eq(workflowStaticData.workflowId, query.workflowId));
    }

    if (query.nodeId) {
      conditions.push(eq(workflowStaticData.nodeId, query.nodeId));
    }

    if (query.nodeType) {
      conditions.push(eq(workflowStaticData.nodeType, query.nodeType));
    }

    return this.db
      .select()
      .from(workflowStaticData)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(workflowStaticData.updatedAt));
  }

  /**
   * Find all workflows with polling triggers
   */
  async findPollingWorkflows(): Promise<WorkflowStaticDataRecord[]> {
    return this.db
      .select()
      .from(workflowStaticData)
      .where(
        sql`${workflowStaticData.nodeType} LIKE '%trigger%' OR ${workflowStaticData.nodeType} LIKE '%polling%'`
      );
  }

  // --------------------------------------------------------------------------
  // CURSOR HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Update the cursor for incremental polling (by ID)
   */
  async updateLastId(
    workflowId: string,
    nodeId: string,
    lastId: string | number,
    executionId?: string
  ): Promise<StaticDataUpdateResult> {
    return this.update(
      workflowId,
      nodeId,
      (current) => ({
        ...current,
        lastId,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: 0,
          executionId,
        },
      }),
      { updatedBy: 'polling', executionId }
    );
  }

  /**
   * Update the cursor for incremental polling (by timestamp)
   */
  async updateLastTimestamp(
    workflowId: string,
    nodeId: string,
    lastTimestamp: string,
    executionId?: string
  ): Promise<StaticDataUpdateResult> {
    return this.update(
      workflowId,
      nodeId,
      (current) => ({
        ...current,
        lastTimestamp,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: 0,
          executionId,
        },
      }),
      { updatedBy: 'polling', executionId }
    );
  }

  /**
   * Update cursor-based pagination state
   */
  async updateCursor(
    workflowId: string,
    nodeId: string,
    cursor: string | null,
    executionId?: string
  ): Promise<StaticDataUpdateResult> {
    return this.update(
      workflowId,
      nodeId,
      (current) => ({
        ...current,
        cursor: cursor ?? undefined,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: 0,
          executionId,
        },
      }),
      { updatedBy: 'polling', executionId }
    );
  }

  /**
   * Add IDs to the seen set for deduplication
   */
  async addSeenIds(
    workflowId: string,
    nodeId: string,
    ids: string[],
    options: {
      maxSeenIds?: number;
      executionId?: string;
    } = {}
  ): Promise<StaticDataUpdateResult> {
    const maxSeenIds = options.maxSeenIds ?? 10000;

    return this.update(
      workflowId,
      nodeId,
      (current) => {
        const currentSeenIds = current.seenIds ?? [];
        const newSeenIds = [...new Set([...currentSeenIds, ...ids])];

        // Trim to max size (keep most recent)
        const trimmedSeenIds = newSeenIds.slice(-maxSeenIds);

        return {
          ...current,
          seenIds: trimmedSeenIds,
          maxSeenIds,
          lastPoll: {
            timestamp: new Date().toISOString(),
            itemCount: ids.length,
            executionId: options.executionId,
          },
        };
      },
      { updatedBy: 'polling', executionId: options.executionId }
    );
  }

  /**
   * Check if IDs have been seen before (for deduplication)
   */
  async filterUnseenIds(
    workflowId: string,
    nodeId: string,
    ids: string[]
  ): Promise<string[]> {
    const data = await this.get(workflowId, nodeId);
    const seenIds = new Set(data?.seenIds ?? []);

    return ids.filter(id => !seenIds.has(id));
  }

  // --------------------------------------------------------------------------
  // CLEANUP OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Clean up stale or orphaned static data
   */
  async cleanup(options: StaticDataCleanupOptions = {}): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Clean data older than specified days
      if (options.olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);

        const result = await this.db
          .delete(workflowStaticData)
          .where(lt(workflowStaticData.updatedAt, cutoffDate))
          .returning({ id: workflowStaticData.id });

        deletedCount += result.length;
      }

      // Clean orphaned data (workflows that no longer exist)
      if (options.cleanOrphaned) {
        const result = await this.db.execute(sql`
          DELETE FROM workflow_static_data wsd
          WHERE NOT EXISTS (
            SELECT 1 FROM workflows w WHERE w.id = wsd.workflow_id
          )
          RETURNING wsd.id
        `);

        deletedCount += (result as any).rowCount ?? 0;
      }

      // Clean specific node types
      if (options.nodeTypes && options.nodeTypes.length > 0) {
        for (const nodeType of options.nodeTypes) {
          const result = await this.db
            .delete(workflowStaticData)
            .where(eq(workflowStaticData.nodeType, nodeType))
            .returning({ id: workflowStaticData.id });

          deletedCount += result.length;
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return { deletedCount, errors };
  }

  /**
   * Reset static data for a node (clear all cursors/state)
   */
  async reset(workflowId: string, nodeId: string): Promise<StaticDataUpdateResult> {
    return this.set(workflowId, nodeId, {}, { updatedBy: 'manual' });
  }

  /**
   * Reset all static data for a workflow
   */
  async resetWorkflow(workflowId: string): Promise<number> {
    const records = await this.list({ workflowId });
    let resetCount = 0;

    for (const record of records) {
      const result = await this.reset(workflowId, record.nodeId);
      if (result.success) resetCount++;
    }

    return resetCount;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let staticDataServiceInstance: WorkflowStaticDataService | null = null;

export function getStaticDataService(): WorkflowStaticDataService {
  if (!staticDataServiceInstance) {
    staticDataServiceInstance = new WorkflowStaticDataService();
  }
  return staticDataServiceInstance;
}

export default WorkflowStaticDataService;
