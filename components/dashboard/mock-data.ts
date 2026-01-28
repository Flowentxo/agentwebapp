// ============================================================================
// DASHBOARD MOCK DATA
// Replace with real API calls in production
// ============================================================================

import type {
  LogEntry,
  AgentStatus,
  DashboardStats,
  CommandSuggestion,
  AgentCostBreakdown,
} from './types';

// Agent definitions
export const AGENTS: AgentStatus[] = [
  {
    id: 'dexter',
    name: 'Dexter',
    role: 'Financial Analyst',
    color: '#3B82F6',
    status: 'active',
    lastActivity: new Date(Date.now() - 120000),
    requests24h: 3421,
    successRate24h: 99.2,
    avgResponseTime: 1250,
    tokensUsed24h: 45000,
    costToday: 0.92,
  },
  {
    id: 'cassie',
    name: 'Cassie',
    role: 'Customer Support',
    color: '#10B981',
    status: 'active',
    lastActivity: new Date(Date.now() - 180000),
    requests24h: 2847,
    successRate24h: 98.7,
    avgResponseTime: 890,
    tokensUsed24h: 32000,
    costToday: 0.65,
  },
  {
    id: 'emmie',
    name: 'Emmie',
    role: 'Email Manager',
    color: '#8B5CF6',
    status: 'busy',
    lastActivity: new Date(Date.now() - 60000),
    requests24h: 1923,
    successRate24h: 97.5,
    avgResponseTime: 2100,
    tokensUsed24h: 28000,
    costToday: 0.57,
  },
  {
    id: 'aura',
    name: 'Aura',
    role: 'Brand Strategist',
    color: '#EC4899',
    status: 'idle',
    lastActivity: new Date(Date.now() - 600000),
    requests24h: 1456,
    successRate24h: 98.1,
    avgResponseTime: 3200,
    tokensUsed24h: 18000,
    costToday: 0.37,
  },
];

// Activity log entries with detailed output
export const ACTIVITY_LOG: LogEntry[] = [
  {
    id: 'log-1',
    type: 'success',
    status: 'completed',
    message: 'Financial analysis completed',
    timestamp: new Date(Date.now() - 120000),
    agent: 'Dexter',
    agentColor: '#3B82F6',
    duration: 4500,
    tokensUsed: 2340,
    cost: 0.047,
    output: {
      type: 'report',
      title: 'Q4 2024 Financial Analysis Report',
      content: `## Executive Summary

Revenue increased by 23% compared to Q3, driven primarily by enterprise subscriptions.

### Key Metrics
- **Total Revenue**: $4.2M (+23%)
- **MRR**: $342K (+18%)
- **Churn Rate**: 2.1% (-0.5%)
- **CAC**: $245 (-12%)

### Recommendations
1. Increase investment in enterprise sales team
2. Focus on reducing churn through improved onboarding
3. Explore expansion revenue opportunities`,
      downloadable: true,
      filename: 'q4-2024-financial-report.pdf',
    },
  },
  {
    id: 'log-2',
    type: 'info',
    status: 'completed',
    message: 'System health check passed',
    timestamp: new Date(Date.now() - 300000),
    duration: 1200,
    output: {
      type: 'json',
      title: 'System Health Report',
      content: JSON.stringify({
        status: 'healthy',
        uptime: '99.98%',
        latency: '45ms',
        memory: '62%',
        cpu: '34%',
        activeConnections: 1247,
        queueDepth: 12,
      }, null, 2),
    },
  },
  {
    id: 'log-3',
    type: 'success',
    status: 'completed',
    message: '15 support tickets resolved',
    timestamp: new Date(Date.now() - 720000),
    agent: 'Cassie',
    agentColor: '#10B981',
    duration: 18500,
    tokensUsed: 8920,
    cost: 0.178,
    output: {
      type: 'text',
      title: 'Ticket Resolution Summary',
      content: `Resolved 15 tickets in the last hour:

- 8 General inquiries (avg response: 2.1 min)
- 4 Technical issues (avg response: 5.3 min)
- 2 Billing questions (avg response: 3.8 min)
- 1 Feature request (documented)

Customer Satisfaction: 4.8/5.0
First Response Time: 1.2 min (target: < 2 min)`,
    },
  },
  {
    id: 'log-4',
    type: 'warning',
    status: 'completed',
    message: 'High token usage detected',
    timestamp: new Date(Date.now() - 1080000),
    output: {
      type: 'json',
      title: 'Token Usage Alert',
      content: JSON.stringify({
        alertType: 'usage_threshold',
        threshold: 80,
        current: 85,
        agent: 'Dexter',
        recommendation: 'Consider optimizing prompts or increasing budget',
        projectedMonthEnd: 125000,
        budgetLimit: 100000,
      }, null, 2),
    },
  },
  {
    id: 'log-5',
    type: 'error',
    status: 'failed',
    message: 'Email campaign failed to send',
    timestamp: new Date(Date.now() - 1440000),
    agent: 'Emmie',
    agentColor: '#8B5CF6',
    duration: 3200,
    output: {
      type: 'text',
      title: 'Error Details',
      content: `Error: SMTP connection timeout

Stack trace:
  at SMTPConnection.connect (smtp.js:142)
  at EmailService.send (email-service.js:89)
  at EmmieAgent.executeTask (emmie.js:234)

Retry attempts: 3/3
Last error: Connection refused (ECONNREFUSED)

Suggested actions:
1. Check SMTP server status
2. Verify network connectivity
3. Review email service credentials`,
    },
  },
  {
    id: 'log-6',
    type: 'success',
    status: 'completed',
    message: 'Brand report generated',
    timestamp: new Date(Date.now() - 1800000),
    agent: 'Aura',
    agentColor: '#EC4899',
    duration: 12400,
    tokensUsed: 5670,
    cost: 0.113,
    output: {
      type: 'report',
      title: 'Brand Sentiment Analysis',
      content: `## Brand Health Score: 87/100 (+3)

### Sentiment Distribution
- Positive: 72% (+5%)
- Neutral: 21% (-2%)
- Negative: 7% (-3%)

### Top Mentions
1. Product quality (2.4K mentions)
2. Customer service (1.8K mentions)
3. Pricing (1.2K mentions)

### Competitor Comparison
Your brand outperforms competitors in:
- Customer satisfaction (+12%)
- Brand awareness (+8%)
- Social engagement (+15%)`,
      downloadable: true,
      filename: 'brand-sentiment-report.pdf',
    },
  },
];

