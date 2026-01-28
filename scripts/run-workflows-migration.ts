/**
 * Workflows Migration Runner
 * Creates tables for Agent Studio workflows, templates, and executions
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runMigration() {
  console.log('🚀 Starting Agent Studio Workflows migration...');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env.local');
  }

  // Read SQL file
  const sqlPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '0004_agent_workflows.sql');
  const WORKFLOWS_SQL = fs.readFileSync(sqlPath, 'utf-8');

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('🔄 Executing SQL migration...');
    await client.query(WORKFLOWS_SQL);

    console.log('✅ Tables created successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE 'workflow%'
      )
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check templates
    const templatesResult = await client.query(`
      SELECT name, template_category
      FROM workflows
      WHERE is_template = true
      ORDER BY name
    `);

    console.log('\n📚 Default templates:');
    templatesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.name} (${row.template_category})`);
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ Connection closed');
  }
}

runMigration()
  .then(() => {
    console.log('');
    console.log('🎉 Workflows migration complete!');
    console.log('🌐 Access Visual Agent Studio at: http://localhost:3000/agents/studio');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
