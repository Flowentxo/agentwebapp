# 🚀 Brain AI - Next Steps & Roadmap

**Version**: 1.0.0
**Status**: Post-Deployment Phase
**Date**: 2025-10-26

---

## 📋 Table of Contents

1. [Stabilität & Monitoring](#stabilität--monitoring)
2. [Wartung & Support](#wartung--support)
3. [Nutzer-Feedback & Feature-Requests](#nutzer-feedback--feature-requests)
4. [Skalierung & Erweiterungen](#skalierung--erweiterungen)
5. [Nachhaltigkeit & Kostenkontrolle](#nachhaltigkeit--kostenkontrolle)
6. [Zeitplan & Prioritäten](#zeitplan--prioritäten)

---

## 🔍 1. Stabilität & Monitoring

### 1.1 Kontinuierliches System-Monitoring

#### Grafana Dashboard Überwachung (täglich)

**Zu überwachende Metriken**:

```bash
# Daily monitoring checklist
# Ausführen: ./scripts/daily-monitoring-check.sh

1. System Health
   - Uptime: Target > 99.9%
   - Active Pods: Expected 3-10 (auto-scaling)
   - Error Rate: Target < 1%

2. Performance Metrics
   - P95 Response Time: < 500ms
   - P99 Response Time: < 2s
   - Throughput: > 1000 req/s

3. Resource Usage
   - CPU: < 70% (warning at 80%)
   - Memory: < 80% (warning at 90%)
   - Disk: < 75% (warning at 85%)

4. Cache Performance
   - Hit Rate: > 65%
   - Redis Memory: < 80% capacity
   - Eviction Rate: < 5%

5. Database Health
   - Active Connections: < 90% pool size
   - Slow Queries: < 5 per hour
   - Replication Lag: < 100ms
```

**Automatisches Alerting konfigurieren**:

```yaml
# alertmanager-config.yml
route:
  receiver: 'ops-team'
  group_by: ['alertname', 'severity']
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'slack-ops'
    - match:
        severity: info
      receiver: 'email-team'

receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'

  - name: 'slack-ops'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#brain-ai-alerts'
        title: 'Brain AI Alert: {{ .GroupLabels.alertname }}'
        text: |
          *Severity:* {{ .Labels.severity }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}

  - name: 'email-team'
    email_configs:
      - to: 'devops@company.com'
        from: 'alerts@company.com'
        subject: 'Brain AI Alert: {{ .GroupLabels.alertname }}'
```

#### Automatische Ressourcen-Optimierung

**HPA (Horizontal Pod Autoscaler) Fine-Tuning**:

```yaml
# k8s/hpa-optimized.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brain-ai-hpa
  namespace: brain-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brain-ai-blue
  minReplicas: 3
  maxReplicas: 10
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 minutes
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60   # 1 minute
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 2
          periodSeconds: 30
      selectPolicy: Max
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Custom metrics
    - type: Pods
      pods:
        metric:
          name: brain_query_rate
        target:
          type: AverageValue
          averageValue: "100"  # Scale if > 100 queries/sec per pod
```

**VPA (Vertical Pod Autoscaler) konfigurieren**:

```yaml
# k8s/vpa.yaml
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
    updateMode: "Auto"  # Auto, Recreate, or Off
  resourcePolicy:
    containerPolicies:
      - containerName: brain-ai
        minAllowed:
          cpu: 250m
          memory: 256Mi
        maxAllowed:
          cpu: 2000m
          memory: 4Gi
        controlledResources: ["cpu", "memory"]
```

#### Query-Volumes & Latenz-Tracking

**Custom Prometheus Queries für Analyse**:

```promql
# Höchste Query-Volumes nach Agent
topk(10, sum(rate(agent_requests_total[5m])) by (agent_id))

# Durchschnittliche Antwortlatenz pro Endpoint
avg(rate(http_request_duration_seconds_sum[5m])) by (endpoint)

# Fehlerquote nach Status-Code
sum(rate(http_requests_total{status=~"5.."}[5m])) by (status)

# Cache-Effizienz im Zeitverlauf
sum(rate(redis_cache_hits_total[5m])) / (sum(rate(redis_cache_hits_total[5m])) + sum(rate(redis_cache_misses_total[5m])))

# Slow Queries (> 2s)
histogram_quantile(0.99, rate(brain_query_duration_seconds_bucket[5m])) > 2
```

**Automatisches Latenz-Reporting**:

```bash
# scripts/latency-report.sh
#!/bin/bash

# Daily latency report
echo "Brain AI - Daily Latency Report $(date +%Y-%m-%d)"
echo "================================================"

# Query Prometheus for metrics
P50=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[24h]))" | jq -r '.data.result[0].value[1]')
P95=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[24h]))" | jq -r '.data.result[0].value[1]')
P99=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[24h]))" | jq -r '.data.result[0].value[1]')

echo "Response Times (24h):"
echo "  P50: ${P50}s"
echo "  P95: ${P95}s"
echo "  P99: ${P99}s"

# Alert if P95 > 1s
if (( $(echo "$P95 > 1" | bc -l) )); then
    echo "⚠️  WARNING: P95 latency exceeds 1s"
    # Send alert to Slack
    curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"⚠️ Brain AI P95 latency: ${P95}s\"}"
fi
```

---

## 🔧 2. Wartung & Support

### 2.1 Reguläre Datenbank-Audits

#### PostgreSQL Integrity Checks (wöchentlich)

```bash
# scripts/db-integrity-check.sh
#!/bin/bash

echo "PostgreSQL Integrity Check - $(date)"
echo "===================================="

# Get PostgreSQL pod
POSTGRES_POD=$(kubectl get pods -n brain-ai -l app=postgres -o jsonpath='{.items[0].metadata.name}')

# 1. Check table integrity
echo "1. Checking table integrity..."
kubectl exec -n brain-ai $POSTGRES_POD -- psql -U postgres -d brain_ai -c "
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# 2. Check for bloat
echo "2. Checking for table bloat..."
kubectl exec -n brain-ai $POSTGRES_POD -- psql -U postgres -d brain_ai -c "
  SELECT
    schemaname || '.' || tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS bloat
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"

# 3. Vacuum and analyze
echo "3. Running VACUUM ANALYZE..."
kubectl exec -n brain-ai $POSTGRES_POD -- psql -U postgres -d brain_ai -c "VACUUM ANALYZE;"

# 4. Check for missing indexes
echo "4. Checking for missing indexes..."
kubectl exec -n brain-ai $POSTGRES_POD -- psql -U postgres -d brain_ai -c "
  SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
  FROM pg_stats
  WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1
  ORDER BY n_distinct DESC
  LIMIT 10;
"

# 5. Check pgvector index health
echo "5. Checking pgvector indexes..."
kubectl exec -n brain-ai $POSTGRES_POD -- psql -U postgres -d brain_ai -c "
  SELECT
    indexrelid::regclass AS index,
    relname AS table,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_index
  JOIN pg_class ON pg_index.indrelid = pg_class.oid
  WHERE indexrelid::regclass::text LIKE '%embedding%'
  ORDER BY pg_relation_size(indexrelid) DESC;
"

# 6. Database size report
echo "6. Database size summary..."
DB_SIZE=$(kubectl exec -n brain-ai $POSTGRES_POD -- psql -U postgres -d brain_ai -t -c "SELECT pg_size_pretty(pg_database_size('brain_ai'));")
echo "Total database size: $DB_SIZE"

# Generate report
cat > db-audit-$(date +%Y%m%d).txt <<EOF
PostgreSQL Integrity Audit Report
Date: $(date)
Database: brain_ai
Total Size: $DB_SIZE

Actions Taken:
- Table integrity verified
- Bloat analysis completed
- VACUUM ANALYZE executed
- Missing indexes identified
- pgvector indexes validated

Next Audit: $(date -d '+7 days' +%Y-%m-%d)
EOF

echo "✓ Audit complete. Report saved to db-audit-$(date +%Y%m%d).txt"
```

#### Redis Persistence & Backup

```bash
# scripts/redis-backup.sh
#!/bin/bash

echo "Redis Backup - $(date)"
echo "===================="

REDIS_POD=$(kubectl get pods -n brain-ai -l app=redis -o jsonpath='{.items[0].metadata.name}')

# 1. Trigger BGSAVE
echo "Triggering background save..."
kubectl exec -n brain-ai $REDIS_POD -- redis-cli BGSAVE

# 2. Wait for save to complete
echo "Waiting for save to complete..."
while true; do
    SAVE_STATUS=$(kubectl exec -n brain-ai $REDIS_POD -- redis-cli LASTSAVE)
    sleep 2
    NEW_STATUS=$(kubectl exec -n brain-ai $REDIS_POD -- redis-cli LASTSAVE)
    if [ "$SAVE_STATUS" != "$NEW_STATUS" ]; then
        break
    fi
done

# 3. Copy RDB file
echo "Copying RDB file..."
kubectl cp brain-ai/$REDIS_POD:/data/dump.rdb ./backups/redis-backup-$(date +%Y%m%d-%H%M%S).rdb

# 4. Verify backup
BACKUP_FILE="./backups/redis-backup-$(date +%Y%m%d-%H%M%S).rdb"
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "✓ Backup successful: $BACKUP_SIZE"
else
    echo "✗ Backup failed"
    exit 1
fi

# 5. Check Redis memory usage
MEMORY_USED=$(kubectl exec -n brain-ai $REDIS_POD -- redis-cli INFO memory | grep "used_memory_human" | cut -d: -f2)
echo "Current memory usage: $MEMORY_USED"

# 6. Cleanup old backups (keep last 7 days)
find ./backups -name "redis-backup-*.rdb" -mtime +7 -delete
echo "✓ Old backups cleaned up"
```

### 2.2 Patch-Management & Sicherheitsupdates

#### Automatisches Dependency-Scanning

```yaml
# .github/workflows/security-scan.yml
name: Weekly Security Scan

on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM
  workflow_dispatch:

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: NPM Audit
        run: |
          npm audit --audit-level=moderate --json > npm-audit.json
          npm audit --audit-level=moderate

      - name: Trivy Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'your-registry/brain-ai:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Create Security Report
        if: failure()
        run: |
          echo "# Security Scan Report" > security-report.md
          echo "Date: $(date)" >> security-report.md
          echo "" >> security-report.md
          echo "## Critical Findings" >> security-report.md
          cat npm-audit.json | jq -r '.vulnerabilities | to_entries[] | select(.value.severity == "critical") | "- \(.key): \(.value.title)"' >> security-report.md

      - name: Create GitHub Issue
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Security Vulnerabilities Detected',
              body: require('fs').readFileSync('security-report.md', 'utf8'),
              labels: ['security', 'high-priority']
            })
```

#### Update-Prozedur

```bash
# scripts/apply-updates.sh
#!/bin/bash

echo "Brain AI - Update Procedure"
echo "==========================="

# 1. Create update branch
git checkout -b updates/$(date +%Y%m%d)

# 2. Update dependencies
echo "Updating dependencies..."
npm update
npm audit fix --audit-level=moderate

# 3. Run tests
echo "Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "✗ Tests failed. Aborting update."
    exit 1
fi

# 4. Update Docker base images
echo "Checking for base image updates..."
docker pull node:18-alpine
docker pull pgvector/pgvector:pg15
docker pull redis:7-alpine

# 5. Rebuild containers
echo "Rebuilding containers..."
docker build -t brain-ai:updated .

# 6. Run security scan on new image
echo "Scanning updated image..."
trivy image --severity CRITICAL,HIGH brain-ai:updated

# 7. Deploy to staging
echo "Deploying to staging for testing..."
./scripts/deploy.sh staging

# 8. Run smoke tests
echo "Running smoke tests..."
./scripts/run-load-test.sh staging smoke

if [ $? -eq 0 ]; then
    echo "✓ Updates applied successfully"
    echo "Next steps:"
    echo "1. Create PR: git push origin updates/$(date +%Y%m%d)"
    echo "2. Review changes and merge"
    echo "3. Deploy to production: ./scripts/deploy.sh production"
else
    echo "✗ Smoke tests failed. Review before deploying to production."
    exit 1
fi
```

### 2.3 Incident Response Playbooks

#### Incident Response Template

```markdown
# Incident Response Playbook

## Incident Classification

### P0 - Critical (Complete Outage)
**Response Time**: Immediate (< 5 minutes)
**Examples**:
- Brain AI completely down
- Database unavailable
- All agents unable to respond

**Actions**:
1. Page on-call engineer immediately
2. Post in #incidents channel
3. Execute immediate rollback
4. Notify leadership

### P1 - High (Partial Outage)
**Response Time**: < 30 minutes
**Examples**:
- Single agent down
- Degraded performance (> 5s response time)
- Cache unavailable

**Actions**:
1. Alert DevOps team
2. Post in #brain-ai-alerts
3. Investigate root cause
4. Apply targeted fix

### P2 - Medium (Minor Impact)
**Response Time**: < 4 hours
**Examples**:
- Slow queries
- Elevated error rate (1-5%)
- Non-critical features unavailable

**Actions**:
1. Create incident ticket
2. Investigate during business hours
3. Schedule fix in next deployment

## Common Incidents & Solutions

### 1. High Latency (P95 > 2s)

**Detection**:
- Grafana alert triggers
- User complaints about slow responses

**Diagnosis**:
```bash
# Check current latency
kubectl exec -n brain-ai prometheus-pod -- \
  promtool query instant \
  'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'

# Check database slow queries
kubectl exec -n brain-ai postgres-pod -- \
  psql -U postgres -d brain_ai -c "
    SELECT query, mean_exec_time, calls
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 10;"

# Check Redis latency
kubectl exec -n brain-ai redis-pod -- redis-cli --latency
```

**Resolution**:
```bash
# Scale up pods
kubectl scale deployment brain-ai-blue --replicas=8 -n brain-ai

# Clear cache if necessary
kubectl exec -n brain-ai redis-pod -- redis-cli FLUSHDB

# Restart slow pods
kubectl rollout restart deployment/brain-ai-blue -n brain-ai
```

### 2. Cache Miss Rate High (< 50%)

**Detection**:
- Grafana dashboard shows low cache hit rate
- Increased database load

**Diagnosis**:
```bash
# Check cache stats
kubectl exec -n brain-ai redis-pod -- redis-cli INFO stats

# Check eviction policy
kubectl exec -n brain-ai redis-pod -- redis-cli CONFIG GET maxmemory-policy
```

**Resolution**:
```bash
# Increase Redis memory
kubectl edit deployment redis -n brain-ai
# Update memory limit: 512Mi -> 1Gi

# Adjust TTL in application code
# Or warm up cache with popular queries
curl -X POST https://your-domain/api/brain/cache/warmup
```

### 3. Database Connection Pool Exhausted

**Detection**:
- "too many connections" errors
- Timeout errors on queries

**Diagnosis**:
```bash
# Check active connections
kubectl exec -n brain-ai postgres-pod -- \
  psql -U postgres -d brain_ai -c "
    SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check max connections
kubectl exec -n brain-ai postgres-pod -- \
  psql -U postgres -d brain_ai -c "SHOW max_connections;"
```

**Resolution**:
```bash
# Increase connection pool size
# In .env.production:
DATABASE_MAX_CONNECTIONS=200  # Was: 100

# Or increase PostgreSQL max_connections
kubectl exec -n brain-ai postgres-pod -- \
  psql -U postgres -c "ALTER SYSTEM SET max_connections = 300;"

# Restart PostgreSQL
kubectl rollout restart deployment/postgres -n brain-ai
```

---

## 📊 3. Nutzer-Feedback & Feature-Requests

### 3.1 Feedback-Sammlung

#### In-App Feedback Widget

```typescript
// components/feedback/FeedbackWidget.tsx
'use client';

import { useState } from 'react';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(0);

  const submitFeedback = async () => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback,
        rating,
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      })
    });

    setIsOpen(false);
    setFeedback('');
    setRating(0);
  };

  return (
    <div className="feedback-widget">
      <button onClick={() => setIsOpen(!isOpen)}>
        💬 Feedback
      </button>

      {isOpen && (
        <div className="feedback-modal">
          <h3>Help us improve Brain AI</h3>

          <div className="rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={rating >= star ? 'active' : ''}
              >
                ⭐
              </button>
            ))}
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What would you like to see improved?"
            rows={4}
          />

          <button onClick={submitFeedback}>
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Feedback API Endpoint

```typescript
// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { feedback } from '@/lib/db/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || 'anonymous';

    const db = getDb();
    await db.insert(feedback).values({
      userId,
      rating: body.rating,
      comment: body.feedback,
      page: body.page,
      userAgent: req.headers.get('user-agent'),
      metadata: {
        timestamp: body.timestamp,
        sessionId: req.cookies.get('sessionId')?.value
      }
    });

    // Send to analytics
    await fetch('YOUR_ANALYTICS_ENDPOINT', {
      method: 'POST',
      body: JSON.stringify({
        event: 'feedback_submitted',
        properties: {
          rating: body.rating,
          page: body.page
        }
      })
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FEEDBACK]', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
```

### 3.2 A/B Testing Framework

```typescript
// lib/ab-testing/experiments.ts
export interface Experiment {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    weight: number;  // 0-100
  }[];
  startDate: Date;
  endDate?: Date;
  active: boolean;
}

export const experiments: Experiment[] = [
  {
    id: 'search-ui-v2',
    name: 'Search UI Redesign',
    variants: [
      { id: 'control', name: 'Current UI', weight: 50 },
      { id: 'variant-a', name: 'Compact UI', weight: 50 }
    ],
    startDate: new Date('2025-11-01'),
    active: true
  },
  {
    id: 'response-format',
    name: 'Agent Response Format',
    variants: [
      { id: 'markdown', name: 'Markdown Format', weight: 33 },
      { id: 'structured', name: 'Structured JSON', weight: 33 },
      { id: 'hybrid', name: 'Hybrid Format', weight: 34 }
    ],
    startDate: new Date('2025-11-01'),
    active: true
  }
];

// Assign user to variant
export function getUserVariant(
  userId: string,
  experimentId: string
): string {
  const experiment = experiments.find(e => e.id === experimentId);
  if (!experiment || !experiment.active) {
    return 'control';
  }

  // Consistent hashing for stable assignment
  const hash = simpleHash(userId + experimentId);
  const bucket = hash % 100;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.id;
    }
  }

  return experiment.variants[0].id;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Track experiment exposure
export async function trackExperiment(
  userId: string,
  experimentId: string,
  variantId: string
) {
  await fetch('/api/analytics/experiment', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      experimentId,
      variantId,
      timestamp: Date.now()
    })
  });
}
```

### 3.3 Feature-Request Priorisierung

#### Feature Request Template

```markdown
# Feature Request Template

## Feature Title
[Clear, concise title]

## Problem Statement
What problem does this solve?

## Proposed Solution
How would this feature work?

## User Impact
- Who would benefit?
- How many users affected?
- Business value?

## Technical Complexity
- [ ] Low (< 1 day)
- [ ] Medium (1-3 days)
- [ ] High (1-2 weeks)
- [ ] Very High (> 2 weeks)

## Priority
- [ ] Critical (blocking users)
- [ ] High (major improvement)
- [ ] Medium (nice to have)
- [ ] Low (future consideration)

## Dependencies
- Required infrastructure changes
- Third-party integrations
- Database schema updates

## Success Metrics
How will we measure success?
```

---

## 🚀 4. Skalierung & Erweiterungen

### 4.1 Multi-Tenant Support (Mandantenfähigkeit)

#### Database Schema für Multi-Tenancy

```sql
-- Migration: Add multi-tenancy support
-- drizzle/migrations/add_multi_tenancy.sql

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro, enterprise
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, cancelled
  settings JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{"maxDocuments": 1000, "maxAgents": 3, "maxUsers": 5}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Update brain_documents for multi-tenancy
ALTER TABLE brain_documents ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_brain_documents_workspace ON brain_documents(workspace_id);

-- Update agent_messages for multi-tenancy
ALTER TABLE agent_messages ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_agent_messages_workspace ON agent_messages(workspace_id);

-- Workspace usage tracking
CREATE TABLE workspace_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL, -- queries, documents, storage_mb, api_calls
  value INTEGER NOT NULL,
  period DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, metric, period)
);

CREATE INDEX idx_workspace_usage_period ON workspace_usage(workspace_id, period DESC);

-- Row Level Security (RLS) policies
ALTER TABLE brain_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON brain_documents
  USING (workspace_id = current_setting('app.current_workspace_id')::UUID);
```

#### Workspace Context Middleware

```typescript
// lib/workspace/middleware.ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { workspaces, workspaceMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getWorkspaceContext(req: NextRequest) {
  const workspaceSlug = req.headers.get('x-workspace-slug') ||
                        req.cookies.get('workspace_slug')?.value;

  if (!workspaceSlug) {
    throw new Error('Workspace not specified');
  }

  const userId = req.headers.get('x-user-id');
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const db = getDb();

  // Get workspace
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(and(
      eq(workspaces.slug, workspaceSlug),
      eq(workspaces.status, 'active')
    ))
    .limit(1);

  if (!workspace) {
    throw new Error('Workspace not found or inactive');
  }

  // Verify user membership
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspace.id),
      eq(workspaceMembers.userId, userId)
    ))
    .limit(1);

  if (!membership) {
    throw new Error('User not authorized for this workspace');
  }

  // Check usage limits
  const limits = workspace.limits as any;
  const currentUsage = await getWorkspaceUsage(workspace.id);

  if (currentUsage.documents >= limits.maxDocuments) {
    throw new Error('Document limit reached');
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    plan: workspace.plan,
    role: membership.role,
    limits,
    usage: currentUsage
  };
}

async function getWorkspaceUsage(workspaceId: string) {
  const db = getDb();

  // Get current month usage
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const usage = await db
    .select()
    .from(workspaceUsage)
    .where(and(
      eq(workspaceUsage.workspaceId, workspaceId),
      eq(workspaceUsage.period, firstDayOfMonth)
    ));

  return {
    queries: usage.find(u => u.metric === 'queries')?.value || 0,
    documents: usage.find(u => u.metric === 'documents')?.value || 0,
    storage_mb: usage.find(u => u.metric === 'storage_mb')?.value || 0,
    api_calls: usage.find(u => u.metric === 'api_calls')?.value || 0
  };
}
```

### 4.2 WebSocket Real-Time Updates

```typescript
// lib/websocket/server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface Client {
  ws: WebSocket;
  userId: string;
  workspaceId: string;
  agentId?: string;
}

const clients = new Map<string, Client>();

export function initWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const workspaceId = url.searchParams.get('workspaceId');

    if (!userId || !workspaceId) {
      ws.close(1008, 'Missing userId or workspaceId');
      return;
    }

    const clientId = `${workspaceId}:${userId}`;
    clients.set(clientId, { ws, userId, workspaceId });

    console.log(`[WS] Client connected: ${clientId}`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(clientId, message);
      } catch (error) {
        console.error('[WS] Invalid message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: Date.now()
    }));
  });

  return wss;
}

function handleMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      // Subscribe to specific agent or document updates
      client.agentId = message.agentId;
      break;

    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    default:
      console.log('[WS] Unknown message type:', message.type);
  }
}

// Broadcast functions
export function broadcastToWorkspace(workspaceId: string, message: any) {
  clients.forEach((client, clientId) => {
    if (client.workspaceId === workspaceId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

export function sendToUser(workspaceId: string, userId: string, message: any) {
  const clientId = `${workspaceId}:${userId}`;
  const client = clients.get(clientId);

  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

// Example: Broadcast document update
export function broadcastDocumentUpdate(workspaceId: string, document: any) {
  broadcastToWorkspace(workspaceId, {
    type: 'document:updated',
    document,
    timestamp: Date.now()
  });
}

// Example: Send agent response
export function sendAgentResponse(workspaceId: string, userId: string, response: any) {
  sendToUser(workspaceId, userId, {
    type: 'agent:response',
    response,
    timestamp: Date.now()
  });
}
```

#### Client-Side WebSocket Hook

```typescript
// hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState } from 'react';

export function useWebSocket(userId: string, workspaceId: string) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}&workspaceId=${workspaceId}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setLastMessage(message);
    };

    ws.current.onclose = () => {
      console.log('[WS] Disconnected');
      setIsConnected(false);

      // Reconnect after 3 seconds
      setTimeout(() => {
        console.log('[WS] Reconnecting...');
        ws.current?.close();
      }, 3000);
    };

    return () => {
      ws.current?.close();
    };
  }, [userId, workspaceId]);

  const subscribe = (agentId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'subscribe',
        agentId
      }));
    }
  };

  return { isConnected, lastMessage, subscribe };
}
```

### 4.3 Kontextuelles Lernen (Adaptive Models)

```typescript
// lib/ai/adaptive-learning.ts
import { getDb } from '@/lib/db';
import { userInteractions, adaptiveModels } from '@/lib/db/schema';

interface InteractionData {
  userId: string;
  workspaceId: string;
  query: string;
  response: string;
  feedback: 'positive' | 'negative' | 'neutral';
  context: any;
}

export class AdaptiveLearningEngine {
  private db = getDb();

  /**
   * Record user interaction for learning
   */
  async recordInteraction(data: InteractionData) {
    await this.db.insert(userInteractions).values({
      userId: data.userId,
      workspaceId: data.workspaceId,
      query: data.query,
      response: data.response,
      feedback: data.feedback,
      context: data.context,
      timestamp: new Date()
    });

    // Update user preference model
    await this.updateUserModel(data.userId, data.workspaceId);
  }

  /**
   * Get personalized query suggestions
   */
  async getPersonalizedSuggestions(
    userId: string,
    workspaceId: string,
    currentQuery: string
  ): Promise<string[]> {
    // Get user's past successful queries
    const interactions = await this.db
      .select()
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.workspaceId, workspaceId),
        eq(userInteractions.feedback, 'positive')
      ))
      .orderBy(desc(userInteractions.timestamp))
      .limit(50);

    // Use embedding similarity to find related queries
    const queryEmbedding = await this.getQueryEmbedding(currentQuery);

    const suggestions = interactions
      .map(i => ({
        query: i.query,
        similarity: this.cosineSimilarity(queryEmbedding, i.context.embedding)
      }))
      .filter(s => s.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(s => s.query);

    return suggestions;
  }

  /**
   * Adjust response based on user preferences
   */
  async personalizeResponse(
    userId: string,
    workspaceId: string,
    baseResponse: string
  ): Promise<string> {
    const userModel = await this.getUserModel(userId, workspaceId);

    if (!userModel) {
      return baseResponse;
    }

    const preferences = userModel.preferences as any;

    // Adjust verbosity
    if (preferences.verbosity === 'concise') {
      return this.makeConcise(baseResponse);
    } else if (preferences.verbosity === 'detailed') {
      return this.makeDetailed(baseResponse);
    }

    // Adjust tone
    if (preferences.tone === 'formal') {
      return this.makeFormal(baseResponse);
    } else if (preferences.tone === 'casual') {
      return this.makeCasual(baseResponse);
    }

    return baseResponse;
  }

  private async updateUserModel(userId: string, workspaceId: string) {
    // Analyze recent interactions to update preferences
    const recentInteractions = await this.db
      .select()
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.workspaceId, workspaceId)
      ))
      .orderBy(desc(userInteractions.timestamp))
      .limit(100);

    const preferences = this.analyzePreferences(recentInteractions);

    await this.db
      .insert(adaptiveModels)
      .values({
        userId,
        workspaceId,
        preferences,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [adaptiveModels.userId, adaptiveModels.workspaceId],
        set: {
          preferences,
          updatedAt: new Date()
        }
      });
  }

  private analyzePreferences(interactions: any[]): any {
    // Analyze query length preferences
    const avgQueryLength = interactions.reduce((sum, i) => sum + i.query.length, 0) / interactions.length;
    const verbosity = avgQueryLength < 50 ? 'concise' : 'detailed';

    // Analyze tone preferences
    const formalKeywords = interactions.filter(i =>
      /please|could you|would you|kindly/.test(i.query.toLowerCase())
    ).length;
    const tone = formalKeywords > interactions.length / 2 ? 'formal' : 'casual';

    // Analyze topic preferences
    const topics = interactions.map(i => this.extractTopics(i.query));
    const topicFrequency = topics.flat().reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      verbosity,
      tone,
      topicPreferences: topicFrequency,
      lastUpdated: new Date().toISOString()
    };
  }

  // Helper methods
  private async getUserModel(userId: string, workspaceId: string) {
    const [model] = await this.db
      .select()
      .from(adaptiveModels)
      .where(and(
        eq(adaptiveModels.userId, userId),
        eq(adaptiveModels.workspaceId, workspaceId)
      ))
      .limit(1);

    return model;
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    // Use EmbeddingService
    const { EmbeddingService } = await import('../brain/EmbeddingService');
    const embeddingService = new EmbeddingService();
    return await embeddingService.generateEmbedding(query);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private makeConcise(text: string): string {
    // Summarize to key points
    return text.split('.').slice(0, 3).join('.') + '.';
  }

  private makeDetailed(text: string): string {
    // Add more context (placeholder - would use LLM in practice)
    return text + '\n\nAdditional context: [Detailed explanation would be generated here]';
  }

  private makeFormal(text: string): string {
    return text
      .replace(/can't/g, 'cannot')
      .replace(/won't/g, 'will not')
      .replace(/don't/g, 'do not');
  }

  private makeCasual(text: string): string {
    return text
      .replace(/cannot/g, "can't")
      .replace(/will not/g, "won't")
      .replace(/do not/g, "don't");
  }

  private extractTopics(query: string): string[] {
    // Simple keyword extraction (would use NLP in practice)
    const keywords = query.toLowerCase().match(/\b\w{5,}\b/g) || [];
    return keywords.slice(0, 5);
  }
}
```

---

## 💰 5. Nachhaltigkeit & Kostenkontrolle

### 5.1 API-Nutzungskosten Monitoring

#### OpenAI Cost Tracking

```typescript
// lib/monitoring/cost-tracker.ts
import { getDb } from '@/lib/db';
import { aiUsage } from '@/lib/db/schema';

interface CostBreakdown {
  totalCost: number;
  byModel: Record<string, number>;
  byWorkspace: Record<string, number>;
  byDate: Record<string, number>;
}

export class CostTracker {
  private db = getDb();

  // OpenAI pricing (as of 2025)
  private readonly prices = {
    'gpt-4-turbo-preview': {
      input: 0.01 / 1000,   // $0.01 per 1K input tokens
      output: 0.03 / 1000    // $0.03 per 1K output tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000,  // $0.0005 per 1K input tokens
      output: 0.0015 / 1000  // $0.0015 per 1K output tokens
    },
    'text-embedding-3-small': {
      input: 0.00002 / 1000, // $0.00002 per 1K tokens
      output: 0
    }
  };

  /**
   * Calculate cost for API usage
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = this.prices[model as keyof typeof this.prices];

    if (!pricing) {
      console.warn(`Unknown model: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Track API usage
   */
  async trackUsage(
    workspaceId: string,
    userId: string,
    agentId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ) {
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    await this.db.insert(aiUsage).values({
      workspaceId,
      userId,
      agentId,
      model,
      tokensPrompt: inputTokens,
      tokensCompletion: outputTokens,
      tokensTotal: inputTokens + outputTokens,
      cost: cost.toFixed(6),
      createdAt: new Date()
    });
  }

  /**
   * Get cost breakdown for period
   */
  async getCostBreakdown(
    startDate: Date,
    endDate: Date,
    workspaceId?: string
  ): Promise<CostBreakdown> {
    let query = this.db
      .select()
      .from(aiUsage)
      .where(and(
        gte(aiUsage.createdAt, startDate),
        lte(aiUsage.createdAt, endDate)
      ));

    if (workspaceId) {
      query = query.where(eq(aiUsage.workspaceId, workspaceId));
    }

    const usage = await query;

    const breakdown: CostBreakdown = {
      totalCost: 0,
      byModel: {},
      byWorkspace: {},
      byDate: {}
    };

    usage.forEach(u => {
      const cost = parseFloat(u.cost);
      breakdown.totalCost += cost;

      // By model
      breakdown.byModel[u.model] = (breakdown.byModel[u.model] || 0) + cost;

      // By workspace
      breakdown.byWorkspace[u.workspaceId] = (breakdown.byWorkspace[u.workspaceId] || 0) + cost;

      // By date
      const date = u.createdAt.toISOString().split('T')[0];
      breakdown.byDate[date] = (breakdown.byDate[date] || 0) + cost;
    });

    return breakdown;
  }

  /**
   * Get workspace budget status
   */
  async getWorkspaceBudgetStatus(
    workspaceId: string,
    monthlyBudget: number
  ): Promise<{
    spent: number;
    remaining: number;
    percentUsed: number;
    projectedTotal: number;
    onTrack: boolean;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const breakdown = await this.getCostBreakdown(
      firstDayOfMonth,
      now,
      workspaceId
    );

    const spent = breakdown.totalCost;
    const daysElapsed = now.getDate();
    const daysInMonth = lastDayOfMonth.getDate();
    const projectedTotal = (spent / daysElapsed) * daysInMonth;

    return {
      spent,
      remaining: monthlyBudget - spent,
      percentUsed: (spent / monthlyBudget) * 100,
      projectedTotal,
      onTrack: projectedTotal <= monthlyBudget
    };
  }
}
```

#### Cost Alert System

```typescript
// lib/monitoring/cost-alerts.ts
export async function checkCostAlerts() {
  const costTracker = new CostTracker();
  const workspaces = await getAllWorkspaces();

  for (const workspace of workspaces) {
    const budget = workspace.limits.monthlyBudget || 1000; // $1000 default

    const status = await costTracker.getWorkspaceBudgetStatus(
      workspace.id,
      budget
    );

    // Alert at 80% budget
    if (status.percentUsed >= 80 && status.percentUsed < 90) {
      await sendAlert({
        severity: 'warning',
        workspace: workspace.name,
        message: `Budget 80% used: $${status.spent.toFixed(2)} of $${budget}`,
        projected: `Projected total: $${status.projectedTotal.toFixed(2)}`
      });
    }

    // Alert at 90% budget
    if (status.percentUsed >= 90 && status.percentUsed < 100) {
      await sendAlert({
        severity: 'high',
        workspace: workspace.name,
        message: `Budget 90% used: $${status.spent.toFixed(2)} of $${budget}`,
        projected: `Projected total: $${status.projectedTotal.toFixed(2)}`
      });
    }

    // Alert at 100% budget - rate limit
    if (status.percentUsed >= 100) {
      await sendAlert({
        severity: 'critical',
        workspace: workspace.name,
        message: `Budget exceeded: $${status.spent.toFixed(2)} of $${budget}`,
        action: 'Rate limiting enabled'
      });

      // Enable rate limiting for this workspace
      await enableRateLimiting(workspace.id);
    }
  }
}
```

### 5.2 Auto-Scaling in Low-Traffic-Zeiten

```yaml
# k8s/scheduled-scaling.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-night
  namespace: brain-ai
