/**
 * COMMAND CENTER - Analytics & Personalization Service
 *
 * Tracks user behavior and generates personalized recommendations
 */

import { getDb } from '@/lib/db';
import {
  commandHistory,
  userCommandPreferences,
  userActivityLog,
  smartSuggestions,
  usageStatistics,
  type CommandHistory,
  type NewCommandHistory,
  type UserCommandPreferences,
  type SmartSuggestion,
  type UsageStatistics,
} from '@/lib/db/schema-command-center';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { ParsedCommand } from '@/lib/commands/command-parser';

// =====================================================
// COMMAND TRACKING
// =====================================================

/**
 * Track a command execution
 */
export async function trackCommandExecution(
  userId: string,
  command: ParsedCommand,
  result: {
    success: boolean;
    executionTimeMs?: number;
    error?: string;
  },
  context?: {
    source?: string;
    deviceType?: string;
    sessionId?: string;
  }
): Promise<void> {
  const db = getDb();

  // Save to command history
  await db.insert(commandHistory).values({
    userId,
    originalText: command.originalText,
    intent: command.intent,
    confidence: command.confidence,
    agentIds: command.agents.map(a => a.id),
    parameters: command.parameters,
    executedSuccessfully: result.success,
    executionTimeMs: result.executionTimeMs,
    errorMessage: result.error,
    source: context?.source || 'command-center',
    deviceType: context?.deviceType,
  });

  // Track activity
  await trackActivity(userId, 'command_executed', command.intent, 'command', {
    sessionId: context?.sessionId,
    durationMs: result.executionTimeMs,
    metadata: {
      success: result.success,
      confidence: command.confidence,
      agentCount: command.agents.length,
    },
  });

  // Update recent agents in user preferences
  await updateRecentAgents(userId, command.agents.map(a => a.id));
}

/**
 * Track user activity
 */
