"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, AlertTriangle, CheckCircle, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SecurityStatus {
  activeSessions: number;
  activeTokens: number;
  failedLogins: number;
  lastPolicyCheck: {
    timestamp: string;
    status: "passed" | "failed" | "warning";
    issues: string[];
  };
  suspiciousActivity: {
    count: number;
    lastDetected: string;
  };
}

export function SecurityOverview() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch("/api/admin/security/overview");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch security status:", error);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    const interval = setInterval(fetchSecurityStatus, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const forceLogoutAll = async () => {
    if (
      !confirm(
        "Alle Benutzer werden abgemeldet und müssen sich neu anmelden. Fortfahren?"
      )
    )
      return;

    setLoading(true);
    try {
      await fetch("/api/admin/security/force-logout", { method: "POST" });
      await fetchSecurityStatus();
      alert("Alle Sessions wurden erfolgreich beendet.");
    } catch (error) {
      console.error("Force logout failed:", error);
      alert("Fehler beim Abmelden der Benutzer.");
    } finally {
      setLoading(false);
    }
  };

  const getPolicyStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return <Badge variant="success">Passed</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
      case "warning":
        return <Badge variant="warning">Warning</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Sicherheitsübersicht
          </h2>
          <p className="text-sm text-text-muted">
            Sessions, Tokens und Sicherheitsrichtlinien
          </p>
        </div>
        <Button
          onClick={forceLogoutAll}
          disabled={loading}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Force Logout All
        </Button>
      </div>

      <div className="hairline-b mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Active Sessions */}
        <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-2xl font-semibold text-text">
              {status?.activeSessions || 0}
            </span>
          </div>
          <p className="text-sm text-text-muted">Aktive Sessions</p>
        </div>

        {/* Active Tokens */}
        <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <Lock className="h-5 w-5 text-green-400" />
            <span className="text-2xl font-semibold text-text">
              {status?.activeTokens || 0}
            </span>
          </div>
          <p className="text-sm text-text-muted">Token-Status</p>
        </div>

        {/* Failed Logins */}
        <div className="p-4 bg-surface-1 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle
              className={`h-5 w-5 ${
                (status?.failedLogins || 0) > 10 ? "text-red-400" : "text-yellow-400"
              }`}
            />
            <span className="text-2xl font-semibold text-text">
              {status?.failedLogins || 0}
            </span>
          </div>
          <p className="text-sm text-text-muted">Failed Logins</p>
        </div>
      </div>

      {/* Policy Check Status */}
      {status?.lastPolicyCheck && (
        <div className="p-4 bg-surface-1 rounded-lg border border-white/10 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-semibold text-text">
                Letzter Policy-Check
              </h3>
            </div>
            {getPolicyStatusBadge(status.lastPolicyCheck.status)}
          </div>

          <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
            <span>
              {new Date(status.lastPolicyCheck.timestamp).toLocaleString("de-DE")}
            </span>
            <span className="mono">
              {Math.floor(
                (Date.now() - new Date(status.lastPolicyCheck.timestamp).getTime()) /
                  60000
              )}
              m ago
            </span>
          </div>

          {status.lastPolicyCheck.issues.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-text">Gefundene Issues:</p>
              {status.lastPolicyCheck.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-yellow-400"
                >
                  <AlertTriangle className="h-3 w-3 mt-0.5" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suspicious Activity */}
      {status?.suspiciousActivity && status.suspiciousActivity.count > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">
              Verdächtige Aktivität erkannt
            </h3>
          </div>
          <p className="text-sm text-text-muted">
            {status.suspiciousActivity.count} Ereignisse in den letzten 24h
          </p>
          <p className="text-xs text-text-muted mono">
            Zuletzt erkannt:{" "}
            {new Date(status.suspiciousActivity.lastDetected).toLocaleString("de-DE")}
          </p>
          <Button
            onClick={() => window.open("/api/admin/security/suspicious-activity", "_blank")}
            className="mt-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
          >
            Details anzeigen
          </Button>
        </div>
      )}

      {status && (
        <p className="text-xs text-text-muted mt-4">
          Auto-Refresh alle 30s ·{" "}
          {new Date(status.lastPolicyCheck.timestamp).toLocaleTimeString("de-DE")}
        </p>
      )}
    </div>
  );
}
