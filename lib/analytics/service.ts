
import { getDb } from '@/lib/db';
import { 
  users, workspaces, workspaceAgents, agentMessages, aiUsage, agentConversations 
} from '@/lib/db/schema';
import { desc, count, sum, eq, gte, sql } from 'drizzle-orm';
import { MOCK_DASHBOARDS, Dashboard } from './mockData';

const db = getDb();

/**
 * Main Service Function: Hydrates a dashboard configuration with real data.
 */
export async function getDashboardData(dashboardId: string, timeRange = '7d'): Promise<Dashboard | null> {
  // 1. Get the Layout Template (Mock)
  const template = MOCK_DASHBOARDS.find(d => d.id === dashboardId);
  if (!template) return null;

  // Clone to avoid mutating original mock
  const dashboard = JSON.parse(JSON.stringify(template));

  console.log(`[AnalyticsService] Fetching dashboard: ${dashboardId} with range: ${timeRange}`);
  
  const startDate = getStartDate(timeRange);

  // 2. Fetch Real Data based on Dashboard ID
  try {
    if (dashboardId === 'team-overview') {
       await hydrateTeamOverview(dashboard, startDate);
    } else if (dashboardId === 'cost-analysis') {
       await hydrateCostAnalysis(dashboard, startDate);
    } else if (dashboardId === 'agent-deep-dive') {
       await hydrateAgentDeepDive(dashboard, startDate);
    }
    console.log(`[AnalyticsService] Hydration complete for: ${dashboardId}`);
  } catch (err) {
    console.error(`[AnalyticsService] Error hydrating dashboard ${dashboardId}:`, err);
    throw err; // Re-throw to be caught by API route
  }

  return dashboard;
}

// --- HYDRATION HELPERS ---

async function hydrateTeamOverview(dashboard: Dashboard, startDate: Date) {
  console.log('[AnalyticsService] Hydrating Team Overview');
  try {
    // A. Active Agents
    const agentCount = await db.select({ count: sql<number>`count(*)::int` }).from(workspaceAgents).where(sql`enabled = true`);
    console.log('[AnalyticsService] Agent Count Success:', agentCount[0]?.count);
    updateWidget(dashboard, 'kpi-active-agents', { value: agentCount[0]?.count || 0 });

    // B. Success Rate (Avg from AI Usage)
    console.log('[AnalyticsService] Querying Success Stats...');
    const successStats = await db.select({ 
        total: sql<number>`count(*)::int`, 
        success: sql<number>`sum(case when success = true then 1 else 0 end)::int` 
    }).from(aiUsage)
      .where(gte(aiUsage.createdAt, startDate));
    console.log('[AnalyticsService] Success Stats Success:', successStats[0]);
    
    const total = Number(successStats[0]?.total || 0);
    const succ = Number(successStats[0]?.success || 0);
    const rate = total > 0 ? ((succ / total) * 100).toFixed(1) + '%' : '100%';
    
    updateWidget(dashboard, 'kpi-success-rate', { value: rate });
  } catch (e) {
    console.error('[AnalyticsService] Error in Team Overview part 1:', e);
    throw e;
  }

  try {
    // C. Est Cost (Total)
    console.log('[AnalyticsService] Querying Cost Stats...');
    const costStats = await db.select({ 
      total: sql<string>`sum(${aiUsage.estimatedCost})` 
    }).from(aiUsage)
      .where(gte(aiUsage.createdAt, startDate));
    console.log('[AnalyticsService] Cost Stats Success:', costStats[0]);
    // Cost is in micro-dollars, convert to USD
    const totalCostRaw = Number(costStats[0]?.total || 0);
    const costUSD = (totalCostRaw / 1000000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    updateWidget(dashboard, 'kpi-cost', { value: costUSD });

    // D. Throughput (Tasks / Messages)
    console.log('[AnalyticsService] Querying Task Count...');
    const taskCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(agentMessages)
      .where(gte(agentMessages.createdAt, startDate));
    console.log('[AnalyticsService] Task Count Success:', taskCount[0]?.count);
    updateWidget(dashboard, 'kpi-throughput', { value: taskCount[0]?.count || 0 });
  } catch (e) {
    console.error('[AnalyticsService] Error in Team Overview part 2:', e);
    throw e;
  }

  // E. Recent Errors Table
  // Fetch Failed AI Usages
  const errors = await db.select()
                     .from(aiUsage)
                     .where(eq(aiUsage.success, false))
                     .orderBy(desc(aiUsage.createdAt))
                     .limit(5);

  const errorRows = errors.map(e => ({
     id: e.id,
     timestamp: new Date(e.createdAt).toLocaleTimeString(),
     agent: e.agentId,
     error: e.errorType || 'Unknown Error',
     status: 'Failed'
  }));
  
  updateWidget(dashboard, 'table-errors', { rows: errorRows });
}

async function hydrateCostAnalysis(dashboard: Dashboard) {
   // A. Total Spend
   const costStats = await db.select({ total: sum(aiUsage.estimatedCost) }).from(aiUsage);
   const cost = (costStats[0]?.total || 0) / 1000000;
   
   updateWidget(dashboard, 'cost-total', { value: `$${cost.toFixed(2)}` });

   // B. Forecast (Fake logic: cost * 1.5)
   updateWidget(dashboard, 'cost-forecast', { value: `$${(cost * 1.5).toFixed(2)}` });

   // C. Model Breakdown
   const modelStats = await db.select({
      model: aiUsage.model,
      cost: sum(aiUsage.estimatedCost)
   })
   .from(aiUsage)
   .groupBy(aiUsage.model);

   // Map to Pie Chart Format
   const pieData = modelStats.map((m, idx) => ({
      name: m.model,
      value: (Number(m.cost) / 1000000),
      color: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : '#8b5cf6'
   }));
   
   updateWidget(dashboard, 'cost-breakdown', pieData); // Assign directly as array (Pie config)
}

async function hydrateAgentDeepDive(dashboard: Dashboard) {
   // A. Timeline (Last 10 events)
   const events = await db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(10);
   
   const timelineData = events.map(e => ({
      time: new Date(e.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      label: e.success ? 'Execution Success' : 'Execution Failed',
      type: e.success ? 'success' : 'error',
      subtext: `Agent: ${e.agentId} | Model: ${e.model}`
   }));

   updateWidget(dashboard, 'timeline-history', timelineData);

   // B. Agent Health Table
   // Group by agent, get last status
   const agentHealth = await db.select({
      agentId: workspaceAgents.id,
      name: sql<string>`agent_id`,
      enabled: sql<boolean>`enabled`
   }).from(workspaceAgents);

   const rows = agentHealth.map(a => ({
      id: a.agentId,
      timestamp: 'Now',
      agent: a.name || 'Unknown Agent',
      error: 'None',
      status: a.enabled ? 'Resolved' : 'Ignored'
   }));

   updateWidget(dashboard, 'agent-health', { rows });
}

function updateWidget(dashboard: Dashboard, widgetId: string, dataMerge: any) {
   const widget = dashboard.widgets.find(w => w.id === widgetId);
   if (widget) {
      if (Array.isArray(dataMerge)) {
         widget.data = dataMerge; // Replace for charts
      } else {
         widget.data = { ...widget.data, ...dataMerge }; // Merge for objects
      }
   }
}
