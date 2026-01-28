#!/bin/bash

# ============================================
# Brain AI - Load Testing Script
# ============================================
# Runs k6 load tests against staging or production
# Usage: ./scripts/run-load-test.sh [staging|production] [scenario]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
SCENARIO=${2:-default}

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Brain AI - Load Testing${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Scenario: ${SCENARIO}${NC}"
echo -e "${GREEN}============================================${NC}"

# Configuration
if [[ "$ENVIRONMENT" == "production" ]]; then
    BASE_URL="https://brain-ai.yourdomain.com"
else
    BASE_URL="https://staging-brain-ai.yourdomain.com"
fi

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}✗ k6 is not installed${NC}"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "\n${YELLOW}Testing endpoint: ${BASE_URL}${NC}"

# Pre-test health check
echo -e "\n${YELLOW}Running pre-test health check...${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api/brain/health)

if [[ $HEALTH_STATUS != "200" ]]; then
    echo -e "${RED}✗ Health check failed (HTTP ${HEALTH_STATUS})${NC}"
    echo "Aborting load test - service may be down"
    exit 1
fi

echo -e "${GREEN}✓ Health check passed${NC}"

# Run k6 load test based on scenario
case $SCENARIO in
  smoke)
    echo -e "\n${YELLOW}Running smoke test (light load)...${NC}"
    k6 run \
      --vus 5 \
      --duration 30s \
      --out json=test-results/k6-smoke-$(date +%Y%m%d-%H%M%S).json \
      -e BASE_URL=${BASE_URL} \
      tests/performance/k6-load-test.js
    ;;

  load)
    echo -e "\n${YELLOW}Running load test (normal traffic)...${NC}"
    k6 run \
      --vus 50 \
      --duration 5m \
      --out json=test-results/k6-load-$(date +%Y%m%d-%H%M%S).json \
      -e BASE_URL=${BASE_URL} \
      tests/performance/k6-load-test.js
    ;;

  stress)
    echo -e "\n${YELLOW}Running stress test (high load)...${NC}"
    k6 run \
      --vus 100 \
      --duration 10m \
      --out json=test-results/k6-stress-$(date +%Y%m%d-%H%M%S).json \
      -e BASE_URL=${BASE_URL} \
      tests/performance/k6-load-test.js
    ;;

  spike)
    echo -e "\n${YELLOW}Running spike test (sudden load)...${NC}"
    k6 run \
      --stage 0s:10,10s:200,20s:200,30s:10,40s:0 \
      --out json=test-results/k6-spike-$(date +%Y%m%d-%H%M%S).json \
      -e BASE_URL=${BASE_URL} \
      tests/performance/k6-load-test.js
    ;;

  soak)
    echo -e "\n${YELLOW}Running soak test (sustained load)...${NC}"
    k6 run \
      --vus 50 \
      --duration 1h \
      --out json=test-results/k6-soak-$(date +%Y%m%d-%H%M%S).json \
      -e BASE_URL=${BASE_URL} \
      tests/performance/k6-load-test.js
    ;;

  default)
    echo -e "\n${YELLOW}Running default load test (staged load)...${NC}"
    k6 run \
      --out json=test-results/k6-default-$(date +%Y%m%d-%H%M%S).json \
      -e BASE_URL=${BASE_URL} \
      tests/performance/k6-load-test.js
    ;;

  *)
    echo -e "${RED}Unknown scenario: ${SCENARIO}${NC}"
    echo "Available scenarios: smoke, load, stress, spike, soak, default"
    exit 1
    ;;
esac

# Capture exit code
TEST_EXIT_CODE=$?

# Post-test health check
echo -e "\n${YELLOW}Running post-test health check...${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api/brain/health)

if [[ $HEALTH_STATUS != "200" ]]; then
    echo -e "${RED}✗ Post-test health check failed (HTTP ${HEALTH_STATUS})${NC}"
else
    echo -e "${GREEN}✓ Post-test health check passed${NC}"
fi

# Generate summary
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}Load Test Summary${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Scenario: ${SCENARIO}"
echo -e "Endpoint: ${BASE_URL}"
echo -e "Exit Code: ${TEST_EXIT_CODE}"

if [[ $TEST_EXIT_CODE == 0 ]]; then
    echo -e "\n${GREEN}✅ Load test passed!${NC}"
else
    echo -e "\n${RED}❌ Load test failed${NC}"
    echo -e "Check test-results/ for detailed metrics"
fi

echo -e "${GREEN}============================================${NC}"

# Check for critical metrics violations
if [ -f "test-results/k6-${SCENARIO}-*.json" ]; then
    echo -e "\n${YELLOW}Analyzing results...${NC}"

    # Extract key metrics (requires jq)
    if command -v jq &> /dev/null; then
        echo "Key Metrics:"
        echo "- Request Rate: $(jq -r '.metrics.http_reqs.rate' test-results/k6-${SCENARIO}-*.json | tail -1) req/s"
        echo "- Error Rate: $(jq -r '.metrics.http_req_failed.rate' test-results/k6-${SCENARIO}-*.json | tail -1)"
        echo "- P95 Response Time: $(jq -r '.metrics.http_req_duration.p95' test-results/k6-${SCENARIO}-*.json | tail -1) ms"
    fi
fi

exit $TEST_EXIT_CODE
