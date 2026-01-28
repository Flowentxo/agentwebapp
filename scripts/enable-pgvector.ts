#!/usr/bin/env ts-node
/**
 * Enable pgvector extension in Neon database
 * Run: npx ts-node scripts/enable-pgvector.ts
 */

import { config } from 'dotenv';
import { Client } from 'pg';

// Load environment variables
config();

async function enablePgVector() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected successfully');

    // Check if pgvector is already enabled
    console.log('\n🔍 Checking if pgvector is installed...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as exists;
    `);

    if (checkResult.rows[0].exists) {
      console.log('✅ pgvector extension is already enabled');
    } else {
      console.log('📦 Installing pgvector extension...');
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension enabled successfully');
    }

    // Verify installation
    console.log('\n🧪 Verifying pgvector installation...');
    const versionResult = await client.query(`
      SELECT extversion FROM pg_extension WHERE extname = 'vector';
    `);

    if (versionResult.rows.length > 0) {
      console.log(`✅ pgvector version: ${versionResult.rows[0].extversion}`);
    }

    console.log('\n✨ All done! You can now run: npm run db:push');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

enablePgVector();
