import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/connection';

/**
 * POST /api/platform/setup
 * Create platform tables (external_agents, workspaces, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Creating platform tables...');

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Create agent_status enum
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'maintenance', 'error');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create external_agents table
      await client.query(`
        CREATE TABLE IF NOT EXISTS external_agents (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          endpoint TEXT NOT NULL,
          api_key_hash VARCHAR(64) NOT NULL,
          capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
          status agent_status NOT NULL DEFAULT 'inactive',
          version VARCHAR(50),
          icon_url TEXT,
          created_by VARCHAR(36) NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_health_check TIMESTAMP,
          config JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `);

      // Create indexes for external_agents
      await client.query(`
        CREATE INDEX IF NOT EXISTS external_agents_status_idx ON external_agents(status)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS external_agents_created_by_idx ON external_agents(created_by)
      `);

      // Create workspaces table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          slug VARCHAR(255) NOT NULL,
          icon_url TEXT,
          is_default BOOLEAN NOT NULL DEFAULT false,
          settings JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Add is_default column if it doesn't exist (for existing tables)
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);

      // Create indexes for workspaces
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspaces_user_id_idx ON workspaces(user_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces(user_id, slug)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspaces_is_default_idx ON workspaces(user_id, is_default)
      `);

      // Create workspace_agents table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workspace_agents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          agent_id VARCHAR(50) NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT true,
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Create indexes for workspace_agents
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspace_agents_workspace_id_idx ON workspace_agents(workspace_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspace_agents_agent_id_idx ON workspace_agents(agent_id)
      `);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS workspace_agents_unique ON workspace_agents(workspace_id, agent_id)
      `);

      // Create workspace_knowledge table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workspace_knowledge (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          source_type VARCHAR(50) NOT NULL,
          source_url TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Create indexes for workspace_knowledge
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspace_knowledge_workspace_id_idx ON workspace_knowledge(workspace_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS workspace_knowledge_source_type_idx ON workspace_knowledge(source_type)
      `);

      // =====================================================
      // WORKSPACE SCOPING MIGRATION
      // =====================================================
      console.log('🔄 Adding workspace_id to agent tables...');

      // Ensure all users have a default workspace
      await client.query(`
        INSERT INTO workspaces (user_id, name, description, slug, is_default, settings)
        SELECT DISTINCT
          u.id,
          'Personal Workspace',
          'Your default workspace',
          'personal-' || LOWER(SUBSTRING(u.id FROM 1 FOR 8)),
          true,
          '{}'::jsonb
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.user_id = u.id AND w.is_default = true
        )
      `);

      // Add workspace_id to agent_messages
      await client.query(`
        DO $$ BEGIN
          -- Add column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'agent_messages' AND column_name = 'workspace_id'
          ) THEN
            -- Add as nullable first
            ALTER TABLE agent_messages ADD COLUMN workspace_id UUID;

            -- Backfill with default workspace for each user
            UPDATE agent_messages am
            SET workspace_id = (
              SELECT id FROM workspaces w
              WHERE w.user_id = am.user_id
              AND w.is_default = true
              LIMIT 1
            )
            WHERE workspace_id IS NULL;

            -- Make column NOT NULL after backfill
            ALTER TABLE agent_messages ALTER COLUMN workspace_id SET NOT NULL;

            -- Add foreign key constraint
            ALTER TABLE agent_messages
            ADD CONSTRAINT agent_messages_workspace_id_fkey
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      // Add workspace_id to agent_conversations
      await client.query(`
        DO $$ BEGIN
          -- Add column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'agent_conversations' AND column_name = 'workspace_id'
          ) THEN
            -- Add as nullable first
            ALTER TABLE agent_conversations ADD COLUMN workspace_id UUID;

            -- Backfill with default workspace for each user
            UPDATE agent_conversations ac
            SET workspace_id = (
              SELECT id FROM workspaces w
              WHERE w.user_id = ac.user_id
              AND w.is_default = true
              LIMIT 1
            )
            WHERE workspace_id IS NULL;

            -- Make column NOT NULL after backfill
            ALTER TABLE agent_conversations ALTER COLUMN workspace_id SET NOT NULL;

            -- Add foreign key constraint
            ALTER TABLE agent_conversations
            ADD CONSTRAINT agent_conversations_workspace_id_fkey
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      // Create workspace-scoped indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS agent_messages_workspace_idx ON agent_messages(workspace_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS agent_messages_workspace_user_idx ON agent_messages(workspace_id, user_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS conversations_workspace_idx ON agent_conversations(workspace_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS conversations_workspace_user_idx ON agent_conversations(workspace_id, user_id)
      `);

      console.log('✅ Workspace scoping migration completed!');
      console.log('✅ All platform tables created successfully!');

      return NextResponse.json({
        success: true,
        message: 'Platform tables created successfully',
        tables: [
          'external_agents',
          'workspaces',
          'workspace_agents',
          'workspace_knowledge',
        ],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to create platform tables:', error);
    return NextResponse.json(
      { error: 'Failed to create platform tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
