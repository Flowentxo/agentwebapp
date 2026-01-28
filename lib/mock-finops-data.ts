/**
 * Mock FinOps Data - Heavy User Simulation
 *
 * Realistic data for the Flowent FinOps Center.
 * Simulates a power user with high AI consumption.
 *
 * v2.0.0 - Added transaction details, memory consumers, and synced chart data
 */

// =====================================================
// TYPES
// =====================================================

export interface CreditBalance {
  total: number;
  limit: number;
  planCredits: number;
  energyPacks: number;
  bonusCredits: number;
  expiresAt: string;
  renewsAt: string;
  percentUsed: number;
}

export interface CostDriverDataPoint {
  date: string;
  day: string;
  compute: number;
  memoryCache: number;
  externalTools: number;
  total: number;
}

export interface ContextEfficiency {
  averageTokensPerChat: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  percentile: number;
  recommendation: string;
  trend: 'improving' | 'stable' | 'worsening';
  savingsPotential: number;
}

export interface ToolCall {
  name: string;
  input: string;
  tokens: number;
  cost: number;
}

export interface TransactionBreakdown {
  contextTokens: number;
  completionTokens: number;
  toolCalls: ToolCall[];
  promptPreview: string;
  responsePreview: string;
}

export interface TransactionEntry {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  action: string;
  type: 'inference' | 'tool' | 'scraping' | 'embedding' | 'memory';
  cost: number;
  tokens: number;
  model: string;
  duration: number;
  breakdown: TransactionBreakdown;
}

export interface MemoryConsumer {
  id: string;
  name: string;
  agentName: string;
  agentColor: string;
  tokens: number;
  lastAccessed: string;
  canOptimize: boolean;
}

export interface UsageSummary {
  todayCredits: number;
  weekCredits: number;
  monthCredits: number;
  avgDailyCredits: number;
  peakDay: string;
  peakCredits: number;
}

export interface SafetySettings {
  autoRecharge: boolean;
  dailyHardLimit: number;
  status: 'safe' | 'warning' | 'critical';
  currentDailyUsage: number;
}

// =====================================================
// CREDIT BALANCE
// =====================================================

// Calculate dynamic renewal date (14 days from now)
const getRenewalDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
};

const getExpiryDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
};

export const mockCreditBalance: CreditBalance = {
  total: 1240,
  limit: 2000,
  planCredits: 250,
  energyPacks: 890,
  bonusCredits: 100,
  expiresAt: getExpiryDate(),
  renewsAt: getRenewalDate(),
  percentUsed: 62,
};

// =====================================================
// SAFETY SETTINGS
// =====================================================

export const mockSafetySettings: SafetySettings = {
  autoRecharge: false,
  dailyHardLimit: 100,
  status: 'safe',
  currentDailyUsage: 64.7,
};

// =====================================================
// MEMORY CONSUMERS
// =====================================================

export const mockMemoryConsumers: MemoryConsumer[] = [
  {
    id: 'mem_001',
    name: 'Q4 Revenue Report Analysis',
    agentName: 'Dexter',
    agentColor: '#0EA5E9',
    tokens: 28500,
    lastAccessed: '2025-12-30T12:55:30Z',
    canOptimize: true,
  },
  {
    id: 'mem_002',
    name: 'Customer Support History (John D.)',
    agentName: 'Cassie',
    agentColor: '#F97316',
    tokens: 18400,
    lastAccessed: '2025-12-30T11:58:12Z',
    canOptimize: true,
  },
  {
    id: 'mem_003',
    name: 'Email Campaign Drafts',
    agentName: 'Emmie',
    agentColor: '#A855F7',
    tokens: 12600,
    lastAccessed: '2025-12-30T12:42:11Z',
    canOptimize: false,
  },
];

// =====================================================
// COST DRIVER DATA (Last 7 Days) - Synced with transactions
// =====================================================

