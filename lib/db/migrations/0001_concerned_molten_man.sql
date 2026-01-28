CREATE TYPE "public"."agent_status" AS ENUM('active', 'inactive', 'maintenance', 'error');--> statement-breakpoint
CREATE TYPE "public"."collaboration_status" AS ENUM('planning', 'executing', 'completed', 'paused', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'disconnected', 'error', 'token_expired');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('thought', 'action', 'question', 'insight', 'handoff', 'user_input');--> statement-breakpoint
CREATE TABLE "agent_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" varchar(255),
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" uuid NOT NULL,
	"content" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" integer DEFAULT 0 NOT NULL,
	"response_time_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_type" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"performed_by" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"change_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"method" varchar(10) NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"status_code" integer NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" uuid,
	"response_time" integer,
	"tokens_used" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"key_hash" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"environment" varchar(50) DEFAULT 'production' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"description" text,
	"ip_whitelist" jsonb,
	"rate_limit" integer DEFAULT 1000,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" varchar(255),
	"revoked_reason" text,
	CONSTRAINT "api_keys_key_prefix_unique" UNIQUE("key_prefix")
);
--> statement-breakpoint
CREATE TABLE "brain_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"workspace_id" varchar(255) DEFAULT 'default-workspace' NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"agent_id" varchar(255),
	"context_type" varchar(100) DEFAULT 'conversation' NOT NULL,
	"context_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"relevance_score" integer DEFAULT 0,
	"token_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) DEFAULT 'default-workspace' NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"search_vector" text,
	"chunk_index" integer,
	"parent_doc_id" uuid,
	"token_count" integer DEFAULT 0 NOT NULL,
	"access_level" varchar(50) DEFAULT 'workspace' NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) DEFAULT 'default-workspace' NOT NULL,
	"pattern" text NOT NULL,
	"insight" text NOT NULL,
	"category" varchar(100),
	"confidence" integer DEFAULT 50 NOT NULL,
	"evidence_count" integer DEFAULT 1 NOT NULL,
	"related_context_ids" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_validated" boolean DEFAULT false NOT NULL,
	"validated_by" varchar(255),
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(255) NOT NULL,
	"context" jsonb NOT NULL,
	"embeddings" jsonb,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"importance" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_memory_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(255) NOT NULL,
	"total_memories" integer DEFAULT 0 NOT NULL,
	"avg_importance" integer DEFAULT 5 NOT NULL,
	"last_memory_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brain_memory_stats_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "brain_memory_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_query_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) DEFAULT 'default-workspace' NOT NULL,
	"user_id" varchar(255),
	"agent_id" varchar(255),
	"query" text NOT NULL,
	"query_embedding" vector(1536),
	"result_count" integer DEFAULT 0 NOT NULL,
	"top_result_ids" jsonb DEFAULT '[]'::jsonb,
	"response_time" integer,
	"was_helpful" boolean,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaboration_id" uuid NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"selection_reason" text,
	"relevance_score" integer,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"avg_confidence" integer,
	"contribution_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaboration_id" uuid NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"agent_name" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"type" "message_type" DEFAULT 'thought' NOT NULL,
	"llm_model" varchar(100),
	"tokens_used" integer,
	"latency_ms" integer,
	"confidence" integer,
	"parent_message_id" uuid,
	"target_agent_id" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"task_description" text NOT NULL,
	"status" "collaboration_status" DEFAULT 'planning' NOT NULL,
	"semantic_analysis" jsonb,
	"complexity_score" integer,
	"estimated_duration" integer,
	"summary" text,
	"success_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_agents" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"endpoint" text NOT NULL,
	"api_key_hash" varchar(64) NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "agent_status" DEFAULT 'inactive' NOT NULL,
	"version" varchar(50),
	"icon_url" text,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_health_check" timestamp,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"service" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_type" varchar(50) DEFAULT 'Bearer' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "integration_status" DEFAULT 'connected' NOT NULL,
	"connected_email" varchar(255),
	"connected_name" varchar(255),
	"connected_avatar" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"slug" varchar(255) NOT NULL,
	"icon_url" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_audit_events" ADD CONSTRAINT "api_key_audit_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brain_memory_tags" ADD CONSTRAINT "brain_memory_tags_memory_id_brain_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."brain_memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_agents" ADD CONSTRAINT "collaboration_agents_collaboration_id_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."collaborations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_collaboration_id_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."collaborations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_parent_message_id_collaboration_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "public"."collaboration_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_agents" ADD CONSTRAINT "external_agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_agents" ADD CONSTRAINT "workspace_agents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_knowledge" ADD CONSTRAINT "workspace_knowledge_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_user_agent_idx" ON "agent_conversations" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "agent_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_workspace_idx" ON "agent_conversations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "conversations_workspace_user_idx" ON "agent_conversations" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "agent_messages_user_idx" ON "agent_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_messages_agent_idx" ON "agent_messages" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_messages_created_idx" ON "agent_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agent_messages_user_agent_idx" ON "agent_messages" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "agent_messages_workspace_idx" ON "agent_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "agent_messages_workspace_user_idx" ON "agent_messages" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_agent_idx" ON "ai_usage" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "ai_usage_user_idx" ON "ai_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_user_agent_idx" ON "ai_usage" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "ai_usage_model_idx" ON "ai_usage" USING btree ("model");--> statement-breakpoint
