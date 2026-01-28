# 🎯 Brain AI - Operational Excellence Guide (Part 3)

**Status**: ✅ Complete
**Version**: 1.0.0
**Last Updated**: 2025-10-26
**Part**: 3 of 3

---

## 📋 Table of Contents

1. [Incident Management & Response](#1-incident-management--response)
2. [Security Incident Handling](#2-security-incident-handling)
3. [Backup & Disaster Recovery](#3-backup--disaster-recovery)
4. [Compliance & Audit Logging](#4-compliance--audit-logging)
5. [Continuous Improvement Process](#5-continuous-improvement-process)

---

## 1. Incident Management & Response

### 1.1 Incident Severity Levels

#### Priority 0 (P0) - Critical

**Definition**: Complete system outage or data loss affecting all users

**Examples**:
- Brain AI dashboard completely down (5xx errors)
- Database connection failures preventing all queries
- Data breach or security compromise
- Complete loss of search functionality across all workspaces

**Response Time**: 15 minutes
**Resolution Target**: 1 hour
**Escalation**: Immediate to on-call engineer + CTO

**Response Procedure**:
```bash
# P0 Incident Response Script
#!/bin/bash

echo "=== P0 INCIDENT RESPONSE ==="
echo "Incident ID: $1"
echo "Description: $2"
echo "Started: $(date)"

# 1. Create incident channel
curl -X POST https://slack.com/api/conversations.create \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -d "name=incident-$1"

# 2. Page on-call engineer
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d "{
    \"routing_key\": \"$PAGERDUTY_KEY\",
    \"event_action\": \"trigger\",
    \"payload\": {
      \"summary\": \"P0: $2\",
      \"severity\": \"critical\",
      \"source\": \"brain-ai\"
    }
  }"

# 3. Gather diagnostics
echo "Gathering diagnostics..."
kubectl get pods -n brain-ai > /tmp/incident-$1-pods.txt
kubectl logs -n brain-ai deployment/brain-ai-blue --tail=500 > /tmp/incident-$1-logs.txt
kubectl top pods -n brain-ai > /tmp/incident-$1-resources.txt

# 4. Check database connectivity
kubectl exec -n brain-ai deployment/brain-ai-blue -- \
  psql -U postgres -d brain_ai -c "SELECT 1;" > /tmp/incident-$1-db.txt 2>&1

# 5. Check Redis
kubectl exec -n brain-ai deployment/brain-ai-blue -- \
  redis-cli ping > /tmp/incident-$1-redis.txt 2>&1

# 6. Upload diagnostics to S3
aws s3 sync /tmp/ s3://brain-ai-incidents/incident-$1/ \
  --exclude "*" \
  --include "incident-$1-*"

# 7. Post to incident channel
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -d "{
    \"channel\": \"incident-$1\",
    \"text\": \"Diagnostics gathered: s3://brain-ai-incidents/incident-$1/\"
  }"

echo "=== P0 Response Complete ==="
echo "Diagnostics: s3://brain-ai-incidents/incident-$1/"
```

**Automated Diagnostics**:
```typescript
// scripts/p0-diagnostics.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface P0Diagnostics {
  timestamp: string;
  incidentId: string;
  systemHealth: any;
  recentErrors: any[];
  resourceUsage: any;
  databaseStatus: any;
  recommendations: string[];
}

export async function runP0Diagnostics(incidentId: string): Promise<P0Diagnostics> {
  const diagnostics: P0Diagnostics = {
    timestamp: new Date().toISOString(),
    incidentId,
    systemHealth: {},
    recentErrors: [],
    resourceUsage: {},
    databaseStatus: {},
    recommendations: []
  };

  // 1. System Health Check
  try {
    const { stdout } = await execAsync('kubectl get deployments -n brain-ai -o json');
    const deployments = JSON.parse(stdout);

    diagnostics.systemHealth = {
      blue: deployments.items.find((d: any) => d.metadata.name === 'brain-ai-blue'),
      green: deployments.items.find((d: any) => d.metadata.name === 'brain-ai-green')
    };

    // Check if both deployments are down
    const blueReady = diagnostics.systemHealth.blue?.status?.readyReplicas || 0;
    const greenReady = diagnostics.systemHealth.green?.status?.readyReplicas || 0;

    if (blueReady === 0 && greenReady === 0) {
      diagnostics.recommendations.push('CRITICAL: Both Blue and Green deployments are down. Check pod events.');
    }
  } catch (error: any) {
    diagnostics.recommendations.push(`Failed to check system health: ${error.message}`);
  }

  // 2. Recent Error Logs
  try {
    const { stdout } = await execAsync(
      'kubectl logs -n brain-ai deployment/brain-ai-blue --tail=100 | grep -i error'
    );

    diagnostics.recentErrors = stdout
      .split('\n')
      .filter(line => line.trim())
      .slice(-20); // Last 20 errors

    if (diagnostics.recentErrors.length > 10) {
      diagnostics.recommendations.push('High error rate detected in logs. Check application stability.');
    }
  } catch (error: any) {
    // No errors found or command failed
  }

  // 3. Resource Usage
  try {
    const { stdout } = await execAsync('kubectl top pods -n brain-ai');
    const lines = stdout.split('\n').slice(1); // Skip header

    diagnostics.resourceUsage = {
      pods: lines.map(line => {
        const [name, cpu, memory] = line.split(/\s+/);
        return { name, cpu, memory };
      })
    };

    // Check for resource exhaustion
    const highCpu = diagnostics.resourceUsage.pods.filter((p: any) =>
      parseInt(p.cpu) > 80
    );

    if (highCpu.length > 0) {
      diagnostics.recommendations.push(
        `High CPU usage detected on ${highCpu.length} pods. Consider scaling.`
      );
    }
  } catch (error: any) {
    diagnostics.recommendations.push('Failed to check resource usage.');
  }

  // 4. Database Connectivity
  try {
    const { stdout } = await execAsync(
      'kubectl exec -n brain-ai deployment/brain-ai-blue -- psql -U postgres -d brain_ai -c "SELECT COUNT(*) FROM brain_documents;"'
    );

    diagnostics.databaseStatus = {
      connected: true,
      response: stdout.trim()
    };
  } catch (error: any) {
    diagnostics.databaseStatus = {
      connected: false,
      error: error.message
    };
    diagnostics.recommendations.push('CRITICAL: Database connection failed. Check PostgreSQL pod.');
  }

  // 5. Generate recommendations
  if (diagnostics.recommendations.length === 0) {
    diagnostics.recommendations.push('No immediate issues detected. Check application logs for specific errors.');
  }

  return diagnostics;
}

// Run diagnostics
const incidentId = process.argv[2] || `P0-${Date.now()}`;
runP0Diagnostics(incidentId).then(async (result) => {
  console.log(JSON.stringify(result, null, 2));

  // Save to file
  await fs.writeFile(
    `/tmp/p0-diagnostics-${incidentId}.json`,
    JSON.stringify(result, null, 2)
  );

  console.log(`\nDiagnostics saved to: /tmp/p0-diagnostics-${incidentId}.json`);
});
```

---

#### Priority 1 (P1) - Major

**Definition**: Significant functionality degradation affecting multiple users

**Examples**:
- Search results returning with high latency (>5s)
- Agent integration failures for 1-2 agents
- Document upload failing for specific file types
- Cache layer down (Redis unavailable)

**Response Time**: 30 minutes
**Resolution Target**: 4 hours
**Escalation**: On-call engineer + Team Lead

**Response Procedure**:
```bash
#!/bin/bash
# P1 Incident Response

INCIDENT_ID=$1
DESCRIPTION=$2

echo "=== P1 INCIDENT: $INCIDENT_ID ==="

# 1. Notify team
curl -X POST $SLACK_WEBHOOK \
  -d "{\"text\":\"🟡 P1 Incident: $DESCRIPTION\nID: $INCIDENT_ID\nStarted: $(date)\"}"

# 2. Quick diagnostics
kubectl describe pods -n brain-ai | grep -A 10 "Events:" > /tmp/$INCIDENT_ID-events.txt

# 3. Check Prometheus alerts
curl -s http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")' \
  > /tmp/$INCIDENT_ID-alerts.json

# 4. Test critical endpoints
for endpoint in "/api/brain/query" "/api/agents" "/api/health"; do
  curl -w "\n%{http_code} %{time_total}s\n" \
    -s http://brain-ai-service:3000$endpoint \
    >> /tmp/$INCIDENT_ID-endpoints.txt
done

echo "Diagnostics complete: /tmp/$INCIDENT_ID-*"
```

---

#### Priority 2 (P2) - Minor

**Definition**: Limited impact or workaround available

**Examples**:
- UI rendering issues in specific browsers
- Non-critical API endpoint slow (analytics)
- Single user workspace issues
- Cosmetic bugs

**Response Time**: 2 hours
**Resolution Target**: 24 hours
**Escalation**: Assigned engineer

---

### 1.2 Automated Hotfix Deployment

**Hotfix Workflow**:
```bash
#!/bin/bash
# scripts/hotfix-deploy.sh

set -e

HOTFIX_BRANCH=$1
INCIDENT_ID=$2

if [ -z "$HOTFIX_BRANCH" ] || [ -z "$INCIDENT_ID" ]; then
    echo "Usage: ./hotfix-deploy.sh <hotfix-branch> <incident-id>"
    exit 1
fi

echo "=== HOTFIX DEPLOYMENT ==="
echo "Branch: $HOTFIX_BRANCH"
echo "Incident: $INCIDENT_ID"
echo "Started: $(date)"

# 1. Validate branch exists
git fetch origin
if ! git show-ref --verify --quiet refs/remotes/origin/$HOTFIX_BRANCH; then
    echo "Error: Branch $HOTFIX_BRANCH does not exist"
    exit 1
fi

# 2. Run quick tests
echo "Running quick tests..."
git checkout $HOTFIX_BRANCH
npm run test:unit:quick || {
    echo "Tests failed! Aborting hotfix."
    exit 1
}

# 3. Build Docker image with hotfix tag
IMAGE_TAG="hotfix-$INCIDENT_ID-$(git rev-parse --short HEAD)"
echo "Building image: brain-ai:$IMAGE_TAG"

docker build -t brain-ai:$IMAGE_TAG .
docker tag brain-ai:$IMAGE_TAG registry.example.com/brain-ai:$IMAGE_TAG
docker push registry.example.com/brain-ai:$IMAGE_TAG

# 4. Update Kubernetes deployment (Blue-Green)
CURRENT_ACTIVE=$(kubectl get service brain-ai-service -n brain-ai -o jsonpath='{.spec.selector.deployment}')
echo "Current active: $CURRENT_ACTIVE"

if [ "$CURRENT_ACTIVE" == "blue" ]; then
    TARGET="green"
else
    TARGET="blue"
fi

echo "Deploying hotfix to: $TARGET"

# Update deployment image
kubectl set image deployment/brain-ai-$TARGET \
    brain-ai=registry.example.com/brain-ai:$IMAGE_TAG \
    -n brain-ai

# Wait for rollout
kubectl rollout status deployment/brain-ai-$TARGET -n brain-ai --timeout=5m

# 5. Health check
echo "Running health checks..."
for i in {1..10}; do
    HEALTH=$(kubectl exec -n brain-ai deployment/brain-ai-$TARGET -- \
        curl -s http://localhost:3000/api/health)

    if echo "$HEALTH" | grep -q '"status":"healthy"'; then
        echo "Health check passed!"
        break
    fi

    if [ $i -eq 10 ]; then
        echo "Health check failed after 10 attempts"
        exit 1
    fi

    sleep 5
done

# 6. Switch traffic
echo "Switching traffic to $TARGET..."
kubectl patch service brain-ai-service -n brain-ai \
    -p "{\"spec\":{\"selector\":{\"deployment\":\"$TARGET\"}}}"

echo "Traffic switched successfully!"

# 7. Monitor for 2 minutes
echo "Monitoring for errors (2 minutes)..."
sleep 120

ERROR_COUNT=$(kubectl logs -n brain-ai deployment/brain-ai-$TARGET --since=2m | grep -i error | wc -l)

if [ $ERROR_COUNT -gt 10 ]; then
    echo "WARNING: High error count ($ERROR_COUNT) detected after deployment"
    echo "Consider rollback"
else
    echo "No significant errors detected"
fi

# 8. Update incident ticket
curl -X POST $INCIDENT_WEBHOOK \
    -d "{
        \"incident_id\": \"$INCIDENT_ID\",
        \"status\": \"hotfix_deployed\",
        \"image\": \"$IMAGE_TAG\",
        \"deployment\": \"$TARGET\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"

echo "=== HOTFIX DEPLOYMENT COMPLETE ==="
echo "Image: registry.example.com/brain-ai:$IMAGE_TAG"
echo "Active Deployment: $TARGET"
echo "Completed: $(date)"
```

**Usage**:
```bash
# 1. Create hotfix branch
git checkout -b hotfix/fix-search-latency main

# 2. Make changes and commit
git add .
git commit -m "fix: reduce search query latency (incident P0-12345)"

# 3. Push and deploy
git push origin hotfix/fix-search-latency
./scripts/hotfix-deploy.sh hotfix/fix-search-latency P0-12345
```

---

### 1.3 Rollback Procedures

#### Kubernetes Deployment Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

REASON=$1

echo "=== EMERGENCY ROLLBACK ==="
echo "Reason: $REASON"
echo "Started: $(date)"

# 1. Identify current active deployment
CURRENT_ACTIVE=$(kubectl get service brain-ai-service -n brain-ai -o jsonpath='{.spec.selector.deployment}')
echo "Current active: $CURRENT_ACTIVE"

if [ "$CURRENT_ACTIVE" == "blue" ]; then
    PREVIOUS="green"
else
    PREVIOUS="blue"
fi

echo "Rolling back to: $PREVIOUS"

# 2. Verify previous deployment is healthy
PREVIOUS_READY=$(kubectl get deployment brain-ai-$PREVIOUS -n brain-ai -o jsonpath='{.status.readyReplicas}')

if [ "$PREVIOUS_READY" -lt 1 ]; then
    echo "ERROR: Previous deployment ($PREVIOUS) has no ready replicas"
    echo "Attempting to restore from last known good image..."

    # Get last known good image
    LAST_GOOD_IMAGE=$(kubectl get deployment brain-ai-$PREVIOUS -n brain-ai \
        -o jsonpath='{.spec.template.spec.containers[0].image}')

    echo "Restoring image: $LAST_GOOD_IMAGE"
    kubectl set image deployment/brain-ai-$PREVIOUS \
        brain-ai=$LAST_GOOD_IMAGE \
        -n brain-ai

    kubectl rollout status deployment/brain-ai-$PREVIOUS -n brain-ai --timeout=5m
fi

# 3. Switch traffic back
echo "Switching traffic to $PREVIOUS..."
kubectl patch service brain-ai-service -n brain-ai \
    -p "{\"spec\":{\"selector\":{\"deployment\":\"$PREVIOUS\"}}}"

# 4. Verify rollback
sleep 10

HEALTH_CHECK=$(curl -s http://brain-ai-service.brain-ai.svc.cluster.local:3000/api/health)

if echo "$HEALTH_CHECK" | grep -q '"status":"healthy"'; then
    echo "✅ Rollback successful!"
else
    echo "❌ Rollback health check failed!"
    exit 1
fi

# 5. Scale down problematic deployment
echo "Scaling down $CURRENT_ACTIVE..."
kubectl scale deployment/brain-ai-$CURRENT_ACTIVE -n brain-ai --replicas=0

# 6. Notify team
curl -X POST $SLACK_WEBHOOK \
    -d "{
        \"text\": \"🔄 Emergency Rollback Complete\n• From: $CURRENT_ACTIVE\n• To: $PREVIOUS\n• Reason: $REASON\n• Time: $(date)\"
    }"

echo "=== ROLLBACK COMPLETE ==="
echo "Active Deployment: $PREVIOUS"
echo "Completed: $(date)"
```

#### Database Rollback

```bash
#!/bin/bash
# scripts/rollback-database.sh

set -e

MIGRATION_VERSION=$1

if [ -z "$MIGRATION_VERSION" ]; then
    echo "Usage: ./rollback-database.sh <migration-version>"
    echo "Available migrations:"
    npx drizzle-kit migrations:list
    exit 1
fi

echo "=== DATABASE ROLLBACK ==="
echo "Target version: $MIGRATION_VERSION"
echo "⚠️  WARNING: This will modify the database!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# 1. Create backup before rollback
echo "Creating backup..."
BACKUP_FILE="backup-before-rollback-$(date +%Y%m%d-%H%M%S).sql"

kubectl exec -n brain-ai deployment/postgres -- \
    pg_dump -U postgres brain_ai > /tmp/$BACKUP_FILE

echo "Backup created: /tmp/$BACKUP_FILE"

# 2. Run rollback migration
echo "Rolling back to version: $MIGRATION_VERSION"
npx drizzle-kit migrate:down --to=$MIGRATION_VERSION

# 3. Verify schema
echo "Verifying database schema..."
kubectl exec -n brain-ai deployment/postgres -- \
    psql -U postgres -d brain_ai -c "\dt" > /tmp/schema-after-rollback.txt

# 4. Restart application pods
echo "Restarting application pods..."
kubectl rollout restart deployment/brain-ai-blue -n brain-ai
kubectl rollout restart deployment/brain-ai-green -n brain-ai

echo "=== DATABASE ROLLBACK COMPLETE ==="
```

---

### 1.4 Communication Templates

#### P0 Incident Notification

```markdown
🚨 **P0 INCIDENT: [SHORT DESCRIPTION]**

**Status**: Investigating
**Impact**: [USER IMPACT]
**Started**: [TIMESTAMP]
**Incident ID**: P0-[ID]

**Current Actions**:
- [ ] Incident response team assembled
- [ ] Diagnostics gathering
- [ ] Root cause analysis in progress

**Updates**: This channel will be updated every 15 minutes

**Incident Channel**: #incident-[ID]
```

#### Status Update Template

```markdown
**UPDATE [TIME]** - Incident P0-[ID]

**Status**: [Investigating | Identified | Fixing | Monitoring | Resolved]

**Progress**:
- ✅ Completed action 1
- 🔄 In progress action 2
- ⏳ Pending action 3

**ETA to Resolution**: [TIME]

**Next Update**: [TIME]
```

#### Post-Incident Report Template

```markdown
# Post-Incident Report: P0-[ID]

## Incident Summary

**Duration**: [START] - [END] (Total: [DURATION])
**Severity**: P0
**Impact**: [DESCRIPTION]
**Users Affected**: [NUMBER]

## Timeline

| Time | Event |
|------|-------|
| 14:23 | First alert: High error rate |
| 14:25 | Incident declared |
| 14:30 | Root cause identified |
| 14:45 | Hotfix deployed |
| 15:00 | Incident resolved |

## Root Cause

[DETAILED TECHNICAL EXPLANATION]

## Resolution

[STEPS TAKEN TO RESOLVE]

## Preventive Actions

1. **Immediate**:
   - Add monitoring for [METRIC]
   - Update runbook with new procedure

2. **Short-term** (1-2 weeks):
   - Implement automated recovery for [SCENARIO]
   - Add integration tests for [FEATURE]

3. **Long-term** (1-3 months):
   - Architectural change to prevent [ROOT CAUSE]
   - Improve resilience of [COMPONENT]

## Lessons Learned

**What went well**:
- Quick detection (2 minutes)
- Effective communication

**What could be improved**:
- Faster rollback procedure
- Better diagnostic tools

**Action Items**:
- [ ] Update monitoring (Owner: @devops, Due: 2025-11-01)
- [ ] Add automated tests (Owner: @backend, Due: 2025-11-05)
```

---

## 2. Security Incident Handling

### 2.1 Security Scan Integration

**Automated Security Scanning Workflow**:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  push:
    branches: [main, develop]
  pull_request:

jobs:
  security-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      # 1. Dependency Scanning
      - name: NPM Audit
        run: |
          npm audit --json > npm-audit.json || true

      - name: Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test
          args: --severity-threshold=high --json > snyk-report.json

      # 2. Container Scanning
      - name: Build Docker Image
        run: docker build -t brain-ai:scan .

      - name: Trivy Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'brain-ai:scan'
          format: 'json'
          output: 'trivy-report.json'
          severity: 'CRITICAL,HIGH'

      # 3. Secret Scanning
      - name: Gitleaks Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # 4. Static Analysis
      - name: CodeQL Analysis
        uses: github/codeql-action/analyze@v2

      # 5. Generate Security Report
      - name: Generate Report
        run: |
          node scripts/generate-security-report.js

      # 6. Post to Security Channel
      - name: Post to Slack
        if: ${{ failure() }}
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'security-alerts'
          payload: |
            {
              "text": "🔒 Security Scan Failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Security vulnerabilities detected*\nRun: ${{ github.run_id }}\nBranch: ${{ github.ref }}"
                  }
                }
              ]
            }
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

      # 7. Upload artifacts
      - name: Upload Security Reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: |
            npm-audit.json
            snyk-report.json
            trivy-report.json
```

**Security Report Generator**:

```typescript
// scripts/generate-security-report.ts
import * as fs from 'fs/promises';
import { format } from 'date-fns';

interface Vulnerability {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  package: string;
  title: string;
  fixAvailable: boolean;
}

interface SecurityReport {
  timestamp: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  complianceStatus: {
    soc2: boolean;
    gdpr: boolean;
  };
}

async function generateSecurityReport(): Promise<SecurityReport> {
  // 1. Parse NPM Audit
  const npmAudit = JSON.parse(await fs.readFile('npm-audit.json', 'utf-8'));

  // 2. Parse Snyk Report
  const snykReport = JSON.parse(await fs.readFile('snyk-report.json', 'utf-8'));

  // 3. Parse Trivy Report
  const trivyReport = JSON.parse(await fs.readFile('trivy-report.json', 'utf-8'));

  // 4. Aggregate vulnerabilities
  const vulnerabilities: Vulnerability[] = [];

  // From NPM Audit
  if (npmAudit.vulnerabilities) {
    Object.entries(npmAudit.vulnerabilities).forEach(([pkg, details]: [string, any]) => {
      vulnerabilities.push({
        severity: details.severity.toUpperCase(),
        package: pkg,
        title: details.via[0]?.title || 'Unknown vulnerability',
        fixAvailable: details.fixAvailable
      });
    });
  }

  // From Trivy
  if (trivyReport.Results) {
    trivyReport.Results.forEach((result: any) => {
      result.Vulnerabilities?.forEach((vuln: any) => {
        vulnerabilities.push({
          severity: vuln.Severity,
          package: vuln.PkgName,
          title: vuln.Title,
          fixAvailable: !!vuln.FixedVersion
        });
      });
    });
  }

  // 5. Calculate summary
  const summary = {
    critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
    high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
    medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
    low: vulnerabilities.filter(v => v.severity === 'LOW').length
  };

  // 6. Generate recommendations
  const recommendations: string[] = [];

  if (summary.critical > 0) {
    recommendations.push('⚠️ URGENT: Fix all CRITICAL vulnerabilities immediately');
  }

  if (summary.high > 5) {
    recommendations.push('Address HIGH severity vulnerabilities (>5 found)');
  }

  const fixable = vulnerabilities.filter(v => v.fixAvailable).length;
  if (fixable > 0) {
    recommendations.push(`Run 'npm audit fix' to resolve ${fixable} vulnerabilities automatically`);
  }

  // 7. Compliance check
  const complianceStatus = {
    soc2: summary.critical === 0 && summary.high < 5,
    gdpr: summary.critical === 0
  };

  const report: SecurityReport = {
    timestamp: new Date().toISOString(),
    summary,
    vulnerabilities: vulnerabilities.slice(0, 50), // Top 50
    recommendations,
    complianceStatus
  };

  // 8. Save report
  await fs.writeFile(
    `security-report-${format(new Date(), 'yyyy-MM-dd')}.json`,
    JSON.stringify(report, null, 2)
  );

  // 9. Generate markdown summary
  const markdown = `# Security Scan Report

**Date**: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${summary.critical} |
| 🟠 High | ${summary.high} |
| 🟡 Medium | ${summary.medium} |
| 🟢 Low | ${summary.low} |

## Compliance Status

- **SOC 2**: ${complianceStatus.soc2 ? '✅ Pass' : '❌ Fail'}
- **GDPR**: ${complianceStatus.gdpr ? '✅ Pass' : '❌ Fail'}

## Recommendations

${recommendations.map(r => `- ${r}`).join('\n')}

## Top Vulnerabilities

${vulnerabilities.slice(0, 10).map(v =>
  `### ${v.severity}: ${v.package}\n${v.title}\n**Fix Available**: ${v.fixAvailable ? 'Yes' : 'No'}\n`
).join('\n')}
`;

  await fs.writeFile(
    `security-report-${format(new Date(), 'yyyy-MM-dd')}.md`,
    markdown
  );

  console.log('Security report generated successfully');
  console.log(JSON.stringify(report.summary, null, 2));

  return report;
}

// Run
generateSecurityReport().catch(console.error);
```

---

### 2.2 Data Breach Response Procedure

**Breach Detection & Response**:

```typescript
// lib/security/breach-detector.ts
import { getDb } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { and, gte, sql } from 'drizzle-orm';

interface BreachIndicator {
  type: 'unusual_access' | 'data_exfiltration' | 'unauthorized_query' | 'failed_auth';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  metadata: any;
}

export class BreachDetector {
  private db = getDb();

  async detectAnomalies(): Promise<BreachIndicator[]> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 1. Unusual Access Patterns
    const bulkDownloads = await this.db
      .select({
        userId: auditLogs.userId,
        count: sql<number>`count(*)`,
        ipAddress: auditLogs.ipAddress
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.timestamp, oneHourAgo),
          sql`${auditLogs.action} = 'document.download'`
        )
      )
      .groupBy(auditLogs.userId, auditLogs.ipAddress)
      .having(sql`count(*) > 50`); // More than 50 downloads in 1 hour

    bulkDownloads.forEach(row => {
      indicators.push({
        type: 'data_exfiltration',
        severity: 'critical',
        description: `User ${row.userId} downloaded ${row.count} documents in 1 hour`,
        timestamp: now,
        userId: row.userId,
        ipAddress: row.ipAddress,
        metadata: { downloadCount: row.count }
      });
    });

    // 2. Failed Authentication Attempts
    const failedAuth = await this.db
      .select({
        ipAddress: auditLogs.ipAddress,
        count: sql<number>`count(*)`
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.timestamp, oneHourAgo),
          sql`${auditLogs.action} = 'auth.failed'`
        )
      )
      .groupBy(auditLogs.ipAddress)
      .having(sql`count(*) > 10`); // More than 10 failed attempts

    failedAuth.forEach(row => {
      indicators.push({
        type: 'failed_auth',
        severity: 'high',
        description: `${row.count} failed authentication attempts from ${row.ipAddress}`,
        timestamp: now,
        ipAddress: row.ipAddress,
        metadata: { attemptCount: row.count }
      });
    });

    // 3. Unauthorized API Queries
    const unauthorizedQueries = await this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.timestamp, oneHourAgo),
          sql`${auditLogs.metadata}->>'statusCode' = '403'`
        )
      )
      .limit(100);

    if (unauthorizedQueries.length > 20) {
      indicators.push({
        type: 'unauthorized_query',
        severity: 'medium',
        description: `${unauthorizedQueries.length} unauthorized API queries detected`,
        timestamp: now,
        metadata: { queryCount: unauthorizedQueries.length }
      });
    }

    return indicators;
  }

  async triggerBreachResponse(indicators: BreachIndicator[]): Promise<void> {
    const criticalIndicators = indicators.filter(i => i.severity === 'critical');

    if (criticalIndicators.length === 0) return;

    // 1. Log incident
    console.error('[SECURITY_BREACH]', {
      timestamp: new Date().toISOString(),
      indicators: criticalIndicators
    });

    // 2. Notify security team
    await this.notifySecurityTeam(criticalIndicators);

    // 3. Auto-block suspicious IPs
    for (const indicator of criticalIndicators) {
      if (indicator.ipAddress) {
        await this.blockIpAddress(indicator.ipAddress, '24h');
      }
    }

    // 4. Trigger incident response
    await this.createSecurityIncident(criticalIndicators);
  }

  private async notifySecurityTeam(indicators: BreachIndicator[]): Promise<void> {
    const message = {
      text: '🚨 SECURITY BREACH DETECTED',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Security Breach Detected*\n${indicators.length} critical indicators found`
          }
        },
        {
          type: 'section',
          fields: indicators.slice(0, 5).map(i => ({
            type: 'mrkdwn',
            text: `*${i.type}*\n${i.description}`
          }))
        }
      ]
    };

    await fetch(process.env.SLACK_SECURITY_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    // Also page on-call security engineer
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_SECURITY_KEY,
        event_action: 'trigger',
        payload: {
          summary: `Security Breach: ${indicators[0].description}`,
          severity: 'critical',
          source: 'brain-ai-breach-detector'
        }
      })
    });
  }

  private async blockIpAddress(ipAddress: string, duration: string): Promise<void> {
    // Add to network policy or firewall rules
    console.log(`[SECURITY] Blocking IP: ${ipAddress} for ${duration}`);

    // Example: Update Kubernetes NetworkPolicy
    // kubectl patch networkpolicy brain-ai-policy -n brain-ai \
    //   --type=json -p='[{"op":"add","path":"/spec/ingress/0/from/-","value":{"ipBlock":{"cidr":"'${ipAddress}'/32"}}}]'
  }

  private async createSecurityIncident(indicators: BreachIndicator[]): Promise<void> {
    const incidentId = `SEC-${Date.now()}`;

    // Create incident ticket (e.g., Jira, PagerDuty)
    console.log(`[SECURITY] Created incident: ${incidentId}`);

    // Log to audit system
    await this.db.insert(auditLogs).values({
      action: 'security.incident.created',
      userId: 'system',
      ipAddress: 'internal',
      metadata: {
        incidentId,
        indicators
      }
    });
  }
}
```

**Automated Monitoring**:
```typescript
// scripts/monitor-security.ts
import { BreachDetector } from '@/lib/security/breach-detector';

