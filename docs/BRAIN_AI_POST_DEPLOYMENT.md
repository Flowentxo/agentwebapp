# 🎯 Brain AI - Post-Deployment Operations Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-26
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Deployment Validation](#deployment-validation)
2. [Monitoring & Observability](#monitoring--observability)
3. [Security & Compliance](#security--compliance)
4. [Load & Performance Testing](#load--performance-testing)
5. [Continuous Improvement](#continuous-improvement)
6. [Incident Response](#incident-response)
7. [Maintenance Procedures](#maintenance-procedures)

---

## 🔍 Deployment Validation

### Automated Validation Script

Run comprehensive deployment validation:

```bash
# Validate staging deployment
./scripts/validate-deployment.sh staging

# Validate production deployment
./scripts/validate-deployment.sh production
```

### Validation Checks (10 Stages)

| Stage | Check | Expected Result |
|-------|-------|-----------------|
| **1** | Kubernetes Health | All pods running (3+) |
| **2** | Health Endpoint | HTTP 200, all services UP |
| **3** | Database | PostgreSQL up, pgvector enabled |
| **4** | Redis Cache | Redis responding, PONG received |
| **5** | API Endpoints | Query, metrics endpoints working |
| **6** | Cache Performance | Cache hit rate > 50% |
| **7** | Agent Integration | All 12 agents accessible |
| **8** | Blue-Green Status | Active version confirmed |
| **9** | Resource Usage | CPU < 80%, Memory < 90% |
| **10** | Security | Secrets configured, no leaks |

### Manual Validation Checklist

```bash
# 1. Check pod status
kubectl get pods -n brain-ai

# Expected:
# brain-ai-blue-xxx    1/1   Running   0   5m
# brain-ai-blue-xxx    1/1   Running   0   5m
# brain-ai-blue-xxx    1/1   Running   0   5m

# 2. Test health endpoint
curl https://your-domain/api/brain/health | jq .

# Expected:
# {
#   "status": "healthy",
#   "services": {
#     "postgresql": {"status": "up"},
#     "redis": {"status": "up"},
#     "pgvector": {"status": "up"}
#   }
# }

# 3. Test agent chat
curl -X POST https://your-domain/api/agents/dexter/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"content":"Hello Dexter"}'

# 4. Check metrics
curl https://your-domain/api/brain/metrics | jq .

# 5. Verify Blue-Green deployment
kubectl get service brain-ai -n brain-ai -o jsonpath='{.spec.selector.version}'

# Expected: "blue" or "green"
```

---

## 📊 Monitoring & Observability

### Grafana Dashboards

**Access**: http://grafana.yourdomain.com

#### 1. Brain AI Application Dashboard

**URL**: `/d/brain-ai-main`

**Panels**:
- System status (UP/DOWN)
- Active pods count
- Request rate (req/s)
- Error rate (%)
- Response time percentiles (P50, P95, P99)
- CPU usage by pod
- Memory usage by pod
- Cache hit rate
- Query volume by type
- Agent request distribution
- Vector search performance

**Key Metrics to Monitor**:
```promql
# Request rate
sum(rate(http_requests_total{job="brain-ai-app"}[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# P95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
sum(rate(redis_cache_hits_total[5m])) / (sum(rate(redis_cache_hits_total[5m])) + sum(rate(redis_cache_misses_total[5m]))) * 100
```

#### 2. Infrastructure Dashboard

**URL**: `/d/brain-ai-infra`

**Panels**:
- Blue/Green deployment status
- HPA current replicas
- Node CPU/Memory usage
- PostgreSQL status & connections
- Query performance
- Redis status & operations
- Network traffic & Disk I/O

### Prometheus Alerts

**Configuration**: `docker/monitoring/alerting-rules.yml`

**Critical Alerts** (PagerDuty/Slack):
- `BrainAIDown` - Application unavailable
- `HighErrorRate` - Error rate > 5%
- `DatabaseDown` - PostgreSQL unavailable
- `RedisDown` - Cache unavailable

**Warning Alerts** (Email/Slack):
- `HighResponseTime` - P99 > 2s
- `HighMemoryUsage` - Memory > 90%
- `HighCPUUsage` - CPU > 80%
- `LowCacheHitRate` - Cache hit rate < 50%

### Alert Configuration

**Slack Integration**:
```yaml
# alertmanager.yml
route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#brain-ai-alerts'
        title: 'Brain AI Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Log Aggregation

**Loki Query Examples**:

```logql
# Error logs
{namespace="brain-ai",app="brain-ai"} |= "ERROR"

# Slow queries
{namespace="brain-ai"} |= "slow query" | json | duration > 2s

# Authentication failures
{namespace="brain-ai"} |= "authentication" |= "failed"

# Agent requests
{namespace="brain-ai"} |= "agent" | json | agent_id="dexter"
```

---

## 🔐 Security & Compliance

### Security Audit Script

Run comprehensive security audit:

```bash
# Audit staging
./scripts/security-audit.sh staging

# Audit production
./scripts/security-audit.sh production
```

### Security Checklist (8 Checks)

| Check | Description | Severity |
|-------|-------------|----------|
| **Secrets Management** | Verify Kubernetes secrets, check for exposed credentials | CRITICAL |
| **Container Images** | Scan for vulnerabilities (Trivy), verify non-root user | HIGH |
| **Network Security** | Check NetworkPolicies, TLS configuration | MEDIUM |
| **RBAC** | Verify ServiceAccounts, check for overly permissive roles | MEDIUM |
| **Pod Security** | Check SecurityContext, privileged containers | HIGH |
| **Resource Limits** | Verify all containers have limits, check quotas | MEDIUM |
| **Exposed Endpoints** | Test authentication on public endpoints | CRITICAL |
| **Audit Logs** | Verify logging, check monitoring infrastructure | MEDIUM |

### Security Compliance Tasks

#### Weekly Tasks

```bash
# 1. Review access logs
kubectl logs -n brain-ai -l app=brain-ai --tail=1000 | grep -i "authentication\|authorization"

# 2. Check for failed login attempts
curl https://your-domain/api/admin/audit-logs?event=login_failed

# 3. Verify secret rotation schedule
kubectl get secrets -n brain-ai -o json | jq '.items[] | {name: .metadata.name, age: .metadata.creationTimestamp}'
```

#### Monthly Tasks

```bash
# 1. Full security audit
./scripts/security-audit.sh production > security-audit-$(date +%Y%m).txt

# 2. Container vulnerability scan
trivy image --severity CRITICAL,HIGH your-registry/brain-ai:latest

# 3. Review and update RBAC policies
kubectl get clusterrolebindings,rolebindings -n brain-ai

# 4. Rotate secrets
kubectl create secret generic brain-ai-secrets \
  --from-env-file=.env.production.new \
  --dry-run=client -o yaml | kubectl apply -f -

# 5. Review network policies
kubectl get networkpolicy -n brain-ai -o yaml
```

#### Quarterly Tasks

- Penetration testing
- Security training for team
- Review incident response procedures
- Update security documentation

---

## ⚡ Load & Performance Testing

### k6 Load Testing

**Test Scenarios**:

```bash
# Smoke test (light load, quick validation)
./scripts/run-load-test.sh staging smoke

# Load test (normal traffic, 50 VUs, 5 min)
./scripts/run-load-test.sh staging load

# Stress test (high load, 100 VUs, 10 min)
./scripts/run-load-test.sh production stress

# Spike test (sudden load increase)
./scripts/run-load-test.sh production spike

# Soak test (sustained load, 1 hour)
./scripts/run-load-test.sh production soak
```

### Performance Thresholds

| Metric | Target | Threshold |
|--------|--------|-----------|
| **Page Load** | < 1.5s | < 2s |
| **API Response (P95)** | < 500ms | < 2s |
| **AI Query (P95)** | < 2.5s | < 3s |
| **Error Rate** | < 1% | < 5% |
| **Cache Hit Rate** | > 65% | > 50% |
| **Throughput** | > 1000 req/s | > 500 req/s |

### Lighthouse CI

**Run Lighthouse tests**:

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --config=lighthouserc.json

# Check scores
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 95
```

**Configuration** (`lighthouserc.json`):

```json
{
  "ci": {
    "collect": {
      "url": ["https://your-domain/brain"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}]
      }
    }
  }
}
```

### Performance Optimization

**If metrics degrade**:

1. **High Response Time**:
   - Check database slow queries
   - Review cache hit rate
   - Scale up pods (HPA)
   - Optimize vector search queries

2. **High Error Rate**:
   - Check recent deployments
   - Review application logs
   - Verify database connections
   - Check Redis connectivity

3. **Low Cache Hit Rate**:
   - Review cache TTL settings
   - Increase Redis memory
   - Optimize cache key structure
   - Check for cache evictions

4. **High CPU/Memory**:
   - Scale horizontally (more pods)
   - Optimize expensive operations
   - Review resource limits
   - Check for memory leaks

---

## 🔄 Continuous Improvement

### Automated Reports

**Daily Reports** (automated via cron):

```bash
# Create daily report script
cat > /scripts/daily-report.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)

# Collect metrics
REQUESTS=$(curl -s prometheus:9090/api/v1/query?query=sum(http_requests_total) | jq -r '.data.result[0].value[1]')
ERRORS=$(curl -s prometheus:9090/api/v1/query?query=sum(http_requests_total{status=~\"5..\"}) | jq -r '.data.result[0].value[1]')
AVG_RESPONSE=$(curl -s prometheus:9090/api/v1/query?query=avg(http_request_duration_seconds) | jq -r '.data.result[0].value[1]')

# Generate report
echo "Brain AI Daily Report - ${DATE}"
echo "================================"
echo "Total Requests: ${REQUESTS}"
echo "Errors: ${ERRORS}"
echo "Avg Response Time: ${AVG_RESPONSE}s"
echo ""
echo "Top Queries:"
curl -s prometheus:9090/api/v1/query?query=topk(10,brain_queries_total)

# Send to Slack
curl -X POST YOUR_SLACK_WEBHOOK -d "{\"text\":\"Daily Report: ${DATE}\n Requests: ${REQUESTS}\"}"
EOF

# Schedule with cron
0 9 * * * /scripts/daily-report.sh
```

### Weekly Audit Pipeline

**Automated weekly checks**:

```yaml
# .github/workflows/weekly-audit.yml
name: Weekly Audit

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Test Coverage Report
        run: npm run test:coverage

      - name: Cost Analysis
        run: |
          echo "Analyzing infrastructure costs..."
          kubectl top nodes
          kubectl top pods -n brain-ai

      - name: Usage Metrics
        run: |
          curl https://your-domain/api/brain/metrics > weekly-metrics.json

      - name: Security Scan
        run: ./scripts/security-audit.sh production

      - name: Generate Report
        run: |
          cat > weekly-report.md <<EOF
          # Weekly Audit Report

          ## Test Coverage
          $(cat coverage-report.txt)

          ## Resource Usage
          $(kubectl top pods -n brain-ai)

          ## Security Findings
          $(cat security-audit-production-*.txt)
          EOF

      - name: Send Report
        run: |
          # Send to Slack or email
          ./scripts/send-report.sh weekly-report.md
```

### Feedback Loop

**Collect and act on insights**:

1. **User Feedback**:
   - Monitor customer support tickets
   - Review agent interaction logs
   - Collect NPS scores

2. **System Metrics**:
   - Identify most popular queries
   - Find slow/failing endpoints
   - Detect usage patterns

3. **Improvement Actions**:
   - Optimize frequent queries
   - Add new agent capabilities
   - Improve caching strategies
   - Scale resources as needed

---

## 🚨 Incident Response

### Incident Response Procedure

**1. Detection** (Alert triggers or manual detection)

**2. Assessment** (5 minutes max)
```bash
# Quick health check
kubectl get pods -n brain-ai
curl https://your-domain/api/brain/health

# Check recent deployments
kubectl rollout history deployment/brain-ai-blue -n brain-ai

# Review logs
kubectl logs -n brain-ai -l app=brain-ai --tail=100
```

**3. Communication** (Immediate)
- Post in #incidents Slack channel
- Notify on-call engineer
- Update status page

**4. Mitigation** (Based on severity)

**Critical (P0)** - Service Down:
```bash
# Immediate rollback
kubectl rollout undo deployment/brain-ai-blue -n brain-ai

# Or switch to standby version
kubectl patch service brain-ai -n brain-ai \
  -p '{"spec":{"selector":{"version":"blue"}}}'  # If green is bad

# Scale up for redundancy
kubectl scale deployment brain-ai-blue --replicas=5 -n brain-ai
```

**High (P1)** - Degraded Performance:
```bash
# Scale horizontally
kubectl scale deployment brain-ai-blue --replicas=8 -n brain-ai

# Check resource usage
kubectl top pods -n brain-ai

# Review slow queries
kubectl logs -n brain-ai -l app=brain-ai | grep "slow query"
```

**Medium (P2)** - Partial Outage:
- Investigate specific failing component
- Apply targeted fix
- Monitor for 30 minutes

**5. Resolution**
- Verify metrics return to normal
- Document root cause
- Create post-mortem

**6. Post-Incident Review** (Within 24 hours)
- Timeline of events
- Root cause analysis
- Action items to prevent recurrence
- Update runbooks

---

## 🔧 Maintenance Procedures

### Routine Maintenance

#### Daily
```bash
# Check system health
./scripts/validate-deployment.sh production

# Review error logs
kubectl logs -n brain-ai -l app=brain-ai --since=24h | grep ERROR

# Monitor resource usage
kubectl top pods -n brain-ai
```

#### Weekly
```bash
# Security audit
./scripts/security-audit.sh production

# Performance test
./scripts/run-load-test.sh staging load

# Database maintenance
kubectl exec -n brain-ai postgres-pod -- psql -U postgres -d brain_ai -c "VACUUM ANALYZE;"

# Review and cleanup old data
kubectl exec -n brain-ai postgres-pod -- psql -U postgres -d brain_ai -c "DELETE FROM brain_documents WHERE created_at < NOW() - INTERVAL '90 days' AND archived = true;"
```

#### Monthly
```bash
# Update dependencies
npm audit fix
npm update

# Container image updates
docker pull pgvector/pgvector:pg15
docker pull redis:7-alpine

# Secret rotation
./scripts/rotate-secrets.sh

# Backup verification
./scripts/verify-backups.sh

# Review and update documentation
```

### Database Maintenance

**Backup Strategy**:
```bash
# Daily automated backups
0 2 * * * kubectl exec -n brain-ai postgres-pod -- \
  pg_dump -U postgres brain_ai | gzip > /backups/brain_ai_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup with pgvector data
0 3 * * 0 kubectl exec -n brain-ai postgres-pod -- \
  pg_dumpall -U postgres | gzip > /backups/full_backup_$(date +\%Y\%m\%d).sql.gz
```

**Restore Procedure**:
```bash
# Restore from backup
gunzip < brain_ai_20251026.sql.gz | \
  kubectl exec -i postgres-pod -n brain-ai -- psql -U postgres -d brain_ai
```

### Redis Maintenance

**Cache warm-up after deployment**:
```bash
# Warm up cache with popular queries
curl -X POST https://your-domain/api/brain/cache/warmup
```

**Redis persistence**:
```bash
# Trigger manual save
kubectl exec -n brain-ai redis-pod -- redis-cli BGSAVE

# Check last save time
kubectl exec -n brain-ai redis-pod -- redis-cli LASTSAVE
```

---

## 📞 Support & Escalation

### Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| **On-Call Engineer** | #on-call channel | 24/7 |
| **DevOps Team** | devops@company.com | Business hours |
| **Security Team** | security@company.com | Business hours |
| **Product Owner** | product@company.com | Business hours |

### Escalation Path

**P0 (Critical)** → On-call (immediate) → VP Engineering (within 30 min)
**P1 (High)** → DevOps team (within 1 hour) → Engineering Manager (within 4 hours)
**P2 (Medium)** → DevOps team (within 4 hours)
**P3 (Low)** → Ticket system (next business day)

---

## 📚 Additional Resources

- [Deployment Guide](./BRAIN_AI_DEPLOYMENT_GUIDE.md)
- [CI/CD Documentation](./BRAIN_AI_CICD_COMPLETE.md)
- [Complete Summary](./BRAIN_AI_COMPLETE_SUMMARY.md)
- [Quick Deploy Reference](./BRAIN_AI_QUICK_DEPLOY.md)
- [Main README](../BRAIN_AI_README.md)

---

**Version**: 1.0.0
**Maintained By**: DevOps & SRE Team
**Next Review**: 2025-11-26
