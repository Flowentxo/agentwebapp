/**
 * WORKFLOW VERSIONING SCHEMA
 *
 * Phase 8: Versioning & Deployment Lifecycle (Draft vs. Live)
 *
 * This schema provides robust version control for workflows:
 * - Sequential version numbers per workflow
 * - Complete snapshots of nodes, edges, and config
 * - Changelog support for tracking changes
 * - Live status management (active, inactive, archived)
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  pgEnum,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { workflows } from './schema-workflows';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Live status for production workflows
 * - active: Currently running in production, accepting triggers
 * - inactive: Paused, not accepting triggers
 * - archived: Soft-deleted, hidden from normal views
 */
export const liveStatusEnum = pgEnum('workflow_live_status', [
  'active',
  'inactive',
  'archived',
]);

// ============================================================================
// WORKFLOW VERSIONS TABLE (Enhanced)
// ============================================================================

/**
 * Stores complete snapshots of workflow definitions at publish time.
 * Each version is immutable once created.
 */
export const pipelineVersions = pgTable('pipeline_versions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign key to parent workflow
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Sequential version number (1, 2, 3, ...)
  versionNumber: integer('version_number').notNull(),

  // Complete snapshot of the workflow definition
  nodes: jsonb('nodes').$type<any[]>().notNull(),
  edges: jsonb('edges').$type<any[]>().notNull(),
  viewport: jsonb('viewport').$type<{ x: number; y: number; zoom: number }>(),

  // Workflow configuration snapshot
  config: jsonb('config').$type<{
    triggers?: any[];
    variables?: Record<string, any>;
    settings?: Record<string, any>;
  }>(),

  // Metadata snapshot (for display purposes)
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Change tracking
  changelog: text('changelog'), // User-provided description of changes

  // Authorship
  createdBy: varchar('created_by', { length: 255 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique version numbers per workflow
  uniqueWorkflowVersion: unique('unique_workflow_version').on(
    table.workflowId,
    table.versionNumber
  ),
  // Indexes for common queries
  workflowIdIdx: index('pipeline_version_workflow_id_idx').on(table.workflowId),
  versionNumberIdx: index('pipeline_version_number_idx').on(
    table.workflowId,
    table.versionNumber
  ),
  createdAtIdx: index('pipeline_version_created_at_idx').on(table.createdAt),
  createdByIdx: index('pipeline_version_created_by_idx').on(table.createdBy),
}));

// ============================================================================
// DEPLOYMENT HISTORY TABLE
// ============================================================================

/**
 * Tracks when versions were deployed/undeployed to production.
 * Useful for audit trails and rollback history.
 */
export const pipelineDeployments = pgTable('pipeline_deployments', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  versionId: uuid('version_id')
    .notNull()
    .references(() => pipelineVersions.id, { onDelete: 'cascade' }),

  // Deployment action
  action: varchar('action', { length: 20 }).notNull(), // 'deploy', 'rollback', 'deactivate'
  previousVersionId: uuid('previous_version_id'), // For rollback tracking

  // Context
  deployedBy: varchar('deployed_by', { length: 255 }).notNull(),
  reason: text('reason'), // Optional reason for deployment

  // Timestamps
  deployedAt: timestamp('deployed_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('pipeline_deployment_workflow_id_idx').on(table.workflowId),
  versionIdIdx: index('pipeline_deployment_version_id_idx').on(table.versionId),
  deployedAtIdx: index('pipeline_deployment_at_idx').on(table.deployedAt),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PipelineVersion = typeof pipelineVersions.$inferSelect;
export type NewPipelineVersion = typeof pipelineVersions.$inferInsert;
export type PipelineDeployment = typeof pipelineDeployments.$inferSelect;
export type NewPipelineDeployment = typeof pipelineDeployments.$inferInsert;

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface VersionSnapshot {
  id: string;
  workflowId: string;
  versionNumber: number;
  nodes: any[];
  edges: any[];
  viewport?: { x: number; y: number; zoom: number };
  config?: {
    triggers?: any[];
    variables?: Record<string, any>;
    settings?: Record<string, any>;
  };
  name: string;
  description?: string | null;
  changelog?: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface DeploymentRecord {
  id: string;
  workflowId: string;
  versionId: string;
  action: 'deploy' | 'rollback' | 'deactivate';
  previousVersionId?: string | null;
  deployedBy: string;
  reason?: string | null;
  deployedAt: Date;
}

export type LiveStatus = 'active' | 'inactive' | 'archived';

export interface ExecutableGraph {
  nodes: any[];
  edges: any[];
  viewport?: { x: number; y: number; zoom: number };
  config?: any;
  versionNumber?: number;
  isDraft: boolean;
}