spec:
  # Every day at 11 PM (scale down)
  schedule: "0 23 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: brain-ai-scaler
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Scaling down for night..."
                  kubectl scale deployment brain-ai-blue --replicas=2 -n brain-ai
                  kubectl scale deployment brain-ai-green --replicas=1 -n brain-ai
          restartPolicy: OnFailure

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-morning
  namespace: brain-ai
spec:
  # Every day at 7 AM (scale up)
  schedule: "0 7 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: brain-ai-scaler
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Scaling up for business hours..."
                  kubectl scale deployment brain-ai-blue --replicas=5 -n brain-ai
                  kubectl scale deployment brain-ai-green --replicas=3 -n brain-ai
          restartPolicy: OnFailure

---
# ServiceAccount with scaling permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: brain-ai-scaler
  namespace: brain-ai

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-scaler
  namespace: brain-ai
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "deployments/scale"]
    verbs: ["get", "list", "update", "patch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: brain-ai-scaler-binding
  namespace: brain-ai
subjects:
  - kind: ServiceAccount
    name: brain-ai-scaler
roleRef:
  kind: Role
  name: deployment-scaler
  apiGroup: rbac.authorization.k8s.io
```

### 5.3 Periodische Kosten-Reports

```typescript
// scripts/generate-cost-report.ts
import { CostTracker } from '@/lib/monitoring/cost-tracker';
import { sendEmail } from '@/lib/email/sender';

async function generateMonthlyCostReport() {
  const costTracker = new CostTracker();

  // Get last month's data
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const breakdown = await costTracker.getCostBreakdown(lastMonth, endOfLastMonth);

  // Generate HTML report
  const report = `
    <h1>Brain AI - Monthly Cost Report</h1>
    <p><strong>Period:</strong> ${lastMonth.toLocaleDateString()} - ${endOfLastMonth.toLocaleDateString()}</p>

    <h2>Summary</h2>
    <ul>
      <li><strong>Total Cost:</strong> $${breakdown.totalCost.toFixed(2)}</li>
      <li><strong>Models Used:</strong> ${Object.keys(breakdown.byModel).length}</li>
      <li><strong>Workspaces:</strong> ${Object.keys(breakdown.byWorkspace).length}</li>
    </ul>

    <h2>Cost by Model</h2>
    <table border="1">
      <tr><th>Model</th><th>Cost</th><th>% of Total</th></tr>
      ${Object.entries(breakdown.byModel)
        .sort(([,a], [,b]) => b - a)
        .map(([model, cost]) => `
          <tr>
            <td>${model}</td>
            <td>$${cost.toFixed(2)}</td>
            <td>${((cost / breakdown.totalCost) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
    </table>

    <h2>Top Workspaces by Cost</h2>
    <table border="1">
      <tr><th>Workspace ID</th><th>Cost</th></tr>
      ${Object.entries(breakdown.byWorkspace)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([workspace, cost]) => `
          <tr>
            <td>${workspace}</td>
            <td>$${cost.toFixed(2)}</td>
          </tr>
        `).join('')}
    </table>

    <h2>Daily Trend</h2>
    <table border="1">
      <tr><th>Date</th><th>Cost</th></tr>
      ${Object.entries(breakdown.byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, cost]) => `
          <tr>
            <td>${date}</td>
            <td>$${cost.toFixed(2)}</td>
          </tr>
        `).join('')}
    </table>
  `;

  // Send email report
  await sendEmail({
    to: 'finance@company.com',
    cc: 'devops@company.com',
    subject: `Brain AI Cost Report - ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    html: report
  });

  console.log('✓ Monthly cost report sent');
}

