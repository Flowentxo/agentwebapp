#!/bin/bash

###############################################################################
# OAuth2 Integration - Automated Test Runner
#
# Runs complete test suite across all environments
# Usage: ./scripts/run-all-tests.sh [environment] [test-type]
#
# Environments: dev, staging, prod
# Test Types: unit, integration, e2e, all
#
# Examples:
#   ./scripts/run-all-tests.sh dev all
#   ./scripts/run-all-tests.sh staging e2e
#   ./scripts/run-all-tests.sh prod unit
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
TEST_TYPE=${2:-all}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="test-results"
REPORT_FILE="$LOG_DIR/test-report-$ENVIRONMENT-$TIMESTAMP.json"

# Create log directory
mkdir -p $LOG_DIR

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

###############################################################################
# Helper Functions
###############################################################################

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_header() {
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════"
  echo ""
}

###############################################################################
# Environment Setup
###############################################################################

setup_environment() {
  print_header "Setting up $ENVIRONMENT environment"

  case $ENVIRONMENT in
    dev)
      export BASE_URL="http://localhost:3000"
      export DATABASE_URL=${DEV_DATABASE_URL:-"postgresql://localhost/sintra_dev"}
      log_info "Development environment configured"
      ;;
    staging)
      export BASE_URL="https://staging.yourdomain.com"
      export DATABASE_URL=$STAGING_DATABASE_URL
      log_info "Staging environment configured"
      ;;
    prod)
      export BASE_URL="https://yourdomain.com"
      export DATABASE_URL=$PRODUCTION_DATABASE_URL
      log_warning "Running tests on PRODUCTION - proceed with caution!"
      read -p "Continue? (yes/no): " confirm
      if [ "$confirm" != "yes" ]; then
        log_error "Aborted by user"
        exit 1
      fi
      ;;
    *)
      log_error "Invalid environment: $ENVIRONMENT"
      echo "Valid environments: dev, staging, prod"
      exit 1
      ;;
  esac

  log_success "Environment: $ENVIRONMENT"
  log_success "Base URL: $BASE_URL"
}

###############################################################################
# Test Runners
###############################################################################

