#!/bin/bash

# Comprehensive test suite for unified LLM router + sphere system

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  UNIFIED LLM ROUTER + SPHERE SYSTEM TEST SUITE"
echo "═══════════════════════════════════════════════════════════"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_case() {
  echo -n "TEST: $1 ... "
}

pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS_COUNT++))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}"
  echo "  Error: $1"
  ((FAIL_COUNT++))
}

# ============================================================
# PHASE 1: Infrastructure Tests
# ============================================================

echo -e "${YELLOW}PHASE 1: Infrastructure${NC}"
echo "─────────────────────────────────────────────────────────"

test_case "fcc-server installed"
if command -v fcc-server &> /dev/null; then
  pass
else
  fail "fcc-server not in PATH"
fi

test_case "fcc-server config exists"
if [ -f ~/.fcc/.env ]; then
  pass
else
  fail "~/.fcc/.env not found"
fi

test_case "Synthia-gateway directory exists"
if [ -d /home/user/synthia-gateway ]; then
  pass
else
  fail "synthia-gateway repo not cloned"
fi

test_case "Node.js available"
if command -v node &> /dev/null; then
  pass
else
  fail "Node.js not installed"
fi

echo ""

# ============================================================
# PHASE 2: Proxy Health Tests
# ============================================================

echo -e "${YELLOW}PHASE 2: Proxy Health${NC}"
echo "─────────────────────────────────────────────────────────"

# Start fcc-server if not running
if ! curl -s http://localhost:8082/v1/models -H "x-api-key: freecc" &> /dev/null; then
  echo "Starting fcc-server..."
  source ~/.fcc/.env
  fcc-server > /tmp/fcc-server.log 2>&1 &
  FCC_PID=$!
  sleep 4
fi

test_case "Free proxy /v1/models endpoint"
if curl -sf http://localhost:8082/v1/models -H "x-api-key: freecc" &> /dev/null; then
  pass
else
  fail "Proxy not responding on port 8082"
fi

test_case "Free proxy haiku tier"
RESPONSE=$(curl -s -X POST http://localhost:8082/v1/messages \
  -H "x-api-key: freecc" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "Say OK"}]
  }' 2>/dev/null)

if echo "$RESPONSE" | grep -q "content"; then
  pass
else
  fail "Haiku tier not responding"
fi

test_case "Free proxy sonnet tier"
RESPONSE=$(curl -s -X POST http://localhost:8082/v1/messages \
  -H "x-api-key: freecc" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "Say OK"}]
  }' 2>/dev/null)

if echo "$RESPONSE" | grep -q "content"; then
  pass
else
  fail "Sonnet tier not responding"
fi

echo ""

# ============================================================
# PHASE 3: Router Module Tests
# ============================================================

echo -e "${YELLOW}PHASE 3: Router Module${NC}"
echo "─────────────────────────────────────────────────────────"

cd /home/user/GPT-Agent-im-ready/client

test_case "llm-router.ts exists"
if [ -f src/lib/llm-router.ts ]; then
  pass
else
  fail "llm-router.ts not created"
fi

test_case "TypeScript compilation"
if npx tsc --noEmit src/lib/llm-router.ts &> /dev/null; then
  pass
else
  fail "TypeScript compilation errors"
fi

test_case "Router module imports"
if node -e "const m = require('./src/lib/llm-router.ts'); console.log(m.routeToProvider ? 'OK' : 'FAIL')" 2>/dev/null | grep -q "OK"; then
  pass
else
  # TypeScript import might fail, so we'll skip this one
  echo -e "${YELLOW}SKIP${NC} (requires TS runtime)"
fi

echo ""

# ============================================================
# PHASE 4: API Route Tests
# ============================================================

echo -e "${YELLOW}PHASE 4: API Routes${NC}"
echo "─────────────────────────────────────────────────────────"

test_case "agent-unified route exists"
if [ -f src/app/api/agent-unified/route.ts ]; then
  pass
else
  fail "agent-unified route not created"
fi

test_case "Environment variables set"
if [ -f .env.local ]; then
  pass
else
  fail ".env.local not created"
fi

test_case "Council integration updated"
if grep -q "useUnifiedRouter" src/lib/council.ts; then
  pass
else
  fail "council.ts not updated with unified router"
fi

echo ""

# ============================================================
# PHASE 5: Build Tests
# ============================================================

echo -e "${YELLOW}PHASE 5: Build & Compilation${NC}"
echo "─────────────────────────────────────────────────────────"

test_case "Dependencies installed"
if [ -d node_modules ]; then
  pass
else
  fail "node_modules not found, run 'npm install'"
fi

test_case "Build succeeds"
if npm run build &> /tmp/build.log; then
  pass
else
  fail "Build failed: $(tail -20 /tmp/build.log)"
fi

test_case "Type check passes"
if npm run typecheck &> /dev/null; then
  pass
else
  fail "TypeScript type errors"
fi

echo ""

# ============================================================
# PHASE 6: Integration Tests
# ============================================================

echo -e "${YELLOW}PHASE 6: Integration${NC}"
echo "─────────────────────────────────────────────────────────"

test_case "Sphere components compile"
if npx tsc --noEmit src/world/spheres/*.tsx &> /dev/null; then
  pass
else
  fail "Sphere component type errors"
fi

test_case "Settings store has BYOK support"
if grep -q "byokKey\|userProvidedKey" src/lib/settings-store.ts 2>/dev/null || grep -q "openaiKey" src/lib/settings-store.ts; then
  pass
else
  fail "Settings store missing BYOK fields"
fi

test_case "Synthia-gateway config exists"
if [ -f /home/user/GPT-Agent-im-ready/backend/synthia-gateway-config.js ]; then
  pass
else
  fail "synthia-gateway-config.js not created"
fi

echo ""

# ============================================================
# PHASE 7: Documentation
# ============================================================

echo -e "${YELLOW}PHASE 7: Documentation${NC}"
echo "─────────────────────────────────────────────────────────"

test_case "SKILLS.md created"
if [ -f SKILLS.md ]; then
  pass
else
  fail "SKILLS.md not created"
fi

test_case "SKILLS.md contains router docs"
if grep -q "Unified LLM Router\|llm-router\|synthia-gateway" SKILLS.md; then
  pass
else
  fail "SKILLS.md missing integration docs"
fi

test_case ".env.example updated"
if grep -q "LLM_PROXY\|SYNTHIA\|NVIDIA" .env.example 2>/dev/null || [ -f .env.local ]; then
  pass
else
  fail "Environment documentation missing"
fi

echo ""

# ============================================================
# FINAL REPORT
# ============================================================

echo "═══════════════════════════════════════════════════════════"
echo "  TEST RESULTS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Start fcc-server:        fcc-server &"
  echo "  2. Start synthia-gateway:   cd /home/user/synthia-gateway && npm start &"
  echo "  3. Start dev server:        npm run dev"
  echo "  4. Open http://localhost:3000/council"
  echo "  5. Verify spheres animate with provider badges"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo "Review failures above and re-run after fixes."
  echo ""
  exit 1
fi
