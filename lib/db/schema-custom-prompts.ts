/**
 * Custom System Prompts Schema
 * Allows users to customize AI agent behavior with custom system prompts
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * User custom prompts for agents
 * Stores personalized system prompts per user per agent
 */
export const customPrompts = pgTable('custom_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),

  // Prompt details
  name: varchar('name', { length: 100 }).notNull(), // e.g., "Formal Business Tone", "Creative Writer"
  description: text('description'), // Optional description of the prompt's purpose
  promptText: text('prompt_text').notNull(), // The actual system prompt

  // Status
  isActive: boolean('is_active').default(true).notNull(), // Whether this prompt is currently used
  isDefault: boolean('is_default').default(false), // Mark as user's default for this agent

  // Metadata
  metadata: text('metadata'), // JSON string for additional data (tags, version, etc.)

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Prompt templates (predefined prompts users can choose from)
 */
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),

  // Template details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  promptText: text('prompt_text').notNull(),
  category: varchar('category', { length: 50 }), // e.g., "professional", "creative", "technical"

  // Visibility
  isPublic: boolean('is_public').default(true), // Whether all users can see this template
  createdBy: varchar('created_by', { length: 255 }), // User ID of template creator

  // Usage stats
  useCount: integer('use_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type CustomPrompt = typeof customPrompts.$inferSelect;
export type NewCustomPrompt = typeof customPrompts.$inferInsert;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type NewPromptTemplate = typeof promptTemplates.$inferInsert;
