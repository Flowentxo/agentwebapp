/**
 * PHASE 66-70: Task Scheduler
 * Cron-based task scheduling and job management
 */

import { publishAgentEvent } from '@/lib/events/EventBus';

// ============================================
// TYPES
// ============================================

export interface ScheduledTask {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  type: TaskType;
  schedule: TaskSchedule;
  payload: Record<string, unknown>;
  status: 'active' | 'paused' | 'completed' | 'failed';
  retryPolicy: RetryPolicy;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    failureCount: number;
  };
}

export type TaskType =
  | 'workflow'
  | 'agent'
  | 'webhook'
  | 'email'
  | 'report'
  | 'sync'
  | 'cleanup'
  | 'notification'
  | 'custom';

export interface TaskSchedule {
  type: 'cron' | 'interval' | 'once' | 'event';
  cron?: string;
  interval?: number;
  datetime?: Date;
  timezone?: string;
  eventType?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  retryOn?: string[];
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  retryCount: number;
  duration?: number;
  logs: TaskLog[];
}

export interface TaskLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface CronParseResult {
  valid: boolean;
  error?: string;
  nextRuns?: Date[];
  description?: string;
}

export interface TaskStats {
  total: number;
  active: number;
  paused: number;
  executions: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
  upcomingTasks: Array<{
    id: string;
    name: string;
    nextRun: Date;
  }>;
}

// ============================================
// CRON PARSER
// ============================================

class CronParser {
  private static FIELDS = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

  /**
   * Parse cron expression
   */
  public static parse(expression: string): CronParseResult {
    const parts = expression.trim().split(/\s+/);

    if (parts.length !== 5) {
      return {
        valid: false,
        error: `Invalid cron expression: expected 5 fields, got ${parts.length}`,
      };
    }

    try {
      const nextRuns = this.getNextRuns(expression, 5);
      const description = this.describe(expression);

      return {
        valid: true,
        nextRuns,
        description,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid cron expression',
      };
    }
  }

  /**
   * Get next N run times
   */
  public static getNextRuns(expression: string, count: number = 5): Date[] {
    const runs: Date[] = [];
    let current = new Date();

    for (let i = 0; i < count * 100 && runs.length < count; i++) {
      current = new Date(current.getTime() + 60000); // Add 1 minute

      if (this.matches(expression, current)) {
        runs.push(new Date(current));
      }
    }

    return runs;
  }

  /**
   * Check if date matches cron expression
   */
  public static matches(expression: string, date: Date): boolean {
    const parts = expression.split(/\s+/);
    if (parts.length !== 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    return (
      this.matchField(minute, date.getMinutes(), 0, 59) &&
      this.matchField(hour, date.getHours(), 0, 23) &&
      this.matchField(dayOfMonth, date.getDate(), 1, 31) &&
      this.matchField(month, date.getMonth() + 1, 1, 12) &&
      this.matchField(dayOfWeek, date.getDay(), 0, 6)
    );
  }

  /**
   * Match single field
   */
  private static matchField(
    field: string,
    value: number,
    min: number,
    max: number
  ): boolean {
    // Wildcard
    if (field === '*') return true;

    // List (e.g., "1,2,3")
    if (field.includes(',')) {
      return field.split(',').some((f) => this.matchField(f, value, min, max));
    }

    // Range (e.g., "1-5")
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return value >= start && value <= end;
    }

    // Step (e.g., "*/5")
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = parseInt(step);
      if (range === '*') {
        return value % stepNum === 0;
      }
      const [start] = range.split('-').map(Number);
      return value >= start && (value - start) % stepNum === 0;
    }

