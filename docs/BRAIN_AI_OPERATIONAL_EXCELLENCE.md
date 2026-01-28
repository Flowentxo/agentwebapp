# 🎯 Brain AI - Operational Excellence Guide

**Version**: 1.0.0
**Status**: Production Operations
**Date**: 2025-10-26

---

## 📋 Table of Contents

1. [Operational Monitoring & Alerts](#operational-monitoring--alerts)
2. [Security & Compliance Audits](#security--compliance-audits)
3. [Support & Maintenance Automation](#support--maintenance-automation)
4. [Scaling & Performance Optimization](#scaling--performance-optimization)
5. [Feature Roadmap Implementation](#feature-roadmap-implementation)

---

## 🔍 1. Operational Monitoring & Alerts

### 1.1 Vollumfängliches Prometheus/Grafana Setup

#### Custom Metrics Exporter

```typescript
// lib/monitoring/metrics-exporter.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Initialize metrics
export const httpRequestsTotal = new Counter({
  name: 'brain_ai_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status', 'workspace_id']
});

export const httpRequestDuration = new Histogram({
  name: 'brain_ai_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'workspace_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const brainQueryDuration = new Histogram({
  name: 'brain_ai_query_duration_seconds',
  help: 'Brain AI query processing time',
  labelNames: ['query_type', 'workspace_id'],
  buckets: [0.5, 1, 2, 3, 5, 10, 15]
});

export const cacheHits = new Counter({
  name: 'brain_ai_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_type', 'workspace_id']
});

export const cacheMisses = new Counter({
  name: 'brain_ai_cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_type', 'workspace_id']
});

export const activeUsers = new Gauge({
  name: 'brain_ai_active_users',
  help: 'Number of active users',
  labelNames: ['workspace_id']
});

export const agentRequests = new Counter({
  name: 'brain_ai_agent_requests_total',
  help: 'Total agent requests',
  labelNames: ['agent_id', 'workspace_id', 'status']
});

export const databaseConnections = new Gauge({
  name: 'brain_ai_database_connections',
  help: 'Current database connections',
  labelNames: ['state']
});

export const documentCount = new Gauge({
  name: 'brain_ai_documents_total',
  help: 'Total number of documents',
  labelNames: ['workspace_id', 'status']
});

export const embeddingLatency = new Histogram({
  name: 'brain_ai_embedding_latency_seconds',
  help: 'OpenAI embedding generation latency',
  labelNames: ['model'],
  buckets: [0.5, 1, 2, 3, 5]
});

export const tokenUsage = new Counter({
  name: 'brain_ai_tokens_used_total',
  help: 'Total tokens consumed',
  labelNames: ['model', 'type', 'workspace_id'] // type: prompt, completion
});

export const costAccumulator = new Counter({
  name: 'brain_ai_cost_usd_total',
  help: 'Total cost in USD',
  labelNames: ['model', 'workspace_id']
});

// Metrics endpoint
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

// Update active users periodically
setInterval(async () => {
  const workspaces = await getActiveWorkspaces();

  for (const workspace of workspaces) {
    const count = await getActiveUserCount(workspace.id);
    activeUsers.set({ workspace_id: workspace.id }, count);
  }
}, 60000); // Every minute

// Update database connections
setInterval(async () => {
  const { active, idle } = await getDatabaseConnectionStats();
  databaseConnections.set({ state: 'active' }, active);
  databaseConnections.set({ state: 'idle' }, idle);
}, 30000); // Every 30 seconds
```

#### Metrics Middleware

```typescript
// middleware/metrics.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  httpRequestsTotal,
  httpRequestDuration,
  brainQueryDuration
} from '@/lib/monitoring/metrics-exporter';

export async function metricsMiddleware(
  req: NextRequest,
  handler: () => Promise<NextResponse>
) {
  const start = Date.now();
  const workspaceId = req.headers.get('x-workspace-id') || 'unknown';
  const path = new URL(req.url).pathname;
  const method = req.method;

  let response: NextResponse;
  let status = 200;

  try {
    response = await handler();
    status = response.status;
    return response;
  } catch (error) {
    status = 500;
    throw error;
  } finally {
    const duration = (Date.now() - start) / 1000;

    // Record metrics
    httpRequestsTotal.inc({
      method,
      path,
      status: status.toString(),
      workspace_id: workspaceId
    });

    httpRequestDuration.observe(
      { method, path, workspace_id: workspaceId },
      duration
    );

    // Track slow requests
    if (duration > 2) {
      console.warn(`[SLOW_REQUEST] ${method} ${path}: ${duration}s`);
    }
  }
}
```

### 1.2 Alertmanager mit Eskalationsstufen

#### Advanced Alert Rules

```yaml
# docker/monitoring/alerting-rules-advanced.yaml
groups:
  - name: brain_ai_critical
    interval: 30s
    rules:
      # Service completely down
      - alert: BrainAICompleteOutage
        expr: up{job="brain-ai-app"} == 0
        for: 1m
        labels:
          severity: critical
          team: devops
          escalate: pagerduty
        annotations:
          summary: "Brain AI is completely down"
          description: "No Brain AI pods are responding. Immediate action required."
          runbook: "https://docs.company.com/runbooks/brain-ai-outage"

      # Database unavailable
      - alert: DatabaseUnavailable
        expr: up{job="postgres"} == 0
        for: 2m
        labels:
          severity: critical
          team: database
          escalate: pagerduty
        annotations:
          summary: "PostgreSQL database is down"
          description: "Brain AI cannot reach PostgreSQL database"
          runbook: "https://docs.company.com/runbooks/postgres-outage"

      # Redis cache down
      - alert: RedisCacheDown
        expr: up{job="redis"} == 0
        for: 2m
        labels:
          severity: critical
          team: devops
          escalate: slack
        annotations:
          summary: "Redis cache is unavailable"
          description: "All cache operations will fail"

      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(brain_ai_http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(brain_ai_http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: critical
          team: devops
          escalate: slack
        annotations:
          summary: "Error rate above 5%"
          description: "Current error rate: {{ $value | humanizePercentage }}"

  - name: brain_ai_warning
    interval: 1m
    rules:
      # High latency
      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95,
            rate(brain_ai_http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 10m
        labels:
          severity: warning
          team: devops
          escalate: slack
        annotations:
          summary: "P95 latency above 2 seconds"
          description: "Current P95: {{ $value | humanizeDuration }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          container_memory_working_set_bytes{pod=~"brain-ai.*"}
          /
          container_spec_memory_limit_bytes{pod=~"brain-ai.*"} * 100 > 85
        for: 10m
        labels:
          severity: warning
          team: devops
          escalate: slack
        annotations:
          summary: "Memory usage above 85%"
          description: "Pod {{ $labels.pod }} memory: {{ $value | humanizePercentage }}"

      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          rate(container_cpu_usage_seconds_total{pod=~"brain-ai.*"}[5m]) * 100 > 80
        for: 15m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "CPU usage above 80%"
          description: "Pod {{ $labels.pod }} CPU: {{ $value | humanizePercentage }}"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: |
          sum(rate(brain_ai_cache_hits_total[5m]))
          /
          (sum(rate(brain_ai_cache_hits_total[5m])) + sum(rate(brain_ai_cache_misses_total[5m])))
          * 100 < 50
        for: 15m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "Cache hit rate below 50%"
          description: "Current hit rate: {{ $value | humanizePercentage }}"

      # Database connections high
      - alert: DatabaseConnectionsHigh
        expr: brain_ai_database_connections{state="active"} > 80
        for: 10m
        labels:
          severity: warning
          team: database
        annotations:
          summary: "High number of active database connections"
          description: "Active connections: {{ $value }}"

      # Slow queries
      - alert: SlowQueryDetected
        expr: |
          histogram_quantile(0.99,
            rate(brain_ai_query_duration_seconds_bucket[5m])
          ) > 5
        for: 5m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "P99 query time above 5 seconds"
          description: "Slow queries detected: {{ $value | humanizeDuration }}"

  - name: brain_ai_cost
    interval: 5m
    rules:
      # High cost rate
      - alert: HighCostRate
        expr: rate(brain_ai_cost_usd_total[1h]) * 24 > 50
        for: 1h
        labels:
          severity: warning
          team: finance
          escalate: email
        annotations:
          summary: "Projected daily cost above $50"
          description: "Current rate: ${{ $value | printf \"%.2f\" }}/day"

      # Workspace budget exceeded
      - alert: WorkspaceBudgetExceeded
        expr: brain_ai_workspace_cost_usd > brain_ai_workspace_budget_usd
        for: 5m
        labels:
          severity: warning
          team: finance
        annotations:
          summary: "Workspace {{ $labels.workspace_id }} exceeded budget"
          description: "Cost: ${{ $value | printf \"%.2f\" }}"

  - name: brain_ai_business
    interval: 5m
    rules:
      # No active users (potential issue)
      - alert: NoActiveUsers
        expr: sum(brain_ai_active_users) == 0
        for: 30m
        labels:
          severity: info
          team: product
        annotations:
          summary: "No active users detected"
          description: "Check if service is accessible"

      # High agent failure rate
      - alert: HighAgentFailureRate
        expr: |
          sum(rate(brain_ai_agent_requests_total{status="error"}[10m]))
          /
          sum(rate(brain_ai_agent_requests_total[10m])) * 100 > 10
        for: 10m
        labels:
          severity: warning
          team: ai
        annotations:
          summary: "Agent failure rate above 10%"
          description: "Check agent {{ $labels.agent_id }}"
```

#### Alertmanager Configuration with Escalation

```yaml
# docker/monitoring/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

# Templates for notifications
templates:
  - '/etc/alertmanager/templates/*.tmpl'

# Routing tree
route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'workspace_id']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h

  routes:
    # Critical alerts -> PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
      routes:
        - match:
            escalate: pagerduty
          receiver: 'pagerduty-critical'
        - match:
            escalate: slack
          receiver: 'slack-critical'

    # Warning alerts -> Slack
    - match:
        severity: warning
      receiver: 'slack-warnings'
      routes:
        - match:
            team: database
          receiver: 'slack-database'
        - match:
            team: finance
          receiver: 'email-finance'

    # Info alerts -> Email
    - match:
        severity: info
      receiver: 'email-team'

# Inhibition rules (suppress alerts)
inhibit_rules:
  # Don't alert on high CPU if service is down
  - source_match:
      severity: 'critical'
      alertname: 'BrainAICompleteOutage'
    target_match:
      severity: 'warning'
    equal: ['namespace', 'pod']

  # Don't alert on cache issues if Redis is down
  - source_match:
      alertname: 'RedisCacheDown'
    target_match:
      alertname: 'LowCacheHitRate'

# Receivers
receivers:
  - name: 'default-receiver'
    slack_configs:
      - channel: '#brain-ai-alerts'
        title: 'Brain AI Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Labels.alertname }}
          *Severity:* {{ .Labels.severity }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
        details:
          severity: '{{ .Labels.severity }}'
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
        client: 'Brain AI Monitoring'
        client_url: 'https://grafana.yourdomain.com'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#brain-ai-critical'
        color: 'danger'
        title: '🚨 CRITICAL ALERT'
        title_link: 'https://grafana.yourdomain.com'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Labels.alertname }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Runbook:* {{ .Annotations.runbook }}
          {{ end }}
        actions:
          - type: button
            text: 'View Grafana'
            url: 'https://grafana.yourdomain.com'
          - type: button
            text: 'View Runbook'
            url: '{{ .Annotations.runbook }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#brain-ai-alerts'
        color: 'warning'
        title: '⚠️ Warning Alert'
        text: |
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ end }}

  - name: 'slack-database'
    slack_configs:
      - channel: '#database-alerts'
        title: 'Database Alert'
        text: '{{ .Annotations.summary }}'

  - name: 'email-finance'
    email_configs:
      - to: 'finance@company.com'
        from: 'alerts@company.com'
        subject: 'Brain AI Cost Alert'
        html: |
          <h2>Cost Alert</h2>
          {{ range .Alerts }}
          <p><strong>{{ .Labels.alertname }}</strong></p>
          <p>{{ .Annotations.description }}</p>
          {{ end }}

  - name: 'email-team'
    email_configs:
      - to: 'devops@company.com'
        from: 'alerts@company.com'
        subject: 'Brain AI Info: {{ .GroupLabels.alertname }}'
```

### 1.3 Real-Time Query Load & Performance Tracking

#### Live Performance Dashboard

```typescript
// components/monitoring/LivePerformanceDashboard.tsx
'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  requestRate: number;
  errorRate: number;
  p95Latency: number;
  activeUsers: number;
  cacheHitRate: number;
  topQueries: Array<{ query: string; count: number }>;
  agentPerformance: Record<string, {
    requests: number;
    avgLatency: number;
    errorRate: number;
  }>;
}

export function LivePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const fetchMetrics = async () => {
      const response = await fetch('/api/monitoring/live-metrics');
      const data = await response.json();
      setMetrics(data);
    };

    // Initial fetch
    fetchMetrics();

    // Update every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  if (!metrics) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div className="live-performance-dashboard">
      <div className="header">
        <h2>Live Performance Metrics</h2>
        <button onClick={() => setIsLive(!isLive)}>
          {isLive ? '⏸️ Pause' : '▶️ Resume'}
        </button>
      </div>

      <div className="metrics-grid">
        {/* Request Rate */}
        <div className="metric-card">
          <h3>Request Rate</h3>
          <div className="value">{metrics.requestRate.toFixed(1)}</div>
          <div className="unit">req/s</div>
          <div className={`status ${metrics.requestRate > 100 ? 'high' : 'normal'}`}>
            {metrics.requestRate > 100 ? 'High Load' : 'Normal'}
          </div>
        </div>

        {/* Error Rate */}
        <div className="metric-card">
          <h3>Error Rate</h3>
          <div className="value">{metrics.errorRate.toFixed(2)}</div>
          <div className="unit">%</div>
          <div className={`status ${metrics.errorRate > 1 ? 'error' : 'ok'}`}>
            {metrics.errorRate > 1 ? '⚠️ Elevated' : '✓ OK'}
          </div>
        </div>

        {/* P95 Latency */}
        <div className="metric-card">
          <h3>P95 Latency</h3>
          <div className="value">{(metrics.p95Latency * 1000).toFixed(0)}</div>
          <div className="unit">ms</div>
          <div className={`status ${metrics.p95Latency > 2 ? 'slow' : 'fast'}`}>
            {metrics.p95Latency > 2 ? '🐌 Slow' : '⚡ Fast'}
          </div>
        </div>

        {/* Active Users */}
        <div className="metric-card">
          <h3>Active Users</h3>
          <div className="value">{metrics.activeUsers}</div>
          <div className="unit">users</div>
        </div>

        {/* Cache Hit Rate */}
        <div className="metric-card">
          <h3>Cache Hit Rate</h3>
          <div className="value">{metrics.cacheHitRate.toFixed(1)}</div>
          <div className="unit">%</div>
          <div className={`status ${metrics.cacheHitRate > 65 ? 'good' : 'low'}`}>
            {metrics.cacheHitRate > 65 ? '✓ Good' : '⚠️ Low'}
          </div>
        </div>
      </div>

      {/* Top Queries */}
      <div className="top-queries">
        <h3>Top Queries (Last 5 min)</h3>
        <table>
          <thead>
            <tr>
              <th>Query</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {metrics.topQueries.map((q, i) => (
              <tr key={i}>
                <td>{q.query.substring(0, 50)}...</td>
                <td>{q.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agent Performance */}
      <div className="agent-performance">
        <h3>Agent Performance</h3>
        <div className="agent-grid">
          {Object.entries(metrics.agentPerformance).map(([agentId, perf]) => (
            <div key={agentId} className="agent-card">
              <h4>{agentId}</h4>
              <div className="perf-stats">
                <div>
                  <span className="label">Requests:</span>
                  <span className="value">{perf.requests}</span>
                </div>
                <div>
                  <span className="label">Avg Latency:</span>
                  <span className="value">{(perf.avgLatency * 1000).toFixed(0)}ms</span>
                </div>
                <div>
                  <span className="label">Error Rate:</span>
                  <span className={`value ${perf.errorRate > 5 ? 'error' : 'ok'}`}>
                    {perf.errorRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### Live Metrics API

```typescript
// app/api/monitoring/live-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query as prometheusQuery } from '@/lib/monitoring/prometheus-client';
import { getDb } from '@/lib/db';
import { agentMessages } from '@/lib/db/schema';
import { desc, sql, and, gte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Query Prometheus for real-time metrics
    const [
      requestRateResult,
      errorRateResult,
      p95LatencyResult,
      activeUsersResult,
      cacheHitRateResult
    ] = await Promise.all([
      // Request rate (last 5 minutes)
      prometheusQuery('sum(rate(brain_ai_http_requests_total[5m]))'),

      // Error rate
      prometheusQuery(`
        sum(rate(brain_ai_http_requests_total{status=~"5.."}[5m]))
        /
        sum(rate(brain_ai_http_requests_total[5m])) * 100
      `),

      // P95 latency
      prometheusQuery(`
        histogram_quantile(0.95,
          rate(brain_ai_http_request_duration_seconds_bucket[5m])
        )
      `),

      // Active users
      prometheusQuery('sum(brain_ai_active_users)'),

      // Cache hit rate
      prometheusQuery(`
        sum(rate(brain_ai_cache_hits_total[5m]))
        /
        (sum(rate(brain_ai_cache_hits_total[5m])) + sum(rate(brain_ai_cache_misses_total[5m])))
        * 100
      `)
    ]);

    // Get top queries from database
    const topQueries = await db
      .select({
        query: sql<string>`content`,
        count: sql<number>`COUNT(*)`
      })
      .from(agentMessages)
      .where(and(
        sql`role = 'user'`,
        gte(agentMessages.createdAt, fiveMinutesAgo)
      ))
      .groupBy(sql`content`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // Get agent performance from Prometheus
    const agentPerformanceQuery = await prometheusQuery(`
      sum(rate(brain_ai_agent_requests_total[5m])) by (agent_id)
    `);

    const agentLatencyQuery = await prometheusQuery(`
      avg(rate(brain_ai_query_duration_seconds_sum[5m])) by (agent_id)
      /
      avg(rate(brain_ai_query_duration_seconds_count[5m])) by (agent_id)
    `);

    const agentErrorQuery = await prometheusQuery(`
      sum(rate(brain_ai_agent_requests_total{status="error"}[5m])) by (agent_id)
      /
      sum(rate(brain_ai_agent_requests_total[5m])) by (agent_id) * 100
    `);

    // Combine agent metrics
    const agentPerformance: Record<string, any> = {};

    agentPerformanceQuery.result.forEach((item: any) => {
      const agentId = item.metric.agent_id;
      agentPerformance[agentId] = {
        requests: parseFloat(item.value[1]),
        avgLatency: 0,
        errorRate: 0
      };
    });

    agentLatencyQuery.result.forEach((item: any) => {
      const agentId = item.metric.agent_id;
      if (agentPerformance[agentId]) {
        agentPerformance[agentId].avgLatency = parseFloat(item.value[1]);
      }
    });

    agentErrorQuery.result.forEach((item: any) => {
      const agentId = item.metric.agent_id;
      if (agentPerformance[agentId]) {
        agentPerformance[agentId].errorRate = parseFloat(item.value[1]);
      }
    });

    return NextResponse.json({
      requestRate: parseFloat(requestRateResult.result[0]?.value[1] || '0'),
      errorRate: parseFloat(errorRateResult.result[0]?.value[1] || '0'),
      p95Latency: parseFloat(p95LatencyResult.result[0]?.value[1] || '0'),
      activeUsers: parseInt(activeUsersResult.result[0]?.value[1] || '0'),
      cacheHitRate: parseFloat(cacheHitRateResult.result[0]?.value[1] || '0'),
      topQueries: topQueries.map(q => ({
        query: q.query,
        count: q.count
      })),
      agentPerformance,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[LIVE_METRICS]', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

---

## 🔒 2. Security & Compliance Audits

### 2.1 Automatisierte Container-Vulnerability-Scans

#### Daily Security Scan Workflow

```yaml
# .github/workflows/daily-security-scan.yml
name: Daily Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  workflow_dispatch:

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image for scanning
        run: |
          docker build -t brain-ai:scan -f docker/Dockerfile .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'brain-ai:scan'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH,MEDIUM'
          exit-code: '1'  # Fail on vulnerabilities

      - name: Upload Trivy results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Generate vulnerability report
        if: failure()
        run: |
          docker run --rm aquasec/trivy image --format json brain-ai:scan > vuln-report.json

      - name: Parse and summarize vulnerabilities
        if: failure()
        run: |
          cat > vulnerability-summary.md <<EOF
          # Security Vulnerability Report
          **Date**: $(date)
          **Image**: brain-ai:scan

          ## Summary
          $(cat vuln-report.json | jq -r '
            .Results[0].Vulnerabilities |
            group_by(.Severity) |
            map({
              severity: .[0].Severity,
              count: length
            }) |
            .[] |
            "- \(.severity): \(.count) vulnerabilities"
          ')

          ## Critical Vulnerabilities
          $(cat vuln-report.json | jq -r '
            .Results[0].Vulnerabilities |
            map(select(.Severity == "CRITICAL")) |
            .[] |
            "### \(.VulnerabilityID): \(.Title)\n**Package**: \(.PkgName)\n**Installed Version**: \(.InstalledVersion)\n**Fixed Version**: \(.FixedVersion // "N/A")\n"
          ')
          EOF

      - name: Create GitHub Issue for vulnerabilities
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('vulnerability-summary.md', 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Security Vulnerabilities Detected - ${new Date().toISOString().split('T')[0]}`,
              body: summary,
              labels: ['security', 'vulnerability', 'high-priority']
            });

      - name: Notify security team
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_SECURITY_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🚨 Security vulnerabilities detected in Brain AI container image",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Security Scan Failed*\nCritical vulnerabilities found in container image. Check GitHub Security tab for details."
                  }
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {
                        "type": "plain_text",
                        "text": "View Security Tab"
                      },
                      "url": "${{ github.server_url }}/${{ github.repository }}/security"
                    }
                  ]
                }
              ]
            }'

  snyk-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --json-file-output=snyk-results.json

      - name: Upload Snyk results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: snyk-results.json

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: |
          npm audit --json > npm-audit.json || true
          npm audit --audit-level=moderate

      - name: Check for critical vulnerabilities
        run: |
          CRITICAL=$(cat npm-audit.json | jq '.metadata.vulnerabilities.critical')
          HIGH=$(cat npm-audit.json | jq '.metadata.vulnerabilities.high')

          if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 5 ]; then
            echo "❌ Found $CRITICAL critical and $HIGH high severity vulnerabilities"
            exit 1
          fi

      - name: Upload npm audit results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: npm-audit-results
          path: npm-audit.json

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for secret scanning

      - name: Run gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  network-policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate NetworkPolicies
        run: |
          # Check if NetworkPolicies exist
          if [ ! -f "k8s/network-policy.yaml" ]; then
            echo "⚠️ WARNING: No NetworkPolicy configuration found"
            echo "Creating GitHub issue..."
          fi

      - name: Validate RBAC configuration
        run: |
          # Check for overly permissive roles
          if grep -r "- \"\*\"" k8s/*.yaml; then
            echo "❌ Found overly permissive RBAC rules"
            exit 1
          fi
```

### 2.2 SOC 2 & GDPR Compliance Automation

#### Compliance Audit Script

```bash
# scripts/compliance-audit.sh
#!/bin/bash

# ============================================
# Brain AI - Compliance Audit Script
# SOC 2 & GDPR Compliance Checks
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="brain-ai"
REPORT_FILE="compliance-audit-$(date +%Y%m%d-%H%M%S).md"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Brain AI - Compliance Audit${NC}"
echo -e "${GREEN}Date: $(date)${NC}"
echo -e "${GREEN}============================================${NC}"

# Initialize report
cat > $REPORT_FILE <<EOF
# Brain AI Compliance Audit Report

**Date**: $(date)
**Auditor**: Automated System
**Scope**: SOC 2 & GDPR Compliance

---

## Executive Summary

EOF

# ============================================
# SOC 2 Compliance Checks
# ============================================

echo -e "\n${BLUE}[SOC 2] Security Controls${NC}"

## CC6.1 - Logical Access Controls
echo -e "\n### CC6.1: Logical and Physical Access Controls" >> $REPORT_FILE

# Check authentication mechanisms
echo "Checking authentication..."
AUTH_CHECK=$(kubectl get deployment -n $NAMESPACE -o yaml | grep -c "JWT_SECRET" || echo "0")
if [ "$AUTH_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✓ JWT authentication configured${NC}"
    echo "- ✅ JWT authentication is properly configured" >> $REPORT_FILE
else
    echo -e "${RED}✗ JWT authentication not found${NC}"
    echo "- ❌ JWT authentication not configured" >> $REPORT_FILE
fi

# Check RBAC
echo "Checking RBAC..."
RBAC_ROLES=$(kubectl get roles,rolebindings -n $NAMESPACE --no-headers | wc -l)
echo "- Found $RBAC_ROLES RBAC configurations" >> $REPORT_FILE

## CC6.6 - Encryption
echo -e "\n### CC6.6: Encryption" >> $REPORT_FILE

# Check TLS configuration
TLS_CHECK=$(kubectl get service -n $NAMESPACE -o yaml | grep -c "tls" || echo "0")
if [ "$TLS_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✓ TLS encryption configured${NC}"
    echo "- ✅ TLS encryption for data in transit" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠ No TLS configuration found${NC}"
    echo "- ⚠️ TLS configuration not detected" >> $REPORT_FILE
fi

# Check encryption at rest
ENCRYPTION_CHECK=$(kubectl exec -n $NAMESPACE postgres-pod -- \
    psql -U postgres -d brain_ai -t -c "SHOW data_encryption;" 2>/dev/null || echo "off")
echo "- Database encryption at rest: $ENCRYPTION_CHECK" >> $REPORT_FILE

## CC7.2 - System Monitoring
echo -e "\n### CC7.2: System Monitoring" >> $REPORT_FILE

# Check Prometheus
PROMETHEUS_PODS=$(kubectl get pods -n $NAMESPACE -l app=prometheus --no-headers | wc -l)
if [ "$PROMETHEUS_PODS" -gt 0 ]; then
    echo -e "${GREEN}✓ Prometheus monitoring active${NC}"
    echo "- ✅ Prometheus monitoring operational" >> $REPORT_FILE
else
    echo -e "${RED}✗ Prometheus not found${NC}"
    echo "- ❌ Prometheus monitoring not found" >> $REPORT_FILE
fi

# Check Alertmanager
ALERT_PODS=$(kubectl get pods -n $NAMESPACE -l app=alertmanager --no-headers | wc -l)
echo "- Alerting system: $([ $ALERT_PODS -gt 0 ] && echo "✅ Active" || echo "❌ Not found")" >> $REPORT_FILE

## CC7.3 - Incident Response
echo -e "\n### CC7.3: Change Management and Incident Response" >> $REPORT_FILE

# Check audit logs
AUDIT_LOG_CHECK=$(kubectl logs -n $NAMESPACE -l app=brain-ai --tail=100 | grep -c "AUDIT" || echo "0")
if [ "$AUDIT_LOG_CHECK" -gt 0 ]; then
    echo "- ✅ Audit logging active ($AUDIT_LOG_CHECK recent events)" >> $REPORT_FILE
else
    echo "- ⚠️ No recent audit logs found" >> $REPORT_FILE
fi

# ============================================
# GDPR Compliance Checks
# ============================================

echo -e "\n${BLUE}[GDPR] Data Protection${NC}"

echo -e "\n## GDPR Compliance" >> $REPORT_FILE

## Article 25 - Data Protection by Design
echo -e "\n### Article 25: Data Protection by Design and Default" >> $REPORT_FILE

# Check for data minimization
echo "Checking data retention policies..."
RETENTION_POLICY=$(kubectl get configmap -n $NAMESPACE -o yaml | grep -c "DATA_RETENTION_DAYS" || echo "0")
if [ "$RETENTION_POLICY" -gt 0 ]; then
    echo "- ✅ Data retention policies configured" >> $REPORT_FILE
else
    echo "- ⚠️ Data retention policies not found" >> $REPORT_FILE
fi

## Article 32 - Security of Processing
echo -e "\n### Article 32: Security of Processing" >> $REPORT_FILE

# Check pseudonymization
HASH_CHECK=$(kubectl exec -n $NAMESPACE postgres-pod -- \
    psql -U postgres -d brain_ai -t -c "
    SELECT COUNT(*) FROM information_schema.columns
    WHERE column_name LIKE '%_hash' OR column_name LIKE '%_encrypted';
" 2>/dev/null || echo "0")
echo "- Pseudonymized fields: $HASH_CHECK" >> $REPORT_FILE

# Check backup encryption
BACKUP_ENCRYPTION=$(ls -la ./backups/*.rdb.gpg 2>/dev/null | wc -l || echo "0")
if [ "$BACKUP_ENCRYPTION" -gt 0 ]; then
    echo "- ✅ Backups are encrypted ($BACKUP_ENCRYPTION encrypted backups found)" >> $REPORT_FILE
else
    echo "- ⚠️ No encrypted backups found" >> $REPORT_FILE
fi

## Article 30 - Records of Processing Activities
echo -e "\n### Article 30: Records of Processing Activities" >> $REPORT_FILE

# Check processing logs
PROCESSING_LOGS=$(kubectl logs -n $NAMESPACE -l app=brain-ai --tail=1000 | \
    grep -c "PROCESSING\|QUERY\|INGEST" || echo "0")
echo "- Processing activity logs: $PROCESSING_LOGS recent entries" >> $REPORT_FILE

## Article 17 - Right to Erasure
echo -e "\n### Article 17: Right to Erasure" >> $REPORT_FILE

# Check for data deletion endpoints
DELETION_API=$(grep -r "DELETE.*user.*data" app/api/ 2>/dev/null | wc -l || echo "0")
if [ "$DELETION_API" -gt 0 ]; then
    echo "- ✅ Data deletion API endpoints exist" >> $REPORT_FILE
else
    echo "- ❌ No data deletion endpoints found" >> $REPORT_FILE
    echo "  **Action Required**: Implement user data deletion API" >> $REPORT_FILE
fi

## Article 20 - Data Portability
echo -e "\n### Article 20: Right to Data Portability" >> $REPORT_FILE

# Check for export functionality
EXPORT_CHECK=$(grep -r "export.*data\|download.*user" app/api/ 2>/dev/null | wc -l || echo "0")
if [ "$EXPORT_CHECK" -gt 0 ]; then
    echo "- ✅ Data export functionality exists" >> $REPORT_FILE
else
    echo "- ⚠️ Data export functionality not fully implemented" >> $REPORT_FILE
fi

## Article 33 - Breach Notification
echo -e "\n### Article 33: Breach Notification" >> $REPORT_FILE

# Check for security incident procedures
if [ -f "docs/incident-response-plan.md" ]; then
    echo "- ✅ Incident response plan documented" >> $REPORT_FILE
else
    echo "- ❌ Incident response plan not found" >> $REPORT_FILE
    echo "  **Action Required**: Document incident response procedures" >> $REPORT_FILE
fi

# ============================================
# Compliance Score
# ============================================

echo -e "\n## Compliance Score" >> $REPORT_FILE

# Calculate compliance percentage (simplified)
TOTAL_CHECKS=15
PASSED_CHECKS=$(grep -c "✅" $REPORT_FILE || echo "0")
COMPLIANCE_SCORE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)

echo "" >> $REPORT_FILE
echo "**Overall Compliance**: ${COMPLIANCE_SCORE}%" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if (( $(echo "$COMPLIANCE_SCORE >= 80" | bc -l) )); then
    echo "**Status**: ✅ COMPLIANT" >> $REPORT_FILE
    echo -e "${GREEN}✓ Compliance score: ${COMPLIANCE_SCORE}%${NC}"
elif (( $(echo "$COMPLIANCE_SCORE >= 60" | bc -l) )); then
    echo "**Status**: ⚠️ PARTIALLY COMPLIANT" >> $REPORT_FILE
    echo -e "${YELLOW}⚠ Compliance score: ${COMPLIANCE_SCORE}%${NC}"
else
    echo "**Status**: ❌ NON-COMPLIANT" >> $REPORT_FILE
    echo -e "${RED}✗ Compliance score: ${COMPLIANCE_SCORE}%${NC}"
fi

# ============================================
# Recommendations
# ============================================

echo -e "\n## Recommendations" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "### High Priority" >> $REPORT_FILE

# Generate recommendations based on findings
if [ "$AUTH_CHECK" -eq 0 ]; then
    echo "1. Implement JWT authentication" >> $REPORT_FILE
fi

if [ "$TLS_CHECK" -eq 0 ]; then
    echo "2. Configure TLS encryption for all services" >> $REPORT_FILE
fi

if [ "$DELETION_API" -eq 0 ]; then
    echo "3. Implement GDPR-compliant data deletion endpoints" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "### Medium Priority" >> $REPORT_FILE

if [ "$BACKUP_ENCRYPTION" -eq 0 ]; then
    echo "1. Encrypt all backup files" >> $REPORT_FILE
fi

if [ "$RETENTION_POLICY" -eq 0 ]; then
    echo "2. Define and implement data retention policies" >> $REPORT_FILE
fi

# ============================================
# Summary
# ============================================

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Audit Complete${NC}"
echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}"
echo -e "${GREEN}Compliance Score: ${COMPLIANCE_SCORE}%${NC}"
echo -e "${GREEN}============================================${NC}"

# Send report via email
if command -v mail &> /dev/null; then
    mail -s "Brain AI Compliance Audit - ${COMPLIANCE_SCORE}%" \
        compliance@company.com < $REPORT_FILE
fi

# Upload to compliance management system
# curl -X POST https://compliance-system.company.com/api/reports \
#     -H "Authorization: Bearer $COMPLIANCE_API_KEY" \
#     -F "report=@$REPORT_FILE"

exit 0
```

### 2.3 Wöchentliche Compliance-Reviews

#### Automated Weekly Compliance Check

```yaml
# .github/workflows/weekly-compliance.yml
name: Weekly Compliance Review

on:
  schedule:
    - cron: '0 10 * * 1'  # Every Monday at 10 AM
  workflow_dispatch:

jobs:
  compliance-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Run compliance audit
        run: |
          chmod +x scripts/compliance-audit.sh
          ./scripts/compliance-audit.sh

      - name: Upload compliance report
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-audit-*.md

      - name: Check compliance score
        run: |
          SCORE=$(grep "Overall Compliance" compliance-audit-*.md | grep -oP '\d+\.\d+')
          echo "Compliance Score: $SCORE%"

          if (( $(echo "$SCORE < 80" | bc -l) )); then
            echo "❌ Compliance score below threshold (80%)"
            exit 1
          fi

      - name: Create compliance issue if needed
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readdirSync('.')
              .find(f => f.startsWith('compliance-audit-'));
            const content = fs.readFileSync(report, 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Compliance Review Required',
              body: `## Compliance Audit Failed\n\n${content}`,
              labels: ['compliance', 'security', 'high-priority'],
              assignees: ['compliance-team']
            });

      - name: Send compliance report
        run: |
          # Send to Slack
          curl -X POST ${{ secrets.SLACK_COMPLIANCE_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "📊 Weekly Compliance Review Complete",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Compliance Audit Results*\nCompliance score: '"$SCORE"'%"
                  }
                }
              ]
            }'
```

---

## 🔧 3. Support & Maintenance Automation

### 3.1 Automatische Backups mit Verification

#### Comprehensive Backup System

```bash
# scripts/automated-backup.sh
#!/bin/bash

# ============================================
# Brain AI - Automated Backup System
# PostgreSQL + Redis + Configuration
# ============================================

set -e

# Configuration
BACKUP_DIR="./backups"
RETENTION_DAYS=30
S3_BUCKET="s3://brain-ai-backups"
NAMESPACE="brain-ai"
ENCRYPTION_KEY_FILE="./backup-encryption.key"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Brain AI - Automated Backup${NC}"
echo -e "${GREEN}Date: $(date)${NC}"
echo -e "${GREEN}============================================${NC}"

# Create backup directory
mkdir -p $BACKUP_DIR/{postgres,redis,config}

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_ID="backup-$TIMESTAMP"

# ============================================
# 1. PostgreSQL Backup
# ============================================

echo -e "\n${YELLOW}[1/5] Backing up PostgreSQL...${NC}"

POSTGRES_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}')
PG_BACKUP_FILE="$BACKUP_DIR/postgres/brain_ai_$TIMESTAMP.sql"

# Dump database
kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    pg_dump -U postgres -d brain_ai -F c -Z 9 > "$PG_BACKUP_FILE.dump"

# Also create plain SQL for easy restore
kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    pg_dump -U postgres -d brain_ai > "$PG_BACKUP_FILE"

# Verify backup
if [ -f "$PG_BACKUP_FILE" ]; then
    PG_SIZE=$(du -h "$PG_BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ PostgreSQL backup created: $PG_SIZE${NC}"

    # Test backup integrity
    echo "Verifying backup integrity..."
    if kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
        pg_restore --list "$PG_BACKUP_FILE.dump" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backup integrity verified${NC}"
    else
        echo -e "${RED}✗ Backup verification failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ PostgreSQL backup failed${NC}"
    exit 1
fi

# ============================================
# 2. Redis Backup
# ============================================

echo -e "\n${YELLOW}[2/5] Backing up Redis...${NC}"

REDIS_POD=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}')
REDIS_BACKUP_FILE="$BACKUP_DIR/redis/dump_$TIMESTAMP.rdb"

# Trigger BGSAVE
kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli BGSAVE

# Wait for save to complete
echo "Waiting for Redis BGSAVE to complete..."
while true; do
    SAVE_STATUS=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli LASTSAVE)
    sleep 2
    NEW_STATUS=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli LASTSAVE)
    if [ "$SAVE_STATUS" != "$NEW_STATUS" ]; then
        break
    fi
done

# Copy RDB file
kubectl cp $NAMESPACE/$REDIS_POD:/data/dump.rdb "$REDIS_BACKUP_FILE"

if [ -f "$REDIS_BACKUP_FILE" ]; then
    REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Redis backup created: $REDIS_SIZE${NC}"

    # Verify RDB file
    if file "$REDIS_BACKUP_FILE" | grep -q "Redis"; then
        echo -e "${GREEN}✓ Redis backup verified${NC}"
    else
        echo -e "${RED}✗ Invalid Redis backup file${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Redis backup failed${NC}"
    exit 1
fi

# ============================================
# 3. Configuration Backup
# ============================================

echo -e "\n${YELLOW}[3/5] Backing up configuration...${NC}"

CONFIG_BACKUP_FILE="$BACKUP_DIR/config/config_$TIMESTAMP.tar.gz"

# Backup Kubernetes configurations
kubectl get all,configmap,secret,pvc,pv -n $NAMESPACE -o yaml \
    > "$BACKUP_DIR/config/k8s-resources_$TIMESTAMP.yaml"

# Backup environment files (without secrets)
cp .env.production.template "$BACKUP_DIR/config/"

# Create tarball
tar -czf "$CONFIG_BACKUP_FILE" \
    -C "$BACKUP_DIR/config" \
    k8s-resources_$TIMESTAMP.yaml \
    .env.production.template

CONFIG_SIZE=$(du -h "$CONFIG_BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✓ Configuration backup created: $CONFIG_SIZE${NC}"

# ============================================
# 4. Encrypt Backups
# ============================================

echo -e "\n${YELLOW}[4/5] Encrypting backups...${NC}"

# Check if encryption key exists
if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
    echo "Generating encryption key..."
    openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
    chmod 600 "$ENCRYPTION_KEY_FILE"
fi

# Encrypt PostgreSQL backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$PG_BACKUP_FILE" \
    -out "$PG_BACKUP_FILE.enc" \
    -pass file:"$ENCRYPTION_KEY_FILE"

# Encrypt Redis backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$REDIS_BACKUP_FILE" \
    -out "$REDIS_BACKUP_FILE.enc" \
    -pass file:"$ENCRYPTION_KEY_FILE"

# Encrypt config backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$CONFIG_BACKUP_FILE" \
    -out "$CONFIG_BACKUP_FILE.enc" \
    -pass file:"$ENCRYPTION_KEY_FILE"

echo -e "${GREEN}✓ Backups encrypted${NC}"

# Remove unencrypted files
rm "$PG_BACKUP_FILE" "$REDIS_BACKUP_FILE" "$CONFIG_BACKUP_FILE"

# ============================================
# 5. Upload to S3 (or other cloud storage)
# ============================================

echo -e "\n${YELLOW}[5/5] Uploading to cloud storage...${NC}"

if command -v aws &> /dev/null; then
    # Upload to S3
    aws s3 cp "$PG_BACKUP_FILE.enc" \
        "$S3_BUCKET/postgres/brain_ai_$TIMESTAMP.sql.enc"

    aws s3 cp "$REDIS_BACKUP_FILE.enc" \
        "$S3_BUCKET/redis/dump_$TIMESTAMP.rdb.enc"

    aws s3 cp "$CONFIG_BACKUP_FILE.enc" \
        "$S3_BUCKET/config/config_$TIMESTAMP.tar.gz.enc"

    echo -e "${GREEN}✓ Backups uploaded to S3${NC}"
else
    echo -e "${YELLOW}⚠ AWS CLI not installed, skipping S3 upload${NC}"
fi

# ============================================
# 6. Cleanup Old Backups
# ============================================

echo -e "\n${YELLOW}Cleaning up old backups...${NC}"

# Remove local backups older than retention period
find $BACKUP_DIR -name "*.enc" -mtime +$RETENTION_DAYS -delete

# Remove old S3 backups
if command -v aws &> /dev/null; then
    aws s3 ls "$S3_BUCKET/" --recursive | \
        while read -r line; do
            createDate=$(echo $line | awk {'print $1" "$2'})
            createDate=$(date -d "$createDate" +%s)
            olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
            if [[ $createDate -lt $olderThan ]]; then
                fileName=$(echo $line | awk {'print $4'})
                if [[ $fileName != "" ]]; then
                    aws s3 rm "$S3_BUCKET/$fileName"
                fi
            fi
        done
fi

echo -e "${GREEN}✓ Old backups cleaned up (retention: $RETENTION_DAYS days)${NC}"

# ============================================
# 7. Generate Backup Report
# ============================================

REPORT_FILE="$BACKUP_DIR/backup-report-$TIMESTAMP.txt"

cat > "$REPORT_FILE" <<EOF
Brain AI Backup Report
=====================
Date: $(date)
Backup ID: $BACKUP_ID

PostgreSQL Backup:
- File: brain_ai_$TIMESTAMP.sql.enc
- Size: $PG_SIZE
- Status: ✓ Success

Redis Backup:
- File: dump_$TIMESTAMP.rdb.enc
- Size: $REDIS_SIZE
- Status: ✓ Success

Configuration Backup:
- File: config_$TIMESTAMP.tar.gz.enc
- Size: $CONFIG_SIZE
- Status: ✓ Success

Cloud Storage: S3
Retention: $RETENTION_DAYS days
Encryption: AES-256-CBC

Next Backup: $(date -d '+1 day')
EOF

echo -e "${GREEN}✓ Backup report generated${NC}"

# ============================================
# 8. Send Notification
# ============================================

# Send success notification to Slack
curl -X POST $SLACK_WEBHOOK_URL \
    -H 'Content-Type: application/json' \
    -d '{
        "text": "✅ Brain AI Backup Completed",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Backup completed successfully*\n• PostgreSQL: '"$PG_SIZE"'\n• Redis: '"$REDIS_SIZE"'\n• Config: '"$CONFIG_SIZE"'"
                }
            }
        ]
    }' 2>/dev/null || true

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Backup Complete!${NC}"
echo -e "${GREEN}Backup ID: $BACKUP_ID${NC}"
echo -e "${GREEN}Report: $REPORT_FILE${NC}"
echo -e "${GREEN}============================================${NC}"

exit 0
```

#### Backup Restoration Script

```bash
# scripts/restore-backup.sh
#!/bin/bash

# ============================================
# Brain AI - Backup Restoration Script
# ============================================

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-backup.sh <backup-timestamp>"
    echo "Example: ./restore-backup.sh 20251026-143000"
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="./backups"
NAMESPACE="brain-ai"
ENCRYPTION_KEY_FILE="./backup-encryption.key"

echo "============================================"
echo "Brain AI - Backup Restoration"
echo "Timestamp: $TIMESTAMP"
echo "============================================"

# Check if encryption key exists
if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
    echo "❌ Encryption key not found: $ENCRYPTION_KEY_FILE"
    exit 1
fi

# ============================================
# 1. Decrypt Backups
# ============================================

echo -e "\n[1/3] Decrypting backups..."

PG_BACKUP="$BACKUP_DIR/postgres/brain_ai_$TIMESTAMP.sql"
REDIS_BACKUP="$BACKUP_DIR/redis/dump_$TIMESTAMP.rdb"
CONFIG_BACKUP="$BACKUP_DIR/config/config_$TIMESTAMP.tar.gz"

# Decrypt PostgreSQL backup
if [ -f "$PG_BACKUP.enc" ]; then
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$PG_BACKUP.enc" \
        -out "$PG_BACKUP" \
        -pass file:"$ENCRYPTION_KEY_FILE"
    echo "✓ PostgreSQL backup decrypted"
else
    echo "❌ PostgreSQL backup not found"
    exit 1
fi

# Decrypt Redis backup
if [ -f "$REDIS_BACKUP.enc" ]; then
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$REDIS_BACKUP.enc" \
        -out "$REDIS_BACKUP" \
        -pass file:"$ENCRYPTION_KEY_FILE"
    echo "✓ Redis backup decrypted"
else
    echo "❌ Redis backup not found"
    exit 1
fi

# ============================================
# 2. Restore PostgreSQL
# ============================================

echo -e "\n[2/3] Restoring PostgreSQL..."

POSTGRES_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}')

# Create backup of current database
echo "Creating backup of current database..."
kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    pg_dump -U postgres -d brain_ai > "$BACKUP_DIR/postgres/pre-restore_$(date +%Y%m%d-%H%M%S).sql"

# Drop and recreate database
kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    psql -U postgres -c "DROP DATABASE IF EXISTS brain_ai_old;"

kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    psql -U postgres -c "ALTER DATABASE brain_ai RENAME TO brain_ai_old;"

kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    psql -U postgres -c "CREATE DATABASE brain_ai;"

# Restore backup
cat "$PG_BACKUP" | kubectl exec -i -n $NAMESPACE $POSTGRES_POD -- \
    psql -U postgres -d brain_ai

echo "✓ PostgreSQL restored"

# ============================================
# 3. Restore Redis
# ============================================

echo -e "\n[3/3] Restoring Redis..."

REDIS_POD=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}')

# Copy RDB file to pod
kubectl cp "$REDIS_BACKUP" $NAMESPACE/$REDIS_POD:/data/dump.rdb

# Restart Redis to load backup
kubectl rollout restart deployment/redis -n $NAMESPACE
kubectl rollout status deployment/redis -n $NAMESPACE

echo "✓ Redis restored"

# ============================================
# Verify Restoration
# ============================================

echo -e "\nVerifying restoration..."

# Check PostgreSQL
PG_COUNT=$(kubectl exec -n $NAMESPACE $POSTGRES_POD -- \
    psql -U postgres -d brain_ai -t -c "SELECT COUNT(*) FROM brain_documents;")
echo "Documents in database: $PG_COUNT"

# Check Redis
REDIS_KEYS=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli DBSIZE | grep -oP '\d+')
echo "Keys in Redis: $REDIS_KEYS"

echo -e "\n============================================"
echo "Restoration Complete!"
echo "============================================"

# Cleanup decrypted files
rm "$PG_BACKUP" "$REDIS_BACKUP"

exit 0
```

---

**Dies ist Teil 1 von 2 der Operational Excellence Guide. Der zweite Teil folgt mit:**
- Monitoring Dashboards für Systemzustand
- Scaling & Performance Optimization
- Feature Roadmap Implementation

Soll ich fortfahren?