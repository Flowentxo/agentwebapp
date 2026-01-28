-- =============================================================================
-- FLOWENT AI PLATFORM - Database Initialization Script
-- =============================================================================
-- This script runs on first PostgreSQL container start
-- It enables required extensions for the AI platform
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable pgvector extension for AI embeddings
-- This is pre-installed in the pgvector/pgvector:pg16 image
CREATE EXTENSION IF NOT EXISTS "vector";

-- Grant permissions to the application user
-- Note: The user and database names come from environment variables
DO $$
DECLARE
    db_user TEXT := current_user;
    db_name TEXT := current_database();
BEGIN
    EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', db_name, db_user);
    RAISE NOTICE 'Granted privileges on database % to user %', db_name, db_user;
END $$;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FLOWENT AI PLATFORM - Database initialized';
    RAISE NOTICE 'Time: %', NOW();
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, pg_trgm, vector';
    RAISE NOTICE '=====================================================';
END $$;
