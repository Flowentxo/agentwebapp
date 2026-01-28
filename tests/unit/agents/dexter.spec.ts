/**
 * Unit Tests for Dexter Agent Production
 * Financial Intelligence Agent - 10/10 Rating Tests
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
  })),
}));

describe('DexterAgentProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Configuration', () => {
    it('should have correct agent metadata', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      expect(agent.id).toBe('dexter');
      expect(agent.name).toBe('Dexter');
      expect(agent.version).toBe('3.0.0');
      expect(agent.category).toBe('finance');
    });

    it('should register exactly 10 tools', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();
      const tools = agent.getAvailableTools();

      expect(tools.length).toBe(10);
    });

    it('should have all required tool names', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();
      const tools = agent.getAvailableTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('analyze_revenue');
      expect(toolNames).toContain('forecast_financials');
      expect(toolNames).toContain('generate_pnl_report');
      expect(toolNames).toContain('analyze_cashflow');
      expect(toolNames).toContain('calculate_roi');
      expect(toolNames).toContain('break_even_analysis');
      expect(toolNames).toContain('forecast_sales');
      expect(toolNames).toContain('analyze_customer_profitability');
      expect(toolNames).toContain('calculate_financial_health');
      expect(toolNames).toContain('analyze_budget_variance');
    });
  });

  describe('ROI Calculator Tool', () => {
    it('should calculate simple ROI correctly', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      const result = await agent.executeTool('calculate_roi', {
        initialInvestment: 10000,
        cashFlows: [
          { period: 1, amount: 3000 },
          { period: 2, amount: 4000 },
          { period: 3, amount: 5000 },
        ],
        discountRate: 0.1,
        calculateNPV: true,
        calculateIRR: true,
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      expect(result.data.simpleROI).toBeCloseTo(0.2, 1); // (12000 - 10000) / 10000 = 0.2
      expect(result.data.npv).toBeDefined();
      expect(result.data.irr).toBeDefined();
      expect(result.data.paybackPeriod).toBe(3);
    });

    it('should handle zero investment correctly', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      const result = await agent.executeTool('calculate_roi', {
        initialInvestment: 0,
        cashFlows: [{ period: 1, amount: 1000 }],
        discountRate: 0.1,
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      // Should handle division by zero gracefully
      expect(result.data.simpleROI).toBe(Infinity);
    });
  });

  describe('Break-Even Analysis Tool', () => {
    it('should calculate break-even point correctly', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      const result = await agent.executeTool('break_even_analysis', {
        fixedCosts: 50000,
        variableCostPerUnit: 30,
        pricePerUnit: 50,
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      // Break-even = 50000 / (50 - 30) = 2500 units
      expect(result.data.breakEvenUnits).toBe(2500);
      expect(result.data.breakEvenRevenue).toBe(125000); // 2500 * 50
      expect(result.data.contributionMargin).toBe(20);
      expect(result.data.contributionMarginRatio).toBe(0.4);
    });

    it('should handle target profit', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      const result = await agent.executeTool('break_even_analysis', {
        fixedCosts: 50000,
        variableCostPerUnit: 30,
        pricePerUnit: 50,
        targetProfit: 10000,
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      // Units for target = (50000 + 10000) / 20 = 3000 units
      expect(result.data.unitsForTargetProfit).toBe(3000);
    });

    it('should handle negative contribution margin', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      const result = await agent.executeTool('break_even_analysis', {
        fixedCosts: 50000,
        variableCostPerUnit: 60,
        pricePerUnit: 50, // Price < Variable cost
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      expect(result.data.breakEvenUnits).toBe(Infinity);
      expect(result.data.insights).toContain('Price per unit must exceed variable cost per unit for profitability');
    });

    it('should include sensitivity analysis', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();

      const result = await agent.executeTool('break_even_analysis', {
        fixedCosts: 50000,
        variableCostPerUnit: 30,
        pricePerUnit: 50,
        sensitivityRange: 0.1,
      }, { workspaceId: 'test-ws', userId: 'test-user' } as any);

      expect(result.success).toBe(true);
      expect(result.data.sensitivity).toBeDefined();
      expect(result.data.sensitivity.priceIncrease).toBeDefined();
      expect(result.data.sensitivity.priceDecrease).toBeDefined();
      expect(result.data.sensitivity.costIncrease).toBeDefined();
    });
  });

  describe('System Prompt', () => {
    it('should contain production version information', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();
      const prompt = agent.getSystemPrompt();

      expect(prompt).toContain('Dexter');
      expect(prompt).toContain('Financial Intelligence');
      expect(prompt).toContain('Production Version');
      expect(prompt).toContain('DATABASE-BACKED');
    });

    it('should list all 10 capabilities', async () => {
      const { DexterAgentProduction } = await import('@/lib/agents/dexter/DexterAgentProduction');
      const agent = new DexterAgentProduction();
      const prompt = agent.getSystemPrompt();

      expect(prompt).toContain('Revenue Analysis');
      expect(prompt).toContain('Financial Forecasting');
      expect(prompt).toContain('P&L Reports');
      expect(prompt).toContain('Cash Flow Analysis');
      expect(prompt).toContain('ROI Calculator');
      expect(prompt).toContain('Break-Even Analysis');
      expect(prompt).toContain('Sales Forecasting');
      expect(prompt).toContain('Customer Profitability');
      expect(prompt).toContain('Financial Health Score');
      expect(prompt).toContain('Budget Variance');
    });
  });
});

describe('FinancialDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be instantiable', async () => {
    const { FinancialDataService } = await import('@/lib/agents/dexter/services/FinancialDataService');
    const service = new FinancialDataService();
    expect(service).toBeDefined();
  });

  it('should calculate trend correctly', async () => {
    const { FinancialDataService } = await import('@/lib/agents/dexter/services/FinancialDataService');
    const service = new FinancialDataService();

    // Access private method through prototype
    const calculateTrend = (service as any).calculateTrend.bind(service);

    // Increasing trend
    const increasingValues = [100, 120, 140, 160, 180];
    const trend = calculateTrend(increasingValues);
    expect(trend).toBeGreaterThan(0);

    // Decreasing trend
    const decreasingValues = [180, 160, 140, 120, 100];
    const negativeTrend = calculateTrend(decreasingValues);
    expect(negativeTrend).toBeLessThan(0);

    // Stable
    const stableValues = [100, 100, 100, 100, 100];
    const stableTrend = calculateTrend(stableValues);
    expect(stableTrend).toBe(0);
  });
});
