/**
 * Apply Credentials & Sub-Workflow Migration
 *
 * Phase 5: Credential Vault & Sub-Workflow Orchestration
 *
 * This script applies the database migration for:
 * - Secure credential storage with AES-256-GCM encryption
 * - Credential usage audit logging
 * - Workflow execution lineage tracking (parent-child relationships)
 *
 * Usage:
 *   npx ts-node scripts/apply-credentials-migration.ts
 *
 * Prerequisites:
 *   - PostgreSQL database running
 *   - DATABASE_URL environment variable set
 *   - ENCRYPTION_KEY environment variable set (for credential encryption)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Pool } from 'pg';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const MIGRATION_FILE = resolve(__dirname, '../lib/db/migrations/0056_credentials_subworkflow.sql');

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function applyMigration(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 5: Credential Vault & Sub-Workflow Migration            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Validate environment
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Check encryption key
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY is not set. Credential encryption will fail without it.');
    console.warn('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.log('');
  } else {
    console.log('✅ ENCRYPTION_KEY is configured');
  }

  // Create database connection
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    // Test connection
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');
    console.log('');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf-8');
    console.log(`✅ Loaded migration: ${MIGRATION_FILE}`);
    console.log('');

    // Check if migration already applied
    console.log('🔍 Checking existing schema...');

    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('credentials', 'credential_usage_log', 'workflow_execution_lineage')
    `);

    const existingTables = tablesCheck.rows.map(r => r.table_name);

    if (existingTables.length > 0) {
      console.log(`   Found existing tables: ${existingTables.join(', ')}`);
      console.log('   Migration will use IF NOT EXISTS clauses to safely update.');
    } else {
      console.log('   No Phase 5 tables found. Fresh migration will be applied.');
    }
    console.log('');

    // Apply migration
    console.log('🚀 Applying migration...');
    console.log('─'.repeat(60));

    await client.query(migrationSql);

    console.log('─'.repeat(60));
    console.log('✅ Migration applied successfully!');
    console.log('');

    // Verify tables created
    console.log('🔍 Verifying migration...');

    const verifyTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('credentials', 'credential_usage_log', 'workflow_execution_lineage')
      ORDER BY table_name
    `);

    console.log('');
    console.log('   Created Tables:');
    for (const row of verifyTables.rows) {
      console.log(`   ✓ ${row.table_name}`);
    }

    // Verify enums
    const verifyEnums = await client.query(`
      SELECT typname
      FROM pg_type
      WHERE typname IN ('credential_type', 'credential_scope')
    `);

    console.log('');
    console.log('   Created Enums:');
    for (const row of verifyEnums.rows) {
      console.log(`   ✓ ${row.typname}`);
    }

    // Verify functions
    const verifyFunctions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'update_credentials_timestamp',
          'update_expired_credentials',
          'get_execution_depth',
          'check_circular_reference'
        )
    `);

    console.log('');
    console.log('   Created Functions:');
    for (const row of verifyFunctions.rows) {
      console.log(`   ✓ ${row.routine_name}()`);
    }

    // Verify indexes
    const verifyIndexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_credentials%'
         OR indexname LIKE 'idx_usage_log%'
         OR indexname LIKE 'idx_lineage%'
      ORDER BY indexname
    `);

    console.log('');
    console.log('   Created Indexes:');
    for (const row of verifyIndexes.rows) {
      console.log(`   ✓ ${row.indexname}`);
    }

    // Release client
    client.release();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Migration Complete!                                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Phase 5 Features Now Available:');
    console.log('  • Secure credential storage with AES-256-GCM encryption');
    console.log('  • Credential scopes: user, workspace, global');
    console.log('  • Credential usage audit logging');
    console.log('  • Sub-workflow execution with lineage tracking');
    console.log('  • Circular reference detection');
    console.log('  • Max recursion depth enforcement (3 levels)');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Ensure ENCRYPTION_KEY is set in production');
    console.log('  2. Create credentials via CredentialService');
    console.log('  3. Reference credentials in nodes: {{$credentials.myKey}}');
    console.log('  4. Use "Execute Workflow" nodes for sub-workflows');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      // Provide helpful hints based on error type
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('');
        console.error('Hint: Some required tables may be missing. Ensure earlier migrations are applied:');
        console.error('  - users table (base schema)');
        console.error('  - workspaces table (base schema)');
        console.error('  - workflows table (workflow schema)');
        console.error('  - workflow_executions table (workflow schema)');
      }

      if (error.message.includes('permission denied')) {
        console.error('');
        console.error('Hint: Database user may lack sufficient permissions.');
        console.error('  Ensure user has CREATE, ALTER, and INSERT privileges.');
      }

      if (error.message.includes('duplicate_object')) {
        console.error('');
        console.error('Hint: Some objects already exist. This is usually safe to ignore.');
      }
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);

  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// ============================================================================
// RUN MIGRATION
// ============================================================================

applyMigration().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
