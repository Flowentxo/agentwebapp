"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  Database,
  Zap,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  HardDrive,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  activeConnections: number;
  errorRate: number;
  avgResponseTime: number;
  lastChecked: string;
}

interface PerformanceMetric {
  type: string;
  name: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
}

interface RecentError {
  id: string;
  type: string;
  name: string;
  duration: number;
  timestamp: string;
  errorMessage?: string;
}

interface SlowOperation {
  id: string;
  type: string;
  name: string;
  duration: number;
  timestamp: string;
}

interface PerformanceData {
  health: SystemHealth;
  summary: {
    totalOperations: number;
    avgResponseTime: number;
    errorCount: number;
    slowOperations: number;
  };
  metrics: PerformanceMetric[];
  recentErrors: RecentError[];
  slowOperations: SlowOperation[];
}

// ============================================
// COMPONENT
// ============================================

export default function MonitoringPage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [period, setPeriod] = useState(60); // minutes

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitoring/performance?view=overview&period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-400";
      case "degraded":
        return "text-yellow-400";
      case "unhealthy":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-zinc-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="h-7 w-7 text-indigo-400" />
            System Monitoring
          </h1>
          <p className="text-zinc-400 mt-1">
            Echtzeit-Performance und Systemstatus
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={15}>Letzte 15 Min</option>
            <option value={60}>Letzte Stunde</option>
            <option value={360}>Letzte 6 Stunden</option>
            <option value={1440}>Letzte 24 Stunden</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "gap-2",
              autoRefresh
                ? "bg-green-500/20 border-green-500/30 text-green-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
            Auto-Refresh
          </Button>
        </div>
      </div>

      {/* System Health */}
      {data?.health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthCard
            title="System Status"
            value={data.health.status}
            icon={getStatusIcon(data.health.status)}
            color={getStatusColor(data.health.status)}
          />
          <HealthCard
            title="Uptime"
            value={formatUptime(data.health.uptime)}
            icon={<Clock className="h-5 w-5 text-blue-400" />}
            subtitle="Seit letztem Neustart"
          />
          <HealthCard
            title="Memory"
            value={`${data.health.memory.percentage}%`}
            icon={<Cpu className="h-5 w-5 text-purple-400" />}
            subtitle={`${data.health.memory.used} / ${data.health.memory.total} MB`}
            progress={data.health.memory.percentage}
          />
          <HealthCard
            title="Avg Response"
            value={`${data.health.avgResponseTime}ms`}
            icon={<Zap className="h-5 w-5 text-amber-400" />}
            color={
              data.health.avgResponseTime < 200
                ? "text-green-400"
                : data.health.avgResponseTime < 500
                ? "text-yellow-400"
                : "text-red-400"
            }
          />
        </div>
      )}

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Operationen"
            value={data.summary.totalOperations.toLocaleString()}
            icon={Activity}
            color="indigo"
          />
          <StatCard
            title="Avg. Antwortzeit"
            value={`${data.summary.avgResponseTime}ms`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Fehler"
            value={data.summary.errorCount.toString()}
            icon={AlertTriangle}
            color={data.summary.errorCount > 0 ? "red" : "green"}
          />
          <StatCard
            title="Langsame Ops"
            value={data.summary.slowOperations.toString()}
            icon={Clock}
            color={data.summary.slowOperations > 5 ? "yellow" : "green"}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              Performance Metriken
            </h2>
          </div>
          <div className="p-4">
            {data?.metrics && data.metrics.length > 0 ? (
              <div className="space-y-3">
                {data.metrics.slice(0, 10).map((metric, i) => (
                  <MetricRow key={i} metric={metric} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                Keine Metriken verfügbar
              </div>
            )}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Letzte Fehler
            </h2>
          </div>
          <div className="p-4">
            {data?.recentErrors && data.recentErrors.length > 0 ? (
              <div className="space-y-3">
                {data.recentErrors.map((error) => (
                  <ErrorRow key={error.id} error={error} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-zinc-400">Keine Fehler in diesem Zeitraum</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slow Operations */}
      {data?.slowOperations && data.slowOperations.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              Langsame Operationen (&gt;1000ms)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Typ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                    Dauer
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                    Zeitpunkt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.slowOperations.map((op) => (
                  <tr key={op.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <TypeBadge type={op.type} />
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-mono truncate max-w-xs">
                      {op.name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-red-400 font-medium">
                        {op.duration}ms
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-500">
                      {new Date(op.timestamp).toLocaleTimeString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function HealthCard({
  title,
  value,
  icon,
  color,
  subtitle,
  progress,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
  progress?: number;
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-xs text-zinc-500">{title}</span>
      </div>
      <p className={cn("text-2xl font-bold capitalize", color || "text-white")}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progress < 70 ? "bg-green-500" : progress < 90 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: "indigo" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className={cn("p-4 rounded-xl border", colorClasses[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs opacity-70">{title}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricRow({ metric }: { metric: PerformanceMetric }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
      <div className="flex items-center gap-3">
        <TypeBadge type={metric.type} />
        <div>
          <p className="text-sm text-white font-mono truncate max-w-[200px]">
            {metric.name}
          </p>
          <p className="text-xs text-zinc-500">{metric.count} calls</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-white">{metric.avgDuration}ms</p>
        <p className="text-xs text-zinc-500">
          p95: {metric.p95}ms
          {metric.errorRate > 0 && (
            <span className="ml-2 text-red-400">
              {Math.round(metric.errorRate * 100)}% err
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function ErrorRow({ error }: { error: RecentError }) {
  return (
    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
      <div className="flex items-center justify-between mb-1">
        <TypeBadge type={error.type} />
        <span className="text-xs text-zinc-500">
          {new Date(error.timestamp).toLocaleTimeString("de-DE")}
        </span>
      </div>
      <p className="text-sm text-white font-mono truncate">{error.name}</p>
      {error.errorMessage && (
        <p className="text-xs text-red-400 mt-1 truncate">{error.errorMessage}</p>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    api: "bg-blue-500/20 text-blue-400",
    database: "bg-purple-500/20 text-purple-400",
    agent: "bg-green-500/20 text-green-400",
    workflow: "bg-amber-500/20 text-amber-400",
    cache: "bg-cyan-500/20 text-cyan-400",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded capitalize",
        styles[type] || "bg-zinc-500/20 text-zinc-400"
      )}
    >
      {type}
    </span>
  );
}
