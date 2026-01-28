"use client";

import { useState, useEffect } from "react";
import { List, Filter, Download, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SecurityEvent {
  id: string;
  type: string;
  severity: string;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details: any;
  blocked: boolean;
}

export function SecurityEventsTable() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [filterType, setFilterType] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(filterType && { type: filterType }),
        ...(filterSeverity && { severity: filterSeverity }),
      });

      const res = await fetch(`/api/security/events?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch events");

      const data = await res.json();
      setEvents(data.events);
    } catch (error) {
      console.error("[SECURITY_EVENTS] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [limit, filterType, filterSeverity]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="error">Critical</Badge>;
      case "high":
        return <Badge variant="warning">High</Badge>;
      case "medium":
        return <Badge variant="default">Medium</Badge>;
      case "low":
        return <Badge variant="success">Low</Badge>;
      default:
        return <Badge variant="default">{severity}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Type", "Severity", "IP", "User", "Blocked", "Details"];
    const rows = events.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.type,
      e.severity,
      e.ip || "-",
      e.userId || "-",
      e.blocked ? "Yes" : "No",
      JSON.stringify(e.details),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-events-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <List className="h-5 w-5 text-accent" />
            Recent Security Events
          </h2>
          <p className="text-sm text-text-muted">
            Detaillierte Ansicht aller Sicherheitsereignisse
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchEvents}
            disabled={loading}
            className="bg-surface-1 hover:bg-surface-2 text-text border border-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={events.length === 0}
            className="bg-surface-1 hover:bg-surface-2 text-text border border-white/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-surface-1 rounded-lg">
        <Filter className="h-4 w-4 text-text-muted" />

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-2 border border-white/10 rounded-lg text-text"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-2 border border-white/10 rounded-lg text-text"
        >
          <option value="">All Types</option>
          <option value="prompt_injection">Prompt Injection</option>
          <option value="xss_attempt">XSS Attempt</option>
          <option value="rate_limit_exceeded">Rate Limit</option>
          <option value="auth_failure">Auth Failure</option>
          <option value="sql_injection">SQL Injection</option>
          <option value="brute_force">Brute Force</option>
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-3 py-1.5 text-sm bg-surface-2 border border-white/10 rounded-lg text-text"
        >
          <option value={25}>25 events</option>
          <option value={50}>50 events</option>
          <option value={100}>100 events</option>
          <option value={250}>250 events</option>
        </select>
      </div>

      <div className="hairline-b mb-4" />

      {loading ? (
        <div className="text-center py-8 text-text-muted">
          Loading events...
        </div>
      ) : events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-text-muted uppercase bg-surface-1">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Path</th>
                <th className="px-4 py-3 text-center">Blocked</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr
                  key={event.id}
                  className={`border-b border-white/10 hover:bg-surface-1 transition-colors ${
                    event.blocked ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    {new Date(event.timestamp).toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {event.type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    {getSeverityBadge(event.severity)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {event.ip || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {event.userId || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">
                    {event.path || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {event.blocked ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-500/20 text-red-400">
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-500/20 text-green-400">
                        Allowed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-text-muted">
          No security events found
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Auto-refresh alle 30s · Showing {events.length} of {limit} events
      </p>
    </div>
  );
}
