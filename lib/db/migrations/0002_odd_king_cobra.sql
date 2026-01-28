CREATE TYPE "public"."command_intent" AS ENUM('analyze', 'create', 'send', 'review', 'monitor', 'research', 'visualize', 'calculate', 'write', 'code', 'legal', 'support', 'collaborate', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('uploading', 'processing', 'ready', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."file_visibility" AS ENUM('private', 'workspace', 'public');--> statement-breakpoint
CREATE TABLE "command_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"original_text" text NOT NULL,
	"intent" "command_intent" NOT NULL,
	"confidence" real NOT NULL,
	"agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"executed_successfully" boolean DEFAULT true NOT NULL,
	"execution_time_ms" integer,
	"error_message" text,
	"source" varchar(50) DEFAULT 'command-center' NOT NULL,
	"device_type" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"widget_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"grid_area" varchar(50),
	"size" varchar(20) DEFAULT 'medium' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"suggestion_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"command_text" text,
	"agent_id" varchar(50),
	"action_payload" jsonb,
	"relevance_score" real NOT NULL,
	"confidence_score" real NOT NULL,
	"context_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shown" boolean DEFAULT false NOT NULL,
	"shown_at" timestamp,
	"accepted" boolean DEFAULT false NOT NULL,
	"accepted_at" timestamp,
	"dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_commands" integer DEFAULT 0 NOT NULL,
	"total_agent_interactions" integer DEFAULT 0 NOT NULL,
	"total_time_spent_ms" integer DEFAULT 0 NOT NULL,
	"top_intents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_agents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_commands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avg_command_confidence" real,
	"avg_execution_time_ms" integer,
	"success_rate" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"entity_id" varchar(100),
	"entity_type" varchar(50),
	"session_id" varchar(36),
	"duration_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_command_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"default_view" varchar(20) DEFAULT 'command-center' NOT NULL,
	"show_suggestions" boolean DEFAULT true NOT NULL,
	"enable_voice_commands" boolean DEFAULT false NOT NULL,
	"compact_mode" boolean DEFAULT false NOT NULL,
	"pinned_commands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pinned_agents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"favorite_intents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recent_agents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_execute_confidence" real DEFAULT 0.95 NOT NULL,
	"enable_context_awareness" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_command_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "agent_live_status" (
	"agent_id" varchar(50) PRIMARY KEY NOT NULL,
	"status" varchar(20) DEFAULT 'offline' NOT NULL,
	"current_queue_size" integer DEFAULT 0 NOT NULL,
	"avg_wait_time_sec" integer,
	"last_heartbeat" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"user_id" varchar(255),
	"request_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"avg_response_time_ms" integer,
	"total_tokens_used" integer DEFAULT 0,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text,
	"chat_session_id" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_request_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"chat_session_id" varchar(255),
	"message_content" text,
	"success" integer DEFAULT 1 NOT NULL,
	"response_time_ms" integer,
	"tokens_used" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_usage_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_key" varchar(50) NOT NULL,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"successful_requests" integer DEFAULT 0 NOT NULL,
	"failed_requests" integer DEFAULT 0 NOT NULL,
	"avg_response_time_ms" integer,
	"total_tokens_used" integer DEFAULT 0,
	"unique_users" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"user_id" varchar(255),
	"action" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"shared_with_user_id" varchar(255),
	"share_token" varchar(100),
	"can_view" boolean DEFAULT true NOT NULL,
	"can_download" boolean DEFAULT true NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255) NOT NULL,
	CONSTRAINT "file_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "file_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_key" text NOT NULL,
	"size" integer NOT NULL,
	"checksum" varchar(64),
	"uploaded_by" varchar(255) NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"workspace_id" uuid,
	"filename" varchar(500) NOT NULL,
	"original_filename" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"storage_provider" varchar(50) DEFAULT 's3' NOT NULL,
	"storage_key" text NOT NULL,
	"storage_bucket" varchar(255),
	"storage_region" varchar(50),
	"url" text,
	"thumbnail_url" text,
	"preview_url" text,
	"status" "file_status" DEFAULT 'uploading' NOT NULL,
	"processing_error" text,
	"visibility" "file_visibility" DEFAULT 'private' NOT NULL,
	"virus_scan_status" varchar(50),
	"virus_scan_date" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"expires_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "command_history" ADD CONSTRAINT "command_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_suggestions" ADD CONSTRAINT "smart_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_statistics" ADD CONSTRAINT "usage_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_command_preferences" ADD CONSTRAINT "user_command_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_access_logs" ADD CONSTRAINT "file_access_logs_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cmd_history_user_id_idx" ON "command_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cmd_history_intent_idx" ON "command_history" USING btree ("intent");--> statement-breakpoint
CREATE INDEX "cmd_history_created_at_idx" ON "command_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cmd_history_user_intent_idx" ON "command_history" USING btree ("user_id","intent");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_user_id_idx" ON "dashboard_widgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_visible_idx" ON "dashboard_widgets" USING btree ("visible");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_position_idx" ON "dashboard_widgets" USING btree ("position");--> statement-breakpoint
CREATE INDEX "smart_suggestions_user_id_idx" ON "smart_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "smart_suggestions_type_idx" ON "smart_suggestions" USING btree ("suggestion_type");--> statement-breakpoint
CREATE INDEX "smart_suggestions_relevance_idx" ON "smart_suggestions" USING btree ("relevance_score");--> statement-breakpoint
CREATE INDEX "smart_suggestions_shown_idx" ON "smart_suggestions" USING btree ("shown");--> statement-breakpoint
CREATE INDEX "smart_suggestions_expires_idx" ON "smart_suggestions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "usage_stats_user_id_idx" ON "usage_statistics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_stats_period_type_idx" ON "usage_statistics" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "usage_stats_period_start_idx" ON "usage_statistics" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "usage_stats_user_period_idx" ON "usage_statistics" USING btree ("user_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "user_activity_user_id_idx" ON "user_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_type_idx" ON "user_activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "user_activity_created_at_idx" ON "user_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_activity_user_activity_idx" ON "user_activity_log" USING btree ("user_id","activity_type");--> statement-breakpoint
CREATE INDEX "user_cmd_prefs_user_id_idx" ON "user_command_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_live_status_status" ON "agent_live_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agent_metrics_agent_id" ON "agent_metrics" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_metrics_user_id" ON "agent_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_metrics_period" ON "agent_metrics" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_agent_ratings_agent_id" ON "agent_ratings" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_ratings_user_id" ON "agent_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_ratings_rating" ON "agent_ratings" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_agent_request_log_agent_id" ON "agent_request_log" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_request_log_user_id" ON "agent_request_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_request_log_session" ON "agent_request_log" USING btree ("chat_session_id");--> statement-breakpoint
CREATE INDEX "idx_agent_request_log_created" ON "agent_request_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_summary_agent_id" ON "agent_usage_summary" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_summary_period" ON "agent_usage_summary" USING btree ("period","period_key");--> statement-breakpoint
CREATE INDEX "file_access_logs_file_id_idx" ON "file_access_logs" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_access_logs_user_id_idx" ON "file_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_access_logs_action_idx" ON "file_access_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "file_access_logs_created_at_idx" ON "file_access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "file_shares_file_id_idx" ON "file_shares" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_shares_shared_with_user_id_idx" ON "file_shares" USING btree ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX "file_shares_share_token_idx" ON "file_shares" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "file_shares_expires_at_idx" ON "file_shares" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "file_versions_file_id_idx" ON "file_versions" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_versions_version_number_idx" ON "file_versions" USING btree ("file_id","version_number");--> statement-breakpoint
CREATE INDEX "file_versions_created_at_idx" ON "file_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_workspace_id_idx" ON "files" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_visibility_idx" ON "files" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "files_mime_type_idx" ON "files" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "files_deleted_at_idx" ON "files" USING btree ("deleted_at");