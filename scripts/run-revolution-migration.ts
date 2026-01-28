/**
 * Revolution System Migration Runner
 *
 * Executes the Revolution schema migration
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres_password_local@localhost:5435/brain_ai';

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🚀 Starting Revolution System Migration...');
    console.log(`📦 Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0021_revolution_system_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('⏳ Executing migration...\n');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'revolution_%'
      OR table_name IN ('subscriptions', 'oauth_connections', 'agent_executions', 'hubspot_webhooks', 'hubspot_sync_logs', 'api_rate_limits', 'agent_use_cases')
      ORDER BY table_name;
    `);

    console.log('📊 Revolution System Tables Created:');
    result.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check category count
    const categoryCount = await pool.query('SELECT COUNT(*) FROM revolution_categories');
    console.log(`\n📁 Categories seeded: ${categoryCount.rows[0].count}`);

    // Check integration count
    const integrationCount = await pool.query('SELECT COUNT(*) FROM revolution_integrations');
    console.log(`🔗 Integrations seeded: ${integrationCount.rows[0].count}`);

    // Check use case count
    const useCaseCount = await pool.query('SELECT COUNT(*) FROM revolution_use_cases');
    console.log(`📋 Use cases seeded: ${useCaseCount.rows[0].count}\n`);

    console.log('🎉 Revolution System is ready!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Tables may already exist. This is normal if you run the migration multiple times.');
      console.log('💡 To reset, drop the tables manually or use a migration rollback script.');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
