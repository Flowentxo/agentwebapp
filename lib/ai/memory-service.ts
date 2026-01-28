/**
 * Memory Compression Service
 *
 * Optimizes token costs by compressing long conversation histories
 * while preserving technical details, user preferences, and goals.
 *
 * @version 1.0.0
 */

import { getDb } from "@/lib/db";
import { agentMessages, aiUsage } from "@/lib/db/schema";
import { eq, and, asc, desc, lt } from "drizzle-orm";
import { openai } from "./openai-client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("memory-service");

// ============================================================================
// TYPES
// ============================================================================

export interface CompressionResult {
  success: boolean;
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  compressionRatio: number;
  messagesCompressed: number;
  estimatedCreditsSaved: number;
  error?: string;
}

export interface ThreadMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimate token count for text
 * Uses approximation: 1 word ≈ 1.3 tokens, 1 char ≈ 0.25 tokens
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Count words and characters
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  const chars = text.length;

  // Weighted average of both methods
  const wordEstimate = Math.ceil(words * 1.3);
  const charEstimate = Math.ceil(chars / 4);

  return Math.ceil((wordEstimate + charEstimate) / 2);
}

/**
 * Calculate cost in credits (micro-dollars / 1000 = credits)
 * GPT-4o-mini: $0.15/1M input, $0.60/1M output
 */
export function calculateCredits(tokens: number, isOutput: boolean = false): number {
  const costPerMillion = isOutput ? 0.6 : 0.15;
  const costUsd = (tokens / 1_000_000) * costPerMillion;
  return Math.ceil(costUsd * 1000); // Convert to credits (1 credit = $0.001)
}

// ============================================================================
// COMPRESSION PROMPT
// ============================================================================

const COMPRESSION_SYSTEM_PROMPT = `You are a conversation summarizer. Your task is to compress a chat history while preserving all critical information.

PRESERVE:
- Technical details (code, configurations, errors, solutions)
- User preferences and requirements
- Defined goals and objectives
- Important decisions made
- Key facts and data points
- Action items and next steps

DISCARD:
- Greetings and pleasantries
- Filler words and redundant phrases
- Repeated information
- Small talk and off-topic content

OUTPUT FORMAT:
- Write in third person, past tense
- Use bullet points for distinct topics
- Keep technical terms and code snippets verbatim
- Maintain chronological order of key events
- Be concise but comprehensive

IMPORTANT: Output pure text summary, no JSON or markdown formatting.`;

// ============================================================================
// MAIN SERVICE FUNCTIONS
// ============================================================================

/**
 * Compress conversation history for a specific agent/user combination
 */
