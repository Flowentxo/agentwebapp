'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, Grid, Lightbulb } from 'lucide-react';

interface AnalyticsData {
  totalGenerated: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  impactEffortMatrix: { title: string; impact: number; effort: number; status: string }[];
}

export function IdeasAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/business-ideas/analytics', {
        headers: { 'x-user-id': 'demo-user' },
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--oracle-blue)] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-[var(--oracle-blue)] animate-pulse delay-75" />
          <span className="w-2 h-2 rounded-full bg-[var(--oracle-blue)] animate-pulse delay-150" />
        </div>
      </div>
    );
  }

  // Status colors
  const statusColors: Record<string, string> = {
    new: '#60A5FA', // blue
    planning: '#FBBF24', // yellow
    'in-progress': '#F59E0B', // orange
    implemented: '#10B981', // green
    rejected: '#EF4444', // red
  };

  // Category colors for pie chart
  const categoryColors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];

  // Prepare status data for bar chart
  const statusData = analytics.byStatus.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    count: item.count,
    fill: statusColors[item.status] || '#6B7280',
  }));

  // Prepare category data for pie chart
  const categoryData = analytics.byCategory.map((item, idx) => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.count,
    fill: categoryColors[idx % categoryColors.length],
  }));

  // Impact/Effort mapping
  const impactMap: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const effortMap: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  // Prepare impact/effort matrix data
  const matrixData = analytics.impactEffortMatrix.map(idea => ({
    x: effortMap[idea.effort] || 2,
    y: impactMap[idea.impact] || 2,
    name: idea.title.slice(0, 30) + (idea.title.length > 30 ? '...' : ''),
    z: 100, // Size of bubble
    fill: statusColors[idea.status] || '#6B7280',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30">
          <TrendingUp className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold oracle-text-primary-color">Ideas Analytics</h3>
          <p className="text-sm oracle-text-secondary-color">
            {analytics.totalGenerated} Ideen generiert insgesamt
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Bar Chart */}
        <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="h-5 w-5 text-blue-400" />
            <h4 className="font-semibold oracle-text-primary-color">Status Verteilung</h4>
          </div>
          <ResponsiveContainer width="100%" height={250} minHeight={230}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--oracle-text-secondary)', fontSize: 12 }}
                stroke="rgba(255,255,255,0.2)"
              />
              <YAxis
                tick={{ fill: 'var(--oracle-text-secondary)', fontSize: 12 }}
                stroke="rgba(255,255,255,0.2)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--oracle-surface-secondary)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'var(--oracle-text-primary)',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-600/5 border border-purple-500/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-purple-400" />
            <h4 className="font-semibold oracle-text-primary-color">Kategorien</h4>
          </div>
          <ResponsiveContainer width="100%" height={250} minHeight={230}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--oracle-surface-secondary)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'var(--oracle-text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Impact/Effort Matrix Scatter Plot */}
      <div className="rounded-xl bg-gradient-to-br from-green-500/5 to-green-600/5 border border-green-500/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Grid className="h-5 w-5 text-green-400" />
          <h4 className="font-semibold oracle-text-primary-color">Impact vs. Effort Matrix</h4>
          <p className="text-xs oracle-text-secondary-color ml-auto">
            Oben rechts = Hoher Impact, wenig Aufwand (Quick Wins)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={350} minHeight={330}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Effort"
              domain={[0, 4]}
              ticks={[1, 2, 3]}
              tickFormatter={(value) => ['', 'Low', 'Medium', 'High'][value]}
              label={{
                value: 'Aufwand →',
                position: 'bottom',
                fill: 'var(--oracle-text-secondary)',
                fontSize: 12,
              }}
              tick={{ fill: 'var(--oracle-text-secondary)', fontSize: 12 }}
              stroke="rgba(255,255,255,0.2)"
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Impact"
              domain={[0, 5]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(value) => ['', 'Low', 'Medium', 'High', 'Critical'][value]}
              label={{
                value: 'Impact ↑',
                angle: -90,
                position: 'left',
                fill: 'var(--oracle-text-secondary)',
                fontSize: 12,
              }}
              tick={{ fill: 'var(--oracle-text-secondary)', fontSize: 12 }}
              stroke="rgba(255,255,255,0.2)"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: 'var(--oracle-surface-secondary)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--oracle-text-primary)',
                      }}
                    >
                      <p className="font-medium text-sm mb-1">{payload[0].payload.name}</p>
                      <p className="text-xs oracle-text-secondary-color">
                        Impact: {['', 'Low', 'Medium', 'High', 'Critical'][payload[0].payload.y]}
                      </p>
                      <p className="text-xs oracle-text-secondary-color">
                        Effort: {['', 'Low', 'Medium', 'High'][payload[0].payload.x]}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={matrixData} fill="#8884d8">
              {matrixData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs oracle-text-secondary-color capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">
              Top Kategorie
            </span>
          </div>
          <p className="text-xl font-bold oracle-text-primary-color capitalize">
            {categoryData.length > 0 ? categoryData[0].name : 'N/A'}
          </p>
          <p className="text-xs oracle-text-secondary-color mt-1">
            {categoryData.length > 0 ? categoryData[0].value : 0} Ideen
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
              Implementiert
            </span>
          </div>
          <p className="text-xl font-bold oracle-text-primary-color">
            {statusData.find(s => s.name === 'Implemented')?.count || 0}
          </p>
          <p className="text-xs oracle-text-secondary-color mt-1">
            {analytics.totalGenerated > 0
              ? Math.round(
                  ((statusData.find(s => s.name === 'Implemented')?.count || 0) /
                    analytics.totalGenerated) *
                    100
                )
              : 0}
            % Erfolgsrate
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Grid className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Quick Wins
            </span>
          </div>
          <p className="text-xl font-bold oracle-text-primary-color">
            {matrixData.filter(idea => idea.x === 1 && idea.y >= 3).length}
          </p>
          <p className="text-xs oracle-text-secondary-color mt-1">High impact, low effort</p>
        </div>
      </div>
    </div>
  );
}