// Run on first day of month
generateMonthlyCostReport().catch(console.error);
```

---

## 📅 6. Zeitplan & Prioritäten

### Q1 2025 (Jan-Mär): Stabilisierung & Monitoring

**Woche 1-2**: Grundlegendes Monitoring
- ✅ Grafana Dashboards einrichten
- ✅ Prometheus Alerts konfigurieren
- ✅ Daily monitoring routine etablieren

**Woche 3-4**: Wartungsprozesse
- ✅ Database audit scripts
- ✅ Redis backup automation
- ✅ Security scan automation

**Woche 5-8**: Feedback-System
- [ ] Feedback widget implementieren
- [ ] A/B testing framework
- [ ] User analytics integration

**Woche 9-12**: Dokumentation & Training
- [ ] Operations runbooks finalisieren
- [ ] Team training sessions
- [ ] Incident response drills

---

### Q2 2025 (Apr-Jun): Feature-Erweiterungen

**Monat 1 (April)**: Multi-Tenancy
- [ ] Database schema migration
- [ ] Workspace management UI
- [ ] Member roles & permissions
- [ ] Usage tracking per workspace

**Monat 2 (Mai)**: WebSocket Integration
- [ ] WebSocket server setup
- [ ] Real-time document updates
- [ ] Live agent responses
- [ ] Client-side hooks

**Monat 3 (Juni)**: Adaptive Learning
- [ ] User interaction tracking
- [ ] Preference analysis engine
- [ ] Personalized suggestions
- [ ] Response personalization

---

### Q3 2025 (Jul-Sep): Skalierung & Optimierung

**Juli**: Performance Optimization
- [ ] Query optimization
- [ ] Cache strategy refinement
- [ ] Database indexing review
- [ ] Load testing at scale

**August**: Cost Optimization
- [ ] API usage analytics
- [ ] Model selection optimization
- [ ] Auto-scaling fine-tuning
- [ ] Budget alerting system

**September**: Advanced Features
- [ ] D3.js knowledge graph
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Export enhancements

---

### Q4 2025 (Okt-Dez): Enterprise Features

**Oktober**: Security & Compliance
- [ ] SOC 2 compliance preparation
- [ ] GDPR compliance review
- [ ] Advanced audit logging
- [ ] Data retention policies

**November**: Integration Ecosystem
- [ ] Slack integration
- [ ] Microsoft Teams integration
- [ ] Zapier/Make.com connectors
- [ ] Public API expansion

**Dezember**: Year-End Review
- [ ] Performance review
- [ ] Cost analysis
- [ ] User satisfaction survey
- [ ] 2026 roadmap planning

---

## 📞 Support & Resources

### Team Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| **DevOps Lead** | devops-lead@company.com | Business hours |
| **On-Call Engineer** | #on-call Slack | 24/7 |
| **Product Owner** | product@company.com | Business hours |
| **Security Team** | security@company.com | Business hours |

### Documentation Links

- [Post-Deployment Operations](./BRAIN_AI_POST_DEPLOYMENT.md)
- [Complete Project Summary](../BRAIN_AI_PROJECT_COMPLETE.md)
- [CI/CD Documentation](./BRAIN_AI_CICD_COMPLETE.md)
- [Deployment Guide](./BRAIN_AI_DEPLOYMENT_GUIDE.md)

### Monitoring Dashboards

- **Grafana**: http://grafana.yourdomain.com
- **Prometheus**: http://prometheus.yourdomain.com
- **Kubernetes**: `kubectl` access required
- **Cost Dashboard**: http://grafana.yourdomain.com/d/costs

---

**Version**: 1.0.0
**Maintained By**: DevOps & Product Team
**Next Review**: 2025-11-26
**Status**: Active Roadmap
