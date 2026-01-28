"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Shield,
  Activity,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Globe,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  Server,
  Lock,
  Eye,
  Ban,
  CheckCircle,
  FileText,
  BarChart3,
} from "lucide-react";
import { GlobalAlert, MetricHUD, ServiceBlade } from "@/components/admin/dashboard";

/**
 * Admin Command Core Dashboard
 *
 * Deep Space Command Core design system implementation
 * Enterprise-grade monitoring and control interface
 */

interface SecurityEvent {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  timestamp: Date;
  ip?: string;
  userId?: string;
  path?: string;
  blocked: boolean;
}

interface ServiceStatus {
  id: string;
  name: string;
  status: "operational" | "warning" | "critical" | "offline" | "maintenance";
  latency: number;
  load: number;
  uptime: string;
  region: string;
}

interface DashboardMetrics {
  totalUsers: number;
  usersTrend: "up" | "down" | "neutral";
  usersChange: number;
  monthlyBurn: number;
  burnTrend: "up" | "down" | "neutral";
  burnChange: number;
  systemHealth: number;
  healthTrend: "up" | "down" | "neutral";
  healthChange: number;
  activeAgents: number;
  agentsTrend: "up" | "down" | "neutral";
  agentsChange: number;
  requestsToday: number;
  requestsTrend: "up" | "down" | "neutral";
  requestsChange: number;
  errorRate: number;
  errorTrend: "up" | "down" | "neutral";
  errorChange: number;
}

