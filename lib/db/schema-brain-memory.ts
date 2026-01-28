/**
 * Brain AI Memory Store Schema
 * PostgreSQL-backed persistent memory storage
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';

/**
 * Brain Memories Table
 * Stores contextual data, embeddings, and shared intelligence between agents
 */
export const brainMemories = pgTable(
  'brain_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 255 }).notNull(),
    memoryType: varchar('memory_type', { length: 100 }).notNull(),
    content: jsonb('content').notNull(),
    context: jsonb('context').notNull().default('{}'),
    embeddings: jsonb('embeddings'), // Stored as JSON array of numbers
    tags: jsonb('tags').notNull().default('[]'), // Array of strings
    importance: integer('importance').notNull().default(5), // 1-10
    importanceScore: integer('importance_score').default(0),
    metadata: jsonb('metadata').default('{}'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Primary indices for fast lookups
    agentIdIdx: index('bm_brain_memories_agent_id_idx').on(table.agentId),
    createdAtIdx: index('bm_brain_memories_created_at_idx').on(table.createdAt),
    importanceIdx: index('bm_brain_memories_importance_idx').on(table.importance),
    expiresAtIdx: index('bm_brain_memories_expires_at_idx').on(table.expiresAt),

    // Composite indices for common queries
    agentCreatedIdx: index('bm_brain_memories_agent_created_idx').on(table.agentId, table.createdAt),
    agentImportanceIdx: index('bm_brain_memories_agent_importance_idx').on(table.agentId, table.importance),
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
    memoryIdIdx: index('bm_memory_tags_memory_id_idx').on(table.memoryId),
    tagIdx: index('bm_memory_tags_tag_idx').on(table.tag),
    memoryTagIdx: index('bm_memory_tags_memory_tag_idx').on(table.memoryId, table.tag),
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
    agentIdIdx: index('bm_memory_stats_agent_id_idx').on(table.agentId),
  })
);

export type BrainMemoryStats = typeof brainMemoryStats.$inferSelect;
export type NewBrainMemoryStats = typeof brainMemoryStats.$inferInsert;
