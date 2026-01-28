/**
 * Emmie Tool Executor
 *
 * Executes Gmail tools based on OpenAI function call responses.
 * Maps tool names to GmailUnifiedService methods.
 */

import { gmailUnifiedService, ToolResult } from '@/server/services/GmailUnifiedService';
import { getToolDisplay } from './gmail-tools';
import { getAIToolDisplay, AI_TOOL_DISPLAY_NAMES } from './ai-tools';
import { executeAITool } from './ai-tool-executor';
import {
  getTemplateByName,
  searchTemplates,
  fillTemplate,
  getTemplatesByCategory,
  getAllTemplates,
} from '../templates';
import {
  addEmailToContext,
  addThreadToContext,
  recordSearch,
  markAsReplied,
  addPendingAction,
} from '../context';
import { toolLoggingService } from '@/server/services/ToolLoggingService';

// ============================================================
// Tool Rate Limiting
// ============================================================

/**
 * In-memory rate limit storage (for environments without Redis)
 * In production, this should use Redis via RateLimitService
 */
interface ToolRateLimitEntry {
  count: number;
  windowStart: number;
  lastRequest: number;
}

const toolRateLimits = new Map<string, ToolRateLimitEntry>();

/**
 * Tool-specific rate limits (per minute)
 */
const TOOL_RATE_LIMITS: Record<string, { limit: number; windowSeconds: number; burstLimit?: number }> = {
  // Sending operations - more restrictive
  gmail_send: { limit: 10, windowSeconds: 60, burstLimit: 3 },
  gmail_reply: { limit: 15, windowSeconds: 60, burstLimit: 5 },
  gmail_draft: { limit: 20, windowSeconds: 60 },

  // Management operations - moderate
  gmail_archive: { limit: 30, windowSeconds: 60 },
  gmail_trash: { limit: 20, windowSeconds: 60 },
  gmail_label: { limit: 30, windowSeconds: 60 },
  gmail_mark_read: { limit: 50, windowSeconds: 60 },

  // Read operations - more permissive
  gmail_search: { limit: 30, windowSeconds: 60 },
  gmail_read: { limit: 60, windowSeconds: 60 },
  gmail_get_thread: { limit: 30, windowSeconds: 60 },
  gmail_stats: { limit: 20, windowSeconds: 60 },

  // Batch operations - restrictive due to resource usage
  gmail_batch_archive: { limit: 5, windowSeconds: 60, burstLimit: 2 },
  gmail_batch_trash: { limit: 3, windowSeconds: 60, burstLimit: 1 },
  gmail_batch_mark_read: { limit: 10, windowSeconds: 60, burstLimit: 3 },
  gmail_batch_label: { limit: 10, windowSeconds: 60, burstLimit: 3 },

  // Template operations - permissive
  email_use_template: { limit: 50, windowSeconds: 60 },
  email_list_templates: { limit: 30, windowSeconds: 60 },
};

// Default for unknown tools
const DEFAULT_TOOL_RATE_LIMIT = { limit: 30, windowSeconds: 60 };

/**
 * Rate limit check result
 */
interface ToolRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  retryAfter?: number;
  reason?: string;
}

/**
 * Check if a tool call is rate limited
 */