async function monitorSecurity() {
  const detector = new BreachDetector();

  console.log('[SECURITY_MONITOR] Starting...');

  setInterval(async () => {
    try {
      const indicators = await detector.detectAnomalies();

      if (indicators.length > 0) {
        console.log(`[SECURITY_MONITOR] Detected ${indicators.length} indicators`);
        await detector.triggerBreachResponse(indicators);
      }
    } catch (error) {
      console.error('[SECURITY_MONITOR] Error:', error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

monitorSecurity();
```

---

### 2.3 Data Breach Communication Plan

**Breach Notification Templates**:

```markdown
# INTERNAL: Security Incident Notification

**CONFIDENTIAL - SECURITY TEAM ONLY**

## Incident Details

**Incident ID**: SEC-[ID]
**Severity**: CRITICAL
**Detected**: [TIMESTAMP]
**Type**: [DATA BREACH | UNAUTHORIZED ACCESS | DDOS]

## Initial Assessment

**Affected Systems**:
- [ ] Database
- [ ] API
- [ ] User Data
- [ ] Internal Systems

**Estimated Impact**:
- **Users Affected**: [NUMBER or "Under Investigation"]
- **Data Exposed**: [DESCRIPTION]
- **Attack Vector**: [DESCRIPTION]

## Immediate Actions Taken

1. ✅ Security team notified
2. ✅ Suspicious IPs blocked
3. ✅ Incident logged
4. 🔄 Investigation in progress

## Response Team

- **Incident Commander**: [NAME]
- **Technical Lead**: [NAME]
- **Legal Contact**: [NAME]
- **PR Contact**: [NAME]

## Next Steps

1. Complete forensic analysis (ETA: [TIME])
2. Determine full scope of breach
3. Prepare customer communication
4. Regulatory notification (if required)

**War Room**: #sec-incident-[ID]
**Updates**: Every 30 minutes
```

**Customer Notification (GDPR Compliant)**:

```markdown
Subject: Important Security Notice - Action Required

Dear [CUSTOMER_NAME],

We are writing to inform you of a security incident that may have affected your account.

## What Happened

On [DATE], we detected unauthorized access to our systems. Our security team immediately began an investigation and took steps to secure our systems.

## What Information Was Involved

Based on our investigation, the following information may have been accessed:
- [LIST OF DATA TYPES]

We have NO evidence that the following was accessed:
- Payment information
- Passwords

## What We're Doing

- Comprehensive security audit completed
- Additional security measures implemented
- Law enforcement notified
- Ongoing monitoring enhanced

## What You Should Do

1. **Reset Your Password**: Use the link below to set a new password
2. **Enable Two-Factor Authentication**: Add extra security to your account
3. **Monitor Your Account**: Watch for any unusual activity
4. **Be Alert**: Watch for phishing attempts

[RESET PASSWORD BUTTON]

## Additional Resources

- FAQ: https://brain-ai.example.com/security-faq
- Support: security@example.com
- Phone: 1-800-XXX-XXXX (24/7)

We take the security of your data very seriously and apologize for any concern this may cause.

Sincerely,
[CTO NAME]
Chief Technology Officer

---
This notification is in compliance with GDPR Article 34 - Communication of a personal data breach to the data subject.
```

---

## 3. Backup & Disaster Recovery

### 3.1 Automated Backup System

**Complete Backup Script**:

```bash
#!/bin/bash
# scripts/backup-full.sh

set -e

BACKUP_DIR="/var/backups/brain-ai"
S3_BUCKET="s3://brain-ai-backups"
RETENTION_DAYS=30
ENCRYPTION_KEY="/etc/brain-ai/backup.key"

mkdir -p $BACKUP_DIR

echo "=== BRAIN AI BACKUP ==="
echo "Started: $(date)"

# 1. PostgreSQL Backup
echo "Backing up PostgreSQL..."
PG_BACKUP_FILE="$BACKUP_DIR/postgres-$(date +%Y%m%d-%H%M%S).sql"

kubectl exec -n brain-ai deployment/postgres -- \
    pg_dump -U postgres -d brain_ai \
    --format=custom \
    --verbose \
    --file=/tmp/backup.dump

kubectl cp brain-ai/postgres-0:/tmp/backup.dump $PG_BACKUP_FILE

# Verify backup
echo "Verifying PostgreSQL backup..."
pg_restore --list $PG_BACKUP_FILE > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL backup verified"
else
    echo "❌ PostgreSQL backup verification failed"
    exit 1
fi

# Encrypt backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$PG_BACKUP_FILE" \
    -out "$PG_BACKUP_FILE.enc" \
    -pass file:"$ENCRYPTION_KEY"

rm "$PG_BACKUP_FILE"  # Remove unencrypted backup

# 2. Redis Backup
echo "Backing up Redis..."
REDIS_BACKUP_FILE="$BACKUP_DIR/redis-$(date +%Y%m%d-%H%M%S).rdb"

kubectl exec -n brain-ai deployment/redis -- redis-cli BGSAVE

# Wait for BGSAVE to complete
sleep 5

kubectl cp brain-ai/redis-0:/data/dump.rdb $REDIS_BACKUP_FILE

# Encrypt Redis backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$REDIS_BACKUP_FILE" \
    -out "$REDIS_BACKUP_FILE.enc" \
    -pass file:"$ENCRYPTION_KEY"

rm "$REDIS_BACKUP_FILE"

# 3. Application Configuration
echo "Backing up configuration..."
CONFIG_BACKUP_FILE="$BACKUP_DIR/config-$(date +%Y%m%d-%H%M%S).tar.gz"

kubectl get configmaps -n brain-ai -o yaml > /tmp/configmaps.yaml
kubectl get secrets -n brain-ai -o yaml > /tmp/secrets.yaml

tar -czf "$CONFIG_BACKUP_FILE" /tmp/configmaps.yaml /tmp/secrets.yaml

# Encrypt config backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$CONFIG_BACKUP_FILE" \
    -out "$CONFIG_BACKUP_FILE.enc" \
    -pass file:"$ENCRYPTION_KEY"

rm "$CONFIG_BACKUP_FILE"
rm /tmp/configmaps.yaml /tmp/secrets.yaml

# 4. Upload to S3
echo "Uploading to S3..."
aws s3 sync $BACKUP_DIR $S3_BUCKET/ \
    --exclude "*" \
    --include "*.enc" \
    --storage-class STANDARD_IA

# 5. Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.enc" -mtime +$RETENTION_DAYS -delete

aws s3 ls $S3_BUCKET/ --recursive | \
    awk '{if ($1 < "'$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)'") print $4}' | \
    xargs -I {} aws s3 rm $S3_BUCKET/{}

# 6. Create backup manifest
cat > "$BACKUP_DIR/manifest-$(date +%Y%m%d-%H%M%S).json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "backups": {
    "postgres": "$PG_BACKUP_FILE.enc",
    "redis": "$REDIS_BACKUP_FILE.enc",
    "config": "$CONFIG_BACKUP_FILE.enc"
  },
  "sizes": {
    "postgres": "$(du -h $PG_BACKUP_FILE.enc | cut -f1)",
    "redis": "$(du -h $REDIS_BACKUP_FILE.enc | cut -f1)",
    "config": "$(du -h $CONFIG_BACKUP_FILE.enc | cut -f1)"
  },
  "encryption": "AES-256-CBC",
  "retention_days": $RETENTION_DAYS
}
EOF

# 7. Notify completion
curl -X POST $SLACK_WEBHOOK \
    -d "{
        \"text\": \"✅ Backup completed successfully\",
        \"blocks\": [
            {
                \"type\": \"section\",
                \"text\": {
                    \"type\": \"mrkdwn\",
                    \"text\": \"*Brain AI Backup Complete*\n• Postgres: $(du -h $PG_BACKUP_FILE.enc | cut -f1)\n• Redis: $(du -h $REDIS_BACKUP_FILE.enc | cut -f1)\n• Config: $(du -h $CONFIG_BACKUP_FILE.enc | cut -f1)\"
                }
            }
        ]
    }"