export async function compressConversation(
  agentId: string,
  userId: string,
  workspaceId: string
): Promise<CompressionResult> {
  const db = getDb();

  try {
    logger.info(`[COMPRESS] Starting compression for agent=${agentId}, user=${userId}`);

    // 1. Fetch all messages for this conversation
    const messages = await db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.agentId, agentId),
          eq(agentMessages.userId, userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      )
      .orderBy(asc(agentMessages.createdAt));

    if (messages.length === 0) {
      return {
        success: true,
        originalTokens: 0,
        compressedTokens: 0,
        savedTokens: 0,
        compressionRatio: 1,
        messagesCompressed: 0,
        estimatedCreditsSaved: 0,
      };
    }

    // 2. Calculate total tokens
    const totalContent = messages.map((m) => m.content).join("\n\n");
    const originalTokens = estimateTokens(totalContent);

    logger.info(`[COMPRESS] Found ${messages.length} messages, ~${originalTokens} tokens`);

    // 3. Check if compression is needed (threshold: 2000 tokens)
    if (originalTokens < 2000) {
      logger.info(`[COMPRESS] Token count below threshold (${originalTokens} < 2000), skipping`);
      return {
        success: true,
        originalTokens,
        compressedTokens: originalTokens,
        savedTokens: 0,
        compressionRatio: 1,
        messagesCompressed: 0,
        estimatedCreditsSaved: 0,
      };
    }

    // 4. Keep the last user message and last assistant response
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const lastAssistantMsg = messages.filter((m) => m.role === "assistant").pop();
    const preservedIds = new Set<string>();

    if (lastUserMsg) preservedIds.add(lastUserMsg.id);
    if (lastAssistantMsg) preservedIds.add(lastAssistantMsg.id);

    // Messages to compress (exclude the preserved ones)
    const messagesToCompress = messages.filter((m) => !preservedIds.has(m.id));

    if (messagesToCompress.length < 3) {
      logger.info(`[COMPRESS] Not enough messages to compress (${messagesToCompress.length} < 3)`);
      return {
        success: true,
        originalTokens,
        compressedTokens: originalTokens,
        savedTokens: 0,
        compressionRatio: 1,
        messagesCompressed: 0,
        estimatedCreditsSaved: 0,
      };
    }

    // 5. Format conversation for compression
    const conversationText = messagesToCompress
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n\n");

    // 6. Call LLM to summarize
    logger.info(`[COMPRESS] Calling GPT-4o-mini to summarize ${messagesToCompress.length} messages`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: COMPRESSION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Summarize the following conversation history:\n\n${conversationText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const summary = completion.choices[0]?.message?.content || "";
    const compressedTokensFromSummary = estimateTokens(summary);

    // Calculate preserved tokens (last messages)
    const preservedContent = [lastUserMsg?.content || "", lastAssistantMsg?.content || ""]
      .filter(Boolean)
      .join("\n\n");
    const preservedTokens = estimateTokens(preservedContent);

    const totalCompressedTokens = compressedTokensFromSummary + preservedTokens;

    logger.info(
      `[COMPRESS] Summary generated: ${compressedTokensFromSummary} tokens (preserved: ${preservedTokens})`
    );

    // 7. Database transaction: Archive old messages, insert summary
    const idsToArchive = messagesToCompress.map((m) => m.id);

    // Mark old messages as archived (soft delete via metadata)
    for (const id of idsToArchive) {
      await db
        .update(agentMessages)
        .set({
          metadata: {
            archived: true,
            archivedAt: new Date().toISOString(),
            archivedReason: "memory_compression",
          },
          updatedAt: new Date(),
        })
        .where(eq(agentMessages.id, id));
    }

    // Insert summary as a system message
    await db.insert(agentMessages).values({
      agentId,
      userId,
      workspaceId,
      content: `[CONVERSATION SUMMARY]\n${summary}`,
      role: "system",
      metadata: {
        type: "memory_summary",
        compressedFrom: idsToArchive.length,
        originalTokens,
        compressedTokens: compressedTokensFromSummary,
        createdAt: new Date().toISOString(),
      },
    });

    // 8. Record AI usage for the compression call
    const compressionCost = calculateCredits(
      estimateTokens(conversationText) + compressedTokensFromSummary
    );

    await db.insert(aiUsage).values({
      agentId: "system",
      userId,
      model: "gpt-4o-mini",
      promptTokens: estimateTokens(conversationText),
      completionTokens: compressedTokensFromSummary,
      totalTokens: estimateTokens(conversationText) + compressedTokensFromSummary,
      estimatedCost: compressionCost,
      success: true,
      metadata: {
        operation: "memory_compression",
        agentId,
      },
    });

    // 9. Calculate savings
    const savedTokens = originalTokens - totalCompressedTokens;
    const compressionRatio = originalTokens > 0 ? totalCompressedTokens / originalTokens : 1;
    const estimatedCreditsSaved = calculateCredits(savedTokens);

    logger.info(
      `[COMPRESS] Completed: ${savedTokens} tokens saved (${((1 - compressionRatio) * 100).toFixed(1)}% reduction)`
    );

    return {
      success: true,
      originalTokens,
      compressedTokens: totalCompressedTokens,
      savedTokens,
      compressionRatio,
      messagesCompressed: messagesToCompress.length,
      estimatedCreditsSaved,
    };
  } catch (error) {
    logger.error("[COMPRESS] Error:", error);
    return {
      success: false,
      originalTokens: 0,
      compressedTokens: 0,
      savedTokens: 0,
      compressionRatio: 1,
      messagesCompressed: 0,
      estimatedCreditsSaved: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get compression statistics for a user across all agents
 */
export async function getCompressionStats(
  userId: string,
  workspaceId: string
): Promise<{
  totalThreads: number;
  totalMessages: number;
  totalTokens: number;
  potentialSavings: number;
  threadsNeedingOptimization: number;
}> {
  const db = getDb();

  try {
    // Get all messages for user
    const messages = await db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.userId, userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      );

    // Group by agent
    const threadMap = new Map<string, typeof messages>();
    for (const msg of messages) {
      const existing = threadMap.get(msg.agentId) || [];
      existing.push(msg);
      threadMap.set(msg.agentId, existing);
    }

    let totalTokens = 0;
    let potentialSavings = 0;
    let threadsNeedingOptimization = 0;

    for (const [, threadMessages] of threadMap) {
      // Skip archived messages
      const activeMessages = threadMessages.filter(
        (m) => !(m.metadata as Record<string, unknown>)?.archived
      );

      const content = activeMessages.map((m) => m.content).join("\n\n");
      const tokens = estimateTokens(content);
      totalTokens += tokens;

      if (tokens > 2000) {
        threadsNeedingOptimization++;
        // Estimate 70% compression for long threads
        potentialSavings += Math.floor(tokens * 0.7);
      }
    }

    return {
      totalThreads: threadMap.size,
      totalMessages: messages.length,
      totalTokens,
      potentialSavings,
      threadsNeedingOptimization,
    };
  } catch (error) {
    logger.error("[STATS] Error:", error);
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
 * Bulk optimize all threads for a user that exceed threshold
 */
export async function optimizeAllThreads(
  userId: string,
  workspaceId: string
): Promise<{
  success: boolean;
  threadsOptimized: number;
  totalSavedTokens: number;
  totalCreditsSaved: number;
  errors: string[];
}> {
  const db = getDb();
  const errors: string[] = [];
  let threadsOptimized = 0;
  let totalSavedTokens = 0;
  let totalCreditsSaved = 0;

  try {
    // Get distinct agent IDs for this user
    const messages = await db
      .select({ agentId: agentMessages.agentId })
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.userId, userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      )
      .groupBy(agentMessages.agentId);

    const agentIds = [...new Set(messages.map((m) => m.agentId))];

    for (const agentId of agentIds) {
      const result = await compressConversation(agentId, userId, workspaceId);

      if (result.success && result.savedTokens > 0) {
        threadsOptimized++;
        totalSavedTokens += result.savedTokens;
        totalCreditsSaved += result.estimatedCreditsSaved;
      } else if (!result.success && result.error) {
        errors.push(`Agent ${agentId}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      threadsOptimized,
      totalSavedTokens,
      totalCreditsSaved,
      errors,
    };
  } catch (error) {
    logger.error("[BULK_OPTIMIZE] Error:", error);
    return {
      success: false,
      threadsOptimized,
      totalSavedTokens,
      totalCreditsSaved,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
