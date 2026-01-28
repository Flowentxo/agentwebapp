/**
 * Create default-user directly in database
 */

import 'dotenv/config';
import { getDb } from '../lib/db/connection';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createDefaultUser() {
  console.log('[DEFAULT-USER-DB] Creating default user in database...');

  const db = getDb();

  try {
    // Check if default-user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, 'default-user'))
      .limit(1);

    if (existing.length > 0) {
      console.log('[DEFAULT-USER-DB] ✅ default-user already exists');
      console.log('[DEFAULT-USER-DB]    Email:', existing[0].email);
      console.log('[DEFAULT-USER-DB]    ID:', existing[0].id);
      process.exit(0);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('default123', 10);

    // Insert user with specific ID
    const result = await db
      .insert(users)
      .values({
        id: 'default-user',
        email: 'default@flowent.de',
        passwordHash,
        firstName: 'Default',
        lastName: 'User',
        displayName: 'Default User',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('[DEFAULT-USER-DB] ✅ default-user created successfully');
    console.log('[DEFAULT-USER-DB]    📧 Email: default@flowent.de');
    console.log('[DEFAULT-USER-DB]    🔑 Password: default123');
    console.log('[DEFAULT-USER-DB]    👤 User ID: default-user');
    console.log('[DEFAULT-USER-DB]    ✅ Email verified: true');
  } catch (error) {
    console.error('[DEFAULT-USER-DB] ❌ Failed:', error);
    throw error;
  }

  process.exit(0);
}

createDefaultUser().catch((error) => {
  console.error('[DEFAULT-USER-DB] Fatal error:', error);
  process.exit(1);
});
