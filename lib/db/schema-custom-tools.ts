/**
 * CUSTOM TOOLS & API CONNECTORS SCHEMA
 *
 * Database schema for dynamic tool registration, API connectors, and custom code execution
 */

import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

// ============================================================
// CUSTOM TOOLS
// ============================================================

export const customTools = pgTable('custom_tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Tool metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull().default('custom'), // custom, api, code, database
  icon: varchar('icon', { length: 50 }),

  // Tool type
  type: varchar('type', { length: 50 }).notNull(), // api_call, code_execution, database_query, webhook

  // Tool configuration
  config: jsonb('config').notNull().default({}), // Tool-specific configuration
  parameters: jsonb('parameters').notNull().default([]), // Input parameters schema
  outputSchema: jsonb('output_schema'), // Output schema

  // Authentication (if needed)
  authType: varchar('auth_type', { length: 50 }), // none, api_key, oauth2, basic, bearer
  credentialId: uuid('credential_id'), // Reference to stored credentials

  // Status & versioning
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),

  // Usage stats
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// API CONNECTORS
// ============================================================

export const apiConnectors = pgTable('api_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Connector metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  baseUrl: text('base_url').notNull(),

  // API type
  apiType: varchar('api_type', { length: 50 }).notNull().default('rest'), // rest, graphql, soap, grpc

  // Authentication
  authType: varchar('auth_type', { length: 50 }).notNull().default('none'),
  credentialId: uuid('credential_id'),

  // Headers & configuration
  defaultHeaders: jsonb('default_headers').notNull().default({}),
  timeout: integer('timeout').notNull().default(30000), // milliseconds
  retryConfig: jsonb('retry_config').notNull().default({ maxRetries: 3, backoff: 'exponential' }),

  // Rate limiting
  rateLimitConfig: jsonb('rate_limit_config'), // { maxRequests: 100, windowMs: 60000 }

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Usage stats
  requestCount: integer('request_count').notNull().default(0),
  lastRequestAt: timestamp('last_request_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// API ENDPOINTS (for connectors)
// ============================================================

export const apiEndpoints = pgTable('api_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull(),

  // Endpoint metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),

  // HTTP details
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, PUT, DELETE, PATCH
  path: text('path').notNull(), // /users/{id}, /orders

  // Parameters
  pathParams: jsonb('path_params').notNull().default([]), // [{ name: 'id', type: 'string', required: true }]
  queryParams: jsonb('query_params').notNull().default([]),
  headers: jsonb('headers').notNull().default([]),
  bodySchema: jsonb('body_schema'), // For POST/PUT/PATCH

  // Response
  responseSchema: jsonb('response_schema'),
  successCodes: jsonb('success_codes').notNull().default([200, 201]), // HTTP codes that indicate success

  // Configuration
  timeout: integer('timeout'), // Override connector default

  // Usage stats
  callCount: integer('call_count').notNull().default(0),
  lastCalledAt: timestamp('last_called_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// CREDENTIALS STORE
// ============================================================

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Credential metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // api_key, oauth2, basic, bearer, custom

  // Encrypted credentials (NEVER store plaintext!)
  encryptedData: text('encrypted_data').notNull(), // AES-256 encrypted JSON

  // OAuth2 specific
  tokenUrl: text('token_url'),
  refreshToken: text('refresh_token'), // Encrypted
  accessToken: text('access_token'), // Encrypted
  expiresAt: timestamp('expires_at'),

  // Scope & permissions
  scopes: jsonb('scopes').notNull().default([]),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  lastValidated: timestamp('last_validated'),

  // Usage tracking
  usageCount: integer('usage_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// CODE SNIPPETS (for code execution tools)
// ============================================================

export const codeSnippets = pgTable('code_snippets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Snippet metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),

  // Code details
  language: varchar('language', { length: 50 }).notNull(), // javascript, python, typescript
  code: text('code').notNull(),

  // Execution config
  timeout: integer('timeout').notNull().default(5000), // milliseconds
  memoryLimit: integer('memory_limit').notNull().default(128), // MB

  // Parameters
  parameters: jsonb('parameters').notNull().default([]),
  returnType: varchar('return_type', { length: 50 }).notNull().default('json'), // json, string, number, boolean

  // Dependencies (for npm packages)
  dependencies: jsonb('dependencies').notNull().default([]), // ['axios', 'lodash']

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Usage stats
  executionCount: integer('execution_count').notNull().default(0),
  lastExecutedAt: timestamp('last_executed_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// DATABASE CONNECTIONS
// ============================================================

export const databaseConnections = pgTable('database_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Connection metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),

  // Database type
  dbType: varchar('db_type', { length: 50 }).notNull(), // postgresql, mysql, mongodb, redis, etc.

  // Connection details (encrypted)
  encryptedConnectionString: text('encrypted_connection_string').notNull(),

  // Connection pool config
  poolConfig: jsonb('pool_config').notNull().default({
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  }),

  // SSL/Security
  sslEnabled: boolean('ssl_enabled').notNull().default(true),
  sslConfig: jsonb('ssl_config'),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  lastConnectedAt: timestamp('last_connected_at'),

  // Usage stats
  queryCount: integer('query_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// DATABASE QUERIES
// ============================================================

export const databaseQueries = pgTable('database_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolId: uuid('tool_id'),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Query metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),

  // Connection
  connectionId: uuid('connection_id').notNull(), // References databaseConnections

  // Query details
  query: text('query').notNull(), // SQL or query string
  queryType: varchar('query_type', { length: 20 }).notNull(), // SELECT, INSERT, UPDATE, DELETE, CUSTOM

  // Parameters
  parameters: jsonb('parameters').notNull().default([]), // [{ name, type, required, default }]

  // Result configuration
  resultFormat: varchar('result_format', { length: 20 }).notNull().default('json'), // json, csv, array
  maxRows: integer('max_rows').default(10000), // Result size limit

  // Execution config
  timeout: integer('timeout').notNull().default(30000), // milliseconds

  // Caching
  cacheEnabled: boolean('cache_enabled').notNull().default(false),
  cacheTtl: integer('cache_ttl').default(300), // seconds

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Usage stats
  executionCount: integer('execution_count').notNull().default(0),
  lastExecutedAt: timestamp('last_executed_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// WEBHOOKS
// ============================================================

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolId: uuid('tool_id'),
  workspaceId: uuid('workspace_id'),
  createdBy: uuid('created_by'),

  // Webhook metadata
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),

  // HTTP configuration
  url: text('url').notNull(),
  method: varchar('method', { length: 10 }).notNull().default('POST'), // POST, GET, PUT, DELETE, PATCH

  // Headers
  headers: jsonb('headers').notNull().default({}), // { "Content-Type": "application/json" }

  // Payload
  payloadTemplate: text('payload_template'), // JSON template with variable interpolation
  payloadType: varchar('payload_type', { length: 20 }).notNull().default('json'), // json, form, xml, text

  // Authentication
  authType: varchar('auth_type', { length: 50 }).default('none'), // none, bearer, basic, api_key, oauth2
  credentialId: uuid('credential_id'), // Reference to credentials table

  // Retry configuration
  retryEnabled: boolean('retry_enabled').notNull().default(true),
  retryConfig: jsonb('retry_config').notNull().default({
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000
  }),

  // Timeout
  timeout: integer('timeout').notNull().default(10000), // milliseconds

  // Response validation
  expectedStatus: jsonb('expected_status').notNull().default([200, 201, 204]), // Array of valid HTTP codes
  responseSchema: jsonb('response_schema'), // JSON schema for response validation

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Usage stats
  callCount: integer('call_count').notNull().default(0),
  lastCalledAt: timestamp('last_called_at'),
  successCount: integer('success_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// TOOL EXECUTION LOGS
// ============================================================

export const toolExecutionLogs = pgTable('tool_execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolId: uuid('tool_id').notNull(),
  workspaceId: uuid('workspace_id'),
  executedBy: uuid('executed_by'),

  // Execution details
  executionType: varchar('execution_type', { length: 50 }).notNull(), // tool, api, code, database

  // Input/Output
  input: jsonb('input').notNull(),
  output: jsonb('output'),

  // Status
  status: varchar('status', { length: 50 }).notNull(), // success, error, timeout
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),

  // Performance
  durationMs: integer('duration_ms'),

  // Timestamps
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
});
