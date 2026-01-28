/**
 * 🎨 Premium Stats Cards 2025
 * Emotionale KPI-Cards mit individuellen Gradients
 * Animated Trends & Realtime Updates
 */

'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
  Database,
  Zap,
  Clock,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatData {
  id: string;
  label: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  icon: LucideIcon;
  gradient: {
    from: string;
    to: string;
    iconBg: string;
  };
  sparkline?: number[];
}

interface PremiumStatsCards2025Props {
  stats?: {
    totalDocuments?: number;
    queriesToday?: number;
    avgResponseTime?: number;
    cacheHitRate?: number;
  };
  isLoading?: boolean;
}

export function PremiumStatsCards2025({ stats, isLoading }: PremiumStatsCards2025Props) {
  const statsData: StatData[] = [
    {
      id: 'documents',
      label: 'Total Documents',
      value: stats?.totalDocuments || 0,
      change: 12.5,
      changeLabel: 'vs last month',
      icon: Database,
      gradient: {
        from: '#6366f1',
        to: '#8b5cf6',
        iconBg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      },
      sparkline: [40, 52, 48, 67, 55, 70, 85]
    },
    {
      id: 'queries',
      label: 'Queries Today',
      value: stats?.queriesToday || 0,
      change: 8.2,
      changeLabel: 'vs yesterday',
      icon: Zap,
      gradient: {
        from: '#06b6d4',
        to: '#3b82f6',
        iconBg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
      },
      sparkline: [30, 45, 50, 42, 60, 55, 72]
    },
    {
      id: 'response',
      label: 'Avg Response Time',
      value: `${stats?.avgResponseTime || 0}ms`,
      change: -15.3,
      changeLabel: 'improvement',
      icon: Clock,
      gradient: {
        from: '#10b981',
        to: '#14b8a6',
        iconBg: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'
      },
      sparkline: [90, 85, 80, 75, 70, 65, 60]
    },
    {
      id: 'cache',
      label: 'Cache Hit Rate',
      value: `${stats?.cacheHitRate || 0}%`,
      change: 5.7,
      changeLabel: 'optimization',
      icon: Target,
      gradient: {
        from: '#f59e0b',
        to: '#ef4444',
        iconBg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
      },
      sparkline: [75, 78, 80, 82, 85, 87, 89]
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 rounded-3xl bg-muted dark:bg-gray-800 animate-pulse"
            style={{
              background: 'linear-gradient(90deg, rgba(229, 229, 229, 1) 0%, rgba(212, 212, 212, 1) 50%, rgba(229, 229, 229, 1) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        const isPositive = stat.change > 0;
        const isNegative = stat.change < 0;
        const isNeutral = stat.change === 0;

        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 20
            }}
            whileHover={{
              y: -8,
              transition: { duration: 0.2 }
            }}
            className="group relative"
          >
            {/* Card Container */}
            <div
              className="relative h-full bg-card rounded-3xl p-6 overflow-hidden border border-border transition-all duration-300"
              style={{
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)'
              }}
            >
              {/* Top Gradient Bar - Animated */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: `linear-gradient(90deg, ${stat.gradient.from} 0%, ${stat.gradient.to} 100%)`,
                  boxShadow: `0 0 20px ${stat.gradient.from}40`
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
              />

              {/* Icon with Gradient Background */}
              <div className="flex items-start justify-between mb-4">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: stat.gradient.iconBg,
                      boxShadow: `0 8px 16px ${stat.gradient.from}30`
                    }}
                  >
                    <Icon className="h-7 w-7 text-white relative z-10" />
                    {/* Animated Glow */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3), transparent)'
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  </div>
                </motion.div>

                {/* Trend Badge */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: 'spring' }}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold',
                    isPositive && stat.id !== 'response' && 'bg-emerald-500/20 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                    isNegative && stat.id === 'response' && 'bg-emerald-500/20 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                    isNegative && stat.id !== 'response' && 'bg-red-500/20 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                    isNeutral && 'bg-muted dark:bg-gray-800 text-muted-foreground'
                  )}
                >
                  {isPositive && stat.id !== 'response' && <TrendingUp className="h-3 w-3" />}
                  {isNegative && stat.id === 'response' && <TrendingUp className="h-3 w-3" />}
                  {isNegative && stat.id !== 'response' && <TrendingDown className="h-3 w-3" />}
                  {isNeutral && <Minus className="h-3 w-3" />}
                  <span>{Math.abs(stat.change)}%</span>
                </motion.div>
              </div>

              {/* Value - Large & Bold */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.4 }}
                className="mb-2"
              >
                <div className="text-4xl font-bold text-foreground dark:text-white tracking-tight">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
              </motion.div>

              {/* Label & Change Label */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                {stat.changeLabel && (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {stat.changeLabel}
                  </p>
                )}
              </div>

              {/* Sparkline Chart */}
              {stat.sparkline && (
                <div className="mt-4 flex items-end gap-1 h-12">
                  {stat.sparkline.map((value, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        background: `linear-gradient(180deg, ${stat.gradient.from} 0%, ${stat.gradient.to} 100%)`,
                        opacity: 0.6
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${(value / Math.max(...(stat.sparkline || []))) * 100}%` }}
                      transition={{
                        delay: index * 0.1 + 0.5 + i * 0.05,
                        duration: 0.4,
                        ease: 'easeOut'
                      }}
                      whileHover={{
                        opacity: 1,
                        transition: { duration: 0.1 }
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Hover Glow Effect */}
              <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: `0 0 40px ${stat.gradient.from}20, 0 0 60px ${stat.gradient.to}15`
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
