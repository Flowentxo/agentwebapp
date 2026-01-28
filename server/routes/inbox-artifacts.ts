import { Router, Request, Response } from 'express';
import { getDb } from '../../lib/db';
import {
  artifacts,
  inboxThreads,
  inboxMessages,
  inboxApprovals,
  type Artifact,
  type NewArtifact,
} from '../../lib/db/schema';
import { eq, desc, and, lt, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';
import { toolActionParser } from '../services/ToolActionParser';
import { inboxApprovalService } from '../services/InboxApprovalService';
import { emitInboxMessage, emitInboxThreadUpdate, emitApprovalUpdate, emitInboxTyping } from '../socket';
import { getAgentById } from '../../lib/agents/personas';
import { getAgentSystemPrompt } from '../../lib/agents/prompts';
import { UnifiedAIService } from '../services/UnifiedAIService';

const router = Router();

// Initialize AI service for agent responses
const aiService = new UnifiedAIService();

// =====================================================
// DEBUG / TEST ENDPOINTS
// =====================================================

/**
 * GET /api/inbox/test-auth
 * Test endpoint to verify authentication is working
 * Returns user info if authenticated, error otherwise
 */
router.get('/test-auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;

    logger.info('[INBOX] Auth test successful', { userId, hasUser: !!user });

    return res.json({
      authenticated: true,
      user: {
        id: user?.id || userId,
        userId: user?.userId || userId,
        email: user?.email,
        role: user?.role,
      },
      cookies: {
        hasAccessToken: !!req.cookies?.accessToken,
        hasToken: !!req.cookies?.token,
        hasRefreshToken: !!req.cookies?.refreshToken,
      },
      headers: {
        hasAuthHeader: !!req.headers.authorization,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[INBOX] Auth test failed:', error);
    return res.status(500).json({ authenticated: false, error: 'Test failed' });
  }
});

/**
 * GET /api/inbox/ping
 * Public endpoint to check if inbox API is reachable (no auth required)
 */
router.get('/ping', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'inbox-api',
    timestamp: new Date().toISOString(),
    cookies: Object.keys(req.cookies || {}),
  });
});

// =====================================================
// ARTIFACTS ENDPOINTS
// =====================================================

/**
 * GET /api/inbox/artifacts/:threadId
 * Returns a lightweight list of artifacts for a thread (sidebar/chat references)
 */
router.get('/artifacts/:threadId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const db = getDb();

    // Verify thread ownership
    const thread = await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId))
      .limit(1);

    if (!thread.length || thread[0].userId !== userId) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get artifacts for this thread (lightweight - exclude content)
    const threadArtifacts = await db
      .select({
        id: artifacts.id,
        type: artifacts.type,
        title: artifacts.title,
        language: artifacts.language,
        version: artifacts.version,
        metadata: artifacts.metadata,
        createdAt: artifacts.createdAt,
        updatedAt: artifacts.updatedAt,
      })
      .from(artifacts)
      .where(eq(artifacts.threadId, threadId))
      .orderBy(desc(artifacts.createdAt));

    return res.json({
      success: true,
      artifacts: threadArtifacts,
      count: threadArtifacts.length,
    });
  } catch (error) {
    logger.error('[ARTIFACTS] Error fetching artifacts:', error);
    return res.status(500).json({ error: 'Failed to fetch artifacts' });
  }
});

/**
 * GET /api/inbox/artifacts/item/:artifactId
 * Returns the full artifact content (heavy load - only when user opens Split View)
 */
router.get('/artifacts/item/:artifactId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    if (!artifactId) {
      return res.status(400).json({ error: 'Artifact ID is required' });
    }

    const db = getDb();

    // Get full artifact including content
    const artifact = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, artifactId))
      .limit(1);

    if (!artifact.length) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Verify ownership
    if (artifact[0].userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({
      success: true,
      artifact: artifact[0],
    });
  } catch (error) {
    logger.error('[ARTIFACTS] Error fetching artifact:', error);
    return res.status(500).json({ error: 'Failed to fetch artifact' });
  }
});

