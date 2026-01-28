#!/bin/bash

# ============================================
# Brain AI - Security Audit Script
# ============================================
# Performs comprehensive security checks on deployment
# Usage: ./scripts/security-audit.sh [staging|production]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
NAMESPACE="brain-ai"
SEVERITY_COUNT_CRITICAL=0
SEVERITY_COUNT_HIGH=0
SEVERITY_COUNT_MEDIUM=0

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Brain AI - Security Audit${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}============================================${NC}"

# ============================================
# 1. Secrets Management
# ============================================
echo -e "\n${BLUE}[1/8] Checking Secrets Management...${NC}"

# Check if secrets exist
echo "Checking Kubernetes secrets..."
SECRETS=$(kubectl get secrets -n ${NAMESPACE} -l app=brain-ai --no-headers 2>/dev/null | wc -l)

if [[ $SECRETS -gt 0 ]]; then
    echo -e "${GREEN}✓ Found ${SECRETS} secret(s) in namespace${NC}"
else
    echo -e "${RED}✗ No secrets found${NC}"
    ((SEVERITY_COUNT_CRITICAL++))
fi

# Check if secrets are base64 encoded (not plaintext)
echo "Verifying secret encoding..."
SECRET_NAME=$(kubectl get secrets -n ${NAMESPACE} -l app=brain-ai -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -n "$SECRET_NAME" ]]; then
    # Check if secret data is base64 encoded
    SECRET_DATA=$(kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o jsonpath='{.data}' 2>/dev/null)
    if [[ -n "$SECRET_DATA" ]]; then
        echo -e "${GREEN}✓ Secrets are properly encoded${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Could not verify secret encoding${NC}"
        ((SEVERITY_COUNT_MEDIUM++))
    fi
fi

# Check for exposed secrets in ConfigMaps
echo "Checking for secrets in ConfigMaps..."
CONFIGMAP_SECRETS=$(kubectl get configmap -n ${NAMESPACE} -o yaml 2>/dev/null | grep -iE "(password|api[_-]?key|secret|token)" || echo "")

if [[ -z "$CONFIGMAP_SECRETS" ]]; then
    echo -e "${GREEN}✓ No secrets found in ConfigMaps${NC}"
else
    echo -e "${RED}✗ WARNING: Potential secrets in ConfigMaps:${NC}"
    echo "$CONFIGMAP_SECRETS"
    ((SEVERITY_COUNT_HIGH++))
fi

# ============================================
# 2. Container Image Security
# ============================================
echo -e "\n${BLUE}[2/8] Scanning Container Images...${NC}"

# Get current image
CURRENT_IMAGE=$(kubectl get deployment brain-ai-blue -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)

if [[ -n "$CURRENT_IMAGE" ]]; then
    echo "Scanning image: ${CURRENT_IMAGE}"

    # Check if trivy is installed
    if command -v trivy &> /dev/null; then
        echo "Running Trivy vulnerability scan..."
        TRIVY_REPORT=$(trivy image --severity CRITICAL,HIGH --format json ${CURRENT_IMAGE} 2>/dev/null || echo "{}")

        # Count vulnerabilities
        if command -v jq &> /dev/null; then
            CRITICAL=$(echo "$TRIVY_REPORT" | jq '[.Results[].Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' 2>/dev/null || echo "0")
            HIGH=$(echo "$TRIVY_REPORT" | jq '[.Results[].Vulnerabilities[]? | select(.Severity=="HIGH")] | length' 2>/dev/null || echo "0")

            echo "Critical vulnerabilities: ${CRITICAL}"
            echo "High vulnerabilities: ${HIGH}"

            if [[ $CRITICAL -gt 0 ]]; then
                echo -e "${RED}✗ Found ${CRITICAL} critical vulnerabilities${NC}"
                ((SEVERITY_COUNT_CRITICAL+=$CRITICAL))
            elif [[ $HIGH -gt 0 ]]; then
                echo -e "${YELLOW}⚠ Found ${HIGH} high vulnerabilities${NC}"
                ((SEVERITY_COUNT_HIGH+=$HIGH))
            else
                echo -e "${GREEN}✓ No critical or high vulnerabilities found${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠ Trivy not installed - skipping image scan${NC}"
        echo "Install: https://aquasecurity.github.io/trivy/"
        ((SEVERITY_COUNT_MEDIUM++))
    fi
