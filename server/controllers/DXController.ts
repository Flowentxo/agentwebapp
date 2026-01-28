/**
 * Developer Experience (DX) Controller
 *
 * Phase 6: Builder Experience Enhancement
 *
 * API endpoints for:
 * - Data Pinning: Pin/unpin node outputs for faster development
 * - Schema Discovery: Autocomplete variable suggestions
 * - Execution History: Structured logs with loop grouping
 * - Expression Bookmarks: Save/load common expressions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDataPinningService } from '../services/dx/DataPinningService';
import { getSchemaDiscoveryService } from '../services/dx/SchemaDiscoveryService';
import { getExecutionHistoryService } from '../services/dx/ExecutionHistoryService';
import { workflowExecutionEngineV3 } from '../services/WorkflowExecutionEngineV3';
import { getDb } from '@/lib/db';
import { expressionBookmarks } from '@/lib/db/schema-dx';
import { workflows } from '@/lib/db/schema-workflows';
import { eq, and, desc } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dx-controller');
const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require authenticated user
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId || req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  (req as any).userId = userId;
  next();
}

// ============================================================================
// DATA PINNING ENDPOINTS
// ============================================================================

/**
 * GET /dx/pins/:workflowId
 * List all pins for a workflow
 */
router.get('/pins/:workflowId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = (req as any).userId;

    const pins = await workflowExecutionEngineV3.listWorkflowPins(workflowId, userId);

    res.json({
      success: true,
      pins,
      count: pins.length,
    });
  } catch (error) {
    logger.error('Failed to list pins', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list pins',
    });
  }
});

/**
 * GET /dx/pins/:workflowId/:nodeId
 * Get pinned data for a specific node
 */
router.get('/pins/:workflowId/:nodeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId, nodeId } = req.params;
    const userId = (req as any).userId;

    const pin = await workflowExecutionEngineV3.getPinnedData(workflowId, nodeId, userId);

    if (!pin) {
      return res.status(404).json({
        success: false,
        error: 'Pin not found',
      });
    }

    res.json({
      success: true,
      pin,
    });
  } catch (error) {
    logger.error('Failed to get pin', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pin',
    });
  }
});

/**
 * POST /dx/pins/:workflowId/:nodeId
 * Create or update a pin for a node
 */
router.post('/pins/:workflowId/:nodeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId, nodeId } = req.params;
    const userId = (req as any).userId;
    const { output, mode, label, description, sourceExecutionId } = req.body;

    if (output === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Output data is required',
      });
    }

    await workflowExecutionEngineV3.pinNodeOutput(workflowId, nodeId, userId, output, {
      mode,
      label,
      description,
      sourceExecutionId,
    });

    const pin = await workflowExecutionEngineV3.getPinnedData(workflowId, nodeId, userId);

    res.json({
      success: true,
      message: 'Node output pinned successfully',
      pin,
    });
  } catch (error) {
    logger.error('Failed to create pin', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create pin',
    });
  }
});

/**
 * PATCH /dx/pins/:pinId
 * Update a pin's settings
 */
router.patch('/pins/:pinId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { pinId } = req.params;
    const { output, mode, isEnabled, label, description, tags } = req.body;

    const dataPinningService = getDataPinningService();
    const updated = await dataPinningService.updatePin(pinId, {
      output,
      mode,
      isEnabled,
      label,
      description,
      tags,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Pin not found',
      });
    }

    res.json({
      success: true,
      message: 'Pin updated successfully',
      pin: updated,
    });
  } catch (error) {
    logger.error('Failed to update pin', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update pin',
    });
  }
});

/**
 * DELETE /dx/pins/:pinId
 * Delete a pin
 */
router.delete('/pins/:pinId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { pinId } = req.params;

    const deleted = await workflowExecutionEngineV3.deletePin(pinId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Pin not found',
      });
    }

    res.json({
      success: true,
      message: 'Pin deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete pin', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete pin',
    });
  }
});

/**
 * POST /dx/pins/:workflowId/toggle
 * Enable/disable all pins for a workflow
 */
router.post('/pins/:workflowId/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { enabled } = req.body;
    const userId = (req as any).userId;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled (boolean) is required',
      });
    }

    const count = await workflowExecutionEngineV3.toggleWorkflowPins(workflowId, enabled, userId);

    res.json({
      success: true,
      message: `${count} pins ${enabled ? 'enabled' : 'disabled'}`,
      count,
    });
  } catch (error) {
    logger.error('Failed to toggle pins', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle pins',
    });
  }
});

