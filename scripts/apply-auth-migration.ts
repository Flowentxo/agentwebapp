/**
 * Apply auth migration to the database
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('Connecting to database...');
  console.log('URL:', databaseUrl.substring(0, 40) + '...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if users table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    const usersExists = checkResult.rows[0].exists;
    console.log('Users table exists:', usersExists);

    if (!usersExists) {
      console.log('Creating users table and auth schema...');

      // Read the migration file
      const migrationPath = resolve(process.cwd(), 'lib/db/migrations/20251024_auth.sql');
      const migrationSql = readFileSync(migrationPath, 'utf-8');

      // Execute the migration
      await pool.query(migrationSql);
      console.log('Auth migration applied successfully!');
    } else {
      console.log('Users table already exists, skipping migration.');
    }

    // Check table count
    const tableCount = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = 'public';
    `);
    console.log('Total tables in public schema:', tableCount.rows[0].count);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
