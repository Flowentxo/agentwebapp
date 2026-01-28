# 🔔 OAuth2 Integration - Monitoring & Alerts Setup

**Version:** 1.0.0
**Date:** 2025-10-27

---

## 📊 Overview

Complete monitoring setup for OAuth2 integration with:
- Real-time metrics tracking
- Automated alerts
- Health checks
- Error reporting
- Performance monitoring

---

## 🎯 Key Metrics to Monitor

### 1. **OAuth Flow Metrics**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `oauth_initiations_total` | Total OAuth flow starts | - | - |
| `oauth_connections_success` | Successful connections | >95% | <90% |
| `oauth_connections_failed` | Failed connections | <5% | >10% |
| `oauth_connection_duration_ms` | Time to complete OAuth | <1000ms | >3000ms |
| `oauth_error_rate` | Overall error percentage | <1% | >5% |

### 2. **Token Management Metrics**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `oauth_refresh_attempts` | Token refresh attempts | - | - |
| `oauth_refresh_success` | Successful refreshes | >98% | <95% |
| `oauth_refresh_failed` | Failed refreshes | <2% | >5% |
| `oauth_tokens_expiring_soon` | Tokens expiring <5min | <10 | >50 |
| `oauth_tokens_expired` | Expired tokens | 0 | >5 |

### 3. **System Health Metrics**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `database_connection_up` | DB connection status | 1 (up) | 0 (down) |
| `api_response_time_ms` | API response time P95 | <500ms | >1000ms |
| `integration_table_size` | Rows in integrations table | - | - |
| `error_state_count` | Integrations in error state | <10 | >50 |

---

## 🔧 Setup Instructions

### **Step 1: Install Monitoring Dependencies**

```bash
# Prometheus client (if self-hosting metrics)
npm install prom-client

# Sentry for error tracking
npm install @sentry/nextjs

# DataDog (optional)
npm install dd-trace
```

---

### **Step 2: Configure Sentry**

**File:** `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,

  beforeSend(event, hint) {
    // Don't send PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    // Add OAuth context
    if (event.tags) {
      event.tags.feature = 'oauth2';
    }

    return event;
  },

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yourdomain\.com/],
    }),
  ],
});
```

**File:** `sentry.server.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // Sample 10% in production

  beforeSend(event, hint) {
    // Filter out non-critical errors
    if (event.level === 'info' || event.level === 'debug') {
      return null;
    }

    return event;
  },
});
```

---

### **Step 3: Create Metrics API Endpoint**

**File:** `app/api/oauth/metrics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { oauthMonitor } from '@/lib/monitoring/oauth-monitor';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get OAuth monitor metrics
    const metrics = oauthMonitor.getMetrics();

    // Get database metrics
    const dbMetrics = await db
      .select({
        total: sql<number>`COUNT(*)`,
        connected: sql<number>`COUNT(*) FILTER (WHERE status = 'connected')`,
        error: sql<number>`COUNT(*) FILTER (WHERE status = 'error')`,
        expiring: sql<number>`COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '5 minutes')`,
      })
      .from(integrations);

    const combined = {
      oauth: metrics,
      database: dbMetrics[0],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(combined);
  } catch (error) {
    console.error('[OAuth Metrics Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

---

### **Step 4: Setup Health Check Endpoint**

**File:** `app/api/oauth/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { oauthMonitor } from '@/lib/monitoring/oauth-monitor';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const checks = {
      database: false,
      table: false,
      oauth_system: false,
    };

    // Check database connection
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = true;
    } catch (error) {
      console.error('[Health Check] Database failed:', error);
    }

    // Check integrations table exists
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'integrations'
        )
      `);
      checks.table = result.rows[0]?.exists || false;
    } catch (error) {
      console.error('[Health Check] Table check failed:', error);
    }

    // Check OAuth system health
    const health = oauthMonitor.getHealthStatus();
    checks.oauth_system = health.healthy;

    // Overall status
    const allHealthy = Object.values(checks).every((check) => check === true);

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      issues: health.issues,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(
      response,
      { status: allHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

---

### **Step 5: Create Alert Rules (Prometheus/Grafana)**

**File:** `monitoring/alert-rules.yml`

```yaml
groups:
  - name: oauth2_alerts
    interval: 60s
    rules:
      # Critical Alerts
      - alert: OAuthHighErrorRate
        expr: (oauth_connections_failed / oauth_initiations_total) > 0.1
        for: 5m
        labels:
          severity: critical
          component: oauth2
        annotations:
          summary: "OAuth error rate > 10%"
          description: "OAuth connection error rate is {{ $value | humanizePercentage }}"
          runbook: "https://docs.yourdomain.com/runbooks/oauth-high-error-rate"

      - alert: OAuthTokenRefreshFailing
        expr: (oauth_refresh_failed / oauth_refresh_attempts) > 0.2
        for: 10m
        labels:
          severity: critical
          component: oauth2
        annotations:
          summary: "OAuth token refresh failure rate > 20%"
          description: "{{ $value | humanizePercentage }} of token refreshes are failing"

      - alert: IntegrationsDatabaseDown
        expr: database_connection_up == 0
        for: 1m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "Cannot connect to integrations database"
          description: "Database connection has been down for 1 minute"

      # Warning Alerts
      - alert: OAuthSlowConnections
        expr: histogram_quantile(0.95, oauth_connection_duration_ms) > 3000
        for: 15m
        labels:
          severity: warning
          component: oauth2
        annotations:
          summary: "P95 OAuth connection time > 3 seconds"
          description: "95th percentile connection time is {{ $value }}ms"

      - alert: OAuthTokensExpiringSoon
        expr: oauth_tokens_expiring_soon > 50
        for: 5m
        labels:
          severity: warning
          component: oauth2
        annotations:
          summary: "{{ $value }} tokens expiring within 5 minutes"
          description: "Check token refresh cron job status"

      - alert: OAuthErrorStateHigh
        expr: error_state_count > 50
        for: 30m
        labels:
          severity: warning
          component: oauth2
        annotations:
          summary: "{{ $value }} integrations in error state"
          description: "Many users experiencing connection issues"