    // Exact match
    return parseInt(field) === value;
  }

  /**
   * Generate human-readable description
   */
  public static describe(expression: string): string {
    const parts = expression.split(/\s+/);
    if (parts.length !== 5) return 'Invalid expression';

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const descriptions: string[] = [];

    // Common patterns
    if (expression === '* * * * *') return 'Every minute';
    if (expression === '0 * * * *') return 'Every hour';
    if (expression === '0 0 * * *') return 'Every day at midnight';
    if (expression === '0 0 * * 0') return 'Every Sunday at midnight';
    if (expression === '0 0 1 * *') return 'First day of every month at midnight';

    // Time description
    if (minute !== '*' && hour !== '*') {
      descriptions.push(`At ${hour}:${minute.padStart(2, '0')}`);
    } else if (minute.startsWith('*/')) {
      descriptions.push(`Every ${minute.slice(2)} minutes`);
    } else if (hour.startsWith('*/')) {
      descriptions.push(`Every ${hour.slice(2)} hours`);
    }

    // Day of week
    if (dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (dayOfWeek.includes('-')) {
        const [start, end] = dayOfWeek.split('-').map(Number);
        descriptions.push(`${days[start]} through ${days[end]}`);
      } else if (dayOfWeek.includes(',')) {
        const dayNames = dayOfWeek.split(',').map((d) => days[parseInt(d)]);
        descriptions.push(`on ${dayNames.join(', ')}`);
      } else {
        descriptions.push(`on ${days[parseInt(dayOfWeek)]}`);
      }
    }

    // Day of month
    if (dayOfMonth !== '*') {
      descriptions.push(`on day ${dayOfMonth} of the month`);
    }

    // Month
    if (month !== '*') {
      const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
      if (month.includes(',')) {
        const monthNames = month.split(',').map((m) => months[parseInt(m)]);
        descriptions.push(`in ${monthNames.join(', ')}`);
      } else {
        descriptions.push(`in ${months[parseInt(month)]}`);
      }
    }

    return descriptions.join(' ') || 'Custom schedule';
  }
}

