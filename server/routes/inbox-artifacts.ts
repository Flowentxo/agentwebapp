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
import { emitInboxMessage, emitInboxThreadUpdate, emitApprovalUpdate, emitInboxTyping, emitAgentRouted, emitInboxMessageStream, emitInboxMessageComplete, emitInboxSystemEvent } from '../socket';
import { getAgentById } from '../../lib/agents/personas';
import { getAgentSystemPrompt } from '../../lib/agents/prompts';
import { UnifiedAIService } from '../services/UnifiedAIService';
import { routingService, type RoutingResult } from '../services/RoutingService';
import { extractMentionedAgent, stripMention } from '../utils/extract-mention';

// --- Glass Cockpit: Agentic tool-calling imports ---
import { streamWithTools, type ChatMessage } from '../../lib/ai/openai-service';
import { MAX_TOKENS } from '../../lib/ai/config';
import { getDexterToolsForOpenAI, executeDexterTool, getToolDisplay as getDexterToolDisplay } from '../../lib/agents/dexter/tools';
import { EMMIE_ALL_TOOLS, executeGmailTool, getToolDisplay as getEmmieToolDisplay } from '../../lib/agents/emmie/tools';
import { getBuddyToolsForOpenAI, executeBuddyTool, getBuddyToolDisplay } from '../agents/buddy/executor';
import { getKaiToolsForOpenAI, executeKaiTool, getKaiToolDisplay } from '../../lib/agents/kai/tools';
import { getLexToolsForOpenAI, executeLexTool, getLexToolDisplay } from '../../lib/agents/lex/tools';
import { getNovaToolsForOpenAI, executeNovaTool, getNovaToolDisplay } from '../../lib/agents/nova/tools';
import { getOmniToolsForOpenAI, executeOmniTool, getOmniToolDisplay } from '../../lib/agents/omni/tools';
import { getCassieToolsForOpenAI, executeCassieTool, getCassieToolDisplay } from '../../lib/agents/cassie/tools';
import { getVeraToolsForOpenAI, executeVeraTool, getVeraToolDisplay } from '../../lib/agents/vera/tools';
import { getAriToolsForOpenAI, executeAriTool, getAriToolDisplay } from '../../lib/agents/ari/tools';
import { getAuraToolsForOpenAI, executeAuraTool, getAuraToolDisplay } from '../../lib/agents/aura/tools';
import { getVinceToolsForOpenAI, executeVinceTool, getVinceToolDisplay } from '../../lib/agents/vince/tools';
import { getMiloToolsForOpenAI, executeMiloTool, getMiloToolDisplay } from '../../lib/agents/milo/tools';
import { getEchoToolsForOpenAI, executeEchoTool, getEchoToolDisplay } from '../../lib/agents/echo/tools';
import { getFinnToolsForOpenAI, executeFinnTool, getFinnToolDisplay } from '../../lib/agents/finn/tools';
import { emitInboxToolCall } from '../socket';

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
 *
 * Now includes Omni-Orchestrator routing:
 * 1. Classify user intent
 * 2. Route to best agent
 * 3. Update thread if agent changed
 * 4. Generate response with selected agent
 */
