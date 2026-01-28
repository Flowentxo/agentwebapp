/**
 * WORKFLOW EXECUTIONS API
 *
 * Endpoints for monitoring and managing workflow executions
 */

import { Router } from 'express';
import { getDb } from '@/lib/db';
import { workflowExecutions } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { workflowExecutionEngine } from '../services/WorkflowExecutionEngine';

const router = Router();

/**
 * GET /api/workflow-executions
 * Get all workflow executions with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    // Query parameters
    const {
      workflowId,
      status,
      limit = '50',
      offset = '0',
      startDate,
      endDate
    } = req.query;

    // Build query
    let query = db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.userId, userId));

    // Apply filters
    const conditions: any[] = [eq(workflowExecutions.userId, userId)];

    if (workflowId) {
      conditions.push(eq(workflowExecutions.workflowId, workflowId as string));
    }

    if (status) {
      conditions.push(eq(workflowExecutions.status, status as string));
    }

    if (startDate) {
      const start = new Date(startDate as string);
      conditions.push(gte(workflowExecutions.startedAt, start));
    }

    if (endDate) {
      const end = new Date(endDate as string);
      conditions.push(lte(workflowExecutions.startedAt, end));
    }

    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(and(...conditions))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowExecutions)
      .where(and(...conditions));

    res.json({
      executions,
      total: count,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

  } catch (error: any) {
    console.error('[EXECUTIONS_GET]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflow-executions/:executionId
 * Get detailed execution information
 */
router.get('/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const db = getDb();

    // Try to get from active executions first (live data)
    const activeExecution = workflowExecutionEngine.getExecution(executionId);
    if (activeExecution) {
      return res.json({
        execution: activeExecution,
        isLive: true
      });
    }

    // Get from database
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      execution,
      isLive: false
    });

  } catch (error: any) {
    console.error('[EXECUTION_GET]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflow-executions/:executionId/logs
 * Get execution logs
 */
router.get('/:executionId/logs', async (req, res) => {
  try {
    const { executionId } = req.params;

    // Try to get from active executions first
    const activeExecution = workflowExecutionEngine.getExecution(executionId);
    if (activeExecution) {
      return res.json({
        logs: activeExecution.logs,
        isLive: true
      });
    }

    // Get from database
    const db = getDb();
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      logs: execution.logs || [],
      isLive: false
    });

  } catch (error: any) {
    console.error('[EXECUTION_LOGS]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflow-executions/:executionId/stream
 * Server-Sent Events stream for live execution updates
 */
router.get('/:executionId/stream', async (req, res) => {
  try {
    const { executionId } = req.params;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', executionId })}\n\n`);

    // Check if execution exists
    const execution = workflowExecutionEngine.getExecution(executionId);
    if (!execution) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Execution not found' })}\n\n`);
      res.end();
      return;
    }

    // Send current state
    res.write(`data: ${JSON.stringify({
      type: 'update',
      execution: {
        status: execution.status,
        currentNodeId: execution.currentNodeId,
        logs: execution.logs.slice(-10) // Last 10 logs
      }
    })}\n\n`);

    // Set up polling interval
    const interval = setInterval(() => {
      const currentExecution = workflowExecutionEngine.getExecution(executionId);

      if (!currentExecution) {
        res.write(`data: ${JSON.stringify({ type: 'completed' })}\n\n`);
        clearInterval(interval);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify({
        type: 'update',
        execution: {
          status: currentExecution.status,
          currentNodeId: currentExecution.currentNodeId,
          logs: currentExecution.logs.slice(-10)
        }
      })}\n\n`);

      // End stream if execution is done
      if (currentExecution.status === 'success' || currentExecution.status === 'error') {
        res.write(`data: ${JSON.stringify({
          type: 'finished',
          status: currentExecution.status,
          error: currentExecution.error
        })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, 1000); // Poll every second

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (error: any) {
    console.error('[EXECUTION_STREAM]', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/workflow-executions/stats/summary
 * Get execution statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { timeRange = '7d' } = req.query;

    // Calculate time range
    const now = new Date();
    const startDate = new Date(now);

    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get statistics
    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.userId, userId),
          gte(workflowExecutions.startedAt, startDate)
        )
      );

    const stats = {
      total: executions.length,
      success: executions.filter(e => e.status === 'success').length,
      error: executions.filter(e => e.status === 'error').length,
      running: executions.filter(e => e.status === 'running').length,
      avgDuration: executions
        .filter(e => e.completedAt && e.startedAt)
        .reduce((acc, e) => {
          const duration = new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime();
          return acc + duration;
        }, 0) / (executions.filter(e => e.completedAt).length || 1),
      successRate: executions.length > 0
        ? (executions.filter(e => e.status === 'success').length / executions.length) * 100
        : 0
    };

    res.json(stats);

  } catch (error: any) {
    console.error('[EXECUTION_STATS]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflow-executions/:executionId/cancel
 * Cancel a running execution
 */
router.post('/:executionId/cancel', async (req, res) => {
  try {
    const { executionId } = req.params;

    // Try to cancel active execution
    const cancelled = workflowExecutionEngine.cancelExecution(executionId);

    if (!cancelled) {
      return res.status(404).json({ error: 'Execution not found or already completed' });
    }

    res.json({
      success: true,
      message: 'Execution cancelled successfully'
    });

  } catch (error: any) {
    console.error('[EXECUTION_CANCEL]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