/**
 * POST /dx/pins/:workflowId/:nodeId/from-execution
 * Pin node output from a specific execution
 */
router.post('/pins/:workflowId/:nodeId/from-execution', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId, nodeId } = req.params;
    const { executionId, mode, label } = req.body;
    const userId = (req as any).userId;

    if (!executionId) {
      return res.status(400).json({
        success: false,
        error: 'executionId is required',
      });
    }

    // Get the output from execution history
    const historyService = getExecutionHistoryService();
    const logs = await historyService.getExecutionLogs({
      executionId,
      nodeId,
      status: 'completed',
      limit: 1,
    });

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed execution found for this node',
      });
    }

    const output = logs[0].output;

    await workflowExecutionEngineV3.pinNodeOutput(workflowId, nodeId, userId, output, {
      mode: mode || 'development',
      label: label || `From execution ${executionId.substring(0, 8)}`,
      sourceExecutionId: executionId,
    });

    const pin = await workflowExecutionEngineV3.getPinnedData(workflowId, nodeId, userId);

    res.json({
      success: true,
      message: 'Node output pinned from execution',
      pin,
    });
  } catch (error) {
    logger.error('Failed to pin from execution', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pin from execution',
    });
  }
});

// ============================================================================
// SCHEMA DISCOVERY ENDPOINTS
// ============================================================================

/**
 * POST /dx/discover/:workflowId
 * Discover available variables for a node's expression editor
 */
router.post('/discover/:workflowId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { currentNodeId, nodes, edges, options } = req.body;
    const userId = (req as any).userId;

    if (!currentNodeId) {
      return res.status(400).json({
        success: false,
        error: 'currentNodeId is required',
      });
    }

    // If nodes/edges not provided, load from workflow
    let workflowNodes = nodes;
    let workflowEdges = edges;

    if (!workflowNodes || !workflowEdges) {
      const db = getDb();
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      workflowNodes = workflow.nodes;
      workflowEdges = workflow.edges;
    }

    const result = await workflowExecutionEngineV3.discoverVariables(
      workflowId,
      currentNodeId,
      userId,
      workflowNodes,
      workflowEdges,
      options
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to discover variables', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discover variables',
    });
  }
});

/**
 * POST /dx/discover/:workflowId/refresh
 * Force refresh schema cache for nodes
 */
router.post('/discover/:workflowId/refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { nodeIds } = req.body;

    const schemaService = getSchemaDiscoveryService();
    await schemaService.invalidateCache(workflowId, nodeIds);

    res.json({
      success: true,
      message: 'Schema cache invalidated',
    });
  } catch (error) {
    logger.error('Failed to refresh schema cache', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh cache',
    });
  }
});

// ============================================================================
// EXECUTION HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /dx/executions/:executionId/summary
 * Get execution summary
 */
router.get('/executions/:executionId/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    const summary = await workflowExecutionEngineV3.getExecutionSummary(executionId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get execution summary', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    });
  }
});

/**
 * GET /dx/executions/:executionId/loops
 * Get execution logs grouped by loop iterations
 */
router.get('/executions/:executionId/loops', requireAuth, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const { loopId } = req.query;

    const groups = await workflowExecutionEngineV3.getLoopExecutionGroups(
      executionId,
      loopId as string | undefined
    );

    res.json({
      success: true,
      groups,
      count: groups.length,
    });
  } catch (error) {
    logger.error('Failed to get loop groups', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get loop groups',
    });
  }
});

/**
 * GET /dx/executions/:executionId/loops/:loopId/summary
 * Get loop summary
 */
router.get('/executions/:executionId/loops/:loopId/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { executionId, loopId } = req.params;

    const summary = await workflowExecutionEngineV3.getLoopSummary(executionId, loopId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Loop not found',
      });
    }

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get loop summary', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get loop summary',
    });
  }
});

/**
 * GET /dx/executions/:executionId/logs
 * Get execution logs with filtering
 */
router.get('/executions/:executionId/logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const { nodeId, runIndex, batchIndex, loopId, status, limit, offset } = req.query;

    const historyService = getExecutionHistoryService();
    const logs = await historyService.getExecutionLogs({
      executionId,
      nodeId: nodeId as string | undefined,
      runIndex: runIndex ? parseInt(runIndex as string) : undefined,
      batchIndex: batchIndex ? parseInt(batchIndex as string) : undefined,
      loopId: loopId as string | undefined,
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error('Failed to get execution logs', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get logs',
    });
  }
});

/**
 * POST /dx/executions/compare
 * Compare two executions
 */
