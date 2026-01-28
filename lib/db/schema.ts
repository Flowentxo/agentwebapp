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
  boolean,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom types for pgvector
const vector = customType<{ data: number[]; config: { dimension: number } }>({
  dataType(config) {
    return `vector(${config?.dimension ?? 1536})`;
  },
});

// Enums
export const visibilityEnum = pgEnum('visibility', ['org', 'private']);
export const statusEnum = pgEnum('kb_status', ['draft', 'in_review', 'published', 'archived']);
export const sourceTypeEnum = pgEnum('source_type', ['note', 'url', 'file']);
export const roleEnum = pgEnum('kb_role', ['user', 'editor', 'reviewer', 'admin']);
export const scopeEnum = pgEnum('kb_scope', ['org', 'team', 'user']);

// Knowledge Bases table
export const knowledgeBases = pgTable('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  visibility: visibilityEnum('visibility').notNull().default('org'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('kb_slug_idx').on(table.slug),
  createdByIdx: index('kb_created_by_idx').on(table.createdBy),
}));

// KB Entries table
export const kbEntries = pgTable('kb_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  kbId: uuid('kb_id').notNull().references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  status: statusEnum('status').notNull().default('draft'),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  editorIds: jsonb('editor_ids').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  category: varchar('category', { length: 255 }),
  currentRevisionId: uuid('current_revision_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('kb_entry_status_idx').on(table.status),
  kbIdIdx: index('kb_entry_kb_id_idx').on(table.kbId),
  authorIdx: index('kb_entry_author_idx').on(table.authorId),
  tagsIdx: index('kb_entry_tags_idx').using('gin', table.tags),
  updatedAtIdx: index('kb_entry_updated_at_idx').on(table.updatedAt),
}));

// KB Revisions table
export const kbRevisions = pgTable('kb_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(() => kbEntries.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  contentMd: text('content_md').notNull(),
  contentHtml: text('content_html'),
  sourceType: sourceTypeEnum('source_type').notNull().default('note'),
  sourceUri: text('source_uri'),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  entryIdIdx: index('kb_revision_entry_id_idx').on(table.entryId),
  checksumIdx: index('kb_revision_checksum_idx').on(table.checksum),
  versionIdx: index('kb_revision_version_idx').on(table.entryId, table.version),
}));

// KB Chunks table (with pgvector)
export const kbChunks = pgTable('kb_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  revisionId: uuid('revision_id').notNull().references(() => kbRevisions.id, { onDelete: 'cascade' }),
  idx: integer('idx').notNull(),
  text: text('text').notNull(),
  tokens: integer('tokens').notNull(),
  embedding: vector('embedding', { dimension: 1536 }),
  meta: jsonb('meta').$type<{
    heading?: string;
    section?: string;
    sourceType?: string;
    startOffset?: number;
    endOffset?: number;
  }>().notNull().default({}),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  revisionIdIdx: index('kb_chunk_revision_id_idx').on(table.revisionId),
  embeddingIdx: index('kb_chunk_embedding_idx').using(
    'hnsw',
    sql`${table.embedding} vector_cosine_ops`
  ),
  isDeletedIdx: index('kb_chunk_is_deleted_idx').on(table.isDeleted),
}));

// KB Comments table
export const kbComments = pgTable('kb_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(() => kbEntries.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  bodyMd: text('body_md').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  entryIdIdx: index('kb_comment_entry_id_idx').on(table.entryId),
  createdAtIdx: index('kb_comment_created_at_idx').on(table.createdAt),
}));

// KB Audit table
export const kbAudit = pgTable('kb_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  payload: jsonb('payload').$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  entityIdx: index('kb_audit_entity_idx').on(table.entityType, table.entityId),
  userIdx: index('kb_audit_user_idx').on(table.userId),
  createdAtIdx: index('kb_audit_created_at_idx').on(table.createdAt),
}));

// KB Search Log table
export const kbSearchLog = pgTable('kb_search_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: varchar('actor_id', { length: 255 }),
  query: text('query').notNull(),
  filters: jsonb('filters').$type<Record<string, any>>().notNull().default({}),
  topk: integer('topk').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  results: jsonb('results').$type<Array<{ entryId: string; score: number }>>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  actorIdIdx: index('kb_search_log_actor_idx').on(table.actorId),
  createdAtIdx: index('kb_search_log_created_at_idx').on(table.createdAt),
}));

// KB Access Rules table
export const kbAccessRules = pgTable('kb_access_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  kbId: uuid('kb_id').notNull().references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  scope: scopeEnum('scope').notNull(),
  subjectId: varchar('subject_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  kbIdIdx: index('kb_access_kb_id_idx').on(table.kbId),
  subjectIdx: index('kb_access_subject_idx').on(table.subjectId),
}));

// Types for TypeScript inference
export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert;

export type KbEntry = typeof kbEntries.$inferSelect;
export type NewKbEntry = typeof kbEntries.$inferInsert;

export type KbRevision = typeof kbRevisions.$inferSelect;
export type NewKbRevision = typeof kbRevisions.$inferInsert;

