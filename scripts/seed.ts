/**
 * FLOWENT AI - Database Seed Script
 *
 * Populates the database with essential initial data:
 * - Admin user account
 * - Default workspace
 * - Core agents configuration
 * - User-workspace membership
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb, closeDb, enablePgVector } from '../lib/db/connection';
import { users, userRoles, workspaces, workspaceAgents } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/crypto';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Seed configuration
const SEED_CONFIG = {
  admin: {
    email: 'admin@flowent.ai',
    password: 'password123',
    displayName: 'System Admin',
    role: 'admin' as const,
  },
  workspace: {
    name: 'Flowent HQ',
    slug: 'flowent-hq',
    description: 'Primary workspace for Flowent AI operations',
  },
  // Core agents to enable in the workspace
  coreAgents: [
    'dexter',   // Data Analyst
    'cassie',   // Customer Support
    'emmie',    // Email Manager
    'kai',      // Code Assistant
    'lex',      // Legal Advisor
    'finn',     // Finance
    'aura',     // Creative
    'nova',     // Research
  ],
};

// =====================================================
// Seed Functions
// =====================================================

async function seedAdminUser(db: ReturnType<typeof getDb>) {
  console.log('\n📦 Seeding Admin User...');

  const { email, password, displayName, role } = SEED_CONFIG.admin;

  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ✅ Admin user already exists: ${existing[0].id}`);
    return existing[0];
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate UUID
  const userId = crypto.randomUUID();

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      isActive: true,
      emailVerifiedAt: new Date(), // Auto-verify admin
      locale: 'en-US',
      timezone: 'UTC',
      theme: 'system',
    })
    .returning();

  console.log(`  ✅ Admin user created: ${newUser.id}`);

  // Assign admin role
  await db
    .insert(userRoles)
    .values({
      id: crypto.randomUUID(),
      userId: newUser.id,
      role,
    });

  console.log(`  ✅ Admin role assigned`);

  return newUser;
}

async function seedWorkspace(db: ReturnType<typeof getDb>, userId: string) {
  console.log('\n📦 Seeding Workspace...');

  const { name, slug, description } = SEED_CONFIG.workspace;

  // Check if workspace already exists for this user
  const existing = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ✅ Workspace already exists: ${existing[0].id}`);
    return existing[0];
  }

  // Create workspace
  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      userId,
      name,
      slug,
      description,
      isDefault: true,
      settings: {
        theme: 'system',
        defaultAgent: 'dexter',
        notifications: true,
      },
    })
    .returning();

  console.log(`  ✅ Workspace created: ${newWorkspace.id}`);
  console.log(`     Name: ${name}`);
  console.log(`     Slug: ${slug}`);

  return newWorkspace;
}

async function seedWorkspaceAgents(db: ReturnType<typeof getDb>, workspaceId: string) {
  console.log('\n📦 Seeding Workspace Agents...');

  let added = 0;
  let skipped = 0;

  for (const agentId of SEED_CONFIG.coreAgents) {
    // Check if agent already linked
    const existing = await db
      .select()
      .from(workspaceAgents)
      .where(eq(workspaceAgents.workspaceId, workspaceId))
      .limit(100);

    const alreadyLinked = existing.some(a => a.agentId === agentId);

    if (alreadyLinked) {
      skipped++;
      continue;
    }

    // Link agent to workspace
    await db
      .insert(workspaceAgents)
      .values({
        workspaceId,
        agentId,
        enabled: true,
        config: {},
      });

    added++;
  }

  console.log(`  ✅ Agents configured: ${added} added, ${skipped} already linked`);
}

// =====================================================
// Main Seed Function
// =====================================================

async function seed() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           FLOWENT AI - Database Seed Script                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('\n❌ DATABASE_URL environment variable is not set');
    console.log('   Please set DATABASE_URL or create a .env.local file');
    process.exit(1);
  }

  console.log(`\n🔌 Connecting to database...`);
  console.log(`   URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password

  try {
    const db = getDb();

    // Test connection
    const testResult = await db.execute('SELECT 1 as test');
    console.log('   ✅ Database connection successful');

    // Enable pgvector extension
    console.log('\n📦 Enabling pgvector extension...');
    try {
      await enablePgVector();
    } catch (err) {
      console.log('   ⚠️  pgvector may already be enabled or not available');
    }

    // Seed data
    const adminUser = await seedAdminUser(db);
    const workspace = await seedWorkspace(db, adminUser.id);
    await seedWorkspaceAgents(db, workspace.id);

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SEED COMPLETE                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n🎉 Database seeded successfully!\n');
    console.log('   Login credentials:');
    console.log(`   📧 Email:    ${SEED_CONFIG.admin.email}`);
    console.log(`   🔐 Password: ${SEED_CONFIG.admin.password}`);
    console.log(`   🏢 Workspace: ${SEED_CONFIG.workspace.name}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
    console.log('🔌 Database connection closed\n');
  }
}

// Run seed
seed();
