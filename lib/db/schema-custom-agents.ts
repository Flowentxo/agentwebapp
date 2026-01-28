/**
 * CUSTOM AGENTS SCHEMA
 *
 * Database schema for user-created custom agents (like OpenAI GPTs)
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  boolean,
  pgEnum,
  vector,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const customAgentVisibilityEnum = pgEnum('custom_agent_visibility', [
  'private',
  'team',
  'public',
  'listed',
]);

export const customAgentStatusEnum = pgEnum('custom_agent_status', [
  'draft',
  'active',
  'archived',
]);

/**
 * Custom Agents Table
 */
export const customAgents = pgTable('custom_agents', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 500 }), // URL or emoji
  color: varchar('color', { length: 7 }).default('#3B82F6'), // Hex color

  // Configuration
  systemInstructions: text('system_instructions').notNull(),
  model: varchar('model', { length: 100 }).notNull().default('gpt-5.1'),
  temperature: varchar('temperature', { length: 10 }).default('0.7'),
  maxTokens: varchar('max_tokens', { length: 10 }).default('4000'),

  // Conversation Starters
  conversationStarters: jsonb('conversation_starters')
    .$type<string[]>()
    .default(sql`'[]'::jsonb`),

  // Capabilities
  capabilities: jsonb('capabilities')
    .$type<{
      webBrowsing: boolean;
      codeInterpreter: boolean;
      imageGeneration: boolean;
      knowledgeBase: boolean;
      customActions: boolean;
    }>()
    .default(sql`'{"webBrowsing":false,"codeInterpreter":false,"imageGeneration":false,"knowledgeBase":false,"customActions":false}'::jsonb`),

  // Advanced Settings
  fallbackChain: varchar('fallback_chain', { length: 50 }).default('standard'),
  responseFormat: varchar('response_format', { length: 50 }).default('text'),

  // Privacy & Access
  visibility: customAgentVisibilityEnum('visibility').notNull().default('private'),
  status: customAgentStatusEnum('status').notNull().default('draft'),

  // Ownership
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  workspaceId: uuid('workspace_id'),

  // Metadata
  usageCount: varchar('usage_count', { length: 20 }).default('0'),
  rating: varchar('rating', { length: 10 }),
  tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  publishedAt: timestamp('published_at'),
});

/**
 * Agent Knowledge Base (Files)
 */