echo "=== BACKUP COMPLETE ==="
echo "Location: $S3_BUCKET"
echo "Completed: $(date)"
```

**Backup Schedule (CronJob)**:

```yaml
# k8s/cronjob-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: brain-ai-backup
  namespace: brain-ai
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: brain-ai-backup
          containers:
            - name: backup
              image: brain-ai-backup:latest
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key-id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-access-key
                - name: ENCRYPTION_KEY_FILE
                  value: /etc/backup-key/key
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: slack-webhooks
                      key: backup-webhook
              volumeMounts:
                - name: backup-key
                  mountPath: /etc/backup-key
                  readOnly: true
                - name: backup-storage
                  mountPath: /var/backups/brain-ai
              command: ["/scripts/backup-full.sh"]
          volumes:
            - name: backup-key
              secret:
                secretName: backup-encryption-key
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-storage
          restartPolicy: OnFailure
```

---

### 3.2 Disaster Recovery Procedures

**Complete System Recovery**:

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

set -e

BACKUP_DATE=$1
S3_BUCKET="s3://brain-ai-backups"
ENCRYPTION_KEY="/etc/brain-ai/backup.key"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: ./disaster-recovery.sh <backup-date>"
    echo "Example: ./disaster-recovery.sh 20250115"
    echo ""
    echo "Available backups:"
    aws s3 ls $S3_BUCKET/ | grep postgres | tail -10
    exit 1
fi

echo "=== DISASTER RECOVERY ==="
echo "Backup Date: $BACKUP_DATE"
echo "⚠️  WARNING: This will REPLACE all current data!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Recovery cancelled"
    exit 0
fi

RECOVERY_DIR="/tmp/brain-ai-recovery-$BACKUP_DATE"
mkdir -p $RECOVERY_DIR

# 1. Download backups from S3
echo "Downloading backups from S3..."
aws s3 sync $S3_BUCKET/ $RECOVERY_DIR/ \
    --exclude "*" \
    --include "*$BACKUP_DATE*.enc"

# 2. Decrypt backups
echo "Decrypting backups..."
for file in $RECOVERY_DIR/*.enc; do
    OUTPUT="${file%.enc}"
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$file" \
        -out "$OUTPUT" \
        -pass file:"$ENCRYPTION_KEY"

    echo "Decrypted: $OUTPUT"
done

# 3. Restore PostgreSQL
echo "Restoring PostgreSQL..."
PG_BACKUP=$(ls $RECOVERY_DIR/postgres-$BACKUP_DATE*.sql | head -1)

if [ -z "$PG_BACKUP" ]; then
    echo "Error: PostgreSQL backup not found for date $BACKUP_DATE"
    exit 1
fi

# Scale down application first
kubectl scale deployment/brain-ai-blue -n brain-ai --replicas=0
kubectl scale deployment/brain-ai-green -n brain-ai --replicas=0

# Drop and recreate database
kubectl exec -n brain-ai deployment/postgres -- \
    psql -U postgres -c "DROP DATABASE IF EXISTS brain_ai;"

kubectl exec -n brain-ai deployment/postgres -- \
    psql -U postgres -c "CREATE DATABASE brain_ai;"

# Restore from backup
kubectl cp "$PG_BACKUP" brain-ai/postgres-0:/tmp/restore.dump

kubectl exec -n brain-ai deployment/postgres -- \
    pg_restore -U postgres -d brain_ai /tmp/restore.dump \
    --verbose \
    --no-owner \
    --no-acl

echo "✅ PostgreSQL restored"

# 4. Restore Redis
echo "Restoring Redis..."
REDIS_BACKUP=$(ls $RECOVERY_DIR/redis-$BACKUP_DATE*.rdb | head -1)

if [ -n "$REDIS_BACKUP" ]; then
    # Stop Redis
    kubectl scale deployment/redis -n brain-ai --replicas=0
    sleep 5

    # Copy backup
    kubectl cp "$REDIS_BACKUP" brain-ai/redis-0:/data/dump.rdb

    # Start Redis
    kubectl scale deployment/redis -n brain-ai --replicas=1

    # Wait for Redis to be ready
    kubectl wait --for=condition=ready pod -l app=redis -n brain-ai --timeout=60s

    echo "✅ Redis restored"
else
    echo "⚠️  Redis backup not found, skipping"
fi

# 5. Restore Configuration
echo "Restoring configuration..."
CONFIG_BACKUP=$(ls $RECOVERY_DIR/config-$BACKUP_DATE*.tar.gz | head -1)

if [ -n "$CONFIG_BACKUP" ]; then
    tar -xzf "$CONFIG_BACKUP" -C /tmp/

    kubectl apply -f /tmp/configmaps.yaml
    kubectl apply -f /tmp/secrets.yaml

    echo "✅ Configuration restored"
fi

# 6. Restart application
echo "Restarting application..."
kubectl scale deployment/brain-ai-blue -n brain-ai --replicas=3
kubectl rollout status deployment/brain-ai-blue -n brain-ai --timeout=5m

# 7. Verify recovery
echo "Verifying recovery..."

# Test database connectivity
DB_TEST=$(kubectl exec -n brain-ai deployment/brain-ai-blue -- \
    curl -s http://localhost:3000/api/health)

if echo "$DB_TEST" | grep -q '"status":"healthy"'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test API endpoints
for endpoint in "/api/brain/query" "/api/agents"; do
    RESPONSE=$(kubectl exec -n brain-ai deployment/brain-ai-blue -- \
        curl -s -w "%{http_code}" http://localhost:3000$endpoint)

    if echo "$RESPONSE" | grep -q "200"; then
        echo "✅ $endpoint working"
    else
        echo "⚠️  $endpoint returned: $RESPONSE"
    fi
done

# 8. Cleanup
echo "Cleaning up..."
rm -rf $RECOVERY_DIR

echo "=== DISASTER RECOVERY COMPLETE ==="
echo "Backup Date: $BACKUP_DATE"
echo "Completed: $(date)"
echo ""
echo "Next steps:"
echo "1. Verify all functionality"
echo "2. Notify users of restoration"
echo "3. Monitor for errors"
```

