/**
 * WORKFLOW SCHEDULER SERVICE
 *
 * Handles scheduled workflow execution with cron expressions
 */

import { Job } from 'bullmq';
import { jobQueueService, WorkflowJobData } from './JobQueueService';
import { getDb } from '@/lib/db';
import { workflowExecutions, workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { WorkflowExecutionEngine } from './WorkflowExecutionEngine';

// ============================================================
// SCHEDULED WORKFLOW TYPES
// ============================================================

export interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  userId: string;
  cronExpression: string;
  inputs: Record<string, any>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
}

export interface ScheduleOptions {
  cronExpression: string; // e.g., "0 9 * * 1-5" (weekdays at 9am)
  inputs?: Record<string, any>;
  enabled?: boolean;
  maxRuns?: number;
}

// ============================================================
// WORKFLOW SCHEDULER SERVICE
// ============================================================

export class WorkflowSchedulerService {
  private executionEngine: WorkflowExecutionEngine;

  constructor() {
    this.executionEngine = new WorkflowExecutionEngine();
    this.initializeWorkflowQueue();
  }

  /**
   * Initialize workflow execution queue
   */
  private initializeWorkflowQueue(): void {
    jobQueueService.initializeQueue(
      'workflow_execution',
      this.processWorkflowJob.bind(this)
    );

    jobQueueService.initializeQueue(
      'scheduled_workflow',
      this.processScheduledWorkflowJob.bind(this)
    );

    console.log('[SCHEDULER] Workflow queues initialized');
  }

