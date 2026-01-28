// 🎨 Modern Stats Cards - Brain AI Dashboard
'use client';

import { motion } from 'framer-motion';
import { Database, Zap, TrendingUp, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { CardV2 } from '@/components/ui/card-v2';
import { cn } from '@/lib/utils';

interface Stat {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'amber';
  trend?: 'up' | 'down' | 'neutral';
}

interface BrainStatsCardsProps {
  stats: any;
  isLoading?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    light: 'bg-blue-500/20 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    light: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    light: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    light: 'bg-amber-500/20 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
  },
};

export function BrainStatsCards({ stats, isLoading }: BrainStatsCardsProps) {
  const statsData: Stat[] = [
    {
      label: 'Total Documents',
      value: stats?.totalDocuments || 0,
      change: 12.5,
      icon: Database,
      color: 'blue',
      trend: 'up',
    },
    {
      label: 'Queries Today',
      value: stats?.queriesToday || 0,
      change: -3.2,
      icon: Zap,
      color: 'purple',
      trend: 'down',
    },
    {
      label: 'Cache Hit Rate',
      value: stats?.cacheHitRate ? `${stats.cacheHitRate}%` : '0%',
      change: 8.1,
      icon: TrendingUp,
      color: 'green',
      trend: 'up',
    },
    {
      label: 'Avg Response',
      value: stats?.avgResponseTime ? `${stats.avgResponseTime}ms` : '0ms',
      change: -15.3,
      icon: Clock,
      color: 'amber',
      trend: 'down',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <CardV2 key={i} variant="elevated" padding="md">
            <div className="animate-pulse">
              <div className="h-12 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-4" />
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
              <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          </CardV2>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        const colors = colorClasses[stat.color];
        const isPositive = stat.trend === 'up';
        const isNegative = stat.trend === 'down';

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CardV2
              variant="elevated"
              padding="md"
              className="group hover:shadow-xl transition-shadow duration-300"
            >
              {/* Icon */}
              <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl text-white mb-4', colors.bg)}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Label */}
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                {stat.label}
              </p>

              {/* Value */}
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {stat.value}
                </p>

                {/* Trend Badge */}
                {stat.change !== undefined && (
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold',
                      isPositive && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                      isNegative && 'bg-red-500/20 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    )}
                  >
                    {isPositive && <ArrowUp className="h-3 w-3" />}
                    {isNegative && <ArrowDown className="h-3 w-3" />}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>

              {/* Sparkline placeholder */}
              <div className="mt-4 h-8 flex items-end gap-1">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={cn('flex-1 rounded-sm transition-all duration-300', colors.light)}
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>
            </CardV2>
          </motion.div>
        );
      })}
    </div>
  );
}
