/**
 * OBSERVABILITY SCHEMA
 *
 * Database persistence layer for security events and AI request tracing.
 * Enables full observability of system behavior with persistent storage.
 *
 * Tables:
 * - security_events: Tracks all security-related events (auth, rate limiting, etc.)
 * - ai_request_traces: Tracks all AI/LLM API calls with tokens, costs, and performance
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
  integer,
  numeric,
  boolean,
} from 'drizzle-orm/pg-core';

// ============================================================================
// SECURITY EVENTS
// ============================================================================

/**
 * Security event severity levels
 * - info: Normal operational events (successful login, etc.)
 * - warning: Potential issues requiring attention (rate limit approach, etc.)
 * - error: Security failures (failed auth, blocked requests, etc.)
 * - critical: Severe security incidents (brute force, token theft, etc.)
 */
export const securitySeverityEnum = pgEnum('security_severity', [
  'info',
  'warning',
  'error',
  'critical',
]);

/**
 * Security event categories for filtering and analysis
 */
export const securityCategoryEnum = pgEnum('security_category', [
  'authentication',      // Login, logout, session events
  'authorization',       // Permission checks, access control
  'rate_limiting',       // Rate limit events
  'token_management',    // Token creation, validation, revocation
  'oauth',               // OAuth flow events
  'mfa',                 // Multi-factor authentication events
  'api_security',        // API key events, validation
  'suspicious_activity', // Detected anomalies
  'data_access',         // Sensitive data access
  'system',              // System-level security events
]);

/**
 * Security Events Table
 *
 * Stores all security-related events for audit, monitoring, and analysis.
 * Replaces the in-memory array in SecurityEventService.
 */
export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Event identification
  eventType: varchar('event_type', { length: 100 }).notNull(),
  category: securityCategoryEnum('category').notNull(),
  severity: securitySeverityEnum('severity').notNull().default('info'),

  // Actor information
  userId: varchar('user_id', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }),

  // Request context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestPath: varchar('request_path', { length: 500 }),
  requestMethod: varchar('request_method', { length: 10 }),

  // Event details
  message: text('message').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),

  // Status and outcome
  success: boolean('success').notNull().default(true),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),

  // Geo/Location (if available)
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Primary indexes for common queries
  eventTypeIdx: index('security_events_event_type_idx').on(table.eventType),
  categoryIdx: index('security_events_category_idx').on(table.category),
  severityIdx: index('security_events_severity_idx').on(table.severity),
  userIdIdx: index('security_events_user_id_idx').on(table.userId),

  // Time-based queries
  createdAtIdx: index('security_events_created_at_idx').on(table.createdAt),

  // Composite indexes for common access patterns
  userCategoryIdx: index('security_events_user_category_idx').on(table.userId, table.category),
  severityTimeIdx: index('security_events_severity_time_idx').on(table.severity, table.createdAt),
  ipAddressIdx: index('security_events_ip_address_idx').on(table.ipAddress),

  // Success/failure filtering
  successIdx: index('security_events_success_idx').on(table.success),
}));

// Type exports for security events
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;

// ============================================================================
// AI REQUEST TRACES
// ============================================================================

/**
 * AI Provider enum for multi-provider support
 */
export const aiProviderEnum = pgEnum('ai_provider', [
  'openai',
  'anthropic',
  'google',
  'azure_openai',
  'local',
  'fallback',
]);

/**
 * AI Request status
 */
export const aiRequestStatusEnum = pgEnum('ai_request_status', [
  'pending',
  'success',
  'failed',
  'timeout',
  'rate_limited',
  'cancelled',
]);

/**
 * AI Request Traces Table
 *
 * Comprehensive logging of all AI/LLM API calls for:
 * - Cost tracking and budgeting
 * - Performance monitoring
 * - Debugging and troubleshooting
 * - Usage analytics
 */
