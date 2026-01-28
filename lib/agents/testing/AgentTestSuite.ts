/**
 * PHASE 6: Enterprise Agent Test Suite
 * Comprehensive testing framework for Dexter, Cassie, and Aura
 */

import { BaseAgent } from '@/lib/agents/base/BaseAgent';
import { AgentContext, AgentResponse } from '@/lib/agents/shared/types';
import { DexterAgent } from '@/lib/agents/dexter/DexterAgent';
import { CassieAgent } from '@/lib/agents/cassie/CassieAgent';
import { AuraAgent } from '@/lib/agents/aura/AuraAgent';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  agent: 'dexter' | 'cassie' | 'aura';
  type: 'unit' | 'integration' | 'e2e';
  tool?: string;
  input: Record<string, unknown>;
  expectedOutput?: Partial<Record<string, unknown>>;
  assertions?: Array<{
    path: string;
    operator: 'equals' | 'contains' | 'exists' | 'typeof' | 'gt' | 'lt';
    value?: unknown;
  }>;
  timeout?: number;
}

export interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  duration: number;
  agent: string;
  tool?: string;
  error?: string;
  output?: unknown;
  assertions: Array<{
    path: string;
    passed: boolean;
    expected?: unknown;
    actual?: unknown;
  }>;
}

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  coverage: {
    agents: Record<string, { tested: number; total: number }>;
    tools: Record<string, boolean>;
  };
}

/**
 * Enterprise Agent Test Suite
 */
export class AgentTestSuite {
  private agents: Map<string, BaseAgent> = new Map();
  private testCases: TestCase[] = [];
  private context: AgentContext;

  constructor() {
    // Initialize agents
    this.agents.set('dexter', new DexterAgent());
    this.agents.set('cassie', new CassieAgent());
    this.agents.set('aura', new AuraAgent());

    // Default test context
    this.context = {
      userId: 'test-user',
      workspaceId: 'test-workspace',
      sessionId: `test-session-${Date.now()}`,
      permissions: ['read', 'write', 'execute'],
      integrations: {},
    };

    // Register default test cases
    this.registerDefaultTestCases();
  }