/**
 * POST /api/inbox/artifacts
 * Creates a new artifact (internal/agent use)
 */
router.post('/artifacts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;
    const {
      threadId,
      messageId,
      workflowExecutionId,
      type,
      title,
      content,
      language,
      metadata,
      workspaceId,
    } = req.body;

    if (!type || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: type, title, content',
      });
    }

    const db = getDb();

    // Calculate metadata
    const lineCount = content.split('\n').length;
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const newArtifact: NewArtifact = {
      threadId: threadId || null,
      messageId: messageId || null,
      workflowExecutionId: workflowExecutionId || null,
      type,
      title,
      content,
      language: language || null,
      version: 1,
      metadata: {
        lineCount,
        wordCount,
        fileSize: Buffer.byteLength(content, 'utf8'),
        ...metadata,
      },
      userId,
      workspaceId: workspaceId || null,
    };

    const [created] = await db
      .insert(artifacts)
      .values(newArtifact)
      .returning();

    logger.info(`[ARTIFACTS] Created artifact: ${created.id} (${type})`);

    return res.status(201).json({
      success: true,
      artifact: created,
    });
  } catch (error) {
    logger.error('[ARTIFACTS] Error creating artifact:', error);
    return res.status(500).json({ error: 'Failed to create artifact' });
  }
});

/**
 * PUT /api/inbox/artifacts/:artifactId
 * Updates an artifact (creates new version)
 */
router.put('/artifacts/:artifactId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;
    const { content, title, metadata } = req.body;

    if (!artifactId) {
      return res.status(400).json({ error: 'Artifact ID is required' });
    }

    const db = getDb();

    // Get existing artifact
    const existing = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, artifactId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (existing[0].userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate new metadata
    const newContent = content || existing[0].content;
    const lineCount = newContent.split('\n').length;
    const wordCount = newContent.split(/\s+/).filter(Boolean).length;

    // Update artifact
    const [updated] = await db
      .update(artifacts)
      .set({
        content: newContent,
        title: title || existing[0].title,
        version: existing[0].version + 1,
        metadata: {
          ...existing[0].metadata,
          ...metadata,
          lineCount,
          wordCount,
          fileSize: Buffer.byteLength(newContent, 'utf8'),
        },
        updatedAt: new Date(),
      })
      .where(eq(artifacts.id, artifactId))
      .returning();

    logger.info(`[ARTIFACTS] Updated artifact: ${updated.id} (v${updated.version})`);

    return res.json({
      success: true,
      artifact: updated,
    });
  } catch (error) {
    logger.error('[ARTIFACTS] Error updating artifact:', error);
    return res.status(500).json({ error: 'Failed to update artifact' });
  }
});

/**
 * DELETE /api/inbox/artifacts/:artifactId
 * Deletes an artifact
 */
router.delete('/artifacts/:artifactId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    if (!artifactId) {
      return res.status(400).json({ error: 'Artifact ID is required' });
    }

    const db = getDb();

    // Verify ownership
    const existing = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, artifactId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (existing[0].userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.delete(artifacts).where(eq(artifacts.id, artifactId));

    logger.info(`[ARTIFACTS] Deleted artifact: ${artifactId}`);

    return res.json({
      success: true,
      message: 'Artifact deleted',
    });
  } catch (error) {
    logger.error('[ARTIFACTS] Error deleting artifact:', error);
    return res.status(500).json({ error: 'Failed to delete artifact' });
  }
});

// =====================================================
// INBOX THREADS ENDPOINTS
// =====================================================

/**
 * GET /api/inbox/threads
 * Returns all threads for the current user with cursor-based pagination
 * Supports filtering by: status, agentId, search
 */
