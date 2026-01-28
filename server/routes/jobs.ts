/**
 * JOB MANAGEMENT API ROUTES
 *
 * Endpoints for job queue monitoring and management
 */

import { Router, Request, Response } from 'express';
import { jobQueueService, JobType } from '../services/JobQueueService';
import { workflowSchedulerService } from '../services/WorkflowSchedulerService';

const router = Router();

// ============================================================
// JOB QUEUE ENDPOINTS
// ============================================================

/**
 * GET /api/jobs/stats
 * Get statistics for all job queues
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await workflowSchedulerService.getQueueStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/jobs/:jobType/:jobId
 * Get specific job status
 */
router.get('/:jobType/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobType, jobId } = req.params;

    const job = await jobQueueService.getJob(jobType as JobType, jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const state = await job.getState();
    const progress = job.progress as number;

    res.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        state,
        progress: progress || 0,
        data: job.data,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade,
      },
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to get job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/jobs/:jobType
 * Get all jobs for a specific queue
 */
router.get('/:jobType', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    const { state = 'active' } = req.query;

    const jobs = await jobQueueService.getJobs(
      jobType as JobType,
      state as 'completed' | 'failed' | 'delayed' | 'active' | 'waiting'
    );

    const jobList = await Promise.all(
      jobs.map(async (job) => {
        const jobState = await job.getState();
        return {
          id: job.id,
          name: job.name,
          state: jobState,
          progress: job.progress || 0,
          data: job.data,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
        };
      })
    );

    res.json({
      success: true,
      jobs: jobList,
      count: jobList.length,
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to get jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/jobs/:jobType/:jobId/retry
 * Retry a failed job
 */
router.post('/:jobType/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const { jobType, jobId } = req.params;

    await jobQueueService.retryJob(jobType as JobType, jobId);

    res.json({
      success: true,
      message: 'Job queued for retry',
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to retry job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/jobs/:jobType/:jobId
 * Remove a job from the queue
 */
router.delete('/:jobType/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobType, jobId } = req.params;

    await jobQueueService.removeJob(jobType as JobType, jobId);

    res.json({
      success: true,
      message: 'Job removed',
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to remove job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/jobs/:jobType/pause
 * Pause queue processing
 */
router.post('/:jobType/pause', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;

    await jobQueueService.pauseQueue(jobType as JobType);

    res.json({
      success: true,
      message: `Queue paused: ${jobType}`,
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to pause queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/jobs/:jobType/resume
 * Resume queue processing
 */
router.post('/:jobType/resume', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;

    await jobQueueService.resumeQueue(jobType as JobType);

    res.json({
      success: true,
      message: `Queue resumed: ${jobType}`,
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to resume queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/jobs/:jobType/clean
 * Clean old jobs from queue
 */
router.post('/:jobType/clean', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    const { grace = 3600000, limit = 1000 } = req.body;

    await jobQueueService.cleanQueue(
      jobType as JobType,
      parseInt(grace),
      parseInt(limit)
    );

    res.json({
      success: true,
      message: 'Queue cleaned',
    });
  } catch (error: any) {
    console.error('[JOBS_API] Failed to clean queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
