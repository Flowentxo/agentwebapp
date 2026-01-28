# 🚀 Brain AI - Production Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-26

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## 🔧 Prerequisites

### Required Tools

- **Docker** >= 20.10
- **Kubernetes** >= 1.24 (or managed service like GKE, EKS, AKS)
- **kubectl** >= 1.24
- **Node.js** >= 18.x (for local development)
- **Git**

### Cloud Services

- **PostgreSQL** with pgvector extension (Neon, Supabase, or self-hosted)
- **Redis** (Upstash, Redis Cloud, or self-hosted)
- **Container Registry** (Docker Hub, Google Container Registry, Amazon ECR)
- **OpenAI API** access

---

## 🔐 Environment Setup

### 1. Clone Production Environment Template

```bash
cp .env.production.template .env.production
```

### 2. Configure Secrets

#### Required Secrets

Generate secure secrets:

```bash
# Generate JWT secrets (32+ characters)
openssl rand -base64 32

# Generate encryption key (exactly 32 characters)
openssl rand -hex 16
```

#### Complete `.env.production`

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/brain_ai

# Redis
REDIS_URL=redis://:password@host:6379

# OpenAI
OPENAI_API_KEY=sk-your-key

# Security
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
ENCRYPTION_KEY=<generated-32-char-key>
```

### 3. Create Kubernetes Secrets

```bash
kubectl create namespace brain-ai

# From .env.production file
kubectl create secret generic brain-ai-secrets \
  --from-env-file=.env.production \
  -n brain-ai

# Or manually
kubectl create secret generic brain-ai-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=REDIS_URL='redis://...' \
  --from-literal=OPENAI_API_KEY='sk-...' \
  --from-literal=JWT_SECRET='...' \
  -n brain-ai
```

---

## 🐳 Docker Deployment

### Local Docker Deployment

```bash
# Build image
docker build -t brain-ai:latest -f docker/Dockerfile .

# Run with Docker Compose
cd docker
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f brain-ai
```

### Access Application

```
http://localhost:3000/brain
```

### Monitoring Dashboards

```
Grafana:    http://localhost:3001 (admin/password from env)
Prometheus: http://localhost:9090
```

---

## ☸️ Kubernetes Deployment

### Quick Start

```bash
# Apply all configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl create secret generic brain-ai-secrets --from-env-file=.env.production -n brain-ai
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/app-deployment.yaml
```

### Using Deployment Script

```bash
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n brain-ai

# Check services
kubectl get svc -n brain-ai

# Check deployments
kubectl get deployments -n brain-ai

# View logs
kubectl logs -f deployment/brain-ai-blue -n brain-ai
```

### Access Application

```bash
# Port forward to local
kubectl port-forward svc/brain-ai 3000:80 -n brain-ai

# Get external IP (if LoadBalancer)
kubectl get svc brain-ai -n brain-ai
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is fully automated via GitHub Actions (`.github/workflows/brain-ai-cicd.yml`).

#### Pipeline Stages

1. **Code Quality** - ESLint, TypeScript, Prettier
2. **Unit Tests** - Jest/Vitest with coverage
3. **Integration Tests** - PostgreSQL + Redis integration
4. **E2E Tests** - Playwright browser tests
5. **Performance Tests** - Lighthouse CI, k6 load tests
6. **Security Scan** - npm audit, Snyk
7. **Docker Build** - Multi-stage build, push to registry
8. **Deploy Staging** - Auto-deploy on `develop` branch
9. **Deploy Production** - Blue-Green deployment on `main` branch

#### Trigger Deployment

```bash
# Staging deployment
git checkout develop
git merge feature/your-feature
git push origin develop

# Production deployment
git checkout main
git merge develop
git tag v1.0.0
git push origin main --tags
```

#### Required GitHub Secrets

Add these secrets to your GitHub repository settings:

```
DOCKER_USERNAME
DOCKER_PASSWORD
OPENAI_API_KEY_TEST
KUBE_CONFIG_STAGING (base64 encoded)
KUBE_CONFIG_PRODUCTION (base64 encoded)
SLACK_WEBHOOK_URL
SNYK_TOKEN
LHCI_GITHUB_APP_TOKEN
```

---

## 📊 Monitoring & Alerting

### Prometheus Metrics

Access: `http://prometheus-url:9090`

**Key Metrics**:
- `http_request_duration_seconds` - Request latency
- `http_requests_total` - Request count by status
- `brain_ai_query_duration_seconds` - AI query performance
- `brain_ai_cache_hit_rate` - Cache effectiveness

### Grafana Dashboards

Access: `http://grafana-url:3000`

**Pre-configured Dashboards**:
- Brain AI Application Overview
- Database Performance
- Redis Cache Metrics
- Node.js Application Metrics

### Alert Rules

