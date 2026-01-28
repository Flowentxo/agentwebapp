/**
 * Fix Remaining Schema Issues
 */
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';

async function fix() {
  const db = getDb();

  // Add ip column to audit_logs
  console.log('Adding ip column to audit_logs...');
  try {
    await db.execute(sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(45)`);
    console.log('✅ audit_logs.ip added');
  } catch (e: any) {
    console.log('⏭️  ', e.message);
  }

  // Create db_connections table
  console.log('Creating db_connections table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS db_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      workspace_id UUID,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      host VARCHAR(255),
      port INTEGER,
      database VARCHAR(255),
      username VARCHAR(255),
      password TEXT,
      ssl BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'pending',
      last_tested TIMESTAMP,
      last_error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ db_connections created');

  // Verify
  const result1 = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name = 'ip'
    ) as exists
  `);
  console.log('audit_logs.ip exists:', result1.rows[0]?.exists);

  const result2 = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'db_connections'
    ) as exists
  `);
  console.log('db_connections exists:', result2.rows[0]?.exists);

  process.exit(0);
}
fix();
