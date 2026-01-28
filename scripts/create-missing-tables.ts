/**
 * Create Missing Tables
 * Run with: npx tsx scripts/create-missing-tables.ts
 */
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';

async function createMissingTables() {
  console.log('🔧 Creating Missing Tables...\n');

  const db = getDb();

  try {
    // Create inbox_threads table
    console.log('📌 Creating inbox_threads...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inbox_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        workspace_id UUID,
        subject VARCHAR(500),
        preview TEXT,
        agent_id VARCHAR(100),
        agent_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        priority VARCHAR(20) DEFAULT 'medium',
        unread_count INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0,
        last_message_at TIMESTAMP,
        pending_approval_id UUID,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ inbox_threads created');

    // Create inbox_messages table
    console.log('📌 Creating inbox_messages...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inbox_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID REFERENCES inbox_threads(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        type VARCHAR(50) DEFAULT 'text',
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        artifacts JSONB DEFAULT '[]',
        approval JSONB,
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ inbox_messages created');

    // Create artifacts table
    console.log('📌 Creating artifacts...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS artifacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID REFERENCES inbox_threads(id) ON DELETE CASCADE,
        message_id UUID REFERENCES inbox_messages(id) ON DELETE SET NULL,
        workflow_execution_id UUID,
        user_id UUID,
        workspace_id UUID,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        content TEXT,
        language VARCHAR(50),
        version INTEGER DEFAULT 1,
        metadata JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ artifacts created');

    // Create inbox_approvals table
    console.log('📌 Creating inbox_approvals...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inbox_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID REFERENCES inbox_threads(id) ON DELETE CASCADE,
        message_id UUID REFERENCES inbox_messages(id) ON DELETE SET NULL,
        workflow_id UUID,
        workflow_name VARCHAR(255),
        action_type VARCHAR(100),
        action_details JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending',
        resolved_by UUID,
        resolved_at TIMESTAMP,
        comment TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ inbox_approvals created');

    // Create files table
    console.log('📌 Creating files...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        workspace_id UUID,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        mime_type VARCHAR(100),
        size BIGINT,
        storage_provider VARCHAR(50) DEFAULT 'local',
        storage_key TEXT,
        storage_bucket VARCHAR(255),
        storage_region VARCHAR(50),
        url TEXT,
        thumbnail_url TEXT,
        preview_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        processing_error TEXT,
        visibility VARCHAR(20) DEFAULT 'private',
        virus_scan_status VARCHAR(50),
        virus_scan_date TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        uploaded_at TIMESTAMP DEFAULT NOW(),
        last_accessed_at TIMESTAMP,
        expires_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ files created');

    // Add missing published_version column to workflows
    console.log('📌 Adding published_version to workflows...');
    try {
      await db.execute(sql`
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_version INTEGER DEFAULT 1
      `);
      console.log('✅ published_version added');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('⏭️  published_version already exists');
      } else {
        throw e;
      }
    }

    // Create indexes
    console.log('\n📌 Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_threads_user_id ON inbox_threads(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_threads_status ON inbox_threads(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_threads_last_message ON inbox_threads(last_message_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread_id ON inbox_messages(thread_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_artifacts_thread_id ON artifacts(thread_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_approvals_thread_id ON inbox_approvals(thread_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_approvals_status ON inbox_approvals(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_files_status ON files(status)`);
    console.log('✅ All indexes created');

    // Verify all tables exist
    console.log('\n🔍 Verifying tables...');
    const tables = ['users', 'sessions', 'workflows', 'calendar_events', 'inbox_threads', 'inbox_messages', 'artifacts', 'inbox_approvals', 'files'];

    for (const table of tables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = ${table}
        ) as exists
      `);
      const exists = result.rows[0]?.exists;
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    }

    // Verify published_version column
    console.log('\n🔍 Verifying published_version column...');
    const colResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'workflows' AND column_name = 'published_version'
      ) as exists
    `);
    const colExists = colResult.rows[0]?.exists;
    console.log(`   ${colExists ? '✅' : '❌'} workflows.published_version`);

    console.log('\n🎉 All tables created successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

createMissingTables();