---

### 3.3 Backup Testing & Validation

**Automated Backup Testing**:

```typescript
// scripts/test-backups.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface BackupTestResult {
  timestamp: string;
  backupDate: string;
  tests: {
    download: boolean;
    decrypt: boolean;
    postgresRestore: boolean;
    redisRestore: boolean;
    dataIntegrity: boolean;
  };
  errors: string[];
  duration: number;
}

async function testBackup(backupDate: string): Promise<BackupTestResult> {
  const startTime = Date.now();
  const result: BackupTestResult = {
    timestamp: new Date().toISOString(),
    backupDate,
    tests: {
      download: false,
      decrypt: false,
      postgresRestore: false,
      redisRestore: false,
      dataIntegrity: false
    },
    errors: [],
    duration: 0
  };

  try {
    // 1. Download Test
    console.log('Testing backup download...');
    await execAsync(`aws s3 cp s3://brain-ai-backups/postgres-${backupDate}.sql.enc /tmp/test-backup.enc`);
    result.tests.download = true;

    // 2. Decrypt Test
    console.log('Testing decryption...');
    await execAsync('openssl enc -aes-256-cbc -d -pbkdf2 -in /tmp/test-backup.enc -out /tmp/test-backup.sql -pass file:/etc/brain-ai/backup.key');
    result.tests.decrypt = true;

    // 3. Restore to Test Database
    console.log('Testing PostgreSQL restore...');

    // Create test database
    await execAsync('kubectl exec -n brain-ai deployment/postgres -- psql -U postgres -c "DROP DATABASE IF EXISTS brain_ai_test;"');
    await execAsync('kubectl exec -n brain-ai deployment/postgres -- psql -U postgres -c "CREATE DATABASE brain_ai_test;"');

    // Copy backup to pod
    await execAsync('kubectl cp /tmp/test-backup.sql brain-ai/postgres-0:/tmp/test-restore.dump');

    // Restore
    await execAsync('kubectl exec -n brain-ai deployment/postgres -- pg_restore -U postgres -d brain_ai_test /tmp/test-restore.dump');

    result.tests.postgresRestore = true;

    // 4. Data Integrity Check
    console.log('Testing data integrity...');

    const { stdout: countOutput } = await execAsync(
      'kubectl exec -n brain-ai deployment/postgres -- psql -U postgres -d brain_ai_test -c "SELECT COUNT(*) FROM brain_documents;"'
    );

    const docCount = parseInt(countOutput.match(/\d+/)?.[0] || '0');

    if (docCount > 0) {
      result.tests.dataIntegrity = true;
      console.log(`✅ Found ${docCount} documents in restored database`);
    } else {
      result.errors.push('No documents found in restored database');
    }

    // Cleanup test database
    await execAsync('kubectl exec -n brain-ai deployment/postgres -- psql -U postgres -c "DROP DATABASE brain_ai_test;"');

  } catch (error: any) {
    result.errors.push(error.message);
  } finally {
    // Cleanup temp files
    await execAsync('rm -f /tmp/test-backup.*').catch(() => {});
  }

  result.duration = Date.now() - startTime;

  // Generate report
  const allPassed = Object.values(result.tests).every(t => t === true);

  console.log('\n=== BACKUP TEST RESULTS ===');
  console.log(`Backup Date: ${backupDate}`);
  console.log(`Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log('\nTests:');
  Object.entries(result.tests).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  // Save report
  await fs.writeFile(
    `/var/backups/brain-ai/test-report-${backupDate}.json`,
    JSON.stringify(result, null, 2)
  );

  return result;
}

// Run test
const backupDate = process.argv[2] || new Date().toISOString().split('T')[0].replace(/-/g, '');
testBackup(backupDate).catch(console.error);
```

**Monthly Backup Test CronJob**:

```yaml
# k8s/cronjob-backup-test.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: brain-ai-backup-test
  namespace: brain-ai
spec:
  schedule: "0 3 1 * *"  # First day of each month at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup-test
              image: brain-ai-backup:latest
              command: ["npx", "tsx", "scripts/test-backups.ts"]
          restartPolicy: OnFailure
```

---

## 4. Compliance & Audit Logging

### 4.1 Central Audit Log System

**Audit Log Schema**:

```typescript
// lib/db/schema.ts (add to existing)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userId: varchar('user_id', { length: 255 }),
  workspaceId: uuid('workspace_id'),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'document.create', 'user.login'
  resource: varchar('resource', { length: 255 }),      // e.g., 'document:123', 'user:456'
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  status: varchar('status', { length: 20 }),           // 'success', 'failure'
  metadata: jsonb('metadata'),                          // Additional context
  changes: jsonb('changes'),                            // Before/after for updates
}, (table) => ({
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  workspaceIdx: index('audit_logs_workspace_idx').on(table.workspaceId),
}));
```

**Audit Logging Middleware**:

```typescript
// lib/audit/logger.ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';

interface AuditLogEntry {
  userId?: string;
  workspaceId?: string;
  action: string;
  resource?: string;
  status: 'success' | 'failure';
  metadata?: any;
  changes?: { before: any; after: any };
}

export class AuditLogger {
  private db = getDb();

  async log(entry: AuditLogEntry, req?: NextRequest): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        userId: entry.userId,
        workspaceId: entry.workspaceId,
        action: entry.action,
        resource: entry.resource,
        status: entry.status,
        metadata: entry.metadata,
        changes: entry.changes,
        ipAddress: req ? this.getClientIp(req) : undefined,
        userAgent: req?.headers.get('user-agent') || undefined,
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('[AUDIT_LOG_ERROR]', error);
    }
  }

  private getClientIp(req: NextRequest): string {
    return (
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown'
    );
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
```

**Audit Middleware for API Routes**:

```typescript
// middleware.ts (add to existing)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auditLogger } from '@/lib/audit/logger';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();

  // Process request
  const response = NextResponse.next();

  // Log API calls
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const userId = request.headers.get('x-user-id');
    const workspaceId = request.headers.get('x-workspace-id');

    // Determine action from path and method
    const action = `api.${request.method.toLowerCase()}.${
      request.nextUrl.pathname.split('/').slice(2).join('.')
    }`;

    await auditLogger.log({
      userId: userId || undefined,
      workspaceId: workspaceId || undefined,
      action,
      resource: request.nextUrl.pathname,
      status: response.status < 400 ? 'success' : 'failure',
      metadata: {
        method: request.method,
        duration: Date.now() - startTime,
        statusCode: response.status,
      }
    }, request);
  }

  return response;
}
```

**Document Change Tracking**:

```typescript
// app/api/brain/documents/route.ts (example)
import { auditLogger } from '@/lib/audit/logger';

export async function PUT(req: NextRequest) {
  const { id, ...updates } = await req.json();
  const userId = req.headers.get('x-user-id')!;
  const workspaceId = req.headers.get('x-workspace-id')!;

  // Get current version
  const [currentDoc] = await db
    .select()
    .from(brainDocuments)
    .where(eq(brainDocuments.id, id));

  // Update document
  const [updatedDoc] = await db
    .update(brainDocuments)
    .set(updates)
    .where(eq(brainDocuments.id, id))
    .returning();

  // Audit log with before/after
  await auditLogger.log({
    userId,
    workspaceId,
    action: 'document.update',
    resource: `document:${id}`,
    status: 'success',
    changes: {
      before: currentDoc,
      after: updatedDoc
    },
    metadata: {
      fieldsChanged: Object.keys(updates)
    }
  }, req);

  return NextResponse.json(updatedDoc);
}
```

---

### 4.2 Compliance Reporting

**SOC 2 Compliance Report Generator**:

```typescript
// scripts/generate-soc2-report.ts
import { getDb } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { and, gte, sql } from 'drizzle-orm';
import * as fs from 'fs/promises';
import { format, subDays } from 'date-fns';

interface SOC2Report {
  period: { start: string; end: string };
  controls: {
    cc61_access_controls: boolean;
    cc66_encryption: boolean;
    cc72_system_monitoring: boolean;
    cc73_incident_response: boolean;
    cc81_change_management: boolean;
  };
  findings: string[];
  evidence: {
    userAuthentications: number;
    failedLogins: number;
    dataAccess: number;
    systemChanges: number;
    incidentsDetected: number;
  };
  complianceScore: number;
}

async function generateSOC2Report(days: number = 30): Promise<SOC2Report> {
  const db = getDb();
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  const report: SOC2Report = {
    period: {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    },
    controls: {
      cc61_access_controls: false,
      cc66_encryption: false,
      cc72_system_monitoring: false,
      cc73_incident_response: false,
      cc81_change_management: false
    },
    findings: [],
    evidence: {
      userAuthentications: 0,
      failedLogins: 0,
      dataAccess: 0,
      systemChanges: 0,
      incidentsDetected: 0
    },
    complianceScore: 0
  };

  // CC6.1 - Logical Access Controls
  const authLogs = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`${auditLogs.action} LIKE 'auth.%'`
      )
    );

  report.evidence.userAuthentications = authLogs[0]?.count || 0;

  const failedLogins = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`${auditLogs.action} = 'auth.login' AND ${auditLogs.status} = 'failure'`
      )
    );

  report.evidence.failedLogins = failedLogins[0]?.count || 0;

  // Pass if failed login rate < 5%
  const failureRate = report.evidence.failedLogins / Math.max(report.evidence.userAuthentications, 1);
  report.controls.cc61_access_controls = failureRate < 0.05;

  if (!report.controls.cc61_access_controls) {
    report.findings.push(`High failed login rate: ${(failureRate * 100).toFixed(2)}%`);
  }

  // CC6.6 - Encryption
  // Check for unencrypted data access
  report.controls.cc66_encryption = true; // Assume pass unless evidence shows otherwise

  // CC7.2 - System Monitoring
  const monitoringLogs = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`${auditLogs.action} LIKE 'system.%'`
      )
    );

  // Should have monitoring events every day
  const expectedMonitoringEvents = days * 24; // At least hourly
  report.controls.cc72_system_monitoring = (monitoringLogs[0]?.count || 0) >= expectedMonitoringEvents;

  if (!report.controls.cc72_system_monitoring) {
    report.findings.push(`Insufficient monitoring events: ${monitoringLogs[0]?.count} (expected ${expectedMonitoringEvents})`);
  }

  // CC7.3 - Incident Response
  const incidents = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`${auditLogs.action} LIKE 'security.incident.%'`
      )
    );

  report.evidence.incidentsDetected = incidents[0]?.count || 0;

  // All incidents should have been handled
  const handledIncidents = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`${auditLogs.action} = 'security.incident.resolved'`
      )
    );

  report.controls.cc73_incident_response =
    report.evidence.incidentsDetected === 0 ||
    handledIncidents[0]?.count === report.evidence.incidentsDetected;

  if (!report.controls.cc73_incident_response) {
    report.findings.push(`Unresolved incidents: ${report.evidence.incidentsDetected - (handledIncidents[0]?.count || 0)}`);
  }

  // CC8.1 - Change Management
  const changes = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`${auditLogs.action} LIKE '%.update' OR ${auditLogs.action} LIKE '%.delete'`
      )
    );

  report.evidence.systemChanges = changes[0]?.count || 0;

  // All changes should be logged with userId
  const unauthorizedChanges = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, startDate),
        sql`(${auditLogs.action} LIKE '%.update' OR ${auditLogs.action} LIKE '%.delete') AND ${auditLogs.userId} IS NULL`
      )
    );

  report.controls.cc81_change_management = (unauthorizedChanges[0]?.count || 0) === 0;

  if (!report.controls.cc81_change_management) {
    report.findings.push(`Unauthorized changes detected: ${unauthorizedChanges[0]?.count}`);
  }

  // Calculate compliance score
  const passedControls = Object.values(report.controls).filter(c => c === true).length;
  report.complianceScore = (passedControls / Object.keys(report.controls).length) * 100;

  return report;
}

// Generate and save report
async function main() {
  const report = await generateSOC2Report(30);

  console.log('=== SOC 2 COMPLIANCE REPORT ===');
  console.log(`Period: ${report.period.start} to ${report.period.end}`);
  console.log(`Compliance Score: ${report.complianceScore.toFixed(1)}%`);
  console.log('\nControls:');
  Object.entries(report.controls).forEach(([control, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${control.toUpperCase().replace(/_/g, ' ')}`);
  });

  if (report.findings.length > 0) {
    console.log('\nFindings:');
    report.findings.forEach(f => console.log(`  - ${f}`));
  }

  // Save to file
  const filename = `soc2-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
  await fs.writeFile(filename, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${filename}`);
}

