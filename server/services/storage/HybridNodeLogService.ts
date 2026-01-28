/**
 * HYBRID NODE LOG SERVICE
 *
 * Enhanced version of NodeLogService that uses LogStorageService
 * for automatic offloading of large payloads to blob storage.
 *
 * Drop-in replacement for NodeLogService with the same interface.
 *
 * **MULTI-ITEM SUPPORT (n8n-style)**:
 * - Logs now support item_executions array for per-item tracking
 * - Each item execution includes its own input, output, duration, and status
 * - Enables time-travel debugging at the item level
 */

import { getDb } from '@/lib/db';
import { workflowNodeLogs } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { logStorageService, LogStorageService } from './LogStorageService';
import { isStoragePointer } from '@/lib/storage/types';

const logger = createLogger('hybrid-node-log-service');

// ============================================================================
// TYPES
// ============================================================================

export interface LogNodeStartParams {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  input?: unknown;
  workspaceId?: string;
  /** Number of items being processed (for multi-item nodes) */
  itemCount?: number;
}

export interface LogNodeSuccessParams {
  logId: string;
  output?: unknown;
  durationMs: number;
  tokensUsed?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
  workspaceId?: string;
  /** Per-item execution details for multi-item processing */
  itemExecutions?: ItemExecutionLog[];
}

export interface LogNodeErrorParams {
  logId: string;
  error: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  /** Per-item execution details (some may have succeeded before error) */
  itemExecutions?: ItemExecutionLog[];
}

/**
 * Per-item execution log for multi-item processing
 */
export interface ItemExecutionLog {
  /** Item index in the input array */
  itemIndex: number;
  /** Input data for this specific item */
  input: unknown;
  /** Output data for this specific item */
  output: unknown;
  /** Status of this item's execution */
  status: 'success' | 'error' | 'skipped';
  /** Duration in milliseconds for this item */
  durationMs: number;
  /** Error message if this item failed */
  error?: string;
  /** Timestamp when this item started processing */
  startedAt: number;
  /** Timestamp when this item completed */
  completedAt: number;
}

export interface NodeLogRecord {
  id: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeName: string | null;
  status: 'started' | 'running' | 'success' | 'error' | 'skipped' | 'waiting';
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  tokensUsed: number | null;
  costUsd: string | null;
  metadata: Record<string, unknown> | null;
  retryCount: number | null;
  createdAt: Date;
  /** Per-item execution logs for multi-item processing */
  itemExecutions?: ItemExecutionLog[];
}

// ============================================================================
// HYBRID NODE LOG SERVICE
// ============================================================================

export class HybridNodeLogService {
  private static instance: HybridNodeLogService | null = null;
  private db = getDb();
  private storageService: LogStorageService;

  private constructor() {
    this.storageService = LogStorageService.getInstance();
    logger.info('HybridNodeLogService initialized');
  }

  static getInstance(): HybridNodeLogService {
    if (!HybridNodeLogService.instance) {
      HybridNodeLogService.instance = new HybridNodeLogService();
    }
    return HybridNodeLogService.instance;
  }

  /**
   * Create a log entry when a node starts execution
   *
   * Uses LogStorageService for automatic blob offloading of large inputs.
   */
  async logNodeStart(params: LogNodeStartParams): Promise<string | null> {
    try {
      // Use LogStorageService if input might be large
      const result = await this.storageService.saveLog(
        {
          executionId: params.executionId,
          workflowId: params.workflowId,
          nodeId: params.nodeId,
          nodeType: params.nodeType,
          nodeName: params.nodeName,
          status: 'started',
          input: params.input,
          startedAt: new Date(),
        },
        params.workspaceId || 'default'
      );

      if (result.success && result.logId) {
        if (result.inputOffloaded) {
          logger.debug('Node start logged with offloaded input', {
            logId: result.logId,
            nodeId: params.nodeId,
            inputSize: result.inputSize,
          });
        }
        return result.logId;
      }

      // Fallback to direct insert if storage service fails
      logger.warn('LogStorageService failed, using direct insert', {
        error: result.error,
      });

      const [log] = await this.db
        .insert(workflowNodeLogs)
        .values({
          executionId: params.executionId,
          workflowId: params.workflowId,
          nodeId: params.nodeId,
          nodeType: params.nodeType,
          nodeName: params.nodeName,
          status: 'started',
          input: params.input as any,
          startedAt: new Date(),
        })
        .returning({ id: workflowNodeLogs.id });

      return log.id;
    } catch (error: any) {
      logger.error('Failed to log node start', { error: error.message, params });
      return null; // Don't fail execution if logging fails
    }
  }

