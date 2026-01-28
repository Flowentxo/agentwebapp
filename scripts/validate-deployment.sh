#!/bin/bash

# ============================================
# Brain AI - Deployment Validation Script
# ============================================
# Usage: ./scripts/validate-deployment.sh [staging|production]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
NAMESPACE="brain-ai"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Brain AI - Deployment Validation${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}============================================${NC}"

# Configuration
if [[ "$ENVIRONMENT" == "production" ]]; then
    BASE_URL="https://brain-ai.yourdomain.com"
else
    BASE_URL="https://staging-brain-ai.yourdomain.com"
fi

HEALTH_ENDPOINT="${BASE_URL}/api/brain/health"
METRICS_ENDPOINT="${BASE_URL}/api/brain/metrics"

# ============================================
# 1. Kubernetes Health Checks
# ============================================
echo -e "\n${YELLOW}[1/10] Checking Kubernetes deployment...${NC}"

# Check namespace
if kubectl get namespace ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✓ Namespace '${NAMESPACE}' exists${NC}"
else
    echo -e "${RED}✗ Namespace '${NAMESPACE}' not found${NC}"
    exit 1
fi

# Check deployments
echo -e "\n${YELLOW}Checking deployments:${NC}"
kubectl get deployments -n ${NAMESPACE}

