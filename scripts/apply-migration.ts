/**
 * Auto-apply database migration
 * Bypasses interactive prompts
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function applyMigration() {
  console.log('🔄 Starting automatic migration...');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment');
  }

  console.log('✅ Database URL found');

  // Create connection
  const client = new Client({
    connectionString: databaseUrl
  });

  await client.connect();
  console.log('✅ Connected to database');

  const db = drizzle(client);

  try {
    console.log('🔄 Applying migrations from lib/db/migrations...');

    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), 'lib/db/migrations')
    });

    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('✅ Connection closed');
  }
}

applyMigration()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