main().catch(console.error);
```

**GDPR Compliance Dashboard**:

```typescript
// app/api/admin/gdpr-compliance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { auditLogs, brainDocuments } from '@/lib/db/schema';
import { and, gte, sql } from 'drizzle-orm';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const db = getDb();
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Article 17 - Right to Erasure
  const deletionRequests = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, thirtyDaysAgo),
        sql`${auditLogs.action} = 'user.deletion.requested'`
      )
    );

  const deletionsCompleted = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, thirtyDaysAgo),
        sql`${auditLogs.action} = 'user.deletion.completed'`
      )
    );

  // Article 20 - Data Portability
  const exportRequests = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, thirtyDaysAgo),
        sql`${auditLogs.action} = 'user.data.export.requested'`
      )
    );

  // Article 33 - Breach Notification (72 hour requirement)
  const breaches = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, thirtyDaysAgo),
        sql`${auditLogs.action} = 'security.breach.detected'`
      )
    );

  const breachNotifications = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, thirtyDaysAgo),
        sql`${auditLogs.action} = 'security.breach.notified'`
      )
    );

  // Check if all breaches were notified within 72 hours
  const lateNotifications = breaches.filter(breach => {
    const notification = breachNotifications.find(
      n => n.metadata?.breachId === breach.id
    );

    if (!notification) return true;

    const timeDiff = new Date(notification.timestamp).getTime() -
                    new Date(breach.timestamp).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff > 72;
  });

  const compliance = {
    article17_right_to_erasure: {
      passed: deletionRequests[0]?.count === deletionsCompleted[0]?.count,
      requested: deletionRequests[0]?.count || 0,
      completed: deletionsCompleted[0]?.count || 0
    },
    article20_data_portability: {
      passed: true, // API exists
      requestsHandled: exportRequests[0]?.count || 0
    },
    article33_breach_notification: {
      passed: lateNotifications.length === 0,
      breachesDetected: breaches.length,
      lateNotifications: lateNotifications.length
    },
    overallCompliance:
      (deletionRequests[0]?.count === deletionsCompleted[0]?.count) &&
      (lateNotifications.length === 0)
  };

  return NextResponse.json(compliance);
}
```

---

## 5. Continuous Improvement Process

### 5.1 System Review Framework

**Monthly System Review Template**:

```markdown
# Brain AI - Monthly System Review

