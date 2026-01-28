/**
 * Run Custom Prompts Migration
 * Creates custom_prompts and prompt_templates tables with seed data
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { getDb } from '../lib/db/connection';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🚀 Running Custom Prompts Migration...\n');

  const db = getDb();
  const migrationPath = path.join(__dirname, '../lib/db/migrations/0016_custom_prompts.sql');

  try {
    // Read the SQL file
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('📊 Executing SQL...\n');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Created tables:');
    console.log('   - custom_prompts (user-specific prompts)');
    console.log('   - prompt_templates (template library)');
    console.log('\n📚 Seed data:');
    console.log('   - 8 prompt templates added (2 per agent)');
    console.log('   - Dexter: Professional & Friendly');
    console.log('   - Cassie: Empathetic & Efficient');
    console.log('   - Emmie: Corporate & Startup');
    console.log('   - Aura: Strategic & Creative');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);

    // Check if tables already exist
    if (error.message?.includes('already exists')) {
      console.log('\n✅ Tables already exist - migration already applied');
      process.exit(0);
    }

    process.exit(1);
  }
}

runMigration();
