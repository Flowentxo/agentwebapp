/**
 * FinOps Data Seeding Script
 *
 * Generates realistic historical data for the FinOps Dashboard.
 * Creates 30 days of AI usage data with traffic patterns, budget spikes,
 * and model variety.
 *
 * Run with: npx tsx scripts/seed-finops-data.ts
 *
 * @version 1.0.0
 */

import { getDb } from '../lib/db';
import { aiUsage, budgetUsageHistory } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // User/Workspace configuration
  userId: 'demo-user',
  workspaceId: 'default',

  // Time range
  daysToGenerate: 30,

  // Traffic patterns
  baseTransactionsPerDay: { min: 25, max: 50 },
  weekendTrafficMultiplier: 0.1,
  peakHoursStart: 9,
  peakHoursEnd: 17,

  // Budget spike (3 days ago)
  spikeDay: 3,
  spikeMultiplier: 3,

  // Agents
  agents: [
    { id: 'dexter', name: 'Dexter', weight: 0.4 },
    { id: 'aura', name: 'Aura', weight: 0.35 },
    { id: 'cassie', name: 'Cassie', weight: 0.25 },
  ],

  // Models with pricing (per 1M tokens)
  models: [
    { id: 'gpt-4o', inputPrice: 2.5, outputPrice: 10.0, weight: 0.45 },
    { id: 'gpt-4-turbo', inputPrice: 10.0, outputPrice: 30.0, weight: 0.15 },
    { id: 'gpt-3.5-turbo', inputPrice: 0.5, outputPrice: 1.5, weight: 0.3 },
    { id: 'claude-3-opus', inputPrice: 15.0, outputPrice: 75.0, weight: 0.1 },
  ],

  // Categories
  categories: [
    { id: 'INFERENCE', weight: 0.8 },
    { id: 'TOOL_USE', weight: 0.15 },
    { id: 'MEMORY_OPTIMIZATION', weight: 0.05 },
  ],
};

// ============================================================================
// UTILITIES
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }

  return items[items.length - 1];
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isPeakHour(hour: number): boolean {
  return hour >= CONFIG.peakHoursStart && hour <= CONFIG.peakHoursEnd;
}

function generateRandomTimestamp(date: Date, isWeekendDay: boolean): Date {
  const timestamp = new Date(date);

  if (isWeekendDay) {
    // Weekend: random hours, skewed towards afternoon
    timestamp.setHours(randomInt(10, 22));
  } else {
    // Weekday: 70% chance of peak hours
    if (Math.random() < 0.7) {
      timestamp.setHours(randomInt(CONFIG.peakHoursStart, CONFIG.peakHoursEnd));
    } else {
      timestamp.setHours(randomInt(7, 22));
    }
  }

  timestamp.setMinutes(randomInt(0, 59));
  timestamp.setSeconds(randomInt(0, 59));
  timestamp.setMilliseconds(randomInt(0, 999));

  return timestamp;
}

// ============================================================================
// DATA GENERATION
// ============================================================================

