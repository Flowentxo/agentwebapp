import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  try {
    const db = getDb();

    // Migration 1: Create budget tables
    console.log('📦 Step 1: Creating budget tables (0013)...');
    const migration1Path = path.join(process.cwd(), 'lib', 'db', 'migrations', '0013_user_budgets.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');
    await db.execute(sql.raw(migration1SQL));
    console.log('✅ Budget tables created');

    // Migration 2: Add rate limiting columns
    console.log('📦 Step 2: Adding rate limiting columns (0014)...');
    const migration2Path = path.join(process.cwd(), 'lib', 'db', 'migrations', '0014_rate_limiting.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf-8');
    await db.execute(sql.raw(migration2SQL));
    console.log('✅ Rate limiting columns added');

    console.log('');
    console.log('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
