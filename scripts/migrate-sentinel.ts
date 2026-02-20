/**
 * Property Sentinel Migration Script
 *
 * Creates the 3 sentinel tables + indexes:
 * - sentinel_search_profiles
 * - sentinel_seen_listings
 * - sentinel_scan_logs
 *
 * Run: npx tsx scripts/migrate-sentinel.ts
 */

import { Pool } from 'pg';
import { SENTINEL_MIGRATION_SQL } from '../lib/db/schema-sentinel';

const SENTINEL_TABLES = [
  'sentinel_search_profiles',
  'sentinel_seen_listings',
  'sentinel_scan_logs',
];

async function migrate() {
  const connectionString = process.env.DATABASE_URL;

  const pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'sintra_knowledge',
      });

  try {
    console.log('[SENTINEL_MIGRATE] Starting Property Sentinel migration...');

    await pool.query(SENTINEL_MIGRATION_SQL);

    // Verify all 3 tables
    for (const table of SENTINEL_TABLES) {
      const result = await pool.query(
        `SELECT count(*) as cnt FROM information_schema.tables WHERE table_name = $1`,
        [table],
      );
      const exists = parseInt(result.rows[0]?.cnt) > 0;

      if (exists) {
        const countResult = await pool.query(`SELECT count(*) as cnt FROM ${table}`);
        console.log(`[SENTINEL_MIGRATE] ✅ ${table} created (${countResult.rows[0]?.cnt} rows)`);
      } else {
        console.error(`[SENTINEL_MIGRATE] ❌ ${table} was NOT created`);
        process.exit(1);
      }
    }

    console.log('[SENTINEL_MIGRATE] ✅ Migration complete — all 3 tables ready');
  } catch (error: any) {
    console.error('[SENTINEL_MIGRATE] ❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
