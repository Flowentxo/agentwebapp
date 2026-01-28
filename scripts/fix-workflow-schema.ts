import { Pool } from 'pg';

async function fixWorkflowSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Connecting to database...');

    // Check if workflows table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'workflows'
      );
    `);

    console.log('Workflows table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating workflows table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          nodes JSONB NOT NULL DEFAULT '[]',
          edges JSONB NOT NULL DEFAULT '[]',
          viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          visibility VARCHAR(20) NOT NULL DEFAULT 'private',
          is_template BOOLEAN NOT NULL DEFAULT false,
          template_category VARCHAR(50),
          tags JSONB NOT NULL DEFAULT '[]',
          user_id VARCHAR(255) NOT NULL,
          workspace_id VARCHAR(255),
          version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
          parent_workflow_id UUID,
          execution_count JSONB NOT NULL DEFAULT '0',
          last_executed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Workflows table created!');
    } else {
      // Check for viewport column
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'workflows' AND column_name = 'viewport'
      `);

      if (colCheck.rows.length === 0) {
        console.log('Adding viewport column...');
        await pool.query(`
          ALTER TABLE workflows
          ADD COLUMN IF NOT EXISTS viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'
        `);
        console.log('✅ Viewport column added!');
      } else {
        console.log('✅ Viewport column already exists');
      }
    }

    // Check for workflow_executions table
    const execTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'workflow_executions'
      );
    `);

    console.log('Workflow_executions table exists:', execTableCheck.rows[0].exists);

    if (!execTableCheck.rows[0].exists) {
      console.log('Creating workflow_executions table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL,
          input JSONB,
          output JSONB,
          logs JSONB NOT NULL DEFAULT '[]',
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          error TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          duration_ms JSONB,
          user_id VARCHAR(255) NOT NULL,
          is_test BOOLEAN NOT NULL DEFAULT false,
          suspended_state JSONB,
          last_heartbeat TIMESTAMP,
          suspended_at TIMESTAMP,
          resume_token VARCHAR(64),
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Workflow_executions table created!');
    } else {
      console.log('✅ Workflow_executions table already exists');
    }

    // =================================================================
    // Create workflow_approval_requests table
    // =================================================================
    const approvalTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'workflow_approval_requests'
      );
    `);

    console.log('Workflow_approval_requests table exists:', approvalTableCheck.rows[0].exists);

    if (!approvalTableCheck.rows[0].exists) {
      console.log('Creating workflow_approval_requests table...');

      // First create the approval_status enum if it doesn't exist
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS workflow_approval_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          execution_id UUID NOT NULL,
          workflow_id UUID NOT NULL,
          node_id VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          title VARCHAR(255) NOT NULL,
          message TEXT,
          context_data JSONB,
          preview_data JSONB,
          suspended_state JSONB,
          assigned_user_id VARCHAR(255),
          resolved_by VARCHAR(255),
          resolved_at TIMESTAMP,
          rejection_reason TEXT,
          expires_at TIMESTAMP,
          inbox_thread_id VARCHAR(255),
          inbox_message_id VARCHAR(255),
          auto_action VARCHAR(20) DEFAULT 'reject',
          notification_sent BOOLEAN DEFAULT false,
          reminder_count INTEGER DEFAULT 0,
          last_reminder_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS approval_execution_id_idx ON workflow_approval_requests(execution_id);
        CREATE INDEX IF NOT EXISTS approval_workflow_id_idx ON workflow_approval_requests(workflow_id);
        CREATE INDEX IF NOT EXISTS approval_status_idx ON workflow_approval_requests(status);
        CREATE INDEX IF NOT EXISTS approval_assigned_user_idx ON workflow_approval_requests(assigned_user_id);
        CREATE INDEX IF NOT EXISTS approval_created_at_idx ON workflow_approval_requests(created_at);
        CREATE INDEX IF NOT EXISTS approval_pending_for_user_idx ON workflow_approval_requests(assigned_user_id, status);
      `);

      console.log('✅ Workflow_approval_requests table created!');
    } else {
      console.log('✅ Workflow_approval_requests table already exists');
    }

    // =================================================================
    // Create calendar_integrations table (required by calendar_events)
    // =================================================================
    const calIntTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'calendar_integrations'
      );
    `);

    console.log('Calendar_integrations table exists:', calIntTableCheck.rows[0].exists);

    if (!calIntTableCheck.rows[0].exists) {
      console.log('Creating calendar_integrations table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS calendar_integrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          provider VARCHAR(50) NOT NULL,
          email VARCHAR(255) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          token_expiry TIMESTAMP NOT NULL,
          calendar_ids JSONB DEFAULT '[]',
          settings JSONB DEFAULT '{}',
          enabled BOOLEAN NOT NULL DEFAULT true,
          last_sync TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_integrations(user_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_provider ON calendar_integrations(provider);
      `);

      console.log('✅ Calendar_integrations table created!');
    } else {
      console.log('✅ Calendar_integrations table already exists');
    }

    // =================================================================
    // Create calendar_events table
    // =================================================================
    const calEventsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'calendar_events'
      );
    `);

    console.log('Calendar_events table exists:', calEventsTableCheck.rows[0].exists);

    if (!calEventsTableCheck.rows[0].exists) {
      console.log('Creating calendar_events table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
          external_id VARCHAR(255) NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          location TEXT,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          attendees JSONB DEFAULT '[]',
          organizer JSONB,
          meeting_link TEXT,
          conference_data JSONB,
          status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
          raw_data JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_external_id ON calendar_events(external_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);
      `);

      console.log('✅ Calendar_events table created!');
    } else {
      console.log('✅ Calendar_events table already exists');
    }

    // =================================================================
    // Fix workspaces table - check if user_id vs owner_id issue
    // =================================================================
    const workspacesColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'workspaces' AND column_name IN ('user_id', 'owner_id')
    `);

    const columns = workspacesColCheck.rows.map((r: any) => r.column_name);
    console.log('Workspaces columns found:', columns);

    if (columns.includes('owner_id') && !columns.includes('user_id')) {
      console.log('Adding user_id alias column to workspaces...');
      await pool.query(`
        ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
        UPDATE workspaces SET user_id = owner_id WHERE user_id IS NULL;
      `);
      console.log('✅ Added user_id column to workspaces');
    } else if (!columns.includes('user_id') && !columns.includes('owner_id')) {
      console.log('Adding user_id column to workspaces...');
      await pool.query(`
        ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
      `);
      console.log('✅ Added user_id column to workspaces');
    } else {
      console.log('✅ Workspaces table has required columns');
    }

    // =================================================================
    // Add is_published column to workflows table
    // =================================================================
    const isPublishedCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'workflows' AND column_name = 'is_published'
    `);

    if (isPublishedCheck.rows.length === 0) {
      console.log('Adding is_published column to workflows...');
      await pool.query(`
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✅ Added is_published column to workflows');
    } else {
      console.log('✅ is_published column already exists in workflows');
    }

    // =================================================================
    // Create context_predictions table
    // =================================================================
    const contextPredTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'context_predictions'
      );
    `);

    console.log('Context_predictions table exists:', contextPredTableCheck.rows[0].exists);

    if (!contextPredTableCheck.rows[0].exists) {
      console.log('Creating context_predictions table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS context_predictions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
          predicted_context JSONB NOT NULL,
          confidence VARCHAR(50) NOT NULL,
          reasoning TEXT,
          sources JSONB DEFAULT '[]',
          briefing_generated BOOLEAN NOT NULL DEFAULT false,
          briefing_data JSONB,
          user_viewed BOOLEAN NOT NULL DEFAULT false,
          user_feedback VARCHAR(50),
          predicted_at TIMESTAMP NOT NULL DEFAULT NOW(),
          viewed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_context_predictions_user_id ON context_predictions(user_id);
        CREATE INDEX IF NOT EXISTS idx_context_predictions_event_id ON context_predictions(event_id);
        CREATE INDEX IF NOT EXISTS idx_context_predictions_predicted_at ON context_predictions(predicted_at);
      `);

      console.log('✅ Context_predictions table created!');
    } else {
      console.log('✅ Context_predictions table already exists');
    }

    // =================================================================
    // Create meeting_briefings table
    // =================================================================
    const meetingBriefingsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'meeting_briefings'
      );
    `);

    console.log('Meeting_briefings table exists:', meetingBriefingsTableCheck.rows[0].exists);

    if (!meetingBriefingsTableCheck.rows[0].exists) {
      console.log('Creating meeting_briefings table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS meeting_briefings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
          prediction_id UUID REFERENCES context_predictions(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          key_points JSONB DEFAULT '[]',
          attendee_insights JSONB DEFAULT '[]',
          suggested_questions JSONB DEFAULT '[]',
          relevant_documents JSONB DEFAULT '[]',
          action_items JSONB DEFAULT '[]',
          notes TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'generated',
          generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          viewed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_meeting_briefings_user_id ON meeting_briefings(user_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_briefings_event_id ON meeting_briefings(event_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_briefings_prediction_id ON meeting_briefings(prediction_id);
      `);

      console.log('✅ Meeting_briefings table created!');
    } else {
      console.log('✅ Meeting_briefings table already exists');
    }

    // =================================================================
    // Create integration_connections table (Phase 11)
    // =================================================================
    const integrationConnTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'integration_connections'
      );
    `);

    console.log('Integration_connections table exists:', integrationConnTableCheck.rows[0].exists);

    if (!integrationConnTableCheck.rows[0].exists) {
      console.log('Creating integration_connections table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS integration_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          provider VARCHAR(50) NOT NULL,
          category VARCHAR(50) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          iv TEXT NOT NULL,
          tag TEXT NOT NULL,
          expires_at TIMESTAMP,
          metadata JSONB DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_integration_connections_user_id ON integration_connections(user_id);
        CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON integration_connections(provider);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_connections_user_provider ON integration_connections(user_id, provider);
      `);

      console.log('✅ Integration_connections table created!');
    } else {
      console.log('✅ Integration_connections table already exists');
    }

    // =================================================================
    // Update oauth_connections table with iv/tag columns
    // =================================================================
    const oauthIvCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'oauth_connections' AND column_name = 'iv'
    `);

    if (oauthIvCheck.rows.length === 0) {
      console.log('Adding iv/tag columns to oauth_connections...');
      await pool.query(`
        ALTER TABLE oauth_connections
        ADD COLUMN IF NOT EXISTS iv TEXT,
        ADD COLUMN IF NOT EXISTS tag TEXT,
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'email',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS last_error TEXT;
      `);
      console.log('✅ Added encryption columns to oauth_connections');
    } else {
      console.log('✅ oauth_connections already has encryption columns');
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixWorkflowSchema();
