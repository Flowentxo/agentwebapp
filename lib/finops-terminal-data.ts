/**
 * FinOps Terminal Data - Enterprise Scale Simulation
 *
 * Realistic enterprise-grade data for the FinOps Terminal.
 * Simulates thousands of transactions across multiple users, models, and agents.
 *
 * v3.0.0 - Complete redesign for professional FinOps interface
 */

// =====================================================
// TYPES
// =====================================================

export interface MetricRibbonData {
  forecast: {
    value: number;
    trend: number; // percentage change
    projection: 'on_track' | 'over_budget' | 'under_budget';
  };
  burnRate: {
    value: number;
    unit: 'credits/hr';
    trend: number;
  };
  activeBudgets: {
    value: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  anomalies: {
    count: number;
    severity: 'none' | 'low' | 'medium' | 'high';
    lastDetected: string | null;
  };
}

export interface DateRange {
  label: string;
  value: '24h' | '7d' | '30d' | '90d' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface CostExplorerDimension {
  id: string;
  label: string;
  values: string[];
}

export interface CostExplorerFilter {
  dimension: string;
  operator: 'include' | 'exclude';
  values: string[];
}

export interface CostDataPoint {
  date: string;
  timestamp: number;
  actual: number;
  forecast: number | null;
  budget: number;
  byModel: Record<string, number>;
  byAgent: Record<string, number>;
  byUser: Record<string, number>;
  byTag: Record<string, number>;
}

export interface BudgetPolicy {
  id: string;
  name: string;
  scope: 'global' | 'workspace' | 'user' | 'agent';
  scopeTarget?: string;
  thresholdType: 'absolute' | 'percentage';
  threshold: number;
  currentUsage: number;
  limit: number;
  action: 'alert' | 'throttle' | 'block';
  status: 'active' | 'triggered' | 'disabled';
  createdAt: string;
  lastTriggered?: string;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  requestId: string;
  userId: string;
  userName: string;
  agentId: string;
  agentName: string;
  modelId: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  cacheHitRate: number;
  success: boolean;
  tags: string[];
  errorCode?: string;
}

export interface Anomaly {
  id: string;
  timestamp: string;
  type: 'spike' | 'drop' | 'pattern_change' | 'unusual_model';
  severity: 'low' | 'medium' | 'high';
  description: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
}

// =====================================================
// METRIC RIBBON DATA
// =====================================================

export const mockMetricRibbon: MetricRibbonData = {
  forecast: {
    value: 4847.32,
    trend: 12.4,
    projection: 'over_budget',
  },
  burnRate: {
    value: 8.42,
    unit: 'credits/hr',
    trend: -3.2,
  },
  activeBudgets: {
    value: 12,
    healthy: 8,
    warning: 3,
    critical: 1,
  },
  anomalies: {
    count: 2,
    severity: 'medium',
    lastDetected: '2025-12-30T11:45:00Z',
  },
};

// =====================================================
// DATE RANGES
// =====================================================

export const dateRanges: DateRange[] = [
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

// =====================================================
// DIMENSIONS & FILTERS
// =====================================================

export const dimensions: CostExplorerDimension[] = [
  {
    id: 'time',
    label: 'Time',
    values: ['Hourly', 'Daily', 'Weekly', 'Monthly'],
  },
  {
    id: 'model',
    label: 'Model',
    values: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-sonnet', 'text-embedding-3-small'],
  },
  {
    id: 'agent',
    label: 'Agent',
    values: ['Dexter', 'Aura', 'Cassie', 'Emmie', 'Brain', 'Custom'],
  },
  {
    id: 'user',
    label: 'User',
    values: ['admin@company.com', 'dev@company.com', 'ops@company.com', 'marketing@company.com'],
  },
  {
    id: 'tag',
    label: 'Tag',
    values: ['production', 'development', 'testing', 'marketing', 'support', 'analytics'],
  },
];

// =====================================================
// COST EXPLORER DATA (30 Days)
// =====================================================

const generateCostData = (): CostDataPoint[] => {
  const data: CostDataPoint[] = [];
  const now = new Date();
  const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-sonnet', 'text-embedding-3-small'];
  const agents = ['Dexter', 'Aura', 'Cassie', 'Emmie', 'Brain'];
  const users = ['admin@company.com', 'dev@company.com', 'ops@company.com', 'marketing@company.com'];
  const tags = ['production', 'development', 'testing', 'marketing', 'support'];

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseUsage = isWeekend ? 80 : 180;
    const variance = (Math.random() - 0.5) * 60;
    const actual = Math.max(20, baseUsage + variance);

    // Generate breakdown by dimension
    const byModel: Record<string, number> = {};
    const modelWeights = [0.35, 0.30, 0.15, 0.12, 0.08];
    models.forEach((model, idx) => {
      byModel[model] = actual * modelWeights[idx] * (0.8 + Math.random() * 0.4);
    });

    const byAgent: Record<string, number> = {};
    const agentWeights = [0.28, 0.22, 0.20, 0.18, 0.12];
    agents.forEach((agent, idx) => {
      byAgent[agent] = actual * agentWeights[idx] * (0.8 + Math.random() * 0.4);
    });

    const byUser: Record<string, number> = {};
    const userWeights = [0.40, 0.30, 0.20, 0.10];
    users.forEach((user, idx) => {
      byUser[user] = actual * userWeights[idx] * (0.8 + Math.random() * 0.4);
    });

    const byTag: Record<string, number> = {};
    const tagWeights = [0.45, 0.25, 0.15, 0.10, 0.05];
    tags.forEach((tag, idx) => {
      byTag[tag] = actual * tagWeights[idx] * (0.8 + Math.random() * 0.4);
    });

    // Forecast (only for future days or last 7 days projected)
    const forecast = i <= 7 ? actual * (1 + (Math.random() - 0.4) * 0.2) : null;
    const budget = 200; // Daily budget

    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      actual,
      forecast,
      budget,
      byModel,
      byAgent,
      byUser,
      byTag,
    });
  }

