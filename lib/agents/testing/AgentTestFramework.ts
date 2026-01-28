/**
 * PHASE 76-80: Agent Testing Framework
 * Comprehensive testing utilities for all agents
 */

import { AgentContext, AgentResponse, ToolResult } from '../shared/types';
import { BaseAgent, agentRegistry } from '../base/BaseAgent';
import { DexterCapabilities } from '../dexter';
import { CassieCapabilities } from '../cassie';
import { AuraCapabilities } from '../aura';

// ============================================
// TEST TYPES
// ============================================

export interface TestCase {
  id: string;
  name: string;
  description: string;
  agentId: string;
  toolName?: string;
  input: Record<string, unknown>;
  expectedResult?: {
    success?: boolean;
    hasData?: boolean;
    dataContains?: Record<string, unknown>;
    errorContains?: string;
  };
  timeout?: number;
}

export interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  duration: number;
  result?: ToolResult;
  error?: string;
  assertions: AssertionResult[];
}

export interface AssertionResult {
  assertion: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  timestamp: Date;
}

// ============================================
// TEST CONTEXT FACTORY
// ============================================

export function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    userId: 'test-user',
    workspaceId: 'test-workspace',
    sessionId: `test-session-${Date.now()}`,
    permissions: ['read', 'write', 'execute', 'admin'],
    integrations: {},
    metadata: {
      isTest: true,
      timestamp: new Date(),
    },
    ...overrides,
  };
}

// ============================================
// AGENT TEST RUNNER
// ============================================

export class AgentTestRunner {
  private results: TestResult[] = [];

  /**
   * Run a single test case
   */
  public async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const assertions: AssertionResult[] = [];
    let toolResult: ToolResult | undefined;
    let error: string | undefined;