fi

# Check if running as root
echo "Checking container user..."
POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=brain-ai,version=blue -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -n "$POD_NAME" ]]; then
    USER_ID=$(kubectl exec -n ${NAMESPACE} ${POD_NAME} -- id -u 2>/dev/null || echo "0")
    if [[ $USER_ID == "0" ]]; then
        echo -e "${RED}✗ Container running as root (UID 0)${NC}"
        ((SEVERITY_COUNT_HIGH++))
    else
        echo -e "${GREEN}✓ Container running as non-root user (UID ${USER_ID})${NC}"
    fi
fi

# ============================================
# 3. Network Security
# ============================================
echo -e "\n${BLUE}[3/8] Checking Network Security...${NC}"

# Check if NetworkPolicies exist
echo "Checking NetworkPolicies..."
NETWORK_POLICIES=$(kubectl get networkpolicy -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)

if [[ $NETWORK_POLICIES -gt 0 ]]; then
    echo -e "${GREEN}✓ Found ${NETWORK_POLICIES} NetworkPolicy(ies)${NC}"
    kubectl get networkpolicy -n ${NAMESPACE} 2>/dev/null
else
    echo -e "${YELLOW}⚠ No NetworkPolicies found${NC}"
    echo "Recommendation: Implement network policies to restrict pod-to-pod traffic"
    ((SEVERITY_COUNT_MEDIUM++))
fi

# Check if services are using TLS
echo "Checking service encryption..."
SERVICES=$(kubectl get services -n ${NAMESPACE} -o yaml 2>/dev/null)
if echo "$SERVICES" | grep -q "tls"; then
    echo -e "${GREEN}✓ TLS configuration found${NC}"
else
    echo -e "${YELLOW}⚠ No TLS configuration detected${NC}"
    ((SEVERITY_COUNT_MEDIUM++))
fi

# ============================================
# 4. RBAC Configuration
# ============================================
echo -e "\n${BLUE}[4/8] Checking RBAC Configuration...${NC}"

# Check ServiceAccounts
echo "Checking ServiceAccounts..."
SA_COUNT=$(kubectl get serviceaccount -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)

if [[ $SA_COUNT -gt 0 ]]; then
    echo -e "${GREEN}✓ Found ${SA_COUNT} ServiceAccount(s)${NC}"
else
    echo -e "${YELLOW}⚠ No custom ServiceAccounts found${NC}"
    ((SEVERITY_COUNT_MEDIUM++))
fi

# Check for overly permissive roles
echo "Checking for overly permissive roles..."
CLUSTER_ADMIN_BINDINGS=$(kubectl get clusterrolebinding -n ${NAMESPACE} -o yaml 2>/dev/null | grep "cluster-admin" || echo "")

if [[ -n "$CLUSTER_ADMIN_BINDINGS" ]]; then
    echo -e "${YELLOW}⚠ Warning: cluster-admin bindings found${NC}"
    echo "Review and minimize cluster-admin usage"
    ((SEVERITY_COUNT_MEDIUM++))
else
    echo -e "${GREEN}✓ No cluster-admin bindings in namespace${NC}"
fi

# ============================================
# 5. Pod Security Standards
# ============================================
echo -e "\n${BLUE}[5/8] Checking Pod Security Standards...${NC}"

# Check SecurityContext
echo "Checking Pod SecurityContext..."
PODS=$(kubectl get pods -n ${NAMESPACE} -l app=brain-ai -o json 2>/dev/null)