export async function trackActivity(
  userId: string,
  activityType: string,
  entityId?: string,
  entityType?: string,
  extra?: {
    sessionId?: string;
    durationMs?: number;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const db = getDb();

  await db.insert(userActivityLog).values({
    userId,
    activityType,
    entityId,
    entityType,
    sessionId: extra?.sessionId,
    durationMs: extra?.durationMs,
    metadata: extra?.metadata || {},
  });
}

// =====================================================
// USER PREFERENCES
// =====================================================

/**
 * Get user's command preferences (create default if not exists)
 */
export async function getUserPreferences(userId: string): Promise<UserCommandPreferences> {
  const db = getDb();

  let [prefs] = await db
    .select()
    .from(userCommandPreferences)
    .where(eq(userCommandPreferences.userId, userId));

  if (!prefs) {
    try {
      // Create default preferences (will fail if user doesn't exist - that's OK)
      [prefs] = await db
        .insert(userCommandPreferences)
        .values({ userId })
        .returning();
    } catch (error) {
      // If user doesn't exist in users table, return sensible defaults
      // This prevents 500 errors for demo/test users
      return {
        id: crypto.randomUUID(),
        userId,
        recentAgents: [],
        preferredAgents: [],
        recentCommands: [],
        preferredCommands: [],
        displayPreferences: {},
        notificationSettings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserCommandPreferences;
    }
  }

  return prefs;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserCommandPreferences>
): Promise<UserCommandPreferences> {
  const db = getDb();

  try {
    const [updated] = await db
      .update(userCommandPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userCommandPreferences.userId, userId))
      .returning();

    // If no rows were updated, get current prefs (will create defaults if needed)
    if (!updated) {
      return getUserPreferences(userId);
    }

    return updated;
  } catch (error) {
    // Fallback: return current preferences
    return getUserPreferences(userId);
  }
}

/**
 * Update recent agents list (keep last 10)
 */
async function updateRecentAgents(userId: string, newAgentIds: string[]): Promise<void> {
  const prefs = await getUserPreferences(userId);

  const recentAgents = Array.from(new Set([...newAgentIds, ...prefs.recentAgents])).slice(0, 10);

  await updateUserPreferences(userId, { recentAgents });
}

// =====================================================
// ANALYTICS & INSIGHTS
// =====================================================

/**
 * Get user's command history with filters
 */
export async function getCommandHistory(
  userId: string,
  options: {
    limit?: number;
    intent?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}
): Promise<CommandHistory[]> {
  const db = getDb();

  let query = db
    .select()
    .from(commandHistory)
    .where(eq(commandHistory.userId, userId))
    .orderBy(desc(commandHistory.createdAt));

  if (options.intent) {
    query = query.where(eq(commandHistory.intent, options.intent));
  }

  if (options.fromDate) {
    query = query.where(gte(commandHistory.createdAt, options.fromDate));
  }

  if (options.toDate) {
    query = query.where(lte(commandHistory.createdAt, options.toDate));
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

/**
 * Get user's most used intents
 */
export async function getMostUsedIntents(
  userId: string,
  limit: number = 5
): Promise<Array<{ intent: string; count: number; lastUsed: Date }>> {
  const db = getDb();

  const results = await db
    .select({
      intent: commandHistory.intent,
      count: sql<number>`COUNT(*)::int`,
      lastUsed: sql<Date>`MAX(${commandHistory.createdAt})`,
    })
    .from(commandHistory)
    .where(eq(commandHistory.userId, userId))
    .groupBy(commandHistory.intent)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);

  return results;
}

/**
 * Get user's most used agents
 */
export async function getMostUsedAgents(
  userId: string,
  limit: number = 5
): Promise<Array<{ agentId: string; count: number }>> {
  const db = getDb();

  const results = await db
    .select({
      agentId: sql<string>`jsonb_array_elements_text(${commandHistory.agentIds})`,
    })
    .from(commandHistory)
    .where(eq(commandHistory.userId, userId));

  // Count manually (since JSONB array aggregation is complex)
  const counts = new Map<string, number>();
  for (const row of results) {
    const current = counts.get(row.agentId) || 0;
    counts.set(row.agentId, current + 1);
  }

  return Array.from(counts.entries())
    .map(([agentId, count]) => ({ agentId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get user's daily/weekly/monthly stats
 */
export async function getUserStats(
  userId: string,
  periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<UsageStatistics | null> {
  const db = getDb();

  const now = new Date();
  let startDate: Date;

  switch (periodType) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const [stats] = await db
    .select()
    .from(usageStatistics)
    .where(
      and(
        eq(usageStatistics.userId, userId),
        eq(usageStatistics.periodType, periodType),
        eq(usageStatistics.periodStart, startDate)
      )
    );

  return stats || null;
}

/**
 * Calculate and store usage statistics for a period
 */
export async function calculateUsageStatistics(
  userId: string,
  periodType: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): Promise<UsageStatistics> {
  const db = getDb();

  // Get commands in period
  const commands = await db
    .select()
    .from(commandHistory)
    .where(
      and(
        eq(commandHistory.userId, userId),
        gte(commandHistory.createdAt, startDate),
        lte(commandHistory.createdAt, endDate)
      )
    );

  // Get activities in period
  const activities = await db
    .select()
    .from(userActivityLog)
    .where(
      and(
        eq(userActivityLog.userId, userId),
        gte(userActivityLog.createdAt, startDate),
        lte(userActivityLog.createdAt, endDate)
      )
    );

  // Calculate metrics
  const totalCommands = commands.length;
  const successfulCommands = commands.filter(c => c.executedSuccessfully).length;
  const totalAgentInteractions = activities.filter(a => a.activityType === 'agent_opened').length;
  const totalTimeSpentMs = activities.reduce((sum, a) => sum + (a.durationMs || 0), 0);

  // Top intents
  const intentCounts = new Map<string, number>();
  commands.forEach(cmd => {
    intentCounts.set(cmd.intent, (intentCounts.get(cmd.intent) || 0) + 1);
  });
  const topIntents = Array.from(intentCounts.entries())
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top agents (flatten JSONB arrays)
  const agentCounts = new Map<string, number>();
  commands.forEach(cmd => {
    const agents = cmd.agentIds as string[];
    agents.forEach(agentId => {
      agentCounts.set(agentId, (agentCounts.get(agentId) || 0) + 1);
    });
  });
  const topAgents = Array.from(agentCounts.entries())
    .map(([agentId, count]) => ({ agentId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top commands
  const commandCounts = new Map<string, number>();
  commands.forEach(cmd => {
    commandCounts.set(cmd.originalText, (commandCounts.get(cmd.originalText) || 0) + 1);
  });
  const topCommands = Array.from(commandCounts.entries())
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Performance
  const avgCommandConfidence = commands.length
    ? commands.reduce((sum, c) => sum + c.confidence, 0) / commands.length
    : 0;
  const avgExecutionTimeMs = commands.filter(c => c.executionTimeMs).length
    ? commands.reduce((sum, c) => sum + (c.executionTimeMs || 0), 0) /
      commands.filter(c => c.executionTimeMs).length
    : 0;
  const successRate = totalCommands ? successfulCommands / totalCommands : 0;

  // Insert or update
  const [stats] = await db
    .insert(usageStatistics)
    .values({
      userId,
      periodType,
      periodStart: startDate,
      periodEnd: endDate,
      totalCommands,
      totalAgentInteractions,
      totalTimeSpentMs,
      topIntents,
      topAgents,
      topCommands,
      avgCommandConfidence,
      avgExecutionTimeMs: Math.round(avgExecutionTimeMs),
      successRate,
    })
    .onConflictDoUpdate({
      target: [usageStatistics.userId, usageStatistics.periodType, usageStatistics.periodStart],
      set: {
        totalCommands,
        totalAgentInteractions,
        totalTimeSpentMs,
        topIntents,
        topAgents,
        topCommands,
        avgCommandConfidence,
        avgExecutionTimeMs: Math.round(avgExecutionTimeMs),
        successRate,
      },
    })
    .returning();

  return stats;
}

// =====================================================
// SMART SUGGESTIONS
// =====================================================

/**
 * Generate smart suggestions for user based on patterns
 */
export async function generateSmartSuggestions(userId: string): Promise<SmartSuggestion[]> {
  const db = getDb();

  const prefs = await getUserPreferences(userId);
  const topIntents = await getMostUsedIntents(userId, 3);
  const topAgents = await getMostUsedAgents(userId, 3);

  const suggestions: Array<Omit<SmartSuggestion, 'id' | 'createdAt'>> = [];

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Time-based suggestions
  const hour = now.getHours();
  if (hour >= 8 && hour < 12) {
    // Morning: Suggest most-used commands
    if (topIntents.length > 0) {
      suggestions.push({
        userId,
        suggestionType: 'command',
        title: `Ready to ${topIntents[0].intent}?`,
        description: `You usually ${topIntents[0].intent} in the morning`,
        commandText: `${topIntents[0].intent.charAt(0).toUpperCase() + topIntents[0].intent.slice(1)}`,
        agentId: null,
        actionPayload: null,
        relevanceScore: 0.8,
        confidenceScore: 0.75,
        contextFactors: { timeOfDay: 'morning', frequencyBased: true },
        shown: false,
        shownAt: null,
        accepted: false,
        acceptedAt: null,
        dismissed: false,
        dismissedAt: null,
        expiresAt,
      });
    }
  }

  // Frequency-based agent suggestions
  if (topAgents.length > 0) {
    suggestions.push({
      userId,
      suggestionType: 'agent',
      title: `Chat with ${topAgents[0].agentId}`,
      description: 'Your most-used agent',
      commandText: null,
      agentId: topAgents[0].agentId,
      actionPayload: null,
      relevanceScore: 0.9,
      confidenceScore: 0.85,
      contextFactors: { frequencyBased: true },
      shown: false,
      shownAt: null,
      accepted: false,
      acceptedAt: null,
      dismissed: false,
      dismissedAt: null,
      expiresAt,
    });
  }

  // Insert suggestions
  if (suggestions.length > 0) {
    await db.insert(smartSuggestions).values(suggestions);
  }

  // Return active suggestions
  return getActiveSuggestions(userId);
}

/**
 * Get active (non-expired, non-dismissed) suggestions
 */
export async function getActiveSuggestions(userId: string): Promise<SmartSuggestion[]> {
  const db = getDb();

  return db
    .select()
    .from(smartSuggestions)
    .where(
      and(
        eq(smartSuggestions.userId, userId),
        eq(smartSuggestions.dismissed, false),
        gte(smartSuggestions.expiresAt, new Date())
      )
    )
    .orderBy(desc(smartSuggestions.relevanceScore))
    .limit(5);
}

/**
 * Mark suggestion as accepted
 */
export async function acceptSuggestion(suggestionId: string): Promise<void> {
  const db = getDb();

  await db
    .update(smartSuggestions)
    .set({ accepted: true, acceptedAt: new Date() })
    .where(eq(smartSuggestions.id, suggestionId));
}

/**
 * Mark suggestion as dismissed
 */
export async function dismissSuggestion(suggestionId: string): Promise<void> {
  const db = getDb();

  await db
    .update(smartSuggestions)
    .set({ dismissed: true, dismissedAt: new Date() })
    .where(eq(smartSuggestions.id, suggestionId));
}
