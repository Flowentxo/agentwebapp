import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/connection';

/**
 * POST /api/platform/migrate-workspace-scoping
 * Add workspace_id to agent_messages and agent_conversations with proper backfill
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting workspace scoping migration...');

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Step 1: Cleanup - Delete orphaned messages and conversations
      console.log('🧹 Step 1: Cleaning orphaned data...');

      const deletedMessages = await client.query(`
        DELETE FROM agent_messages WHERE user_id NOT IN (SELECT id FROM users)
      `);
      console.log(`🗑️  Deleted ${deletedMessages.rowCount} orphaned messages`);

      const deletedConversations = await client.query(`
        DELETE FROM agent_conversations WHERE user_id NOT IN (SELECT id FROM users)
      `);
      console.log(`🗑️  Deleted ${deletedConversations.rowCount} orphaned conversations`);

      // Step 2: Ensure all users have default workspaces
      console.log('📋 Step 2: Creating default workspaces...');

      const workspacesCreated = await client.query(`
        INSERT INTO workspaces (user_id, name, description, slug, is_default, settings)
        SELECT DISTINCT
          am.user_id,
          'Personal Workspace',
          'Your default workspace',
          'personal-' || LOWER(SUBSTRING(am.user_id FROM 1 FOR 8)),
          true,
          '{}'::jsonb
        FROM agent_messages am
        WHERE NOT EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.user_id = am.user_id AND w.is_default = true
        )
      `);
      console.log(`✅ Created ${workspacesCreated.rowCount} default workspaces from messages`);

      const workspacesCreated2 = await client.query(`
        INSERT INTO workspaces (user_id, name, description, slug, is_default, settings)
        SELECT DISTINCT
          ac.user_id,
          'Personal Workspace',
          'Your default workspace',
          'personal-' || LOWER(SUBSTRING(ac.user_id FROM 1 FOR 8)),
          true,
          '{}'::jsonb
        FROM agent_conversations ac
        WHERE NOT EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.user_id = ac.user_id AND w.is_default = true
        )
      `);
      console.log(`✅ Created ${workspacesCreated2.rowCount} default workspaces from conversations`);

      // Step 3: Drop existing columns and constraints if they exist
      console.log('🧹 Step 3: Dropping existing columns if present...');

      await client.query(`DROP INDEX IF EXISTS agent_messages_workspace_idx`);
      await client.query(`DROP INDEX IF EXISTS agent_messages_workspace_user_idx`);
      await client.query(`DROP INDEX IF EXISTS conversations_workspace_idx`);
      await client.query(`DROP INDEX IF EXISTS conversations_workspace_user_idx`);

      await client.query(`ALTER TABLE agent_messages DROP COLUMN IF EXISTS workspace_id CASCADE`);
      await client.query(`ALTER TABLE agent_conversations DROP COLUMN IF EXISTS workspace_id CASCADE`);

      // Step 4: Add workspace_id columns
      console.log('📝 Step 4: Adding workspace_id columns...');

      await client.query(`ALTER TABLE agent_messages ADD COLUMN workspace_id UUID`);
      await client.query(`ALTER TABLE agent_conversations ADD COLUMN workspace_id UUID`);

      // Step 5: Backfill workspace_id
      console.log('🔄 Step 5: Backfilling workspace_id...');

      const messagesUpdated = await client.query(`
        UPDATE agent_messages am
        SET workspace_id = w.id
        FROM workspaces w
        WHERE w.user_id = am.user_id
        AND w.is_default = true
      `);
      console.log(`✅ Updated ${messagesUpdated.rowCount} agent messages`);

      const conversationsUpdated = await client.query(`
        UPDATE agent_conversations ac
        SET workspace_id = w.id
        FROM workspaces w
        WHERE w.user_id = ac.user_id
        AND w.is_default = true
      `);
      console.log(`✅ Updated ${conversationsUpdated.rowCount} agent conversations`);

      // Step 6: Verify no nulls remain
      const nullMessages = await client.query(`
        SELECT COUNT(*) as count FROM agent_messages WHERE workspace_id IS NULL
      `);
      const nullConversations = await client.query(`
        SELECT COUNT(*) as count FROM agent_conversations WHERE workspace_id IS NULL
      `);

      if (parseInt(nullMessages.rows[0].count) > 0 || parseInt(nullConversations.rows[0].count) > 0) {
        throw new Error(`Found NULL workspace_ids: ${nullMessages.rows[0].count} messages, ${nullConversations.rows[0].count} conversations`);
      }

      // Step 7: Add NOT NULL constraints and foreign keys
      console.log('🔒 Step 7: Adding constraints...');

      await client.query(`ALTER TABLE agent_messages ALTER COLUMN workspace_id SET NOT NULL`);
      await client.query(`
        ALTER TABLE agent_messages
        ADD CONSTRAINT agent_messages_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      `);

      await client.query(`ALTER TABLE agent_conversations ALTER COLUMN workspace_id SET NOT NULL`);
      await client.query(`
        ALTER TABLE agent_conversations
        ADD CONSTRAINT agent_conversations_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      `);

      // Step 8: Create indexes
      console.log('🔍 Step 8: Creating indexes...');

      await client.query(`CREATE INDEX agent_messages_workspace_idx ON agent_messages(workspace_id)`);
      await client.query(`CREATE INDEX agent_messages_workspace_user_idx ON agent_messages(workspace_id, user_id)`);
      await client.query(`CREATE INDEX conversations_workspace_idx ON agent_conversations(workspace_id)`);
      await client.query(`CREATE INDEX conversations_workspace_user_idx ON agent_conversations(workspace_id, user_id)`);

      // Step 9: Enable all agents for all workspaces
      console.log('🤖 Step 9: Enabling agents for all workspaces...');

      const allAgents = ['dexter', 'cassie', 'emmie', 'aura', 'nova', 'kai',
                         'lex', 'finn', 'ari', 'echo', 'vera', 'omni'];

      for (const agentId of allAgents) {
        // First get all workspaces
        const workspaces = await client.query(`SELECT id FROM workspaces`);

        // Then for each workspace, check and insert
        for (const workspace of workspaces.rows) {
          await client.query(`
            INSERT INTO workspace_agents (workspace_id, agent_id, enabled, config)
            SELECT $1::uuid, $2::varchar(50), $3::boolean, $4::jsonb
            WHERE NOT EXISTS (
              SELECT 1 FROM workspace_agents
              WHERE workspace_id = $1::uuid AND agent_id = $2::varchar(50)
            )
          `, [workspace.id, agentId, true, '{}']);
        }
      }
      console.log(`✅ Enabled all agents for workspaces`);

      console.log('✅ Workspace scoping migration completed successfully!');

      return NextResponse.json({
        success: true,
        message: 'Workspace scoping migration completed',
        stats: {
          messagesDeleted: deletedMessages.rowCount ?? 0,
          conversationsDeleted: deletedConversations.rowCount ?? 0,
          workspacesCreated: (workspacesCreated.rowCount ?? 0) + (workspacesCreated2.rowCount ?? 0),
          messagesUpdated: messagesUpdated.rowCount ?? 0,
          conversationsUpdated: conversationsUpdated.rowCount ?? 0,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Workspace scoping migration failed:', error);
    return NextResponse.json(
      {
        error: 'Workspace scoping migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