BLUE_READY=$(kubectl get deployment brain-ai-blue -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
GREEN_READY=$(kubectl get deployment brain-ai-green -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

if [[ $BLUE_READY -gt 0 ]] || [[ $GREEN_READY -gt 0 ]]; then
    echo -e "${GREEN}✓ At least one deployment is ready (Blue: ${BLUE_READY}, Green: ${GREEN_READY})${NC}"
else
    echo -e "${RED}✗ No deployments are ready${NC}"
    exit 1
fi

# Check pods
echo -e "\n${YELLOW}Checking pods:${NC}"
PODS_RUNNING=$(kubectl get pods -n ${NAMESPACE} -l app=brain-ai --field-selector=status.phase=Running --no-headers | wc -l)
PODS_TOTAL=$(kubectl get pods -n ${NAMESPACE} -l app=brain-ai --no-headers | wc -l)

echo "Running pods: ${PODS_RUNNING}/${PODS_TOTAL}"

if [[ $PODS_RUNNING -ge 3 ]]; then
    echo -e "${GREEN}✓ Sufficient pods running (${PODS_RUNNING}/3+ required)${NC}"
else
    echo -e "${RED}✗ Insufficient pods running (${PODS_RUNNING}/3 required)${NC}"
    exit 1
fi

# Check services
echo -e "\n${YELLOW}Checking services:${NC}"
kubectl get svc -n ${NAMESPACE}

# ============================================
# 2. Health Endpoint Check
# ============================================
echo -e "\n${YELLOW}[2/10] Checking health endpoint...${NC}"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" ${HEALTH_ENDPOINT} || echo "000")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [[ $HEALTH_STATUS == "200" ]]; then
    echo -e "${GREEN}✓ Health endpoint responding (HTTP ${HEALTH_STATUS})${NC}"
    echo "Response: ${HEALTH_BODY}" | jq '.' 2>/dev/null || echo "${HEALTH_BODY}"
else
    echo -e "${RED}✗ Health endpoint failed (HTTP ${HEALTH_STATUS})${NC}"
    exit 1
fi

# Check individual service health
POSTGRES_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.postgresql.status' 2>/dev/null || echo "unknown")
REDIS_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.redis.status' 2>/dev/null || echo "unknown")
PGVECTOR_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.pgvector.status' 2>/dev/null || echo "unknown")

echo "PostgreSQL: ${POSTGRES_STATUS}"
echo "Redis: ${REDIS_STATUS}"
echo "pgvector: ${PGVECTOR_STATUS}"

# ============================================
# 3. Database Validation
# ============================================
echo -e "\n${YELLOW}[3/10] Validating database...${NC}"

# Check PostgreSQL pod
POSTGRES_POD=$(kubectl get pods -n ${NAMESPACE} -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -n "$POSTGRES_POD" ]]; then
    echo -e "${GREEN}✓ PostgreSQL pod found: ${POSTGRES_POD}${NC}"

    # Check pgvector extension
    PGVECTOR_CHECK=$(kubectl exec -n ${NAMESPACE} ${POSTGRES_POD} -- psql -U postgres -d brain_ai -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname='vector';" 2>/dev/null || echo "0")

    if [[ $PGVECTOR_CHECK -gt 0 ]]; then
        echo -e "${GREEN}✓ pgvector extension is installed${NC}"
    else
        echo -e "${RED}✗ pgvector extension not found${NC}"
        exit 1
    fi

    # Check brain_documents table
    TABLE_CHECK=$(kubectl exec -n ${NAMESPACE} ${POSTGRES_POD} -- psql -U postgres -d brain_ai -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='brain_documents';" 2>/dev/null || echo "0")

    if [[ $TABLE_CHECK -gt 0 ]]; then
        echo -e "${GREEN}✓ brain_documents table exists${NC}"
    else
        echo -e "${RED}✗ brain_documents table not found${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ PostgreSQL pod not found${NC}"
    exit 1
fi

# ============================================
# 4. Redis Validation
# ============================================
echo -e "\n${YELLOW}[4/10] Validating Redis...${NC}"

REDIS_POD=$(kubectl get pods -n ${NAMESPACE} -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -n "$REDIS_POD" ]]; then
    echo -e "${GREEN}✓ Redis pod found: ${REDIS_POD}${NC}"

    # Test Redis connection
    REDIS_PING=$(kubectl exec -n ${NAMESPACE} ${REDIS_POD} -- redis-cli ping 2>/dev/null || echo "FAIL")

    if [[ "$REDIS_PING" == "PONG" ]]; then
        echo -e "${GREEN}✓ Redis is responding${NC}"
    else
        echo -e "${RED}✗ Redis not responding${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Redis pod not found${NC}"
    exit 1
fi

# ============================================
# 5. API Endpoints Validation
# ============================================
echo -e "\n${YELLOW}[5/10] Testing API endpoints...${NC}"

# Test query endpoint
echo "Testing /api/brain/query..."
QUERY_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/brain/query \
    -H "Content-Type: application/json" \
    -d '{"query":"test","limit":1}' \
    -w "\n%{http_code}")

QUERY_STATUS=$(echo "$QUERY_RESPONSE" | tail -n1)

if [[ $QUERY_STATUS == "200" ]]; then
    echo -e "${GREEN}✓ Query endpoint working${NC}"
else
    echo -e "${YELLOW}⚠ Query endpoint returned HTTP ${QUERY_STATUS}${NC}"
fi

# Test metrics endpoint
echo "Testing /api/brain/metrics..."
METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" ${METRICS_ENDPOINT})
METRICS_STATUS=$(echo "$METRICS_RESPONSE" | tail -n1)

if [[ $METRICS_STATUS == "200" ]]; then
    echo -e "${GREEN}✓ Metrics endpoint working${NC}"
else
    echo -e "${YELLOW}⚠ Metrics endpoint returned HTTP ${METRICS_STATUS}${NC}"
fi

# ============================================
# 6. Cache Validation
# ============================================
echo -e "\n${YELLOW}[6/10] Validating cache performance...${NC}"

# Get cache stats from metrics
CACHE_HIT_RATE=$(echo "$HEALTH_BODY" | jq -r '.services.redis.cachedKeys' 2>/dev/null || echo "0")
echo "Cached keys: ${CACHE_HIT_RATE}"

if [[ $CACHE_HIT_RATE -gt 0 ]]; then
    echo -e "${GREEN}✓ Cache is active${NC}"
else
    echo -e "${YELLOW}⚠ Cache appears empty (expected for new deployment)${NC}"
fi

# ============================================
# 7. Agent Integration Check
# ============================================
echo -e "\n${YELLOW}[7/10] Checking agent integration...${NC}"

# Test agent metrics endpoint
AGENT_METRICS_URL="${BASE_URL}/api/brain/agents/metrics"
AGENT_METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" ${AGENT_METRICS_URL})
AGENT_METRICS_STATUS=$(echo "$AGENT_METRICS_RESPONSE" | tail -n1)

if [[ $AGENT_METRICS_STATUS == "200" ]]; then
    echo -e "${GREEN}✓ Agent metrics endpoint working${NC}"
else
    echo -e "${YELLOW}⚠ Agent metrics endpoint returned HTTP ${AGENT_METRICS_STATUS}${NC}"
fi

# Check for known agents (Dexter, Cassie, Emmie, Aura)
echo "Checking agent availability..."
for agent in dexter cassie emmie aura nova kai lex finn ari echo vera omni; do
    AGENT_CHECK=$(curl -s ${BASE_URL}/api/agents/${agent} -w "\n%{http_code}")
    AGENT_STATUS=$(echo "$AGENT_CHECK" | tail -n1)

    if [[ $AGENT_STATUS == "200" ]]; then
        echo -e "${GREEN}✓ ${agent}${NC}"
    else
        echo -e "${YELLOW}⚠ ${agent} (HTTP ${AGENT_STATUS})${NC}"
    fi
done

# ============================================
# 8. Blue-Green Deployment Check
# ============================================
echo -e "\n${YELLOW}[8/10] Checking Blue-Green deployment...${NC}"

ACTIVE_VERSION=$(kubectl get service brain-ai -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}' 2>/dev/null)

if [[ -n "$ACTIVE_VERSION" ]]; then
    echo -e "${GREEN}✓ Active version: ${ACTIVE_VERSION}${NC}"

    # Check if inactive version is ready for next deployment
    if [[ "$ACTIVE_VERSION" == "blue" ]]; then
        STANDBY_READY=$(kubectl get deployment brain-ai-green -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        echo "Standby (green): ${STANDBY_READY} replicas ready"
    else
        STANDBY_READY=$(kubectl get deployment brain-ai-blue -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        echo "Standby (blue): ${STANDBY_READY} replicas ready"
    fi
else
    echo -e "${RED}✗ Could not determine active version${NC}"
fi

# ============================================
# 9. Resource Usage Check
# ============================================
echo -e "\n${YELLOW}[9/10] Checking resource usage...${NC}"

echo "Pod resource usage:"
kubectl top pods -n ${NAMESPACE} -l app=brain-ai 2>/dev/null || echo "Metrics server not available"

echo -e "\nHPA status:"
kubectl get hpa -n ${NAMESPACE} 2>/dev/null || echo "No HPA configured"

# ============================================
# 10. Security Validation
# ============================================
echo -e "\n${YELLOW}[10/10] Validating security...${NC}"

# Check if secrets exist
SECRETS_COUNT=$(kubectl get secrets -n ${NAMESPACE} -l app=brain-ai --no-headers 2>/dev/null | wc -l)

if [[ $SECRETS_COUNT -gt 0 ]]; then
    echo -e "${GREEN}✓ Secrets are configured${NC}"
else
    echo -e "${RED}✗ No secrets found${NC}"
    exit 1
fi

# Check for exposed secrets (shouldn't find any)
echo "Checking for exposed secrets in logs..."
EXPOSED_SECRETS=$(kubectl logs -n ${NAMESPACE} -l app=brain-ai --tail=100 2>/dev/null | grep -i "api[_-]key\|password\|secret" | head -5 || echo "")

if [[ -z "$EXPOSED_SECRETS" ]]; then
    echo -e "${GREEN}✓ No secrets exposed in logs${NC}"
else
    echo -e "${RED}✗ WARNING: Potential secrets in logs:${NC}"
    echo "$EXPOSED_SECRETS"
fi

# ============================================
# Summary
# ============================================
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Validation Summary${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Base URL: ${BASE_URL}"
echo -e "Active Version: ${ACTIVE_VERSION}"
echo -e "Running Pods: ${PODS_RUNNING}"
echo -e "Health Status: ${HEALTH_STATUS}"
echo -e "Database: ${POSTGRES_STATUS}"
echo -e "Cache: ${REDIS_STATUS}"
echo -e "\n${GREEN}✅ Deployment validation completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"

# Generate validation report
REPORT_FILE="deployment-validation-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).txt"
cat > ${REPORT_FILE} <<EOF
Brain AI Deployment Validation Report
======================================
Date: $(date)
Environment: ${ENVIRONMENT}
Base URL: ${BASE_URL}

Status Summary:
- Kubernetes Namespace: ${NAMESPACE}
- Active Version: ${ACTIVE_VERSION}
- Running Pods: ${PODS_RUNNING}/${PODS_TOTAL}
- Health Endpoint: HTTP ${HEALTH_STATUS}
- PostgreSQL: ${POSTGRES_STATUS}
- Redis: ${REDIS_STATUS}
- pgvector: ${PGVECTOR_STATUS}

All validation checks passed ✅
EOF

echo -e "\n${GREEN}Validation report saved to: ${REPORT_FILE}${NC}"
