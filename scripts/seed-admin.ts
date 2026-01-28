
import * as dotenv from 'dotenv';
import path from 'path';
import { createUser, findUserByEmail } from '../lib/auth/user';
import { closeDb } from '../lib/db/connection';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedAdmin() {
  console.log('Seeding Admin User...');
  
  try {
    const email = 'admin@agent-system.com';
    const password = 'admin123';
    
    const existing = await findUserByEmail(email);
    if (existing) {
      console.log('✅ Admin user already exists:', existing.id);
    } else {
      console.log('Creating admin user...');
      const user = await createUser({
        email,
        password,
        displayName: 'Admin User',
        isActive: true,
      });
      console.log('✅ Admin user created:', user.id);
    }
  } catch (err: any) {
    console.error('❌ Failed to seed admin:', err);
  } finally {
    await closeDb();
  }
}

seedAdmin();
