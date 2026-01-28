# ⚡ Brain AI - Quick Deployment Reference

**Last Updated**: 2025-10-26

---

## 🚀 Quick Start Commands

### Local Development (Docker)

```bash
# Start complete stack
cd docker
docker-compose up -d

# View logs
docker-compose logs -f brain-ai

# Stop stack
docker-compose down
```

**Access**: http://localhost:3000/brain

---

## ☸️ Kubernetes Deployment

### First Time Setup

```bash
# 1. Create namespace
kubectl create namespace brain-ai

# 2. Create secrets
kubectl create secret generic brain-ai-secrets \
  --from-env-file=.env.production \
  -n brain-ai

# 3. Apply all configs
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/app-deployment.yaml

# 4. Wait for deployment
kubectl wait --for=condition=available deployment/brain-ai-blue -n brain-ai --timeout=300s

# 5. Get external IP
kubectl get svc brain-ai -n brain-ai
```

### Using Deploy Script

```bash
# Make executable
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

---

## 📊 Monitoring & Health Checks

### Check Application Health

```bash
# Via kubectl
kubectl get pods -n brain-ai
kubectl logs -f deployment/brain-ai-blue -n brain-ai

# Via API
curl http://your-domain/api/brain/health
```

### Access Monitoring Dashboards

```
Grafana:    http://localhost:3001
Prometheus: http://localhost:9090
```

---

## 🔄 CI/CD Triggers

### Deploy to Staging

```bash
git checkout develop
git merge feature/your-feature
git push origin develop

# GitHub Actions will auto-deploy to staging
```

### Deploy to Production

```bash
git checkout main
git merge develop
git tag v1.0.1
git push origin main --tags

# GitHub Actions will auto-deploy to production (Blue-Green)
```

---

## 🛠️ Common Operations

### Scale Application

```bash
# Manual scaling
kubectl scale deployment brain-ai-blue --replicas=5 -n brain-ai

# Auto-scaling is configured (3-10 replicas)
kubectl get hpa -n brain-ai
```

### View Logs

```bash
# All pods
kubectl logs -f deployment/brain-ai-blue -n brain-ai

# Specific pod
kubectl logs -f <pod-name> -n brain-ai

# Previous pod (if crashed)
kubectl logs -p <pod-name> -n brain-ai
```

### Execute Commands in Pod

```bash
kubectl exec -it <pod-name> -n brain-ai -- /bin/sh

# Test database connection
nc -zv brain-ai-postgres 5432

# Test Redis connection
nc -zv brain-ai-redis 6379
```

### Update Secrets

```bash
# Delete old secret
kubectl delete secret brain-ai-secrets -n brain-ai

# Create new secret
kubectl create secret generic brain-ai-secrets \
  --from-env-file=.env.production \
  -n brain-ai

# Restart pods to pick up new secrets
kubectl rollout restart deployment/brain-ai-blue -n brain-ai
```

---

## ⏮️ Emergency Procedures

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/brain-ai-blue -n brain-ai

# Rollback to previous version
kubectl rollout undo deployment/brain-ai-blue -n brain-ai

# Rollback to specific revision
kubectl rollout undo deployment/brain-ai-blue --to-revision=2 -n brain-ai
```

### Blue-Green Traffic Switch

```bash
# Switch to blue (previous version)
kubectl patch service brain-ai -n brain-ai \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Switch to green (new version)
kubectl patch service brain-ai -n brain-ai \
  -p '{"spec":{"selector":{"version":"green"}}}'
```

### Emergency Scale Down

```bash
# Scale to minimum
kubectl scale deployment brain-ai-blue --replicas=1 -n brain-ai

# Stop all (emergency only!)
kubectl scale deployment brain-ai-blue --replicas=0 -n brain-ai
```

---

## 🔍 Debugging

### Database Issues

```bash
# Connect to PostgreSQL
kubectl exec -it deployment/brain-ai-postgres -n brain-ai -- psql -U postgres -d brain_ai

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# Check tables
\dt
```

### Redis Issues

```bash
# Connect to Redis
kubectl exec -it deployment/brain-ai-redis -n brain-ai -- redis-cli

# Check keys
KEYS *

# Get cache stats
INFO memory
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n brain-ai
kubectl top nodes

# View metrics
kubectl get hpa -n brain-ai
```

---

## 📈 Metrics & Alerts

### Key Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time P99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
container_memory_usage_bytes{pod=~"brain-ai.*"}
```

---

## 🔐 Security Operations

### Rotate Secrets

```bash
# 1. Generate new secrets
openssl rand -base64 32

# 2. Update .env.production

# 3. Update Kubernetes secrets
kubectl create secret generic brain-ai-secrets \
  --from-env-file=.env.production \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Restart deployments
kubectl rollout restart deployment/brain-ai-blue -n brain-ai
kubectl rollout restart deployment/brain-ai-green -n brain-ai
```

---

## 📞 Quick Links

| Resource | URL |
|----------|-----|
| **Documentation** | [BRAIN_AI_DEPLOYMENT_GUIDE.md](./BRAIN_AI_DEPLOYMENT_GUIDE.md) |
| **CI/CD Details** | [BRAIN_AI_CICD_COMPLETE.md](./BRAIN_AI_CICD_COMPLETE.md) |
| **Complete Summary** | [BRAIN_AI_COMPLETE_SUMMARY.md](./BRAIN_AI_COMPLETE_SUMMARY.md) |
| **GitHub Actions** | `.github/workflows/brain-ai-cicd.yml` |
| **Kubernetes Configs** | `k8s/` directory |
| **Docker Configs** | `docker/` directory |

---

## ⚠️ Important Notes

1. **Never commit secrets** to version control
2. **Always test in staging** before production
3. **Monitor deployments** for 30 minutes after deploy
4. **Keep rollback plan** ready
5. **Document all manual changes**

---

**Need Help?** Check the [full deployment guide](./BRAIN_AI_DEPLOYMENT_GUIDE.md) or contact DevOps team.