async function generateAgentResponse(
  threadId: string,
  userId: string,
  agentId: string | null,
  agentName: string | null,
  userMessage: string
) {
  const db = getDb();
  let effectiveAgentId = agentId || 'omni';
  let effectiveAgentName = agentName || 'AI Assistant';
  let processedMessage = userMessage;

  try {
    logger.info(`[INBOX_AI] Processing message for thread ${threadId}, current agent: ${effectiveAgentId}`);

    // ============================================
    // OMNI-ORCHESTRATOR ROUTING
    // ============================================

    // Check for explicit @mention override first
    const mentionedAgent = extractMentionedAgent(userMessage);
    if (mentionedAgent) {
      logger.info(`[INBOX_AI] @mention detected: ${mentionedAgent.name}, overriding routing`);
      effectiveAgentId = mentionedAgent.id;
      effectiveAgentName = mentionedAgent.name;

      // Update thread with mentioned agent
      await db
        .update(inboxThreads)
        .set({
          agentId: effectiveAgentId,
          agentName: effectiveAgentName,
          updatedAt: new Date()
        })
        .where(eq(inboxThreads.id, threadId));

      // Emit routing event for frontend
      emitAgentRouted(threadId, {
        selectedAgent: effectiveAgentId,
        agentName: effectiveAgentName,
        confidence: 1.0,
        reasoning: `Manually assigned via @${mentionedAgent.name}`,
        previousAgent: agentId || undefined
      });

      // Strip @mention from the message for cleaner AI processing
      processedMessage = stripMention(userMessage);
    }

    // Only auto-route if no @mention and agent is generic
    const shouldRoute = !mentionedAgent && (effectiveAgentId === 'omni' || effectiveAgentId === 'assistant');

    if (shouldRoute) {
      logger.info(`[INBOX_AI] Routing enabled for agent ${effectiveAgentId}, classifying intent...`);

      // Get recent conversation context for better routing
      const recentMessages = await db
        .select()
        .from(inboxMessages)
        .where(eq(inboxMessages.threadId, threadId))
        .orderBy(desc(inboxMessages.createdAt))
        .limit(5);

      const conversationContext = recentMessages
        .reverse()
        .map(msg => `${msg.role}: ${msg.content.substring(0, 200)}`);

      // Classify intent and get best agent
      const routingResult = await routingService.classifyIntent(
        userMessage,
        effectiveAgentId,
        conversationContext
      );

      logger.info(`[INBOX_AI] Routing result: ${routingResult.selectedAgent} (confidence: ${routingResult.confidence})`);

      // If agent changed, update thread and notify frontend
      if (routingResult.wasRouted && routingResult.selectedAgent !== effectiveAgentId) {
        const newAgent = getAgentById(routingResult.selectedAgent);
        if (newAgent) {
          effectiveAgentId = routingResult.selectedAgent;
          effectiveAgentName = newAgent.name;

          // Update thread with new agent
          await db
            .update(inboxThreads)
            .set({
              agentId: effectiveAgentId,
              agentName: effectiveAgentName,
              updatedAt: new Date()
            })
            .where(eq(inboxThreads.id, threadId));

          logger.info(`[INBOX_AI] Thread ${threadId} routed to ${effectiveAgentName}`);

          // Emit agent:routed event to frontend
          emitAgentRouted(threadId, {
            selectedAgent: effectiveAgentId,
            agentName: effectiveAgentName,
            confidence: routingResult.confidence,
            reasoning: routingResult.reasoning,
            previousAgent: routingResult.previousAgent
          });
        }
      }
    }

    logger.info(`[INBOX_AI] Generating response using agent ${effectiveAgentId}`);

    // 1. Emit typing indicator
    emitInboxTyping({
      threadId,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      isTyping: true,
    });

    // 2. Emit "thinking" processing stage
    emitInboxSystemEvent(threadId, {
      id: `stage-${Date.now()}-thinking`,
      type: 'workflow_started',
      content: `${effectiveAgentName} is analyzing your request...`,
      metadata: { eventType: 'processing_stage', stage: 'thinking', agentId: effectiveAgentId, agentName: effectiveAgentName },
      timestamp: new Date().toISOString(),
    });

    // 3. Get agent persona and system prompt
    const agent = getAgentById(effectiveAgentId);
    if (!agent) {
      logger.warn(`[INBOX_AI] Agent ${effectiveAgentId} not found, using default omni`);
    }

    const systemPrompt = agent
      ? await getAgentSystemPrompt(agent, userId)
      : `You are a helpful AI assistant. Respond professionally and helpfully to user questions.`;

    // 4. Load conversation history (last 10 messages)
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

    // 5. Build messages array for AI
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: processedMessage },
    ];

    logger.info(`[INBOX_AI] Calling AI service with ${messages.length} messages (agent: ${effectiveAgentId})`);

    // 6. Pre-create message row in DB (needed for streaming message ID)
    const [agentMessage] = await db
      .insert(inboxMessages)
      .values({
        threadId,
        role: 'agent',
        type: 'text',
        content: '', // Will be updated after streaming completes
      })
      .returning();

    // 7. Emit "generating" processing stage
    emitInboxSystemEvent(threadId, {
      id: `stage-${Date.now()}-generating`,
      type: 'workflow_started',
      content: `${effectiveAgentName} is writing...`,
      metadata: { eventType: 'processing_stage', stage: 'generating', agentId: effectiveAgentId, agentName: effectiveAgentName },
      timestamp: new Date().toISOString(),
    });

    // 8. Determine if this agent supports tool calling (Glass Cockpit)
    const AGENTIC_AGENTS = ['dexter', 'emmie', 'buddy', 'kai', 'lex', 'nova', 'omni', 'cassie', 'vera', 'ari', 'aura', 'vince', 'milo', 'echo', 'finn'];
    const isAgenticAgent = AGENTIC_AGENTS.includes(effectiveAgentId);

    let fullResponse = '';
    const toolCallDetails: Array<{ id: string; name: string; status: string; args?: any; result?: any; displayName?: string }> = [];

    if (isAgenticAgent) {
      // --- AGENTIC PATH: Use streamWithTools for tool-calling agents ---
      logger.info(`[INBOX_AI] Using agentic path (streamWithTools) for ${effectiveAgentId}`);

      // Load tools for the agent
      const agentTools = effectiveAgentId === 'emmie' ? EMMIE_ALL_TOOLS
        : effectiveAgentId === 'dexter' ? getDexterToolsForOpenAI()
        : effectiveAgentId === 'buddy' ? getBuddyToolsForOpenAI()
        : effectiveAgentId === 'kai' ? getKaiToolsForOpenAI()
        : effectiveAgentId === 'lex' ? getLexToolsForOpenAI()
        : effectiveAgentId === 'nova' ? getNovaToolsForOpenAI()
        : effectiveAgentId === 'omni' ? getOmniToolsForOpenAI()
        : effectiveAgentId === 'cassie' ? getCassieToolsForOpenAI()
        : effectiveAgentId === 'vera' ? getVeraToolsForOpenAI()
        : effectiveAgentId === 'ari' ? getAriToolsForOpenAI()
        : effectiveAgentId === 'aura' ? getAuraToolsForOpenAI()
        : effectiveAgentId === 'vince' ? getVinceToolsForOpenAI()
        : effectiveAgentId === 'milo' ? getMiloToolsForOpenAI()
        : effectiveAgentId === 'echo' ? getEchoToolsForOpenAI()
        : effectiveAgentId === 'finn' ? getFinnToolsForOpenAI()
        : [];

      // Build tool executor
      const toolExecutor = async (toolName: string, args: Record<string, any>) => {
        const context = { userId, workspaceId: undefined as string | undefined, sessionId: undefined as string | undefined };
        if (effectiveAgentId === 'emmie') return executeGmailTool(toolName, args, context);
        if (effectiveAgentId === 'dexter') return executeDexterTool(toolName, args, { ...context, agentId: effectiveAgentId });
        if (effectiveAgentId === 'buddy') return executeBuddyTool(toolName, args, { ...context, agentId: effectiveAgentId });
        if (effectiveAgentId === 'kai') return executeKaiTool(toolName, args, context);
        if (effectiveAgentId === 'lex') return executeLexTool(toolName, args, context);
        if (effectiveAgentId === 'nova') return executeNovaTool(toolName, args, context);
        if (effectiveAgentId === 'omni') return executeOmniTool(toolName, args, context);
        if (effectiveAgentId === 'cassie') return executeCassieTool(toolName, args, context);
        if (effectiveAgentId === 'vera') return executeVeraTool(toolName, args, context);
        if (effectiveAgentId === 'ari') return executeAriTool(toolName, args, context);
        if (effectiveAgentId === 'aura') return executeAuraTool(toolName, args, context);
        if (effectiveAgentId === 'vince') return executeVinceTool(toolName, args, context);
        if (effectiveAgentId === 'milo') return executeMiloTool(toolName, args, context);
        if (effectiveAgentId === 'echo') return executeEchoTool(toolName, args, context);
        if (effectiveAgentId === 'finn') return executeFinnTool(toolName, args, context);
        return { success: false, error: 'Unknown agent' };
      };

      // Build display name resolver
      const getDisplayName = (toolName: string) => {
        if (effectiveAgentId === 'emmie') return getEmmieToolDisplay(toolName);
        if (effectiveAgentId === 'dexter') return getDexterToolDisplay(toolName);
        if (effectiveAgentId === 'buddy') return getBuddyToolDisplay(toolName);
        if (effectiveAgentId === 'kai') return getKaiToolDisplay(toolName);
        if (effectiveAgentId === 'lex') return getLexToolDisplay(toolName);
        if (effectiveAgentId === 'nova') return getNovaToolDisplay(toolName);
        if (effectiveAgentId === 'omni') return getOmniToolDisplay(toolName);
        if (effectiveAgentId === 'cassie') return getCassieToolDisplay(toolName);
        if (effectiveAgentId === 'vera') return getVeraToolDisplay(toolName);
        if (effectiveAgentId === 'ari') return getAriToolDisplay(toolName);
        if (effectiveAgentId === 'aura') return getAuraToolDisplay(toolName);
        if (effectiveAgentId === 'vince') return getVinceToolDisplay(toolName);
        if (effectiveAgentId === 'milo') return getMiloToolDisplay(toolName);
        if (effectiveAgentId === 'echo') return getEchoToolDisplay(toolName);
        if (effectiveAgentId === 'finn') return getFinnToolDisplay(toolName);
        return toolName;
      };

      // Stream with tools
      const toolGenerator = streamWithTools({
        systemPrompt,
        userMessage: processedMessage,
        conversationHistory: conversationHistory as ChatMessage[],
        tools: agentTools,
        toolExecutor,
        maxTokens: MAX_TOKENS,
        maxToolCalls: effectiveAgentId === 'omni' ? 15 : effectiveAgentId === 'emmie' ? 10 : 5,
      });

      // Process events from the tool-calling stream
      for await (const event of toolGenerator) {
        switch (event.type) {
          case 'text_chunk':
            if (event.chunk) {
              fullResponse += event.chunk;
              emitInboxMessageStream(threadId, { messageId: agentMessage.id, content: event.chunk });
            }
            break;

          case 'tool_call_start': {
            const toolId = `tool-${Date.now()}-${event.tool}`;
            toolCallDetails.push({
              id: toolId,
              name: event.tool || '',
              status: 'running',
              args: event.args,
              displayName: getDisplayName(event.tool || ''),
            });
            emitInboxToolCall(threadId, {
              messageId: agentMessage.id,
              id: toolId,
              status: 'start',
              tool: event.tool || '',
              displayName: getDisplayName(event.tool || ''),
              args: event.args,
            });
            break;
          }

          case 'tool_call_result': {
            const existingIdx = toolCallDetails.findIndex(t => t.name === event.tool && t.status === 'running');
            const finalStatus = event.result?.success ? 'completed' : 'failed';
            if (existingIdx >= 0) {
              toolCallDetails[existingIdx].status = finalStatus;
              toolCallDetails[existingIdx].result = event.result;
            }
            const toolId = existingIdx >= 0 ? toolCallDetails[existingIdx].id : `tool-${Date.now()}-${event.tool}`;
            emitInboxToolCall(threadId, {
              messageId: agentMessage.id,
              id: toolId,
              status: event.result?.success ? 'complete' : 'error',
              tool: event.tool || '',
              displayName: getDisplayName(event.tool || ''),
              result: event.result,
            });
            break;
          }

          case 'error':
            logger.error(`[INBOX_AI] Tool error for ${effectiveAgentId}:`, event.error);
            break;

          case 'done':
            break;
        }
      }

    } else {
      // --- NON-AGENTIC PATH: Keep existing text-only streaming ---
      logger.info(`[INBOX_AI] Using text-only path for ${effectiveAgentId}`);
      for await (const chunk of aiService.generateStreamingCompletion(messages, {
        temperature: 0.7,
        maxTokens: MAX_TOKENS,
      })) {
        fullResponse += chunk;
        emitInboxMessageStream(threadId, { messageId: agentMessage.id, content: chunk });
      }
    }

    logger.info(`[INBOX_AI] AI response streamed: ${fullResponse.substring(0, 100)}... (tools: ${toolCallDetails.length})`);

    // 9. Update DB with full response content + tool metadata
    await db
      .update(inboxMessages)
      .set({
        content: fullResponse,
        ...(toolCallDetails.length > 0 ? {
          metadata: { toolCalls: toolCallDetails }
        } : {}),
      })
      .where(eq(inboxMessages.id, agentMessage.id));

    // 10. Emit stream completion
    emitInboxMessageComplete(threadId, agentMessage.id);

    // 11. Stop typing indicator
    emitInboxTyping({
      threadId,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      isTyping: false,
    });

    // 12. Check for tool actions in agent response
    const hasToolActions = toolActionParser.hasToolActions(fullResponse);
    let processResult = null;

    if (hasToolActions) {
      logger.info(`[INBOX_AI] Tool actions detected in agent response`);
      try {
        processResult = await inboxApprovalService.processAgentMessage(
          threadId,
          effectiveAgentId,
          effectiveAgentName,
          fullResponse
        );
      } catch (err) {
        logger.error('[INBOX_AI] Error processing tool actions:', err);
      }
    }

    // 13. Update thread preview
    const agentPreview = toolActionParser.stripToolActions(fullResponse).substring(0, 200);
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

    // 14. Emit final complete message to thread subscribers
    emitInboxMessage({
      id: agentMessage.id,
      threadId,
      role: 'agent',
      type: 'text',
      content: fullResponse,
      agentId: effectiveAgentId,
      agentName: effectiveAgentName,
      timestamp: agentMessage.createdAt?.toISOString() || new Date().toISOString(),
      ...(toolCallDetails.length > 0 ? {
        metadata: { toolCalls: toolCallDetails }
      } : {}),
    });

    // 15. Emit thread update to sidebar
    emitInboxThreadUpdate(userId, {
      id: threadId,
      subject: '', // Will be populated from DB
      preview: agentPreview,
      status: processResult?.hasApprovals ? 'suspended' : 'active',
      unreadCount: 1,
      lastMessageAt: newLastMessageAt.toISOString(),
    });

    logger.info(`[INBOX_AI] Agent response streamed and saved for thread ${threadId}`);

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
