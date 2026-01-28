/**
 * Brain AI Security Seed Script
 * Seeds default roles and creates demo API keys
 *
 * Run: npx tsx scripts/seed-brain-security.ts
 */

import { getDb } from '@/lib/db';
import { brainRoles } from '@/lib/db/schema-brain-security';
import { apiKeyService } from '@/lib/brain/security/ApiKeyService';
import { DEFAULT_ROLES, BRAIN_PERMISSIONS } from '@/lib/db/schema-brain-security';
import { eq } from 'drizzle-orm';

async function seedBrainSecurity() {
  console.log('[SEED] Starting Brain AI Security Seeding...\n');

  const db = getDb();

  try {
    // 1. Seed Default Roles
    console.log('[1/2] Seeding default roles...\n');

    for (const [roleName, roleConfig] of Object.entries(DEFAULT_ROLES)) {
      console.log(`   Creating role: ${roleName}`);
      console.log(`   Description: ${roleConfig.description}`);
      console.log(`   Priority: ${roleConfig.priority}`);
      console.log(`   Permissions: ${roleConfig.permissions.length}`);

      // Check if role already exists
      const existing = await db
        .select()
        .from(brainRoles)
        .where(eq(brainRoles.name, roleName))
        .limit(1);

      if (existing.length > 0) {
        console.log(`   ⚠️  Role "${roleName}" already exists, skipping...\n`);
        continue;
      }

      await db.insert(brainRoles).values({
        name: roleName,
        description: roleConfig.description,
        permissions: roleConfig.permissions as any,
        priority: roleConfig.priority,
        isSystem: true,
        metadata: {},
      });

      console.log(`   ✅ Created role: ${roleName}\n`);
    }

    console.log('✅ Default roles seeded successfully!\n');

    // 2. Generate Demo API Keys
    console.log('[2/2] Generating demo API keys...\n');

    // Admin key
    console.log('   Generating ADMIN API key...');
    const adminKey = await apiKeyService.generateApiKey({
      name: 'Demo Admin Key',
      workspaceId: 'default-workspace',
      createdBy: 'system',
      role: 'admin',
      scopes: Object.values(BRAIN_PERMISSIONS),
      rateLimit: 1000,
      dailyLimit: 100000,
      metadata: {
        type: 'demo',
        description: 'Full admin access for development',
      },
    });

    console.log('\n   🔑 ADMIN API KEY (Save this securely!):');
    console.log(`   ${adminKey.key}\n`);
    console.log(`   Role: admin`);
    console.log(`   Rate Limit: 1000 req/min`);
    console.log(`   Daily Limit: 100,000 req/day`);
    console.log(`   Permissions: All (${Object.values(BRAIN_PERMISSIONS).length} scopes)\n`);

    // Editor key
    console.log('   Generating EDITOR API key...');
    const editorKey = await apiKeyService.generateApiKey({
      name: 'Demo Editor Key',
      workspaceId: 'default-workspace',
      createdBy: 'system',
      role: 'editor',
      scopes: [
        BRAIN_PERMISSIONS.KNOWLEDGE_READ,
        BRAIN_PERMISSIONS.KNOWLEDGE_WRITE,
        BRAIN_PERMISSIONS.CONTEXT_READ,
        BRAIN_PERMISSIONS.CONTEXT_WRITE,
        BRAIN_PERMISSIONS.ANALYTICS_READ,
      ],
      rateLimit: 200,
      dailyLimit: 20000,
      metadata: {
        type: 'demo',
        description: 'Editor access for content management',
      },
    });

    console.log('\n   🔑 EDITOR API KEY (Save this securely!):');
    console.log(`   ${editorKey.key}\n`);
    console.log(`   Role: editor`);
    console.log(`   Rate Limit: 200 req/min`);
    console.log(`   Daily Limit: 20,000 req/day`);
    console.log(`   Permissions: Read/Write (5 scopes)\n`);

    // Viewer key
    console.log('   Generating VIEWER API key...');
    const viewerKey = await apiKeyService.generateApiKey({
      name: 'Demo Viewer Key',
      workspaceId: 'default-workspace',
      createdBy: 'system',
      role: 'viewer',
      scopes: [
        BRAIN_PERMISSIONS.KNOWLEDGE_READ,
        BRAIN_PERMISSIONS.CONTEXT_READ,
        BRAIN_PERMISSIONS.ANALYTICS_READ,
      ],
      rateLimit: 100,
      dailyLimit: 10000,
      metadata: {
        type: 'demo',
        description: 'Read-only access for querying',
      },
    });

    console.log('\n   🔑 VIEWER API KEY (Save this securely!):');
    console.log(`   ${viewerKey.key}\n`);
    console.log(`   Role: viewer`);
    console.log(`   Rate Limit: 100 req/min`);
    console.log(`   Daily Limit: 10,000 req/day`);
    console.log(`   Permissions: Read-only (3 scopes)\n`);

    console.log('✅ Demo API keys generated successfully!\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 Brain AI Security Seeding Complete!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📋 Summary:');
    console.log(`   • 3 Default Roles: admin, editor, viewer`);
    console.log(`   • 3 Demo API Keys generated`);
    console.log(`   • ${Object.values(BRAIN_PERMISSIONS).length} Permission scopes defined\n`);
    console.log('⚠️  IMPORTANT: Save your API keys now!');
    console.log('   API keys are ONLY shown once during generation.');
    console.log('   Store them securely (e.g., in .env.local)\n');
    console.log('🔐 Add to .env.local:');
    console.log(`   BRAIN_API_KEY_ADMIN="${adminKey.key}"`);
    console.log(`   BRAIN_API_KEY_EDITOR="${editorKey.key}"`);
    console.log(`   BRAIN_API_KEY_VIEWER="${viewerKey.key}"\n`);
    console.log('📖 Usage Example:');
    console.log('   curl -X POST http://localhost:3000/api/brain/query \\');
    console.log(`     -H "Authorization: Bearer ${viewerKey.key}" \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"query":"What is Brain AI?"}\'\n');
    console.log('✨ Next Steps:');
    console.log('   1. Test API endpoints with generated keys');
    console.log('   2. Review audit logs in database');
    console.log('   3. Check rate limiting in Redis');
    console.log('   4. Integrate with your frontend application\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedBrainSecurity();
