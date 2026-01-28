/**
 * Create default command preferences for default-user
 */

import 'dotenv/config';
import { getDb } from '../lib/db/connection';
import { userCommandPreferences } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function createDefaultPreferences() {
  console.log('[DEFAULT-PREFS] Creating default preferences for default-user...');

  const db = getDb();

  try {
    // Check if preferences already exist
    const existing = await db
      .select()
      .from(userCommandPreferences)
      .where(eq(userCommandPreferences.userId, 'default-user'))
      .limit(1);

    if (existing.length > 0) {
      console.log('[DEFAULT-PREFS] ✅ Preferences already exist');
      process.exit(0);
      return;
    }

    // Create default preferences
    await db
      .insert(userCommandPreferences)
      .values({ userId: 'default-user' });

    console.log('[DEFAULT-PREFS] ✅ Created default preferences successfully');
  } catch (error) {
    console.error('[DEFAULT-PREFS] ❌ Failed:', error);
    throw error;
  }

  process.exit(0);
}

createDefaultPreferences().catch((error) => {
  console.error('[DEFAULT-PREFS] Fatal error:', error);
  process.exit(1);
});
