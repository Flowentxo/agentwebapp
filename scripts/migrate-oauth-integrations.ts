/**
 * Migration Script: Add OAuth2 Integrations Tables
 * Run with: npx tsx scripts/migrate-oauth-integrations.ts
 */

import { getDb } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

async function migrateOAuthIntegrations() {
  console.log('🔄 Starting OAuth integrations migration...');

  const db = getDb();

  try {
    // Step 1: Create enum type
    console.log('📦 Creating integration_status enum...');
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error', 'token_expired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Step 2: Create integrations table
    console.log('📦 Creating integrations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        service VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type VARCHAR(50) NOT NULL DEFAULT 'Bearer',
        expires_at TIMESTAMP NOT NULL,
        scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
        status integration_status NOT NULL DEFAULT 'connected',
        connected_email VARCHAR(255),
        connected_name VARCHAR(255),
        connected_avatar TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Step 3: Create indexes
    console.log('📦 Creating indexes for integrations...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integrations_provider_idx ON integrations(provider);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integrations_status_idx ON integrations(status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integrations_expires_at_idx ON integrations(expires_at);`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS integrations_unique_user_provider_service
        ON integrations(user_id, provider, service);
    `);

    // Step 4: Create integration_events table
    console.log('📦 Creating integration_events table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Step 5: Create indexes for integration_events
    console.log('📦 Creating indexes for integration_events...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integration_events_integration_id_idx ON integration_events(integration_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integration_events_event_type_idx ON integration_events(event_type);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS integration_events_created_at_idx ON integration_events(created_at);`);

    console.log('✅ OAuth integrations migration completed successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - integrations');
    console.log('  - integration_events');
    console.log('');
    console.log('You can now use Google OAuth integration!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateOAuthIntegrations();