router.get('/threads', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;
    const {
      status,
      agentId,
      search,
      cursor,
      limit = 20,
    } = req.query;

    const db = getDb();
    const limitNum = Math.min(Number(limit), 50); // Cap at 50

    // Build dynamic conditions
    const conditions: any[] = [eq(inboxThreads.userId, userId)];

    // Filter by agent
    if (agentId && typeof agentId === 'string') {
      conditions.push(eq(inboxThreads.agentId, agentId));
    }

    // Filter by status
    if (status && typeof status === 'string') {
      conditions.push(eq(inboxThreads.status, status as any));
    }

    // Filter by search (subject or preview)
    if (search && typeof search === 'string') {
      const searchTerm = `%${search.toLowerCase()}%`;
      // Use raw SQL for ILIKE since Drizzle's like is case-sensitive
      conditions.push(
        sql`(LOWER(${inboxThreads.subject}) LIKE ${searchTerm} OR LOWER(${inboxThreads.preview}) LIKE ${searchTerm} OR LOWER(${inboxThreads.agentName}) LIKE ${searchTerm})`
      );
    }

    // Cursor-based pagination
    if (cursor && typeof cursor === 'string') {
      conditions.push(lt(inboxThreads.lastMessageAt, new Date(cursor)));
    }

    // Execute query with all conditions
    const threads = await db
      .select()
      .from(inboxThreads)
      .where(and(...conditions))
      .orderBy(desc(inboxThreads.lastMessageAt))
      .limit(limitNum + 1); // Fetch one extra to check if there are more

    // Determine if there are more results
    const hasMore = threads.length > limitNum;
    const resultThreads = hasMore ? threads.slice(0, limitNum) : threads;
    const nextCursor = hasMore && resultThreads.length > 0
      ? resultThreads[resultThreads.length - 1].lastMessageAt?.toISOString()
      : null;

    return res.json({
      success: true,
      threads: resultThreads,
      nextCursor,
      hasMore,
      count: resultThreads.length,
    });
  } catch (error) {
    logger.error('[INBOX] Error fetching threads:', error);
    return res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

/**
 * GET /api/inbox/threads/:threadId
 * Returns a single thread with messages
 */
router.get('/threads/:threadId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    const db = getDb();

    // Get thread
    const thread = await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId))
      .limit(1);

    if (!thread.length || thread[0].userId !== userId) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get messages
    const messages = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(inboxMessages.timestamp);

    return res.json({
      success: true,
      thread: thread[0],
      messages,
    });
  } catch (error) {
    logger.error('[INBOX] Error fetching thread:', error);
    return res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

/**
 * POST /api/inbox/threads/:threadId/messages
 * Adds a new message to a thread
 */
router.post('/threads/:threadId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;
    const { content, type = 'text', role = 'user' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const db = getDb();

    // Verify thread ownership
    const thread = await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId))
      .limit(1);

    if (!thread.length || thread[0].userId !== userId) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if the message is from an agent and contains tool actions
    const isAgentMessage = role === 'agent' || role === 'assistant';
    const hasToolActions = isAgentMessage && toolActionParser.hasToolActions(content);

    // Create message
    const [message] = await db
      .insert(inboxMessages)
      .values({
        threadId,
        role,
        type,
        content,
      })
      .returning();

    // Process tool actions if present in agent message
    let processResult = null;
    if (hasToolActions) {
      logger.info(`[INBOX] *** TOOL_ACTION DETECTED in thread ${threadId} ***`);
      logger.info(`[INBOX] Agent ID: ${thread[0].agentId}, Agent Name: ${thread[0].agentName}`);
      try {
        processResult = await inboxApprovalService.processAgentMessage(
          threadId,
          thread[0].agentId,
          thread[0].agentName,
          content
        );
        logger.info(`[INBOX] *** APPROVAL RESULT: ${processResult.approvals.length} approvals created, suspended: ${processResult.hasApprovals} ***`);
      } catch (err: any) {
        logger.error(`[INBOX] *** APPROVAL ERROR: ${err?.message || err} ***`);
        logger.error('[INBOX] Stack:', err?.stack);
        // Continue anyway - message is saved, just approvals not created
      }
    } else {
      logger.info(`[INBOX] Message saved (no tool actions detected): role=${role}, hasToolActions=${hasToolActions}`);
    }

    // Update thread
    const newPreview = toolActionParser.stripToolActions(content).substring(0, 200);
    const newLastMessageAt = new Date();
    await db
      .update(inboxThreads)
      .set({
        preview: newPreview,
        messageCount: thread[0].messageCount + 1,
        lastMessageAt: newLastMessageAt,
        updatedAt: new Date(),
      })
      .where(eq(inboxThreads.id, threadId));

    // Emit socket events for real-time updates
    // 1. Emit new message to thread subscribers
    emitInboxMessage({
      id: message.id,
      threadId,
      role: role as 'user' | 'agent' | 'system',
      type: type as 'text' | 'approval_request' | 'system_event' | 'artifact',
      content,
      agentId: thread[0].agentId || undefined,
      agentName: thread[0].agentName || undefined,
      timestamp: message.createdAt?.toISOString() || new Date().toISOString(),
    });

    // 2. Emit thread update to sidebar subscribers
    emitInboxThreadUpdate(userId, {
      id: threadId,
      subject: thread[0].subject || 'Untitled',
      preview: newPreview,
      status: processResult?.hasApprovals ? 'suspended' : thread[0].status || 'active',
      unreadCount: role === 'user' ? 0 : (thread[0].unreadCount || 0) + 1,
      lastMessageAt: newLastMessageAt.toISOString(),
    });

    // 3. Generate AI response for user messages
    if (role === 'user') {
      // Fire-and-forget AI response generation
      generateAgentResponse(threadId, userId, thread[0].agentId, thread[0].agentName, content)
        .catch(err => logger.error('[INBOX] AI response generation failed:', err));
    }

    return res.status(201).json({
      success: true,
      message,
      toolActions: processResult ? {
        found: processResult.actions.length,
        approvalsCreated: processResult.approvals.length,
        threadSuspended: processResult.hasApprovals,
      } : null,
    });
  } catch (error) {
    logger.error('[INBOX] Error creating message:', error);
    return res.status(500).json({ error: 'Failed to create message' });
  }
});

