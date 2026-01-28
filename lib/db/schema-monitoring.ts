/**
 * Schema: Operational Intelligence Layer
 *
 * Phase 7: Monitoring, Alerting & Search Infrastructure
 *
 * This schema provides:
 * - Full-text search indices for execution payloads
 * - Alert rules with flexible conditions
 * - Materialized views for efficient aggregations
 * - Queue health tracking tables
 *
 * Performance Considerations:
 * - tsvector columns for full-text search (GIN indexed)
 * - pg_trgm for fuzzy matching on error messages
 * - Materialized views refreshed on schedule (not real-time)
 * - Partitioned execution_search_index by date for efficient pruning
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const alertSeverityEnum = pgEnum('alert_severity', [
  'info',
  'warning',
  'error',
  'critical',
]);

export const alertStatusEnum = pgEnum('alert_status', [
  'active',
  'acknowledged',
  'resolved',
  'silenced',
]);

export const alertConditionTypeEnum = pgEnum('alert_condition_type', [
  'failure_count',      // X failures in Y minutes
  'failure_rate',       // >X% failure rate
  'duration_threshold', // Execution takes >X seconds
  'queue_backlog',      // >X jobs waiting
  'error_pattern',      // Specific error message regex
  'cost_threshold',     // Cost exceeds budget
  'custom',             // Custom SQL condition
]);

export const metricTypeEnum = pgEnum('metric_type', [
  'counter',
  'gauge',
  'histogram',
]);

// ============================================================================
// EXECUTION SEARCH INDEX
// ============================================================================

/**
 * Denormalized search index for fast full-text search across executions.
 * Populated by triggers/workers from workflow_executions table.
 *
 * Uses PostgreSQL tsvector for full-text search with GIN index.
 */
export const executionSearchIndex = pgTable(
  'execution_search_index',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign keys
    executionId: uuid('execution_id').notNull(),
    workflowId: uuid('workflow_id').notNull(),
    workspaceId: uuid('workspace_id'),

    // Searchable fields (denormalized)
    workflowName: varchar('workflow_name', { length: 255 }),
    workflowTags: text('workflow_tags').array(), // ['tag1', 'tag2']
    status: varchar('status', { length: 50 }).notNull(),
    errorMessage: text('error_message'),
    errorCode: varchar('error_code', { length: 100 }),

    // Flattened payload keys for search
    // Extracted from trigger.payload, node outputs, etc.
    searchablePayload: text('searchable_payload'), // JSON stringified key paths

    // Full-text search vector (auto-populated by trigger)
    // Combines: workflow_name, error_message, searchable_payload
    searchVector: text('search_vector'), // Will be tsvector in raw SQL

    // Timing
    startedAt: timestamp('started_at').notNull(),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),

    // Cost tracking
    tokenCount: integer('token_count').default(0),
    creditCost: numeric('credit_cost', { precision: 10, scale: 4 }).default('0'),

    // Metadata
    triggeredBy: varchar('triggered_by', { length: 100 }), // 'manual', 'schedule', 'webhook', 'sub_workflow'
    nodeCount: integer('node_count').default(0),
    loopIterations: integer('loop_iterations').default(0),

    // Partition key (for table partitioning)
    partitionDate: timestamp('partition_date').notNull().defaultNow(),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    // Primary lookup indices
    executionIdIdx: uniqueIndex('idx_search_execution_id').on(table.executionId),
    workflowIdIdx: index('idx_search_workflow_id').on(table.workflowId),
    workspaceIdIdx: index('idx_search_workspace_id').on(table.workspaceId),

    // Status + Date composite for filtered queries
    statusDateIdx: index('idx_search_status_date').on(table.status, table.startedAt),

    // Partition date for efficient pruning
    partitionDateIdx: index('idx_search_partition_date').on(table.partitionDate),

    // Duration for performance queries
    durationIdx: index('idx_search_duration').on(table.durationMs),

    // Tags using GIN for array containment
    // Note: Drizzle doesn't fully support GIN, we'll create via raw SQL
  })
);

// ============================================================================
// ALERT RULES
// ============================================================================

/**
 * Configurable alerting rules.
 * Rules are evaluated by the AlertingService background worker.
 */
