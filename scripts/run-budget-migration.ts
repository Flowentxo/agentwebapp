/**
 * Run budget migration
 */

import { getDb } from '../lib/db/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running budget migration...');

    const db = getDb();
    const sqlPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '0013_user_budgets.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute migration
    await db.execute(sql);

    console.log('✅ Budget migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
