/**
 * MergeExecutorV2
 *
 * Handles merge node execution with multiple strategies:
 * - wait_all: Wait for all incoming branches to complete
 * - wait_any: Continue when any branch completes
 * - wait_n: Wait for N branches to complete
 *
 * Data merge modes:
 * - append: Concatenate all items [...branch1, ...branch2]
 * - join: Zip by index [{...item1, ...item2}]
 * - pass_through: Pass first completed branch only
 * - deep_merge: Deep merge objects with conflict resolution
 * - keyed_merge: Merge by matching key field
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  mergeNodeStates,
  MergeNodeState,
  NewMergeNodeState,
  MergeNodeConfig,
  BranchDataMap,
  MergeStrategy,
  MergeDataMode,
} from '@/lib/db/schema-flow-control';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface BranchOutput {
  branchId: string;
  nodeId: string;
  items: unknown[];
  metadata?: Record<string, unknown>;
}

export interface MergeResult {
  /** Whether the merge is complete and ready to continue */
  isComplete: boolean;
  /** Merged output items */
  items: unknown[];
  /** Which branches contributed to the output */
  contributingBranches: string[];
  /** Branches still pending (for incomplete merges) */
  pendingBranches: string[];
  /** Full state for debugging */
  state: Partial<MergeNodeState>;
}

export interface MergeExecutorConfig {
  executionId: string;
  mergeNodeId: string;
  expectedBranches: number;
  config: MergeNodeConfig;
}

// ============================================================================
// MERGE EXECUTOR
// ============================================================================

export class MergeExecutorV2 {
  private db = getDb();

