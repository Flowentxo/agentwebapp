/**
 * WorkflowVersionService
 *
 * Phase 8: Versioning & Deployment Lifecycle (Draft vs. Live)
 *
 * This service manages workflow versions, publishing, and rollback:
 * - publish(): Create a new version snapshot and set it as the live version
 * - restoreDraft(): Restore a previous version to the draft (editor)
 * - getExecutableGraph(): Get the correct graph based on execution mode
 * - getVersionHistory(): List all versions for a workflow
 */

import { eq, desc, sql, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import {
  pipelineVersions,
  pipelineDeployments,
  PipelineVersion,
  NewPipelineVersion,
  ExecutableGraph,
  LiveStatus,
} from '@/lib/db/schema-versions';
import { createLogger } from '@/lib/logger';

const logger = createLogger('WorkflowVersionService');

// ============================================================================
// TYPES
// ============================================================================

export interface PublishOptions {
  workflowId: string;
  userId: string;
  changelog?: string;
  activate?: boolean; // Whether to set liveStatus to 'active' (default: true)
}

export interface RestoreOptions {
  workflowId: string;
  versionId: string;
  userId: string;
}

export interface VersionInfo {
  id: string;
  versionNumber: number;
  name: string;
  description?: string | null;
  changelog?: string | null;
  createdBy: string;
  createdAt: Date;
  isLive: boolean;
  nodeCount: number;
  edgeCount: number;
}

export type ExecutionMode = 'test' | 'trigger';

// ============================================================================
// SERVICE CLASS
// ============================================================================

class WorkflowVersionServiceClass {
  private db = getDb();

  // ==========================================================================
  // PUBLISH
  // ==========================================================================

  /**
   * Publish the current draft as a new version.
   *
   * 1. Fetch current draft from `workflows`
   * 2. Get max version number for this workflow + 1
   * 3. Insert into `pipeline_versions`
   * 4. Update `workflows.publishedVersionId` to the new ID
   * 5. Optionally set liveStatus to 'active'
   */
  async publish(options: PublishOptions): Promise<PipelineVersion> {
    const { workflowId, userId, changelog, activate = true } = options;

    logger.info('Publishing workflow', { workflowId, userId, activate });

    try {
      // 1. Fetch current draft
      const [workflow] = await this.db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // 2. Get next version number
      const [maxVersion] = await this.db
        .select({ max: sql<number>`COALESCE(MAX(${pipelineVersions.versionNumber}), 0)` })
        .from(pipelineVersions)
        .where(eq(pipelineVersions.workflowId, workflowId));

      const nextVersionNumber = (maxVersion?.max || 0) + 1;

      // 3. Create version snapshot
      const newVersion: NewPipelineVersion = {
        workflowId,
        versionNumber: nextVersionNumber,
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        viewport: workflow.viewport,
        config: {
          triggers: [], // Extract from nodes if needed
          variables: {},
          settings: {},
        },
        name: workflow.name,
        description: workflow.description,
        changelog: changelog || `Version ${nextVersionNumber}`,
        createdBy: userId,
      };

      const [version] = await this.db
        .insert(pipelineVersions)
        .values(newVersion)
        .returning();

      // 4. Update workflow with published version ID and status
      const updateData: Partial<typeof workflows.$inferInsert> = {
        publishedVersionId: version.id,
        publishedVersion: nextVersionNumber,
        publishedNodes: workflow.nodes,
        publishedEdges: workflow.edges,
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      };

      if (activate) {
        updateData.liveStatus = 'active';
      }

      await this.db
        .update(workflows)
        .set(updateData)
        .where(eq(workflows.id, workflowId));

      // 5. Record deployment history
      await this.db.insert(pipelineDeployments).values({
        workflowId,
        versionId: version.id,
        action: 'deploy',
        previousVersionId: workflow.publishedVersionId,
        deployedBy: userId,
        reason: changelog,
      });

      logger.info('Workflow published successfully', {
        workflowId,
        versionId: version.id,
        versionNumber: nextVersionNumber,
      });

      return version;
    } catch (error) {
      logger.error('Failed to publish workflow', { workflowId, error });
      throw error;
    }
  }

  // ==========================================================================
  // RESTORE DRAFT
  // ==========================================================================

  /**
   * Restore a previous version to the draft (editor).
   * This overwrites the current draft with the version's snapshot.
   */
  async restoreDraft(options: RestoreOptions): Promise<void> {
    const { workflowId, versionId, userId } = options;

    logger.info('Restoring draft from version', { workflowId, versionId, userId });

    try {
      // 1. Fetch the version
      const [version] = await this.db
        .select()
        .from(pipelineVersions)
        .where(
          and(
            eq(pipelineVersions.id, versionId),
            eq(pipelineVersions.workflowId, workflowId)
          )
        )
        .limit(1);

      if (!version) {
        throw new Error(`Version not found: ${versionId}`);
      }

      // 2. Overwrite draft in workflows table
      await this.db
        .update(workflows)
        .set({
          nodes: version.nodes,
          edges: version.edges,
          viewport: version.viewport || { x: 0, y: 0, zoom: 1 },
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, workflowId));

      logger.info('Draft restored successfully', {
        workflowId,
        versionId,
        versionNumber: version.versionNumber,
      });
    } catch (error) {
      logger.error('Failed to restore draft', { workflowId, versionId, error });
      throw error;
    }
  }

  // ==========================================================================
  // ROLLBACK TO VERSION
  // ==========================================================================

  /**
   * Rollback the live/published version to a previous version.
   * This changes what version is used for production triggers.
   */
  async rollbackToVersion(
    workflowId: string,
    versionId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    logger.info('Rolling back to version', { workflowId, versionId, userId });

    try {
      // 1. Fetch current workflow and target version
      const [[workflow], [version]] = await Promise.all([
        this.db
          .select()
          .from(workflows)
          .where(eq(workflows.id, workflowId))
          .limit(1),
        this.db
          .select()
          .from(pipelineVersions)
          .where(
            and(
              eq(pipelineVersions.id, versionId),
              eq(pipelineVersions.workflowId, workflowId)
            )
          )
          .limit(1),
      ]);

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (!version) {
        throw new Error(`Version not found: ${versionId}`);
      }

      // 2. Update workflow to use this version as published
      await this.db
        .update(workflows)
        .set({
          publishedVersionId: version.id,
          publishedVersion: version.versionNumber,
          publishedNodes: version.nodes,
          publishedEdges: version.edges,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, workflowId));

      // 3. Record rollback in deployment history
      await this.db.insert(pipelineDeployments).values({
        workflowId,
        versionId: version.id,
        action: 'rollback',
        previousVersionId: workflow.publishedVersionId,
        deployedBy: userId,
        reason: reason || `Rolled back to v${version.versionNumber}`,
      });

      logger.info('Rollback successful', {
        workflowId,
        versionId,
        versionNumber: version.versionNumber,
      });
    } catch (error) {
      logger.error('Failed to rollback', { workflowId, versionId, error });
      throw error;
    }
  }

  // ==========================================================================
  // GET EXECUTABLE GRAPH
  // ==========================================================================

  /**
   * Get the correct graph based on execution mode.
   *
   * - 'test' mode (UI Run button): Returns Draft from `workflows` table
   * - 'trigger' mode (Webhook/Cron): Returns Published from `pipeline_versions`
   */
  async getExecutableGraph(
    workflowId: string,
    mode: ExecutionMode
  ): Promise<ExecutableGraph> {
    logger.debug('Getting executable graph', { workflowId, mode });

    // 1. Fetch workflow
    const [workflow] = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // 2. For test mode, return the draft
    if (mode === 'test') {
      return {
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        viewport: workflow.viewport,
        config: {},
        isDraft: true,
      };
    }

    // 3. For trigger mode, return the published version
    if (!workflow.publishedVersionId) {
      // No published version - fall back to draft with warning
      logger.warn('No published version, using draft for trigger', { workflowId });
      return {
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        viewport: workflow.viewport,
        config: {},
        isDraft: true,
      };
    }

    // 4. Check if workflow is active
    if (workflow.liveStatus !== 'active') {
      throw new Error(
        `Workflow is not active (status: ${workflow.liveStatus}). Cannot execute via trigger.`
      );
    }

    // 5. Fetch the published version
    const [version] = await this.db
      .select()
      .from(pipelineVersions)
      .where(eq(pipelineVersions.id, workflow.publishedVersionId))
      .limit(1);

    if (!version) {
      // Published version not found - fall back to snapshot in workflow
      logger.warn('Published version not found, using snapshot', { workflowId });
      return {
        nodes: workflow.publishedNodes || workflow.nodes || [],
        edges: workflow.publishedEdges || workflow.edges || [],
        viewport: workflow.viewport,
        config: {},
        versionNumber: workflow.publishedVersion || undefined,
        isDraft: false,
      };
    }

    return {
      nodes: version.nodes,
      edges: version.edges,
      viewport: version.viewport,
      config: version.config,
      versionNumber: version.versionNumber,
      isDraft: false,
    };
  }

  // ==========================================================================
  // GET VERSION HISTORY
  // ==========================================================================

  /**
   * Get all versions for a workflow (descending by version number).
   */
  async getVersionHistory(workflowId: string): Promise<VersionInfo[]> {
    // Get workflow to determine which version is live
    const [workflow] = await this.db
      .select({
        publishedVersionId: workflows.publishedVersionId,
      })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    const publishedVersionId = workflow?.publishedVersionId;

    // Get all versions
    const versions = await this.db
      .select()
      .from(pipelineVersions)
      .where(eq(pipelineVersions.workflowId, workflowId))
      .orderBy(desc(pipelineVersions.versionNumber));

    return versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      name: v.name,
      description: v.description,
      changelog: v.changelog,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      isLive: v.id === publishedVersionId,
      nodeCount: Array.isArray(v.nodes) ? v.nodes.length : 0,
      edgeCount: Array.isArray(v.edges) ? v.edges.length : 0,
    }));
  }

  // ==========================================================================
  // GET SINGLE VERSION
  // ==========================================================================

  /**
   * Get a single version by ID.
   */
  async getVersion(versionId: string): Promise<PipelineVersion | null> {
    const [version] = await this.db
      .select()
      .from(pipelineVersions)
      .where(eq(pipelineVersions.id, versionId))
      .limit(1);

    return version || null;
  }

  // ==========================================================================
  // UPDATE LIVE STATUS
  // ==========================================================================

  /**
   * Update the live status of a workflow.
   */
  async updateLiveStatus(
    workflowId: string,
    status: LiveStatus,
    userId: string
  ): Promise<void> {
    logger.info('Updating live status', { workflowId, status, userId });

    await this.db
      .update(workflows)
      .set({
        liveStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId));

    // Record in deployment history if deactivating
    if (status === 'inactive' || status === 'archived') {
      const [workflow] = await this.db
        .select({ publishedVersionId: workflows.publishedVersionId })
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (workflow?.publishedVersionId) {
        await this.db.insert(pipelineDeployments).values({
          workflowId,
          versionId: workflow.publishedVersionId,
          action: 'deactivate',
          deployedBy: userId,
          reason: `Status changed to ${status}`,
        });
      }
    }
  }

  // ==========================================================================
  // GET DEPLOYMENT HISTORY
  // ==========================================================================

  /**
   * Get deployment history for a workflow.
   */
  async getDeploymentHistory(workflowId: string, limit = 20) {
    return this.db
      .select()
      .from(pipelineDeployments)
      .where(eq(pipelineDeployments.workflowId, workflowId))
      .orderBy(desc(pipelineDeployments.deployedAt))
      .limit(limit);
  }

  // ==========================================================================
  // CHECK IF HAS UNPUBLISHED CHANGES
  // ==========================================================================

  /**
   * Check if the draft has changes that haven't been published.
   */
  async hasUnpublishedChanges(workflowId: string): Promise<boolean> {
    const [workflow] = await this.db
      .select({
        nodes: workflows.nodes,
        edges: workflows.edges,
        publishedNodes: workflows.publishedNodes,
        publishedEdges: workflows.publishedEdges,
        publishedVersionId: workflows.publishedVersionId,
      })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      return false;
    }

    // If never published, any content means unpublished changes
    if (!workflow.publishedVersionId) {
      return (workflow.nodes?.length || 0) > 0;
    }

    // Compare draft to published snapshot
    const draftJson = JSON.stringify({
      nodes: workflow.nodes,
      edges: workflow.edges,
    });
    const publishedJson = JSON.stringify({
      nodes: workflow.publishedNodes,
      edges: workflow.publishedEdges,
    });

    return draftJson !== publishedJson;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const WorkflowVersionService = new WorkflowVersionServiceClass();
export default WorkflowVersionService;