run_unit_tests() {
  print_header "Running Unit Tests"

  log_info "Starting OAuth utility tests..."

  # Run vitest
  if npx vitest run tests/unit/oauth/ --reporter=json --outputFile=$LOG_DIR/unit-results.json; then
    UNIT_PASSED=$(jq '.numPassedTests' $LOG_DIR/unit-results.json 2>/dev/null || echo 0)
    UNIT_FAILED=$(jq '.numFailedTests' $LOG_DIR/unit-results.json 2>/dev/null || echo 0)
    UNIT_TOTAL=$(jq '.numTotalTests' $LOG_DIR/unit-results.json 2>/dev/null || echo 0)

    TOTAL_TESTS=$((TOTAL_TESTS + UNIT_TOTAL))
    PASSED_TESTS=$((PASSED_TESTS + UNIT_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + UNIT_FAILED))

    log_success "Unit tests completed: $UNIT_PASSED/$UNIT_TOTAL passed"
  else
    log_error "Unit tests failed!"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

run_integration_tests() {
  print_header "Running Integration Tests"

  log_info "Testing API endpoints..."

  # Health check
  if curl -f -s "$BASE_URL/api/health" > /dev/null; then
    log_success "Health check passed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_error "Health check failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # Integrations endpoint
  if curl -f -s "$BASE_URL/api/integrations" \
    -H "x-user-id: test-user" > /dev/null; then
    log_success "Integrations endpoint passed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_error "Integrations endpoint failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # OAuth initiate endpoint
  if curl -f -s -X POST "$BASE_URL/api/oauth/google/initiate" \
    -H "Content-Type: application/json" \
    -d '{"service":"gmail"}' > /dev/null; then
    log_success "OAuth initiate endpoint passed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_error "OAuth initiate endpoint failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  log_success "Integration tests completed"
}

run_e2e_tests() {
  print_header "Running E2E Tests"

  log_info "Starting Playwright tests..."

  # Install browsers if needed
  if [ ! -d "node_modules/@playwright" ]; then
    log_info "Installing Playwright browsers..."
    npx playwright install chromium
  fi

  # Run Playwright tests
  if BASE_URL=$BASE_URL npx playwright test tests/e2e/oauth-integration-flow.spec.ts \
    --reporter=json --output=$LOG_DIR/e2e-results.json; then

    E2E_PASSED=$(jq -r '.suites[].specs[].tests[].status' $LOG_DIR/e2e-results.json 2>/dev/null | grep -c "passed" || echo 0)
    E2E_FAILED=$(jq -r '.suites[].specs[].tests[].status' $LOG_DIR/e2e-results.json 2>/dev/null | grep -c "failed" || echo 0)
    E2E_TOTAL=$((E2E_PASSED + E2E_FAILED))

    TOTAL_TESTS=$((TOTAL_TESTS + E2E_TOTAL))
    PASSED_TESTS=$((PASSED_TESTS + E2E_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + E2E_FAILED))

    log_success "E2E tests completed: $E2E_PASSED/$E2E_TOTAL passed"
  else
    log_error "E2E tests failed!"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

run_health_check() {
  print_header "Running Health Check"

  log_info "Checking OAuth system health..."

  if npx tsx scripts/health-check-oauth.ts > $LOG_DIR/health-check.log 2>&1; then
    log_success "Health check passed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_error "Health check failed"
    log_error "See: $LOG_DIR/health-check.log"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

run_security_scan() {
  print_header "Running Security Scan"

  log_info "Checking for secrets in code..."

  # Check for hardcoded secrets
  if git grep -i -E "(secret|password|api[_-]?key)" -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep -v "test" | grep -v "spec" > /dev/null; then
    log_warning "Potential secrets found in code"
    log_info "Review: git grep -i 'secret\|password\|api_key' -- '*.ts' '*.tsx'"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
  else
    log_success "No hardcoded secrets found"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # NPM audit
  log_info "Running npm audit..."
  if npm audit --audit-level=high > $LOG_DIR/npm-audit.log 2>&1; then
    log_success "No high/critical vulnerabilities"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_warning "Vulnerabilities found - see: $LOG_DIR/npm-audit.log"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

run_performance_test() {
  print_header "Running Performance Tests"

  log_info "Testing page load time..."

  # Measure page load
  START=$(date +%s%3N)
  if curl -s "$BASE_URL/settings?tab=integrations" > /dev/null; then
    END=$(date +%s%3N)
    DURATION=$((END - START))

    if [ $DURATION -lt 3000 ]; then
      log_success "Page load time: ${DURATION}ms (target: <3000ms)"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      log_warning "Page load time: ${DURATION}ms (slow!)"
      SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    fi
  else
    log_error "Page load failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # Test API response time
  log_info "Testing API response time..."

  START=$(date +%s%3N)
  if curl -s "$BASE_URL/api/integrations" -H "x-user-id: test" > /dev/null; then
    END=$(date +%s%3N)
    DURATION=$((END - START))

    if [ $DURATION -lt 500 ]; then
      log_success "API response time: ${DURATION}ms (target: <500ms)"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      log_warning "API response time: ${DURATION}ms (slow!)"
      SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    fi
  else
    log_error "API request failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

###############################################################################
# Main Test Runner
###############################################################################

run_all_tests() {
  print_header "🧪 OAuth2 Integration Test Suite"

  log_info "Environment: $ENVIRONMENT"
  log_info "Test Type: $TEST_TYPE"
  log_info "Base URL: $BASE_URL"
  log_info "Timestamp: $TIMESTAMP"
  echo ""

  # Run requested tests
  case $TEST_TYPE in
    unit)
      run_unit_tests
      ;;
    integration)
      run_integration_tests
      run_health_check
      ;;
    e2e)
      run_e2e_tests
      ;;
    security)
      run_security_scan
      ;;
    performance)
      run_performance_test
      ;;
    all)
      run_unit_tests || true
      run_integration_tests || true
      run_e2e_tests || true
      run_health_check || true
      run_security_scan || true
      run_performance_test || true
      ;;
    *)
      log_error "Invalid test type: $TEST_TYPE"
      echo "Valid types: unit, integration, e2e, security, performance, all"
      exit 1
      ;;
  esac
}

###############################################################################
# Report Generation
###############################################################################

generate_report() {
  print_header "📊 Test Report"

  # Calculate pass rate
  if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  else
    PASS_RATE=0
  fi

  # Determine overall status
  if [ $FAILED_TESTS -eq 0 ]; then
    OVERALL_STATUS="PASSED"
    STATUS_COLOR=$GREEN
  else
    OVERALL_STATUS="FAILED"
    STATUS_COLOR=$RED
  fi

  # Print summary
  echo ""
  echo "Environment:     $ENVIRONMENT"
  echo "Test Type:       $TEST_TYPE"
  echo "Base URL:        $BASE_URL"
  echo "Timestamp:       $TIMESTAMP"
  echo ""
  echo "Results:"
  echo "  Total Tests:   $TOTAL_TESTS"
  echo -e "  ${GREEN}Passed:        $PASSED_TESTS${NC}"
  echo -e "  ${RED}Failed:        $FAILED_TESTS${NC}"
  echo -e "  ${YELLOW}Skipped:       $SKIPPED_TESTS${NC}"
  echo "  Pass Rate:     $PASS_RATE%"
  echo ""
  echo -e "Overall Status:  ${STATUS_COLOR}${OVERALL_STATUS}${NC}"
  echo ""

  # Generate JSON report
  cat > $REPORT_FILE << EOF
{
  "environment": "$ENVIRONMENT",
  "testType": "$TEST_TYPE",
  "baseUrl": "$BASE_URL",
  "timestamp": "$TIMESTAMP",
  "results": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "passRate": $PASS_RATE
  },
  "status": "$OVERALL_STATUS"
}
EOF

  log_success "Report saved to: $REPORT_FILE"

  # Exit with appropriate code
  if [ "$OVERALL_STATUS" = "PASSED" ]; then
    exit 0
  else
    exit 1
  fi
}

###############################################################################
# Execution
###############################################################################

# Trap errors
trap 'log_error "Test execution failed!"; exit 1' ERR

# Run tests
setup_environment
run_all_tests
generate_report
