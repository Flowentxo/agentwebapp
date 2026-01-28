/**
 * DEPLOYMENT TRACKING SCHEMA
 * Enterprise-grade deployment history and management
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  pgEnum,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

// Deployment status enum
export const deploymentStatusEnum = pgEnum('deployment_status', [
  'pending',
  'building',
  'deploying',
  'success',
  'failed',
  'rolled_back',
  'cancelled',
]);

// Deployment environment enum
export const deploymentEnvEnum = pgEnum('deployment_env', [
  'development',
  'staging',
  'production',
]);

// Deployments table
export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Version info
  version: varchar('version', { length: 50 }).notNull(),
  commit: varchar('commit', { length: 40 }).notNull(),
  commitMessage: text('commit_message'),
  branch: varchar('branch', { length: 255 }).notNull(),

  // Status
  status: deploymentStatusEnum('status').notNull().default('pending'),
  environment: deploymentEnvEnum('environment').notNull().default('production'),

  // Who deployed
  deployedBy: varchar('deployed_by', { length: 255 }).notNull(),
  deployedByEmail: varchar('deployed_by_email', { length: 255 }),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Health check
  healthCheckPassed: boolean('health_check_passed'),
  healthCheckDetails: jsonb('health_check_details').$type<{
    endpoints?: Array<{ url: string; status: number; responseTime: number }>;
    errors?: string[];
  }>(),

  // Build info
  buildLogs: text('build_logs'),
  buildArtifacts: jsonb('build_artifacts').$type<{
    size?: number;
    files?: string[];
    dockerImage?: string;
  }>(),

  // Rollback info
  rolledBackAt: timestamp('rolled_back_at'),
  rolledBackBy: varchar('rolled_back_by', { length: 255 }),
  rollbackReason: text('rollback_reason'),
  previousDeploymentId: uuid('previous_deployment_id'),

  // Metadata
  metadata: jsonb('metadata').$type<{
    ciPipeline?: string;
    pullRequest?: number;
    reviewers?: string[];
    changeLog?: string[];
    tags?: string[];
  }>().notNull().default({}),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('deployments_status_idx').on(table.status),
  envIdx: index('deployments_env_idx').on(table.environment),
  deployedByIdx: index('deployments_deployed_by_idx').on(table.deployedBy),
  createdAtIdx: index('deployments_created_at_idx').on(table.createdAt),
  versionIdx: index('deployments_version_idx').on(table.version),
  envStatusIdx: index('deployments_env_status_idx').on(table.environment, table.status),
}));

// Type exports
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
