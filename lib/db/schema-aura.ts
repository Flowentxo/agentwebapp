/**
 * PHASE 1: Aura Agent Database Schema
 * Workflow Automation & Task Scheduling Tables
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const auraWorkflowStatusEnum = pgEnum('aura_workflow_status', [
  'draft',
  'active',
  'paused',
  'archived',
  'error'
]);

export const auraExecutionStatusEnum = pgEnum('aura_execution_status', [
  'pending',
  'queued',
  'running',
  'waiting',    // Waiting for external trigger/callback
  'completed',
  'failed',
  'cancelled',
  'timeout'
]);

export const auraTriggerTypeEnum = pgEnum('aura_trigger_type', [
  'manual',
  'schedule',
  'webhook',
  'event',
  'condition',
  'agent'       // Triggered by another agent
]);

export const auraActionTypeEnum = pgEnum('aura_action_type', [
  'http_request',
  'send_email',
  'send_slack',
  'database_query',
  'ai_completion',
  'transform_data',
  'condition_check',
  'delay',
  'agent_call',
  'custom_code'
]);

export const auraScheduleFrequencyEnum = pgEnum('aura_schedule_frequency', [
  'once',
  'minutely',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'cron'
]);

// ============================================
// AURA WORKFLOWS
// Persistent workflow definitions
// ============================================

export const auraWorkflows = pgTable(
  'aura_workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Basic Info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    version: varchar('version', { length: 50 }).notNull().default('1.0.0'),

    // Workflow Definition
    nodes: jsonb('nodes').$type<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }[]>().notNull().default([]),

    edges: jsonb('edges').$type<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
      condition?: Record<string, unknown>;
    }[]>().notNull().default([]),

    // Trigger Configuration
    triggerType: auraTriggerTypeEnum('trigger_type').notNull().default('manual'),
    triggerConfig: jsonb('trigger_config').$type<{
      schedule?: string;      // Cron expression
      webhookPath?: string;
      eventType?: string;
      conditions?: Record<string, unknown>[];
    }>().default({}),

    // Input/Output Schema
    inputSchema: jsonb('input_schema').$type<Record<string, unknown>>().default({}),
    outputSchema: jsonb('output_schema').$type<Record<string, unknown>>().default({}),

    // Variables & Context
    variables: jsonb('variables').$type<{
      name: string;
      type: string;
      defaultValue?: unknown;
      description?: string;
    }[]>().default([]),

    // Settings
    settings: jsonb('settings').$type<{
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
      errorHandler?: string;
      parallelExecution?: boolean;
      maxConcurrent?: number;
    }>().default({}),

    // Status
    status: auraWorkflowStatusEnum('status').notNull().default('draft'),
    isTemplate: boolean('is_template').default(false),

    // Metrics
    executionCount: integer('execution_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    avgDurationMs: integer('avg_duration_ms'),
    lastExecutedAt: timestamp('last_executed_at'),

    // Tags
    tags: jsonb('tags').$type<string[]>().default([]),
    category: varchar('category', { length: 100 }),

    // Audit
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    updatedBy: varchar('updated_by', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    publishedAt: timestamp('published_at'),
  },
  (table) => ({
    workspaceIdx: index('aura_wf_workspace_idx').on(table.workspaceId),
    statusIdx: index('aura_wf_status_idx').on(table.status),
    triggerIdx: index('aura_wf_trigger_idx').on(table.triggerType),
    templateIdx: index('aura_wf_template_idx').on(table.isTemplate),
    tagsIdx: index('aura_wf_tags_idx').using('gin', table.tags),
    categoryIdx: index('aura_wf_category_idx').on(table.category),
  })
);

// ============================================
// AURA WORKFLOW EXECUTIONS
// Execution history and state
// ============================================

export const auraWorkflowExecutions = pgTable(
  'aura_workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),

    // Execution Context
    triggeredBy: varchar('triggered_by', { length: 255 }).notNull(),
    triggerType: auraTriggerTypeEnum('trigger_type').notNull(),
    triggerData: jsonb('trigger_data').$type<Record<string, unknown>>().default({}),

    // Input/Output
    input: jsonb('input').$type<Record<string, unknown>>().default({}),
    output: jsonb('output').$type<Record<string, unknown>>(),
    context: jsonb('context').$type<Record<string, unknown>>().default({}), // Runtime variables

    // Status
    status: auraExecutionStatusEnum('status').notNull().default('pending'),
    currentNodeId: varchar('current_node_id', { length: 100 }),
    progress: integer('progress').default(0), // 0-100

    // Node Execution State
    nodeStates: jsonb('node_states').$type<{
      nodeId: string;
      status: string;
      startedAt?: string;
      completedAt?: string;
      output?: unknown;
      error?: string;
      retryCount?: number;
    }[]>().default([]),

    // Logs
    logs: jsonb('logs').$type<{
      timestamp: string;
      level: 'debug' | 'info' | 'warn' | 'error';
      nodeId?: string;
      message: string;
      data?: unknown;
    }[]>().default([]),

    // Error Handling
    error: text('error'),
    errorNodeId: varchar('error_node_id', { length: 100 }),
    errorStack: text('error_stack'),
    retryCount: integer('retry_count').default(0),

    // Performance
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),

    // BullMQ Job Reference
    jobId: varchar('job_id', { length: 255 }),
    queueName: varchar('queue_name', { length: 100 }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workflowIdx: index('aura_exec_workflow_idx').on(table.workflowId),
    workspaceIdx: index('aura_exec_workspace_idx').on(table.workspaceId),
    statusIdx: index('aura_exec_status_idx').on(table.status),
    triggeredByIdx: index('aura_exec_triggered_idx').on(table.triggeredBy),
    startedAtIdx: index('aura_exec_started_idx').on(table.startedAt),
    jobIdIdx: index('aura_exec_job_idx').on(table.jobId),
  })
);

// ============================================
// AURA AUTOMATION RULES
// Event-driven automation rules
// ============================================

export const auraAutomationRules = pgTable(
  'aura_automation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Rule Info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    priority: integer('priority').notNull().default(0),

    // Trigger Event
    eventType: varchar('event_type', { length: 100 }).notNull(),
    eventSource: varchar('event_source', { length: 100 }), // agent_id, integration, system

    // Conditions (all must match)
    conditions: jsonb('conditions').$type<{
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'regex';
      value: unknown;
    }[]>().notNull().default([]),

    // Actions to execute
    actions: jsonb('actions').$type<{
      id: string;
      type: string;
      config: Record<string, unknown>;
      order: number;
    }[]>().notNull().default([]),

    // Linked Workflow (optional)
    workflowId: uuid('workflow_id'),

    // Rate Limiting
    cooldownSeconds: integer('cooldown_seconds').default(0),
    maxExecutionsPerHour: integer('max_executions_per_hour'),
    lastTriggeredAt: timestamp('last_triggered_at'),

    // Metrics
    triggerCount: integer('trigger_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),

    // Validity Period
    validFrom: timestamp('valid_from'),
    validTo: timestamp('valid_to'),

    // Audit
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('aura_rule_workspace_idx').on(table.workspaceId),
    activeIdx: index('aura_rule_active_idx').on(table.isActive),
    eventTypeIdx: index('aura_rule_event_idx').on(table.eventType),
    priorityIdx: index('aura_rule_priority_idx').on(table.priority),
    workflowIdx: index('aura_rule_workflow_idx').on(table.workflowId),
  })
);

// ============================================
// AURA SCHEDULED TASKS
// BullMQ-backed scheduled jobs
// ============================================

export const auraScheduledTasks = pgTable(
  'aura_scheduled_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Task Info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),

    // Schedule
    frequency: auraScheduleFrequencyEnum('frequency').notNull(),
    cronExpression: varchar('cron_expression', { length: 100 }),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),

    // For non-cron schedules
    intervalValue: integer('interval_value'),
    dayOfWeek: integer('day_of_week'), // 0-6 for weekly
    dayOfMonth: integer('day_of_month'), // 1-31 for monthly
    timeOfDay: varchar('time_of_day', { length: 8 }), // HH:MM:SS

    // What to execute
    taskType: varchar('task_type', { length: 50 }).notNull(), // workflow, action, agent_call
    workflowId: uuid('workflow_id'),
    actionConfig: jsonb('action_config').$type<{
      type: string;
      config: Record<string, unknown>;
    }>(),

    // Input Data
    inputData: jsonb('input_data').$type<Record<string, unknown>>().default({}),

    // BullMQ Job Reference
    bullJobId: varchar('bull_job_id', { length: 255 }),
    bullJobKey: varchar('bull_job_key', { length: 255 }),

    // Execution Info
    nextRunAt: timestamp('next_run_at'),
    lastRunAt: timestamp('last_run_at'),
    lastRunStatus: auraExecutionStatusEnum('last_run_status'),
    lastRunDurationMs: integer('last_run_duration_ms'),
    lastRunError: text('last_run_error'),

    // Metrics
    totalRuns: integer('total_runs').notNull().default(0),
    successRuns: integer('success_runs').notNull().default(0),
    failedRuns: integer('failed_runs').notNull().default(0),
    avgDurationMs: integer('avg_duration_ms'),

    // Retry Config
    maxRetries: integer('max_retries').default(3),
    retryDelayMs: integer('retry_delay_ms').default(60000),

    // Date Range
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),

    // Audit
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('aura_task_workspace_idx').on(table.workspaceId),
    activeIdx: index('aura_task_active_idx').on(table.isActive),
    frequencyIdx: index('aura_task_freq_idx').on(table.frequency),
    nextRunIdx: index('aura_task_next_run_idx').on(table.nextRunAt),
    workflowIdx: index('aura_task_workflow_idx').on(table.workflowId),
    bullJobIdx: uniqueIndex('aura_task_bull_job_idx').on(table.bullJobId),
  })
);

// ============================================
// AURA WORKFLOW VERSIONS
// Version history for workflows
// ============================================

export const auraWorkflowVersions = pgTable(
  'aura_workflow_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').notNull(),

    // Version Info
    version: varchar('version', { length: 50 }).notNull(),
    changeDescription: text('change_description'),

    // Snapshot
    nodes: jsonb('nodes').$type<unknown[]>().notNull(),
    edges: jsonb('edges').$type<unknown[]>().notNull(),
    triggerConfig: jsonb('trigger_config').$type<Record<string, unknown>>(),
    variables: jsonb('variables').$type<unknown[]>(),
    settings: jsonb('settings').$type<Record<string, unknown>>(),

    // Audit
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    workflowIdx: index('aura_ver_workflow_idx').on(table.workflowId),
    versionIdx: uniqueIndex('aura_ver_version_idx').on(table.workflowId, table.version),
    createdAtIdx: index('aura_ver_created_idx').on(table.createdAt),
  })
);

// ============================================
// AURA EVENT LOG
// Event history for debugging and analytics
// ============================================

export const auraEventLog = pgTable(
  'aura_event_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Event Info
    eventType: varchar('event_type', { length: 100 }).notNull(),
    eventSource: varchar('event_source', { length: 100 }).notNull(),
    eventData: jsonb('event_data').$type<Record<string, unknown>>().notNull(),

    // Processing Info
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at'),
    processedBy: varchar('processed_by', { length: 255 }),

    // Related Entities
    workflowId: uuid('workflow_id'),
    executionId: uuid('execution_id'),
    ruleId: uuid('rule_id'),

    // Timestamp
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('aura_event_workspace_idx').on(table.workspaceId),
    eventTypeIdx: index('aura_event_type_idx').on(table.eventType),
    processedIdx: index('aura_event_processed_idx').on(table.processed),
    createdAtIdx: index('aura_event_created_idx').on(table.createdAt),
  })
);

// ============================================
// EXPORT TYPES
// ============================================

export type AuraWorkflow = typeof auraWorkflows.$inferSelect;
export type NewAuraWorkflow = typeof auraWorkflows.$inferInsert;

export type AuraWorkflowExecution = typeof auraWorkflowExecutions.$inferSelect;
export type NewAuraWorkflowExecution = typeof auraWorkflowExecutions.$inferInsert;

export type AuraAutomationRule = typeof auraAutomationRules.$inferSelect;
export type NewAuraAutomationRule = typeof auraAutomationRules.$inferInsert;

export type AuraScheduledTask = typeof auraScheduledTasks.$inferSelect;
export type NewAuraScheduledTask = typeof auraScheduledTasks.$inferInsert;

export type AuraWorkflowVersion = typeof auraWorkflowVersions.$inferSelect;
export type NewAuraWorkflowVersion = typeof auraWorkflowVersions.$inferInsert;

export type AuraEventLog = typeof auraEventLog.$inferSelect;
export type NewAuraEventLog = typeof auraEventLog.$inferInsert;
