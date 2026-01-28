# Enterprise Agents Production-Ready Roadmap

## Vollst\u00e4ndiges Konzept f\u00fcr Dexter, Cassie und Aura

**Version:** 1.0.0
**Erstellt:** 2024-12-22
**Ziel:** Alle drei Enterprise Agents auf Production-Ready Status bringen (Bewertung 9+/10)

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Aktuelle Situation (IST-Zustand)](#2-aktuelle-situation)
3. [Zielarchitektur (SOLL-Zustand)](#3-zielarchitektur)
4. [Phase 1: Datenbank-Schema Erweiterungen](#4-phase-1-datenbank-schema)
5. [Phase 2: Dexter Agent Production-Ready](#5-phase-2-dexter)
6. [Phase 3: Cassie Agent Production-Ready](#6-phase-3-cassie)
7. [Phase 4: Aura Agent Production-Ready](#7-phase-4-aura)
8. [Phase 5: Shared Infrastructure](#8-phase-5-infrastructure)
9. [Phase 6: Testing & Quality Assurance](#9-phase-6-testing)
10. [Phase 7: Monitoring & Observability](#10-phase-7-monitoring)
11. [Implementierungsplan](#11-implementierungsplan)
12. [Risiken & Mitigation](#12-risiken)

---

## 1. Executive Summary

### Aktuelle Bewertung
| Agent | Aktuell | Ziel | Delta |
|-------|:-------:|:----:|:-----:|
| **Dexter** | 5.3/10 | 9.5/10 | +4.2 |
| **Cassie** | 5.8/10 | 9.5/10 | +3.7 |
| **Aura** | 5.3/10 | 9.5/10 | +4.2 |

### Hauptprobleme
1. **Keine echte Datenpersistenz** - Aura verliert alle Daten bei Restart
2. **Mock-Daten** - 60% der Funktionalit\u00e4t basiert auf simulierten Werten
3. **Fehlende Integrationen** - Keine echten HTTP/Email/Slack-Calls
4. **Keine Embeddings** - Knowledge Base ohne Vector-Suche

### L\u00f6sungsansatz
- Nutzung bestehender DB-Schemas (pgvector, Drizzle ORM)
- Redis f\u00fcr Caching und Pub/Sub
- Bull/BullMQ f\u00fcr Job-Queue
- OpenAI Embeddings f\u00fcr semantische Suche

---

## 2. Aktuelle Situation

### 2.1 Dexter Agent (Financial Intelligence)

| Tool | Status | Problem |
|------|--------|---------|
| RevenueAnalyzer | \u26a0\ufe0f Teilweise | Segment-Aufteilung hardcoded (45/30/20/5%) |
| ForecastEngine | \u2705 Gut | Echte Algorithmen, keine ML-Modelle |
| FinancialReports | \u274c Kritisch | ALLE Kosten hardcoded, keine Buchhaltung |
| CustomerAnalytics | \u26a0\ufe0f Teilweise | CAC random, Lifespan fix 3 Jahre |
| CRMInsights | \u274c Kritisch | Sales-Rep komplett Mock |

### 2.2 Cassie Agent (Customer Support)

| Tool | Status | Problem |
|------|--------|---------|
| TicketManager | \u2705 Gut | Echte DB-Integration vorhanden |
| SentimentAnalyzer | \u2705 Gut | OpenAI + Pattern Hybrid |
| KnowledgeBaseManager | \u274c Kritisch | KOMPLETT MOCK, keine DB |
| ResponseGenerator | \u2705 Gut | Echte OpenAI-Integration |

### 2.3 Aura Agent (Workflow Automation)

| Tool | Status | Problem |
|------|--------|---------|
| WorkflowEngine | \u26a0\ufe0f Teilweise | In-Memory, keine DB-Persistenz |
| AutomationRules | \u26a0\ufe0f Teilweise | Actions alle simuliert |
| TaskScheduler | \u26a0\ufe0f Teilweise | setTimeout statt Job-Queue |

---

## 3. Zielarchitektur

### 3.1 Systemarchitektur

```
\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502                     ENTERPRISE AGENTS                       \u2502
\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502      DEXTER        \u2502      CASSIE        \u2502       AURA        \u2502
\u2502  Financial Intel   \u2502  Customer Support  \u2502  Workflow Auto    \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
          \u2502                   \u2502                   \u2502
          \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
                    \u2502
\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502     SHARED SERVICES LAYER            \u2502
\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  OpenAI API  \u2502  Redis Cache  \u2502  Job Queue   \u2502
\u2502  Embeddings  \u2502  Pub/Sub      \u2502  (BullMQ)    \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
          \u2502                   \u2502
\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502          DATA LAYER                   \u2502
\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  PostgreSQL  \u2502   pgvector   \u2502 Drizzle ORM \u2502
\u2502  (Primary)   \u2502  (Vectors)   \u2502  (Queries)  \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
```

### 3.2 Bestehende Schemas nutzen

Die folgenden Schemas existieren bereits und werden genutzt:

| Schema | Tabellen | F\u00fcr Agent |
|--------|----------|-----------|
| `schema-integrations-v2.ts` | unifiedDeals, unifiedCustomers, unifiedTickets | Dexter, Cassie |
| `schema-workflows.ts` | workflows, workflowExecutions, workflowVersions | Aura |
| `schema.ts` | brainDocuments, kbChunks (pgvector) | Cassie KB |
| `schema.ts` | aiUsage, agentMessages | Alle |

---

## 4. Phase 1: Datenbank-Schema Erweiterungen

### 4.1 Neue Tabellen f\u00fcr Dexter

```typescript
// lib/db/schema-dexter.ts

// Finanzielle Transaktionen f\u00fcr echte Buchhaltung
export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),

  // Transaction Details
  type: varchar('type', { length: 50 }).notNull(), // revenue, expense, transfer
  category: varchar('category', { length: 100 }).notNull(), // COGS, OpEx, Marketing, etc.
  subcategory: varchar('subcategory', { length: 100 }),

  // Amounts
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('EUR'),

  // Attribution
  customerId: uuid('customer_id'),
  dealId: uuid('deal_id'),
  departmentId: varchar('department_id', { length: 100 }),

  // Accounting
  accountCode: varchar('account_code', { length: 20 }), // Kontonummer
  costCenter: varchar('cost_center', { length: 50 }),
  fiscalYear: integer('fiscal_year'),
  fiscalPeriod: integer('fiscal_period'), // Month 1-12

  // Metadata
  description: text('description'),
  reference: varchar('reference', { length: 255 }), // Invoice#, PO#
  externalId: varchar('external_id', { length: 255 }),
  source: varchar('source', { length: 100 }), // manual, import, api

  transactionDate: timestamp('transaction_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sales Representative Performance
export const salesRepPerformance = pgTable('sales_rep_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Period
  periodType: varchar('period_type', { length: 20 }).notNull(), // daily, weekly, monthly
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Metrics
  dealsWon: integer('deals_won').default(0),
  dealsLost: integer('deals_lost').default(0),
  dealsOpen: integer('deals_open').default(0),
  revenueWon: numeric('revenue_won', { precision: 12, scale: 2 }).default('0'),
  revenuePipeline: numeric('revenue_pipeline', { precision: 12, scale: 2 }).default('0'),
  avgDealSize: numeric('avg_deal_size', { precision: 12, scale: 2 }),
  winRate: numeric('win_rate', { precision: 5, scale: 4 }), // 0.0000 - 1.0000
  avgSalesCycle: integer('avg_sales_cycle'), // Days

  // Activity
  callsMade: integer('calls_made').default(0),
  emailsSent: integer('emails_sent').default(0),
  meetingsHeld: integer('meetings_held').default(0),

  // Quota
  quotaAmount: numeric('quota_amount', { precision: 12, scale: 2 }),
  quotaAttainment: numeric('quota_attainment', { precision: 5, scale: 4 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Cost Allocation Rules
export const costAllocationRules = pgTable('cost_allocation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),

  // Allocation Method
  allocationType: varchar('allocation_type', { length: 50 }).notNull(), // fixed, percentage, formula
  baseMetric: varchar('base_metric', { length: 100 }), // revenue, headcount, usage
  percentage: numeric('percentage', { precision: 5, scale: 4 }),
  fixedAmount: numeric('fixed_amount', { precision: 12, scale: 2 }),
  formula: text('formula'), // For complex calculations

  // Scope
  appliesToDepartments: jsonb('applies_to_departments').$type<string[]>().default([]),
  appliesToProducts: jsonb('applies_to_products').$type<string[]>().default([]),

  isActive: boolean('is_active').default(true),
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 4.2 Neue Tabellen f\u00fcr Aura

```typescript
// lib/db/schema-aura.ts

// Persistent Workflows (extends existing workflows table)
export const auraWorkflows = pgTable('aura_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  workflowId: uuid('workflow_id').references(() => workflows.id),

  // Aura-specific fields
  trigger: jsonb('trigger').$type<{
    type: 'manual' | 'schedule' | 'event' | 'webhook';
    config: Record<string, unknown>;
  }>().notNull(),

  // Graph Structure
  nodes: jsonb('nodes').$type<WorkflowNode[]>().notNull(),
  edges: jsonb('edges').$type<WorkflowEdge[]>().notNull(),

  // Runtime Config
  errorHandling: varchar('error_handling', { length: 50 }).default('fail-fast'),
  maxRetries: integer('max_retries').default(3),
  timeoutMs: integer('timeout_ms').default(300000),

  // Status
  isActive: boolean('is_active').default(true),
  lastExecutedAt: timestamp('last_executed_at'),
  executionCount: integer('execution_count').default(0),

  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Automation Rules (persistent)
export const auraAutomationRules = pgTable('aura_automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Trigger Config
  trigger: jsonb('trigger').$type<{
    type: 'event' | 'schedule' | 'condition';
    eventType?: string;
    cronExpression?: string;
    conditions?: RuleCondition[];
  }>().notNull(),

  // Actions
  actions: jsonb('actions').$type<RuleAction[]>().notNull(),

  // Execution Config
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(50),
  cooldownSeconds: integer('cooldown_seconds').default(0),
  maxExecutionsPerHour: integer('max_executions_per_hour'),

  // Statistics
  executionCount: integer('execution_count').default(0),
  lastExecutedAt: timestamp('last_executed_at'),
  lastSuccessAt: timestamp('last_success_at'),
  lastFailureAt: timestamp('last_failure_at'),

  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Scheduled Tasks (persistent)
export const auraScheduledTasks = pgTable('aura_scheduled_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Schedule
  scheduleType: varchar('schedule_type', { length: 50 }).notNull(), // cron, interval, once
  cronExpression: varchar('cron_expression', { length: 100 }),
  intervalMs: integer('interval_ms'),
  runAt: timestamp('run_at'), // For one-time tasks
  timezone: varchar('timezone', { length: 50 }).default('UTC'),

  // Task Config
  taskType: varchar('task_type', { length: 100 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}),

  // Retry Policy
  maxRetries: integer('max_retries').default(3),
  retryBackoff: varchar('retry_backoff', { length: 20 }).default('exponential'),

  // Status
  status: varchar('status', { length: 20 }).default('active'), // active, paused, completed
  nextRunAt: timestamp('next_run_at'),
  lastRunAt: timestamp('last_run_at'),
  lastRunStatus: varchar('last_run_status', { length: 20 }),

  // Statistics
  executionCount: integer('execution_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),

  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Task Executions (history)
export const auraTaskExecutions = pgTable('aura_task_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => auraScheduledTasks.id),

  status: varchar('status', { length: 20 }).notNull(),
  result: jsonb('result'),
  error: text('error'),
  logs: jsonb('logs').$type<{ level: string; message: string; timestamp: string }[]>().default([]),

  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  retryCount: integer('retry_count').default(0),

  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4.3 Knowledge Base auf bestehende Schemas umstellen

```typescript
// Cassie nutzt jetzt brainDocuments + kbChunks aus schema.ts
// Keine neuen Tabellen n\u00f6tig, nur Mapping:

// brainDocuments -> KnowledgeArticle
// kbChunks -> Article Chunks mit pgvector embeddings
// kbRevisions -> Article Versions
```

---

## 5. Phase 2: Dexter Production-Ready

### 5.1 RevenueAnalyzer - Echte Daten

**Aktuelle Probleme:**
- Segment-Aufteilung hardcoded (45/30/20/5%)
- CAC random generiert

**L\u00f6sung:**
```typescript
// lib/agents/dexter/tools/RevenueAnalyzer.ts

// VORHER (Mock):
private getRevenueBySegment(workspaceId: string): Record<string, number> {
  return {
    'Enterprise': totalRevenue * 0.45,
    'Mid-Market': totalRevenue * 0.30,
    'SMB': totalRevenue * 0.20,
    'Startup': totalRevenue * 0.05,
  };
}

// NACHHER (Echte Daten):
private async getRevenueBySegment(workspaceId: string): Promise<Record<string, number>> {
  const result = await db
    .select({
      segment: unifiedCustomers.segment,
      totalRevenue: sql<number>`COALESCE(SUM(${unifiedDeals.amount}), 0)`,
    })
    .from(unifiedDeals)
    .innerJoin(unifiedCustomers, eq(unifiedDeals.customerId, unifiedCustomers.id))
    .where(
      and(
        eq(unifiedDeals.workspaceId, workspaceId),
        eq(unifiedDeals.isWon, true)
      )
    )
    .groupBy(unifiedCustomers.segment);

  return Object.fromEntries(
    result.map(r => [r.segment || 'Unknown', Number(r.totalRevenue)])
  );
}
```

### 5.2 FinancialReports - Echte Buchhaltung

**Aktuelle Probleme:**
- COGS = 35% hardcoded
- OpEx = 40% hardcoded
- Keine echten Transaktionen

**L\u00f6sung:**
```typescript
// lib/agents/dexter/tools/FinancialReports.ts

// NACHHER (Echte Daten):
async generatePnL(options: PnLOptions): Promise<ProfitAndLossReport> {
  const { workspaceId, startDate, endDate } = options;

  // Echte Revenue aus Deals
  const revenue = await this.getRevenueFromDeals(workspaceId, startDate, endDate);

  // Echte Kosten aus financialTransactions
  const expenses = await db
    .select({
      category: financialTransactions.category,
      total: sql<number>`SUM(${financialTransactions.amount})`,
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.workspaceId, workspaceId),
        eq(financialTransactions.type, 'expense'),
        gte(financialTransactions.transactionDate, startDate),
        lte(financialTransactions.transactionDate, endDate)
      )
    )
    .groupBy(financialTransactions.category);

  // Kosten-Kategorien aus DB
  const cogs = expenses.find(e => e.category === 'COGS')?.total || 0;
  const opex = expenses.find(e => e.category === 'OpEx')?.total || 0;
  const marketing = expenses.find(e => e.category === 'Marketing')?.total || 0;

  // Fallback auf Allocation Rules wenn keine Transaktionen
  if (expenses.length === 0) {
    const rules = await this.getCostAllocationRules(workspaceId);
    // Apply allocation rules...
  }

  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    grossMargin: (revenue - cogs) / revenue,
    operatingExpenses: { marketing, rd, admin, other },
    operatingIncome: revenue - cogs - opex,
    // ...
  };
}
```

### 5.3 CRMInsights - Echte Sales-Rep Daten

**Aktuelle Probleme:**
- Sales-Rep Namen hardcoded (John Smith, Sarah Johnson...)
- Performance komplett simuliert

**L\u00f6sung:**
```typescript
// lib/agents/dexter/tools/CRMInsights.ts

async getSalesRepPerformance(
  workspaceId: string,
  period: DateRange
): Promise<SalesRepPerformance[]> {
  // Echte Performance aus DB
  const performance = await db
    .select()
    .from(salesRepPerformance)
    .innerJoin(users, eq(salesRepPerformance.userId, users.id))
    .where(
      and(
        eq(salesRepPerformance.workspaceId, workspaceId),
        gte(salesRepPerformance.periodStart, period.start),
        lte(salesRepPerformance.periodEnd, period.end)
      )
    );

  // Fallback: Berechne aus Deals wenn keine Performance-Daten
  if (performance.length === 0) {
    return this.calculateFromDeals(workspaceId, period);
  }

  return performance.map(p => ({
    id: p.salesRepPerformance.userId,
    name: p.users.displayName || p.users.email,
    dealsWon: p.salesRepPerformance.dealsWon,
    dealsLost: p.salesRepPerformance.dealsLost,
    revenue: Number(p.salesRepPerformance.revenueWon),
    winRate: Number(p.salesRepPerformance.winRate),
    avgDealSize: Number(p.salesRepPerformance.avgDealSize),
    avgSalesCycle: p.salesRepPerformance.avgSalesCycle,
    quotaAttainment: Number(p.salesRepPerformance.quotaAttainment),
  }));
}

private async calculateFromDeals(
  workspaceId: string,
  period: DateRange
): Promise<SalesRepPerformance[]> {
  const dealsByOwner = await db
    .select({
      ownerId: unifiedDeals.ownerId,
      ownerEmail: users.email,
      ownerName: users.displayName,
      dealsWon: sql<number>`COUNT(*) FILTER (WHERE ${unifiedDeals.isWon} = true)`,
      dealsLost: sql<number>`COUNT(*) FILTER (WHERE ${unifiedDeals.isWon} = false AND ${unifiedDeals.actualCloseDate} IS NOT NULL)`,
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${unifiedDeals.isWon} = true THEN ${unifiedDeals.amount} ELSE 0 END), 0)`,
      avgDealSize: sql<number>`AVG(CASE WHEN ${unifiedDeals.isWon} = true THEN ${unifiedDeals.amount} ELSE NULL END)`,
    })
    .from(unifiedDeals)
    .leftJoin(users, eq(unifiedDeals.ownerId, users.id))
    .where(
      and(
        eq(unifiedDeals.workspaceId, workspaceId),
        gte(unifiedDeals.createdAt, period.start),
        lte(unifiedDeals.createdAt, period.end)
      )
    )
    .groupBy(unifiedDeals.ownerId, users.email, users.displayName);

  return dealsByOwner.map(d => ({
    id: d.ownerId,
    name: d.ownerName || d.ownerEmail || 'Unknown',
    dealsWon: d.dealsWon,
    dealsLost: d.dealsLost,
    revenue: Number(d.totalRevenue),
    winRate: d.dealsWon / (d.dealsWon + d.dealsLost) || 0,
    avgDealSize: Number(d.avgDealSize) || 0,
    // ...
  }));
}
```

---

## 6. Phase 3: Cassie Production-Ready

### 6.1 KnowledgeBaseManager - Echte DB mit pgvector

**Aktuelle Probleme:**
- Komplett Mock-Daten
- Kein echtes Embedding
- Keine Persistenz

**L\u00f6sung:**
```typescript
// lib/agents/cassie/tools/KnowledgeBaseManager.ts

import OpenAI from 'openai';
import { brainDocuments, kbChunks } from '@/lib/db/schema';
import { sql, cosineDistance } from 'drizzle-orm';

export class KnowledgeBaseManager {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Semantic Search mit pgvector
  async search(options: KnowledgeSearchOptions): Promise<SearchResult[]> {
    const { workspaceId, query, limit = 10, threshold = 0.7 } = options;

    // 1. Generate Query Embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // 2. Vector Search mit pgvector
    const results = await db
      .select({
        id: brainDocuments.id,
        title: brainDocuments.title,
        content: brainDocuments.content,
        category: sql<string>`${brainDocuments.metadata}->>'category'`,
        similarity: sql<number>`1 - (${brainDocuments.embedding} <=> ${sql.raw(`'[${queryEmbedding.join(',')}]'::vector`)})`,
      })
      .from(brainDocuments)
      .where(
        and(
          eq(brainDocuments.workspaceId, workspaceId),
          eq(brainDocuments.status, 'published'),
          eq(brainDocuments.isActive, true),
          // Similarity threshold
          sql`1 - (${brainDocuments.embedding} <=> ${sql.raw(`'[${queryEmbedding.join(',')}]'::vector`)}) > ${threshold}`
        )
      )
      .orderBy(sql`${brainDocuments.embedding} <=> ${sql.raw(`'[${queryEmbedding.join(',')}]'::vector`)}`)
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      relevanceScore: r.similarity,
    }));
  }

  // Create Article mit Embedding
  async createArticle(
    workspaceId: string,
    data: CreateArticleData
  ): Promise<KnowledgeArticle> {
    const { title, content, category, tags, visibility, author } = data;

    // 1. Generate Embedding
    const embedding = await this.generateEmbedding(`${title}\n\n${content}`);

    // 2. Insert into DB
    const [article] = await db
      .insert(brainDocuments)
      .values({
        workspaceId,
        title,
        content,
        contentHash: this.hashContent(content),
        metadata: { category, tags, visibility },
        embedding,
        tokenCount: this.countTokens(content),
        status: 'draft',
        authorId: author,
        createdBy: author,
        version: 1,
      })
      .returning();

    // 3. Chunk for better retrieval
    await this.chunkAndIndexArticle(article.id, content);

    return this.mapToArticle(article);
  }

  // Generate OpenAI Embedding
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Max tokens
      dimensions: 1536,
    });

    return response.data[0].embedding;
  }

  // Chunk large articles for better retrieval
  private async chunkAndIndexArticle(
    documentId: string,
    content: string
  ): Promise<void> {
    const chunks = this.splitIntoChunks(content, 500); // 500 tokens per chunk

    for (let i = 0; i < chunks.length; i++) {
      const chunkEmbedding = await this.generateEmbedding(chunks[i]);

      await db.insert(kbChunks).values({
        revisionId: documentId,
        idx: i,
        text: chunks[i],
        tokens: this.countTokens(chunks[i]),
        embedding: chunkEmbedding,
        meta: { section: `chunk-${i}` },
      });
    }
  }
}
```

### 6.2 Ticket Integration - Vollst\u00e4ndig

Der TicketManager ist bereits gut implementiert. Kleine Verbesserungen:

```typescript
// Erweiterung f\u00fcr AI-Features
async enrichTicketWithAI(ticketId: string): Promise<void> {
  const ticket = await this.getTicket(ticketId);

  // 1. Sentiment Analysis
  const sentiment = await sentimentAnalyzer.analyze(ticket.description);

  // 2. Intent Detection
  const intent = await this.detectIntent(ticket.description);

  // 3. Suggested Response
  const suggestedResponse = await responseGenerator.generateResponse({
    issue: ticket.description,
    category: ticket.category,
    sentiment: sentiment.overall,
  });

  // 4. Related Articles
  const relatedArticles = await knowledgeBase.search({
    workspaceId: ticket.workspaceId,
    query: ticket.description,
    limit: 3,
  });

  // 5. Update Ticket
  await db
    .update(unifiedTickets)
    .set({
      sentiment: sentiment.overall,
      sentimentScore: String(sentiment.score),
      intent: intent.type,
      intentConfidence: String(intent.confidence),
      aiSummary: suggestedResponse.summary,
      aiSuggestedResponse: suggestedResponse.response,
      updatedAt: new Date(),
    })
    .where(eq(unifiedTickets.id, ticketId));
}
```

---

## 7. Phase 4: Aura Production-Ready

### 7.1 WorkflowEngine - DB Persistenz

**Aktuelle Probleme:**
- In-Memory Storage
- Keine Persistenz
- setTimeout statt Job-Queue

**L\u00f6sung:**
```typescript
// lib/agents/aura/tools/WorkflowEngine.ts

import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { auraWorkflows, auraTaskExecutions } from '@/lib/db/schema-aura';

export class WorkflowEngine {
  private redis: Redis;
  private workflowQueue: Queue;
  private worker: Worker;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    // BullMQ Queue f\u00fcr Workflow-Ausf\u00fchrung
    this.workflowQueue = new Queue('workflows', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });

    // Worker f\u00fcr Workflow-Verarbeitung
    this.worker = new Worker('workflows', this.processWorkflow.bind(this), {
      connection: this.redis,
      concurrency: 5,
    });
  }

  // Workflow in DB speichern
  async registerWorkflow(workflow: WorkflowGraph): Promise<void> {
    await db
      .insert(auraWorkflows)
      .values({
        workspaceId: workflow.workspaceId,
        trigger: workflow.trigger,
        nodes: workflow.nodes,
        edges: workflow.edges,
        errorHandling: workflow.errorHandling,
        maxRetries: workflow.maxRetries,
        createdBy: workflow.createdBy,
      })
      .onConflictDoUpdate({
        target: auraWorkflows.id,
        set: {
          nodes: workflow.nodes,
          edges: workflow.edges,
          updatedAt: new Date(),
        },
      });
  }

  // Workflow zur Queue hinzuf\u00fcgen
  async execute(
    workflowId: string,
    inputs: Record<string, unknown>
  ): Promise<string> {
    const workflow = await this.getWorkflow(workflowId);

    const job = await this.workflowQueue.add('execute', {
      workflowId,
      workflow,
      inputs,
      startedAt: new Date().toISOString(),
    }, {
      jobId: `wf-${workflowId}-${Date.now()}`,
    });

    return job.id;
  }

  // Worker-Prozess f\u00fcr Workflow-Ausf\u00fchrung
  private async processWorkflow(job: Job): Promise<ExecutionState> {
    const { workflowId, workflow, inputs } = job.data;

    const execution: ExecutionState = {
      workflowId,
      status: 'running',
      startedAt: new Date(),
      currentNodeId: null,
      nodeOutputs: {},
      variables: { ...inputs },
      errors: [],
      logs: [],
    };

    try {
      // Topologische Sortierung der Nodes
      const sortedNodes = this.topologicalSort(workflow.nodes, workflow.edges);

      for (const node of sortedNodes) {
        execution.currentNodeId = node.id;

        try {
          const result = await this.executeNode(node, execution);
          execution.nodeOutputs[node.id] = result;

          // Update Progress
          await job.updateProgress({
            currentNode: node.id,
            nodesCompleted: Object.keys(execution.nodeOutputs).length,
            totalNodes: sortedNodes.length,
          });
        } catch (nodeError) {
          if (workflow.errorHandling === 'fail-fast') {
            throw nodeError;
          }
          execution.errors.push({
            nodeId: node.id,
            error: nodeError.message,
            timestamp: new Date(),
          });
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = 'failed';
      execution.errors.push({
        error: error.message,
        timestamp: new Date(),
      });
    }

    // Execution in DB speichern
    await this.saveExecution(execution);

    // Workflow Stats aktualisieren
    await db
      .update(auraWorkflows)
      .set({
        lastExecutedAt: new Date(),
        executionCount: sql`${auraWorkflows.executionCount} + 1`,
      })
      .where(eq(auraWorkflows.id, workflowId));

    return execution;
  }

  // Echte Node-Executoren
  private async executeNode(
    node: WorkflowNode,
    state: ExecutionState
  ): Promise<unknown> {
    switch (node.type) {
      case 'http':
        return this.executeHttpNode(node, state);
      case 'email':
        return this.executeEmailNode(node, state);
      case 'database':
        return this.executeDatabaseNode(node, state);
      case 'agent':
        return this.executeAgentNode(node, state);
      case 'script':
        return this.executeScriptNode(node, state);
      default:
        return this.executeGenericNode(node, state);
    }
  }

  // HTTP Node - Echte Requests
  private async executeHttpNode(
    node: WorkflowNode,
    state: ExecutionState
  ): Promise<unknown> {
    const config = node.data as HttpNodeConfig;

    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(
        this.interpolateVariables(config.body, state.variables)
      ) : undefined,
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Email Node - Echte Emails
  private async executeEmailNode(
    node: WorkflowNode,
    state: ExecutionState
  ): Promise<unknown> {
    const config = node.data as EmailNodeConfig;

    // Verwende bestehenden Email-Service
    const emailService = new EmailService();

    await emailService.send({
      to: this.interpolateVariables(config.to, state.variables),
      subject: this.interpolateVariables(config.subject, state.variables),
      body: this.interpolateVariables(config.body, state.variables),
      template: config.template,
    });

    return { sent: true, timestamp: new Date().toISOString() };
  }
}
```

### 7.2 TaskScheduler - BullMQ Job-Queue

```typescript
// lib/agents/aura/tools/TaskScheduler.ts

import { Queue, QueueScheduler, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

export class TaskScheduler {
  private redis: Redis;
  private taskQueue: Queue;
  private scheduler: QueueScheduler;
  private worker: Worker;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    // Queue f\u00fcr Tasks
    this.taskQueue = new Queue('scheduled-tasks', {
      connection: this.redis,
    });

    // Scheduler f\u00fcr Cron-Jobs
    this.scheduler = new QueueScheduler('scheduled-tasks', {
      connection: this.redis,
    });

    // Worker
    this.worker = new Worker('scheduled-tasks', this.processTask.bind(this), {
      connection: this.redis,
      concurrency: 10,
    });
  }

  // Task erstellen und schedulen
  async create(
    workspaceId: string,
    data: CreateTaskData
  ): Promise<ScheduledTask> {
    const { name, scheduleType, cronExpression, taskType, payload } = data;

    // 1. In DB speichern
    const [task] = await db
      .insert(auraScheduledTasks)
      .values({
        workspaceId,
        name,
        scheduleType,
        cronExpression,
        taskType,
        payload,
        status: 'active',
        createdBy: data.createdBy,
      })
      .returning();

    // 2. In BullMQ schedulen
    if (scheduleType === 'cron' && cronExpression) {
      await this.taskQueue.add(
        taskType,
        { taskId: task.id, payload },
        {
          repeat: { pattern: cronExpression },
          jobId: `task-${task.id}`,
        }
      );
    } else if (scheduleType === 'interval' && data.intervalMs) {
      await this.taskQueue.add(
        taskType,
        { taskId: task.id, payload },
        {
          repeat: { every: data.intervalMs },
          jobId: `task-${task.id}`,
        }
      );
    }

    // 3. N\u00e4chste Ausf\u00fchrung berechnen
    const nextRunAt = this.calculateNextRun(task);
    await db
      .update(auraScheduledTasks)
      .set({ nextRunAt })
      .where(eq(auraScheduledTasks.id, task.id));

    return { ...task, nextRunAt };
  }

  // Task ausf\u00fchren
  private async processTask(job: Job): Promise<void> {
    const { taskId, payload } = job.data;
    const startedAt = new Date();

    // Task aus DB laden
    const task = await db.query.auraScheduledTasks.findFirst({
      where: eq(auraScheduledTasks.id, taskId),
    });

    if (!task || task.status !== 'active') {
      return;
    }

    const execution: TaskExecution = {
      taskId,
      status: 'running',
      startedAt,
      logs: [],
    };

    try {
      // Task-Handler basierend auf Typ
      const result = await this.executeTaskHandler(task.taskType, payload, task);

      execution.status = 'completed';
      execution.result = result;
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startedAt.getTime();

      // Erfolg z\u00e4hlen
      await db
        .update(auraScheduledTasks)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: 'success',
          executionCount: sql`${auraScheduledTasks.executionCount} + 1`,
          successCount: sql`${auraScheduledTasks.successCount} + 1`,
          nextRunAt: this.calculateNextRun(task),
        })
        .where(eq(auraScheduledTasks.id, taskId));

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;

      // Fehler z\u00e4hlen
      await db
        .update(auraScheduledTasks)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: 'failed',
          failureCount: sql`${auraScheduledTasks.failureCount} + 1`,
          nextRunAt: this.calculateNextRun(task),
        })
        .where(eq(auraScheduledTasks.id, taskId));
    }

    // Execution History speichern
    await db.insert(auraTaskExecutions).values(execution);
  }

  // Task-Handler
  private async executeTaskHandler(
    taskType: string,
    payload: Record<string, unknown>,
    task: ScheduledTask
  ): Promise<unknown> {
    switch (taskType) {
      case 'workflow':
        return this.triggerWorkflow(payload.workflowId as string, payload);

      case 'report':
        return this.generateReport(payload);

      case 'sync':
        return this.runDataSync(payload);

      case 'cleanup':
        return this.runCleanup(payload);

      case 'notification':
        return this.sendNotification(payload);

      case 'webhook':
        return this.callWebhook(payload.url as string, payload);

      case 'agent':
        return this.invokeAgent(payload.agentId as string, payload.message as string);

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
}
```

### 7.3 AutomationRules - Echte Actions

```typescript
// lib/agents/aura/tools/AutomationRules.ts

// Echte Action-Implementierungen
private async executeAction(
  action: RuleAction,
  context: RuleContext
): Promise<ActionResult> {
  const interpolatedConfig = this.interpolateConfig(action.config, context);

  switch (action.type) {
    case 'send_email':
      return this.sendEmail(interpolatedConfig);

    case 'send_slack':
      return this.sendSlackMessage(interpolatedConfig);

    case 'call_webhook':
      return this.callWebhook(interpolatedConfig);

    case 'trigger_workflow':
      return this.triggerWorkflow(interpolatedConfig);

    case 'create_ticket':
      return this.createTicket(interpolatedConfig);

    case 'update_record':
      return this.updateRecord(interpolatedConfig);

    case 'invoke_agent':
      return this.invokeAgent(interpolatedConfig);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// Email Action
private async sendEmail(config: EmailActionConfig): Promise<ActionResult> {
  const emailService = new EmailService();

  await emailService.send({
    to: config.to,
    subject: config.subject,
    body: config.body,
    template: config.template,
    attachments: config.attachments,
  });

  return { success: true, action: 'send_email' };
}

// Slack Action
private async sendSlackMessage(config: SlackActionConfig): Promise<ActionResult> {
  const slackService = new SlackService();

  await slackService.postMessage({
    channel: config.channel,
    text: config.text,
    blocks: config.blocks,
    attachments: config.attachments,
  });

  return { success: true, action: 'send_slack' };
}

// Webhook Action
private async callWebhook(config: WebhookActionConfig): Promise<ActionResult> {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(config.payload),
    signal: AbortSignal.timeout(config.timeout || 30000),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  return {
    success: true,
    action: 'call_webhook',
    response: await response.json(),
  };
}
```

---

## 8. Phase 5: Shared Infrastructure

### 8.1 OpenAI Embeddings Service

```typescript
// lib/ai/embedding-service.ts

import OpenAI from 'openai';
import { Redis } from 'ioredis';

export class EmbeddingService {
  private openai: OpenAI;
  private redis: Redis;
  private cachePrefix = 'emb:';
  private cacheTTL = 86400 * 7; // 7 Tage

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async getEmbedding(text: string): Promise<number[]> {
    // 1. Cache Check
    const cacheKey = this.cachePrefix + this.hashText(text);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Generate Embedding
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
      dimensions: 1536,
    });

    const embedding = response.data[0].embedding;

    // 3. Cache
    await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(embedding));

    return embedding;
  }

  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Batch Processing f\u00fcr Effizienz
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts.map(t => t.slice(0, 8000)),
      dimensions: 1536,
    });

    return response.data.map(d => d.embedding);
  }

  private hashText(text: string): string {
    return require('crypto')
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .slice(0, 16);
  }
}
```

### 8.2 Redis Cache Service

```typescript
// lib/cache/redis-service.ts

import { Redis } from 'ioredis';

export class RedisCacheService {
  private redis: Redis;
  private pubsub: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.pubsub = new Redis(process.env.REDIS_URL);
  }

  // Cache Operations
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, data);
    } else {
      await this.redis.set(key, data);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Pub/Sub f\u00fcr Agent Events
  async publish(channel: string, message: unknown): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: unknown) => void): Promise<void> {
    await this.pubsub.subscribe(channel);
    this.pubsub.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }
}
```

### 8.3 Event Bus f\u00fcr Agent-Kommunikation

```typescript
// lib/agents/event-bus.ts

