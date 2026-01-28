-- Create missing tables for security logging
-- Run this script against Supabase to create audit_logs and user_known_devices

-- =====================================================
-- USER KNOWN DEVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_known_devices (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Device fingerprint (hash of UA + partial IP)
    device_hash VARCHAR(64) NOT NULL,

    -- Raw data for display purposes
    user_agent TEXT,
    ip_address VARCHAR(45),

    -- Parsed device info for UI display
    device_info JSONB,

    -- Trust status
    is_trusted BOOLEAN NOT NULL DEFAULT true,

    -- Tracking
    first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Notification tracking
    alert_sent_at TIMESTAMP
);

-- Indexes for user_known_devices
CREATE INDEX IF NOT EXISTS user_known_devices_user_id_idx ON user_known_devices(user_id);
CREATE INDEX IF NOT EXISTS user_known_devices_device_hash_idx ON user_known_devices(device_hash);
CREATE INDEX IF NOT EXISTS user_known_devices_user_device_unique ON user_known_devices(user_id, device_hash);
CREATE INDEX IF NOT EXISTS user_known_devices_last_seen_at_idx ON user_known_devices(last_seen_at);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Who performed the action
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

    -- What action was performed
    action VARCHAR(50) NOT NULL,

    -- What entity was affected (optional)
    entity_type VARCHAR(50),
    entity_id VARCHAR(36),

    -- Additional context
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS audit_logs_user_action_idx ON audit_logs(user_id, action, created_at);

-- =====================================================
-- Verify tables were created
-- =====================================================
SELECT 'user_known_devices' as table_name, COUNT(*) as row_count FROM user_known_devices
UNION ALL
SELECT 'audit_logs' as table_name, COUNT(*) as row_count FROM audit_logs;
