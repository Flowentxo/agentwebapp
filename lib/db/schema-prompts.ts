/**
 * PROMPT REGISTRY SCHEMA
 *
 * Phase 4.1 - Prompt Registry & Lab
 *
 * Database schema for centralized prompt management with:
 * - Prompt Registry: Central catalog of all system prompts
 * - Prompt Versions: Full version history with rollback capability
 * - Active version tracking per prompt
 *
 * This enables:
 * - A/B testing of prompts
 * - Rollback to previous versions
 * - Audit trail of prompt changes
 * - Prompt playground testing
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Prompt categories for organization and filtering
 */
export const promptCategoryEnum = pgEnum('prompt_category', [
  'system',        // Core system prompts (agent personas)
  'agent',         // Agent-specific prompts
  'tool',          // Tool/function call prompts
  'template',      // Reusable template prompts
  'experiment',    // A/B test prompts
  'custom',        // User-created custom prompts
]);

/**
 * Prompt status for lifecycle management
 */
export const promptStatusEnum = pgEnum('prompt_status', [
  'draft',         // Work in progress
  'active',        // Currently in production
  'deprecated',    // Marked for removal
  'archived',      // No longer used but preserved
]);

// ============================================================================
// PROMPT REGISTRY TABLE
// ============================================================================

/**
 * Prompt Registry
 *
 * Central catalog of all prompts in the system.
 * Each prompt has a unique slug for programmatic access.
 */
export const promptRegistry = pgTable('prompt_registry', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Unique identifier for programmatic access
  slug: varchar('slug', { length: 100 }).notNull().unique(),

  // Display information
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Categorization
  category: promptCategoryEnum('category').notNull().default('agent'),

  // Optional association with a specific agent
  agentId: varchar('agent_id', { length: 100 }),

  // Tags for filtering (JSON array stored as text)
  tags: text('tags').$type<string[]>().default('[]'),

  // Lifecycle status
  status: promptStatusEnum('status').notNull().default('draft'),

  // Reference to the currently active version
  activeVersionId: uuid('active_version_id'),

  // Ownership and audit
  createdBy: varchar('created_by', { length: 255 }),
  updatedBy: varchar('updated_by', { length: 255 }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Slug must be unique
  slugIdx: unique('prompt_registry_slug_idx').on(table.slug),

  // Common query patterns
  categoryIdx: index('prompt_registry_category_idx').on(table.category),
  statusIdx: index('prompt_registry_status_idx').on(table.status),
  agentIdIdx: index('prompt_registry_agent_id_idx').on(table.agentId),
  createdAtIdx: index('prompt_registry_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// PROMPT VERSIONS TABLE
// ============================================================================

/**
 * Prompt Versions
 *
 * Stores all versions of a prompt for history and rollback.
 * Each version is immutable once created.
 */
export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to parent prompt
  promptId: uuid('prompt_id').notNull().references(() => promptRegistry.id, {
    onDelete: 'cascade',
  }),

  // Version number (auto-incremented per prompt)
  version: integer('version').notNull(),

  // The actual prompt content
  content: text('content').notNull(),

  // Optional change description
  changeNote: text('change_note'),

  // Flag indicating if this version is active
  isActive: boolean('is_active').notNull().default(false),

  // Performance metrics (populated after testing)
  metrics: text('metrics').$type<{
    avgResponseTime?: number;
    avgTokenUsage?: number;
    successRate?: number;
    testCount?: number;
    lastTested?: string;
  }>().default('{}'),

  // Who created this version
  createdBy: varchar('created_by', { length: 255 }),

  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure version numbers are unique per prompt
  promptVersionIdx: unique('prompt_versions_prompt_version_idx').on(
    table.promptId,
    table.version
  ),

  // Common query patterns
  promptIdIdx: index('prompt_versions_prompt_id_idx').on(table.promptId),
  isActiveIdx: index('prompt_versions_is_active_idx').on(table.isActive),
  createdAtIdx: index('prompt_versions_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// PROMPT TEST RESULTS TABLE
// ============================================================================

/**
 * Prompt Test Results
 *
 * Stores results from playground testing for analysis.
 */
export const promptTestResults = pgTable('prompt_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to the version tested
  promptVersionId: uuid('prompt_version_id').notNull().references(() => promptVersions.id, {
    onDelete: 'cascade',
  }),

  // Test configuration
  model: varchar('model', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  temperature: integer('temperature'), // Stored as percentage (0-100)

  // Input/Output
  testInput: text('test_input').notNull(),
  testOutput: text('test_output'),

  // Performance metrics
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  responseTimeMs: integer('response_time_ms'),
  estimatedCost: text('estimated_cost'), // Stored as string for precision

  // Result status
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),

  // Who ran the test
  testedBy: varchar('tested_by', { length: 255 }),

  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  promptVersionIdIdx: index('prompt_test_results_version_idx').on(table.promptVersionId),
  modelIdx: index('prompt_test_results_model_idx').on(table.model),
  createdAtIdx: index('prompt_test_results_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

/**
 * Define relations between tables for type-safe queries
 */
export const promptRegistryRelations = relations(promptRegistry, ({ many, one }) => ({
  versions: many(promptVersions),
  activeVersion: one(promptVersions, {
    fields: [promptRegistry.activeVersionId],
    references: [promptVersions.id],
  }),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one, many }) => ({
  prompt: one(promptRegistry, {
    fields: [promptVersions.promptId],
    references: [promptRegistry.id],
  }),
  testResults: many(promptTestResults),
}));

export const promptTestResultsRelations = relations(promptTestResults, ({ one }) => ({
  promptVersion: one(promptVersions, {
    fields: [promptTestResults.promptVersionId],
    references: [promptVersions.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PromptRegistry = typeof promptRegistry.$inferSelect;
export type NewPromptRegistry = typeof promptRegistry.$inferInsert;

export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;

export type PromptTestResult = typeof promptTestResults.$inferSelect;
export type NewPromptTestResult = typeof promptTestResults.$inferInsert;

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * Predefined prompt slugs for core system prompts
 */
export const SYSTEM_PROMPT_SLUGS = {
  // Agent personas
  DEXTER_SYSTEM: 'dexter-system-prompt',
  CASSIE_SYSTEM: 'cassie-system-prompt',
  EMMIE_SYSTEM: 'emmie-system-prompt',
  KAI_SYSTEM: 'kai-system-prompt',
  LEX_SYSTEM: 'lex-system-prompt',
  FINN_SYSTEM: 'finn-system-prompt',
  AURA_SYSTEM: 'aura-system-prompt',
  NOVA_SYSTEM: 'nova-system-prompt',
  ARI_SYSTEM: 'ari-system-prompt',
  ECHO_SYSTEM: 'echo-system-prompt',
  VERA_SYSTEM: 'vera-system-prompt',
  OMNI_SYSTEM: 'omni-system-prompt',

  // Tool prompts
  FUNCTION_CALL: 'function-call-template',
  ERROR_HANDLER: 'error-handler-template',

  // General templates
  CONVERSATION_START: 'conversation-start',
  CONTEXT_INJECTION: 'context-injection',
} as const;

export type SystemPromptSlug = typeof SYSTEM_PROMPT_SLUGS[keyof typeof SYSTEM_PROMPT_SLUGS];
