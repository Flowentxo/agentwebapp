/**
 * Create demo-user for development
 */

import 'dotenv/config';
import { UserService } from '../server/services/UserService';

async function createDemoUser() {
  console.log('[DEMO-USER] Creating demo user...');

  const userService = UserService.getInstance();

  try {
    // Check if demo-user already exists
    const existingUser = await userService.getUserById('demo-user');
    if (existingUser) {
      console.log('[DEMO-USER] ✅ Demo user already exists');
      console.log('[DEMO-USER]    📧 Email:', existingUser.email);
      console.log('[DEMO-USER]    👤 User ID:', existingUser.id);
      return;
    }
  } catch (error) {
    // User doesn't exist, create it
  }

  // Create demo user - SECURITY: Use environment variables for sensitive data
  const demoUser = {
    id: 'demo-user',
    email: process.env.DEMO_USER_EMAIL || 'demo@example.com',
    password: process.env.DEMO_USER_PASSWORD || 'demo123',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user' as const
  };

  try {
    const created = await userService.createUser(demoUser);
    console.log('[DEMO-USER] ✅ Demo user created successfully');
    console.log('[DEMO-USER]    📧 Email:', created.email);
    console.log('[DEMO-USER]    🔑 Password: demo123');
    console.log('[DEMO-USER]    👤 User ID:', created.id);
  } catch (error) {
    console.error('[DEMO-USER] ❌ Failed to create demo user:', error);
    throw error;
  }

  // Also create default-user for backward compatibility
  try {
    const defaultUserExists = await userService.getUserById('default-user');
    if (!defaultUserExists) {
      const defaultUser = {
        id: 'default-user',
        email: process.env.DEFAULT_USER_EMAIL || 'default@example.com',
        password: process.env.DEFAULT_USER_PASSWORD || 'default123',
        firstName: 'Default',
        lastName: 'User',
        role: 'user' as const
      };

      const createdDefault = await userService.createUser(defaultUser);
      console.log('[DEFAULT-USER] ✅ Default user created successfully');
      console.log('[DEFAULT-USER]    📧 Email:', createdDefault.email);
      console.log('[DEFAULT-USER]    🔑 Password: default123');
      console.log('[DEFAULT-USER]    👤 User ID:', createdDefault.id);
    }
  } catch (error) {
    // Ignore if already exists
  }

  console.log('[DEMO-USER] ✅ All demo users ready');
  process.exit(0);
}

createDemoUser().catch((error) => {
  console.error('[DEMO-USER] Fatal error:', error);
  process.exit(1);
});
