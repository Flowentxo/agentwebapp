/**
 * Apply Execution Enum Migration
 *
 * Fixes the workflow_executions table to use proper execution_status enum
 */

import { getDb } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('='.repeat(60));
  console.log('APPLYING EXECUTION ENUM MIGRATION');
  console.log('='.repeat(60));
  console.log('');

  const db = getDb();

  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0020_fix_workflow_executions_enum.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration file: 0020_fix_workflow_executions_enum.sql');
    console.log('');

    // Execute migration
    console.log('⚙️  Executing migration...');
    console.log('');

    await db.execute(migrationSQL);

    console.log('');
    console.log('✅ Migration executed successfully!');
    console.log('');

    // Verify enum exists
    console.log('🔍 Verifying enum creation...');
    const result = await db.execute(
      `SELECT typname, enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE typname = 'execution_status'
       ORDER BY e.enumsortorder`
    );

    const rows = result.rows || result;

    if (rows && rows.length > 0) {
      console.log('✅ execution_status enum found with values:');
      rows.forEach((row: any) => {
        console.log(`   - ${row.enumlabel}`);
      });
    } else {
      console.log('⚠️  Warning: Could not verify enum values');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

applyMigration()
  .then(() => {
    console.log('');
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
