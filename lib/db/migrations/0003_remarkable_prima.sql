CREATE TYPE "public"."custom_agent_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."custom_agent_visibility" AS ENUM('private', 'team', 'public', 'listed');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'running', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('customer-support', 'data-analysis', 'content-generation', 'automation', 'research', 'sales', 'marketing', 'other');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workflow_visibility" AS ENUM('private', 'team', 'public');--> statement-breakpoint
CREATE TABLE "db_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer NOT NULL,
	"database" varchar(255) NOT NULL,
	"username" varchar(255),
	"password" text,
	"ssl" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'untested',
	"last_tested" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" varchar(255),
	"conversation_id" varchar(255),
	"operation_id" varchar(255) NOT NULL,
	"parameters" jsonb,
	"success" boolean NOT NULL,
	"status_code" varchar(10),
	"response_data" jsonb,
	"error_message" text,
	"execution_time_ms" varchar(20) NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"schema" jsonb NOT NULL,
	"authentication" jsonb DEFAULT '{"type":"none"}'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_size" varchar(20) NOT NULL,
	"file_url" text NOT NULL,
	"processed_at" timestamp,
	"chunk_count" varchar(10),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"shared_with" varchar(255) NOT NULL,
	"share_type" varchar(50) NOT NULL,
	"permission" varchar(50) DEFAULT 'view' NOT NULL,
	"shared_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"version_number" varchar(20) NOT NULL,
	"changelog" text,
	"snapshot" jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(500),
	"color" varchar(7) DEFAULT '#3B82F6',
	"system_instructions" text NOT NULL,
	"model" varchar(100) DEFAULT 'gpt-5.1' NOT NULL,
	"temperature" varchar(10) DEFAULT '0.7',
	"max_tokens" varchar(10) DEFAULT '4000',
	"conversation_starters" jsonb DEFAULT '[]'::jsonb,
	"capabilities" jsonb DEFAULT '{"webBrowsing":false,"codeInterpreter":false,"imageGeneration":false,"knowledgeBase":false,"customActions":false}'::jsonb,
	"fallback_chain" varchar(50) DEFAULT 'standard',
	"response_format" varchar(50) DEFAULT 'text',
	"visibility" "custom_agent_visibility" DEFAULT 'private' NOT NULL,
	"status" "custom_agent_status" DEFAULT 'draft' NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"workspace_id" uuid,
	"usage_count" varchar(20) DEFAULT '0',
	"rating" varchar(10),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"agent_id" uuid,
	"chunk_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"package_id" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tokens" integer,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"payment_method" varchar(50),
	"transaction_id" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"message" varchar(500) NOT NULL,
	"current_usage" jsonb,
	"limit" jsonb,
	"is_read" boolean DEFAULT false,
	"is_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"tokens_used" integer NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"request_count" integer NOT NULL,
	"token_limit" integer,
	"cost_limit" numeric(10, 2),
	"exceeded_limit" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"monthly_token_limit" integer DEFAULT 1000000,
	"monthly_cost_limit_usd" numeric(10, 2) DEFAULT '100.00',
	"daily_token_limit" integer DEFAULT 50000,
	"daily_cost_limit_usd" numeric(10, 2) DEFAULT '10.00',
	"max_tokens_per_request" integer DEFAULT 4000,
	"max_requests_per_minute" integer DEFAULT 5,
	"max_requests_per_hour" integer DEFAULT 50,
	"max_requests_per_day" integer DEFAULT 200,
	"current_month_tokens" integer DEFAULT 0,
	"current_month_cost_usd" numeric(10, 6) DEFAULT '0.000000',
	"current_day_tokens" integer DEFAULT 0,
	"current_day_cost_usd" numeric(10, 6) DEFAULT '0.000000',
	"month_reset_at" timestamp DEFAULT now() NOT NULL,
	"day_reset_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notify_on_threshold" boolean DEFAULT true,
	"notify_threshold_percent" integer DEFAULT 80,
	"preferred_model" varchar(100) DEFAULT 'gpt-4o-mini',
	"allowed_models" jsonb DEFAULT '["gpt-4o-mini","gpt-3.5-turbo"]'::jsonb,
	"auto_cost_optimization" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_budgets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "custom_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"prompt_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"prompt_text" text NOT NULL,
	"category" varchar(50),
	"is_public" boolean DEFAULT true,
	"created_by" varchar(255),
	"use_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" jsonb,
	"user_id" varchar(255) NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"shared_with_user_id" varchar(255),
	"shared_with_team_id" varchar(255),
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_execute" boolean DEFAULT true NOT NULL,
	"can_share" boolean DEFAULT false NOT NULL,
	"shared_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"change_description" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"visibility" "workflow_visibility" DEFAULT 'private' NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_category" "template_category",
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" varchar(255),
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"parent_workflow_id" uuid,
	"execution_count" jsonb DEFAULT '0'::jsonb NOT NULL,
	"last_executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "action_execution_logs" ADD CONSTRAINT "action_execution_logs_action_id_agent_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."agent_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_execution_logs" ADD CONSTRAINT "action_execution_logs_agent_id_custom_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."custom_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_agent_id_custom_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."custom_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge_base" ADD CONSTRAINT "agent_knowledge_base_agent_id_custom_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."custom_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_shares" ADD CONSTRAINT "agent_shares_agent_id_custom_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."custom_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agent_id_custom_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."custom_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_file_id_agent_knowledge_base_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."agent_knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_agent_id_custom_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."custom_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_shares" ADD CONSTRAINT "workflow_shares_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_action_logs_action" ON "action_execution_logs" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "idx_action_logs_agent" ON "action_execution_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_action_logs_user" ON "action_execution_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_action_logs_executed" ON "action_execution_logs" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "idx_action_logs_success" ON "action_execution_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "unique_file_chunk_idx" ON "document_embeddings" USING btree ("file_id","chunk_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings_file" ON "document_embeddings" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings_agent" ON "document_embeddings" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings_user" ON "document_embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings_workspace" ON "document_embeddings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workflow_execution_workflow_id_idx" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_execution_user_id_idx" ON "workflow_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workflow_execution_status_idx" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_execution_created_at_idx" ON "workflow_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "workflow_share_workflow_id_idx" ON "workflow_shares" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_share_user_idx" ON "workflow_shares" USING btree ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX "workflow_share_team_idx" ON "workflow_shares" USING btree ("shared_with_team_id");--> statement-breakpoint
CREATE INDEX "workflow_version_workflow_id_idx" ON "workflow_versions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_version_version_idx" ON "workflow_versions" USING btree ("workflow_id","version");--> statement-breakpoint
CREATE INDEX "workflow_version_created_at_idx" ON "workflow_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "workflow_user_id_idx" ON "workflows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workflow_workspace_id_idx" ON "workflows" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workflow_status_idx" ON "workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_is_template_idx" ON "workflows" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX "workflow_template_category_idx" ON "workflows" USING btree ("template_category");--> statement-breakpoint
CREATE INDEX "workflow_tags_idx" ON "workflows" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "workflow_updated_at_idx" ON "workflows" USING btree ("updated_at");