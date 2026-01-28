
export type WidgetType = 'number' | 'line' | 'bar' | 'pie' | 'table' | 'timeline' | 'gauge';

export interface WidgetConfig {
  metric?: string;
  time_range?: string;
  granularity?: 'hourly' | 'daily' | 'weekly';
  color?: string; // Tailwind class mostly (text-emerald-400 etc.)
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  subValue?: string;
  showLegend?: boolean;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number; // 1 unit = approx 80-100px vertical
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition; // For a grid layout
  data?: any; // Mock data injected here
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
}

export const MOCK_DASHBOARDS: Dashboard[] = [
  {
    id: 'team-overview',
    name: 'Team Overview',
    description: 'High-level performance metrics for the Engineering Team',
    widgets: [
      // --- HEADER ROW (KPIs) ---
      {
        id: 'kpi-active-agents',
        type: 'number',
        title: 'Active Agents',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          metric: 'agents.active',
          change: '+12%',
          trend: 'up',
          color: 'text-emerald-400',
        },
        data: { value: 124, subLabel: 'Deployed' }
      },
      {
        id: 'kpi-success-rate',
        type: 'gauge', // Render as specialized number for now
        title: 'Success Rate',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {
          metric: 'execution.success_rate',
          change: '-0.5%',
          trend: 'down',
          color: 'text-indigo-400',
        },
        data: { value: '98.2%', target: '99.0%' }
      },
      {
        id: 'kpi-throughput',
        type: 'number',
        title: 'Daily Throughput',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {
          metric: 'tasks.processed',
          change: '+24%',
          trend: 'up',
          color: 'text-blue-400',
        },
        data: { value: '14.2k', subLabel: 'Tasks / 24h' }
      },
      {
        id: 'kpi-cost',
        type: 'number',
        title: 'Est. Cost',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {
          metric: 'cost.total',
          change: '+5%',
          trend: 'down', // Cost increase is usually neutral/bad, but let's say down trend is expensive? No, trend up = more cost.
          color: 'text-amber-400',
        },
        data: { value: '$342', subLabel: 'This Month' }
      },

      // --- MAIN CHARTS ---
      {
        id: 'chart-execution-trend',
        type: 'line',
        title: 'Execution Volume (7 Days)',
        position: { x: 0, y: 2, w: 8, h: 6 },
        config: { showLegend: true, color: '#6366f1' },
        data: [
          { name: 'Mon', success: 4000, failed: 120 },
          { name: 'Tue', success: 4500, failed: 98 },
          { name: 'Wed', success: 4200, failed: 140 },
          { name: 'Thu', success: 5100, failed: 85 },
          { name: 'Fri', success: 4800, failed: 200 },
          { name: 'Sat', success: 3200, failed: 45 },
          { name: 'Sun', success: 3400, failed: 60 },
        ]
      },
      {
        id: 'chart-status-pie',
        type: 'pie',
        title: 'Task Status',
        position: { x: 8, y: 2, w: 4, h: 6 },
        config: {},
        data: [
          { name: 'Completed', value: 85, color: '#10b981' }, // emerald-500
          { name: 'Processing', value: 10, color: '#3b82f6' }, // blue-500
          { name: 'Failed', value: 3, color: '#ef4444' },    // red-500
          { name: 'Queued', value: 2, color: '#f59e0b' },    // amber-500
        ]
      },

      // --- BOTTOM ROW ---
      {
        id: 'table-errors',
        type: 'table',
        title: 'Recent Critical Errors',
        position: { x: 0, y: 8, w: 6, h: 6 },
        config: {},
        data: {
          columns: ['Timestamp', 'Agent', 'Error', 'Status'],
          rows: [
            { id: 1, timestamp: '10:42 AM', agent: 'EmailClassifier', error: 'Rate Limit Exceeded (Gmail)', status: 'Retrying' },
            { id: 2, timestamp: '09:15 AM', agent: 'DataScraper', error: 'Timeout (30s limit)', status: 'Failed' },
            { id: 3, timestamp: '08:00 AM', agent: 'SupportBot', error: 'Context Window Full', status: 'Resolved' },
            { id: 4, timestamp: 'Yesterday', agent: 'InvoiceParser', error: 'Invalid PDF Format', status: 'Ignored' },
          ]
        }
      },
      {
        id: 'chart-latency',
        type: 'bar',
        title: 'Avg. Latency by Agent (ms)',
        position: { x: 6, y: 8, w: 6, h: 6 },
        config: { color: '#8b5cf6' },
        data: [
          { name: 'Classifier', value: 120 },
          { name: 'Scraper', value: 850 },
          { name: 'Support', value: 450 },
          { name: 'Writer', value: 1200 },
          { name: 'Analyst', value: 2100 },
        ]
      }
    ]
  },
  {
    id: 'cost-analysis',
    name: 'Cost Intelligence',
    description: 'Financial tracking and optimization',
    widgets: [
      {
        id: 'cost-total',
        type: 'number',
        title: 'Total Spend (MTD)',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: { metric: 'cost.total', change: '+12%', trend: 'up', color: 'text-white' },
        data: { value: '$1,250.00', subLabel: 'Budget: $2,000' }
      },
      {
        id: 'cost-forecast',
        type: 'number',
        title: 'Forecast (EOM)',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: { metric: 'cost.forecast', change: '+5%', trend: 'up', color: 'text-amber-400' },
        data: { value: '$1,850.00', subLabel: 'Within Budget' }
      },
      {
        id: 'cost-efficiency',
        type: 'gauge',
        title: 'Budget Utilization',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: { color: 'text-emerald-400' },
        data: { value: 62, target: 80, unit: '%' } 
      },
      {
        id: 'cost-per-exec',
        type: 'number',
        title: 'Avg. Cost / Task',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: { metric: 'cost.avg', change: '-2%', trend: 'down', color: 'text-blue-400' },
        data: { value: '$0.042', subLabel: 'Optimized' }
      },
      {
        id: 'cost-trend',
        type: 'line',
        title: 'Daily Spend (30d)',
        position: { x: 0, y: 2, w: 8, h: 4 },
        config: { color: '#f59e0b' },
        data: [
            { name: '1', success: 40 }, { name: '2', success: 45 }, { name: '3', success: 30 },
            { name: '4', success: 60 }, { name: '5', success: 55 }, { name: '6', success: 40 },
            { name: '7', success: 35 }, { name: '8', success: 42 }, { name: '9', success: 48 },
        ]
      },
      {
        id: 'cost-breakdown',
        type: 'pie',
        title: 'Spend by Model',
        position: { x: 8, y: 2, w: 4, h: 4 },
        config: {},
        data: [
           { name: 'GPT-4o', value: 65, color: '#10b981' },
           { name: 'GPT-3.5', value: 20, color: '#3b82f6' },
           { name: 'Claude 3.5', value: 15, color: '#8b5cf6' },
        ]
      },
      {
        id: 'cost-heatmap',
        type: 'heatmap',
        title: 'Cost Intensity (Day/Hour)',
        position: { x: 0, y: 6, w: 12, h: 4 },
        config: {},
        data: {
           xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
           yLabels: ['9am', '12pm', '3pm', '6pm'],
           data: [
              [10, 30, 15, 10], 
              [20, 40, 35, 20], 
              [15, 25, 20, 15], 
              [30, 50, 40, 25], 
              [10, 20, 15, 10]
           ]
        }
      }
    ]
  },
  {
    id: 'agent-deep-dive',
    name: 'Agent Performance',
    description: 'Detailed analysis per agent behavior',
    widgets: [
       { 
         id: 'timeline-history', 
         type: 'timeline', 
         title: 'Execution Timeline', 
         position: { x: 0, y: 0, w: 12, h: 4 }, 
         config: {}, 
         data: [
          { time: '10:00', label: 'Batch Start', type: 'info', subtext: 'Scheduled Job #420' },
          { time: '10:05', label: 'Dexter Error', type: 'error', subtext: 'Context Limit Reached' },
          { time: '10:06', label: 'Auto-Retry', type: 'warning', subtext: 'Attempt 2/3' },
          { time: '10:07', label: 'Success', type: 'success', subtext: 'Completed in 450ms' },
          { time: '10:15', label: 'Idle Check', type: 'info', subtext: 'System health ok' }
         ]
       },
       { 
         id: 'agent-heatmap', 
         type: 'heatmap', 
         title: 'Latency Heatmap (ms)', 
         position: { x: 0, y: 4, w: 6, h: 6 }, 
         config: {}, 
         data: {
            xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            yLabels: ['Morning', 'Afternoon', 'Evening', 'Night'],
            data: [
               [200, 450, 300, 150], 
               [220, 480, 320, 160], 
               [180, 420, 280, 140], 
               [250, 550, 350, 180], 
               [190, 430, 290, 145]
            ]
         }
       },
       {
         id: 'agent-health',
         type: 'table',
         title: 'Agent Health Status',
         position: { x: 6, y: 4, w: 6, h: 6 },
         config: {},
         data: {
            columns: ['Agent', 'Health', 'Uptime', 'Last Error'],
            rows: [
               { id: 1, timestamp: 'Now', agent: 'Dexter', error: 'None', status: 'Resolved' },
               { id: 2, timestamp: '5m ago', agent: 'Scraper', error: 'Timeout', status: 'Failed' },
               { id: 3, timestamp: '1h ago', agent: 'Support', error: 'None', status: 'Resolved' }
            ]
         }
       }
    ]
  }
];