  /**
   * Update log entry when a node completes successfully
   *
   * Uses LogStorageService for automatic blob offloading of large outputs.
   * Supports multi-item execution logs via itemExecutions array.
   */
  async logNodeSuccess(params: LogNodeSuccessParams): Promise<void> {
    if (!params.logId) return;

    try {
      // Get the existing log to retrieve execution context
      const [existingLog] = await this.db
        .select({
          executionId: workflowNodeLogs.executionId,
          workflowId: workflowNodeLogs.workflowId,
          nodeId: workflowNodeLogs.nodeId,
        })
        .from(workflowNodeLogs)
        .where(eq(workflowNodeLogs.id, params.logId))
        .limit(1);

      if (!existingLog) {
        logger.warn('Log not found for update', { logId: params.logId });
        return;
      }

      // Check if output is large enough to offload
      const outputSize = this.getByteSize(params.output);
      const sizeThreshold = 10 * 1024; // 10KB

      let outputToStore: unknown = params.output;

      if (outputSize >= sizeThreshold && params.output !== undefined) {
        const key = this.generateStorageKey(
          params.workspaceId || 'default',
          existingLog.executionId,
          existingLog.nodeId,
          'output'
        );

        const uploadResult = await this.storageService
          .getStorageProvider()
          .upload(key, params.output);

        if (uploadResult.success) {
          outputToStore = {
            _storage: this.storageService.getStorageProvider().name as 's3' | 'local',
            key,
            size: uploadResult.size,
            offloadedAt: new Date().toISOString(),
          };

          logger.debug('Output offloaded to blob storage', {
            logId: params.logId,
            key,
            size: outputSize,
          });
        }
      }

      // Prepare metadata with item executions if provided
      const enhancedMetadata = {
        ...params.metadata,
        ...(params.itemExecutions && params.itemExecutions.length > 0
          ? {
              itemExecutions: await this.processItemExecutions(
                params.itemExecutions,
                params.workspaceId || 'default',
                existingLog.executionId,
                existingLog.nodeId
              ),
              itemCount: params.itemExecutions.length,
              successCount: params.itemExecutions.filter(i => i.status === 'success').length,
              errorCount: params.itemExecutions.filter(i => i.status === 'error').length,
            }
          : {}),
      };

      await this.db
        .update(workflowNodeLogs)
        .set({
          status: 'success',
          output: outputToStore as any,
          completedAt: new Date(),
          durationMs: params.durationMs,
          tokensUsed: params.tokensUsed,
          costUsd: params.costUsd?.toString(),
          metadata: enhancedMetadata as any,
        })
        .where(eq(workflowNodeLogs.id, params.logId));

      if (params.itemExecutions && params.itemExecutions.length > 0) {
        logger.debug('Node success logged with item executions', {
          logId: params.logId,
          itemCount: params.itemExecutions.length,
        });
      }
    } catch (error: any) {
      logger.error('Failed to log node success', { error: error.message, logId: params.logId });
    }
  }

