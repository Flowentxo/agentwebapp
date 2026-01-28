/**
 * Simple Brain AI Migrations Runner
 * Uses plain pg library to run SQL migrations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  console.log('🔄 Running Brain AI Tabs migrations...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Migration 1: Brain Learning Questions
    console.log('📚 Running migration 0009_brain_learning.sql...');
    const learningMigration = fs.readFileSync(
      path.join(__dirname, '../lib/db/migrations/0009_brain_learning.sql'),
      'utf-8'
    );
    await client.query(learningMigration);
    console.log('✅ Brain Learning tables created successfully\n');

    // Migration 2: Brain Business Ideas
    console.log('💡 Running migration 0010_brain_business_ideas.sql...');
    const ideasMigration = fs.readFileSync(
      path.join(__dirname, '../lib/db/migrations/0010_brain_business_ideas.sql'),
      'utf-8'
    );
    await client.query(ideasMigration);
    console.log('✅ Brain Business Ideas tables created successfully\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'brain_%'
      ORDER BY table_name;
    `);

    console.log('\n📋 Brain AI tables:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n✅ All migrations completed successfully!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

runMigrations();
