/**
 * Apply Loop Iteration Migration (Phase 2)
 *
 * Runs the 0053_loop_iteration_state.sql migration directly against PostgreSQL.
 * This bypasses drizzle-kit push which has issues with interactive prompts.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🚀 Starting Loop Iteration Migration (Phase 2)');
  console.log('📍 Connecting to database...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = resolve(process.cwd(), 'lib/db/migrations/0053_loop_iteration_state.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration file');
    console.log('⏳ Running migration in transaction...\n');

    // Run entire migration as a single transaction
    await client.query('BEGIN');

    try {
      // Execute the entire migration file at once
      await client.query(migrationSql);
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully');
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Check if it's a "already exists" type error
      if (error.code === '42710' || // Duplicate type
          error.code === '42P07' || // Duplicate table
          error.message.includes('already exists')) {
        console.log('⚠️  Some objects already exist, running incremental migration...\n');

        // Run incremental - create only what doesn't exist
        await runIncrementalMigration(client);
      } else {
        throw error;
      }
    }

    client.release();

    // Verify tables exist
    console.log('\n🔍 Verifying created tables...');
    const verifyClient = await pool.connect();

    const tableCheck = await verifyClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('loop_iteration_states', 'loop_iteration_logs')
    `);

    console.log(`   Found ${tableCheck.rows.length}/2 loop iteration tables:`);
    tableCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    if (tableCheck.rows.length < 2) {
      console.log('\n⚠️  Warning: Not all tables were created');
    } else {
      console.log('\n' + '='.repeat(50));
      console.log('✅ Phase 2 Loop Iteration Migration completed!');
      console.log('='.repeat(50));
    }

    verifyClient.release();

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runIncrementalMigration(client: pg.PoolClient) {
  // Create enum if it doesn't exist
  try {
    await client.query(`
      CREATE TYPE loop_status AS ENUM (
        'initializing',
        'running',
        'paused',
        'completed',
        'error',
        'cancelled'
      )
    `);
    console.log('  ✅ Created enum: loop_status');
  } catch (e: any) {
    if (e.code === '42710') {
      console.log('  ⏭️  Enum exists: loop_status');
    } else {
      throw e;
    }
  }

  // Create loop_iteration_states table
  try {
    await client.query(`
      CREATE TABLE loop_iteration_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        loop_node_id VARCHAR(100) NOT NULL,
        batch_size INTEGER NOT NULL DEFAULT 10,
        total_items INTEGER NOT NULL,
        run_index INTEGER NOT NULL DEFAULT 0,
        next_index INTEGER NOT NULL DEFAULT 0,
        status loop_status NOT NULL DEFAULT 'initializing',
        source_items JSONB NOT NULL,
        aggregated_results JSONB NOT NULL DEFAULT '[]',
        loop_scope_node_ids JSONB NOT NULL DEFAULT '[]',
        feedback_node_ids JSONB NOT NULL DEFAULT '[]',
        exit_node_ids JSONB NOT NULL DEFAULT '[]',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        last_iteration_at TIMESTAMP,
        max_iterations INTEGER NOT NULL DEFAULT 1000,
        error_on_max_iterations BOOLEAN NOT NULL DEFAULT TRUE,
        continue_on_error BOOLEAN NOT NULL DEFAULT FALSE,
        last_error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Created table: loop_iteration_states');
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log('  ⏭️  Table exists: loop_iteration_states');
    } else {
      throw e;
    }
  }

  // Create loop_iteration_logs table
  try {
    await client.query(`
      CREATE TABLE loop_iteration_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loop_state_id UUID NOT NULL REFERENCES loop_iteration_states(id) ON DELETE CASCADE,
        execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        iteration_index INTEGER NOT NULL,
        batch_start_index INTEGER NOT NULL,
        batch_end_index INTEGER NOT NULL,
        item_count INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        batch_input JSONB,
        batch_output JSONB,
        error_message TEXT,
        error_node_id VARCHAR(100),
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Created table: loop_iteration_logs');
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log('  ⏭️  Table exists: loop_iteration_logs');
    } else {
      throw e;
    }
  }

  // Create indexes (if not exists)
  const indexes = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_loop_states_execution_node ON loop_iteration_states(execution_id, loop_node_id)',
    'CREATE INDEX IF NOT EXISTS idx_loop_states_status ON loop_iteration_states(status)',
    'CREATE INDEX IF NOT EXISTS idx_loop_states_execution ON loop_iteration_states(execution_id)',
    'CREATE INDEX IF NOT EXISTS idx_iteration_logs_loop_state ON loop_iteration_logs(loop_state_id)',
    'CREATE INDEX IF NOT EXISTS idx_iteration_logs_execution ON loop_iteration_logs(execution_id)',
    'CREATE INDEX IF NOT EXISTS idx_iteration_logs_iteration ON loop_iteration_logs(loop_state_id, iteration_index)',
  ];

  for (const indexSql of indexes) {
    try {
      await client.query(indexSql);
      const match = indexSql.match(/INDEX (?:IF NOT EXISTS )?([\w_]+)/);
      if (match) console.log(`  ✅ Index ready: ${match[1]}`);
    } catch (e: any) {
      console.log(`  ⚠️  Index error: ${e.message}`);
    }
  }

  // Create trigger function and trigger
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION update_loop_iteration_states_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('  ✅ Function ready: update_loop_iteration_states_updated_at');
  } catch (e: any) {
    console.log(`  ⚠️  Function error: ${e.message}`);
  }

  try {
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_loop_iteration_states_updated_at ON loop_iteration_states;
      CREATE TRIGGER trigger_loop_iteration_states_updated_at
        BEFORE UPDATE ON loop_iteration_states
        FOR EACH ROW
        EXECUTE FUNCTION update_loop_iteration_states_updated_at()
    `);
    console.log('  ✅ Trigger ready: trigger_loop_iteration_states_updated_at');
  } catch (e: any) {
    console.log(`  ⚠️  Trigger error: ${e.message}`);
  }
}

runMigration();
