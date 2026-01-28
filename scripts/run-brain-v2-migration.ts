/**
 * Brain AI v2.0 - Connected Intelligence Migration Runner
 *
 * Runs migration 0043_brain_connected_intelligence.sql
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = join(
      process.cwd(),
      'lib',
      'db',
      'migrations',
      '0043_brain_connected_intelligence.sql'
    );

    console.log('📄 Reading migration file:', migrationPath);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running Brain AI v2.0 Connected Intelligence migration...');
    console.log('');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('   • brain_connected_sources (OAuth integrations)');
    console.log('   • brain_external_documents (indexed external content)');
    console.log('   • brain_external_chunks (RAG chunks)');
    console.log('   • brain_ai_usage (ISO 42001 compliance)');
    console.log('   • brain_meeting_transcripts (meeting intelligence)');
    console.log('   • brain_knowledge_edges (knowledge graph)');
    console.log('   • brain_standup_reports (standup history)');
    console.log('   • brain_writer_templates (AI Writer templates)');
    console.log('');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'brain_%'
      ORDER BY table_name;
    `;

    const result = await client.query(verifyQuery);
    console.log('');
    console.log('📋 Brain tables in database:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    client.release();
    console.log('');
    console.log('🎉 Brain AI v2.0 migration complete!');

  } catch (error: unknown) {
    const err = error as Error & { code?: string; detail?: string };
    console.error('❌ Migration failed:', err.message);

    if (err.code === '42P07') {
      console.log('ℹ️  Some tables already exist - this is OK if migration was partially run before');
    }

    if (err.detail) {
      console.error('   Detail:', err.detail);
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
