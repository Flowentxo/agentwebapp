-- ============================================================================
-- SUPABASE MIGRATION SCRIPT
-- Migrates data from local Docker PostgreSQL to Supabase Cloud
-- Generated: 2025-12-30
-- ============================================================================

-- Step 1: Create ENUM types (if not exist)
DO $$ BEGIN
    CREATE TYPE custom_agent_visibility AS ENUM ('private', 'team', 'public', 'listed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE custom_agent_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_visibility AS ENUM ('private', 'team', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE template_category AS ENUM ('customer-support', 'data-analysis', 'content-generation', 'automation', 'research', 'sales', 'marketing', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_custom_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_default_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notification_prefs (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create tables

-- agent_blueprints
CREATE TABLE IF NOT EXISTS agent_blueprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    version integer DEFAULT 1 NOT NULL,
    parent_id uuid REFERENCES agent_blueprints(id) ON DELETE SET NULL,
    personality jsonb NOT NULL,
    skills jsonb NOT NULL,
    tools jsonb NOT NULL,
    integrations jsonb NOT NULL,
    system_prompt text NOT NULL,
    reasoning_style character varying(100),
    learning_mode character varying(50) NOT NULL,
    can_collaborate jsonb,
    preferred_role character varying(50),
    owner_id character varying(255) NOT NULL,
    is_public boolean DEFAULT false,
    category character varying(100),
    tags jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- agent_creation_requests
CREATE TABLE IF NOT EXISTS agent_creation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(255) NOT NULL,
    request text NOT NULL,
    analyzed_requirements jsonb,
    proposed_blueprint_id uuid REFERENCES agent_blueprints(id) ON DELETE SET NULL,
    creation_team_id uuid,
    status character varying(50) NOT NULL,
    created_agent_id uuid,
    error text,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);

-- brain_memories
CREATE TABLE IF NOT EXISTS brain_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    agent_id character varying(255) NOT NULL,
    memory_type character varying(100) NOT NULL,
    content jsonb NOT NULL,
    importance_score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    embeddings jsonb,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    importance integer DEFAULT 5 NOT NULL
);

-- brain_memory_stats
CREATE TABLE IF NOT EXISTS brain_memory_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    agent_id character varying(255) NOT NULL UNIQUE,
    total_memories integer DEFAULT 0 NOT NULL,
    avg_importance integer DEFAULT 5 NOT NULL,
    last_memory_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- brain_memory_tags
CREATE TABLE IF NOT EXISTS brain_memory_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    memory_id uuid NOT NULL REFERENCES brain_memories(id) ON DELETE CASCADE,
    tag character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

-- custom_agents
CREATE TABLE IF NOT EXISTS custom_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(500),
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    system_instructions text NOT NULL,
    model character varying(100) DEFAULT 'gpt-4o-mini'::character varying NOT NULL,
    temperature character varying(10) DEFAULT '0.7'::character varying,
    max_tokens character varying(10) DEFAULT '4000'::character varying,
    conversation_starters jsonb DEFAULT '[]'::jsonb,
    capabilities jsonb DEFAULT '{"webBrowsing": false, "customActions": false, "knowledgeBase": false, "codeInterpreter": false, "imageGeneration": false}'::jsonb,
    fallback_chain character varying(50) DEFAULT 'standard'::character varying,
    response_format character varying(50) DEFAULT 'text'::character varying,
    visibility custom_agent_visibility DEFAULT 'private'::custom_agent_visibility NOT NULL,
    status custom_agent_status DEFAULT 'draft'::custom_agent_status NOT NULL,
    created_by character varying(255) NOT NULL,
    workspace_id uuid,
    usage_count character varying(20) DEFAULT '0'::character varying,
    rating character varying(10),
    tags jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    published_at timestamp without time zone
);

-- prompt_templates
CREATE TABLE IF NOT EXISTS prompt_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    agent_id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    prompt_text text NOT NULL,
    category character varying(50),
    is_public boolean DEFAULT true,
    created_by character varying(255),
    use_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- user_budgets
