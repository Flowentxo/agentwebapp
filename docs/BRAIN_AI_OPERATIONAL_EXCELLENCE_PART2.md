# 🎯 Brain AI - Operational Excellence Guide (Part 2)

**Version**: 1.0.0
**Status**: Production Operations
**Date**: 2025-10-26

---

## 📊 3.2 Monitoring Dashboards für Systemzustand & User-Traffic

### System Health Dashboard

```typescript
// components/admin/SystemHealthDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface SystemHealth {
  uptime: number;
  pods: {
    running: number;
    pending: number;
    failed: number;
  };
  resources: {
    cpu: { usage: number; limit: number };
    memory: { usage: number; limit: number };
  };
  traffic: {
    requestRate: number;
    errorRate: number;
    activeConnections: number;
  };
  database: {
    connections: number;
    queryRate: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    evictionRate: number;
  };
}

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHealth = async () => {
      const response = await fetch('/api/admin/system-health');
      const data = await response.json();

      setHealth(data.current);
      setHistory(prev => [
        ...prev.slice(-59), // Keep last 60 data points
        {
          timestamp: Date.now(),
          cpu: data.current.resources.cpu.usage,
          memory: data.current.resources.memory.usage,
          requestRate: data.current.traffic.requestRate,
          errorRate: data.current.traffic.errorRate
        }
      ]);
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return <div>Loading system health...</div>;
  }

  // Chart data
  const resourceChartData = {
    labels: history.map((_, i) => `${i * 10}s ago`).reverse(),
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: history.map(h => h.cpu).reverse(),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Memory Usage (%)',
        data: history.map(h => h.memory).reverse(),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  };

  const trafficChartData = {
    labels: history.map((_, i) => `${i * 10}s ago`).reverse(),
    datasets: [
      {
        label: 'Request Rate (req/s)',
        data: history.map(h => h.requestRate).reverse(),
        backgroundColor: 'rgba(139, 92, 246, 0.8)'
      }
    ]
  };

  const podStatusData = {
    labels: ['Running', 'Pending', 'Failed'],
    datasets: [
      {
        data: [health.pods.running, health.pods.pending, health.pods.failed],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }
    ]
  };

  const cpuPercentage = (health.resources.cpu.usage / health.resources.cpu.limit) * 100;
  const memoryPercentage = (health.resources.memory.usage / health.resources.memory.limit) * 100;

  return (
    <div className="system-health-dashboard">
      <header>
        <h1>System Health Dashboard</h1>
        <div className="uptime">
          Uptime: {Math.floor(health.uptime / 86400)}d {Math.floor((health.uptime % 86400) / 3600)}h
        </div>
      </header>

      {/* Key Metrics */}
      <div className="metrics-overview">
        <div className="metric-card">
          <h3>Request Rate</h3>
          <div className="value">{health.traffic.requestRate.toFixed(1)}</div>
          <div className="label">req/s</div>
          <div className={`status ${health.traffic.requestRate > 100 ? 'high' : 'normal'}`}>
            {health.traffic.requestRate > 100 ? 'High Load' : 'Normal'}
          </div>
        </div>

        <div className="metric-card">
          <h3>Error Rate</h3>
          <div className="value">{health.traffic.errorRate.toFixed(2)}</div>
          <div className="label">%</div>
          <div className={`status ${health.traffic.errorRate > 1 ? 'error' : 'ok'}`}>
            {health.traffic.errorRate > 1 ? '⚠️ Elevated' : '✓ OK'}
          </div>
        </div>

        <div className="metric-card">
          <h3>CPU Usage</h3>
          <div className="value">{cpuPercentage.toFixed(1)}</div>
          <div className="label">%</div>
          <div className="progress-bar">
            <div
              className={`progress ${cpuPercentage > 80 ? 'critical' : cpuPercentage > 60 ? 'warning' : 'ok'}`}
              style={{ width: `${cpuPercentage}%` }}
            />
          </div>
        </div>

        <div className="metric-card">
          <h3>Memory Usage</h3>
          <div className="value">{memoryPercentage.toFixed(1)}</div>
          <div className="label">%</div>
          <div className="progress-bar">
            <div
              className={`progress ${memoryPercentage > 85 ? 'critical' : memoryPercentage > 70 ? 'warning' : 'ok'}`}
              style={{ width: `${memoryPercentage}%` }}
            />
          </div>
        </div>

        <div className="metric-card">
          <h3>Cache Hit Rate</h3>
          <div className="value">{health.cache.hitRate.toFixed(1)}</div>
          <div className="label">%</div>
          <div className={`status ${health.cache.hitRate > 65 ? 'good' : 'low'}`}>
            {health.cache.hitRate > 65 ? '✓ Good' : '⚠️ Low'}
          </div>
        </div>

        <div className="metric-card">
          <h3>Active Connections</h3>
          <div className="value">{health.traffic.activeConnections}</div>
          <div className="label">connections</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Resource Usage Chart */}
        <div className="chart-card">
          <h3>Resource Usage (Last 10 Minutes)</h3>
          <Line
            data={resourceChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              }
            }}
            height={300}
          />
        </div>

        {/* Traffic Chart */}
        <div className="chart-card">
          <h3>Request Rate (Last 10 Minutes)</h3>
          <Bar
            data={trafficChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
            height={300}
          />
        </div>

        {/* Pod Status Chart */}
        <div className="chart-card">
          <h3>Pod Status</h3>
          <Doughnut
            data={podStatusData}
            options={{
              responsive: true,
              maintainAspectRatio: false
            }}
            height={300}
          />
          <div className="pod-stats">
            <div>Running: {health.pods.running}</div>
            <div>Pending: {health.pods.pending}</div>
            <div>Failed: {health.pods.failed}</div>
          </div>
        </div>
      </div>

      {/* Database & Cache Stats */}
      <div className="detailed-stats">
        <div className="stat-group">
          <h3>Database</h3>
          <table>
            <tbody>
              <tr>
                <td>Active Connections:</td>
                <td>{health.database.connections}</td>
              </tr>
              <tr>
                <td>Query Rate:</td>
                <td>{health.database.queryRate.toFixed(1)} q/s</td>
              </tr>
              <tr>
                <td>Slow Queries:</td>
                <td className={health.database.slowQueries > 10 ? 'warning' : ''}>
                  {health.database.slowQueries}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="stat-group">
          <h3>Cache (Redis)</h3>
          <table>
            <tbody>
              <tr>
                <td>Hit Rate:</td>
                <td className={health.cache.hitRate < 50 ? 'warning' : 'ok'}>
                  {health.cache.hitRate.toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td>Memory Usage:</td>
                <td>{health.cache.memoryUsage.toFixed(1)} MB</td>
              </tr>
              <tr>
                <td>Eviction Rate:</td>
                <td>{health.cache.evictionRate.toFixed(2)}/s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### User Traffic Analytics Dashboard

```typescript
// components/admin/UserTrafficDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';

