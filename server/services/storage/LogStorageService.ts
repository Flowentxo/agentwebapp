/**
 * LOG STORAGE SERVICE
 *
 * Hybrid storage service that transparently handles large workflow logs.
 * Small payloads are stored directly in PostgreSQL, large payloads are
 * offloaded to blob storage with a pointer stored in the database.
 *
 * Key Features:
 * - Automatic size-based routing (< 10KB = DB, >= 10KB = Blob)
 * - Transparent read/write - callers don't need to know where data is stored
 * - Support for S3/MinIO and local filesystem
 * - Compression support for large payloads
 */

import { getDb } from '@/lib/db';
import { workflowNodeLogs } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import {
  IBlobStorageProvider,
  StoragePointer,
  isStoragePointer,
  LogStorageConfig,
  DEFAULT_LOG_STORAGE_CONFIG,
} from '@/lib/storage/types';
import { getS3StorageProvider } from './S3BlobStorageProvider';
import { getLocalStorageProvider } from './LocalFileStorageProvider';

const logger = createLogger('log-storage-service');

// ============================================================================
// TYPES
// ============================================================================

export interface NodeLogData {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  status: 'started' | 'running' | 'success' | 'error' | 'skipped' | 'waiting';
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
  retryCount?: number;
}

export interface SaveLogResult {
  success: boolean;
  logId?: string;
  inputOffloaded: boolean;
  outputOffloaded: boolean;
  inputSize: number;
  outputSize: number;
  error?: string;
}

export interface RetrieveLogResult {
  success: boolean;
  log?: NodeLogData & { id: string; createdAt: Date };
  error?: string;
}

// ============================================================================
// LOG STORAGE SERVICE
// ============================================================================

export class LogStorageService {
  private static instance: LogStorageService | null = null;
  private config: LogStorageConfig;
  private storageProvider: IBlobStorageProvider;

  private constructor(config?: Partial<LogStorageConfig>) {
    this.config = { ...DEFAULT_LOG_STORAGE_CONFIG, ...config };
    this.storageProvider = this.initializeProvider();

    logger.info('LogStorageService initialized', {
      provider: this.storageProvider.name,
      sizeThreshold: `${this.config.sizeThresholdBytes / 1024}KB`,
    });
  }

  static getInstance(config?: Partial<LogStorageConfig>): LogStorageService {
    if (!LogStorageService.instance) {
      LogStorageService.instance = new LogStorageService(config);
    }
    return LogStorageService.instance;
  }