export const aiRequestTraces = pgTable('ai_request_traces', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Request identification
  traceId: varchar('trace_id', { length: 64 }).notNull(), // Correlation ID

  // Context
  userId: varchar('user_id', { length: 255 }),
  agentId: varchar('agent_id', { length: 100 }),
  workspaceId: varchar('workspace_id', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }),

  // Provider details
  provider: aiProviderEnum('provider').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  endpoint: varchar('endpoint', { length: 255 }),

  // Request details
  requestType: varchar('request_type', { length: 50 }).notNull(), // chat, completion, embedding, etc.
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),

  // Streaming info
  isStreaming: boolean('is_streaming').notNull().default(false),

  // Response details
  status: aiRequestStatusEnum('status').notNull().default('pending'),
  responseTimeMs: integer('response_time_ms'),
  finishReason: varchar('finish_reason', { length: 50 }),

  // Cost tracking (in USD, 6 decimal precision)
  promptCost: numeric('prompt_cost', { precision: 10, scale: 6 }),
  completionCost: numeric('completion_cost', { precision: 10, scale: 6 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 6 }),

  // Error tracking
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),

  // Metadata for debugging
  metadata: jsonb('metadata').$type<{
    temperature?: number;
    maxTokens?: number;
    systemPromptHash?: string;
    functionCalls?: string[];
    retryCount?: number;
    fallbackUsed?: boolean;
    cacheHit?: boolean;
  }>().default({}),

  // Timestamps
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  // Primary indexes
  traceIdIdx: index('ai_request_traces_trace_id_idx').on(table.traceId),
  userIdIdx: index('ai_request_traces_user_id_idx').on(table.userId),
  agentIdIdx: index('ai_request_traces_agent_id_idx').on(table.agentId),

  // Provider and model analytics
  providerIdx: index('ai_request_traces_provider_idx').on(table.provider),
  modelIdx: index('ai_request_traces_model_idx').on(table.model),

  // Status filtering
  statusIdx: index('ai_request_traces_status_idx').on(table.status),

  // Time-based queries
  startedAtIdx: index('ai_request_traces_started_at_idx').on(table.startedAt),

  // Cost analysis
  userCostIdx: index('ai_request_traces_user_cost_idx').on(table.userId, table.totalCost),
  workspaceCostIdx: index('ai_request_traces_workspace_cost_idx').on(table.workspaceId, table.totalCost),

  // Performance analysis
  responseTimeIdx: index('ai_request_traces_response_time_idx').on(table.responseTimeMs),
}));

// Type exports for AI request traces
export type AIRequestTrace = typeof aiRequestTraces.$inferSelect;
export type NewAIRequestTrace = typeof aiRequestTraces.$inferInsert;

// ============================================================================
// TRACE FEEDBACK
// ============================================================================

/**
 * Feedback rating enum
 */
export const feedbackRatingEnum = pgEnum('feedback_rating', [
  'positive',   // Thumbs up (+1)
  'negative',   // Thumbs down (-1)
]);

/**
 * Feedback status for admin review
 */
export const feedbackStatusEnum = pgEnum('feedback_status', [
  'pending',     // Awaiting review
  'reviewed',    // Admin has reviewed
  'resolved',    // Issue fixed (prompt updated)
  'dismissed',   // False positive / no action needed
]);

/**
 * Trace Feedback Table
 *
 * Stores user feedback on AI responses for quality evaluation.
 * Enables:
 * - User satisfaction tracking
 * - Quality metrics per model/prompt
 * - Admin review queue for negative feedback
 */
