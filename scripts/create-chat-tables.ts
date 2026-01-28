import { getPool } from '../lib/db/connection';

async function createTables() {
  console.log('🚀 Creating agent chat tables...');

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Create agent_messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✅ Created agent_messages table');

    // Create indexes for agent_messages
    await client.query(`
      CREATE INDEX IF NOT EXISTS agent_messages_user_idx ON agent_messages(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS agent_messages_agent_idx ON agent_messages(agent_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS agent_messages_created_idx ON agent_messages(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS agent_messages_user_agent_idx ON agent_messages(user_id, agent_id)
    `);

    console.log('✅ Created indexes for agent_messages');

    // Create agent_conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        last_message_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✅ Created agent_conversations table');

    // Create indexes for agent_conversations
    await client.query(`
      CREATE INDEX IF NOT EXISTS conversations_user_agent_idx ON agent_conversations(user_id, agent_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON agent_conversations(last_message_at DESC)
    `);

    console.log('✅ Created indexes for agent_conversations');

    console.log('\n✅ All tables and indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

createTables();
