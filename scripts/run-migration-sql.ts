/**
 * Direct SQL Migration Runner
 * Extracts only the collaboration-related SQL from the migration
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const COLLABORATION_SQL = `
-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE collaboration_status AS ENUM('planning', 'executing', 'completed', 'paused', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM('thought', 'action', 'question', 'insight', 'handoff', 'user_input');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create collaboration tables
CREATE TABLE IF NOT EXISTS collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar(255) NOT NULL,
  task_description text NOT NULL,
  status collaboration_status DEFAULT 'planning' NOT NULL,
  semantic_analysis jsonb,
  complexity_score integer,
  estimated_duration integer,
  summary text,
  success_score integer,
  created_at timestamp DEFAULT now() NOT NULL,
  started_at timestamp,
  completed_at timestamp,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS collaboration_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  collaboration_id uuid NOT NULL,
  agent_id varchar(50) NOT NULL,
  selection_reason text,
  relevance_score integer,
  messages_count integer DEFAULT 0 NOT NULL,
  avg_confidence integer,
  contribution_score integer,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT collaboration_agents_collaboration_id_fk
    FOREIGN KEY (collaboration_id)
    REFERENCES collaborations(id)
    ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS collaboration_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  collaboration_id uuid NOT NULL,
  agent_id varchar(50) NOT NULL,
  agent_name varchar(100) NOT NULL,
  content text NOT NULL,
  type message_type DEFAULT 'thought' NOT NULL,
  llm_model varchar(100),
  tokens_used integer,
  latency_ms integer,
  confidence integer,
  parent_message_id uuid,
  target_agent_id varchar(50),
  metadata jsonb,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT collaboration_messages_collaboration_id_fk
    FOREIGN KEY (collaboration_id)
    REFERENCES collaborations(id)
    ON DELETE cascade,
  CONSTRAINT collaboration_messages_parent_id_fk
    FOREIGN KEY (parent_message_id)
    REFERENCES collaboration_messages(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON collaborations(status);
CREATE INDEX IF NOT EXISTS idx_collaborations_created_at ON collaborations(created_at);
CREATE INDEX IF NOT EXISTS idx_collaborations_user_status ON collaborations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_collab_agents_collaboration ON collaboration_agents(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collab_agents_agent ON collaboration_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_collab_agents_collab_agent ON collaboration_agents(collaboration_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_collab_messages_collaboration ON collaboration_messages(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collab_messages_agent ON collaboration_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_collab_messages_created ON collaboration_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_collab_messages_collab_created ON collaboration_messages(collaboration_id, created_at);
`;

async function runMigration() {
  console.log('🚀 Starting direct SQL migration...');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env.local');
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('🔄 Executing SQL...');
    await client.query(COLLABORATION_SQL);

    console.log('✅ Tables created successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'collaboration%'
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('✅ Connection closed');
  }
}

runMigration()
  .then(() => {
    console.log('');
    console.log('🎉 Migration complete!');
    console.log('🌐 Test at: http://localhost:3000/agents/collaborate');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
