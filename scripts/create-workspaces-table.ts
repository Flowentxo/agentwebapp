/**
 * Create workspaces table
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Creating workspaces table...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✓ workspaces table created');

    // Create unique index on slug
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces (slug)');
    console.log('✓ slug index created');

    // Create a default workspace for the admin user
    const adminUser = await pool.query("SELECT id FROM users WHERE email = 'anfrage@flowent.de' LIMIT 1");
    if (adminUser.rows.length > 0) {
      const userId = adminUser.rows[0].id;
      await pool.query(`
        INSERT INTO workspaces (name, slug, description, owner_id)
        VALUES ('Default Workspace', 'default', 'Default workspace for all users', $1)
        ON CONFLICT (slug) DO NOTHING
      `, [userId]);
      console.log('✓ Default workspace created');
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }

  await pool.end();
  console.log('Done!');
}

main().catch(console.error);
