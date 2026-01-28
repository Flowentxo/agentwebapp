/**
 * FILE MANAGEMENT SCHEMA
 *
 * Enterprise-grade file storage and management system
 * - S3/Cloud Storage Integration
 * - Virus Scanning (optional)
 * - Access Control
 * - Version History
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
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, workspaces } from './schema';

// File Status Enum
export const fileStatusEnum = pgEnum('file_status', [
  'uploading',
  'processing',
  'ready',
  'failed',
  'deleted'
]);

// File Visibility Enum
export const fileVisibilityEnum = pgEnum('file_visibility', [
  'private',
  'workspace',
  'public'
]);

/**
 * Files Table
 * Central repository for all uploaded files
 */
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),

  // File Metadata
  filename: varchar('filename', { length: 500 }).notNull(),
  originalFilename: varchar('original_filename', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(), // bytes

  // Storage
  storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('s3'), // s3, local, gcs
  storageKey: text('storage_key').notNull(), // S3 key or file path
  storageBucket: varchar('storage_bucket', { length: 255 }),
  storageRegion: varchar('storage_region', { length: 50 }),

  // URLs
  url: text('url'), // Public URL (if public)
  thumbnailUrl: text('thumbnail_url'), // For images
  previewUrl: text('preview_url'), // For documents

  // Status & Processing
  status: fileStatusEnum('status').notNull().default('uploading'),
  processingError: text('processing_error'),

  // Security
  visibility: fileVisibilityEnum('visibility').notNull().default('private'),
  virusScanStatus: varchar('virus_scan_status', { length: 50 }), // clean, infected, pending
  virusScanDate: timestamp('virus_scan_date'),

  // Metadata
  metadata: jsonb('metadata').$type<{
    // Image metadata
    width?: number;
    height?: number;
    format?: string;

    // Document metadata
    pageCount?: number;
    author?: string;

    // General
    tags?: string[];
    description?: string;
    category?: string;

    // Related entities
    relatedTo?: {
      type: string; // 'collaboration', 'agent', 'knowledge_entry'
      id: string;
    };
  }>().notNull().default(sql`'{}'::jsonb`),

  // Timestamps
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at'),
  expiresAt: timestamp('expires_at'), // For temporary files
  deletedAt: timestamp('deleted_at'), // Soft delete

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('files_user_id_idx').on(table.userId),
  workspaceIdIdx: index('files_workspace_id_idx').on(table.workspaceId),
  statusIdx: index('files_status_idx').on(table.status),
  visibilityIdx: index('files_visibility_idx').on(table.visibility),
  createdAtIdx: index('files_created_at_idx').on(table.createdAt),
  mimeTypeIdx: index('files_mime_type_idx').on(table.mimeType),
  deletedAtIdx: index('files_deleted_at_idx').on(table.deletedAt),
}));

/**
 * File Shares Table
 * Granular access control for files
 */
export const fileShares = pgTable('file_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),

  // Share with user or public link
  sharedWithUserId: varchar('shared_with_user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
  shareToken: varchar('share_token', { length: 100 }).unique(), // For public links

  // Permissions
  canView: boolean('can_view').notNull().default(true),
  canDownload: boolean('can_download').notNull().default(true),
  canEdit: boolean('can_edit').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),

  // Expiration
  expiresAt: timestamp('expires_at'),

  // Stats
  accessCount: integer('access_count').notNull().default(0),
  lastAccessedAt: timestamp('last_accessed_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
}, (table) => ({
  fileIdIdx: index('file_shares_file_id_idx').on(table.fileId),
  sharedWithUserIdIdx: index('file_shares_shared_with_user_id_idx').on(table.sharedWithUserId),
  shareTokenIdx: index('file_shares_share_token_idx').on(table.shareToken),
  expiresAtIdx: index('file_shares_expires_at_idx').on(table.expiresAt),
}));

/**
 * File Versions Table
 * Track file version history
 */
export const fileVersions = pgTable('file_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),

  versionNumber: integer('version_number').notNull(),

  // Storage
  storageKey: text('storage_key').notNull(),
  size: integer('size').notNull(),
  checksum: varchar('checksum', { length: 64 }), // SHA-256

  // Metadata
  uploadedBy: varchar('uploaded_by', { length: 255 }).notNull(),
  comment: text('comment'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  fileIdIdx: index('file_versions_file_id_idx').on(table.fileId),
  versionNumberIdx: index('file_versions_version_number_idx').on(table.fileId, table.versionNumber),
  createdAtIdx: index('file_versions_created_at_idx').on(table.createdAt),
}));

/**
 * File Access Logs Table
 * Audit trail for file access
 */
export const fileAccessLogs = pgTable('file_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),

  // Access details
  userId: varchar('user_id', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(), // view, download, upload, delete, share

  // Request metadata
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Result
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  fileIdIdx: index('file_access_logs_file_id_idx').on(table.fileId),
  userIdIdx: index('file_access_logs_user_id_idx').on(table.userId),
  actionIdx: index('file_access_logs_action_idx').on(table.action),
  createdAtIdx: index('file_access_logs_created_at_idx').on(table.createdAt),
}));

// Type exports
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type FileShare = typeof fileShares.$inferSelect;
export type NewFileShare = typeof fileShares.$inferInsert;

export type FileVersion = typeof fileVersions.$inferSelect;
export type NewFileVersion = typeof fileVersions.$inferInsert;

export type FileAccessLog = typeof fileAccessLogs.$inferSelect;
export type NewFileAccessLog = typeof fileAccessLogs.$inferInsert;