router.post('/executions/compare', requireAuth, async (req: Request, res: Response) => {
  try {
    const { executionId1, executionId2 } = req.body;

    if (!executionId1 || !executionId2) {
      return res.status(400).json({
        success: false,
        error: 'Both executionId1 and executionId2 are required',
      });
    }

    const comparison = await workflowExecutionEngineV3.compareExecutions(executionId1, executionId2);

    res.json({
      success: true,
      ...comparison,
    });
  } catch (error) {
    logger.error('Failed to compare executions', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare',
    });
  }
});

/**
 * GET /dx/nodes/:workflowId/:nodeId/history
 * Get execution history for a specific node
 */
router.get('/nodes/:workflowId/:nodeId/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workflowId, nodeId } = req.params;
    const { limit } = req.query;

    const historyService = getExecutionHistoryService();
    const logs = await historyService.getNodeExecutionHistory(
      workflowId,
      nodeId,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error('Failed to get node history', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get node history',
    });
  }
});

// ============================================================================
// EXPRESSION BOOKMARKS ENDPOINTS
// ============================================================================

/**
 * GET /dx/bookmarks
 * List expression bookmarks
 */
router.get('/bookmarks', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category, workspaceId } = req.query;

    const db = getDb();
    let query = db
      .select()
      .from(expressionBookmarks)
      .where(eq(expressionBookmarks.userId, userId))
      .orderBy(desc(expressionBookmarks.usageCount));

    // Add filters if provided
    if (category) {
      query = db
        .select()
        .from(expressionBookmarks)
        .where(
          and(
            eq(expressionBookmarks.userId, userId),
            eq(expressionBookmarks.category, category as string)
          )
        )
        .orderBy(desc(expressionBookmarks.usageCount));
    }

    const bookmarks = await query;

    res.json({
      success: true,
      bookmarks,
      count: bookmarks.length,
    });
  } catch (error) {
    logger.error('Failed to list bookmarks', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list bookmarks',
    });
  }
});

/**
 * POST /dx/bookmarks
 * Create an expression bookmark
 */
router.post('/bookmarks', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { expression, label, description, category, tags, workspaceId, isGlobal } = req.body;

    if (!expression || !label) {
      return res.status(400).json({
        success: false,
        error: 'expression and label are required',
      });
    }

    const db = getDb();
    const [bookmark] = await db
      .insert(expressionBookmarks)
      .values({
        userId,
        workspaceId,
        expression,
        label,
        description,
        category,
        tags: tags || [],
        isGlobal: isGlobal || false,
      })
      .returning();

    res.json({
      success: true,
      message: 'Bookmark created',
      bookmark,
    });
  } catch (error) {
    logger.error('Failed to create bookmark', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create bookmark',
    });
  }
});

/**
 * PATCH /dx/bookmarks/:bookmarkId
 * Update a bookmark
 */
router.patch('/bookmarks/:bookmarkId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = req.params;
    const { expression, label, description, category, tags } = req.body;

    const db = getDb();
    const [updated] = await db
      .update(expressionBookmarks)
      .set({
        expression,
        label,
        description,
        category,
        tags,
        updatedAt: new Date(),
      })
      .where(eq(expressionBookmarks.id, bookmarkId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Bookmark not found',
      });
    }

    res.json({
      success: true,
      bookmark: updated,
    });
  } catch (error) {
    logger.error('Failed to update bookmark', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bookmark',
    });
  }
});

/**
 * DELETE /dx/bookmarks/:bookmarkId
 * Delete a bookmark
 */
router.delete('/bookmarks/:bookmarkId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = req.params;

    const db = getDb();
    const result = await db
      .delete(expressionBookmarks)
      .where(eq(expressionBookmarks.id, bookmarkId))
      .returning({ id: expressionBookmarks.id });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bookmark not found',
      });
    }

    res.json({
      success: true,
      message: 'Bookmark deleted',
    });
  } catch (error) {
    logger.error('Failed to delete bookmark', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete bookmark',
    });
  }
});

/**
 * POST /dx/bookmarks/:bookmarkId/use
 * Record usage of a bookmark (for sorting by popularity)
 */
router.post('/bookmarks/:bookmarkId/use', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = req.params;

    const db = getDb();
    await db
      .update(expressionBookmarks)
      .set({
        usageCount: (await db.select().from(expressionBookmarks).where(eq(expressionBookmarks.id, bookmarkId)))[0]?.usageCount + 1 || 1,
        lastUsedAt: new Date(),
      })
      .where(eq(expressionBookmarks.id, bookmarkId));

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to record bookmark usage', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record usage',
    });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
export { router as dxRouter };