CREATE INDEX "brain_ctx_session_idx" ON "brain_contexts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "brain_ctx_workspace_idx" ON "brain_contexts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_ctx_user_idx" ON "brain_contexts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brain_ctx_agent_idx" ON "brain_contexts" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "brain_ctx_embedding_idx" ON "brain_contexts" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "brain_ctx_created_at_idx" ON "brain_contexts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brain_ctx_expires_at_idx" ON "brain_contexts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "brain_ctx_is_active_idx" ON "brain_contexts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "brain_doc_workspace_idx" ON "brain_documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_doc_embedding_idx" ON "brain_documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "brain_doc_search_vector_idx" ON "brain_documents" USING gin (to_tsvector('english', "content"));--> statement-breakpoint
CREATE INDEX "brain_doc_content_hash_idx" ON "brain_documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "brain_doc_parent_doc_idx" ON "brain_documents" USING btree ("parent_doc_id");--> statement-breakpoint
CREATE INDEX "brain_doc_created_at_idx" ON "brain_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brain_doc_is_active_idx" ON "brain_documents" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "brain_learn_workspace_idx" ON "brain_learnings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_learn_category_idx" ON "brain_learnings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "brain_learn_confidence_idx" ON "brain_learnings" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "brain_learn_embedding_idx" ON "brain_learnings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "brain_learn_created_at_idx" ON "brain_learnings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brain_learn_is_active_idx" ON "brain_learnings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_brain_memories_agent_id" ON "brain_memories" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_brain_memories_created_at" ON "brain_memories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_brain_memories_importance" ON "brain_memories" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "idx_brain_memories_expires_at" ON "brain_memories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_brain_memories_agent_created" ON "brain_memories" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_brain_memories_agent_importance" ON "brain_memories" USING btree ("agent_id","importance");--> statement-breakpoint
CREATE INDEX "idx_brain_memory_stats_agent_id" ON "brain_memory_stats" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_brain_memory_tags_memory_id" ON "brain_memory_tags" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "idx_brain_memory_tags_tag" ON "brain_memory_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "idx_brain_memory_tags_memory_tag" ON "brain_memory_tags" USING btree ("memory_id","tag");--> statement-breakpoint
CREATE INDEX "brain_query_workspace_idx" ON "brain_query_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_query_user_idx" ON "brain_query_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brain_query_agent_idx" ON "brain_query_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "brain_query_created_at_idx" ON "brain_query_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_collab_agents_collaboration" ON "collaboration_agents" USING btree ("collaboration_id");--> statement-breakpoint
CREATE INDEX "idx_collab_agents_agent" ON "collaboration_agents" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_collab_agents_collab_agent" ON "collaboration_agents" USING btree ("collaboration_id","agent_id");--> statement-breakpoint
CREATE INDEX "idx_collab_messages_collaboration" ON "collaboration_messages" USING btree ("collaboration_id");--> statement-breakpoint
CREATE INDEX "idx_collab_messages_agent" ON "collaboration_messages" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_collab_messages_created" ON "collaboration_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_collab_messages_collab_created" ON "collaboration_messages" USING btree ("collaboration_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_collaborations_user_id" ON "collaborations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_collaborations_status" ON "collaborations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_collaborations_created_at" ON "collaborations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_collaborations_user_status" ON "collaborations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "external_agents_status_idx" ON "external_agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "external_agents_created_by_idx" ON "external_agents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "integration_events_integration_id_idx" ON "integration_events" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integration_events_event_type_idx" ON "integration_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "integration_events_created_at_idx" ON "integration_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "integrations_user_id_idx" ON "integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "integrations_status_idx" ON "integrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integrations_expires_at_idx" ON "integrations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "integrations_unique_user_provider_service" ON "integrations" USING btree ("user_id","provider","service");--> statement-breakpoint
CREATE INDEX "workspace_agents_workspace_id_idx" ON "workspace_agents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_agents_agent_id_idx" ON "workspace_agents" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "workspace_agents_unique" ON "workspace_agents" USING btree ("workspace_id","agent_id");--> statement-breakpoint
CREATE INDEX "workspace_knowledge_workspace_id_idx" ON "workspace_knowledge" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_knowledge_source_type_idx" ON "workspace_knowledge" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "workspaces_user_id_idx" ON "workspaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "workspaces_is_default_idx" ON "workspaces" USING btree ("user_id","is_default");