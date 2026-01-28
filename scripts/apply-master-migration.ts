/**
 * Apply Master Integrity Migration
 * Run with: npx tsx scripts/apply-master-migration.ts
 */
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';
import * as fs from 'fs';

async function applyMasterMigration() {
  console.log('🔧 Applying Master Integrity Migration...\n');

  const db = getDb();

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../lib/db/migrations/9999_master_integrity_migration.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('📊 Executing migration statements...\n');

    // Split by semicolons and execute each statement
    // Handle DO $$ blocks specially
    const statements: string[] = [];
    let buffer = '';
    let inDoBlock = false;

    for (const line of migrationSql.split('\n')) {
      buffer += line + '\n';

      if (line.trim().toUpperCase().startsWith('DO $$') || line.trim().toUpperCase().startsWith('DO $')) {
        inDoBlock = true;
      }

      if (inDoBlock && (line.trim() === '$$;' || line.trim().endsWith('$$ ;') || line.trim().endsWith('END $$;'))) {
        inDoBlock = false;
        statements.push(buffer.trim());
        buffer = '';
      } else if (!inDoBlock && line.includes(';') && !line.trim().startsWith('--')) {
        statements.push(buffer.trim());
        buffer = '';
      }
    }

    if (buffer.trim()) {
      statements.push(buffer.trim());
    }

    // Filter out empty statements and comments
    const validStatements = statements.filter(s => {
      const trimmed = s.trim();
      return trimmed &&
        !trimmed.startsWith('--') &&
        trimmed !== ';' &&
        trimmed.length > 5;
    });

    console.log(`📝 Found ${validStatements.length} statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const statement of validStatements) {
      try {
        // Skip pure comment blocks
        if (statement.split('\n').every(l => l.trim().startsWith('--') || l.trim() === '')) {
          skipCount++;
          continue;
        }

        await db.execute(sql.raw(statement));

        // Extract table/column name for logging
        const tableMatch = statement.match(/(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE)\s+(\w+)/i);
        const indexMatch = statement.match(/CREATE INDEX IF NOT EXISTS\s+(\w+)/i);

        if (tableMatch) {
          console.log(`✅ Table: ${tableMatch[1]}`);
        } else if (indexMatch) {
          console.log(`✅ Index: ${indexMatch[1]}`);
        } else if (statement.includes('DO $$')) {
          console.log(`✅ Anonymous block executed`);
        } else if (statement.toUpperCase().includes('UPDATE')) {
          console.log(`✅ Update executed`);
        } else if (statement.toUpperCase().includes('SELECT')) {
          console.log(`✅ Select executed`);
        }

        successCount++;
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists') ||
            error.message?.includes('duplicate') ||
            error.message?.includes('42710')) {
          console.log(`⏭️  Skipped (already exists)`);
          skipCount++;
        } else {
          console.error(`❌ Error executing statement:`, error.message);
          console.error(`   Statement preview: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`\n🎉 Master migration completed!`);

    // Verify key tables exist
    console.log('\n🔍 Verifying key tables...');

    const tables = ['users', 'sessions', 'workflows', 'calendar_events', 'inbox_threads', 'inbox_messages', 'artifacts'];

    for (const table of tables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = ${table}
          ) as exists
        `);
        const exists = result.rows[0]?.exists;
        console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      } catch (error) {
        console.log(`   ❌ ${table} (error checking)`);
      }
    }

    // Verify key columns
    console.log('\n🔍 Verifying key columns...');

    const columns = [
      { table: 'workflows', column: 'published_version' },
      { table: 'workflows', column: 'published_version_id' },
      { table: 'workflows', column: 'live_status' },
      { table: 'sessions', column: 'ip' },
    ];

    for (const { table, column } of columns) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = ${table} AND column_name = ${column}
          ) as exists
        `);
        const exists = result.rows[0]?.exists;
        console.log(`   ${exists ? '✅' : '❌'} ${table}.${column}`);
      } catch (error) {
        console.log(`   ❌ ${table}.${column} (error checking)`);
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

applyMasterMigration();
