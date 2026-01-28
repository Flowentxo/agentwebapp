--
-- PostgreSQL database dump
--

\restrict FzSqqFcb4q0TAmjEJwTobuVfz9Wz1Nlr2LsBmkZpZakqwGeNrs6CFXRdo88GFM0

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg12+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_blueprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_blueprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    version integer DEFAULT 1 NOT NULL,
    parent_id uuid,
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


--
-- Name: TABLE agent_blueprints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_blueprints IS 'Agent design templates - the DNA of agents';


--
-- Name: agent_creation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_creation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    request text NOT NULL,
    analyzed_requirements jsonb,
    proposed_blueprint_id uuid,
    creation_team_id uuid,
    status character varying(50) NOT NULL,
    created_agent_id uuid,
    error text,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


--
-- Name: brain_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brain_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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


--
-- Name: brain_memory_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brain_memory_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id character varying(255) NOT NULL,
    total_memories integer DEFAULT 0 NOT NULL,
    avg_importance integer DEFAULT 5 NOT NULL,
    last_memory_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: brain_memory_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brain_memory_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memory_id uuid NOT NULL,
    tag character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(500),
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    system_instructions text NOT NULL,
    model character varying(100) DEFAULT 'gpt-5.1'::character varying NOT NULL,
    temperature character varying(10) DEFAULT '0.7'::character varying,
    max_tokens character varying(10) DEFAULT '4000'::character varying,
    conversation_starters jsonb DEFAULT '[]'::jsonb,
    capabilities jsonb DEFAULT '{"webBrowsing": false, "customActions": false, "knowledgeBase": false, "codeInterpreter": false, "imageGeneration": false}'::jsonb,
    fallback_chain character varying(50) DEFAULT 'standard'::character varying,
    response_format character varying(50) DEFAULT 'text'::character varying,
    visibility public.custom_agent_visibility DEFAULT 'private'::public.custom_agent_visibility NOT NULL,
    status public.custom_agent_status DEFAULT 'draft'::public.custom_agent_status NOT NULL,
    created_by character varying(255) NOT NULL,
    workspace_id uuid,
    usage_count character varying(20) DEFAULT '0'::character varying,
    rating character varying(10),
    tags jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    published_at timestamp without time zone
);


--
-- Name: prompt_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id character varying(36) NOT NULL,
    token_hash character varying(64) NOT NULL,
    user_agent text,
    ip character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT sessions_token_hash_length CHECK ((length((token_hash)::text) = 64))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sessions IS 'Secure session storage; token_hash is SHA-256 of cookie token';


--
-- Name: COLUMN sessions.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.token_hash IS 'SHA-256 hash of session token (never store plaintext)';


--
-- Name: COLUMN sessions.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.expires_at IS 'Session TTL from AUTH_SESSION_TTL_DAYS env variable';


--
-- Name: COLUMN sessions.revoked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.revoked_at IS 'NULL if active, timestamp when revoked (logout/security)';


--
-- Name: user_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
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


--
-- Name: COLUMN user_budgets.max_requests_per_hour; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_budgets.max_requests_per_hour IS 'Maximum AI requests allowed per hour (sliding window)';


--
-- Name: COLUMN user_budgets.max_requests_per_day; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_budgets.max_requests_per_day IS 'Maximum AI requests allowed per day (sliding window)';


--
-- Name: COLUMN user_budgets.preferred_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_budgets.preferred_model IS 'Users default AI model for chat';


--
-- Name: COLUMN user_budgets.allowed_models; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_budgets.allowed_models IS 'List of models the user is allowed to use based on their tier';


--
-- Name: user_command_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_command_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(36) NOT NULL,
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


