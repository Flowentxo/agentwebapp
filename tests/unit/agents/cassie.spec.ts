/**
 * Unit Tests for Cassie Agent Production
 * Customer Support Intelligence Agent - 10/10 Rating Tests
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
    generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0)),
  })),
}));

describe('CassieAgentProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Configuration', () => {
    it('should have correct agent metadata', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();

      expect(agent.id).toBe('cassie');
      expect(agent.name).toBe('Cassie');
      expect(agent.version).toBe('3.0.0');
      expect(agent.category).toBe('support');
    });

    it('should register exactly 10 tools', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();
      const tools = agent.getAvailableTools();

      expect(tools.length).toBe(10);
    });

    it('should have all required tool names', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();
      const tools = agent.getAvailableTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('get_ticket_queue');
      expect(toolNames).toContain('update_ticket');
      expect(toolNames).toContain('analyze_sentiment');
      expect(toolNames).toContain('search_knowledge_base');
      expect(toolNames).toContain('generate_response');
      expect(toolNames).toContain('get_support_metrics');
      expect(toolNames).toContain('get_customer_history');
      expect(toolNames).toContain('analyze_csat');
      expect(toolNames).toContain('create_knowledge_article');
      expect(toolNames).toContain('auto_resolve_ticket');
    });
  });

  describe('Sentiment Analysis Tool', () => {
    it('should have correct input schema', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();
      const tools = agent.getAvailableTools();
      const sentimentTool = tools.find(t => t.name === 'analyze_sentiment');

      expect(sentimentTool).toBeDefined();
      expect(sentimentTool?.inputSchema.properties).toHaveProperty('text');
      expect(sentimentTool?.inputSchema.properties).toHaveProperty('includeEmotions');
      expect(sentimentTool?.inputSchema.required).toContain('text');
    });
  });

  describe('System Prompt', () => {
    it('should contain production version information', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();
      const prompt = agent.getSystemPrompt();

      expect(prompt).toContain('Cassie');
      expect(prompt).toContain('Customer Support');
      expect(prompt).toContain('Production Version');
      expect(prompt).toContain('DATABASE-BACKED');
    });

    it('should list all 10 capabilities', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();
      const prompt = agent.getSystemPrompt();

      expect(prompt).toContain('Ticket Queue');
      expect(prompt).toContain('Ticket Updates');
      expect(prompt).toContain('Sentiment Analysis');
      expect(prompt).toContain('Knowledge Base');
      expect(prompt).toContain('Response Generation');
      expect(prompt).toContain('Support Metrics');
      expect(prompt).toContain('Customer History');
      expect(prompt).toContain('CSAT Analysis');
      expect(prompt).toContain('Knowledge Article');
      expect(prompt).toContain('Auto-Resolution');
    });
  });

  describe('Tool Categories', () => {
    it('should have tools in correct categories', async () => {
      const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
      const agent = new CassieAgentProduction();
      const tools = agent.getAvailableTools();

      const ticketTools = tools.filter(t => t.category === 'tickets');
      const analysisTools = tools.filter(t => t.category === 'analysis');
      const knowledgeTools = tools.filter(t => t.category === 'knowledge');
      const responseTools = tools.filter(t => t.category === 'response');

      expect(ticketTools.length).toBeGreaterThan(0);
      expect(analysisTools.length).toBeGreaterThan(0);
      expect(knowledgeTools.length).toBeGreaterThan(0);
      expect(responseTools.length).toBeGreaterThan(0);
    });
  });
});

describe('SupportMetricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be instantiable', async () => {
    const { SupportMetricsService } = await import('@/lib/agents/cassie/services/SupportMetricsService');
    const service = new SupportMetricsService();
    expect(service).toBeDefined();
  });

  it('should have getSupportMetrics method', async () => {
    const { SupportMetricsService } = await import('@/lib/agents/cassie/services/SupportMetricsService');
    const service = new SupportMetricsService();
    expect(typeof service.getSupportMetrics).toBe('function');
  });

  it('should have analyzeCSAT method', async () => {
    const { SupportMetricsService } = await import('@/lib/agents/cassie/services/SupportMetricsService');
    const service = new SupportMetricsService();
    expect(typeof service.analyzeCSAT).toBe('function');
  });

  it('should have getCustomerHistory method', async () => {
    const { SupportMetricsService } = await import('@/lib/agents/cassie/services/SupportMetricsService');
    const service = new SupportMetricsService();
    expect(typeof service.getCustomerHistory).toBe('function');
  });
});

describe('Cassie Tool Input Validation', () => {
  it('should validate ticket update input', async () => {
    const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
    const agent = new CassieAgentProduction();
    const tools = agent.getAvailableTools();
    const updateTool = tools.find(t => t.name === 'update_ticket');

    expect(updateTool?.inputSchema.required).toContain('ticketId');
    expect(updateTool?.inputSchema.properties).toHaveProperty('status');
    expect(updateTool?.inputSchema.properties).toHaveProperty('priority');
    expect(updateTool?.inputSchema.properties).toHaveProperty('assignee');
  });

  it('should validate knowledge base search input', async () => {
    const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
    const agent = new CassieAgentProduction();
    const tools = agent.getAvailableTools();
    const searchTool = tools.find(t => t.name === 'search_knowledge_base');

    expect(searchTool?.inputSchema.required).toContain('query');
    expect(searchTool?.inputSchema.properties).toHaveProperty('limit');
    expect(searchTool?.inputSchema.properties).toHaveProperty('category');
  });

  it('should validate response generation input', async () => {
    const { CassieAgentProduction } = await import('@/lib/agents/cassie/CassieAgentProduction');
    const agent = new CassieAgentProduction();
    const tools = agent.getAvailableTools();
    const responseTool = tools.find(t => t.name === 'generate_response');

    expect(responseTool?.inputSchema.required).toContain('ticketId');
    expect(responseTool?.inputSchema.properties).toHaveProperty('tone');
    expect(responseTool?.inputSchema.properties).toHaveProperty('includeKnowledgeBase');
  });
});
