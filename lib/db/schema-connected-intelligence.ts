/**
 * Brain AI v2.0 - Connected Intelligence Schema
 *
 * Drizzle ORM definitions for:
 * - Connected Sources (OAuth integrations)
 * - External Documents (indexed content)
 * - External Chunks (RAG chunks)
 * - AI Usage Tracking (ISO 42001)
 * - Meeting Transcripts
 * - Knowledge Graph Edges
 * - Standup Reports
 * - Writer Templates
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// 1. CONNECTED SOURCES
// OAuth tokens and configuration for external integrations
// ============================================

export const brainConnectedSources = pgTable('brain_connected_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Provider configuration
  provider: varchar('provider', { length: 50 }).notNull(), // 'google_drive', 'slack', 'github', 'confluence', 'notion'
  providerAccountId: varchar('provider_account_id', { length: 255 }),
  providerEmail: varchar('provider_email', { length: 255 }),

  // OAuth tokens (encrypted at rest)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  tokenScope: text('token_scope'),

  // Sync configuration
  config: jsonb('config').notNull().default({}),
  syncFolders: jsonb('sync_folders').default([]),
  syncFileTypes: jsonb('sync_file_types').default([]),

  // Sync status
  syncStatus: varchar('sync_status', { length: 50 }).default('pending'), // 'pending', 'syncing', 'completed', 'failed'
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncError: text('last_sync_error'),
  nextSyncAt: timestamp('next_sync_at'),
  documentsIndexed: integer('documents_indexed').default(0),

  // Metadata
  displayName: varchar('display_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('idx_connected_sources_workspace').on(table.workspaceId),
  userIdx: index('idx_connected_sources_user').on(table.userId),
  providerIdx: index('idx_connected_sources_provider').on(table.provider),
  statusIdx: index('idx_connected_sources_status').on(table.syncStatus),
  uniqueProviderIdx: uniqueIndex('idx_connected_sources_unique_provider').on(
    table.workspaceId, table.userId, table.provider, table.providerAccountId
  ),
}));

// ============================================
// 2. EXTERNAL DOCUMENTS
// Indexed content from connected sources
// ============================================

export const brainExternalDocuments = pgTable('brain_external_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull().references(() => brainConnectedSources.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),

  // External reference
  externalId: varchar('external_id', { length: 500 }).notNull(),
  externalUrl: text('external_url'),
  externalPath: text('external_path'),

  // Content
  title: text('title').notNull(),
  content: text('content'),
  contentHash: varchar('content_hash', { length: 64 }),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'),

  // Embeddings handled separately (pgvector)
  chunkCount: integer('chunk_count').default(0),

  // Metadata from source
  sourceMetadata: jsonb('source_metadata').default({}),
  authorName: varchar('author_name', { length: 255 }),
  authorEmail: varchar('author_email', { length: 255 }),

  // Permissions (ACL from source)
  permissions: jsonb('permissions').default({}),

  // Timestamps
  sourceCreatedAt: timestamp('source_created_at'),
  sourceModifiedAt: timestamp('source_modified_at'),
  indexedAt: timestamp('indexed_at').defaultNow(),
  lastCheckedAt: timestamp('last_checked_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Status
  indexStatus: varchar('index_status', { length: 50 }).default('pending'),
  indexError: text('index_error'),
  isDeleted: boolean('is_deleted').default(false),
}, (table) => ({
  sourceIdx: index('idx_external_docs_source').on(table.sourceId),
  workspaceIdx: index('idx_external_docs_workspace').on(table.workspaceId),
  externalIdIdx: index('idx_external_docs_external_id').on(table.sourceId, table.externalId),
  statusIdx: index('idx_external_docs_status').on(table.indexStatus),
  modifiedIdx: index('idx_external_docs_modified').on(table.sourceModifiedAt),
  contentHashIdx: index('idx_external_docs_content_hash').on(table.contentHash),
}));

// ============================================
// 3. EXTERNAL DOCUMENT CHUNKS
// Chunked content for better RAG retrieval
// ============================================

export const brainExternalChunks = pgTable('brain_external_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => brainExternalDocuments.id, { onDelete: 'cascade' }),

  // Chunk data
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  tokenCount: integer('token_count'),

  // Embeddings handled separately (pgvector)

  // Metadata
  metadata: jsonb('metadata').default({}),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  documentIdx: index('idx_external_chunks_document').on(table.documentId),
  orderIdx: index('idx_external_chunks_order').on(table.documentId, table.chunkIndex),
}));

// ============================================
// 4. AI USAGE TRACKING (ISO 42001 Compliance)
// Track all AI model invocations for auditing
// ============================================

export const brainAiUsage = pgTable('brain_ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Request details
  model: varchar('model', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  operation: varchar('operation', { length: 100 }).notNull(),

  // Token usage
  tokensPrompt: integer('tokens_prompt').notNull().default(0),
  tokensCompletion: integer('tokens_completion').notNull().default(0),
  tokensTotal: integer('tokens_total').notNull().default(0),

  // Cost tracking
  costUsd: numeric('cost_usd', { precision: 12, scale: 8 }),

  // Performance
  latencyMs: integer('latency_ms'),

  // Context
  requestContext: jsonb('request_context'),

  // Status
  success: boolean('success').default(true),
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('idx_ai_usage_workspace').on(table.workspaceId),
  userIdx: index('idx_ai_usage_user').on(table.userId),
  modelIdx: index('idx_ai_usage_model').on(table.model),
  operationIdx: index('idx_ai_usage_operation').on(table.operation),
  createdIdx: index('idx_ai_usage_created').on(table.createdAt),
}));

// ============================================
// 5. MEETING TRANSCRIPTS
// Store and index meeting transcripts
// ============================================

export const brainMeetingTranscripts = pgTable('brain_meeting_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Calendar event reference (optional)
  eventId: uuid('event_id'),

  // Meeting metadata
  title: text('title').notNull(),
  meetingPlatform: varchar('meeting_platform', { length: 50 }),
  meetingUrl: text('meeting_url'),
  externalMeetingId: varchar('external_meeting_id', { length: 255 }),

  // Transcript
  transcript: text('transcript').notNull(),
  transcriptLanguage: varchar('transcript_language', { length: 10 }).default('de'),

  // Speaker diarization
  speakers: jsonb('speakers').default([]),

  // AI-generated content
  summary: text('summary'),
  summaryLanguage: varchar('summary_language', { length: 10 }).default('de'),
  keyDecisions: jsonb('key_decisions').default([]),
  actionItems: jsonb('action_items').default([]),
  keyTopics: jsonb('key_topics').default([]),
  sentimentAnalysis: jsonb('sentiment_analysis'),

  // Duration
  durationSeconds: integer('duration_seconds'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),

  // Embeddings handled separately (pgvector)

  // Status
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'),
  processingError: text('processing_error'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('idx_meeting_transcripts_workspace').on(table.workspaceId),
  userIdx: index('idx_meeting_transcripts_user').on(table.userId),
  eventIdx: index('idx_meeting_transcripts_event').on(table.eventId),
  dateIdx: index('idx_meeting_transcripts_date').on(table.startTime),
  statusIdx: index('idx_meeting_transcripts_status').on(table.processingStatus),
}));

// ============================================
// 6. KNOWLEDGE GRAPH EDGES
// Explicit relationships between knowledge items
// ============================================

export const brainKnowledgeEdges = pgTable('brain_knowledge_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),

  // Source node
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  sourceId: uuid('source_id').notNull(),

  // Target node
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: uuid('target_id').notNull(),

  // Edge properties
  edgeType: varchar('edge_type', { length: 50 }).notNull(),
  strength: numeric('strength', { precision: 3, scale: 2 }).default('0.5'),
  isBidirectional: boolean('is_bidirectional').default(false),

  // Metadata
  metadata: jsonb('metadata').default({}),

  // Audit
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('idx_knowledge_edges_workspace').on(table.workspaceId),
  sourceIdx: index('idx_knowledge_edges_source').on(table.sourceType, table.sourceId),
  targetIdx: index('idx_knowledge_edges_target').on(table.targetType, table.targetId),
  typeIdx: index('idx_knowledge_edges_type').on(table.edgeType),
  uniqueEdgeIdx: uniqueIndex('idx_knowledge_edges_unique').on(
    table.sourceType, table.sourceId, table.targetType, table.targetId, table.edgeType
  ),
}));

// ============================================
// 7. STANDUP REPORTS HISTORY
// Store generated standup reports
// ============================================

export const brainStandupReports = pgTable('brain_standup_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }),
  teamUserIds: jsonb('team_user_ids'),

  // Report content
  summary: text('summary').notNull(),
  highlights: jsonb('highlights').notNull(),
  sections: jsonb('sections'),
  metrics: jsonb('metrics').notNull(),

  // Configuration
  timeRangeStart: timestamp('time_range_start').notNull(),
  timeRangeEnd: timestamp('time_range_end').notNull(),
  format: varchar('format', { length: 50 }).notNull(),
  sources: jsonb('sources'),

  // Metadata
  isTeamStandup: boolean('is_team_standup').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('idx_standup_reports_workspace').on(table.workspaceId),
  userIdx: index('idx_standup_reports_user').on(table.userId),
  dateIdx: index('idx_standup_reports_date').on(table.createdAt),
}));

// ============================================
// 8. WRITER TEMPLATES
// Store custom AI Writer templates
// ============================================

export const brainWriterTemplates = pgTable('brain_writer_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Template definition
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  role: varchar('role', { length: 50 }).notNull(),

  // Prompt configuration
  systemPrompt: text('system_prompt').notNull(),
  exampleInput: text('example_input'),
  exampleOutput: text('example_output'),

  // Settings
  defaultTone: varchar('default_tone', { length: 50 }),
  defaultLength: varchar('default_length', { length: 50 }),
  variables: jsonb('variables').default([]),

  // Sharing
  isPublic: boolean('is_public').default(false),

  // Usage stats
  usageCount: integer('usage_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('idx_writer_templates_workspace').on(table.workspaceId),
  userIdx: index('idx_writer_templates_user').on(table.userId),
  roleIdx: index('idx_writer_templates_role').on(table.role),
}));

// ============================================
// RELATIONS
// ============================================

export const brainConnectedSourcesRelations = relations(brainConnectedSources, ({ many }) => ({
  documents: many(brainExternalDocuments),
}));

export const brainExternalDocumentsRelations = relations(brainExternalDocuments, ({ one, many }) => ({
  source: one(brainConnectedSources, {
    fields: [brainExternalDocuments.sourceId],
    references: [brainConnectedSources.id],
  }),
  chunks: many(brainExternalChunks),
}));

export const brainExternalChunksRelations = relations(brainExternalChunks, ({ one }) => ({
  document: one(brainExternalDocuments, {
    fields: [brainExternalChunks.documentId],
    references: [brainExternalDocuments.id],
  }),
}));

// ============================================
// TYPES
// ============================================

export type BrainConnectedSource = typeof brainConnectedSources.$inferSelect;
export type NewBrainConnectedSource = typeof brainConnectedSources.$inferInsert;

export type BrainExternalDocument = typeof brainExternalDocuments.$inferSelect;
export type NewBrainExternalDocument = typeof brainExternalDocuments.$inferInsert;

export type BrainExternalChunk = typeof brainExternalChunks.$inferSelect;
export type NewBrainExternalChunk = typeof brainExternalChunks.$inferInsert;

export type BrainAiUsage = typeof brainAiUsage.$inferSelect;
export type NewBrainAiUsage = typeof brainAiUsage.$inferInsert;

export type BrainMeetingTranscript = typeof brainMeetingTranscripts.$inferSelect;
export type NewBrainMeetingTranscript = typeof brainMeetingTranscripts.$inferInsert;

export type BrainKnowledgeEdge = typeof brainKnowledgeEdges.$inferSelect;
export type NewBrainKnowledgeEdge = typeof brainKnowledgeEdges.$inferInsert;

export type BrainStandupReport = typeof brainStandupReports.$inferSelect;
export type NewBrainStandupReport = typeof brainStandupReports.$inferInsert;

export type BrainWriterTemplate = typeof brainWriterTemplates.$inferSelect;
export type NewBrainWriterTemplate = typeof brainWriterTemplates.$inferInsert;

// Provider types
export type ConnectedProvider = 'google_drive' | 'slack' | 'github' | 'confluence' | 'notion';
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';
export type IndexStatus = 'pending' | 'indexed' | 'failed' | 'stale';
export type ProcessingStatus = 'pending' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
export type EdgeType = 'references' | 'derived_from' | 'related_to' | 'contradicts' | 'supersedes';
export type SourceNodeType = 'document' | 'idea' | 'meeting' | 'external' | 'agent';
