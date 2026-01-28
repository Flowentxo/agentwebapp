// 🎨 Insights Dashboard V2 - Analytics & Visualizations
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, MessageSquare, Clock, BarChart3, PieChart, Activity } from 'lucide-react';
import { CardV2, CardV2Header, CardV2Title, CardV2Description, CardV2Content } from '@/components/ui/card-v2';
import { EmptyState } from './EmptyState';

interface InsightsData {
  popularQueries: Array<{ query: string; count: number }>;
  topTopics: Array<{ topic: string; percentage: number }>;
  usageByHour: Array<{ hour: number; queries: number }>;
  activeUsers: number;
  totalQueries: number;
  avgResponseTime: number;
}

export function InsightsDashboardV2() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchInsights();
  }, [timeRange]);

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/brain/insights?range=${timeRange}`);
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <CardV2 key={i} variant="elevated" padding="md">
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-4" />
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
                <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
            </CardV2>
          ))}
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No insights yet"
        description="Start using Brain AI to generate insights about your knowledge base"
        illustration="insights"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Insights & Analytics
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Understanding your knowledge base usage patterns
          </p>
        </div>

        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-card dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={Users}
          label="Active Users"
          value={insights.activeUsers}
          color="blue"
        />
        <MetricCard
          icon={MessageSquare}
          label="Total Queries"
          value={insights.totalQueries}
          color="purple"
        />
        <MetricCard
          icon={Clock}
          label="Avg Response"
          value={`${insights.avgResponseTime}ms`}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Queries */}
        <CardV2 variant="elevated" padding="md">
          <CardV2Header>
            <div className="flex items-center justify-between">
              <div>
                <CardV2Title>Popular Queries</CardV2Title>
                <CardV2Description>Most searched topics</CardV2Description>
              </div>
              <BarChart3 className="h-5 w-5 text-neutral-400" />
            </div>
          </CardV2Header>
          <CardV2Content>
            <div className="space-y-3 mt-4">
              {insights.popularQueries?.slice(0, 5).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate flex-1">
                    {item.query}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / (insights.popularQueries[0]?.count || 1)) * 100}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                      />
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardV2Content>
        </CardV2>

        {/* Top Topics */}
        <CardV2 variant="elevated" padding="md">
          <CardV2Header>
            <div className="flex items-center justify-between">
              <div>
                <CardV2Title>Top Topics</CardV2Title>
                <CardV2Description>Content distribution</CardV2Description>
              </div>
              <PieChart className="h-5 w-5 text-neutral-400" />
            </div>
          </CardV2Header>
          <CardV2Content>
            <div className="space-y-3 mt-4">
              {insights.topTopics?.slice(0, 5).map((item, index) => {
                const colors = [
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-green-500',
                  'bg-amber-500',
                  'bg-pink-500',
                ];

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
                      {item.topic}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {item.percentage}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </CardV2Content>
        </CardV2>
      </div>

      {/* Usage by Hour Chart */}
      <CardV2 variant="elevated" padding="md">
        <CardV2Header>
          <div className="flex items-center justify-between">
            <div>
              <CardV2Title>Usage Pattern</CardV2Title>
              <CardV2Description>Queries by hour of day</CardV2Description>
            </div>
            <Activity className="h-5 w-5 text-neutral-400" />
          </div>
        </CardV2Header>
        <CardV2Content>
          <div className="mt-6 h-64 flex items-end justify-between gap-1">
            {insights.usageByHour?.map((item, index) => {
              const maxQueries = Math.max(...insights.usageByHour.map(h => h.queries));
              const heightPercentage = (item.queries / maxQueries) * 100;

              return (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercentage}%` }}
                  transition={{ delay: index * 0.02, duration: 0.5 }}
                  className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-600 rounded-t-md relative group cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs px-2 py-1 rounded whitespace-nowrap">
                    {item.hour}:00 - {item.queries} queries
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-neutral-400">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </CardV2Content>
      </CardV2>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'purple' | 'green';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <CardV2 variant="elevated" padding="md">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white mb-4`}>
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          {value}
        </p>
      </CardV2>
    </motion.div>
  );
}
