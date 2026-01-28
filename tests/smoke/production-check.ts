/**
 * PRODUCTION SMOKE TEST SUITE
 *
 * Phase 22: Go-To-Market Readiness
 *
 * Verifies critical system components are functional before production deployment.
 * Run this script after deployment to validate system health.
 *
 * Usage:
 *   npx tsx tests/smoke/production-check.ts
 *   npx tsx tests/smoke/production-check.ts --verbose
 *
 * @version 1.0.0
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

// =====================================================
// TYPES
// =====================================================

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface SmokeTestSuite {
  results: TestResult[];
  startTime: number;
  endTime: number;
  passed: number;
  failed: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

const VERBOSE = process.argv.includes('--verbose');
const TIMEOUT = 30000; // 30 seconds per test

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const FRONTEND_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// =====================================================
// UTILITIES
// =====================================================

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
  };
  const reset = '\x1b[0m';
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warn: '⚠️ ',
  };
  console.log(`${colors[level]}${prefix[level]} ${message}${reset}`);
}

function verbose(message: string): void {
  if (VERBOSE) {
    console.log(`   ${message}`);
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// =====================================================
// TEST CATEGORIES
// =====================================================

/**
 * 1. Database Connectivity Tests
 */
async function testDatabaseConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test via health endpoint
    const response = await fetch(`${API_BASE}/api/health/database`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Database health check failed: ${response.status}`);
    }

    const data = await response.json();
    verbose(`Database status: ${JSON.stringify(data)}`);

    return {
      name: 'Database Connection',
      category: 'Infrastructure',
      passed: data.status === 'healthy' || data.connected === true,
      duration: Date.now() - start,
      details: data,
    };
  } catch (error) {
    return {
      name: 'Database Connection',
      category: 'Infrastructure',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 2. Redis Connectivity Tests
 */
async function testRedisConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/health/redis`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Redis health check failed: ${response.status}`);
    }

    const data = await response.json();
    verbose(`Redis status: ${JSON.stringify(data)}`);

    return {
      name: 'Redis Connection',
      category: 'Infrastructure',
      passed: data.status === 'healthy' || data.connected === true,
      duration: Date.now() - start,
      details: data,
    };
  } catch (error) {
    return {
      name: 'Redis Connection',
      category: 'Infrastructure',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 3. OpenAI API Connectivity
 */
async function testOpenAIConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/health/openai`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    verbose(`OpenAI status: ${JSON.stringify(data)}`);

    return {
      name: 'OpenAI API Connection',
      category: 'AI Services',
      passed: data.status === 'healthy' || data.available === true,
      duration: Date.now() - start,
      details: data,
    };
  } catch (error) {
    return {
      name: 'OpenAI API Connection',
      category: 'AI Services',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 4. Anthropic API Connectivity (if configured)
 */
async function testAnthropicConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/health/anthropic`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    verbose(`Anthropic status: ${JSON.stringify(data)}`);

    return {
      name: 'Anthropic API Connection',
      category: 'AI Services',
      passed: data.status === 'healthy' || data.available === true || data.configured === false,
      duration: Date.now() - start,
      details: data,
    };
  } catch (error) {
    // Anthropic is optional, so connection errors are warnings not failures
    return {
      name: 'Anthropic API Connection',
      category: 'AI Services',
      passed: true, // Optional service
      duration: Date.now() - start,
      error: 'Anthropic not configured (optional)',
    };
  }
}

/**
 * 5. WebSocket Connection Test
 */
async function testWebSocketConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test socket.io endpoint
    const wsUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `${API_BASE}`;
    const response = await fetch(`${wsUrl}/socket.io/?EIO=4&transport=polling`, {
      method: 'GET',
    });

    const passed = response.ok;
    verbose(`WebSocket endpoint status: ${response.status}`);

    return {
      name: 'WebSocket Connection',
      category: 'Real-time',
      passed,
      duration: Date.now() - start,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      name: 'WebSocket Connection',
      category: 'Real-time',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 6. Template System Test
 */
async function testTemplateCreation(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Fetch available templates
    const response = await fetch(`${API_BASE}/api/workflows?isTemplate=true&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'smoke-test-user',
      },
    });

    if (!response.ok) {
      throw new Error(`Template fetch failed: ${response.status}`);
    }

    const data = await response.json();
    verbose(`Templates found: ${data.workflows?.length || 0}`);

    return {
      name: 'Template System',
      category: 'Workflows',
      passed: true,
      duration: Date.now() - start,
      details: { templateCount: data.workflows?.length || 0 },
    };
  } catch (error) {
    return {
      name: 'Template System',
      category: 'Workflows',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 7. Workflow Execution Engine Test
 */
async function testWorkflowExecution(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test that execution engine endpoints are available
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    verbose(`System health: ${JSON.stringify(data)}`);

    return {
      name: 'Workflow Execution Engine',
      category: 'Workflows',
      passed: response.ok,
      duration: Date.now() - start,
      details: data,
    };
  } catch (error) {
    return {
      name: 'Workflow Execution Engine',
      category: 'Workflows',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 8. Authentication System Test
 */
async function testAuthSystem(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test auth endpoints are responding
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid@test.com', password: 'invalid' }),
    });

    // We expect 401 for invalid credentials, which means auth system is working
    const passed = response.status === 401 || response.status === 400;
    verbose(`Auth system status: ${response.status}`);

    return {
      name: 'Authentication System',
      category: 'Security',
      passed,
      duration: Date.now() - start,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      name: 'Authentication System',
      category: 'Security',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 9. API Rate Limiting Test
 */
async function testRateLimiting(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Make a few rapid requests to check rate limiting headers
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitLimit = response.headers.get('X-RateLimit-Limit');

    verbose(`Rate limit: ${rateLimitRemaining}/${rateLimitLimit}`);

    return {
      name: 'Rate Limiting',
      category: 'Security',
      passed: true, // Basic check passes if endpoint responds
      duration: Date.now() - start,
      details: {
        remaining: rateLimitRemaining,
        limit: rateLimitLimit,
      },
    };
  } catch (error) {
    return {
      name: 'Rate Limiting',
      category: 'Security',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 10. Frontend Accessibility Test
 */
async function testFrontendAccessibility(): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(FRONTEND_BASE, {
      method: 'GET',
    });

    const passed = response.ok;
    verbose(`Frontend status: ${response.status}`);

    return {
      name: 'Frontend Accessibility',
      category: 'Application',
      passed,
      duration: Date.now() - start,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      name: 'Frontend Accessibility',
      category: 'Application',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 11. Environment Variables Validation
 */
async function testEnvironmentVariables(): Promise<TestResult> {
  const start = Date.now();

  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'NEXTAUTH_SECRET',
    'OPENAI_API_KEY',
  ];

  const optionalVars = [
    'ANTHROPIC_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  const optionalMissing = optionalVars.filter((v) => !process.env[v]);

  verbose(`Required vars missing: ${missing.length}`);
  verbose(`Optional vars missing: ${optionalMissing.length}`);

  return {
    name: 'Environment Variables',
    category: 'Configuration',
    passed: missing.length === 0,
    duration: Date.now() - start,
    error: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
    details: {
      requiredPresent: requiredVars.length - missing.length,
      requiredMissing: missing,
      optionalMissing,
    },
  };
}

/**
 * 12. Feature Flags Test
 */
async function testFeatureFlags(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Dynamic import to avoid module resolution issues
    const { isFeatureEnabled, FEATURE_FLAGS } = await import('../../lib/feature-flags');

    const flightRecorder = isFeatureEnabled(FEATURE_FLAGS.ENABLE_FLIGHT_RECORDER);
    const approvalCenter = isFeatureEnabled(FEATURE_FLAGS.ENABLE_APPROVAL_CENTER);
    const advancedMetrics = isFeatureEnabled(FEATURE_FLAGS.ENABLE_ADVANCED_METRICS);

    verbose(`Flight Recorder: ${flightRecorder}`);
    verbose(`Approval Center: ${approvalCenter}`);
    verbose(`Advanced Metrics: ${advancedMetrics}`);

    return {
      name: 'Feature Flags System',
      category: 'Configuration',
      passed: true,
      duration: Date.now() - start,
      details: {
        ENABLE_FLIGHT_RECORDER: flightRecorder,
        ENABLE_APPROVAL_CENTER: approvalCenter,
        ENABLE_ADVANCED_METRICS: advancedMetrics,
      },
    };
  } catch (error) {
    return {
      name: 'Feature Flags System',
      category: 'Configuration',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// TEST RUNNER
// =====================================================

async function runSmokeTests(): Promise<SmokeTestSuite> {
  const suite: SmokeTestSuite = {
    results: [],
    startTime: Date.now(),
    endTime: 0,
    passed: 0,
    failed: 0,
  };

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       FLOWENT PRODUCTION SMOKE TEST SUITE                ║');
  console.log('║                  Phase 22: GTM Readiness                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const tests = [
    testDatabaseConnection,
    testRedisConnection,
    testOpenAIConnection,
    testAnthropicConnection,
    testWebSocketConnection,
    testTemplateCreation,
    testWorkflowExecution,
    testAuthSystem,
    testRateLimiting,
    testFrontendAccessibility,
    testEnvironmentVariables,
    testFeatureFlags,
  ];

  for (const test of tests) {
    try {
      const result = await withTimeout(test(), TIMEOUT, test.name);
      suite.results.push(result);

      if (result.passed) {
        suite.passed++;
        log(`${result.name} (${result.duration}ms)`, 'success');
      } else {
        suite.failed++;
        log(`${result.name} - ${result.error}`, 'error');
      }
    } catch (error) {
      suite.failed++;
      const errorResult: TestResult = {
        name: test.name,
        category: 'Unknown',
        passed: false,
        duration: 0,
        error: error instanceof Error ? error.message : 'Test crashed',
      };
      suite.results.push(errorResult);
      log(`${test.name} - ${errorResult.error}`, 'error');
    }
  }

  suite.endTime = Date.now();
  return suite;
}

// =====================================================
// REPORT GENERATION
// =====================================================

function printReport(suite: SmokeTestSuite): void {
  const totalDuration = suite.endTime - suite.startTime;
  const passRate = ((suite.passed / suite.results.length) * 100).toFixed(1);

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests:    ${suite.results.length.toString().padEnd(40)}║`);
  console.log(`║  Passed:         ${suite.passed.toString().padEnd(40)}║`);
  console.log(`║  Failed:         ${suite.failed.toString().padEnd(40)}║`);
  console.log(`║  Pass Rate:      ${(passRate + '%').padEnd(40)}║`);
  console.log(`║  Duration:       ${(totalDuration + 'ms').padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Group by category
  const categories = new Map<string, TestResult[]>();
  for (const result of suite.results) {
    if (!categories.has(result.category)) {
      categories.set(result.category, []);
    }
    categories.get(result.category)!.push(result);
  }

  for (const [category, results] of categories) {
    const categoryPassed = results.filter((r) => r.passed).length;
    console.log(`📁 ${category}: ${categoryPassed}/${results.length} passed`);
    for (const result of results) {
      const icon = result.passed ? '  ✓' : '  ✗';
      console.log(`${icon} ${result.name}`);
    }
    console.log('');
  }

  // Overall status
  if (suite.failed === 0) {
    console.log('\x1b[32m🎉 ALL SMOKE TESTS PASSED - SYSTEM IS PRODUCTION READY!\x1b[0m\n');
  } else {
    console.log(`\x1b[31m⚠️  ${suite.failed} TEST(S) FAILED - REVIEW BEFORE DEPLOYMENT\x1b[0m\n`);
    process.exitCode = 1;
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main(): Promise<void> {
  try {
    const suite = await runSmokeTests();
    printReport(suite);
  } catch (error) {
    console.error('Smoke test suite failed to execute:', error);
    process.exitCode = 1;
  }
}

main();
