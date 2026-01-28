'use client';

/**
 * Enterprise Forecast Card Component
 * Displays AI-powered budget forecasts with trend analysis
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ChevronRight,
  Target,
  Zap,
  Brain,
} from 'lucide-react';

interface ForecastData {
  currentMonthSpend: number;
  projectedMonthEnd: number;
  projectedOverage: number;
  runOutDate: string | null;
  confidenceScore: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
}

interface AnomalyData {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  percentageDeviation: number;
}

interface ForecastCardProps {
  className?: string;
  onViewDetails?: () => void;
}

export function ForecastCard({ className = '', onViewDetails }: ForecastCardProps) {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);

      const response = await fetch('/api/budget/enterprise/forecast', {
        method: force ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: force ? JSON.stringify({}) : undefined,
      });

      if (!response.ok) throw new Error('Failed to fetch forecast');

      const data = await response.json();
      setForecast(data.data.forecast);
      setAnomalies(data.data.anomalies || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const getTrendIcon = () => {
    if (!forecast) return <Minus className="h-5 w-5" />;
    switch (forecast.trend) {
      case 'increasing':
        return <TrendingUp className="h-5 w-5 text-red-400" />;
      case 'decreasing':
        return <TrendingDown className="h-5 w-5 text-green-400" />;
      default:
        return <Minus className="h-5 w-5 text-blue-400" />;
    }
  };

  const getTrendColor = () => {
    if (!forecast) return 'text-white/60';
    switch (forecast.trend) {
      case 'increasing':
        return 'text-red-400';
      case 'decreasing':
        return 'text-green-400';
      default:
        return 'text-blue-400';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={`rounded-3xl bg-card/[0.02] border border-white/[0.05] p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-card/10 rounded w-1/3" />
          <div className="h-12 bg-card/10 rounded w-2/3" />
          <div className="h-4 bg-card/10 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-3xl bg-red-500/10 border border-red-500/20 p-8 ${className}`}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
        <button
          onClick={() => fetchForecast()}
          className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/[0.08] overflow-hidden ${className}`}
    >
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              <Brain className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                AI Forecast
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                Linear Regression Analysis
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchForecast(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-card/5 hover:bg-card/10 transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 text-white/40 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Projected Month End */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              Projected Month End
            </p>
            <p className="text-3xl font-black text-white tabular-nums">
              {formatCurrency(forecast?.projectedMonthEnd || 0)}
            </p>
            {forecast?.projectedOverage && forecast.projectedOverage > 0 && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                +{formatCurrency(forecast.projectedOverage)} over budget
              </p>
            )}
          </div>

          {/* Run Out Date */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              Budget Run-Out Date
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-white/40" />
              <p className="text-xl font-bold text-white">
                {formatDate(forecast?.runOutDate || null)}
              </p>
            </div>
            {forecast?.runOutDate && (
              <p className="text-xs text-orange-400 mt-1">
                {Math.ceil(
                  (new Date(forecast.runOutDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days remaining
              </p>
            )}
          </div>
        </div>

        {/* Trend & Confidence */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 p-4 rounded-2xl bg-card/[0.03] border border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Trend</span>
              {getTrendIcon()}
            </div>
            <p className={`text-lg font-bold capitalize mt-1 ${getTrendColor()}`}>
              {forecast?.trend || 'Unknown'}
            </p>
          </div>

          <div className="flex-1 p-4 rounded-2xl bg-card/[0.03] border border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Confidence</span>
              <Target className="h-4 w-4 text-white/40" />
            </div>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-lg font-bold text-white">
                {forecast?.confidenceScore || 0}%
              </p>
              <div className="flex-1 h-2 bg-card/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${forecast?.confidenceScore || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {forecast?.recommendation && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/70 leading-relaxed">
                {forecast.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="space-y-2 mb-6">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Detected Anomalies
            </p>
            {anomalies.slice(0, 2).map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  anomaly.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/20'
                    : anomaly.severity === 'warning'
                    ? 'bg-orange-500/10 border-orange-500/20'
                    : 'bg-blue-500/10 border-blue-500/20'
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    anomaly.severity === 'critical'
                      ? 'text-red-400'
                      : anomaly.severity === 'warning'
                      ? 'text-orange-400'
                      : 'text-blue-400'
                  }`}
                />
                <p className="text-xs text-white/70">{anomaly.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full p-4 rounded-2xl bg-card/5 hover:bg-card/10 border border-white/[0.05] transition-all flex items-center justify-center gap-2 group"
          >
            <span className="text-sm font-semibold text-white/60 group-hover:text-white">
              View Full Analysis
            </span>
            <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
