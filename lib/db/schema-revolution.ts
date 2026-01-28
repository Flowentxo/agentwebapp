/**
 * REVOLUTION SYSTEM SCHEMA
 *
 * Extended database schema for the Revolution AI Agent Creation System
 * This includes:
 * - Agent categories, use cases, and integrations (reference tables)
 * - User subscriptions and limits (Free/Pro/Enterprise)
 * - OAuth connections for external services
 * - HubSpot integration
 * - Execution logs and job tracking
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
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customAgents } from './schema-custom-agents';
import { users } from './schema';

// =====================================================
// ENUMS
// =====================================================

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'free',
  'pro',
  'enterprise',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trial',
]);

export const integrationTypeEnum = pgEnum('integration_type', [
  'oauth',
  'api_key',
  'webhook',
]);

export const executionStatusEnum = pgEnum('execution_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'timeout',
]);

export const hubspotWebhookStatusEnum = pgEnum('hubspot_webhook_status', [
  'active',
  'inactive',
  'failed',
]);

// =====================================================
// REVOLUTION CATEGORIES
// =====================================================

/**
 * Agent Categories
 * Defines the main types of agents (Sales, Support, Operations, etc.)
 */
export const revolutionCategories = pgTable(
  'revolution_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),

    // Visual representation
    icon: varchar('icon', { length: 50 }), // Emoji or icon name
    color: varchar('color', { length: 7 }).default('#3B82F6'), // Hex color

    // Ordering
    displayOrder: integer('display_order').default(0),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Metadata
    metadata: jsonb('metadata').$type<{
      industryFocus?: string[];
      requiredCapabilities?: string[];
      suggestedModel?: string;
    }>().default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('revolution_categories_slug_idx').on(table.slug),
    activeIdx: index('revolution_categories_active_idx').on(table.isActive),
  })
);

// =====================================================
// REVOLUTION USE CASES
// =====================================================

/**
 * Use Cases
 * Specific tasks agents can perform (Lead Qualification, Ticket Management, etc.)
 */
export const revolutionUseCases = pgTable(
  'revolution_use_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    categoryId: uuid('category_id')
      .notNull()
      .references(() => revolutionCategories.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    description: text('description'),

    // Template for system prompt
    promptTemplate: text('prompt_template'),

    // Required capabilities
    requiredCapabilities: jsonb('required_capabilities')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),

    // Suggested integrations
    suggestedIntegrations: jsonb('suggested_integrations')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),

    // Ordering
    displayOrder: integer('display_order').default(0),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    categoryIdIdx: index('revolution_use_cases_category_idx').on(table.categoryId),
    slugIdx: index('revolution_use_cases_slug_idx').on(table.slug),
    activeIdx: index('revolution_use_cases_active_idx').on(table.isActive),
  })
);

// =====================================================
// REVOLUTION INTEGRATIONS
// =====================================================

/**
 * Available Integrations
 * External services that can be connected (HubSpot, Calendly, Slack, etc.)
 */
export const revolutionIntegrations = pgTable(
  'revolution_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),

    // Integration details
    provider: varchar('provider', { length: 100 }).notNull(), // 'hubspot', 'google', etc.
    type: integrationTypeEnum('type').notNull(),

    // Visual
    icon: varchar('icon', { length: 500 }), // URL or emoji
    logoUrl: varchar('logo_url', { length: 500 }),

    // Configuration
    authConfig: jsonb('auth_config').$type<{
      authType: 'oauth' | 'api_key' | 'webhook';
      authUrl?: string;
      tokenUrl?: string;
      scopes?: string[];
      requiredKeys?: string[];
    }>().notNull(),

    // Capabilities
    capabilities: jsonb('capabilities')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),

    // Documentation
    docUrl: varchar('doc_url', { length: 500 }),
    setupInstructions: text('setup_instructions'),

    // Ordering
    displayOrder: integer('display_order').default(0),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    isPopular: boolean('is_popular').notNull().default(false),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('revolution_integrations_slug_idx').on(table.slug),
    providerIdx: index('revolution_integrations_provider_idx').on(table.provider),
    activeIdx: index('revolution_integrations_active_idx').on(table.isActive),
  })
);

// =====================================================
// AGENT-USE CASE MAPPING (Many-to-Many)
// =====================================================