interface UserTraffic {
  activeUsers: {
    total: number;
    byWorkspace: Record<string, number>;
    byRegion: Record<string, number>;
  };
  sessionStats: {
    avgDuration: number;
    totalSessions: number;
    bounceRate: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    avgTimeOnPage: number;
  }>;
  topQueries: Array<{
    query: string;
    count: number;
    avgResponseTime: number;
  }>;
  agentUsage: Record<string, {
    requests: number;
    avgLatency: number;
    satisfaction: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export function UserTrafficDashboard() {
  const [traffic, setTraffic] = useState<UserTraffic | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const fetchTraffic = async () => {
      const response = await fetch(`/api/admin/user-traffic?range=${timeRange}`);
      const data = await response.json();
      setTraffic(data);
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  if (!traffic) {
    return <div>Loading traffic data...</div>;
  }

  const deviceData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        data: [
          traffic.deviceBreakdown.desktop,
          traffic.deviceBreakdown.mobile,
          traffic.deviceBreakdown.tablet
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ]
      }
    ]
  };

  return (
    <div className="user-traffic-dashboard">
      <header>
        <h1>User Traffic Analytics</h1>
        <div className="time-range-selector">
          <button
            className={timeRange === '1h' ? 'active' : ''}
            onClick={() => setTimeRange('1h')}
          >
            Last Hour
          </button>
          <button
            className={timeRange === '24h' ? 'active' : ''}
            onClick={() => setTimeRange('24h')}
          >
            Last 24h
          </button>
          <button
            className={timeRange === '7d' ? 'active' : ''}
            onClick={() => setTimeRange('7d')}
          >
            Last 7 Days
          </button>
          <button
            className={timeRange === '30d' ? 'active' : ''}
            onClick={() => setTimeRange('30d')}
          >
            Last 30 Days
          </button>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="traffic-metrics">
        <div className="metric-card">
          <h3>Active Users</h3>
          <div className="value">{traffic.activeUsers.total}</div>
          <div className="label">users online</div>
        </div>

        <div className="metric-card">
          <h3>Total Sessions</h3>
          <div className="value">{traffic.sessionStats.totalSessions.toLocaleString()}</div>
          <div className="label">sessions</div>
        </div>

        <div className="metric-card">
          <h3>Avg Session Duration</h3>
          <div className="value">
            {Math.floor(traffic.sessionStats.avgDuration / 60)}:{(traffic.sessionStats.avgDuration % 60).toString().padStart(2, '0')}
          </div>
          <div className="label">minutes</div>
        </div>

        <div className="metric-card">
          <h3>Bounce Rate</h3>
          <div className="value">{traffic.sessionStats.bounceRate.toFixed(1)}</div>
          <div className="label">%</div>
          <div className={`status ${traffic.sessionStats.bounceRate > 50 ? 'warning' : 'ok'}`}>
            {traffic.sessionStats.bounceRate > 50 ? 'High' : 'Normal'}
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="device-breakdown">
        <h3>Device Breakdown</h3>
        <div className="chart-container">
          <Pie data={deviceData} />
        </div>
        <div className="device-stats">
          <div>Desktop: {traffic.deviceBreakdown.desktop}</div>
          <div>Mobile: {traffic.deviceBreakdown.mobile}</div>
          <div>Tablet: {traffic.deviceBreakdown.tablet}</div>
        </div>
      </div>

      {/* Top Pages */}
      <div className="top-pages">
        <h3>Top Pages</h3>
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>Views</th>
              <th>Avg Time on Page</th>
            </tr>
          </thead>
          <tbody>
            {traffic.topPages.map((page, i) => (
              <tr key={i}>
                <td>{page.path}</td>
                <td>{page.views.toLocaleString()}</td>
                <td>{page.avgTimeOnPage.toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Queries */}
      <div className="top-queries">
        <h3>Top Queries</h3>
        <table>
          <thead>
            <tr>
              <th>Query</th>
              <th>Count</th>
              <th>Avg Response Time</th>
            </tr>
          </thead>
          <tbody>
            {traffic.topQueries.map((q, i) => (
              <tr key={i}>
                <td>{q.query.substring(0, 50)}...</td>
                <td>{q.count}</td>
                <td>{(q.avgResponseTime * 1000).toFixed(0)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agent Usage */}
      <div className="agent-usage">
        <h3>Agent Usage Statistics</h3>
        <div className="agent-grid">
          {Object.entries(traffic.agentUsage).map(([agentId, stats]) => (
            <div key={agentId} className="agent-stat-card">
              <h4>{agentId}</h4>
              <div className="stats">
                <div>
                  <span className="label">Requests:</span>
                  <span className="value">{stats.requests.toLocaleString()}</span>
                </div>
                <div>
                  <span className="label">Avg Latency:</span>
                  <span className="value">{(stats.avgLatency * 1000).toFixed(0)}ms</span>
                </div>
                <div>
                  <span className="label">Satisfaction:</span>
                  <span className="value">{stats.satisfaction.toFixed(1)}⭐</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workspace Breakdown */}
      <div className="workspace-breakdown">
        <h3>Active Users by Workspace</h3>
        <table>
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Active Users</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(traffic.activeUsers.byWorkspace)
              .sort(([, a], [, b]) => b - a)
              .map(([workspace, count]) => (
                <tr key={workspace}>
                  <td>{workspace}</td>
                  <td>{count}</td>
                  <td>{((count / traffic.activeUsers.total) * 100).toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 🚀 4. Scaling & Performance Optimization

### 4.1 Horizontales Skalieren via Kubernetes HPA/VPA

#### Advanced HPA Configuration with Custom Metrics

```yaml
# k8s/hpa-advanced.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brain-ai-hpa-advanced
  namespace: brain-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brain-ai-blue
  minReplicas: 3
  maxReplicas: 20
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
        - type: Pods
          value: 2
          periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 4
          periodSeconds: 30
      selectPolicy: Max
  metrics:
    # CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    # Memory-based scaling
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

    # Custom metric: Request rate
    - type: Pods
      pods:
        metric:
          name: brain_ai_http_requests_rate
        target:
          type: AverageValue
          averageValue: "100"  # Scale if > 100 req/s per pod

    # Custom metric: Query latency
    - type: Pods
      pods:
        metric:
          name: brain_ai_query_latency_p95
        target:
          type: AverageValue
          averageValue: "2"  # Scale if P95 > 2s

    # Custom metric: Active connections
    - type: Pods
      pods:
        metric:
          name: brain_ai_active_connections
        target:
          type: AverageValue
          averageValue: "50"  # Scale if > 50 connections per pod

---
# Custom Metrics API Adapter
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-metrics-apiserver
  namespace: brain-ai

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-metrics-apiserver
  namespace: brain-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: custom-metrics-apiserver
  template:
    metadata:
      labels:
        app: custom-metrics-apiserver
    spec:
      serviceAccountName: custom-metrics-apiserver
      containers:
        - name: adapter
          image: k8s.gcr.io/prometheus-adapter/prometheus-adapter:v0.11.0
          args:
            - --prometheus-url=http://prometheus:9090
            - --metrics-relist-interval=30s
            - --v=4
            - --config=/etc/adapter/config.yaml
          volumeMounts:
            - name: config
              mountPath: /etc/adapter
      volumes:
        - name: config
          configMap:
            name: adapter-config

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: brain-ai
data:
  config.yaml: |
    rules:
      # Request rate metric
      - seriesQuery: 'brain_ai_http_requests_total'
        resources:
          overrides:
            namespace: {resource: "namespace"}
            pod: {resource: "pod"}
        name:
          matches: "^(.*)_total$"
          as: "${1}_rate"
        metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'

      # Query latency P95
      - seriesQuery: 'brain_ai_query_duration_seconds_bucket'
        resources:
          overrides:
            namespace: {resource: "namespace"}
            pod: {resource: "pod"}
        name:
          matches: "^(.*)_bucket$"
          as: "${1}_p95"
        metricsQuery: 'histogram_quantile(0.95, sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (le, <<.GroupBy>>))'

      # Active connections
      - seriesQuery: 'brain_ai_active_connections'
        resources:
          overrides:
            namespace: {resource: "namespace"}
            pod: {resource: "pod"}
        name:
          as: "brain_ai_active_connections"
        metricsQuery: 'sum(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)'
```

#### VPA Configuration

```yaml
# k8s/vpa-advanced.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: brain-ai-vpa
  namespace: brain-ai
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brain-ai-blue
  updatePolicy:
    updateMode: "Auto"  # Auto, Recreate, Initial, or Off
    minReplicas: 3
  resourcePolicy:
    containerPolicies:
      - containerName: brain-ai
        minAllowed:
          cpu: 250m
          memory: 256Mi
        maxAllowed:
          cpu: 4000m
          memory: 8Gi
        controlledResources:
          - cpu
          - memory
        controlledValues: RequestsAndLimits
        # Resource scaling factors
        mode: Auto

---
# PodDisruptionBudget to prevent excessive disruption during VPA
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: brain-ai-pdb
  namespace: brain-ai
spec:
  minAvailable: 2  # Always keep at least 2 pods running
  selector:
    matchLabels:
      app: brain-ai
```

### 4.2 Latenz- und Kosten-Optimierung durch Adaptive Modellwahl

#### Adaptive Model Selection

```typescript
// lib/ai/adaptive-model-selector.ts
import { CostTracker } from '@/lib/monitoring/cost-tracker';

interface ModelConfig {
  name: string;
  maxTokens: number;
  costPerToken: {
    input: number;
    output: number;
  };
  avgLatency: number; // in seconds
  qualityScore: number; // 0-100
}

const models: Record<string, ModelConfig> = {
  'gpt-4-turbo-preview': {
    name: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    costPerToken: {
      input: 0.01 / 1000,
      output: 0.03 / 1000
    },
    avgLatency: 2.5,
    qualityScore: 95
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    maxTokens: 4096,
    costPerToken: {
      input: 0.0005 / 1000,
      output: 0.0015 / 1000
    },
    avgLatency: 1.2,
    qualityScore: 80
  },
  'gpt-3.5-turbo-16k': {
    name: 'gpt-3.5-turbo-16k',
    maxTokens: 16384,
    costPerToken: {
      input: 0.003 / 1000,
      output: 0.004 / 1000
    },
    avgLatency: 1.8,
    qualityScore: 82
  }
};

interface SelectionCriteria {
  queryComplexity: 'low' | 'medium' | 'high';
  maxLatency?: number; // in seconds
  maxCost?: number; // in USD
  prioritize: 'cost' | 'latency' | 'quality' | 'balanced';
  workspaceBudget?: {
    remaining: number;
    projectedUsage: number;
  };
}

export class AdaptiveModelSelector {
  private costTracker = new CostTracker();

  /**
   * Select the best model based on criteria
   */
  async selectModel(
    queryText: string,
    criteria: SelectionCriteria
  ): Promise<ModelConfig> {
    const estimatedTokens = this.estimateTokens(queryText);
    const queryComplexity = criteria.queryComplexity || this.analyzeComplexity(queryText);

    // Filter models based on hard constraints
    let candidates = Object.values(models);

    // Filter by max latency
    if (criteria.maxLatency) {
      candidates = candidates.filter(m => m.avgLatency <= criteria.maxLatency!);
    }

    // Filter by max cost
    if (criteria.maxCost) {
      candidates = candidates.filter(m => {
        const estimatedCost = this.estimateCost(m, estimatedTokens);
        return estimatedCost <= criteria.maxCost!;
      });
    }

    // Check workspace budget
    if (criteria.workspaceBudget) {
      const { remaining, projectedUsage } = criteria.workspaceBudget;
      if (projectedUsage >= remaining * 0.9) {
        // Budget nearly exhausted, use cheapest model
        return this.getCheapestModel(candidates);
      }
    }

    // Score models based on priorities
    const scored = candidates.map(model => {
      let score = 0;

      switch (criteria.prioritize) {
        case 'cost':
          // Lower cost = higher score
          score = 100 - (this.estimateCost(model, estimatedTokens) * 1000);
          break;

        case 'latency':
          // Lower latency = higher score
          score = 100 - (model.avgLatency * 20);
          break;

        case 'quality':
          // Higher quality = higher score
          score = model.qualityScore;
          break;

        case 'balanced':
        default:
          // Balanced score
          const costScore = 100 - (this.estimateCost(model, estimatedTokens) * 1000);
          const latencyScore = 100 - (model.avgLatency * 20);
          const qualityScore = model.qualityScore;

          // Weighted average based on query complexity
          if (queryComplexity === 'high') {
            score = qualityScore * 0.5 + latencyScore * 0.3 + costScore * 0.2;
          } else if (queryComplexity === 'medium') {
            score = qualityScore * 0.4 + latencyScore * 0.4 + costScore * 0.2;
          } else {
            score = qualityScore * 0.3 + latencyScore * 0.4 + costScore * 0.3;
          }
          break;
      }

      return { model, score };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Return best model
    return scored[0]?.model || models['gpt-3.5-turbo'];
  }

  private analyzeComplexity(queryText: string): 'low' | 'medium' | 'high' {
    const length = queryText.length;
    const wordCount = queryText.split(/\s+/).length;
    const hasCode = /```|`/.test(queryText);
    const hasMultipleQuestions = (queryText.match(/\?/g) || []).length > 1;

    if (hasCode || wordCount > 100 || hasMultipleQuestions) {
      return 'high';
    } else if (wordCount > 30 || length > 150) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private estimateCost(model: ModelConfig, tokens: number): number {
    // Assume input:output ratio of 1:2
    const inputTokens = tokens;
    const outputTokens = tokens * 2;

    return (
      inputTokens * model.costPerToken.input +
      outputTokens * model.costPerToken.output
    );
  }

  private getCheapestModel(candidates: ModelConfig[]): ModelConfig {
    return candidates.reduce((cheapest, current) => {
      const cheapestCost = cheapest.costPerToken.input + cheapest.costPerToken.output;
      const currentCost = current.costPerToken.input + current.costPerToken.output;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  /**
   * Get model recommendation with explanation
   */
  async getRecommendation(
    queryText: string,
    criteria: SelectionCriteria
  ): Promise<{
    model: ModelConfig;
    reasoning: string;
    alternatives: Array<{ model: ModelConfig; reason: string }>;
  }> {
    const selectedModel = await this.selectModel(queryText, criteria);
    const estimatedTokens = this.estimateTokens(queryText);
    const estimatedCost = this.estimateCost(selectedModel, estimatedTokens);

    let reasoning = `Selected ${selectedModel.name} based on `;
    reasoning += `${criteria.prioritize} priority. `;
    reasoning += `Estimated cost: $${estimatedCost.toFixed(4)}, `;
    reasoning += `latency: ~${selectedModel.avgLatency}s, `;
    reasoning += `quality: ${selectedModel.qualityScore}/100.`;

    // Find alternatives
    const alternatives = Object.values(models)
      .filter(m => m.name !== selectedModel.name)
      .slice(0, 2)
      .map(m => ({
        model: m,
        reason: this.getAlternativeReason(m, selectedModel)
      }));

    return {
      model: selectedModel,
      reasoning,
      alternatives
    };
  }

  private getAlternativeReason(
    alternative: ModelConfig,
    selected: ModelConfig
  ): string {
    if (alternative.avgLatency < selected.avgLatency) {
      return `Faster response (~${alternative.avgLatency}s vs ${selected.avgLatency}s)`;
    }

    const altCost = alternative.costPerToken.input + alternative.costPerToken.output;
    const selCost = selected.costPerToken.input + selected.costPerToken.output;

    if (altCost < selCost) {
      return `Lower cost (${((selCost - altCost) / selCost * 100).toFixed(0)}% cheaper)`;
    }

    if (alternative.qualityScore > selected.qualityScore) {
      return `Higher quality (${alternative.qualityScore} vs ${selected.qualityScore})`;
    }

    return `Balanced alternative`;
  }
}

// Usage example
const selector = new AdaptiveModelSelector();

const recommendation = await selector.getRecommendation(
  "Analyze this complex sales data and provide insights",
  {
    queryComplexity: 'high',
    prioritize: 'balanced',
    workspaceBudget: {
      remaining: 50,
      projectedUsage: 45
    }
  }
);

console.log(`Using ${recommendation.model.name}`);
console.log(`Reasoning: ${recommendation.reasoning}`);
```

### 4.3 Automatisierte Last- und Performancetests

#### Continuous Performance Testing

```yaml
# .github/workflows/performance-test.yml
name: Continuous Performance Testing

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to test'
        required: true
        type: choice
        options:
          - staging
          - production
      scenario:
        description: 'Test scenario'
        required: true
        type: choice
        options:
          - smoke
          - load
          - stress
          - spike

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run performance test
        env:
          BASE_URL: ${{ inputs.environment == 'production' && secrets.PROD_URL || secrets.STAGING_URL }}
        run: |
          k6 run \
            --out json=performance-results.json \
            --summary-export=summary.json \
            tests/performance/k6-load-test.js

      - name: Parse results
        id: parse
        run: |
          # Extract key metrics
          AVG_DURATION=$(jq -r '.metrics.http_req_duration.values.avg' summary.json)
          P95_DURATION=$(jq -r '.metrics.http_req_duration.values["p(95)"]' summary.json)
          ERROR_RATE=$(jq -r '.metrics.http_req_failed.values.rate' summary.json)

          echo "avg_duration=$AVG_DURATION" >> $GITHUB_OUTPUT
          echo "p95_duration=$P95_DURATION" >> $GITHUB_OUTPUT
          echo "error_rate=$ERROR_RATE" >> $GITHUB_OUTPUT

      - name: Check thresholds
        run: |
          # Fail if thresholds exceeded
          AVG_DURATION=${{ steps.parse.outputs.avg_duration }}
          P95_DURATION=${{ steps.parse.outputs.p95_duration }}
          ERROR_RATE=${{ steps.parse.outputs.error_rate }}

          if (( $(echo "$P95_DURATION > 2000" | bc -l) )); then
            echo "❌ P95 duration exceeded threshold: ${P95_DURATION}ms > 2000ms"
            exit 1
          fi

          if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
            echo "❌ Error rate exceeded threshold: ${ERROR_RATE} > 0.05"
            exit 1
          fi

          echo "✓ All thresholds passed"

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            performance-results.json
            summary.json

      - name: Create performance report
        run: |
          cat > performance-report.md <<EOF
          # Performance Test Report

          **Environment**: ${{ inputs.environment }}
          **Scenario**: ${{ inputs.scenario }}
          **Date**: $(date)

          ## Results

          | Metric | Value | Threshold | Status |
          |--------|-------|-----------|--------|
          | Avg Response Time | ${AVG_DURATION}ms | < 1000ms | $([ $(echo "$AVG_DURATION < 1000" | bc -l) -eq 1 ] && echo "✅" || echo "⚠️") |
          | P95 Response Time | ${P95_DURATION}ms | < 2000ms | $([ $(echo "$P95_DURATION < 2000" | bc -l) -eq 1 ] && echo "✅" || echo "⚠️") |
          | Error Rate | ${ERROR_RATE} | < 0.05 | $([ $(echo "$ERROR_RATE < 0.05" | bc -l) -eq 1 ] && echo "✅" || echo "⚠️") |

          ## Detailed Metrics

          $(jq -r '.metrics | to_entries[] | "- **\(.key)**: \(.value.values | to_entries[] | "\(.key): \(.value)")"' summary.json)
          EOF

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('performance-report.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

      - name: Send metrics to monitoring
        run: |
          # Send to Prometheus Pushgateway
          cat <<EOF | curl --data-binary @- http://pushgateway:9091/metrics/job/performance_test
          # TYPE performance_test_duration_ms gauge
          performance_test_duration_ms{percentile="avg"} $AVG_DURATION
          performance_test_duration_ms{percentile="p95"} $P95_DURATION
          # TYPE performance_test_error_rate gauge
          performance_test_error_rate $ERROR_RATE
          EOF

      - name: Notify team
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_PERF_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "⚠️ Performance test failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Performance Test Failed*\nEnvironment: ${{ inputs.environment }}\nScenario: ${{ inputs.scenario }}"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {
                      "type": "mrkdwn",
                      "text": "*P95 Latency:*\n'"$P95_DURATION"'ms"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Error Rate:*\n'"$ERROR_RATE"'"
                    }
                  ]
                }
              ]
            }'
```

---

## 🎯 5. Feature Roadmap Implementation

### 5.1 Mobile Apps & External Integrations

#### Mobile API Endpoints

```typescript
// app/api/mobile/v1/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { brainDocuments, agentMessages } from '@/lib/db/schema';
import { and, eq, gte } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const workspaceId = req.headers.get('x-workspace-id');
    const deviceId = req.headers.get('x-device-id');

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { lastSyncTime, changedItems } = body;

    const db = getDb();

    // Get updates since last sync
    const documentsUpdated = await db
      .select()
      .from(brainDocuments)
      .where(and(
        eq(brainDocuments.workspaceId, workspaceId),
        gte(brainDocuments.updatedAt, new Date(lastSyncTime))
      ))
      .limit(100);

    const messagesUpdated = await db
      .select()
      .from(agentMessages)
      .where(and(
        eq(agentMessages.workspaceId, workspaceId),
        eq(agentMessages.userId, userId),
        gte(agentMessages.createdAt, new Date(lastSyncTime))
      ))
      .limit(100);

    // Apply changes from mobile device
    if (changedItems?.documents) {
      for (const doc of changedItems.documents) {
        await db
          .insert(brainDocuments)
          .values({
            ...doc,
            workspaceId,
            metadata: {
              ...doc.metadata,
              source: 'mobile',
              deviceId
            }
          })
          .onConflictDoUpdate({
            target: brainDocuments.id,
            set: {
              content: doc.content,
              updatedAt: new Date()
            }
          });
      }
    }

    return NextResponse.json({
      success: true,
      syncTime: new Date().toISOString(),
      updates: {
        documents: documentsUpdated,
        messages: messagesUpdated
      },
      conflicts: [] // Handle conflicts if needed
    });
  } catch (error) {
    console.error('[MOBILE_SYNC]', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

#### Zapier Integration

```typescript
// app/api/webhooks/zapier/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { brainDocuments } from '@/lib/db/schema';
import { BrainService } from '@/lib/brain/BrainService';

// Zapier polling trigger
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');

    // Validate API key
    if (!apiKey || !isValidApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const db = getDb();

    // Get recent documents (last 24 hours)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const documents = await db
      .select()
      .from(brainDocuments)
      .where(gte(brainDocuments.createdAt, since))
      .limit(100);

    return NextResponse.json(documents);
  } catch (error) {
    console.error('[ZAPIER_POLLING]', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// Zapier instant trigger (webhook)
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey || !isValidApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { hookUrl } = body;

    // Subscribe to webhook
    await subscribeWebhook(hookUrl, apiKey);

    return NextResponse.json({
      success: true,
      message: 'Webhook subscribed'
    });
  } catch (error) {
    console.error('[ZAPIER_WEBHOOK]', error);
    return NextResponse.json(
      { error: 'Failed to subscribe webhook' },
      { status: 500 }
    );
  }
}

// Zapier action: Create document
export async function PUT(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey || !isValidApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, content, tags, workspaceId } = body;

    const brainService = new BrainService();

    const document = await brainService.ingestDocument({
      title,
      content,
      tags: tags || [],
      metadata: {
        source: 'zapier',
        createdVia: 'api'
      },
      workspaceId
    });

    return NextResponse.json({
      success: true,
      documentId: document.id
    });
  } catch (error) {
    console.error('[ZAPIER_ACTION]', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

function isValidApiKey(apiKey: string): boolean {
  // Implement API key validation
  return true; // Placeholder
}

async function subscribeWebhook(hookUrl: string, apiKey: string) {
  // Store webhook subscription
  // Implementation depends on your storage solution
}
```

---

## 📝 Implementation Checklist

### Phase 1: Monitoring & Alerting (Week 1-2)
- [ ] Deploy Prometheus with custom metrics
- [ ] Configure Alertmanager with escalation
- [ ] Create Grafana dashboards (System Health, User Traffic)
- [ ] Set up Slack/PagerDuty integration
- [ ] Configure alert rules and thresholds

### Phase 2: Security & Compliance (Week 3-4)
- [ ] Implement automated vulnerability scanning
- [ ] Set up SOC 2 compliance checks
- [ ] Configure GDPR compliance automation
- [ ] Create incident response workflows
- [ ] Weekly compliance review automation

### Phase 3: Backup & Maintenance (Week 5-6)
- [ ] Automated backup system (PostgreSQL + Redis)
- [ ] Backup encryption and cloud upload
- [ ] Backup restoration testing
- [ ] Database maintenance scripts
- [ ] Redis persistence automation

### Phase 4: Scaling & Performance (Week 7-8)
- [ ] HPA with custom metrics
- [ ] VPA configuration
- [ ] Adaptive model selection
- [ ] Continuous performance testing
- [ ] Load test automation

### Phase 5: Feature Extensions (Week 9-12)
- [ ] Mobile API endpoints
- [ ] Zapier integration
- [ ] Slack bot integration
- [ ] Microsoft Teams connector
- [ ] Public API expansion

---

## 📞 Support & Resources

### Documentation
- [Part 1: Operational Excellence](./BRAIN_AI_OPERATIONAL_EXCELLENCE.md)
- [Next Steps Roadmap](./BRAIN_AI_NEXT_STEPS_ROADMAP.md)
- [Post-Deployment Operations](./BRAIN_AI_POST_DEPLOYMENT.md)

### Monitoring Dashboards
- Grafana: http://grafana.yourdomain.com
- Prometheus: http://prometheus.yourdomain.com
- System Health: `/admin/system-health`
- User Traffic: `/admin/user-traffic`

### Team Contacts
- **DevOps Team**: devops@company.com
- **Security Team**: security@company.com
- **On-Call**: #on-call Slack (24/7)

---

**Version**: 1.0.0
**Status**: Production Operations Guide
**Last Updated**: 2025-10-26
