import 'dotenv/config';
import { getDb } from '../lib/db';
import { sql } from 'drizzle-orm';

async function getColumns() {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'brain_documents'
    ORDER BY ordinal_position
  `);

  console.log('Columns in brain_documents table:');
  console.log(result.rows.map((r: any) => r.column_name).join(', '));
  process.exit(0);
}

getColumns();
