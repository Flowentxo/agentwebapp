/**
 * COMMAND CENTER - Context Service
 *
 * Provides intelligent context awareness for better suggestions
 */

import { getUserPreferences, getMostUsedIntents, getCommandHistory } from './analytics-service';

// =====================================================
// TYPES
// =====================================================

export interface UserContext {
  userId: string;

  // Time context
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWeekend: boolean;
  isWorkingHours: boolean;

  // Location context
  currentPage?: string;
  previousPage?: string;

  // Activity context
  recentCommands: string[];
  recentIntents: string[];
  recentAgents: string[];

  // Session context
  sessionDuration: number; // in milliseconds
  commandsThisSession: number;

  // Device context
  deviceType: 'desktop' | 'mobile' | 'tablet';

  // User patterns
  typicalWorkStartHour?: number;
  typicalWorkEndHour?: number;
  mostActiveHours: number[];

  // Calendar context (if integrated)
  upcomingMeetings?: Array<{
    title: string;
    startTime: Date;
    participants: string[];
  }>;

  // Email context (if integrated)
  unreadCount?: number;
  urgentEmails?: number;
}

export interface ContextualSuggestion {
  id: string;
  title: string;
  description: string;
  command?: string;
  agentId?: string;
  relevanceScore: number;
  contextReason: string; // Why this is relevant now
  priority: 'high' | 'medium' | 'low';
}

// =====================================================
// CONTEXT GATHERING
// =====================================================

/**
 * Get comprehensive user context
 */
export async function getUserContext(userId: string, sessionData?: {
  startTime?: Date;
  commandCount?: number;
  deviceType?: string;
  currentPage?: string;
  previousPage?: string;
}): Promise<UserContext> {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Time context
  let timeOfDay: UserContext['timeOfDay'];
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[day] as UserContext['dayOfWeek'];
  const isWeekend = day === 0 || day === 6;
  const isWorkingHours = hour >= 9 && hour < 18 && !isWeekend;

  // Get user preferences
  const prefs = await getUserPreferences(userId);

  // Recent activity
  const recentHistory = await getCommandHistory(userId, { limit: 10 });
  const recentCommands = recentHistory.map(h => h.originalText).slice(0, 5);
  const recentIntents = Array.from(new Set(recentHistory.map(h => h.intent))).slice(0, 5);

  // Get recent agents from preferences
  const recentAgents = prefs.recentAgents || [];

  // Session context
  const sessionDuration = sessionData?.startTime
    ? now.getTime() - sessionData.startTime.getTime()
    : 0;
  const commandsThisSession = sessionData?.commandCount || 0;

  // Device type
  const deviceType = (sessionData?.deviceType as UserContext['deviceType']) || 'desktop';

  // User patterns (analyze from history)
  const mostActiveHours = await getMostActiveHours(userId);

  return {
    userId,
    timeOfDay,
    dayOfWeek,
    isWeekend,
    isWorkingHours,
    currentPage: sessionData?.currentPage,
    previousPage: sessionData?.previousPage,
    recentCommands,
    recentIntents,
    recentAgents,
    sessionDuration,
    commandsThisSession,
    deviceType,
    mostActiveHours,
  };
}

/**
 * Get user's most active hours from history
 */
async function getMostActiveHours(userId: string): Promise<number[]> {
  const history = await getCommandHistory(userId, { limit: 100 });

  const hourCounts = new Map<number, number>();
  history.forEach(cmd => {
    const hour = new Date(cmd.createdAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  return Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hour]) => hour)
    .slice(0, 5);
}

// =====================================================
// CONTEXTUAL SUGGESTIONS
// =====================================================

/**
 * Generate contextual suggestions based on current context
 */
