/**
 * Run Brain AI Tabs Migrations
 * Creates tables for Business Ideas and Learning Questions
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  console.log('🔄 Running Brain AI Tabs migrations...\n');

  const db = getDb();

  try {
    // Migration 1: Brain Learning Questions
    console.log('📚 Running migration 0009_brain_learning.sql...');
    const learningMigration = fs.readFileSync(
      path.join(process.cwd(), 'lib/db/migrations/0009_brain_learning.sql'),
      'utf-8'
    );
    await db.execute(sql.raw(learningMigration));
    console.log('✅ Brain Learning tables created successfully\n');

    // Migration 2: Brain Business Ideas
    console.log('💡 Running migration 0010_brain_business_ideas.sql...');
    const ideasMigration = fs.readFileSync(
      path.join(process.cwd(), 'lib/db/migrations/0010_brain_business_ideas.sql'),
      'utf-8'
    );
    await db.execute(sql.raw(ideasMigration));
    console.log('✅ Brain Business Ideas tables created successfully\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'brain_%'
      ORDER BY table_name;
    `);

    console.log('\n📋 Brain AI tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