// Command suggestions
export const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  { command: '/research', description: 'Research a topic or company', category: 'Analysis' },
  { command: '/analyze', description: 'Analyze data or metrics', category: 'Analysis' },
  { command: '/audit', description: 'Run a system audit', category: 'System' },
  { command: '/generate', description: 'Generate content or reports', category: 'Content' },
  { command: '/email', description: 'Draft or send emails', category: 'Communication' },
  { command: '/schedule', description: 'Schedule tasks or meetings', category: 'Planning' },
  { command: '/support', description: 'Handle support tickets', category: 'Support' },
  { command: '/forecast', description: 'Create financial forecasts', category: 'Finance' },
];

// Calculate dashboard stats
export function getDashboardStats(): DashboardStats {
  const agentCosts: AgentCostBreakdown[] = AGENTS.map(agent => ({
    agentId: agent.id,
    agentName: agent.name,
    agentColor: agent.color,
    tokens: agent.tokensUsed24h,
    cost: agent.costToday,
    percentage: 0, // Will be calculated below
  }));

  const totalTokens = agentCosts.reduce((sum, a) => sum + a.tokens, 0);
  const totalCost = agentCosts.reduce((sum, a) => sum + a.cost, 0);

  // Calculate percentages
  agentCosts.forEach(agent => {
    agent.percentage = totalTokens > 0 ? (agent.tokens / totalTokens) * 100 : 0;
  });

  return {
    totalAgents: AGENTS.length,
    activeAgents: AGENTS.filter(a => a.status === 'active' || a.status === 'busy').length,
    pendingJobs: 12,
    tokenUsage: totalTokens,
    totalCost,
    systemHealth: 98,
    agentCosts,
  };
}

// Simulate adding a new activity
export function createActivityEntry(
  command: string,
  type: 'info' | 'success' = 'info'
): LogEntry {
  return {
    id: `log-${Date.now()}`,
    type,
    status: 'pending',
    message: `Command queued: ${command}`,
    timestamp: new Date(),
    output: {
      type: 'text',
      title: 'Command Status',
      content: `Your command "${command}" has been queued for execution.\n\nEstimated completion: 5-10 seconds`,
    },
  };
}
