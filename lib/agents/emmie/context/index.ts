/**
 * Emmie Context - Index
 *
 * Exports all context management utilities.
 * Uses Session-ID-based isolation to prevent race conditions.
 */

export {
  // Core context functions
  getContext,
  addEmailToContext,
  addThreadToContext,
  recordSearch,
  markAsReplied,
  // Pending action management
  addPendingAction,
  getPendingAction,
  confirmPendingAction,
  cancelPendingAction,
  // Context retrieval
  getContextSummary,
  getEmailFromContext,
  getThreadFromContext,
  // Context cleanup
  clearContext,
  // Session management
  getActiveSessionCount,
  mergeUserContexts,
  // Email cache functions
  cacheEmail,
  getCachedEmail,
  cacheSearchResults,
  getCachedSearchResults,
  invalidateEmailCache,
  invalidateSearchCache,
  getCacheStats,
  // Types
  type ThreadContextEntry,
  type EmailContextEntry,
  type ConversationContext,
  type PendingAction,
  type CachedEmail,
  type CachedSearchResult,
} from './thread-context';
