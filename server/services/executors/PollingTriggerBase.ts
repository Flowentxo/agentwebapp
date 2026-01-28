/**
 * Polling Trigger Base
 *
 * Phase 4: Active Polling & Error Triggers
 *
 * Abstract base class for all polling-based trigger nodes.
 * Provides built-in deduplication logic and state management.
 *
 * Key Features:
 * - Multiple deduplication strategies (ID, timestamp, cursor, hash)
 * - Automatic static data management
 * - Configurable polling behavior
 * - Rate limiting support
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import {
  StaticDataContent,
  PollingTriggerConfig,
} from '@/lib/db/schema-static-data';
import { getStaticDataService } from '../data/WorkflowStaticDataService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PollingContext {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  executionId?: string;
  userId?: string;
  config: PollingTriggerConfig;
}

export interface PollingItem {
  /** Unique identifier for the item */
  id: string;
  /** Timestamp when the item was created/updated */
  timestamp?: string | Date;
  /** The actual data */
  data: unknown;
  /** Optional cursor for pagination */
  cursor?: string;
}

export interface PollingFetchResult {
  /** Items fetched from the source */
  items: PollingItem[];
  /** Whether there are more items to fetch */
  hasMore: boolean;
  /** Cursor for next page (if applicable) */
  nextCursor?: string;
  /** Metadata about the fetch */
  metadata?: Record<string, unknown>;
}

export interface PollingOutput {
  /** New items to process (after deduplication) */
  items: unknown[];
  /** Updated static data */
  staticData: StaticDataContent;
  /** Number of items filtered out by deduplication */
  filteredCount: number;
  /** Total items fetched before deduplication */
  totalFetched: number;
}

export type DeduplicationStrategy = 'id' | 'timestamp' | 'cursor' | 'hash' | 'none';

// ============================================================================
// ABSTRACT BASE CLASS
// ============================================================================

export abstract class PollingTriggerBase {
  protected staticDataService = getStaticDataService();
  protected nodeType: string;

  constructor(nodeType: string) {
    this.nodeType = nodeType;
  }

  // --------------------------------------------------------------------------
  // ABSTRACT METHODS (to be implemented by subclasses)
  // --------------------------------------------------------------------------

  /**
   * Fetch items from the external source
   * Subclasses must implement this method to define how items are fetched
   */
  protected abstract fetchItems(
    context: PollingContext,
    staticData: StaticDataContent
  ): Promise<PollingFetchResult>;

  /**
   * Extract the unique ID from an item
   * Used for ID-based deduplication
   */
  protected abstract extractItemId(item: unknown): string;

