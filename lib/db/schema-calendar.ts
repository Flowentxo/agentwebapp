import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Calendar Integrations - OAuth tokens and settings
 */
export const calendarIntegrations = pgTable('calendar_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'outlook', 'apple'
  email: varchar('email', { length: 255 }).notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiry: timestamp('token_expiry').notNull(),
  calendarIds: jsonb('calendar_ids').default('[]'), // Array of calendar IDs to sync
  settings: jsonb('settings').default('{}'),
  enabled: boolean('enabled').notNull().default(true),
  lastSync: timestamp('last_sync'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_calendar_user_id').on(table.userId),
  providerIdx: index('idx_calendar_provider').on(table.provider),
}));

/**
 * Calendar Events - Synced events from external calendars
 */
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  integrationId: uuid('integration_id').notNull().references(() => calendarIntegrations.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id', { length: 255 }).notNull(), // Google Event ID
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  attendees: jsonb('attendees').default('[]'), // Array of {email, name, responseStatus}
  organizer: jsonb('organizer'), // {email, name}
  meetingLink: text('meeting_link'),
  conferenceData: jsonb('conference_data'),
  status: varchar('status', { length: 50 }).notNull().default('confirmed'), // confirmed, cancelled, tentative
  rawData: jsonb('raw_data'), // Full event data from provider
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_calendar_events_user_id').on(table.userId),
  startTimeIdx: index('idx_calendar_events_start_time').on(table.startTime),
  externalIdIdx: index('idx_calendar_events_external_id').on(table.externalId),
  userStartIdx: index('idx_calendar_events_user_start').on(table.userId, table.startTime),
}));

/**
 * Context Predictions - AI-generated context predictions for upcoming events
 */
export const contextPredictions = pgTable('context_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  eventId: uuid('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  predictedContext: jsonb('predicted_context').notNull(), // Array of BrainContext
  confidence: varchar('confidence', { length: 50 }).notNull(), // low, medium, high, critical
  reasoning: text('reasoning'), // Why this context was predicted
  sources: jsonb('sources').default('[]'), // Array of memory IDs that contributed
  briefingGenerated: boolean('briefing_generated').notNull().default(false),
  briefingData: jsonb('briefing_data'), // Generated briefing content
  userViewed: boolean('user_viewed').notNull().default(false),
  userFeedback: varchar('user_feedback', { length: 50 }), // helpful, not_helpful, very_helpful
  predictedAt: timestamp('predicted_at').defaultNow().notNull(),
  viewedAt: timestamp('viewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_predictions_user_id').on(table.userId),
  eventIdIdx: index('idx_predictions_event_id').on(table.eventId),
  predictedAtIdx: index('idx_predictions_predicted_at').on(table.predictedAt),
}));

/**
 * Meeting Briefings - Prepared briefings for meetings
 */
export const meetingBriefings = pgTable('meeting_briefings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  eventId: uuid('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  predictionId: uuid('prediction_id').references(() => contextPredictions.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  summary: text('summary'),
  keyPoints: jsonb('key_points').default('[]'), // Array of important points
  lastInteractions: jsonb('last_interactions').default('[]'), // Recent relevant interactions
  painPoints: jsonb('pain_points').default('[]'), // Identified pain points
  suggestedTalkingPoints: jsonb('suggested_talking_points').default('[]'),
  competitorIntel: jsonb('competitor_intel'),
  pricingInfo: jsonb('pricing_info'),
  actionItems: jsonb('action_items').default('[]'),
  relevantDocuments: jsonb('relevant_documents').default('[]'), // Document IDs
  relevantIdeas: jsonb('relevant_ideas').default('[]'), // Business idea IDs
  confidence: varchar('confidence', { length: 50 }).notNull().default('medium'),
  generatedBy: varchar('generated_by', { length: 50 }).notNull().default('ai'), // ai, manual
  status: varchar('status', { length: 50 }).notNull().default('ready'), // draft, ready, viewed, archived
  viewedAt: timestamp('viewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_briefings_user_id').on(table.userId),
  eventIdIdx: index('idx_briefings_event_id').on(table.eventId),
  statusIdx: index('idx_briefings_status').on(table.status),
}));
