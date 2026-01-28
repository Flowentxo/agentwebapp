/**
 * Fix: Add settings column to workspaces table
 * Run with: npx tsx scripts/fix-workspaces-settings.ts
 */

import { getDb } from '../lib/db';
import { sql } from 'drizzle-orm';

async function fixWorkspacesSettings() {
  console.log('Checking workspaces table for settings column...');

  try {
    const db = getDb();

    // Check if column exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workspaces'
      AND column_name = 'settings'
    `);

    if (result.rows.length === 0) {
      console.log('settings column not found. Adding it now...');

      await db.execute(sql`
        ALTER TABLE workspaces
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb NOT NULL
      `);

      console.log('✅ settings column added successfully!');
    } else {
      console.log('✅ settings column already exists.');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

fixWorkspacesSettings();
