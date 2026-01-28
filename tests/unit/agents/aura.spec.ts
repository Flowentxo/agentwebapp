/**
 * Unit Tests for Aura Agent Production
 * Workflow Orchestration & Automation Intelligence Agent - 10/10 Rating Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('@/lib/brain/RedisCache', () => ({
  RedisCache: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('@/server/services/OpenAIService', () => ({
  OpenAIService: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ content: 'Test response', tokensUsed: 100 }),
    chatWithFunctions: vi.fn().mockResolvedValue({ content: 'Test response', tokensUsed: 100 }),
  })),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-id' }),
    getJob: vi.fn().mockResolvedValue(null),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('AuraAgentProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Configuration', () => {
    it('should have correct agent metadata', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();

      expect(agent.id).toBe('aura');
      expect(agent.name).toBe('Aura');
      expect(agent.version).toBe('3.0.0');
      expect(agent.category).toBe('automation');
    });

    it('should register exactly 10 tools', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();

      expect(tools.length).toBe(10);
    });

    it('should have all required tool names', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('create_workflow');
      expect(toolNames).toContain('execute_workflow');
      expect(toolNames).toContain('list_workflows');
      expect(toolNames).toContain('get_workflow_status');
      expect(toolNames).toContain('create_automation_rule');
      expect(toolNames).toContain('list_automation_rules');
      expect(toolNames).toContain('schedule_task');
      expect(toolNames).toContain('list_scheduled_tasks');
      expect(toolNames).toContain('get_automation_metrics');
      expect(toolNames).toContain('validate_workflow');
    });
  });

  describe('CronParser', () => {
    it('should parse standard cron expressions', async () => {
      const { CronParser } = await import('@/lib/agents/aura/AuraAgentProduction');
      const parser = new CronParser();

      // Every day at midnight
      const nextRun = parser.getNextRun('0 0 * * *');
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getHours()).toBe(0);
      expect(nextRun.getMinutes()).toBe(0);
    });

    it('should validate cron expressions', async () => {
      const { CronParser } = await import('@/lib/agents/aura/AuraAgentProduction');
      const parser = new CronParser();

      expect(parser.isValid('0 0 * * *')).toBe(true);
      expect(parser.isValid('*/5 * * * *')).toBe(true);
      expect(parser.isValid('0 9-17 * * 1-5')).toBe(true);
      expect(parser.isValid('invalid')).toBe(false);
      expect(parser.isValid('')).toBe(false);
    });

    it('should describe cron expressions in human-readable format', async () => {
      const { CronParser } = await import('@/lib/agents/aura/AuraAgentProduction');
      const parser = new CronParser();

      const description = parser.describe('0 0 * * *');
      expect(description.toLowerCase()).toContain('midnight');
    });

    it('should get multiple next runs', async () => {
      const { CronParser } = await import('@/lib/agents/aura/AuraAgentProduction');
      const parser = new CronParser();

      const nextRuns = parser.getNextRuns('*/15 * * * *', 5);
      expect(nextRuns.length).toBe(5);

      // Each run should be 15 minutes apart
      for (let i = 1; i < nextRuns.length; i++) {
        const diff = nextRuns[i].getTime() - nextRuns[i - 1].getTime();
        expect(diff).toBe(15 * 60 * 1000);
      }
    });

    it('should handle step values', async () => {
      const { CronParser } = await import('@/lib/agents/aura/AuraAgentProduction');
      const parser = new CronParser();

      // Every 5 minutes
      expect(parser.isValid('*/5 * * * *')).toBe(true);
      // Every 2 hours
      expect(parser.isValid('0 */2 * * *')).toBe(true);
    });

    it('should handle ranges', async () => {
      const { CronParser } = await import('@/lib/agents/aura/AuraAgentProduction');
      const parser = new CronParser();

      // Monday to Friday
      expect(parser.isValid('0 9 * * 1-5')).toBe(true);
      // Working hours
      expect(parser.isValid('0 9-17 * * *')).toBe(true);
    });
  });

  describe('System Prompt', () => {
    it('should contain production version information', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const prompt = agent.getSystemPrompt();

      expect(prompt).toContain('Aura');
      expect(prompt).toContain('Workflow Orchestration');
      expect(prompt).toContain('Production Version');
      expect(prompt).toContain('DATABASE-BACKED');
    });

    it('should list all 10 capabilities', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const prompt = agent.getSystemPrompt();

      expect(prompt).toContain('Workflow Creation');
      expect(prompt).toContain('Workflow Execution');
      expect(prompt).toContain('Workflow Listing');
      expect(prompt).toContain('Execution Status');
      expect(prompt).toContain('Automation Rules');
      expect(prompt).toContain('Rule Management');
      expect(prompt).toContain('Task Scheduling');
      expect(prompt).toContain('Scheduled Tasks');
      expect(prompt).toContain('Automation Metrics');
      expect(prompt).toContain('Workflow Validation');
    });
  });

  describe('Tool Input Schemas', () => {
    it('should validate create_workflow input', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();
      const createTool = tools.find(t => t.name === 'create_workflow');

      expect(createTool?.inputSchema.required).toContain('name');
      expect(createTool?.inputSchema.required).toContain('nodes');
      expect(createTool?.inputSchema.required).toContain('edges');
      expect(createTool?.inputSchema.properties).toHaveProperty('description');
      expect(createTool?.inputSchema.properties).toHaveProperty('variables');
    });

    it('should validate execute_workflow input', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();
      const executeTool = tools.find(t => t.name === 'execute_workflow');

      expect(executeTool?.inputSchema.required).toContain('workflowId');
      expect(executeTool?.inputSchema.properties).toHaveProperty('input');
      expect(executeTool?.inputSchema.properties).toHaveProperty('async');
    });

    it('should validate schedule_task input', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();
      const scheduleTool = tools.find(t => t.name === 'schedule_task');

      expect(scheduleTool?.inputSchema.required).toContain('name');
      expect(scheduleTool?.inputSchema.required).toContain('schedule');
      expect(scheduleTool?.inputSchema.properties).toHaveProperty('type');
      expect(scheduleTool?.inputSchema.properties).toHaveProperty('payload');
    });

    it('should validate create_automation_rule input', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();
      const ruleTool = tools.find(t => t.name === 'create_automation_rule');

      expect(ruleTool?.inputSchema.required).toContain('name');
      expect(ruleTool?.inputSchema.required).toContain('trigger');
      expect(ruleTool?.inputSchema.required).toContain('actions');
      expect(ruleTool?.inputSchema.properties).toHaveProperty('conditions');
    });
  });

  describe('Tool Categories', () => {
    it('should have tools in correct categories', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();
      const tools = agent.getAvailableTools();

      const workflowTools = tools.filter(t => t.category === 'workflow');
      const automationTools = tools.filter(t => t.category === 'automation');
      const schedulingTools = tools.filter(t => t.category === 'scheduling');
      const monitoringTools = tools.filter(t => t.category === 'monitoring');

      expect(workflowTools.length).toBeGreaterThan(0);
      expect(automationTools.length).toBeGreaterThan(0);
      expect(schedulingTools.length).toBeGreaterThan(0);
      expect(monitoringTools.length).toBeGreaterThan(0);
    });
  });

  describe('Node Executors', () => {
    it('should have all required node executors', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();

      // Access private nodeExecutors through prototype
      const executors = (agent as any).nodeExecutors;

      expect(executors).toBeDefined();
      expect(typeof executors.get).toBe('function');

      // Check for required executor types
      const requiredTypes = [
        'trigger', 'action', 'condition', 'loop', 'parallel',
        'wait', 'transform', 'http', 'webhook', 'email',
        'database', 'agent', 'script', 'end'
      ];

      for (const type of requiredTypes) {
        expect(executors.has(type)).toBe(true);
      }
    });
  });

  describe('Workflow Validation', () => {
    it('should validate workflow structure', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();

      const result = await agent.executeTool('validate_workflow', {
        nodes: [
          { id: 'trigger', type: 'trigger', name: 'Start', config: {} },
          { id: 'action1', type: 'action', name: 'Action', config: {} },
          { id: 'end', type: 'end', name: 'End', config: {} },
        ],
        edges: [
          { source: 'trigger', target: 'action1' },
          { source: 'action1', target: 'end' },
        ],
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });

    it('should detect workflow without trigger', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();

      const result = await agent.executeTool('validate_workflow', {
        nodes: [
          { id: 'action1', type: 'action', name: 'Action', config: {} },
        ],
        edges: [],
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toContain('Workflow must have exactly one trigger node');
    });

    it('should detect disconnected nodes', async () => {
      const { AuraAgentProduction } = await import('@/lib/agents/aura/AuraAgentProduction');
      const agent = new AuraAgentProduction();

      const result = await agent.executeTool('validate_workflow', {
        nodes: [
          { id: 'trigger', type: 'trigger', name: 'Start', config: {} },
          { id: 'action1', type: 'action', name: 'Action 1', config: {} },
          { id: 'action2', type: 'action', name: 'Action 2 (disconnected)', config: {} },
        ],
        edges: [
          { source: 'trigger', target: 'action1' },
        ],
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      expect(result.data.warnings?.length).toBeGreaterThan(0);
    });
  });
});

describe('Aura Index Exports', () => {
  it('should export AuraAgentProduction as AuraAgent', async () => {
    const { AuraAgent } = await import('@/lib/agents/aura');
    expect(AuraAgent).toBeDefined();

    const agent = new AuraAgent();
    expect(agent.version).toBe('3.0.0');
  });

  it('should export legacy agent for backward compatibility', async () => {
    const { AuraAgentLegacy } = await import('@/lib/agents/aura');
    expect(AuraAgentLegacy).toBeDefined();
  });

  it('should export AuraCapabilities', async () => {
    const { AuraCapabilities } = await import('@/lib/agents/aura');
    expect(AuraCapabilities).toBeDefined();
    expect(AuraCapabilities.workflows).toBeDefined();
    expect(AuraCapabilities.rules).toBeDefined();
    expect(AuraCapabilities.tasks).toBeDefined();
  });
});
