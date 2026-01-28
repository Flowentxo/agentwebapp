import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function enableVector() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector Extension aktiviert');

    const result = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    console.log('Extension status:', result.rows);
  } catch (e) {
    console.error('Fehler:', e.message);
  }
  await pool.end();
}

enableVector();