Alerts configured in `docker/monitoring/alerting-rules.yml`:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| BrainAIDown | App down > 2min | Critical |
| HighResponseTime | P99 > 2s for 5min | Warning |
| HighErrorRate | 5xx > 5% | Critical |
| HighMemoryUsage | > 90% for 5min | Warning |
| PostgreSQLDown | DB down > 2min | Critical |
| RedisDown | Cache down > 2min | Critical |

### Slack Notifications

Configured in GitHub Actions workflow:
- ✅ Successful deployments
- ❌ Failed deployments with rollback info

---

## 🔒 Security Best Practices

### 1. Secret Management

✅ **DO**:
- Use Kubernetes Secrets or HashiCorp Vault
- Rotate secrets regularly (every 90 days)
- Use different secrets per environment
- Enable secret encryption at rest

❌ **DON'T**:
- Commit secrets to version control
- Use default/weak passwords
- Share secrets across environments

### 2. Network Security

```yaml
# Network Policy Example
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: brain-ai-network-policy
spec:
  podSelector:
    matchLabels:
      app: brain-ai
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 3000
```

### 3. Resource Limits

All deployments include:
- Memory limits (prevent OOM)
- CPU limits (prevent resource exhaustion)
- Request quotas
- Auto-scaling policies

### 4. Image Security

```bash
# Scan Docker images
docker scan brain-ai:latest

# Use specific versions (not :latest in production)
# Sign images with Docker Content Trust
export DOCKER_CONTENT_TRUST=1
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n brain-ai

# Check logs
kubectl logs <pod-name> -n brain-ai

# Common fixes:
# - Check secrets are created
# - Verify database connection
# - Check resource quotas
```

#### 2. Database Connection Failed

```bash
# Test from pod
kubectl exec -it <pod-name> -n brain-ai -- /bin/sh
nc -zv brain-ai-postgres 5432

# Check database pod
kubectl logs deployment/brain-ai-postgres -n brain-ai

# Verify DATABASE_URL secret
kubectl get secret brain-ai-secrets -n brain-ai -o yaml
```

#### 3. High Memory Usage

```bash
# Check current usage
kubectl top pods -n brain-ai

# Increase limits in app-deployment.yaml
resources:
  limits:
    memory: "4Gi"  # Increase from 2Gi

kubectl apply -f k8s/app-deployment.yaml
```

#### 4. Slow Performance

```bash
# Check Prometheus metrics
# Access http://prometheus-url:9090
# Query: brain_ai_query_duration_seconds

# Possible solutions:
# - Scale horizontally (increase replicas)
# - Optimize database queries
# - Increase Redis cache TTL
# - Enable query result caching
```

---

## ⏮️ Rollback Procedures

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/brain-ai-blue -n brain-ai

# Rollback to previous version
kubectl rollout undo deployment/brain-ai-blue -n brain-ai

# Rollback to specific revision
kubectl rollout undo deployment/brain-ai-blue --to-revision=3 -n brain-ai

# Check rollback status
kubectl rollout status deployment/brain-ai-blue -n brain-ai
```

### Blue-Green Rollback

```bash
# Switch traffic back to blue (previous version)
kubectl patch service brain-ai -n brain-ai \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify
kubectl get svc brain-ai -n brain-ai -o yaml | grep version
```

### Docker Compose Rollback

```bash
# Stop current version
docker-compose down

# Pull previous version
docker pull yourusername/brain-ai:previous-tag

# Update docker-compose.yml to use previous tag
# Start previous version
docker-compose up -d
```

---

## 📈 Performance Optimization

### Horizontal Pod Autoscaling

Already configured in `k8s/app-deployment.yaml`:

```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_brain_documents_embedding ON brain_documents USING ivfflat (embedding vector_cosine_ops);

-- Update statistics
ANALYZE brain_documents;

-- Monitor slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### Redis Optimization

```bash
# Monitor Redis performance
redis-cli --latency
redis-cli INFO memory

# Optimize memory
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## 📞 Support & Resources

### Documentation
- [Brain AI Complete Summary](./BRAIN_AI_COMPLETE_SUMMARY.md)
- [Phase 5 Optimization](./BRAIN_AI_PHASE5_OPTIMIZATION_TESTING.md)
- [API Documentation](./BRAIN_AI_API_DOCS.md)

### Monitoring Dashboards
- Grafana: Production metrics and alerts
- Prometheus: Raw metrics and PromQL queries
- Sentry: Error tracking and performance

### Emergency Contacts
- DevOps Team: devops@company.com
- Security Team: security@company.com
- On-Call Engineer: Refer to PagerDuty schedule

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (unit, integration, E2E)
- [ ] Security scan completed (no critical vulnerabilities)
- [ ] Secrets configured in Kubernetes
- [ ] Database migrations tested
- [ ] Performance tests passed
- [ ] Monitoring dashboards configured
- [ ] Alerts configured and tested
- [ ] Rollback procedure documented and tested
- [ ] Team notified of deployment window
- [ ] Backup created

---

**Last Updated**: 2025-10-26
**Maintained By**: DevOps Team
**Version**: 1.0.0