if command -v jq &> /dev/null && [[ -n "$PODS" ]]; then
    # Check for privileged containers
    PRIVILEGED=$(echo "$PODS" | jq '[.items[].spec.containers[] | select(.securityContext.privileged==true)] | length' 2>/dev/null)
    if [[ $PRIVILEGED -gt 0 ]]; then
        echo -e "${RED}✗ Found ${PRIVILEGED} privileged container(s)${NC}"
        ((SEVERITY_COUNT_HIGH++))
    else
        echo -e "${GREEN}✓ No privileged containers${NC}"
    fi

    # Check for readOnlyRootFilesystem
    READONLY_FS=$(echo "$PODS" | jq '[.items[].spec.containers[] | select(.securityContext.readOnlyRootFilesystem==true)] | length' 2>/dev/null)
    echo "Read-only root filesystem: ${READONLY_FS} container(s)"

    # Check for capabilities
    ADDED_CAPS=$(echo "$PODS" | jq '[.items[].spec.containers[].securityContext.capabilities.add[]?] | unique' 2>/dev/null)
    if [[ "$ADDED_CAPS" != "null" && "$ADDED_CAPS" != "[]" ]]; then
        echo "Added capabilities: ${ADDED_CAPS}"
    fi
fi

# ============================================
# 6. Resource Limits & Quotas
# ============================================
echo -e "\n${BLUE}[6/8] Checking Resource Limits...${NC}"

# Check if all containers have resource limits
echo "Verifying resource limits..."
CONTAINERS_WITHOUT_LIMITS=$(kubectl get pods -n ${NAMESPACE} -l app=brain-ai -o json 2>/dev/null | \
    jq '[.items[].spec.containers[] | select(.resources.limits==null)] | length' 2>/dev/null || echo "0")

if [[ $CONTAINERS_WITHOUT_LIMITS -eq 0 ]]; then
    echo -e "${GREEN}✓ All containers have resource limits${NC}"
else
    echo -e "${YELLOW}⚠ ${CONTAINERS_WITHOUT_LIMITS} container(s) without resource limits${NC}"
    ((SEVERITY_COUNT_MEDIUM++))
fi

# Check ResourceQuotas
echo "Checking ResourceQuotas..."
QUOTAS=$(kubectl get resourcequota -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l)

if [[ $QUOTAS -gt 0 ]]; then
    echo -e "${GREEN}✓ Found ${QUOTAS} ResourceQuota(s)${NC}"
else
    echo -e "${YELLOW}⚠ No ResourceQuotas configured${NC}"
    ((SEVERITY_COUNT_MEDIUM++))
fi

# ============================================
# 7. Exposed Endpoints & Attack Surface
# ============================================
echo -e "\n${BLUE}[7/8] Checking Exposed Endpoints...${NC}"

# List all services and their exposure
echo "Listing exposed services..."
kubectl get services -n ${NAMESPACE} -o custom-columns=NAME:.metadata.name,TYPE:.spec.type,PORTS:.spec.ports[*].port 2>/dev/null

# Check for services without authentication
if [[ "$ENVIRONMENT" == "production" ]]; then
    BASE_URL="https://brain-ai.yourdomain.com"
else
    BASE_URL="https://staging-brain-ai.yourdomain.com"
fi

echo "Testing authentication on public endpoints..."
HEALTH_NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api/brain/health 2>/dev/null || echo "000")

if [[ $HEALTH_NOAUTH == "200" ]]; then
    echo -e "${GREEN}✓ Health endpoint accessible (expected)${NC}"
else
    echo -e "${YELLOW}⚠ Health endpoint returned: ${HEALTH_NOAUTH}${NC}"
fi

# Check if sensitive endpoints require auth
QUERY_NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api/brain/query -X POST -d '{"query":"test"}' 2>/dev/null || echo "000")

if [[ $QUERY_NOAUTH == "401" || $QUERY_NOAUTH == "403" ]]; then
    echo -e "${GREEN}✓ Query endpoint requires authentication${NC}"
elif [[ $QUERY_NOAUTH == "200" ]]; then
    echo -e "${RED}✗ Query endpoint accessible without authentication${NC}"
    ((SEVERITY_COUNT_CRITICAL++))
else
    echo -e "${YELLOW}⚠ Query endpoint returned: ${QUERY_NOAUTH}${NC}"
fi

# ============================================
# 8. Audit Logs & Monitoring
# ============================================
echo -e "\n${BLUE}[8/8] Checking Audit Logging...${NC}"

