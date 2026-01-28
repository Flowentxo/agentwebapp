/**
 * Create Command Center Tables
 */

import 'dotenv/config';
import { getDb } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

async function createCommandCenterTables() {
  console.log('[COMMAND-CENTER-TABLES] Creating tables...');

  const db = getDb();

  try {
    // Create command_intent enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE command_intent AS ENUM (
          'analyze', 'create', 'send', 'review', 'monitor',
          'research', 'visualize', 'calculate', 'write', 'code',
          'legal', 'support', 'collaborate', 'unknown'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created command_intent enum');

    // Create command_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS command_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_text TEXT NOT NULL,
        intent command_intent NOT NULL,
        confidence REAL NOT NULL,
        agent_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
        executed_successfully BOOLEAN NOT NULL DEFAULT true,
        execution_time_ms INTEGER,
        error_message TEXT,
        source VARCHAR(50) NOT NULL DEFAULT 'command-center',
        device_type VARCHAR(20),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS cmd_history_user_id_idx ON command_history(user_id);
      CREATE INDEX IF NOT EXISTS cmd_history_intent_idx ON command_history(intent);
      CREATE INDEX IF NOT EXISTS cmd_history_created_at_idx ON command_history(created_at);
      CREATE INDEX IF NOT EXISTS cmd_history_user_intent_idx ON command_history(user_id, intent);
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created command_history table');

    // Create user_command_preferences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_command_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        default_view VARCHAR(20) NOT NULL DEFAULT 'command-center',
        show_suggestions BOOLEAN NOT NULL DEFAULT true,
        enable_voice_commands BOOLEAN NOT NULL DEFAULT false,
        compact_mode BOOLEAN NOT NULL DEFAULT false,
        pinned_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
        pinned_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
        favorite_intents JSONB NOT NULL DEFAULT '[]'::jsonb,
        recent_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
        auto_execute_confidence REAL NOT NULL DEFAULT 0.95,
        enable_context_awareness BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS user_cmd_prefs_user_id_idx ON user_command_preferences(user_id);
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created user_command_preferences table');

    // Create user_activity_log table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        entity_type VARCHAR(50),
        session_id VARCHAR(36),
        duration_ms INTEGER,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity_log(user_id);
      CREATE INDEX IF NOT EXISTS user_activity_type_idx ON user_activity_log(activity_type);
      CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON user_activity_log(created_at);
      CREATE INDEX IF NOT EXISTS user_activity_user_activity_idx ON user_activity_log(user_id, activity_type);
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created user_activity_log table');

    // Create smart_suggestions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS smart_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        suggestion_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        command_text TEXT,
        agent_id VARCHAR(50),
        action_payload JSONB,
        relevance_score REAL NOT NULL,
        confidence_score REAL NOT NULL,
        context_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
        shown BOOLEAN NOT NULL DEFAULT false,
        shown_at TIMESTAMP,
        accepted BOOLEAN NOT NULL DEFAULT false,
        accepted_at TIMESTAMP,
        dismissed BOOLEAN NOT NULL DEFAULT false,
        dismissed_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS smart_suggestions_user_id_idx ON smart_suggestions(user_id);
      CREATE INDEX IF NOT EXISTS smart_suggestions_type_idx ON smart_suggestions(suggestion_type);
      CREATE INDEX IF NOT EXISTS smart_suggestions_relevance_idx ON smart_suggestions(relevance_score);
      CREATE INDEX IF NOT EXISTS smart_suggestions_shown_idx ON smart_suggestions(shown);
      CREATE INDEX IF NOT EXISTS smart_suggestions_expires_idx ON smart_suggestions(expires_at);
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created smart_suggestions table');

    // Create dashboard_widgets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        widget_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        grid_area VARCHAR(50),
        size VARCHAR(20) NOT NULL DEFAULT 'medium',
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        visible BOOLEAN NOT NULL DEFAULT true,
        pinned BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS dashboard_widgets_user_id_idx ON dashboard_widgets(user_id);
      CREATE INDEX IF NOT EXISTS dashboard_widgets_visible_idx ON dashboard_widgets(visible);
      CREATE INDEX IF NOT EXISTS dashboard_widgets_position_idx ON dashboard_widgets(position);
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created dashboard_widgets table');

    // Create usage_statistics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS usage_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        period_type VARCHAR(20) NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        total_commands INTEGER NOT NULL DEFAULT 0,
        total_agent_interactions INTEGER NOT NULL DEFAULT 0,
        total_time_spent_ms INTEGER NOT NULL DEFAULT 0,
        top_intents JSONB NOT NULL DEFAULT '[]'::jsonb,
        top_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
        top_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
        avg_command_confidence REAL,
        avg_execution_time_ms INTEGER,
        success_rate REAL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS usage_stats_user_id_idx ON usage_statistics(user_id);
      CREATE INDEX IF NOT EXISTS usage_stats_period_type_idx ON usage_statistics(period_type);
      CREATE INDEX IF NOT EXISTS usage_stats_period_start_idx ON usage_statistics(period_start);
      CREATE INDEX IF NOT EXISTS usage_stats_user_period_idx ON usage_statistics(user_id, period_type, period_start);
    `);
    console.log('[COMMAND-CENTER-TABLES] ✅ Created usage_statistics table');

    console.log('[COMMAND-CENTER-TABLES] ✅ All Command Center tables created successfully');
  } catch (error) {
    console.error('[COMMAND-CENTER-TABLES] ❌ Failed:', error);
    throw error;
  }

  process.exit(0);
}

createCommandCenterTables().catch((error) => {
  console.error('[COMMAND-CENTER-TABLES] Fatal error:', error);
  process.exit(1);
});