export type KbChunk = typeof kbChunks.$inferSelect;
export type NewKbChunk = typeof kbChunks.$inferInsert;

export type KbComment = typeof kbComments.$inferSelect;
export type NewKbComment = typeof kbComments.$inferInsert;

export type KbAudit = typeof kbAudit.$inferSelect;
export type NewKbAudit = typeof kbAudit.$inferInsert;

export type KbSearchLog = typeof kbSearchLog.$inferSelect;
export type NewKbSearchLog = typeof kbSearchLog.$inferInsert;

export type KbAccessRule = typeof kbAccessRules.$inferSelect;
export type NewKbAccessRule = typeof kbAccessRules.$inferInsert;

// =====================================================
// AUTH SYSTEM TABLES
// =====================================================

// Auth role enum (must match lib/knowledge/acl.ts roles)
export const authRoleEnum = pgEnum('auth_role', ['user', 'editor', 'reviewer', 'admin']);

// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),

  // Profile fields
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  locale: varchar('locale', { length: 10 }).notNull().default('de-DE'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Berlin'),
  theme: varchar('theme', { length: 10 }).notNull().default('system'),
  pronouns: varchar('pronouns', { length: 50 }),
  location: varchar('location', { length: 100 }),
  orgTitle: varchar('org_title', { length: 100 }),

  // JSONB fields
  accessibility: jsonb('accessibility').$type<{
    reduceMotion: boolean;
    highContrast: boolean;
    fontScale: number;
  }>().notNull().default(sql`'{}'::jsonb`),

  commPrefs: jsonb('comm_prefs').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),

  privacySettings: jsonb('privacy_settings').$type<{
    directoryOptOut: boolean;
    dataSharing: {
      analytics: boolean;
      product: boolean;
    };
    searchVisibility: boolean;
  }>().notNull().default(sql`'{}'::jsonb`),

  // MFA fields
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'),
  mfaRecoveryCodes: text('mfa_recovery_codes'),

  // Phase 4: Sudo Mode - User preference for re-auth timeout (in minutes)
  // 0 = always ask, 5/15/60 = timeout in minutes
  sudoSessionTimeout: integer('sudo_session_timeout').notNull().default(15),
}, (table) => ({
  emailUniqueIdx: index('users_email_unique_idx').on(sql`LOWER(${table.email})`),
  emailIdx: index('users_email_idx').on(table.email),
  isActiveIdx: index('users_is_active_idx').on(table.isActive),
}));

// User roles table (many-to-many: users ↔ roles)
export const userRoles = pgTable('user_roles', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: authRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_roles_user_id_idx').on(table.userId),
  roleIdx: index('user_roles_role_idx').on(table.role),
  uniqueUserRole: index('user_roles_unique_user_role').on(table.userId, table.role),
}));

// Device info type for sessions
export interface SessionDeviceInfo {
  browser?: {
    name?: string;
    version?: string;
    major?: string;
  };
  os?: {
    name?: string;
    version?: string;
  };
  device?: {
    type?: string; // 'mobile' | 'tablet' | 'desktop' | 'smarttv' | 'wearable' | 'console'
    vendor?: string;
    model?: string;
  };
  cpu?: {
    architecture?: string;
  };
  isBot?: boolean;
}

// Sessions table
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  userAgent: text('user_agent'),
  ip: varchar('ip', { length: 45 }),
  // Phase 2: Device Intelligence fields
  lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
  deviceInfo: jsonb('device_info').$type<SessionDeviceInfo>(),
  // Phase 4: Sudo Mode - Last explicit authentication (password/passkey)
  lastAuthenticatedAt: timestamp('last_authenticated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  tokenHashIdx: index('sessions_token_hash_idx').on(table.tokenHash),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  lastActiveAtIdx: index('sessions_last_active_at_idx').on(table.lastActiveAt),
}));

// Verification tokens table
export const verificationTokens = pgTable('verification_tokens', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
}, (table) => ({
  tokenHashIdx: index('verification_tokens_token_hash_idx').on(table.tokenHash),
  userIdIdx: index('verification_tokens_user_id_idx').on(table.userId),
  expiresAtIdx: index('verification_tokens_expires_at_idx').on(table.expiresAt),
}));

// =====================================================
// USER KNOWN DEVICES (Security: New Device Detection)
// =====================================================

/**
 * Tracks devices that a user has previously logged in from.
 * Used for detecting new/unknown devices and sending security alerts.
 */
export const userKnownDevices = pgTable('user_known_devices', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Device fingerprint (hash of UA + partial IP)
  deviceHash: varchar('device_hash', { length: 64 }).notNull(),

  // Raw data for display purposes
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),

  // Parsed device info for UI display
  deviceInfo: jsonb('device_info').$type<SessionDeviceInfo>(),

  // Trust status
  isTrusted: boolean('is_trusted').notNull().default(true),
  trustRevokedAt: timestamp('trust_revoked_at'),

  // Timestamps
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),

  // Alert tracking
  alertSentAt: timestamp('alert_sent_at'),
}, (table) => ({
  userIdIdx: index('user_known_devices_user_id_idx').on(table.userId),
  deviceHashIdx: index('user_known_devices_device_hash_idx').on(table.deviceHash),
  userDeviceUniqueIdx: index('user_known_devices_user_device_unique').on(table.userId, table.deviceHash),
  lastSeenAtIdx: index('user_known_devices_last_seen_at_idx').on(table.lastSeenAt),
}));