  /**
   * Extract the timestamp from an item
   * Used for timestamp-based deduplication
   */
  protected extractItemTimestamp(item: unknown): string | null {
    // Default implementation - subclasses can override
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const timestamp = obj.timestamp || obj.createdAt || obj.created_at ||
                       obj.updatedAt || obj.updated_at || obj.date;
      if (timestamp) {
        return typeof timestamp === 'string'
          ? timestamp
          : (timestamp as Date).toISOString();
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Execute the polling trigger
   * Fetches items, applies deduplication, and returns new items
   */
  async poll(context: PollingContext): Promise<PollingOutput> {
    const staticData = await this.staticDataService.get(
      context.workflowId,
      context.nodeId
    ) ?? {};

    // Fetch items from the source
    const fetchResult = await this.fetchItems(context, staticData);

    // Apply deduplication
    const dedupeResult = await this.applyDeduplication(
      fetchResult.items,
      staticData,
      context.config
    );

    // Prepare output
    const output: PollingOutput = {
      items: dedupeResult.newItems.map(item => item.data),
      staticData: dedupeResult.newStaticData,
      filteredCount: fetchResult.items.length - dedupeResult.newItems.length,
      totalFetched: fetchResult.items.length,
    };

    // Save updated static data
    await this.staticDataService.set(
      context.workflowId,
      context.nodeId,
      dedupeResult.newStaticData,
      {
        nodeType: this.nodeType,
        updatedBy: 'polling',
        executionId: context.executionId,
      }
    );

    return output;
  }

  /**
   * Poll and return result for PollingService integration
   */
  async pollForService(
    config: PollingTriggerConfig,
    staticData: StaticDataContent,
    context: Pick<PollingContext, 'workflowId' | 'nodeId'>
  ): Promise<{ items: unknown[]; newStaticData: StaticDataContent }> {
    const fullContext: PollingContext = {
      ...context,
      nodeType: this.nodeType,
      config,
    };

    const fetchResult = await this.fetchItems(fullContext, staticData);
    const dedupeResult = await this.applyDeduplication(
      fetchResult.items,
      staticData,
      config
    );

    return {
      items: dedupeResult.newItems.map(item => item.data),
      newStaticData: dedupeResult.newStaticData,
    };
  }

  // --------------------------------------------------------------------------
  // DEDUPLICATION LOGIC
  // --------------------------------------------------------------------------

  /**
   * Apply deduplication to fetched items
   */
  protected async applyDeduplication(
    items: PollingItem[],
    staticData: StaticDataContent,
    config: PollingTriggerConfig
  ): Promise<{
    newItems: PollingItem[];
    newStaticData: StaticDataContent;
  }> {
    const strategy = config.deduplicationStrategy ?? 'id';

    switch (strategy) {
      case 'id':
        return this.deduplicateById(items, staticData, config);
      case 'timestamp':
        return this.deduplicateByTimestamp(items, staticData, config);
      case 'cursor':
        return this.deduplicateByCursor(items, staticData, config);
      case 'hash':
        return this.deduplicateByHash(items, staticData, config);
      case 'none':
        return {
          newItems: items,
          newStaticData: this.updateStaticDataAfterPoll(staticData, items),
        };
      default:
        return this.deduplicateById(items, staticData, config);
    }
  }

  /**
   * Deduplicate by ID
   */
  protected deduplicateById(
    items: PollingItem[],
    staticData: StaticDataContent,
    config: PollingTriggerConfig
  ): {
    newItems: PollingItem[];
    newStaticData: StaticDataContent;
  } {
    const seenIds = new Set(staticData.seenIds ?? []);
    const lastId = staticData.lastId;

    const newItems: PollingItem[] = [];
    const newSeenIds: string[] = [];

    for (const item of items) {
      const itemId = item.id;

      // Skip if already seen
      if (seenIds.has(itemId)) {
        continue;
      }

      // Skip if ID is less than or equal to lastId (for numeric IDs)
      if (lastId !== undefined) {
        if (typeof lastId === 'number' && typeof itemId === 'string') {
          const numericId = parseInt(itemId, 10);
          if (!isNaN(numericId) && numericId <= lastId) {
            continue;
          }
        } else if (typeof lastId === 'string' && itemId <= lastId) {
          continue;
        }
      }

      newItems.push(item);
      newSeenIds.push(itemId);
    }

    // Update seen IDs (keep last N)
    const maxSeenIds = staticData.maxSeenIds ?? 10000;
    const allSeenIds = [...Array.from(seenIds), ...newSeenIds];
    const trimmedSeenIds = allSeenIds.slice(-maxSeenIds);

    // Find the new lastId
    const newLastId = newItems.length > 0
      ? newItems[newItems.length - 1].id
      : lastId;

    return {
      newItems,
      newStaticData: {
        ...staticData,
        seenIds: trimmedSeenIds,
        lastId: newLastId,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: newItems.length,
        },
      },
    };
  }

  /**
   * Deduplicate by timestamp
   */
  protected deduplicateByTimestamp(
    items: PollingItem[],
    staticData: StaticDataContent,
    config: PollingTriggerConfig
  ): {
    newItems: PollingItem[];
    newStaticData: StaticDataContent;
  } {
    const lastTimestamp = staticData.lastTimestamp
      ? new Date(staticData.lastTimestamp)
      : null;

    const newItems: PollingItem[] = [];
    let maxTimestamp = lastTimestamp;

    // Sort items by timestamp
    const sortedItems = [...items].sort((a, b) => {
      const tsA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tsB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tsA - tsB;
    });

    for (const item of sortedItems) {
      const itemTimestamp = item.timestamp ? new Date(item.timestamp) : null;

      // Skip items older than or equal to last timestamp
      if (itemTimestamp && lastTimestamp && itemTimestamp <= lastTimestamp) {
        continue;
      }

      newItems.push(item);

      // Track maximum timestamp
      if (itemTimestamp && (!maxTimestamp || itemTimestamp > maxTimestamp)) {
        maxTimestamp = itemTimestamp;
      }
    }

    return {
      newItems,
      newStaticData: {
        ...staticData,
        lastTimestamp: maxTimestamp?.toISOString() ?? staticData.lastTimestamp,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: newItems.length,
        },
      },
    };
  }

