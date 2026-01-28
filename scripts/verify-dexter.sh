#!/bin/bash

# Dexter Integration Verification Script
# Prüft alle Anforderungen aus der Spezifikation

echo "========================================="
echo "🔍 Dexter Agent Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# Base URL
BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "Testing against: $BASE_URL"
echo ""

# Test 1: Health Check returns gpt-4o-mini
echo "Test 1: Health Check Model Verification"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/agents/dexter/health")
MODEL=$(echo "$HEALTH_RESPONSE" | grep -o '"model":"[^"]*"' | cut -d'"' -f4)

if [ "$MODEL" = "gpt-4o-mini" ]; then
    pass "Health check returns model: gpt-4o-mini"
else
    fail "Health check returns model: $MODEL (expected: gpt-4o-mini)"
fi

# Test 2: Provider is OpenAI
PROVIDER=$(echo "$HEALTH_RESPONSE" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
if [ "$PROVIDER" = "OpenAI" ]; then
    pass "Provider is OpenAI"
else
    fail "Provider is $PROVIDER (expected: OpenAI)"
fi

# Test 3: Status is healthy
STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$STATUS" = "healthy" ]; then
    pass "Status is healthy"
else
    fail "Status is $STATUS (expected: healthy)"
fi

# Test 4: Tools are registered
TOOLS=$(echo "$HEALTH_RESPONSE" | grep -o '"tools":[0-9]*' | cut -d':' -f2)
if [ "$TOOLS" -gt 0 ]; then
    pass "Tools registered: $TOOLS"
else
    fail "No tools registered"
fi

echo ""
echo "Test 2: Chat API Verification"

# Test 5: Chat endpoint responds
CHAT_RESPONSE=$(echo '{"content":"Hello"}' | curl -s -X POST "$BASE_URL/api/agents/dexter/chat" \
    -H "Content-Type: application/json" \
    -d @- | head -n 20)

if echo "$CHAT_RESPONSE" | grep -q "data:"; then
    pass "Chat endpoint returns SSE stream"
else
    fail "Chat endpoint does not return SSE stream"
fi

if echo "$CHAT_RESPONSE" | grep -q '"done":true'; then
    pass "Chat stream completes with done signal"
else
    fail "Chat stream does not send done signal"
fi

echo ""
echo "Test 3: Agent Metadata Verification"

# Test 6: GET /chat returns metadata
METADATA_RESPONSE=$(curl -s "$BASE_URL/api/agents/dexter/chat")
AGENT_STATUS=$(echo "$METADATA_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$AGENT_STATUS" = "active" ]; then
    pass "Agent status is 'active'"
else
    fail "Agent status is '$AGENT_STATUS' (expected: active)"
fi

AGENT_ID=$(echo "$METADATA_RESPONSE" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
if [ "$AGENT_ID" = "dexter" ]; then
    pass "Agent ID is 'dexter'"
else
    fail "Agent ID is '$AGENT_ID' (expected: dexter)"
fi

AGENT_NAME=$(echo "$METADATA_RESPONSE" | grep -o '"name":"[^"]*"' | head -n 1 | cut -d'"' -f4)
if [ "$AGENT_NAME" = "Dexter" ]; then
    pass "Agent name is 'Dexter'"
else
    fail "Agent name is '$AGENT_NAME' (expected: Dexter)"
fi

echo ""
echo "Test 4: Configuration File Verification"

# Test 7: .env.local has correct model
if [ -f ".env.local" ]; then
    if grep -q "OPENAI_MODEL=gpt-4o-mini" .env.local; then
        pass ".env.local contains OPENAI_MODEL=gpt-4o-mini"
    else
        fail ".env.local does not contain OPENAI_MODEL=gpt-4o-mini"
    fi
else
    warn ".env.local file not found (may be in different location)"
fi

# Test 8: Config file has correct fallback
if [ -f "lib/agents/dexter/config.ts" ]; then
    if grep -q "gpt-4o-mini" lib/agents/dexter/config.ts; then
        pass "config.ts contains gpt-4o-mini fallback"
    else
        fail "config.ts does not contain gpt-4o-mini fallback"
    fi
else
    warn "config.ts file not found"
fi

# Test 9: Persona file has correct bio
if [ -f "lib/agents/personas.ts" ]; then
    if grep -q "GPT-4o-mini" lib/agents/personas.ts; then
        pass "personas.ts mentions GPT-4o-mini"
    else
        fail "personas.ts does not mention GPT-4o-mini"
    fi
else
    warn "personas.ts file not found"
fi

echo ""
echo "========================================="
echo "📊 Test Results"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Dexter is correctly configured.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the configuration.${NC}"
    exit 1
fi
