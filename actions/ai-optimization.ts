'use server';

/**
 * AI Optimization Server Actions
 *
 * Handles memory compression and context optimization for agent conversations.
 * Called by the "Optimize Context" button in the FinOps Terminal.
 */

import {
  compressConversation,
  getCompressionStats,
  optimizeAllThreads,
  type CompressionResult
} from '@/lib/ai/memory-service';
import { getSessionUser } from '@/lib/auth/session';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-optimization');

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizationResult {
  success: boolean;
  savedTokens: number;
  newContextSize: number;
  compressionRatio: number;
  estimatedCreditsSaved: number;
  message: string;
  error?: string;
}

export interface OptimizationStats {
  totalThreads: number;
  totalMessages: number;
  totalTokens: number;
  potentialSavings: number;
  threadsNeedingOptimization: number;
}

export interface BulkOptimizationResult {
  success: boolean;
  threadsOptimized: number;
  totalSavedTokens: number;
  totalCreditsSaved: number;
  errors: string[];
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Optimize memory for a specific agent conversation
 * Called when user clicks "Optimize Context" for a single thread
 */
export async function optimizeThreadMemory(
  agentId: string,
  workspaceId?: string
): Promise<OptimizationResult> {
  try {
    logger.info(`[OPTIMIZE] Starting optimization for agent=${agentId}`);

    // Get current user
    const user = await getSessionUser();
    if (!user) {
      return {
        success: false,
        savedTokens: 0,
        newContextSize: 0,
        compressionRatio: 1,
        estimatedCreditsSaved: 0,
        message: 'Authentication required',
        error: 'User not authenticated',
      };
    }

    const userId = user.id;
    const wsId = workspaceId || user.defaultWorkspaceId || 'default';

    // Perform compression
    const result = await compressConversation(agentId, userId, wsId);

    if (!result.success) {
      return {
        success: false,
        savedTokens: 0,
        newContextSize: 0,
        compressionRatio: 1,
        estimatedCreditsSaved: 0,
        message: 'Optimization failed',
        error: result.error,
      };
    }

    // Calculate percentage reduction
    const reductionPercent = result.compressionRatio < 1
      ? Math.round((1 - result.compressionRatio) * 100)
      : 0;

    logger.info(`[OPTIMIZE] Completed: ${result.savedTokens} tokens saved (${reductionPercent}% reduction)`);

    return {
      success: true,
      savedTokens: result.savedTokens,
      newContextSize: result.compressedTokens,
      compressionRatio: result.compressionRatio,
      estimatedCreditsSaved: result.estimatedCreditsSaved,
      message: result.savedTokens > 0
        ? `Optimized! Compressed memory by ${reductionPercent}% (Saved ~${result.estimatedCreditsSaved} Credits)`
        : 'Already optimized - no compression needed',
    };
  } catch (error) {
    logger.error('[OPTIMIZE] Error:', error);
    return {
      success: false,
      savedTokens: 0,
      newContextSize: 0,
      compressionRatio: 1,
      estimatedCreditsSaved: 0,
      message: 'Optimization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get optimization statistics for the current user
 * Shows potential savings across all agent conversations
 */
export async function getOptimizationStats(
  workspaceId?: string
): Promise<OptimizationStats> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        totalThreads: 0,
        totalMessages: 0,
        totalTokens: 0,
        potentialSavings: 0,
        threadsNeedingOptimization: 0,
      };
    }

    const wsId = workspaceId || user.defaultWorkspaceId || 'default';
    return await getCompressionStats(user.id, wsId);
  } catch (error) {
    logger.error('[STATS] Error:', error);
    return {
      totalThreads: 0,
      totalMessages: 0,
      totalTokens: 0,
      potentialSavings: 0,
      threadsNeedingOptimization: 0,
    };
  }
}

/**
 * Bulk optimize all threads for the current user
 * Called when user wants to optimize everything at once
 */
export async function optimizeAllUserThreads(
  workspaceId?: string
): Promise<BulkOptimizationResult> {
  try {
    logger.info('[BULK_OPTIMIZE] Starting bulk optimization');

    const user = await getSessionUser();
    if (!user) {
      return {
        success: false,
        threadsOptimized: 0,
        totalSavedTokens: 0,
        totalCreditsSaved: 0,
        errors: ['User not authenticated'],
      };
    }

    const wsId = workspaceId || user.defaultWorkspaceId || 'default';
    const result = await optimizeAllThreads(user.id, wsId);

    logger.info(`[BULK_OPTIMIZE] Completed: ${result.threadsOptimized} threads, ${result.totalSavedTokens} tokens saved`);

    return result;
  } catch (error) {
    logger.error('[BULK_OPTIMIZE] Error:', error);
    return {
      success: false,
      threadsOptimized: 0,
      totalSavedTokens: 0,
      totalCreditsSaved: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