    try {
      const agent = agentRegistry.get(testCase.agentId);
      if (!agent) {
        throw new Error(`Agent '${testCase.agentId}' not found`);
      }

      const context = createTestContext();

      if (testCase.toolName) {
        // Test specific tool
        toolResult = await agent.executeTool(testCase.toolName, testCase.input, context);
      } else {
        // Test chat interface
        const response = await agent.handleChat(
          testCase.input.message as string || JSON.stringify(testCase.input),
          context
        );
        toolResult = {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      }

      // Run assertions
      if (testCase.expectedResult) {
        if (testCase.expectedResult.success !== undefined) {
          assertions.push(this.assertSuccess(toolResult, testCase.expectedResult.success));
        }

        if (testCase.expectedResult.hasData !== undefined) {
          assertions.push(this.assertHasData(toolResult, testCase.expectedResult.hasData));
        }

        if (testCase.expectedResult.dataContains) {
          assertions.push(this.assertDataContains(toolResult, testCase.expectedResult.dataContains));
        }

        if (testCase.expectedResult.errorContains) {
          assertions.push(this.assertErrorContains(toolResult, testCase.expectedResult.errorContains));
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      assertions.push({
        assertion: 'execution',
        passed: false,
        message: `Test execution failed: ${error}`,
      });
    }

    const result: TestResult = {
      testId: testCase.id,
      name: testCase.name,
      passed: assertions.every((a) => a.passed) && !error,
      duration: Date.now() - startTime,
      result: toolResult,
      error,
      assertions,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run multiple test cases
   */
  public async runTests(testCases: TestCase[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    this.results = [];

    for (const testCase of testCases) {
      await this.runTest(testCase);
    }

    return {
      suiteName: 'Agent Test Suite',
      totalTests: testCases.length,
      passed: this.results.filter((r) => r.passed).length,
      failed: this.results.filter((r) => !r.passed).length,
      duration: Date.now() - startTime,
      results: this.results,
      timestamp: new Date(),
    };
  }

  /**
   * Run all agent tests
   */
  public async runAllAgentTests(): Promise<TestSuiteResult> {
    const allTests = [
      ...this.getDexterTests(),
      ...this.getCassieTests(),
      ...this.getAuraTests(),
    ];

    return this.runTests(allTests);
  }

  // ============================================
  // ASSERTION HELPERS
  // ============================================

  private assertSuccess(result: ToolResult, expected: boolean): AssertionResult {
    return {
      assertion: 'success',
      passed: result.success === expected,
      expected,
      actual: result.success,
      message: result.success === expected
        ? `Success is ${expected}`
        : `Expected success=${expected}, got ${result.success}`,
    };
  }

  private assertHasData(result: ToolResult, expected: boolean): AssertionResult {
    const hasData = result.data !== undefined && result.data !== null;
    return {
      assertion: 'hasData',
      passed: hasData === expected,
      expected,
      actual: hasData,
      message: hasData === expected
        ? `Has data: ${expected}`
        : `Expected hasData=${expected}, got ${hasData}`,
    };
  }

  private assertDataContains(result: ToolResult, expected: Record<string, unknown>): AssertionResult {
    if (!result.data || typeof result.data !== 'object') {
      return {
        assertion: 'dataContains',
        passed: false,
        expected,
        actual: result.data,
        message: 'Result data is not an object',
      };
    }

    const data = result.data as Record<string, unknown>;
    const missingKeys: string[] = [];

    for (const [key, value] of Object.entries(expected)) {
      if (!(key in data)) {
        missingKeys.push(key);
      } else if (value !== undefined && data[key] !== value) {
        missingKeys.push(`${key} (expected ${value}, got ${data[key]})`);
      }
    }

    return {
      assertion: 'dataContains',
      passed: missingKeys.length === 0,
      expected,
      actual: data,
      message: missingKeys.length === 0
        ? 'Data contains expected keys'
        : `Missing or mismatched keys: ${missingKeys.join(', ')}`,
    };
  }

  private assertErrorContains(result: ToolResult, expected: string): AssertionResult {
    const hasError = result.error?.toLowerCase().includes(expected.toLowerCase());
    return {
      assertion: 'errorContains',
      passed: !!hasError,
      expected,
      actual: result.error,
      message: hasError
        ? `Error contains "${expected}"`
        : `Error does not contain "${expected}"`,
    };
  }

  // ============================================
  // PREDEFINED TESTS
  // ============================================

  private getDexterTests(): TestCase[] {
    return [
      {
        id: 'dexter-chat-basic',
        name: 'Dexter Chat Basic Response',
        description: 'Test basic chat response from Dexter',
        agentId: 'dexter',
        input: { message: 'What can you help me with?' },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'dexter-tool-revenue',
        name: 'Dexter Revenue Analysis Tool',
        description: 'Test revenue analysis tool',
        agentId: 'dexter',
        toolName: 'analyze_revenue',
        input: {
          workspaceId: 'test-workspace',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'dexter-tool-forecast',
        name: 'Dexter Forecast Tool',
        description: 'Test forecasting tool',
        agentId: 'dexter',
        toolName: 'forecast_financials',
        input: {
          workspaceId: 'test-workspace',
          metric: 'revenue',
          periods: 6,
        },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'dexter-tool-pnl',
        name: 'Dexter P&L Report Tool',
        description: 'Test P&L report generation',
        agentId: 'dexter',
        toolName: 'generate_pnl_report',
        input: {
          workspaceId: 'test-workspace',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        expectedResult: { success: true, hasData: true },
      },
    ];
  }

  private getCassieTests(): TestCase[] {
    return [
      {
        id: 'cassie-chat-basic',
        name: 'Cassie Chat Basic Response',
        description: 'Test basic chat response from Cassie',
        agentId: 'cassie',
        input: { message: 'Hello, I need help with my order' },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'cassie-tool-ticket',
        name: 'Cassie Create Ticket Tool',
        description: 'Test ticket creation tool',
        agentId: 'cassie',
        toolName: 'create_ticket',
        input: {
          workspaceId: 'test-workspace',
          customerId: 'test-customer',
          subject: 'Test ticket',
          description: 'This is a test ticket',
          priority: 'medium',
          channel: 'test',
        },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'cassie-tool-sentiment',
        name: 'Cassie Sentiment Analysis Tool',
        description: 'Test sentiment analysis',
        agentId: 'cassie',
        toolName: 'analyze_sentiment',
        input: {
          text: 'I am very frustrated with the service!',
        },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'cassie-tool-response',
        name: 'Cassie Suggest Response Tool',
        description: 'Test response suggestion',
        agentId: 'cassie',
        toolName: 'suggest_response',
        input: {
          workspaceId: 'test-workspace',
          customerId: 'test-customer',
          issue: 'Cannot login to my account',
          category: 'technical',
        },
        expectedResult: { success: true, hasData: true },
      },
    ];
  }

  private getAuraTests(): TestCase[] {
    return [
      {
        id: 'aura-chat-basic',
        name: 'Aura Chat Basic Response',
        description: 'Test basic chat response from Aura',
        agentId: 'aura',
        input: { message: 'How can I automate my workflows?' },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'aura-tool-workflow',
        name: 'Aura Create Workflow Tool',
        description: 'Test workflow creation',
        agentId: 'aura',
        toolName: 'create_workflow',
        input: {
          name: 'Test Workflow',
          description: 'A test workflow',
          trigger: { type: 'manual', config: {} },
          steps: [
            { id: 'step-1', name: 'Step 1', type: 'action', config: {} },
          ],
        },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'aura-tool-rule',
        name: 'Aura Create Automation Rule Tool',
        description: 'Test automation rule creation',
        agentId: 'aura',
        toolName: 'create_automation_rule',
        input: {
          name: 'Test Rule',
          trigger: { type: 'event', conditions: [] },
          actions: [{ type: 'send_notification', config: {} }],
        },
        expectedResult: { success: true, hasData: true },
      },
      {
        id: 'aura-tool-schedule',
        name: 'Aura Schedule Task Tool',
        description: 'Test task scheduling',
        agentId: 'aura',
        toolName: 'schedule_task',
        input: {
          taskType: 'notification',
          schedule: '0 9 * * *',
          payload: { message: 'Test notification' },
        },
        expectedResult: { success: true, hasData: true },
      },
    ];
  }
}

// ============================================
// INTEGRATION TESTS
// ============================================

export class IntegrationTestRunner {
  /**
   * Test cross-agent communication
   */
  public async testCrossAgentCommunication(): Promise<TestResult> {
    const startTime = Date.now();
    const assertions: AssertionResult[] = [];

    try {
      // Test: Dexter analyzes data, Cassie responds to customer, Aura automates
      const context = createTestContext();

      // Step 1: Dexter provides financial insights
      const dexterAgent = agentRegistry.get('dexter');
      if (!dexterAgent) throw new Error('Dexter agent not found');

      const dexterResult = await dexterAgent.executeTool('analyze_revenue', {
        workspaceId: 'test-workspace',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }, context);

      assertions.push({
        assertion: 'Dexter analysis',
        passed: dexterResult.success,
        actual: dexterResult.success,
        message: dexterResult.success ? 'Dexter analysis successful' : `Dexter failed: ${dexterResult.error}`,
      });

      // Step 2: Cassie generates response
      const cassieAgent = agentRegistry.get('cassie');
      if (!cassieAgent) throw new Error('Cassie agent not found');

      const cassieResult = await cassieAgent.executeTool('suggest_response', {
        workspaceId: 'test-workspace',
        customerId: 'test-customer',
        issue: 'I want to know about our financial performance',
        category: 'general',
      }, context);

      assertions.push({
        assertion: 'Cassie response',
        passed: cassieResult.success,
        actual: cassieResult.success,
        message: cassieResult.success ? 'Cassie response generated' : `Cassie failed: ${cassieResult.error}`,
      });

      // Step 3: Aura creates automation
      const auraAgent = agentRegistry.get('aura');
      if (!auraAgent) throw new Error('Aura agent not found');

      const auraResult = await auraAgent.executeTool('create_automation_rule', {
        name: 'Financial Report Automation',
        trigger: { type: 'schedule', conditions: [] },
        actions: [{ type: 'trigger_workflow', config: { workflowId: 'test' } }],
      }, context);

      assertions.push({
        assertion: 'Aura automation',
        passed: auraResult.success,
        actual: auraResult.success,
        message: auraResult.success ? 'Aura automation created' : `Aura failed: ${auraResult.error}`,
      });

    } catch (err) {
      assertions.push({
        assertion: 'execution',
        passed: false,
        message: `Integration test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    return {
      testId: 'integration-cross-agent',
      name: 'Cross-Agent Communication Test',
      passed: assertions.every((a) => a.passed),
      duration: Date.now() - startTime,
      assertions,
    };
  }

  /**
   * Test capability aggregation
   */
  public async testCapabilityAggregation(): Promise<TestResult> {
    const startTime = Date.now();
    const assertions: AssertionResult[] = [];

    try {
      // Test DexterCapabilities
      assertions.push({
        assertion: 'DexterCapabilities available',
        passed: !!DexterCapabilities,
        message: DexterCapabilities ? 'DexterCapabilities available' : 'DexterCapabilities not found',
      });

      // Test CassieCapabilities
      assertions.push({
        assertion: 'CassieCapabilities available',
        passed: !!CassieCapabilities,
        message: CassieCapabilities ? 'CassieCapabilities available' : 'CassieCapabilities not found',
      });

      // Test AuraCapabilities
      assertions.push({
        assertion: 'AuraCapabilities available',
        passed: !!AuraCapabilities,
        message: AuraCapabilities ? 'AuraCapabilities available' : 'AuraCapabilities not found',
      });

      // Test unified dashboard
      const dashboard = await AuraCapabilities.getAutomationDashboard('test-workspace');
      assertions.push({
        assertion: 'Unified dashboard',
        passed: !!dashboard,
        actual: !!dashboard,
        message: dashboard ? 'Dashboard retrieved' : 'Dashboard retrieval failed',
      });

    } catch (err) {
      assertions.push({
        assertion: 'execution',
        passed: false,
        message: `Capability test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    return {
      testId: 'integration-capabilities',
      name: 'Capability Aggregation Test',
      passed: assertions.every((a) => a.passed),
      duration: Date.now() - startTime,
      assertions,
    };
  }

  /**
   * Run all integration tests
   */
  public async runAll(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    results.push(await this.testCrossAgentCommunication());
    results.push(await this.testCapabilityAggregation());

    return {
      suiteName: 'Integration Test Suite',
      totalTests: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      duration: Date.now() - startTime,
      results,
      timestamp: new Date(),
    };
  }
}

// ============================================
// PERFORMANCE TESTS
// ============================================

export class PerformanceTestRunner {
  /**
   * Test agent response times
   */
  public async testResponseTimes(iterations: number = 10): Promise<{
    agentId: string;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
  }[]> {
    const results: Array<{
      agentId: string;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      p95ResponseTime: number;
    }> = [];

    const agents = Array.from(agentRegistry.keys());
    const context = createTestContext();

    for (const agentId of agents) {
      const agent = agentRegistry.get(agentId);
      if (!agent) continue;

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await agent.handleChat('Hello, what can you do?', context);
        times.push(Date.now() - startTime);
      }

      times.sort((a, b) => a - b);

      results.push({
        agentId,
        avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
        minResponseTime: times[0],
        maxResponseTime: times[times.length - 1],
        p95ResponseTime: times[Math.floor(times.length * 0.95)],
      });
    }

    return results;
  }

  /**
   * Test concurrent requests
   */
  public async testConcurrency(concurrentRequests: number = 5): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalDuration: number;
    avgDuration: number;
  }> {
    const context = createTestContext();
    const agents = Array.from(agentRegistry.values());

    const startTime = Date.now();
    const promises: Promise<AgentResponse<string>>[] = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const agent = agents[i % agents.length];
      promises.push(agent.handleChat('Test concurrent request', context));
    }

    const results = await Promise.allSettled(promises);
    const totalDuration = Date.now() - startTime;

    const successfulRequests = results.filter((r) => r.status === 'fulfilled').length;
    const failedRequests = results.filter((r) => r.status === 'rejected').length;

    return {
      totalRequests: concurrentRequests,
      successfulRequests,
      failedRequests,
      totalDuration,
      avgDuration: totalDuration / concurrentRequests,
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export const agentTestRunner = new AgentTestRunner();
export const integrationTestRunner = new IntegrationTestRunner();
export const performanceTestRunner = new PerformanceTestRunner();

/**
 * Run all tests
 */
export async function runAllTests(): Promise<{
  unit: TestSuiteResult;
  integration: TestSuiteResult;
  performance: {
    responseTimes: Array<{
      agentId: string;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      p95ResponseTime: number;
    }>;
    concurrency: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      totalDuration: number;
      avgDuration: number;
    };
  };
}> {
  console.log('[TEST] Starting all agent tests...');

  const unitResults = await agentTestRunner.runAllAgentTests();
  console.log(`[TEST] Unit tests: ${unitResults.passed}/${unitResults.totalTests} passed`);

  const integrationResults = await integrationTestRunner.runAll();
  console.log(`[TEST] Integration tests: ${integrationResults.passed}/${integrationResults.totalTests} passed`);

  const responseTimes = await performanceTestRunner.testResponseTimes(5);
  const concurrency = await performanceTestRunner.testConcurrency(3);
  console.log(`[TEST] Performance tests completed`);

  return {
    unit: unitResults,
    integration: integrationResults,
    performance: {
      responseTimes,
      concurrency,
    },
  };
}