  return data;
};

export const mockCostExplorerData = generateCostData();

// =====================================================
// BUDGET POLICIES
// =====================================================

export const mockBudgetPolicies: BudgetPolicy[] = [
  {
    id: 'pol_001',
    name: 'Global Hard Limit',
    scope: 'global',
    thresholdType: 'absolute',
    threshold: 5000,
    currentUsage: 4247.82,
    limit: 5000,
    action: 'block',
    status: 'active',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'pol_002',
    name: 'Daily Spend Cap',
    scope: 'global',
    thresholdType: 'absolute',
    threshold: 250,
    currentUsage: 187.43,
    limit: 250,
    action: 'throttle',
    status: 'active',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'pol_003',
    name: 'GPT-4o Quota',
    scope: 'workspace',
    scopeTarget: 'Production',
    thresholdType: 'percentage',
    threshold: 80,
    currentUsage: 78,
    limit: 100,
    action: 'alert',
    status: 'triggered',
    createdAt: '2025-02-01T14:30:00Z',
    lastTriggered: '2025-12-30T09:15:00Z',
  },
  {
    id: 'pol_004',
    name: 'Marketing Budget',
    scope: 'user',
    scopeTarget: 'marketing@company.com',
    thresholdType: 'absolute',
    threshold: 500,
    currentUsage: 342.18,
    limit: 500,
    action: 'alert',
    status: 'active',
    createdAt: '2025-03-01T09:00:00Z',
  },
  {
    id: 'pol_005',
    name: 'Dexter Agent Limit',
    scope: 'agent',
    scopeTarget: 'Dexter',
    thresholdType: 'absolute',
    threshold: 1000,
    currentUsage: 892.45,
    limit: 1000,
    action: 'throttle',
    status: 'active',
    createdAt: '2025-02-15T11:00:00Z',
  },
  {
    id: 'pol_006',
    name: 'Embedding Cost Control',
    scope: 'global',
    thresholdType: 'percentage',
    threshold: 15,
    currentUsage: 8.2,
    limit: 15,
    action: 'alert',
    status: 'active',
    createdAt: '2025-04-01T16:00:00Z',
  },
  {
    id: 'pol_007',
    name: 'Development Environment',
    scope: 'workspace',
    scopeTarget: 'Development',
    thresholdType: 'absolute',
    threshold: 200,
    currentUsage: 198.76,
    limit: 200,
    action: 'block',
    status: 'triggered',
    createdAt: '2025-01-20T08:00:00Z',
    lastTriggered: '2025-12-30T14:22:00Z',
  },
  {
    id: 'pol_008',
    name: 'Weekend Reduction',
    scope: 'global',
    thresholdType: 'percentage',
    threshold: 50,
    currentUsage: 32,
    limit: 50,
    action: 'alert',
    status: 'disabled',
    createdAt: '2025-05-01T10:00:00Z',
  },
];

// =====================================================
// LEDGER ENTRIES (Enterprise Scale - 500+ transactions)
// =====================================================

