import { getDb } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Checking for billing_transactions table...');
    const db = getDb();
    
    // Create the table directly using raw SQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar(255) NOT NULL,
        package_id varchar(50) NOT NULL,
        amount numeric(10, 2) NOT NULL,
        tokens integer,
        status varchar(20) NOT NULL DEFAULT 'completed',
        payment_method varchar(50),
        transaction_id varchar(100),
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    
    console.log('✅ Billing table ensured successfully.');
  } catch (error) {
    console.error('❌ Failed to ensure billing table:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