export type UserKnownDevice = typeof userKnownDevices.$inferSelect;
export type NewUserKnownDevice = typeof userKnownDevices.$inferInsert;

// =====================================================
// AUDIT LOG (Security: Activity Tracking)
// =====================================================

/**
 * Audit action types for type-safe logging
 */
export type AuditAction =
  // Authentication
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  // Password & Security
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  // MFA
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_RECOVERY_USED'
  // Sessions
  | 'SESSION_REVOKED'
  | 'ALL_SESSIONS_REVOKED'
  // Devices
  | 'NEW_DEVICE_DETECTED'
  | 'DEVICE_TRUST_REVOKED'
  | 'DEVICE_REMOVED'
  // Profile
  | 'PROFILE_UPDATED'
  | 'EMAIL_CHANGED'
  | 'EMAIL_VERIFIED'
  // Admin actions
  | 'USER_ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  // Passkeys (WebAuthn)
  | 'PASSKEY_REGISTERED'
  | 'PASSKEY_REMOVED'
  | 'PASSKEY_LOGIN_SUCCESS'
  | 'PASSKEY_LOGIN_FAILED'
  // Sudo Mode (Re-Authentication)
  | 'SUDO_VERIFICATION_SUCCESS'
  | 'SUDO_VERIFICATION_FAILED'
  | 'SUDO_TIMEOUT_CHANGED';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'USER'
  | 'SESSION'
  | 'DEVICE'
  | 'PROFILE'
  | 'ROLE'
  | 'PASSKEY';

/**
 * Metadata structure for audit logs
 */
export interface AuditMetadata {
  // Request context
  ip?: string;
  userAgent?: string;
  // Change details
  oldValue?: unknown;
  newValue?: unknown;
  // Additional context
  reason?: string;
  targetUserId?: string;
  sessionId?: string;
  deviceId?: string;
  // Error details (for failed actions)
  errorCode?: string;
  errorMessage?: string;
  // Any additional data
  [key: string]: unknown;
}

/**
 * Audit log table for tracking security-critical actions.
 * Provides compliance, debugging, and security monitoring capabilities.
 */
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Who performed the action
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),

  // What action was performed
  action: varchar('action', { length: 50 }).notNull(),

  // What entity was affected (optional)
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 36 }),

  // Additional context
  metadata: jsonb('metadata').$type<AuditMetadata>().notNull().default({}),

  // Request context (always captured)
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  // Composite index for user activity queries
  userActionIdx: index('audit_logs_user_action_idx').on(table.userId, table.action, table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Auth types for TypeScript inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// =====================================================
// PASSKEYS (WebAuthn/FIDO2)
// =====================================================

/**
 * Authenticator transport types (how the authenticator communicates)
 */
export type AuthenticatorTransport = 'usb' | 'ble' | 'nfc' | 'internal' | 'hybrid';

/**
 * Stores WebAuthn/FIDO2 credentials (Passkeys).
 * Based on SimpleWebAuthn data structures.
 */
export const userPasskeys = pgTable('user_passkeys', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Credential identifiers (stored as base64url-encoded strings)
  credentialId: text('credential_id').notNull(), // Base64URL-encoded credential ID
  credentialPublicKey: text('credential_public_key').notNull(), // Base64URL-encoded public key

  // Counter for replay attack prevention
  counter: integer('counter').notNull().default(0),

  // Credential metadata
  credentialDeviceType: varchar('credential_device_type', { length: 32 }).notNull(), // 'singleDevice' | 'multiDevice'
  credentialBackedUp: boolean('credential_backed_up').notNull().default(false),

  // Optional: How the authenticator communicates
  transports: jsonb('transports').$type<AuthenticatorTransport[]>(),

  // User-friendly name for the passkey
  name: varchar('name', { length: 100 }).notNull().default('Passkey'),

  // AAGUID for identifying the authenticator make/model (optional)
  aaguid: varchar('aaguid', { length: 36 }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
}, (table) => ({
  userIdIdx: index('user_passkeys_user_id_idx').on(table.userId),
  credentialIdIdx: index('user_passkeys_credential_id_idx').on(table.credentialId),
  // Ensure credential ID is unique across all users
  credentialIdUniqueIdx: index('user_passkeys_credential_id_unique').on(table.credentialId),
}));

export type UserPasskey = typeof userPasskeys.$inferSelect;
export type NewUserPasskey = typeof userPasskeys.$inferInsert;

/**
 * Temporary storage for WebAuthn challenges.
 * Challenges are short-lived and should be cleaned up regularly.
 */
export const webauthnChallenges = pgTable('webauthn_challenges', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),

  // For registration: the user ID
  // For authentication: null (discoverable credentials) or user ID
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }),

  // The challenge string (base64url-encoded)
  challenge: text('challenge').notNull(),

  // Type of ceremony
  type: varchar('type', { length: 20 }).notNull(), // 'registration' | 'authentication'

  // Expiration (challenges should expire quickly, e.g., 5 minutes)
  expiresAt: timestamp('expires_at').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('webauthn_challenges_user_id_idx').on(table.userId),
  expiresAtIdx: index('webauthn_challenges_expires_at_idx').on(table.expiresAt),
  challengeIdx: index('webauthn_challenges_challenge_idx').on(table.challenge),
}));