const generateCostDriverData = (): CostDriverDataPoint[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();

  // Fixed data to match transactions (today has higher usage)
  const fixedData = [
    { compute: 28, memoryCache: 15, externalTools: 8 },   // 6 days ago
    { compute: 32, memoryCache: 18, externalTools: 10 },  // 5 days ago
    { compute: 45, memoryCache: 25, externalTools: 15 },  // 4 days ago (peak)
    { compute: 38, memoryCache: 20, externalTools: 12 },  // 3 days ago
    { compute: 15, memoryCache: 8, externalTools: 5 },    // 2 days ago (weekend)
    { compute: 12, memoryCache: 6, externalTools: 4 },    // yesterday (weekend)
    { compute: 42, memoryCache: 28, externalTools: 18 },  // today (high activity)
  ];

  return fixedData.map((data, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));

    return {
      date: date.toISOString().split('T')[0],
      day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
      compute: data.compute,
      memoryCache: data.memoryCache,
      externalTools: data.externalTools,
      total: data.compute + data.memoryCache + data.externalTools,
    };
  });
};

export const mockCostDriverData = generateCostDriverData();

// =====================================================
// CONTEXT EFFICIENCY
// =====================================================

export const mockContextEfficiency: ContextEfficiency = {
  averageTokensPerChat: 12847,
  level: 'high',
  percentile: 78,
  recommendation: 'Consider using more focused prompts to reduce context load.',
  trend: 'worsening',
  savingsPotential: 18.5,
};

// =====================================================
// TRANSACTION LEDGER - With detailed breakdown
// =====================================================