export const agentKnowledgeBase = pgTable('agent_knowledge_base', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => customAgents.id, { onDelete: 'cascade' }),

  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSize: varchar('file_size', { length: 20 }).notNull(), // bytes
  fileUrl: text('file_url').notNull(),

  processedAt: timestamp('processed_at'),
  chunkCount: varchar('chunk_count', { length: 10 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Agent Custom Actions
 */
export const agentActions = pgTable('agent_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => customAgents.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // OpenAPI Configuration
  schema: jsonb('schema').notNull(), // OpenAPI spec
  authentication: jsonb('authentication')
    .$type<{
      type: 'none' | 'api_key' | 'oauth';
      config?: Record<string, any>;
    }>()
    .default(sql`'{"type":"none"}'::jsonb`),

  enabled: boolean('enabled').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Action Execution Logs
 *
 * Tracks all custom action executions for monitoring and debugging
 */
export const actionExecutionLogs = pgTable(
  'action_execution_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // References
    actionId: uuid('action_id')
      .notNull()
      .references(() => agentActions.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => customAgents.id, { onDelete: 'cascade' }),

    // Context
    userId: varchar('user_id', { length: 255 }).notNull(),
    workspaceId: varchar('workspace_id', { length: 255 }),
    conversationId: varchar('conversation_id', { length: 255 }),

    // Execution details
    operationId: varchar('operation_id', { length: 255 }).notNull(),
    parameters: jsonb('parameters'),

    // Result
    success: boolean('success').notNull(),
    statusCode: varchar('status_code', { length: 10 }),
    responseData: jsonb('response_data'),
    errorMessage: text('error_message'),
    executionTimeMs: varchar('execution_time_ms', { length: 20 }).notNull(),

    // Timestamps
    executedAt: timestamp('executed_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    actionIdIdx: index('idx_action_logs_action').on(table.actionId),
    agentIdIdx: index('idx_action_logs_agent').on(table.agentId),
    userIdIdx: index('idx_action_logs_user').on(table.userId),
    executedAtIdx: index('idx_action_logs_executed').on(table.executedAt),
    successIdx: index('idx_action_logs_success').on(table.success),
  })
);

/**
 * Agent Versions (Version Control)
 */
export const agentVersions = pgTable('agent_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => customAgents.id, { onDelete: 'cascade' }),

  versionNumber: varchar('version_number', { length: 20 }).notNull(),
  changelog: text('changelog'),

  // Snapshot of agent configuration
  snapshot: jsonb('snapshot').notNull(),

  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Agent Shares (For sharing with specific users/teams)
 */
export const agentShares = pgTable('agent_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => customAgents.id, { onDelete: 'cascade' }),

  sharedWith: varchar('shared_with', { length: 255 }).notNull(), // userId or teamId
  shareType: varchar('share_type', { length: 50 }).notNull(), // 'user' | 'team'
  permission: varchar('permission', { length: 50 }).notNull().default('view'), // 'view' | 'edit'

  sharedBy: varchar('shared_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Document Embeddings (Vector Search)
 *
 * Stores vector embeddings of knowledge base documents for RAG
 */
export const documentEmbeddings = pgTable(
  'document_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Link to knowledge base file
    fileId: uuid('file_id')
      .notNull()
      .references(() => agentKnowledgeBase.id, { onDelete: 'cascade' }),

    // Link to custom agent (optional - can be shared across agents)
    agentId: uuid('agent_id').references(() => customAgents.id, {
      onDelete: 'cascade',
    }),

    // Chunk information
    chunkId: varchar('chunk_id', { length: 255 }).notNull(),
    content: text('content').notNull(),

    // Vector embedding (OpenAI text-embedding-3-small: 1536 dimensions)
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),

    // Metadata
    metadata: jsonb('metadata')
      .$type<{
        pageNumber?: number;
        startIndex?: number;
        endIndex?: number;
        wordCount?: number;
      }>()
      .default(sql`'{}'::jsonb`),

    // User/workspace isolation
    userId: varchar('user_id', { length: 255 }).notNull(),
    workspaceId: varchar('workspace_id', { length: 255 }),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to prevent duplicate chunks
    uniqueFileChunk: index('unique_file_chunk_idx').on(table.fileId, table.chunkId),
    // Indexes for fast queries
    fileIdIdx: index('idx_embeddings_file').on(table.fileId),
    agentIdIdx: index('idx_embeddings_agent').on(table.agentId),
    userIdIdx: index('idx_embeddings_user').on(table.userId),
    workspaceIdIdx: index('idx_embeddings_workspace').on(table.workspaceId),
  })
);

// Type exports
export type CustomAgent = typeof customAgents.$inferSelect;
export type NewCustomAgent = typeof customAgents.$inferInsert;

export type AgentKnowledgeBase = typeof agentKnowledgeBase.$inferSelect;
export type NewAgentKnowledgeBase = typeof agentKnowledgeBase.$inferInsert;

export type AgentAction = typeof agentActions.$inferSelect;
export type NewAgentAction = typeof agentActions.$inferInsert;

export type AgentVersion = typeof agentVersions.$inferSelect;
export type NewAgentVersion = typeof agentVersions.$inferInsert;

export type AgentShare = typeof agentShares.$inferSelect;
export type NewAgentShare = typeof agentShares.$inferInsert;

export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;

export type ActionExecutionLog = typeof actionExecutionLogs.$inferSelect;
export type NewActionExecutionLog = typeof actionExecutionLogs.$inferInsert;
