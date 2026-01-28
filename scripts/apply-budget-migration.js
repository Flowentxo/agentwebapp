/**
 * Apply Budget Tables Migration - Simple JS Version
 */

const { Pool } = require('pg');
require('dotenv').config();

async function applyMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    console.log('🔄 Applying budget tables migration...');

    try {
        const client = await pool.connect();

        // Create user_budgets table
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL UNIQUE,
        monthly_token_limit INTEGER DEFAULT 1000000,
        monthly_cost_limit_usd NUMERIC(10, 2) DEFAULT 100.00,
        daily_token_limit INTEGER DEFAULT 50000,
        daily_cost_limit_usd NUMERIC(10, 2) DEFAULT 10.00,
        max_tokens_per_request INTEGER DEFAULT 4000,
        max_requests_per_minute INTEGER DEFAULT 5,
        max_requests_per_hour INTEGER DEFAULT 50,
        max_requests_per_day INTEGER DEFAULT 200,
        current_month_tokens INTEGER DEFAULT 0,
        current_month_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
        current_day_tokens INTEGER DEFAULT 0,
        current_day_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
        month_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
        day_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        notify_on_threshold BOOLEAN DEFAULT TRUE,
        notify_threshold_percent INTEGER DEFAULT 80,
        preferred_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
        allowed_models JSONB DEFAULT '["gpt-4o-mini", "gpt-3.5-turbo"]',
        auto_cost_optimization BOOLEAN DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
        console.log('✅ Created user_budgets table');

        // Create budget_usage_history table
        await client.query(`
      CREATE TABLE IF NOT EXISTS budget_usage_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        period VARCHAR(20) NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        tokens_used INTEGER NOT NULL,
        cost_usd NUMERIC(10, 6) NOT NULL,
        request_count INTEGER NOT NULL,
        token_limit INTEGER,
        cost_limit NUMERIC(10, 2),
        exceeded_limit BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
        console.log('✅ Created budget_usage_history table');

        // Create budget_alerts table
        await client.query(`
      CREATE TABLE IF NOT EXISTS budget_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message VARCHAR(500) NOT NULL,
        current_usage JSONB,
        "limit" JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        is_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
        console.log('✅ Created budget_alerts table');

        // Create indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_usage_history_user_id ON budget_usage_history(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_usage_history_period ON budget_usage_history(period_start, period_end)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_is_read ON budget_alerts(is_read)`);
        console.log('✅ Created indexes');

        client.release();
        await pool.end();

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

applyMigration();
