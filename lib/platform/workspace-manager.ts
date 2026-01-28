/**
 * SINTRA Platform - Workspace Manager
 * Handles multi-workspace management similar to Notion/Slack
 */

import { getDb } from '../db/connection';
import {
  workspaces,
  workspaceAgents,
  workspaceKnowledge,
  type Workspace,
  type NewWorkspace,
  type WorkspaceAgent,
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface CreateWorkspaceParams {
  name: string;
  description?: string;
  slug?: string;
  iconUrl?: string;
  isDefault?: boolean;
}

export interface UpdateWorkspaceParams {
  name?: string;
  description?: string;
  slug?: string;
  iconUrl?: string;
  settings?: Record<string, any>;
}

/**
 * Workspace Manager - Handles all workspace operations
 */
export class WorkspaceManager {
  private static instance: WorkspaceManager;
  private db = getDb();

  private constructor() {}

  static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  /**
   * Generate slug from workspace name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    userId: string,
    params: CreateWorkspaceParams
  ): Promise<Workspace> {
    const slug = params.slug || this.generateSlug(params.name);

    const newWorkspace: NewWorkspace = {
      userId,
      name: params.name,
      description: params.description || null,
      slug,
      iconUrl: params.iconUrl || null,
      isDefault: params.isDefault || false,
      settings: {},
    };

    const [workspace] = await this.db
      .insert(workspaces)
      .values(newWorkspace)
      .returning();

    // Auto-enable all agents for new workspace
    const allAgents = [
      'dexter', 'cassie', 'emmie', 'aura', 'nova', 'kai',
      'lex', 'finn', 'ari', 'echo', 'vera', 'omni'
    ];

    await this.db.insert(workspaceAgents).values(
      allAgents.map((agentId) => ({
        workspaceId: workspace.id,
        agentId,
        enabled: true,
        config: {},
      }))
    );

    console.log(`✅ Created workspace: ${workspace.name} (${workspace.id})`);

    return workspace;
  }

  /**
   * List user's workspaces
   */
  async listWorkspaces(userId: string): Promise<Workspace[]> {
    const results = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, userId))
      .orderBy(desc(workspaces.isDefault), workspaces.createdAt);

    return results;
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<Workspace | null> {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.userId, userId)
        )
      )
      .limit(1);

    return workspace || null;
  }

  /**
   * Get default workspace (or create one if doesn't exist)
   */
  async getDefaultWorkspace(userId: string): Promise<Workspace> {
    // Try to find existing default
    let [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.userId, userId),
          eq(workspaces.isDefault, true)
        )
      )
      .limit(1);

    // If no default exists, create one
    if (!workspace) {
      console.log(`Creating default workspace for user ${userId}`);
      workspace = await this.createWorkspace(userId, {
        name: 'Personal Workspace',
        description: 'Your default workspace',
        isDefault: true,
      });
    }

    return workspace;
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    userId: string,
    params: UpdateWorkspaceParams
  ): Promise<Workspace> {
    const updateData: Partial<NewWorkspace> = {
      updatedAt: new Date(),
    };

    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description || null;
    if (params.slug !== undefined) updateData.slug = params.slug;
    if (params.iconUrl !== undefined) updateData.iconUrl = params.iconUrl || null;
    if (params.settings !== undefined) updateData.settings = params.settings;

    const [updated] = await this.db
      .update(workspaces)
      .set(updateData)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Workspace not found or unauthorized');
    }

    return updated;
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Check if it's default workspace
    const workspace = await this.getWorkspace(workspaceId, userId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.isDefault) {
      throw new Error('Cannot delete default workspace');
    }

    // Delete workspace (cascade will handle workspace_agents and workspace_knowledge)
    await this.db
      .delete(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.userId, userId)
        )
      );

    console.log(`🗑️ Deleted workspace: ${workspace.name} (${workspaceId})`);
  }

  /**
   * Get enabled agents for workspace
   */
  async getWorkspaceAgents(workspaceId: string): Promise<string[]> {
    const results = await this.db
      .select()
      .from(workspaceAgents)
      .where(
        and(
          eq(workspaceAgents.workspaceId, workspaceId),
          eq(workspaceAgents.enabled, true)
        )
      );

    return results.map((r) => r.agentId);
  }

  /**
   * Get all workspace agents (enabled and disabled)
   */
  async getAllWorkspaceAgents(workspaceId: string): Promise<WorkspaceAgent[]> {
    const results = await this.db
      .select()
      .from(workspaceAgents)
      .where(eq(workspaceAgents.workspaceId, workspaceId));

    return results;
  }

  /**
   * Update workspace agent status
   */
  async updateWorkspaceAgent(
    workspaceId: string,
    agentId: string,
    enabled: boolean
  ): Promise<void> {
    await this.db
      .update(workspaceAgents)
      .set({ enabled })
      .where(
        and(
          eq(workspaceAgents.workspaceId, workspaceId),
          eq(workspaceAgents.agentId, agentId)
        )
      );

    console.log(`Updated workspace agent: ${agentId} -> enabled=${enabled}`);
  }

  /**
   * Check if user has access to workspace
   */
  async hasAccess(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.getWorkspace(workspaceId, userId);
    return workspace !== null;
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<{
    enabledAgents: number;
    totalAgents: number;
    knowledgeItems: number;
  }> {
    const agents = await this.getAllWorkspaceAgents(workspaceId);
    const enabledAgents = agents.filter((a) => a.enabled).length;

    const [knowledgeCount] = await this.db
      .select({ count: workspaceKnowledge.id })
      .from(workspaceKnowledge)
      .where(eq(workspaceKnowledge.workspaceId, workspaceId));

    return {
      enabledAgents,
      totalAgents: agents.length,
      knowledgeItems: Number(knowledgeCount) || 0,
    };
  }
}

// Export singleton instance
export const workspaceManager = WorkspaceManager.getInstance();