export type WebAuthnChallenge = typeof webauthnChallenges.$inferSelect;
export type NewWebAuthnChallenge = typeof webauthnChallenges.$inferInsert;

// =====================================================
// PLATFORM: EXTERNAL AGENTS & WORKSPACES
// =====================================================

// Agent status enum
export const agentStatusEnum = pgEnum('agent_status', ['active', 'inactive', 'maintenance', 'error']);

// External Agents table
export const externalAgents = pgTable('external_agents', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  endpoint: text('endpoint').notNull(),
  apiKeyHash: varchar('api_key_hash', { length: 64 }).notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().notNull().default([]),
  status: agentStatusEnum('status').notNull().default('inactive'),
  version: varchar('version', { length: 50 }),
  iconUrl: text('icon_url'),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastHealthCheck: timestamp('last_health_check'),
  config: jsonb('config').$type<{
    timeout?: number;
    retries?: number;
    rateLimit?: number;
    webhookUrl?: string;
  }>().notNull().default({}),
}, (table) => ({
  statusIdx: index('external_agents_status_idx').on(table.status),
  createdByIdx: index('external_agents_created_by_idx').on(table.createdBy),
}));

// Workspaces table
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 255 }).notNull(),
  iconUrl: text('icon_url'),
  isDefault: boolean('is_default').notNull().default(false),
  settings: jsonb('settings').$type<{
    theme?: string;
    defaultAgent?: string;
    notifications?: boolean;
  }>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('workspaces_user_id_idx').on(table.userId),
  slugIdx: index('workspaces_slug_idx').on(table.userId, table.slug),
  isDefaultIdx: index('workspaces_is_default_idx').on(table.userId, table.isDefault),
}));

// Workspace Agents (many-to-many: workspaces ↔ agents)
export const workspaceAgents = pgTable('workspace_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdIdx: index('workspace_agents_workspace_id_idx').on(table.workspaceId),
  agentIdIdx: index('workspace_agents_agent_id_idx').on(table.agentId),
  uniqueWorkspaceAgent: index('workspace_agents_unique').on(table.workspaceId, table.agentId),
}));

// Workspace Knowledge (scoped knowledge base per workspace)
export const workspaceKnowledge = pgTable('workspace_knowledge', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  sourceUrl: text('source_url'),
  metadata: jsonb('metadata').$type<{
    fileType?: string;
    fileSize?: number;
    uploadedBy?: string;
    tags?: string[];
  }>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdIdx: index('workspace_knowledge_workspace_id_idx').on(table.workspaceId),
  sourceTypeIdx: index('workspace_knowledge_source_type_idx').on(table.sourceType),
}));

// Platform types for TypeScript inference
export type ExternalAgent = typeof externalAgents.$inferSelect;
export type NewExternalAgent = typeof externalAgents.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type WorkspaceAgent = typeof workspaceAgents.$inferSelect;
export type NewWorkspaceAgent = typeof workspaceAgents.$inferInsert;

export type WorkspaceKnowledge = typeof workspaceKnowledge.$inferSelect;
export type NewWorkspaceKnowledge = typeof workspaceKnowledge.$inferInsert;

// =====================================================
// PROFILE SYSTEM TABLES
// =====================================================

// User Audit table
export const userAudit = pgTable('user_audit', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_audit_user_id_idx').on(table.userId),
  actionIdx: index('user_audit_action_idx').on(table.action),
  createdAtIdx: index('user_audit_created_at_idx').on(table.createdAt),
}));

// User Notification Preferences table
export const userNotificationPrefs = pgTable('user_notification_prefs', {
  userId: varchar('user_id', { length: 36 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  emailDigest: boolean('email_digest').notNull().default(true),
  productUpdates: boolean('product_updates').notNull().default(true),
  securityAlerts: boolean('security_alerts').notNull().default(true),
  webPush: boolean('web_push').notNull().default(false),
  sms: boolean('sms').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Profile types
export type UserAudit = typeof userAudit.$inferSelect;
export type NewUserAudit = typeof userAudit.$inferInsert;

export type UserNotificationPrefs = typeof userNotificationPrefs.$inferSelect;
export type NewUserNotificationPrefs = typeof userNotificationPrefs.$inferInsert;

// =====================================================
// AGENT CHAT SYSTEM TABLES
// =====================================================

// Agent Messages table
export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant'
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('agent_messages_user_idx').on(table.userId),
  agentIdIdx: index('agent_messages_agent_idx').on(table.agentId),
  createdAtIdx: index('agent_messages_created_idx').on(table.createdAt),
  userAgentIdx: index('agent_messages_user_agent_idx').on(table.userId, table.agentId),
  workspaceIdx: index('agent_messages_workspace_idx').on(table.workspaceId),
  workspaceUserIdx: index('agent_messages_workspace_user_idx').on(table.workspaceId, table.userId),
}));

// Agent Conversations table (for grouping)
export const agentConversations = pgTable('agent_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  lastMessageAt: timestamp('last_message_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userAgentIdx: index('conversations_user_agent_idx').on(table.userId, table.agentId),
  lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageAt),
  workspaceIdx: index('conversations_workspace_idx').on(table.workspaceId),
  workspaceUserIdx: index('conversations_workspace_user_idx').on(table.workspaceId, table.userId),
}));

