/**
 * ExecutionSearchService.ts
 *
 * Phase 7: Operational Intelligence Layer
 *
 * Advanced search engine for workflow executions using PostgreSQL
 * full-text search (tsvector) and trigram matching (pg_trgm).
 *
 * Performance Strategy:
 * - Uses GIN-indexed tsvector for full-text queries
 * - Trigram index for fuzzy error message matching
 * - Composite indices for status + date filtering
 * - Query result caching for repeated searches
 * - Pagination with cursor-based approach for large result sets
 *
 * Key Features:
 * - Full-text search across workflow names, errors, payloads
 * - Filter by status, date range, workflow tags
 * - Search specific JSON paths (e.g., trigger.payload.email)
 * - Fuzzy matching for error messages
 * - Ranked results with relevance scoring
 */

import { getDb } from '@/lib/db';
import { sql, and, or, eq, gte, lte, like, inArray, desc, asc } from 'drizzle-orm';
import {
  executionSearchIndex,
  ExecutionSearchIndex,
} from '@/lib/db/schema-monitoring';
import { LRUCache } from 'lru-cache';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchQuery {
  /** Free-text search query */
  query?: string;

  /** Filter by execution status */
  status?: ExecutionStatus | ExecutionStatus[];

  /** Filter by workflow ID */
  workflowId?: string;

  /** Filter by workspace ID */
  workspaceId?: string;

  /** Filter by workflow tags (any match) */
  tags?: string[];

  /** Filter by date range */
  dateRange?: {
    from?: Date;
    to?: Date;
  };

  /** Filter by duration (ms) */
  durationRange?: {
    min?: number;
    max?: number;
  };

  /** Search specific JSON path values */
  jsonPaths?: JsonPathFilter[];

  /** Filter by error code */
  errorCode?: string;

  /** Fuzzy match error message */
  errorMessageLike?: string;

  /** Filter by trigger type */
  triggeredBy?: TriggerType | TriggerType[];

  /** Include only executions with loops */
  hasLoops?: boolean;

  /** Minimum token count */
  minTokens?: number;
}

export interface JsonPathFilter {
  /** JSON path (e.g., 'trigger.payload.email') */
  path: string;
  /** Value to match */
  value: string;
  /** Match type: exact, contains, starts_with */
  matchType?: 'exact' | 'contains' | 'starts_with';
}

export interface SearchOptions {
  /** Number of results per page */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Cursor for cursor-based pagination */
  cursor?: string;

  /** Sort field */
  sortBy?: 'startedAt' | 'duration' | 'relevance' | 'tokenCount';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';

  /** Include relevance score in results */
  includeScore?: boolean;

  /** Highlight matching terms */
  highlight?: boolean;
}

export interface SearchResult {
  /** Search results */
  results: ExecutionSearchResult[];

  /** Total count (estimated for large result sets) */
  total: number;

  /** Is total count exact or estimated? */
  totalExact: boolean;

  /** Next cursor for pagination */
  nextCursor?: string;

  /** Search metadata */
  meta: {
    queryTimeMs: number;
    indexUsed: string;
    searchTerms: string[];
  };
}

export interface ExecutionSearchResult extends ExecutionSearchIndex {
  /** Relevance score (0-1) */
  score?: number;

  /** Highlighted snippets */
  highlights?: {
    workflowName?: string;
    errorMessage?: string;
    payload?: string;
  };
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting';

export type TriggerType =
  | 'manual'
  | 'schedule'
  | 'webhook'
  | 'sub_workflow'
  | 'error_trigger';

// ============================================================================
// SEARCH RESULT CACHE
// ============================================================================

const searchCache = new LRUCache<string, SearchResult>({
  max: 100, // Max 100 cached searches
  ttl: 1000 * 60 * 2, // 2 minute TTL
});

function getCacheKey(query: SearchQuery, options: SearchOptions): string {
  return JSON.stringify({ query, options });
}

// ============================================================================
// EXECUTION SEARCH SERVICE
// ============================================================================

export class ExecutionSearchService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // MAIN SEARCH METHOD
  // --------------------------------------------------------------------------

