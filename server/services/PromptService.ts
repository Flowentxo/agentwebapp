/**
 * PROMPT SERVICE
 *
 * Phase 4.1 - Prompt Registry & Lab
 *
 * Centralized service for managing prompts with versioning.
 * Provides CRUD operations, version management, and testing support.
 */

import { getDb } from '@/lib/db';
import {
  promptRegistry,
  promptVersions,
  promptTestResults,
  PromptRegistry,
  NewPromptRegistry,
  PromptVersion,
  NewPromptVersion,
  PromptTestResult,
} from '@/lib/db/schema-prompts';
import { eq, desc, and, sql, ilike, inArray } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptWithActiveVersion extends PromptRegistry {
  activeVersionContent?: string;
  versionCount?: number;
}

export interface CreatePromptInput {
  slug: string;
  name: string;
  description?: string;
  category?: 'system' | 'agent' | 'tool' | 'template' | 'experiment' | 'custom';
  agentId?: string;
  tags?: string[];
  initialContent: string;
  createdBy?: string;
}

export interface UpdatePromptInput {
  name?: string;
  description?: string;
  category?: 'system' | 'agent' | 'tool' | 'template' | 'experiment' | 'custom';
  agentId?: string;
  tags?: string[];
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  updatedBy?: string;
}

export interface CreateVersionInput {
  promptId: string;
  content: string;
  changeNote?: string;
  createdBy?: string;
  setActive?: boolean;
}

export interface TestPromptInput {
  promptVersionId: string;
  model: string;
  provider: string;
  temperature?: number;
  testInput: string;
  testOutput?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  estimatedCost?: string;
  success?: boolean;
  errorMessage?: string;
  testedBy?: string;
}

export interface ListPromptsOptions {
  category?: string;
  status?: string;
  agentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// PROMPT SERVICE CLASS
// ============================================================================

export class PromptService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // PROMPT CRUD
  // --------------------------------------------------------------------------

  /**
   * List all prompts with optional filtering
   */
  async listPrompts(options: ListPromptsOptions = {}): Promise<{
    prompts: PromptWithActiveVersion[];
    total: number;
  }> {
    const { category, status, agentId, search, limit = 50, offset = 0 } = options;

    // Build where conditions
    const conditions = [];
    if (category) {
      conditions.push(eq(promptRegistry.category, category as any));
    }
    if (status) {
      conditions.push(eq(promptRegistry.status, status as any));
    }
    if (agentId) {
      conditions.push(eq(promptRegistry.agentId, agentId));
    }
    if (search) {
      conditions.push(
        sql`(${promptRegistry.name} ILIKE ${`%${search}%`} OR ${promptRegistry.slug} ILIKE ${`%${search}%`})`
      );
    }

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [promptsResult, countResult] = await Promise.all([
      this.db
        .select({
          prompt: promptRegistry,
          activeContent: promptVersions.content,
        })
        .from(promptRegistry)
        .leftJoin(
          promptVersions,
          eq(promptRegistry.activeVersionId, promptVersions.id)
        )
        .where(whereClause)
        .orderBy(desc(promptRegistry.updatedAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(promptRegistry)
        .where(whereClause),
    ]);

    // Get version counts
    const promptIds = promptsResult.map((r) => r.prompt.id);
    const versionCounts = promptIds.length > 0
      ? await this.db
          .select({
            promptId: promptVersions.promptId,
            count: sql<number>`COUNT(*)`,
          })
          .from(promptVersions)
          .where(inArray(promptVersions.promptId, promptIds))
          .groupBy(promptVersions.promptId)
      : [];

    const countMap = new Map(versionCounts.map((vc) => [vc.promptId, Number(vc.count)]));

    const prompts: PromptWithActiveVersion[] = promptsResult.map((r) => ({
      ...r.prompt,
      activeVersionContent: r.activeContent || undefined,
      versionCount: countMap.get(r.prompt.id) || 0,
    }));

    return {
      prompts,
      total: Number(countResult[0]?.count || 0),
    };
  }

  /**
   * Get a single prompt by ID
   */
  async getPromptById(id: string): Promise<PromptWithActiveVersion | null> {
    const result = await this.db
      .select({
        prompt: promptRegistry,
        activeContent: promptVersions.content,
      })
      .from(promptRegistry)
      .leftJoin(
        promptVersions,
        eq(promptRegistry.activeVersionId, promptVersions.id)
      )
      .where(eq(promptRegistry.id, id))
      .limit(1);

    if (!result[0]) return null;

    // Get version count
    const [versionCount] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(promptVersions)
      .where(eq(promptVersions.promptId, id));

    return {
      ...result[0].prompt,
      activeVersionContent: result[0].activeContent || undefined,
      versionCount: Number(versionCount?.count || 0),
    };
  }

  /**
   * Get a single prompt by slug
   */
  async getPromptBySlug(slug: string): Promise<PromptWithActiveVersion | null> {
    const result = await this.db
      .select({
        prompt: promptRegistry,
        activeContent: promptVersions.content,
      })
      .from(promptRegistry)
      .leftJoin(
        promptVersions,
        eq(promptRegistry.activeVersionId, promptVersions.id)
      )
      .where(eq(promptRegistry.slug, slug))
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0].prompt,
      activeVersionContent: result[0].activeContent || undefined,
    };
  }

