/**
 * Apply Flow Control Migration
 *
 * Runs the 0052_advanced_flow_control.sql migration directly against PostgreSQL.
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

  console.log('🚀 Starting Flow Control Migration (Phase 1)');
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
    const migrationPath = resolve(process.cwd(), 'lib/db/migrations/0052_advanced_flow_control.sql');
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
        AND table_name IN ('execution_suspensions', 'merge_node_states', 'webhook_wait_endpoints')
    `);

    console.log(`   Found ${tableCheck.rows.length}/3 flow control tables:`);
    tableCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    if (tableCheck.rows.length < 3) {
      console.log('\n⚠️  Warning: Not all tables were created');
    } else {
      console.log('\n' + '='.repeat(50));
      console.log('✅ Phase 1 Flow Control Migration completed!');
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
  // Create enums if they don't exist
  const enums = [
    { name: 'suspension_type', values: ['timer', 'datetime', 'webhook', 'manual', 'condition'] },
    { name: 'suspension_status', values: ['pending', 'resumed', 'expired', 'cancelled', 'error'] },
    { name: 'merge_strategy', values: ['wait_all', 'wait_any', 'wait_n'] },
    { name: 'merge_data_mode', values: ['append', 'join', 'pass_through', 'deep_merge', 'keyed_merge'] },
    { name: 'storage_route', values: ['memory', 'redis', 'postgres'] },
    { name: 'wait_trigger_type', values: ['timer_elapsed', 'datetime_reached', 'webhook_received', 'manual_trigger', 'condition_met', 'timeout'] },
  ];

  for (const enumDef of enums) {
    try {
      const valuesStr = enumDef.values.map(v => `'${v}'`).join(', ');
      await client.query(`CREATE TYPE ${enumDef.name} AS ENUM (${valuesStr})`);
      console.log(`  ✅ Created enum: ${enumDef.name}`);
    } catch (e: any) {
      if (e.code === '42710') {
        console.log(`  ⏭️  Enum exists: ${enumDef.name}`);
      } else {
        throw e;
      }
    }
  }

  // Create execution_suspensions table
  try {
    await client.query(`
      CREATE TABLE execution_suspensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        node_id VARCHAR(100) NOT NULL,
        suspension_type suspension_type NOT NULL,
        status suspension_status NOT NULL DEFAULT 'pending',
        storage_route storage_route NOT NULL DEFAULT 'postgres',
        suspended_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resume_at TIMESTAMP,
        expires_at TIMESTAMP,
        resumed_at TIMESTAMP,
        execution_state JSONB NOT NULL,
        webhook_correlation_id VARCHAR(255),
        webhook_callback_url TEXT,
        resume_payload JSONB,
        trigger_type wait_trigger_type,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log(`  ✅ Created table: execution_suspensions`);
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log(`  ⏭️  Table exists: execution_suspensions`);
    } else {
      throw e;
    }
  }

  // Create merge_node_states table
  try {
    await client.query(`
      CREATE TABLE merge_node_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        merge_node_id VARCHAR(100) NOT NULL,
        strategy merge_strategy NOT NULL DEFAULT 'wait_all',
        data_mode merge_data_mode NOT NULL DEFAULT 'append',
        wait_count INTEGER,
        expected_branches INTEGER NOT NULL,
        completed_branches INTEGER NOT NULL DEFAULT 0,
        branch_data JSONB NOT NULL DEFAULT '{}',
        branch_order JSONB NOT NULL DEFAULT '[]',
        is_complete BOOLEAN NOT NULL DEFAULT FALSE,
        merged_output JSONB,
        first_branch_at TIMESTAMP,
        completed_at TIMESTAMP,
        merge_config JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(execution_id, merge_node_id)
      )
    `);
    console.log(`  ✅ Created table: merge_node_states`);
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log(`  ⏭️  Table exists: merge_node_states`);
    } else {
      throw e;
    }
  }

  // Create webhook_wait_endpoints table
  try {
    await client.query(`
      CREATE TABLE webhook_wait_endpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        suspension_id UUID NOT NULL REFERENCES execution_suspensions(id) ON DELETE CASCADE,
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        correlation_id VARCHAR(255) NOT NULL UNIQUE,
        path VARCHAR(500) NOT NULL,
        method VARCHAR(10) NOT NULL DEFAULT 'POST',
        secret_token VARCHAR(255),
        allowed_ips JSONB,
        require_auth BOOLEAN NOT NULL DEFAULT FALSE,
        response_body JSONB,
        response_headers JSONB,
        response_status_code INTEGER NOT NULL DEFAULT 200,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_hit_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log(`  ✅ Created table: webhook_wait_endpoints`);
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log(`  ⏭️  Table exists: webhook_wait_endpoints`);
    } else {
      throw e;
    }
  }

  // Create indexes (if not exists)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_suspensions_execution ON execution_suspensions(execution_id)',
    'CREATE INDEX IF NOT EXISTS idx_suspensions_workflow ON execution_suspensions(workflow_id)',
    'CREATE INDEX IF NOT EXISTS idx_suspensions_status ON execution_suspensions(status)',
    'CREATE INDEX IF NOT EXISTS idx_suspensions_resume_at ON execution_suspensions(resume_at) WHERE resume_at IS NOT NULL',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_suspensions_webhook_correlation ON execution_suspensions(webhook_correlation_id) WHERE webhook_correlation_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_merge_states_complete ON merge_node_states(is_complete)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_endpoints_correlation ON webhook_wait_endpoints(correlation_id)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_path ON webhook_wait_endpoints(path)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_wait_endpoints(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_expires ON webhook_wait_endpoints(expires_at) WHERE expires_at IS NOT NULL',
  ];

  for (const indexSql of indexes) {
    try {
      await client.query(indexSql);
      const match = indexSql.match(/INDEX (?:IF NOT EXISTS )?(\w+)/);
      if (match) console.log(`  ✅ Index ready: ${match[1]}`);
    } catch (e: any) {
      console.log(`  ⚠️  Index error: ${e.message}`);
    }
  }

  // Create trigger functions and triggers
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION update_execution_suspensions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log(`  ✅ Function ready: update_execution_suspensions_updated_at`);
  } catch (e: any) {
    console.log(`  ⚠️  Function error: ${e.message}`);
  }

  try {
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_execution_suspensions_updated_at ON execution_suspensions;
      CREATE TRIGGER trigger_execution_suspensions_updated_at
        BEFORE UPDATE ON execution_suspensions
        FOR EACH ROW
        EXECUTE FUNCTION update_execution_suspensions_updated_at()
    `);
    console.log(`  ✅ Trigger ready: trigger_execution_suspensions_updated_at`);
  } catch (e: any) {
    console.log(`  ⚠️  Trigger error: ${e.message}`);
  }

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION update_merge_node_states_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log(`  ✅ Function ready: update_merge_node_states_updated_at`);
  } catch (e: any) {
    console.log(`  ⚠️  Function error: ${e.message}`);
  }

  try {
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_merge_node_states_updated_at ON merge_node_states;
      CREATE TRIGGER trigger_merge_node_states_updated_at
        BEFORE UPDATE ON merge_node_states
        FOR EACH ROW
        EXECUTE FUNCTION update_merge_node_states_updated_at()
    `);
    console.log(`  ✅ Trigger ready: trigger_merge_node_states_updated_at`);
  } catch (e: any) {
    console.log(`  ⚠️  Trigger error: ${e.message}`);
  }
}

runMigration();