  /**
   * Deduplicate by cursor (for cursor-based pagination)
   */
  protected deduplicateByCursor(
    items: PollingItem[],
    staticData: StaticDataContent,
    config: PollingTriggerConfig
  ): {
    newItems: PollingItem[];
    newStaticData: StaticDataContent;
  } {
    // For cursor-based pagination, we assume all items after the cursor are new
    const lastCursor = staticData.cursor;

    // Find the last cursor in the batch
    const newCursor = items.length > 0
      ? items[items.length - 1].cursor
      : lastCursor;

    return {
      newItems: items,
      newStaticData: {
        ...staticData,
        cursor: newCursor,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: items.length,
        },
      },
    };
  }

  /**
   * Deduplicate by content hash
   */
  protected deduplicateByHash(
    items: PollingItem[],
    staticData: StaticDataContent,
    config: PollingTriggerConfig
  ): {
    newItems: PollingItem[];
    newStaticData: StaticDataContent;
  } {
    const seenHashes = new Set(staticData.seenIds ?? []); // Reuse seenIds for hashes
    const maxSeenIds = staticData.maxSeenIds ?? 10000;

    const newItems: PollingItem[] = [];
    const newHashes: string[] = [];

    for (const item of items) {
      const hash = this.computeItemHash(item.data);

      if (seenHashes.has(hash)) {
        continue;
      }

      newItems.push(item);
      newHashes.push(hash);
    }

    // Update seen hashes
    const allSeenHashes = [...Array.from(seenHashes), ...newHashes];
    const trimmedSeenHashes = allSeenHashes.slice(-maxSeenIds);

    return {
      newItems,
      newStaticData: {
        ...staticData,
        seenIds: trimmedSeenHashes,
        lastPoll: {
          timestamp: new Date().toISOString(),
          itemCount: newItems.length,
        },
      },
    };
  }

  /**
   * Compute a hash of an item's content
   */
  protected computeItemHash(item: unknown): string {
    const content = JSON.stringify(item, Object.keys(item as object).sort());
    return createHash('sha256').update(content).digest('hex').substring(0, 32);
  }

  /**
   * Update static data after a poll (for 'none' strategy)
   */
  protected updateStaticDataAfterPoll(
    staticData: StaticDataContent,
    items: PollingItem[]
  ): StaticDataContent {
    return {
      ...staticData,
      lastPoll: {
        timestamp: new Date().toISOString(),
        itemCount: items.length,
      },
    };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Convert raw items to PollingItem format
   */
  protected toPollingItems(
    items: unknown[],
    options: {
      idField?: string;
      timestampField?: string;
      cursorField?: string;
    } = {}
  ): PollingItem[] {
    const idField = options.idField ?? 'id';
    const timestampField = options.timestampField ?? 'timestamp';
    const cursorField = options.cursorField ?? 'cursor';

    return items.map((item, index) => {
      const obj = item as Record<string, unknown>;

      return {
        id: String(obj[idField] ?? this.extractItemId(item) ?? `item-${index}-${Date.now()}`),
        timestamp: obj[timestampField]
          ? String(obj[timestampField])
          : this.extractItemTimestamp(item) ?? undefined,
        cursor: obj[cursorField] ? String(obj[cursorField]) : undefined,
        data: item,
      };
    });
  }

  /**
   * Filter items by max count
   */
  protected limitItems(items: PollingItem[], maxItems?: number): PollingItem[] {
    if (!maxItems || maxItems <= 0) {
      return items;
    }
    return items.slice(0, maxItems);
  }

  /**
   * Sort items by timestamp (newest first)
   */
  protected sortByTimestamp(items: PollingItem[], ascending = true): PollingItem[] {
    return [...items].sort((a, b) => {
      const tsA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tsB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ascending ? tsA - tsB : tsB - tsA;
    });
  }

  /**
   * Create a default polling item ID
   */
  protected createDefaultId(): string {
    return randomUUID();
  }
}

