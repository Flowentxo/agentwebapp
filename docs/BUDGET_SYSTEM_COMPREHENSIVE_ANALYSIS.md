# BUDGET SYSTEM - Umfassende Technische Analyse

**Projekt:** Flowent AI Agent Web Application
**Feature Level:** Enterprise Budget & Cost Management
**Erstellungsdatum:** 2025-12-28
**Version:** 1.0
**Autor:** Claude Code Analysis

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Systemarchitektur](#2-systemarchitektur)
3. [Datenbank-Schema](#3-datenbank-schema)
4. [Backend-Services](#4-backend-services)
5. [API-Endpunkte](#5-api-endpunkte)
6. [Frontend-Komponenten](#6-frontend-komponenten)
7. [Enterprise-Features](#7-enterprise-features)
8. [Sicherheit & Authentifizierung](#8-sicherheit-authentifizierung)
9. [Feature-Status-Matrix](#9-feature-status-matrix)
10. [Datenfluss-Diagramme](#10-datenfluss-diagramme)
11. [Erweiterungsmöglichkeiten](#11-erweiterungsmöglichkeiten)
12. [Technische Schulden & TODOs](#12-technische-schulden-todos)

---

## 1. Executive Summary

Das Budget-System ist ein **vollständiges Enterprise-Grade Cost Management System** für AI-Token-Verbrauch mit folgenden Kernfähigkeiten:

### Gesamtübersicht

| Komponente | Status | Beschreibung |
|------------|--------|--------------|
| **User Budgets** | ✅ Produktionsreif | Token- und Kostenlimits pro User |
| **Usage Tracking** | ✅ Produktionsreif | Echtzeit-Verbrauchsverfolgung |
| **Alert System** | ✅ Produktionsreif | Threshold-basierte Warnungen |
| **Billing/Top-Up** | ✅ Produktionsreif | Stripe-Integration für Zahlungen |
| **Enterprise Forecasting** | ✅ Implementiert | Lineare Regression für Prognosen |
| **Cost Centers** | ✅ Implementiert | Abteilungsbudgets |
| **Projects** | ✅ Implementiert | Projektbasierte Kostenzuordnung |
| **Audit Logs** | ✅ Implementiert | 7-Jahre Compliance-Logs |
| **Frontend Dashboard** | ✅ Implementiert | Premium Apple-inspired UI |

### Architektur-Highlights

- **Multi-Tenancy**: Vollständige User-Isolierung via `userId`
- **Graceful Degradation**: Fallback-Budget bei DB-Fehlern
- **Enterprise-Ready**: Cost Centers, Projects, Audit Logs
- **Predictive Analytics**: Lineare Regression für Kostenprognosen
- **Anomalie-Erkennung**: Automatische Spike/Drop-Detection

---

## 2. Systemarchitektur

### 2.1 Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND                                         │
│                            (Next.js 14 App Router)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        PremiumBudgetPage.tsx                              │  │
│  │                        (1002 Zeilen Code)                                 │  │
│  │                                                                           │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ BentoCard       │  │ Progress Ring   │  │ Token Velocity Chart   │   │  │
│  │  │ (Glassmorphism) │  │ (Budget %)      │  │ (Recharts AreaChart)   │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  │                                                                           │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ Today's Usage   │  │ Available Tokens│  │ Cost Breakdown Donut   │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Recent Usage Table                               │ │  │
│  │  │                    Billing History Table                            │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    TopUpDrawer (Stripe Checkout)                    │ │  │
│  │  │                    Auto-Reload Configuration                        │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    Enterprise Components                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ ForecastCard    │  │ CostCenterMgr   │  │ ProjectManager         │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────────────────────┐    │  │
│  │  │ AuditLogViewer  │  │ EnterpriseBudgetDashboard (Tabs)            │    │  │
│  │  └─────────────────┘  └─────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
                                   │ API Routes (Server Actions)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND                                            │
│                        (Next.js API Routes)                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         API ENDPOINTS                                     │  │
│  │                                                                           │  │
│  │  Base Endpoints:                    Enterprise Endpoints:                 │  │
│  │  ├── GET  /api/budget              ├── GET/POST /api/budget/enterprise/  │  │
│  │  ├── PUT  /api/budget              │            forecast                  │  │
│  │  ├── GET  /api/budget/history      ├── GET/POST /api/budget/enterprise/  │  │
│  │  ├── GET  /api/budget/alerts       │            cost-centers              │  │
│  │  ├── PUT  /api/budget/alerts       ├── GET/POST/PATCH/DELETE             │  │
│  │  ├── POST /api/budget/preferences  │            /api/budget/enterprise/  │  │
│  │  └── GET  /api/budget/rate-limits  │            projects                  │  │
│  │                                    ├── GET/POST /api/budget/enterprise/  │  │
│  │                                    │            audit-logs                │  │
│  │                                    └── GET  /api/budget/enterprise/      │  │
│  │                                             export                        │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         BUDGET SERVICE                                    │  │
│  │                     (server/services/BudgetService.ts)                    │  │
│  │                            1544 Zeilen Code                               │  │
│  │                                                                           │  │
│  │  Core Methods:                      Enterprise Methods:                   │  │
│  │  ├── getUserBudget()               ├── calculateForecast()               │  │
│  │  ├── checkBudget()                 │    (Linear Regression)              │  │
│  │  ├── trackUsage()                  ├── detectAnomalies()                 │  │
│  │  ├── checkThresholdAlerts()        ├── getCostCenters()                  │  │
│  │  ├── createAlert()                 ├── createCostCenter()                │  │
│  │  ├── getUnreadAlerts()             ├── getProjects()                     │  │
│  │  ├── getAllAlerts()                ├── createProject()                   │  │
│  │  ├── checkCostAlerts()             ├── logAuditAction()                  │  │
│  │  ├── getRateLimitConfig()          └── getAuditLogs()                    │  │
│  │  ├── getModelPreferences()                                                │  │
│  │  ├── setPreferredModel()                                                  │  │
│  │  ├── setAutoCostOptimization()                                            │  │
│  │  ├── updateBudgetPreferences()                                            │  │
│  │  └── updateBudgetLimits()                                                 │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
                                   │ Drizzle ORM
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATENBANK                                           │
│                            (PostgreSQL)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    CORE TABLES (schema-user-budgets.ts)                 │    │
│  │                                                                          │    │
│  │  ┌──────────────────┐  ┌────────────────────────┐  ┌────────────────┐   │    │
│  │  │   user_budgets   │  │ budget_usage_history   │  │ budget_alerts  │   │    │
│  │  │                  │  │                        │  │                │   │    │
│  │  │ • monthlyLimits  │  │ • period (day/month)   │  │ • alertType    │   │    │
│  │  │ • dailyLimits    │  │ • tokensUsed           │  │ • severity     │   │    │
│  │  │ • currentUsage   │  │ • costUsd              │  │ • message      │   │    │
│  │  │ • rateLimits     │  │ • requestCount         │  │ • currentUsage │   │    │
│  │  │ • preferences    │  │ • modelUsage (JSON)    │  │ • limit        │   │    │
│  │  │ • forecastData   │  │ • agentUsage (JSON)    │  │ • isRead       │   │    │
│  │  └──────────────────┘  └────────────────────────┘  └────────────────┘   │    │
│  │                                                                          │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │    │
│  │  │                    billing_transactions                            │ │    │
│  │  │    • packageId  • amount  • tokens  • status  • transactionId     │ │    │
│  │  └────────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │              ENTERPRISE TABLES (schema-budget-enterprise.ts)            │    │
│  │                                                                          │    │
│  │  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────────┐   │    │
│  │  │   cost_centers   │  │  budget_projects   │  │enterprise_audit_   │   │    │
│  │  │                  │  │                    │  │      logs          │   │    │
│  │  │ • organizationId │  │ • costCenterId     │  │ • action           │   │    │
│  │  │ • parentId       │  │ • ownerId          │  │ • actionCategory   │   │    │
│  │  │ • allocatedBudget│  │ • allocatedBudget  │  │ • severity         │   │    │
│  │  │ • usedBudget     │  │ • usedBudget       │  │ • previousValue    │   │    │
│  │  │ • monthlyLimit   │  │ • status           │  │ • newValue         │   │    │
│  │  │ • allowOverspend │  │ • startDate/endDate│  │ • ipAddress        │   │    │
│  │  └──────────────────┘  └────────────────────┘  └────────────────────┘   │    │
│  │                                                                          │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │    │
│  │  │                      budget_forecasts                              │ │    │
│  │  │  • predictedTokens  • predictedCostUsd  • estimatedRunOutDate     │ │    │
│  │  │  • dailyAvgTokens   • confidenceScore   • algorithm (linear_reg)  │ │    │
│  │  │  • anomalyDetected  • modelParams (slope, intercept, r2, mse)     │ │    │
│  │  └────────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technologie-Stack

| Schicht | Technologie | Version |
|---------|-------------|---------|
| Frontend | Next.js (App Router) | 14.x |
| UI-Library | React | 18.x |
| Animationen | Framer Motion | 10.x |
| Charts | Recharts | 2.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Next.js API Routes | 14.x |
| ORM | Drizzle ORM | 0.29.x |
| Datenbank | PostgreSQL | 15.x |
| Authentifizierung | Custom Session (getSession) | - |
| Zahlungen | Stripe | - |

---

## 3. Datenbank-Schema

### 3.1 Core Schema (schema-user-budgets.ts)

#### user_budgets Tabelle

```typescript
export const userBudgets = pgTable('user_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),

  // === MONATLICHE LIMITS ===
  monthlyTokenLimit: integer('monthly_token_limit').default(1000000),  // 1M Tokens
  monthlyCostLimitUsd: numeric('monthly_cost_limit_usd').default('100.00'),

  // === TÄGLICHE LIMITS ===
  dailyTokenLimit: integer('daily_token_limit').default(50000),  // 50k Tokens
  dailyCostLimitUsd: numeric('daily_cost_limit_usd').default('10.00'),

  // === PRO-REQUEST LIMITS ===
  maxTokensPerRequest: integer('max_tokens_per_request').default(4000),

  // === RATE LIMITING ===
  maxRequestsPerMinute: integer('max_requests_per_minute').default(5),
  maxRequestsPerHour: integer('max_requests_per_hour').default(50),
  maxRequestsPerDay: integer('max_requests_per_day').default(200),

  // === AKTUELLER VERBRAUCH (wird periodisch zurückgesetzt) ===
  currentMonthTokens: integer('current_month_tokens').default(0),
  currentMonthCostUsd: numeric('current_month_cost_usd').default('0.000000'),
  currentDayTokens: integer('current_day_tokens').default(0),
  currentDayCostUsd: numeric('current_day_cost_usd').default('0.000000'),

  // === RESET-ZEITSTEMPEL ===
  monthResetAt: timestamp('month_reset_at').notNull().defaultNow(),
  dayResetAt: timestamp('day_reset_at').notNull().defaultNow(),

  // === STATUS & BENACHRICHTIGUNGEN ===
  isActive: boolean('is_active').default(true).notNull(),
  notifyOnThreshold: boolean('notify_on_threshold').default(true),
  notifyThresholdPercent: integer('notify_threshold_percent').default(80),

  // === AI MODEL PREFERENCES ===
  preferredModel: varchar('preferred_model').default('gpt-4o-mini'),
  allowedModels: jsonb('allowed_models').$type<string[]>(),
  autoCostOptimization: boolean('auto_cost_optimization').default(false),

  // === METADATA ===
  metadata: jsonb('metadata').$type<{
    plan?: 'free' | 'starter' | 'pro' | 'enterprise';
    autoReload?: { enabled: boolean; threshold: number; packageId?: number };
  }>(),

  // === ENTERPRISE FIELDS ===
  defaultCostCenterId: uuid('default_cost_center_id'),
  defaultProjectId: uuid('default_project_id'),
  forecastData: jsonb('forecast_data'),  // Cached predictions
  isEnterprise: boolean('is_enterprise').default(false),
  organizationId: varchar('organization_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### budget_usage_history Tabelle

```typescript
export const budgetUsageHistory = pgTable('budget_usage_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(),

  period: varchar('period').notNull(),  // 'day' | 'month'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  tokensUsed: integer('tokens_used').notNull(),
  costUsd: numeric('cost_usd').notNull(),
  requestCount: integer('request_count').notNull(),

  // Enterprise Attribution
  costCenterId: uuid('cost_center_id'),
  projectId: uuid('project_id'),

  // Model & Agent Breakdown
  modelUsage: jsonb('model_usage'),  // { "gpt-4": { tokens, cost, requests } }
  agentUsage: jsonb('agent_usage'),  // { "dexter": { tokens, cost, requests } }

  // Performance Metrics
  avgResponseTimeMs: integer('avg_response_time_ms'),
  errorCount: integer('error_count').default(0),
  successRate: integer('success_rate'),  // 0-100

  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### budget_alerts Tabelle

```typescript
export const budgetAlerts = pgTable('budget_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(),

  alertType: varchar('alert_type').notNull(),
  // Types: 'threshold', 'limit_exceeded', 'daily_reset', 'monthly_reset',
  //        'daily_cost_threshold', 'daily_cost_exceeded',
  //        'monthly_cost_threshold', 'monthly_cost_exceeded', 'high_cost_request'

  severity: varchar('severity').notNull(),  // 'info' | 'warning' | 'critical'

  message: varchar('message').notNull(),
  currentUsage: jsonb('current_usage'),  // { tokens?, costUsd?, percentage? }
  limit: jsonb('limit'),  // { tokens?, costUsd? }

  isRead: boolean('is_read').default(false),
  isSent: boolean('is_sent').default(false),  // For email notifications

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 3.2 Enterprise Schema (schema-budget-enterprise.ts)

#### cost_centers Tabelle

```typescript
export const costCenters = pgTable('cost_centers', {
  id: uuid('id').primaryKey().defaultRandom(),

  organizationId: varchar('organization_id').notNull(),
  parentCostCenterId: uuid('parent_cost_center_id').references(() => costCenters.id),

  name: varchar('name').notNull(),
  code: varchar('code').notNull(),  // z.B. "CC-ENG-001"
  description: text('description'),

  // Budget Allocation
  allocatedBudgetUsd: numeric('allocated_budget_usd').default('0.00'),
  usedBudgetUsd: numeric('used_budget_usd').default('0.00'),
  allocatedTokens: integer('allocated_tokens').default(0),
  usedTokens: integer('used_tokens').default(0),

  // Limits
  monthlyBudgetLimitUsd: numeric('monthly_budget_limit_usd'),
  monthlyTokenLimit: integer('monthly_token_limit'),

  // Status & Permissions
  status: costCenterStatusEnum('status').default('active'),
  managerId: varchar('manager_id'),
  allowOverspend: boolean('allow_overspend').default(false),
  overspendAlertThreshold: integer('overspend_alert_threshold').default(90),

  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### budget_projects Tabelle

```typescript
export const budgetProjects = pgTable('budget_projects', {
  id: uuid('id').primaryKey().defaultRandom(),

  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  ownerId: varchar('owner_id').notNull(),

  name: varchar('name').notNull(),
  code: varchar('code').notNull(),  // z.B. "PROJ-AI-2024-001"
  description: text('description'),

  // Budget Allocation
  allocatedBudgetUsd: numeric('allocated_budget_usd').default('0.00'),
  usedBudgetUsd: numeric('used_budget_usd').default('0.00'),
  allocatedTokens: integer('allocated_tokens').default(0),
  usedTokens: integer('used_tokens').default(0),

  // Timeline
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),

  // Status: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
  status: projectStatusEnum('status').default('planning'),
  priority: integer('priority').default(5),  // 1-10

  // Limits & Controls
  dailyBudgetLimitUsd: numeric('daily_budget_limit_usd'),
  dailyTokenLimit: integer('daily_token_limit'),
  allowedModels: jsonb('allowed_models').$type<string[]>(),
  allowedAgents: jsonb('allowed_agents').$type<string[]>(),

  totalRequests: integer('total_requests').default(0),
  lastActivityAt: timestamp('last_activity_at'),

  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### enterprise_audit_logs Tabelle (7 Jahre Retention)

```typescript
export const enterpriseAuditLogs = pgTable('enterprise_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Who
  userId: varchar('user_id').notNull(),
  userEmail: varchar('user_email'),
  userRole: varchar('user_role'),

  // What
  action: varchar('action').notNull(),  // z.B. "budget.limit.updated"
  actionCategory: auditActionCategoryEnum('action_category').notNull(),
  severity: auditSeverityEnum('severity').default('info'),

  // On Which Resource
  resourceType: varchar('resource_type').notNull(),
  resourceId: varchar('resource_id').notNull(),
  resourceName: varchar('resource_name'),

  // Change Details
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  changeDescription: text('change_description'),

  // Context
  ipAddress: varchar('ip_address'),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id'),
  requestId: varchar('request_id'),

  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  retentionExpiresAt: timestamp('retention_expires_at'),  // 7 Jahre
});
```

### 3.3 Datenbank-Indizes

```sql
-- User Budgets
CREATE INDEX "budget_usage_history_user_idx" ON budget_usage_history(user_id);
CREATE INDEX "budget_usage_history_period_start_idx" ON budget_usage_history(period_start);
CREATE INDEX "budget_usage_history_cost_center_idx" ON budget_usage_history(cost_center_id);
CREATE INDEX "budget_usage_history_project_idx" ON budget_usage_history(project_id);

-- Cost Centers
CREATE INDEX "cost_center_org_idx" ON cost_centers(organization_id);
CREATE INDEX "cost_center_code_idx" ON cost_centers(code);
CREATE UNIQUE INDEX "cost_center_org_code_unique" ON cost_centers(organization_id, code);

-- Projects
CREATE INDEX "budget_project_cost_center_idx" ON budget_projects(cost_center_id);
CREATE INDEX "budget_project_status_idx" ON budget_projects(status);

-- Audit Logs
CREATE INDEX "enterprise_audit_user_action_idx" ON enterprise_audit_logs(user_id, action);
CREATE INDEX "enterprise_audit_date_range_idx" ON enterprise_audit_logs(created_at);
CREATE INDEX "enterprise_audit_retention_idx" ON enterprise_audit_logs(retention_expires_at);
```

---

## 4. Backend-Services

### 4.1 BudgetService Klasse (1544 Zeilen)

**Datei:** `server/services/BudgetService.ts`

#### Core-Methoden

| Methode | Signatur | Beschreibung |
|---------|----------|--------------|
| `getUserBudget` | `(userId: string) => Promise<UserBudget>` | Holt oder erstellt User-Budget mit automatischem Reset |
| `checkBudget` | `(userId: string, estimatedTokens?: number) => Promise<BudgetCheckResult>` | Pre-flight Check vor AI-Requests |
| `trackUsage` | `(userId: string, tokens: number, costUsd: number, context?: UsageContext) => Promise<void>` | Verbrauch nach Request tracken |
| `checkThresholdAlerts` | `(budget: UserBudget) => Promise<void>` | Generiert Alerts bei 80%/100% |
| `checkCostAlerts` | `(userId: string, costUsd: number) => Promise<void>` | Prüft Kostenbasierte Alerts |
| `getUnreadAlerts` | `(userId: string) => Promise<BudgetAlert[]>` | Ungelesene Alerts abrufen |
| `getAllAlerts` | `(userId: string, limit?: number) => Promise<BudgetAlert[]>` | Alle Alerts abrufen |
| `markAlertAsRead` | `(alertId: string) => Promise<void>` | Alert als gelesen markieren |
| `getRateLimitConfig` | `(userId: string) => Promise<RateLimitConfig>` | Rate Limit Konfiguration |
| `getModelPreferences` | `(userId: string) => Promise<ModelPreferences>` | Model-Präferenzen |
| `updateBudgetLimits` | `(userId: string, limits: Partial<Limits>) => Promise<UserBudget>` | Limits aktualisieren (Admin) |

#### Enterprise-Methoden

| Methode | Signatur | Beschreibung |
|---------|----------|--------------|
| `calculateForecast` | `(userId: string, costCenterId?, projectId?) => Promise<ForecastSummary>` | Lineare Regression für Prognosen |
| `detectAnomalies` | `(userId: string) => Promise<AnomalyAlert[]>` | Spike/Drop Detection |
| `getCostCenters` | `(organizationId: string) => Promise<CostCenter[]>` | Alle Cost Centers abrufen |
| `createCostCenter` | `(data: NewCostCenter, auditContext?) => Promise<CostCenter>` | Cost Center erstellen |
| `getProjects` | `(costCenterId?: string) => Promise<BudgetProject[]>` | Projekte abrufen |
| `createProject` | `(data: NewProject, auditContext?) => Promise<BudgetProject>` | Projekt erstellen |
| `logAuditAction` | `(action, category, resourceType, resourceId, context, details) => Promise<void>` | Audit Log erstellen |
| `getAuditLogs` | `(filters: AuditLogFilters) => Promise<EnterpriseAuditLog[]>` | Audit Logs filtern |

### 4.2 Linear Regression Algorithmus

```typescript
/**
 * Berechnet lineare Regression für Kostenprognosen
 *
 * @param data - Array von {x: Tag-Index, y: Kosten}
 * @returns {slope, intercept, r2, mse}
 */
private linearRegression(data: { x: number; y: number }[]): RegressionResult {
  const n = data.length;

  // Mittelwerte berechnen
  const meanX = sumX / n;
  const meanY = sumY / n;

  // Steigung und Y-Achsenabschnitt
  let numerator = 0;
  let denominator = 0;
  for (const point of data) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // R² und MSE für Konfidenz
  let ssRes = 0, ssTot = 0;
  for (const point of data) {
    const predicted = slope * point.x + intercept;
    ssRes += (point.y - predicted) ** 2;
    ssTot += (point.y - meanY) ** 2;
  }

  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  const mse = ssRes / n;

  return { slope, intercept, r2, mse };
}
```

### 4.3 Anomalie-Erkennung

```typescript
/**
 * Erkennt Anomalien im Nutzungsmuster
 * Vergleicht letzte 7 Tage gegen 30-Tage-Baseline
 * Threshold: ±2 Standardabweichungen
 */
async detectAnomalies(userId: string): Promise<AnomalyAlert[]> {
  // Baseline: Letzte 30 Tage (ohne letzte 7)
  const baselineAvgCost = /* ... */;
  const costStdDev = /* Standardabweichung */;

  for (const usage of recentUsage) {
    const dailyCost = parseFloat(usage.costUsd);

    // Spike: > 2 Standardabweichungen über Durchschnitt
    if (dailyCost > baselineAvgCost + 2 * costStdDev) {
      alerts.push({
        type: 'spike',
        severity: percentageDeviation > 100 ? 'critical' : 'warning',
        message: `Unusual cost spike: $${dailyCost}...`,
      });
    }

    // Drop: < 50% des Durchschnitts
    if (dailyCost < baselineAvgCost * 0.5) {
      alerts.push({
        type: 'drop',
        severity: 'info',
        message: `Significant usage drop...`,
      });
    }
  }
}
```

---

## 5. API-Endpunkte

### 5.1 Base Budget Endpoints

| Endpoint | Method | Auth | Beschreibung |
|----------|--------|------|--------------|
| `/api/budget` | GET | ✅ | Aktuelles Budget mit Limits, Usage, Percentages |
| `/api/budget` | PUT | ✅ | Budget-Limits aktualisieren (TODO: Admin Check) |
| `/api/budget/alerts` | GET | ✅ | Alle oder ungelesene Alerts abrufen |
| `/api/budget/alerts` | PUT | ✅ | Alert(s) als gelesen markieren |
| `/api/budget/alerts` | DELETE | ✅ | Alte Alerts löschen (30+ Tage) |
| `/api/budget/history` | GET | ✅ | 30-Tage Usage History für Charts |
| `/api/budget/preferences` | POST | ✅ | Auto-Reload Einstellungen speichern |
| `/api/budget/rate-limits` | GET | ✅ | Rate Limit Konfiguration abrufen |

### 5.2 Enterprise Endpoints

| Endpoint | Method | Auth | Beschreibung |
|----------|--------|------|--------------|
| `/api/budget/enterprise/forecast` | GET | ✅ | Prognosen mit Anomalie-Erkennung |
| `/api/budget/enterprise/forecast` | POST | ✅ | Forecast neu berechnen (Cache bypass) |
| `/api/budget/enterprise/cost-centers` | GET | ✅ | Cost Centers auflisten |
| `/api/budget/enterprise/cost-centers` | POST | ✅ | Cost Center erstellen |
| `/api/budget/enterprise/projects` | GET | ✅ | Projekte auflisten (optional nach Cost Center) |
| `/api/budget/enterprise/projects` | POST | ✅ | Projekt erstellen |
| `/api/budget/enterprise/projects` | PATCH | ✅ | Projekt aktualisieren |
| `/api/budget/enterprise/projects` | DELETE | ✅ | Projekt archivieren |
| `/api/budget/enterprise/audit-logs` | GET | ✅ | Audit Logs mit Filterung |
| `/api/budget/enterprise/audit-logs` | POST | ✅ | Audit Log manuell erstellen |
| `/api/budget/enterprise/export` | GET | ✅ | CSV/JSON Export |

### 5.3 API Response Beispiele

#### GET /api/budget Response

```json
{
  "success": true,
  "isFallback": false,
  "data": {
    "budget": {
      "limits": {
        "monthlyTokens": 1000000,
        "monthlyCostUsd": 100.00,
        "dailyTokens": 50000,
        "dailyCostUsd": 10.00,
        "maxTokensPerRequest": 4000,
        "maxRequestsPerMinute": 5
      },
      "usage": {
        "monthlyTokens": 250000,
        "monthlyCostUsd": 25.50,
        "dailyTokens": 12000,
        "dailyCostUsd": 1.20
      },
      "percentages": {
        "monthlyTokens": 25.0,
        "monthlyCost": 25.5,
        "dailyTokens": 24.0,
        "dailyCost": 12.0
      },
      "resets": {
        "monthResetAt": "2025-12-01T00:00:00.000Z",
        "dayResetAt": "2025-12-28T00:00:00.000Z"
      },
      "isActive": true,
      "plan": "pro",
      "autoReload": {
        "enabled": true,
        "threshold": 10,
        "packageId": 2
      }
    },
    "alerts": [
      {
        "id": "alert-123",
        "type": "threshold",
        "severity": "warning",
        "message": "You've used 80% of your monthly token limit.",
        "createdAt": "2025-12-28T10:30:00.000Z"
      }
    ]
  }
}
```

#### GET /api/budget/enterprise/forecast Response

```json
{
  "success": true,
  "data": {
    "forecast": {
      "currentMonthSpend": 25.50,
      "projectedMonthEnd": 85.20,
      "projectedOverage": 0,
      "runOutDate": "2026-01-15T00:00:00.000Z",
      "confidenceScore": 78,
      "trend": "increasing",
      "recommendation": "Usage is trending upward. Monitor closely."
    },
    "anomalies": [
      {
        "id": "anomaly-456",
        "type": "spike",
        "severity": "warning",
        "message": "Unusual cost spike detected: $15.20 (120% above average)",
        "metric": "cost",
        "expectedValue": 6.90,
        "actualValue": 15.20,
        "percentageDeviation": 120.3,
        "detectedAt": "2025-12-27T00:00:00.000Z"
      }
    ],
    "budget": {
      "monthlyLimit": 100.00,
      "monthlyTokenLimit": 1000000,
      "currentMonthCost": 25.50,
      "currentMonthTokens": 250000,
      "isEnterprise": false
    },
    "meta": {
      "calculatedAt": "2025-12-28T12:00:00.000Z",
      "algorithm": "linear_regression",
      "dataPointsUsed": 30
    }
  }
}
```

---

## 6. Frontend-Komponenten

### 6.1 Komponenten-Übersicht

| Komponente | Datei | Zeilen | Status |
|------------|-------|--------|--------|
| PremiumBudgetPage | `components/dashboard/PremiumBudgetPage.tsx` | 1002 | ✅ Vollständig |
| EnterpriseBudgetDashboard | `components/budget/enterprise/EnterpriseBudgetDashboard.tsx` | ~300 | ✅ Implementiert |
| ForecastCard | `components/budget/enterprise/ForecastCard.tsx` | ~200 | ✅ Implementiert |
| CostCenterManager | `components/budget/enterprise/CostCenterManager.tsx` | ~400 | ✅ Implementiert |
| ProjectManager | `components/budget/enterprise/ProjectManager.tsx` | 669 | ✅ Implementiert |
| AuditLogViewer | `components/budget/enterprise/AuditLogViewer.tsx` | 507 | ✅ Implementiert |

### 6.2 PremiumBudgetPage Features

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           PremiumBudgetPage.tsx                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              HEADER                                          │ │
│  │  • Workspace / Usage & Resources Breadcrumb                                  │ │
│  │  • "Capital Insights" Titel                                                  │ │
│  │  • Protocol Secure Badge (animated)                                          │ │
│  │  • Quick Actions Button (⌘K)                                                 │ │
│  │  • UserProfileBox                                                            │ │
│  │  • "Add Funds" Button → TopUpDrawer                                          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           ALERT BANNER                                       │ │
│  │  • Critical (rot), Warning (orange), Info (blau)                             │ │
│  │  • AlertCircle Icon + Message + Timestamp                                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                        BENTO GRID LAYOUT                                   │   │
│  │                                                                            │   │
│  │  ┌─────────────────────────────┐  ┌──────────────────────────────────────┐│   │
│  │  │   HERO CARD (2x2)           │  │   TOKEN VELOCITY CHART              ││   │
│  │  │   • Progress Ring (Budget %)│  │   • AreaChart (Recharts)            ││   │
│  │  │   • Total Budget Spend      │  │   • 30-Tage History                 ││   │
│  │  │   • Available Capital       │  │   • Gradient Fill                   ││   │
│  │  │   • Spending Pace           │  │   • +12% vs last week Badge         ││   │
│  │  └─────────────────────────────┘  └──────────────────────────────────────┘│   │
│  │                                                                            │   │
│  │  ┌─────────────────────────────┐  ┌──────────────────────────────────────┐│   │
│  │  │   TODAY'S CONSUMPTION       │  │   AVAILABLE TOKENS                  ││   │
│  │  │   • Zap Icon                │  │   • DollarSign Icon                 ││   │
│  │  │   • Daily Cost (USD)        │  │   • Remaining Tokens                ││   │
│  │  │   • "Active" Status         │  │   • Progress Bar                    ││   │
│  │  └─────────────────────────────┘  └──────────────────────────────────────┘│   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                        BOTTOM SECTION                                      │   │
│  │                                                                            │   │
│  │  ┌─────────────────────────────────────────┐  ┌──────────────────────────┐│   │
│  │  │   LATEST INSIGHTS TABLE (2/3 width)    │  │   INVESTMENT SPLIT       ││   │
│  │  │   • Model                               │  │   • PieChart (Donut)     ││   │
│  │  │   • Tokens                              │  │   • Used vs Remaining    ││   │
│  │  │   • Investment (Cost)                   │  │   • Monthly Cap Info     ││   │
│  │  │   • Status (Completed/Error)            │  │                          ││   │
│  │  └─────────────────────────────────────────┘  └──────────────────────────┘│   │
│  │                                                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │   │
│  │  │   INVESTMENT HISTORY TABLE (full width)                             │  │   │
│  │  │   • Date                                                            │  │   │
│  │  │   • Package ID                                                      │  │   │
│  │  │   • Tokens Credited                                                 │  │   │
│  │  │   • Amount                                                          │  │   │
│  │  │   • Status                                                          │  │   │
│  │  └─────────────────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                        TOP-UP DRAWER (Slide-in)                           │   │
│  │   • Package Selection (Starter $10, Pro $50, Scale $100)                  │   │
│  │   • Token Estimates (~50M, ~280M, ~600M)                                  │   │
│  │   • Message Count Estimate                                                 │   │
│  │   • Auto-Reload Toggle + Threshold Slider                                  │   │
│  │   • Stripe Checkout Integration                                            │   │
│  │   • Processing / Success States                                            │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Design System

```typescript
// Design Tokens (Apple-inspired)
const tokens = {
  bgCard: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accent: 'rgb(var(--accent))',       // #6366f1 (Violet)
  accentAlt: 'rgb(var(--accent-alt))', // #14b8a6 (Teal)
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  fontFamily: '"SF Pro Display", -apple-system, ...',
};

// Glassmorphism Card
<BentoCard>
  style={{
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(50px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '40px',
    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02),
                0 20px 50px rgba(0,0,0,0.3)',
  }}

  // Spotlight Effect on Hover
  <div style={{
    background: 'radial-gradient(
      600px circle at var(--mouse-x) var(--mouse-y),
      rgba(255,255,255,0.06),
      transparent 40%
    )'
  }} />
</BentoCard>
```

---

## 7. Enterprise-Features

### 7.1 Cost Centers

**Hierarchische Budgetstruktur für Organisationen**

```
Organization
├── Cost Center: Engineering (CC-ENG-001)
│   ├── Project: AI Chatbot (PROJ-AI-001)
│   └── Project: Data Pipeline (PROJ-DATA-001)
├── Cost Center: Marketing (CC-MKT-001)
│   └── Project: Q1 Campaign (PROJ-MKT-Q1)
└── Cost Center: Sales (CC-SALES-001)
    └── Project: Lead Gen Bot (PROJ-SALES-LG)
```

**Features:**
- Hierarchische Struktur (Parent Cost Centers)
- Budget-Allocation pro Abteilung
- Overspend-Kontrolle mit Alerts
- Manager-Zuordnung

### 7.2 Projects

**Granulare Kostenverfolgung pro Projekt**

**Projekt-Status Workflow:**
```
planning → active → paused → completed → archived
                └───────────────────────┘
                     (kann zurückgesetzt werden)
```

**Features:**
- Start-/Enddatum
- Tägliche Limits zusätzlich zu Projekt-Budget
- Erlaubte Models/Agents pro Projekt
- Automatisches Usage-Tracking

### 7.3 Audit Logs (7 Jahre Retention)

**Compliance-konforme Protokollierung**

| Action Category | Beispiele |
|-----------------|-----------|
| `budget_change` | Limit-Änderungen |
| `limit_update` | Quota-Anpassungen |
| `top_up` | Zahlungen/Credits |
| `allocation` | Budget-Zuweisungen |
| `project_change` | Projekt-CRUD |
| `cost_center_change` | Cost Center-CRUD |
| `user_action` | Benutzeraktionen |
| `system_action` | Automatische Aktionen |
| `security` | Sicherheitsrelevante Events |

**Severity Levels:**
- `info` - Normale Aktionen
- `warning` - Potenzielle Probleme
- `critical` - Kritische Änderungen
- `security` - Sicherheitsrelevant

### 7.4 Forecasting

**Lineare Regression für Kostenprognosen**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Forecast Calculation                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Datensammlung: Letzte 30 Tage Usage History                 │
│         │                                                        │
│         ▼                                                        │
│  2. Linear Regression                                            │
│     • X = Tag-Index (0, 1, 2, ...)                              │
│     • Y = Tägliche Kosten                                        │
│     • Berechne: slope, intercept, R², MSE                        │
│         │                                                        │
│         ▼                                                        │
│  3. Prognosen berechnen                                          │
│     • projectedMonthEnd = currentSpend + (avgDaily * daysLeft)  │
│     • runOutDate = today + (remainingBudget / avgDaily)         │
│     • confidenceScore = R² * 100                                 │
│         │                                                        │
│         ▼                                                        │
│  4. Trend bestimmen                                              │
│     • slope > 0.01  → "increasing"                               │
│     • slope < -0.01 → "decreasing"                               │
│     • else          → "stable"                                   │
│         │                                                        │
│         ▼                                                        │
│  5. Recommendation generieren                                    │
│     • Overage Warning wenn projectedMonthEnd > limit             │
│     • Trend-basierte Hinweise                                    │
│         │                                                        │
│         ▼                                                        │
│  6. Cache in budget_forecasts (6h Expiry)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Sicherheit & Authentifizierung

### 8.1 Session-basierte Authentifizierung

```typescript
// API Route Pattern
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  // ... proceed with authenticated request
}
```

### 8.2 Graceful Degradation

```typescript
// BudgetService: Fallback bei DB-Fehlern
async getUserBudget(userId: string) {
  try {
    let [budget] = await this.db.select()...;
    // Normal operation
  } catch (error: any) {
    console.warn('[BudgetService] Using default budget:', error.message);
    return this.getDefaultBudget(userId);
  }
}

// Default Budget (wenn DB nicht erreichbar)
private getDefaultBudget(userId: string) {
  return {
    monthlyTokenLimit: 1000000,
    monthlyCostLimitUsd: '50.00',
    dailyTokenLimit: 100000,
    dailyCostLimitUsd: '10.00',
    // ... sensible defaults
  };
}
```

### 8.3 Sicherheits-Matrix

| Aspekt | Status | Details |
|--------|--------|---------|
| Session Auth | ✅ | `getSession()` für alle Endpoints |
| User Isolation | ✅ | Alle Queries nach `userId` gefiltert |
| Fallback Budget | ✅ | Keine Fehler bei DB-Ausfall |
| Audit Logging | ✅ | 7-Jahre Retention für Compliance |
| Rate Limiting | ✅ | Konfigurierbar pro User |
| Admin Check | ⚠️ | TODO: Budget-Update benötigt Admin-Prüfung |

---

## 9. Feature-Status-Matrix

### 9.1 Vollständig Implementiert (✅)

| Feature | Backend | Frontend | API | DB |
|---------|---------|----------|-----|-----|
| User Budgets | ✅ | ✅ | ✅ | ✅ |
| Token Limits (Daily/Monthly) | ✅ | ✅ | ✅ | ✅ |
| Cost Limits (Daily/Monthly) | ✅ | ✅ | ✅ | ✅ |
| Usage Tracking | ✅ | ✅ | ✅ | ✅ |
| Automatic Reset (Daily/Monthly) | ✅ | ✅ | ✅ | ✅ |
| Threshold Alerts (80%/100%) | ✅ | ✅ | ✅ | ✅ |
| Alert Management | ✅ | ✅ | ✅ | ✅ |
| Rate Limiting Config | ✅ | - | ✅ | ✅ |
| Model Preferences | ✅ | - | ✅ | ✅ |
| Usage History (Charts) | ✅ | ✅ | ✅ | ✅ |
| Billing Transactions | ✅ | ✅ | ✅ | ✅ |
| Top-Up (Stripe) | ✅ | ✅ | ✅ | ✅ |
| Auto-Reload | ✅ | ✅ | ✅ | ✅ |
| Cost Centers | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ |
| Forecasting | ✅ | ✅ | ✅ | ✅ |
| Anomaly Detection | ✅ | ✅ | ✅ | ✅ |
| Audit Logs | ✅ | ✅ | ✅ | ✅ |
| CSV Export | ✅ | ✅ | ✅ | - |

### 9.2 Teilweise Implementiert (⚠️)

| Feature | Status | Details |
|---------|--------|---------|
| Admin Authorization | ⚠️ | TODO in `/api/budget` PUT |
| Email Notifications | ⚠️ | `isSent` Flag existiert, Sender fehlt |
| Request Count Tracking | ⚠️ | Feld existiert, nicht befüllt |
| Weekly/Monthly Growth Rate | ⚠️ | Felder existieren, Berechnung fehlt |

### 9.3 Nicht Implementiert (❌)

| Feature | Priorität | Aufwand |
|---------|-----------|---------|
| Team-Member Attribution | Mittel | Mittel |
| Custom Alert Thresholds | Niedrig | Niedrig |
| Budget Approval Workflows | Niedrig | Hoch |
| Model-spezifische Prognosen | Niedrig | Mittel |
| Comparison Mode (Budget vs Actual) | Niedrig | Mittel |

---

## 10. Datenfluss-Diagramme

### 10.1 AI Request mit Budget-Tracking

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     AI Request with Budget Tracking                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  User sendet AI-Request                                                          │
│        │                                                                         │
│        ▼                                                                         │
│  ┌─────────────────────────────────┐                                            │
│  │ 1. Pre-flight Budget Check      │                                            │
│  │    budgetService.checkBudget()  │                                            │
│  └────────────────┬────────────────┘                                            │
│                   │                                                              │
│         ┌────────┴────────┐                                                     │
│         ▼                 ▼                                                     │
│  ┌──────────────┐  ┌──────────────┐                                             │
│  │ allowed:true │  │ allowed:false│                                             │
│  └──────┬───────┘  └──────┬───────┘                                             │
│         │                 │                                                      │
│         ▼                 ▼                                                      │
│  ┌──────────────┐  ┌──────────────┐                                             │
│  │ 2. AI Call   │  │ Return Error │                                             │
│  │    (OpenAI)  │  │ "Limit       │                                             │
│  └──────┬───────┘  │  exceeded"   │                                             │
│         │          └──────────────┘                                              │
│         ▼                                                                        │
│  ┌─────────────────────────────────┐                                            │
│  │ 3. Track Usage                  │                                            │
│  │    budgetService.trackUsage(    │                                            │
│  │      userId, tokens, cost,      │                                            │
│  │      { model, agentId,          │                                            │
│  │        costCenterId, projectId }│                                            │
│  │    )                            │                                            │
│  └────────────────┬────────────────┘                                            │
│                   │                                                              │
│                   ├───────────────────────────────────────────┐                 │
│                   ▼                                           ▼                 │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐       │
│  │ 4a. Update user_budgets         │  │ 4b. Update Enterprise Tables    │       │
│  │     currentMonthTokens += n     │  │     cost_centers.usedBudgetUsd  │       │
│  │     currentMonthCostUsd += n    │  │     budget_projects.usedTokens  │       │
│  │     currentDayTokens += n       │  │     budget_usage_history        │       │
│  └────────────────┬────────────────┘  └─────────────────────────────────┘       │
│                   │                                                              │
│                   ▼                                                              │
│  ┌─────────────────────────────────┐                                            │
│  │ 5. Check Threshold Alerts       │                                            │
│  │    if (usage >= 80%) → warning  │                                            │
│  │    if (usage >= 100%) → critical│                                            │
│  └────────────────┬────────────────┘                                            │
│                   │                                                              │
│                   ▼                                                              │
│  ┌─────────────────────────────────┐                                            │
│  │ 6. Return AI Response           │                                            │
│  └─────────────────────────────────┘                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Dashboard Data Loading

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Dashboard Data Loading Flow                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PremiumBudgetPage mounts                                                        │
│        │                                                                         │
│        ▼                                                                         │
│  useEffect → fetchData()                                                         │
│        │                                                                         │
│        ▼                                                                         │
│  Promise.all([                                                                   │
│    safeFetch('/api/budget'),           → Budget + Alerts                        │
│    safeFetch('/api/cost-tracking/recent'),  → Recent Usage                      │
│    safeFetch('/api/billing/history'),  → Billing Transactions                   │
│    safeFetch('/api/budget/history'),   → 30-Day Chart Data                      │
│    safeFetch('/api/budget/alerts'),    → All Alerts                             │
│  ])                                                                              │
│        │                                                                         │
│        ├─── Success ───────────────────────────────────────────┐                │
│        │                                                        ▼                │
│        │  ┌─────────────────────────────────────────────────────────────┐       │
│        │  │ State Updates:                                              │       │
│        │  │   setBudget(data.budget)                                    │       │
│        │  │   setRecentUsage(data.usage)                                │       │
│        │  │   setBillingHistory(data.transactions)                      │       │
│        │  │   setUsageHistory(data.history)                             │       │
│        │  │   setAlerts(data.alerts)                                    │       │
│        │  └─────────────────────────────────────────────────────────────┘       │
│        │                                                                         │
│        └─── Error ─────────────────────────────────────────────┐                │
│                                                                 ▼                │
│        ┌─────────────────────────────────────────────────────────────┐          │
│        │ Fallback:                                                   │          │
│        │   setBudget(defaultBudget)                                  │          │
│        │   setRecentUsage([])                                        │          │
│        │   setBillingHistory([])                                     │          │
│        │   setUsageHistory([])                                       │          │
│        │   setAlerts([])                                             │          │
│        └─────────────────────────────────────────────────────────────┘          │
│                                                                                  │
│        ▼                                                                         │
│  Render Dashboard with Data                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Erweiterungsmöglichkeiten

### 11.1 Kurzfristig (Quick Wins)

| Feature | Aufwand | Impact | Beschreibung |
|---------|---------|--------|--------------|
| Admin Authorization | Niedrig | Hoch | Prüfung in `/api/budget` PUT hinzufügen |
| Email Notifications | Mittel | Hoch | Resend-Integration für Alert-Emails |
| Request Count Tracking | Niedrig | Mittel | Counter in trackUsage() implementieren |
| Enterprise Dashboard Integration | Mittel | Hoch | Enterprise-Components in Budget-Page als Tab |

### 11.2 Mittelfristig

| Feature | Aufwand | Impact | Beschreibung |
|---------|---------|--------|--------------|
| Team Attribution | Mittel | Mittel | Kosten pro Team-Member tracken |
| Model-spezifische Prognosen | Mittel | Mittel | Separate Forecasts pro AI-Model |
| Custom Alert Thresholds | Niedrig | Mittel | Benutzer-definierte Schwellenwerte |
| Usage Comparison View | Mittel | Mittel | This Month vs Last Month Charts |

### 11.3 Langfristig

| Feature | Aufwand | Impact | Beschreibung |
|---------|---------|--------|--------------|
| Budget Approval Workflows | Hoch | Mittel | Manager-Genehmigungen für Überschreitungen |
| ML-basierte Prognosen | Hoch | Hoch | Erweiterte Algorithmen (ARIMA, Prophet) |
| Cost Optimization Bot | Hoch | Hoch | Automatische Model-Empfehlungen |
| Multi-Currency Support | Mittel | Mittel | EUR, GBP, etc. neben USD |

---

## 12. Technische Schulden & TODOs

### 12.1 Bekannte TODOs im Code

```typescript
// app/api/budget/route.ts:188
// TODO: Add admin check here
// For now, allow all users to update their own budget (for demo purposes)

// server/services/BudgetService.ts:459
await this.db.insert(budgetUsageHistory).values({
  // ...
  requestCount: 0, // TODO: Track request count
});

// server/services/BudgetService.ts:477
await this.db.insert(budgetUsageHistory).values({
  // ...
  requestCount: 0, // TODO: Track request count
});

// budgetForecasts Table
weeklyGrowthRate: null, // TODO: Calculate from multiple weeks
monthlyGrowthRate: null,
```

### 12.2 Empfohlene Verbesserungen

1. **Admin Authorization**
   - RBAC (Role-Based Access Control) implementieren
   - Budget-Updates nur für Admins erlauben

2. **Email Notifications**
   - Resend SDK integrieren
   - Template-System für Alert-Emails

3. **Performance Optimierungen**
   - Forecast-Cache intelligenter nutzen (6h → dynamisch)
   - Batch-Updates für high-traffic Szenarien

4. **Testing**
   - Unit Tests für BudgetService
   - E2E Tests für Budget-Flow
   - Load Tests für Rate Limiting

---

## Anhang: Datei-Referenzen

| Kategorie | Dateipfad | Zeilen |
|-----------|-----------|--------|
| **Backend Service** | `server/services/BudgetService.ts` | 1544 |
| **Schema (Core)** | `lib/db/schema-user-budgets.ts` | 216 |
| **Schema (Enterprise)** | `lib/db/schema-budget-enterprise.ts` | 408 |
| **API Route (Base)** | `app/api/budget/route.ts` | 223 |
| **API Route (Forecast)** | `app/api/budget/enterprise/forecast/route.ts` | 136 |
| **Frontend (Main)** | `components/dashboard/PremiumBudgetPage.tsx` | 1002 |
| **Frontend (Enterprise)** | `components/budget/enterprise/` | ~1500 |

---

*Erstellt von Claude Code - 2025-12-28*