export const agentUseCases = pgTable(
  'agent_use_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    agentId: uuid('agent_id')
      .notNull()
      .references(() => customAgents.id, { onDelete: 'cascade' }),

    useCaseId: uuid('use_case_id')
      .notNull()
      .references(() => revolutionUseCases.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('agent_use_cases_agent_idx').on(table.agentId),
    useCaseIdIdx: index('agent_use_cases_use_case_idx').on(table.useCaseId),
    uniqueAgentUseCase: uniqueIndex('unique_agent_use_case_idx').on(
      table.agentId,
      table.useCaseId
    ),
  })
);

// =====================================================
// USER SUBSCRIPTIONS
// =====================================================

/**
 * User Subscriptions
 * Manages user plans (Free/Pro/Enterprise) and billing
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Plan details
    plan: subscriptionPlanEnum('plan').notNull().default('free'),
    status: subscriptionStatusEnum('status').notNull().default('active'),

    // Stripe integration
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),

    // Billing
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),

    // Trial
    trialStart: timestamp('trial_start'),
    trialEnd: timestamp('trial_end'),

    // Limits
    agentLimit: integer('agent_limit').notNull().default(3), // Free: 3, Pro: 50, Enterprise: unlimited (-1)
    executionLimit: integer('execution_limit').notNull().default(100), // Per month

    // Usage tracking
    agentsCreated: integer('agents_created').notNull().default(0),
    executionsThisMonth: integer('executions_this_month').notNull().default(0),
    lastResetAt: timestamp('last_reset_at').defaultNow(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
    stripeCustomerIdx: index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    planIdx: index('subscriptions_plan_idx').on(table.plan),
  })
);

// =====================================================
// OAUTH CONNECTIONS
// =====================================================

/**
 * OAuth Connections
 * Stores OAuth tokens for external integrations (Google, Microsoft, HubSpot, etc.)
 */
export const oauthConnections = pgTable(
  'oauth_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    integrationId: uuid('integration_id')
      .references(() => revolutionIntegrations.id, { onDelete: 'set null' }),

    // Provider info
    provider: varchar('provider', { length: 100 }).notNull(), // 'google', 'hubspot', 'microsoft'
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),

    // Tokens (encrypted)
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenType: varchar('token_type', { length: 50 }).default('Bearer'),

    // Token expiry
    expiresAt: timestamp('expires_at'),

    // Scopes granted
    scope: text('scope'),

    // Additional data
    providerData: jsonb('provider_data').$type<{
      email?: string;
      name?: string;
      avatar?: string;
      orgId?: string;
      [key: string]: any;
    }>().default(sql`'{}'::jsonb`),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('oauth_connections_user_id_idx').on(table.userId),
    providerIdx: index('oauth_connections_provider_idx').on(table.provider),
    integrationIdIdx: index('oauth_connections_integration_idx').on(table.integrationId),
    uniqueUserProvider: uniqueIndex('unique_user_provider_idx').on(
      table.userId,
      table.provider,
      table.providerAccountId
    ),
  })
);

// =====================================================
// AGENT EXECUTIONS (Job Tracking)
// =====================================================

/**
 * Agent Executions
 * Tracks all agent execution jobs (for BullMQ integration)
 */
export const agentExecutions = pgTable(
  'agent_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    agentId: uuid('agent_id')
      .notNull()
      .references(() => customAgents.id, { onDelete: 'cascade' }),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Job details
    jobId: varchar('job_id', { length: 255 }).notNull().unique(), // BullMQ job ID
    status: executionStatusEnum('status').notNull().default('pending'),

    // Input/Output
    input: jsonb('input').notNull(),
    output: jsonb('output'),

    // Error handling
    error: text('error'),
    retryCount: integer('retry_count').default(0),
    maxRetries: integer('max_retries').default(3),

    // Timing
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    executionTimeMs: integer('execution_time_ms'),

    // Token usage
    tokensUsed: integer('tokens_used'),
    cost: varchar('cost', { length: 20 }), // in USD

    // Metadata
    metadata: jsonb('metadata').$type<{
      triggeredBy?: string;
      integrations?: string[];
      conversationId?: string;
      [key: string]: any;
    }>().default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    jobIdIdx: uniqueIndex('agent_executions_job_id_idx').on(table.jobId),
    agentIdIdx: index('agent_executions_agent_id_idx').on(table.agentId),
    userIdIdx: index('agent_executions_user_id_idx').on(table.userId),
    statusIdx: index('agent_executions_status_idx').on(table.status),
    createdAtIdx: index('agent_executions_created_at_idx').on(table.createdAt),
  })
);

// =====================================================
// HUBSPOT INTEGRATION
// =====================================================

/**
 * HubSpot Webhooks
 * Manages HubSpot webhook subscriptions
 */
