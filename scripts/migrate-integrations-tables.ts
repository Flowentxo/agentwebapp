
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
  console.log('Starting migration for Integration Tables...');
  const db = getDb();

  try {
    // 1. integration_settings
    console.log('Creating integration_settings...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255),
        provider VARCHAR(50) NOT NULL,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. oauth_connections
    console.log('Creating oauth_connections...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS oauth_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255),
        provider VARCHAR(50) NOT NULL,
        provider_account_id VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type VARCHAR(50),
        expires_at TIMESTAMP,
        scope TEXT,
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. integration_usage
    console.log('Creating integration_usage...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        connection_id UUID REFERENCES oauth_connections(id),
        provider VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