/**
 * Generate AI agent response for a user message
 * This runs asynchronously after the user message is saved
 */
async function generateAgentResponse(
  threadId: string,
  userId: string,
  agentId: string | null,
  agentName: string | null,
  userMessage: string
) {
  const db = getDb();
  const effectiveAgentId = agentId || 'omni';
  const effectiveAgentName = agentName || 'AI Assistant';

  try {
    logger.info(`[INBOX_AI] Generating response for thread ${threadId} using agent ${effectiveAgentId}`);

    // 1. Emit typing indicator
    emitInboxTyping({
      threadId,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      isTyping: true,
    });

    // 2. Get agent persona and system prompt
    const agent = getAgentById(effectiveAgentId);
    if (!agent) {
      logger.warn(`[INBOX_AI] Agent ${effectiveAgentId} not found, using default omni`);
    }

    const systemPrompt = agent
      ? await getAgentSystemPrompt(agent, userId)
      : `You are a helpful AI assistant. Respond professionally and helpfully to user questions.`;

    // 3. Load conversation history (last 10 messages)
    const history = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(desc(inboxMessages.createdAt))
      .limit(10);

    // Convert to chat format (oldest first)
    const conversationHistory = history
      .reverse()
      .slice(0, -1) // Exclude the current user message
      .map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

    // 4. Build messages array for AI
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ];

    logger.info(`[INBOX_AI] Calling AI service with ${messages.length} messages (agent: ${effectiveAgentId})`);

    // 5. Generate AI response
    const aiResponse = await aiService.generateChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 2000,
      userId,
      agentId: effectiveAgentId,
    });

    logger.info(`[INBOX_AI] AI response generated: ${aiResponse.message.substring(0, 100)}...`);

    // 6. Stop typing indicator
    emitInboxTyping({
      threadId,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      isTyping: false,
    });

    // 7. Save agent response to database
    const [agentMessage] = await db
      .insert(inboxMessages)
      .values({
        threadId,
        role: 'agent',
        type: 'text',
        content: aiResponse.message,
      })
      .returning();

    // 8. Check for tool actions in agent response
    const hasToolActions = toolActionParser.hasToolActions(aiResponse.message);
    let processResult = null;

    if (hasToolActions) {
      logger.info(`[INBOX_AI] Tool actions detected in agent response`);
      try {
        processResult = await inboxApprovalService.processAgentMessage(
          threadId,
          effectiveAgentId,
          effectiveAgentName,
          aiResponse.message
        );
      } catch (err) {
        logger.error('[INBOX_AI] Error processing tool actions:', err);
      }
    }

    // 9. Update thread preview
    const agentPreview = toolActionParser.stripToolActions(aiResponse.message).substring(0, 200);
    const newLastMessageAt = new Date();

    await db
      .update(inboxThreads)
      .set({
        preview: agentPreview,
        messageCount: sql`${inboxThreads.messageCount} + 1`,
        unreadCount: sql`${inboxThreads.unreadCount} + 1`,
        lastMessageAt: newLastMessageAt,
        updatedAt: new Date(),
      })
      .where(eq(inboxThreads.id, threadId));

    // 10. Emit agent message to thread subscribers
    emitInboxMessage({
      id: agentMessage.id,
      threadId,
      role: 'agent',
      type: 'text',
      content: aiResponse.message,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      timestamp: agentMessage.createdAt?.toISOString() || new Date().toISOString(),
    });

    // 11. Emit thread update to sidebar
    emitInboxThreadUpdate(userId, {
      id: threadId,
      subject: '', // Will be populated from DB
      preview: agentPreview,
      status: processResult?.hasApprovals ? 'suspended' : 'active',
      unreadCount: 1,
      lastMessageAt: newLastMessageAt.toISOString(),
    });

    logger.info(`[INBOX_AI] Agent response saved and emitted for thread ${threadId}`);

  } catch (error: any) {
    logger.error(`[INBOX_AI] Error generating agent response:`, error);

    // Stop typing indicator on error
    emitInboxTyping({
      threadId,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      isTyping: false,
    });

    // Optionally save an error message to the thread
    try {
      const [errorMessage] = await db
        .insert(inboxMessages)
        .values({
          threadId,
          role: 'system',
          type: 'system_event',
          content: `Sorry, I encountered an error while processing your message. Please try again.`,
        })
        .returning();

      emitInboxMessage({
        id: errorMessage.id,
        threadId,
        role: 'system',
        type: 'system_event',
        content: errorMessage.content,
        timestamp: errorMessage.createdAt?.toISOString() || new Date().toISOString(),
      });
    } catch (saveError) {
      logger.error('[INBOX_AI] Failed to save error message:', saveError);
    }
  }
}

