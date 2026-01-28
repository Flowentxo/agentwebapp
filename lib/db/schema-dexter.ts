/**
 * PHASE 1: Dexter Agent Database Schema
 * Financial Intelligence & CRM Analytics Tables
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const transactionTypeEnum = pgEnum('transaction_type', [
  'revenue',
  'expense',
  'transfer',
  'refund',
  'adjustment'
]);

export const expenseCategoryEnum = pgEnum('expense_category', [
  'cogs',           // Cost of Goods Sold
  'opex',           // Operating Expenses
  'marketing',      // Marketing & Advertising
  'sales',          // Sales Costs
  'rd',             // Research & Development
  'admin',          // Administrative
  'payroll',        // Salaries & Benefits
  'infrastructure', // IT & Infrastructure
  'legal',          // Legal & Compliance
  'other'           // Other
]);

export const revenueTypeEnum = pgEnum('revenue_type', [
  'subscription',   // Recurring subscription
  'one_time',       // One-time purchase
  'usage',          // Usage-based
  'license',        // License fee
  'service',        // Professional services
  'other'           // Other
]);

// ============================================
// FINANCIAL TRANSACTIONS
// Core table for all financial data
// ============================================

export const financialTransactions = pgTable(
  'financial_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Transaction Type
    type: transactionTypeEnum('type').notNull(),
    category: expenseCategoryEnum('category'),
    revenueType: revenueTypeEnum('revenue_type'),
    subcategory: varchar('subcategory', { length: 100 }),

    // Amounts
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }).default('1'),
    amountInBaseCurrency: numeric('amount_base', { precision: 14, scale: 2 }),

    // Attribution
    customerId: uuid('customer_id'),
    dealId: uuid('deal_id'),
    productId: varchar('product_id', { length: 255 }),
    departmentId: varchar('department_id', { length: 100 }),

    // Accounting
    accountCode: varchar('account_code', { length: 20 }),
    costCenter: varchar('cost_center', { length: 50 }),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalPeriod: integer('fiscal_period').notNull(), // Month 1-12
    fiscalQuarter: integer('fiscal_quarter'), // Q1-Q4

    // Metadata
    description: text('description'),
    reference: varchar('reference', { length: 255 }), // Invoice#, PO#
    externalId: varchar('external_id', { length: 255 }),
    source: varchar('source', { length: 100 }).notNull().default('manual'),

    // Recurring info
    isRecurring: boolean('is_recurring').default(false),
    recurringId: uuid('recurring_id'),

    // Timestamps
    transactionDate: timestamp('transaction_date').notNull(),
    recognitionDate: timestamp('recognition_date'), // Revenue recognition date
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('fin_tx_workspace_idx').on(table.workspaceId),
    typeIdx: index('fin_tx_type_idx').on(table.type),
    categoryIdx: index('fin_tx_category_idx').on(table.category),
    customerIdx: index('fin_tx_customer_idx').on(table.customerId),
    dealIdx: index('fin_tx_deal_idx').on(table.dealId),
    dateIdx: index('fin_tx_date_idx').on(table.transactionDate),
    fiscalPeriodIdx: index('fin_tx_fiscal_idx').on(table.fiscalYear, table.fiscalPeriod),
    accountCodeIdx: index('fin_tx_account_idx').on(table.accountCode),
  })
);

// ============================================
// SALES REP PERFORMANCE
// Aggregated sales metrics per representative
// ============================================

export const salesRepPerformance = pgTable(
  'sales_rep_performance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    userName: varchar('user_name', { length: 255 }),

    // Period
    periodType: varchar('period_type', { length: 20 }).notNull(), // daily, weekly, monthly, quarterly
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),

    // Deal Metrics
    dealsWon: integer('deals_won').notNull().default(0),
    dealsLost: integer('deals_lost').notNull().default(0),
    dealsOpen: integer('deals_open').notNull().default(0),
    dealsCreated: integer('deals_created').notNull().default(0),

    // Revenue Metrics
    revenueWon: numeric('revenue_won', { precision: 14, scale: 2 }).notNull().default('0'),
    revenueLost: numeric('revenue_lost', { precision: 14, scale: 2 }).notNull().default('0'),
    revenuePipeline: numeric('revenue_pipeline', { precision: 14, scale: 2 }).notNull().default('0'),
    avgDealSize: numeric('avg_deal_size', { precision: 14, scale: 2 }),
    largestDeal: numeric('largest_deal', { precision: 14, scale: 2 }),

    // Performance Metrics
    winRate: numeric('win_rate', { precision: 5, scale: 4 }), // 0.0000 - 1.0000
    avgSalesCycleDays: integer('avg_sales_cycle_days'),
    avgDiscountPercent: numeric('avg_discount_percent', { precision: 5, scale: 2 }),

    // Activity Metrics
    callsMade: integer('calls_made').notNull().default(0),
    emailsSent: integer('emails_sent').notNull().default(0),
    meetingsHeld: integer('meetings_held').notNull().default(0),
    proposalsSent: integer('proposals_sent').notNull().default(0),
    demosCompleted: integer('demos_completed').notNull().default(0),

    // Quota & Attainment
    quotaAmount: numeric('quota_amount', { precision: 14, scale: 2 }),
    quotaAttainment: numeric('quota_attainment', { precision: 5, scale: 4 }),
    rankInTeam: integer('rank_in_team'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex('sales_perf_workspace_user_period_idx').on(
      table.workspaceId,
      table.userId,
      table.periodType,
      table.periodStart
    ),
    periodIdx: index('sales_perf_period_idx').on(table.periodStart, table.periodEnd),
    userIdx: index('sales_perf_user_idx').on(table.userId),
  })
);

// ============================================
// COST ALLOCATION RULES
// Rules for allocating costs to departments/products
// ============================================

export const costAllocationRules = pgTable(
  'cost_allocation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Rule Info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    priority: integer('priority').notNull().default(0),

    // Source Filter
    sourceCategory: expenseCategoryEnum('source_category'),
    sourceAccountCode: varchar('source_account_code', { length: 20 }),
    sourceCostCenter: varchar('source_cost_center', { length: 50 }),

    // Allocation Method
    allocationMethod: varchar('allocation_method', { length: 50 }).notNull(), // fixed, percentage, headcount, revenue

    // Allocation Targets (JSON array of targets with percentages)
    targets: jsonb('targets').$type<{
      targetType: 'department' | 'product' | 'customer' | 'project';
      targetId: string;
      targetName: string;
      percentage: number;
    }[]>().notNull().default([]),

    // Date Range
    effectiveFrom: timestamp('effective_from').notNull(),
    effectiveTo: timestamp('effective_to'),

    // Audit
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('cost_alloc_workspace_idx').on(table.workspaceId),
    activeIdx: index('cost_alloc_active_idx').on(table.isActive),
    effectiveIdx: index('cost_alloc_effective_idx').on(table.effectiveFrom, table.effectiveTo),
  })
);

// ============================================
// REVENUE SEGMENTS
// Customer/Product revenue segmentation
// ============================================

export const revenueSegments = pgTable(
  'revenue_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Segment Info
    name: varchar('name', { length: 255 }).notNull(),
    segmentType: varchar('segment_type', { length: 50 }).notNull(), // customer_tier, product_line, geo, industry
    description: text('description'),

    // Segment Rules (JSON-based rules engine)
    rules: jsonb('rules').$type<{
      field: string;
      operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
      value: string | number | string[] | number[];
    }[]>().notNull().default([]),

    // Metrics (aggregated)
    totalRevenue: numeric('total_revenue', { precision: 14, scale: 2 }).default('0'),
    customerCount: integer('customer_count').default(0),
    avgRevenuePerCustomer: numeric('avg_revenue_per_customer', { precision: 14, scale: 2 }),
    growthRate: numeric('growth_rate', { precision: 5, scale: 4 }),

    // Period for metrics
    metricsAsOf: timestamp('metrics_as_of'),
    metricsPeriod: varchar('metrics_period', { length: 20 }), // monthly, quarterly, yearly

    // Display
    color: varchar('color', { length: 7 }),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('rev_seg_workspace_idx').on(table.workspaceId),
    typeIdx: index('rev_seg_type_idx').on(table.segmentType),
    activeIdx: index('rev_seg_active_idx').on(table.isActive),
  })
);

// ============================================
// FINANCIAL FORECASTS
// AI-generated and manual forecasts
// ============================================

export const financialForecasts = pgTable(
  'financial_forecasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Forecast Info
    name: varchar('name', { length: 255 }).notNull(),
    forecastType: varchar('forecast_type', { length: 50 }).notNull(), // revenue, expense, cashflow, pipeline
    description: text('description'),

    // Period
    periodType: varchar('period_type', { length: 20 }).notNull(), // monthly, quarterly
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),

    // Method
    method: varchar('method', { length: 50 }).notNull(), // linear, exponential, moving_avg, ai_ml
    confidence: numeric('confidence', { precision: 5, scale: 4 }), // Model confidence score

    // Forecast Data (JSON array of period predictions)
    predictions: jsonb('predictions').$type<{
      period: string;
      predicted: number;
      lowerBound: number;
      upperBound: number;
      actual?: number;
      variance?: number;
    }[]>().notNull().default([]),

    // Model Parameters
    parameters: jsonb('parameters').$type<{
      historicalPeriods?: number;
      seasonality?: boolean;
      growthRate?: number;
      [key: string]: unknown;
    }>().default({}),

    // Accuracy (after actuals come in)
    mape: numeric('mape', { precision: 5, scale: 2 }), // Mean Absolute Percentage Error
    rmse: numeric('rmse', { precision: 14, scale: 2 }), // Root Mean Square Error

    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'),
    isBaseline: boolean('is_baseline').default(false),

    // Audit
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('fin_forecast_workspace_idx').on(table.workspaceId),
    typeIdx: index('fin_forecast_type_idx').on(table.forecastType),
    periodIdx: index('fin_forecast_period_idx').on(table.startDate, table.endDate),
    statusIdx: index('fin_forecast_status_idx').on(table.status),
  })
);

// ============================================
// EXPORT TYPES
// ============================================

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type NewFinancialTransaction = typeof financialTransactions.$inferInsert;

export type SalesRepPerformance = typeof salesRepPerformance.$inferSelect;
export type NewSalesRepPerformance = typeof salesRepPerformance.$inferInsert;

export type CostAllocationRule = typeof costAllocationRules.$inferSelect;
export type NewCostAllocationRule = typeof costAllocationRules.$inferInsert;

export type RevenueSegment = typeof revenueSegments.$inferSelect;
export type NewRevenueSegment = typeof revenueSegments.$inferInsert;

export type FinancialForecast = typeof financialForecasts.$inferSelect;
export type NewFinancialForecast = typeof financialForecasts.$inferInsert;
