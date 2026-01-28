/**
 * FINAL SCHEMA CONSOLIDATION SCRIPT
 *
 * Fixes all missing columns identified in the Deep System Audit:
 * - workflows.published_nodes, published_edges, published_version, etc.
 * - audit_logs.ip
 * - user_known_devices.trust_revoked_at
 * - All workflow deployment fields
 *
 * Run with: npx tsx scripts/schema-consolidation-final.ts
 */
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';

async function consolidateSchema() {
  console.log('🔧 FINAL SCHEMA CONSOLIDATION\n');
  console.log('=' .repeat(60));

  const db = getDb();
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // All columns to add with their table and definition
  const columnsToAdd = [
    // Workflows - Deployment fields
    { table: 'workflows', column: 'published_nodes', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_nodes JSONB DEFAULT '[]'::jsonb` },
    { table: 'workflows', column: 'published_edges', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_edges JSONB DEFAULT '[]'::jsonb` },
    { table: 'workflows', column: 'published_version', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_version INTEGER DEFAULT 0` },
    { table: 'workflows', column: 'published_version_id', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_version_id UUID` },
    { table: 'workflows', column: 'is_published', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE` },
    { table: 'workflows', column: 'webhook_secret', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64)` },
    { table: 'workflows', column: 'require_auth', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS require_auth BOOLEAN DEFAULT TRUE` },
    { table: 'workflows', column: 'webhook_url', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500)` },
    { table: 'workflows', column: 'live_status', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS live_status VARCHAR(20) DEFAULT 'inactive'` },
    { table: 'workflows', column: 'viewport', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb` },
    { table: 'workflows', column: 'is_template', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE` },
    { table: 'workflows', column: 'template_category', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS template_category VARCHAR(50)` },
    { table: 'workflows', column: 'roi_badge', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS roi_badge VARCHAR(100)` },
    { table: 'workflows', column: 'business_benefit', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS business_benefit TEXT` },
    { table: 'workflows', column: 'complexity', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) DEFAULT 'beginner'` },
    { table: 'workflows', column: 'estimated_setup_minutes', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS estimated_setup_minutes INTEGER DEFAULT 5` },
    { table: 'workflows', column: 'is_featured', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE` },
    { table: 'workflows', column: 'download_count', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0` },
    { table: 'workflows', column: 'rating', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 0.0` },
    { table: 'workflows', column: 'rating_count', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0` },
    { table: 'workflows', column: 'icon_name', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50) DEFAULT 'Zap'` },
    { table: 'workflows', column: 'color_accent', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS color_accent VARCHAR(20) DEFAULT '#8B5CF6'` },
    { table: 'workflows', column: 'target_audience', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb` },
    { table: 'workflows', column: 'use_cases', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS use_cases JSONB DEFAULT '[]'::jsonb` },
    { table: 'workflows', column: 'production_execution_count', sql: `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS production_execution_count INTEGER DEFAULT 0` },

    // Audit logs
    { table: 'audit_logs', column: 'ip', sql: `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(45)` },
    { table: 'audit_logs', column: 'user_agent', sql: `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT` },

    // User known devices
    { table: 'user_known_devices', column: 'trust_revoked_at', sql: `ALTER TABLE user_known_devices ADD COLUMN IF NOT EXISTS trust_revoked_at TIMESTAMP` },
    { table: 'user_known_devices', column: 'is_trusted', sql: `ALTER TABLE user_known_devices ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT FALSE` },
    { table: 'user_known_devices', column: 'alert_sent_at', sql: `ALTER TABLE user_known_devices ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMP` },

    // Sessions
    { table: 'sessions', column: 'ip', sql: `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip VARCHAR(45)` },
    { table: 'sessions', column: 'user_agent', sql: `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT` },
    { table: 'sessions', column: 'device_info', sql: `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb` },
    { table: 'sessions', column: 'last_authenticated_at', sql: `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_authenticated_at TIMESTAMP DEFAULT NOW()` },

    // Workflow executions - suspension fields
    { table: 'workflow_executions', column: 'suspended_state', sql: `ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS suspended_state JSONB` },
    { table: 'workflow_executions', column: 'last_heartbeat', sql: `ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP` },
    { table: 'workflow_executions', column: 'suspended_at', sql: `ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP` },
    { table: 'workflow_executions', column: 'resume_token', sql: `ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS resume_token VARCHAR(64)` },
  ];

  console.log(`\n📋 Checking ${columnsToAdd.length} columns...\n`);

  for (const { table, column, sql: sqlStatement } of columnsToAdd) {
    try {
      // Check if column exists
      const checkResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = ${table} AND column_name = ${column}
        ) as exists
      `);

      const exists = checkResult.rows[0]?.exists;

      if (exists) {
        console.log(`⏭️  ${table}.${column} (already exists)`);
        skipCount++;
      } else {
        await db.execute(sql.raw(sqlStatement));
        console.log(`✅ ${table}.${column} (added)`);
        successCount++;
      }
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('42701')) {
        console.log(`⏭️  ${table}.${column} (already exists)`);
        skipCount++;
      } else if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
        console.log(`⚠️  ${table}.${column} (table doesn't exist - skipping)`);
        skipCount++;
      } else {
        console.log(`❌ ${table}.${column}: ${error.message}`);
        errorCount++;
      }
    }
  }

  // Create missing indexes
  console.log('\n📊 Creating indexes...\n');

  const indexesToCreate = [
    `CREATE INDEX IF NOT EXISTS workflow_is_published_idx ON workflows(is_published)`,
    `CREATE INDEX IF NOT EXISTS workflow_webhook_secret_idx ON workflows(webhook_secret)`,
    `CREATE INDEX IF NOT EXISTS workflow_live_status_idx ON workflows(live_status)`,
    `CREATE INDEX IF NOT EXISTS workflow_published_version_id_idx ON workflows(published_version_id)`,
    `CREATE INDEX IF NOT EXISTS workflow_is_featured_idx ON workflows(is_featured)`,
    `CREATE INDEX IF NOT EXISTS workflow_complexity_idx ON workflows(complexity)`,
    `CREATE INDEX IF NOT EXISTS workflow_download_count_idx ON workflows(download_count)`,
    `CREATE INDEX IF NOT EXISTS workflow_rating_idx ON workflows(rating)`,
  ];

  for (const indexSql of indexesToCreate) {
    try {
      await db.execute(sql.raw(indexSql));
      const indexName = indexSql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
      console.log(`✅ Index: ${indexName}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        const indexName = indexSql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
        console.log(`⏭️  Index: ${indexName} (already exists)`);
      } else {
        console.log(`❌ Index error: ${error.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Added: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  // Verify critical columns
  console.log('\n🔍 Verifying critical columns...\n');

  const criticalColumns = [
    { table: 'workflows', column: 'published_nodes' },
    { table: 'workflows', column: 'published_edges' },
    { table: 'workflows', column: 'is_published' },
    { table: 'workflows', column: 'live_status' },
    { table: 'audit_logs', column: 'ip' },
    { table: 'user_known_devices', column: 'trust_revoked_at' },
    { table: 'sessions', column: 'ip' },
  ];

  for (const { table, column } of criticalColumns) {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = ${table} AND column_name = ${column}
        ) as exists
      `);
      const exists = result.rows[0]?.exists;
      console.log(`   ${exists ? '✅' : '❌'} ${table}.${column}`);
    } catch (error) {
      console.log(`   ❌ ${table}.${column} (error checking)`);
    }
  }

  if (errorCount === 0) {
    console.log('\n🎉 Schema consolidation completed successfully!');
  } else {
    console.log(`\n⚠️  Schema consolidation completed with ${errorCount} errors.`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

consolidateSchema();
