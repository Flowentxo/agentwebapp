/**
 * Agent Memory Schema (pgvector)
 *
 * Persistent vector-based memory for AI agents.
 * Enables semantic search across agent interactions.
 */

import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Agent memories with vector embeddings for semantic search
 */
export const agentMemories = pgTable('agent_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  // Note: vector type requires pgvector extension
  // embedding column is managed via raw SQL migration
  agentId: varchar('agent_id', { length: 50 }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  tags: text('tags').array(),
  source: varchar('source', { length: 100 }),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  relevanceScore: integer('relevance_score').default(0),
  accessCount: integer('access_count').default(0),
  lastAccessedAt: timestamp('last_accessed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_agent_memories_user').on(table.userId),
  agentIdx: index('idx_agent_memories_agent').on(table.agentId),
  categoryIdx: index('idx_agent_memories_category').on(table.category),
  createdIdx: index('idx_agent_memories_created').on(table.createdAt),
}));

/**
 * Raw SQL for creating the vector column and index
 * Run this via migration after pgvector extension is enabled:
 *
 * CREATE EXTENSION IF NOT EXISTS vector;
 * ALTER TABLE agent_memories ADD COLUMN IF NOT EXISTS embedding vector(1536);
 * CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 */
export const PGVECTOR_MIGRATION_SQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create agent_memories table if not exists
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  agent_id VARCHAR(50),
  user_id VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  source VARCHAR(100),
  metadata JSONB,
  relevance_score INTEGER DEFAULT 0,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_agent_memories_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_category ON agent_memories(category);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON agent_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
`;

// Type for the memory record
export type AgentMemory = typeof agentMemories.$inferSelect;
export type NewAgentMemory = typeof agentMemories.$inferInsert;
