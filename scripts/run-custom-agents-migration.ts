import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    console.log('🚀 Running custom agents migration...\n');

    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'lib',
      'db',
      'migrations',
      '0006_custom_agents.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Remove comments and split into statements
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    // Split by semicolons, handling multi-line statements properly
    const statements = cleanedSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Found ${statements.length} statements to execute\n`);

    let executedCount = 0;
    let skippedCount = 0;

    for (const statement of statements) {
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

      try {
        await client.query(statement);
        console.log(`✅ [${++executedCount}] ${preview}...`);
      } catch (error: any) {
        // Ignore errors for already existing items
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.code === '42710' // duplicate object
        ) {
          skippedCount++;
          console.log(`⚠️  [skip] ${preview}...`);
        } else {
          console.error(`❌ Failed on: ${preview}...`);
          console.error(`   Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log(`\n📊 Summary: ${executedCount} executed, ${skippedCount} skipped\n`);

    console.log('\n✅ Migration completed successfully!\n');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%agent%'
      ORDER BY table_name;
    `);

    console.log('📋 Agent-related tables in database:');
    result.rows.forEach((t: any) => {
      console.log(`  - ${t.table_name}`);
    });

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

runMigration();
