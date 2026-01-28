/**
 * VoiceSessionPersistenceService
 *
 * Manages database persistence for voice sessions:
 * - Loads existing conversation context from inbox_messages
 * - Saves voice transcriptions and agent responses incrementally
 * - Persists artifacts to the artifacts table with message linking
 *
 * This bridges ephemeral voice sessions with durable database storage.
 */

import { db } from '@/lib/db';
import {
  inboxThreads,
  inboxMessages,
  artifacts,
  type NewInboxMessage,
  type NewArtifact,
} from '@/lib/db/schema-inbox';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import type { GeneratedArtifact, ArtifactType } from './AIAgentService';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceSessionContext {
  threadId: string;
  userId: string;
  agentId: string;
  agentName: string;
  /** Conversation history formatted for OpenAI context */
  conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  /** Raw messages for reference */
  recentMessages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: Date;
  }>;
}

export interface VoicePersistenceResult {
  success: boolean;
  messageId?: string;
  artifactIds?: string[];
  error?: string;
}

export interface VoiceInteraction {
  userTranscript: string;
  agentResponse: string;
  artifacts: GeneratedArtifact[];
  durationMs?: number;
  tokensUsed?: number;
}

// ============================================================================
// MAP ARTIFACT TYPES
// ============================================================================

/**
 * Map voice artifact types to database artifact types
 */
