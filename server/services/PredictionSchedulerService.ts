import { getDb } from '@/lib/db';
import { calendarEvents, contextPredictions } from '@/lib/db/schema-calendar';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { contextPredictorService } from './ContextPredictorService';
import { logger } from '../utils/logger';

/**
 * Background scheduler for predictive context generation
 *
 * Automatically predicts context for upcoming meetings:
 * - Checks every 15 minutes for meetings in next 60 minutes
 * - Generates context predictions
 * - Creates meeting briefings
 * - Marks events as processed
 */
export class PredictionSchedulerService {
  private static instance: PredictionSchedulerService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Configuration
  private readonly CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly PREDICTION_WINDOW_MINUTES = 60; // Predict for meetings in next 60 minutes

  private constructor() {}

  public static getInstance(): PredictionSchedulerService {
    if (!PredictionSchedulerService.instance) {
      PredictionSchedulerService.instance = new PredictionSchedulerService();
    }
    return PredictionSchedulerService.instance;
  }

  /**
   * Start the background scheduler
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('[PREDICTION_SCHEDULER] Already running');
      return;
    }

    logger.info('[PREDICTION_SCHEDULER] Starting prediction scheduler...');
    logger.info(`[PREDICTION_SCHEDULER] Check interval: ${this.CHECK_INTERVAL_MS / 60000} minutes`);
    logger.info(`[PREDICTION_SCHEDULER] Prediction window: ${this.PREDICTION_WINDOW_MINUTES} minutes ahead`);

    // Run immediately on start
    this.runPredictionCycle().catch((error) => {
      logger.error('[PREDICTION_SCHEDULER] Initial run failed:', error);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runPredictionCycle().catch((error) => {
        logger.error('[PREDICTION_SCHEDULER] Prediction cycle failed:', error);
      });
    }, this.CHECK_INTERVAL_MS);

    this.isRunning = true;
    logger.info('[PREDICTION_SCHEDULER] ✅ Scheduler started');
  }

  /**
   * Stop the background scheduler
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('[PREDICTION_SCHEDULER] ⏹️ Scheduler stopped');
  }

  /**
   * Main prediction cycle - runs periodically
   */
  private async runPredictionCycle(): Promise<void> {
    try {
      logger.info('[PREDICTION_SCHEDULER] 🔄 Running prediction cycle...');

      const db = getDb();
      const now = new Date();
      const futureWindow = new Date();
      futureWindow.setMinutes(futureWindow.getMinutes() + this.PREDICTION_WINDOW_MINUTES);

      // Find upcoming events in the next window that don't have predictions yet
      const upcomingEvents = await db
        .select({
          event: calendarEvents,
        })
        .from(calendarEvents)
        .leftJoin(
          contextPredictions,
          eq(contextPredictions.eventId, calendarEvents.id)
        )
        .where(
          and(
            gte(calendarEvents.startTime, now),
            lte(calendarEvents.startTime, futureWindow),
            eq(calendarEvents.status, 'confirmed'),
            isNull(contextPredictions.id) // Only events without predictions
          )
        );

      if (upcomingEvents.length === 0) {
        logger.info('[PREDICTION_SCHEDULER] ✅ No new events to process');
        return;
      }

      logger.info(`[PREDICTION_SCHEDULER] Found ${upcomingEvents.length} events to process`);

      let successCount = 0;
      let errorCount = 0;

      // Process each event
      for (const { event } of upcomingEvents) {
        try {
          logger.info(`[PREDICTION_SCHEDULER] Processing event: ${event.title} (${event.id})`);

          // Predict context for this event
          await contextPredictorService.predictContextForEvent(event.id, event.userId);

          // Generate briefing
          await contextPredictorService.generateBriefing(event.id, event.userId);

          successCount++;
          logger.info(`[PREDICTION_SCHEDULER] ✅ Processed event: ${event.title}`);
        } catch (error: any) {
          errorCount++;
          logger.error(`[PREDICTION_SCHEDULER] ❌ Failed to process event ${event.id}:`, error.message);
        }
      }

      logger.info(
        `[PREDICTION_SCHEDULER] 📊 Cycle complete: ${successCount} success, ${errorCount} errors`
      );
    } catch (error) {
      logger.error('[PREDICTION_SCHEDULER] Prediction cycle error:', error);
      throw error;
    }
  }

  /**
   * Manually trigger a prediction cycle (for testing/debugging)
   */
  public async triggerManualRun(): Promise<void> {
    logger.info('[PREDICTION_SCHEDULER] 🔧 Manual trigger requested');
    await this.runPredictionCycle();
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    checkIntervalMinutes: number;
    predictionWindowMinutes: number;
  } {
    return {
      isRunning: this.isRunning,
      checkIntervalMinutes: this.CHECK_INTERVAL_MS / 60000,
      predictionWindowMinutes: this.PREDICTION_WINDOW_MINUTES,
    };
  }
}

export const predictionScheduler = PredictionSchedulerService.getInstance();
