/**
 * Motion Agents Database Schema
 * Drizzle ORM schema for Usemotion-style AI Agents
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  date,
  numeric,
  time,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================
// MOTION SKILLS TABLE
// ============================================

export const motionSkills = pgTable(
  'motion_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Skill Definition
    name: varchar('name', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    description: text('description'),

    // Trigger Configuration
    triggerType: varchar('trigger_type', { length: 50 }).notNull().default('manual'),
    triggerConfig: jsonb('trigger_config').default({}),
    cronExpression: varchar('cron_expression', { length: 100 }),

    // Execution Configuration
    steps: jsonb('steps').notNull().default([]),
    inputSchema: jsonb('input_schema'),
    outputFormat: varchar('output_format', { length: 50 }).default('text'),

    // Visibility & Access
    visibility: varchar('visibility', { length: 20 }).default('private'),
    status: varchar('status', { length: 20 }).default('draft'),
    isActive: boolean('is_active').default(true),

    // Execution Stats
    runCount: integer('run_count').default(0),
    lastRunAt: timestamp('last_run_at'),
    lastRunStatus: varchar('last_run_status', { length: 20 }),
    avgExecutionTimeMs: integer('avg_execution_time_ms'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    agentIdx: index('idx_motion_skills_agent').on(table.agentId),
    workspaceIdx: index('idx_motion_skills_workspace').on(table.workspaceId),
    userIdx: index('idx_motion_skills_user').on(table.userId),
    statusIdx: index('idx_motion_skills_status').on(table.status),
  })
);

// ============================================
// MOTION SKILL EXECUTIONS TABLE
// ============================================

export const motionSkillExecutions = pgTable(
  'motion_skill_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => motionSkills.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),

    // Execution Details
    triggerSource: varchar('trigger_source', { length: 50 }),
    input: jsonb('input'),
    output: jsonb('output'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    errorMessage: text('error_message'),

    // Steps Tracking
    stepsCompleted: jsonb('steps_completed').default([]),
    currentStep: integer('current_step').default(0),

    // Metrics
    executionTimeMs: integer('execution_time_ms'),
    tokensUsed: integer('tokens_used'),
    creditsConsumed: numeric('credits_consumed', { precision: 10, scale: 4 }),

    // Timestamps
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    skillIdx: index('idx_skill_exec_skill').on(table.skillId),
    statusIdx: index('idx_skill_exec_status').on(table.status),
    createdIdx: index('idx_skill_exec_created').on(table.createdAt),
    workspaceIdx: index('idx_skill_exec_workspace').on(table.workspaceId),
  })
);

// ============================================
// MOTION AGENT CONTEXT TABLE
// ============================================

export const motionAgentContext = pgTable(
  'motion_agent_context',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),

    // Context Data
    contextType: varchar('context_type', { length: 50 }).notNull(),
    contextKey: varchar('context_key', { length: 255 }).notNull(),
    contextValue: jsonb('context_value').notNull(),

    // Expiration
    expiresAt: timestamp('expires_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueCtx: uniqueIndex('idx_agent_context_unique').on(
      table.workspaceId,
      table.userId,
      table.agentId,
      table.contextKey
    ),
    typeIdx: index('idx_agent_context_type').on(table.contextType),
  })
);

// ============================================
// MOTION CREDIT USAGE TABLE
// ============================================

export const motionCreditUsage = pgTable(
  'motion_credit_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Usage Details
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    skillId: uuid('skill_id').references(() => motionSkills.id, { onDelete: 'set null' }),
    toolName: varchar('tool_name', { length: 100 }),

    // Credit Consumption
    creditsUsed: numeric('credits_used', { precision: 10, scale: 4 }).notNull(),
    creditType: varchar('credit_type', { length: 50 }).default('standard'),

    // Context
    operationType: varchar('operation_type', { length: 50 }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),

    // Billing Period
    billingPeriodStart: date('billing_period_start').notNull(),
    billingPeriodEnd: date('billing_period_end').notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('idx_credit_usage_workspace').on(table.workspaceId),
    periodIdx: index('idx_credit_usage_period').on(table.billingPeriodStart, table.billingPeriodEnd),
    agentIdx: index('idx_credit_usage_agent').on(table.agentId),
    userIdx: index('idx_credit_usage_user').on(table.userId),
    createdIdx: index('idx_credit_usage_created').on(table.createdAt),
  })
);

// ============================================
// MOTION CREDIT ALLOCATIONS TABLE
// ============================================

export const motionCreditAllocations = pgTable(
  'motion_credit_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Plan Details
    planType: varchar('plan_type', { length: 50 }).notNull(),
    monthlyCredits: integer('monthly_credits').notNull(),
    rolloverCredits: integer('rollover_credits').default(0),

    // Current Period
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    creditsUsed: numeric('credits_used', { precision: 12, scale: 4 }).default('0'),
    creditsRemaining: numeric('credits_remaining', { precision: 12, scale: 4 }),

    // Overage
    overageRate: numeric('overage_rate', { precision: 10, scale: 6 }),
    overageCredits: numeric('overage_credits', { precision: 12, scale: 4 }).default('0'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspacePeriodIdx: uniqueIndex('idx_credit_alloc_workspace_period').on(
      table.workspaceId,
      table.periodStart
    ),
    workspaceIdx: index('idx_credit_alloc_workspace').on(table.workspaceId),
  })
);

// ============================================
// MOTION APPROVAL REQUESTS TABLE
// ============================================

export const motionApprovalRequests = pgTable(
  'motion_approval_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),

    // Action Details
    action: varchar('action', { length: 255 }).notNull(),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    description: text('description'),
    payload: jsonb('payload').notNull(),
    preview: text('preview'),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at'),
    rejectedBy: uuid('rejected_by'),
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: text('rejection_reason'),

    // Expiration
    expiresAt: timestamp('expires_at'),

    // Link to skill execution
    skillExecutionId: uuid('skill_execution_id').references(() => motionSkillExecutions.id, {
      onDelete: 'set null',
    }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_approval_user').on(table.userId),
    workspaceIdx: index('idx_approval_workspace').on(table.workspaceId),
    agentIdx: index('idx_approval_agent').on(table.agentId),
  })
);

// ============================================
// MOTION CONVERSATIONS TABLE
// ============================================

export const motionConversations = pgTable(
  'motion_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),

    // Conversation Data
    messages: jsonb('messages').notNull().default([]),
    context: jsonb('context').default({}),

    // Status
    isActive: boolean('is_active').default(true),
    summary: text('summary'),

    // Metrics
    messageCount: integer('message_count').default(0),
    totalTokens: integer('total_tokens').default(0),
    totalCredits: numeric('total_credits', { precision: 10, scale: 4 }).default('0'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastMessageAt: timestamp('last_message_at'),
  },
  (table) => ({
    agentIdx: index('idx_motion_conv_agent').on(table.agentId),
    userIdx: index('idx_motion_conv_user').on(table.userId),
    workspaceIdx: index('idx_motion_conv_workspace').on(table.workspaceId),
    sessionIdx: index('idx_motion_conv_session').on(table.sessionId),
  })
);

// ============================================
// MOTION EVENTS TABLE
// ============================================

export const motionEvents = pgTable(
  'motion_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    agentId: varchar('agent_id', { length: 50 }),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),

    // Event Data
    payload: jsonb('payload').notNull().default({}),
    correlationId: uuid('correlation_id'),

    // Timestamps
    timestamp: timestamp('timestamp').defaultNow(),
  },
  (table) => ({
    typeIdx: index('idx_motion_events_type').on(table.eventType),
    agentIdx: index('idx_motion_events_agent').on(table.agentId),
    userIdx: index('idx_motion_events_user').on(table.userId),
    workspaceIdx: index('idx_motion_events_workspace').on(table.workspaceId),
    timestampIdx: index('idx_motion_events_timestamp').on(table.timestamp),
  })
);

// ============================================
// MOTION USER PREFERENCES TABLE
// ============================================

export const motionUserPreferences = pgTable(
  'motion_user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),

    // Communication Preferences
    communicationStyle: varchar('communication_style', { length: 20 }).default('professional'),
    defaultEmailSignature: text('default_email_signature'),

    // Working Hours
    workingHoursStart: time('working_hours_start').default('09:00'),
    workingHoursEnd: time('working_hours_end').default('17:00'),
    workingHoursTimezone: varchar('working_hours_timezone', { length: 50 }).default('UTC'),
    workDays: integer('work_days').array().default([1, 2, 3, 4, 5]),

    // Notification Preferences
    notifyEmail: boolean('notify_email').default(true),
    notifySlack: boolean('notify_slack').default(true),
    notifyInApp: boolean('notify_in_app').default(true),

    // Agent-specific Preferences
    agentPreferences: jsonb('agent_preferences').default({}),

    // Approval Preferences
    autoApproveLowRisk: boolean('auto_approve_low_risk').default(false),
    requireApprovalFor: jsonb('require_approval_for').default(['send_email', 'send_message', 'post_social']),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userWorkspaceIdx: uniqueIndex('idx_motion_prefs_user_workspace').on(table.userId, table.workspaceId),
  })
);

// ============================================
// MOTION INTEGRATIONS TABLE
// ============================================

export const motionIntegrations = pgTable(
  'motion_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),

    // Connection Status
    isConnected: boolean('is_connected').default(false),
    status: varchar('status', { length: 20 }).default('pending'),

    // Tokens
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),

    // Scopes & Metadata
    scopes: text('scopes').array().default([]),
    metadata: jsonb('metadata').default({}),

    // Sync Status
    lastSyncAt: timestamp('last_sync_at'),
    syncError: text('sync_error'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userProviderIdx: uniqueIndex('idx_motion_int_user_provider').on(
      table.userId,
      table.workspaceId,
      table.provider
    ),
    workspaceIdx: index('idx_motion_int_workspace').on(table.workspaceId),
    statusIdx: index('idx_motion_int_status').on(table.status),
  })
);

// ============================================
// TYPE EXPORTS
// ============================================

export type MotionSkill = typeof motionSkills.$inferSelect;
export type NewMotionSkill = typeof motionSkills.$inferInsert;

export type MotionSkillExecution = typeof motionSkillExecutions.$inferSelect;
export type NewMotionSkillExecution = typeof motionSkillExecutions.$inferInsert;

export type MotionAgentContextRecord = typeof motionAgentContext.$inferSelect;
export type NewMotionAgentContextRecord = typeof motionAgentContext.$inferInsert;

export type MotionCreditUsageRecord = typeof motionCreditUsage.$inferSelect;
export type NewMotionCreditUsageRecord = typeof motionCreditUsage.$inferInsert;

export type MotionCreditAllocation = typeof motionCreditAllocations.$inferSelect;
export type NewMotionCreditAllocation = typeof motionCreditAllocations.$inferInsert;

export type MotionApprovalRequestRecord = typeof motionApprovalRequests.$inferSelect;
export type NewMotionApprovalRequestRecord = typeof motionApprovalRequests.$inferInsert;

export type MotionConversationRecord = typeof motionConversations.$inferSelect;
export type NewMotionConversationRecord = typeof motionConversations.$inferInsert;

export type MotionEventRecord = typeof motionEvents.$inferSelect;
export type NewMotionEventRecord = typeof motionEvents.$inferInsert;

export type MotionUserPreferencesRecord = typeof motionUserPreferences.$inferSelect;
export type NewMotionUserPreferencesRecord = typeof motionUserPreferences.$inferInsert;

export type MotionIntegrationRecord = typeof motionIntegrations.$inferSelect;
export type NewMotionIntegrationRecord = typeof motionIntegrations.$inferInsert;
