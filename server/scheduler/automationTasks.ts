import * as cron from 'node-cron';
import { logger } from '../utils/logger';

/**
 * Automated Task Scheduler for workflows
 */
export class AutomationScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all predefined scheduled tasks
   */
  startAllTasks() {
    logger.info('Starting automation scheduler tasks...');

    // Task 1: System Monitoring - every 15 minutes
    this.scheduleSystemMonitoring();

    // Task 2: Performance Report - daily at 08:00
    this.scheduleDailyPerformanceReport();

    // Task 3: Data Processing - every hour
    this.scheduleHourlyDataProcessing();

    logger.info(`${this.tasks.size} scheduled tasks started`);
  }

  /**
   * System Monitoring - every 15 minutes
   */
  private scheduleSystemMonitoring() {
    const task = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.info('Running scheduled system monitoring...');

        // Mock monitoring
        const result = {
          success: true,
          status: 'healthy',
          metrics: {
            cpu_usage: Math.random() * 40 + 20,
            memory_usage: Math.random() * 30 + 40,
            error_rate: Math.random() * 2
          },
          timestamp: new Date().toISOString()
        };

        logger.info('System monitoring completed:', result);
      } catch (error) {
        logger.error('Scheduled system monitoring error:', error);
      }
    });

    this.tasks.set('system_monitoring', task);
    logger.info('Scheduled: System Monitoring (every 15 minutes)');
  }

  /**
   * Performance Report - daily at 08:00
   */
  private scheduleDailyPerformanceReport() {
    const task = cron.schedule('0 8 * * *', async () => {
      try {
        logger.info('Running scheduled daily performance report...');

        // Mock report generation
        const result = {
          success: true,
          report_url: '/reports/daily-performance.pdf',
          timestamp: new Date().toISOString()
        };

        logger.info('Daily performance report completed:', result);
      } catch (error) {
        logger.error('Scheduled performance report error:', error);
      }
    });

    this.tasks.set('daily_report', task);
    logger.info('Scheduled: Daily Performance Report (08:00 daily)');
  }

  /**
   * Data Processing - every hour
   */
  private scheduleHourlyDataProcessing() {
    const task = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running scheduled hourly data processing...');

        // Mock data processing
        const result = {
          success: true,
          processed_records: Math.floor(Math.random() * 1000) + 500,
          timestamp: new Date().toISOString()
        };

        logger.info('Hourly data processing completed:', result);
      } catch (error) {
        logger.error('Scheduled data processing error:', error);
      }
    });

    this.tasks.set('hourly_processing', task);
    logger.info('Scheduled: Hourly Data Processing (every hour)');
  }

  /**
   * Add a custom scheduled task
   */
  addCustomTask(name: string, cronExpression: string, callback: () => Promise<void>) {
    if (this.tasks.has(name)) {
      logger.warn(`Task ${name} already exists. Stopping old task.`);
      this.tasks.get(name)?.stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        logger.info(`Running custom task: ${name}`);
        await callback();
        logger.info(`Custom task completed: ${name}`);
      } catch (error) {
        logger.error(`Custom task error (${name}):`, error);
      }
    });

    this.tasks.set(name, task);
    logger.info(`Custom task scheduled: ${name} (${cronExpression})`);
  }

  /**
   * Stop a specific task
   */
  stopTask(name: string) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info(`Task stopped: ${name}`);
      return true;
    }
    logger.warn(`Task not found: ${name}`);
    return false;
  }

  /**
   * Stop all tasks
   */
  stopAllTasks() {
    logger.info('Stopping all scheduled tasks...');
    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`Task stopped: ${name}`);
    });
    this.tasks.clear();
    logger.info('All scheduled tasks stopped');
  }

  /**
   * Get all active tasks
   */
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

// Singleton instance
export const automationScheduler = new AutomationScheduler();