  /**
   * Record a branch completion and check if merge is ready
   */
  async recordBranchCompletion(
    executorConfig: MergeExecutorConfig,
    branchOutput: BranchOutput
  ): Promise<MergeResult> {
    const { executionId, mergeNodeId, expectedBranches, config } = executorConfig;
    const { branchId, nodeId, items, metadata } = branchOutput;

    logger.info('[MERGE_EXECUTOR] Recording branch completion', {
      executionId,
      mergeNodeId,
      branchId,
      itemCount: items.length,
    });

    // Get or create merge state
    let state = await this.getOrCreateMergeState(executionId, mergeNodeId, expectedBranches, config);

    // Add branch data
    const branchData = state.branchData as BranchDataMap;
    branchData[branchId] = {
      nodeId,
      items,
      completedAt: new Date().toISOString(),
      metadata,
    };

    // Update branch order
    const branchOrder = state.branchOrder as string[];
    if (!branchOrder.includes(branchId)) {
      branchOrder.push(branchId);
    }

    // Update completed count
    const completedBranches = Object.keys(branchData).length;
    const isFirstBranch = completedBranches === 1;

    // Check if merge condition is met
    const isComplete = this.checkMergeCondition(config, completedBranches, expectedBranches);

    // Compute merged output if complete
    let mergedOutput: unknown[] | null = null;
    if (isComplete) {
      mergedOutput = this.mergeData(branchData, branchOrder, config);
    }

    // Update state in database
    const [updatedState] = await this.db
      .update(mergeNodeStates)
      .set({
        branchData,
        branchOrder,
        completedBranches,
        isComplete,
        mergedOutput,
        firstBranchAt: isFirstBranch ? new Date() : state.firstBranchAt,
        completedAt: isComplete ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(mergeNodeStates.id, state.id))
      .returning();

    const pendingBranches = this.getPendingBranches(branchData, expectedBranches);

    return {
      isComplete,
      items: mergedOutput || [],
      contributingBranches: Object.keys(branchData),
      pendingBranches,
      state: updatedState,
    };
  }

  /**
   * Get or create merge state for an execution
   */
  private async getOrCreateMergeState(
    executionId: string,
    mergeNodeId: string,
    expectedBranches: number,
    config: MergeNodeConfig
  ): Promise<MergeNodeState> {
    // Try to find existing state
    const existing = await this.db
      .select()
      .from(mergeNodeStates)
      .where(
        and(
          eq(mergeNodeStates.executionId, executionId),
          eq(mergeNodeStates.mergeNodeId, mergeNodeId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new state
    const newState: NewMergeNodeState = {
      executionId,
      mergeNodeId,
      strategy: config.strategy,
      dataMode: config.dataMode,
      waitCount: config.waitCount,
      expectedBranches,
      completedBranches: 0,
      branchData: {},
      branchOrder: [],
      isComplete: false,
      mergeConfig: config,
    };

    const [created] = await this.db
      .insert(mergeNodeStates)
      .values(newState)
      .returning();

    return created;
  }

  /**
   * Check if merge condition is satisfied
   */
  private checkMergeCondition(
    config: MergeNodeConfig,
    completedBranches: number,
    expectedBranches: number
  ): boolean {
    switch (config.strategy) {
      case 'wait_all':
        return completedBranches >= expectedBranches;

      case 'wait_any':
        return completedBranches >= 1;

      case 'wait_n':
        const n = config.waitCount || 1;
        return completedBranches >= Math.min(n, expectedBranches);

      default:
        return completedBranches >= expectedBranches;
    }
  }

  /**
   * Merge data from multiple branches based on data mode
   */
  private mergeData(
    branchData: BranchDataMap,
    branchOrder: string[],
    config: MergeNodeConfig
  ): unknown[] {
    // Get items in order of completion
    const orderedBranches = branchOrder
      .filter(id => branchData[id])
      .map(id => branchData[id]);

    switch (config.dataMode) {
      case 'append':
        return this.mergeAppend(orderedBranches);

      case 'join':
        return this.mergeJoin(orderedBranches);

      case 'pass_through':
        return this.mergePassThrough(orderedBranches);

      case 'deep_merge':
        return this.mergeDeep(orderedBranches, config.conflictResolution);

      case 'keyed_merge':
        return this.mergeKeyed(orderedBranches, config.keyField || 'id');

      default:
        return this.mergeAppend(orderedBranches);
    }
  }

  /**
   * Append mode: Concatenate all items
   * [...branch1, ...branch2, ...]
   */
  private mergeAppend(branches: BranchDataMap[string][]): unknown[] {
    const result: unknown[] = [];

    for (const branch of branches) {
      result.push(...branch.items);
    }

    return result;
  }

  /**
   * Join mode: Zip items by index
   * [{...item1, ...item2}, {...item1, ...item2}, ...]
   */
  private mergeJoin(branches: BranchDataMap[string][]): unknown[] {
    if (branches.length === 0) return [];

    // Find the maximum length
    const maxLength = Math.max(...branches.map(b => b.items.length));
    const result: unknown[] = [];

    for (let i = 0; i < maxLength; i++) {
      const mergedItem: Record<string, unknown> = {};

      for (const branch of branches) {
        const item = branch.items[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(mergedItem, item);
        } else if (item !== undefined) {
          // If not an object, use branch nodeId as key
          mergedItem[branch.nodeId] = item;
        }
      }

      result.push(mergedItem);
    }

    return result;
  }

  /**
   * Pass-through mode: Only pass first completed branch
   */
  private mergePassThrough(branches: BranchDataMap[string][]): unknown[] {
    if (branches.length === 0) return [];
    return branches[0].items;
  }

  /**
   * Deep merge mode: Recursively merge objects
   */
  private mergeDeep(
    branches: BranchDataMap[string][],
    conflictResolution: 'first' | 'last' | 'merge' = 'last'
  ): unknown[] {
    if (branches.length === 0) return [];

    const maxLength = Math.max(...branches.map(b => b.items.length));
    const result: unknown[] = [];

    for (let i = 0; i < maxLength; i++) {
      let merged: unknown = {};

      for (const branch of branches) {
        const item = branch.items[i];
        if (item !== undefined) {
          merged = this.deepMergeObjects(merged, item, conflictResolution);
        }
      }

      result.push(merged);
    }

    return result;
  }

  /**
   * Deep merge two objects
   */
  private deepMergeObjects(
    target: unknown,
    source: unknown,
    conflictResolution: 'first' | 'last' | 'merge'
  ): unknown {
    // Handle non-object cases
    if (source === null || source === undefined) return target;
    if (target === null || target === undefined) return source;

    if (typeof target !== 'object' || typeof source !== 'object') {
      switch (conflictResolution) {
        case 'first':
          return target;
        case 'last':
          return source;
        case 'merge':
          // For primitives, create an array
          return [target, source];
      }
    }

    if (Array.isArray(target) && Array.isArray(source)) {
      switch (conflictResolution) {
        case 'first':
          return target;
        case 'last':
          return source;
        case 'merge':
          return [...target, ...source];
      }
    }

    if (Array.isArray(target) !== Array.isArray(source)) {
      return conflictResolution === 'first' ? target : source;
    }

    // Both are objects
    const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    const sourceObj = source as Record<string, unknown>;

    for (const key of Object.keys(sourceObj)) {
      if (key in result) {
        result[key] = this.deepMergeObjects(result[key], sourceObj[key], conflictResolution);
      } else {
        result[key] = sourceObj[key];
      }
    }

    return result;
  }

  /**
   * Keyed merge mode: Merge items by matching key field
   */
  private mergeKeyed(branches: BranchDataMap[string][], keyField: string): unknown[] {
    const itemMap = new Map<string, Record<string, unknown>>();

    for (const branch of branches) {
      for (const item of branch.items) {
        if (typeof item !== 'object' || item === null) continue;

        const itemObj = item as Record<string, unknown>;
        const keyValue = String(itemObj[keyField] || '');

        if (!keyValue) {
          // No key, generate one
          const generatedKey = `_auto_${itemMap.size}`;
          itemMap.set(generatedKey, itemObj);
          continue;
        }

        const existing = itemMap.get(keyValue);
        if (existing) {
          // Merge with existing
          itemMap.set(keyValue, { ...existing, ...itemObj });
        } else {
          itemMap.set(keyValue, itemObj);
        }
      }
    }

    return Array.from(itemMap.values());
  }

  /**
   * Get list of pending branch IDs
   */
  private getPendingBranches(
    branchData: BranchDataMap,
    expectedBranches: number
  ): string[] {
    const completedIds = Object.keys(branchData);
    const pending: string[] = [];

    // We don't know exact branch IDs, so just return count
    for (let i = 0; i < expectedBranches - completedIds.length; i++) {
      pending.push(`pending-${i}`);
    }

    return pending;
  }

  /**
   * Get current merge state
   */
  async getMergeState(executionId: string, mergeNodeId: string): Promise<MergeNodeState | null> {
    const [state] = await this.db
      .select()
      .from(mergeNodeStates)
      .where(
        and(
          eq(mergeNodeStates.executionId, executionId),
          eq(mergeNodeStates.mergeNodeId, mergeNodeId)
        )
      )
      .limit(1);

    return state || null;
  }

  /**
   * Reset merge state (for retries)
   */
  async resetMergeState(executionId: string, mergeNodeId: string): Promise<void> {
    await this.db
      .delete(mergeNodeStates)
      .where(
        and(
          eq(mergeNodeStates.executionId, executionId),
          eq(mergeNodeStates.mergeNodeId, mergeNodeId)
        )
      );

    logger.info('[MERGE_EXECUTOR] Reset merge state', { executionId, mergeNodeId });
  }

  /**
   * Cancel pending merge (e.g., on timeout or error)
   */
  async cancelMerge(executionId: string, mergeNodeId: string, reason: string): Promise<void> {
    await this.db
      .update(mergeNodeStates)
      .set({
        isComplete: true,
        mergedOutput: [],
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mergeNodeStates.executionId, executionId),
          eq(mergeNodeStates.mergeNodeId, mergeNodeId)
        )
      );

    logger.warn('[MERGE_EXECUTOR] Merge cancelled', { executionId, mergeNodeId, reason });
  }

  /**
   * Get all incomplete merges for an execution
   */
  async getIncompleteMerges(executionId: string): Promise<MergeNodeState[]> {
    return this.db
      .select()
      .from(mergeNodeStates)
      .where(
        and(
          eq(mergeNodeStates.executionId, executionId),
          eq(mergeNodeStates.isComplete, false)
        )
      );
  }

  /**
   * Clean up completed merge states older than specified days
   */
  async cleanupOldStates(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // This would need a proper date comparison in the query
    // For now, just log the intent
    logger.info('[MERGE_EXECUTOR] Cleanup would remove states older than', {
      cutoffDate: cutoffDate.toISOString(),
    });

    return 0;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let mergeExecutorInstance: MergeExecutorV2 | null = null;

export function getMergeExecutor(): MergeExecutorV2 {
  if (!mergeExecutorInstance) {
    mergeExecutorInstance = new MergeExecutorV2();
  }
  return mergeExecutorInstance;
}

export default MergeExecutorV2;
