/**
 * Enterprise Budget & Cost Management Schema
 * Phase 1: Database & Governance Foundation
 *
 * Features:
 * - Cost Centers for departmental budget allocation
 * - Projects for granular cost tracking
 * - Enterprise Audit Logs for compliance
 * - Forecasting data for predictive analytics
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
  text,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';
import { userBudgets } from './schema-user-budgets';
import { users } from './schema';

// =====================================================
// ENUMS
// =====================================================

export const costCenterStatusEnum = pgEnum('cost_center_status', [
  'active',
  'inactive',
  'archived'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'planning',
  'active',
  'paused',
  'completed',
  'archived'
]);

export const auditActionCategoryEnum = pgEnum('audit_action_category', [
  'budget_change',
  'limit_update',
  'top_up',
  'allocation',
  'project_change',
  'cost_center_change',
  'user_action',
  'system_action',
  'security'
]);

export const auditSeverityEnum = pgEnum('audit_severity', [
  'info',
  'warning',
  'critical',
  'security'
]);

// =====================================================
// COST CENTERS TABLE
// Organizational units for budget allocation
// =====================================================

export const costCenters = pgTable('cost_centers', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Organization hierarchy
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  parentCostCenterId: uuid('parent_cost_center_id').references(() => costCenters.id),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(), // e.g., "CC-ENG-001"
  description: text('description'),

  // Budget allocation
  allocatedBudgetUsd: numeric('allocated_budget_usd', { precision: 12, scale: 2 }).default('0.00'),
  usedBudgetUsd: numeric('used_budget_usd', { precision: 12, scale: 2 }).default('0.00'),
  allocatedTokens: integer('allocated_tokens').default(0),
  usedTokens: integer('used_tokens').default(0),

  // Limits
  monthlyBudgetLimitUsd: numeric('monthly_budget_limit_usd', { precision: 10, scale: 2 }),
  monthlyTokenLimit: integer('monthly_token_limit'),

  // Status & permissions
  status: costCenterStatusEnum('status').notNull().default('active'),
  managerId: varchar('manager_id', { length: 255 }), // User who manages this cost center
  allowOverspend: boolean('allow_overspend').notNull().default(false),
  overspendAlertThreshold: integer('overspend_alert_threshold').default(90), // %

  // Metadata
  metadata: jsonb('metadata').$type<{
    department?: string;
    businessUnit?: string;
    tags?: string[];
    notes?: string;
    approvers?: string[]; // User IDs who can approve spending
  }>().default({}),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  archivedAt: timestamp('archived_at'),
}, (table) => ({
  organizationIdx: index('cost_center_org_idx').on(table.organizationId),
  codeIdx: index('cost_center_code_idx').on(table.code),
  statusIdx: index('cost_center_status_idx').on(table.status),
  parentIdx: index('cost_center_parent_idx').on(table.parentCostCenterId),
  managerIdx: index('cost_center_manager_idx').on(table.managerId),
  orgCodeUnique: index('cost_center_org_code_unique').on(table.organizationId, table.code),
}));

// =====================================================
// PROJECTS TABLE
// Granular project-level cost tracking
// =====================================================

export const budgetProjects = pgTable('budget_projects', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relations
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  ownerId: varchar('owner_id', { length: 255 }).notNull(), // Project owner user ID

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(), // e.g., "PROJ-AI-2024-001"
  description: text('description'),

  // Budget allocation
  allocatedBudgetUsd: numeric('allocated_budget_usd', { precision: 10, scale: 2 }).default('0.00'),
  usedBudgetUsd: numeric('used_budget_usd', { precision: 10, scale: 2 }).default('0.00'),
  allocatedTokens: integer('allocated_tokens').default(0),
  usedTokens: integer('used_tokens').default(0),

  // Timeline
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),

  // Status
  status: projectStatusEnum('status').notNull().default('planning'),
  priority: integer('priority').default(5), // 1-10

  // Limits & controls
  dailyBudgetLimitUsd: numeric('daily_budget_limit_usd', { precision: 10, scale: 2 }),
  dailyTokenLimit: integer('daily_token_limit'),
  allowedModels: jsonb('allowed_models').$type<string[]>().default([]),
  allowedAgents: jsonb('allowed_agents').$type<string[]>().default([]),

  // Usage tracking
  totalRequests: integer('total_requests').default(0),
  lastActivityAt: timestamp('last_activity_at'),

  // Metadata
  metadata: jsonb('metadata').$type<{
    client?: string;
    campaign?: string;
    tags?: string[];
    objectives?: string[];
    teamMembers?: string[]; // User IDs
    externalId?: string; // External system reference
  }>().default({}),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  archivedAt: timestamp('archived_at'),
}, (table) => ({
  costCenterIdx: index('budget_project_cost_center_idx').on(table.costCenterId),
  ownerIdx: index('budget_project_owner_idx').on(table.ownerId),
  codeIdx: index('budget_project_code_idx').on(table.code),
  statusIdx: index('budget_project_status_idx').on(table.status),
  dateRangeIdx: index('budget_project_date_range_idx').on(table.startDate, table.endDate),
  lastActivityIdx: index('budget_project_last_activity_idx').on(table.lastActivityAt),
}));

// =====================================================
// ENTERPRISE AUDIT LOGS TABLE
// Comprehensive audit trail for compliance
// =====================================================

export const enterpriseAuditLogs = pgTable('enterprise_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Who performed the action
  userId: varchar('user_id', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }),
  userRole: varchar('user_role', { length: 50 }),

  // What action was performed
  action: varchar('action', { length: 100 }).notNull(), // e.g., "budget.limit.updated", "project.created"
  actionCategory: auditActionCategoryEnum('action_category').notNull(),
  severity: auditSeverityEnum('severity').notNull().default('info'),

  // On which resource
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // budget, project, cost_center, etc.
  resourceId: varchar('resource_id', { length: 255 }).notNull(),
  resourceName: varchar('resource_name', { length: 255 }),

  // Change details
  previousValue: jsonb('previous_value').$type<Record<string, any>>(),
  newValue: jsonb('new_value').$type<Record<string, any>>(),
  changeDescription: text('change_description'),

  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  requestId: varchar('request_id', { length: 255 }), // For tracing

  // Additional context
  metadata: jsonb('metadata').$type<{
    reason?: string;
    approvedBy?: string;
    riskScore?: number;
    complianceFlags?: string[];
    relatedResources?: Array<{ type: string; id: string }>;
  }>().default({}),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // Retention
  retentionExpiresAt: timestamp('retention_expires_at'), // For GDPR/compliance cleanup
}, (table) => ({
  userIdx: index('enterprise_audit_user_idx').on(table.userId),
  actionIdx: index('enterprise_audit_action_idx').on(table.action),
  categoryIdx: index('enterprise_audit_category_idx').on(table.actionCategory),
  severityIdx: index('enterprise_audit_severity_idx').on(table.severity),
  resourceIdx: index('enterprise_audit_resource_idx').on(table.resourceType, table.resourceId),
  createdAtIdx: index('enterprise_audit_created_at_idx').on(table.createdAt),
  retentionIdx: index('enterprise_audit_retention_idx').on(table.retentionExpiresAt),
  userActionIdx: index('enterprise_audit_user_action_idx').on(table.userId, table.action),
  dateRangeIdx: index('enterprise_audit_date_range_idx').on(table.createdAt),
}));

// =====================================================
// BUDGET FORECAST DATA TABLE
// Cached forecast calculations for performance
// =====================================================

export const budgetForecasts = pgTable('budget_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relations
  userId: varchar('user_id', { length: 255 }).notNull(),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  projectId: uuid('project_id').references(() => budgetProjects.id),

  // Forecast period
  forecastPeriod: varchar('forecast_period', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Predictions
  predictedTokens: integer('predicted_tokens').notNull(),
  predictedCostUsd: numeric('predicted_cost_usd', { precision: 10, scale: 4 }).notNull(),
  predictedRequests: integer('predicted_requests'),

  // Run-out analysis
  estimatedRunOutDate: timestamp('estimated_run_out_date'),
  estimatedEomCostUsd: numeric('estimated_eom_cost_usd', { precision: 10, scale: 4 }),
  estimatedEomTokens: integer('estimated_eom_tokens'),

  // Trend analysis
  dailyAvgTokens: integer('daily_avg_tokens'),
  dailyAvgCostUsd: numeric('daily_avg_cost_usd', { precision: 10, scale: 4 }),
  weeklyGrowthRate: numeric('weekly_growth_rate', { precision: 5, scale: 2 }), // %
  monthlyGrowthRate: numeric('monthly_growth_rate', { precision: 5, scale: 2 }), // %

  // Confidence
  confidenceScore: integer('confidence_score'), // 0-100
  dataPointsUsed: integer('data_points_used'),

  // Algorithm info
  algorithm: varchar('algorithm', { length: 50 }).notNull().default('linear_regression'),
  modelParams: jsonb('model_params').$type<{
    slope?: number;
    intercept?: number;
    r2?: number;
    mse?: number;
    weights?: number[];
  }>().default({}),

  // Anomaly detection
  anomalyDetected: boolean('anomaly_detected').default(false),
  anomalyDetails: jsonb('anomaly_details').$type<{
    type?: 'spike' | 'drop' | 'trend_change';
    magnitude?: number;
    expectedValue?: number;
    actualValue?: number;
    detectedAt?: string;
  }>(),

  // Cache control
  isStale: boolean('is_stale').default(false),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('budget_forecast_user_idx').on(table.userId),
  costCenterIdx: index('budget_forecast_cost_center_idx').on(table.costCenterId),
  projectIdx: index('budget_forecast_project_idx').on(table.projectId),
  periodIdx: index('budget_forecast_period_idx').on(table.forecastPeriod),
  periodRangeIdx: index('budget_forecast_period_range_idx').on(table.periodStart, table.periodEnd),
  expiresIdx: index('budget_forecast_expires_idx').on(table.expiresAt),
  staleIdx: index('budget_forecast_stale_idx').on(table.isStale),
}));

// =====================================================
// TYPE EXPORTS
// =====================================================

export type CostCenter = typeof costCenters.$inferSelect;
export type NewCostCenter = typeof costCenters.$inferInsert;

export type BudgetProject = typeof budgetProjects.$inferSelect;
export type NewBudgetProject = typeof budgetProjects.$inferInsert;

export type EnterpriseAuditLog = typeof enterpriseAuditLogs.$inferSelect;
export type NewEnterpriseAuditLog = typeof enterpriseAuditLogs.$inferInsert;

export type BudgetForecast = typeof budgetForecasts.$inferSelect;
export type NewBudgetForecast = typeof budgetForecasts.$inferInsert;

// =====================================================
// TYPESCRIPT INTERFACES FOR API RESPONSES
// =====================================================

export interface CostCenterWithStats extends CostCenter {
  projectCount?: number;
  activeProjectCount?: number;
  usagePercentage?: number;
  childCostCenters?: CostCenterWithStats[];
}

export interface ProjectWithUsage extends BudgetProject {
  costCenterName?: string;
  ownerName?: string;
  dailyUsage?: {
    date: string;
    tokens: number;
    cost: number;
  }[];
  modelBreakdown?: {
    model: string;
    tokens: number;
    cost: number;
    percentage: number;
  }[];
}

export interface ForecastSummary {
  currentMonthSpend: number;
  projectedMonthEnd: number;
  projectedOverage: number;
  runOutDate: Date | null;
  confidenceScore: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  actionCategory?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface CostAllocation {
  entityId: string;
  entityType: 'project' | 'cost_center' | 'model' | 'agent';
  entityName: string;
  tokensUsed: number;
  costUsd: number;
  percentage: number;
  requestCount: number;
}

export interface AnomalyAlert {
  id: string;
  type: 'spike' | 'unusual_pattern' | 'limit_approaching' | 'trend_change';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: 'tokens' | 'cost' | 'requests';
  expectedValue: number;
  actualValue: number;
  percentageDeviation: number;
  detectedAt: Date;
  resourceType: string;
  resourceId: string;
  resourceName: string;
}
