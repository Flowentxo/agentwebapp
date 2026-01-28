/**
 * COMMAND CENTER - Enhanced Recommendation Engine
 *
 * Combines user context, integrations, and ML to generate intelligent suggestions
 */

import {
  getUserContext,
  getContextualSuggestions,
  shouldShowProactiveSuggestions,
  type UserContext,
  type ContextualSuggestion,
} from './context-service';
import { getIntegrationSuggestions, getIntegratedContext } from './integration-service';
import { getMostUsedIntents, getMostUsedAgents } from './analytics-service';

// =====================================================
// TYPES
// =====================================================

export interface EnhancedRecommendation {
  id: string;
  type: 'command' | 'agent' | 'workflow' | 'action';
  title: string;
  description: string;

  // Execution
  command?: string;
  agentId?: string;
  workflow?: string;
  action?: () => void;

  // Scoring
  relevanceScore: number; // 0.0 to 1.0
  confidenceScore: number; // 0.0 to 1.0
  priorityScore: number; // 0.0 to 1.0 (weighted combination)

  // Context
  reasons: string[]; // Why this is recommended
  tags: string[]; // Categories: 'time-based', 'frequency-based', 'context-based', 'integration-based'
  source: 'analytics' | 'context' | 'integration' | 'ml';

  // Display
  icon?: string;
  color?: string;
  badge?: string; // e.g., "New", "Trending", "Urgent"

  // Lifecycle
  expiresAt?: Date;
  dismissable: boolean;
}

export interface RecommendationOptions {
  limit?: number;
  includeExpired?: boolean;
  minRelevance?: number;
  sources?: Array<'analytics' | 'context' | 'integration' | 'ml'>;
}

// =====================================================
// RECOMMENDATION GENERATION
// =====================================================

/**
 * Generate comprehensive recommendations for user
 */
export async function generateRecommendations(
  userId: string,
  sessionData?: {
    startTime?: Date;
    commandCount?: number;
    deviceType?: string;
    currentPage?: string;
  },
  options: RecommendationOptions = {}
): Promise<EnhancedRecommendation[]> {
  const {
    limit = 10,
    minRelevance = 0.5,
    sources = ['analytics', 'context', 'integration'],
  } = options;

  const recommendations: EnhancedRecommendation[] = [];

  // Get user context
  const context = await getUserContext(userId, sessionData);

  // Check if we should show proactive suggestions
  if (!shouldShowProactiveSuggestions(context)) {
    return [];
  }

  // Fetch from different sources in parallel
  const [contextSuggestions, integrationSuggestions, topIntents, topAgents] = await Promise.all([
    sources.includes('context') ? getContextualSuggestions(userId, context) : [],
    sources.includes('integration') ? getIntegrationSuggestions(userId) : [],
    sources.includes('analytics') ? getMostUsedIntents(userId, 3) : [],
    sources.includes('analytics') ? getMostUsedAgents(userId, 3) : [],
  ]);

  // Convert contextual suggestions
  if (sources.includes('context')) {
    for (const suggestion of contextSuggestions) {
      recommendations.push({
        id: suggestion.id,
        type: suggestion.agentId ? 'agent' : 'command',
        title: suggestion.title,
        description: suggestion.description,
        command: suggestion.command,
        agentId: suggestion.agentId,
        relevanceScore: suggestion.relevanceScore,
        confidenceScore: suggestion.relevanceScore * 0.9, // Slightly lower confidence
        priorityScore: calculatePriorityScore(suggestion.relevanceScore, suggestion.priority),
        reasons: [suggestion.contextReason],
        tags: ['context-based', 'time-based'],
        source: 'context',
        badge: suggestion.priority === 'high' ? 'Recommended' : undefined,
        dismissable: true,
      });
    }
  }

  // Convert integration suggestions
  if (sources.includes('integration')) {
    for (const suggestion of integrationSuggestions) {
      recommendations.push({
        id: suggestion.id,
        type: 'action',
        title: suggestion.title,
        description: suggestion.description,
        command: suggestion.command,
        relevanceScore: suggestion.priority === 'high' ? 0.95 : 0.8,
        confidenceScore: 0.9,
        priorityScore: calculatePriorityScore(0.9, suggestion.priority),
        reasons: [`Based on your ${suggestion.source}`],
        tags: ['integration-based', suggestion.source],
        source: 'integration',
        badge: suggestion.priority === 'high' ? 'Urgent' : undefined,
        dismissable: false, // Integration-based suggestions shouldn't be dismissed
      });
    }
  }

  // Add frequency-based agent suggestions
  if (sources.includes('analytics') && topAgents.length > 0) {
    recommendations.push({
      id: `agent-freq-${topAgents[0].agentId}`,
      type: 'agent',
      title: `Chat with ${topAgents[0].agentId}`,
      description: 'Your most frequently used agent',
      agentId: topAgents[0].agentId,
      relevanceScore: 0.85,
      confidenceScore: 0.9,
      priorityScore: 0.75,
      reasons: [`You've used this agent ${topAgents[0].count} times recently`],
      tags: ['frequency-based', 'analytics'],
      source: 'analytics',
      dismissable: true,
    });
  }

  // Add intent-based command suggestions
  if (sources.includes('analytics') && topIntents.length > 0) {
    const intent = topIntents[0];
    const commandText = generateCommandFromIntent(intent.intent);

    recommendations.push({
      id: `intent-freq-${intent.intent}`,
      type: 'command',
      title: `${intent.intent.charAt(0).toUpperCase() + intent.intent.slice(1)} something`,
      description: 'Your most common task',
      command: commandText,
      relevanceScore: 0.80,
      confidenceScore: 0.85,
      priorityScore: 0.70,
      reasons: [`You've done this ${intent.count} times recently`],
      tags: ['frequency-based', 'analytics'],
      source: 'analytics',
      dismissable: true,
    });
  }

  // Filter by minimum relevance
  const filtered = recommendations.filter(r => r.relevanceScore >= minRelevance);

  // Sort by priority score
  const sorted = filtered.sort((a, b) => b.priorityScore - a.priorityScore);

  // Return top N
  return sorted.slice(0, limit);
}