/**
 * POST /api/inbox/threads
 * Creates a new thread
 */
router.post('/threads', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;
    const { subject, agentId, agentName, workspaceId } = req.body;

    const db = getDb();

    // Create new thread
    const [newThread] = await db
      .insert(inboxThreads)
      .values({
        userId,
        subject: subject || 'New Conversation',
        agentId: agentId || 'assistant',
        agentName: agentName || 'AI Assistant',
        status: 'active',
        priority: 'medium',
        unreadCount: 0,
        messageCount: 0,
        metadata: {},
        workspaceId: workspaceId || null,
      })
      .returning();

    logger.info(`[INBOX] Created thread: ${newThread.id} for user: ${userId}`);

    // Emit thread update to sidebar subscribers for real-time update
    emitInboxThreadUpdate(userId, {
      id: newThread.id,
      subject: newThread.subject || 'New Conversation',
      preview: '',
      status: 'active',
      unreadCount: 0,
      lastMessageAt: newThread.createdAt?.toISOString() || new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      thread: newThread,
    });
  } catch (error) {
    logger.error('[INBOX] Error creating thread:', error);
    return res.status(500).json({ error: 'Failed to create thread' });
  }
});

/**
 * POST /api/inbox/threads/:threadId/mark-read
 * Marks a thread as read
 */
