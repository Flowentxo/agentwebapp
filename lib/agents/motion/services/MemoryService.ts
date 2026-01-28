/**
 * MemoryService - Enterprise-Grade Memory & Context Management
 *
 * This service provides persistent memory capabilities for Motion agents:
 * - Short-term conversation memory
 * - Long-term learned context
 * - User preferences and patterns
 * - Cross-session knowledge retention
 */

import { getDb } from '@/lib/db';
import {
  motionAgentContext,
  motionConversations,
  motionUserPreferences,
} from '@/lib/db/schema-motion';
import { eq, and, desc, gte, sql, like } from 'drizzle-orm';
import { motionAI } from './MotionAIService';
import type { MotionAgentId } from '../shared/types';

// ============================================
// TYPES
// ============================================

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  type: 'fact' | 'preference' | 'pattern' | 'learned' | 'temporary';
  confidence: number;
  source: string;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

export interface MemorySearchResult {
  entries: MemoryEntry[];
  totalCount: number;
  relevanceScores: Map<string, number>;
}

export interface MemoryContext {
  userId: string;
  workspaceId: string;
  agentId: MotionAgentId;
}

export interface ConversationSummary {
  sessionId: string;
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  messageCount: number;
  createdAt: Date;
}

export interface UserProfile {
  userId: string;
  workspaceId: string;
  preferences: {
    communicationStyle: string;
    workingHours: {
      start: string;
      end: string;
      timezone: string;
      workDays: number[];
    };
    language: string;
    notificationPreferences: {
      email: boolean;
      slack: boolean;
      inApp: boolean;
    };
  };
  patterns: {
    mostActiveHours: number[];
    preferredAgents: string[];
    commonTopics: string[];
    averageSessionLength: number;
  };
  learnedFacts: Record<string, unknown>;
}

// ============================================
// MEMORY SERVICE CLASS
// ============================================

export class MemoryService {
  private static instance: MemoryService;
  private memoryCache: Map<string, MemoryEntry[]> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  // ============================================
  // MEMORY STORAGE
  // ============================================

  /**
   * Store a memory entry
   */
  async store(
    context: MemoryContext,
    key: string,
    value: unknown,
    options: {
      type?: MemoryEntry['type'];
      confidence?: number;
      source?: string;
      expiresIn?: number; // milliseconds
    } = {}
  ): Promise<MemoryEntry> {
    const {
      type = 'learned',
      confidence = 0.8,
      source = 'agent',
      expiresIn,
    } = options;

    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      key,
      value,
      type,
      confidence,
      source,
      createdAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
      accessCount: 0,
      lastAccessedAt: new Date(),
    };

