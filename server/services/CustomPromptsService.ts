/**
 * Custom Prompts Service
 * Manages user-specific custom system prompts and prompt templates
 */

import { getDb } from '@/lib/db';
import { customPrompts, promptTemplates, type CustomPrompt, type PromptTemplate, type NewCustomPrompt, type NewPromptTemplate } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class CustomPromptsService {
  private db = getDb();

  /**
   * Get all custom prompts for a user and agent
   */
  async getUserPrompts(userId: string, agentId: string): Promise<CustomPrompt[]> {
    const prompts = await this.db
      .select()
      .from(customPrompts)
      .where(
        and(
          eq(customPrompts.userId, userId),
          eq(customPrompts.agentId, agentId)
        )
      )
      .orderBy(desc(customPrompts.createdAt));

    return prompts;
  }

  /**
   * Get the active/default prompt for a user and agent
   * Returns the default prompt if set, otherwise the most recently created active prompt
   */
  async getActivePrompt(userId: string, agentId: string): Promise<CustomPrompt | null> {
    const prompts = await this.db
      .select()
      .from(customPrompts)
      .where(
        and(
          eq(customPrompts.userId, userId),
          eq(customPrompts.agentId, agentId),
          eq(customPrompts.isActive, true)
        )
      )
      .orderBy(desc(customPrompts.isDefault), desc(customPrompts.createdAt));

    return prompts[0] || null;
  }

  /**
   * Get a specific custom prompt by ID
   */
  async getPromptById(promptId: string, userId: string): Promise<CustomPrompt | null> {
    const result = await this.db
      .select()
      .from(customPrompts)
      .where(
        and(
          eq(customPrompts.id, promptId),
          eq(customPrompts.userId, userId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new custom prompt
   */
  async createPrompt(data: NewCustomPrompt): Promise<CustomPrompt> {
    const [prompt] = await this.db
      .insert(customPrompts)
      .values(data)
      .returning();

    return prompt;
  }

  /**
   * Update an existing custom prompt
   */
  async updatePrompt(
    promptId: string,
    userId: string,
    updates: Partial<Pick<CustomPrompt, 'name' | 'description' | 'promptText' | 'isActive' | 'metadata'>>
  ): Promise<CustomPrompt> {
    const [updated] = await this.db
      .update(customPrompts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customPrompts.id, promptId),
          eq(customPrompts.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Prompt not found or unauthorized');
    }

    return updated;
  }

  /**
   * Set a prompt as the default for a user and agent
   * Unsets any previous default for that user-agent combination
   */
  async setDefaultPrompt(promptId: string, userId: string, agentId: string): Promise<CustomPrompt> {
    // First, unset any existing default for this user-agent
    await this.db
      .update(customPrompts)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(customPrompts.userId, userId),
          eq(customPrompts.agentId, agentId),
          eq(customPrompts.isDefault, true)
        )
      );

    // Now set the new default
    const [updated] = await this.db
      .update(customPrompts)
      .set({
        isDefault: true,
        isActive: true, // Default prompts must be active
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customPrompts.id, promptId),
          eq(customPrompts.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Prompt not found or unauthorized');
    }

    return updated;
  }

  /**
   * Delete a custom prompt
   */
  async deletePrompt(promptId: string, userId: string): Promise<void> {
    const result = await this.db
      .delete(customPrompts)
      .where(
        and(
          eq(customPrompts.id, promptId),
          eq(customPrompts.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error('Prompt not found or unauthorized');
    }
  }

  /**
   * Get all available prompt templates for an agent
   * Optionally filter by category
   */
  async getTemplates(agentId?: string, category?: string): Promise<PromptTemplate[]> {
    let query = this.db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.isPublic, true));

    if (agentId) {
      query = query.where(
        and(
          eq(promptTemplates.isPublic, true),
          eq(promptTemplates.agentId, agentId)
        )
      );
    }

    if (category) {
      query = query.where(
        and(
          eq(promptTemplates.isPublic, true),
          agentId ? eq(promptTemplates.agentId, agentId) : undefined,
          eq(promptTemplates.category, category)
        )
      );
    }

    const templates = await query.orderBy(desc(promptTemplates.createdAt));
    return templates;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplateById(templateId: string): Promise<PromptTemplate | null> {
    const result = await this.db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, templateId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a custom prompt from a template
   * Copies the template's prompt text to create a new user prompt
   */
  async createFromTemplate(
    templateId: string,
    userId: string,
    customName?: string
  ): Promise<CustomPrompt> {
    const template = await this.getTemplateById(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Increment template use count
    await this.db
      .update(promptTemplates)
      .set({ useCount: (template.useCount as any) + 1 })
      .where(eq(promptTemplates.id, templateId));

    // Create custom prompt from template
    const [prompt] = await this.db
      .insert(customPrompts)
      .values({
        userId,
        agentId: template.agentId,
        name: customName || `${template.name} (Custom)`,
        description: template.description,
        promptText: template.promptText,
        isActive: true,
        isDefault: false,
        metadata: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          category: template.category,
        }),
      })
      .returning();

    return prompt;
  }

  /**
   * Create a new prompt template (admin/power users)
   */
  async createTemplate(data: NewPromptTemplate): Promise<PromptTemplate> {
    const [template] = await this.db
      .insert(promptTemplates)
      .values(data)
      .returning();

    return template;
  }

  /**
   * Update a template (admin only)
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Pick<PromptTemplate, 'name' | 'description' | 'promptText' | 'category' | 'isPublic'>>
  ): Promise<PromptTemplate> {
    const [updated] = await this.db
      .update(promptTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(promptTemplates.id, templateId))
      .returning();

    if (!updated) {
      throw new Error('Template not found');
    }

    return updated;
  }

  /**
   * Delete a template (admin only)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const result = await this.db
      .delete(promptTemplates)
      .where(eq(promptTemplates.id, templateId))
      .returning();

    if (result.length === 0) {
      throw new Error('Template not found');
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(): Promise<Array<{ templateId: string; name: string; useCount: number; agentId: string }>> {
    const templates = await this.db
      .select()
      .from(promptTemplates)
      .orderBy(desc(promptTemplates.useCount));

    return templates.map(t => ({
      templateId: t.id,
      name: t.name,
      useCount: t.useCount as any as number || 0,
      agentId: t.agentId,
    }));
  }

  /**
   * Search templates by keyword
   */
  async searchTemplates(query: string, agentId?: string): Promise<PromptTemplate[]> {
    // Note: This is a simple implementation. For production, consider full-text search
    const allTemplates = await this.getTemplates(agentId);

    const lowerQuery = query.toLowerCase();
    return allTemplates.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      (t.category && t.category.toLowerCase().includes(lowerQuery))
    );
  }
}

// Singleton instance
export const customPromptsService = new CustomPromptsService();
