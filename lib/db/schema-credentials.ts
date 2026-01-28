/**
 * Credentials Schema
 *
 * Phase 5: Credential Vault & Sub-Workflow Orchestration
 *
 * Secure storage for API keys, connection strings, and other secrets.
 * Uses AES-256-GCM encryption with per-credential IVs.
 *
 * Key Features:
 * - Never stores plaintext credentials
 * - Environment-based encryption key (ENCRYPTION_KEY)
 * - Workspace and user-level credential sharing
 * - Credential type validation
 * - Access control and audit logging
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users, workspaces } from './schema';
import { workflows, workflowExecutions } from './schema-workflows';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Credential type enum
 * Defines the category of credential for validation and UI purposes
 */
export const credentialTypeEnum = pgEnum('credential_type', [
  // AI & ML Services
  'openai_api',
  'anthropic_api',
  'google_ai_api',
  'huggingface_api',
  'replicate_api',
  'cohere_api',

  // Databases
  'postgres_connection',
  'mysql_connection',
  'mongodb_connection',
  'redis_connection',
  'elasticsearch_connection',

  // Cloud Providers
  'aws_credentials',
  'gcp_credentials',
  'azure_credentials',
  'digitalocean_credentials',

  // Communication
  'smtp_server',
  'twilio_api',
  'sendgrid_api',
  'mailgun_api',
  'slack_bot',
  'discord_bot',
  'telegram_bot',

  // SaaS Integrations
  'hubspot_api',
  'salesforce_oauth',
  'stripe_api',
  'github_token',
  'gitlab_token',
  'jira_api',
  'notion_api',
  'airtable_api',
  'google_sheets_oauth',
  'google_calendar_oauth',

  // Generic
  'api_key',
  'oauth2_client',
  'basic_auth',
  'bearer_token',
  'custom',
]);

/**
 * Credential scope enum
 */
export const credentialScopeEnum = pgEnum('credential_scope', [
  'user',       // Only accessible by the owner
  'workspace',  // Shared within a workspace
  'global',     // System-wide (admin only)
]);

// ============================================================================
// CREDENTIALS TABLE
// ============================================================================

/**
 * Credentials
 *
 * Securely stores encrypted credentials with metadata.
 */
export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),

  // Credential identity
  name: varchar('name', { length: 255 }).notNull(),
  type: credentialTypeEnum('type').notNull(),
  scope: credentialScopeEnum('scope').notNull().default('user'),

  // Encrypted data (AES-256-GCM)
  encryptedData: text('encrypted_data').notNull(),
  iv: varchar('iv', { length: 32 }).notNull(), // 16 bytes hex-encoded
  authTag: varchar('auth_tag', { length: 32 }).notNull(), // 16 bytes hex-encoded

  // Metadata
  description: text('description'),
  expiresAt: timestamp('expires_at'),
  isExpired: boolean('is_expired').notNull().default(false),

  // Validation
  lastValidatedAt: timestamp('last_validated_at'),
  isValid: boolean('is_valid'),
  validationError: text('validation_error'),

  // Usage tracking
  lastUsedAt: timestamp('last_used_at'),
  usageCount: integer('usage_count').notNull().default(0),

  // Soft delete
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),

  // Schema for the credential type (helps with validation)
  schemaVersion: integer('schema_version').notNull().default(1),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique name per owner within scope
  ownerNameIdx: uniqueIndex('idx_credentials_owner_name')
    .on(table.ownerId, table.name)
    .where(sql`is_deleted = FALSE`),
  // Index for workspace credentials
  workspaceIdx: index('idx_credentials_workspace').on(table.workspaceId),
  // Index for type queries
  typeIdx: index('idx_credentials_type').on(table.type),
  // Index for scope queries
  scopeIdx: index('idx_credentials_scope').on(table.scope),
  // Index for active credentials
  activeIdx: index('idx_credentials_active')
    .on(table.ownerId, table.isDeleted, table.isExpired)
    .where(sql`is_deleted = FALSE AND is_expired = FALSE`),
}));

// ============================================================================
// CREDENTIAL USAGE LOG
// ============================================================================

/**
 * Credential Usage Log
 *
 * Audit trail for credential access.
 */
export const credentialUsageLog = pgTable('credential_usage_log', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  credentialId: uuid('credential_id').notNull()
    .references(() => credentials.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
  executionId: uuid('execution_id').references(() => workflowExecutions.id, { onDelete: 'set null' }),
  nodeId: varchar('node_id', { length: 100 }),

  // Usage details
  action: varchar('action', { length: 50 }).notNull(), // 'read', 'validate', 'update'
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),

  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestSource: varchar('request_source', { length: 50 }), // 'api', 'ui', 'workflow'

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  credentialIdx: index('idx_usage_log_credential').on(table.credentialId),
  userIdx: index('idx_usage_log_user').on(table.userId),
  executionIdx: index('idx_usage_log_execution').on(table.executionId),
  createdIdx: index('idx_usage_log_created').on(table.createdAt),
}));

// ============================================================================
// WORKFLOW EXECUTION LINEAGE
// ============================================================================