  /**
   * Initialize the appropriate storage provider
   */
  private initializeProvider(): IBlobStorageProvider {
    const providerType = this.config.provider;

    if (providerType === 's3') {
      return getS3StorageProvider();
    }

    if (providerType === 'local') {
      return getLocalStorageProvider();
    }

    // Auto-detect: use S3 if configured, otherwise local
    if (process.env.S3_BUCKET || process.env.MINIO_BUCKET || process.env.AWS_ACCESS_KEY_ID) {
      return getS3StorageProvider();
    }

    return getLocalStorageProvider();
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
   */
  private generateStorageKey(
    workspaceId: string,
    executionId: string,
    nodeId: string,
    type: 'input' | 'output'
  ): string {
    // Path: logs/{workspaceId}/{executionId}/{nodeId}_{type}.json
    const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.config.basePath}/${workspaceId}/${executionId}/${sanitizedNodeId}_${type}.json`;
  }

  /**
   * Offload a payload to blob storage
   */
  private async offloadPayload(
    key: string,
    data: unknown
  ): Promise<StoragePointer | null> {
    const result = await this.storageProvider.upload(key, data, {
      contentType: 'application/json',
    });

    if (!result.success) {
      logger.error('Failed to offload payload', { key, error: result.error });
      return null;
    }

    const pointer: StoragePointer = {
      _storage: this.storageProvider.name as 's3' | 'local',
      key,
      size: result.size,
      offloadedAt: new Date().toISOString(),
    };

    return pointer;
  }

  /**
   * Retrieve a payload from blob storage
   */
  private async retrievePayload<T = unknown>(pointer: StoragePointer): Promise<T | null> {
    const result = await this.storageProvider.download<T>(pointer.key);

    if (!result.success) {
      logger.error('Failed to retrieve payload', { key: pointer.key, error: result.error });
      return null;
    }

    return result.data || null;
  }

  /**
   * Save a node log with hybrid storage
   *
   * - If input/output < 10KB: Store directly in PostgreSQL
   * - If input/output >= 10KB: Offload to blob storage, store pointer in DB
   */
  async saveLog(
    logData: NodeLogData,
    workspaceId: string = 'default'
  ): Promise<SaveLogResult> {
    const startTime = Date.now();

    try {
      const db = getDb();

      // Calculate sizes
      const inputSize = this.getByteSize(logData.input);
      const outputSize = this.getByteSize(logData.output);

      let inputToStore: unknown = logData.input;
      let outputToStore: unknown = logData.output;
      let inputOffloaded = false;
      let outputOffloaded = false;

      // Offload input if too large
      if (inputSize >= this.config.sizeThresholdBytes && logData.input !== undefined) {
        const key = this.generateStorageKey(
          workspaceId,
          logData.executionId,
          logData.nodeId,
          'input'
        );
        const pointer = await this.offloadPayload(key, logData.input);
        if (pointer) {
          inputToStore = pointer;
          inputOffloaded = true;
          logger.debug('Input offloaded to blob storage', {
            key,
            size: inputSize,
            nodeId: logData.nodeId,
          });
        }
      }

      // Offload output if too large
      if (outputSize >= this.config.sizeThresholdBytes && logData.output !== undefined) {
        const key = this.generateStorageKey(
          workspaceId,
          logData.executionId,
          logData.nodeId,
          'output'
        );
        const pointer = await this.offloadPayload(key, logData.output);
        if (pointer) {
          outputToStore = pointer;
          outputOffloaded = true;
          logger.debug('Output offloaded to blob storage', {
            key,
            size: outputSize,
            nodeId: logData.nodeId,
          });
        }
      }

      // Insert log record
      const [inserted] = await db
        .insert(workflowNodeLogs)
        .values({
          executionId: logData.executionId,
          workflowId: logData.workflowId,
          nodeId: logData.nodeId,
          nodeType: logData.nodeType,
          nodeName: logData.nodeName,
          status: logData.status,
          input: inputToStore as any,
          output: outputToStore as any,
          error: logData.error,
          startedAt: logData.startedAt,
          completedAt: logData.completedAt,
          durationMs: logData.durationMs,
          tokensUsed: logData.tokensUsed,
          costUsd: logData.costUsd?.toString(),
          metadata: logData.metadata as any,
          retryCount: logData.retryCount || 0,
        })
        .returning({ id: workflowNodeLogs.id });

      const durationMs = Date.now() - startTime;

      logger.debug('Log saved', {
        logId: inserted.id,
        nodeId: logData.nodeId,
        inputOffloaded,
        outputOffloaded,
        durationMs,
      });

      return {
        success: true,
        logId: inserted.id,
        inputOffloaded,
        outputOffloaded,
        inputSize,
        outputSize,
      };
    } catch (error: any) {
      logger.error('Failed to save log', {
        nodeId: logData.nodeId,
        error: error.message,
      });

      return {
        success: false,
        inputOffloaded: false,
        outputOffloaded: false,
        inputSize: 0,
        outputSize: 0,
        error: error.message,
      };
    }
  }

  /**
   * Retrieve a log with transparent hydration of offloaded payloads
   *
   * If input/output contains a storage pointer, automatically fetch
   * the data from blob storage and merge it back.
   */
  async getLog(logId: string): Promise<RetrieveLogResult> {
    try {
      const db = getDb();

      const [logRecord] = await db
        .select()
        .from(workflowNodeLogs)
        .where(eq(workflowNodeLogs.id, logId))
        .limit(1);

      if (!logRecord) {
        return {
          success: false,
          error: `Log not found: ${logId}`,
        };
      }

      // Hydrate input if it's a storage pointer
      let input = logRecord.input;
      if (isStoragePointer(input)) {
        const retrieved = await this.retrievePayload(input);
        if (retrieved !== null) {
          input = retrieved;
        } else {
          logger.warn('Failed to retrieve offloaded input', {
            logId,
            key: input.key,
          });
        }
      }

      // Hydrate output if it's a storage pointer
      let output = logRecord.output;
      if (isStoragePointer(output)) {
        const retrieved = await this.retrievePayload(output);
        if (retrieved !== null) {
          output = retrieved;
        } else {
          logger.warn('Failed to retrieve offloaded output', {
            logId,
            key: output.key,
          });
        }
      }

      return {
        success: true,
        log: {
          id: logRecord.id,
          executionId: logRecord.executionId,
          workflowId: logRecord.workflowId,
          nodeId: logRecord.nodeId,
          nodeType: logRecord.nodeType,
          nodeName: logRecord.nodeName || undefined,
          status: logRecord.status,
          input,
          output,
          error: logRecord.error || undefined,
          startedAt: logRecord.startedAt,
          completedAt: logRecord.completedAt || undefined,
          durationMs: logRecord.durationMs || undefined,
          tokensUsed: logRecord.tokensUsed || undefined,
          costUsd: logRecord.costUsd ? parseFloat(logRecord.costUsd) : undefined,
          metadata: logRecord.metadata as Record<string, unknown> | undefined,
          retryCount: logRecord.retryCount || undefined,
          createdAt: logRecord.createdAt,
        },
      };
    } catch (error: any) {
      logger.error('Failed to retrieve log', { logId, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get multiple logs with hydration
   */
  async getLogs(logIds: string[]): Promise<Map<string, RetrieveLogResult>> {
    const results = new Map<string, RetrieveLogResult>();

    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < logIds.length; i += batchSize) {
      const batch = logIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((id) => this.getLog(id).then((result) => ({ id, result })))
      );

      for (const { id, result } of batchResults) {
        results.set(id, result);
      }
    }

    return results;
  }

  /**
   * Delete blob storage data for a log
   */
  async deleteOffloadedData(logId: string): Promise<boolean> {
    try {
      const db = getDb();

      const [logRecord] = await db
        .select({
          input: workflowNodeLogs.input,
          output: workflowNodeLogs.output,
        })
        .from(workflowNodeLogs)
        .where(eq(workflowNodeLogs.id, logId))
        .limit(1);

      if (!logRecord) return true;

      const keysToDelete: string[] = [];

      if (isStoragePointer(logRecord.input)) {
        keysToDelete.push(logRecord.input.key);
      }

      if (isStoragePointer(logRecord.output)) {
        keysToDelete.push(logRecord.output.key);
      }

      if (keysToDelete.length > 0) {
        await this.storageProvider.deleteMany(keysToDelete);
        logger.debug('Deleted offloaded data', { logId, keysDeleted: keysToDelete.length });
      }

      return true;
    } catch (error: any) {
      logger.error('Failed to delete offloaded data', { logId, error: error.message });
      return false;
    }
  }

  /**
   * Get storage provider for direct access
   */
  getStorageProvider(): IBlobStorageProvider {
    return this.storageProvider;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.storageProvider.healthCheck();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const logStorageService = LogStorageService.getInstance();
export default logStorageService;
