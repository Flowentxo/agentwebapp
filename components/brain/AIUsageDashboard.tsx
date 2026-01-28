/**
 * Brain AI v3.0 - AI Usage Dashboard
 *
 * ISO 42001 Compliance Dashboard:
 * - Usage metrics and trends
 * - Cost tracking
 * - Model usage breakdown
 * - Audit trail
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Activity,
  DollarSign,
  Cpu,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  byOperation: Record<string, { requests: number; tokens: number }>;
  byDay: { date: string; requests: number; tokens: number; cost: number }[];
}

interface ComplianceReport {
  period: { from: string; to: string };
  summary: {
    totalAIInteractions: number;
    uniqueUsers: number;
    modelsUsed: string[];
    operationsPerformed: string[];
    totalTokensProcessed: number;
    estimatedCost: number;
    successRate: number;
  };
  breakdown: {
    byModel: Record<string, number>;
    byOperation: Record<string, number>;
    byUser: Record<string, number>;
  };
  audit: {
    generatedAt: string;
    generatedBy: string;
    dataRetentionPolicy: string;
  };
}

// Colors for charts
const COLORS = ['#7c3aed', '#a855f7', '#c084fc', '#d8b4fe', '#ede9fe'];
const MODEL_COLORS: Record<string, string> = {
  'gpt-4-turbo': '#10b981',
  'gpt-4o': '#3b82f6',
  'gpt-4o-mini': '#8b5cf6',
  'gemini-1.5-flash': '#f59e0b',
  'gemini-1.5-pro': '#ef4444',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function AIUsageDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch usage stats
      const statsResponse = await fetch(
        `/api/brain/usage?days=${selectedPeriod}&includeRecent=true`
      );
      if (!statsResponse.ok) throw new Error('Failed to fetch usage stats');
      const statsData = await statsResponse.json();

      // Fetch compliance report
      const complianceResponse = await fetch(
        `/api/brain/usage/compliance?days=${selectedPeriod}`
      );
      if (!complianceResponse.ok) throw new Error('Failed to fetch compliance report');
      const complianceData = await complianceResponse.json();

      setStats(statsData.stats);
      setComplianceReport(complianceData.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportReport = useCallback(() => {
    if (!complianceReport) return;

    const blob = new Blob([JSON.stringify(complianceReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [complianceReport]);

  if (isLoading) {
    return (
      <div className="usage-dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p>Loading AI usage data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usage-dashboard-error">
        <AlertTriangle className="w-8 h-8" />
        <p>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="usage-dashboard">
      {/* Header */}
      <div className="usage-dashboard-header">
        <div>
          <h1>AI Usage Dashboard</h1>
          <p>ISO 42001 Compliance Monitoring</p>
        </div>
        <div className="usage-dashboard-actions">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value as '7' | '30' | '90')}
            className="usage-period-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={fetchData} className="usage-refresh-button">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExportReport} className="usage-export-button">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="usage-metrics-grid">
        <MetricCard
          icon={<Activity />}
          label="Total Requests"
          value={stats?.totalRequests.toLocaleString() || '0'}
          trend={12}
          color="#7c3aed"
        />
        <MetricCard
          icon={<Cpu />}
          label="Total Tokens"
          value={formatNumber(stats?.totalTokens || 0)}
          trend={8}
          color="#3b82f6"
        />
        <MetricCard
          icon={<DollarSign />}
          label="Estimated Cost"
          value={`$${(stats?.totalCost || 0).toFixed(2)}`}
          trend={-5}
          color="#10b981"
        />
        <MetricCard
          icon={<Clock />}
          label="Avg Latency"
          value={`${Math.round(stats?.averageLatency || 0)}ms`}
          trend={-3}
          color="#f59e0b"
        />
      </div>

      {/* Success Rate Indicator */}
      <div className="usage-success-rate">
        <div className="usage-success-rate-header">
          <h3>System Health</h3>
          <span className={`usage-success-badge ${(stats?.successRate || 0) >= 0.95 ? 'success' : 'warning'}`}>
            {(stats?.successRate || 0) >= 0.95 ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {((stats?.successRate || 0) * 100).toFixed(1)}% Success Rate
          </span>
        </div>
        <div className="usage-success-bar">
          <div
            className="usage-success-bar-fill"
            style={{ width: `${(stats?.successRate || 0) * 100}%` }}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="usage-charts-row">
        {/* Usage Over Time */}
        <div className="usage-chart-card" style={{ minHeight: 340 }}>
          <h3>Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300} minHeight={280}>
            <AreaChart data={stats?.byDay || []}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="date"
                stroke="#666"
                tickFormatter={d => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#7c3aed"
                fill="url(#colorRequests)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Model Distribution */}
        <div className="usage-chart-card" style={{ minHeight: 340 }}>
          <h3>Model Distribution</h3>
          <ResponsiveContainer width="100%" height={300} minHeight={280}>
            <PieChart>
              <Pie
                data={Object.entries(stats?.byModel || {}).map(([name, data]) => ({
                  name,
                  value: data.requests,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {Object.keys(stats?.byModel || {}).map((model, index) => (
                  <Cell
                    key={model}
                    fill={MODEL_COLORS[model] || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operations Breakdown */}
      <div className="usage-chart-card usage-chart-full" style={{ minHeight: 290 }}>
        <h3>Operations by Type</h3>
        <ResponsiveContainer width="100%" height={250} minHeight={230}>
          <BarChart
            data={Object.entries(stats?.byOperation || {}).map(([name, data]) => ({
              name,
              requests: data.requests,
              tokens: data.tokens,
            }))}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis type="number" stroke="#666" />
            <YAxis type="category" dataKey="name" stroke="#666" width={100} />
            <Tooltip
              contentStyle={{
                background: '#1a1a2e',
                border: '1px solid #2a2a4a',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="requests" fill="#7c3aed" name="Requests" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compliance Section */}
      {complianceReport && (
        <div className="usage-compliance-section">
          <h2>ISO 42001 Compliance Report</h2>
          <div className="usage-compliance-grid">
            <div className="usage-compliance-card">
              <h4>Report Period</h4>
              <p>
                {new Date(complianceReport.period.from).toLocaleDateString()} -{' '}
                {new Date(complianceReport.period.to).toLocaleDateString()}
              </p>
            </div>
            <div className="usage-compliance-card">
              <h4>Unique Users</h4>
              <p>{complianceReport.summary.uniqueUsers}</p>
            </div>
            <div className="usage-compliance-card">
              <h4>Models Used</h4>
              <div className="usage-compliance-tags">
                {complianceReport.summary.modelsUsed.map(model => (
                  <span key={model} className="usage-compliance-tag">{model}</span>
                ))}
              </div>
            </div>
            <div className="usage-compliance-card">
              <h4>Operations Performed</h4>
              <div className="usage-compliance-tags">
                {complianceReport.summary.operationsPerformed.map(op => (
                  <span key={op} className="usage-compliance-tag">{op}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="usage-audit-info">
            <p>
              <strong>Generated:</strong> {new Date(complianceReport.audit.generatedAt).toLocaleString()}
            </p>
            <p>
              <strong>Data Retention:</strong> {complianceReport.audit.dataRetentionPolicy}
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .usage-dashboard {
          padding: 24px;
          background: var(--bg-primary, #0f0f1a);
          min-height: 100vh;
        }

        .usage-dashboard-loading,
        .usage-dashboard-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          color: var(--text-secondary, #999);
        }

        .usage-dashboard-error button {
          padding: 8px 16px;
          background: var(--color-primary, #7c3aed);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
        }

        .usage-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .usage-dashboard-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 4px;
        }

        .usage-dashboard-header p {
          font-size: 14px;
          color: var(--text-tertiary, #666);
        }

        .usage-dashboard-actions {
          display: flex;
          gap: 8px;
        }

        .usage-period-select {
          padding: 8px 12px;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          cursor: pointer;
        }

        .usage-refresh-button,
        .usage-export-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          transition: all 0.2s;
        }

        .usage-refresh-button:hover,
        .usage-export-button:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        .usage-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .usage-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .usage-success-rate {
          padding: 16px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .usage-success-rate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .usage-success-rate-header h3 {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }

        .usage-success-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
        }

        .usage-success-badge.success {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .usage-success-badge.warning {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .usage-success-bar {
          height: 8px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 4px;
          overflow: hidden;
        }

        .usage-success-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #7c3aed);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .usage-charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .usage-charts-row {
            grid-template-columns: 1fr;
          }
        }

        .usage-chart-card {
          padding: 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
        }

        .usage-chart-card h3 {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          margin-bottom: 16px;
        }

        .usage-chart-full {
          margin-bottom: 24px;
        }

        .usage-compliance-section {
          padding: 24px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border: 1px solid var(--border-color, #2a2a4a);
        }

        .usage-compliance-section h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .usage-compliance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (max-width: 1024px) {
          .usage-compliance-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .usage-compliance-card {
          padding: 16px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 8px;
        }

        .usage-compliance-card h4 {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-tertiary, #666);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .usage-compliance-card p {
          font-size: 14px;
          color: var(--text-primary, #fff);
        }

        .usage-compliance-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .usage-compliance-tag {
          padding: 2px 8px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary, #999);
        }

        .usage-audit-info {
          padding-top: 16px;
          border-top: 1px solid var(--border-color, #3a3a5a);
        }

        .usage-audit-info p {
          font-size: 13px;
          color: var(--text-secondary, #999);
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}

// ============================================
// METRIC CARD COMPONENT
// ============================================

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: number;
  color: string;
}

function MetricCard({ icon, label, value, trend, color }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-card-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="metric-card-content">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-value">{value}</span>
      </div>
      <div className={`metric-card-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
        <TrendingUp className="w-3 h-3" style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
        <span>{Math.abs(trend)}%</span>
      </div>

      <style jsx>{`
        .metric-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border: 1px solid var(--border-color, #2a2a4a);
        }

        .metric-card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .metric-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .metric-card-label {
          font-size: 13px;
          color: var(--text-tertiary, #666);
          margin-bottom: 4px;
        }

        .metric-card-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .metric-card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .metric-card-trend.positive {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .metric-card-trend.negative {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

// Helper function
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default AIUsageDashboard;