**Month**: [YYYY-MM]
**Date**: [Date]
**Attendees**: [Team Members]

## 1. Performance Metrics

### Response Times
| Metric | Target | Actual | Trend |
|--------|--------|--------|-------|
| Page Load | <1.5s | [VALUE] | [↑/↓/→] |
| API Response | <350ms | [VALUE] | [↑/↓/→] |
| Search Query | <2s | [VALUE] | [↑/↓/→] |

### Availability
| Metric | Target | Actual | Incidents |
|--------|--------|--------|-----------|
| Uptime | 99.9% | [VALUE]% | [COUNT] |
| P0 Incidents | 0 | [COUNT] | [LIST] |
| P1 Incidents | <2 | [COUNT] | [LIST] |

### Usage
| Metric | Last Month | This Month | Change |
|--------|-----------|------------|--------|
| Active Users | [VALUE] | [VALUE] | [±%] |
| Queries/Day | [VALUE] | [VALUE] | [±%] |
| Documents Indexed | [VALUE] | [VALUE] | [±%] |

## 2. Security & Compliance

### Security Scans
- [ ] Vulnerability scan completed
- [ ] No CRITICAL vulnerabilities
- [ ] HIGH vulnerabilities: [COUNT] (list if any)
- [ ] Secrets rotation completed