// AI Usage Tracking table
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  estimatedCost: integer('estimated_cost').notNull().default(0), // Cost in micro-dollars (1/1,000,000 USD)
  responseTimeMs: integer('response_time_ms'),
  success: boolean('success').notNull().default(true),
  errorType: varchar('error_type', { length: 50 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  agentIdIdx: index('ai_usage_agent_idx').on(table.agentId),
  userIdIdx: index('ai_usage_user_idx').on(table.userId),
  createdAtIdx: index('ai_usage_created_idx').on(table.createdAt),
  userAgentIdx: index('ai_usage_user_agent_idx').on(table.userId, table.agentId),
  modelIdx: index('ai_usage_model_idx').on(table.model),
}));

// Agent chat types
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;

export type AgentConversation = typeof agentConversations.$inferSelect;
export type NewAgentConversation = typeof agentConversations.$inferInsert;

export type AIUsage = typeof aiUsage.$inferSelect;
export type NewAIUsage = typeof aiUsage.$inferInsert;

// =====================================================
// API KEY MANAGEMENT SYSTEM
// =====================================================

// Re-export API Key tables from schema-api-keys.ts
export {
  apiKeys,
  apiKeyUsageLogs,
  apiKeyAuditEvents,
  API_SCOPES,
  SCOPE_GROUPS,
  type ApiKey,
  type NewApiKey,
  type ApiKeyUsageLog,
  type ApiKeyAuditEvent,
  type ApiScope,
} from './schema-api-keys';

// ===================================================================
// BRAIN AI MODULE - Knowledge Base & Context Management
// ===================================================================

// Brain Documents - Central knowledge repository with vector embeddings
export const brainDocuments = pgTable('brain_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull().default('default-workspace'),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 64 }), // SHA-256 for deduplication
  metadata: jsonb('metadata').$type<{
    source?: string;
    sourceType?: 'upload' | 'url' | 'agent' | 'conversation';
    author?: string;
    tags?: string[];
    category?: string;
    language?: string;
    fileType?: string;
    fileSize?: number;
    url?: string;
    confidence?: number;
  }>().notNull().default({}),
  embedding: vector('embedding', { dimension: 1536 }),
  searchVector: text('search_vector'), // tsvector for full-text search
  chunkIndex: integer('chunk_index'), // For multi-chunk documents
  parentDocId: uuid('parent_doc_id'), // Reference to parent document
  tokenCount: integer('token_count').notNull().default(0),
  accessLevel: varchar('access_level', { length: 50 }).notNull().default('workspace'), // workspace, user, public
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index('brain_doc_workspace_idx').on(table.workspaceId),
  embeddingIdx: index('brain_doc_embedding_idx').using(
    'hnsw',
    sql`${table.embedding} vector_cosine_ops`
  ),
  searchVectorIdx: index('brain_doc_search_vector_idx').using(
    'gin',
    sql`to_tsvector('english', ${table.content})`
  ),
  contentHashIdx: index('brain_doc_content_hash_idx').on(table.contentHash),
  parentDocIdx: index('brain_doc_parent_doc_idx').on(table.parentDocId),
  createdAtIdx: index('brain_doc_created_at_idx').on(table.createdAt),
  isActiveIdx: index('brain_doc_is_active_idx').on(table.isActive),
}));

// Brain Contexts - Session and conversation context tracking
export const brainContexts = pgTable('brain_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull().default('default-workspace'),
  userId: varchar('user_id', { length: 255 }).notNull(),
  agentId: varchar('agent_id', { length: 255 }),
  contextType: varchar('context_type', { length: 100 }).notNull().default('conversation'), // conversation, task, analysis
  contextSnapshot: jsonb('context_snapshot').$type<{
    messages?: Array<{ role: string; content: string; timestamp: string }>;
    summary?: string;
    intent?: string;
    entities?: Record<string, any>;
    sentiment?: string;
    topics?: string[];
    keyPoints?: string[];
    decisions?: string[];
    actionItems?: string[];
    metadata?: Record<string, any>;
  }>().notNull().default({}),
  embedding: vector('embedding', { dimension: 1536 }), // Embedding of context summary
  relevanceScore: integer('relevance_score').default(0), // How relevant this context is (0-100)
  tokenCount: integer('token_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'), // Auto-cleanup old contexts
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdx: index('brain_ctx_session_idx').on(table.sessionId),
  workspaceIdx: index('brain_ctx_workspace_idx').on(table.workspaceId),
  userIdx: index('brain_ctx_user_idx').on(table.userId),
  agentIdx: index('brain_ctx_agent_idx').on(table.agentId),
  embeddingIdx: index('brain_ctx_embedding_idx').using(
    'hnsw',
    sql`${table.embedding} vector_cosine_ops`
  ),
  createdAtIdx: index('brain_ctx_created_at_idx').on(table.createdAt),
  expiresAtIdx: index('brain_ctx_expires_at_idx').on(table.expiresAt),
  isActiveIdx: index('brain_ctx_is_active_idx').on(table.isActive),
}));