/**
 * Workflow Execution Lineage
 *
 * Tracks parent-child relationships for sub-workflow executions.
 */
export const workflowExecutionLineage = pgTable('workflow_execution_lineage', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Parent execution
  parentExecutionId: uuid('parent_execution_id').notNull()
    .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  parentWorkflowId: uuid('parent_workflow_id').notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  parentNodeId: varchar('parent_node_id', { length: 100 }).notNull(),

  // Child execution
  childExecutionId: uuid('child_execution_id').notNull()
    .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  childWorkflowId: uuid('child_workflow_id').notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Depth tracking (for recursion limit)
  depth: integer('depth').notNull().default(1),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('running'),
  // 'running', 'completed', 'failed', 'timeout'

  // Data passing
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),

  // Timing
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  parentExecutionIdx: index('idx_lineage_parent_execution').on(table.parentExecutionId),
  childExecutionIdx: index('idx_lineage_child_execution').on(table.childExecutionId),
  parentWorkflowIdx: index('idx_lineage_parent_workflow').on(table.parentWorkflowId),
  depthIdx: index('idx_lineage_depth').on(table.depth),
  statusIdx: index('idx_lineage_status').on(table.status),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  owner: one(users, {
    fields: [credentials.ownerId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [credentials.workspaceId],
    references: [workspaces.id],
  }),
  usageLogs: many(credentialUsageLog),
}));

export const credentialUsageLogRelations = relations(credentialUsageLog, ({ one }) => ({
  credential: one(credentials, {
    fields: [credentialUsageLog.credentialId],
    references: [credentials.id],
  }),
  user: one(users, {
    fields: [credentialUsageLog.userId],
    references: [users.id],
  }),
  workflow: one(workflows, {
    fields: [credentialUsageLog.workflowId],
    references: [workflows.id],
  }),
  execution: one(workflowExecutions, {
    fields: [credentialUsageLog.executionId],
    references: [workflowExecutions.id],
  }),
}));

export const workflowExecutionLineageRelations = relations(workflowExecutionLineage, ({ one }) => ({
  parentExecution: one(workflowExecutions, {
    fields: [workflowExecutionLineage.parentExecutionId],
    references: [workflowExecutions.id],
    relationName: 'parentExecution',
  }),
  childExecution: one(workflowExecutions, {
    fields: [workflowExecutionLineage.childExecutionId],
    references: [workflowExecutions.id],
    relationName: 'childExecution',
  }),
  parentWorkflow: one(workflows, {
    fields: [workflowExecutionLineage.parentWorkflowId],
    references: [workflows.id],
    relationName: 'parentWorkflow',
  }),
  childWorkflow: one(workflows, {
    fields: [workflowExecutionLineage.childWorkflowId],
    references: [workflows.id],
    relationName: 'childWorkflow',
  }),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Credential schema definitions for different types
 */
export interface CredentialSchemas {
  openai_api: {
    apiKey: string;
    organization?: string;
    baseUrl?: string;
  };

  anthropic_api: {
    apiKey: string;
    baseUrl?: string;
  };

  postgres_connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    sslMode?: 'require' | 'prefer' | 'disable';
  };

  mysql_connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };

  mongodb_connection: {
    connectionString: string;
    database?: string;
  };

  redis_connection: {
    host: string;
    port: number;
    password?: string;
    database?: number;
    tls?: boolean;
  };

  aws_credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
    sessionToken?: string;
  };

  smtp_server: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure?: boolean;
    fromEmail?: string;
    fromName?: string;
  };

  oauth2_client: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresAt?: string;
    scopes?: string[];
  };

  api_key: {
    apiKey: string;
    headerName?: string;
    prefix?: string;
  };

  basic_auth: {
    username: string;
    password: string;
  };

  bearer_token: {
    token: string;
  };

  custom: Record<string, unknown>;
}

/**
 * Credential reference used in workflow nodes
 */
export interface CredentialReference {
  credentialId: string;
  credentialName: string;
  credentialType: string;
}

/**
 * Resolved credential (decrypted, in-memory only)
 */
export interface ResolvedCredential<T = unknown> {
  id: string;
  name: string;
  type: string;
  data: T;
  expiresAt?: Date;
}

/**
 * Sub-workflow execution context
 */
export interface SubWorkflowContext {
  parentExecutionId: string;
  parentWorkflowId: string;
  parentNodeId: string;
  depth: number;
  maxDepth: number;
  inheritedCredentials?: string[]; // Credential IDs to pass down
  inheritedVariables?: Record<string, unknown>;
}

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CredentialRecord = typeof credentials.$inferSelect;
export type NewCredentialRecord = typeof credentials.$inferInsert;

export type CredentialUsageLogRecord = typeof credentialUsageLog.$inferSelect;
export type NewCredentialUsageLogRecord = typeof credentialUsageLog.$inferInsert;

export type WorkflowExecutionLineageRecord = typeof workflowExecutionLineage.$inferSelect;
export type NewWorkflowExecutionLineageRecord = typeof workflowExecutionLineage.$inferInsert;

export type CredentialType = typeof credentialTypeEnum.enumValues[number];
export type CredentialScope = 'user' | 'workspace' | 'global';
