/**
 * RUN PGVECTOR MIGRATION
 *
 * Enables pgvector extension and creates document_embeddings table
 */

import { getDb } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runPgvectorMigration() {
  console.log('🚀 Running pgvector migration...\n');

  const db = getDb();

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'lib/db/migrations/0007_pgvector_embeddings.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SQL:');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60) + '\n');

    // Execute migration
    console.log('⚡ Executing migration...\n');
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!\n');

    // Verify tables
    console.log('🔍 Verifying created tables...\n');

    const result = await db.execute(sql`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'document_embeddings'
      ORDER BY ordinal_position;
    `);

    console.log('📊 document_embeddings table structure:');
    console.table(result.rows);

    // Check indexes
    const indexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'document_embeddings';
    `);

    console.log('\n📑 Indexes created:');
    console.table(indexes.rows);

    // Check pgvector extension
    const extensions = await db.execute(sql`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector';
    `);

    console.log('\n🔌 pgvector extension:');
    console.table(extensions.rows);

    console.log('\n🎉 All done! RAG backend is ready for vector search.\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runPgvectorMigration();
