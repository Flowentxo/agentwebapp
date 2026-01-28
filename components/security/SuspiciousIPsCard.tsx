"use client";

import { useState, useEffect } from "react";
import { Globe, AlertOctagon, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SuspiciousIP {
  ip: string;
  eventCount: number;
  isSuspicious: boolean;
  recentEvents: Array<{
    type: string;
    severity: string;
    timestamp: Date;
  }>;
}

export function SuspiciousIPsCard() {
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchSuspiciousIPs = async () => {
    try {
      const res = await fetch(`/api/security/suspicious-ips?threshold=${threshold}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch suspicious IPs");

      const data = await res.json();
      setSuspiciousIPs(data.suspiciousIPs);
    } catch (error) {
      console.error("[SUSPICIOUS_IPS] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspiciousIPs();
    const interval = setInterval(fetchSuspiciousIPs, 60000); // 1min refresh
    return () => clearInterval(interval);
  }, [threshold]);

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

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" />
            Suspicious IP Addresses
          </h2>
          <p className="text-sm text-text-muted">
            IPs mit auffälligem Verhalten
          </p>
        </div>

        {/* Threshold Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Threshold:</span>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-surface-1 border border-white/10 rounded-lg text-text"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="hairline-b mb-4" />

      {loading ? (
        <div className="text-center py-8 text-text-muted">
          Loading suspicious IPs...
        </div>
      ) : suspiciousIPs.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {suspiciousIPs.map((ipData) => (
            <div
              key={ipData.ip}
              className="p-3 bg-surface-1 rounded-lg border border-white/10 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {ipData.isSuspicious && (
                    <AlertOctagon className="h-4 w-4 text-red-400" />
                  )}
                  <span className="font-mono text-sm text-text font-semibold">
                    {ipData.ip}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {ipData.eventCount} events
                  </span>
                  <button
                    onClick={() =>
                      setExpanded(expanded === ipData.ip ? null : ipData.ip)
                    }
                    className="p-1 hover:bg-surface-2 rounded transition-colors"
                  >
                    <Eye className="h-4 w-4 text-text-muted" />
                  </button>
                </div>
              </div>

              {/* Recent Events (Expandable) */}
              {expanded === ipData.ip && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <h4 className="text-xs font-semibold text-text-muted mb-2">
                    Recent Events:
                  </h4>
                  {ipData.recentEvents.slice(0, 5).map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 bg-surface-2 rounded"
                    >
                      <span className="font-mono text-text-muted">
                        {event.type.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(event.severity)}
                        <span className="text-text-muted">
                          {new Date(event.timestamp).toLocaleTimeString("de-DE")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-green-400">
          ✓ No suspicious IPs detected
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Auto-refresh jede Minute · Threshold: {threshold} events
      </p>
    </div>
  );
}