    try {
      const db = getDb();
      await db
        .insert(motionAgentContext)
        .values({
          userId: context.userId,
          workspaceId: context.workspaceId,
          agentId: context.agentId,
          contextType: type,
          contextKey: key,
          contextValue: {
            value,
            confidence,
            source,
            accessCount: 0,
          },
          expiresAt: entry.expiresAt,
        })
        .onConflictDoUpdate({
          target: [
            motionAgentContext.workspaceId,
            motionAgentContext.userId,
            motionAgentContext.agentId,
            motionAgentContext.contextKey,
          ],
          set: {
            contextValue: {
              value,
              confidence,
              source,
              accessCount: sql`COALESCE((${motionAgentContext.contextValue}->>'accessCount')::int, 0) + 1`,
            },
            expiresAt: entry.expiresAt,
            updatedAt: new Date(),
          },
        });

      // Update cache
      this.updateCache(context, entry);

      return entry;
    } catch (error) {
      console.error('[MEMORY] Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve a specific memory
   */
  async retrieve(context: MemoryContext, key: string): Promise<MemoryEntry | null> {
    try {
      const db = getDb();
      const results = await db
        .select()
        .from(motionAgentContext)
        .where(
          and(
            eq(motionAgentContext.userId, context.userId),
            eq(motionAgentContext.workspaceId, context.workspaceId),
            eq(motionAgentContext.agentId, context.agentId),
            eq(motionAgentContext.contextKey, key)
          )
        )
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      const contextValue = row.contextValue as Record<string, unknown>;

      // Update access count
      await db
        .update(motionAgentContext)
        .set({
          contextValue: {
            ...contextValue,
            accessCount: ((contextValue.accessCount as number) || 0) + 1,
          },
          updatedAt: new Date(),
        })
        .where(eq(motionAgentContext.id, row.id));

      return {
        id: row.id,
        key: row.contextKey,
        value: contextValue.value,
        type: row.contextType as MemoryEntry['type'],
        confidence: (contextValue.confidence as number) || 0.8,
        source: (contextValue.source as string) || 'unknown',
        createdAt: row.createdAt || new Date(),
        expiresAt: row.expiresAt || undefined,
        accessCount: ((contextValue.accessCount as number) || 0) + 1,
        lastAccessedAt: new Date(),
      };
    } catch (error) {
      console.error('[MEMORY] Failed to retrieve memory:', error);
      return null;
    }
  }

  /**
   * Search memories by pattern
   */
  async search(
    context: MemoryContext,
    options: {
      keyPattern?: string;
      types?: MemoryEntry['type'][];
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<MemorySearchResult> {
    const { keyPattern, types, minConfidence = 0, limit = 50 } = options;

    try {
      const db = getDb();
      let query = db
        .select()
        .from(motionAgentContext)
        .where(
          and(
            eq(motionAgentContext.userId, context.userId),
            eq(motionAgentContext.workspaceId, context.workspaceId),
            eq(motionAgentContext.agentId, context.agentId)
          )
        )
        .orderBy(desc(motionAgentContext.updatedAt))
        .limit(limit);

      const results = await query;

      const entries: MemoryEntry[] = results
        .filter((row) => {
          // Filter by key pattern
          if (keyPattern && !row.contextKey.includes(keyPattern)) {
            return false;
          }
          // Filter by types
          if (types && !types.includes(row.contextType as MemoryEntry['type'])) {
            return false;
          }
          // Filter by confidence
          const contextValue = row.contextValue as Record<string, unknown>;
          if ((contextValue.confidence as number) < minConfidence) {
            return false;
          }
          return true;
        })
        .map((row) => {
          const contextValue = row.contextValue as Record<string, unknown>;
          return {
            id: row.id,
            key: row.contextKey,
            value: contextValue.value,
            type: row.contextType as MemoryEntry['type'],
            confidence: (contextValue.confidence as number) || 0.8,
            source: (contextValue.source as string) || 'unknown',
            createdAt: row.createdAt || new Date(),
            expiresAt: row.expiresAt || undefined,
            accessCount: (contextValue.accessCount as number) || 0,
            lastAccessedAt: row.updatedAt || new Date(),
          };
        });

      return {
        entries,
        totalCount: entries.length,
        relevanceScores: new Map(entries.map((e) => [e.id, e.confidence])),
      };
    } catch (error) {
      console.error('[MEMORY] Failed to search memories:', error);
      return { entries: [], totalCount: 0, relevanceScores: new Map() };
    }
  }

  /**
   * Delete a memory
   */
  async delete(context: MemoryContext, key: string): Promise<boolean> {
    try {
      const db = getDb();
      await db
        .delete(motionAgentContext)
        .where(
          and(
            eq(motionAgentContext.userId, context.userId),
            eq(motionAgentContext.workspaceId, context.workspaceId),
            eq(motionAgentContext.agentId, context.agentId),
            eq(motionAgentContext.contextKey, key)
          )
        );
      return true;
    } catch (error) {
      console.error('[MEMORY] Failed to delete memory:', error);
      return false;
    }
  }

  // ============================================
  // CONVERSATION MEMORY
  // ============================================

  /**
   * Store conversation and generate summary
   */
  async storeConversation(
    context: MemoryContext,
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    generateSummary: boolean = true
  ): Promise<ConversationSummary | null> {
    try {
      const db = getDb();

      // Generate summary using AI
      let summary: ConversationSummary | null = null;
      if (generateSummary && messages.length > 2) {
        const summaryResult = await motionAI.summarize({
          content: messages.map((m) => `${m.role}: ${m.content}`).join('\n\n'),
          style: 'bullet',
          focusOn: ['key decisions', 'action items', 'important information'],
        });

        // Extract action items
        const actionResult = await motionAI.extractActionItems(
          messages.map((m) => m.content).join('\n')
        );

        summary = {
          sessionId,
          summary: summaryResult.summary,
          keyTopics: summaryResult.keyPoints,
          actionItems: actionResult.actionItems.map((a) => a.task),
          sentiment: 'neutral', // Could be analyzed
          messageCount: messages.length,
          createdAt: new Date(),
        };
      }

      // Store conversation
      await db
        .insert(motionConversations)
        .values({
          agentId: context.agentId,
          userId: context.userId,
          workspaceId: context.workspaceId,
          sessionId,
          messages: messages as unknown as Record<string, unknown>,
          context: {},
          messageCount: messages.length,
          summary: summary?.summary,
          lastMessageAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [motionConversations.sessionId],
          set: {
            messages: messages as unknown as Record<string, unknown>,
            messageCount: messages.length,
            summary: summary?.summary,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          },
        });

      // Store summary as memory if significant
      if (summary && summary.keyTopics.length > 0) {
        await this.store(context, `conversation:${sessionId}:summary`, summary, {
          type: 'learned',
          confidence: 0.9,
          source: 'conversation',
          expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      }

      return summary;
    } catch (error) {
      console.error('[MEMORY] Failed to store conversation:', error);
      return null;
    }
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(
    context: MemoryContext,
    limit: number = 10
  ): Promise<ConversationSummary[]> {
    try {
      const db = getDb();
      const conversations = await db
        .select()
        .from(motionConversations)
        .where(
          and(
            eq(motionConversations.userId, context.userId),
            eq(motionConversations.workspaceId, context.workspaceId),
            eq(motionConversations.agentId, context.agentId)
          )
        )
        .orderBy(desc(motionConversations.lastMessageAt))
        .limit(limit);

      return conversations.map((c) => ({
        sessionId: c.sessionId,
        summary: c.summary || 'No summary available',
        keyTopics: [],
        actionItems: [],
        sentiment: 'neutral' as const,
        messageCount: c.messageCount || 0,
        createdAt: c.createdAt || new Date(),
      }));
    } catch (error) {
      console.error('[MEMORY] Failed to get conversations:', error);
      return [];
    }
  }

  // ============================================
  // USER PROFILE & PREFERENCES
  // ============================================

  /**
   * Get or create user profile
   */
  async getUserProfile(userId: string, workspaceId: string): Promise<UserProfile> {
    try {
      const db = getDb();
      const prefs = await db
        .select()
        .from(motionUserPreferences)
        .where(
          and(
            eq(motionUserPreferences.userId, userId),
            eq(motionUserPreferences.workspaceId, workspaceId)
          )
        )
        .limit(1);

      if (prefs.length === 0) {
        // Return default profile
        return this.getDefaultProfile(userId, workspaceId);
      }

      const p = prefs[0];
      return {
        userId,
        workspaceId,
        preferences: {
          communicationStyle: p.communicationStyle || 'professional',
          workingHours: {
            start: p.workingHoursStart || '09:00',
            end: p.workingHoursEnd || '17:00',
            timezone: p.workingHoursTimezone || 'UTC',
            workDays: p.workDays || [1, 2, 3, 4, 5],
          },
          language: 'en',
          notificationPreferences: {
            email: p.notifyEmail ?? true,
            slack: p.notifySlack ?? true,
            inApp: p.notifyInApp ?? true,
          },
        },
        patterns: {
          mostActiveHours: [],
          preferredAgents: [],
          commonTopics: [],
          averageSessionLength: 0,
        },
        learnedFacts: (p.agentPreferences as Record<string, unknown>) || {},
      };
    } catch (error) {
      console.error('[MEMORY] Failed to get user profile:', error);
      return this.getDefaultProfile(userId, workspaceId);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    workspaceId: string,
    updates: Partial<UserProfile['preferences']>
  ): Promise<void> {
    try {
      const db = getDb();
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (updates.communicationStyle) {
        updateData.communicationStyle = updates.communicationStyle;
      }
      if (updates.workingHours) {
        if (updates.workingHours.start) updateData.workingHoursStart = updates.workingHours.start;
        if (updates.workingHours.end) updateData.workingHoursEnd = updates.workingHours.end;
        if (updates.workingHours.timezone) updateData.workingHoursTimezone = updates.workingHours.timezone;
        if (updates.workingHours.workDays) updateData.workDays = updates.workingHours.workDays;
      }
      if (updates.notificationPreferences) {
        if (updates.notificationPreferences.email !== undefined) {
          updateData.notifyEmail = updates.notificationPreferences.email;
        }
        if (updates.notificationPreferences.slack !== undefined) {
          updateData.notifySlack = updates.notificationPreferences.slack;
        }
        if (updates.notificationPreferences.inApp !== undefined) {
          updateData.notifyInApp = updates.notificationPreferences.inApp;
        }
      }

      await db
        .insert(motionUserPreferences)
        .values({
          userId,
          workspaceId,
          ...updateData,
        })
        .onConflictDoUpdate({
          target: [motionUserPreferences.userId, motionUserPreferences.workspaceId],
          set: updateData,
        });
    } catch (error) {
      console.error('[MEMORY] Failed to update preferences:', error);
    }
  }

  /**
   * Learn a fact about the user
   */
  async learnUserFact(
    userId: string,
    workspaceId: string,
    agentId: MotionAgentId,
    key: string,
    value: unknown
  ): Promise<void> {
    await this.store(
      { userId, workspaceId, agentId },
      `user:${key}`,
      value,
      {
        type: 'fact',
        confidence: 0.7,
        source: 'observation',
      }
    );
  }

  // ============================================
  // CONTEXT BUILDING
  // ============================================

  /**
   * Build full context for agent execution
   */
  async buildAgentContext(context: MemoryContext): Promise<{
    userProfile: UserProfile;
    recentMemories: MemoryEntry[];
    recentConversations: ConversationSummary[];
    contextSummary: string;
  }> {
    const [userProfile, memories, conversations] = await Promise.all([
      this.getUserProfile(context.userId, context.workspaceId),
      this.search(context, { limit: 20, minConfidence: 0.5 }),
      this.getRecentConversations(context, 5),
    ]);

    // Build context summary
    const contextParts: string[] = [];

    if (memories.entries.length > 0) {
      contextParts.push(
        'Known facts:',
        ...memories.entries.slice(0, 10).map((m) => `- ${m.key}: ${JSON.stringify(m.value)}`)
      );
    }

    if (conversations.length > 0) {
      contextParts.push(
        '\nRecent topics:',
        ...conversations.slice(0, 3).map((c) => `- ${c.summary}`)
      );
    }

    return {
      userProfile,
      recentMemories: memories.entries,
      recentConversations: conversations,
      contextSummary: contextParts.join('\n'),
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private getDefaultProfile(userId: string, workspaceId: string): UserProfile {
    return {
      userId,
      workspaceId,
      preferences: {
        communicationStyle: 'professional',
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'UTC',
          workDays: [1, 2, 3, 4, 5],
        },
        language: 'en',
        notificationPreferences: {
          email: true,
          slack: true,
          inApp: true,
        },
      },
      patterns: {
        mostActiveHours: [],
        preferredAgents: [],
        commonTopics: [],
        averageSessionLength: 0,
      },
      learnedFacts: {},
    };
  }

  private updateCache(context: MemoryContext, entry: MemoryEntry): void {
    const cacheKey = `${context.userId}:${context.workspaceId}:${context.agentId}`;
    const cached = this.memoryCache.get(cacheKey) || [];
    cached.push(entry);
    this.memoryCache.set(cacheKey, cached.slice(-100)); // Keep last 100
  }

  /**
   * Clear expired memories
   */
  async clearExpiredMemories(): Promise<number> {
    try {
      const db = getDb();
      const result = await db
        .delete(motionAgentContext)
        .where(
          and(
            sql`${motionAgentContext.expiresAt} IS NOT NULL`,
            sql`${motionAgentContext.expiresAt} < NOW()`
          )
        );
      return 0; // Drizzle doesn't return count easily
    } catch (error) {
      console.error('[MEMORY] Failed to clear expired memories:', error);
      return 0;
    }
  }
}

// Export singleton
export const memoryService = MemoryService.getInstance();
export default MemoryService;
