/**
 * Finance Data Seed Script - Phase 5
 *
 * Populates the database with realistic demo data for the Financial Dashboard:
 * - Enterprise user with budget settings
 * - Hierarchical cost centers (Engineering, Marketing, etc.)
 * - 30 days of usage history with increasing trend
 * - 2 anomalies (spikes) for Buddy AI alerts
 * - Cached forecast data
 *
 * Run with: npx tsx scripts/seed-finance.ts
 *
 * @version 1.0.0
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lte } from 'drizzle-orm';

// Schema imports
import { users } from '../lib/db/schema';
import { userBudgets, budgetUsageHistory, budgetAlerts, billingTransactions } from '../lib/db/schema-user-budgets';
import { costCenters, budgetProjects, budgetForecasts, enterpriseAuditLogs } from '../lib/db/schema-budget-enterprise';

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
  demoUserId: 'demo-enterprise-user',
  demoUserEmail: 'demo@flowent.ai',
  organizationId: 'flowent-demo-org',

  // Budget settings
  monthlyBudgetLimit: 500.00,
  dailyBudgetLimit: 25.00,
  monthlyTokenLimit: 5000000, // 5M tokens
  dailyTokenLimit: 200000, // 200k tokens

  // Usage history settings
  daysOfHistory: 30,
  baselineDaily: {
    tokens: 50000,    // Base 50k tokens per day
    cost: 5.00,       // Base $5 per day
    requests: 150,
  },

  // Trend: 3% daily increase (compounding)
  dailyGrowthRate: 0.03,

  // Anomalies: Spikes that should trigger Buddy alerts
  anomalies: [
    { daysAgo: 3, multiplier: 4.5, type: 'spike' as const },  // 4.5x spike 3 days ago
    { daysAgo: 10, multiplier: 2.8, type: 'spike' as const }, // 2.8x spike 10 days ago
  ],

  // Model distribution (for realistic breakdown)
  modelDistribution: {
    'gpt-4o': { share: 0.45, costPer1k: 0.005 },
    'gpt-4o-mini': { share: 0.35, costPer1k: 0.00015 },
    'gpt-4-turbo': { share: 0.15, costPer1k: 0.01 },
    'gpt-3.5-turbo': { share: 0.05, costPer1k: 0.0005 },
  },

  // Agent distribution
  agentDistribution: {
    'dexter': { share: 0.30, name: 'Dexter' },
    'cassie': { share: 0.25, name: 'Cassie' },
    'buddy': { share: 0.20, name: 'Buddy' },
    'emmie': { share: 0.15, name: 'Emmie' },
    'aura': { share: 0.10, name: 'Aura' },
  },
};

// =====================================================
// DATABASE CONNECTION
// =====================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function randomVariation(base: number, variationPercent: number = 0.2): number {
  const variation = base * variationPercent;
  return base + (Math.random() * 2 - 1) * variation;
}

function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// =====================================================
// SEED FUNCTIONS
// =====================================================

async function seedDemoUser() {
  console.log('\n📧 Setting up demo user...');

  // Check if user exists
  const existingUser = await db.select().from(users).where(eq(users.id, CONFIG.demoUserId)).limit(1);

  if (existingUser.length === 0) {
    // Create new user
    await db.insert(users).values({
      id: CONFIG.demoUserId,
      email: CONFIG.demoUserEmail,
      name: 'Demo Enterprise User',
      role: 'admin',
      isVerified: true,
    });
    console.log('   ✅ Created demo user');
  } else {
    console.log('   ℹ️ Demo user already exists');
  }

  // Setup/update user budget
  const existingBudget = await db.select().from(userBudgets).where(eq(userBudgets.userId, CONFIG.demoUserId)).limit(1);

  const budgetData = {
    userId: CONFIG.demoUserId,
    monthlyTokenLimit: CONFIG.monthlyTokenLimit,
    monthlyCostLimitUsd: String(CONFIG.monthlyBudgetLimit),
    dailyTokenLimit: CONFIG.dailyTokenLimit,
    dailyCostLimitUsd: String(CONFIG.dailyBudgetLimit),
    maxTokensPerRequest: 8000,
    maxRequestsPerMinute: 20,
    maxRequestsPerHour: 200,
    maxRequestsPerDay: 1000,
    isActive: true,
    notifyOnThreshold: true,
    notifyThresholdPercent: 80,
    preferredModel: 'gpt-4o',
    allowedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    autoCostOptimization: true,
    isEnterprise: true,
    organizationId: CONFIG.organizationId,
    metadata: {
      plan: 'enterprise' as const,
      customLimits: true,
      notes: 'Demo enterprise account for testing',
      autoReload: {
        enabled: true,
        threshold: 15,
        packageId: 2,
      },
    },
  };

  if (existingBudget.length === 0) {
    await db.insert(userBudgets).values(budgetData);
    console.log('   ✅ Created user budget settings');
  } else {
    await db.update(userBudgets)
      .set(budgetData)
      .where(eq(userBudgets.userId, CONFIG.demoUserId));
    console.log('   ✅ Updated user budget settings');
  }

  return CONFIG.demoUserId;
}

async function seedCostCenters() {
  console.log('\n🏢 Setting up cost centers hierarchy...');

  // Delete existing cost centers for this organization
  await db.delete(costCenters).where(eq(costCenters.organizationId, CONFIG.organizationId));

  // Parent cost centers
  const engineeringCenter = await db.insert(costCenters).values({
    organizationId: CONFIG.organizationId,
    name: 'Engineering',
    code: 'CC-ENG-001',
    description: 'Engineering department - all AI development and infrastructure costs',
    monthlyBudgetLimitUsd: '250.00',
    usedBudgetUsd: '0.00',
    allocatedBudgetUsd: '250.00',
    monthlyTokenLimit: 2500000,
    managerId: CONFIG.demoUserId,
    status: 'active',
    allowOverspend: false,
    overspendAlertThreshold: 85,
    metadata: {
      department: 'Engineering',
      businessUnit: 'Product',
      tags: ['core', 'priority'],
    },
  }).returning();

  const marketingCenter = await db.insert(costCenters).values({
    organizationId: CONFIG.organizationId,
    name: 'Marketing',
    code: 'CC-MKT-001',
    description: 'Marketing department - content generation and campaign AI costs',
    monthlyBudgetLimitUsd: '150.00',
    usedBudgetUsd: '0.00',
    allocatedBudgetUsd: '150.00',
    monthlyTokenLimit: 1500000,
    managerId: CONFIG.demoUserId,
    status: 'active',
    allowOverspend: false,
    overspendAlertThreshold: 90,
    metadata: {
      department: 'Marketing',
      businessUnit: 'Growth',
      tags: ['content', 'campaigns'],
    },
  }).returning();

  const supportCenter = await db.insert(costCenters).values({
    organizationId: CONFIG.organizationId,
    name: 'Customer Success',
    code: 'CC-CS-001',
    description: 'Customer success - support chatbots and automated responses',
    monthlyBudgetLimitUsd: '100.00',
    usedBudgetUsd: '0.00',
    allocatedBudgetUsd: '100.00',
    monthlyTokenLimit: 1000000,
    managerId: CONFIG.demoUserId,
    status: 'active',
    allowOverspend: true, // Allow overspend for customer support
    overspendAlertThreshold: 95,
    metadata: {
      department: 'Customer Success',
      businessUnit: 'Operations',
      tags: ['support', '24/7'],
    },
  }).returning();

  console.log('   ✅ Created parent cost centers: Engineering, Marketing, Customer Success');

  // Child cost centers under Engineering
  await db.insert(costCenters).values({
    organizationId: CONFIG.organizationId,
    parentCostCenterId: engineeringCenter[0].id,
    name: 'AI Research',
    code: 'CC-ENG-AI-001',
    description: 'AI Research team - experimental models and R&D',
    monthlyBudgetLimitUsd: '150.00',
    usedBudgetUsd: '0.00',
    allocatedBudgetUsd: '150.00',
    monthlyTokenLimit: 1500000,
    managerId: CONFIG.demoUserId,
    status: 'active',
    allowOverspend: true,
    metadata: {
      department: 'Engineering',
      businessUnit: 'R&D',
      tags: ['research', 'experimental'],
    },
  });

  await db.insert(costCenters).values({
    organizationId: CONFIG.organizationId,
    parentCostCenterId: engineeringCenter[0].id,
    name: 'Platform Development',
    code: 'CC-ENG-PLT-001',
    description: 'Platform team - production AI integrations',
    monthlyBudgetLimitUsd: '100.00',
    usedBudgetUsd: '0.00',
    allocatedBudgetUsd: '100.00',
    monthlyTokenLimit: 1000000,
    managerId: CONFIG.demoUserId,
    status: 'active',
    allowOverspend: false,
    metadata: {
      department: 'Engineering',
      businessUnit: 'Platform',
      tags: ['production', 'stable'],
    },
  });

  console.log('   ✅ Created child cost centers: AI Research, Platform Development');

  return {
    engineering: engineeringCenter[0],
    marketing: marketingCenter[0],
    support: supportCenter[0],
  };
}

async function seedUsageHistory(userId: string, costCenters: any) {
  console.log('\n📊 Generating 30 days of usage history...');

  // Delete existing usage history for this user
  await db.delete(budgetUsageHistory).where(eq(budgetUsageHistory.userId, userId));

  let totalTokens = 0;
  let totalCost = 0;
  let totalRequests = 0;

  const usageRecords = [];

  for (let daysAgo = CONFIG.daysOfHistory; daysAgo >= 0; daysAgo--) {
    const date = getDateDaysAgo(daysAgo);
    const nextDate = getDateDaysAgo(daysAgo - 1);

    // Calculate base values with growth trend
    const growthFactor = Math.pow(1 + CONFIG.dailyGrowthRate, CONFIG.daysOfHistory - daysAgo);
    let dailyTokens = Math.round(CONFIG.baselineDaily.tokens * growthFactor);
    let dailyCost = CONFIG.baselineDaily.cost * growthFactor;
    let dailyRequests = Math.round(CONFIG.baselineDaily.requests * growthFactor);

    // Add random variation
    dailyTokens = Math.round(randomVariation(dailyTokens, 0.15));
    dailyCost = randomVariation(dailyCost, 0.15);
    dailyRequests = Math.round(randomVariation(dailyRequests, 0.2));

    // Check for anomalies
    const anomaly = CONFIG.anomalies.find(a => a.daysAgo === daysAgo);
    if (anomaly) {
      dailyTokens = Math.round(dailyTokens * anomaly.multiplier);
      dailyCost = dailyCost * anomaly.multiplier;
      dailyRequests = Math.round(dailyRequests * anomaly.multiplier);
      console.log(`   ⚠️ Anomaly spike on ${formatDate(date)}: ${anomaly.multiplier}x normal`);
    }

    // Generate model usage breakdown
    const modelUsage: Record<string, { tokens: number; cost: number; requests: number }> = {};
    for (const [model, config] of Object.entries(CONFIG.modelDistribution)) {
      const modelTokens = Math.round(dailyTokens * config.share * randomVariation(1, 0.1));
      const modelCost = (modelTokens / 1000) * config.costPer1k;
      const modelRequests = Math.round(dailyRequests * config.share * randomVariation(1, 0.15));
      modelUsage[model] = {
        tokens: modelTokens,
        cost: Math.round(modelCost * 1000000) / 1000000,
        requests: modelRequests,
      };
    }

    // Generate agent usage breakdown
    const agentUsage: Record<string, { tokens: number; cost: number; requests: number }> = {};
    for (const [agentId, config] of Object.entries(CONFIG.agentDistribution)) {
      const agentTokens = Math.round(dailyTokens * config.share * randomVariation(1, 0.1));
      const agentCost = dailyCost * config.share * randomVariation(1, 0.1);
      const agentRequests = Math.round(dailyRequests * config.share * randomVariation(1, 0.15));
      agentUsage[agentId] = {
        tokens: agentTokens,
        cost: Math.round(agentCost * 1000000) / 1000000,
        requests: agentRequests,
      };
    }

    // Assign to cost centers (weighted distribution)
    const costCenterIds = [
      { id: costCenters.engineering.id, weight: 0.5 },
      { id: costCenters.marketing.id, weight: 0.3 },
      { id: costCenters.support.id, weight: 0.2 },
    ];
    const selectedCenter = costCenterIds[Math.floor(Math.random() * 3)];

    usageRecords.push({
      userId,
      period: 'day',
      periodStart: date,
      periodEnd: nextDate,
      tokensUsed: dailyTokens,
      costUsd: String(Math.round(dailyCost * 1000000) / 1000000),
      requestCount: dailyRequests,
      tokenLimit: CONFIG.dailyTokenLimit,
      costLimit: String(CONFIG.dailyBudgetLimit),
      exceededLimit: dailyCost > CONFIG.dailyBudgetLimit,
      costCenterId: selectedCenter.id,
      modelUsage,
      agentUsage,
      avgResponseTimeMs: Math.round(500 + Math.random() * 1000),
      errorCount: Math.floor(Math.random() * 5),
      successRate: Math.round(95 + Math.random() * 5),
      tags: anomaly ? ['anomaly', 'spike'] : [],
    });

    totalTokens += dailyTokens;
    totalCost += dailyCost;
    totalRequests += dailyRequests;
  }

  // Insert all records
  await db.insert(budgetUsageHistory).values(usageRecords);

  console.log(`   ✅ Created ${usageRecords.length} daily usage records`);
  console.log(`   📈 Total: ${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(2)}, ${totalRequests} requests`);

  // Update current usage in user budget
  const lastDayUsage = usageRecords[usageRecords.length - 1];
  await db.update(userBudgets)
    .set({
      currentMonthTokens: totalTokens,
      currentMonthCostUsd: String(totalCost),
      currentDayTokens: lastDayUsage.tokensUsed,
      currentDayCostUsd: lastDayUsage.costUsd,
    })
    .where(eq(userBudgets.userId, userId));

  // Update cost center usage
  for (const center of Object.values(costCenters)) {
    const centerUsage = usageRecords
      .filter(r => r.costCenterId === (center as any).id)
      .reduce((acc, r) => acc + parseFloat(r.costUsd), 0);

    await db.update(costCenters)
      .set({ usedBudgetUsd: String(centerUsage) })
      .where(eq(costCenters.id, (center as any).id));
  }

  return { totalTokens, totalCost, totalRequests };
}

async function seedBudgetAlerts(userId: string) {
  console.log('\n🔔 Creating budget alerts...');

  // Delete existing alerts
  await db.delete(budgetAlerts).where(eq(budgetAlerts.userId, userId));

  const alerts = [
    {
      userId,
      alertType: 'anomaly_detected',
      severity: 'critical',
      message: 'Ungewöhnlich hoher Token-Verbrauch erkannt: 4.5x über dem Durchschnitt. Prüfe die letzten Anfragen auf mögliche Fehler oder Missbrauch.',
      currentUsage: { tokens: 225000, costUsd: 22.50, percentage: 450 },
      limit: { tokens: CONFIG.dailyTokenLimit, costUsd: CONFIG.dailyBudgetLimit },
      isRead: false,
      isSent: true,
    },
    {
      userId,
      alertType: 'threshold',
      severity: 'warning',
      message: 'Monatliches Budget zu 78% ausgeschöpft. Bei aktuellem Trend wird das Limit in 6 Tagen erreicht.',
      currentUsage: { tokens: 3900000, costUsd: 390, percentage: 78 },
      limit: { tokens: CONFIG.monthlyTokenLimit, costUsd: CONFIG.monthlyBudgetLimit },
      isRead: false,
      isSent: true,
    },
    {
      userId,
      alertType: 'trend_change',
      severity: 'info',
      message: 'Positiver Trend: Token-Verbrauch ist diese Woche 12% effizienter als letzte Woche.',
      currentUsage: { percentage: -12 },
      isRead: true,
      isSent: true,
    },
  ];

  await db.insert(budgetAlerts).values(alerts);
  console.log(`   ✅ Created ${alerts.length} budget alerts`);
}

async function seedForecastData(userId: string, usageStats: { totalTokens: number; totalCost: number }) {
  console.log('\n🔮 Generating forecast data...');

  // Delete existing forecasts
  await db.delete(budgetForecasts).where(eq(budgetForecasts.userId, userId));

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate projections based on actual usage with growth trend
  const dailyAvgCost = usageStats.totalCost / CONFIG.daysOfHistory;
  const dailyAvgTokens = usageStats.totalTokens / CONFIG.daysOfHistory;
  const projectedEomCost = usageStats.totalCost + (dailyAvgCost * daysLeft * 1.03); // 3% growth
  const projectedEomTokens = usageStats.totalTokens + (dailyAvgTokens * daysLeft * 1.03);

  // Calculate run-out date
  const remainingBudget = CONFIG.monthlyBudgetLimit - usageStats.totalCost;
  const daysUntilRunout = remainingBudget > 0 ? Math.floor(remainingBudget / dailyAvgCost) : 0;
  const runOutDate = new Date();
  runOutDate.setDate(runOutDate.getDate() + daysUntilRunout);

  // Store forecast
  await db.insert(budgetForecasts).values({
    userId,
    forecastPeriod: 'monthly',
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: endOfMonth,
    predictedTokens: Math.round(projectedEomTokens),
    predictedCostUsd: String(projectedEomCost.toFixed(4)),
    predictedRequests: Math.round(usageStats.totalTokens / 50 * 1.03), // rough estimate
    estimatedRunOutDate: runOutDate,
    estimatedEomCostUsd: String(projectedEomCost.toFixed(4)),
    estimatedEomTokens: Math.round(projectedEomTokens),
    dailyAvgTokens: Math.round(dailyAvgTokens),
    dailyAvgCostUsd: String(dailyAvgCost.toFixed(4)),
    weeklyGrowthRate: '3.00',
    monthlyGrowthRate: '12.50',
    confidenceScore: 78,
    dataPointsUsed: CONFIG.daysOfHistory,
    algorithm: 'linear_regression',
    modelParams: {
      slope: dailyAvgCost * 1.03,
      intercept: 0,
      r2: 0.87,
      mse: 2.34,
    },
    anomalyDetected: true,
    anomalyDetails: {
      type: 'spike',
      magnitude: 4.5,
      expectedValue: CONFIG.baselineDaily.cost,
      actualValue: CONFIG.baselineDaily.cost * 4.5,
      detectedAt: getDateDaysAgo(3).toISOString(),
    },
    isStale: false,
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
  });

  // Update user budget with cached forecast
  await db.update(userBudgets)
    .set({
      forecastData: {
        estimatedRunOutDate: runOutDate.toISOString(),
        projectedEomCostUsd: projectedEomCost,
        projectedEomTokens: Math.round(projectedEomTokens),
        dailyAvgTokens: Math.round(dailyAvgTokens),
        dailyAvgCostUsd: dailyAvgCost,
        weeklyGrowthRate: 3.0,
        monthlyGrowthRate: 12.5,
        trend: 'increasing',
        confidenceScore: 78,
        anomalyDetected: true,
        anomalyType: 'spike',
        calculatedAt: new Date().toISOString(),
      },
    })
    .where(eq(userBudgets.userId, userId));

  console.log(`   ✅ Created forecast data`);
  console.log(`   📈 Projected end-of-month: $${projectedEomCost.toFixed(2)} (${projectedEomTokens.toLocaleString()} tokens)`);
  console.log(`   ⏰ Estimated budget run-out: ${formatDate(runOutDate)}`);
}

async function seedAuditLogs(userId: string) {
  console.log('\n📝 Creating audit log entries...');

  // Delete existing audit logs for this user
  await db.delete(enterpriseAuditLogs).where(eq(enterpriseAuditLogs.userId, userId));

  const auditEntries = [
    {
      userId,
      userEmail: CONFIG.demoUserEmail,
      userRole: 'admin',
      action: 'budget.limit.updated',
      actionCategory: 'budget_change' as const,
      severity: 'info' as const,
      resourceType: 'user_budget',
      resourceId: userId,
      resourceName: 'Monthly Budget Limit',
      previousValue: { monthlyCostLimitUsd: 300 },
      newValue: { monthlyCostLimitUsd: 500 },
      changeDescription: 'Monthly budget limit increased from $300 to $500',
      ipAddress: '192.168.1.100',
      metadata: { reason: 'Quarterly budget increase' },
    },
    {
      userId,
      userEmail: CONFIG.demoUserEmail,
      userRole: 'admin',
      action: 'cost_center.created',
      actionCategory: 'cost_center_change' as const,
      severity: 'info' as const,
      resourceType: 'cost_center',
      resourceId: 'cc-eng-001',
      resourceName: 'Engineering',
      newValue: { name: 'Engineering', budget: 250 },
      changeDescription: 'Created new cost center "Engineering" with $250 monthly budget',
      ipAddress: '192.168.1.100',
    },
    {
      userId,
      userEmail: CONFIG.demoUserEmail,
      userRole: 'system',
      action: 'anomaly.detected',
      actionCategory: 'system_action' as const,
      severity: 'warning' as const,
      resourceType: 'usage',
      resourceId: 'usage-spike-001',
      resourceName: 'Daily Usage Spike',
      changeDescription: 'Anomaly detected: Usage spike 4.5x above normal on ' + formatDate(getDateDaysAgo(3)),
      metadata: {
        riskScore: 75,
        complianceFlags: ['usage_spike', 'requires_review'],
      },
    },
  ];

  await db.insert(enterpriseAuditLogs).values(auditEntries);
  console.log(`   ✅ Created ${auditEntries.length} audit log entries`);
}

async function seedBillingTransactions(userId: string) {
  console.log('\n💳 Creating billing transactions...');

  // Delete existing transactions
  await db.delete(billingTransactions).where(eq(billingTransactions.userId, userId));

  const transactions = [
    {
      userId,
      packageId: 'pkg_2',
      amount: '50.00',
      tokens: 280000000,
      status: 'completed',
      paymentMethod: 'card',
      transactionId: 'txn_demo_001',
      metadata: { cardLast4: '4242', brand: 'visa' },
    },
    {
      userId,
      packageId: 'pkg_3',
      amount: '100.00',
      tokens: 600000000,
      status: 'completed',
      paymentMethod: 'card',
      transactionId: 'txn_demo_002',
      metadata: { cardLast4: '4242', brand: 'visa' },
    },
  ];

  await db.insert(billingTransactions).values(transactions);
  console.log(`   ✅ Created ${transactions.length} billing transactions`);
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🌱 FLOWENT FINANCE DATA SEED SCRIPT');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Database: ${connectionString?.split('@')[1]?.split('/')[0] || 'local'}`);
  console.log(`   Demo User: ${CONFIG.demoUserEmail}`);
  console.log('═══════════════════════════════════════════════════════');

  try {
    // 1. Setup demo user
    const userId = await seedDemoUser();

    // 2. Create cost centers hierarchy
    const centers = await seedCostCenters();

    // 3. Generate usage history with trend and anomalies
    const usageStats = await seedUsageHistory(userId, centers);

    // 4. Create budget alerts
    await seedBudgetAlerts(userId);

    // 5. Generate forecast data
    await seedForecastData(userId, usageStats);

    // 6. Create audit logs
    await seedAuditLogs(userId);

    // 7. Create billing transactions
    await seedBillingTransactions(userId);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   ✅ SEED COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   User ID: ${userId}`);
    console.log(`   Login: ${CONFIG.demoUserEmail}`);
    console.log(`   Monthly Budget: $${CONFIG.monthlyBudgetLimit}`);
    console.log(`   Current Spend: $${usageStats.totalCost.toFixed(2)}`);
    console.log(`   Utilization: ${((usageStats.totalCost / CONFIG.monthlyBudgetLimit) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
