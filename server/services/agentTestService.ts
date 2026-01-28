import { AgentPersona, getAllAgents } from '@/lib/agents/personas';

export interface AgentTestResult {
  agentId: string;
  agentName: string;
  status: 'OK' | 'FAIL';
  latency: number; // milliseconds
  error?: string;
  timestamp: string;
  details?: {
    hasPersona: boolean;
    hasIcon: boolean;
    hasSpecialties: boolean;
    hasValidConfig: boolean;
  };
}

export interface AgentTestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number; // total test duration in ms
  results: AgentTestResult[];
  timestamp: string;
}

/**
 * Test a single agent's core functionality
 */
async function testAgent(agent: AgentPersona): Promise<AgentTestResult> {
  const startTime = Date.now();

  try {
    // Core validation checks
    const details = {
      hasPersona: !!agent.id && !!agent.name && !!agent.role,
      hasIcon: !!agent.icon,
      hasSpecialties: Array.isArray(agent.specialties) && agent.specialties.length > 0,
      hasValidConfig: !!agent.color && !!agent.bio,
    };

    // Check if all core properties are valid
    const allValid = Object.values(details).every(v => v === true);

    // Simulate a basic health check (could be extended to test API endpoints)
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async check

    const latency = Date.now() - startTime;

    if (!allValid) {
      return {
        agentId: agent.id,
        agentName: agent.name,
        status: 'FAIL',
        latency,
        error: `Missing required configuration: ${Object.entries(details)
          .filter(([_, v]) => !v)
          .map(([k]) => k)
          .join(', ')}`,
        timestamp: new Date().toISOString(),
        details,
      };
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      status: 'OK',
      latency,
      timestamp: new Date().toISOString(),
      details,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return {
      agentId: agent.id,
      agentName: agent.name,
      status: 'FAIL',
      latency,
      error: error.message || 'Unknown error during test',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test agent with timeout protection
 */
async function testAgentWithTimeout(
  agent: AgentPersona,
  timeoutMs: number = 2000
): Promise<AgentTestResult> {
  return Promise.race([
    testAgent(agent),
    new Promise<AgentTestResult>((_, reject) =>
      setTimeout(() => reject(new Error('Test timeout')), timeoutMs)
    ),
  ]).catch((error) => ({
    agentId: agent.id,
    agentName: agent.name,
    status: 'FAIL' as const,
    latency: timeoutMs,
    error: error.message || 'Test timeout exceeded',
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Test agent with retry logic
 */
async function testAgentWithRetry(
  agent: AgentPersona,
  maxRetries: number = 2
): Promise<AgentTestResult> {
  let lastResult: AgentTestResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await testAgentWithTimeout(agent);

    // If successful, return immediately
    if (lastResult.status === 'OK') {
      return lastResult;
    }

    // If failed but not last attempt, wait before retry
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  return lastResult!;
}

/**
 * Run parallel agent tests with concurrency limit
 */
async function runParallelTests(
  agents: AgentPersona[],
  concurrencyLimit: number = 5
): Promise<AgentTestResult[]> {
  const results: AgentTestResult[] = [];
  const executing: Promise<void>[] = [];

  for (const agent of agents) {
    const promise = testAgentWithRetry(agent).then(result => {
      results.push(result);
    });

    executing.push(promise);

    // Limit concurrency
    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  // Wait for remaining tests
  await Promise.all(executing);

  return results;
}

/**
 * Main function: Test all agents and return summary
 */
export async function testAllAgents(): Promise<AgentTestSummary> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Get all agents from the system
    const agents = getAllAgents();

    if (agents.length === 0) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        duration: Date.now() - startTime,
        results: [],
        timestamp,
      };
    }

    // Run tests with concurrency limit of 5
    const results = await runParallelTests(agents, 5);

    // Sort results: failed first, then by name
    results.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'FAIL' ? -1 : 1;
      }
      return a.agentName.localeCompare(b.agentName);
    });

    const passed = results.filter(r => r.status === 'OK').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    return {
      total: results.length,
      passed,
      failed,
      duration: Date.now() - startTime,
      results,
      timestamp,
    };
  } catch (error: any) {
    console.error('[AGENT_TEST_SERVICE] Fatal error:', error);
    throw error;
  }
}

/**
 * Test a specific agent by ID
 */
export async function testAgentById(agentId: string): Promise<AgentTestResult> {
  const agents = getAllAgents();
  const agent = agents.find(a => a.id === agentId);

  if (!agent) {
    return {
      agentId,
      agentName: 'Unknown',
      status: 'FAIL',
      latency: 0,
      error: 'Agent not found',
      timestamp: new Date().toISOString(),
    };
  }

  return testAgentWithRetry(agent);
}
