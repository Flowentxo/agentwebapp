import { getDb } from '../lib/db/connection.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('🚀 Running agent messages migration...');

  const db = getDb();
  const migrationSQL = fs.readFileSync(
    path.join(process.cwd(), 'drizzle/migrations/add_agent_messages.sql'),
    'utf-8'
  );

  try {
    await db.execute(sql.raw(migrationSQL));
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
