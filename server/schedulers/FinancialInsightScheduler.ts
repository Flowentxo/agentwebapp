/**
 * Financial Insight Scheduler
 *
 * Automated scheduler that periodically syncs financial context for all users
 * and creates alerts when critical thresholds are detected.
 *
 * Schedule: Every 6 hours (configurable)
 * Trigger: Can also be invoked manually via API
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import cron from 'node-cron';
import { financialContextBridge } from '../services/FinancialContextBridge';
import { budgetService } from '../services/BudgetService';
import { getDb } from '@/lib/db/connection';
import { userBudgets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface SchedulerConfig {
  cronExpression: string;
  healthScoreThreshold: number;
  enableAutoAlerts: boolean;
  batchSize: number;
  delayBetweenUsers: number; // ms
}

interface SyncResult {
  userId: string;
  success: boolean;
  healthScore?: number;
  alertCreated?: boolean;
  error?: string;
  syncedAt: string;
}

interface SchedulerStats {
  lastRunAt: string | null;
  totalRuns: number;
  totalUsersProcessed: number;
  totalAlertsCreated: number;
  averageHealthScore: number;
  isRunning: boolean;
}

// =====================================================
// SCHEDULER CLASS
// =====================================================

export class FinancialInsightScheduler {
  private static instance: FinancialInsightScheduler;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private stats: SchedulerStats = {
    lastRunAt: null,
    totalRuns: 0,
    totalUsersProcessed: 0,
    totalAlertsCreated: 0,
    averageHealthScore: 0,
    isRunning: false,
  };

  private config: SchedulerConfig = {
    cronExpression: '0 */6 * * *', // Every 6 hours
    healthScoreThreshold: 50, // Alert when below this
    enableAutoAlerts: true,
    batchSize: 50, // Process users in batches
    delayBetweenUsers: 100, // 100ms delay between users to avoid overload
  };

  private constructor() {}

  public static getInstance(): FinancialInsightScheduler {
    if (!FinancialInsightScheduler.instance) {
      FinancialInsightScheduler.instance = new FinancialInsightScheduler();
    }
    return FinancialInsightScheduler.instance;
  }

  /**
   * Start the scheduler
   */
  public start(): void {
    if (this.cronJob) {
      console.log('[FinancialScheduler] Already running');
      return;
    }

    console.log(`[FinancialScheduler] Starting with schedule: ${this.config.cronExpression}`);

    this.cronJob = cron.schedule(this.config.cronExpression, async () => {
      await this.runSync();
    });

    console.log('[FinancialScheduler] Started successfully');
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[FinancialScheduler] Stopped');
    }
  }

  /**
   * Update scheduler configuration
   */
  public updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if running with new schedule
    if (this.cronJob && config.cronExpression) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current scheduler stats
   */
  public getStats(): SchedulerStats {
    return { ...this.stats, isRunning: this.isRunning };
  }

  /**
   * Manually trigger a sync run
   */
  public async triggerManualSync(): Promise<SyncResult[]> {
    return this.runSync();
  }

  /**
   * Sync a single user (for on-demand syncing)
   */
  public async syncUser(userId: string): Promise<SyncResult> {
    return this.processUser(userId);
  }

  /**
   * Main sync run - processes all active users
   */
  private async runSync(): Promise<SyncResult[]> {
    if (this.isRunning) {
      console.log('[FinancialScheduler] Sync already in progress, skipping');
      return [];
    }

    this.isRunning = true;
    this.stats.isRunning = true;
    const startTime = Date.now();
    const results: SyncResult[] = [];
    let healthScoreSum = 0;
    let healthScoreCount = 0;

    console.log('[FinancialScheduler] Starting financial insight sync...');

    try {
      // Get all active users with budgets
      const activeUsers = await this.getActiveUsers();
      console.log(`[FinancialScheduler] Found ${activeUsers.length} active users`);

      // Process users in batches
      for (let i = 0; i < activeUsers.length; i += this.config.batchSize) {
        const batch = activeUsers.slice(i, i + this.config.batchSize);

        for (const user of batch) {
          try {
            const result = await this.processUser(user.userId);
            results.push(result);

            if (result.healthScore !== undefined) {
              healthScoreSum += result.healthScore;
              healthScoreCount++;
            }

            if (result.alertCreated) {
              this.stats.totalAlertsCreated++;
            }

            // Small delay to prevent overwhelming the system
            await this.delay(this.config.delayBetweenUsers);

          } catch (error) {
            console.error(`[FinancialScheduler] Error processing user ${user.userId}:`, error);
            results.push({
              userId: user.userId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              syncedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Update stats
      this.stats.lastRunAt = new Date().toISOString();
      this.stats.totalRuns++;
      this.stats.totalUsersProcessed += results.length;
      this.stats.averageHealthScore = healthScoreCount > 0
        ? Math.round(healthScoreSum / healthScoreCount)
        : 0;

      const duration = Date.now() - startTime;
      console.log(`[FinancialScheduler] Sync completed in ${duration}ms`);
      console.log(`[FinancialScheduler] Processed: ${results.length} users, Avg Health: ${this.stats.averageHealthScore}`);

      return results;

    } catch (error) {
      console.error('[FinancialScheduler] Sync run failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
    }
  }

  /**
   * Get all users with active budgets
   */
  private async getActiveUsers(): Promise<Array<{ userId: string }>> {
    try {
      const db = getDb();
      const users = await db
        .select({ userId: userBudgets.userId })
        .from(userBudgets)
        .where(eq(userBudgets.isActive, true));

      return users;
    } catch (error) {
      console.error('[FinancialScheduler] Failed to fetch active users:', error);
      return [];
    }
  }

  /**
   * Process a single user
   */
  private async processUser(userId: string): Promise<SyncResult> {
    const syncedAt = new Date().toISOString();

    try {
      // Sync financial context to semantic memory
      const syncResult = await financialContextBridge.syncFinancialContext(userId);

      if (!syncResult.success) {
        return {
          userId,
          success: false,
          error: syncResult.error,
          syncedAt,
        };
      }

      // Get health summary to check for critical status
      const healthSummary = await budgetService.getFinancialHealthSummary(userId);
      const healthScore = healthSummary.healthScore;

      let alertCreated = false;

      // Create alert if health score is critical
      if (this.config.enableAutoAlerts && healthScore < this.config.healthScoreThreshold) {
        alertCreated = await this.createBuddyInterventionAlert(userId, healthSummary);
      }

      return {
        userId,
        success: true,
        healthScore,
        alertCreated,
        syncedAt,
      };

    } catch (error) {
      console.error(`[FinancialScheduler] Failed to process user ${userId}:`, error);
      return {
        userId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        syncedAt,
      };
    }
  }

  /**
   * Create a "Buddy Intervention Required" alert for critical users
   */
  private async createBuddyInterventionAlert(
    userId: string,
    healthSummary: Awaited<ReturnType<typeof budgetService.getFinancialHealthSummary>>
  ): Promise<boolean> {
    try {
      // Build alert message based on issues
      const issues: string[] = [];

      if (healthSummary.budget.monthlyUtilization > 90) {
        issues.push(`Budget ${healthSummary.budget.monthlyUtilization.toFixed(0)}% verbraucht`);
      }

      if (healthSummary.forecast?.projectedOverage && healthSummary.forecast.projectedOverage > 0) {
        issues.push(`Überschreitung von $${healthSummary.forecast.projectedOverage.toFixed(2)} prognostiziert`);
      }

      if (healthSummary.alerts.highSeverity > 0) {
        issues.push(`${healthSummary.alerts.highSeverity} kritische Warnungen`);
      }

      if (healthSummary.anomalies.critical > 0) {
        issues.push(`${healthSummary.anomalies.critical} Anomalien erkannt`);
      }

      const message = issues.length > 0
        ? `Buddy Intervention Required: ${issues.join(', ')}. Health Score: ${healthSummary.healthScore}/100`
        : `Buddy Intervention Required: Health Score kritisch (${healthSummary.healthScore}/100)`;

      // Create alert via BudgetService
      await budgetService.createAlert(userId, {
        alertType: 'buddy_intervention',
        severity: healthSummary.healthScore < 25 ? 'critical' : 'high',
        message,
        currentUsage: healthSummary.budget.currentMonthSpend,
        limit: healthSummary.budget.monthlyLimit,
        metadata: {
          healthScore: healthSummary.healthScore,
          status: healthSummary.status,
          recommendations: healthSummary.recommendations,
          triggeredBy: 'FinancialInsightScheduler',
          triggeredAt: new Date().toISOString(),
        },
      });

      console.log(`[FinancialScheduler] Created Buddy intervention alert for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`[FinancialScheduler] Failed to create alert for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================================
// SINGLETON EXPORT & AUTO-START
// =====================================================

export const financialInsightScheduler = FinancialInsightScheduler.getInstance();

/**
 * Initialize and start the scheduler
 * Call this from your server startup (e.g., server/index.ts)
 */
export function initializeFinancialScheduler(): void {
  // Only start in production or if explicitly enabled
  const shouldStart = process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_FINANCIAL_SCHEDULER === 'true';

  if (shouldStart) {
    financialInsightScheduler.start();
  } else {
    console.log('[FinancialScheduler] Skipped (not production or not enabled)');
  }
}
