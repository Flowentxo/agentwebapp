import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Parse DATABASE_URL from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const databaseUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

if (!databaseUrlMatch) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const DATABASE_URL = databaseUrlMatch[1].trim();
console.log('🔗 Using DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

async function fixDatabaseSchema() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n🔄 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if brain_memories table exists
    console.log('\n📋 Checking brain_memories table...');
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memories'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️  Table brain_memories does not exist. Creating...');

      await client.query(`
        CREATE TABLE IF NOT EXISTS "brain_memories" (
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
          ADD COLUMN IF NOT EXISTS "context" jsonb NOT NULL DEFAULT '{}'::jsonb;
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
        CREATE TABLE IF NOT EXISTS "brain_memory_tags" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "memory_id" uuid NOT NULL,
          "tag" varchar(100) NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      await client.query(`
        ALTER TABLE "brain_memory_tags"
        ADD CONSTRAINT "brain_memory_tags_memory_id_fkey"
        FOREIGN KEY ("memory_id")
        REFERENCES "brain_memories"("id")
        ON DELETE CASCADE;
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
        CREATE TABLE IF NOT EXISTS "brain_memory_stats" (
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
    console.log('\n📊 Creating indices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_id" ON "brain_memories"("agent_id");
      CREATE INDEX IF NOT EXISTS "idx_brain_memories_created_at" ON "brain_memories"("created_at");
      CREATE INDEX IF NOT EXISTS "idx_brain_memories_importance" ON "brain_memories"("importance");
      CREATE INDEX IF NOT EXISTS "idx_brain_memories_expires_at" ON "brain_memories"("expires_at");
      CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_created" ON "brain_memories"("agent_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_importance" ON "brain_memories"("agent_id", "importance");

      CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_id" ON "brain_memory_tags"("memory_id");
      CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_tag" ON "brain_memory_tags"("tag");
      CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_tag" ON "brain_memory_tags"("memory_id", "tag");

      CREATE INDEX IF NOT EXISTS "idx_brain_memory_stats_agent_id" ON "brain_memory_stats"("agent_id");
    `);
    console.log('✅ Indices created');

    client.release();
    console.log('\n✅ Database schema fixed successfully!');

  } catch (error) {
    console.error('\n❌ Error fixing database schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDatabaseSchema()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
