/**
 * AGENT STUDIO WORKFLOWS - API ROUTES
 *
 * Backend API for workflow management, templates, and execution
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../../lib/db/connection';
import { workflows, workflowVersions, workflowExecutions } from '../../lib/db/schema-workflows';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { workflowExecutionEngine } from '../services/WorkflowExecutionEngine';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  visibility: z.enum(['private', 'team', 'public']).default('private'),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  visibility: z.enum(['private', 'team', 'public']).optional(),
});

const executeWorkflowSchema = z.object({
  input: z.any(),
  isTest: z.boolean().default(true),
});

// ========================================
// MIDDLEWARE
// ========================================

/**
 * Extract user ID from request
 */
function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'default-user';
}

/**
 * Extract workspace ID from request
 */
function getWorkspaceId(req: Request): string | undefined {
  return req.headers['x-workspace-id'] as string || undefined;
}

// ========================================
// ROUTES
// ========================================

/**
 * GET /api/workflows
 *
 * List all workflows (user's + public templates)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    const { status, isTemplate, category, search, limit = '50', offset = '0' } = req.query;

    const db = getDb();

    // Build query conditions
    const conditions = [];

    // User's own workflows OR public templates
    conditions.push(
      or(
        eq(workflows.userId, userId),
        eq(workflows.visibility, 'public')
      )
    );

    // Optional filters
    if (status) {
      conditions.push(eq(workflows.status, status as any));
    }

    if (isTemplate === 'true') {
      conditions.push(eq(workflows.isTemplate, true));
    }

    if (category) {
      conditions.push(eq(workflows.templateCategory, category as any));
    }

    // Execute query
    let query = db
      .select()
      .from(workflows)
      .where(and(...conditions))
      .orderBy(desc(workflows.updatedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const results = await query;

    // Optional text search (post-processing)
    let filteredResults = results;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredResults = results.filter(w =>
        w.name.toLowerCase().includes(searchLower) ||
        w.description?.toLowerCase().includes(searchLower) ||
        w.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      workflows: filteredResults,
      total: filteredResults.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_LIST]', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/workflows/templates
 *
 * Get public templates only (DB + Hardcoded CRM Templates)
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const db = getDb();

    // 1. Get DB templates
    const conditions = [
      eq(workflows.isTemplate, true),
      eq(workflows.visibility, 'public'),
      eq(workflows.status, 'active'),
    ];

    if (category) {
      conditions.push(eq(workflows.templateCategory, category as any));
    }

    const dbTemplates = await db
      .select()
      .from(workflows)
      .where(and(...conditions))
      .orderBy(desc(workflows.createdAt));

    // 2. Load hardcoded templates from lib/studio/template-library.ts
    const { WORKFLOW_TEMPLATES } = await import('../../lib/studio/template-library');

    // Convert hardcoded templates to Workflow format
    const hardcodedTemplates = WORKFLOW_TEMPLATES
      .filter(t => !category || t.category === category)
      .map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        status: 'active' as const,
        visibility: 'public' as const,
        isTemplate: true,
        templateCategory: template.category,
        tags: template.tags || [],
        userId: 'system',
        workspaceId: undefined,
        version: template.version || '1.0.0',
        parentWorkflowId: undefined,
        executionCount: template.downloads || 0,
        lastExecutedAt: undefined,
        createdAt: new Date(template.createdAt).toISOString(),
        updatedAt: new Date(template.updatedAt).toISOString(),
        publishedAt: new Date(template.createdAt).toISOString(),
      }));

    // 3. Combine & return
    const allTemplates = [...hardcodedTemplates, ...dbTemplates];

    res.json({ templates: allTemplates });
  } catch (error: any) {
    console.error('[WORKFLOWS_TEMPLATES]', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/workflows/:id
 *
 * Get a specific workflow by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access permissions
    if (workflow.userId !== userId && workflow.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ workflow });
  } catch (error: any) {
    console.error('[WORKFLOWS_GET]', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * POST /api/workflows
 *
 * Create a new workflow
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    const data = createWorkflowSchema.parse(req.body);

    const db = getDb();

    const [workflow] = await db
      .insert(workflows)
      .values({
        ...data,
        userId,
        workspaceId,
      })
      .returning();

    console.log('[WORKFLOWS_CREATE] Created:', workflow.id);

    res.status(201).json({ workflow });
  } catch (error: any) {
    console.error('[WORKFLOWS_CREATE]', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * PUT /api/workflows/:id
 *
 * Update an existing workflow
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const data = updateWorkflowSchema.parse(req.body);

    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update workflow
    const [updated] = await db
      .update(workflows)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();

    // Create version snapshot
    if (data.nodes || data.edges) {
      await db.insert(workflowVersions).values({
        workflowId: id,
        version: updated.version,
        name: updated.name,
        description: updated.description,
        nodes: updated.nodes,
        edges: updated.edges,
        changeDescription: 'Auto-saved version',
        createdBy: userId,
      });
    }

    console.log('[WORKFLOWS_UPDATE] Updated:', id);

    res.json({ workflow: updated });
  } catch (error: any) {
    console.error('[WORKFLOWS_UPDATE]', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/workflows/:id
 *
 * Delete a workflow
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete workflow (cascade will delete versions & executions)
    await db
      .delete(workflows)
      .where(eq(workflows.id, id));

    console.log('[WORKFLOWS_DELETE] Deleted:', id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[WORKFLOWS_DELETE]', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * POST /api/workflows/:id/clone
 *
 * Clone a workflow (create from template)
 */
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    const db = getDb();

    // Get source workflow
    const [source] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!source) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access
    if (source.userId !== userId && source.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Clone workflow
    const [cloned] = await db
      .insert(workflows)
      .values({
        name: `${source.name} (Copy)`,
        description: source.description,
        nodes: source.nodes,
        edges: source.edges,
        tags: source.tags,
        status: 'draft',
        visibility: 'private',
        isTemplate: false,
        userId,
        workspaceId,
        parentWorkflowId: id,
        version: '1.0.0',
      })
      .returning();

    console.log('[WORKFLOWS_CLONE] Cloned:', id, '->', cloned.id);

    res.status(201).json({ workflow: cloned });
  } catch (error: any) {
    console.error('[WORKFLOWS_CLONE]', error);
    res.status(500).json({ error: 'Failed to clone workflow' });
  }
});