import { RedisCacheService } from '@/lib/cache/redis-service';

export interface AgentEvent {
  id: string;
  type: string;
  sourceAgentId: string;
  targetAgentId?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export class AgentEventBus {
  private redis: RedisCacheService;
  private handlers: Map<string, Set<(event: AgentEvent) => Promise<void>>>;

  constructor() {
    this.redis = new RedisCacheService();
    this.handlers = new Map();

    // Subscribe to agent events channel
    this.redis.subscribe('agent-events', this.handleEvent.bind(this));
  }

  // Event emittieren
  async emit(event: Omit<AgentEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AgentEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    // Publish to Redis
    await this.redis.publish('agent-events', fullEvent);

    // Store in history
    await this.redis.set(
      `event:${fullEvent.id}`,
      fullEvent,
      3600 // 1 hour TTL
    );
  }

  // Handler registrieren
  on(eventType: string, handler: (event: AgentEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  // Event verarbeiten
  private async handleEvent(event: AgentEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || new Set();
    const wildcardHandlers = this.handlers.get('*') || new Set();

    for (const handler of [...handlers, ...wildcardHandlers]) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EVENT_BUS] Handler error for ${event.type}:`, error);
      }
    }
  }
}

export const eventBus = new AgentEventBus();
```

---

## 9. Phase 6: Testing & Quality Assurance

### 9.1 Unit Tests

```typescript
// tests/agents/dexter.test.ts

describe('Dexter Agent', () => {
  describe('RevenueAnalyzer', () => {
    it('should fetch real revenue data from database', async () => {
      // Seed test data
      await seedTestDeals(testWorkspaceId);

      const analyzer = new RevenueAnalyzer();
      const result = await analyzer.analyze({
        workspaceId: testWorkspaceId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(result.summary.totalRevenue).toBeGreaterThan(0);
      expect(result.bySegment).not.toHaveProperty('Enterprise', expect.any(Number));
    });

    it('should calculate correct growth rates', async () => {
      const result = await analyzer.analyze({ ... });

      expect(result.growth.popGrowth).toBeCloseTo(expectedPopGrowth, 2);
      expect(result.growth.yoyGrowth).toBeCloseTo(expectedYoyGrowth, 2);
    });
  });

  describe('FinancialReports', () => {
    it('should use real transaction data for P&L', async () => {
      await seedTestTransactions(testWorkspaceId);

      const reports = new FinancialReports();
      const pnl = await reports.generatePnL({
        workspaceId: testWorkspaceId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      // Verify no hardcoded percentages
      expect(pnl.cogs).not.toEqual(pnl.revenue * 0.35);
      expect(pnl.operatingExpenses.total).not.toEqual(pnl.revenue * 0.40);
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// tests/integration/workflow-execution.test.ts

describe('Workflow Execution', () => {
  it('should persist workflow state across restarts', async () => {
    // Create workflow
    const workflow = await workflowEngine.registerWorkflow({
      name: 'Test Workflow',
      trigger: { type: 'manual', config: {} },
      nodes: [
        { id: 'start', type: 'trigger', data: {} },
        { id: 'action1', type: 'http', data: { url: 'https://httpbin.org/post' } },
      ],
      edges: [{ source: 'start', target: 'action1' }],
    });

    // Verify persisted in DB
    const dbWorkflow = await db.query.auraWorkflows.findFirst({
      where: eq(auraWorkflows.id, workflow.id),
    });
    expect(dbWorkflow).not.toBeNull();

    // Execute
    const executionId = await workflowEngine.execute(workflow.id, {});

    // Simulate restart
    await simulateServerRestart();

    // Verify execution state recovered
    const execution = await workflowEngine.getExecution(executionId);
    expect(execution.status).toBe('completed');
  });
});
```

### 9.3 End-to-End Tests

```typescript
// tests/e2e/agent-chat.test.ts

describe('Agent Chat E2E', () => {
  it('should handle multi-agent conversation', async () => {
    // User asks Dexter for financial analysis
    const dexterResponse = await request(app)
      .post('/api/agents/dexter/chat')
      .send({ content: 'Analyze Q4 revenue' });

    expect(dexterResponse.status).toBe(200);
    expect(dexterResponse.body.data).toContain('revenue');

    // User asks Cassie to create support ticket
    const cassieResponse = await request(app)
      .post('/api/agents/cassie/chat')
      .send({ content: 'Create ticket for billing issue' });

    expect(cassieResponse.status).toBe(200);
    expect(cassieResponse.body.metadata.toolsUsed).toContain('create_ticket');

    // Aura automates workflow
    const auraResponse = await request(app)
      .post('/api/agents/aura/chat')
      .send({ content: 'Schedule daily revenue report' });

    expect(auraResponse.status).toBe(200);
    expect(auraResponse.body.metadata.toolsUsed).toContain('schedule_task');
  });
});
```

---

## 10. Phase 7: Monitoring & Observability

### 10.1 Agent Metrics

```typescript
// lib/monitoring/agent-metrics.ts

import { aiUsage } from '@/lib/db/schema';

export class AgentMetrics {
  // Track tool execution
  async trackToolExecution(
    agentId: string,
    toolName: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    await db.insert(toolExecutionLogs).values({
      agentId,
      toolName,
      durationMs: duration,
      success,
      timestamp: new Date(),
    });

    // Prometheus metric
    toolExecutionDuration.observe({ agent: agentId, tool: toolName }, duration);
    toolExecutionTotal.inc({ agent: agentId, tool: toolName, success: String(success) });
  }

  // Track token usage
  async trackTokenUsage(
    agentId: string,
    userId: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<void> {
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = this.calculateCost(model, promptTokens, completionTokens);

    await db.insert(aiUsage).values({
      agentId,
      userId,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
    });
  }

  // Get agent health
  async getAgentHealth(agentId: string): Promise<AgentHealth> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await db
      .select({
        totalRequests: sql<number>`COUNT(*)`,
        successfulRequests: sql<number>`COUNT(*) FILTER (WHERE success = true)`,
        avgDuration: sql<number>`AVG(duration_ms)`,
        p95Duration: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)`,
      })
      .from(toolExecutionLogs)
      .where(
        and(
          eq(toolExecutionLogs.agentId, agentId),
          gte(toolExecutionLogs.timestamp, last24h)
        )
      );

    return {
      agentId,
      status: stats[0].successfulRequests / stats[0].totalRequests > 0.95 ? 'healthy' : 'degraded',
      metrics: {
        requestsLast24h: stats[0].totalRequests,
        successRate: stats[0].successfulRequests / stats[0].totalRequests,
        avgResponseTime: stats[0].avgDuration,
        p95ResponseTime: stats[0].p95Duration,
      },
    };
  }
}
```

### 10.2 Alerting

```typescript
// lib/monitoring/alerts.ts

