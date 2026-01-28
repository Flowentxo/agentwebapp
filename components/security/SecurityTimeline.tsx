"use client";

import { useState, useEffect } from "react";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";

interface TimelineBucket {
  hour: string;
  events: any[];
  count: number;
}

export function SecurityTimeline() {
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [timeRange, setTimeRange] = useState(24);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/security/timeline?hours=${timeRange}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch timeline");

      const data = await res.json();
      setTimeline(data.timeline);
    } catch (error) {
      console.error("[SECURITY_TIMELINE] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 120000); // 2min refresh
    return () => clearInterval(interval);
  }, [timeRange]);

  const getMaxCount = () => {
    return Math.max(...timeline.map((b) => b.count), 1);
  };

  const getBarHeight = (count: number) => {
    const max = getMaxCount();
    return `${(count / max) * 100}%`;
  };

  const getBarColor = (count: number) => {
    const max = getMaxCount();
    const percentage = (count / max) * 100;

    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getTrend = () => {
    if (timeline.length < 2) return null;

    const recent = timeline.slice(-3).reduce((sum, b) => sum + b.count, 0);
    const older = timeline.slice(0, 3).reduce((sum, b) => sum + b.count, 0);

    if (recent > older) return "up";
    if (recent < older) return "down";
    return "stable";
  };

  const trend = getTrend();

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Security Events Timeline
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-text-muted">
              Zeitlicher Verlauf der Sicherheitsereignisse
            </p>
            {trend === "up" && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <TrendingUp className="h-3 w-3" />
                Trending Up
              </span>
            )}
            {trend === "down" && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <TrendingDown className="h-3 w-3" />
                Trending Down
              </span>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[6, 12, 24, 48].map((hours) => (
            <button
              key={hours}
              onClick={() => setTimeRange(hours)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeRange === hours
                  ? "bg-accent text-white"
                  : "bg-surface-1 text-text-muted hover:bg-surface-2"
              }`}
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>

      <div className="hairline-b mb-4" />

      {loading ? (
        <div className="text-center py-8 text-text-muted">
          Loading timeline...
        </div>
      ) : timeline.length > 0 ? (
        <>
          {/* Timeline Chart */}
          <div className="flex items-end justify-between gap-1 h-48 mb-4">
            {timeline.map((bucket, idx) => {
              const height = getBarHeight(bucket.count);
              const color = getBarColor(bucket.count);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  {/* Bar */}
                  <div className="relative w-full flex items-end justify-center h-full">
                    <div
                      className={`w-full ${color} rounded-t transition-all duration-300 group-hover:opacity-80 cursor-pointer relative`}
                      style={{ height }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                        <div className="bg-surface-2 border border-white/20 rounded-lg p-2 shadow-xl whitespace-nowrap">
                          <div className="text-xs font-semibold text-text">
                            {bucket.count} events
                          </div>
                          <div className="text-xs text-text-muted">
                            {new Date(bucket.hour).toLocaleString("de-DE", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hour Label */}
                  <span className="text-xs text-text-muted">
                    {new Date(bucket.hour).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-surface-1 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-semibold text-text">
                {timeline.reduce((sum, b) => sum + b.count, 0)}
              </div>
              <div className="text-xs text-text-muted">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-text">
                {Math.round(
                  timeline.reduce((sum, b) => sum + b.count, 0) / timeline.length
                )}
              </div>
              <div className="text-xs text-text-muted">Avg per Hour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-text">
                {getMaxCount()}
              </div>
              <div className="text-xs text-text-muted">Peak Hour</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-text-muted">
          No timeline data available
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Auto-refresh alle 2 Minuten · Zeitraum: {timeRange}h
      </p>
    </div>
  );
}