function checkToolRateLimit(userId: string, toolName: string): ToolRateLimitResult {
  const config = TOOL_RATE_LIMITS[toolName] || DEFAULT_TOOL_RATE_LIMIT;
  const key = `${userId}:${toolName}`;
  const now = Math.floor(Date.now() / 1000);

  let entry = toolRateLimits.get(key);

  // Check if window has expired
  if (!entry || now - entry.windowStart >= config.windowSeconds) {
    // New window
    entry = { count: 1, windowStart: now, lastRequest: now };
    toolRateLimits.set(key, entry);

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetInSeconds: config.windowSeconds,
    };
  }

  // Check burst limit (rapid consecutive requests)
  if (config.burstLimit && now - entry.lastRequest < 2) {
    // Within 2 seconds
    const recentCount = entry.count; // Simplified burst tracking
    if (recentCount >= config.burstLimit * 10) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.max(1, config.windowSeconds - (now - entry.windowStart)),
        retryAfter: 3,
        reason: 'Zu viele schnelle Anfragen (Burst-Limit)',
      };
    }
  }

  // Check window limit
  if (entry.count >= config.limit) {
    const resetIn = Math.max(1, config.windowSeconds - (now - entry.windowStart));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: resetIn,
      retryAfter: resetIn,
      reason: `Rate-Limit erreicht (${config.limit}/${config.windowSeconds}s)`,
    };
  }

  // Allow and increment
  entry.count++;
  entry.lastRequest = now;
  toolRateLimits.set(key, entry);

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetInSeconds: config.windowSeconds - (now - entry.windowStart),
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
function cleanupExpiredRateLimits(): void {
  const now = Math.floor(Date.now() / 1000);
  const maxWindow = Math.max(...Object.values(TOOL_RATE_LIMITS).map(c => c.windowSeconds), 60);

  for (const [key, entry] of toolRateLimits.entries()) {
    if (now - entry.windowStart > maxWindow * 2) {
      toolRateLimits.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000);

/**
 * Get rate limit info for a tool (for display/debugging)
 */
export function getToolRateLimitInfo(userId: string, toolName: string): {
  limit: number;
  windowSeconds: number;
  currentCount: number;
  remaining: number;
} {
  const config = TOOL_RATE_LIMITS[toolName] || DEFAULT_TOOL_RATE_LIMIT;
  const key = `${userId}:${toolName}`;
  const entry = toolRateLimits.get(key);
  const now = Math.floor(Date.now() / 1000);

  let currentCount = 0;
  if (entry && now - entry.windowStart < config.windowSeconds) {
    currentCount = entry.count;
  }

  return {
    limit: config.limit,
    windowSeconds: config.windowSeconds,
    currentCount,
    remaining: config.limit - currentCount,
  };
}

export interface ToolExecutionContext {
  userId: string;
  workspaceId?: string;
  sessionId?: string;
  conversationId?: string;
  requestId?: string;
}

export interface ToolExecutionLog {
  toolName: string;
  args: Record<string, any>;
  result: ToolResult;
  executionTime: number;
  timestamp: Date;
}

/**
 * Execute a Gmail tool
 */
export async function executeGmailTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[EMMIE_TOOL] Executing ${toolName}`, { userId, args });

  // Check rate limit before execution
  const rateLimitCheck = checkToolRateLimit(userId, toolName);
  if (!rateLimitCheck.allowed) {
    console.warn(`[EMMIE_TOOL] Rate limit exceeded for ${toolName}`, {
      userId,
      reason: rateLimitCheck.reason,
      retryAfter: rateLimitCheck.retryAfter,
    });

    return {
      success: false,
      error: rateLimitCheck.reason || 'Rate-Limit erreicht',
      summary: `${getToolDisplay(toolName)} blockiert: ${rateLimitCheck.reason}. Versuche es in ${rateLimitCheck.retryAfter}s erneut.`,
      data: {
        rateLimited: true,
        retryAfter: rateLimitCheck.retryAfter,
        remaining: rateLimitCheck.remaining,
        resetInSeconds: rateLimitCheck.resetInSeconds,
      },
    };
  }

  try {
    let result: ToolResult;

    switch (toolName) {
      // ============================================================
      // Reading Operations
      // ============================================================

      case 'gmail_search':
        result = await gmailUnifiedService.searchEmails(userId, {
          query: args.query,
          maxResults: args.maxResults || 10,
          includeBody: args.includeBody || false,
        });
        // Record search in context for multi-step reasoning (with session isolation)
        if (result.success && result.data) {
          recordSearch(userId, args.query, result.data.map((e: any) => e.id), context.sessionId);
        }
        break;

      case 'gmail_read':
        result = await gmailUnifiedService.getEmail(
          userId,
          args.messageId,
          args.includeAttachments || false
        );
        // Add email to context for follow-up actions (with session isolation)
        if (result.success && result.data) {
          addEmailToContext(userId, result.data, context.sessionId);
        }
        break;

      case 'gmail_get_thread':
        result = await gmailUnifiedService.getThread(userId, args.threadId);
        // Add thread to context for thread-aware replies (with session isolation)
        if (result.success && result.data) {
          addThreadToContext(userId, result.data, context.sessionId);
        }
        break;

      case 'gmail_stats':
        result = await gmailUnifiedService.getStats(userId);
        break;

      // ============================================================
      // Sending Operations
      // ============================================================

      case 'gmail_send':
        result = await gmailUnifiedService.sendEmail(userId, {
          to: args.to,
          subject: args.subject,
          body: args.body,
          cc: args.cc,
          bcc: args.bcc,
          isHtml: true,
        });
        break;

      case 'gmail_reply':
        result = await gmailUnifiedService.replyToEmail(userId, {
          messageId: args.messageId,
          body: args.body,
          replyAll: args.replyAll || false,
        });
        // Mark original email as replied in context (with session isolation)
        if (result.success) {
          markAsReplied(userId, args.messageId, context.sessionId);
        }
        break;

      case 'gmail_draft':
        result = await gmailUnifiedService.createDraft(userId, {
          to: args.to,
          subject: args.subject,
          body: args.body,
          isHtml: true,
        });
        break;

      // ============================================================
      // Management Operations
      // ============================================================

      case 'gmail_archive':
        result = await gmailUnifiedService.archiveEmail(userId, args.messageId);
        break;

      case 'gmail_trash':
        result = await gmailUnifiedService.trashEmail(userId, args.messageId);
        break;

      case 'gmail_label':
        result = await gmailUnifiedService.modifyLabels(
          userId,
          args.messageId,
          args.addLabels,
          args.removeLabels
        );
        break;

      case 'gmail_mark_read':
        result = await gmailUnifiedService.markAsRead(
          userId,
          args.messageId,
          args.read
        );
        break;

      // ============================================================
      // Batch Operations - Efficient multi-email actions
      // ============================================================

      case 'gmail_batch_archive':
        result = await executeBatchArchive(userId, args.messageIds);
        break;

      case 'gmail_batch_trash':
        result = await executeBatchTrash(userId, args.messageIds);
        break;

      case 'gmail_batch_mark_read':
        result = await executeBatchMarkRead(userId, args.messageIds, args.read);
        break;

      case 'gmail_batch_label':
        result = await executeBatchLabel(userId, args.messageIds, args.addLabels, args.removeLabels);
        break;

      // ============================================================
      // Template Operations
      // ============================================================

      case 'email_use_template':
        result = await executeTemplateAction(args, context);
        break;

      case 'email_list_templates':
        result = await listTemplates(args, context);
        break;

      // ============================================================
      // AI-Powered Tools - Delegate to AI executor
      // ============================================================

      case 'gmail_summarize_inbox':
      case 'gmail_extract_action_items':
      case 'gmail_schedule_send':
      case 'gmail_semantic_search':
      case 'gmail_generate_reply':
      case 'gmail_contact_history':
      case 'gmail_find_attachments':
      case 'gmail_unsubscribe_suggestions':
      case 'gmail_translate':
      case 'gmail_snooze':
        result = await executeAITool(toolName, args, context);
        break;

      default:
        result = {
          success: false,
          error: `Unbekanntes Tool: ${toolName}`,
          summary: `Tool "${toolName}" ist nicht implementiert`,
        };
    }

    const executionTime = Date.now() - startTime;
    console.log(`[EMMIE_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log execution to database for analytics
    logToolExecution(
      {
        toolName,
        args,
        result,
        executionTime,
        timestamp: new Date(),
      },
      context
    );

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[EMMIE_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    // Log failed executions too
    logToolExecution(
      {
        toolName,
        args,
        result: errorResult,
        executionTime,
        timestamp: new Date(),
      },
      context
    );

    return errorResult;
  }
}

/**
 * Execute template action
 */
async function executeTemplateAction(
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const { templateName, variables = {} } = args;

  try {
    // Find template by name
    const template = getTemplateByName(templateName);

    if (!template) {
      // Try searching for similar templates
      const similar = searchTemplates(templateName);
      if (similar.length > 0) {
        return {
          success: false,
          error: `Template "${templateName}" nicht gefunden`,
          data: {
            suggestions: similar.slice(0, 3).map(t => ({ name: t.name, id: t.id })),
          },
          summary: `Template nicht gefunden. Meinten Sie: ${similar.slice(0, 3).map(t => t.name).join(', ')}?`,
        };
      }
      return {
        success: false,
        error: `Template "${templateName}" nicht gefunden`,
        summary: `Template "${templateName}" existiert nicht. Verwende email_list_templates um verfügbare Vorlagen zu sehen.`,
      };
    }

    // Fill template with provided variables
    const filledTemplate = fillTemplate(template, variables);

    // Check for missing required variables
    const missingVars = template.variables.filter(v => !variables[v]);

    return {
      success: true,
      data: {
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        subject: filledTemplate.subject,
        body: filledTemplate.body,
        missingVariables: missingVars.length > 0 ? missingVars : undefined,
      },
      summary: missingVars.length > 0
        ? `Template "${template.name}" geladen. Fehlende Variablen: ${missingVars.join(', ')}`
        : `Template "${template.name}" erfolgreich angewendet`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Fehler beim Laden des Templates: ${error.message}`,
    };
  }
}

/**
 * List available templates
 */
async function listTemplates(
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const { category } = args;

  try {
    let templates;

    if (category) {
      // Filter by category
      templates = getTemplatesByCategory(category);
      if (templates.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Keine Vorlagen in der Kategorie "${category}" gefunden`,
        };
      }
    } else {
      // Get all templates
      templates = getAllTemplates();
    }

    const templateList = templates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      variables: t.variables,
    }));

    // Group by category for better overview
    const byCategory: Record<string, typeof templateList> = {};
    for (const t of templateList) {
      if (!byCategory[t.category]) {
        byCategory[t.category] = [];
      }
      byCategory[t.category].push(t);
    }

    return {
      success: true,
      data: {
        templates: templateList,
        byCategory,
        totalCount: templateList.length,
      },
      summary: category
        ? `${templateList.length} Vorlage(n) in der Kategorie "${category}"`
        : `${templateList.length} Vorlagen verfügbar in ${Object.keys(byCategory).length} Kategorien`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Fehler beim Laden der Vorlagen: ${error.message}`,
    };
  }
}

// ============================================================
// Batch Operation Implementations
// ============================================================

const MAX_BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 10; // Process 10 at a time
const BATCH_RETRY_ATTEMPTS = 2;
const BATCH_RETRY_DELAY_MS = 500;

/**
 * Detailed batch operation result
 */
interface BatchOperationResult {
  id: string;
  success: boolean;
  error?: string;
  errorCode?: string;
  retried?: boolean;
  retriedCount?: number;
}

/**
 * Categorize error for better handling
 */
function categorizeError(error: any): { code: string; message: string; retryable: boolean } {
  const message = error?.message || error?.error || String(error);

  // Rate limit errors
  if (message.includes('rate limit') || message.includes('429') || message.includes('quota')) {
    return { code: 'RATE_LIMIT', message: 'Rate-Limit erreicht', retryable: true };
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404') || message.includes('notFound')) {
    return { code: 'NOT_FOUND', message: 'Email nicht gefunden', retryable: false };
  }

  // Permission errors
  if (message.includes('permission') || message.includes('403') || message.includes('forbidden')) {
    return { code: 'PERMISSION_DENIED', message: 'Zugriff verweigert', retryable: false };
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('401') || message.includes('token')) {
    return { code: 'AUTH_ERROR', message: 'Authentifizierungsfehler', retryable: false };
  }

  // Network errors
  if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('timeout')) {
    return { code: 'NETWORK_ERROR', message: 'Netzwerkfehler', retryable: true };
  }

  // Server errors
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return { code: 'SERVER_ERROR', message: 'Server-Fehler', retryable: true };
  }

  return { code: 'UNKNOWN_ERROR', message: message.substring(0, 100), retryable: false };
}

/**
 * Retry helper with exponential backoff
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = BATCH_RETRY_ATTEMPTS,
  delayMs: number = BATCH_RETRY_DELAY_MS
): Promise<{ result: T | null; error?: any; retried: boolean; attempts: number }> {
  let lastError: any;
  let attempts = 0;

  for (let i = 0; i < maxAttempts; i++) {
    attempts++;
    try {
      const result = await operation();
      return { result, retried: i > 0, attempts };
    } catch (error: any) {
      lastError = error;
      const categorized = categorizeError(error);

      // Don't retry non-retryable errors
      if (!categorized.retryable) {
        return { result: null, error, retried: false, attempts };
      }

      // Wait before retry (exponential backoff)
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  return { result: null, error: lastError, retried: attempts > 1, attempts };
}

/**
 * Validate message IDs
 */
function validateMessageIds(messageIds: any): { valid: boolean; error?: string; cleanIds?: string[] } {
  if (!messageIds) {
    return { valid: false, error: 'messageIds ist erforderlich' };
  }
  if (!Array.isArray(messageIds)) {
    return { valid: false, error: 'messageIds muss ein Array sein' };
  }
  if (messageIds.length === 0) {
    return { valid: false, error: 'messageIds Array ist leer' };
  }

  // Clean and validate IDs
  const cleanIds: string[] = [];
  const invalidIds: string[] = [];

  for (const id of messageIds) {
    if (typeof id === 'string' && id.trim().length >= 5) {
      cleanIds.push(id.trim());
    } else {
      invalidIds.push(String(id));
    }
  }

  if (cleanIds.length === 0) {
    return { valid: false, error: 'Keine gültigen Message-IDs gefunden' };
  }

  if (invalidIds.length > 0) {
    return {
      valid: true,
      cleanIds,
      error: `${invalidIds.length} ungültige ID(s) übersprungen`
    };
  }

  return { valid: true, cleanIds };
}

/**
 * Process batch with retry support and detailed error tracking
 */
async function processBatch<T>(
  items: string[],
  operation: (id: string) => Promise<{ success: boolean; error?: string }>,
  operationName: string
): Promise<{
  results: BatchOperationResult[];
  successCount: number;
  errorCount: number;
  retriedCount: number;
  errorBreakdown: Record<string, number>;
}> {
  const results: BatchOperationResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  let retriedCount = 0;
  const errorBreakdown: Record<string, number> = {};

  // Process in parallel with concurrency limit
  for (let i = 0; i < items.length; i += BATCH_CONCURRENCY) {
    const batch = items.slice(i, i + BATCH_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (id) => {
        const retryResult = await retryOperation(async () => {
          const result = await operation(id);
          if (!result.success) {
            throw new Error(result.error || 'Operation fehlgeschlagen');
          }
          return result;
        });

        return { id, ...retryResult };
      })
    );

    for (const res of batchResults) {
      if (res.status === 'fulfilled') {
        const { id, result, error, retried, attempts } = res.value;

        if (result?.success) {
          successCount++;
          if (retried) retriedCount++;
          results.push({ id, success: true, retried, retriedCount: attempts > 1 ? attempts : undefined });
        } else {
          errorCount++;
          const categorized = categorizeError(error);
          errorBreakdown[categorized.code] = (errorBreakdown[categorized.code] || 0) + 1;
          results.push({
            id,
            success: false,
            error: categorized.message,
            errorCode: categorized.code,
            retried,
          });
        }
      } else {
        errorCount++;
        const categorized = categorizeError(res.reason);
        errorBreakdown[categorized.code] = (errorBreakdown[categorized.code] || 0) + 1;
        results.push({
          id: 'unknown',
          success: false,
          error: categorized.message,
          errorCode: categorized.code,
        });
      }
    }
  }

  return { results, successCount, errorCount, retriedCount, errorBreakdown };
}

/**
 * Generate batch operation summary with error details
 */
function generateBatchSummary(
  operation: string,
  successCount: number,
  errorCount: number,
  total: number,
  retriedCount: number,
  errorBreakdown: Record<string, number>,
  truncated: boolean
): string {
  const parts: string[] = [];

  if (errorCount === 0) {
    parts.push(`${successCount} Email(s) erfolgreich ${operation}`);
  } else {
    parts.push(`${successCount}/${total} Emails ${operation}, ${errorCount} Fehler`);
  }

  if (retriedCount > 0) {
    parts.push(`(${retriedCount} nach Retry erfolgreich)`);
  }

  if (truncated) {
    parts.push(`[auf ${MAX_BATCH_SIZE} begrenzt]`);
  }

  // Add error breakdown for major error types
  const errorDetails = Object.entries(errorBreakdown)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => `${count}x ${code}`)
    .join(', ');

  if (errorDetails) {
    parts.push(`- Fehlerdetails: ${errorDetails}`);
  }

  return parts.join(' ');
}

/**
 * Batch archive multiple emails
 */
async function executeBatchArchive(
  userId: string,
  messageIds: string[]
): Promise<ToolResult> {
  // Validate input
  const validation = validateMessageIds(messageIds);
  if (!validation.valid || !validation.cleanIds) {
    return {
      success: false,
      error: validation.error || 'messageIds Array ist erforderlich',
      summary: 'Keine gültigen Message-IDs angegeben',
    };
  }

  // Limit batch size
  const limitedIds = validation.cleanIds.slice(0, MAX_BATCH_SIZE);
  const truncated = validation.cleanIds.length > MAX_BATCH_SIZE;

  // Process batch
  const { results, successCount, errorCount, retriedCount, errorBreakdown } = await processBatch(
    limitedIds,
    (id) => gmailUnifiedService.archiveEmail(userId, id),
    'archive'
  );

  // Generate summary
  const summary = generateBatchSummary(
    'archiviert',
    successCount,
    errorCount,
    limitedIds.length,
    retriedCount,
    errorBreakdown,
    truncated
  );

  return {
    success: errorCount === 0,
    data: {
      processed: limitedIds.length,
      successCount,
      errorCount,
      retriedCount,
      results: results.slice(0, 10), // Only return first 10 results for brevity
      errorBreakdown: Object.keys(errorBreakdown).length > 0 ? errorBreakdown : undefined,
      truncated,
      skippedInvalid: validation.error ? true : undefined,
    },
    summary,
  };
}

/**
 * Batch trash multiple emails
 */
async function executeBatchTrash(
  userId: string,
  messageIds: string[]
): Promise<ToolResult> {
  // Validate input
  const validation = validateMessageIds(messageIds);
  if (!validation.valid || !validation.cleanIds) {
    return {
      success: false,
      error: validation.error || 'messageIds Array ist erforderlich',
      summary: 'Keine gültigen Message-IDs angegeben',
    };
  }

  // Limit batch size
  const limitedIds = validation.cleanIds.slice(0, MAX_BATCH_SIZE);
  const truncated = validation.cleanIds.length > MAX_BATCH_SIZE;

  // Process batch with retry support
  const { results, successCount, errorCount, retriedCount, errorBreakdown } = await processBatch(
    limitedIds,
    (id) => gmailUnifiedService.trashEmail(userId, id),
    'trash'
  );

  // Generate summary
  const summary = generateBatchSummary(
    'in den Papierkorb verschoben',
    successCount,
    errorCount,
    limitedIds.length,
    retriedCount,
    errorBreakdown,
    truncated
  );

  return {
    success: errorCount === 0,
    data: {
      processed: limitedIds.length,
      successCount,
      errorCount,
      retriedCount,
      results: results.slice(0, 10),
      errorBreakdown: Object.keys(errorBreakdown).length > 0 ? errorBreakdown : undefined,
      truncated,
    },
    summary,
  };
}

/**
 * Batch mark read/unread multiple emails
 */
async function executeBatchMarkRead(
  userId: string,
  messageIds: string[],
  read: boolean
): Promise<ToolResult> {
  // Validate input
  const validation = validateMessageIds(messageIds);
  if (!validation.valid || !validation.cleanIds) {
    return {
      success: false,
      error: validation.error || 'messageIds Array ist erforderlich',
      summary: 'Keine gültigen Message-IDs angegeben',
    };
  }

  // Validate read parameter
  if (typeof read !== 'boolean') {
    return {
      success: false,
      error: 'read Parameter muss boolean sein',
      summary: 'Ungültiger read Parameter',
    };
  }

  // Limit batch size
  const limitedIds = validation.cleanIds.slice(0, MAX_BATCH_SIZE);
  const truncated = validation.cleanIds.length > MAX_BATCH_SIZE;

  // Process batch with retry support
  const { results, successCount, errorCount, retriedCount, errorBreakdown } = await processBatch(
    limitedIds,
    (id) => gmailUnifiedService.markAsRead(userId, id, read),
    'markRead'
  );

  const action = read ? 'als gelesen markiert' : 'als ungelesen markiert';

  // Generate summary
  const summary = generateBatchSummary(
    action,
    successCount,
    errorCount,
    limitedIds.length,
    retriedCount,
    errorBreakdown,
    truncated
  );

  return {
    success: errorCount === 0,
    data: {
      processed: limitedIds.length,
      successCount,
      errorCount,
      retriedCount,
      read,
      results: results.slice(0, 10),
      errorBreakdown: Object.keys(errorBreakdown).length > 0 ? errorBreakdown : undefined,
      truncated,
    },
    summary,
  };
}

/**
 * Batch modify labels for multiple emails
 */
async function executeBatchLabel(
  userId: string,
  messageIds: string[],
  addLabels?: string[],
  removeLabels?: string[]
): Promise<ToolResult> {
  // Validate input
  const validation = validateMessageIds(messageIds);
  if (!validation.valid || !validation.cleanIds) {
    return {
      success: false,
      error: validation.error || 'messageIds Array ist erforderlich',
      summary: 'Keine gültigen Message-IDs angegeben',
    };
  }

  // Validate labels
  if (!addLabels && !removeLabels) {
    return {
      success: false,
      error: 'addLabels oder removeLabels ist erforderlich',
      summary: 'Keine Labels angegeben',
    };
  }

  // Normalize labels
  const normalizedAddLabels = addLabels?.filter(l => l && typeof l === 'string').map(l => l.trim().toUpperCase());
  const normalizedRemoveLabels = removeLabels?.filter(l => l && typeof l === 'string').map(l => l.trim().toUpperCase());

  // Check for conflicting labels
  if (normalizedAddLabels && normalizedRemoveLabels) {
    const conflicts = normalizedAddLabels.filter(l => normalizedRemoveLabels.includes(l));
    if (conflicts.length > 0) {
      return {
        success: false,
        error: `Konflikt: Labels können nicht gleichzeitig hinzugefügt und entfernt werden: ${conflicts.join(', ')}`,
        summary: 'Label-Konflikt erkannt',
      };
    }
  }

  // Limit batch size
  const limitedIds = validation.cleanIds.slice(0, MAX_BATCH_SIZE);
  const truncated = validation.cleanIds.length > MAX_BATCH_SIZE;

  // Process batch with retry support
  const { results, successCount, errorCount, retriedCount, errorBreakdown } = await processBatch(
    limitedIds,
    (id) => gmailUnifiedService.modifyLabels(userId, id, normalizedAddLabels, normalizedRemoveLabels),
    'modifyLabels'
  );

  // Build label change description
  const labelChanges: string[] = [];
  if (normalizedAddLabels?.length) labelChanges.push(`+${normalizedAddLabels.join(', ')}`);
  if (normalizedRemoveLabels?.length) labelChanges.push(`-${normalizedRemoveLabels.join(', ')}`);

  // Generate summary
  const baseSummary = generateBatchSummary(
    'Labels geändert',
    successCount,
    errorCount,
    limitedIds.length,
    retriedCount,
    errorBreakdown,
    truncated
  );

  const summary = errorCount === 0
    ? `Labels für ${successCount} Email(s) geändert (${labelChanges.join(', ')})`
    : baseSummary;

  return {
    success: errorCount === 0,
    data: {
      processed: limitedIds.length,
      successCount,
      errorCount,
      retriedCount,
      addLabels: normalizedAddLabels,
      removeLabels: normalizedRemoveLabels,
      results: results.slice(0, 10),
      errorBreakdown: Object.keys(errorBreakdown).length > 0 ? errorBreakdown : undefined,
      truncated,
    },
    summary,
  };
}

/**
 * Log tool execution to database (for analytics and debugging)
 */
async function logToolExecution(
  log: ToolExecutionLog,
  context: ToolExecutionContext
): Promise<void> {
  // Log to database using ToolLoggingService
  try {
    await toolLoggingService.quickLog(
      context.userId,
      'emmie', // agentId
      log.toolName,
      log.args,
      {
        success: log.result.success,
        data: log.result.data,
        error: log.result.error,
        summary: log.result.summary,
      },
      log.executionTime,
      context.sessionId
    );
  } catch (error) {
    // Don't let logging errors break the main flow
    console.error('[EMMIE_TOOL_LOG] Failed to log to database:', error);
  }

  // Also log to console for immediate visibility
  console.log('[EMMIE_TOOL_LOG]', {
    tool: log.toolName,
    success: log.result.success,
    time: log.executionTime,
    timestamp: log.timestamp.toISOString(),
  });
}

/**
 * Validation result with detailed error info
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  /** Sanitized/normalized arguments */
  sanitizedArgs?: Record<string, any>;
  /** Warnings that don't block execution */
  warnings?: string[];
}

/**
 * Validate and sanitize tool arguments
 * Returns sanitized args that are safe to use
 */
export function validateToolArgs(
  toolName: string,
  args: Record<string, any>
): ValidationResult {
  const warnings: string[] = [];
  const sanitizedArgs = { ...args };

  switch (toolName) {
    case 'gmail_search':
      if (!args.query || typeof args.query !== 'string') {
        return { valid: false, error: 'query ist erforderlich' };
      }
      // Sanitize query - trim whitespace
      sanitizedArgs.query = args.query.trim();
      if (sanitizedArgs.query.length === 0) {
        return { valid: false, error: 'query darf nicht leer sein' };
      }
      // Validate maxResults
      if (args.maxResults !== undefined) {
        const max = parseInt(args.maxResults);
        if (isNaN(max) || max < 1) {
          sanitizedArgs.maxResults = 10;
          warnings.push('maxResults auf 10 gesetzt (ungültiger Wert)');
        } else if (max > 50) {
          sanitizedArgs.maxResults = 50;
          warnings.push('maxResults auf 50 begrenzt');
        } else {
          sanitizedArgs.maxResults = max;
        }
      }
      break;

    case 'gmail_read':
    case 'gmail_archive':
    case 'gmail_trash':
      if (!args.messageId || typeof args.messageId !== 'string') {
        return { valid: false, error: 'messageId ist erforderlich' };
      }
      // Validate messageId format (basic check)
      sanitizedArgs.messageId = args.messageId.trim();
      if (sanitizedArgs.messageId.length < 5) {
        return { valid: false, error: 'messageId scheint ungültig zu sein' };
      }
      break;

    case 'gmail_send':
    case 'gmail_draft':
      if (!args.to || !args.subject || !args.body) {
        return { valid: false, error: 'to, subject und body sind erforderlich' };
      }

      // Validate TO email format with comprehensive validation
      const toValidation = validateEmailAddress(args.to);
      if (!toValidation.valid) {
        return { valid: false, error: toValidation.error || `Ungültige E-Mail-Adresse: ${args.to}` };
      }
      sanitizedArgs.to = toValidation.normalized;
      if (toValidation.warnings) {
        warnings.push(...toValidation.warnings.map(w => `TO: ${w}`));
      }

      // Sanitize subject and body
      sanitizedArgs.subject = args.subject.trim();
      sanitizedArgs.body = args.body.trim();
      if (sanitizedArgs.subject.length === 0) {
        return { valid: false, error: 'Betreff darf nicht leer sein' };
      }
      if (sanitizedArgs.subject.length > 200) {
        warnings.push('Betreff ist ungewöhnlich lang (>200 Zeichen)');
      }
      if (sanitizedArgs.body.length === 0) {
        return { valid: false, error: 'E-Mail-Inhalt darf nicht leer sein' };
      }
      if (sanitizedArgs.body.length > 50000) {
        warnings.push('E-Mail-Inhalt ist sehr lang (>50.000 Zeichen)');
      }

      // Validate CC if provided
      if (args.cc) {
        const ccValidation = validateCcBcc(args.cc);
        if (!ccValidation.valid) {
          return { valid: false, error: `Ungültige CC-Adresse: ${ccValidation.error}` };
        }
        sanitizedArgs.cc = ccValidation.normalized;
        if (ccValidation.warnings) {
          warnings.push(...ccValidation.warnings.map(w => `CC: ${w}`));
        }
      }

      // Validate BCC if provided
      if (args.bcc) {
        const bccValidation = validateCcBcc(args.bcc);
        if (!bccValidation.valid) {
          return { valid: false, error: `Ungültige BCC-Adresse: ${bccValidation.error}` };
        }
        sanitizedArgs.bcc = bccValidation.normalized;
        if (bccValidation.warnings) {
          warnings.push(...bccValidation.warnings.map(w => `BCC: ${w}`));
        }
      }

      // Check total recipients count
      const totalRecipients =
        (toValidation.emails?.length || 0) +
        (args.cc ? validateCcBcc(args.cc).emails?.length || 0 : 0) +
        (args.bcc ? validateCcBcc(args.bcc).emails?.length || 0 : 0);
      if (totalRecipients > 50) {
        warnings.push(`Viele Empfänger (${totalRecipients}) - prüfe ob Massen-Mail beabsichtigt`);
      }

      // Check for potentially dangerous content with detailed analysis
      const contentCheck = detectSuspiciousContent(sanitizedArgs.body);
      if (contentCheck.suspicious) {
        if (contentCheck.severity === 'high') {
          return {
            valid: false,
            error: `Sicherheitsrisiko: ${contentCheck.reasons.join(', ')}`
          };
        } else {
          warnings.push(`Inhaltsprüfung: ${contentCheck.reasons.join(', ')}`);
        }
      }
      break;

    case 'gmail_reply':
      if (!args.messageId || !args.body) {
        return { valid: false, error: 'messageId und body sind erforderlich' };
      }
      sanitizedArgs.messageId = args.messageId.trim();
      sanitizedArgs.body = args.body.trim();
      if (sanitizedArgs.body.length === 0) {
        return { valid: false, error: 'Antwort-Inhalt darf nicht leer sein' };
      }
      // Ensure replyAll is boolean
      sanitizedArgs.replyAll = args.replyAll === true;
      break;

    case 'gmail_get_thread':
      if (!args.threadId) {
        return { valid: false, error: 'threadId ist erforderlich' };
      }
      sanitizedArgs.threadId = args.threadId.trim();
      break;

    case 'gmail_mark_read':
      if (!args.messageId || typeof args.read !== 'boolean') {
        return { valid: false, error: 'messageId und read sind erforderlich' };
      }
      sanitizedArgs.messageId = args.messageId.trim();
      sanitizedArgs.read = args.read === true;
      break;

    case 'gmail_label':
      if (!args.messageId) {
        return { valid: false, error: 'messageId ist erforderlich' };
      }
      if (!args.addLabels && !args.removeLabels) {
        return { valid: false, error: 'addLabels oder removeLabels ist erforderlich' };
      }
      sanitizedArgs.messageId = args.messageId.trim();
      // Validate labels are arrays
      if (args.addLabels && !Array.isArray(args.addLabels)) {
        sanitizedArgs.addLabels = [args.addLabels];
      }
      if (args.removeLabels && !Array.isArray(args.removeLabels)) {
        sanitizedArgs.removeLabels = [args.removeLabels];
      }
      break;

    case 'gmail_stats':
      // No required args
      break;

    case 'email_use_template':
      if (!args.templateName) {
        return { valid: false, error: 'templateName ist erforderlich' };
      }
      sanitizedArgs.templateName = args.templateName.trim();
      break;

    case 'email_list_templates':
      // category is optional, validate if provided
      if (args.category) {
        const validCategories = ['follow-up', 'meeting', 'intro', 'reply', 'sales', 'support'];
        sanitizedArgs.category = args.category.trim().toLowerCase();
        if (!validCategories.includes(sanitizedArgs.category)) {
          warnings.push(`Unbekannte Kategorie "${args.category}". Verfügbar: ${validCategories.join(', ')}`);
          delete sanitizedArgs.category; // Remove invalid category
        }
      }
      break;

    // Batch operations
    case 'gmail_batch_archive':
    case 'gmail_batch_trash':
      if (!args.messageIds || !Array.isArray(args.messageIds) || args.messageIds.length === 0) {
        return { valid: false, error: 'messageIds Array ist erforderlich' };
      }
      if (args.messageIds.length > 50) {
        warnings.push('messageIds auf 50 begrenzt');
        sanitizedArgs.messageIds = args.messageIds.slice(0, 50);
      }
      break;

    case 'gmail_batch_mark_read':
      if (!args.messageIds || !Array.isArray(args.messageIds) || args.messageIds.length === 0) {
        return { valid: false, error: 'messageIds Array ist erforderlich' };
      }
      if (typeof args.read !== 'boolean') {
        return { valid: false, error: 'read (boolean) ist erforderlich' };
      }
      if (args.messageIds.length > 50) {
        warnings.push('messageIds auf 50 begrenzt');
        sanitizedArgs.messageIds = args.messageIds.slice(0, 50);
      }
      break;

    case 'gmail_batch_label':
      if (!args.messageIds || !Array.isArray(args.messageIds) || args.messageIds.length === 0) {
        return { valid: false, error: 'messageIds Array ist erforderlich' };
      }
      if (!args.addLabels && !args.removeLabels) {
        return { valid: false, error: 'addLabels oder removeLabels ist erforderlich' };
      }
      if (args.messageIds.length > 50) {
        warnings.push('messageIds auf 50 begrenzt');
        sanitizedArgs.messageIds = args.messageIds.slice(0, 50);
      }
      break;
  }

  return {
    valid: true,
    sanitizedArgs,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Email validation result with details
 */
interface EmailValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
  emails?: string[];
  warnings?: string[];
}

/**
 * Validate email address format (RFC 5322 compliant)
 * Supports single email or comma-separated list
 */
function isValidEmail(email: string): boolean {
  const result = validateEmailAddress(email);
  return result.valid;
}

/**
 * Comprehensive email validation with detailed results
 * Supports: "email@domain.com", "Name <email@domain.com>", or comma-separated lists
 */
function validateEmailAddress(emailInput: string): EmailValidationResult {
  if (!emailInput || typeof emailInput !== 'string') {
    return { valid: false, error: 'E-Mail-Adresse ist erforderlich' };
  }

  const trimmed = emailInput.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'E-Mail-Adresse darf nicht leer sein' };
  }

  // Check for multiple emails (comma or semicolon separated)
  const separator = trimmed.includes(';') ? ';' : ',';
  const emailParts = trimmed.split(separator).map(e => e.trim()).filter(e => e.length > 0);

  if (emailParts.length === 0) {
    return { valid: false, error: 'Keine gültige E-Mail-Adresse gefunden' };
  }

  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  const warnings: string[] = [];

  for (const part of emailParts) {
    const result = validateSingleEmail(part);
    if (result.valid && result.email) {
      validEmails.push(result.email);
      if (result.warning) {
        warnings.push(result.warning);
      }
    } else {
      invalidEmails.push(part);
    }
  }

  if (invalidEmails.length > 0) {
    return {
      valid: false,
      error: invalidEmails.length === 1
        ? `Ungültige E-Mail-Adresse: ${invalidEmails[0]}`
        : `${invalidEmails.length} ungültige E-Mail-Adressen: ${invalidEmails.slice(0, 3).join(', ')}${invalidEmails.length > 3 ? '...' : ''}`,
      emails: validEmails.length > 0 ? validEmails : undefined,
    };
  }

  return {
    valid: true,
    normalized: validEmails.join(', '),
    emails: validEmails,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a single email address
 */
function validateSingleEmail(email: string): { valid: boolean; email?: string; warning?: string } {
  const trimmed = email.trim();

  // Handle "Name <email@domain.com>" format
  const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  let emailAddress = angleMatch ? angleMatch[2].trim() : trimmed;

  // RFC 5322 compliant regex (simplified but comprehensive)
  // Allows: letters, numbers, dots, hyphens, underscores, plus signs in local part
  // Requires: @ symbol, valid domain with TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(emailAddress)) {
    return { valid: false };
  }

  // Additional checks
  const [localPart, domain] = emailAddress.split('@');
  let warning: string | undefined;

  // Check local part length (max 64 chars per RFC)
  if (localPart.length > 64) {
    return { valid: false };
  }

  // Check domain length (max 255 chars per RFC)
  if (domain.length > 255) {
    return { valid: false };
  }

  // Check for consecutive dots
  if (emailAddress.includes('..')) {
    return { valid: false };
  }

  // Check for suspicious/disposable email domains
  const disposableDomains = ['tempmail.com', 'throwaway.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
  if (disposableDomains.some(d => domain.toLowerCase().endsWith(d))) {
    warning = `Möglicherweise temporäre E-Mail-Adresse: ${domain}`;
  }

  // Check for unusual TLDs
  const tld = domain.split('.').pop()?.toLowerCase();
  const unusualTlds = ['xyz', 'top', 'click', 'loan', 'work'];
  if (tld && unusualTlds.includes(tld) && !warning) {
    warning = `Ungewöhnliche Domain-Endung: .${tld}`;
  }

  return {
    valid: true,
    email: emailAddress.toLowerCase(),
    warning,
  };
}

/**
 * Validate multiple CC/BCC addresses
 */
function validateCcBcc(addresses: string): EmailValidationResult {
  if (!addresses || addresses.trim().length === 0) {
    return { valid: true, emails: [] }; // Empty is valid for optional fields
  }
  return validateEmailAddress(addresses);
}

/**
 * Suspicious content detection result
 */
interface SuspiciousContentResult {
  suspicious: boolean;
  reasons: string[];
  severity: 'low' | 'medium' | 'high';
}

/**
 * Check for suspicious content in email body
 * Returns true if any suspicious patterns are found
 */
function containsSuspiciousContent(content: string): boolean {
  const result = detectSuspiciousContent(content);
  return result.suspicious;
}

/**
 * Comprehensive suspicious content detection
 * Checks for XSS, phishing, malware, and scam indicators
 */
function detectSuspiciousContent(content: string): SuspiciousContentResult {
  const reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  if (!content || content.length === 0) {
    return { suspicious: false, reasons: [], severity: 'low' };
  }

  const lowerContent = content.toLowerCase();

  // HIGH SEVERITY: XSS/Script Injection
  const xssPatterns = [
    { pattern: /javascript:/gi, reason: 'JavaScript-URI gefunden' },
    { pattern: /data:text\/html/gi, reason: 'Data-URI mit HTML gefunden' },
    { pattern: /<script[\s>]/gi, reason: 'Script-Tag gefunden' },
    { pattern: /on(click|error|load|mouseover|focus|blur|submit|change)=/gi, reason: 'Event-Handler gefunden' },
    { pattern: /eval\s*\(/gi, reason: 'eval() Aufruf gefunden' },
    { pattern: /expression\s*\(/gi, reason: 'CSS Expression gefunden' },
    { pattern: /vbscript:/gi, reason: 'VBScript-URI gefunden' },
  ];

  for (const { pattern, reason } of xssPatterns) {
    if (pattern.test(content)) {
      reasons.push(reason);
      severity = 'high';
    }
  }

  // MEDIUM SEVERITY: Phishing indicators
  const phishingPatterns = [
    { pattern: /password.*reset.*link/i, reason: 'Passwort-Reset-Link erwähnt' },
    { pattern: /verify.*your.*account/i, reason: 'Kontoverifizierung erwähnt' },
    { pattern: /suspended.*account/i, reason: 'Gesperrtes Konto erwähnt' },
    { pattern: /urgent.*action.*required/i, reason: 'Dringende Aktion gefordert' },
    { pattern: /click.*here.*immediately/i, reason: 'Sofortiges Klicken gefordert' },
    { pattern: /confirm.*identity/i, reason: 'Identitätsbestätigung gefordert' },
    { pattern: /login.*credentials/i, reason: 'Login-Daten erwähnt' },
  ];

  for (const { pattern, reason } of phishingPatterns) {
    if (pattern.test(content)) {
      reasons.push(reason);
      if (severity !== 'high') severity = 'medium';
    }
  }

  // LOW SEVERITY: URL checks
  const urlPatterns = [
    // Shortened URLs
    { pattern: /https?:\/\/(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd)/gi, reason: 'Verkürzte URL gefunden' },
    // IP-based URLs
    { pattern: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/gi, reason: 'IP-basierte URL gefunden' },
    // Look-alike domains
    { pattern: /https?:\/\/[a-z0-9-]*(paypa1|g00gle|amaz0n|micr0soft|faceb00k)[a-z0-9-]*\./gi, reason: 'Verdächtige Domain (Typosquatting)' },
  ];

  for (const { pattern, reason } of urlPatterns) {
    if (pattern.test(content)) {
      reasons.push(reason);
      if (severity === 'low') severity = 'low';
    }
  }

  // Check for excessive urgency
  const urgencyWords = ['urgent', 'immediately', 'asap', 'now', 'hurry', 'limited time', 'act fast', 'dringend', 'sofort', 'jetzt'];
  const urgencyCount = urgencyWords.filter(word => lowerContent.includes(word)).length;
  if (urgencyCount >= 3) {
    reasons.push('Mehrfache Dringlichkeitshinweise');
    if (severity !== 'high') severity = 'medium';
  }

  // Check for suspicious file extensions mentioned
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs', '.ps1'];
  for (const ext of dangerousExtensions) {
    if (lowerContent.includes(ext)) {
      reasons.push(`Verdächtige Dateierweiterung (${ext}) erwähnt`);
      if (severity !== 'high') severity = 'medium';
    }
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    severity,
  };
}

/**
 * Check if a tool requires user confirmation before execution
 */
export function requiresConfirmation(toolName: string): boolean {
  const confirmationRequired = [
    'gmail_send',
    'gmail_reply',
    'gmail_trash',
    'gmail_batch_trash', // Batch delete also requires confirmation
  ];
  return confirmationRequired.includes(toolName);
}

/**
 * Get a human-readable description of what a tool call will do
 */
export function getToolActionDescription(
  toolName: string,
  args: Record<string, any>
): string {
  switch (toolName) {
    case 'gmail_search':
      return `Suche nach Emails: "${args.query}"`;
    case 'gmail_read':
      return `Lese Email ${args.messageId}`;
    case 'gmail_send':
      return `Sende Email an ${args.to}: "${args.subject}"`;
    case 'gmail_reply':
      return `Antworte auf Email ${args.messageId}`;
    case 'gmail_get_thread':
      return `Lade Thread ${args.threadId}`;
    case 'gmail_archive':
      return `Archiviere Email ${args.messageId}`;
    case 'gmail_trash':
      return `Lösche Email ${args.messageId}`;
    case 'gmail_label':
      return `Ändere Labels für Email ${args.messageId}`;
    case 'gmail_draft':
      return `Erstelle Entwurf an ${args.to}: "${args.subject}"`;
    case 'gmail_mark_read':
      return args.read ? `Markiere als gelesen` : `Markiere als ungelesen`;
    case 'gmail_stats':
      return `Rufe Postfach-Statistiken ab`;
    // Batch operations
    case 'gmail_batch_archive':
      return `Archiviere ${args.messageIds?.length || 0} Email(s)`;
    case 'gmail_batch_trash':
      return `Lösche ${args.messageIds?.length || 0} Email(s)`;
    case 'gmail_batch_mark_read':
      const action = args.read ? 'als gelesen' : 'als ungelesen';
      return `Markiere ${args.messageIds?.length || 0} Email(s) ${action}`;
    case 'gmail_batch_label':
      return `Ändere Labels für ${args.messageIds?.length || 0} Email(s)`;
    default:
      return `Führe ${toolName} aus`;
  }
}

/**
 * Format tool result for display in chat
 */
export function formatToolResultForChat(
  toolName: string,
  result: ToolResult
): string {
  if (!result.success) {
    return `❌ ${result.summary}`;
  }

  switch (toolName) {
    case 'gmail_search':
      const emails = result.data || [];
      if (emails.length === 0) {
        return '📭 Keine Emails gefunden.';
      }
      return `📧 ${emails.length} Email(s) gefunden:\n${formatEmailList(emails)}`;

    case 'gmail_read':
      const email = result.data;
      if (!email) return result.summary;
      return `📧 **${email.subject}**\nVon: ${email.from}\nDatum: ${email.date}\n\n${email.snippet}`;

    case 'gmail_stats':
      const stats = result.data;
      if (!stats) return result.summary;
      return `📊 Postfach-Übersicht:\n• ${stats.unreadCount} ungelesen\n• ${stats.starredCount} markiert\n• ${stats.totalInbox} im Posteingang\n• ${stats.draftsCount} Entwürfe`;

    default:
      return `✅ ${result.summary}`;
  }
}

/**
 * Format email list for display
 */
function formatEmailList(emails: any[]): string {
  return emails
    .slice(0, 5)
    .map((email, i) => {
      const unread = email.isUnread ? '🔵' : '⚪';
      const starred = email.isStarred ? '⭐' : '';
      return `${i + 1}. ${unread}${starred} **${email.subject}** - ${email.from}`;
    })
    .join('\n');
}
