/**
 * Fix Database Schema using Backend's DB Connection
 * This script uses the same connection that the running backend uses
 */

// Load .env.local manually
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse .env.local
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].trim();
  }
});

// Now import db connection (after env vars are set)
import { getPool } from '../lib/db/connection';

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema using backend connection...\n');

  try {
    const pool = getPool();
    const client = await pool.connect();

    console.log('✅ Connected to PostgreSQL');
    console.log(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[1] || 'unknown'}\n`);

    // Check if brain_memories table exists
    console.log('📋 Checking brain_memories table...');
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memories'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️  Table brain_memories does not exist. Creating...');

      await client.query(`
        CREATE TABLE "brain_memories" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "agent_id" varchar(255) NOT NULL,
          "context" jsonb NOT NULL,
          "embeddings" jsonb,
          "tags" jsonb DEFAULT '[]' NOT NULL,
          "importance" integer DEFAULT 5 NOT NULL,
          "expires_at" timestamp,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      console.log('✅ Table brain_memories created');
    } else {
      // Check if context column exists
      console.log('✅ Table brain_memories exists. Checking columns...');

      const columnCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'brain_memories'
        AND column_name = 'context'
      `);

      if (columnCheck.rows.length === 0) {
        console.log('⚠️  Column "context" missing. Adding...');
        await client.query(`
          ALTER TABLE "brain_memories"
          ADD COLUMN "context" jsonb NOT NULL DEFAULT '{}'::jsonb;
        `);
        console.log('✅ Column "context" added');
      } else {
        console.log('✅ Column "context" exists');
      }
    }

    // Check if brain_memory_tags table exists
    console.log('\n📋 Checking brain_memory_tags table...');
    const tagsTableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memory_tags'
    `);

    if (tagsTableCheck.rows.length === 0) {
      console.log('⚠️  Table brain_memory_tags does not exist. Creating...');

      await client.query(`
        CREATE TABLE "brain_memory_tags" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "memory_id" uuid NOT NULL,
          "tag" varchar(100) NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "brain_memory_tags_memory_id_fkey"
          FOREIGN KEY ("memory_id")
          REFERENCES "brain_memories"("id")
          ON DELETE CASCADE
        );
      `);

      console.log('✅ Table brain_memory_tags created');
    } else {
      console.log('✅ Table brain_memory_tags exists');
    }

    // Check if brain_memory_stats table exists
    console.log('\n📋 Checking brain_memory_stats table...');
    const statsTableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memory_stats'
    `);

    if (statsTableCheck.rows.length === 0) {
      console.log('⚠️  Table brain_memory_stats does not exist. Creating...');

      await client.query(`
        CREATE TABLE "brain_memory_stats" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "agent_id" varchar(255) NOT NULL UNIQUE,
          "total_memories" integer DEFAULT 0 NOT NULL,
          "avg_importance" integer DEFAULT 5 NOT NULL,
          "last_memory_at" timestamp,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      console.log('✅ Table brain_memory_stats created');
    } else {
      console.log('✅ Table brain_memory_stats exists');
    }

    // Create indices
    console.log('\n📊 Creating/checking indices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_id" ON "brain_memories"("agent_id")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_created_at" ON "brain_memories"("created_at")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_importance" ON "brain_memories"("importance")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_expires_at" ON "brain_memories"("expires_at")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_created" ON "brain_memories"("agent_id", "created_at")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_importance" ON "brain_memories"("agent_id", "importance")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_id" ON "brain_memory_tags"("memory_id")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_tag" ON "brain_memory_tags"("tag")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_tag" ON "brain_memory_tags"("memory_id", "tag")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_stats_agent_id" ON "brain_memory_stats"("agent_id")',
    ];

    for (const indexQuery of indices) {
      await client.query(indexQuery);
    }
    console.log('✅ All indices created/verified');

    client.release();
    console.log('\n🎉 Database schema fixed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Test the application');

  } catch (error) {
    console.error('\n❌ Error fixing database schema:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

fixDatabaseSchema().catch((error) => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