/**
 * POST /api/workflows/:id/execute
 *
 * Execute a workflow (test or production)
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { input, isTest } = executeWorkflowSchema.parse(req.body);

    const db = getDb();

    // Get workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access
    if (workflow.userId !== userId && workflow.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('[WORKFLOWS_EXECUTE] Starting execution for:', id);

    // Execute workflow asynchronously
    setImmediate(async () => {
      try {
        await workflowExecutionEngine.executeWorkflow(
          id,
          workflow.nodes as any[],
          workflow.edges as any[],
          userId,
          input,
          isTest
        );
      } catch (error) {
        console.error('[WORKFLOWS_EXECUTE] Execution failed:', error);
      }
    });

    // Return immediately with pending status
    res.status(202).json({
      status: 'pending',
      message: 'Workflow execution started. Use GET /api/workflows/:id/executions to check status.'
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_EXECUTE]', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * GET /api/workflows/executions/:executionId/status
 *
 * Get live status of a running execution
 */
router.get('/executions/:executionId/status', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    // Try to get from in-memory execution engine first
    const liveStatus = workflowExecutionEngine.getExecutionStatus(executionId);

    if (liveStatus) {
      return res.json({
        executionId: liveStatus.executionId,
        workflowId: liveStatus.workflowId,
        status: liveStatus.status,
        currentNodeId: liveStatus.currentNodeId,
        progress: {
          startTime: liveStatus.startTime,
          duration: Date.now() - liveStatus.startTime,
          logs: liveStatus.logs,
        },
        error: liveStatus.error,
      });
    }

    // If not in memory, check database
    const db = getDb();
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId));

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      currentNodeId: null,
      progress: {
        startTime: execution.startedAt?.getTime() || 0,
        duration: execution.durationMs || 0,
        logs: execution.logs || [],
      },
      output: execution.output,
      error: execution.error,
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_EXECUTION_STATUS]', error);
    res.status(500).json({ error: 'Failed to fetch execution status' });
  }
});

/**
 * GET /api/workflows/:id/executions
 *
 * Get execution history for a workflow
 */
router.get('/:id/executions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { limit = '20', offset = '0' } = req.query;

    const db = getDb();

    // Check workflow access
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (workflow.userId !== userId && workflow.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get executions
    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, id))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      executions,
      total: executions.length,
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_EXECUTIONS]', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// ========================================
// DEPLOYMENT MANAGEMENT
// ========================================

