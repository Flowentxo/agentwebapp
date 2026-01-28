"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type AuditCategory = "user" | "deployment" | "security" | "system" | "all";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  category: AuditCategory;
  details?: string;
  ipAddress?: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [category, setCategory] = useState<AuditCategory>("all");
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedUser, setSelectedUser] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (timeRange !== "all") params.set("timeRange", timeRange);
      if (selectedUser !== "all") params.set("user", selectedUser);

      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 60000); // 60s auto-refresh
    return () => clearInterval(interval);
  }, [category, timeRange, selectedUser]);

  const exportToCSV = () => {
    const headers = ["Zeitstempel", "Benutzer", "Aktion", "Ziel", "Kategorie", "IP-Adresse"];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toLocaleString("de-DE"),
      log.user,
      log.action,
      log.target,
      log.category,
      log.ipAddress || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadge = (category: AuditCategory) => {
    const variants: Record<AuditCategory, "default" | "success" | "warning" | "error" | "info"> = {
      user: "info",
      deployment: "success",
      security: "error",
      system: "warning",
      all: "default",
    };
    return <Badge variant={variants[category]}>{category}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    return date.toLocaleString("de-DE");
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Audit-Logs</h2>
          <p className="text-sm text-text-muted">Systemweite Aktivitätsprotokolle</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} className="bg-surface-1 hover:bg-card/10">
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
          <Button
            onClick={fetchLogs}
            disabled={loading}
            className="bg-surface-1 hover:bg-card/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="hairline-b mb-4" />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Kategorie</label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as AuditCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              <SelectItem value="user">Benutzer</SelectItem>
              <SelectItem value="deployment">Deployment</SelectItem>
              <SelectItem value="security">Sicherheit</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Zeitraum</label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Letzte Stunde</SelectItem>
              <SelectItem value="24h">Letzte 24 Stunden</SelectItem>
              <SelectItem value="7d">Letzte 7 Tage</SelectItem>
              <SelectItem value="30d">Letzte 30 Tage</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Benutzer</label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Benutzer</SelectItem>
              {/* Dynamically populated from logs */}
              {logs && logs.length > 0 && Array.from(new Set(logs.map((l) => l.user))).map((user) => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 bg-surface-1 rounded-lg border border-white/10 hover:bg-card/5"
          >
            <div className="flex-shrink-0 w-24 text-xs text-text-muted mono">
              {formatTimestamp(log.timestamp)}
            </div>

            {getCategoryBadge(log.category)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-text">{log.user}</span>
                <span className="text-sm text-text-muted">→</span>
                <span className="text-sm text-text">{log.action}</span>
              </div>
              <p className="text-sm text-text-muted">Ziel: {log.target}</p>
              {log.details && (
                <p className="text-xs text-text-muted mt-1 mono">{log.details}</p>
              )}
            </div>

            {log.ipAddress && (
              <div className="flex-shrink-0 text-xs text-text-muted mono">
                {log.ipAddress}
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            Keine Audit-Logs gefunden.
          </div>
        )}
      </div>

      <p className="text-xs text-text-muted mt-4">
        Zeigt {logs.length} Einträge · Live-Update alle 60s
      </p>
    </div>
  );
}
