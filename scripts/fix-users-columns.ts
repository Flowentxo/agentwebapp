/**
 * Fix missing columns in users table - Complete Schema Sync
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Adding ALL missing columns to users table...');

  // All columns from Drizzle schema lib/db/schema.ts
  const alterQueries = [
    // Profile fields
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) NOT NULL DEFAULT 'de-DE'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Berlin'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'system'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS org_title VARCHAR(100)",

    // JSONB fields
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS accessibility JSONB NOT NULL DEFAULT '{}'::jsonb",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS comm_prefs JSONB NOT NULL DEFAULT '{}'::jsonb",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{}'::jsonb",

    // MFA fields
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_recovery_codes TEXT",

    // Sudo mode
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS sudo_session_timeout INTEGER NOT NULL DEFAULT 15",

    // Passkey
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS passkey_enabled BOOLEAN DEFAULT false",
  ];

  for (const query of alterQueries) {
    try {
      await pool.query(query);
      const colName = query.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      console.log('✓ Added:', colName);
    } catch (err: any) {
      console.log('⚠ Error:', err.message);
    }
  }

  console.log('\nAll columns processed!');

  // Verify columns
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);
  console.log('\nUsers table columns:');
  result.rows.forEach(row => {
    console.log(`  - ${row.column_name}: ${row.data_type}`);
  });

  await pool.end();
}

main().catch(console.error);