export class AlertManager {
  async checkAgentHealth(): Promise<void> {
    const agents = ['dexter', 'cassie', 'aura'];

    for (const agentId of agents) {
      const health = await agentMetrics.getAgentHealth(agentId);

      if (health.status !== 'healthy') {
        await this.sendAlert({
          severity: 'warning',
          title: `Agent ${agentId} is ${health.status}`,
          message: `Success rate: ${(health.metrics.successRate * 100).toFixed(1)}%`,
        });
      }

      if (health.metrics.p95ResponseTime > 5000) {
        await this.sendAlert({
          severity: 'warning',
          title: `Agent ${agentId} slow response times`,
          message: `P95: ${health.metrics.p95ResponseTime}ms`,
        });
      }
    }
  }

  async sendAlert(alert: Alert): Promise<void> {
    // Slack notification
    await slackService.postMessage({
      channel: '#agent-alerts',
      text: `\u26a0\ufe0f ${alert.severity.toUpperCase()}: ${alert.title}`,
      attachments: [{ text: alert.message }],
    });

    // Store in DB
    await db.insert(alerts).values(alert);
  }
}
```

---

## 11. Implementierungsplan

### Timeline \u00dcbersicht

```
Woche 1-2: Phase 1 (Schema) + Phase 5 (Infrastructure)
Woche 3-4: Phase 2 (Dexter)
Woche 5-6: Phase 3 (Cassie)
Woche 7-8: Phase 4 (Aura)
Woche 9-10: Phase 6 (Testing) + Phase 7 (Monitoring)
```

### Detaillierter Plan

#### Woche 1-2: Foundation

| Task | Priorit\u00e4t | Aufw. | Abh\u00e4ngigkeiten |
|------|-----------|-------|----------------|
| Schema-Erweiterungen erstellen | P0 | 1d | - |
| Migrations ausf\u00fchren | P0 | 0.5d | Schema |
| Redis Setup | P0 | 0.5d | - |
| BullMQ Setup | P0 | 1d | Redis |
| Embedding Service | P0 | 1d | OpenAI Key |
| Event Bus | P1 | 1d | Redis |

#### Woche 3-4: Dexter

| Task | Priorit\u00e4t | Aufw. | Abh\u00e4ngigkeiten |
|------|-----------|-------|----------------|
| RevenueAnalyzer DB-Integration | P0 | 2d | Schema |
| FinancialReports echte Daten | P0 | 3d | financialTransactions |
| CRMInsights Sales-Rep DB | P1 | 2d | salesRepPerformance |
| CustomerAnalytics Verbesserungen | P1 | 1d | - |
| Unit Tests Dexter | P1 | 2d | Alle Dexter |

#### Woche 5-6: Cassie

| Task | Priorit\u00e4t | Aufw. | Abh\u00e4ngigkeiten |
|------|-----------|-------|----------------|
| KnowledgeBase pgvector | P0 | 3d | Embedding Service |
| Semantic Search | P0 | 2d | KnowledgeBase |
| Article Chunking | P1 | 1d | KnowledgeBase |
| AI Ticket Enrichment | P1 | 2d | Sentiment, KB |
| Unit Tests Cassie | P1 | 2d | Alle Cassie |

#### Woche 7-8: Aura

| Task | Priorit\u00e4t | Aufw. | Abh\u00e4ngigkeiten |
|------|-----------|-------|----------------|
| WorkflowEngine DB Persistenz | P0 | 3d | auraWorkflows |
| BullMQ Integration | P0 | 2d | BullMQ Setup |
| Echte Node Executors | P0 | 3d | HTTP, Email Services |
| TaskScheduler BullMQ | P1 | 2d | BullMQ |
| AutomationRules Actions | P1 | 2d | Services |

#### Woche 9-10: Quality

| Task | Priorit\u00e4t | Aufw. | Abh\u00e4ngigkeiten |
|------|-----------|-------|----------------|
| Integration Tests | P0 | 3d | Alle Agents |
| E2E Tests | P1 | 2d | Integration Tests |
| Metrics Dashboard | P1 | 2d | Monitoring |
| Alert System | P1 | 1d | Metrics |
| Documentation | P2 | 2d | - |

---

## 12. Risiken & Mitigation

### Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| pgvector Performance | Medium | High | Indexing optimieren, HNSW tuning |
| BullMQ Skalierung | Low | Medium | Redis Cluster vorbereiten |
| OpenAI Rate Limits | High | Medium | Batching, Caching, Fallback |
| Migration Downtime | Medium | High | Zero-Downtime Migration planen |

### Abh\u00e4ngigkeiten

| Dependency | Version | Kritisch | Alternative |
|------------|---------|----------|-------------|
| PostgreSQL | 15+ | Ja | - (pgvector ben\u00f6tigt) |
| Redis | 7+ | Ja | Upstash Redis |
| OpenAI API | - | Ja | Azure OpenAI, Anthropic |
| BullMQ | 4+ | Ja | Agenda, node-schedule |

### Rollback-Strategie

1. **Schema-\u00c4nderungen**: Immer reversible Migrations
2. **Feature Flags**: Neue Funktionen hinter Flags
3. **Blue-Green Deployment**: F\u00fcr kritische \u00c4nderungen
4. **Daten-Backup**: Vor jeder Migration

---

## Zusammenfassung

Dieses Konzept transformiert die drei Enterprise Agents von **5.5/10** auf **9.5/10**:

### Vor Implementierung
- 60% Mock-Daten
- Keine Persistenz f\u00fcr Aura
- Keine echten Embeddings
- In-Memory Job-Scheduling

### Nach Implementierung
- **100% echte Datenbank-Integration**
- **Persistente Workflows und Tasks**
- **OpenAI Embeddings mit pgvector**
- **BullMQ Job-Queue f\u00fcr Skalierung**
- **Vollst\u00e4ndige Observability**

### Erwartete Metriken

| Metrik | Aktuell | Ziel |
|--------|:-------:|:----:|
| Daten-Echtheit | 40% | 100% |
| Persistenz | 30% | 100% |
| Test Coverage | 10% | 80% |
| Uptime SLA | - | 99.9% |
| Response Time P95 | - | <2s |