/**
 * POST /api/workflows/:id/publish
 *
 * Publish a workflow (draft → active) and create version snapshot
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { changeDescription } = req.body;
    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only publish from draft
    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Can only publish draft workflows' });
    }

    // Increment version number
    const [major, minor, patch] = existing.version.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    // Update workflow to active
    const [updated] = await db
      .update(workflows)
      .set({
        status: 'active',
        version: newVersion,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();

    // Create version snapshot
    await db.insert(workflowVersions).values({
      workflowId: id,
      version: newVersion,
      name: updated.name,
      description: updated.description,
      nodes: updated.nodes,
      edges: updated.edges,
      changeDescription: changeDescription || 'Published to production',
      createdBy: userId,
    });

    console.log('[WORKFLOWS_PUBLISH] Published:', id, 'v' + newVersion);

    res.json({
      workflow: updated,
      message: `Workflow published as v${newVersion}`
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_PUBLISH]', error);
    res.status(500).json({ error: 'Failed to publish workflow' });
  }
});

/**
 * POST /api/workflows/:id/archive
 *
 * Archive a workflow (active → archived)
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only archive active workflows
    if (existing.status !== 'active') {
      return res.status(400).json({ error: 'Can only archive active workflows' });
    }

    // Update workflow to archived
    const [updated] = await db
      .update(workflows)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();

    console.log('[WORKFLOWS_ARCHIVE] Archived:', id);

    res.json({
      workflow: updated,
      message: 'Workflow archived successfully'
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_ARCHIVE]', error);
    res.status(500).json({ error: 'Failed to archive workflow' });
  }
});

/**
 * POST /api/workflows/:id/unarchive
 *
 * Restore an archived workflow (archived → draft)
 */
router.post('/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only unarchive archived workflows
    if (existing.status !== 'archived') {
      return res.status(400).json({ error: 'Can only unarchive archived workflows' });
    }

    // Update workflow to draft (for review before republishing)
    const [updated] = await db
      .update(workflows)
      .set({
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();

    console.log('[WORKFLOWS_UNARCHIVE] Unarchived:', id);

    res.json({
      workflow: updated,
      message: 'Workflow restored to draft status'
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_UNARCHIVE]', error);
    res.status(500).json({ error: 'Failed to unarchive workflow' });
  }
});

/**
 * GET /api/workflows/:id/versions
 *
 * Get version history for a workflow
 */
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();

    // Check access
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (workflow.userId !== userId && workflow.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get versions
    const versions = await db
      .select()
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, id))
      .orderBy(desc(workflowVersions.createdAt));

    // Mark current version
    const versionsWithCurrent = versions.map(v => ({
      ...v,
      isCurrent: v.version === workflow.version
    }));

    res.json({
      versions: versionsWithCurrent,
      currentVersion: workflow.version,
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_VERSIONS]', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * POST /api/workflows/:id/rollback
 *
 * Rollback workflow to a specific version
 */
router.post('/:id/rollback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { versionId } = req.body;

    if (!versionId) {
      return res.status(400).json({ error: 'versionId is required' });
    }

    const db = getDb();

    // Check ownership
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (workflow.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get target version
    const [targetVersion] = await db
      .select()
      .from(workflowVersions)
      .where(eq(workflowVersions.id, versionId));

    if (!targetVersion || targetVersion.workflowId !== id) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Increment version for rollback
    const [major, minor, patch] = workflow.version.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    // Restore workflow to target version
    const [updated] = await db
      .update(workflows)
      .set({
        nodes: targetVersion.nodes,
        edges: targetVersion.edges,
        name: targetVersion.name,
        description: targetVersion.description,
        version: newVersion,
        updatedAt: new Date(),
        status: 'draft', // Rollback to draft for review
      })
      .where(eq(workflows.id, id))
      .returning();

    // Create new version snapshot for rollback
    await db.insert(workflowVersions).values({
      workflowId: id,
      version: newVersion,
      name: updated.name,
      description: updated.description,
      nodes: updated.nodes,
      edges: updated.edges,
      changeDescription: `Rolled back to v${targetVersion.version}`,
      createdBy: userId,
    });

    console.log('[WORKFLOWS_ROLLBACK] Rolled back:', id, 'to v' + targetVersion.version, 'as v' + newVersion);

    res.json({
      workflow: updated,
      message: `Rolled back to v${targetVersion.version} (now v${newVersion})`
    });
  } catch (error: any) {
    console.error('[WORKFLOWS_ROLLBACK]', error);
    res.status(500).json({ error: 'Failed to rollback workflow' });
  }
});

export default router;
