/**
 * Agent Memory Migration Script
 *
 * Creates the agent_memories table with pgvector support.
 * Run: npx tsx scripts/migrate-agent-memory.ts
 */

import { Pool } from 'pg';
import { PGVECTOR_MIGRATION_SQL } from '../lib/db/schema-agent-memory';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;

  const pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'sintra_knowledge',
      });

  try {
    console.log('[MIGRATE] Starting agent_memories migration...');

    // Run the full migration SQL (includes CREATE EXTENSION, CREATE TABLE, indexes)
    await pool.query(PGVECTOR_MIGRATION_SQL);

    // Verify the table was created
    const result = await pool.query(
      `SELECT count(*) as cnt FROM information_schema.tables WHERE table_name = 'agent_memories'`
    );
    const exists = parseInt(result.rows[0]?.cnt) > 0;

    if (exists) {
      console.log('[MIGRATE] agent_memories table created successfully');

      // Verify vector column
      const colResult = await pool.query(
        `SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'agent_memories' AND column_name = 'embedding'`
      );
      if (colResult.rows.length > 0) {
        console.log('[MIGRATE] embedding vector(1536) column verified');
      } else {
        console.warn('[MIGRATE] WARNING: embedding column not found — pgvector may not be installed');
      }

      // Count existing rows
      const countResult = await pool.query('SELECT count(*) as cnt FROM agent_memories');
      console.log(`[MIGRATE] Current row count: ${countResult.rows[0]?.cnt}`);
    } else {
      console.error('[MIGRATE] ERROR: Table was not created');
      process.exit(1);
    }

    console.log('[MIGRATE] Migration complete!');
  } catch (error: any) {
    if (error.message?.includes('could not open extension control file') ||
        error.message?.includes('extension "vector" is not available')) {
      console.error('[MIGRATE] ERROR: pgvector extension is not installed on this PostgreSQL instance.');
      console.error('[MIGRATE] Install pgvector: https://github.com/pgvector/pgvector#installation');
      console.error('[MIGRATE] Creating table WITHOUT vector column as fallback...');

      // Fallback: create table without vector column
      await pool.query(`
        CREATE TABLE IF NOT EXISTS agent_memories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
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
        CREATE INDEX IF NOT EXISTS idx_agent_memories_user ON agent_memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories(agent_id);
        CREATE INDEX IF NOT EXISTS idx_agent_memories_category ON agent_memories(category);
        CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON agent_memories(created_at DESC);
      `);
      console.log('[MIGRATE] Fallback table created (no vector column — text search only)');
    } else {
      console.error('[MIGRATE] Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

migrate();