export const mockTransactions: TransactionEntry[] = [
  {
    id: 'txn_001',
    timestamp: '2025-12-30T13:45:22Z',
    agentId: 'dexter',
    agentName: 'Dexter',
    agentColor: '#0EA5E9',
    action: 'Q4 Revenue Analysis with Forecasting',
    type: 'inference',
    cost: 8.4,
    tokens: 15200,
    model: 'gpt-4o',
    duration: 12500,
    breakdown: {
      contextTokens: 11200,
      completionTokens: 4000,
      toolCalls: [
        { name: 'calculate_revenue', input: 'Q4 2024 sales data', tokens: 1200, cost: 0.8 },
        { name: 'generate_forecast', input: 'Historical trends', tokens: 2100, cost: 1.4 },
        { name: 'create_chart', input: 'Revenue visualization', tokens: 800, cost: 0.5 },
      ],
      promptPreview: 'Analyze our Q4 2024 revenue data and create a forecast for Q1 2025. Include trends, seasonal patterns, and...',
      responsePreview: 'Based on the Q4 2024 data analysis, I can identify several key trends:\n\n1. **Revenue Growth**: 23% YoY increase\n2. **Peak Performance**: December showed highest conversion rates...',
    },
  },
  {
    id: 'txn_002',
    timestamp: '2025-12-30T13:32:18Z',
    agentId: 'aura',
    agentName: 'Aura',
    agentColor: '#F59E0B',
    action: 'Workflow Execution: Lead Enrichment',
    type: 'tool',
    cost: 5.2,
    tokens: 8400,
    model: 'gpt-4o-mini',
    duration: 8200,
    breakdown: {
      contextTokens: 5400,
      completionTokens: 3000,
      toolCalls: [
        { name: 'hubspot_search', input: 'company:Acme Corp', tokens: 600, cost: 0.4 },
        { name: 'enrich_data', input: 'LinkedIn profile lookup', tokens: 1800, cost: 1.2 },
      ],
      promptPreview: 'Enrich the following lead with additional company data and LinkedIn insights: Acme Corp, contact@acme.com...',
      responsePreview: 'Lead enrichment complete:\n\n- Company Size: 250-500 employees\n- Industry: SaaS / B2B\n- Annual Revenue: $15M-25M...',
    },
  },
  {
    id: 'txn_003',
    timestamp: '2025-12-30T13:18:45Z',
    agentId: 'cassie',
    agentName: 'Cassie',
    agentColor: '#F97316',
    action: 'Customer Ticket Resolution #4521',
    type: 'inference',
    cost: 3.1,
    tokens: 6200,
    model: 'gpt-4o-mini',
    duration: 4800,
    breakdown: {
      contextTokens: 4200,
      completionTokens: 2000,
      toolCalls: [
        { name: 'search_kb', input: 'password reset error', tokens: 400, cost: 0.2 },
      ],
      promptPreview: 'Customer reports: "I cannot reset my password, getting error code E-401 every time I try..."',
      responsePreview: 'I understand how frustrating password issues can be. Error E-401 typically indicates a session timeout. Here\'s how to resolve this:\n\n1. Clear your browser cache...',
    },
  },
  {
    id: 'txn_004',
    timestamp: '2025-12-30T12:55:30Z',
    agentId: 'dexter',
    agentName: 'Dexter',
    agentColor: '#0EA5E9',
    action: 'Competitor Research: Market Analysis',
    type: 'scraping',
    cost: 12.8,
    tokens: 28500,
    model: 'gpt-4o',
    duration: 45000,
    breakdown: {
      contextTokens: 22000,
      completionTokens: 6500,
      toolCalls: [
        { name: 'web_scrape', input: 'competitor-a.com/pricing', tokens: 4200, cost: 2.8 },
        { name: 'web_scrape', input: 'competitor-b.com/features', tokens: 3800, cost: 2.5 },
        { name: 'analyze_data', input: 'Comparison matrix', tokens: 2500, cost: 1.7 },
      ],
      promptPreview: 'Research our top 5 competitors and create a comprehensive market analysis including pricing, features, and market positioning...',
      responsePreview: '## Competitive Analysis Report\n\n### Market Overview\nThe B2B AI automation market is valued at $4.2B with 32% YoY growth...',
    },
  },
  {
    id: 'txn_005',
    timestamp: '2025-12-30T12:42:11Z',
    agentId: 'emmie',
    agentName: 'Emmie',
    agentColor: '#A855F7',
    action: 'Email Campaign Draft: Product Launch',
    type: 'inference',
    cost: 2.4,
    tokens: 4800,
    model: 'gpt-4o-mini',
    duration: 3200,
    breakdown: {
      contextTokens: 2800,
      completionTokens: 2000,
      toolCalls: [],
      promptPreview: 'Create an email campaign for our new AI Dashboard feature launch. Target audience: existing enterprise customers...',
      responsePreview: 'Subject: Introducing AI Dashboard - Your Command Center for Intelligent Automation\n\nHi {{first_name}},\n\nWe\'re thrilled to announce...',
    },
  },
  {
    id: 'txn_006',
    timestamp: '2025-12-30T12:28:55Z',
    agentId: 'brain',
    agentName: 'Brain',
    agentColor: '#10B981',
    action: 'Knowledge Base Embedding Update',
    type: 'embedding',
    cost: 1.8,
    tokens: 12000,
    model: 'text-embedding-3-small',
    duration: 2100,
    breakdown: {
      contextTokens: 12000,
      completionTokens: 0,
      toolCalls: [],
      promptPreview: 'Embedding 24 new documents from the product documentation folder...',
      responsePreview: 'Successfully embedded 24 documents:\n- API Reference (8 sections)\n- User Guide (12 chapters)\n- FAQ (4 categories)',
    },
  },
  {
    id: 'txn_007',
    timestamp: '2025-12-30T12:15:33Z',
    agentId: 'aura',
    agentName: 'Aura',
    agentColor: '#F59E0B',
    action: 'Pipeline: Invoice Processing',
    type: 'tool',
    cost: 4.6,
    tokens: 7200,
    model: 'gpt-4o-mini',
    duration: 6500,
    breakdown: {
      contextTokens: 4500,
      completionTokens: 2700,
      toolCalls: [
        { name: 'ocr_extract', input: 'invoice_batch_12.pdf', tokens: 1200, cost: 0.8 },
        { name: 'validate_data', input: 'Invoice fields check', tokens: 600, cost: 0.4 },
        { name: 'update_crm', input: 'Payment records', tokens: 900, cost: 0.6 },
      ],
      promptPreview: 'Process the following batch of 8 invoices, extract relevant data, and update the CRM...',
      responsePreview: 'Invoice Processing Complete:\n\n- Processed: 8 invoices\n- Total Value: $24,580.00\n- Errors: 0\n- CRM Updated: Yes',
    },
  },
  {
    id: 'txn_008',
    timestamp: '2025-12-30T11:58:12Z',
    agentId: 'cassie',
    agentName: 'Cassie',
    agentColor: '#F97316',
    action: 'Live Chat Session with John D.',
    type: 'memory',
    cost: 6.2,
    tokens: 18400,
    model: 'gpt-4o',
    duration: 180000,
    breakdown: {
      contextTokens: 14400,
      completionTokens: 4000,
      toolCalls: [
        { name: 'retrieve_history', input: 'customer:john.doe@example.com', tokens: 3200, cost: 2.1 },
        { name: 'search_orders', input: 'Order #ORD-2024-8891', tokens: 800, cost: 0.5 },
      ],
      promptPreview: '[Continued conversation - 12 messages]\nJohn: I still haven\'t received my refund for order #ORD-2024-8891...',
      responsePreview: 'I\'ve located your refund request. It was processed on December 28th and should appear in your account within 3-5 business days. I\'ve also added a $20 credit to your account for the inconvenience.',
    },
  },
  {
    id: 'txn_009',
    timestamp: '2025-12-30T11:45:08Z',
    agentId: 'dexter',
    agentName: 'Dexter',
    agentColor: '#0EA5E9',
    action: 'Financial Report: Balance Sheet Generation',
    type: 'inference',
    cost: 9.8,
    tokens: 22100,
    model: 'gpt-4o',
    duration: 15800,
    breakdown: {
      contextTokens: 16100,
      completionTokens: 6000,
      toolCalls: [
        { name: 'fetch_financials', input: 'Q4 2024 ledger', tokens: 4200, cost: 2.8 },
        { name: 'calculate_ratios', input: 'Liquidity, solvency metrics', tokens: 1800, cost: 1.2 },
        { name: 'generate_report', input: 'Balance sheet template', tokens: 2400, cost: 1.6 },
      ],
      promptPreview: 'Generate a comprehensive balance sheet for Q4 2024 including all assets, liabilities, and equity positions...',
      responsePreview: '## Q4 2024 Balance Sheet\n\n### Assets\n**Current Assets**: $2,450,000\n- Cash & Equivalents: $890,000\n- Accounts Receivable: $1,200,000...',
    },
  },
  {
    id: 'txn_010',
    timestamp: '2025-12-30T11:32:44Z',
    agentId: 'emmie',
    agentName: 'Emmie',
    agentColor: '#A855F7',
    action: 'Follow-up Email Sequence (5 emails)',
    type: 'inference',
    cost: 4.2,
    tokens: 8600,
    model: 'gpt-4o-mini',
    duration: 5400,
    breakdown: {
      contextTokens: 4600,
      completionTokens: 4000,
      toolCalls: [],
      promptPreview: 'Create a 5-email nurture sequence for leads who downloaded our whitepaper but haven\'t scheduled a demo...',
      responsePreview: '### Email Sequence: Whitepaper Follow-up\n\n**Email 1 (Day 1)**: Thank you + Key takeaways\n**Email 2 (Day 3)**: Case study relevant to their industry...',
    },
  },
  {
    id: 'txn_011',
    timestamp: '2025-12-30T11:18:22Z',
    agentId: 'brain',
    agentName: 'Brain',
    agentColor: '#10B981',
    action: 'Document Indexing: Contract Pack',
    type: 'embedding',
    cost: 3.4,
    tokens: 24000,
    model: 'text-embedding-3-small',
    duration: 4200,
    breakdown: {
      contextTokens: 24000,
      completionTokens: 0,
      toolCalls: [],
      promptPreview: 'Indexing 12 contract templates and 8 signed agreements for semantic search...',
      responsePreview: 'Indexing complete:\n- Contract Templates: 12 files\n- Signed Agreements: 8 files\n- Total Chunks: 156\n- Vector Dimensions: 1536',
    },
  },
  {
    id: 'txn_012',
    timestamp: '2025-12-30T10:55:18Z',
    agentId: 'aura',
    agentName: 'Aura',
    agentColor: '#F59E0B',
    action: 'HubSpot Sync: Contact Update Batch',
    type: 'tool',
    cost: 2.8,
    tokens: 4200,
    model: 'gpt-4o-mini',
    duration: 12000,
    breakdown: {
      contextTokens: 2700,
      completionTokens: 1500,
      toolCalls: [
        { name: 'hubspot_batch_update', input: '45 contacts', tokens: 1800, cost: 1.2 },
        { name: 'sync_validate', input: 'Data integrity check', tokens: 400, cost: 0.3 },
      ],
      promptPreview: 'Sync the following 45 contacts with updated engagement scores and last interaction dates...',
      responsePreview: 'HubSpot Sync Complete:\n- Updated: 45 contacts\n- New Scores: 38 contacts\n- Errors: 0\n- Sync Time: 11.8s',
    },
  },
];

