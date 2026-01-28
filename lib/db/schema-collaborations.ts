/**
 * COLLABORATION LAB V2 - DATABASE SCHEMA
 *
 * Tabellen für echte AI-Collaboration mit Persistenz
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  index,
  varchar,
  pgEnum,
  decimal,
} from 'drizzle-orm/pg-core';

// ========================================
// ENUMS
// ========================================

export const collaborationStatusEnum = pgEnum('collaboration_status', [
  'planning',
  'executing',
  'debating',
  'completed',
  'paused',
  'failed'
]);

export const messageTypeEnum = pgEnum('collaboration_message_type', [
  'thought',
  'action',
  'question',
  'insight',
  'handoff',
  'user_input'
]);

// ========================================
// COLLABORATIONS TABLE
// ========================================

export const collaborations = pgTable('collaborations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  taskDescription: text('task_description').notNull(),
  status: collaborationStatusEnum('status').notNull().default('planning'),

  // Intelligence
  semanticAnalysis: jsonb('semantic_analysis'), // LLM analysis of task
  complexityScore: integer('complexity_score'), // 1-10
  estimatedDuration: integer('estimated_duration'), // seconds

  // Results
  summary: text('summary'),
  successScore: integer('success_score'), // 0-100

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('collab_user_id_idx').on(table.userId),
  statusIdx: index('collab_status_idx').on(table.status),
  createdAtIdx: index('collab_created_at_idx').on(table.createdAt),
}));

// ========================================
// COLLABORATION MESSAGES TABLE
// ========================================

export const collaborationMessages = pgTable('collaboration_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  collaborationId: uuid('collaboration_id')
    .notNull()
    .references(() => collaborations.id, { onDelete: 'cascade' }),

  // Agent Info
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  agentName: varchar('agent_name', { length: 100 }).notNull(),

  // Message Content
  content: text('content').notNull(),
  type: messageTypeEnum('type').notNull(),

  // AI Metadata
  llmModel: varchar('llm_model', { length: 100 }), // 'gpt-4-turbo', 'claude-3-opus', etc.
  tokensUsed: integer('tokens_used'),
  latencyMs: integer('latency_ms'),
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // 0.00-1.00

  // Relations
  parentMessageId: uuid('parent_message_id'), // for threading
  targetAgentId: varchar('target_agent_id', { length: 50 }), // for handoffs

  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  collaborationIdIdx: index('collab_msg_collab_id_idx').on(table.collaborationId),
  agentIdIdx: index('collab_msg_agent_id_idx').on(table.agentId),
  createdAtIdx: index('collab_msg_created_at_idx').on(table.createdAt),
}));

// ========================================
// COLLABORATION AGENTS TABLE
// ========================================

export const collaborationAgents = pgTable('collaboration_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  collaborationId: uuid('collaboration_id')
    .notNull()
    .references(() => collaborations.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 50 }).notNull(),

  // Selection Rationale
  selectionReason: text('selection_reason'),
  relevanceScore: decimal('relevance_score', { precision: 3, scale: 2 }), // 0.00-1.00

  // Performance
  messagesCount: integer('messages_count').default(0),
  avgConfidence: decimal('avg_confidence', { precision: 3, scale: 2 }),
  contributionScore: integer('contribution_score'), // 0-100

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  collaborationIdIdx: index('collab_agent_collab_id_idx').on(table.collaborationId),
  agentIdIdx: index('collab_agent_agent_id_idx').on(table.agentId),
}));

// ========================================
// AI USAGE TRACKING TABLE
// ========================================

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  collaborationId: uuid('collaboration_id').references(() => collaborations.id, { onDelete: 'set null' }),
  agentId: varchar('agent_id', { length: 50 }).notNull(),

  model: varchar('model', { length: 100 }).notNull(),
  tokensPrompt: integer('tokens_prompt').notNull(),
  tokensCompletion: integer('tokens_completion').notNull(),
  tokensTotal: integer('tokens_total').notNull(),
  cost: decimal('cost', { precision: 10, scale: 6 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('ai_usage_user_id_idx').on(table.userId),
  agentIdIdx: index('ai_usage_agent_id_idx').on(table.agentId),
  createdAtIdx: index('ai_usage_created_at_idx').on(table.createdAt),
}));

// ========================================
// TYPES
// ========================================

export type Collaboration = typeof collaborations.$inferSelect;
export type NewCollaboration = typeof collaborations.$inferInsert;

export type CollaborationMessage = typeof collaborationMessages.$inferSelect;
export type NewCollaborationMessage = typeof collaborationMessages.$inferInsert;

export type CollaborationAgent = typeof collaborationAgents.$inferSelect;
export type NewCollaborationAgent = typeof collaborationAgents.$inferInsert;

export type AIUsage = typeof aiUsage.$inferSelect;
export type NewAIUsage = typeof aiUsage.$inferInsert;
