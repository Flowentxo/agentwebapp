import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    const db = getDb();
    const migrationPath = path.join(process.cwd(), 'lib', 'db', 'migrations', '0015_model_preferences.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📦 Applying migration: 0015_model_preferences.sql');

    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Model preferences migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