  /**
   * Run all tests
   */
  public async runAll(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    console.log('\n==========================================');
    console.log('  ENTERPRISE AGENT TEST SUITE');
    console.log('==========================================\n');

    for (const testCase of this.testCases) {
      const result = await this.runTest(testCase);
      results.push(result);

      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${testCase.agent} | ${testCase.name}`);
      if (!result.passed && result.error) {
        console.log(`       Error: ${result.error}`);
      }
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('\n==========================================');
    console.log(`  RESULTS: ${passed}/${results.length} passed (${failed} failed)`);
    console.log(`  Duration: ${duration}ms`);
    console.log('==========================================\n');

    return {
      total: results.length,
      passed,
      failed,
      skipped: 0,
      duration,
      results,
      coverage: this.calculateCoverage(results),
    };
  }

  /**
   * Run tests for a specific agent
   */
  public async runAgentTests(agentId: string): Promise<TestSuiteResult> {
    const agentTests = this.testCases.filter(t => t.agent === agentId);
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const testCase of agentTests) {
      const result = await this.runTest(testCase);
      results.push(result);
    }

    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: 0,
      duration: Date.now() - startTime,
      results,
      coverage: this.calculateCoverage(results),
    };
  }

  /**
   * Run a single test case
   */
  public async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const agent = this.agents.get(testCase.agent);

    if (!agent) {
      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: false,
        duration: 0,
        agent: testCase.agent,
        tool: testCase.tool,
        error: `Agent ${testCase.agent} not found`,
        assertions: [],
      };
    }

    try {
      let output: unknown;

      if (testCase.tool) {
        // Test specific tool
        const result = await agent.executeTool(testCase.tool, testCase.input, this.context);
        output = result.data;

        if (!result.success) {
          return {
            testId: testCase.id,
            testName: testCase.name,
            passed: false,
            duration: Date.now() - startTime,
            agent: testCase.agent,
            tool: testCase.tool,
            error: result.error?.message || 'Tool execution failed',
            output,
            assertions: [],
          };
        }
      } else {
        // Test chat
        const result = await agent.handleChat(testCase.input.message as string, this.context);
        output = result.data;

        if (!result.success) {
          return {
            testId: testCase.id,
            testName: testCase.name,
            passed: false,
            duration: Date.now() - startTime,
            agent: testCase.agent,
            error: result.error?.message || 'Chat failed',
            output,
            assertions: [],
          };
        }
      }

      // Run assertions
      const assertionResults = this.runAssertions(testCase.assertions || [], output);
      const allPassed = assertionResults.every(a => a.passed);

      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: allPassed,
        duration: Date.now() - startTime,
        agent: testCase.agent,
        tool: testCase.tool,
        output,
        assertions: assertionResults,
        error: allPassed ? undefined : 'One or more assertions failed',
      };
    } catch (error) {
      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: false,
        duration: Date.now() - startTime,
        agent: testCase.agent,
        tool: testCase.tool,
        error: error instanceof Error ? error.message : 'Unknown error',
        assertions: [],
      };
    }
  }

  /**
   * Add a test case
   */
  public addTestCase(testCase: TestCase): void {
    this.testCases.push(testCase);
  }

  /**
   * Run assertions on output
   */
  private runAssertions(
    assertions: TestCase['assertions'],
    output: unknown
  ): TestResult['assertions'] {
    if (!assertions || assertions.length === 0) {
      return [{ path: 'output', passed: output !== undefined, actual: output }];
    }

    return assertions.map(assertion => {
      const actual = this.getValueAtPath(output, assertion.path);

      let passed = false;
      switch (assertion.operator) {
        case 'equals':
          passed = actual === assertion.value;
          break;
        case 'contains':
          passed = String(actual).includes(String(assertion.value));
          break;
        case 'exists':
          passed = actual !== undefined && actual !== null;
          break;
        case 'typeof':
          passed = typeof actual === assertion.value;
          break;
        case 'gt':
          passed = Number(actual) > Number(assertion.value);
          break;
        case 'lt':
          passed = Number(actual) < Number(assertion.value);
          break;
      }

      return {
        path: assertion.path,
        passed,
        expected: assertion.value,
        actual,
      };
    });
  }

  /**
   * Get value at JSON path
   */
  private getValueAtPath(obj: unknown, path: string): unknown {
    if (!path || path === 'output') return obj;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as object)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Calculate test coverage
   */
  private calculateCoverage(results: TestResult[]): TestSuiteResult['coverage'] {
    const coverage: TestSuiteResult['coverage'] = {
      agents: {},
      tools: {},
    };

    // Agent coverage
    for (const [agentId, agent] of this.agents) {
      const agentResults = results.filter(r => r.agent === agentId);
      const tools = agent.getAvailableTools();

      coverage.agents[agentId] = {
        tested: agentResults.length,
        total: tools.length,
      };

      // Tool coverage
      for (const tool of tools) {
        const toolTested = agentResults.some(r => r.tool === tool.name);
        coverage.tools[`${agentId}:${tool.name}`] = toolTested;
      }
    }

    return coverage;
  }

  /**
   * Register default test cases
   */
  private registerDefaultTestCases(): void {
    // ============================================
    // DEXTER TESTS
    // ============================================

    this.testCases.push({
      id: 'dexter-revenue-1',
      name: 'Dexter: Analyze Revenue - Basic',
      description: 'Test basic revenue analysis functionality',
      agent: 'dexter',
      type: 'unit',
      tool: 'analyze_revenue',
      input: {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        granularity: 'monthly',
      },
      assertions: [
        { path: 'summary', operator: 'exists' },
        { path: 'summary.totalRevenue', operator: 'typeof', value: 'number' },
        { path: 'summary.averageGrowth', operator: 'typeof', value: 'number' },
        { path: 'data', operator: 'exists' },
      ],
    });

    this.testCases.push({
      id: 'dexter-forecast-1',
      name: 'Dexter: Forecast Financials',
      description: 'Test financial forecasting',
      agent: 'dexter',
      type: 'unit',
      tool: 'forecast_financials',
      input: {
        metric: 'revenue',
        periods: 6,
        model: 'linear',
        confidenceLevel: 0.95,
      },
      assertions: [
        { path: 'forecasts', operator: 'exists' },
        { path: 'methodology', operator: 'exists' },
        { path: 'assumptions', operator: 'exists' },
      ],
    });

    this.testCases.push({
      id: 'dexter-pnl-1',
      name: 'Dexter: Generate P&L Report',
      description: 'Test P&L report generation',
      agent: 'dexter',
      type: 'unit',
      tool: 'generate_pnl_report',
      input: {
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        compareWithPrevious: true,
      },
      assertions: [
        { path: 'revenue', operator: 'exists' },
        { path: 'grossProfit', operator: 'typeof', value: 'number' },
        { path: 'netIncome', operator: 'typeof', value: 'number' },
        { path: 'netMargin', operator: 'typeof', value: 'number' },
      ],
    });

    this.testCases.push({
      id: 'dexter-roi-1',
      name: 'Dexter: Calculate ROI',
      description: 'Test ROI calculation',
      agent: 'dexter',
      type: 'unit',
      tool: 'calculate_roi',
      input: {
        initialInvestment: 100000,
        cashFlows: [
          { period: 1, amount: 30000 },
          { period: 2, amount: 40000 },
          { period: 3, amount: 50000 },
        ],
        discountRate: 0.1,
        calculateNPV: true,
        calculateIRR: true,
      },
      assertions: [
        { path: 'simpleROI', operator: 'typeof', value: 'number' },
        { path: 'npv', operator: 'exists' },
        { path: 'irr', operator: 'exists' },
        { path: 'paybackPeriod', operator: 'typeof', value: 'number' },
      ],
    });

    // ============================================
    // CASSIE TESTS
    // ============================================

    this.testCases.push({
      id: 'cassie-analyze-1',
      name: 'Cassie: Analyze Sentiment',
      description: 'Test sentiment analysis',
      agent: 'cassie',
      type: 'unit',
      tool: 'analyze_sentiment',
      input: {
        text: 'I am very frustrated with the product. It keeps crashing!',
      },
      assertions: [
        { path: 'sentiment', operator: 'exists' },
        { path: 'score', operator: 'typeof', value: 'number' },
        { path: 'confidence', operator: 'typeof', value: 'number' },
      ],
    });

    this.testCases.push({
      id: 'cassie-kb-1',
      name: 'Cassie: Search Knowledge Base',
      description: 'Test KB search functionality',
      agent: 'cassie',
      type: 'unit',
      tool: 'search_knowledge_base',
      input: {
        query: 'How do I reset my password?',
        limit: 5,
      },
      assertions: [
        { path: 'results', operator: 'exists' },
      ],
    });

    this.testCases.push({
      id: 'cassie-response-1',
      name: 'Cassie: Generate Response',
      description: 'Test response generation',
      agent: 'cassie',
      type: 'unit',
      tool: 'generate_response',
      input: {
        ticketContent: 'I cannot log in to my account',
        customerContext: {
          name: 'John Doe',
          tier: 'premium',
        },
        tone: 'professional',
      },
      assertions: [
        { path: 'response', operator: 'exists' },
        { path: 'suggestedActions', operator: 'exists' },
      ],
    });

    // ============================================
    // AURA TESTS
    // ============================================

    this.testCases.push({
      id: 'aura-workflow-1',
      name: 'Aura: Create Workflow',
      description: 'Test workflow creation',
      agent: 'aura',
      type: 'unit',
      tool: 'create_workflow',
      input: {
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          { id: 'trigger-1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [
          { id: 'edge-1', source: 'trigger-1', target: 'end-1' },
        ],
      },
      assertions: [
        { path: 'id', operator: 'exists' },
        { path: 'name', operator: 'equals', value: 'Test Workflow' },
      ],
    });

    this.testCases.push({
      id: 'aura-rule-1',
      name: 'Aura: Create Automation Rule',
      description: 'Test automation rule creation',
      agent: 'aura',
      type: 'unit',
      tool: 'create_automation_rule',
      input: {
        name: 'Test Rule',
        eventType: 'ticket:created',
        conditions: [
          { field: 'priority', operator: 'equals', value: 'high' },
        ],
        actions: [
          { id: 'action-1', type: 'send_notification', config: { channel: 'slack' }, order: 1 },
        ],
      },
      assertions: [
        { path: 'id', operator: 'exists' },
        { path: 'isActive', operator: 'equals', value: true },
      ],
    });

    this.testCases.push({
      id: 'aura-schedule-1',
      name: 'Aura: Schedule Task',
      description: 'Test task scheduling',
      agent: 'aura',
      type: 'unit',
      tool: 'schedule_task',
      input: {
        name: 'Daily Report',
        frequency: 'daily',
        timeOfDay: '09:00:00',
        taskType: 'workflow',
        workflowId: 'test-workflow-id',
      },
      assertions: [
        { path: 'id', operator: 'exists' },
        { path: 'isActive', operator: 'equals', value: true },
        { path: 'nextRunAt', operator: 'exists' },
      ],
    });

    // ============================================
    // INTEGRATION TESTS
    // ============================================

    this.testCases.push({
      id: 'integration-chat-dexter',
      name: 'Integration: Dexter Chat',
      description: 'Test Dexter chat functionality',
      agent: 'dexter',
      type: 'integration',
      input: {
        message: 'What is our current revenue trend?',
      },
      assertions: [
        { path: 'output', operator: 'exists' },
      ],
    });

    this.testCases.push({
      id: 'integration-chat-cassie',
      name: 'Integration: Cassie Chat',
      description: 'Test Cassie chat functionality',
      agent: 'cassie',
      type: 'integration',
      input: {
        message: 'A customer is having trouble logging in. What should I tell them?',
      },
      assertions: [
        { path: 'output', operator: 'exists' },
      ],
    });

    this.testCases.push({
      id: 'integration-chat-aura',
      name: 'Integration: Aura Chat',
      description: 'Test Aura chat functionality',
      agent: 'aura',
      type: 'integration',
      input: {
        message: 'Create a simple workflow that sends an email when a ticket is created',
      },
      assertions: [
        { path: 'output', operator: 'exists' },
      ],
    });
  }
}

// Export test runner function
export async function runAgentTests(): Promise<TestSuiteResult> {
  const suite = new AgentTestSuite();
  return suite.runAll();
}

// Export for individual agent testing
export async function runDexterTests(): Promise<TestSuiteResult> {
  const suite = new AgentTestSuite();
  return suite.runAgentTests('dexter');
}

export async function runCassieTests(): Promise<TestSuiteResult> {
  const suite = new AgentTestSuite();
  return suite.runAgentTests('cassie');
}

export async function runAuraTests(): Promise<TestSuiteResult> {
  const suite = new AgentTestSuite();
  return suite.runAgentTests('aura');
}
