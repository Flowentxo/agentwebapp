/**
 * Admin API: Fix Database Schema
 * Adds missing columns and tables to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    console.log('🔧 Starting database schema fix...');

    const pool = getPool();
    const client = await pool.connect();

    const results: string[] = [];

    results.push('✅ Connected to PostgreSQL');

    // Check if brain_memories table exists
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memories'
    `);

    if (tableCheck.rows.length === 0) {
      results.push('⚠️  Table brain_memories does not exist. Creating...');

      await client.query(`
        CREATE TABLE "brain_memories" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "agent_id" varchar(255) NOT NULL,
          "context" jsonb NOT NULL,
          "embeddings" jsonb,
          "tags" jsonb DEFAULT '[]' NOT NULL,
          "importance" integer DEFAULT 5 NOT NULL,
          "expires_at" timestamp,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      results.push('✅ Table brain_memories created');
    } else {
      results.push('✅ Table brain_memories exists. Checking columns...');

      // Get all columns
      const columnsCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'brain_memories'
      `);

      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      results.push(`   Existing columns: ${existingColumns.join(', ')}`);

      // Check and add missing columns
      const requiredColumns: Record<string, string> = {
        'context': 'jsonb NOT NULL DEFAULT \'{}\'::jsonb',
        'embeddings': 'jsonb',
        'tags': 'jsonb DEFAULT \'[]\'::jsonb NOT NULL',
        'importance': 'integer DEFAULT 5 NOT NULL',
        'expires_at': 'timestamp',
      };

      for (const [columnName, columnDef] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(columnName)) {
          results.push(`⚠️  Column "${columnName}" missing. Adding...`);
          try {
            await client.query(`
              ALTER TABLE "brain_memories"
              ADD COLUMN "${columnName}" ${columnDef};
            `);
            results.push(`✅ Column "${columnName}" added`);
          } catch (err) {
            results.push(`❌ Failed to add "${columnName}": ${err instanceof Error ? err.message : 'unknown'}`);
          }
        } else {
          results.push(`✅ Column "${columnName}" exists`);
        }
      }
    }

    // Check if brain_memory_tags table exists
    const tagsTableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memory_tags'
    `);

    if (tagsTableCheck.rows.length === 0) {
      results.push('⚠️  Table brain_memory_tags does not exist. Creating...');

      await client.query(`
        CREATE TABLE "brain_memory_tags" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "memory_id" uuid NOT NULL,
          "tag" varchar(100) NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "brain_memory_tags_memory_id_fkey"
          FOREIGN KEY ("memory_id")
          REFERENCES "brain_memories"("id")
          ON DELETE CASCADE
        );
      `);

      results.push('✅ Table brain_memory_tags created');
    } else {
      results.push('✅ Table brain_memory_tags exists');
    }

    // Check if brain_memory_stats table exists
    const statsTableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'brain_memory_stats'
    `);

    if (statsTableCheck.rows.length === 0) {
      results.push('⚠️  Table brain_memory_stats does not exist. Creating...');

      await client.query(`
        CREATE TABLE "brain_memory_stats" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "agent_id" varchar(255) NOT NULL UNIQUE,
          "total_memories" integer DEFAULT 0 NOT NULL,
          "avg_importance" integer DEFAULT 5 NOT NULL,
          "last_memory_at" timestamp,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      results.push('✅ Table brain_memory_stats created');
    } else {
      results.push('✅ Table brain_memory_stats exists');
    }

    // Create indices
    results.push('📊 Creating/checking indices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_id" ON "brain_memories"("agent_id")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_created_at" ON "brain_memories"("created_at")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_importance" ON "brain_memories"("importance")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_expires_at" ON "brain_memories"("expires_at")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_created" ON "brain_memories"("agent_id", "created_at")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memories_agent_importance" ON "brain_memories"("agent_id", "importance")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_id" ON "brain_memory_tags"("memory_id")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_tag" ON "brain_memory_tags"("tag")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_tags_memory_tag" ON "brain_memory_tags"("memory_id", "tag")',
      'CREATE INDEX IF NOT EXISTS "idx_brain_memory_stats_agent_id" ON "brain_memory_stats"("agent_id")',
    ];

    for (const indexQuery of indices) {
      await client.query(indexQuery);
    }
    results.push('✅ All indices created/verified');

    client.release();

    results.push('🎉 Database schema fixed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Database schema fixed successfully',
      results,
    });

  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
