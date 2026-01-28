/**
 * Apply Missing Tables Script
 *
 * Creates the audit_logs and user_known_devices tables in the database.
 * Run with: npx tsx scripts/apply-missing-tables.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createTables(): Promise<void> {
  console.log('='.repeat(60));
  console.log('CREATING MISSING TABLES');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    // Create user_known_devices table
    console.log('\n[1] Creating user_known_devices table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_known_devices (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_hash VARCHAR(64) NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        device_info JSONB,
        is_trusted BOOLEAN NOT NULL DEFAULT true,
        first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        alert_sent_at TIMESTAMP
      );
    `);
    console.log('  ✅ user_known_devices table created');

    // Create indexes for user_known_devices
    console.log('\n[2] Creating indexes for user_known_devices...');
    await client.query(`CREATE INDEX IF NOT EXISTS user_known_devices_user_id_idx ON user_known_devices(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS user_known_devices_device_hash_idx ON user_known_devices(device_hash);`);
    await client.query(`CREATE INDEX IF NOT EXISTS user_known_devices_user_device_unique ON user_known_devices(user_id, device_hash);`);
    await client.query(`CREATE INDEX IF NOT EXISTS user_known_devices_last_seen_at_idx ON user_known_devices(last_seen_at);`);
    console.log('  ✅ Indexes created');

    // Create audit_logs table
    console.log('\n[3] Creating audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(36),
        metadata JSONB NOT NULL DEFAULT '{}',
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ audit_logs table created');

    // Create indexes for audit_logs
    console.log('\n[4] Creating indexes for audit_logs...');
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);`);
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_user_action_idx ON audit_logs(user_id, action, created_at);`);
    console.log('  ✅ Indexes created');

    // Verify tables
    console.log('\n[5] Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_known_devices', 'audit_logs');
    `);

    console.log('  Found tables:', result.rows.map(r => r.table_name).join(', '));

    if (result.rows.length === 2) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ ALL TABLES CREATED SUCCESSFULLY!');
      console.log('='.repeat(60));
    } else {
      console.log('\n⚠️ Some tables may be missing');
    }

  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    console.error('\n❌ Error:', err.message);
    if (err.code) {
      console.error('  Code:', err.code);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
