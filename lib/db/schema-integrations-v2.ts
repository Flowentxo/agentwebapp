/**
 * PHASE 3: Database Schema - Integration Tables
 * Drizzle ORM Schema für externe Integrationen und Unified Customer Data
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================
// INTEGRATION CONNECTIONS
// OAuth connections to external services
// ============================================

export const integrationConnections = pgTable(
  'integration_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    scopes: jsonb('scopes').default([]),
    instanceUrl: varchar('instance_url', { length: 500 }), // For Salesforce etc.
    accountId: varchar('account_id', { length: 255 }), // External account identifier
    accountName: varchar('account_name', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    lastSyncAt: timestamp('last_sync_at'),
    lastSyncStatus: varchar('last_sync_status', { length: 20 }),
    syncError: text('sync_error'),
    webhookSecret: varchar('webhook_secret', { length: 255 }),
    webhookUrl: varchar('webhook_url', { length: 500 }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    connectionUnique: uniqueIndex('idx_integration_conn_unique').on(
      table.workspaceId,
      table.provider
    ),
    providerIdx: index('idx_integration_conn_provider').on(table.provider),
    statusIdx: index('idx_integration_conn_status').on(table.status),
  })
);

// ============================================
// INTEGRATION SYNC LOGS
// History of data synchronization
// ============================================

export const integrationSyncLogs = pgTable(
  'integration_sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: uuid('connection_id').notNull(),
    syncType: varchar('sync_type', { length: 50 }).notNull(), // full, incremental, webhook, manual
    entityType: varchar('entity_type', { length: 50 }), // contacts, deals, tickets
    status: varchar('status', { length: 20 }).notNull(),
    recordsProcessed: integer('records_processed').default(0),
    recordsCreated: integer('records_created').default(0),
    recordsUpdated: integer('records_updated').default(0),
    recordsFailed: integer('records_failed').default(0),
    errorDetails: jsonb('error_details'),
    syncCursor: varchar('sync_cursor', { length: 255 }), // For incremental sync
    duration: integer('duration'), // ms
    startedAt: timestamp('started_at').defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    connectionIdx: index('idx_sync_logs_connection').on(table.connectionId),
    startedAtIdx: index('idx_sync_logs_started').on(table.startedAt),
    statusIdx: index('idx_sync_logs_status').on(table.status),
  })
);

// ============================================
// UNIFIED CUSTOMERS
// Aggregated customer data from all sources
// ============================================

export const unifiedCustomers = pgTable(
  'unified_customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Primary Contact Info
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    fullName: varchar('full_name', { length: 255 }),
    company: varchar('company', { length: 255 }),
    title: varchar('title', { length: 255 }),
    avatar: varchar('avatar', { length: 500 }),

    // External IDs
    salesforceId: varchar('salesforce_id', { length: 100 }),
    hubspotId: varchar('hubspot_id', { length: 100 }),
    zendeskId: varchar('zendesk_id', { length: 100 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
    intercomId: varchar('intercom_id', { length: 100 }),

    // Engagement Metrics
    totalInteractions: integer('total_interactions').default(0),
    lastContactDate: timestamp('last_contact_date'),
    preferredChannel: varchar('preferred_channel', { length: 20 }),
    csatScore: numeric('csat_score', { precision: 3, scale: 2 }),
    npsScore: integer('nps_score'),
    responseRate: numeric('response_rate', { precision: 5, scale: 2 }),

    // Financial Metrics
    lifetimeValue: numeric('lifetime_value', { precision: 12, scale: 2 }).default('0'),
    monthlyRecurringRevenue: numeric('mrr', { precision: 10, scale: 2 }).default('0'),
    totalSpent: numeric('total_spent', { precision: 12, scale: 2 }).default('0'),
    paymentStatus: varchar('payment_status', { length: 20 }).default('current'),
    churnRiskScore: integer('churn_risk_score').default(0), // 0-100
    contractValue: numeric('contract_value', { precision: 12, scale: 2 }),
    renewalDate: timestamp('renewal_date'),

    // Usage Metrics
    lastLoginAt: timestamp('last_login_at'),
    loginFrequency: integer('login_frequency'), // per month
    activeFeatures: jsonb('active_features').default([]),
    utilizationScore: integer('utilization_score'), // 0-100
    adoptionStage: varchar('adoption_stage', { length: 20 }),

    // Segmentation
    lifecycleStage: varchar('lifecycle_stage', { length: 50 }),
    leadStatus: varchar('lead_status', { length: 50 }),
    segment: varchar('segment', { length: 100 }),
    tier: varchar('tier', { length: 20 }), // free, starter, pro, enterprise
    ownerId: uuid('owner_id'),

    // Metadata
    tags: jsonb('tags').default([]),
    customFields: jsonb('custom_fields').default({}),
    source: varchar('source', { length: 100 }), // Primary data source
    mergedFrom: jsonb('merged_from').default([]), // IDs of merged records

    // Timestamps
    firstSeenAt: timestamp('first_seen_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    customerUnique: uniqueIndex('idx_unified_cust_unique').on(table.workspaceId, table.email),
    salesforceIdx: index('idx_unified_cust_salesforce').on(table.salesforceId),
    hubspotIdx: index('idx_unified_cust_hubspot').on(table.hubspotId),
    zendeskIdx: index('idx_unified_cust_zendesk').on(table.zendeskId),
    stripeIdx: index('idx_unified_cust_stripe').on(table.stripeCustomerId),
    churnRiskIdx: index('idx_unified_cust_churn').on(table.churnRiskScore),
    ltvIdx: index('idx_unified_cust_ltv').on(table.lifetimeValue),
    segmentIdx: index('idx_unified_cust_segment').on(table.segment),
    ownerIdx: index('idx_unified_cust_owner').on(table.ownerId),
  })
);

// ============================================
// UNIFIED DEALS
// Aggregated deal/opportunity data
// ============================================

export const unifiedDeals = pgTable(
  'unified_deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    customerId: uuid('customer_id'),

    // Deal Info
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    stage: varchar('stage', { length: 100 }).notNull(),
    probability: integer('probability'), // 0-100
    closeDate: timestamp('close_date'),
    actualCloseDate: timestamp('actual_close_date'),
    isWon: boolean('is_won'),
    lostReason: varchar('lost_reason', { length: 255 }),

    // External IDs
    salesforceId: varchar('salesforce_id', { length: 100 }),
    hubspotId: varchar('hubspot_id', { length: 100 }),

    // Pipeline Info
    pipeline: varchar('pipeline', { length: 100 }),
    stageOrder: integer('stage_order'),
    daysInStage: integer('days_in_stage'),
    stageChangedAt: timestamp('stage_changed_at'),

    // Assignment
    ownerId: uuid('owner_id'),
    teamId: uuid('team_id'),

    // Metadata
    source: varchar('source', { length: 100 }),
    tags: jsonb('tags').default([]),
    customFields: jsonb('custom_fields').default({}),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('idx_unified_deals_workspace').on(table.workspaceId),
    customerIdx: index('idx_unified_deals_customer').on(table.customerId),
    stageIdx: index('idx_unified_deals_stage').on(table.stage),
    closeDateIdx: index('idx_unified_deals_close').on(table.closeDate),
    ownerIdx: index('idx_unified_deals_owner').on(table.ownerId),
    amountIdx: index('idx_unified_deals_amount').on(table.amount),
  })
);

// ============================================
// UNIFIED TICKETS
// Aggregated support ticket data
// ============================================

export const unifiedTickets = pgTable(
  'unified_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    customerId: uuid('customer_id'),

    // Ticket Info
    subject: varchar('subject', { length: 500 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).notNull(),
    priority: varchar('priority', { length: 20 }).notNull(), // low, medium, high, urgent
    type: varchar('type', { length: 50 }), // question, problem, incident, task
    category: varchar('category', { length: 100 }),

    // External IDs
    zendeskId: varchar('zendesk_id', { length: 100 }),
    hubspotId: varchar('hubspot_id', { length: 100 }),
    freshdeskId: varchar('freshdesk_id', { length: 100 }),
    intercomId: varchar('intercom_id', { length: 100 }),

    // Assignment
    assigneeId: uuid('assignee_id'),
    teamId: uuid('team_id'),
    escalatedTo: uuid('escalated_to'),

    // SLA
    slaBreached: boolean('sla_breached').default(false),
    firstResponseDue: timestamp('first_response_due'),
    resolutionDue: timestamp('resolution_due'),
    firstResponseAt: timestamp('first_response_at'),
    resolvedAt: timestamp('resolved_at'),

    // Metrics
    responseTimeMinutes: integer('response_time_minutes'),
    resolutionTimeMinutes: integer('resolution_time_minutes'),
    reopenCount: integer('reopen_count').default(0),
    replyCount: integer('reply_count').default(0),

    // Analysis
    sentiment: varchar('sentiment', { length: 20 }), // positive, neutral, negative
    sentimentScore: numeric('sentiment_score', { precision: 4, scale: 3 }), // -1 to 1
    intent: varchar('intent', { length: 100 }),
    intentConfidence: numeric('intent_confidence', { precision: 4, scale: 3 }),
    aiSummary: text('ai_summary'),
    aiSuggestedResponse: text('ai_suggested_response'),

    // Metadata
    channel: varchar('channel', { length: 50 }), // email, chat, phone, social
    source: varchar('source', { length: 100 }),
    tags: jsonb('tags').default([]),
    customFields: jsonb('custom_fields').default({}),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('idx_unified_tickets_workspace').on(table.workspaceId),
    customerIdx: index('idx_unified_tickets_customer').on(table.customerId),
    statusIdx: index('idx_unified_tickets_status').on(table.status),
    priorityIdx: index('idx_unified_tickets_priority').on(table.priority),
    assigneeIdx: index('idx_unified_tickets_assignee').on(table.assigneeId),
    createdAtIdx: index('idx_unified_tickets_created').on(table.createdAt),
    slaIdx: index('idx_unified_tickets_sla').on(table.slaBreached),
  })
);

// ============================================
// CUSTOMER INTERACTIONS
// All touchpoints with customers
// ============================================

export const customerInteractions = pgTable(
  'customer_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    customerId: uuid('customer_id').notNull(),

    // Interaction Info
    type: varchar('type', { length: 50 }).notNull(), // email, call, meeting, chat, note
    direction: varchar('direction', { length: 10 }), // inbound, outbound
    subject: varchar('subject', { length: 500 }),
    content: text('content'),
    summary: text('summary'),

    // Related Entities
    ticketId: uuid('ticket_id'),
    dealId: uuid('deal_id'),

    // Attribution
    userId: uuid('user_id'),
    agentId: varchar('agent_id', { length: 50 }), // If AI agent involved

    // Metrics
    duration: integer('duration'), // seconds for calls
    sentiment: varchar('sentiment', { length: 20 }),
    sentimentScore: numeric('sentiment_score', { precision: 4, scale: 3 }),

    // Metadata
    channel: varchar('channel', { length: 50 }),
    externalId: varchar('external_id', { length: 255 }),
    metadata: jsonb('metadata').default({}),

    occurredAt: timestamp('occurred_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    customerIdx: index('idx_interactions_customer').on(table.customerId),
    typeIdx: index('idx_interactions_type').on(table.type),
    occurredAtIdx: index('idx_interactions_occurred').on(table.occurredAt),
    ticketIdx: index('idx_interactions_ticket').on(table.ticketId),
    dealIdx: index('idx_interactions_deal').on(table.dealId),
  })
);

// ============================================
// INTEGRATION WEBHOOKS
// Incoming webhook configurations
// ============================================

export const integrationWebhooks = pgTable(
  'integration_webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: uuid('connection_id').notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    endpointPath: varchar('endpoint_path', { length: 255 }).notNull(),
    secret: varchar('secret', { length: 255 }),
    isActive: boolean('is_active').default(true),
    lastReceivedAt: timestamp('last_received_at'),
    totalReceived: integer('total_received').default(0),
    totalProcessed: integer('total_processed').default(0),
    totalFailed: integer('total_failed').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    connectionIdx: index('idx_webhooks_connection').on(table.connectionId),
    providerEventIdx: index('idx_webhooks_provider_event').on(table.provider, table.eventType),
    activeIdx: index('idx_webhooks_active').on(table.isActive),
  })
);

// ============================================
// INTEGRATION FIELD MAPPINGS
// Custom field mappings between systems
// ============================================

export const integrationFieldMappings = pgTable(
  'integration_field_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: uuid('connection_id').notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // contact, deal, ticket
    sourceField: varchar('source_field', { length: 255 }).notNull(),
    targetField: varchar('target_field', { length: 255 }).notNull(),
    transformationType: varchar('transformation_type', { length: 50 }), // direct, map, formula
    transformationConfig: jsonb('transformation_config'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    connectionEntityIdx: index('idx_field_mappings_conn_entity').on(
      table.connectionId,
      table.entityType
    ),
  })
);

// Type exports
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection = typeof integrationConnections.$inferInsert;

export type IntegrationSyncLog = typeof integrationSyncLogs.$inferSelect;
export type NewIntegrationSyncLog = typeof integrationSyncLogs.$inferInsert;

export type UnifiedCustomer = typeof unifiedCustomers.$inferSelect;
export type NewUnifiedCustomer = typeof unifiedCustomers.$inferInsert;

export type UnifiedDeal = typeof unifiedDeals.$inferSelect;
export type NewUnifiedDeal = typeof unifiedDeals.$inferInsert;

export type UnifiedTicket = typeof unifiedTickets.$inferSelect;
export type NewUnifiedTicket = typeof unifiedTickets.$inferInsert;

export type CustomerInteraction = typeof customerInteractions.$inferSelect;
export type NewCustomerInteraction = typeof customerInteractions.$inferInsert;

export type IntegrationWebhook = typeof integrationWebhooks.$inferSelect;
export type NewIntegrationWebhook = typeof integrationWebhooks.$inferInsert;

export type IntegrationFieldMapping = typeof integrationFieldMappings.$inferSelect;
export type NewIntegrationFieldMapping = typeof integrationFieldMappings.$inferInsert;
