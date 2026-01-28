import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Business Ideas - AI-generated proactive business ideas based on user context
 */
export const brainBusinessIdeas = pgTable('brain_business_ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'revenue', 'efficiency', 'growth', 'innovation', 'risk'
  impact: varchar('impact', { length: 50 }).notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  effort: varchar('effort', { length: 50 }).notNull().default('medium'), // 'low', 'medium', 'high'
  timeframe: varchar('timeframe', { length: 50 }).notNull().default('medium'), // 'short', 'medium', 'long'
  contextSource: jsonb('context_source'), // Related memories/activities that triggered this idea
  steps: jsonb('steps'), // Array of implementation steps
  resources: jsonb('resources'), // Required resources (people, tools, budget)
  risks: jsonb('risks'), // Potential risks and mitigation strategies
  metrics: jsonb('metrics'), // Success metrics to track
  status: varchar('status', { length: 50 }).notNull().default('new'), // 'new', 'reviewed', 'planning', 'in_progress', 'completed', 'rejected'
  userFeedback: text('user_feedback'),
  rating: integer('rating'), // User rating: 1-5 stars
  implementedAt: timestamp('implemented_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_brain_ideas_user_id').on(table.userId),
  categoryIdx: index('idx_brain_ideas_category').on(table.category),
  statusIdx: index('idx_brain_ideas_status').on(table.status),
  createdAtIdx: index('idx_brain_ideas_created_at').on(table.createdAt),
  impactIdx: index('idx_brain_ideas_impact').on(table.impact),
}));

/**
 * Ideas Analytics - Track idea generation and implementation patterns
 */
export const brainIdeasAnalytics = pgTable('brain_ideas_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  totalIdeasGenerated: integer('total_ideas_generated').notNull().default(0),
  totalIdeasImplemented: integer('total_ideas_implemented').notNull().default(0),
  averageRating: integer('average_rating').notNull().default(0),
  averageImpact: varchar('average_impact', { length: 50 }).notNull().default('medium'),
  favoriteCategories: jsonb('favorite_categories').default('[]'),
  lastIdeaAt: timestamp('last_idea_at'),
  lastImplementationAt: timestamp('last_implementation_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