// =====================================================
// USAGE SUMMARY
// =====================================================

export const mockUsageSummary: UsageSummary = {
  todayCredits: 64.7,
  weekCredits: 412.3,
  monthCredits: 1847.2,
  avgDailyCredits: 58.9,
  peakDay: '2025-12-27',
  peakCredits: 98.4,
};

// =====================================================
// AGENT STATS
// =====================================================

export interface AgentUsageStats {
  agentId: string;
  agentName: string;
  agentColor: string;
  totalCredits: number;
  totalTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
}

export const mockAgentStats: AgentUsageStats[] = [
  {
    agentId: 'dexter',
    agentName: 'Dexter',
    agentColor: '#0EA5E9',
    totalCredits: 245.8,
    totalTokens: 892400,
    requestCount: 42,
    avgCostPerRequest: 5.85,
  },
  {
    agentId: 'aura',
    agentName: 'Aura',
    agentColor: '#F59E0B',
    totalCredits: 156.2,
    totalTokens: 445200,
    requestCount: 78,
    avgCostPerRequest: 2.0,
  },
  {
    agentId: 'cassie',
    agentName: 'Cassie',
    agentColor: '#F97316',
    totalCredits: 98.4,
    totalTokens: 312800,
    requestCount: 156,
    avgCostPerRequest: 0.63,
  },
  {
    agentId: 'emmie',
    agentName: 'Emmie',
    agentColor: '#A855F7',
    totalCredits: 67.2,
    totalTokens: 198600,
    requestCount: 34,
    avgCostPerRequest: 1.98,
  },
  {
    agentId: 'brain',
    agentName: 'Brain',
    agentColor: '#10B981',
    totalCredits: 42.8,
    totalTokens: 856000,
    requestCount: 28,
    avgCostPerRequest: 1.53,
  },
];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatCredits(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatTokens(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

export function formatDaysUntil(isoString: string): string {
  const now = new Date();
  const target = new Date(isoString);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `in ${diffDays} days`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function getContextLevelColor(level: ContextEfficiency['level']): string {
  switch (level) {
    case 'low':
      return 'text-emerald-400';
    case 'medium':
      return 'text-amber-400';
    case 'high':
      return 'text-orange-400';
    case 'critical':
      return 'text-rose-400';
  }
}

export function getContextLevelBg(level: ContextEfficiency['level']): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-500';
    case 'medium':
      return 'bg-amber-500';
    case 'high':
      return 'bg-orange-500';
    case 'critical':
      return 'bg-rose-500';
  }
}

export function getTypeBadgeStyles(type: TransactionEntry['type']): string {
  switch (type) {
    case 'inference':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'tool':
      return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'scraping':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'embedding':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'memory':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
  }
}

export function getTypeLabel(type: TransactionEntry['type']): string {
  switch (type) {
    case 'inference':
      return 'Inference';
    case 'tool':
      return 'Tool';
    case 'scraping':
      return 'Scraping';
    case 'embedding':
      return 'Embedding';
    case 'memory':
      return 'Memory';
  }
}

export function getStatusColor(status: SafetySettings['status']): string {
  switch (status) {
    case 'safe':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'warning':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'critical':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }
}

export function getStatusLabel(status: SafetySettings['status']): string {
  switch (status) {
    case 'safe':
      return 'Safe';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
  }
}
