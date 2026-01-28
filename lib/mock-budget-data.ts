/**
 * Mock Budget Data - Client-Side First Approach
 *
 * Realistic dummy data for the Financial Operations Center.
 * Ensures the UI renders immediately without backend dependencies.
 *
 * @version 1.0.0
 */

// =====================================================
// TYPES
// =====================================================

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: TransactionCategory;
  type: 'income' | 'expense';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  agent?: string;
  model?: string;
}

export type TransactionCategory =
  | 'ai-api'
  | 'server'
  | 'marketing'
  | 'subscription'
  | 'refund'
  | 'credit'
  | 'other';

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  spent: number;
  limit: number;
  color: string;
}

export interface CashFlowDataPoint {
  date: string;
  income: number;
  expenses: number;
}

export interface KPIData {
  totalBudget: number;
  spent: number;
  remaining: number;
  forecast: number;
  percentUsed: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

// =====================================================
// KPI DATA
// =====================================================

export const mockKPIData: KPIData = {
  totalBudget: 10000,
  spent: 6847.52,
  remaining: 3152.48,
  forecast: 8250.00,
  percentUsed: 68.5,
  trend: 'up',
  trendPercent: 12.4,
};

// =====================================================
// CASH FLOW CHART DATA (Last 30 Days)
// =====================================================

const generateCashFlowData = (): CashFlowDataPoint[] => {
  const data: CashFlowDataPoint[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate realistic patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base expenses with some randomization
    const baseExpense = isWeekend ? 120 : 280;
    const expenses = baseExpense + Math.random() * 150;

    // Income spikes on certain days
    const hasIncome = Math.random() > 0.7;
    const income = hasIncome ? 500 + Math.random() * 1500 : 0;

    data.push({
      date: date.toISOString().split('T')[0],
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
    });
  }

  return data;
};

export const mockCashFlowData = generateCashFlowData();

// =====================================================
// TRANSACTIONS DATA
// =====================================================

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_001',
    date: '2025-12-30',
    description: 'GPT-4o API Usage - Dexter Agent',
    category: 'ai-api',
    type: 'expense',
    amount: 45.80,
    status: 'completed',
    agent: 'Dexter',
    model: 'gpt-4o',
  },
  {
    id: 'txn_002',
    date: '2025-12-30',
    description: 'Monthly Credit Top-Up',
    category: 'credit',
    type: 'income',
    amount: 500.00,
    status: 'completed',
  },
  {
    id: 'txn_003',
    date: '2025-12-29',
    description: 'Claude 3.5 Sonnet - Cassie Support',
    category: 'ai-api',
    type: 'expense',
    amount: 28.45,
    status: 'completed',
    agent: 'Cassie',
    model: 'claude-3.5-sonnet',
  },
  {
    id: 'txn_004',
    date: '2025-12-29',
    description: 'AWS EC2 Instance - t3.large',
    category: 'server',
    type: 'expense',
    amount: 156.32,
    status: 'completed',
  },
  {
    id: 'txn_005',
    date: '2025-12-28',
    description: 'Refund - Overcharged API Tokens',
    category: 'refund',
    type: 'income',
    amount: 23.50,
    status: 'completed',
  },
  {
    id: 'txn_006',
    date: '2025-12-28',
    description: 'GPT-4o-mini - Emmie Email Agent',
    category: 'ai-api',
    type: 'expense',
    amount: 12.75,
    status: 'completed',
    agent: 'Emmie',
    model: 'gpt-4o-mini',
  },
  {
    id: 'txn_007',
    date: '2025-12-27',
    description: 'Google Ads Campaign',
    category: 'marketing',
    type: 'expense',
    amount: 350.00,
    status: 'pending',
  },
  {
    id: 'txn_008',
    date: '2025-12-27',
    description: 'Redis Cloud Subscription',
    category: 'subscription',
    type: 'expense',
    amount: 45.00,
    status: 'completed',
  },
  {
    id: 'txn_009',
    date: '2025-12-26',
    description: 'OpenAI Embedding Model Usage',
    category: 'ai-api',
    type: 'expense',
    amount: 8.90,
    status: 'completed',
    model: 'text-embedding-3-small',
  },
  {
    id: 'txn_010',
    date: '2025-12-26',
    description: 'Vercel Pro Subscription',
    category: 'subscription',
    type: 'expense',
    amount: 20.00,
    status: 'completed',
  },
  {
    id: 'txn_011',
    date: '2025-12-25',
    description: 'GPT-4o API - Aura Workflow Agent',
    category: 'ai-api',
    type: 'expense',
    amount: 67.25,
    status: 'completed',
    agent: 'Aura',
    model: 'gpt-4o',
  },
  {
    id: 'txn_012',
    date: '2025-12-24',
    description: 'Stripe Transaction Fees',
    category: 'other',
    type: 'expense',
    amount: 14.50,
    status: 'completed',
  },
  {
    id: 'txn_013',
    date: '2025-12-24',
    description: 'Customer Payment - Enterprise Plan',
    category: 'credit',
    type: 'income',
    amount: 2500.00,
    status: 'pending',
  },
  {
    id: 'txn_014',
    date: '2025-12-23',
    description: 'Supabase Database Usage',
    category: 'server',
    type: 'expense',
    amount: 25.00,
    status: 'completed',
  },
  {
    id: 'txn_015',
    date: '2025-12-23',
    description: 'LinkedIn Ads Campaign',
    category: 'marketing',
    type: 'expense',
    amount: 275.00,
    status: 'completed',
  },
];

// =====================================================
// BUDGET CATEGORIES (Planning Tab)
// =====================================================

export const mockBudgetCategories: BudgetCategory[] = [
  {
    id: 'cat_openai',
    name: 'OpenAI API',
    icon: 'Sparkles',
    spent: 2450.75,
    limit: 3000.00,
    color: '#10B981', // emerald
  },
  {
    id: 'cat_server',
    name: 'Server Costs',
    icon: 'Server',
    spent: 1820.50,
    limit: 2000.00,
    color: '#6366F1', // indigo
  },
  {
    id: 'cat_marketing',
    name: 'Marketing',
    icon: 'Megaphone',
    spent: 1250.00,
    limit: 1500.00,
    color: '#F59E0B', // amber
  },
  {
    id: 'cat_anthropic',
    name: 'Anthropic API',
    icon: 'Brain',
    spent: 890.25,
    limit: 1500.00,
    color: '#EC4899', // pink
  },
  {
    id: 'cat_subscriptions',
    name: 'Subscriptions',
    icon: 'CreditCard',
    spent: 345.00,
    limit: 500.00,
    color: '#8B5CF6', // violet
  },
  {
    id: 'cat_other',
    name: 'Other',
    icon: 'MoreHorizontal',
    spent: 91.02,
    limit: 500.00,
    color: '#64748B', // slate
  },
];

// =====================================================
// CATEGORY METADATA
// =====================================================

export const categoryColors: Record<TransactionCategory, string> = {
  'ai-api': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'server': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'marketing': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'subscription': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'refund': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'credit': 'bg-green-500/20 text-green-400 border-green-500/30',
  'other': 'bg-muted/500/20 text-muted-foreground border-slate-500/30',
};

export const categoryLabels: Record<TransactionCategory, string> = {
  'ai-api': 'AI API',
  'server': 'Server',
  'marketing': 'Marketing',
  'subscription': 'Subscription',
  'refund': 'Refund',
  'credit': 'Credit',
  'other': 'Other',
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function getPercentage(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}

export function isOverBudget(spent: number, limit: number, threshold = 90): boolean {
  return getPercentage(spent, limit) >= threshold;
}