router.post('/threads/:threadId/mark-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    const db = getDb();

    await db
      .update(inboxThreads)
      .set({
        unreadCount: 0,
        updatedAt: new Date(),
      })
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.userId, userId)));

    return res.json({ success: true });
  } catch (error) {
    logger.error('[INBOX] Error marking thread as read:', error);
    return res.status(500).json({ error: 'Failed to mark thread as read' });
  }
});

/**
 * POST /api/inbox/threads/:threadId/mark-unread
 * Marks a thread as unread
 */
router.post('/threads/:threadId/mark-unread', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    const db = getDb();

    const [updated] = await db
      .update(inboxThreads)
      .set({
        unreadCount: 1,
        updatedAt: new Date(),
      })
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    return res.json({ success: true, thread: updated });
  } catch (error) {
    logger.error('[INBOX] Error marking thread as unread:', error);
    return res.status(500).json({ error: 'Failed to mark thread as unread' });
  }
});

/**
 * PATCH /api/inbox/threads/:threadId/status
 * Updates thread status (archive/unarchive)
 */
router.patch('/threads/:threadId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;
    const { status } = req.body;

    if (!status || !['active', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "archived"' });
    }

    const db = getDb();

    const [updated] = await db
      .update(inboxThreads)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    logger.info(`[INBOX] Thread ${threadId} status updated to: ${status}`);

    return res.json({ success: true, thread: updated });
  } catch (error) {
    logger.error('[INBOX] Error updating thread status:', error);
    return res.status(500).json({ error: 'Failed to update thread status' });
  }
});

/**
 * DELETE /api/inbox/threads/:threadId
 * Deletes a thread (soft or permanent)
 */
