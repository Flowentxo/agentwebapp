/**
 * FinancialContextBridge Service
 *
 * This service bridges SQL-based financial data (BudgetService) with the
 * semantic memory system (BrainAIService) to enable AI agents like Buddy
 * to have contextual awareness of user financial status.
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import { budgetService } from './BudgetService';
import { brainAI } from './BrainAIService';

interface FinancialContextSyncResult {
  success: boolean;
  memoryId?: string;
  error?: string;
  syncedAt: string;
}

interface FinancialHealthSnapshot {
  userId: string;
  timestamp: string;
  budget: {
    monthlyLimit: number;
    dailyLimit: number;
    currentMonthSpend: number;
    currentDaySpend: number;
    monthlyTokenLimit: number;
    currentMonthTokens: number;
    utilizationPercent: number;
    isActive: boolean;
  };
  forecast: {
    projectedMonthEnd: number;
    projectedOverage: number;
    runOutDate: string | null;
    trend: 'increasing' | 'stable' | 'decreasing';
    confidenceScore: number;
    recommendation: string;
  } | null;
  alerts: {
    count: number;
    highSeverity: number;
    messages: string[];
  };
  healthScore: number; // 0-100
  narrative: string;
}

/**
 * FinancialContextBridge - Bridges SQL data with semantic memory
 */