  /**
   * Process item executions, offloading large payloads if needed
   */
  private async processItemExecutions(
    itemExecutions: ItemExecutionLog[],
    workspaceId: string,
    executionId: string,
    nodeId: string
  ): Promise<ItemExecutionLog[]> {
    const processed: ItemExecutionLog[] = [];
    const sizeThreshold = 5 * 1024; // 5KB per item

    for (const item of itemExecutions) {
      let processedItem = { ...item };

      // Check if item input is large enough to offload
      const inputSize = this.getByteSize(item.input);
      if (inputSize >= sizeThreshold && item.input !== undefined) {
        const key = this.generateStorageKey(
          workspaceId,
          executionId,
          nodeId,
          `item_${item.itemIndex}_input` as any
        );

        const uploadResult = await this.storageService
          .getStorageProvider()
          .upload(key, item.input);

        if (uploadResult.success) {
          processedItem.input = {
            _storage: this.storageService.getStorageProvider().name as 's3' | 'local',
            key,
            size: uploadResult.size,
          };
        }
      }

      // Check if item output is large enough to offload
      const outputSize = this.getByteSize(item.output);
      if (outputSize >= sizeThreshold && item.output !== undefined) {
        const key = this.generateStorageKey(
          workspaceId,
          executionId,
          nodeId,
          `item_${item.itemIndex}_output` as any
        );

        const uploadResult = await this.storageService
          .getStorageProvider()
          .upload(key, item.output);

        if (uploadResult.success) {
          processedItem.output = {
            _storage: this.storageService.getStorageProvider().name as 's3' | 'local',
            key,
            size: uploadResult.size,
          };
        }
      }

      processed.push(processedItem);
    }

    return processed;
  }

  /**
   * Update log entry when a node fails
   * Supports multi-item execution logs (partial success before error)
   */
  async logNodeError(params: LogNodeErrorParams): Promise<void> {
    if (!params.logId) return;

    try {
      // Get existing log context for item execution processing
      const [existingLog] = await this.db
        .select({
          executionId: workflowNodeLogs.executionId,
          workflowId: workflowNodeLogs.workflowId,
          nodeId: workflowNodeLogs.nodeId,
        })
        .from(workflowNodeLogs)
        .where(eq(workflowNodeLogs.id, params.logId))
        .limit(1);

      // Prepare metadata with item executions if provided
      const enhancedMetadata = {
        ...params.metadata,
        ...(params.itemExecutions && params.itemExecutions.length > 0 && existingLog
          ? {
              itemExecutions: await this.processItemExecutions(
                params.itemExecutions,
                'default',
                existingLog.executionId,
                existingLog.nodeId
              ),
              itemCount: params.itemExecutions.length,
              successCount: params.itemExecutions.filter(i => i.status === 'success').length,
              errorCount: params.itemExecutions.filter(i => i.status === 'error').length,
              failedAtItem: params.itemExecutions.findIndex(i => i.status === 'error'),
            }
          : {}),
      };

      await this.db
        .update(workflowNodeLogs)
        .set({
          status: 'error',
          error: params.error,
          completedAt: new Date(),
          durationMs: params.durationMs,
          metadata: enhancedMetadata as any,
        })
        .where(eq(workflowNodeLogs.id, params.logId));

      if (params.itemExecutions && params.itemExecutions.length > 0) {
        logger.debug('Node error logged with item executions', {
          logId: params.logId,
          itemCount: params.itemExecutions.length,
          failedItems: params.itemExecutions.filter(i => i.status === 'error').length,
        });
      }
    } catch (error: any) {
      logger.error('Failed to log node error', { error: error.message, logId: params.logId });
    }
  }

