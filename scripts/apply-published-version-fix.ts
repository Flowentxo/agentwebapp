/**
 * Script to apply the published_version column fix
 * Run with: npx tsx scripts/apply-published-version-fix.ts
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';

async function applyFix() {
  console.log('🔧 Applying published_version column fix...\n');

  const db = getDb();

  try {
    // Check if column exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workflows' AND column_name = 'published_version'
    `);

    if (checkResult.rows.length === 0) {
      console.log('📌 Adding published_version column...');
      await db.execute(sql`
        ALTER TABLE workflows ADD COLUMN published_version INTEGER DEFAULT 1
      `);
      console.log('✅ published_version column added successfully');
    } else {
      console.log('✅ published_version column already exists');
    }

    // Check for published_version_id column
    const checkIdResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workflows' AND column_name = 'published_version_id'
    `);

    if (checkIdResult.rows.length === 0) {
      console.log('📌 Adding published_version_id column...');
      await db.execute(sql`
        ALTER TABLE workflows ADD COLUMN published_version_id UUID
      `);
      console.log('✅ published_version_id column added successfully');
    } else {
      console.log('✅ published_version_id column already exists');
    }

    // Update null values
    console.log('📌 Updating NULL values to default...');
    await db.execute(sql`
      UPDATE workflows SET published_version = 1 WHERE published_version IS NULL
    `);
    console.log('✅ NULL values updated');

    // Create indexes
    console.log('📌 Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS workflow_published_version_idx ON workflows(published_version)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS workflow_published_version_id_idx ON workflows(published_version_id)
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

applyFix();