export const alertRules = pgTable(
  'alert_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    workspaceId: uuid('workspace_id'),
    createdBy: uuid('created_by'),

    // Rule definition
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isEnabled: boolean('is_enabled').default(true),

    // Scope (null = global)
    workflowId: uuid('workflow_id'), // Specific workflow or null for all
    workflowTags: text('workflow_tags').array(), // Apply to workflows with these tags

    // Condition
    conditionType: alertConditionTypeEnum('condition_type').notNull(),
    conditionConfig: jsonb('condition_config').notNull(),
    /*
     * conditionConfig examples:
     *
     * failure_count: { threshold: 3, windowMinutes: 10 }
     * failure_rate: { threshold: 0.1, windowMinutes: 60, minSamples: 10 }
     * duration_threshold: { thresholdMs: 30000 }
     * queue_backlog: { queueName: 'workflow-execution', threshold: 100 }
     * error_pattern: { regex: 'rate.?limit', caseSensitive: false }
     * cost_threshold: { dailyBudget: 100.00, currency: 'USD' }
     * custom: { sql: 'SELECT COUNT(*) > 5 FROM ...' }
     */

    // Severity & Actions
    severity: alertSeverityEnum('severity').default('warning'),
    actions: jsonb('actions').default([]),
    /*
     * actions: [
     *   { type: 'slack', channel: '#alerts', template: '...' },
     *   { type: 'email', recipients: ['ops@company.com'] },
     *   { type: 'webhook', url: 'https://...' },
     *   { type: 'pagerduty', serviceKey: '...' }
     * ]
     */

    // Cooldown (prevent alert spam)
    cooldownMinutes: integer('cooldown_minutes').default(15),
    lastTriggeredAt: timestamp('last_triggered_at'),

    // Evaluation schedule
    evaluationIntervalSeconds: integer('evaluation_interval_seconds').default(60),
    lastEvaluatedAt: timestamp('last_evaluated_at'),

    // Metadata
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('idx_alert_rules_workspace').on(table.workspaceId),
    workflowIdx: index('idx_alert_rules_workflow').on(table.workflowId),
    enabledIdx: index('idx_alert_rules_enabled').on(table.isEnabled),
    conditionTypeIdx: index('idx_alert_rules_condition').on(table.conditionType),
  })
);

// ============================================================================
// ALERT INCIDENTS
// ============================================================================

/**
 * Triggered alert instances.
 * Created when an alert rule condition is met.
 */
export const alertIncidents = pgTable(
  'alert_incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Reference
    ruleId: uuid('rule_id').notNull(),
    workflowId: uuid('workflow_id'),
    workspaceId: uuid('workspace_id'),

    // Status
    status: alertStatusEnum('status').default('active'),
    severity: alertSeverityEnum('severity').notNull(),

    // Details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    context: jsonb('context').default({}),
    /*
     * context: {
     *   failureCount: 5,
     *   windowStart: '...',
     *   windowEnd: '...',
     *   affectedExecutions: ['uuid1', 'uuid2'],
     *   errorSamples: ['error msg 1', 'error msg 2']
     * }
     */

    // Actions taken
    actionResults: jsonb('action_results').default([]),
    /*
     * actionResults: [
     *   { type: 'slack', success: true, messageTs: '...' },
     *   { type: 'email', success: false, error: 'SMTP timeout' }
     * ]
     */

    // Resolution
    acknowledgedBy: uuid('acknowledged_by'),
    acknowledgedAt: timestamp('acknowledged_at'),
    resolvedBy: uuid('resolved_by'),
    resolvedAt: timestamp('resolved_at'),
    resolutionNote: text('resolution_note'),

    // Timing
    triggeredAt: timestamp('triggered_at').defaultNow(),
    expiresAt: timestamp('expires_at'), // Auto-resolve after this time

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    ruleIdIdx: index('idx_incidents_rule').on(table.ruleId),
    workflowIdIdx: index('idx_incidents_workflow').on(table.workflowId),
    statusIdx: index('idx_incidents_status').on(table.status),
    severityIdx: index('idx_incidents_severity').on(table.severity),
    triggeredAtIdx: index('idx_incidents_triggered').on(table.triggeredAt),
  })
);

// ============================================================================
// METRICS SNAPSHOTS
// ============================================================================

/**
 * Time-series metrics storage.
 * Populated by MetricsService aggregation jobs.
 */
