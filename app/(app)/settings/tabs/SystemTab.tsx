/**
 * System Tab - Sidebar Design System
 * Includes: Health status, metrics, feature flags, data management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings2,
  Download,
  Upload,
  Trash2,
  Gauge,
  Users,
  Bot,
  Workflow,
  FileText,
  Sparkles,
  MemoryStick,
} from 'lucide-react';

// Types
interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  lastCheck: string;
  details?: Record<string, unknown>;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  uptime: number;
  timestamp: string;
}

interface PerformanceMetrics {
  responseTime: { p50: number; p95: number; p99: number; avg: number };
  errorRate: { last24h: number; last7d: number; trend: 'up' | 'down' | 'stable' };
  throughput: { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number };
  connections: { active: number; idle: number; total: number };
  memory: { used: number; total: number; percentage: number };
  cpu: { usage: number; cores: number };
}

interface UsageMetrics {
  api: { totalRequests: number; uniqueUsers: number; topEndpoints: Array<{ path: string; count: number }> };
  ai: { totalTokens: number; totalRequests: number; avgTokensPerRequest: number; costEstimate: number };
  storage: { documentsCount: number; totalSize: number; knowledgeBaseSize: number };
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'beta' | 'experiment' | 'limit';
  enabled: boolean;
  value?: string | number | boolean;
  rolloutPercentage?: number;
}

export default function SystemTab() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [activeTab, setActiveTab] = useState<'health' | 'metrics' | 'features' | 'data'>('health');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [healthRes, metricsRes, featuresRes] = await Promise.all([
        fetch('/api/settings/system/health'),
        fetch('/api/settings/system/metrics'),
        fetch('/api/settings/system/features'),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setPerformance(metricsData.performance);
        setUsage(metricsData.usage);
      }

      if (featuresRes.ok) {
        const featuresData = await featuresRes.json();
        setFeatures(featuresData.features || []);
      }
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleFeature = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/settings/system/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: id, enabled }),
      });
      setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)));
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch('/api/settings/system/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const data = await res.json();
      if (data.content) {
        const blob = new Blob([data.content], { type: data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleCleanup = async (operation: string) => {
    if (!confirm(`Möchten Sie "${operation}" wirklich ausführen?`)) return;
    try {
      await fetch(`/api/settings/system/data?operation=${operation}`, {
        method: 'DELETE',
      });
      fetchData(true);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-zinc-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20';
      case 'degraded': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'unhealthy': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-zinc-800/50 border-zinc-800';
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Activity className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getServiceIcon = (name: string) => {
    if (name.toLowerCase().includes('api')) return Server;
    if (name.toLowerCase().includes('database') || name.toLowerCase().includes('postgres')) return Database;
    if (name.toLowerCase().includes('redis')) return MemoryStick;
    if (name.toLowerCase().includes('openai') || name.toLowerCase().includes('ai')) return Sparkles;
    return Wifi;
  };

  if (isLoading) {
    return (
      <div className="w-full px-6 py-12 flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg border border-zinc-800 w-fit">
        {[
          { id: 'health', label: 'System Health', icon: Activity },
          { id: 'metrics', label: 'Metriken', icon: BarChart3 },
          { id: 'features', label: 'Features', icon: Zap },
          { id: 'data', label: 'Daten', icon: HardDrive },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-500/10 text-indigo-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Health Tab */}
      {activeTab === 'health' && health && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`p-6 rounded-lg border ${getStatusBg(health.overall)}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-lg ${
                  health.overall === 'healthy' ? 'bg-green-500/20' :
                  health.overall === 'degraded' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  <Activity className={`h-8 w-8 ${getStatusColor(health.overall)} ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    System {health.overall === 'healthy' ? 'Betriebsbereit' :
                            health.overall === 'degraded' ? 'Eingeschränkt' : 'Störung'}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {health.services.filter((s) => s.status === 'healthy').length}/{health.services.length} Dienste aktiv · Uptime: {formatUptime(health.uptime)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Aktualisiere...' : 'Aktualisieren'}
              </button>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {health.services.map((service) => {
              const Icon = getServiceIcon(service.name);
              return (
                <div key={service.name} className={`p-4 rounded-lg border ${getStatusBg(service.status)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${
                        service.status === 'healthy' ? 'bg-green-500/20' :
                        service.status === 'degraded' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                      }`}>
                        <Icon className={`h-5 w-5 ${getStatusColor(service.status)}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{service.name}</p>
                        <p className={`text-sm ${getStatusColor(service.status)}`}>
                          {service.message || service.status}
                        </p>
                      </div>
                    </div>
                    <StatusIcon status={service.status} />
                  </div>
                  {service.latency !== undefined && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {service.latency}ms Latenz
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && performance && usage && (
        <div className="space-y-6">
          {/* Performance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Response Time (P50)" value={`${performance.responseTime.p50}ms`} icon={Gauge} color="indigo" />
            <MetricCard
              title="Error Rate (24h)"
              value={`${performance.errorRate.last24h}%`}
              icon={AlertTriangle}
              color={performance.errorRate.last24h > 1 ? 'red' : 'green'}
              trend={performance.errorRate.trend}
            />
            <MetricCard title="Requests/Min" value={performance.throughput.requestsPerMinute.toLocaleString()} icon={TrendingUp} color="blue" />
            <MetricCard title="Active Connections" value={performance.connections.active.toString()} icon={Users} color="purple" />
          </div>

          {/* Resource Usage */}
          <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Ressourcen-Nutzung
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Speicher (Heap)</span>
                  <span className="text-white font-mono">{performance.memory.used}MB / {performance.memory.total}MB</span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      performance.memory.percentage > 80 ? 'bg-red-500' :
                      performance.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${performance.memory.percentage}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">CPU ({performance.cpu.cores} Cores)</span>
                  <span className="text-white font-mono">{performance.cpu.usage}%</span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      performance.cpu.usage > 80 ? 'bg-red-500' :
                      performance.cpu.usage > 60 ? 'bg-yellow-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${performance.cpu.usage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI & Storage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI-Nutzung (30 Tage)
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Tokens verbraucht</span>
                  <span className="text-white font-mono text-lg">{usage.ai.totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">AI-Anfragen</span>
                  <span className="text-white font-mono">{usage.ai.totalRequests.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-zinc-700 flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Geschätzte Kosten</span>
                  <span className="text-green-400 font-semibold">~${usage.ai.costEstimate.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Speicher
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Dokumente</span>
                  <span className="text-white font-mono">{usage.storage.documentsCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Gesamtgröße</span>
                  <span className="text-white font-mono">{usage.storage.totalSize} MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Knowledge Base</span>
                  <span className="text-white font-mono">{usage.storage.knowledgeBaseSize} MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {['core', 'beta', 'experiment', 'limit'].map((category) => {
            const categoryFeatures = features.filter((f) => f.category === category);
            if (categoryFeatures.length === 0) return null;

            const categoryInfo = {
              core: { label: 'Kern-Features', icon: Zap },
              beta: { label: 'Beta Features', icon: Bot },
              experiment: { label: 'Experimente', icon: Settings2 },
              limit: { label: 'Limits & Quotas', icon: Workflow },
            }[category];

            return (
              <div key={category} className="space-y-4">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                  {categoryInfo && <categoryInfo.icon className="w-4 h-4" />}
                  {categoryInfo?.label || category}
                </h3>
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 divide-y divide-zinc-700">
                  {categoryFeatures.map((feature) => (
                    <div key={feature.id} className={`p-4 ${feature.enabled ? 'bg-indigo-500/5' : ''}`}>
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-lg transition-colors ${
                            feature.enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {feature.category === 'limit' ? (
                              <span className="text-sm font-bold">
                                {typeof feature.value === 'number' ? feature.value.toLocaleString() : feature.value}
                              </span>
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{feature.name}</p>
                            <p className="text-xs text-zinc-500">{feature.description}</p>
                          </div>
                        </div>
                        {feature.category !== 'limit' && (
                          <button
                            onClick={() => toggleFeature(feature.id, !feature.enabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              feature.enabled ? 'bg-indigo-500' : 'bg-zinc-700'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${
                              feature.enabled ? 'translate-x-5' : 'translate-x-1'
                            }`} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Export */}
          <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Daten exportieren
            </h4>
            <p className="text-zinc-500 text-sm mb-4">
              Exportieren Sie alle Ihre Daten einschließlich Knowledge Base, Workflows und Einstellungen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('json')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Als JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Als CSV
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Daten importieren
            </h4>
            <p className="text-zinc-500 text-sm mb-4">
              Importieren Sie Daten aus einem vorherigen Export oder von anderen Systemen.
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 text-sm cursor-not-allowed"
              disabled
            >
              <Upload className="h-4 w-4" />
              Datei auswählen
            </button>
            <p className="text-xs text-zinc-600 mt-2">Unterstützt: JSON, CSV</p>
          </div>

          {/* Cleanup */}
          <div className="p-6 rounded-lg bg-red-500/5 border border-red-500/20">
            <h4 className="text-xs font-medium text-red-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Daten-Bereinigung
            </h4>
            <p className="text-zinc-500 text-sm mb-4">
              Bereinigen Sie temporäre Daten und alte Logs, um Speicherplatz freizugeben.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleCleanup('clear-cache')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-red-400 text-sm border border-red-500/30 transition-colors"
              >
                Cache leeren
              </button>
              <button
                onClick={() => handleCleanup('clear-old-logs')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-red-400 text-sm border border-red-500/30 transition-colors"
              >
                Alte Logs löschen
              </button>
              <button
                onClick={() => handleCleanup('orphaned-data')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-red-400 text-sm border border-red-500/30 transition-colors"
              >
                Verwaiste Daten bereinigen
              </button>
            </div>
          </div>

          {/* Version Info */}
          <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Server className="h-4 w-4" />
              Versionsinformationen
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Sintra OS Version</span>
                <span className="font-mono text-white bg-zinc-800 px-3 py-1 rounded-lg text-sm">v2.0.0-stable</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Build-Nummer</span>
                <span className="font-mono text-zinc-400 text-sm">#1847-prod</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Umgebung</span>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs font-medium text-green-400 uppercase tracking-wider">Produktion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'indigo' | 'green' | 'red' | 'blue' | 'purple' | 'yellow';
  trend?: 'up' | 'down' | 'stable';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
  };

  const iconColorClasses = {
    indigo: 'text-indigo-400',
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-4 w-4 ${iconColorClasses[color]}`} />
        {trend && (
          <span className={`text-xs ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{title}</p>
    </div>
  );
}
