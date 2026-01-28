/**
 * Brain AI Security Migration Script
 * Creates all security-related database tables
 *
 * Run: npx tsx scripts/migrate-brain-security.ts
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function migrateBrainSecurity() {
  console.log('[MIGRATION] Starting Brain AI Security Migration...\n');

  const db = getDb();

  try {
    // 1. Create brain_api_keys table
    console.log('[1/5] Creating brain_api_keys table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brain_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        key_prefix VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        agent_id VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
        rate_limit INTEGER NOT NULL DEFAULT 100,
        daily_limit INTEGER NOT NULL DEFAULT 10000,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        revoked_at TIMESTAMP,
        revoked_by VARCHAR(255),
        revoked_reason TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_brain_api_keys_key_prefix ON brain_api_keys(key_prefix);
      CREATE INDEX IF NOT EXISTS idx_brain_api_keys_workspace ON brain_api_keys(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_brain_api_keys_created_by ON brain_api_keys(created_by);
      CREATE INDEX IF NOT EXISTS idx_brain_api_keys_is_active ON brain_api_keys(is_active);
      CREATE INDEX IF NOT EXISTS idx_brain_api_keys_is_revoked ON brain_api_keys(is_revoked);
    `);
    console.log('✅ brain_api_keys table created\n');

    // 2. Create brain_rate_limit_logs table
    console.log('[2/5] Creating brain_rate_limit_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brain_rate_limit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier VARCHAR(255) NOT NULL,
        identifier_type VARCHAR(50) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        limit_type VARCHAR(50) NOT NULL,
        limit_value INTEGER NOT NULL,
        current_count INTEGER NOT NULL,
        was_blocked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_brain_rate_limit_logs_identifier ON brain_rate_limit_logs(identifier);
      CREATE INDEX IF NOT EXISTS idx_brain_rate_limit_logs_created_at ON brain_rate_limit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_brain_rate_limit_logs_was_blocked ON brain_rate_limit_logs(was_blocked);
    `);
    console.log('✅ brain_rate_limit_logs table created\n');

    // 3. Create brain_roles table
    console.log('[3/5] Creating brain_roles table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brain_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        priority INTEGER NOT NULL DEFAULT 0,
        is_system BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_brain_roles_name ON brain_roles(name);
      CREATE INDEX IF NOT EXISTS idx_brain_roles_priority ON brain_roles(priority);
    `);
    console.log('✅ brain_roles table created\n');

    // 4. Create brain_user_roles table
    console.log('[4/5] Creating brain_user_roles table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brain_user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        role_id UUID NOT NULL REFERENCES brain_roles(id) ON DELETE CASCADE,
        workspace_id VARCHAR(255) NOT NULL,
        granted_by VARCHAR(255),
        expires_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, role_id, workspace_id)
      );

      CREATE INDEX IF NOT EXISTS idx_brain_user_roles_user_id ON brain_user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_brain_user_roles_workspace_id ON brain_user_roles(workspace_id);
    `);
    console.log('✅ brain_user_roles table created\n');

    // 5. Create brain_audit_logs table
    console.log('[5/5] Creating brain_audit_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brain_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255),
        agent_id VARCHAR(255),
        api_key_id UUID,
        ip_address VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        workspace_id VARCHAR(255),
        endpoint VARCHAR(255),
        method VARCHAR(10),
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_brain_audit_logs_user_id ON brain_audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_brain_audit_logs_agent_id ON brain_audit_logs(agent_id);
      CREATE INDEX IF NOT EXISTS idx_brain_audit_logs_workspace_id ON brain_audit_logs(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_brain_audit_logs_action ON brain_audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_brain_audit_logs_created_at ON brain_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_brain_audit_logs_success ON brain_audit_logs(success);
    `);
    console.log('✅ brain_audit_logs table created\n');

    console.log('🎉 All security tables created successfully!');
    console.log('\n✨ Next steps:');
    console.log('   1. Run seed script: npx tsx scripts/seed-brain-security.ts');
    console.log('   2. Generate your first API key');
    console.log('   3. Update your application to use secured endpoints\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateBrainSecurity();
