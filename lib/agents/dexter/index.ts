/**
 * PHASE 17-20: Dexter Agent - Main Export & Integration
 * Exports all Dexter components for easy integration
 *
 * PRODUCTION VERSION (10/10) - Fully database-backed with real analytics
 */

// Export Production Agent as primary
export { DexterAgentProduction as DexterAgent, dexterAgentProduction as dexterAgent } from './DexterAgentProduction';

// Legacy export for backward compatibility
export { DexterAgent as DexterAgentLegacy, dexterAgent as dexterAgentLegacy } from './DexterAgent';

// Analysis Tools
export { RevenueAnalyzer, revenueAnalyzer } from './tools/RevenueAnalyzer';
export { ForecastEngine, forecastEngine } from './tools/ForecastEngine';
export { FinancialReportsGenerator, financialReportsGenerator } from './tools/FinancialReports';
export { CustomerAnalytics, customerAnalytics } from './tools/CustomerAnalytics';
export { CRMInsights, crmInsights } from './tools/CRMInsights';

// Re-export types
export type {
  RevenueDataPoint,
  RevenueSegment,
  RevenueTrend,
  RevenueAnomaly,
  RevenueAnalysis,
} from './tools/RevenueAnalyzer';

export type {
  TimeSeriesPoint,
  ForecastResult,
  ModelMetrics,
  ForecastOutput,
} from './tools/ForecastEngine';

export type {
  ProfitAndLossReport,
  BalanceSheetReport,
  CashFlowStatement,
} from './tools/FinancialReports';

export type {
  CustomerMetrics,
  CohortData,
  SegmentAnalysis,
  CustomerProfitabilityReport,
} from './tools/CustomerAnalytics';

export type {
  PipelineStage,
  PipelineAnalysis,
  SalesRepPerformance,
  DealIntelligence,
} from './tools/CRMInsights';

/**
 * Quick access to Dexter's main capabilities
 */
export const DexterCapabilities = {
  /**
   * Revenue & Financial Analysis
   */
  financial: {
    analyzeRevenue: async (workspaceId: string, startDate: Date, endDate: Date) => {
      const { revenueAnalyzer } = await import('./tools/RevenueAnalyzer');
      return revenueAnalyzer.analyze({ workspaceId, startDate, endDate });
    },

    generatePnL: async (workspaceId: string, startDate: Date, endDate: Date) => {
      const { financialReportsGenerator } = await import('./tools/FinancialReports');
      return financialReportsGenerator.generatePnL({ workspaceId, startDate, endDate });
    },

    generateBalanceSheet: async (workspaceId: string, asOfDate: Date) => {
      const { financialReportsGenerator } = await import('./tools/FinancialReports');
      return financialReportsGenerator.generateBalanceSheet({ workspaceId, asOfDate });
    },

    generateCashFlow: async (workspaceId: string, startDate: Date, endDate: Date) => {
      const { financialReportsGenerator } = await import('./tools/FinancialReports');
      return financialReportsGenerator.generateCashFlowStatement({ workspaceId, startDate, endDate });
    },
  },

  /**
   * Forecasting
   */
  forecasting: {
    forecast: async (data: Array<{ date: Date; value: number }>, options: {
      periods: number;
      model?: 'linear' | 'exponential' | 'arima' | 'holtwinters';
      confidenceLevel?: number;
    }) => {
      const { forecastEngine } = await import('./tools/ForecastEngine');
      return forecastEngine.forecast(data, options);
    },

    ensembleForecast: async (data: Array<{ date: Date; value: number }>, options: {
      periods: number;
      confidenceLevel?: number;
    }) => {
      const { forecastEngine } = await import('./tools/ForecastEngine');
      return forecastEngine.ensembleForecast(data, options);
    },
  },

  /**
   * Customer Analytics
   */
  customers: {
    analyzeProfitability: async (workspaceId: string, options?: {
      period?: 'last_30_days' | 'last_90_days' | 'last_year' | 'all_time';
      topN?: number;
    }) => {
      const { customerAnalytics } = await import('./tools/CustomerAnalytics');
      return customerAnalytics.analyzeProfitability({ workspaceId, ...options });
    },

    calculateLTV: (options: {
      averageOrderValue: number;
      purchaseFrequency: number;
      customerLifespan: number;
      profitMargin?: number;
    }) => {
      const { customerAnalytics } = require('./tools/CustomerAnalytics');
      return customerAnalytics.calculateLTV(options);
    },

    predictChurn: (customer: {
      daysSinceLastPurchase: number;
      averageDaysBetweenPurchases: number;
      purchaseCount: number;
      supportTickets: number;
      loginFrequency: number;
      featureUsage: number;
    }) => {
      const { customerAnalytics } = require('./tools/CustomerAnalytics');
      return customerAnalytics.predictChurn(customer);
    },

    calculateHealthScore: (metrics: {
      nps?: number;
      supportTicketRatio: number;
      productUsage: number;
      paymentHistory: number;
      expansionRevenue: number;
      engagementScore: number;
    }) => {
      const { customerAnalytics } = require('./tools/CustomerAnalytics');
      return customerAnalytics.calculateHealthScore(metrics);
    },
  },

  /**
   * CRM & Pipeline
   */
  crm: {
    analyzePipeline: async (workspaceId: string, options?: {
      pipelineId?: string;
      dateRange?: { start: Date; end: Date };
    }) => {
      const { crmInsights } = await import('./tools/CRMInsights');
      return crmInsights.analyzePipeline({ workspaceId, ...options });
    },

    getDealIntelligence: async (workspaceId: string, dealId: string) => {
      const { crmInsights } = await import('./tools/CRMInsights');
      return crmInsights.getDealIntelligence({ workspaceId, dealId });
    },

    getSalesPerformance: async (workspaceId: string, period?: 'this_month' | 'this_quarter' | 'this_year') => {
      const { crmInsights } = await import('./tools/CRMInsights');
      return crmInsights.getSalesRepPerformance({ workspaceId, period });
    },

    getWinLossAnalysis: async (workspaceId: string, dateRange?: { start: Date; end: Date }) => {
      const { crmInsights } = await import('./tools/CRMInsights');
      return crmInsights.getWinLossAnalysis({ workspaceId, dateRange });
    },
  },
};

/**
 * Initialize Dexter Agent
 * Call this on application startup to register the agent
 */
export function initializeDexterAgent(): void {
  // Import triggers agent registration (Production version)
  require('./DexterAgentProduction');
  console.log('[DEXTER] Financial Intelligence Agent (Production) initialized');
}
