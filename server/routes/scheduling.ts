/**
 * WORKFLOW SCHEDULING API ROUTES
 *
 * Endpoints for scheduling workflow execution with cron
 */

import { Router, Request, Response } from 'express';
import { workflowSchedulerService } from '../services/WorkflowSchedulerService';

const router = Router();

// ============================================================
// WORKFLOW EXECUTION ENDPOINTS
// ============================================================

/**
 * POST /api/scheduling/execute
 * Execute workflow immediately (background)
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { workflowId, inputs = {} } = req.body;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId is required',
      });
    }

    console.log(`[SCHEDULING_API] Executing workflow: ${workflowId}`);

    const result = await workflowSchedulerService.executeWorkflow(
      workflowId,
      userId,
      inputs
    );

    res.json({
      success: true,
      jobId: result.jobId,
      message: 'Workflow execution queued',
    });
  } catch (error: any) {
    console.error('[SCHEDULING_API] Failed to execute workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/scheduling/schedule
 * Schedule workflow with cron expression
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { workflowId, cronExpression, inputs = {}, maxRuns } = req.body;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId is required',
      });
    }

    if (!cronExpression) {
      return res.status(400).json({
        success: false,
        error: 'cronExpression is required',
      });
    }

    console.log(`[SCHEDULING_API] Scheduling workflow: ${workflowId}`, {
      cron: cronExpression,
      maxRuns,
    });

    const result = await workflowSchedulerService.scheduleWorkflow(
      workflowId,
      userId,
      {
        cronExpression,
        inputs,
        maxRuns,
      }
    );

    res.json({
      success: true,
      jobId: result.jobId,
      scheduleName: result.scheduleName,
      message: 'Workflow scheduled successfully',
    });
  } catch (error: any) {
    console.error('[SCHEDULING_API] Failed to schedule workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scheduling/schedules
 * Get all scheduled workflows
 */
router.get('/schedules', async (req: Request, res: Response) => {
  try {
    const schedules = await workflowSchedulerService.getScheduledWorkflows();

    res.json({
      success: true,
      schedules,
      count: schedules.length,
    });
  } catch (error: any) {
    console.error('[SCHEDULING_API] Failed to get schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/scheduling/schedules/:scheduleName
 * Cancel scheduled workflow
 */
router.delete('/schedules/:scheduleName', async (req: Request, res: Response) => {
  try {
    const { scheduleName } = req.params;

    await workflowSchedulerService.cancelScheduledWorkflow(scheduleName);

    res.json({
      success: true,
      message: 'Scheduled workflow canceled',
    });
  } catch (error: any) {
    console.error('[SCHEDULING_API] Failed to cancel schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scheduling/job/:jobId
 * Get workflow job status
 */
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const status = await workflowSchedulerService.getWorkflowJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      job: status,
    });
  } catch (error: any) {
    console.error('[SCHEDULING_API] Failed to get job status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/scheduling/job/:jobId/retry
 * Retry failed workflow job
 */
router.post('/job/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    await workflowSchedulerService.retryWorkflowJob(jobId);

    res.json({
      success: true,
      message: 'Workflow job queued for retry',
    });
  } catch (error: any) {
    console.error('[SCHEDULING_API] Failed to retry job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scheduling/cron-examples
 * Get cron expression examples
 */
router.get('/cron-examples', (req: Request, res: Response) => {
  const examples = workflowSchedulerService.getCronExamples();

  res.json({
    success: true,
    examples,
  });
});

export default router;