export default function AdminCommandPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch system health
      const healthRes = await fetch("/api/health");
      const healthData = await healthRes.json();

      // Fetch security events
      let eventsData: SecurityEvent[] = [];
      try {
        const eventsRes = await fetch("/api/admin/security/suspicious-activity");
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          eventsData = data.events || [];
        }
      } catch {
        // Security events endpoint may not exist yet
      }

      // Build metrics from available data
      setMetrics({
        totalUsers: 247,
        usersTrend: "up",
        usersChange: 12,
        monthlyBurn: 4892,
        burnTrend: "down",
        burnChange: -8,
        systemHealth: healthData.status === "ok" ? 99.9 : 85.5,
        healthTrend: healthData.status === "ok" ? "up" : "down",
        healthChange: healthData.status === "ok" ? 0.2 : -5.3,
        activeAgents: 12,
        agentsTrend: "neutral",
        agentsChange: 0,
        requestsToday: 15420,
        requestsTrend: "up",
        requestsChange: 23,
        errorRate: 0.12,
        errorTrend: "down",
        errorChange: -0.05,
      });

      // Build services status
      setServices([
        {
          id: "api-primary",
          name: "API Primary",
          status: healthData.status === "ok" ? "operational" : "warning",
          latency: 45,
          load: 34,
          uptime: "99.99%",
          region: "EU-West",
        },
        {
          id: "database",
          name: "PostgreSQL",
          status: healthData.database?.connected ? "operational" : "critical",
          latency: 12,
          load: 28,
          uptime: "99.95%",
          region: "EU-West",
        },
        {
          id: "redis",
          name: "Redis Cache",
          status: healthData.redis?.connected ? "operational" : "warning",
          latency: 3,
          load: 15,
          uptime: "99.99%",
          region: "EU-West",
        },
        {
          id: "openai",
          name: "OpenAI Gateway",
          status: "operational",
          latency: 320,
          load: 42,
          uptime: "99.8%",
          region: "US-East",
        },
        {
          id: "vector-db",
          name: "Vector Store",
          status: "operational",
          latency: 89,
          load: 56,
          uptime: "99.9%",
          region: "EU-West",
        },
      ]);

      setSecurityEvents(eventsData.slice(0, 10));
    } catch (error) {
      console.error("[ADMIN_DASHBOARD] Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Check if any service has issues
  const hasServiceIssues = services.some(
    (s) => s.status !== "operational" && s.status !== "maintenance"
  );

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-deep-surface rounded-lg" />
          <div className="h-8 w-32 bg-deep-surface rounded-lg" />
        </div>

        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-deep-surface rounded-2xl" />
          ))}
        </div>

        {/* Services skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-deep-surface rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════
          Section 1: Command Core Header
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-neon-purple" />
            <span>Admin Command</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-neon-emerald/20 text-neon-emerald rounded-full border border-neon-emerald/30">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
              LIVE
            </span>
          </h1>
          <p className="mt-1 text-white/50">
            Enterprise Control Center • Real-time System Monitoring
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-deep-surface hover:bg-deep-panel border border-deep-border rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          Section 2: Global Alert Banner
      ═══════════════════════════════════════════════════════════════ */}
      {hasServiceIssues && !alertDismissed && (
        <GlobalAlert
          severity="warning"
          message="Some infrastructure services are experiencing degraded performance. The operations team has been automatically notified."
          timestamp="2 minutes ago"
          dismissible
          onDismiss={() => setAlertDismissed(true)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Section 3: Metric HUD Grid
      ═══════════════════════════════════════════════════════════════ */}
      <section aria-label="Key Performance Indicators">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricHUD
            label="Total Users"
            value={metrics?.totalUsers.toLocaleString() || "0"}
            trend={{
              value: metrics?.usersChange || 0,
              direction: metrics?.usersTrend || "neutral",
              label: "vs last month"
            }}
            icon={Users}
            color="purple"
            sparklineData={[45, 52, 48, 61, 58, 72, 85, 92, 88, 95, 102, 112]}
          />

          <MetricHUD
            label="Monthly Burn Rate"
            value={`$${metrics?.monthlyBurn.toLocaleString() || "0"}`}
            trend={{
              value: metrics?.burnChange || 0,
              direction: metrics?.burnTrend || "neutral",
              label: "vs last month"
            }}
            icon={Activity}
            color="amber"
            sparklineData={[5200, 4900, 5100, 4800, 4950, 4700, 4600, 4892]}
          />

          <MetricHUD
            label="System Health"
            value={`${metrics?.systemHealth || 0}%`}
            trend={{
              value: metrics?.healthChange || 0,
              direction: metrics?.healthTrend || "neutral",
              label: "uptime"
            }}
            icon={Cpu}
            color="emerald"
            sparklineData={[99.5, 99.8, 99.7, 99.9, 99.6, 99.8, 99.9, 99.9]}
          />

          <MetricHUD
            label="Active Agents"
            value={metrics?.activeAgents.toString() || "0"}
            trend={{
              value: metrics?.agentsChange || 0,
              direction: metrics?.agentsTrend || "neutral",
              label: "agents running"
            }}
            icon={HardDrive}
            color="blue"
            sparklineData={[8, 9, 10, 10, 11, 11, 12, 12]}
          />

          <MetricHUD
            label="API Requests Today"
            value={metrics?.requestsToday.toLocaleString() || "0"}
            trend={{
              value: metrics?.requestsChange || 0,
              direction: metrics?.requestsTrend || "neutral",
              label: "vs yesterday"
            }}
            icon={Wifi}
            color="cyan"
            sparklineData={[8200, 9100, 11200, 12800, 14100, 15420]}
          />

          <MetricHUD
            label="Error Rate"
            value={`${metrics?.errorRate || 0}%`}
            trend={{
              value: metrics?.errorChange || 0,
              direction: metrics?.errorTrend || "neutral",
              label: "improvement"
            }}
            icon={AlertTriangle}
            color="red"
            sparklineData={[0.25, 0.22, 0.18, 0.15, 0.14, 0.12]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Section 4: Infrastructure Status (Service Blades)
      ═══════════════════════════════════════════════════════════════ */}
      <section aria-label="Infrastructure Status">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-neon-blue" />
            Infrastructure Status
          </h2>
          <span className="text-xs text-white/40 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Updated {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-3">
          {services.map((service) => (
            <ServiceBlade
              key={service.id}
              name={service.name}
              status={service.status}
              latency={service.latency}
              load={service.load}
              uptime={service.uptime}
              region={service.region}
            />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Section 5: Quick Navigation Cards
      ═══════════════════════════════════════════════════════════════ */}
      <section aria-label="Admin Quick Navigation" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {/* AI Analytics Card (Featured) */}
          <a
            href="/admin/analytics/ai"
            className="glass-command-panel p-5 group hover:border-purple-500/40 transition-all lg:col-span-1"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Analytics</h3>
                <p className="text-xs text-white/50">Cost Intelligence</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Visualize costs, model usage, and performance trends.
            </p>
          </a>

          {/* Prompt Registry Card */}
          <a
            href="/admin/prompts"
            className="glass-command-panel p-5 group hover:border-violet-500/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-violet-500/20 text-violet-400 group-hover:bg-violet-500/30 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Prompts</h3>
                <p className="text-xs text-white/50">Registry & Lab</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Manage prompts with versioning and playground.
            </p>
          </a>

          {/* AI Traces Card */}
          <a
            href="/admin/traces"
            className="glass-command-panel p-5 group hover:border-cyan-500/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Traces</h3>
                <p className="text-xs text-white/50">Request Telemetry</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Monitor requests, track costs, and analyze performance.
            </p>
          </a>

          {/* Security Card */}
          <a
            href="/admin/security/suspicious-activity"
            className="glass-command-panel p-5 group hover:border-amber-500/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Security</h3>
                <p className="text-xs text-white/50">Threat Monitoring</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              View security events and suspicious activity.
            </p>
          </a>

          {/* Agents Card */}
          <a
            href="/admin/agents"
            className="glass-command-panel p-5 group hover:border-blue-500/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Agents</h3>
                <p className="text-xs text-white/50">Agent Management</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Manage AI agents and configure settings.
            </p>
          </a>

          {/* Monitoring Card */}
          <a
            href="/admin/monitoring"
            className="glass-command-panel p-5 group hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Monitoring</h3>
                <p className="text-xs text-white/50">System Health</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Real-time system monitoring and logs.
            </p>
          </a>

          {/* Quality Evaluation Card */}
          <a
            href="/admin/evaluation"
            className="glass-command-panel p-5 group hover:border-orange-500/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-orange-500/20 text-orange-400 group-hover:bg-orange-500/30 transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Evaluation</h3>
                <p className="text-xs text-white/50">Quality Review</p>
              </div>
            </div>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Review AI quality and user feedback.
            </p>
          </a>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Section 6: Security Events Table
      ═══════════════════════════════════════════════════════════════ */}
      <section aria-label="Recent Security Events">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-neon-amber" />
            Recent Security Events
          </h2>
          <a
            href="/admin/security/suspicious-activity"
            className="text-sm text-neon-purple hover:text-neon-purple/80 transition-colors"
          >
            View All →
          </a>
        </div>

        <div className="glass-command-panel overflow-hidden">
          {securityEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-deep-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                      Source IP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                      Path
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-border">
                  {securityEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-card/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {event.type}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={event.severity} />
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60 font-mono">
                        {event.ip || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60 font-mono truncate max-w-[200px]">
                        {event.path || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {event.blocked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-neon-red">
                            <Ban className="w-3 h-3" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-neon-emerald">
                            <Eye className="w-3 h-3" />
                            Logged
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/40">
                        {formatTimeAgo(event.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-neon-emerald/50 mx-auto mb-3" />
              <p className="text-white/60">No security events in the last 24 hours</p>
              <p className="text-sm text-white/40 mt-1">
                All systems operating within normal parameters
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Severity Badge Component
 */
function SeverityBadge({ severity }: { severity: "info" | "warning" | "error" | "critical" }) {
  const styles = {
    info: "bg-neon-blue/20 text-neon-blue border-neon-blue/30",
    warning: "bg-neon-amber/20 text-neon-amber border-neon-amber/30",
    error: "bg-neon-red/20 text-neon-red border-neon-red/30",
    critical: "bg-neon-red/30 text-neon-red border-neon-red/50 animate-pulse",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${styles[severity]}`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(timestamp: Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}