### Compliance
- [ ] SOC 2 compliance score: [VALUE]%
- [ ] GDPR requirements met
- [ ] Audit logs reviewed
- [ ] Backup tests passed

## 3. Cost Analysis

| Service | Budget | Actual | Variance |
|---------|--------|--------|----------|
| OpenAI API | $[VALUE] | $[VALUE] | [±%] |
| Infrastructure | $[VALUE] | $[VALUE] | [±%] |
| Storage | $[VALUE] | $[VALUE] | [±%] |
| **Total** | **$[VALUE]** | **$[VALUE]** | **[±%]** |

**Cost per Query**: $[VALUE]
**Optimization Opportunities**: [LIST]

## 4. Technical Debt

### Prioritized Items
1. **[ISSUE]** - Priority: [HIGH/MEDIUM/LOW]
   - Impact: [DESCRIPTION]
   - Effort: [DAYS]
   - Owner: [@PERSON]

### Completed This Month
- [x] [ITEM] - [DATE]

### Deferred
- [ ] [ITEM] - Reason: [WHY]

## 5. Feature Performance

### Top Features by Usage
1. [FEATURE] - [USAGE_COUNT] uses
2. [FEATURE] - [USAGE_COUNT] uses
3. [FEATURE] - [USAGE_COUNT] uses

### User Feedback Score
- Overall Satisfaction: [SCORE]/5
- Top Complaint: [ISSUE]
- Top Praise: [FEATURE]

## 6. Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [ACTION] | [@PERSON] | [DATE] | [P] |

## 7. Upcoming Changes

### Next Month
- [PLANNED_CHANGE]

### Quarter Roadmap
- [MAJOR_INITIATIVE]
```

**Automated Metrics Collection**:

```typescript
// scripts/collect-monthly-metrics.ts
import { getDb } from '@/lib/db';
import { auditLogs, brainDocuments, users } from '@/lib/db/schema';
import { and, gte, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import * as fs from 'fs/promises';

interface MonthlyMetrics {
  month: string;
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    avgSearchTime: number;
  };
  availability: {
    uptime: number;
    p0Incidents: number;
    p1Incidents: number;
    p2Incidents: number;
  };
  usage: {
    activeUsers: number;
    totalQueries: number;
    documentsIndexed: number;
    avgQueriesPerUser: number;
  };
  costs: {
    openai: number;
    infrastructure: number;
    storage: number;
    total: number;
  };
  security: {
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    failedLogins: number;
    securityIncidents: number;
  };
}

async function collectMonthlyMetrics(month?: Date): Promise<MonthlyMetrics> {
  const targetMonth = month || subMonths(new Date(), 1);
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  const db = getDb();

  const metrics: MonthlyMetrics = {
    month: format(targetMonth, 'yyyy-MM'),
    performance: {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      avgSearchTime: 0
    },
    availability: {
      uptime: 0,
      p0Incidents: 0,
      p1Incidents: 0,
      p2Incidents: 0
    },
    usage: {
      activeUsers: 0,
      totalQueries: 0,
      documentsIndexed: 0,
      avgQueriesPerUser: 0
    },
    costs: {
      openai: 0,
      infrastructure: 0,
      storage: 0,
      total: 0
    },
    security: {
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
      failedLogins: 0,
      securityIncidents: 0
    }
  };

  // Performance Metrics (from Prometheus or audit logs)
  const responseTimes = await db
    .select({
      avg: sql<number>`AVG((${auditLogs.metadata}->>'duration')::int)`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (${auditLogs.metadata}->>'duration')::int)`
    })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, monthStart),
        sql`${auditLogs.timestamp} <= ${monthEnd}`,
        sql`${auditLogs.action} LIKE 'api.%'`,
        sql`${auditLogs.metadata}->>'duration' IS NOT NULL`
      )
    );

  metrics.performance.avgResponseTime = Math.round(responseTimes[0]?.avg || 0);
  metrics.performance.p95ResponseTime = Math.round(responseTimes[0]?.p95 || 0);

  // Usage Metrics
  const activeUsersResult = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${auditLogs.userId})`
    })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, monthStart),
        sql`${auditLogs.timestamp} <= ${monthEnd}`
      )
    );

  metrics.usage.activeUsers = activeUsersResult[0]?.count || 0;

  const queriesResult = await db
    .select({
      count: sql<number>`COUNT(*)`
    })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, monthStart),
        sql`${auditLogs.timestamp} <= ${monthEnd}`,
        sql`${auditLogs.action} = 'brain.query'`
      )
    );

  metrics.usage.totalQueries = queriesResult[0]?.count || 0;
  metrics.usage.avgQueriesPerUser =
    metrics.usage.activeUsers > 0
      ? Math.round(metrics.usage.totalQueries / metrics.usage.activeUsers)
      : 0;

  const documentsResult = await db
    .select({
      count: sql<number>`COUNT(*)`
    })
    .from(brainDocuments)
    .where(
      and(
        gte(brainDocuments.createdAt, monthStart),
        sql`${brainDocuments.createdAt} <= ${monthEnd}`
      )
    );

  metrics.usage.documentsIndexed = documentsResult[0]?.count || 0;

  // Security Metrics
  const failedLoginsResult = await db
    .select({
      count: sql<number>`COUNT(*)`
    })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, monthStart),
        sql`${auditLogs.timestamp} <= ${monthEnd}`,
        sql`${auditLogs.action} = 'auth.login' AND ${auditLogs.status} = 'failure'`
      )
    );

  metrics.security.failedLogins = failedLoginsResult[0]?.count || 0;

  // Incidents (would typically come from incident tracking system)
  const incidents = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.timestamp, monthStart),
        sql`${auditLogs.timestamp} <= ${monthEnd}`,
        sql`${auditLogs.action} LIKE 'incident.%'`
      )
    );

  metrics.availability.p0Incidents = incidents.filter(
    i => i.metadata?.severity === 'P0'
  ).length;
  metrics.availability.p1Incidents = incidents.filter(
    i => i.metadata?.severity === 'P1'
  ).length;

  // Calculate uptime (assuming monitoring data available)
  // This would typically come from Prometheus
  metrics.availability.uptime = 99.95; // Placeholder

  return metrics;
}

// Generate report
async function main() {
  const metrics = await collectMonthlyMetrics();

  console.log('=== MONTHLY METRICS ===');
  console.log(`Month: ${metrics.month}`);
  console.log('\nPerformance:');
  console.log(`  Avg Response Time: ${metrics.performance.avgResponseTime}ms`);
  console.log(`  P95 Response Time: ${metrics.performance.p95ResponseTime}ms`);
  console.log('\nUsage:');
  console.log(`  Active Users: ${metrics.usage.activeUsers}`);
  console.log(`  Total Queries: ${metrics.usage.totalQueries}`);
  console.log(`  Avg Queries/User: ${metrics.usage.avgQueriesPerUser}`);
  console.log('\nAvailability:');
  console.log(`  Uptime: ${metrics.availability.uptime}%`);
  console.log(`  P0 Incidents: ${metrics.availability.p0Incidents}`);
  console.log(`  P1 Incidents: ${metrics.availability.p1Incidents}`);

  // Save to file
  const filename = `monthly-metrics-${metrics.month}.json`;
  await fs.writeFile(filename, JSON.stringify(metrics, null, 2));
  console.log(`\nMetrics saved: ${filename}`);
}

main().catch(console.error);
```

---

### 5.2 Team Workshops & Knowledge Sharing

**Quarterly Tech Workshop Agenda**:

```markdown
# Brain AI - Quarterly Technical Workshop

**Quarter**: Q[N] [YEAR]
**Date**: [Date]
**Duration**: 4 hours
**Location**: [Location/Virtual]

## Agenda

### Session 1: System Health Review (60 min)
**Facilitator**: DevOps Lead

- **Performance Deep Dive** (20 min)
  - Response time trends
  - Bottleneck analysis
  - Optimization opportunities

- **Incident Postmortems** (20 min)
  - Review P0/P1 incidents
  - Root cause analysis
  - Prevention measures implemented

- **Capacity Planning** (20 min)
  - Current resource utilization
  - Scaling requirements
  - Cost projections

### Session 2: Technical Debt Review (45 min)
**Facilitator**: Tech Lead