// Brain Learnings - AI-discovered patterns and insights
export const brainLearnings = pgTable('brain_learnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull().default('default-workspace'),
  pattern: text('pattern').notNull(), // Discovered pattern
  insight: text('insight').notNull(), // Human-readable insight
  category: varchar('category', { length: 100 }), // user_behavior, agent_performance, topic_trend, etc.
  confidence: integer('confidence').notNull().default(50), // 0-100
  evidenceCount: integer('evidence_count').notNull().default(1), // How many times observed
  relatedContextIds: jsonb('related_context_ids').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<{
    agentId?: string;
    userId?: string;
    frequency?: number;
    lastObserved?: string;
    impact?: 'high' | 'medium' | 'low';
    actionable?: boolean;
    tags?: string[];
  }>().notNull().default({}),
  embedding: vector('embedding', { dimension: 1536 }), // For similarity search
  isActive: boolean('is_active').notNull().default(true),
  isValidated: boolean('is_validated').notNull().default(false), // Human-verified
  validatedBy: varchar('validated_by', { length: 255 }),
  validatedAt: timestamp('validated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index('brain_learn_workspace_idx').on(table.workspaceId),
  categoryIdx: index('brain_learn_category_idx').on(table.category),
  confidenceIdx: index('brain_learn_confidence_idx').on(table.confidence),
  embeddingIdx: index('brain_learn_embedding_idx').using(
    'hnsw',
    sql`${table.embedding} vector_cosine_ops`
  ),
  createdAtIdx: index('brain_learn_created_at_idx').on(table.createdAt),
  isActiveIdx: index('brain_learn_is_active_idx').on(table.isActive),
}));

// Brain Query Logs - Track what users and agents are asking
export const brainQueryLogs = pgTable('brain_query_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull().default('default-workspace'),
  userId: varchar('user_id', { length: 255 }),
  agentId: varchar('agent_id', { length: 255 }),
  query: text('query').notNull(),
  queryEmbedding: vector('query_embedding', { dimension: 1536 }),
  resultCount: integer('result_count').notNull().default(0),
  topResultIds: jsonb('top_result_ids').$type<string[]>().default([]),
  responseTime: integer('response_time'), // milliseconds
  wasHelpful: boolean('was_helpful'), // User feedback
  metadata: jsonb('metadata').$type<{
    searchType?: 'semantic' | 'hybrid' | 'fulltext';
    filters?: Record<string, any>;
    reranked?: boolean;
    cacheHit?: boolean;
  }>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index('brain_query_workspace_idx').on(table.workspaceId),
  userIdx: index('brain_query_user_idx').on(table.userId),
  agentIdx: index('brain_query_agent_idx').on(table.agentId),
  createdAtIdx: index('brain_query_created_at_idx').on(table.createdAt),
}));

// Type exports for Brain AI tables
export type BrainDocument = typeof brainDocuments.$inferSelect;
export type NewBrainDocument = typeof brainDocuments.$inferInsert;
export type BrainContext = typeof brainContexts.$inferSelect;
export type NewBrainContext = typeof brainContexts.$inferInsert;
export type BrainLearning = typeof brainLearnings.$inferSelect;
export type NewBrainLearning = typeof brainLearnings.$inferInsert;
export type BrainQueryLog = typeof brainQueryLogs.$inferSelect;
export type NewBrainQueryLog = typeof brainQueryLogs.$inferInsert;

// =====================================================
// OAUTH2 INTEGRATIONS SYSTEM
// =====================================================

// Integration status enum
export const integrationStatusEnum = pgEnum('integration_status', [
  'connected',
  'disconnected',
  'error',
  'token_expired'
]);