const generateLedgerEntries = (count: number): LedgerEntry[] => {
  const entries: LedgerEntry[] = [];
  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', costPer1k: 0.03 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', costPer1k: 0.00015 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', costPer1k: 0.0015 },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', costPer1k: 0.003 },
    { id: 'text-embedding-3-small', name: 'Embedding 3 Small', costPer1k: 0.00002 },
  ];
  const agents = [
    { id: 'dexter', name: 'Dexter' },
    { id: 'aura', name: 'Aura' },
    { id: 'cassie', name: 'Cassie' },
    { id: 'emmie', name: 'Emmie' },
    { id: 'brain', name: 'Brain' },
  ];
  const users = [
    { id: 'usr_001', name: 'admin@company.com' },
    { id: 'usr_002', name: 'dev@company.com' },
    { id: 'usr_003', name: 'ops@company.com' },
    { id: 'usr_004', name: 'marketing@company.com' },
  ];
  const tags = ['production', 'development', 'testing', 'marketing', 'support', 'analytics'];

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const model = models[Math.floor(Math.random() * models.length)];
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const user = users[Math.floor(Math.random() * users.length)];

    const promptTokens = Math.floor(Math.random() * 4000) + 100;
    const completionTokens = Math.floor(Math.random() * 2000) + 50;
    const totalTokens = promptTokens + completionTokens;
    const cost = (totalTokens / 1000) * model.costPer1k;

    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const success = Math.random() > 0.02; // 98% success rate

    entries.push({
      id: `txn_${i.toString().padStart(6, '0')}`,
      timestamp: timestamp.toISOString(),
      requestId: `req_${Math.random().toString(36).substr(2, 12)}`,
      userId: user.id,
      userName: user.name,
      agentId: agent.id,
      agentName: agent.name,
      modelId: model.id,
      modelName: model.name,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      latencyMs: Math.floor(Math.random() * 5000) + 200,
      cacheHitRate: Math.random() * 0.4 + 0.1, // 10-50% cache hit
      success,
      tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
      errorCode: success ? undefined : ['E_TIMEOUT', 'E_RATE_LIMIT', 'E_MODEL_ERROR'][Math.floor(Math.random() * 3)],
    });
  }

  // Sort by timestamp descending
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const mockLedgerEntries = generateLedgerEntries(500);

// =====================================================
// ANOMALIES
// =====================================================

export const mockAnomalies: Anomaly[] = [
  {
    id: 'anom_001',
    timestamp: '2025-12-30T11:45:00Z',
    type: 'spike',
    severity: 'medium',
    description: 'Unusual spike in GPT-4o usage from Dexter agent',
    metric: 'model_usage',
    expectedValue: 45,
    actualValue: 128,
    deviation: 184,
  },
  {
    id: 'anom_002',
    timestamp: '2025-12-30T08:22:00Z',
    type: 'pattern_change',
    severity: 'low',
    description: 'Embedding requests started earlier than usual',
    metric: 'request_timing',
    expectedValue: 9,
    actualValue: 6,
    deviation: -33,
  },
];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatPercentChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatTimestampShort(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatTimestampFull(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function getStatusClasses(status: BudgetPolicy['status']): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
        dot: 'bg-emerald-500',
      };
    case 'triggered':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
        dot: 'bg-amber-500',
      };
    case 'disabled':
      return {
        bg: 'bg-zinc-500/10',
        text: 'text-zinc-500',
        border: 'border-zinc-500/20',
        dot: 'bg-zinc-500',
      };
  }
}

export function getScopeClasses(scope: BudgetPolicy['scope']): {
  bg: string;
  text: string;
} {
  switch (scope) {
    case 'global':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400' };
    case 'workspace':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400' };
    case 'user':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
    case 'agent':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400' };
  }
}

export function getActionClasses(action: BudgetPolicy['action']): {
  bg: string;
  text: string;
} {
  switch (action) {
    case 'alert':
      return { bg: 'bg-yellow-500/10', text: 'text-yellow-400' };
    case 'throttle':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400' };
    case 'block':
      return { bg: 'bg-red-500/10', text: 'text-red-400' };
  }
}

export function getProgressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 75) return 'bg-amber-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

export function getTrendIcon(trend: number): '↑' | '↓' | '→' {
  if (trend > 1) return '↑';
  if (trend < -1) return '↓';
  return '→';
}

export function getTrendColor(trend: number, inverse: boolean = false): string {
  const isPositive = inverse ? trend < 0 : trend > 0;
  if (Math.abs(trend) < 1) return 'text-zinc-400';
  return isPositive ? 'text-emerald-400' : 'text-red-400';
}

export function getAnomalySeverityClasses(severity: Anomaly['severity']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case 'low':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
      };
    case 'high':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
      };
  }
}