router.delete('/threads/:threadId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;
    const permanent = req.query.permanent === 'true';

    const db = getDb();

    // Verify ownership
    const thread = await db
      .select()
      .from(inboxThreads)
      .where(and(eq(inboxThreads.id, threadId), eq(inboxThreads.userId, userId)))
      .limit(1);

    if (!thread.length) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (permanent) {
      // Permanent delete - also delete messages and approvals
      await db.delete(inboxMessages).where(eq(inboxMessages.threadId, threadId));
      await db.delete(inboxApprovals).where(eq(inboxApprovals.threadId, threadId));
      await db.delete(inboxThreads).where(eq(inboxThreads.id, threadId));
      logger.info(`[INBOX] Permanently deleted thread: ${threadId}`);
    } else {
      // Soft delete - just mark as archived
      await db
        .update(inboxThreads)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(eq(inboxThreads.id, threadId));
      logger.info(`[INBOX] Soft deleted (archived) thread: ${threadId}`);
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('[INBOX] Error deleting thread:', error);
    return res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// =====================================================
// APPROVAL ENDPOINTS
// =====================================================

/**
 * POST /api/inbox/approvals/:approvalId/approve
 * Approves an approval request
 */
router.post('/approvals/:approvalId/approve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { approvalId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;

    const db = getDb();

    // Get and verify approval
    const approval = await db
      .select()
      .from(inboxApprovals)
      .where(eq(inboxApprovals.id, approvalId))
      .limit(1);

    if (!approval.length) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (approval[0].status !== 'pending') {
      return res.status(400).json({ error: 'Approval is no longer pending' });
    }

    // Update approval
    const [updated] = await db
      .update(inboxApprovals)
      .set({
        status: 'approved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inboxApprovals.id, approvalId))
      .returning();

    // Update the corresponding message
    await db
      .update(inboxMessages)
      .set({
        approval: {
          ...approval[0],
          status: 'approved',
          resolvedAt: new Date().toISOString(),
          resolvedBy: userId,
        },
      })
      .where(eq(inboxMessages.id, approval[0].messageId));

    // Update thread status if it was suspended
    const [updatedThread] = await db
      .update(inboxThreads)
      .set({
        status: 'active',
        pendingApprovalId: null,
        updatedAt: new Date(),
      })
      .where(eq(inboxThreads.id, approval[0].threadId))
      .returning();

    logger.info(`[APPROVALS] Approved: ${approvalId} by ${userId}`);

    // Emit socket events for real-time updates
    emitApprovalUpdate(approval[0].threadId!, {
      approvalId,
      status: 'approved',
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
    });

    // Also update the thread in sidebar
    if (updatedThread) {
      emitInboxThreadUpdate(updatedThread.userId, {
        id: updatedThread.id,
        subject: updatedThread.subject || 'Untitled',
        preview: updatedThread.preview || '',
        status: 'active',
        unreadCount: updatedThread.unreadCount || 0,
        lastMessageAt: updatedThread.lastMessageAt?.toISOString() || new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      approval: updated,
    });
  } catch (error) {
    logger.error('[APPROVALS] Error approving:', error);
    return res.status(500).json({ error: 'Failed to approve' });
  }
});

/**
 * POST /api/inbox/approvals/:approvalId/reject
 * Rejects an approval request
 */
router.post('/approvals/:approvalId/reject', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { approvalId } = req.params;
    const userId = (req as any).user?.id || (req as any).userId;
    const { comment } = req.body;

    const db = getDb();

    // Get and verify approval
    const approval = await db
      .select()
      .from(inboxApprovals)
      .where(eq(inboxApprovals.id, approvalId))
      .limit(1);

    if (!approval.length) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (approval[0].status !== 'pending') {
      return res.status(400).json({ error: 'Approval is no longer pending' });
    }

    // Update approval
    const [updated] = await db
      .update(inboxApprovals)
      .set({
        status: 'rejected',
        resolvedBy: userId,
        resolvedAt: new Date(),
        comment: comment || null,
        updatedAt: new Date(),
      })
      .where(eq(inboxApprovals.id, approvalId))
      .returning();

    // Update the corresponding message
    await db
      .update(inboxMessages)
      .set({
        approval: {
          ...approval[0],
          status: 'rejected',
          resolvedAt: new Date().toISOString(),
          resolvedBy: userId,
          comment: comment || undefined,
        },
      })
      .where(eq(inboxMessages.id, approval[0].messageId));

    // Update thread status
    const [updatedThread] = await db
      .update(inboxThreads)
      .set({
        status: 'active',
        pendingApprovalId: null,
        updatedAt: new Date(),
      })
      .where(eq(inboxThreads.id, approval[0].threadId))
      .returning();

    logger.info(`[APPROVALS] Rejected: ${approvalId} by ${userId}`);

    // Emit socket events for real-time updates
    emitApprovalUpdate(approval[0].threadId!, {
      approvalId,
      status: 'rejected',
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
      comment: comment || undefined,
    });

    // Also update the thread in sidebar
    if (updatedThread) {
      emitInboxThreadUpdate(updatedThread.userId, {
        id: updatedThread.id,
        subject: updatedThread.subject || 'Untitled',
        preview: updatedThread.preview || '',
        status: 'active',
        unreadCount: updatedThread.unreadCount || 0,
        lastMessageAt: updatedThread.lastMessageAt?.toISOString() || new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      approval: updated,
    });
  } catch (error) {
    logger.error('[APPROVALS] Error rejecting:', error);
    return res.status(500).json({ error: 'Failed to reject' });
  }
});

export default router;