function mapArtifactType(voiceType: ArtifactType): 'code' | 'markdown' | 'data_table' | 'json' {
  switch (voiceType) {
    case 'code':
      return 'code';
    case 'table':
      return 'data_table';
    case 'markdown':
      return 'markdown';
    case 'chart':
    case 'diagram':
      return 'json';
    default:
      return 'markdown';
  }
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class VoiceSessionPersistenceServiceClass {
  /**
   * Load conversation context for a voice session from an existing thread
   * This allows voice mode to continue conversations started in text chat
   */
  async loadThreadContext(
    threadId: string,
    userId: string,
    maxMessages: number = 10
  ): Promise<VoiceSessionContext | null> {
    try {
      logger.info(`[VoicePersistence] Loading context for thread: ${threadId}`);

      // Fetch the thread
      const [thread] = await db
        .select()
        .from(inboxThreads)
        .where(
          and(
            eq(inboxThreads.id, threadId),
            eq(inboxThreads.userId, userId)
          )
        )
        .limit(1);

      if (!thread) {
        logger.warn(`[VoicePersistence] Thread not found: ${threadId}`);
        return null;
      }

      // Fetch recent messages
      const messages = await db
        .select()
        .from(inboxMessages)
        .where(eq(inboxMessages.threadId, threadId))
        .orderBy(desc(inboxMessages.timestamp))
        .limit(maxMessages);

      // Reverse to get chronological order
      const chronologicalMessages = messages.reverse();

      // Format for OpenAI context
      const conversationHistory = chronologicalMessages.map((msg) => ({
        role: (msg.role === 'agent' ? 'assistant' : msg.role) as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      const recentMessages = chronologicalMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      logger.info(`[VoicePersistence] Loaded ${messages.length} messages for thread: ${threadId}`);

      return {
        threadId,
        userId,
        agentId: thread.agentId,
        agentName: thread.agentName,
        conversationHistory,
        recentMessages,
      };
    } catch (error: any) {
      logger.error(`[VoicePersistence] Failed to load context:`, error);
      return null;
    }
  }

  /**
   * Create a new thread for a voice session (if no existing thread)
   */
  async createVoiceThread(
    userId: string,
    agentId: string,
    agentName: string,
    workspaceId?: string
  ): Promise<string | null> {
    try {
      logger.info(`[VoicePersistence] Creating new voice thread for user: ${userId}, agent: ${agentId}`);

      const [newThread] = await db
        .insert(inboxThreads)
        .values({
          userId,
          agentId,
          agentName,
          workspaceId: workspaceId || null,
          subject: `Voice conversation with ${agentName}`,
          preview: 'Voice session started...',
          status: 'active',
          priority: 'medium',
          metadata: {
            context: {
              source: 'voice_mode',
              createdAt: new Date().toISOString(),
            },
          },
          lastMessageAt: new Date(),
        })
        .returning({ id: inboxThreads.id });

      logger.info(`[VoicePersistence] Created thread: ${newThread.id}`);
      return newThread.id;
    } catch (error: any) {
      logger.error(`[VoicePersistence] Failed to create thread:`, error);
      return null;
    }
  }

  /**
   * Persist a complete voice interaction (user message + agent response + artifacts)
   * Called after each successful STT → LLM → TTS cycle
   */
  async persistInteraction(
    threadId: string,
    userId: string,
    agentId: string,
    agentName: string,
    interaction: VoiceInteraction
  ): Promise<VoicePersistenceResult> {
    try {
      logger.info(`[VoicePersistence] Persisting interaction for thread: ${threadId}`);

      const now = new Date();
      const artifactIds: string[] = [];

      // 1. Save user message
      const [userMessage] = await db
        .insert(inboxMessages)
        .values({
          threadId,
          role: 'user',
          type: 'text',
          content: interaction.userTranscript,
          metadata: {
            source: 'voice_mode',
            durationMs: interaction.durationMs,
          } as any,
          timestamp: now,
        })
        .returning({ id: inboxMessages.id });

      logger.info(`[VoicePersistence] Saved user message: ${userMessage.id}`);

      // 2. Save artifacts (if any) BEFORE agent message
      if (interaction.artifacts.length > 0) {
        for (const artifact of interaction.artifacts) {
          const dbArtifactType = mapArtifactType(artifact.type);

          const [savedArtifact] = await db
            .insert(artifacts)
            .values({
              threadId,
              type: dbArtifactType,
              title: artifact.title,
              content: artifact.content,
              language: artifact.language || null,
              userId,
              metadata: {
                createdBy: 'voice_mode',
                agentId,
                agentName,
                voiceArtifactId: artifact.id,
                originalType: artifact.type,
                ...(artifact.metadata || {}),
              },
            })
            .returning({ id: artifacts.id });

          artifactIds.push(savedArtifact.id);
          logger.info(`[VoicePersistence] Saved artifact: ${savedArtifact.id} (${artifact.title})`);
        }
      }

      // 3. Save agent message (with artifact references)
      const agentMessageTimestamp = new Date(now.getTime() + 1); // Ensure ordering

      const [agentMessage] = await db
        .insert(inboxMessages)
        .values({
          threadId,
          role: 'agent',
          type: artifactIds.length > 0 ? 'artifact' : 'text',
          content: interaction.agentResponse,
          artifacts: artifactIds.map(id => ({ id })),
          metadata: {
            source: 'voice_mode',
            agentId,
            agentName,
            tokens: interaction.tokensUsed,
            artifactCount: artifactIds.length,
          } as any,
          timestamp: agentMessageTimestamp,
        })
        .returning({ id: inboxMessages.id });

      logger.info(`[VoicePersistence] Saved agent message: ${agentMessage.id}`);

      // 4. Update artifacts with messageId reference
      if (artifactIds.length > 0) {
        await db
          .update(artifacts)
          .set({ messageId: agentMessage.id })
          .where(
            sql`${artifacts.id} = ANY(ARRAY[${sql.raw(artifactIds.map(id => `'${id}'::uuid`).join(','))}])`
          );
      }

      // 5. Update thread metadata
      await db
        .update(inboxThreads)
        .set({
          preview: interaction.agentResponse.substring(0, 200),
          messageCount: sql`${inboxThreads.messageCount} + 2`,
          lastMessageAt: agentMessageTimestamp,
          updatedAt: new Date(),
        })
        .where(eq(inboxThreads.id, threadId));

      logger.info(`[VoicePersistence] Interaction persisted successfully`);

      return {
        success: true,
        messageId: agentMessage.id,
        artifactIds,
      };
    } catch (error: any) {
      logger.error(`[VoicePersistence] Failed to persist interaction:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get or create a thread for a voice session
   * If threadId is provided and exists, use it; otherwise create new
   */
  async getOrCreateThread(
    userId: string,
    agentId: string,
    agentName: string,
    existingThreadId?: string,
    workspaceId?: string
  ): Promise<{ threadId: string; isNew: boolean; context?: VoiceSessionContext }> {
    // Try to use existing thread
    if (existingThreadId) {
      const context = await this.loadThreadContext(existingThreadId, userId);
      if (context) {
        return {
          threadId: existingThreadId,
          isNew: false,
          context,
        };
      }
    }

    // Create new thread
    const newThreadId = await this.createVoiceThread(userId, agentId, agentName, workspaceId);
    if (!newThreadId) {
      throw new Error('Failed to create voice thread');
    }

    return {
      threadId: newThreadId,
      isNew: true,
    };
  }

  /**
   * Mark a voice session as completed
   * Updates the thread status and adds a system message
   */
  async endVoiceSession(
    threadId: string,
    sessionDurationMs: number
  ): Promise<void> {
    try {
      logger.info(`[VoicePersistence] Ending voice session for thread: ${threadId}`);

      // Add system message noting session end
      await db
        .insert(inboxMessages)
        .values({
          threadId,
          role: 'system',
          type: 'system_event',
          content: 'Voice session ended',
          metadata: {
            eventType: 'voice_session_end',
            durationMs: sessionDurationMs,
          } as any,
          timestamp: new Date(),
        });

      // Update thread
      await db
        .update(inboxThreads)
        .set({
          updatedAt: new Date(),
          metadata: sql`jsonb_set(
            COALESCE(${inboxThreads.metadata}, '{}'::jsonb),
            '{lastVoiceSession}',
            ${JSON.stringify({
              endedAt: new Date().toISOString(),
              durationMs: sessionDurationMs,
            })}::jsonb
          )`,
        })
        .where(eq(inboxThreads.id, threadId));

      logger.info(`[VoicePersistence] Voice session ended for thread: ${threadId}`);
    } catch (error: any) {
      logger.error(`[VoicePersistence] Failed to end session:`, error);
    }
  }
}

// Export singleton instance
export const voiceSessionPersistenceService = new VoiceSessionPersistenceServiceClass();
export default voiceSessionPersistenceService;