  /**
   * Create a new prompt with initial version
   */
  async createPrompt(input: CreatePromptInput): Promise<PromptWithActiveVersion> {
    const {
      slug,
      name,
      description,
      category = 'agent',
      agentId,
      tags = [],
      initialContent,
      createdBy,
    } = input;

    // Create prompt
    const [newPrompt] = await this.db
      .insert(promptRegistry)
      .values({
        slug,
        name,
        description,
        category: category as any,
        agentId,
        tags: tags as any,
        status: 'draft' as any,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // Create initial version (v1)
    const [initialVersion] = await this.db
      .insert(promptVersions)
      .values({
        promptId: newPrompt.id,
        version: 1,
        content: initialContent,
        changeNote: 'Initial version',
        isActive: true,
        createdBy,
      })
      .returning();

    // Set active version
    await this.db
      .update(promptRegistry)
      .set({ activeVersionId: initialVersion.id })
      .where(eq(promptRegistry.id, newPrompt.id));

    return {
      ...newPrompt,
      activeVersionId: initialVersion.id,
      activeVersionContent: initialContent,
      versionCount: 1,
    };
  }

  /**
   * Update prompt metadata (not content)
   */
  async updatePrompt(id: string, input: UpdatePromptInput): Promise<PromptRegistry | null> {
    const updateData: Partial<NewPromptRegistry> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category as any;
    if (input.agentId !== undefined) updateData.agentId = input.agentId;
    if (input.tags !== undefined) updateData.tags = input.tags as any;
    if (input.status !== undefined) updateData.status = input.status as any;
    if (input.updatedBy !== undefined) updateData.updatedBy = input.updatedBy;

    const [updated] = await this.db
      .update(promptRegistry)
      .set(updateData)
      .where(eq(promptRegistry.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Delete a prompt and all its versions
   */
  async deletePrompt(id: string): Promise<boolean> {
    const result = await this.db
      .delete(promptRegistry)
      .where(eq(promptRegistry.id, id))
      .returning({ id: promptRegistry.id });

    return result.length > 0;
  }

  // --------------------------------------------------------------------------
  // VERSION MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * List all versions of a prompt
   */
  async listVersions(promptId: string): Promise<PromptVersion[]> {
    return this.db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, promptId))
      .orderBy(desc(promptVersions.version));
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<PromptVersion | null> {
    const [version] = await this.db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.id, versionId))
      .limit(1);

    return version || null;
  }

  /**
   * Create a new version of a prompt
   */
  async createVersion(input: CreateVersionInput): Promise<PromptVersion> {
    const { promptId, content, changeNote, createdBy, setActive = false } = input;

    // Get the next version number
    const [maxVersion] = await this.db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${promptVersions.version}), 0)` })
      .from(promptVersions)
      .where(eq(promptVersions.promptId, promptId));

    const nextVersion = Number(maxVersion?.maxVersion || 0) + 1;

    // Create new version
    const [newVersion] = await this.db
      .insert(promptVersions)
      .values({
        promptId,
        version: nextVersion,
        content,
        changeNote,
        isActive: setActive,
        createdBy,
      })
      .returning();

    // If setting as active, update the prompt and deactivate other versions
    if (setActive) {
      await this.setActiveVersion(promptId, newVersion.id);
    }

    return newVersion;
  }

  /**
   * Set a version as the active version
   */
  async setActiveVersion(promptId: string, versionId: string): Promise<void> {
    // Deactivate all versions for this prompt
    await this.db
      .update(promptVersions)
      .set({ isActive: false })
      .where(eq(promptVersions.promptId, promptId));

    // Activate the selected version
    await this.db
      .update(promptVersions)
      .set({ isActive: true })
      .where(eq(promptVersions.id, versionId));

    // Update the prompt's active version reference
    await this.db
      .update(promptRegistry)
      .set({
        activeVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(eq(promptRegistry.id, promptId));
  }

  /**
   * Rollback to a previous version (creates a copy as new version)
   */
  async rollbackToVersion(
    promptId: string,
    versionId: string,
    userId?: string
  ): Promise<PromptVersion> {
    // Get the target version
    const targetVersion = await this.getVersion(versionId);
    if (!targetVersion || targetVersion.promptId !== promptId) {
      throw new Error('Version not found or does not belong to this prompt');
    }

    // Create a new version with the same content
    return this.createVersion({
      promptId,
      content: targetVersion.content,
      changeNote: `Rollback to version ${targetVersion.version}`,
      createdBy: userId,
      setActive: true,
    });
  }

  // --------------------------------------------------------------------------
  // TEST RESULTS
  // --------------------------------------------------------------------------

  /**
   * Save a test result
   */
  async saveTestResult(input: TestPromptInput): Promise<PromptTestResult> {
    const [result] = await this.db
      .insert(promptTestResults)
      .values({
        promptVersionId: input.promptVersionId,
        model: input.model,
        provider: input.provider,
        temperature: input.temperature,
        testInput: input.testInput,
        testOutput: input.testOutput,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        responseTimeMs: input.responseTimeMs,
        estimatedCost: input.estimatedCost,
        success: input.success ?? true,
        errorMessage: input.errorMessage,
        testedBy: input.testedBy,
      })
      .returning();

    // Update version metrics
    await this.updateVersionMetrics(input.promptVersionId);

    return result;
  }

  /**
   * Get test results for a version
   */
  async getTestResults(versionId: string, limit = 20): Promise<PromptTestResult[]> {
    return this.db
      .select()
      .from(promptTestResults)
      .where(eq(promptTestResults.promptVersionId, versionId))
      .orderBy(desc(promptTestResults.createdAt))
      .limit(limit);
  }

  /**
   * Update version metrics based on test results
   */
  private async updateVersionMetrics(versionId: string): Promise<void> {
    const [metrics] = await this.db
      .select({
        testCount: sql<number>`COUNT(*)`,
        avgResponseTime: sql<number>`AVG(${promptTestResults.responseTimeMs})`,
        avgTokens: sql<number>`AVG(${promptTestResults.totalTokens})`,
        successRate: sql<number>`(COUNT(*) FILTER (WHERE ${promptTestResults.success} = true) * 100.0 / NULLIF(COUNT(*), 0))`,
      })
      .from(promptTestResults)
      .where(eq(promptTestResults.promptVersionId, versionId));

    if (metrics) {
      await this.db
        .update(promptVersions)
        .set({
          metrics: JSON.stringify({
            avgResponseTime: Math.round(Number(metrics.avgResponseTime) || 0),
            avgTokenUsage: Math.round(Number(metrics.avgTokens) || 0),
            successRate: Number(metrics.successRate?.toFixed(1)) || 100,
            testCount: Number(metrics.testCount) || 0,
            lastTested: new Date().toISOString(),
          }),
        })
        .where(eq(promptVersions.id, versionId));
    }
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  /**
   * Get prompt content by slug (for runtime use)
   */
  async getActivePromptContent(slug: string): Promise<string | null> {
    const prompt = await this.getPromptBySlug(slug);
    return prompt?.activeVersionContent || null;
  }

  /**
   * Check if a slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const [existing] = await this.db
      .select({ id: promptRegistry.id })
      .from(promptRegistry)
      .where(eq(promptRegistry.slug, slug))
      .limit(1);

    return !existing;
  }

  /**
   * Get prompts by agent ID
   */
  async getPromptsByAgent(agentId: string): Promise<PromptWithActiveVersion[]> {
    const result = await this.listPrompts({ agentId });
    return result.prompts;
  }

  /**
   * Clone a prompt (creates a new prompt with same content)
   */
  async clonePrompt(
    sourceId: string,
    newSlug: string,
    newName: string,
    userId?: string
  ): Promise<PromptWithActiveVersion> {
    const source = await this.getPromptById(sourceId);
    if (!source) {
      throw new Error('Source prompt not found');
    }

    return this.createPrompt({
      slug: newSlug,
      name: newName,
      description: `Cloned from ${source.name}`,
      category: source.category as any,
      agentId: source.agentId || undefined,
      tags: (source.tags as string[]) || [],
      initialContent: source.activeVersionContent || '',
      createdBy: userId,
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let promptServiceInstance: PromptService | null = null;

export function getPromptService(): PromptService {
  if (!promptServiceInstance) {
    promptServiceInstance = new PromptService();
  }
  return promptServiceInstance;
}

export default PromptService;