```

---

### **Step 6: Setup Uptime Monitoring (UptimeRobot/Pingdom)**

**Endpoints to Monitor:**

1. **Health Check** (Every 5 minutes)
   ```
   URL: https://yourdomain.com/api/oauth/health
   Method: GET
   Expected Status: 200
   Expected Response: {"status":"healthy"}
   Alert if: Status != 200 OR Response != healthy
   ```

2. **Integrations Page** (Every 10 minutes)
   ```
   URL: https://yourdomain.com/settings?tab=integrations
   Method: GET
   Expected Status: 200
   Alert if: Status != 200 OR Load time > 5s
   ```

3. **OAuth Metrics** (Every 5 minutes)
   ```
   URL: https://yourdomain.com/api/oauth/metrics
   Method: GET
   Expected Status: 200
   Alert if: Status != 200 OR error_rate > 0.05
   ```

---

### **Step 7: Configure Slack/Discord Alerts**

**Slack Webhook Integration:**

```typescript
// lib/monitoring/slack-notifier.ts
export async function sendSlackAlert(alert: {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  details?: Record<string, any>;
}) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  const color = {
    critical: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  }[alert.severity];

  const emoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  }[alert.severity];

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.message,
          fields: alert.details
            ? Object.entries(alert.details).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : [],
          footer: 'OAuth2 Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  });
}
```

**Usage in OAuth Monitor:**

```typescript
// In lib/monitoring/oauth-monitor.ts
import { sendSlackAlert } from './slack-notifier';