export async function getContextualSuggestions(
  userId: string,
  context: UserContext
): Promise<ContextualSuggestion[]> {
  const suggestions: ContextualSuggestion[] = [];

  // Get user's most used intents
  const topIntents = await getMostUsedIntents(userId, 5);

  // Morning routine suggestions
  if (context.timeOfDay === 'morning' && context.isWorkingHours) {
    suggestions.push({
      id: 'morning-1',
      title: 'Check overnight updates',
      description: 'Review what happened while you were away',
      command: 'Show me overnight activity summary',
      relevanceScore: 0.9,
      contextReason: 'You usually check updates first thing in the morning',
      priority: 'high',
    });

    if (topIntents.length > 0 && topIntents[0].intent === 'support') {
      suggestions.push({
        id: 'morning-2',
        title: 'Review customer tickets',
        description: 'Check for urgent support requests',
        command: 'Show customer support tickets from last 12 hours',
        agentId: 'cassie',
        relevanceScore: 0.85,
        contextReason: 'You typically handle support tickets in the morning',
        priority: 'high',
      });
    }
  }

  // Afternoon productivity suggestions
  if (context.timeOfDay === 'afternoon' && context.isWorkingHours) {
    if (topIntents.some(i => i.intent === 'analyze')) {
      suggestions.push({
        id: 'afternoon-1',
        title: 'Analyze today\'s performance',
        description: 'Check progress on daily goals',
        command: 'Analyze today\'s metrics and performance',
        agentId: 'dexter',
        relevanceScore: 0.82,
        contextReason: 'Mid-day check-in based on your patterns',
        priority: 'medium',
      });
    }
  }

  // End of day suggestions
  if (context.timeOfDay === 'evening' && context.isWorkingHours) {
    suggestions.push({
      id: 'evening-1',
      title: 'Daily summary report',
      description: 'Get overview of today\'s accomplishments',
      command: 'Generate daily summary report',
      relevanceScore: 0.88,
      contextReason: 'Wrap up your day with a summary',
      priority: 'high',
    });

    suggestions.push({
      id: 'evening-2',
      title: 'Prepare for tomorrow',
      description: 'Plan tomorrow\'s priorities',
      command: 'Create briefing for tomorrow',
      relevanceScore: 0.75,
      contextReason: 'Get ready for tomorrow',
      priority: 'medium',
    });
  }

  // Weekend suggestions
  if (context.isWeekend) {
    suggestions.push({
      id: 'weekend-1',
      title: 'Weekly review',
      description: 'Look back at this week\'s achievements',
      command: 'Generate weekly performance review',
      relevanceScore: 0.80,
      contextReason: 'Weekend is a good time to reflect',
      priority: 'medium',
    });
  }

  // Based on recent activity
  if (context.recentIntents.includes('code')) {
    suggestions.push({
      id: 'recent-1',
      title: 'Continue code review',
      description: 'Pick up where you left off',
      command: 'Resume code review session',
      agentId: 'kai',
      relevanceScore: 0.85,
      contextReason: 'You were working on code recently',
      priority: 'high',
    });
  }

  // Session-based suggestions
  if (context.commandsThisSession > 5) {
    suggestions.push({
      id: 'session-1',
      title: 'Take a break',
      description: 'You\'ve been productive! Time for a short break.',
      relevanceScore: 0.70,
      contextReason: `You've executed ${context.commandsThisSession} commands`,
      priority: 'low',
    });
  }

  // Sort by relevance and priority
  return suggestions
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.relevanceScore - a.relevanceScore;
    })
    .slice(0, 5);
}

// =====================================================
// CONTEXT PREDICATES
// =====================================================

/**
 * Check if user is in deep work mode (long session, many commands)
 */
export function isDeepWorkMode(context: UserContext): boolean {
  return context.sessionDuration > 30 * 60 * 1000 && // > 30 minutes
         context.commandsThisSession > 10;
}

/**
 * Check if user is likely multitasking
 */
export function isLikelyMultitasking(context: UserContext): boolean {
  const uniqueIntents = new Set(context.recentIntents);
  return uniqueIntents.size >= 3 && context.commandsThisSession > 5;
}

/**
 * Check if it's a good time for proactive suggestions
 */
export function shouldShowProactiveSuggestions(context: UserContext): boolean {
  // Don't interrupt deep work
  if (isDeepWorkMode(context)) return false;

  // Don't show too many if user is already active
  if (context.commandsThisSession > 15) return false;

  // Good times: morning start, afternoon lull, end of day
  const hour = new Date().getHours();
  const goodHours = [9, 10, 14, 17]; // 9am, 10am, 2pm, 5pm

  return goodHours.includes(hour);
}

/**
 * Get next suggested action based on context
 */
export async function getNextAction(
  userId: string,
  context: UserContext
): Promise<ContextualSuggestion | null> {
  const suggestions = await getContextualSuggestions(userId, context);

  // Filter by current context
  if (!shouldShowProactiveSuggestions(context)) {
    return null;
  }

  // Return highest priority suggestion
  return suggestions.find(s => s.priority === 'high') || suggestions[0] || null;
}

// =====================================================
// CONTEXT TRACKING
// =====================================================

/**
 * Update session context (call this on user activity)
 */
export function updateSessionContext(
  currentContext: Partial<UserContext>,
  updates: {
    commandExecuted?: boolean;
    pageChanged?: string;
  }
): Partial<UserContext> {
  const updated = { ...currentContext };

  if (updates.commandExecuted) {
    updated.commandsThisSession = (updated.commandsThisSession || 0) + 1;
  }

  if (updates.pageChanged) {
    updated.previousPage = updated.currentPage;
    updated.currentPage = updates.pageChanged;
  }

  return updated;
}