  /**
   * Process workflow execution job
   */
  private async processWorkflowJob(job: Job<WorkflowJobData>): Promise<any> {
    const { workflowId, userId, inputs } = job.data;

    console.log(`[SCHEDULER] Processing workflow job: ${job.id}`, {
      workflowId,
      userId,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Load workflow
      const db = getDb();
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId));

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      await job.updateProgress(20);

      // Create execution record
      const [execution] = await db
        .insert(workflowExecutions)
        .values({
          workflowId,
          userId,
          status: 'running',
          inputs,
          startedAt: new Date(),
          metadata: {
            jobId: job.id,
            scheduled: job.data.scheduled || false,
          },
        })
        .returning();

      await job.updateProgress(30);

      // Execute workflow
      console.log(`[SCHEDULER] Executing workflow: ${workflowId}`);

      const result = await this.executionEngine.execute(
        workflow,
        inputs,
        execution.id
      );

      await job.updateProgress(90);

      // Update execution record
      await db
        .update(workflowExecutions)
        .set({
          status: 'completed',
          outputs: result.outputs,
          completedAt: new Date(),
          logs: result.logs,
        })
        .where(eq(workflowExecutions.id, execution.id));

      await job.updateProgress(100);

      console.log(`[SCHEDULER] ✅ Workflow completed: ${workflowId}`);

      return {
        success: true,
        executionId: execution.id,
        outputs: result.outputs,
      };
    } catch (error: any) {
      console.error(`[SCHEDULER] ❌ Workflow failed: ${workflowId}`, error);

      // Update execution record with error
      const db = getDb();
      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId))
        .orderBy(workflowExecutions.createdAt)
        .limit(1);

      if (executions.length > 0) {
        await db
          .update(workflowExecutions)
          .set({
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, executions[0].id));
      }

      throw error;
    }
  }

  /**
   * Process scheduled workflow job (repeating)
   */
  private async processScheduledWorkflowJob(
    job: Job<WorkflowJobData>
  ): Promise<any> {
    console.log(`[SCHEDULER] Processing scheduled workflow: ${job.id}`);

    // Simply delegate to regular workflow processor
    return await this.processWorkflowJob(job);
  }

  /**
   * Execute workflow immediately (background)
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    inputs: Record<string, any> = {}
  ): Promise<{ jobId: string }> {
    console.log(`[SCHEDULER] Queueing workflow execution: ${workflowId}`);

    const job = await jobQueueService.addJob(
      'workflow_execution',
      `workflow_${workflowId}`,
      {
        workflowId,
        userId,
        inputs,
        scheduled: false,
      },
      {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    return { jobId: job.id! };
  }

  /**
   * Schedule workflow execution with cron
   */
  async scheduleWorkflow(
    workflowId: string,
    userId: string,
    options: ScheduleOptions
  ): Promise<{ jobId: string; scheduleName: string }> {
    const { cronExpression, inputs = {}, maxRuns } = options;

    console.log(`[SCHEDULER] Scheduling workflow: ${workflowId}`, {
      cron: cronExpression,
      maxRuns,
    });

    // Validate cron expression
    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const scheduleName = `scheduled_workflow_${workflowId}_${Date.now()}`;

    const job = await jobQueueService.addJob(
      'scheduled_workflow',
      scheduleName,
      {
        workflowId,
        userId,
        inputs,
        scheduled: true,
        cronExpression,
      },
      {
        priority: 3,
        repeat: {
          pattern: cronExpression,
          limit: maxRuns,
        },
        removeOnComplete: false, // Keep scheduled jobs
      }
    );

    console.log(`[SCHEDULER] ✅ Workflow scheduled: ${scheduleName}`);

    return {
      jobId: job.id!,
      scheduleName,
    };
  }

  /**
   * Cancel scheduled workflow
   */
  async cancelScheduledWorkflow(scheduleName: string): Promise<void> {
    console.log(`[SCHEDULER] Canceling scheduled workflow: ${scheduleName}`);

    // BullMQ handles this by job name
    const jobs = await jobQueueService.getJobs('scheduled_workflow', 'delayed');

    for (const job of jobs) {
      if (job.name === scheduleName) {
        await jobQueueService.removeJob('scheduled_workflow', job.id!);
        console.log(`[SCHEDULER] ✅ Scheduled workflow canceled: ${scheduleName}`);
      }
    }
  }

  /**
   * Get workflow job status
   */
  async getWorkflowJobStatus(
    jobId: string
  ): Promise<{
    id: string;
    state: string;
    progress: number;
    data: any;
    returnValue?: any;
    failedReason?: string;
  } | null> {
    const job =
      (await jobQueueService.getJob('workflow_execution', jobId)) ||
      (await jobQueueService.getJob('scheduled_workflow', jobId));

    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress as number;

    return {
      id: job.id!,
      state,
      progress: progress || 0,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get all scheduled workflows
   */
  async getScheduledWorkflows(): Promise<
    Array<{
      jobId: string;
      name: string;
      data: WorkflowJobData;
      nextRun?: number;
      cronExpression?: string;
    }>
  > {
    const jobs = await jobQueueService.getJobs('scheduled_workflow', 'delayed');

    return jobs.map((job) => ({
      jobId: job.id!,
      name: job.name!,
      data: job.data,
      nextRun: job.opts.repeat?.pattern ? job.processedOn : undefined,
      cronExpression: (job.data as WorkflowJobData).cronExpression,
    }));
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    workflow_execution: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    scheduled_workflow: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    const [workflowStats, scheduledStats] = await Promise.all([
      jobQueueService.getQueueStats('workflow_execution'),
      jobQueueService.getQueueStats('scheduled_workflow'),
    ]);

    return {
      workflow_execution: workflowStats,
      scheduled_workflow: scheduledStats,
    };
  }

  /**
   * Retry failed workflow job
   */
  async retryWorkflowJob(jobId: string): Promise<void> {
    console.log(`[SCHEDULER] Retrying workflow job: ${jobId}`);

    try {
      await jobQueueService.retryJob('workflow_execution', jobId);
    } catch {
      await jobQueueService.retryJob('scheduled_workflow', jobId);
    }
  }

  /**
   * Validate cron expression (simple validation)
   */
  private isValidCronExpression(expression: string): boolean {
    // Basic validation: should have 5 or 6 parts
    const parts = expression.trim().split(/\s+/);
    return parts.length === 5 || parts.length === 6;
  }

  /**
   * Get cron expression examples
   */
  getCronExamples(): Array<{ expression: string; description: string }> {
    return [
      { expression: '0 9 * * 1-5', description: 'Every weekday at 9:00 AM' },
      { expression: '0 0 * * *', description: 'Every day at midnight' },
      { expression: '0 */6 * * *', description: 'Every 6 hours' },
      { expression: '0 0 1 * *', description: 'First day of every month' },
      { expression: '0 0 * * 0', description: 'Every Sunday at midnight' },
      { expression: '*/15 * * * *', description: 'Every 15 minutes' },
      { expression: '0 12 * * 1', description: 'Every Monday at noon' },
    ];
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const workflowSchedulerService = new WorkflowSchedulerService();
