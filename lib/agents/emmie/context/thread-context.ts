/**
 * Emmie Thread Context Manager
 *
 * Manages email thread context for multi-step reasoning.
 * Keeps track of recently accessed emails and threads for intelligent follow-ups.
 *
 * Uses Session-ID-based isolation to prevent race conditions when
 * the same user has multiple parallel requests.
 */

import { Email, EmailThread } from '@/server/services/GmailUnifiedService';

interface ThreadContextEntry {
  threadId: string;
  emails: Email[];
  subject: string;
  participants: string[];
  accessedAt: Date;
  lastMessageId: string;
}

interface EmailContextEntry {
  email: Email;
  accessedAt: Date;
  wasRepliedTo: boolean;
  wasForwarded: boolean;
}

interface CachedEmail {
  email: Email;
  cachedAt: Date;
  /** TTL in milliseconds, default 5 minutes */
  ttl: number;
}

interface CachedSearchResult {
  query: string;
  results: Email[];
  cachedAt: Date;
  ttl: number;
}

interface ConversationContext {
  userId: string;
  sessionId?: string;
  activeThreads: Map<string, ThreadContextEntry>;
  recentEmails: Map<string, EmailContextEntry>;
  lastSearchQuery?: string;
  lastSearchResults?: string[];
  pendingActions: PendingAction[];
  createdAt: Date;
  lastAccessedAt: Date;
  /** Cache for full email content to avoid repeated API calls */
  emailCache: Map<string, CachedEmail>;
  /** Cache for search results */
  searchCache: Map<string, CachedSearchResult>;
}

interface PendingAction {
  type: 'send' | 'reply' | 'archive' | 'trash' | 'label';
  target: string;
  details: Record<string, any>;
  createdAt: Date;
  awaitingConfirmation: boolean;
}

// In-memory context store (per user:session combination)
const contextStore = new Map<string, ConversationContext>();

// Context expiry time (30 minutes)
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000;

// Maximum entries to keep per context
const MAX_RECENT_EMAILS = 20;
const MAX_ACTIVE_THREADS = 10;

// Maximum contexts per user (cleanup oldest when exceeded)
const MAX_CONTEXTS_PER_USER = 5;

/**
 * Generate context key from userId and optional sessionId
 * Falls back to userId-only for backwards compatibility
 */
function getContextKey(userId: string, sessionId?: string): string {
  return sessionId ? `${userId}:${sessionId}` : userId;
}

/**
 * Get all context keys for a specific user (for cleanup)
 */