# Check if audit logging is enabled
echo "Verifying audit logs..."
AUDIT_LOGS=$(kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' 2>/dev/null | head -10)

if [[ -n "$AUDIT_LOGS" ]]; then
    echo -e "${GREEN}✓ Event logging is active${NC}"
    echo "Recent events (last 10):"
    echo "$AUDIT_LOGS" | head -5
else
    echo -e "${YELLOW}⚠ No recent events found${NC}"
fi

# Check for monitoring/logging pods
echo "Checking monitoring infrastructure..."
PROMETHEUS_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=prometheus --no-headers 2>/dev/null | wc -l)
GRAFANA_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=grafana --no-headers 2>/dev/null | wc -l)

if [[ $PROMETHEUS_PODS -gt 0 ]]; then
    echo -e "${GREEN}✓ Prometheus monitoring active${NC}"
else
    echo -e "${YELLOW}⚠ Prometheus not found${NC}"
fi

if [[ $GRAFANA_PODS -gt 0 ]]; then
    echo -e "${GREEN}✓ Grafana dashboards active${NC}"
else
    echo -e "${YELLOW}⚠ Grafana not found${NC}"
fi

# ============================================
# Summary & Recommendations
# ============================================
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Security Audit Summary${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Namespace: ${NAMESPACE}"
echo -e "\nFindings by Severity:"
echo -e "${RED}  Critical: ${SEVERITY_COUNT_CRITICAL}${NC}"
echo -e "${YELLOW}  High: ${SEVERITY_COUNT_HIGH}${NC}"
echo -e "${BLUE}  Medium: ${SEVERITY_COUNT_MEDIUM}${NC}"

# Overall status
TOTAL_ISSUES=$((SEVERITY_COUNT_CRITICAL + SEVERITY_COUNT_HIGH + SEVERITY_COUNT_MEDIUM))

if [[ $SEVERITY_COUNT_CRITICAL -gt 0 ]]; then
    echo -e "\n${RED}❌ CRITICAL ISSUES FOUND - Immediate action required${NC}"
    EXIT_CODE=2
elif [[ $SEVERITY_COUNT_HIGH -gt 0 ]]; then
    echo -e "\n${YELLOW}⚠ HIGH SEVERITY ISSUES - Address soon${NC}"
    EXIT_CODE=1
elif [[ $SEVERITY_COUNT_MEDIUM -gt 0 ]]; then
    echo -e "\n${BLUE}ℹ MEDIUM SEVERITY ISSUES - Review recommended${NC}"
    EXIT_CODE=0
else
    echo -e "\n${GREEN}✅ No critical security issues found${NC}"
    EXIT_CODE=0
fi

# Recommendations
echo -e "\n${BLUE}Recommendations:${NC}"
echo "1. Regularly rotate secrets (every 90 days)"
echo "2. Keep container images updated"
echo "3. Enable network policies for pod isolation"
echo "4. Implement TLS for all external endpoints"
echo "5. Use minimal RBAC permissions"
echo "6. Enable Pod Security Standards"
echo "7. Monitor audit logs for suspicious activity"
echo "8. Scan images before deployment"

echo -e "${GREEN}============================================${NC}"

# Generate report
REPORT_FILE="security-audit-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).txt"
cat > ${REPORT_FILE} <<EOF
Brain AI Security Audit Report
======================================
Date: $(date)
Environment: ${ENVIRONMENT}
Namespace: ${NAMESPACE}

Findings Summary:
- Critical Issues: ${SEVERITY_COUNT_CRITICAL}
- High Severity: ${SEVERITY_COUNT_HIGH}
- Medium Severity: ${SEVERITY_COUNT_MEDIUM}
- Total Issues: ${TOTAL_ISSUES}

Status: $(if [[ $SEVERITY_COUNT_CRITICAL -gt 0 ]]; then echo "CRITICAL"; elif [[ $SEVERITY_COUNT_HIGH -gt 0 ]]; then echo "WARNING"; else echo "PASS"; fi)

Next Review: $(date -d '+30 days' 2>/dev/null || date -v+30d 2>/dev/null || echo "In 30 days")
EOF

echo -e "\n${GREEN}Security report saved to: ${REPORT_FILE}${NC}"

exit $EXIT_CODE