// ============================================================================
// EXAMPLE IMPLEMENTATIONS
// ============================================================================

/**
 * Generic HTTP Polling Trigger
 * Polls an HTTP endpoint for new items
 */
export class HttpPollingTrigger extends PollingTriggerBase {
  constructor() {
    super('httpPollingTrigger');
  }

  protected async fetchItems(
    context: PollingContext,
    staticData: StaticDataContent
  ): Promise<PollingFetchResult> {
    const config = context.config;
    const requestConfig = config.requestConfig as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    } | undefined;

    if (!requestConfig?.url) {
      throw new Error('URL is required for HTTP polling trigger');
    }

    // Add cursor/timestamp to request if available
    const url = new URL(requestConfig.url);
    if (staticData.cursor) {
      url.searchParams.set('cursor', staticData.cursor);
    } else if (staticData.lastTimestamp) {
      url.searchParams.set('since', staticData.lastTimestamp);
    } else if (staticData.lastId) {
      url.searchParams.set('since_id', String(staticData.lastId));
    }

    const response = await fetch(url.toString(), {
      method: requestConfig.method ?? 'GET',
      headers: requestConfig.headers,
      body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP polling failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle different response formats
    const items = Array.isArray(data)
      ? data
      : data.items ?? data.data ?? data.results ?? [];

    const pollingItems = this.toPollingItems(items, {
      idField: config.deduplicationField ?? 'id',
    });

    return {
      items: this.limitItems(pollingItems, config.maxItems),
      hasMore: data.has_more ?? data.hasMore ?? false,
      nextCursor: data.next_cursor ?? data.nextCursor ?? data.cursor,
    };
  }

  protected extractItemId(item: unknown): string {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(obj.id ?? obj._id ?? obj.uuid ?? this.createDefaultId());
    }
    return this.createDefaultId();
  }
}

/**
 * Database Row Polling Trigger
 * Polls a database table for new rows
 */
export class DatabasePollingTrigger extends PollingTriggerBase {
  constructor() {
    super('databasePollingTrigger');
  }

  protected async fetchItems(
    context: PollingContext,
    staticData: StaticDataContent
  ): Promise<PollingFetchResult> {
    // This would use the database connection configured in the node
    // For now, return empty result as this requires database integration
    return {
      items: [],
      hasMore: false,
    };
  }

  protected extractItemId(item: unknown): string {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(obj.id ?? obj._id ?? this.createDefaultId());
    }
    return this.createDefaultId();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

const pollingTriggerRegistry = new Map<string, PollingTriggerBase>();

/**
 * Register a polling trigger implementation
 */
export function registerPollingTrigger(nodeType: string, trigger: PollingTriggerBase): void {
  pollingTriggerRegistry.set(nodeType, trigger);
}

/**
 * Get a polling trigger implementation
 */
export function getPollingTrigger(nodeType: string): PollingTriggerBase | undefined {
  return pollingTriggerRegistry.get(nodeType);
}

// Register default triggers
registerPollingTrigger('httpPollingTrigger', new HttpPollingTrigger());
registerPollingTrigger('databasePollingTrigger', new DatabasePollingTrigger());

export default PollingTriggerBase;