// OAuth2 Integrations table
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // google, microsoft, slack, github
  service: varchar('service', { length: 50 }).notNull(), // gmail, calendar, drive, outlook, etc.
  accessToken: text('access_token').notNull(), // Encrypted
  refreshToken: text('refresh_token'), // Encrypted
  tokenType: varchar('token_type', { length: 50 }).notNull().default('Bearer'),
  expiresAt: timestamp('expires_at').notNull(),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  status: integrationStatusEnum('status').notNull().default('connected'),
  connectedEmail: varchar('connected_email', { length: 255 }),
  connectedName: varchar('connected_name', { length: 255 }),
  connectedAvatar: text('connected_avatar'),
  metadata: jsonb('metadata').$type<{
    lastSyncAt?: string;
    syncErrors?: number;
    webhookUrl?: string;
    customSettings?: Record<string, any>;
  }>().notNull().default({}),
  connectedAt: timestamp('connected_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('integrations_user_id_idx').on(table.userId),
  providerIdx: index('integrations_provider_idx').on(table.provider),
  statusIdx: index('integrations_status_idx').on(table.status),
  expiresAtIdx: index('integrations_expires_at_idx').on(table.expiresAt),
  uniqueUserProviderService: index('integrations_unique_user_provider_service').on(
    table.userId,
    table.provider,
    table.service
  ),
}));

// OAuth Integration Events (audit log)
export const integrationEvents = pgTable('integration_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(), // connected, disconnected, token_refreshed, api_call, error
  details: jsonb('details').$type<{
    success?: boolean;
    errorMessage?: string;
    endpoint?: string;
    responseTime?: number;
    tokenExpiry?: string;
  }>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  integrationIdIdx: index('integration_events_integration_id_idx').on(table.integrationId),
  eventTypeIdx: index('integration_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('integration_events_created_at_idx').on(table.createdAt),
}));

// Type exports for OAuth Integrations
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type IntegrationEvent = typeof integrationEvents.$inferSelect;
export type NewIntegrationEvent = typeof integrationEvents.$inferInsert;

/**
 * Brain Memories Table
 * Stores contextual data, embeddings, and shared intelligence between agents
 */
export const brainMemories = pgTable(
  'brain_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 255 }).notNull(),
    context: jsonb('context').notNull(),
    embeddings: jsonb('embeddings'), // Stored as JSON array of numbers
    tags: jsonb('tags').notNull().default('[]'), // Array of strings
    importance: integer('importance').notNull().default(5), // 1-10
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Primary indices for fast lookups
    agentIdIdx: index('idx_brain_memories_agent_id').on(table.agentId),
    createdAtIdx: index('idx_brain_memories_created_at').on(table.createdAt),
    importanceIdx: index('idx_brain_memories_importance').on(table.importance),
    expiresAtIdx: index('idx_brain_memories_expires_at').on(table.expiresAt),

    // Composite indices for common queries
    agentCreatedIdx: index('idx_brain_memories_agent_created').on(table.agentId, table.createdAt),
    agentImportanceIdx: index('idx_brain_memories_agent_importance').on(table.agentId, table.importance),
  })
);

export type BrainMemory = typeof brainMemories.$inferSelect;
export type NewBrainMemory = typeof brainMemories.$inferInsert;

/**
 * Memory Tags Table (for efficient tag queries)
 * Normalized tags for fast tag-based lookups
 */
export const brainMemoryTags = pgTable(
  'brain_memory_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id').notNull().references(() => brainMemories.id, { onDelete: 'cascade' }),
    tag: varchar('tag', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    memoryIdIdx: index('idx_brain_memory_tags_memory_id').on(table.memoryId),
    tagIdx: index('idx_brain_memory_tags_tag').on(table.tag),
    memoryTagIdx: index('idx_brain_memory_tags_memory_tag').on(table.memoryId, table.tag),
  })
);

export type BrainMemoryTag = typeof brainMemoryTags.$inferSelect;
export type NewBrainMemoryTag = typeof brainMemoryTags.$inferInsert;

/**
 * Memory Statistics Table (for analytics)
 * Cached statistics for performance
 */
export const brainMemoryStats = pgTable(
  'brain_memory_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 255 }).notNull().unique(),
    totalMemories: integer('total_memories').notNull().default(0),
    avgImportance: integer('avg_importance').notNull().default(5),
    lastMemoryAt: timestamp('last_memory_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    agentIdIdx: index('idx_brain_memory_stats_agent_id').on(table.agentId),
  })
);

export type BrainMemoryStats = typeof brainMemoryStats.$inferSelect;
export type NewBrainMemoryStats = typeof brainMemoryStats.$inferInsert;

// =====================================================
// COLLABORATION LAB V2.0 TABLES
// Multi-Agent Collaboration System
// =====================================================

/**
 * Collaboration Status Enum
 */
export const collaborationStatusEnum = pgEnum('collaboration_status', [
  'planning',
  'executing',
  'completed',
  'paused',
  'failed'
]);

/**
 * Collaborations Table
 * Main table for tracking multi-agent collaborations
 */
