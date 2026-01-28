"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Activity } from "lucide-react";

interface SecurityStats {
  total: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byType: Record<string, number>;
  blocked: number;
  uniqueIPs: number;
  topIPs: Array<{ ip: string; count: number }>;
  recentTrend: Array<{ hour: string; count: number }>;
}

export function SecurityStatistics() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [timeRange, setTimeRange] = useState(24);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = async () => {
    try {
      const res = await fetch(`/api/security/statistics?hours=${timeRange}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch statistics");

      const data = await res.json();
      setStats(data.statistics);
    } catch (error) {
      console.error("[SECURITY_STATS] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(fetchStatistics, 60000); // 1min refresh
    return () => clearInterval(interval);
  }, [timeRange]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "low":
        return "text-blue-400 bg-blue-500/20";
      default:
        return "text-muted-foreground bg-muted/500/20";
    }
  };

  const getSeverityPercentage = (count: number) => {
    if (!stats || stats.total === 0) return 0;
    return ((count / stats.total) * 100).toFixed(1);
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Security Statistics
          </h2>
          <p className="text-sm text-text-muted">
            Analyse der Sicherheitsereignisse
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[1, 6, 24, 168].map((hours) => (
            <button
              key={hours}
              onClick={() => setTimeRange(hours)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeRange === hours
                  ? "bg-accent text-white"
                  : "bg-surface-1 text-text-muted hover:bg-surface-2"
              }`}
            >
              {hours === 1 ? "1h" : hours === 6 ? "6h" : hours === 24 ? "24h" : "7d"}
            </button>
          ))}
        </div>
      </div>

      <div className="hairline-b mb-4" />

      {loading ? (
        <div className="text-center py-8 text-text-muted">
          Loading statistics...
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-text-muted">Total Events</span>
              </div>
              <span className="text-2xl font-semibold text-text">
                {stats.total}
              </span>
            </div>

            <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-text-muted">Blocked</span>
              </div>
              <span className="text-2xl font-semibold text-text">
                {stats.blocked}
              </span>
            </div>

            <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-text-muted">Unique IPs</span>
              </div>
              <span className="text-2xl font-semibold text-text">
                {stats.uniqueIPs}
              </span>
            </div>
          </div>

          {/* Severity Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">
              Events by Severity
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted capitalize w-16">
                    {severity}
                  </span>
                  <div className="flex-1 bg-surface-1 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${getSeverityColor(severity)} flex items-center justify-end px-2 transition-all duration-500`}
                      style={{ width: `${getSeverityPercentage(count)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-xs font-medium">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-text-muted w-12 text-right">
                    {getSeverityPercentage(count)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Types */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">
              Top Event Types
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.byType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 bg-surface-1 rounded-lg"
                  >
                    <span className="text-sm text-text mono">
                      {type.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-medium text-accent">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-red-400">
          Failed to load statistics
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Auto-refresh jede Minute · Zeitraum: {timeRange === 168 ? "7 Tage" : `${timeRange}h`}
      </p>
    </div>
  );
}