  /**
   * Get all logs for an execution with transparent hydration
   * Including hydration of item executions from blob storage
   */
  async getExecutionLogs(executionId: string): Promise<NodeLogRecord[]> {
    const logs = await this.db
      .select()
      .from(workflowNodeLogs)
      .where(eq(workflowNodeLogs.executionId, executionId))
      .orderBy(workflowNodeLogs.startedAt);

    // Hydrate offloaded data
    const hydratedLogs: NodeLogRecord[] = [];

    for (const log of logs) {
      let input = log.input;
      let output = log.output;
      let metadata = log.metadata as Record<string, unknown> | null;

      // Hydrate input if it's a storage pointer
      if (isStoragePointer(input)) {
        const downloaded = await this.storageService.getStorageProvider().download(input.key);
        if (downloaded.success) {
          input = downloaded.data;
        }
      }

      // Hydrate output if it's a storage pointer
      if (isStoragePointer(output)) {
        const downloaded = await this.storageService.getStorageProvider().download(output.key);
        if (downloaded.success) {
          output = downloaded.data;
        }
      }

      // Hydrate item executions if present in metadata
      if (metadata?.itemExecutions && Array.isArray(metadata.itemExecutions)) {
        const hydratedItemExecutions = await this.hydrateItemExecutions(
          metadata.itemExecutions as ItemExecutionLog[]
        );
        metadata = {
          ...metadata,
          itemExecutions: hydratedItemExecutions,
        };
      }

      hydratedLogs.push({
        ...log,
        input,
        output,
        metadata,
        itemExecutions: metadata?.itemExecutions as ItemExecutionLog[] | undefined,
      } as NodeLogRecord);
    }

    return hydratedLogs;
  }

  /**
   * Hydrate item executions from blob storage
   */
  private async hydrateItemExecutions(
    itemExecutions: ItemExecutionLog[]
  ): Promise<ItemExecutionLog[]> {
    const hydrated: ItemExecutionLog[] = [];

    for (const item of itemExecutions) {
      let hydratedItem = { ...item };

      // Hydrate input if it's a storage pointer
      if (isStoragePointer(item.input)) {
        const downloaded = await this.storageService
          .getStorageProvider()
          .download((item.input as any).key);
        if (downloaded.success) {
          hydratedItem.input = downloaded.data;
        }
      }

      // Hydrate output if it's a storage pointer
      if (isStoragePointer(item.output)) {
        const downloaded = await this.storageService
          .getStorageProvider()
          .download((item.output as any).key);
        if (downloaded.success) {
          hydratedItem.output = downloaded.data;
        }
      }

      hydrated.push(hydratedItem);
    }

    return hydrated;
  }

  /**
   * Get a single log with hydration
   */
  async getLog(logId: string): Promise<NodeLogRecord | null> {
    const result = await this.storageService.getLog(logId);

    if (!result.success || !result.log) {
      return null;
    }

    // Map the log data to NodeLogRecord format
    const log = result.log;
    return {
      id: log.id,
      executionId: log.executionId,
      workflowId: log.workflowId,
      nodeId: log.nodeId,
      nodeType: log.nodeType,
      nodeName: log.nodeName || null,
      status: log.status,
      input: log.input,
      output: log.output,
      error: log.error || null,
      startedAt: log.startedAt,
      completedAt: log.completedAt || null,
      durationMs: log.durationMs || null,
      tokensUsed: log.tokensUsed || null,
      costUsd: log.costUsd?.toString() || null,
      metadata: log.metadata || null,
      retryCount: log.retryCount || null,
      createdAt: log.createdAt,
    } as NodeLogRecord;
  }

  /**
   * Calculate byte size of a value
   */
  private getByteSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return Buffer.byteLength(str, 'utf-8');
  }

  /**
   * Generate storage key for a log payload
   * Supports item-specific keys for multi-item processing
   */
  private generateStorageKey(
    workspaceId: string,
    executionId: string,
    nodeId: string,
    type: 'input' | 'output' | `item_${number}_input` | `item_${number}_output`
  ): string {
    const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `logs/${workspaceId}/${executionId}/${sanitizedNodeId}_${type}.json`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hybridNodeLogService = HybridNodeLogService.getInstance();
export default hybridNodeLogService;