// Add to error logging
if (!event.success) {
  // Send critical alert if error rate high
  const health = this.getHealthStatus();
  if (!health.healthy) {
    await sendSlackAlert({
      severity: 'critical',
      title: 'OAuth System Unhealthy',
      message: health.issues.join('\n'),
      details: {
        'Error Rate': `${this.getErrorRate('google')}%`,
        'Provider': event.provider,
        'Service': event.service,
      },
    });
  }
}
```

---

### **Step 8: Create Grafana Dashboard**

**Dashboard JSON:** `monitoring/grafana-dashboard.json`

```json
{
  "dashboard": {
    "title": "OAuth2 Integration Monitoring",
    "panels": [
      {
        "title": "OAuth Success Rate (24h)",
        "type": "graph",
        "targets": [
          {
            "expr": "(oauth_connections_success / oauth_initiations_total) * 100",
            "legendFormat": "Success Rate %"
          }
        ]
      },
      {
        "title": "Connection Duration (P50, P95, P99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, oauth_connection_duration_ms)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, oauth_connection_duration_ms)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, oauth_connection_duration_ms)",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Active Integrations by Provider",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum(integrations_connected) by (provider)"
          }
        ]
      },
      {
        "title": "Token Refresh Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "(oauth_refresh_success / oauth_refresh_attempts) * 100"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "value": 0, "color": "red" },
            { "value": 90, "color": "yellow" },
            { "value": 95, "color": "green" }
          ]
        }
      },
      {
        "title": "Error Types Distribution",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum(oauth_errors_total) by (error_code)"
          }
        ]
      }
    ]
  }
}
```

---

### **Step 9: Setup Automated Health Checks (Cron)**

**Vercel Cron Configuration:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/token-refresh",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Health Check Cron:** `app/api/cron/health-check/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { oauthMonitor } from '@/lib/monitoring/oauth-monitor';
import { sendSlackAlert } from '@/lib/monitoring/slack-notifier';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const health = oauthMonitor.getHealthStatus();

    if (!health.healthy) {
      // Send alert
      await sendSlackAlert({
        severity: 'warning',
        title: 'OAuth Health Check Failed',
        message: 'OAuth system is experiencing issues',
        details: {
          'Issues': health.issues.length,
          'Details': health.issues.join(', '),
        },
      });
    }

    return NextResponse.json({
      healthy: health.healthy,
      issues: health.issues,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health Check Cron Error]', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
```

---

## 📱 Alert Channels

### **1. PagerDuty (Critical Alerts)**

- OAuth error rate > 10%
- Token refresh failure rate > 20%
- Database connection down
- Response time P95 > 5s

### **2. Slack (Warnings & Info)**

- OAuth error rate > 5%
- Tokens expiring soon > 50
- Performance degradation
- New integration errors

### **3. Email (Daily Summaries)**

- Daily metrics report
- Error summary
- Usage statistics
- Performance trends

---

## 🔍 Troubleshooting Runbooks

### **Runbook 1: High OAuth Error Rate**

**Symptoms:**
- Error rate > 10% for 5 minutes
- Users reporting connection failures

**Investigation Steps:**
1. Check Sentry for recent errors
2. Review OAuth provider status pages
3. Check database connection
4. Verify environment variables
5. Check token encryption key

**Resolution:**
```bash
# Check error types
curl https://yourdomain.com/api/oauth/metrics | jq '.oauth.providerMetrics'

# Check recent errors
# Query Sentry for last hour

# Verify env vars
vercel env ls production | grep GOOGLE

# If Google issues:
# Check: https://status.cloud.google.com
```

---

### **Runbook 2: Token Refresh Failures**

**Symptoms:**
- Refresh failure rate > 20%
- Many integrations in error state

**Investigation Steps:**
1. Check token refresh cron job status
2. Verify refresh token encryption
3. Check Google API status
4. Review database for expired tokens

**Resolution:**
```bash
# Manual refresh attempt
npx tsx scripts/cron-token-refresh.ts

# Check expired tokens
psql $DATABASE_URL << EOF
SELECT COUNT(*), provider
FROM integrations
WHERE expires_at < NOW()
GROUP BY provider;
EOF

# If cron not running:
# Verify Vercel cron: vercel crons ls
# Check cron logs: vercel logs --since=1h
```

---

## 📊 Daily Monitoring Checklist

### Morning Check (9 AM)
- [ ] Review overnight alerts
- [ ] Check error rate (target: <1%)
- [ ] Verify token refresh success (target: >98%)
- [ ] Check integration counts
- [ ] Review Sentry errors

### Afternoon Check (3 PM)
- [ ] Monitor P95 response times
- [ ] Check tokens expiring soon
- [ ] Review user feedback/support tickets
- [ ] Verify health checks passing

### Evening Check (9 PM)
- [ ] Daily metrics summary
- [ ] Performance trends
- [ ] Plan for tomorrow

---

## 🎯 Success Metrics

**Targets:**
- Uptime: 99.9%
- Error Rate: <0.5%
- P95 Response Time: <500ms
- Token Refresh Success: >99%
- User Satisfaction: >4.5/5

**Review Frequency:**
- Real-time: Error alerts
- Hourly: Performance metrics
- Daily: Usage statistics
- Weekly: Trend analysis
- Monthly: Capacity planning

---

**Status:** Ready for Production
**Last Updated:** 2025-10-27