function getUserContextKeys(userId: string): string[] {
  const keys: string[] = [];
  for (const key of contextStore.keys()) {
    if (key === userId || key.startsWith(`${userId}:`)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Cleanup old contexts for a user when limit exceeded
 */
function cleanupUserContexts(userId: string): void {
  const userKeys = getUserContextKeys(userId);

  if (userKeys.length <= MAX_CONTEXTS_PER_USER) {
    return;
  }

  // Sort by lastAccessedAt and remove oldest
  const sortedContexts = userKeys
    .map(key => ({ key, context: contextStore.get(key)! }))
    .filter(item => item.context)
    .sort((a, b) => a.context.lastAccessedAt.getTime() - b.context.lastAccessedAt.getTime());

  // Remove oldest contexts until we're under the limit
  const toRemove = sortedContexts.length - MAX_CONTEXTS_PER_USER;
  for (let i = 0; i < toRemove; i++) {
    contextStore.delete(sortedContexts[i].key);
  }
}

/**
 * Get or create context for a user/session combination
 * @param userId - The user ID
 * @param sessionId - Optional session ID for isolation (recommended for parallel requests)
 */
export function getContext(userId: string, sessionId?: string): ConversationContext {
  const key = getContextKey(userId, sessionId);
  let context = contextStore.get(key);

  if (!context) {
    const now = new Date();
    context = {
      userId,
      sessionId,
      activeThreads: new Map(),
      recentEmails: new Map(),
      pendingActions: [],
      createdAt: now,
      lastAccessedAt: now,
      emailCache: new Map(),
      searchCache: new Map(),
    };
    contextStore.set(key, context);

    // Cleanup old contexts for this user if limit exceeded
    cleanupUserContexts(userId);
  } else {
    // Update last accessed time
    context.lastAccessedAt = new Date();
  }

  // Clean up expired entries within this context
  cleanupExpiredEntries(context);

  return context;
}

/**
 * Add an email to the context
 */
export function addEmailToContext(userId: string, email: Email, sessionId?: string): void {
  const context = getContext(userId, sessionId);

  context.recentEmails.set(email.id, {
    email,
    accessedAt: new Date(),
    wasRepliedTo: false,
    wasForwarded: false,
  });

  // Maintain size limit
  if (context.recentEmails.size > MAX_RECENT_EMAILS) {
    const oldest = [...context.recentEmails.entries()]
      .sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime())[0];
    if (oldest) {
      context.recentEmails.delete(oldest[0]);
    }
  }
}

/**
 * Add a thread to the context
 */
export function addThreadToContext(userId: string, thread: EmailThread, sessionId?: string): void {
  const context = getContext(userId, sessionId);

  context.activeThreads.set(thread.id, {
    threadId: thread.id,
    emails: thread.messages,
    subject: thread.subject,
    participants: thread.participants,
    accessedAt: new Date(),
    lastMessageId: thread.messages[thread.messages.length - 1]?.id || '',
  });

  // Also add individual emails (with same sessionId for consistency)
  for (const email of thread.messages) {
    addEmailToContext(userId, email, sessionId);
  }

  // Maintain size limit
  if (context.activeThreads.size > MAX_ACTIVE_THREADS) {
    const oldest = [...context.activeThreads.entries()]
      .sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime())[0];
    if (oldest) {
      context.activeThreads.delete(oldest[0]);
    }
  }
}

/**
 * Record a search query and results
 */
export function recordSearch(userId: string, query: string, resultIds: string[], sessionId?: string): void {
  const context = getContext(userId, sessionId);
  context.lastSearchQuery = query;
  context.lastSearchResults = resultIds;
}

/**
 * Mark an email as replied to
 */
export function markAsReplied(userId: string, emailId: string, sessionId?: string): void {
  const context = getContext(userId, sessionId);
  const entry = context.recentEmails.get(emailId);
  if (entry) {
    entry.wasRepliedTo = true;
  }
}

/**
 * Add a pending action that needs confirmation
 */
export function addPendingAction(
  userId: string,
  action: Omit<PendingAction, 'createdAt' | 'awaitingConfirmation'>,
  sessionId?: string
): void {
  const context = getContext(userId, sessionId);

  // Remove old pending actions of the same type for the same target
  context.pendingActions = context.pendingActions.filter(
    a => !(a.type === action.type && a.target === action.target)
  );

  context.pendingActions.push({
    ...action,
    createdAt: new Date(),
    awaitingConfirmation: true,
  });
}

/**
 * Get pending action awaiting confirmation
 */
export function getPendingAction(userId: string, type?: string, sessionId?: string): PendingAction | undefined {
  const context = getContext(userId, sessionId);

  return context.pendingActions.find(a => {
    if (!a.awaitingConfirmation) return false;
    if (type && a.type !== type) return false;
    return true;
  });
}

/**
 * Confirm and remove a pending action
 */
export function confirmPendingAction(userId: string, type: string, target: string, sessionId?: string): PendingAction | undefined {
  const context = getContext(userId, sessionId);

  const index = context.pendingActions.findIndex(
    a => a.type === type && a.target === target && a.awaitingConfirmation
  );

  if (index >= 0) {
    const action = context.pendingActions[index];
    context.pendingActions.splice(index, 1);
    return action;
  }

  return undefined;
}

/**
 * Cancel a pending action
 */
export function cancelPendingAction(userId: string, type?: string, sessionId?: string): boolean {
  const context = getContext(userId, sessionId);

  const initialLength = context.pendingActions.length;

  if (type) {
    context.pendingActions = context.pendingActions.filter(
      a => !(a.type === type && a.awaitingConfirmation)
    );
  } else {
    context.pendingActions = context.pendingActions.filter(a => !a.awaitingConfirmation);
  }

  return context.pendingActions.length < initialLength;
}

/**
 * Get context summary for system prompt
 */
export function getContextSummary(userId: string, sessionId?: string): string {
  const context = getContext(userId, sessionId);

  const parts: string[] = [];

  // Recent emails summary
  if (context.recentEmails.size > 0) {
    const recentList = [...context.recentEmails.values()]
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
      .slice(0, 5)
      .map(e => `- ${e.email.subject} (von ${e.email.from}, ID: ${e.email.id})`);

    parts.push(`**Kürzlich angesehene Emails:**\n${recentList.join('\n')}`);
  }

  // Active threads summary
  if (context.activeThreads.size > 0) {
    const threadList = [...context.activeThreads.values()]
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
      .slice(0, 3)
      .map(t => `- ${t.subject} (${t.emails.length} Nachrichten, Thread-ID: ${t.threadId})`);

    parts.push(`**Aktive Threads:**\n${threadList.join('\n')}`);
  }

  // Last search
  if (context.lastSearchQuery) {
    parts.push(`**Letzte Suche:** "${context.lastSearchQuery}" (${context.lastSearchResults?.length || 0} Ergebnisse)`);
  }

  // Pending actions
  const pendingActions = context.pendingActions.filter(a => a.awaitingConfirmation);
  if (pendingActions.length > 0) {
    const actionList = pendingActions.map(a => {
      switch (a.type) {
        case 'send':
          return `- Email senden an ${a.details.to}: "${a.details.subject}"`;
        case 'reply':
          return `- Antwort auf Email ${a.target}`;
        case 'trash':
          return `- Email ${a.target} löschen`;
        default:
          return `- ${a.type} für ${a.target}`;
      }
    });

    parts.push(`**Ausstehende Aktionen (warten auf Bestätigung):**\n${actionList.join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : '';
}

/**
 * Get email by ID from context (if available)
 */
export function getEmailFromContext(userId: string, emailId: string, sessionId?: string): Email | undefined {
  const context = getContext(userId, sessionId);
  return context.recentEmails.get(emailId)?.email;
}

/**
 * Get thread by ID from context (if available)
 */
export function getThreadFromContext(userId: string, threadId: string, sessionId?: string): ThreadContextEntry | undefined {
  const context = getContext(userId, sessionId);
  return context.activeThreads.get(threadId);
}

/**
 * Clear context for a user/session
 * If sessionId is provided, only clears that session's context
 * If sessionId is not provided, clears all contexts for the user
 */
export function clearContext(userId: string, sessionId?: string): void {
  if (sessionId) {
    // Clear specific session context
    const key = getContextKey(userId, sessionId);
    contextStore.delete(key);
  } else {
    // Clear all contexts for this user
    const userKeys = getUserContextKeys(userId);
    for (const key of userKeys) {
      contextStore.delete(key);
    }
  }
}

/**
 * Get active session count for a user (for debugging/monitoring)
 */
export function getActiveSessionCount(userId: string): number {
  return getUserContextKeys(userId).length;
}

/**
 * Merge contexts from different sessions (for user who wants combined view)
 */
export function mergeUserContexts(userId: string): ConversationContext {
  const userKeys = getUserContextKeys(userId);
  const now = new Date();

  const merged: ConversationContext = {
    userId,
    sessionId: undefined,
    activeThreads: new Map(),
    recentEmails: new Map(),
    pendingActions: [],
    createdAt: now,
    lastAccessedAt: now,
  };

  for (const key of userKeys) {
    const context = contextStore.get(key);
    if (!context) continue;

    // Merge emails (newer overwrites older)
    for (const [id, entry] of context.recentEmails) {
      const existing = merged.recentEmails.get(id);
      if (!existing || entry.accessedAt > existing.accessedAt) {
        merged.recentEmails.set(id, entry);
      }
    }

    // Merge threads (newer overwrites older)
    for (const [id, entry] of context.activeThreads) {
      const existing = merged.activeThreads.get(id);
      if (!existing || entry.accessedAt > existing.accessedAt) {
        merged.activeThreads.set(id, entry);
      }
    }

    // Merge pending actions (deduplicate by type+target)
    for (const action of context.pendingActions) {
      const exists = merged.pendingActions.some(
        a => a.type === action.type && a.target === action.target
      );
      if (!exists) {
        merged.pendingActions.push(action);
      }
    }

    // Use most recent search
    if (context.lastSearchQuery && context.lastAccessedAt > merged.lastAccessedAt) {
      merged.lastSearchQuery = context.lastSearchQuery;
      merged.lastSearchResults = context.lastSearchResults;
    }
  }

  return merged;
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(context: ConversationContext): void {
  const now = Date.now();

  // Clean up old emails
  for (const [id, entry] of context.recentEmails) {
    if (now - entry.accessedAt.getTime() > CONTEXT_EXPIRY_MS) {
      context.recentEmails.delete(id);
    }
  }

  // Clean up old threads
  for (const [id, entry] of context.activeThreads) {
    if (now - entry.accessedAt.getTime() > CONTEXT_EXPIRY_MS) {
      context.activeThreads.delete(id);
    }
  }

  // Clean up old pending actions
  context.pendingActions = context.pendingActions.filter(
    a => now - a.createdAt.getTime() < CONTEXT_EXPIRY_MS
  );

  // Clean up expired cache entries
  for (const [id, cached] of context.emailCache) {
    if (now - cached.cachedAt.getTime() > cached.ttl) {
      context.emailCache.delete(id);
    }
  }

  for (const [query, cached] of context.searchCache) {
    if (now - cached.cachedAt.getTime() > cached.ttl) {
      context.searchCache.delete(query);
    }
  }
}

// ============================================================
// Email Cache Functions
// ============================================================

/** Default TTL for email cache (5 minutes) */
const EMAIL_CACHE_TTL_MS = 5 * 60 * 1000;

/** Default TTL for search cache (2 minutes - shorter because results can change) */
const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000;

/** Maximum cache size per context */
const MAX_EMAIL_CACHE_SIZE = 50;
const MAX_SEARCH_CACHE_SIZE = 10;

/**
 * Cache an email for quick retrieval
 */
export function cacheEmail(
  userId: string,
  email: Email,
  sessionId?: string,
  ttl: number = EMAIL_CACHE_TTL_MS
): void {
  const context = getContext(userId, sessionId);

  context.emailCache.set(email.id, {
    email,
    cachedAt: new Date(),
    ttl,
  });

  // Maintain cache size limit
  if (context.emailCache.size > MAX_EMAIL_CACHE_SIZE) {
    // Remove oldest entry
    const oldest = [...context.emailCache.entries()]
      .sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime())[0];
    if (oldest) {
      context.emailCache.delete(oldest[0]);
    }
  }
}

/**
 * Get cached email if available and not expired
 */
export function getCachedEmail(
  userId: string,
  emailId: string,
  sessionId?: string
): Email | undefined {
  const context = getContext(userId, sessionId);
  const cached = context.emailCache.get(emailId);

  if (!cached) {
    return undefined;
  }

  // Check if expired
  const now = Date.now();
  if (now - cached.cachedAt.getTime() > cached.ttl) {
    context.emailCache.delete(emailId);
    return undefined;
  }

  return cached.email;
}

/**
 * Cache search results
 */
export function cacheSearchResults(
  userId: string,
  query: string,
  results: Email[],
  sessionId?: string,
  ttl: number = SEARCH_CACHE_TTL_MS
): void {
  const context = getContext(userId, sessionId);

  // Normalize query for cache key
  const normalizedQuery = query.trim().toLowerCase();

  context.searchCache.set(normalizedQuery, {
    query: normalizedQuery,
    results,
    cachedAt: new Date(),
    ttl,
  });

  // Also cache individual emails
  for (const email of results) {
    cacheEmail(userId, email, sessionId, ttl);
  }

  // Maintain cache size limit
  if (context.searchCache.size > MAX_SEARCH_CACHE_SIZE) {
    const oldest = [...context.searchCache.entries()]
      .sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime())[0];
    if (oldest) {
      context.searchCache.delete(oldest[0]);
    }
  }
}

/**
 * Get cached search results if available
 */
export function getCachedSearchResults(
  userId: string,
  query: string,
  sessionId?: string
): Email[] | undefined {
  const context = getContext(userId, sessionId);
  const normalizedQuery = query.trim().toLowerCase();
  const cached = context.searchCache.get(normalizedQuery);

  if (!cached) {
    return undefined;
  }

  // Check if expired
  const now = Date.now();
  if (now - cached.cachedAt.getTime() > cached.ttl) {
    context.searchCache.delete(normalizedQuery);
    return undefined;
  }

  return cached.results;
}

/**
 * Invalidate cache for a specific email (e.g., after modification)
 */
export function invalidateEmailCache(
  userId: string,
  emailId: string,
  sessionId?: string
): void {
  const context = getContext(userId, sessionId);
  context.emailCache.delete(emailId);

  // Also remove from any search results that contain this email
  for (const [query, cached] of context.searchCache) {
    if (cached.results.some(e => e.id === emailId)) {
      context.searchCache.delete(query);
    }
  }
}

/**
 * Invalidate all search cache (e.g., after sending/deleting emails)
 */
export function invalidateSearchCache(
  userId: string,
  sessionId?: string
): void {
  const context = getContext(userId, sessionId);
  context.searchCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(
  userId: string,
  sessionId?: string
): {
  emailCacheSize: number;
  searchCacheSize: number;
  emailCacheHits: string[];
  searchCacheQueries: string[];
} {
  const context = getContext(userId, sessionId);

  return {
    emailCacheSize: context.emailCache.size,
    searchCacheSize: context.searchCache.size,
    emailCacheHits: [...context.emailCache.keys()],
    searchCacheQueries: [...context.searchCache.keys()],
  };
}

/**
 * Export context types
 */
export type {
  ThreadContextEntry,
  EmailContextEntry,
  ConversationContext,
  PendingAction,
  CachedEmail,
  CachedSearchResult,
};
