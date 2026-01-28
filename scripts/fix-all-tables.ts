/**
 * Fix ALL missing tables and columns for Supabase migration
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

  console.log('=== Fixing ALL tables for Supabase ===\n');

  // Sessions table fixes
  console.log('1. Fixing sessions table...');
  const sessionQueries = [
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info JSONB",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_authenticated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()",
  ];

  for (const q of sessionQueries) {
    try {
      await pool.query(q);
      const col = q.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      console.log('   ✓', col);
    } catch (e: any) {
      console.log('   ⚠', e.message?.substring(0, 50));
    }
  }

  // Verification tokens table fixes
  console.log('\n2. Fixing verification_tokens table...');
  const tokenQueries = [
    "ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS metadata JSONB",
  ];

  for (const q of tokenQueries) {
    try {
      await pool.query(q);
      const col = q.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      console.log('   ✓', col);
    } catch (e: any) {
      console.log('   ⚠', e.message?.substring(0, 50));
    }
  }

  // Check if we need to create passkey_credentials table
  console.log('\n3. Creating passkey_credentials table if needed...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS passkey_credentials (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        device_type VARCHAR(50),
        transports TEXT[],
        name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('   ✓ passkey_credentials table ready');
  } catch (e: any) {
    console.log('   ⚠', e.message?.substring(0, 60));
  }

  // Summary
  console.log('\n=== Done! ===');

  // Show table count
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  console.log('Total tables:', result.rows[0].count);

  await pool.end();
}

main().catch(console.error);