export const traceFeedback = pgTable('trace_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Link to the trace
  traceId: varchar('trace_id', { length: 64 }).notNull(),

  // User who gave feedback
  userId: varchar('user_id', { length: 255 }),

  // Rating
  rating: feedbackRatingEnum('rating').notNull(),

  // Optional user comment
  comment: text('comment'),

  // Context for debugging
  promptSlug: varchar('prompt_slug', { length: 100 }), // Link to prompt registry
  agentId: varchar('agent_id', { length: 100 }),
  model: varchar('model', { length: 100 }),

  // Snapshot of the conversation for review
  userMessage: text('user_message'),
  aiResponse: text('ai_response'),

  // Admin review
  reviewStatus: feedbackStatusEnum('review_status').notNull().default('pending'),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Primary indexes
  traceIdIdx: index('trace_feedback_trace_id_idx').on(table.traceId),
  userIdIdx: index('trace_feedback_user_id_idx').on(table.userId),

  // Rating and status for filtering
  ratingIdx: index('trace_feedback_rating_idx').on(table.rating),
  reviewStatusIdx: index('trace_feedback_review_status_idx').on(table.reviewStatus),

  // Quality metrics queries
  promptSlugIdx: index('trace_feedback_prompt_slug_idx').on(table.promptSlug),
  agentIdIdx: index('trace_feedback_agent_id_idx').on(table.agentId),
  modelIdx: index('trace_feedback_model_idx').on(table.model),

  // Time-based queries
  createdAtIdx: index('trace_feedback_created_at_idx').on(table.createdAt),

  // Composite for review queue
  pendingReviewIdx: index('trace_feedback_pending_review_idx').on(table.rating, table.reviewStatus),
}));

// Type exports for trace feedback
export type TraceFeedback = typeof traceFeedback.$inferSelect;
export type NewTraceFeedback = typeof traceFeedback.$inferInsert;

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

/**
 * Predefined security event types for consistency across the application
 */
export const SECURITY_EVENT_TYPES = {
  // Authentication
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  SESSION_CREATED: 'auth.session_created',
  SESSION_EXPIRED: 'auth.session_expired',
  SESSION_REVOKED: 'auth.session_revoked',

  // Token management
  TOKEN_CREATED: 'token.created',
  TOKEN_VALIDATED: 'token.validated',
  TOKEN_INVALID: 'token.invalid',
  TOKEN_EXPIRED: 'token.expired',
  TOKEN_REVOKED: 'token.revoked',
  TOKEN_REFRESHED: 'token.refreshed',

  // OAuth
  OAUTH_INITIATED: 'oauth.initiated',
  OAUTH_CALLBACK: 'oauth.callback',
  OAUTH_SUCCESS: 'oauth.success',
  OAUTH_FAILED: 'oauth.failed',
  OAUTH_TOKEN_REFRESH: 'oauth.token_refresh',
  OAUTH_REVOKED: 'oauth.revoked',

  // MFA
  MFA_ENABLED: 'mfa.enabled',
  MFA_DISABLED: 'mfa.disabled',
  MFA_VERIFIED: 'mfa.verified',
  MFA_FAILED: 'mfa.failed',

  // Rate limiting
  RATE_LIMIT_WARNING: 'rate_limit.warning',
  RATE_LIMIT_EXCEEDED: 'rate_limit.exceeded',
  RATE_LIMIT_BLOCKED: 'rate_limit.blocked',

  // API Security
  API_KEY_CREATED: 'api_key.created',
  API_KEY_USED: 'api_key.used',
  API_KEY_INVALID: 'api_key.invalid',
  API_KEY_REVOKED: 'api_key.revoked',

  // Suspicious activity
  BRUTE_FORCE_DETECTED: 'suspicious.brute_force',
  UNUSUAL_LOCATION: 'suspicious.unusual_location',
  IMPOSSIBLE_TRAVEL: 'suspicious.impossible_travel',
  MULTIPLE_FAILURES: 'suspicious.multiple_failures',

  // Data access
  SENSITIVE_DATA_ACCESS: 'data.sensitive_access',
  DATA_EXPORT: 'data.export',

  // System
  ENCRYPTION_KEY_VALIDATED: 'system.encryption_key_validated',
  SERVER_STARTED: 'system.server_started',
  SERVER_SHUTDOWN: 'system.server_shutdown',
} as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[keyof typeof SECURITY_EVENT_TYPES];