CREATE TABLE IF NOT EXISTS user_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(255) NOT NULL UNIQUE,
    monthly_token_limit integer DEFAULT 1000000,
    monthly_cost_limit_usd numeric(10,2) DEFAULT 100.00,
    daily_token_limit integer DEFAULT 50000,
    daily_cost_limit_usd numeric(10,2) DEFAULT 10.00,
    max_tokens_per_request integer DEFAULT 4000,
    max_requests_per_minute integer DEFAULT 10,
    current_month_tokens integer DEFAULT 0,
    current_month_cost_usd numeric(10,6) DEFAULT 0.000000,
    current_day_tokens integer DEFAULT 0,
    current_day_cost_usd numeric(10,6) DEFAULT 0.000000,
    month_reset_at timestamp without time zone DEFAULT now() NOT NULL,
    day_reset_at timestamp without time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notify_on_threshold boolean DEFAULT true,
    notify_threshold_percent integer DEFAULT 80,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    max_requests_per_hour integer DEFAULT 50,
    max_requests_per_day integer DEFAULT 200,
    preferred_model character varying(100) DEFAULT 'gpt-4o-mini'::character varying,
    allowed_models jsonb DEFAULT '["gpt-4o-mini", "gpt-3.5-turbo"]'::jsonb
);

-- user_command_preferences
CREATE TABLE IF NOT EXISTS user_command_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL UNIQUE,
    default_view character varying(20) DEFAULT 'command-center'::character varying NOT NULL,
    show_suggestions boolean DEFAULT true NOT NULL,
    enable_voice_commands boolean DEFAULT false NOT NULL,
    compact_mode boolean DEFAULT false NOT NULL,
    pinned_commands jsonb DEFAULT '[]'::jsonb NOT NULL,
    pinned_agents jsonb DEFAULT '[]'::jsonb NOT NULL,
    favorite_intents jsonb DEFAULT '[]'::jsonb NOT NULL,
    recent_agents jsonb DEFAULT '[]'::jsonb NOT NULL,
    auto_execute_confidence real DEFAULT 0.95 NOT NULL,
    enable_context_awareness boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- user_notification_prefs
CREATE TABLE IF NOT EXISTS user_notification_prefs (
    user_id character varying(36) NOT NULL PRIMARY KEY,
    email_digest boolean DEFAULT true NOT NULL,
    product_updates boolean DEFAULT true NOT NULL,
    security_alerts boolean DEFAULT true NOT NULL,
    web_push boolean DEFAULT false NOT NULL,
    sms boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_brain_memories_agent_id ON brain_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_brain_memories_created_at ON brain_memories(created_at);
CREATE INDEX IF NOT EXISTS idx_brain_memories_memory_type ON brain_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_brain_memories_importance ON brain_memories(importance);
CREATE INDEX IF NOT EXISTS idx_brain_memories_agent_created ON brain_memories(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_brain_memories_agent_importance ON brain_memories(agent_id, importance);
CREATE INDEX IF NOT EXISTS idx_brain_memory_tags_memory_id ON brain_memory_tags(memory_id);
CREATE INDEX IF NOT EXISTS idx_brain_memory_tags_tag ON brain_memory_tags(tag);
CREATE INDEX IF NOT EXISTS idx_agent_blueprints_owner ON agent_blueprints(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_blueprints_category ON agent_blueprints(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_agent ON prompt_templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);
CREATE INDEX IF NOT EXISTS custom_agents_created_by_idx ON custom_agents(created_by);
CREATE INDEX IF NOT EXISTS custom_agents_status_idx ON custom_agents(status);
CREATE INDEX IF NOT EXISTS custom_agents_visibility_idx ON custom_agents(visibility);

-- Step 5: Create triggers
DROP TRIGGER IF EXISTS prompt_templates_updated_at ON prompt_templates;
CREATE TRIGGER prompt_templates_updated_at
    BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_custom_prompts_updated_at();

DROP TRIGGER IF EXISTS update_user_notification_prefs_updated_at ON user_notification_prefs;
CREATE TRIGGER update_user_notification_prefs_updated_at
    BEFORE UPDATE ON user_notification_prefs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete message
DO $$ BEGIN
    RAISE NOTICE 'Schema migration completed successfully!';
END $$;