export const metricsSnapshots = pgTable(
  'metrics_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Scope
    workspaceId: uuid('workspace_id'),
    workflowId: uuid('workflow_id'), // null = global

    // Metric identity
    metricName: varchar('metric_name', { length: 100 }).notNull(),
    metricType: metricTypeEnum('metric_type').notNull(),

    // Time bucket
    bucketStart: timestamp('bucket_start').notNull(),
    bucketEnd: timestamp('bucket_end').notNull(),
    bucketSizeMinutes: integer('bucket_size_minutes').notNull(), // 1, 5, 15, 60

    // Values
    value: numeric('value', { precision: 20, scale: 6 }).notNull(),
    count: integer('count').default(0), // For histograms: sample count

    // Histogram percentiles (for duration metrics)
    p50: numeric('p50', { precision: 20, scale: 6 }),
    p90: numeric('p90', { precision: 20, scale: 6 }),
    p95: numeric('p95', { precision: 20, scale: 6 }),
    p99: numeric('p99', { precision: 20, scale: 6 }),
    min: numeric('min', { precision: 20, scale: 6 }),
    max: numeric('max', { precision: 20, scale: 6 }),

    // Labels (for dimensional metrics)
    labels: jsonb('labels').default({}),
    /*
     * labels: { status: 'failed', trigger_type: 'webhook' }
     */

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    // Composite index for efficient time-series queries
    metricTimeIdx: index('idx_metrics_name_time').on(
      table.metricName,
      table.bucketStart
    ),
    workflowTimeIdx: index('idx_metrics_workflow_time').on(
      table.workflowId,
      table.bucketStart
    ),
    bucketSizeIdx: index('idx_metrics_bucket_size').on(table.bucketSizeMinutes),
  })
);

// ============================================================================
// QUEUE HEALTH
// ============================================================================

/**
 * Queue health snapshots from BullMQ.
 * Captured periodically by QueueMonitor.
 */
export const queueHealthSnapshots = pgTable(
  'queue_health_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    queueName: varchar('queue_name', { length: 100 }).notNull(),

    // Job counts
    waitingCount: integer('waiting_count').default(0),
    activeCount: integer('active_count').default(0),
    completedCount: integer('completed_count').default(0),
    failedCount: integer('failed_count').default(0),
    delayedCount: integer('delayed_count').default(0),
    pausedCount: integer('paused_count').default(0),

    // Worker info
    workerCount: integer('worker_count').default(0),

    // Performance
    jobsPerSecond: numeric('jobs_per_second', { precision: 10, scale: 2 }),
    avgProcessingTimeMs: integer('avg_processing_time_ms'),
    oldestWaitingJobAge: integer('oldest_waiting_job_age'), // seconds

    // Health status
    isHealthy: boolean('is_healthy').default(true),
    healthIssues: text('health_issues').array(),

    capturedAt: timestamp('captured_at').defaultNow(),
  },
  (table) => ({
    queueTimeIdx: index('idx_queue_health_queue_time').on(
      table.queueName,
      table.capturedAt
    ),
    capturedAtIdx: index('idx_queue_health_captured').on(table.capturedAt),
  })
);

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * Daily cost aggregations for budget tracking.
 */
export const dailyCostAggregates = pgTable(
  'daily_cost_aggregates',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Scope
    workspaceId: uuid('workspace_id'),
    workflowId: uuid('workflow_id'),

    // Date
    date: timestamp('date').notNull(),

    // Costs
    totalTokens: integer('total_tokens').default(0),
    totalCredits: numeric('total_credits', { precision: 12, scale: 4 }).default('0'),
    totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 4 }).default('0'),

    // Breakdown
    costByModel: jsonb('cost_by_model').default({}),
    /*
     * costByModel: {
     *   'gpt-4-turbo': { tokens: 10000, cost: 0.50 },
     *   'gpt-3.5-turbo': { tokens: 50000, cost: 0.10 }
     * }
     */

    // Execution stats
    executionCount: integer('execution_count').default(0),
    successCount: integer('success_count').default(0),
    failureCount: integer('failure_count').default(0),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // Unique per workspace/workflow/date
    uniqueDateIdx: uniqueIndex('idx_daily_cost_unique').on(
      table.workspaceId,
      table.workflowId,
      table.date
    ),
    dateIdx: index('idx_daily_cost_date').on(table.date),
  })
);

// ============================================================================
// RAW SQL FOR ADVANCED FEATURES
// ============================================================================

