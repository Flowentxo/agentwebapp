CREATE TYPE "public"."auth_role" AS ENUM('user', 'editor', 'reviewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."kb_role" AS ENUM('user', 'editor', 'reviewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."kb_scope" AS ENUM('org', 'team', 'user');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('note', 'url', 'file');--> statement-breakpoint
CREATE TYPE "public"."kb_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('org', 'private');--> statement-breakpoint
CREATE TABLE "kb_access_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kb_id" uuid NOT NULL,
	"role" "kb_role" NOT NULL,
	"scope" "kb_scope" NOT NULL,
	"subject_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"text" text NOT NULL,
	"tokens" integer NOT NULL,
	"embedding" vector(1536),
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"author_id" varchar(255) NOT NULL,
	"body_md" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kb_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"status" "kb_status" DEFAULT 'draft' NOT NULL,
	"author_id" varchar(255) NOT NULL,
	"editor_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" varchar(255),
	"current_revision_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content_md" text NOT NULL,
	"content_html" text,
	"source_type" "source_type" DEFAULT 'note' NOT NULL,
	"source_uri" text,
	"checksum" varchar(64) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_search_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar(255),
	"query" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"topk" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_bases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"visibility" "visibility" DEFAULT 'org' NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_bases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_agent" text,
	"ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_audit" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"action" varchar(100) NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_prefs" (
	"user_id" varchar(36) PRIMARY KEY NOT NULL,
	"email_digest" boolean DEFAULT true NOT NULL,
	"product_updates" boolean DEFAULT true NOT NULL,
	"security_alerts" boolean DEFAULT true NOT NULL,
	"web_push" boolean DEFAULT false NOT NULL,
	"sms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"role" "auth_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"bio" text,
	"locale" varchar(10) DEFAULT 'de-DE' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Europe/Berlin' NOT NULL,
	"theme" varchar(10) DEFAULT 'system' NOT NULL,
	"pronouns" varchar(50),
	"location" varchar(100),
	"org_title" varchar(100),
	"accessibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comm_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"privacy_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"mfa_recovery_codes" text
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "kb_access_rules" ADD CONSTRAINT "kb_access_rules_kb_id_knowledge_bases_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_revision_id_kb_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."kb_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_comments" ADD CONSTRAINT "kb_comments_entry_id_kb_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."kb_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_entries" ADD CONSTRAINT "kb_entries_kb_id_knowledge_bases_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_revisions" ADD CONSTRAINT "kb_revisions_entry_id_kb_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."kb_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit" ADD CONSTRAINT "user_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_prefs" ADD CONSTRAINT "user_notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kb_access_kb_id_idx" ON "kb_access_rules" USING btree ("kb_id");--> statement-breakpoint
CREATE INDEX "kb_access_subject_idx" ON "kb_access_rules" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "kb_audit_entity_idx" ON "kb_audit" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "kb_audit_user_idx" ON "kb_audit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kb_audit_created_at_idx" ON "kb_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kb_chunk_revision_id_idx" ON "kb_chunks" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "kb_chunk_embedding_idx" ON "kb_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "kb_chunk_is_deleted_idx" ON "kb_chunks" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "kb_comment_entry_id_idx" ON "kb_comments" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "kb_comment_created_at_idx" ON "kb_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kb_entry_status_idx" ON "kb_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_entry_kb_id_idx" ON "kb_entries" USING btree ("kb_id");--> statement-breakpoint
CREATE INDEX "kb_entry_author_idx" ON "kb_entries" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "kb_entry_tags_idx" ON "kb_entries" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "kb_entry_updated_at_idx" ON "kb_entries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "kb_revision_entry_id_idx" ON "kb_revisions" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "kb_revision_checksum_idx" ON "kb_revisions" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "kb_revision_version_idx" ON "kb_revisions" USING btree ("entry_id","version");--> statement-breakpoint
CREATE INDEX "kb_search_log_actor_idx" ON "kb_search_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "kb_search_log_created_at_idx" ON "kb_search_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kb_slug_idx" ON "knowledge_bases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "kb_created_by_idx" ON "knowledge_bases" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_audit_user_id_idx" ON "user_audit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_audit_action_idx" ON "user_audit" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_audit_created_at_idx" ON "user_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_roles_unique_user_role" ON "user_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "users_email_unique_idx" ON "users" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "verification_tokens_token_hash_idx" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens" USING btree ("expires_at");