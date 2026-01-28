/**
 * Data Pinning Service
 *
 * Phase 6: Builder Experience Enhancement
 *
 * Allows users to "pin" (cache) the output of any node for faster
 * development iterations. When pinned data exists, node execution
 * can be skipped and the cached data returned instead.
 *
 * Use Cases:
 * - Skip slow API calls during development
 * - Mock external service responses
 * - Test downstream nodes with consistent data
 * - Avoid side effects (email sends, etc.) during testing
 */

import { getDb } from '@/lib/db';
import {
  pinnedNodeData,
  nodeSchemaCache,
  PinnedNodeDataRecord,
  NewPinnedNodeDataRecord,
  PinMode,
  JSONSchemaDefinition,
  PinnedDataWithMeta,
} from '@/lib/db/schema-dx';
import { eq, and, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('data-pinning-service');

// ============================================================================
// TYPES
// ============================================================================

export interface PinNodeDataOptions {
  workflowId: string;
  nodeId: string;
  userId: string;
  output: unknown;
  mode?: PinMode;
  label?: string;
  description?: string;
  tags?: string[];
  sourceExecutionId?: string;
}

export interface GetPinnedDataOptions {
  workflowId: string;
  nodeId: string;
  userId: string;
  mode?: PinMode | PinMode[];
  isTestMode?: boolean;
}

export interface PinCheckResult {
  hasPinnedData: boolean;
  shouldUsePinned: boolean;
  pinnedData?: unknown;
  pinnedMeta?: {
    id: string;
    mode: PinMode;
    label?: string;
    usageCount: number;
  };
}

export interface UpdatePinOptions {
  output?: unknown;
  mode?: PinMode;
  isEnabled?: boolean;
  label?: string;
  description?: string;
  tags?: string[];
}

// ============================================================================
// DATA PINNING SERVICE
// ============================================================================

export class DataPinningService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // PIN MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Pin node output data for caching
   */
  async pinNodeData(options: PinNodeDataOptions): Promise<PinnedNodeDataRecord> {
    const {
      workflowId,
      nodeId,
      userId,
      output,
      mode = 'development',
      label,
      description,
      tags = [],
      sourceExecutionId,
    } = options;

    logger.info('Pinning node data', { workflowId, nodeId, userId, mode });

    // Generate schema from output
    const outputSchema = this.generateSchemaFromData(output);

    // Check if pin already exists
    const [existing] = await this.db
      .select()
      .from(pinnedNodeData)
      .where(
        and(
          eq(pinnedNodeData.workflowId, workflowId),
          eq(pinnedNodeData.nodeId, nodeId),
          eq(pinnedNodeData.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing pin
      const [updated] = await this.db
        .update(pinnedNodeData)
        .set({
          pinnedOutput: output as any,
          pinnedMeta: {
            pinnedAt: new Date().toISOString(),
            sourceExecutionId,
            itemCount: Array.isArray(output) ? output.length : undefined,
          },
          outputSchema: outputSchema as any,
          schemaSource: 'execution',
          mode,
          label,
          description,
          tags,
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(pinnedNodeData.id, existing.id))
        .returning();

      logger.info('Updated existing pin', { pinId: updated.id });
      return updated;
    }

    // Create new pin
    const [pin] = await this.db
      .insert(pinnedNodeData)
      .values({
        workflowId,
        nodeId,
        userId,
        pinnedOutput: output as any,
        pinnedMeta: {
          pinnedAt: new Date().toISOString(),
          sourceExecutionId,
          itemCount: Array.isArray(output) ? output.length : undefined,
        },
        outputSchema: outputSchema as any,
        schemaSource: 'execution',
        mode,
        label,
        description,
        tags,
        isEnabled: true,
      })
      .returning();

    logger.info('Created new pin', { pinId: pin.id });

    // Update schema cache
    await this.updateSchemaCache(workflowId, nodeId, output, 'pinned');

    return pin;
  }

  /**
   * Get pinned data for a node
   */
  async getPinnedData(
    workflowId: string,
    nodeId: string,
    userId: string
  ): Promise<PinnedDataWithMeta | null> {
    const [pin] = await this.db
      .select()
      .from(pinnedNodeData)
      .where(
        and(
          eq(pinnedNodeData.workflowId, workflowId),
          eq(pinnedNodeData.nodeId, nodeId),
          eq(pinnedNodeData.userId, userId)
        )
      )
      .limit(1);

    if (!pin) {
      return null;
    }

    return {
      id: pin.id,
      workflowId: pin.workflowId,
      nodeId: pin.nodeId,
      mode: pin.mode as PinMode,
      isEnabled: pin.isEnabled,
      output: pin.pinnedOutput,
      schema: pin.outputSchema as JSONSchemaDefinition | undefined,
      label: pin.label || undefined,
      description: pin.description || undefined,
      usageCount: pin.usageCount,
      createdAt: pin.createdAt,
      updatedAt: pin.updatedAt,
    };
  }

  /**
   * Check if pinned data should be used for execution
   * This is the main method called by the execution engine
   */
  async checkPinnedData(options: GetPinnedDataOptions): Promise<PinCheckResult> {
    const { workflowId, nodeId, userId, isTestMode = false } = options;

    const [pin] = await this.db
      .select()
      .from(pinnedNodeData)
      .where(
        and(
          eq(pinnedNodeData.workflowId, workflowId),
          eq(pinnedNodeData.nodeId, nodeId),
          eq(pinnedNodeData.userId, userId),
          eq(pinnedNodeData.isEnabled, true)
        )
      )
      .limit(1);

    if (!pin) {
      return { hasPinnedData: false, shouldUsePinned: false };
    }

    // Determine if we should use pinned data based on mode
    let shouldUsePinned = false;

    switch (pin.mode) {
      case 'always':
        shouldUsePinned = true;
        break;
      case 'development':
        shouldUsePinned = isTestMode;
        break;
      case 'on_error':
        // This will be handled by the caller after execution fails
        shouldUsePinned = false;
        break;
      case 'disabled':
        shouldUsePinned = false;
        break;
    }

    return {
      hasPinnedData: true,
      shouldUsePinned,
      pinnedData: shouldUsePinned ? pin.pinnedOutput : undefined,
      pinnedMeta: {
        id: pin.id,
        mode: pin.mode as PinMode,
        label: pin.label || undefined,
        usageCount: pin.usageCount,
      },
    };
  }

  /**
   * Record usage of pinned data (increment counter)
   */
  async recordPinUsage(pinId: string): Promise<void> {
    await this.db
      .update(pinnedNodeData)
      .set({
        usageCount: sql`${pinnedNodeData.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(pinnedNodeData.id, pinId));

    logger.debug('Recorded pin usage', { pinId });
  }

  /**
   * Update an existing pin
   */
  async updatePin(
    pinId: string,
    options: UpdatePinOptions
  ): Promise<PinnedNodeDataRecord | null> {
    const updates: Partial<NewPinnedNodeDataRecord> = {
      updatedAt: new Date(),
    };

    if (options.output !== undefined) {
      updates.pinnedOutput = options.output as any;
      updates.outputSchema = this.generateSchemaFromData(options.output) as any;
    }
    if (options.mode !== undefined) {
      updates.mode = options.mode;
    }
    if (options.isEnabled !== undefined) {
      updates.isEnabled = options.isEnabled;
    }
    if (options.label !== undefined) {
      updates.label = options.label;
    }
    if (options.description !== undefined) {
      updates.description = options.description;
    }
    if (options.tags !== undefined) {
      updates.tags = options.tags;
    }

    const [updated] = await this.db
      .update(pinnedNodeData)
      .set(updates)
      .where(eq(pinnedNodeData.id, pinId))
      .returning();

    return updated || null;
  }

  /**
   * Delete a pin
   */
  async deletePin(pinId: string): Promise<boolean> {
    const result = await this.db
      .delete(pinnedNodeData)
      .where(eq(pinnedNodeData.id, pinId))
      .returning({ id: pinnedNodeData.id });

    return result.length > 0;
  }

  /**
   * Delete all pins for a node
   */
  async deleteNodePins(workflowId: string, nodeId: string): Promise<number> {
    const result = await this.db
      .delete(pinnedNodeData)
      .where(
        and(
          eq(pinnedNodeData.workflowId, workflowId),
          eq(pinnedNodeData.nodeId, nodeId)
        )
      )
      .returning({ id: pinnedNodeData.id });

    return result.length;
  }

  /**
   * List all pins for a workflow
   */
  async listWorkflowPins(
    workflowId: string,
    userId?: string
  ): Promise<PinnedDataWithMeta[]> {
    let query = this.db
      .select()
      .from(pinnedNodeData)
      .where(eq(pinnedNodeData.workflowId, workflowId));

    if (userId) {
      query = this.db
        .select()
        .from(pinnedNodeData)
        .where(
          and(
            eq(pinnedNodeData.workflowId, workflowId),
            eq(pinnedNodeData.userId, userId)
          )
        );
    }

    const pins = await query;

    return pins.map(pin => ({
      id: pin.id,
      workflowId: pin.workflowId,
      nodeId: pin.nodeId,
      mode: pin.mode as PinMode,
      isEnabled: pin.isEnabled,
      output: pin.pinnedOutput,
      schema: pin.outputSchema as JSONSchemaDefinition | undefined,
      label: pin.label || undefined,
      description: pin.description || undefined,
      usageCount: pin.usageCount,
      createdAt: pin.createdAt,
      updatedAt: pin.updatedAt,
    }));
  }

  /**
   * Enable/disable a pin
   */
  async togglePin(pinId: string, isEnabled: boolean): Promise<boolean> {
    const [updated] = await this.db
      .update(pinnedNodeData)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(pinnedNodeData.id, pinId))
      .returning({ id: pinnedNodeData.id });

    return !!updated;
  }

  /**
   * Enable/disable all pins for a workflow
   */
  async toggleWorkflowPins(
    workflowId: string,
    isEnabled: boolean,
    userId?: string
  ): Promise<number> {
    let whereClause = eq(pinnedNodeData.workflowId, workflowId);

    if (userId) {
      whereClause = and(
        eq(pinnedNodeData.workflowId, workflowId),
        eq(pinnedNodeData.userId, userId)
      ) as any;
    }

    const result = await this.db
      .update(pinnedNodeData)
      .set({ isEnabled, updatedAt: new Date() })
      .where(whereClause)
      .returning({ id: pinnedNodeData.id });

    return result.length;
  }

  // --------------------------------------------------------------------------
  // SCHEMA GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate JSON Schema from data
   */
  private generateSchemaFromData(data: unknown): JSONSchemaDefinition {
    return this.inferSchema(data, '');
  }

  /**
   * Recursively infer schema from data
   */
  private inferSchema(value: unknown, path: string): JSONSchemaDefinition {
    if (value === null) {
      return { type: 'null' };
    }

    if (Array.isArray(value)) {
      const itemSchema = value.length > 0
        ? this.inferSchema(value[0], `${path}[0]`)
        : { type: 'object' as const };

      return {
        type: 'array',
        items: itemSchema,
        $flowentMeta: { path },
      };
    }

    switch (typeof value) {
      case 'string':
        return {
          type: 'string',
          examples: [value.length > 100 ? value.substring(0, 100) + '...' : value],
          $flowentMeta: { path },
        };

      case 'number':
        return {
          type: Number.isInteger(value) ? 'integer' : 'number',
          examples: [value],
          $flowentMeta: { path },
        };

      case 'boolean':
        return {
          type: 'boolean',
          examples: [value],
          $flowentMeta: { path },
        };

      case 'object':
        const properties: Record<string, JSONSchemaDefinition> = {};
        const required: string[] = [];

        for (const [key, val] of Object.entries(value as object)) {
          properties[key] = this.inferSchema(val, path ? `${path}.${key}` : key);
          if (val !== null && val !== undefined) {
            required.push(key);
          }
        }

        return {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
          $flowentMeta: { path },
        };

      default:
        return { type: 'string' };
    }
  }

  // --------------------------------------------------------------------------
  // SCHEMA CACHE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Update schema cache for a node
   */
  private async updateSchemaCache(
    workflowId: string,
    nodeId: string,
    data: unknown,
    source: 'execution' | 'pinned'
  ): Promise<void> {
    try {
      const schema = this.generateSchemaFromData(data);
      const paths = this.extractPaths(data, schema);

      await this.db
        .insert(nodeSchemaCache)
        .values({
          workflowId,
          nodeId,
          nodeType: 'unknown', // Will be updated by execution engine
          outputSchema: schema as any,
          schemaSource: source,
          confidence: source === 'execution' ? 100 : 90,
          sampleOutput: this.truncateSample(data) as any,
          samplePaths: paths as any,
          sourceTimestamp: new Date(),
          isStale: false,
        })
        .onConflictDoUpdate({
          target: [nodeSchemaCache.workflowId, nodeSchemaCache.nodeId],
          set: {
            outputSchema: schema as any,
            schemaSource: source,
            confidence: source === 'execution' ? 100 : 90,
            sampleOutput: this.truncateSample(data) as any,
            samplePaths: paths as any,
            sourceTimestamp: new Date(),
            isStale: false,
            updatedAt: new Date(),
          },
        });

      logger.debug('Updated schema cache', { workflowId, nodeId, source });
    } catch (error) {
      logger.error('Failed to update schema cache', {
        workflowId,
        nodeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Extract variable paths from data for autocomplete
   */
  private extractPaths(
    data: unknown,
    schema: JSONSchemaDefinition,
    basePath: string = ''
  ): Array<{
    path: string;
    type: string;
    label: string;
    example?: unknown;
  }> {
    const paths: Array<{
      path: string;
      type: string;
      label: string;
      example?: unknown;
    }> = [];

    this.traverseData(data, basePath, (path, value, type) => {
      paths.push({
        path,
        type,
        label: path.split('.').pop() || path,
        example: this.truncateValue(value),
      });
    });

    return paths.slice(0, 200); // Limit to prevent huge caches
  }

  /**
   * Traverse data structure and call callback for each path
   */
  private traverseData(
    data: unknown,
    path: string,
    callback: (path: string, value: unknown, type: string) => void,
    depth: number = 0
  ): void {
    if (depth > 10) return; // Prevent infinite recursion

    const type = this.getDataType(data);
    callback(path, data, type);

    if (type === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data as object)) {
        const newPath = path ? `${path}.${key}` : key;
        this.traverseData(value, newPath, callback, depth + 1);
      }
    } else if (type === 'array' && Array.isArray(data) && data.length > 0) {
      // Only traverse first item of array
      this.traverseData(data[0], `${path}[0]`, callback, depth + 1);
    }
  }

  /**
   * Get data type as string
   */
  private getDataType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Truncate sample data for storage
   */
  private truncateSample(data: unknown, maxSize: number = 10000): unknown {
    const str = JSON.stringify(data);
    if (str.length <= maxSize) {
      return data;
    }

    // For large data, return summary
    if (Array.isArray(data)) {
      return {
        _truncated: true,
        _type: 'array',
        _length: data.length,
        _sample: data.slice(0, 3),
      };
    }

    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const sample: Record<string, unknown> = { _truncated: true };
      for (const key of keys.slice(0, 10)) {
        sample[key] = this.truncateValue((data as any)[key]);
      }
      return sample;
    }

    return data;
  }

  /**
   * Truncate a single value
   */
  private truncateValue(value: unknown): unknown {
    if (typeof value === 'string' && value.length > 200) {
      return value.substring(0, 200) + '...';
    }
    if (Array.isArray(value) && value.length > 5) {
      return [...value.slice(0, 5), `... (${value.length - 5} more)`];
    }
    return value;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let dataPinningServiceInstance: DataPinningService | null = null;

export function getDataPinningService(): DataPinningService {
  if (!dataPinningServiceInstance) {
    dataPinningServiceInstance = new DataPinningService();
  }
  return dataPinningServiceInstance;
}

export default DataPinningService;