/**
 * Raw SQL statements to create features not supported by Drizzle ORM.
 * Execute these via migration or setup script.
 */
export const monitoringSetupSQL = {
  // Enable required extensions
  enableExtensions: `
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE EXTENSION IF NOT EXISTS btree_gin;
  `,

  // Add tsvector column with GIN index for full-text search
  addSearchVectorColumn: `
    -- Add actual tsvector column (Drizzle stores as text, we convert)
    ALTER TABLE execution_search_index
    ADD COLUMN IF NOT EXISTS search_tsvector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', COALESCE(workflow_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(error_message, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(searchable_payload, '')), 'C')
    ) STORED;

    -- GIN index for fast full-text search
    CREATE INDEX IF NOT EXISTS idx_search_tsvector
    ON execution_search_index USING GIN (search_tsvector);
  `,

  // Trigram index for fuzzy error message search
  addTrigramIndex: `
    CREATE INDEX IF NOT EXISTS idx_search_error_trgm
    ON execution_search_index USING GIN (error_message gin_trgm_ops);
  `,

  // GIN index for workflow tags array
  addTagsIndex: `
    CREATE INDEX IF NOT EXISTS idx_search_tags_gin
    ON execution_search_index USING GIN (workflow_tags);
  `,

  // Materialized view for hourly execution stats
  createHourlyStatsView: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_execution_stats AS
    SELECT
      date_trunc('hour', started_at) AS hour,
      workflow_id,
      workspace_id,
      status,
      COUNT(*) AS execution_count,
      AVG(duration_ms) AS avg_duration_ms,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_duration_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
      SUM(token_count) AS total_tokens,
      SUM(credit_cost::numeric) AS total_credits
    FROM execution_search_index
    WHERE started_at > NOW() - INTERVAL '30 days'
    GROUP BY date_trunc('hour', started_at), workflow_id, workspace_id, status
    WITH DATA;

    -- Index for fast lookups
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_hourly_stats_unique
    ON mv_hourly_execution_stats (hour, workflow_id, workspace_id, status);

    CREATE INDEX IF NOT EXISTS idx_mv_hourly_stats_hour
    ON mv_hourly_execution_stats (hour);
  `,

  // Materialized view for daily aggregates (pre-computed)
  createDailyStatsView: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_execution_stats AS
    SELECT
      date_trunc('day', started_at) AS day,
      workflow_id,
      workspace_id,
      COUNT(*) AS total_executions,
      COUNT(*) FILTER (WHERE status = 'completed') AS success_count,
      COUNT(*) FILTER (WHERE status = 'failed') AS failure_count,
      COUNT(*) FILTER (WHERE status = 'running') AS running_count,
      ROUND(
        COUNT(*) FILTER (WHERE status = 'failed')::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
      ) AS failure_rate_percent,
      AVG(duration_ms) AS avg_duration_ms,
      MAX(duration_ms) AS max_duration_ms,
      SUM(token_count) AS total_tokens,
      SUM(credit_cost::numeric) AS total_credits
    FROM execution_search_index
    WHERE started_at > NOW() - INTERVAL '90 days'
    GROUP BY date_trunc('day', started_at), workflow_id, workspace_id
    WITH DATA;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_stats_unique
    ON mv_daily_execution_stats (day, workflow_id, workspace_id);
  `,

  // Function to refresh materialized views
  createRefreshFunction: `
    CREATE OR REPLACE FUNCTION refresh_monitoring_views()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_execution_stats;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_execution_stats;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Trigger to auto-populate search index from workflow_executions
  createSearchIndexTrigger: `
    CREATE OR REPLACE FUNCTION populate_execution_search_index()
    RETURNS TRIGGER AS $$
    DECLARE
      wf_name TEXT;
      wf_tags TEXT[];
      searchable TEXT;
    BEGIN
      -- Get workflow info
      SELECT name, tags INTO wf_name, wf_tags
      FROM workflows WHERE id = NEW.workflow_id;

      -- Extract searchable payload (flatten key JSON paths)
      searchable := COALESCE(
        (NEW.context->>'trigger_payload')::text || ' ' ||
        (NEW.output->>'data')::text,
        ''
      );

      -- Insert or update search index
      INSERT INTO execution_search_index (
        execution_id, workflow_id, workspace_id,
        workflow_name, workflow_tags, status,
        error_message, error_code, searchable_payload,
        started_at, completed_at, duration_ms,
        token_count, credit_cost, triggered_by,
        node_count, loop_iterations, partition_date
      ) VALUES (
        NEW.id, NEW.workflow_id, NEW.workspace_id,
        wf_name, wf_tags, NEW.status,
        NEW.error->>'message', NEW.error->>'code', searchable,
        NEW.started_at, NEW.completed_at,
        EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000,
        COALESCE((NEW.metadata->>'token_count')::int, 0),
        COALESCE((NEW.metadata->>'credit_cost')::numeric, 0),
        NEW.trigger_type,
        COALESCE((NEW.metadata->>'node_count')::int, 0),
        COALESCE((NEW.metadata->>'loop_iterations')::int, 0),
        date_trunc('day', NEW.started_at)
      )
      ON CONFLICT (execution_id) DO UPDATE SET
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        error_code = EXCLUDED.error_code,
        completed_at = EXCLUDED.completed_at,
        duration_ms = EXCLUDED.duration_ms,
        token_count = EXCLUDED.token_count,
        credit_cost = EXCLUDED.credit_cost;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger on workflow_executions
    DROP TRIGGER IF EXISTS trg_populate_search_index ON workflow_executions;
    CREATE TRIGGER trg_populate_search_index
    AFTER INSERT OR UPDATE ON workflow_executions
    FOR EACH ROW EXECUTE FUNCTION populate_execution_search_index();
  `,

  // Cleanup old search index entries (data retention)
  createCleanupFunction: `
    CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data(retention_days INT DEFAULT 90)
    RETURNS void AS $$
    BEGIN
      -- Clean search index
      DELETE FROM execution_search_index
      WHERE partition_date < NOW() - (retention_days || ' days')::interval;

      -- Clean metrics snapshots
      DELETE FROM metrics_snapshots
      WHERE bucket_start < NOW() - (retention_days || ' days')::interval;

      -- Clean queue health snapshots (keep 7 days)
      DELETE FROM queue_health_snapshots
      WHERE captured_at < NOW() - INTERVAL '7 days';

      -- Clean resolved incidents (keep 30 days)
      DELETE FROM alert_incidents
      WHERE status = 'resolved'
        AND resolved_at < NOW() - INTERVAL '30 days';
    END;
    $$ LANGUAGE plpgsql;
  `,
};

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type ExecutionSearchIndex = typeof executionSearchIndex.$inferSelect;
export type NewExecutionSearchIndex = typeof executionSearchIndex.$inferInsert;

export type AlertRule = typeof alertRules.$inferSelect;
export type NewAlertRule = typeof alertRules.$inferInsert;

export type AlertIncident = typeof alertIncidents.$inferSelect;
export type NewAlertIncident = typeof alertIncidents.$inferInsert;

export type MetricsSnapshot = typeof metricsSnapshots.$inferSelect;
export type NewMetricsSnapshot = typeof metricsSnapshots.$inferInsert;

export type QueueHealthSnapshot = typeof queueHealthSnapshots.$inferSelect;
export type NewQueueHealthSnapshot = typeof queueHealthSnapshots.$inferInsert;

export type DailyCostAggregate = typeof dailyCostAggregates.$inferSelect;
export type NewDailyCostAggregate = typeof dailyCostAggregates.$inferInsert;

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'silenced';
export type AlertConditionType =
  | 'failure_count'
  | 'failure_rate'
  | 'duration_threshold'
  | 'queue_backlog'
  | 'error_pattern'
  | 'cost_threshold'
  | 'custom';

export interface FailureCountCondition {
  threshold: number;
  windowMinutes: number;
}

export interface FailureRateCondition {
  threshold: number; // 0.1 = 10%
  windowMinutes: number;
  minSamples: number;
}

export interface DurationThresholdCondition {
  thresholdMs: number;
}

export interface QueueBacklogCondition {
  queueName: string;
  threshold: number;
}

export interface ErrorPatternCondition {
  regex: string;
  caseSensitive: boolean;
}

export interface CostThresholdCondition {
  dailyBudget: number;
  currency: string;
}

export interface AlertAction {
  type: 'slack' | 'email' | 'webhook' | 'pagerduty';
  channel?: string;
  recipients?: string[];
  url?: string;
  serviceKey?: string;
  template?: string;
}
