// Load environment variables FIRST
import '../server/env-loader';

import { getDb } from '../lib/db';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('🔄 Running Predictive Context Engine migration...');

    const db = getDb();
    const migrationPath = path.join(
      __dirname,
      '../lib/db/migrations/0011_predictive_context.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  ✓ calendar_integrations');
    console.log('  ✓ calendar_events');
    console.log('  ✓ context_predictions');
    console.log('  ✓ meeting_briefings');
    console.log('');
    console.log('📊 Predictive Context Engine is ready!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();
