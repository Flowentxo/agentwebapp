/**
 * MULTI-AGENT TEAMS SCHEMA
 * Enable agents to work together on complex tasks
 *
 * Philosophy: "Alone we can do so little; together we can do so much"
 * - Simple team creation
 * - Smart task routing
 * - Shared context and memory
 * - Automatic orchestration
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  integer,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Agent Teams
 * Groups of agents that work together
 */
export const agentTeams = pgTable(
  'agent_teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Team Info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 10 }).default('👥'),
    color: varchar('color', { length: 7 }).default('#3B82F6'),

    // Team Configuration
    orchestratorType: varchar('orchestrator_type', { length: 50 })
      .notNull()
      .default('sequential'), // 'sequential' | 'parallel' | 'conditional' | 'hierarchical'

    // Orchestrator Settings
    orchestratorSettings: jsonb('orchestrator_settings')
      .$type<{
        maxRounds?: number; // Max conversation rounds
        timeout?: number; // Timeout in ms
        fallbackBehavior?: 'error' | 'partial' | 'retry';
        handoffStrategy?: 'auto' | 'manual' | 'context-based';
      }>()
      .default(sql`'{}'::jsonb`),

    // Team Members (ordered list of agent IDs)
    memberAgentIds: jsonb('member_agent_ids')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Shared Context Configuration
    sharedContext: jsonb('shared_context')
      .$type<{
        enabled: boolean;
        retainHistory: boolean;
        maxContextSize?: number;
      }>()
      .default(sql`'{"enabled":true,"retainHistory":true}'::jsonb`),

    // Ownership
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    workspaceId: uuid('workspace_id'),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'inactive' | 'archived'

    // Metadata
    tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`),
    usageCount: integer('usage_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    createdByIdx: index('teams_created_by_idx').on(table.createdBy),
    workspaceIdIdx: index('teams_workspace_id_idx').on(table.workspaceId),
    statusIdx: index('teams_status_idx').on(table.status),
  })
);

/**
 * Team Executions
 * Track each time a team is used
 */
export const teamExecutions = pgTable(
  'team_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Team Info
    teamId: uuid('team_id')
      .notNull()
      .references(() => agentTeams.id, { onDelete: 'cascade' }),

    // User Context
    userId: varchar('user_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),

    // Execution Details
    userInput: text('user_input').notNull(),
    finalOutput: text('final_output'),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('running'), // 'running' | 'completed' | 'error' | 'timeout'

    // Performance
    totalLatencyMs: integer('total_latency_ms'),
    totalTokens: integer('total_tokens').notNull().default(0),
    totalCost: varchar('total_cost', { length: 20 }),

    // Trace
    traceId: varchar('trace_id', { length: 255 }),

    // Error Info
    error: jsonb('error').$type<{
      message: string;
      agentId?: string;
      step?: number;
    }>(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),

    // Timestamps
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    teamIdIdx: index('executions_team_id_idx').on(table.teamId),
    userIdIdx: index('executions_user_id_idx').on(table.userId),
    statusIdx: index('executions_status_idx').on(table.status),
    startedAtIdx: index('executions_started_at_idx').on(table.startedAt),
  })
);

/**
 * Team Execution Steps
 * Track each agent's contribution in a team execution
 */
export const teamExecutionSteps = pgTable(
  'team_execution_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Execution
    executionId: uuid('execution_id')
      .notNull()
      .references(() => teamExecutions.id, { onDelete: 'cascade' }),

    // Step Info
    stepNumber: integer('step_number').notNull(),
    agentId: varchar('agent_id', { length: 255 }).notNull(),

    // Input/Output
    input: text('input').notNull(),
    output: text('output'),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'error' | 'skipped'

    // Performance
    latencyMs: integer('latency_ms'),
    tokens: integer('tokens'),
    cost: varchar('cost', { length: 20 }),

    // Decision
    decision: jsonb('decision').$type<{
      action: 'complete' | 'handoff' | 'error' | 'retry';
      nextAgentId?: string;
      reason?: string;
    }>(),

    // Error
    error: text('error'),

    // Timestamps
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    executionIdIdx: index('steps_execution_id_idx').on(table.executionId),
    agentIdIdx: index('steps_agent_id_idx').on(table.agentId),
  })
);

/**
 * Shared Team Context
 * Memory that all team members can access
 */
export const teamSharedContext = pgTable(
  'team_shared_context',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Team & Session
    teamId: uuid('team_id')
      .notNull()
      .references(() => agentTeams.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 255 }).notNull(),

    // Context Data
    contextKey: varchar('context_key', { length: 255 }).notNull(), // e.g., 'customer_info', 'task_status', 'findings'
    contextValue: jsonb('context_value').notNull(),

    // Metadata
    createdBy: varchar('created_by', { length: 255 }).notNull(), // Which agent created this context
    accessCount: integer('access_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    teamSessionIdx: index('context_team_session_idx').on(table.teamId, table.sessionId),
    keyIdx: index('context_key_idx').on(table.contextKey),
  })
);

// Type exports
export type AgentTeam = typeof agentTeams.$inferSelect;
export type NewAgentTeam = typeof agentTeams.$inferInsert;

export type TeamExecution = typeof teamExecutions.$inferSelect;
export type NewTeamExecution = typeof teamExecutions.$inferInsert;

export type TeamExecutionStep = typeof teamExecutionSteps.$inferSelect;
export type NewTeamExecutionStep = typeof teamExecutionSteps.$inferInsert;

export type TeamSharedContext = typeof teamSharedContext.$inferSelect;
export type NewTeamSharedContext = typeof teamSharedContext.$inferInsert;