interface GeneratedTransaction {
  agentId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // in micro-dollars
  responseTimeMs: number;
  success: boolean;
  errorType: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

function generateTransaction(date: Date, isSpike: boolean): GeneratedTransaction {
  const agent = weightedRandom(CONFIG.agents);
  let model = weightedRandom(CONFIG.models);

  // During spike, heavily favor expensive models
  if (isSpike && Math.random() < 0.6) {
    model = CONFIG.models.find(m => m.id === 'gpt-4-turbo') || model;
  }

  const category = weightedRandom(CONFIG.categories);

  // Generate token counts based on category
  let promptTokens: number;
  let completionTokens: number;

  switch (category.id) {
    case 'INFERENCE':
      promptTokens = randomInt(500, 4000);
      completionTokens = randomInt(200, 2000);
      break;
    case 'TOOL_USE':
      promptTokens = randomInt(1000, 6000);
      completionTokens = randomInt(100, 800);
      break;
    case 'MEMORY_OPTIMIZATION':
      promptTokens = randomInt(2000, 8000);
      completionTokens = randomInt(300, 1500);
      break;
    default:
      promptTokens = randomInt(500, 2000);
      completionTokens = randomInt(200, 1000);
  }

  // Calculate cost in micro-dollars
  const inputCost = (promptTokens / 1_000_000) * model.inputPrice * 1_000_000;
  const outputCost = (completionTokens / 1_000_000) * model.outputPrice * 1_000_000;
  const estimatedCost = Math.round(inputCost + outputCost);

  // Response time varies by model
  const baseResponseTime = model.id.includes('gpt-4') ? 2000 : 800;
  const responseTimeMs = Math.round(
    baseResponseTime + randomFloat(0.5, 2.0) * (promptTokens + completionTokens) / 100
  );

  // Small chance of failure
  const success = Math.random() > 0.02;
  const errorType = success ? null : ['rate_limit', 'timeout', 'context_length'][randomInt(0, 2)];

  const isWeekendDay = isWeekend(date);
  const timestamp = generateRandomTimestamp(date, isWeekendDay);

  return {
    agentId: agent.id,
    userId: CONFIG.userId,
    model: model.id,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCost,
    responseTimeMs,
    success,
    errorType,
    metadata: {
      category: category.id,
      workspaceId: CONFIG.workspaceId,
      agentName: agent.name,
      streaming: Math.random() > 0.3,
    },
    createdAt: timestamp,
  };
}

function generateDayTransactions(date: Date, daysAgo: number): GeneratedTransaction[] {
  const isWeekendDay = isWeekend(date);
  const isSpike = daysAgo === CONFIG.spikeDay;

  // Calculate number of transactions
  let transactionCount = randomInt(
    CONFIG.baseTransactionsPerDay.min,
    CONFIG.baseTransactionsPerDay.max
  );

  // Weekend reduction
  if (isWeekendDay) {
    transactionCount = Math.floor(transactionCount * CONFIG.weekendTrafficMultiplier);
  }

  // Spike multiplier
  if (isSpike) {
    transactionCount = Math.floor(transactionCount * CONFIG.spikeMultiplier);
  }

  const transactions: GeneratedTransaction[] = [];
  for (let i = 0; i < transactionCount; i++) {
    transactions.push(generateTransaction(date, isSpike));
  }

  return transactions;
}

// ============================================================================
// DAILY AGGREGATES
// ============================================================================

interface DailyAggregate {
  userId: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  tokensUsed: number;
  costUsd: string;
  requestCount: number;
  tokenLimit: number;
  costLimit: string;
  exceededLimit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function aggregateDailyUsage(transactions: GeneratedTransaction[], date: Date): DailyAggregate {
  const periodStart = new Date(date);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(date);
  periodEnd.setHours(23, 59, 59, 999);

  const tokensUsed = transactions.reduce((sum, t) => sum + t.totalTokens, 0);
  const costMicroDollars = transactions.reduce((sum, t) => sum + t.estimatedCost, 0);
  const costUsd = (costMicroDollars / 1_000_000).toFixed(6);

  const tokenLimit = 500000; // 500k tokens daily limit
  const costLimit = '10.00'; // $10 daily limit

  return {
    userId: CONFIG.userId,
    period: 'day',
    periodStart,
    periodEnd,
    tokensUsed,
    costUsd,
    requestCount: transactions.length,
    tokenLimit,
    costLimit,
    exceededLimit: tokensUsed > tokenLimit || parseFloat(costUsd) > parseFloat(costLimit),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedFinOpsData() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   FinOps Data Seeding Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`User ID: ${CONFIG.userId}`);
  console.log(`Workspace ID: ${CONFIG.workspaceId}`);
  console.log(`Days to generate: ${CONFIG.daysToGenerate}`);
  console.log(`Spike day (days ago): ${CONFIG.spikeDay}`);
  console.log('');

  const db = getDb();

  // Clear existing data for this user (optional - comment out to append)
  console.log('Clearing existing data for user...');
  await db.delete(aiUsage).where(sql`user_id = ${CONFIG.userId}`);

  try {
    await db.delete(budgetUsageHistory).where(sql`user_id = ${CONFIG.userId}`);
  } catch (e) {
    console.log('Note: budgetUsageHistory table may not exist yet (will be created)');
  }

  console.log('');

  const allTransactions: GeneratedTransaction[] = [];
  const dailyAggregates: DailyAggregate[] = [];

  // Generate data for each day
  for (let daysAgo = CONFIG.daysToGenerate; daysAgo >= 0; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(12, 0, 0, 0);

    const dayTransactions = generateDayTransactions(date, daysAgo);
    allTransactions.push(...dayTransactions);

    // Create daily aggregate
    const aggregate = aggregateDailyUsage(dayTransactions, date);
    dailyAggregates.push(aggregate);

    const isSpike = daysAgo === CONFIG.spikeDay;
    const spikeMarker = isSpike ? ' 🔥 SPIKE' : '';
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.toISOString().split('T')[0];

    console.log(
      `Generated ${dayTransactions.length.toString().padStart(3)} transactions for ${dateStr} (${dayName})${spikeMarker}`
    );
  }

  console.log('');
  console.log(`Total transactions: ${allTransactions.length}`);
  console.log('');

  // Sort transactions by timestamp
  allTransactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Insert ai_usage records in batches
  console.log('Inserting ai_usage records...');
  const batchSize = 100;

  for (let i = 0; i < allTransactions.length; i += batchSize) {
    const batch = allTransactions.slice(i, i + batchSize);
    await db.insert(aiUsage).values(
      batch.map(t => ({
        agentId: t.agentId,
        userId: t.userId,
        model: t.model,
        promptTokens: t.promptTokens,
        completionTokens: t.completionTokens,
        totalTokens: t.totalTokens,
        estimatedCost: t.estimatedCost,
        responseTimeMs: t.responseTimeMs,
        success: t.success,
        errorType: t.errorType,
        metadata: t.metadata,
        createdAt: t.createdAt,
      }))
    );
    process.stdout.write(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allTransactions.length / batchSize)}\r`);
  }
  console.log('');

  // Insert budget_usage_history records
  console.log('Inserting budget_usage_history records...');
  try {
    for (const aggregate of dailyAggregates) {
      await db.insert(budgetUsageHistory).values({
        userId: aggregate.userId,
        period: aggregate.period,
        periodStart: aggregate.periodStart,
        periodEnd: aggregate.periodEnd,
        tokensUsed: aggregate.tokensUsed,
        costUsd: aggregate.costUsd,
        requestCount: aggregate.requestCount,
        tokenLimit: aggregate.tokenLimit,
        costLimit: aggregate.costLimit,
        exceededLimit: aggregate.exceededLimit,
        createdAt: aggregate.createdAt,
        updatedAt: aggregate.updatedAt,
      });
    }
    console.log(`  Inserted ${dailyAggregates.length} daily aggregates`);
  } catch (e) {
    console.log('  Skipped (table may not exist)');
  }

  // Calculate summary statistics
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Summary Statistics');
  console.log('═══════════════════════════════════════════════════════════');

  const totalTokens = allTransactions.reduce((sum, t) => sum + t.totalTokens, 0);
  const totalCostMicroDollars = allTransactions.reduce((sum, t) => sum + t.estimatedCost, 0);
  const totalCostUsd = totalCostMicroDollars / 1_000_000;

  const modelBreakdown = CONFIG.models.map(model => {
    const modelTransactions = allTransactions.filter(t => t.model === model.id);
    const modelCost = modelTransactions.reduce((sum, t) => sum + t.estimatedCost, 0) / 1_000_000;
    return { model: model.id, count: modelTransactions.length, cost: modelCost };
  });

  const agentBreakdown = CONFIG.agents.map(agent => {
    const agentTransactions = allTransactions.filter(t => t.agentId === agent.id);
    const agentCost = agentTransactions.reduce((sum, t) => sum + t.estimatedCost, 0) / 1_000_000;
    return { agent: agent.name, count: agentTransactions.length, cost: agentCost };
  });

  console.log('');
  console.log(`Total Transactions: ${allTransactions.length}`);
  console.log(`Total Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`Total Cost: $${totalCostUsd.toFixed(2)}`);
  console.log('');
  console.log('By Model:');
  modelBreakdown.forEach(m => {
    console.log(`  ${m.model.padEnd(15)} ${m.count.toString().padStart(5)} txns  $${m.cost.toFixed(2)}`);
  });
  console.log('');
  console.log('By Agent:');
  agentBreakdown.forEach(a => {
    console.log(`  ${a.agent.padEnd(15)} ${a.count.toString().padStart(5)} txns  $${a.cost.toFixed(2)}`);
  });
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Seeding Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  process.exit(0);
}

// Run the seeding
seedFinOpsData().catch(error => {
  console.error('Error seeding FinOps data:', error);
  process.exit(1);
});
