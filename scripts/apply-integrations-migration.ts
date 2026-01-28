import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function applySingleMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    // First, apply the base integrations migration (0004)
    const baseMigrationPath = path.join(process.cwd(), 'lib/db/migrations/0004_integrations.sql');
    if (fs.existsSync(baseMigrationPath)) {
      const baseSql = fs.readFileSync(baseMigrationPath, 'utf8');
      console.log('🚀 Applying migration: 0004_integrations.sql');
      await client.query(baseSql);
      console.log('✅ Base integration tables created!');
    }

    // Then apply v2 migration if exists
    const v2MigrationPath = path.join(process.cwd(), 'lib/db/migrations/0021_integrations_v2.sql');
    if (fs.existsSync(v2MigrationPath)) {
      const v2Sql = fs.readFileSync(v2MigrationPath, 'utf8');
      console.log('🚀 Applying migration: 0021_integrations_v2.sql');
      await client.query(v2Sql);
      console.log('✅ Integration v2 migration applied!');
    }

    // Verify table exists
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'oauth_connections'
    `);
    console.log('✅ oauth_connections table exists:', result.rows.length > 0);

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

applySingleMigration();