export class FinancialContextBridge {
  private static instance: FinancialContextBridge;
  private lastSyncTimes: Map<string, Date> = new Map();
  private readonly SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): FinancialContextBridge {
    if (!FinancialContextBridge.instance) {
      FinancialContextBridge.instance = new FinancialContextBridge();
    }
    return FinancialContextBridge.instance;
  }

  /**
   * Sync financial context for a user to semantic memory
   * This creates a narrative text that LLMs can understand and reference
   *
   * @param userId - The user's ID
   * @returns Promise<FinancialContextSyncResult>
   */
  async syncFinancialContext(userId: string): Promise<FinancialContextSyncResult> {
    const syncedAt = new Date().toISOString();

    try {
      // Check cooldown to prevent excessive syncs
      const lastSync = this.lastSyncTimes.get(userId);
      if (lastSync && Date.now() - lastSync.getTime() < this.SYNC_COOLDOWN_MS) {
        return {
          success: true,
          syncedAt,
          error: 'Skipped - recently synced'
        };
      }

      // Fetch budget data
      let budget;
      try {
        budget = await budgetService.getUserBudget(userId);
      } catch (budgetError) {
        console.error('[FinancialContextBridge] Failed to fetch budget:', budgetError);
        return {
          success: false,
          error: `Budget fetch failed: ${budgetError instanceof Error ? budgetError.message : 'Unknown error'}`,
          syncedAt
        };
      }

      // Fetch forecast data
      let forecast = null;
      try {
        forecast = await budgetService.calculateForecast(userId);
      } catch (forecastError) {
        // Forecast is optional - log but continue
        console.warn('[FinancialContextBridge] Forecast unavailable:', forecastError);
      }

      // Fetch unread alerts
      let alerts: any[] = [];
      try {
        alerts = await budgetService.getUnreadAlerts(userId);
      } catch (alertError) {
        console.warn('[FinancialContextBridge] Alerts unavailable:', alertError);
      }

      // Calculate health metrics
      const monthlyLimit = parseFloat(String(budget.monthlyCostLimitUsd || 0));
      const currentMonthSpend = parseFloat(String(budget.currentMonthCostUsd || 0));
      const utilizationPercent = monthlyLimit > 0
        ? (currentMonthSpend / monthlyLimit) * 100
        : 0;

      // Calculate health score (0-100)
      const healthScore = this.calculateHealthScore(utilizationPercent, forecast, alerts);

      // Generate narrative text for LLM understanding
      const narrative = this.generateNarrative({
        budget,
        forecast,
        alerts,
        utilizationPercent,
        healthScore
      });

      // Store in semantic memory
      const memoryId = await brainAI.storeMemory(narrative, {
        source: 'financial_context_bridge',
        userId,
        tags: ['finance', 'budget_context', 'daily_sync'],
        category: 'financial_intelligence'
      });

      // Update last sync time
      this.lastSyncTimes.set(userId, new Date());

      console.log(`[FinancialContextBridge] Synced context for user ${userId}: ${memoryId}`);

      return {
        success: true,
        memoryId,
        syncedAt
      };

    } catch (error) {
      console.error('[FinancialContextBridge] Sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
        syncedAt
      };
    }
  }

  /**
   * Get a structured financial health snapshot (for AI tools)
   */
  async getFinancialSnapshot(userId: string): Promise<FinancialHealthSnapshot | null> {
    try {
      const budget = await budgetService.getUserBudget(userId);

      let forecast = null;
      try {
        forecast = await budgetService.calculateForecast(userId);
      } catch {
        // Forecast optional
      }

      let alerts: any[] = [];
      try {
        alerts = await budgetService.getUnreadAlerts(userId);
      } catch {
        // Alerts optional
      }

      const monthlyLimit = parseFloat(String(budget.monthlyCostLimitUsd || 0));
      const dailyLimit = parseFloat(String(budget.dailyCostLimitUsd || 0));
      const currentMonthSpend = parseFloat(String(budget.currentMonthCostUsd || 0));
      const currentDaySpend = parseFloat(String(budget.currentDayCostUsd || 0));
      const utilizationPercent = monthlyLimit > 0
        ? (currentMonthSpend / monthlyLimit) * 100
        : 0;

      const healthScore = this.calculateHealthScore(utilizationPercent, forecast, alerts);

      const snapshot: FinancialHealthSnapshot = {
        userId,
        timestamp: new Date().toISOString(),
        budget: {
          monthlyLimit,
          dailyLimit,
          currentMonthSpend,
          currentDaySpend,
          monthlyTokenLimit: budget.monthlyTokenLimit || 0,
          currentMonthTokens: budget.currentMonthTokens || 0,
          utilizationPercent: Math.round(utilizationPercent * 100) / 100,
          isActive: budget.isActive !== false
        },
        forecast: forecast ? {
          projectedMonthEnd: forecast.projectedMonthEnd || 0,
          projectedOverage: forecast.projectedOverage || 0,
          runOutDate: forecast.runOutDate?.toISOString() || null,
          trend: forecast.trend || 'stable',
          confidenceScore: forecast.confidenceScore || 0,
          recommendation: forecast.recommendation || 'No specific recommendations'
        } : null,
        alerts: {
          count: alerts.length,
          highSeverity: alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
          messages: alerts.slice(0, 3).map(a => a.message)
        },
        healthScore,
        narrative: this.generateNarrative({
          budget,
          forecast,
          alerts,
          utilizationPercent,
          healthScore
        })
      };

      return snapshot;

    } catch (error) {
      console.error('[FinancialContextBridge] Failed to get snapshot:', error);
      return null;
    }
  }

  /**
   * Calculate financial health score (0-100)
   */
  private calculateHealthScore(
    utilizationPercent: number,
    forecast: any | null,
    alerts: any[]
  ): number {
    let score = 100;

    // Deduct based on utilization
    if (utilizationPercent > 100) {
      score -= 40; // Over budget
    } else if (utilizationPercent > 90) {
      score -= 25;
    } else if (utilizationPercent > 80) {
      score -= 15;
    } else if (utilizationPercent > 70) {
      score -= 10;
    }

    // Deduct based on forecast
    if (forecast) {
      if (forecast.projectedOverage > 0) {
        score -= 20;
      }
      if (forecast.trend === 'increasing') {
        score -= 10;
      }
    }

    // Deduct based on alerts
    const highSeverityAlerts = alerts.filter(
      a => a.severity === 'high' || a.severity === 'critical'
    ).length;
    score -= highSeverityAlerts * 10;
    score -= (alerts.length - highSeverityAlerts) * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable narrative for LLM context
   */
  private generateNarrative(data: {
    budget: any;
    forecast: any | null;
    alerts: any[];
    utilizationPercent: number;
    healthScore: number;
  }): string {
    const { budget, forecast, alerts, utilizationPercent, healthScore } = data;

    const monthlyLimit = parseFloat(String(budget.monthlyCostLimitUsd || 0));
    const currentMonthSpend = parseFloat(String(budget.currentMonthCostUsd || 0));
    const remainingBudget = monthlyLimit - currentMonthSpend;

    let narrative = `## Financial Status Summary\n\n`;
    narrative += `**Health Score:** ${healthScore}/100 (${this.getHealthLabel(healthScore)})\n\n`;

    // Budget overview
    narrative += `### Current Budget Status\n`;
    narrative += `- Monthly Budget: $${monthlyLimit.toFixed(2)}\n`;
    narrative += `- Spent This Month: $${currentMonthSpend.toFixed(2)} (${utilizationPercent.toFixed(1)}%)\n`;
    narrative += `- Remaining: $${remainingBudget.toFixed(2)}\n`;

    if (budget.monthlyTokenLimit) {
      const tokenUtilization = budget.monthlyTokenLimit > 0
        ? ((budget.currentMonthTokens || 0) / budget.monthlyTokenLimit) * 100
        : 0;
      narrative += `- Token Usage: ${(budget.currentMonthTokens || 0).toLocaleString()} / ${budget.monthlyTokenLimit.toLocaleString()} (${tokenUtilization.toFixed(1)}%)\n`;
    }

    // Forecast section
    if (forecast) {
      narrative += `\n### Forecast & Predictions\n`;
      narrative += `- Projected End of Month: $${(forecast.projectedMonthEnd || 0).toFixed(2)}\n`;
      narrative += `- Spending Trend: ${forecast.trend || 'stable'}\n`;
      narrative += `- Confidence: ${((forecast.confidenceScore || 0) * 100).toFixed(0)}%\n`;

      if (forecast.projectedOverage > 0) {
        narrative += `- ⚠️ Projected Overage: $${forecast.projectedOverage.toFixed(2)}\n`;
      }

      if (forecast.runOutDate) {
        narrative += `- ⚠️ Budget Run-out Date: ${new Date(forecast.runOutDate).toLocaleDateString()}\n`;
      }

      if (forecast.recommendation) {
        narrative += `- Recommendation: ${forecast.recommendation}\n`;
      }
    }

    // Active alerts
    if (alerts.length > 0) {
      narrative += `\n### Active Alerts (${alerts.length})\n`;
      alerts.slice(0, 5).forEach(alert => {
        const icon = alert.severity === 'critical' || alert.severity === 'high' ? '🚨' : '⚠️';
        narrative += `- ${icon} [${alert.severity?.toUpperCase() || 'INFO'}] ${alert.message}\n`;
      });
    }

    // Actionable insights
    narrative += `\n### Key Insights\n`;
    if (utilizationPercent > 90) {
      narrative += `- Critical: Budget nearly exhausted. Consider reducing AI usage or increasing limits.\n`;
    } else if (utilizationPercent > 75) {
      narrative += `- Warning: Approaching budget limit. Monitor usage closely.\n`;
    } else if (utilizationPercent < 30) {
      narrative += `- Good: Budget utilization is healthy with significant headroom.\n`;
    } else {
      narrative += `- Normal: Budget usage is within expected parameters.\n`;
    }

    return narrative;
  }

  /**
   * Get health label from score
   */
  private getHealthLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Poor';
    return 'Critical';
  }

  /**
   * Query financial context from semantic memory
   */
  async queryFinancialContext(userId: string, query: string): Promise<string | null> {
    try {
      const results = await brainAI.queryMemory(query, {
        category: 'financial_intelligence',
        limit: 3,
        threshold: 0.6
      });

      // Filter to this user's context
      const userResults = results.filter(r => r.entry.metadata.userId === userId);

      if (userResults.length === 0) {
        return null;
      }

      // Return the most relevant result
      return userResults[0].entry.content;

    } catch (error) {
      console.error('[FinancialContextBridge] Query failed:', error);
      return null;
    }
  }

  /**
   * Force sync regardless of cooldown (for manual triggers)
   */
  async forceSyncFinancialContext(userId: string): Promise<FinancialContextSyncResult> {
    this.lastSyncTimes.delete(userId);
    return this.syncFinancialContext(userId);
  }
}

// Export singleton instance
export const financialContextBridge = FinancialContextBridge.getInstance();
