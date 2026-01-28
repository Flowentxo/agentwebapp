"use client";

import { useState, useEffect } from "react";
import { Server, Database, HardDrive, AlertCircle, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  lastCheck: string;
}

interface SystemStatus {
  uptime: number;
  uptimeFormatted: string;
  services: ServiceHealth[];
  timestamp: string;
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch system status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-400";
      case "degraded":
        return "text-yellow-400";
      case "unhealthy":
        return "text-red-400";
      default:
        return "text-text-muted";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge variant="success">Healthy</Badge>;
      case "degraded":
        return <Badge variant="warning">Degraded</Badge>;
      case "unhealthy":
        return <Badge variant="error">Unhealthy</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  const triggerHealthCheck = async () => {
    setLoading(true);
    try {
      await fetch("/api/admin/system/health-check", { method: "POST" });
      await fetchStatus();
    } catch (error) {
      console.error("Health check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Systemstatus</h2>
          <p className="text-sm text-text-muted">
            Uptime: {status?.uptimeFormatted || "Lädt..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={triggerHealthCheck}
            disabled={loading}
            className="bg-surface-1 hover:bg-card/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Health Check
          </Button>
          <Button
            onClick={() => window.location.href = "/admin/agent-tests"}
            className="bg-surface-1 hover:bg-card/10"
          >
            Agent Tests
          </Button>
          <Button
            onClick={() => window.location.href = "/admin/agent-cleanup"}
            className="bg-surface-1 hover:bg-card/10"
          >
            Agent Cleanup
          </Button>
          <a
            href="/api/admin/logs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-surface-1 hover:bg-card/10 text-text transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" />
            API-Logs öffnen
          </a>
        </div>
      </div>

      <div className="hairline-b mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {status?.services.map((service) => (
          <div key={service.name} className="p-4 bg-surface-1 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {service.name === "api" && <Server className="h-5 w-5 text-accent" />}
                {service.name === "database" && <Database className="h-5 w-5 text-accent" />}
                {service.name === "cache" && <HardDrive className="h-5 w-5 text-accent" />}
                {service.name === "storage" && <HardDrive className="h-5 w-5 text-accent" />}
                <span className="font-medium text-text capitalize">{service.name}</span>
              </div>
              {service.status === "healthy" ? (
                <CheckCircle className={`h-5 w-5 ${getStatusColor(service.status)}`} />
              ) : (
                <AlertCircle className={`h-5 w-5 ${getStatusColor(service.status)}`} />
              )}
            </div>
            <div className="space-y-1">
              {getStatusBadge(service.status)}
              <p className="text-xs text-text-muted">Latenz: {service.latency}ms</p>
              <p className="text-xs text-text-muted mono">
                {new Date(service.lastCheck).toLocaleTimeString("de-DE")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {status && (
        <p className="text-xs text-text-muted mt-4">
          Letztes Update: {new Date(status.timestamp).toLocaleString("de-DE")}
        </p>
      )}
    </div>
  );
}
