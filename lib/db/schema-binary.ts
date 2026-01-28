/**
 * Binary Data Schema
 *
 * Phase 3: Power Features - Binary Data Tracking
 *
 * Tracks metadata of binary files stored externally.
 * This allows for:
 * - Cleanup of orphaned files
 * - Usage tracking and quotas
 * - Audit trails
 * - Efficient queries for file management
 *
 * Note: Actual file data is stored externally (filesystem/S3/Azure).
 * This table only stores metadata and references.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workflows, workflowExecutions } from './schema-workflows';
import { users } from './schema';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Storage provider type
 */
export const storageProviderEnum = pgEnum('storage_provider', [
  'local',      // Local filesystem
  's3',         // AWS S3
  'azure',      // Azure Blob Storage
  'gcs',        // Google Cloud Storage
]);

/**
 * Binary file status
 */
export const binaryFileStatusEnum = pgEnum('binary_file_status', [
  'active',     // File is in use
  'orphaned',   // File no longer referenced
  'pending',    // Upload in progress
  'deleted',    // Marked for deletion
  'archived',   // Moved to cold storage
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Binary Data Store
 *
 * Tracks all binary files stored by the system.
 */
export const binaryDataStore = pgTable('binary_data_store', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Storage location
  storageProvider: storageProviderEnum('storage_provider').notNull().default('local'),
  storageUri: text('storage_uri').notNull(), // file://path or s3://bucket/key
  storageKey: varchar('storage_key', { length: 500 }).notNull(), // Unique key within provider

  // File metadata
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileExtension: varchar('file_extension', { length: 50 }),
  mimeType: varchar('mime_type', { length: 255 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  checksum: varchar('checksum', { length: 128 }), // SHA-256 hash

  // Ownership and tracking
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
  executionId: uuid('execution_id').references(() => workflowExecutions.id, { onDelete: 'set null' }),
  nodeId: varchar('node_id', { length: 100 }),

  // Status
  status: binaryFileStatusEnum('status').notNull().default('active'),
  referenceCount: integer('reference_count').notNull().default(1),

  // Lifecycle
  expiresAt: timestamp('expires_at'), // For temporary files
  lastAccessedAt: timestamp('last_accessed_at'),
  archivedAt: timestamp('archived_at'),
  deletedAt: timestamp('deleted_at'),

  // Additional metadata
  metadata: jsonb('metadata').$type<BinaryFileMetadata>(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes for common queries
  storageKeyIdx: uniqueIndex('idx_binary_storage_key').on(table.storageKey),
  storageUriIdx: index('idx_binary_storage_uri').on(table.storageUri),
  executionIdx: index('idx_binary_execution').on(table.executionId),
  workflowIdx: index('idx_binary_workflow').on(table.workflowId),
  userIdx: index('idx_binary_user').on(table.userId),
  statusIdx: index('idx_binary_status').on(table.status),
  expiresIdx: index('idx_binary_expires').on(table.expiresAt),
  mimeTypeIdx: index('idx_binary_mime').on(table.mimeType),
}));

/**
 * Binary Data Usage
 *
 * Tracks storage usage per user/workspace for quotas.
 */
export const binaryDataUsage = pgTable('binary_data_usage', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Scope
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id'),

  // Usage stats
  totalBytes: bigint('total_bytes', { mode: 'number' }).notNull().default(0),
  fileCount: integer('file_count').notNull().default(0),

  // Quotas
  quotaBytes: bigint('quota_bytes', { mode: 'number' }), // null = unlimited

  // Breakdown by type
  imageBytes: bigint('image_bytes', { mode: 'number' }).notNull().default(0),
  documentBytes: bigint('document_bytes', { mode: 'number' }).notNull().default(0),
  videoBytes: bigint('video_bytes', { mode: 'number' }).notNull().default(0),
  otherBytes: bigint('other_bytes', { mode: 'number' }).notNull().default(0),

  // Timestamps
  lastCalculatedAt: timestamp('last_calculated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userWorkspaceIdx: uniqueIndex('idx_usage_user_workspace')
    .on(table.userId, table.workspaceId),
}));

/**
 * Binary Data Cleanup Log
 *
 * Audit trail for file cleanup operations.
 */
export const binaryDataCleanupLog = pgTable('binary_data_cleanup_log', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Cleanup details
  cleanupType: varchar('cleanup_type', { length: 50 }).notNull(), // 'scheduled', 'manual', 'quota'
  filesProcessed: integer('files_processed').notNull(),
  filesDeleted: integer('files_deleted').notNull(),
  bytesReclaimed: bigint('bytes_reclaimed', { mode: 'number' }).notNull(),

  // Criteria
  criteriaJson: jsonb('criteria_json').$type<CleanupCriteria>(),

  // Results
  errors: jsonb('errors').$type<string[]>().default([]),

  // Timing
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('idx_cleanup_type').on(table.cleanupType),
  createdIdx: index('idx_cleanup_created').on(table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const binaryDataStoreRelations = relations(binaryDataStore, ({ one }) => ({
  user: one(users, {
    fields: [binaryDataStore.userId],
    references: [users.id],
  }),
  workflow: one(workflows, {
    fields: [binaryDataStore.workflowId],
    references: [workflows.id],
  }),
  execution: one(workflowExecutions, {
    fields: [binaryDataStore.executionId],
    references: [workflowExecutions.id],
  }),
}));

export const binaryDataUsageRelations = relations(binaryDataUsage, ({ one }) => ({
  user: one(users, {
    fields: [binaryDataUsage.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Additional file metadata stored as JSON
 */
export interface BinaryFileMetadata {
  /** Original filename before sanitization */
  originalFileName?: string;

  /** Image dimensions if applicable */
  dimensions?: {
    width: number;
    height: number;
  };

  /** Duration for audio/video */
  durationMs?: number;

  /** Page count for documents */
  pageCount?: number;

  /** Compression info */
  compression?: {
    algorithm: string;
    originalSize: number;
    compressedSize: number;
  };

  /** Processing flags */
  processed?: boolean;
  thumbnail?: string;

  /** Custom metadata from nodes */
  custom?: Record<string, unknown>;
}

/**
 * Cleanup criteria
 */
export interface CleanupCriteria {
  /** Delete files older than this date */
  olderThan?: string;

  /** Delete files with these statuses */
  statuses?: string[];

  /** Delete files from these executions */
  executionIds?: string[];

  /** Delete files by storage provider */
  storageProvider?: string;

  /** Maximum size limit */
  maxSizeBytes?: number;
}

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type BinaryDataRecord = typeof binaryDataStore.$inferSelect;
export type NewBinaryDataRecord = typeof binaryDataStore.$inferInsert;

export type BinaryDataUsageRecord = typeof binaryDataUsage.$inferSelect;
export type NewBinaryDataUsageRecord = typeof binaryDataUsage.$inferInsert;

export type BinaryDataCleanupLogRecord = typeof binaryDataCleanupLog.$inferSelect;
export type NewBinaryDataCleanupLogRecord = typeof binaryDataCleanupLog.$inferInsert;

export type StorageProvider = 'local' | 's3' | 'azure' | 'gcs';
export type BinaryFileStatus = 'active' | 'orphaned' | 'pending' | 'deleted' | 'archived';