// ============================================
// TASK SCHEDULER CLASS
// ============================================

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private executions: Map<string, TaskExecution[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.loadDemoTasks();
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  /**
   * Create a new scheduled task
   */
  public createTask(
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      type: TaskType;
      schedule: TaskSchedule;
      payload?: Record<string, unknown>;
      retryPolicy?: Partial<RetryPolicy>;
      createdBy: string;
    }
  ): ScheduledTask {
    // Validate schedule
    if (data.schedule.type === 'cron' && data.schedule.cron) {
      const parseResult = CronParser.parse(data.schedule.cron);
      if (!parseResult.valid) {
        throw new Error(`Invalid cron expression: ${parseResult.error}`);
      }
    }

    const task: ScheduledTask = {
      id: `task-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      name: data.name,
      description: data.description || '',
      type: data.type,
      schedule: data.schedule,
      payload: data.payload || {},
      status: 'active',
      retryPolicy: {
        maxRetries: data.retryPolicy?.maxRetries || 3,
        backoffType: data.retryPolicy?.backoffType || 'exponential',
        initialDelay: data.retryPolicy?.initialDelay || 1000,
        maxDelay: data.retryPolicy?.maxDelay || 60000,
      },
      metadata: {
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        nextRun: this.calculateNextRun(data.schedule),
        runCount: 0,
        failureCount: 0,
      },
    };

    this.tasks.set(task.id, task);
    this.executions.set(task.id, []);

    // Schedule if active
    if (task.status === 'active') {
      this.scheduleTask(task);
    }

    return task;
  }

  /**
   * Update task
   */
  public updateTask(
    taskId: string,
    updates: Partial<Pick<ScheduledTask, 'name' | 'description' | 'schedule' | 'payload' | 'retryPolicy'>>
  ): ScheduledTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // Validate new schedule if provided
    if (updates.schedule?.type === 'cron' && updates.schedule.cron) {
      const parseResult = CronParser.parse(updates.schedule.cron);
      if (!parseResult.valid) {
        throw new Error(`Invalid cron expression: ${parseResult.error}`);
      }
    }

    const updatedTask: ScheduledTask = {
      ...task,
      ...updates,
      metadata: {
        ...task.metadata,
        updatedAt: new Date(),
        nextRun: updates.schedule
          ? this.calculateNextRun(updates.schedule)
          : task.metadata.nextRun,
      },
    };

    this.tasks.set(taskId, updatedTask);

    // Reschedule
    this.cancelTimer(taskId);
    if (updatedTask.status === 'active') {
      this.scheduleTask(updatedTask);
    }

    return updatedTask;
  }

  /**
   * Delete task
   */
  public deleteTask(taskId: string): boolean {
    this.cancelTimer(taskId);
    this.executions.delete(taskId);
    return this.tasks.delete(taskId);
  }

  /**
   * Pause task
   */
  public pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'paused';
    task.metadata.updatedAt = new Date();
    this.cancelTimer(taskId);

    return true;
  }

  /**
   * Resume task
   */
  public resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'active';
    task.metadata.updatedAt = new Date();
    task.metadata.nextRun = this.calculateNextRun(task.schedule);
    this.scheduleTask(task);

    return true;
  }

  /**
   * Get task
   */
  public getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * List tasks
   */
  public listTasks(
    workspaceId: string,
    options?: {
      type?: TaskType;
      status?: ScheduledTask['status'];
    }
  ): ScheduledTask[] {
    let tasks = Array.from(this.tasks.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    if (options?.type) {
      tasks = tasks.filter((t) => t.type === options.type);
    }

    if (options?.status) {
      tasks = tasks.filter((t) => t.status === options.status);
    }

    return tasks.sort((a, b) => {
      const nextA = a.metadata.nextRun?.getTime() || Infinity;
      const nextB = b.metadata.nextRun?.getTime() || Infinity;
      return nextA - nextB;
    });
  }

  // ============================================
  // EXECUTION
  // ============================================

  /**
   * Run task immediately
   */
  public async runTaskNow(taskId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    return this.executeTask(task);
  }

  /**
   * Get task executions
   */
  public getExecutions(taskId: string, limit: number = 20): TaskExecution[] {
    const executions = this.executions.get(taskId) || [];
    return executions.slice(-limit);
  }

  /**
   * Get upcoming task runs
   */
  public getUpcomingRuns(
    workspaceId: string,
    hours: number = 24
  ): Array<{ task: ScheduledTask; nextRun: Date }> {
    const cutoff = new Date(Date.now() + hours * 60 * 60 * 1000);
    const upcoming: Array<{ task: ScheduledTask; nextRun: Date }> = [];

    for (const task of this.tasks.values()) {
      if (task.workspaceId !== workspaceId) continue;
      if (task.status !== 'active') continue;
      if (!task.metadata.nextRun) continue;
      if (task.metadata.nextRun > cutoff) continue;

      upcoming.push({ task, nextRun: task.metadata.nextRun });
    }

    return upcoming.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());
  }

  // ============================================
  // CRON UTILITIES
  // ============================================

  /**
   * Parse cron expression
   */
  public parseCron(expression: string): CronParseResult {
    return CronParser.parse(expression);
  }

  /**
   * Validate cron expression
   */
  public validateCron(expression: string): boolean {
    return CronParser.parse(expression).valid;
  }

  /**
   * Get next run times for cron
   */
  public getNextCronRuns(expression: string, count: number = 5): Date[] {
    return CronParser.getNextRuns(expression, count);
  }

  /**
   * Describe cron expression
   */
  public describeCron(expression: string): string {
    return CronParser.describe(expression);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get task statistics
   */
  public getStats(workspaceId: string): TaskStats {
    const tasks = this.listTasks(workspaceId);
    const activeTasks = tasks.filter((t) => t.status === 'active');
    const pausedTasks = tasks.filter((t) => t.status === 'paused');

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalDuration = 0;

    for (const task of tasks) {
      const executions = this.executions.get(task.id) || [];
      totalExecutions += executions.length;
      successfulExecutions += executions.filter((e) => e.status === 'completed').length;
      failedExecutions += executions.filter((e) => e.status === 'failed').length;
      totalDuration += executions.reduce((sum, e) => sum + (e.duration || 0), 0);
    }

    const upcomingTasks = activeTasks
      .filter((t) => t.metadata.nextRun)
      .sort((a, b) => a.metadata.nextRun!.getTime() - b.metadata.nextRun!.getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.name,
        nextRun: t.metadata.nextRun!,
      }));

    return {
      total: tasks.length,
      active: activeTasks.length,
      paused: pausedTasks.length,
      executions: {
        total: totalExecutions,
        successful: successfulExecutions,
        failed: failedExecutions,
        avgDuration: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
      },
      upcomingTasks,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private scheduleTask(task: ScheduledTask): void {
    if (!task.metadata.nextRun) return;

    const delay = task.metadata.nextRun.getTime() - Date.now();
    if (delay < 0) {
      // Already past, schedule for next occurrence
      task.metadata.nextRun = this.calculateNextRun(task.schedule);
      if (!task.metadata.nextRun) return;
    }

    // For demo, use setTimeout (in production, use a proper job scheduler)
    const timer = setTimeout(async () => {
      await this.executeTask(task);

      // Schedule next run for recurring tasks
      if (task.schedule.type !== 'once') {
        task.metadata.nextRun = this.calculateNextRun(task.schedule);
        this.scheduleTask(task);
      } else {
        task.status = 'completed';
      }
    }, Math.min(delay, 2147483647)); // Max setTimeout delay

    this.timers.set(task.id, timer);
  }

  private cancelTimer(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  private async executeTask(task: ScheduledTask): Promise<TaskExecution> {
    const execution: TaskExecution = {
      id: `exec-${crypto.randomUUID().slice(0, 8)}`,
      taskId: task.id,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: `Starting task execution: ${task.name}`,
        },
      ],
    };

    // Store execution
    const taskExecutions = this.executions.get(task.id) || [];
    taskExecutions.push(execution);
    this.executions.set(task.id, taskExecutions);

    try {
      // Execute based on type
      const result = await this.runTaskHandler(task);

      execution.status = 'completed';
      execution.result = result;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt!.getTime();

      execution.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Task completed successfully',
        data: { duration: execution.duration },
      });

      task.metadata.runCount++;
      task.metadata.lastRun = new Date();

      await publishAgentEvent(
        'task.completed',
        { agentId: 'aura', workspaceId: task.workspaceId },
        { taskId: task.id, executionId: execution.id }
      );
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Task failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt!.getTime();

      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Task failed: ${execution.error}`,
      });

      task.metadata.failureCount++;
      task.metadata.lastRun = new Date();

      // Retry logic
      if (execution.retryCount < task.retryPolicy.maxRetries) {
        const delay = this.calculateRetryDelay(task.retryPolicy, execution.retryCount);
        execution.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Scheduling retry in ${delay}ms`,
        });

        setTimeout(() => {
          execution.retryCount++;
          this.executeTask(task);
        }, delay);
      }
    }

    return execution;
  }

  private async runTaskHandler(task: ScheduledTask): Promise<unknown> {
    // Simulate task execution
    await this.delay(100 + Math.random() * 400);

    switch (task.type) {
      case 'workflow':
        return { workflowExecuted: true, workflowId: task.payload.workflowId };
      case 'agent':
        return { agentCalled: true, agentId: task.payload.agentId };
      case 'webhook':
        return { webhookCalled: true, url: task.payload.url, status: 200 };
      case 'email':
        return { emailSent: true, to: task.payload.to };
      case 'report':
        return { reportGenerated: true, type: task.payload.reportType };
      case 'sync':
        return { syncCompleted: true, records: Math.floor(Math.random() * 100) };
      case 'cleanup':
        return { cleanupDone: true, itemsRemoved: Math.floor(Math.random() * 50) };
      case 'notification':
        return { notificationSent: true, channel: task.payload.channel };
      default:
        return { executed: true, type: task.type };
    }
  }

  private calculateNextRun(schedule: TaskSchedule): Date | undefined {
    switch (schedule.type) {
      case 'cron':
        if (!schedule.cron) return undefined;
        const nextRuns = CronParser.getNextRuns(schedule.cron, 1);
        return nextRuns[0];

      case 'interval':
        if (!schedule.interval) return undefined;
        return new Date(Date.now() + schedule.interval);

      case 'once':
        return schedule.datetime;

      case 'event':
        return undefined; // Event-triggered, no scheduled time

      default:
        return undefined;
    }
  }

  private calculateRetryDelay(policy: RetryPolicy, retryCount: number): number {
    let delay: number;

    switch (policy.backoffType) {
      case 'fixed':
        delay = policy.initialDelay;
        break;
      case 'linear':
        delay = policy.initialDelay * (retryCount + 1);
        break;
      case 'exponential':
        delay = policy.initialDelay * Math.pow(2, retryCount);
        break;
      default:
        delay = policy.initialDelay;
    }

    return Math.min(delay, policy.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private loadDemoTasks(): void {
    // Load demo tasks
    const demoTasks = [
      {
        name: 'Daily Report Generation',
        description: 'Generate daily sales report',
        type: 'report' as TaskType,
        schedule: { type: 'cron' as const, cron: '0 8 * * *' },
        payload: { reportType: 'daily_sales' },
        workspaceId: 'default',
        createdBy: 'system',
      },
      {
        name: 'Hourly Data Sync',
        description: 'Sync data from CRM',
        type: 'sync' as TaskType,
        schedule: { type: 'cron' as const, cron: '0 * * * *' },
        payload: { source: 'crm' },
        workspaceId: 'default',
        createdBy: 'system',
      },
      {
        name: 'Weekly Cleanup',
        description: 'Clean up old temporary files',
        type: 'cleanup' as TaskType,
        schedule: { type: 'cron' as const, cron: '0 2 * * 0' },
        payload: { olderThan: 7 },
        workspaceId: 'default',
        createdBy: 'system',
      },
    ];

    for (const taskData of demoTasks) {
      try {
        this.createTask(taskData.workspaceId, taskData);
      } catch {
        // Ignore errors for demo data
      }
    }
  }
}

// Export singleton
export const taskScheduler = new TaskScheduler();
