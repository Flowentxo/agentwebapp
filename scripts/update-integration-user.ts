/**
 * Update integration user IDs from demo-user to actual authenticated user
 * Also cleans up duplicates
 */
import { getDb } from '../lib/db/connection';
import { integrations } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

const REAL_USER_ID = 'a7e04c60-7458-4ede-94c1-048287b3a885';

async function updateUserIds() {
  console.log('[UPDATE] Starting integration user ID update...');

  const db = getDb();

  // First, let's see all records
  const allRecords = await db.select().from(integrations);
  console.log('[UPDATE] All integration records:');
  allRecords.forEach(r => {
    console.log(`  - ID: ${r.id}, UserId: ${r.userId}, Provider: ${r.provider}, Service: ${r.service}, Status: ${r.status}`);
  });

  // Check for demo-user records
  const demoRecords = await db.select().from(integrations).where(eq(integrations.userId, 'demo-user'));
  console.log('[UPDATE] Found', demoRecords.length, 'records with demo-user');

  // Check for records that already have the real user ID
  const realUserRecords = await db.select().from(integrations).where(eq(integrations.userId, REAL_USER_ID));
  console.log('[UPDATE] Found', realUserRecords.length, 'records with real user ID');

  // If both exist, we need to delete the demo-user record (it's stale)
  if (demoRecords.length > 0 && realUserRecords.length > 0) {
    console.log('[UPDATE] Deleting stale demo-user records...');
    const deleted = await db
      .delete(integrations)
      .where(eq(integrations.userId, 'demo-user'))
      .returning();
    console.log('[UPDATE] Deleted', deleted.length, 'demo-user records');
  } else if (demoRecords.length > 0) {
    // Update demo-user to real user ID
    const result = await db
      .update(integrations)
      .set({ userId: REAL_USER_ID })
      .where(eq(integrations.userId, 'demo-user'))
      .returning();
    console.log('[UPDATE] Updated', result.length, 'records');
    result.forEach(r => {
      console.log(`  - ID: ${r.id}, Provider: ${r.provider}, Service: ${r.service}, NewUserId: ${r.userId}`);
    });
  }

  // Verify
  const afterRecords = await db.select().from(integrations);
  console.log('[UPDATE] All integration records after update:');
  afterRecords.forEach(r => {
    console.log(`  - ID: ${r.id}, UserId: ${r.userId}, Provider: ${r.provider}, Service: ${r.service}, Status: ${r.status}`);
  });

  console.log('[UPDATE] Done!');
}

updateUserIds()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('[UPDATE] Error:', e);
    process.exit(1);
  });
