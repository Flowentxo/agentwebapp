/**
 * Migration Script: Binary Data System
 *
 * Phase 3: Power Features - Binary Data Tracking
 *
 * This script applies the binary data system migration which creates:
 * - binary_data_store: Track binary files stored externally
 * - binary_data_usage: Track storage usage per user for quotas
 * - binary_data_cleanup_log: Audit trail for cleanup operations
 *
 * Usage:
 *   npx tsx scripts/apply-binary-data-migration.ts
 *
 * Prerequisites:
 *   - PostgreSQL database connection configured in .env
 *   - Previous migrations applied (0052, 0053)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

// Migration configuration
const MIGRATION_FILE = '0054_binary_data_system.sql';
const MIGRATION_VERSION = '0054';
const MIGRATION_NAME = 'binary_data_system';

interface MigrationResult {
  success: boolean;
  version: string;
  name: string;
  duration: number;
  error?: string;
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Binary Data System Migration - Phase 3                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Load environment variables
  const databaseUrl = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'postgresql://postgres:postgres@localhost:5432/flowent';

  console.log('📦 Database Configuration:');
  console.log(`   URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');

  // Create database connection pool
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    console.log('   ✓ Connected successfully');
    console.log('');

    // Check if migration was already applied
    const migrationCheck = await checkMigrationApplied(client, MIGRATION_VERSION);
    if (migrationCheck) {
      console.log(`⚠️  Migration ${MIGRATION_VERSION} already applied on ${migrationCheck}`);
      console.log('   Skipping migration.');
      client.release();
      return;
    }

    // Read migration SQL
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'lib', 'db', 'migrations', MIGRATION_FILE);
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    console.log(`   ✓ Loaded ${MIGRATION_FILE} (${migrationSql.length} bytes)`);
    console.log('');

    // Apply migration
    console.log('🚀 Applying migration...');
    const startTime = Date.now();

    await client.query('BEGIN');

    try {
      // Execute migration SQL
      await client.query(migrationSql);

      // Record migration in tracking table
      await recordMigration(client, MIGRATION_VERSION, MIGRATION_NAME);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      console.log(`   ✓ Migration applied successfully in ${duration}ms`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Verify tables created
    console.log('');
    console.log('🔍 Verifying created objects...');
    await verifyMigration(client);

    client.release();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    ✓ Migration Complete                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Created tables:');
    console.log('  • binary_data_store     - Track binary file metadata');
    console.log('  • binary_data_usage     - Track storage usage per user');
    console.log('  • binary_data_cleanup_log - Cleanup audit trail');
    console.log('');
    console.log('Created functions:');
    console.log('  • update_binary_usage_stats()   - Auto-update usage on insert/delete');
    console.log('  • mark_orphaned_binary_files()  - Mark files with zero references');
    console.log('  • cleanup_expired_binary_files() - Cleanup expired files');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');

    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('💡 Tip: Some objects already exist. You may need to manually clean up');
      console.log('   or modify the migration to use IF NOT EXISTS clauses.');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Check if a migration has already been applied
 */
async function checkMigrationApplied(client: pg.PoolClient, version: string): Promise<string | null> {
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const result = await client.query(
      'SELECT applied_at FROM _migrations WHERE version = $1',
      [version]
    );

    if (result.rows.length > 0) {
      return result.rows[0].applied_at.toISOString();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Record a migration as applied
 */
async function recordMigration(
  client: pg.PoolClient,
  version: string,
  name: string
): Promise<void> {
  await client.query(
    'INSERT INTO _migrations (version, name) VALUES ($1, $2)',
    [version, name]
  );
}

/**
 * Verify that migration objects were created successfully
 */
async function verifyMigration(client: pg.PoolClient): Promise<void> {
  const checks = [
    {
      name: 'binary_data_store table',
      query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'binary_data_store')",
    },
    {
      name: 'binary_data_usage table',
      query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'binary_data_usage')",
    },
    {
      name: 'binary_data_cleanup_log table',
      query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'binary_data_cleanup_log')",
    },
    {
      name: 'storage_provider enum',
      query: "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider')",
    },
    {
      name: 'binary_file_status enum',
      query: "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'binary_file_status')",
    },
    {
      name: 'update_binary_usage_stats function',
      query: "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_binary_usage_stats')",
    },
    {
      name: 'mark_orphaned_binary_files function',
      query: "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_orphaned_binary_files')",
    },
    {
      name: 'cleanup_expired_binary_files function',
      query: "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_binary_files')",
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    const result = await client.query(check.query);
    const exists = result.rows[0]?.exists === true;

    if (exists) {
      console.log(`   ✓ ${check.name}`);
    } else {
      console.log(`   ✗ ${check.name} - NOT FOUND`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    throw new Error('Some migration objects were not created correctly');
  }
}

// Run main function
main().catch(console.error);
