import { getDb } from '../lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runAnalyticsMigration() {
  console.log('📊 Running Analytics Migration...\n');

  try {
    const db = getDb();
    const migrationPath = join(
      __dirname,
      '../lib/db/migrations/0007_analytics.sql'
    );
    const migration = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await db.execute(migration);

    console.log('✅ Analytics migration completed successfully!\n');
    console.log('Tables created:');
    console.log('  - agent_usage_events');
    console.log('  - agent_session_summary');
    console.log('  - agent_daily_metrics');
    console.log('  - agent_performance_snapshot\n');

    console.log('Ready to track:');
    console.log('  📈 Agent usage and sessions');
    console.log('  💰 Token usage and costs');
    console.log('  ⚡ Performance metrics');
    console.log('  📊 Daily/weekly/monthly trends\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runAnalyticsMigration();