export const hubspotWebhooks = pgTable(
  'hubspot_webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    agentId: uuid('agent_id')
      .references(() => customAgents.id, { onDelete: 'cascade' }),

    // HubSpot details
    hubspotPortalId: varchar('hubspot_portal_id', { length: 255 }).notNull(),
    subscriptionId: varchar('subscription_id', { length: 255 }),

    // Webhook config
    eventType: varchar('event_type', { length: 100 }).notNull(), // 'contact.creation', 'deal.propertyChange', etc.
    objectType: varchar('object_type', { length: 100 }).notNull(), // 'contact', 'deal', 'company'
    propertyName: varchar('property_name', { length: 255 }), // Specific property to watch

    // Status
    status: hubspotWebhookStatusEnum('status').notNull().default('active'),
    lastTriggeredAt: timestamp('last_triggered_at'),
    triggerCount: integer('trigger_count').default(0),

    // Error tracking
    lastError: text('last_error'),
    errorCount: integer('error_count').default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('hubspot_webhooks_user_id_idx').on(table.userId),
    agentIdIdx: index('hubspot_webhooks_agent_id_idx').on(table.agentId),
    statusIdx: index('hubspot_webhooks_status_idx').on(table.status),
    portalIdIdx: index('hubspot_webhooks_portal_id_idx').on(table.hubspotPortalId),
  })
);

/**
 * HubSpot Sync Logs
 * Logs all HubSpot API interactions
 */
export const hubspotSyncLogs = pgTable(
  'hubspot_sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    agentId: uuid('agent_id')
      .references(() => customAgents.id, { onDelete: 'cascade' }),

    // Operation details
    operation: varchar('operation', { length: 100 }).notNull(), // 'create_contact', 'update_deal', etc.
    objectType: varchar('object_type', { length: 100 }).notNull(),
    objectId: varchar('object_id', { length: 255 }),

    // Request/Response
    request: jsonb('request'),
    response: jsonb('response'),

    // Result
    success: boolean('success').notNull(),
    statusCode: integer('status_code'),
    errorMessage: text('error_message'),

    // Timing
    executionTimeMs: integer('execution_time_ms'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('hubspot_sync_logs_user_id_idx').on(table.userId),
    agentIdIdx: index('hubspot_sync_logs_agent_id_idx').on(table.agentId),
    createdAtIdx: index('hubspot_sync_logs_created_at_idx').on(table.createdAt),
    successIdx: index('hubspot_sync_logs_success_idx').on(table.success),
  })
);

// =====================================================
// API RATE LIMITING
// =====================================================

/**
 * API Rate Limits
 * Tracks API usage for rate limiting
 */
export const apiRateLimits = pgTable(
  'api_rate_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Rate limit tracking
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    requestCount: integer('request_count').notNull().default(1),

    // Time window
    windowStart: timestamp('window_start').notNull(),
    windowEnd: timestamp('window_end').notNull(),

    // Status
    isBlocked: boolean('is_blocked').default(false),
    blockedUntil: timestamp('blocked_until'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userEndpointIdx: uniqueIndex('api_rate_limits_user_endpoint_idx').on(
      table.userId,
      table.endpoint,
      table.windowStart
    ),
    windowEndIdx: index('api_rate_limits_window_end_idx').on(table.windowEnd),
  })
);

// =====================================================
// TYPE EXPORTS
// =====================================================

export type RevolutionCategory = typeof revolutionCategories.$inferSelect;
export type NewRevolutionCategory = typeof revolutionCategories.$inferInsert;

export type RevolutionUseCase = typeof revolutionUseCases.$inferSelect;
export type NewRevolutionUseCase = typeof revolutionUseCases.$inferInsert;

export type RevolutionIntegration = typeof revolutionIntegrations.$inferSelect;
export type NewRevolutionIntegration = typeof revolutionIntegrations.$inferInsert;

export type AgentUseCase = typeof agentUseCases.$inferSelect;
export type NewAgentUseCase = typeof agentUseCases.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type NewAgentExecution = typeof agentExecutions.$inferInsert;

export type HubSpotWebhook = typeof hubspotWebhooks.$inferSelect;
export type NewHubSpotWebhook = typeof hubspotWebhooks.$inferInsert;

export type HubSpotSyncLog = typeof hubspotSyncLogs.$inferSelect;
export type NewHubSpotSyncLog = typeof hubspotSyncLogs.$inferInsert;

export type ApiRateLimit = typeof apiRateLimits.$inferSelect;
export type NewApiRateLimit = typeof apiRateLimits.$inferInsert;
