import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SQL_STATEMENTS = `
-- Create brain_memories table
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

-- Create brain_memory_stats table
CREATE TABLE IF NOT EXISTS "brain_memory_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" varchar(255) NOT NULL,
  "total_memories" integer DEFAULT 0 NOT NULL,
  "avg_importance" integer DEFAULT 5 NOT NULL,
  "last_memory_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "brain_memory_stats_agent_id_unique" UNIQUE("agent_id")
);

-- Create brain_memory_tags table
CREATE TABLE IF NOT EXISTS "brain_memory_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "memory_id" uuid NOT NULL,
  "tag" varchar(100) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'brain_memory_tags_memory_id_brain_memories_id_fk'
  ) THEN
    ALTER TABLE "brain_memory_tags"
    ADD CONSTRAINT "brain_memory_tags_memory_id_brain_memories_id_fk"
    FOREIGN KEY ("memory_id") REFERENCES "public"."brain_memories"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_id" ON "brain_memories" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_brain_memories_created_at" ON "brain_memories" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_brain_memories_importance" ON "brain_memories" USING btree ("importance");
CREATE INDEX IF NOT EXISTS "idx_brain_memories_expires_at" ON "brain_memories" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_created" ON "brain_memories" USING btree ("agent_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_importance" ON "brain_memories" USING btree ("agent_id","importance");
CREATE INDEX IF NOT EXISTS "idx_brain_memory_stats_agent_id" ON "brain_memory_stats" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_id" ON "brain_memory_tags" USING btree ("memory_id");
CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_tag" ON "brain_memory_tags" USING btree ("tag");
CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_tag" ON "brain_memory_tags" USING btree ("memory_id","tag");
`;

async function main() {
  try {
    console.log('🔄 Creating brain_memories tables...');

    await pool.query(SQL_STATEMENTS);

    console.log('✅ Brain memory tables created successfully!');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'brain_memory%'
      ORDER BY table_name;
    `);

    console.log('\n📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

main();
