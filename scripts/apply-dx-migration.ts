/**
 * Apply Developer Experience Migration
 *
 * Phase 6: Builder Experience Enhancement
 *
 * This script applies the database migration for:
 * - Data Pinning: Cache node outputs for faster development
 * - Schema Discovery: Metadata for autocomplete
 * - Execution History: Structured logs with loop grouping
 * - Expression Bookmarks: Save common expressions
 *
 * Usage:
 *   npx ts-node scripts/apply-dx-migration.ts
 *
 * Prerequisites:
 *   - PostgreSQL database running
 *   - DATABASE_URL environment variable set
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
const MIGRATION_FILE = resolve(__dirname, '../lib/db/migrations/0057_developer_experience.sql');

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function applyMigration(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 6: Developer Experience Migration                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Validate environment
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
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
        AND table_name IN (
          'pinned_node_data',
          'node_schema_cache',
          'node_type_schema_templates',
          'workflow_node_logs',
          'expression_bookmarks'
        )
    `);

    const existingTables = tablesCheck.rows.map(r => r.table_name);

    if (existingTables.length > 0) {
      console.log(`   Found existing tables: ${existingTables.join(', ')}`);
      console.log('   Migration will use IF NOT EXISTS clauses to safely update.');
    } else {
      console.log('   No Phase 6 tables found. Fresh migration will be applied.');
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
        AND table_name IN (
          'pinned_node_data',
          'node_schema_cache',
          'node_type_schema_templates',
          'workflow_node_logs',
          'expression_bookmarks'
        )
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
      WHERE typname IN ('pin_mode', 'schema_source')
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
          'update_dx_timestamp',
          'get_execution_log_stats',
          'get_loop_iteration_stats',
          'cleanup_old_execution_logs',
          'mark_stale_schema_caches'
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
        AND (
          indexname LIKE 'idx_pinned%'
          OR indexname LIKE 'idx_schema_cache%'
          OR indexname LIKE 'idx_template%'
          OR indexname LIKE 'idx_node_logs%'
          OR indexname LIKE 'idx_bookmarks%'
        )
      ORDER BY indexname
    `);

    console.log('');
    console.log('   Created Indexes:');
    for (const row of verifyIndexes.rows) {
      console.log(`   ✓ ${row.indexname}`);
    }

    // Check built-in templates
    const templateCount = await client.query(`
      SELECT COUNT(*) as count
      FROM node_type_schema_templates
      WHERE is_builtin = TRUE
    `);

    console.log('');
    console.log(`   Seeded ${templateCount.rows[0].count} built-in schema templates`);

    // Release client
    client.release();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Migration Complete!                                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Phase 6 Features Now Available:');
    console.log('  • Data Pinning: Pin node outputs for faster dev iterations');
    console.log('  • Schema Discovery: Autocomplete variables in expressions');
    console.log('  • Execution History: Hierarchical logs with loop grouping');
    console.log('  • Expression Bookmarks: Save commonly used expressions');
    console.log('');
    console.log('API Endpoints:');
    console.log('  • GET/POST   /api/dx/pins/:workflowId');
    console.log('  • POST       /api/dx/discover/:workflowId');
    console.log('  • GET        /api/dx/executions/:executionId/loops');
    console.log('  • GET/POST   /api/dx/bookmarks');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Register DX routes in your Express app');
    console.log('  2. Use pin features in the workflow studio');
    console.log('  3. Integrate autocomplete in expression editor');
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