  /**
   * Execute a search query against the execution search index.
   * Uses PostgreSQL full-text search for optimal performance.
   */
  async search(
    query: SearchQuery,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = getCacheKey(query, options);
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        meta: { ...cached.meta, queryTimeMs: 0 },
      };
    }

    const {
      limit = 50,
      offset = 0,
      sortBy = 'startedAt',
      sortOrder = 'desc',
      includeScore = false,
      highlight = false,
    } = options;

    // Build WHERE conditions
    const conditions = this.buildConditions(query);

    // Build ORDER BY
    const orderBy = this.buildOrderBy(sortBy, sortOrder, query.query);

    // Execute count query (with estimate for large tables)
    const totalResult = await this.getCount(conditions, query);

    // Execute search query
    let searchQuery: any;

    if (query.query && query.query.trim()) {
      // Full-text search with ranking
      searchQuery = await this.executeFullTextSearch(
        query.query,
        conditions,
        orderBy,
        limit,
        offset,
        includeScore,
        highlight
      );
    } else {
      // Simple filtered query
      searchQuery = await this.executeFilteredSearch(
        conditions,
        orderBy,
        limit,
        offset
      );
    }

    const results = searchQuery as ExecutionSearchResult[];

    // Build result
    const searchResult: SearchResult = {
      results,
      total: totalResult.count,
      totalExact: totalResult.exact,
      nextCursor:
        results.length === limit
          ? this.encodeCursor(results[results.length - 1])
          : undefined,
      meta: {
        queryTimeMs: Date.now() - startTime,
        indexUsed: query.query ? 'search_tsvector' : 'status_date',
        searchTerms: query.query ? this.tokenizeQuery(query.query) : [],
      },
    };

    // Cache result
    searchCache.set(cacheKey, searchResult);

    return searchResult;
  }

  // --------------------------------------------------------------------------
  // FULL-TEXT SEARCH
  // --------------------------------------------------------------------------

  private async executeFullTextSearch(
    queryText: string,
    conditions: any[],
    orderBy: any,
    limit: number,
    offset: number,
    includeScore: boolean,
    highlight: boolean
  ): Promise<ExecutionSearchResult[]> {
    const tsQuery = this.toTsQuery(queryText);

    // Build raw SQL for full-text search with ranking
    const result = await this.db.execute(sql`
      SELECT
        esi.*,
        ${includeScore ? sql`ts_rank(esi.search_tsvector, to_tsquery('english', ${tsQuery})) as score,` : sql``}
        ${
          highlight
            ? sql`
          ts_headline('english', esi.workflow_name, to_tsquery('english', ${tsQuery}),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as hl_workflow_name,
          ts_headline('english', esi.error_message, to_tsquery('english', ${tsQuery}),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=100, MinWords=30') as hl_error_message,
          ts_headline('english', esi.searchable_payload, to_tsquery('english', ${tsQuery}),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=100, MinWords=30') as hl_payload
        `
            : sql``
        }
      FROM execution_search_index esi
      WHERE esi.search_tsvector @@ to_tsquery('english', ${tsQuery})
        ${conditions.length > 0 ? sql`AND ${sql.join(conditions, sql` AND `)}` : sql``}
      ORDER BY
        ${includeScore ? sql`score DESC,` : sql``}
        ${orderBy}
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return (result.rows as any[]).map((row) => ({
      ...row,
      score: row.score ? parseFloat(row.score) : undefined,
      highlights: highlight
        ? {
            workflowName: row.hl_workflow_name,
            errorMessage: row.hl_error_message,
            payload: row.hl_payload,
          }
        : undefined,
    }));
  }

  // --------------------------------------------------------------------------
  // FILTERED SEARCH (NO FULL-TEXT)
  // --------------------------------------------------------------------------

  private async executeFilteredSearch(
    conditions: any[],
    orderBy: any,
    limit: number,
    offset: number
  ): Promise<ExecutionSearchResult[]> {
    let query = this.db
      .select()
      .from(executionSearchIndex)
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply ordering
    query = query.orderBy(orderBy) as any;

    return await query;
  }

  // --------------------------------------------------------------------------
  // BUILD CONDITIONS
  // --------------------------------------------------------------------------

  private buildConditions(query: SearchQuery): any[] {
    const conditions: any[] = [];

    // Status filter
    if (query.status) {
      const statuses = Array.isArray(query.status)
        ? query.status
        : [query.status];
      conditions.push(inArray(executionSearchIndex.status, statuses));
    }

    // Workflow ID filter
    if (query.workflowId) {
      conditions.push(eq(executionSearchIndex.workflowId, query.workflowId));
    }

    // Workspace ID filter
    if (query.workspaceId) {
      conditions.push(eq(executionSearchIndex.workspaceId, query.workspaceId));
    }

    // Date range filter
    if (query.dateRange) {
      if (query.dateRange.from) {
        conditions.push(
          gte(executionSearchIndex.startedAt, query.dateRange.from)
        );
      }
      if (query.dateRange.to) {
        conditions.push(lte(executionSearchIndex.startedAt, query.dateRange.to));
      }
    }

    // Duration range filter
    if (query.durationRange) {
      if (query.durationRange.min !== undefined) {
        conditions.push(
          gte(executionSearchIndex.durationMs, query.durationRange.min)
        );
      }
      if (query.durationRange.max !== undefined) {
        conditions.push(
          lte(executionSearchIndex.durationMs, query.durationRange.max)
        );
      }
    }

    // Tags filter (array containment)
    if (query.tags && query.tags.length > 0) {
      conditions.push(
        sql`${executionSearchIndex.workflowTags} && ${query.tags}`
      );
    }

    // Error code filter
    if (query.errorCode) {
      conditions.push(eq(executionSearchIndex.errorCode, query.errorCode));
    }

    // Fuzzy error message filter (trigram)
    if (query.errorMessageLike) {
      conditions.push(
        sql`${executionSearchIndex.errorMessage} % ${query.errorMessageLike}`
      );
    }

    // Trigger type filter
    if (query.triggeredBy) {
      const triggers = Array.isArray(query.triggeredBy)
        ? query.triggeredBy
        : [query.triggeredBy];
      conditions.push(inArray(executionSearchIndex.triggeredBy, triggers));
    }

    // Has loops filter
    if (query.hasLoops) {
      conditions.push(gte(executionSearchIndex.loopIterations, 1));
    }

    // Minimum tokens filter
    if (query.minTokens !== undefined) {
      conditions.push(gte(executionSearchIndex.tokenCount, query.minTokens));
    }

    // JSON path filters (search in payload)
    if (query.jsonPaths && query.jsonPaths.length > 0) {
      for (const pathFilter of query.jsonPaths) {
        const pathCondition = this.buildJsonPathCondition(pathFilter);
        if (pathCondition) {
          conditions.push(pathCondition);
        }
      }
    }

    return conditions;
  }

  // --------------------------------------------------------------------------
  // JSON PATH FILTERING
  // --------------------------------------------------------------------------

  /**
   * Build condition for searching specific JSON paths in payload.
   * Searches the flattened searchable_payload text field.
   */
  private buildJsonPathCondition(filter: JsonPathFilter): any {
    const { path, value, matchType = 'contains' } = filter;

    // Build search pattern: "path:value" or "path":"value"
    const searchPatterns = [
      `"${path}":"${value}"`,
      `"${path}": "${value}"`,
      `${path}:${value}`,
      `${path}: ${value}`,
    ];

    switch (matchType) {
      case 'exact':
        return or(
          ...searchPatterns.map((pattern) =>
            like(executionSearchIndex.searchablePayload, `%${pattern}%`)
          )
        );

      case 'starts_with':
        return or(
          like(
            executionSearchIndex.searchablePayload,
            `%"${path}":"${value}%`
          ),
          like(executionSearchIndex.searchablePayload, `%${path}:${value}%`)
        );

      case 'contains':
      default:
        // Use full-text search for contains
        return sql`${executionSearchIndex.searchablePayload} ILIKE ${'%' + value + '%'}`;
    }
  }

  // --------------------------------------------------------------------------
  // BUILD ORDER BY
  // --------------------------------------------------------------------------

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    hasQuery?: string
  ): any {
    const direction = sortOrder === 'asc' ? asc : desc;

    switch (sortBy) {
      case 'duration':
        return direction(executionSearchIndex.durationMs);

      case 'tokenCount':
        return direction(executionSearchIndex.tokenCount);

      case 'relevance':
        // Relevance only makes sense with full-text query
        if (hasQuery) {
          return sql`score DESC`;
        }
        return direction(executionSearchIndex.startedAt);

      case 'startedAt':
      default:
        return direction(executionSearchIndex.startedAt);
    }
  }

  // --------------------------------------------------------------------------
  // COUNT QUERY
  // --------------------------------------------------------------------------

  /**
   * Get count of matching executions.
   * Uses estimation for large result sets to avoid slow COUNT(*).
   */
  private async getCount(
    conditions: any[],
    query: SearchQuery
  ): Promise<{ count: number; exact: boolean }> {
    // For specific filters, we can get exact count efficiently
    if (query.workflowId || conditions.length <= 2) {
      let countQuery = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(executionSearchIndex);

      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }

      const result = await countQuery;
      return { count: Number(result[0]?.count || 0), exact: true };
    }

    // For broad queries, use estimation from EXPLAIN
    try {
      const explainResult = await this.db.execute(sql`
        EXPLAIN (FORMAT JSON)
        SELECT 1 FROM execution_search_index
        WHERE ${conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`1=1`}
      `);

      const plan = (explainResult.rows[0] as any)['QUERY PLAN'][0];
      const estimatedRows = plan.Plan['Plan Rows'] || 0;

      return { count: Math.round(estimatedRows), exact: false };
    } catch {
      // Fallback to exact count
      let countQuery = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(executionSearchIndex);

      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }

      const result = await countQuery;
      return { count: Number(result[0]?.count || 0), exact: true };
    }
  }

  // --------------------------------------------------------------------------
  // SPECIALIZED SEARCH METHODS
  // --------------------------------------------------------------------------

  /**
   * Find executions by email in trigger payload.
   * Optimized for common use case.
   */
  async findByEmail(
    email: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    return this.search(
      {
        jsonPaths: [
          { path: 'email', value: email, matchType: 'exact' },
          { path: 'trigger.payload.email', value: email, matchType: 'exact' },
          { path: 'contact.email', value: email, matchType: 'exact' },
        ],
      },
      options
    );
  }

  /**
   * Find failed executions with specific error pattern.
   * Uses trigram index for fuzzy matching.
   */
  async findByErrorPattern(
    pattern: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    return this.search(
      {
        status: 'failed',
        errorMessageLike: pattern,
      },
      options
    );
  }

  /**
   * Find slow executions (above duration threshold).
   */
  async findSlowExecutions(
    thresholdMs: number,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    return this.search(
      {
        status: 'completed',
        durationRange: { min: thresholdMs },
      },
      { ...options, sortBy: 'duration', sortOrder: 'desc' }
    );
  }

  /**
   * Find recent failures for a workflow.
   */
  async findRecentFailures(
    workflowId: string,
    windowMinutes: number = 60,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    return this.search(
      {
        workflowId,
        status: 'failed',
        dateRange: { from: windowStart },
      },
      { ...options, sortBy: 'startedAt', sortOrder: 'desc' }
    );
  }

  /**
   * Get execution statistics for a time window.
   */
  async getExecutionStats(
    workflowId: string | undefined,
    windowMinutes: number = 60
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    avgDurationMs: number;
    failureRate: number;
  }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const conditions: any[] = [
      gte(executionSearchIndex.startedAt, windowStart),
    ];

    if (workflowId) {
      conditions.push(eq(executionSearchIndex.workflowId, workflowId));
    }

    const result = await this.db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        AVG(duration_ms) as avg_duration_ms,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'failed')::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as failure_rate
      FROM execution_search_index
      WHERE ${sql.join(conditions, sql` AND `)}
    `);

    const row = result.rows[0] as any;

    return {
      total: Number(row.total || 0),
      completed: Number(row.completed || 0),
      failed: Number(row.failed || 0),
      running: Number(row.running || 0),
      avgDurationMs: parseFloat(row.avg_duration_ms || '0'),
      failureRate: parseFloat(row.failure_rate || '0'),
    };
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Convert user query to PostgreSQL tsquery format.
   */
  private toTsQuery(queryText: string): string {
    // Tokenize and clean
    const tokens = this.tokenizeQuery(queryText);

    if (tokens.length === 0) {
      return '';
    }

    // Join with OR for broader matching, AND for stricter
    // Using OR for better recall
    return tokens.map((t) => `${t}:*`).join(' | ');
  }

  /**
   * Tokenize search query into terms.
   */
  private tokenizeQuery(queryText: string): string[] {
    return queryText
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^\w@.-]/g, ''))
      .filter((t) => t.length >= 2);
  }

  /**
   * Encode cursor for pagination.
   */
  private encodeCursor(result: ExecutionSearchResult): string {
    return Buffer.from(
      JSON.stringify({
        id: result.id,
        startedAt: result.startedAt,
      })
    ).toString('base64');
  }

  /**
   * Decode pagination cursor.
   */
  decodeCursor(cursor: string): { id: string; startedAt: Date } {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  }

  // --------------------------------------------------------------------------
  // INDEX MAINTENANCE
  // --------------------------------------------------------------------------

  /**
   * Manually index an execution (for backfilling).
   */
  async indexExecution(executionId: string): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO execution_search_index (
        execution_id, workflow_id, workspace_id,
        workflow_name, workflow_tags, status,
        error_message, error_code, searchable_payload,
        started_at, completed_at, duration_ms,
        token_count, credit_cost, triggered_by,
        node_count, loop_iterations, partition_date
      )
      SELECT
        we.id,
        we.workflow_id,
        we.workspace_id,
        w.name,
        w.tags,
        we.status,
        we.error->>'message',
        we.error->>'code',
        COALESCE((we.context->>'trigger_payload')::text, '') || ' ' ||
          COALESCE((we.output->>'data')::text, ''),
        we.started_at,
        we.completed_at,
        EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) * 1000,
        COALESCE((we.metadata->>'token_count')::int, 0),
        COALESCE((we.metadata->>'credit_cost')::numeric, 0),
        we.trigger_type,
        COALESCE((we.metadata->>'node_count')::int, 0),
        COALESCE((we.metadata->>'loop_iterations')::int, 0),
        date_trunc('day', we.started_at)
      FROM workflow_executions we
      LEFT JOIN workflows w ON w.id = we.workflow_id
      WHERE we.id = ${executionId}
      ON CONFLICT (execution_id) DO UPDATE SET
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        completed_at = EXCLUDED.completed_at,
        duration_ms = EXCLUDED.duration_ms
    `);
  }

  /**
   * Backfill search index from workflow_executions.
   */
  async backfillIndex(
    batchSize: number = 1000,
    onProgress?: (indexed: number, total: number) => void
  ): Promise<number> {
    // Get total unindexed count
    const countResult = await this.db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM workflow_executions we
      WHERE NOT EXISTS (
        SELECT 1 FROM execution_search_index esi
        WHERE esi.execution_id = we.id
      )
    `);

    const total = Number((countResult.rows[0] as any).cnt);
    let indexed = 0;

    while (indexed < total) {
      await this.db.execute(sql`
        INSERT INTO execution_search_index (
          execution_id, workflow_id, workspace_id,
          workflow_name, workflow_tags, status,
          error_message, error_code, searchable_payload,
          started_at, completed_at, duration_ms,
          token_count, credit_cost, triggered_by,
          node_count, loop_iterations, partition_date
        )
        SELECT
          we.id,
          we.workflow_id,
          we.workspace_id,
          w.name,
          w.tags,
          we.status,
          we.error->>'message',
          we.error->>'code',
          COALESCE((we.context->>'trigger_payload')::text, '') || ' ' ||
            COALESCE((we.output->>'data')::text, ''),
          we.started_at,
          we.completed_at,
          EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) * 1000,
          COALESCE((we.metadata->>'token_count')::int, 0),
          COALESCE((we.metadata->>'credit_cost')::numeric, 0),
          we.trigger_type,
          COALESCE((we.metadata->>'node_count')::int, 0),
          COALESCE((we.metadata->>'loop_iterations')::int, 0),
          date_trunc('day', we.started_at)
        FROM workflow_executions we
        LEFT JOIN workflows w ON w.id = we.workflow_id
        WHERE NOT EXISTS (
          SELECT 1 FROM execution_search_index esi
          WHERE esi.execution_id = we.id
        )
        LIMIT ${batchSize}
        ON CONFLICT (execution_id) DO NOTHING
      `);

      indexed += batchSize;
      onProgress?.(Math.min(indexed, total), total);
    }

    return total;
  }

  /**
   * Clear search cache.
   */
  clearCache(): void {
    searchCache.clear();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: ExecutionSearchService | null = null;

export function getExecutionSearchService(): ExecutionSearchService {
  if (!instance) {
    instance = new ExecutionSearchService();
  }
  return instance;
}

export default ExecutionSearchService;
