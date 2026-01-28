"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SecurityHealth {
  status: "healthy" | "warning" | "critical";
  criticalEvents: number;
  highEvents: number;
  totalEvents: number;
  blockedThreats: number;
  timestamp: string;
}

export function SecurityHealthCard() {
  const [health, setHealth] = useState<SecurityHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/security/health", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch health");

      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error("[SECURITY_HEALTH] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (health?.status) {
      case "healthy":
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-400" />;
      case "critical":
        return <XCircle className="h-6 w-6 text-red-400" />;
      default:
        return <Shield className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (health?.status) {
      case "healthy":
        return <Badge variant="success">Healthy</Badge>;
      case "warning":
        return <Badge variant="warning">Warning</Badge>;
      case "critical":
        return <Badge variant="error">Critical</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h2 className="text-lg font-semibold text-text">
              Security Health Status
            </h2>
            <p className="text-sm text-text-muted">
              Letzte Aktualisierung: {health ? new Date(health.timestamp).toLocaleTimeString("de-DE") : "-"}
            </p>
          </div>
        </div>
        {health && getStatusBadge()}
      </div>

      <div className="hairline-b mb-4" />

      {loading ? (
        <div className="text-center py-8 text-text-muted">
          Loading security health...
        </div>
      ) : health ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Critical Events */}
          <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="text-2xl font-semibold text-text">
                {health.criticalEvents}
              </span>
            </div>
            <p className="text-sm text-text-muted">Critical Events</p>
          </div>

          {/* High Priority Events */}
          <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <span className="text-2xl font-semibold text-text">
                {health.highEvents}
              </span>
            </div>
            <p className="text-sm text-text-muted">High Priority</p>
          </div>

          {/* Total Events */}
          <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-2xl font-semibold text-text">
                {health.totalEvents}
              </span>
            </div>
            <p className="text-sm text-text-muted">Total Events</p>
          </div>

          {/* Blocked Threats */}
          <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-2xl font-semibold text-text">
                {health.blockedThreats}
              </span>
            </div>
            <p className="text-sm text-text-muted">Threats Blocked</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-red-400">
          Failed to load security health data
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Auto-refresh alle 30s · Letzte Stunde
      </p>
    </div>
  );
}
