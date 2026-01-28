/**
 * RESET OAUTH TOKENS SCRIPT
 *
 * This script clears all OAuth connections from the database.
 * Use this after encryption key changes to force re-authentication.
 *
 * Run with: npx tsx scripts/reset-oauth-tokens.ts
 */

import { getDb } from '../lib/db/connection';
import { oauthConnections } from '../lib/db/schema-integrations';
import { sql } from 'drizzle-orm';

async function resetOAuthTokens() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('OAUTH TOKEN RESET SCRIPT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('This will DELETE all OAuth connections from the database.');
  console.log('Users will need to re-authenticate their integrations.');
  console.log('');

  try {
    const db = getDb();

    // First, show what we're about to delete
    console.log('Checking existing OAuth connections...');
    const existingConnections = await db
      .select({
        id: oauthConnections.id,
        userId: oauthConnections.userId,
        provider: oauthConnections.provider,
        isActive: oauthConnections.isActive,
        createdAt: oauthConnections.createdAt,
      })
      .from(oauthConnections);

    if (existingConnections.length === 0) {
      console.log('');
      console.log('✅ No OAuth connections found. Database is already clean.');
      console.log('');
      return;
    }

    console.log('');
    console.log(`Found ${existingConnections.length} OAuth connection(s):`);
    console.log('');

    // Group by provider
    const byProvider: Record<string, number> = {};
    for (const conn of existingConnections) {
      byProvider[conn.provider] = (byProvider[conn.provider] || 0) + 1;
    }

    for (const [provider, count] of Object.entries(byProvider)) {
      console.log(`  - ${provider}: ${count} connection(s)`);
    }
    console.log('');

    // Delete all connections
    console.log('Deleting all OAuth connections...');
    const result = await db.delete(oauthConnections);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS: All OAuth connections have been deleted.');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Go to Settings -> Integrations in the web app');
    console.log('2. Click "Connect" for Gmail (or other providers)');
    console.log('3. Complete the OAuth flow to create new encrypted tokens');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ ERROR: Failed to reset OAuth tokens');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    if (error.message.includes('connection')) {
      console.error('HINT: Make sure your database is running and DATABASE_URL is set correctly.');
    }

    process.exit(1);
  }
}

// Run the script
resetOAuthTokens()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
