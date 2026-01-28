/**
 * User Budget & Token Limits Schema
 * Tracks user spending limits and token usage quotas
 */

import { pgTable, uuid, varchar, integer, numeric, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * User budgets and spending limits
 */
export const userBudgets = pgTable('user_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),

  // Monthly budget limits
  monthlyTokenLimit: integer('monthly_token_limit').default(1000000), // 1M tokens/month default
  monthlyCostLimitUsd: numeric('monthly_cost_limit_usd', { precision: 10, scale: 2 }).default('100.00'),

  // Daily limits
  dailyTokenLimit: integer('daily_token_limit').default(50000), // 50k tokens/day default
  dailyCostLimitUsd: numeric('daily_cost_limit_usd', { precision: 10, scale: 2 }).default('10.00'),

  // Per-request limits
  maxTokensPerRequest: integer('max_tokens_per_request').default(4000),

  // Rate limiting (requests per time window)
  maxRequestsPerMinute: integer('max_requests_per_minute').default(5),
  maxRequestsPerHour: integer('max_requests_per_hour').default(50),
  maxRequestsPerDay: integer('max_requests_per_day').default(200),

  // Current usage (reset periodically)
  currentMonthTokens: integer('current_month_tokens').default(0),
  currentMonthCostUsd: numeric('current_month_cost_usd', { precision: 10, scale: 6 }).default('0.000000'),
  currentDayTokens: integer('current_day_tokens').default(0),
  currentDayCostUsd: numeric('current_day_cost_usd', { precision: 10, scale: 6 }).default('0.000000'),

  // Reset timestamps
  monthResetAt: timestamp('month_reset_at').notNull().defaultNow(),
  dayResetAt: timestamp('day_reset_at').notNull().defaultNow(),

  // Budget status
  isActive: boolean('is_active').default(true).notNull(),
  notifyOnThreshold: boolean('notify_on_threshold').default(true),
  notifyThresholdPercent: integer('notify_threshold_percent').default(80), // Notify at 80% usage

  // AI Model Preferences
  preferredModel: varchar('preferred_model', { length: 100 }).default('gpt-4o-mini'),
  allowedModels: jsonb('allowed_models').$type<string[]>().default(['gpt-4o-mini', 'gpt-3.5-turbo']),
  autoCostOptimization: boolean('auto_cost_optimization').default(false), // Automatically switch to cheaper models when appropriate

  // Metadata
  metadata: jsonb('metadata').$type<{
    plan?: 'free' | 'starter' | 'pro' | 'enterprise';
    customLimits?: boolean;
    notes?: string;
    autoReload?: {
      enabled: boolean;
      threshold: number;
      packageId?: number;
    };
  }>(),

  // ============================================
  // ENTERPRISE FIELDS (Phase 1)
  // ============================================

  // Default Cost Center & Project
  defaultCostCenterId: uuid('default_cost_center_id'),
  defaultProjectId: uuid('default_project_id'),

  // Cached Forecast Data (for quick dashboard loads)
  forecastData: jsonb('forecast_data').$type<{
    // Run-out analysis
    estimatedRunOutDate?: string; // ISO date
    projectedEomCostUsd?: number;
    projectedEomTokens?: number;
    // Trends
    dailyAvgTokens?: number;
    dailyAvgCostUsd?: number;
    weeklyGrowthRate?: number; // %
    monthlyGrowthRate?: number; // %
    // Trend direction
    trend?: 'increasing' | 'stable' | 'decreasing';
    // Confidence
    confidenceScore?: number; // 0-100
    // Anomaly flags
    anomalyDetected?: boolean;
    anomalyType?: 'spike' | 'drop' | 'trend_change';
    // Last calculation
    calculatedAt?: string; // ISO timestamp
  }>(),

  // Enterprise features
  isEnterprise: boolean('is_enterprise').default(false),
  organizationId: varchar('organization_id', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Budget usage history for analytics
 * Extended with Enterprise features: Cost Center & Project tracking
 */
export const budgetUsageHistory = pgTable('budget_usage_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  period: varchar('period', { length: 20 }).notNull(), // 'day' | 'month'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  tokensUsed: integer('tokens_used').notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull(),
  requestCount: integer('request_count').notNull(),

  tokenLimit: integer('token_limit'),
  costLimit: numeric('cost_limit', { precision: 10, scale: 2 }),

  exceededLimit: boolean('exceeded_limit').default(false),

  // ============================================
  // ENTERPRISE FIELDS (Phase 1)
  // ============================================

  // Cost Center & Project Attribution
  costCenterId: uuid('cost_center_id'), // References cost_centers table
  projectId: uuid('project_id'), // References budget_projects table

  // Model & Agent breakdown
  modelUsage: jsonb('model_usage').$type<{
    [model: string]: {
      tokens: number;
      cost: number;
      requests: number;
    };
  }>(),
  agentUsage: jsonb('agent_usage').$type<{
    [agentId: string]: {
      tokens: number;
      cost: number;
      requests: number;
    };
  }>(),

  // Additional tracking
  avgResponseTimeMs: integer('avg_response_time_ms'),
  errorCount: integer('error_count').default(0),
  successRate: integer('success_rate'), // 0-100 percentage

  // Tags for filtering/grouping
  tags: jsonb('tags').$type<string[]>().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('budget_usage_history_user_idx').on(table.userId),
  periodIdx: index('budget_usage_history_period_idx').on(table.period),
  periodStartIdx: index('budget_usage_history_period_start_idx').on(table.periodStart),
  costCenterIdx: index('budget_usage_history_cost_center_idx').on(table.costCenterId),
  projectIdx: index('budget_usage_history_project_idx').on(table.projectId),
  userPeriodIdx: index('budget_usage_history_user_period_idx').on(table.userId, table.periodStart),
}));

/**
 * Budget alerts and notifications
 */
export const budgetAlerts = pgTable('budget_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  alertType: varchar('alert_type', { length: 50 }).notNull(), // 'threshold' | 'limit_exceeded' | 'daily_reset' | 'monthly_reset'
  severity: varchar('severity', { length: 20 }).notNull(), // 'info' | 'warning' | 'critical'

  message: varchar('message', { length: 500 }).notNull(),

  currentUsage: jsonb('current_usage').$type<{
    tokens?: number;
    costUsd?: number;
    percentage?: number;
  }>(),

  limit: jsonb('limit').$type<{
    tokens?: number;
    costUsd?: number;
  }>(),

  isRead: boolean('is_read').default(false),
  isSent: boolean('is_sent').default(false), // For email notifications

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const billingTransactions = pgTable('billing_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  
  packageId: varchar('package_id', { length: 50 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  tokens: integer('tokens'), // Optional: record how many tokens were credited
  
  status: varchar('status', { length: 20 }).notNull().default('completed'), // 'pending' | 'completed' | 'failed'
  paymentMethod: varchar('payment_method', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 100 }), // External ID (e.g. Stripe)
  
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserBudget = typeof userBudgets.$inferSelect;
export type NewUserBudget = typeof userBudgets.$inferInsert;
export type BudgetUsageHistory = typeof budgetUsageHistory.$inferSelect;
export type BudgetAlert = typeof budgetAlerts.$inferSelect;
export type BillingTransaction = typeof billingTransactions.$inferSelect;
export type NewBillingTransaction = typeof billingTransactions.$inferInsert;
