/**
 * Safe Revolution System Migration
 *
 * Executes migration with IF NOT EXISTS checks
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres_password_local@localhost:5435/brain_ai';

async function safeMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🚀 Starting Safe Revolution System Migration...\n');

    // Create enums with IF NOT EXISTS
    console.log('📦 Creating enums...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trial');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE integration_type AS ENUM ('oauth', 'api_key', 'webhook');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'timeout');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE webhook_status AS ENUM ('active', 'inactive', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Enums created\n');

    // Create revolution_categories
    console.log('📁 Creating revolution_categories...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revolution_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(7) DEFAULT '#3B82F6',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS revolution_categories_slug_idx ON revolution_categories(slug);
      CREATE INDEX IF NOT EXISTS revolution_categories_active_idx ON revolution_categories(is_active);
    `);

    // Seed categories
    const categoryCount = await pool.query('SELECT COUNT(*) FROM revolution_categories');
    if (categoryCount.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO revolution_categories (name, slug, description, icon, color, display_order) VALUES
        ('Sales', 'sales', 'Automate sales processes, lead qualification, and customer outreach', '🎯', '#ec4899', 1),
        ('Support', 'support', 'Handle customer support tickets, FAQs, and escalations', '💬', '#3b82f6', 2),
        ('Operations', 'operations', 'Streamline workflows, data processing, and automation', '⚙️', '#8b5cf6', 3),
        ('Marketing', 'marketing', 'Create content, analyze campaigns, and engage audiences', '📣', '#f59e0b', 4),
        ('HR', 'hr', 'Manage recruiting, onboarding, and employee support', '👥', '#a855f7', 5),
        ('Finance', 'finance', 'Process invoices, track expenses, and generate reports', '💰', '#10b981', 6);
      `);
      console.log('✅ Categories seeded');
    } else {
      console.log('ℹ️  Categories already exist');
    }

    // Create revolution_use_cases
    console.log('\n📋 Creating revolution_use_cases...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revolution_use_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES revolution_categories(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL,
        description TEXT,
        prompt_template TEXT,
        required_capabilities JSONB DEFAULT '[]'::jsonb,
        suggested_integrations JSONB DEFAULT '[]'::jsonb,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS revolution_use_cases_category_idx ON revolution_use_cases(category_id);
      CREATE INDEX IF NOT EXISTS revolution_use_cases_slug_idx ON revolution_use_cases(slug);
      CREATE INDEX IF NOT EXISTS revolution_use_cases_active_idx ON revolution_use_cases(is_active);
    `);

    // Seed use cases
    const useCaseCount = await pool.query('SELECT COUNT(*) FROM revolution_use_cases');
    if (useCaseCount.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO revolution_use_cases (category_id, name, slug, description, prompt_template, required_capabilities, display_order)
        SELECT
          id,
          'Lead Qualification',
          'lead-qualification',
          'Automatically qualify inbound leads and score them',
          'You are a lead qualification specialist. Evaluate leads based on: budget, authority, need, and timeline (BANT). Score each lead from 1-10.',
          '["webBrowsing", "customActions"]'::jsonb,
          1
        FROM revolution_categories WHERE slug = 'sales';

        INSERT INTO revolution_use_cases (category_id, name, slug, description, prompt_template, required_capabilities, display_order)
        SELECT
          id,
          'Follow-up Automation',
          'follow-up-automation',
          'Send personalized follow-up emails to prospects',
          'You are a sales follow-up specialist. Create personalized, engaging follow-up emails that maintain rapport and move deals forward.',
          '["customActions"]'::jsonb,
          2
        FROM revolution_categories WHERE slug = 'sales';

        INSERT INTO revolution_use_cases (category_id, name, slug, description, prompt_template, required_capabilities, display_order)
        SELECT
          id,
          'Ticket Management',
          'ticket-management',
          'Automatically categorize and route support tickets',
          'You are a customer support agent. Categorize tickets by urgency (high/medium/low) and type (technical/billing/general). Route to appropriate teams.',
          '["knowledgeBase", "customActions"]'::jsonb,
          1
        FROM revolution_categories WHERE slug = 'support';
      `);
      console.log('✅ Use cases seeded');
    } else {
      console.log('ℹ️  Use cases already exist');
    }

    // Create revolution_integrations
    console.log('\n🔗 Creating revolution_integrations...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revolution_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        provider VARCHAR(100) NOT NULL,
        type integration_type NOT NULL,
        icon VARCHAR(500),
        logo_url VARCHAR(500),
        auth_config JSONB NOT NULL,
        capabilities JSONB DEFAULT '[]'::jsonb,
        doc_url VARCHAR(500),
        setup_instructions TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_popular BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS revolution_integrations_slug_idx ON revolution_integrations(slug);
      CREATE INDEX IF NOT EXISTS revolution_integrations_provider_idx ON revolution_integrations(provider);
      CREATE INDEX IF NOT EXISTS revolution_integrations_active_idx ON revolution_integrations(is_active);
    `);

    // Seed integrations
    const integrationCount = await pool.query('SELECT COUNT(*) FROM revolution_integrations');
    if (integrationCount.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO revolution_integrations (name, slug, description, provider, type, icon, auth_config, is_popular, display_order) VALUES
        ('HubSpot CRM', 'hubspot', 'Sync contacts, deals, and automate CRM workflows', 'hubspot', 'oauth', '🔗', '{"authType": "oauth", "authUrl": "https://app.hubspot.com/oauth/authorize", "tokenUrl": "https://api.hubapi.com/oauth/v1/token", "scopes": ["crm.objects.contacts.read", "crm.objects.contacts.write"]}'::jsonb, true, 1),
        ('Google Calendar', 'google-calendar', 'Schedule meetings and manage calendar events', 'google', 'oauth', '📅', '{"authType": "oauth", "authUrl": "https://accounts.google.com/o/oauth2/v2/auth", "tokenUrl": "https://oauth2.googleapis.com/token", "scopes": ["https://www.googleapis.com/auth/calendar.events"]}'::jsonb, true, 2),
        ('Slack', 'slack', 'Send notifications and messages to Slack channels', 'slack', 'webhook', '💬', '{"authType": "webhook", "requiredKeys": ["webhookUrl"]}'::jsonb, true, 3),
        ('Zapier', 'zapier', 'Connect to 5000+ apps via Zapier webhooks', 'zapier', 'webhook', '⚡', '{"authType": "webhook", "requiredKeys": ["webhookUrl"]}'::jsonb, false, 4);
      `);
      console.log('✅ Integrations seeded');
    } else {
      console.log('ℹ️  Integrations already exist');
    }

    // Create remaining tables
    console.log('\n🔧 Creating remaining tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_use_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL REFERENCES custom_agents(id) ON DELETE CASCADE,
        use_case_id UUID NOT NULL REFERENCES revolution_use_cases(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS agent_use_cases_agent_idx ON agent_use_cases(agent_id);
      CREATE INDEX IF NOT EXISTS agent_use_cases_use_case_idx ON agent_use_cases(use_case_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan subscription_plan NOT NULL DEFAULT 'free',
        status subscription_status NOT NULL DEFAULT 'active',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        stripe_price_id VARCHAR(255),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT false,
        trial_start TIMESTAMP,
        trial_end TIMESTAMP,
        agent_limit INTEGER NOT NULL DEFAULT 3,
        execution_limit INTEGER NOT NULL DEFAULT 100,
        agents_created INTEGER NOT NULL DEFAULT 0,
        executions_this_month INTEGER NOT NULL DEFAULT 0,
        last_reset_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
    `);

    // Create default subscriptions for existing users
    const existingUsers = await pool.query('SELECT id FROM users');
    for (const user of existingUsers.rows) {
      await pool.query(`
        INSERT INTO subscriptions (user_id, plan, status, agent_limit, execution_limit)
        VALUES ($1, 'free', 'active', 3, 100)
        ON CONFLICT DO NOTHING
      `, [user.id]);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL REFERENCES custom_agents(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id VARCHAR(255) NOT NULL UNIQUE,
        status execution_status NOT NULL DEFAULT 'pending',
        input JSONB NOT NULL,
        output JSONB,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        execution_time_ms INTEGER,
        tokens_used INTEGER,
        cost VARCHAR(20),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS agent_executions_agent_id_idx ON agent_executions(agent_id);
      CREATE INDEX IF NOT EXISTS agent_executions_user_id_idx ON agent_executions(user_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hubspot_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agent_id UUID REFERENCES custom_agents(id) ON DELETE CASCADE,
        hubspot_portal_id VARCHAR(255) NOT NULL,
        subscription_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        object_type VARCHAR(100) NOT NULL,
        property_name VARCHAR(255),
        status webhook_status NOT NULL DEFAULT 'active',
        last_triggered_at TIMESTAMP,
        trigger_count INTEGER DEFAULT 0,
        last_error TEXT,
        error_count INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hubspot_sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agent_id UUID REFERENCES custom_agents(id) ON DELETE CASCADE,
        operation VARCHAR(100) NOT NULL,
        object_type VARCHAR(100) NOT NULL,
        object_id VARCHAR(255),
        request JSONB,
        response JSONB,
        success BOOLEAN NOT NULL,
        status_code INTEGER,
        error_message TEXT,
        execution_time_ms INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint VARCHAR(255) NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 1,
        window_start TIMESTAMP NOT NULL,
        window_end TIMESTAMP NOT NULL,
        is_blocked BOOLEAN DEFAULT false,
        blocked_until TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ All tables created\n');

    // Verify
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE 'revolution_%' OR table_name IN ('subscriptions', 'agent_executions', 'hubspot_webhooks', 'hubspot_sync_logs', 'api_rate_limits', 'agent_use_cases'))
      ORDER BY table_name;
    `);

    console.log('📊 Revolution System Tables:');
    result.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    const newCategoryCount = await pool.query('SELECT COUNT(*) FROM revolution_categories');
    const newIntegrationCount = await pool.query('SELECT COUNT(*) FROM revolution_integrations');
    const newUseCaseCount = await pool.query('SELECT COUNT(*) FROM revolution_use_cases');

    console.log(`\n📁 Categories: ${newCategoryCount.rows[0].count}`);
    console.log(`🔗 Integrations: ${newIntegrationCount.rows[0].count}`);
    console.log(`📋 Use Cases: ${newUseCaseCount.rows[0].count}\n`);

    console.log('🎉 Revolution System Migration Complete!\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

safeMigration();