--
-- Name: user_notification_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_prefs (
    user_id character varying(36) NOT NULL,
    email_digest boolean DEFAULT true NOT NULL,
    product_updates boolean DEFAULT true NOT NULL,
    security_alerts boolean DEFAULT true NOT NULL,
    web_push boolean DEFAULT false NOT NULL,
    sms boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_notification_prefs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_notification_prefs IS 'User notification preferences (email, push, SMS)';


--
-- Name: COLUMN user_notification_prefs.email_digest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_notification_prefs.email_digest IS 'Receive email digests';


--
-- Name: COLUMN user_notification_prefs.product_updates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_notification_prefs.product_updates IS 'Receive product update notifications';


--
-- Name: COLUMN user_notification_prefs.security_alerts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_notification_prefs.security_alerts IS 'Receive security alerts (always recommended)';


--
-- Name: COLUMN user_notification_prefs.web_push; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_notification_prefs.web_push IS 'Enable web push notifications';


--
-- Name: COLUMN user_notification_prefs.sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_notification_prefs.sms IS 'Enable SMS notifications';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp with time zone,
    password_hash character varying(255) NOT NULL,
    display_name character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    avatar_url text,
    bio text,
    locale text DEFAULT 'de-DE'::text NOT NULL,
    timezone text DEFAULT 'Europe/Berlin'::text NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    pronouns text,
    location text,
    org_title text,
    accessibility jsonb DEFAULT '{}'::jsonb NOT NULL,
    comm_prefs jsonb DEFAULT '{}'::jsonb NOT NULL,
    privacy_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret text,
    mfa_recovery_codes text,
    CONSTRAINT users_display_name_length CHECK (((display_name IS NULL) OR (length((display_name)::text) >= 1))),
    CONSTRAINT users_email_length CHECK ((length((email)::text) >= 3)),
    CONSTRAINT users_locale_length CHECK (((length(locale) >= 2) AND (length(locale) <= 10))),
    CONSTRAINT users_theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text]))),
    CONSTRAINT users_timezone_length CHECK (((length(timezone) >= 3) AND (length(timezone) <= 50)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Core user accounts with secure password storage';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS 'Unique email address (case-insensitive)';


--
-- Name: COLUMN users.email_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email_verified_at IS 'NULL if email not verified, timestamp when verified';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Argon2id or bcrypt hash (never store plaintext)';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_active IS 'Soft-delete flag; inactive users cannot login';


--
-- Name: COLUMN users.avatar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.avatar_url IS 'URL to user avatar image (S3 or local path)';


--
-- Name: COLUMN users.bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.bio IS 'User biography/description';


--
-- Name: COLUMN users.locale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.locale IS 'User preferred locale (e.g., de-DE, en-US)';


--
-- Name: COLUMN users.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.timezone IS 'User timezone (e.g., Europe/Berlin)';


--
-- Name: COLUMN users.theme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.theme IS 'UI theme preference: light, dark, or system';


--
-- Name: COLUMN users.pronouns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.pronouns IS 'User pronouns (e.g., she/her, he/him, they/them)';


--
-- Name: COLUMN users.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.location IS 'User location/city';


--
-- Name: COLUMN users.org_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.org_title IS 'Organization title/role';


--
-- Name: COLUMN users.accessibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.accessibility IS 'Accessibility preferences: {reduceMotion, highContrast, fontScale}';


--
-- Name: COLUMN users.comm_prefs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.comm_prefs IS 'Communication preferences (legacy, use user_notification_prefs)';


--
-- Name: COLUMN users.privacy_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.privacy_settings IS 'Privacy settings: {directoryOptOut, dataSharing, searchVisibility}';


--
-- Name: COLUMN users.mfa_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.mfa_enabled IS 'Whether MFA/2FA is enabled';


--
-- Name: COLUMN users.mfa_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.mfa_secret IS 'Encrypted TOTP secret for MFA';


--
-- Name: COLUMN users.mfa_recovery_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.mfa_recovery_codes IS 'Encrypted recovery codes (CSV or JSON)';


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    edges jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.workflow_status DEFAULT 'draft'::public.workflow_status NOT NULL,
    visibility public.workflow_visibility DEFAULT 'private'::public.workflow_visibility NOT NULL,
    is_template boolean DEFAULT false NOT NULL,
    template_category public.template_category,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    user_id character varying(255) NOT NULL,
    workspace_id character varying(255),
    version character varying(50) DEFAULT '1.0.0'::character varying NOT NULL,
    parent_workflow_id uuid,
    execution_count jsonb DEFAULT '0'::jsonb NOT NULL,
    last_executed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    published_at timestamp without time zone
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id character varying DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    slug character varying NOT NULL,
    icon_url text,
    is_default boolean DEFAULT false,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_blueprints agent_blueprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_blueprints
    ADD CONSTRAINT agent_blueprints_pkey PRIMARY KEY (id);


--
-- Name: agent_creation_requests agent_creation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_creation_requests
    ADD CONSTRAINT agent_creation_requests_pkey PRIMARY KEY (id);


--
-- Name: brain_memories brain_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_memories
    ADD CONSTRAINT brain_memories_pkey PRIMARY KEY (id);


--
-- Name: brain_memory_stats brain_memory_stats_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_memory_stats
    ADD CONSTRAINT brain_memory_stats_agent_id_key UNIQUE (agent_id);


--
-- Name: brain_memory_stats brain_memory_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_memory_stats
    ADD CONSTRAINT brain_memory_stats_pkey PRIMARY KEY (id);


--
-- Name: brain_memory_tags brain_memory_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_memory_tags
    ADD CONSTRAINT brain_memory_tags_pkey PRIMARY KEY (id);


--
-- Name: custom_agents custom_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_agents
    ADD CONSTRAINT custom_agents_pkey PRIMARY KEY (id);


--
-- Name: prompt_templates prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_templates
    ADD CONSTRAINT prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: user_budgets user_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_budgets
    ADD CONSTRAINT user_budgets_pkey PRIMARY KEY (id);


--
-- Name: user_budgets user_budgets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_budgets
    ADD CONSTRAINT user_budgets_user_id_key UNIQUE (user_id);


--
-- Name: user_command_preferences user_command_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_command_preferences
    ADD CONSTRAINT user_command_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_command_preferences user_command_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_command_preferences
    ADD CONSTRAINT user_command_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_notification_prefs user_notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_prefs
    ADD CONSTRAINT user_notification_prefs_pkey PRIMARY KEY (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: custom_agents_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX custom_agents_created_at_idx ON public.custom_agents USING btree (created_at DESC);


--
-- Name: custom_agents_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX custom_agents_created_by_idx ON public.custom_agents USING btree (created_by);


--
-- Name: custom_agents_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX custom_agents_status_idx ON public.custom_agents USING btree (status);


--
-- Name: custom_agents_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX custom_agents_visibility_idx ON public.custom_agents USING btree (visibility);


--
-- Name: custom_agents_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX custom_agents_workspace_id_idx ON public.custom_agents USING btree (workspace_id);


--
-- Name: idx_agent_blueprints_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_blueprints_category ON public.agent_blueprints USING btree (category);


--
-- Name: idx_agent_blueprints_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_blueprints_owner ON public.agent_blueprints USING btree (owner_id);


--
-- Name: idx_agent_blueprints_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_blueprints_public ON public.agent_blueprints USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_agent_creation_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_creation_requests_status ON public.agent_creation_requests USING btree (status);


--
-- Name: idx_agent_creation_requests_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_creation_requests_user ON public.agent_creation_requests USING btree (user_id);


--
-- Name: idx_brain_memories_agent_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_agent_created ON public.brain_memories USING btree (agent_id, created_at);


--
-- Name: idx_brain_memories_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_agent_id ON public.brain_memories USING btree (agent_id);


--
-- Name: idx_brain_memories_agent_importance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_agent_importance ON public.brain_memories USING btree (agent_id, importance);


--
-- Name: idx_brain_memories_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_created_at ON public.brain_memories USING btree (created_at);


--
-- Name: idx_brain_memories_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_expires_at ON public.brain_memories USING btree (expires_at);


--
-- Name: idx_brain_memories_importance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_importance ON public.brain_memories USING btree (importance);


--
-- Name: idx_brain_memories_importance_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_importance_score ON public.brain_memories USING btree (importance_score);


--
-- Name: idx_brain_memories_memory_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memories_memory_type ON public.brain_memories USING btree (memory_type);


--
-- Name: idx_brain_memory_stats_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memory_stats_agent_id ON public.brain_memory_stats USING btree (agent_id);


--
-- Name: idx_brain_memory_tags_memory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memory_tags_memory_id ON public.brain_memory_tags USING btree (memory_id);


--
-- Name: idx_brain_memory_tags_memory_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memory_tags_memory_tag ON public.brain_memory_tags USING btree (memory_id, tag);


--
-- Name: idx_brain_memory_tags_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_memory_tags_tag ON public.brain_memory_tags USING btree (tag);


--
-- Name: idx_prompt_templates_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_templates_agent ON public.prompt_templates USING btree (agent_id);


--
-- Name: idx_prompt_templates_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_templates_public ON public.prompt_templates USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_user_budgets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_budgets_user_id ON public.user_budgets USING btree (user_id);


--
-- Name: sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_expires_at_idx ON public.sessions USING btree (expires_at) WHERE (revoked_at IS NULL);


--
-- Name: sessions_token_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_token_hash_idx ON public.sessions USING btree (token_hash);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: user_cmd_prefs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_cmd_prefs_user_id_idx ON public.user_command_preferences USING btree (user_id);


--
-- Name: users_accessibility_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_accessibility_gin_idx ON public.users USING gin (accessibility);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_unique_idx ON public.users USING btree (lower((email)::text));


--
-- Name: users_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_is_active_idx ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: users_locale_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_locale_idx ON public.users USING btree (locale);


--
-- Name: users_mfa_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_mfa_enabled_idx ON public.users USING btree (mfa_enabled) WHERE (mfa_enabled = true);


--
-- Name: users_privacy_settings_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_privacy_settings_gin_idx ON public.users USING gin (privacy_settings);


--
-- Name: users_timezone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_timezone_idx ON public.users USING btree (timezone);


--
-- Name: workflow_is_template_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_is_template_idx ON public.workflows USING btree (is_template);


--
-- Name: workflow_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_status_idx ON public.workflows USING btree (status);


--
-- Name: workflow_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_tags_idx ON public.workflows USING gin (tags);


--
-- Name: workflow_template_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_template_category_idx ON public.workflows USING btree (template_category);


--
-- Name: workflow_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_updated_at_idx ON public.workflows USING btree (updated_at DESC);


--
-- Name: workflow_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_user_id_idx ON public.workflows USING btree (user_id);


--
-- Name: workflow_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_workspace_id_idx ON public.workflows USING btree (workspace_id);


--
-- Name: workspaces_is_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspaces_is_default_idx ON public.workspaces USING btree (user_id, is_default);


--
-- Name: workspaces_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspaces_slug_idx ON public.workspaces USING btree (user_id, slug);


--
-- Name: workspaces_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspaces_user_id_idx ON public.workspaces USING btree (user_id);


--
-- Name: prompt_templates prompt_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_custom_prompts_updated_at();


--
-- Name: users trigger_create_notification_prefs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_notification_prefs AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_prefs();


--
-- Name: user_notification_prefs update_user_notification_prefs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_prefs_updated_at BEFORE UPDATE ON public.user_notification_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_blueprints agent_blueprints_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_blueprints
    ADD CONSTRAINT agent_blueprints_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.agent_blueprints(id) ON DELETE SET NULL;


--
-- Name: agent_creation_requests agent_creation_requests_created_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_creation_requests
    ADD CONSTRAINT agent_creation_requests_created_agent_id_fkey FOREIGN KEY (created_agent_id) REFERENCES public.agent_instances(id) ON DELETE SET NULL;


--
-- Name: agent_creation_requests agent_creation_requests_creation_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_creation_requests
    ADD CONSTRAINT agent_creation_requests_creation_team_id_fkey FOREIGN KEY (creation_team_id) REFERENCES public.agent_teams(id) ON DELETE SET NULL;


--
-- Name: agent_creation_requests agent_creation_requests_proposed_blueprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_creation_requests
    ADD CONSTRAINT agent_creation_requests_proposed_blueprint_id_fkey FOREIGN KEY (proposed_blueprint_id) REFERENCES public.agent_blueprints(id) ON DELETE SET NULL;


--
-- Name: brain_memory_tags brain_memory_tags_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_memory_tags
    ADD CONSTRAINT brain_memory_tags_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.brain_memories(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_command_preferences user_command_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_command_preferences
    ADD CONSTRAINT user_command_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_prefs user_notification_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_prefs
    ADD CONSTRAINT user_notification_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict FzSqqFcb4q0TAmjEJwTobuVfz9Wz1Nlr2LsBmkZpZakqwGeNrs6CFXRdo88GFM0

