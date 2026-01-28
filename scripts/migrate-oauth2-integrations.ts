/**
 * Database Migration: OAuth2 Integrations Table
 *
 * Creates the integrations table with all necessary fields for OAuth2
 *
 * Usage: npx tsx scripts/migrate-oauth2-integrations.ts
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

const db = getDb();

async function migrateIntegrationsTable() {
  console.log('\n===========================================');
  console.log('🗄️  OAuth2 Integrations Table Migration');
  console.log('===========================================\n');

  try {
    console.log('📊 Creating integrations table...');

    // Create integrations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,

        -- OAuth Provider & Service
        provider VARCHAR(50) NOT NULL,
        service VARCHAR(50) NOT NULL,

        -- Encrypted Tokens
        access_token VARCHAR(500) NOT NULL,
        refresh_token VARCHAR(500),
        token_type VARCHAR(50) DEFAULT 'Bearer',
        expires_at TIMESTAMP NOT NULL,

        -- OAuth Metadata
        scopes JSONB,

        -- Connected User Info
        connected_email VARCHAR(255),
        connected_name VARCHAR(255),
        connected_avatar VARCHAR(500),

        -- Status & Sync
        status VARCHAR(50) NOT NULL DEFAULT 'connected',
        last_sync_at TIMESTAMP,
        last_error_at TIMESTAMP,
        last_error_message VARCHAR(500),

        -- Metadata
        metadata JSONB,

        -- Timestamps
        connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Constraints
        UNIQUE(user_id, provider, service)
      );
    `);

    console.log('✅ Table created successfully\n');

    console.log('📊 Creating indexes...');

    // Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_integrations_user
      ON integrations(user_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_integrations_status
      ON integrations(status);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_integrations_expires
      ON integrations(expires_at);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_integrations_provider
      ON integrations(provider, service);
    `);

    console.log('✅ Indexes created successfully\n');

    console.log('📊 Creating updated_at trigger...');

    // Create trigger to auto-update updated_at
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_integrations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.execute(sql`
      DROP TRIGGER IF EXISTS trigger_integrations_updated_at ON integrations;
    `);

    await db.execute(sql`
      CREATE TRIGGER trigger_integrations_updated_at
      BEFORE UPDATE ON integrations
      FOR EACH ROW
      EXECUTE FUNCTION update_integrations_updated_at();
    `);

    console.log('✅ Trigger created successfully\n');

    console.log('📊 Verifying table structure...');

    // Verify table exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'integrations'
      ORDER BY ordinal_position;
    `);

    console.log('✅ Table structure verified:\n');
    console.table(result.rows);

    console.log('\n===========================================');
    console.log('✅ Migration completed successfully!');
    console.log('===========================================\n');

    console.log('Next steps:');
    console.log('1. Verify table in your database: SELECT * FROM integrations;');
    console.log('2. Test OAuth flow: Navigate to /settings?tab=integrations');
    console.log('3. Connect a test integration (Gmail, etc.)');
    console.log('4. Verify data: SELECT * FROM integrations WHERE user_id = \'demo-user\';\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check DATABASE_URL in .env.local');
    console.error('2. Ensure database is accessible');
    console.error('3. Verify PostgreSQL permissions');
    console.error('4. Check if table already exists\n');
    process.exit(1);
  }
}

// Run migration
migrateIntegrationsTable();