/**
 * Calculate priority score from relevance and priority level
 */
function calculatePriorityScore(
  relevance: number,
  priority: 'high' | 'medium' | 'low'
): number {
  const priorityWeights = { high: 1.0, medium: 0.7, low: 0.5 };
  return relevance * priorityWeights[priority];
}

/**
 * Generate command text from intent
 */
function generateCommandFromIntent(intent: string): string {
  const intentCommands: Record<string, string> = {
    analyze: 'Analyze recent data',
    create: 'Create new document',
    send: 'Send message',
    review: 'Review recent items',
    monitor: 'Monitor system status',
    research: 'Research topic',
    visualize: 'Visualize data',
    calculate: 'Calculate metrics',
    write: 'Write document',
    code: 'Review code',
    legal: 'Review contract',
    support: 'Check support tickets',
  };

  return intentCommands[intent] || `Execute ${intent} command`;
}

// =====================================================
// MACHINE LEARNING LAYER (Future Enhancement)
// =====================================================

/**
 * ML-based recommendation (placeholder for future implementation)
 */
export async function getMLRecommendations(
  userId: string,
  context: UserContext
): Promise<EnhancedRecommendation[]> {
  // Future: Train model on user behavior
  // - Pattern recognition
  // - Sequence prediction
  // - Anomaly detection
  // - Personalization clustering

  return [];
}

// =====================================================
// RECOMMENDATION RANKING
// =====================================================

/**
 * Re-rank recommendations based on real-time feedback
 */
export function reRankRecommendations(
  recommendations: EnhancedRecommendation[],
  feedback: {
    accepted?: string[]; // IDs of accepted recommendations
    dismissed?: string[]; // IDs of dismissed recommendations
  }
): EnhancedRecommendation[] {
  return recommendations.map(rec => {
    let adjustedScore = rec.priorityScore;

    // Boost similar recommendations if one was accepted
    if (feedback.accepted?.some(id => rec.tags.includes(id))) {
      adjustedScore *= 1.2;
    }

    // Penalize similar recommendations if one was dismissed
    if (feedback.dismissed?.some(id => rec.tags.includes(id))) {
      adjustedScore *= 0.7;
    }

    return {
      ...rec,
      priorityScore: Math.min(adjustedScore, 1.0),
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

// =====================================================
// RECOMMENDATION INSIGHTS
// =====================================================

/**
 * Get insights about recommendations (for debugging/analytics)
 */
export function getRecommendationInsights(
  recommendations: EnhancedRecommendation[]
): {
  totalCount: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  avgRelevance: number;
  avgConfidence: number;
  highPriorityCount: number;
} {
  const bySource: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalRelevance = 0;
  let totalConfidence = 0;
  let highPriorityCount = 0;

  recommendations.forEach(rec => {
    bySource[rec.source] = (bySource[rec.source] || 0) + 1;
    byType[rec.type] = (byType[rec.type] || 0) + 1;
    totalRelevance += rec.relevanceScore;
    totalConfidence += rec.confidenceScore;
    if (rec.priorityScore >= 0.8) highPriorityCount++;
  });

  return {
    totalCount: recommendations.length,
    bySource,
    byType,
    avgRelevance: recommendations.length ? totalRelevance / recommendations.length : 0,
    avgConfidence: recommendations.length ? totalConfidence / recommendations.length : 0,
    highPriorityCount,
  };
}

// =====================================================
// QUICK ACCESS HELPERS
// =====================================================

/**
 * Get "Quick Start" recommendations (morning routine)
 */
export async function getQuickStartRecommendations(
  userId: string
): Promise<EnhancedRecommendation[]> {
  const context = await getUserContext(userId);

  if (context.timeOfDay !== 'morning') {
    return [];
  }

  return generateRecommendations(userId, undefined, {
    limit: 3,
    minRelevance: 0.8,
    sources: ['context', 'integration'],
  });
}

/**
 * Get "End of Day" recommendations
 */
export async function getEndOfDayRecommendations(
  userId: string
): Promise<EnhancedRecommendation[]> {
  const context = await getUserContext(userId);

  if (context.timeOfDay !== 'evening') {
    return [];
  }

  return [
    {
      id: 'eod-summary',
      type: 'workflow',
      title: 'Daily Summary',
      description: 'Review today\'s accomplishments',
      workflow: 'daily-summary',
      relevanceScore: 0.95,
      confidenceScore: 0.9,
      priorityScore: 0.9,
      reasons: ['End of workday routine'],
      tags: ['time-based', 'workflow'],
      source: 'context',
      dismissable: true,
    },
    {
      id: 'eod-tomorrow',
      type: 'workflow',
      title: 'Plan Tomorrow',
      description: 'Set priorities for tomorrow',
      workflow: 'plan-tomorrow',
      relevanceScore: 0.88,
      confidenceScore: 0.85,
      priorityScore: 0.85,
      reasons: ['Proactive planning'],
      tags: ['time-based', 'workflow'],
      source: 'context',
      dismissable: true,
    },
  ];
}