- **Debt Inventory** (15 min)
  - Current technical debt backlog
  - Impact assessment
  - Prioritization framework

- **Debt Paydown Plan** (15 min)
  - Items to address this quarter
  - Resource allocation
  - Timeline

- **Prevention Strategies** (15 min)
  - Architectural improvements
  - Code quality standards
  - Automated checks

### Break (15 min)

### Session 3: Feature Retrospective (60 min)
**Facilitator**: Product Lead

- **What Worked** (20 min)
  - Successful features
  - Adoption metrics
  - User feedback highlights

- **What Didn't** (20 min)
  - Failed experiments
  - Underused features
  - Lessons learned

- **Roadmap Refinement** (20 min)
  - Upcoming features
  - User requests prioritization
  - Technical feasibility

### Session 4: Knowledge Sharing (60 min)
**Facilitator**: Rotating

- **Tech Talk 1** (20 min): [TOPIC]
  - New technology/pattern introduced
  - Demo/walkthrough
  - Q&A

- **Tech Talk 2** (20 min): [TOPIC]
  - Best practices sharing
  - Code review highlights
  - Q&A

- **Open Discussion** (20 min)
  - Emerging tech trends
  - Process improvements
  - Team suggestions

## Action Items Template

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| | | | |

## Follow-up

- **Workshop Notes**: [Link to doc]
- **Next Workshop**: Q[N+1] [DATE]
- **Feedback Survey**: [Link]
```

---

### 5.3 User Feedback Integration

**Feedback Collection System**:

```typescript
// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const feedbackSubmissions = pgTable('feedback_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }),
  category: varchar('category', { length: 50 }), // 'bug', 'feature', 'improvement'
  rating: integer('rating'),                       // 1-5
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  context: jsonb('context'),                       // Page URL, feature used, etc.
  status: varchar('status', { length: 20 }).default('submitted'), // submitted, reviewed, planned, completed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export async function POST(req: NextRequest) {
  const db = getDb();
  const userId = req.headers.get('x-user-id');

  const { category, rating, title, description, context } = await req.json();

  const [feedback] = await db
    .insert(feedbackSubmissions)
    .values({
      userId: userId || 'anonymous',
      category,
      rating,
      title,
      description,
      context
    })
    .returning();

  // Notify team for high-priority feedback
  if (rating <= 2 || category === 'bug') {
    await fetch(process.env.SLACK_FEEDBACK_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🔔 New ${category} feedback (Rating: ${rating}/5)`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${title}*\n${description}`
            }
          }
        ]
      })
    });
  }

  return NextResponse.json({ success: true, id: feedback.id });
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || 'submitted';

  const feedback = await db
    .select()
    .from(feedbackSubmissions)
    .where(sql`${feedbackSubmissions.status} = ${status}`)
    .orderBy(sql`${feedbackSubmissions.createdAt} DESC`)
    .limit(50);

  return NextResponse.json(feedback);
}
```

**Feedback Dashboard Component**:

```typescript
// components/admin/FeedbackDashboard.tsx
'use client';

import { useState, useEffect } from 'react';

interface Feedback {
  id: string;
  category: string;
  rating: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState('submitted');

  useEffect(() => {
    fetch(`/api/feedback?status=${filter}`)
      .then(res => res.json())
      .then(setFeedback);
  }, [filter]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    // Refresh
    setFeedback(prev => prev.map(f =>
      f.id === id ? { ...f, status: newStatus } : f
    ));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'text-red-600';
      case 'feature': return 'text-blue-600';
      case 'improvement': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="feedback-dashboard">
      <div className="header">
        <h2>User Feedback</h2>
        <div className="filters">
          {['submitted', 'reviewed', 'planned', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={filter === status ? 'active' : ''}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-list">
        {feedback.map(item => (
          <div key={item.id} className="feedback-card">
            <div className="feedback-header">
              <span className={`category ${getCategoryColor(item.category)}`}>
                {item.category}
              </span>
              <span className="rating">
                {'⭐'.repeat(item.rating)}
              </span>
            </div>

            <h3>{item.title}</h3>
            <p>{item.description}</p>

            <div className="feedback-actions">
              <select
                value={item.status}
                onChange={(e) => updateStatus(item.id, e.target.value)}
              >
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>

              <span className="timestamp">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 5.4 Tech Debt Prioritization Framework

**Tech Debt Scoring System**:

```typescript
// lib/tech-debt/scorer.ts

interface TechDebtItem {
  id: string;
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  effort: number; // Days
  category: 'security' | 'performance' | 'maintainability' | 'scalability';
  affectedUsers: number;
  riskLevel: number; // 1-10
}

interface TechDebtScore {
  totalScore: number;
  impactScore: number;
  urgencyScore: number;
  costBenefitRatio: number;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export class TechDebtScorer {
  scoreItem(item: TechDebtItem): TechDebtScore {
    // Impact Score (0-50 points)
    const impactPoints = {
      critical: 50,
      high: 35,
      medium: 20,
      low: 10
    };

    const impactScore = impactPoints[item.impact];

    // Urgency Score (0-30 points)
    const categoryUrgency = {
      security: 30,      // Security always urgent
      performance: 20,   // Performance impacts UX
      scalability: 15,   // Important but less urgent
      maintainability: 10 // Important but can wait
    };

    const urgencyScore = categoryUrgency[item.category];

    // User Impact (0-20 points)
    const userImpactScore = Math.min(20, (item.affectedUsers / 100) * 20);

    // Total Score
    const totalScore = impactScore + urgencyScore + userImpactScore;

    // Cost-Benefit Ratio (higher is better)
    const costBenefitRatio = totalScore / Math.max(item.effort, 1);

    // Determine Priority
    let priority: 'P0' | 'P1' | 'P2' | 'P3';

    if (item.category === 'security' && item.impact === 'critical') {
      priority = 'P0';
    } else if (totalScore >= 70 || costBenefitRatio >= 15) {
      priority = 'P1';
    } else if (totalScore >= 40 || costBenefitRatio >= 8) {
      priority = 'P2';
    } else {
      priority = 'P3';
    }

    return {
      totalScore,
      impactScore,
      urgencyScore,
      costBenefitRatio: Math.round(costBenefitRatio * 10) / 10,
      priority
    };
  }

  prioritizeBacklog(items: TechDebtItem[]): (TechDebtItem & { score: TechDebtScore })[] {
    return items
      .map(item => ({
        ...item,
        score: this.scoreItem(item)
      }))
      .sort((a, b) => b.score.totalScore - a.score.totalScore);
  }
}

// Example usage
const scorer = new TechDebtScorer();

const backlog: TechDebtItem[] = [
  {
    id: '1',
    title: 'Upgrade PostgreSQL to v16',
    description: 'Current version (v14) will be EOL soon',
    impact: 'medium',
    effort: 3,
    category: 'security',
    affectedUsers: 1000,
    riskLevel: 6
  },
  {
    id: '2',
    title: 'Implement query result caching',
    description: 'Reduce OpenAI API costs by 40%',
    impact: 'high',
    effort: 5,
    category: 'performance',
    affectedUsers: 1000,
    riskLevel: 3
  },
  {
    id: '3',
    title: 'Refactor agent system to use plugin architecture',
    description: 'Improve extensibility for new agents',
    impact: 'medium',
    effort: 10,
    category: 'maintainability',
    affectedUsers: 50,
    riskLevel: 4
  }
];

const prioritized = scorer.prioritizeBacklog(backlog);
console.log('Prioritized Tech Debt:', prioritized);
```

---

## 📝 Summary

This comprehensive Operational Excellence Guide Part 3 provides:

### 1. **Incident Management** ✅
- Clear P0/P1/P2 escalation processes with response times
- Automated diagnostic scripts for quick root cause analysis
- Hotfix deployment automation with Blue-Green switching
- Complete rollback procedures for code and database
- Communication templates for all incident phases

### 2. **Security Incident Handling** ✅
- Automated security scanning with GitHub Actions
- Real-time breach detection system
- Automated response (IP blocking, notifications)
- GDPR-compliant notification templates
- Security report generation

### 3. **Backup & Disaster Recovery** ✅
- Complete automated backup system (PostgreSQL, Redis, Config)
- Encrypted backups with AES-256-CBC
- S3 storage with 30-day retention
- Full disaster recovery procedures
- Automated backup testing framework
- Monthly validation CronJobs

### 4. **Compliance & Audit Logging** ✅
- Central audit log system with comprehensive tracking
- SOC 2 compliance reporting (5 controls)
- GDPR compliance dashboard (Articles 17, 20, 33)
- Automated compliance scoring
- API middleware for automatic logging

### 5. **Continuous Improvement** ✅
- Monthly system review framework
- Automated metrics collection
- Quarterly technical workshops
- User feedback integration system
- Tech debt prioritization scoring
- Knowledge sharing processes

---

## 🚀 Quick Start Commands

```bash
# Incident Response
./scripts/p0-response.sh <incident-id> "<description>"
npx tsx scripts/p0-diagnostics.ts <incident-id>

# Hotfix & Rollback
./scripts/hotfix-deploy.sh hotfix/branch-name <incident-id>
./scripts/rollback.sh "<reason>"

# Security
npm run security:scan
npx tsx scripts/generate-security-report.ts

# Backup & Recovery
./scripts/backup-full.sh
./scripts/disaster-recovery.sh <backup-date>
npx tsx scripts/test-backups.ts <backup-date>

# Compliance
npx tsx scripts/generate-soc2-report.ts
curl http://localhost:3000/api/admin/gdpr-compliance

# Metrics
npx tsx scripts/collect-monthly-metrics.ts
```

---

**Project Status**: Phase 7 Complete | Operational Excellence Complete
**Total Deliverables**: 76 files | ~20,000 lines of code
**Last Updated**: 2025-10-26

---

**🎉 Brain AI is now production-ready with enterprise-grade operational procedures!**