export const collaborations = pgTable(
  'collaborations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),

    // Task Details
    taskDescription: text('task_description').notNull(),
    status: collaborationStatusEnum('status').notNull().default('planning'),

    // Intelligence & Analysis
    semanticAnalysis: jsonb('semantic_analysis').$type<{
      intent?: string;
      domains?: string[];
      complexity?: number;
      requiresData?: boolean;
      requiresCreativity?: boolean;
      requiresTechnical?: boolean;
      requiresFinancial?: boolean;
      requiresLegal?: boolean;
      requiresCommunication?: boolean;
      estimatedSteps?: number;
      keywords?: string[];
    }>(),
    complexityScore: integer('complexity_score'), // 1-10
    estimatedDuration: integer('estimated_duration'), // seconds

    // Results
    summary: text('summary'),
    successScore: integer('success_score'), // 0-100

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_collaborations_user_id').on(table.userId),
    statusIdx: index('idx_collaborations_status').on(table.status),
    createdAtIdx: index('idx_collaborations_created_at').on(table.createdAt),
    userStatusIdx: index('idx_collaborations_user_status').on(table.userId, table.status),
  })
);

export type Collaboration = typeof collaborations.$inferSelect;
export type NewCollaboration = typeof collaborations.$inferInsert;

/**
 * Message Type Enum
 */
export const messageTypeEnum = pgEnum('message_type', [
  'thought',
  'action',
  'question',
  'insight',
  'handoff',
  'user_input'
]);

/**
 * Collaboration Messages Table
 * Individual messages from agents during collaboration
 */
export const collaborationMessages = pgTable(
  'collaboration_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collaborationId: uuid('collaboration_id')
      .notNull()
      .references(() => collaborations.id, { onDelete: 'cascade' }),

    // Agent Info
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    agentName: varchar('agent_name', { length: 100 }).notNull(),

    // Message Content
    content: text('content').notNull(),
    type: messageTypeEnum('type').notNull().default('thought'),

    // AI Metadata
    llmModel: varchar('llm_model', { length: 100 }), // 'gpt-4-turbo', 'claude-3-opus'
    tokensUsed: integer('tokens_used'),
    latencyMs: integer('latency_ms'),
    confidence: integer('confidence'), // 0-100 (stored as integer for simplicity)

    // Relations
    parentMessageId: uuid('parent_message_id').references(() => collaborationMessages.id),
    targetAgentId: varchar('target_agent_id', { length: 50 }), // For handoffs

    // Additional Metadata
    metadata: jsonb('metadata').$type<{
      relevance?: string[];
      tags?: string[];
      reasoning?: string;
      [key: string]: any;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    collaborationIdIdx: index('idx_collab_messages_collaboration').on(table.collaborationId),
    agentIdIdx: index('idx_collab_messages_agent').on(table.agentId),
    createdAtIdx: index('idx_collab_messages_created').on(table.createdAt),
    collabCreatedIdx: index('idx_collab_messages_collab_created').on(
      table.collaborationId,
      table.createdAt
    ),
  })
);

export type CollaborationMessage = typeof collaborationMessages.$inferSelect;
export type NewCollaborationMessage = typeof collaborationMessages.$inferInsert;

/**
 * Collaboration Agents Table
 * Tracks which agents were selected for each collaboration and their performance
 */
export const collaborationAgents = pgTable(
  'collaboration_agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collaborationId: uuid('collaboration_id')
      .notNull()
      .references(() => collaborations.id, { onDelete: 'cascade' }),
    agentId: varchar('agent_id', { length: 50 }).notNull(),

    // Selection Rationale
    selectionReason: text('selection_reason'),
    relevanceScore: integer('relevance_score'), // 0-100

    // Performance Metrics
    messagesCount: integer('messages_count').default(0).notNull(),
    avgConfidence: integer('avg_confidence'), // 0-100
    contributionScore: integer('contribution_score'), // 0-100

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    collaborationIdIdx: index('idx_collab_agents_collaboration').on(table.collaborationId),
    agentIdIdx: index('idx_collab_agents_agent').on(table.agentId),
    collabAgentIdx: index('idx_collab_agents_collab_agent').on(
      table.collaborationId,
      table.agentId
    ),
  })
);

export type CollaborationAgent = typeof collaborationAgents.$inferSelect;
export type NewCollaborationAgent = typeof collaborationAgents.$inferInsert;

// =====================================================
// COMMAND CENTER - Export all tables from schema-command-center
// =====================================================

export * from './schema-command-center';

// =====================================================
// AGENT METRICS - Export all tables from schema-agent-metrics
// =====================================================

export * from './schema-agent-metrics';

// =====================================================
// FILE MANAGEMENT - Export all tables from schema-files
// =====================================================

export * from './schema-files';

// =====================================================
// DATABASE CONNECTIONS - Export all tables from schema-connections
// =====================================================

export * from './schema-connections';

// =====================================================
// CUSTOM AGENTS - Export all tables from schema-custom-agents
// =====================================================

export * from './schema-custom-agents';

// =====================================================
// USER BUDGETS - Export all tables from schema-user-budgets
// =====================================================

export * from './schema-user-budgets';

// =====================================================
// CUSTOM PROMPTS - Export all tables from schema-custom-prompts
// =====================================================

export * from './schema-custom-prompts';

// =====================================================
// WORKFLOWS - Export all tables from schema-workflows
// =====================================================

export * from './schema-workflows';

// =====================================================
// INBOX & ARTIFACTS - Export all tables from schema-inbox
// =====================================================

export * from './schema-inbox';
