import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { agentMessages } from '@/lib/db/schema';
import { loadAgent } from '@/lib/agents/agent-loader';
import { eq, and, desc } from 'drizzle-orm';
import { generateAgentResponseStream, streamWithTools, ChatMessage, estimateTokens } from '@/lib/ai/openai-service';
import { OpenAIError, getUserFriendlyMessage } from '@/lib/ai/error-handler';
import { trackUsage } from '@/lib/ai/token-tracker';
import { calculateCost } from '@/lib/ai/model-config';
import { TraceLogger } from '@/lib/tracing/trace-logger';
import { budgetService } from '@/server/services/BudgetService';
import { rateLimitService } from '@/server/services/RateLimitService';
import { AITelemetryService } from '@/server/services/AITelemetryService';
import { withAuth, requireWorkspaceId, AuthConfigs, type RouteContext } from '@/lib/auth/jwt-middleware';
import { getAgentSystemPrompt, enhancePromptWithMemory } from '@/lib/agents/prompts';
import { agentMemoryService } from '@/server/services/AgentMemoryService';
import { EMMIE_ALL_TOOLS, executeGmailTool, getToolDisplay, requiresConfirmation as emmieRequiresConfirmation, getToolActionDescription as emmieGetToolDescription } from '@/lib/agents/emmie/tools';
import { getDexterToolsForOpenAI, executeDexterTool, getToolDisplay as getDexterToolDisplay } from '@/lib/agents/dexter/tools';
import { getBuddyToolsForOpenAI, executeBuddyTool, getBuddyToolDisplay } from '@/server/agents/buddy/executor';
import { getKaiToolsForOpenAI, executeKaiTool, getKaiToolDisplay } from '@/lib/agents/kai/tools';
import { getLexToolsForOpenAI, executeLexTool, getLexToolDisplay } from '@/lib/agents/lex/tools';
import { getNovaToolsForOpenAI, executeNovaTool, getNovaToolDisplay } from '@/lib/agents/nova/tools';
import { getOmniToolsForOpenAI, executeOmniTool, getOmniToolDisplay } from '@/lib/agents/omni/tools';
import { getCassieToolsForOpenAI, executeCassieTool, getCassieToolDisplay } from '@/lib/agents/cassie/tools';
import { getVeraToolsForOpenAI, executeVeraTool, getVeraToolDisplay } from '@/lib/agents/vera/tools';
import { getAriToolsForOpenAI, executeAriTool, getAriToolDisplay } from '@/lib/agents/ari/tools';
import { getAuraToolsForOpenAI, executeAuraTool, getAuraToolDisplay } from '@/lib/agents/aura/tools';
import { getVinceToolsForOpenAI, executeVinceTool, getVinceToolDisplay } from '@/lib/agents/vince/tools';
import { getMiloToolsForOpenAI, executeMiloTool, getMiloToolDisplay } from '@/lib/agents/milo/tools';
import { getEchoToolsForOpenAI, executeEchoTool, getEchoToolDisplay } from '@/lib/agents/echo/tools';
import { getFinnToolsForOpenAI, executeFinnTool, getFinnToolDisplay } from '@/lib/agents/finn/tools';
import { getTenantCommunicatorToolsForOpenAI, executeTenantCommunicatorTool, getTenantCommunicatorToolDisplay } from '@/lib/agents/tenant-communicator/tools';
import { getSentinelToolsForOpenAI, executeSentinelTool, getSentinelToolDisplay } from '@/lib/agents/property-sentinel/tools';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

// Create namespaced logger for this route
const logger = createLogger('api:agents:chat');

// Input validation schemas
const chatMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(50000, 'Message too long (max 50,000 characters)'),
  modelId: z.string().optional(),
  // Control Panel settings
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(256).max(8192).optional(),
  activeTools: z.array(z.string()).optional(),
  // Confirmation of a pending tool action
  confirmedAction: z.object({
    actionId: z.string(),
    toolName: z.string(),
    args: z.record(z.any()),
    approved: z.boolean(),
  }).optional(),
});

// Sanitize user input to prevent prompt injection
function sanitizeInput(input: string): string {
  // Remove potential prompt injection patterns
  return input
    .replace(/\[SYSTEM\]/gi, '[USER]')
    .replace(/\[INST\]/gi, '[USER]')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .trim();
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for AI streaming responses

// Route context type for this endpoint
interface AgentChatContext extends RouteContext {
  params: { id: string };
}

// GET: Fetch message history (AUTHENTICATION REQUIRED)
export const GET = withAuth<AgentChatContext>(async (
  req: NextRequest,
  context,
  auth
) => {
  try {
    const agentId = context.params.id;

    // Require workspace ID for multi-tenant security
    const workspaceId = requireWorkspaceId(req);

    logger.info('Fetching chat history', { userId: auth.userId, agentId, workspaceId });

    // Load agent (custom or built-in)
    const agent = await loadAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const db = getDb();

    // Fetch messages for this agent, user, and workspace
    const messages = await db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.agentId, agentId),
          eq(agentMessages.userId, auth.userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      )
      .orderBy(agentMessages.createdAt)
      .limit(100);

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error('Failed to fetch chat history', { error });
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}, AuthConfigs.agent);

// POST: Send message with streaming response (AUTHENTICATION REQUIRED)
export const POST = withAuth<AgentChatContext>(async (
  req: NextRequest,
  context,
  auth
) => {
  const encoder = new TextEncoder();

  try {
    const agentId = context.params.id;
    const agent = await loadAgent(agentId);

    if (!agent) {
      return new Response('Agent not found', { status: 404 });
    }

    // Require workspace ID for multi-tenant security
    const workspaceId = requireWorkspaceId(req);

    logger.info('Processing chat message', { userId: auth.userId, agentId, workspaceId });

    // Parse and validate request body with Zod
    let body: z.infer<typeof chatMessageSchema>;
    try {
      const rawBody = await req.json();
      body = chatMessageSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: 'Validation error',
            details: error.errors.map(e => e.message)
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Invalid request body', { status: 400 });
    }

    // Sanitize input to prevent prompt injection
    const content = sanitizeInput(body.content);
    const modelId = body.modelId;

    // Extract Control Panel settings with defaults
    const temperature = body.temperature ?? 0.7;
    const maxTokens = body.maxTokens ?? 4000;
    const activeTools = body.activeTools ?? ['web_search', 'email_access', 'database_read', 'file_access'];

    if (!content) {
      return new Response('Message content is required', { status: 400 });
    }

    // Get user's preferred model if modelId not provided
    const userModelPreferences = await budgetService.getModelPreferences(auth.userId);
    const selectedModel = modelId || userModelPreferences.preferredModel;

    logger.debug('Using Control Panel settings', {
      model: selectedModel,
      temperature,
      maxTokens,
      activeTools
    });

    // Handle confirmed tool action (from approval flow)
    if (body.confirmedAction) {
      const { confirmedAction } = body;
      const actionEncoder = new TextEncoder();

      if (confirmedAction.approved) {
        // Execute the approved tool
        const toolResult = await executeGmailTool(confirmedAction.toolName, confirmedAction.args, {
          userId: auth.userId,
          workspaceId,
          sessionId: req.headers.get('x-session-id') || undefined,
        });

        // Return the result as a streamed response
        const actionStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              actionEncoder.encode(`data: ${JSON.stringify({
                toolCall: {
                  id: confirmedAction.actionId,
                  status: toolResult.success ? 'complete' : 'error',
                  tool: confirmedAction.toolName,
                  result: toolResult,
                }
              })}\n\n`)
            );
            controller.enqueue(
              actionEncoder.encode(`data: ${JSON.stringify({
                chunk: toolResult.success
                  ? toolResult.summary || 'Aktion erfolgreich ausgefuehrt.'
                  : `Fehler: ${toolResult.error || 'Unbekannter Fehler'}`,
              })}\n\n`)
            );
            controller.enqueue(
              actionEncoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
          }
        });

        return new Response(actionStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // User rejected — return a message explaining rejection
        const rejectStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              actionEncoder.encode(`data: ${JSON.stringify({
                chunk: 'Verstanden, die Aktion wurde abgebrochen. Wie kann ich dir anders helfen?',
              })}\n\n`)
            );
            controller.enqueue(
              actionEncoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
          }
        });

        return new Response(rejectStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }

    // Check rate limits before processing
    const rateLimitConfig = await budgetService.getRateLimitConfig(auth.userId);
    const rateLimitResult = await rateLimitService.checkRateLimit(auth.userId, rateLimitConfig);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimitInfo: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetAt: rateLimitResult.resetAt,
            window: rateLimitResult.window,
          },
        }),
        {
          status: 429, // Too Many Requests
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // Check budget before processing request
    const estimatedTokensForRequest = estimateTokens(content.trim()) + 1500; // User message + estimated response
    const budgetCheck = await budgetService.checkBudget(auth.userId, estimatedTokensForRequest);

    if (!budgetCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: budgetCheck.reason || 'Budget limit exceeded',
          errorCode: 'BUDGET_EXCEEDED',
          budgetDetails: {
            currentSpend: budgetCheck.currentUsage?.tokensToday || 0,
            dailyLimit: budgetCheck.limits?.dailyTokens || 50000,
            remainingBudget: (budgetCheck.limits?.dailyTokens || 50000) - (budgetCheck.currentUsage?.tokensToday || 0),
          },
          budgetInfo: {
            currentUsage: budgetCheck.currentUsage,
            limits: budgetCheck.limits,
            percentages: budgetCheck.percentages,
          },
        }),
        {
          status: 429, // Too Many Requests
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Start trace for this conversation
    const traceId = TraceLogger.generateTraceId();
    const sessionId = req.headers.get('x-session-id') || `session_${Date.now()}`;
    const trace = new TraceLogger(traceId, agentId, auth.userId, sessionId);

    // Log user message
    trace.logUserMessage(content.trim(), {
      workspaceId,
      timestamp: new Date().toISOString(),
    });

    const db = getDb();

    // Save user message with workspace_id
    await db
      .insert(agentMessages)
      .values({
        agentId,
        userId: auth.userId,
        workspaceId,
        content: content.trim(),
        role: 'user',
        metadata: { traceId }, // Store trace ID for reference
      })
      .returning();

    // Fetch recent conversation history (last 10 messages) from this workspace
    const history = await db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.agentId, agentId),
          eq(agentMessages.userId, auth.userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(agentMessages.createdAt))
      .limit(10);

    // Convert to ChatMessage format (exclude current user message)
    const conversationHistory: ChatMessage[] = history
      .reverse()
      .filter(msg => msg.content !== content.trim())
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    // ──── Memory Retrieval: search for relevant past memories ────
    let memoryContext = '';
    try {
      const memories = await agentMemoryService.searchMemories(agentId, auth.userId, content, 5);
      if (memories.length > 0) {
        memoryContext = '\n\n## Relevant Memories from Past Interactions:\n' +
          memories.map(m => `- [${m.category}] ${m.content}`).join('\n');
        // Increment access counts (fire-and-forget)
        memories.forEach(m => agentMemoryService.incrementAccessCount(m.id).catch(() => {}));
        logger.debug('Memory context loaded', { agentId, memoriesFound: memories.length });
      }
    } catch (memErr) {
      logger.warn('Memory retrieval failed (non-blocking)', { error: memErr });
    }

    // Determine if this is an agentic agent with tools
    const isEmmieAgent = agentId === 'emmie';
    const isDexterAgent = agentId === 'dexter';
    const isBuddyAgent = agentId === 'buddy';
    const isKaiAgent = agentId === 'kai';
    const isLexAgent = agentId === 'lex';
    const isNovaAgent = agentId === 'nova';
    const isOmniAgent = agentId === 'omni';
    const isCassieAgent = agentId === 'cassie';
    const isVeraAgent = agentId === 'vera';
    const isAriAgent = agentId === 'ari';
    const isAuraAgent = agentId === 'aura';
    const isVinceAgent = agentId === 'vince';
    const isMiloAgent = agentId === 'milo';
    const isEchoAgent = agentId === 'echo';
    const isFinnAgent = agentId === 'finn';
    const isTenantCommunicatorAgent = agentId === 'tenant-communicator';
    const isPropertySentinelAgent = agentId === 'property-sentinel';
    const isAgenticAgent = isEmmieAgent || isDexterAgent || isBuddyAgent
      || isKaiAgent || isLexAgent || isNovaAgent || isOmniAgent
      || isCassieAgent || isVeraAgent || isAriAgent || isAuraAgent
      || isVinceAgent || isMiloAgent || isEchoAgent || isFinnAgent
      || isTenantCommunicatorAgent || isPropertySentinelAgent;

    // Stream response
    const startTime = Date.now();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let success = false;
        let errorType: string | undefined;
        let totalToolCalls = 0;
        const toolCallDetails: Array<{ id: string; name: string; status: string; args?: any; result?: any; displayName?: string }> = [];

        try {
          if (isAgenticAgent) {
            // Use streamWithTools for agentic agents (Emmie, Dexter)
            const baseSystemPrompt = await getAgentSystemPrompt(agent, auth.userId);
            const systemPrompt = enhancePromptWithMemory(baseSystemPrompt, memoryContext);
            const toolErrors: Array<{ tool: string; error: string }> = [];
            let recoveryAttempts = 0;

            // Select tools and executor based on agent type
            const allAgentTools = isEmmieAgent
              ? EMMIE_ALL_TOOLS
              : isDexterAgent
                ? getDexterToolsForOpenAI()
                : isBuddyAgent
                  ? getBuddyToolsForOpenAI()
                  : isKaiAgent
                    ? getKaiToolsForOpenAI()
                    : isLexAgent
                      ? getLexToolsForOpenAI()
                      : isNovaAgent
                        ? getNovaToolsForOpenAI()
                        : isOmniAgent
                          ? getOmniToolsForOpenAI()
                          : isCassieAgent
                            ? getCassieToolsForOpenAI()
                            : isVeraAgent
                              ? getVeraToolsForOpenAI()
                              : isAriAgent
                                ? getAriToolsForOpenAI()
                                : isAuraAgent
                                  ? getAuraToolsForOpenAI()
                                  : isVinceAgent
                                    ? getVinceToolsForOpenAI()
                                    : isMiloAgent
                                      ? getMiloToolsForOpenAI()
                                      : isEchoAgent
                                        ? getEchoToolsForOpenAI()
                                        : isFinnAgent
                                          ? getFinnToolsForOpenAI()
                                          : isTenantCommunicatorAgent
                                            ? getTenantCommunicatorToolsForOpenAI()
                                            : isPropertySentinelAgent
                                              ? getSentinelToolsForOpenAI()
                                              : [];

            // Apply tool gating based on activeTools from Control Panel
            const agentTools = allAgentTools.filter(tool => {
              // Map tool names to capability IDs for filtering
              const toolName = tool.function?.name || '';

              // Email-related tools require 'email_access'
              if (toolName.startsWith('gmail_') || toolName.startsWith('email_')) {
                return activeTools.includes('email_access');
              }

              // Database tools require appropriate access
              if (toolName.includes('database') || toolName.includes('query') || toolName.includes('db_')) {
                const isWriteOperation = toolName.includes('write') || toolName.includes('insert') || toolName.includes('update') || toolName.includes('delete');
                return isWriteOperation
                  ? activeTools.includes('database_write')
                  : activeTools.includes('database_read');
              }

              // Web search tools
              if (toolName.includes('search') || toolName.includes('web') || toolName.includes('browse')) {
                return activeTools.includes('web_search');
              }

              // File access tools
              if (toolName.includes('file') || toolName.includes('document') || toolName.includes('pdf')) {
                return activeTools.includes('file_access');
              }

              // Code execution tools
              if (toolName.includes('code') || toolName.includes('execute') || toolName.includes('run')) {
                return activeTools.includes('code_execution');
              }

              // Allow tools that don't match any category (financial calculators, etc.)
              return true;
            });

            logger.debug('Tool gating applied', {
              totalTools: allAgentTools.length,
              enabledTools: agentTools.length,
              activeCapabilities: activeTools
            });

            const agentName = isEmmieAgent ? 'EMMIE' : isDexterAgent ? 'DEXTER' : isBuddyAgent ? 'BUDDY'
              : isKaiAgent ? 'KAI' : isLexAgent ? 'LEX' : isNovaAgent ? 'NOVA' : isOmniAgent ? 'OMNI'
              : isCassieAgent ? 'CASSIE' : isVeraAgent ? 'VERA' : isAriAgent ? 'ARI'
              : isAuraAgent ? 'AURA' : isVinceAgent ? 'VINCE' : isMiloAgent ? 'MILO'
              : isEchoAgent ? 'ECHO' : isFinnAgent ? 'FINN'
              : isTenantCommunicatorAgent ? 'TENANT_COMMUNICATOR' : 'PROPERTY_SENTINEL';

            const toolExecutor = async (toolName: string, args: Record<string, any>) => {
              logger.debug('Executing tool', { agentName, toolName, args });

              if (isEmmieAgent) {
                return executeGmailTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isDexterAgent) {
                // Dexter tool execution
                return executeDexterTool(toolName, args, {
                  userId: auth.userId,
                  agentId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isBuddyAgent) {
                // Buddy tool execution (budget + action tools)
                return executeBuddyTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                  agentId,
                });
              } else if (isKaiAgent) {
                return executeKaiTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isLexAgent) {
                return executeLexTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isNovaAgent) {
                return executeNovaTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isOmniAgent) {
                return executeOmniTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isCassieAgent) {
                return executeCassieTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isVeraAgent) {
                return executeVeraTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isAriAgent) {
                return executeAriTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isAuraAgent) {
                return executeAuraTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isVinceAgent) {
                return executeVinceTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isMiloAgent) {
                return executeMiloTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isEchoAgent) {
                return executeEchoTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isTenantCommunicatorAgent) {
                return executeTenantCommunicatorTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else if (isPropertySentinelAgent) {
                return executeSentinelTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              } else {
                return executeFinnTool(toolName, args, {
                  userId: auth.userId,
                  workspaceId,
                  sessionId: req.headers.get('x-session-id') || undefined,
                });
              }
            };

            const getDisplayName = (toolName: string) => {
              if (isEmmieAgent) return getToolDisplay(toolName);
              if (isDexterAgent) return getDexterToolDisplay(toolName);
              if (isBuddyAgent) return getBuddyToolDisplay(toolName);
              if (isKaiAgent) return getKaiToolDisplay(toolName);
              if (isLexAgent) return getLexToolDisplay(toolName);
              if (isNovaAgent) return getNovaToolDisplay(toolName);
              if (isOmniAgent) return getOmniToolDisplay(toolName);
              if (isCassieAgent) return getCassieToolDisplay(toolName);
              if (isVeraAgent) return getVeraToolDisplay(toolName);
              if (isAriAgent) return getAriToolDisplay(toolName);
              if (isAuraAgent) return getAuraToolDisplay(toolName);
              if (isVinceAgent) return getVinceToolDisplay(toolName);
              if (isMiloAgent) return getMiloToolDisplay(toolName);
              if (isEchoAgent) return getEchoToolDisplay(toolName);
              if (isFinnAgent) return getFinnToolDisplay(toolName);
              if (isTenantCommunicatorAgent) return getTenantCommunicatorToolDisplay(toolName);
              if (isPropertySentinelAgent) return getSentinelToolDisplay(toolName);
              return toolName;
            };

            const toolGenerator = streamWithTools({
              systemPrompt,
              userMessage: content,
              conversationHistory,
              tools: agentTools,
              toolExecutor,
              model: selectedModel,
              temperature, // Use Control Panel value
              maxTokens, // Use Control Panel value
              maxToolCalls: isEmmieAgent ? 10 : isOmniAgent ? 15 : isPropertySentinelAgent ? 10 : 5,
              maxRetries: 3,
              userId: auth.userId, // Memory: auto-log tool results
              agentId, // Memory: auto-log tool results
              requiresConfirmation: isEmmieAgent ? emmieRequiresConfirmation : undefined,
              getToolDescription: isEmmieAgent ? emmieGetToolDescription : undefined,
              onRecovery: (error, attempt) => {
                recoveryAttempts++;
                logger.info('Recovering from error', { agentName, attempt, error: error.message });
                // Notify client about recovery attempt
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    recovery: {
                      attempt,
                      message: `Verbindung wird wiederhergestellt (Versuch ${attempt})...`,
                    }
                  })}\n\n`)
                );
              },
            });

            // Process tool events with enhanced error handling
            for await (const event of toolGenerator) {
              switch (event.type) {
                case 'text_chunk':
                  if (event.chunk) {
                    fullResponse += event.chunk;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ chunk: event.chunk })}\n\n`)
                    );
                  }
                  break;

                case 'tool_call_start':
                  totalToolCalls++;
                  {
                    const toolId = `tool-${Date.now()}-${event.tool}`;
                    toolCallDetails.push({
                      id: toolId,
                      name: event.tool || '',
                      status: 'running',
                      args: event.args,
                      displayName: getDisplayName(event.tool || ''),
                    });
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        toolCall: {
                          id: toolId,
                          status: 'start',
                          tool: event.tool,
                          displayName: getDisplayName(event.tool || ''),
                          args: event.args,
                        }
                      })}\n\n`)
                    );
                  }
                  break;

                case 'tool_call_result':
                  // Track tool errors for summary
                  if (event.result && !event.result.success) {
                    toolErrors.push({
                      tool: event.tool || 'unknown',
                      error: event.result.error || 'Unknown error',
                    });
                  }

                  {
                    // Update the matching toolCallDetails entry with result
                    const existingIdx = toolCallDetails.findIndex(t => t.name === event.tool && t.status === 'running');
                    const finalStatus = event.result?.success ? 'completed' : 'failed';
                    if (existingIdx >= 0) {
                      toolCallDetails[existingIdx].status = finalStatus;
                      toolCallDetails[existingIdx].result = event.result;
                    }
                    const toolId = existingIdx >= 0 ? toolCallDetails[existingIdx].id : `tool-${Date.now()}-${event.tool}`;

                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        toolCall: {
                          id: toolId,
                          status: event.result?.success ? 'complete' : 'error',
                          tool: event.tool,
                          displayName: getDisplayName(event.tool || ''),
                          result: event.result,
                        }
                      })}\n\n`)
                    );
                  }
                  break;

                case 'confirmation_required':
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      confirmationRequired: {
                        actionId: event.confirmation?.actionId,
                        tool: event.tool,
                        displayName: getDisplayName(event.tool || ''),
                        description: event.confirmation?.description,
                        details: event.confirmation?.details,
                        reasoning: fullResponse, // Model's text reasoning before the tool call
                      }
                    })}\n\n`)
                  );
                  break;

                case 'error':
                  // Classify error for better user feedback
                  const errorMessage = event.error || 'Unbekannter Fehler';
                  const isAuthError = errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('anmelden');
                  const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('rate limit');
                  const isNetworkError = errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED');

                  const userFriendlyError = isAuthError
                    ? isEmmieAgent
                      ? 'Gmail-Zugriff abgelaufen. Bitte unter Integrationen neu verbinden.'
                      : 'Authentifizierung fehlgeschlagen. Bitte erneut anmelden.'
                    : isRateLimitError
                      ? 'Zu viele Anfragen. Bitte einen Moment warten.'
                      : isNetworkError
                        ? 'Netzwerkfehler. Bitte Verbindung prüfen.'
                        : errorMessage;

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      error: userFriendlyError,
                      type: isAuthError ? 'auth_error' : isRateLimitError ? 'rate_limit_error' : isNetworkError ? 'network_error' : 'tool_error',
                      recoverable: !isAuthError, // Auth errors require user action
                    })}\n\n`)
                  );
                  break;

                case 'done':
                  // Will be handled after the loop
                  break;
              }
            }

            // Log tool error summary if any occurred
            if (toolErrors.length > 0) {
              logger.warn('Tool errors occurred', { agentName, count: toolErrors.length, errors: toolErrors });
              trace.logEvent('tool_errors', {
                count: toolErrors.length,
                errors: toolErrors,
                recoveryAttempts,
              });
            }

            success = true;
          } else {
            // Standard streaming for non-agentic agents
            // Note: generateAgentResponseStream uses internal defaults, but we log our config for consistency
            logger.debug('Using standard streaming with config', { temperature, maxTokens });
            const streamGenerator = generateAgentResponseStream(
              agent,
              content,
              conversationHistory,
              selectedModel,
              auth.userId,
              temperature, // Pass Control Panel temperature
              maxTokens, // Pass Control Panel maxTokens
              memoryContext // Pass memory context for prompt enhancement
            );

            // Iterate through chunks
            for await (const chunk of streamGenerator) {
              fullResponse += chunk;

              // Send chunk to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
              );
            }

            success = true;
          }

          // Calculate metrics
          const responseTimeMs = Date.now() - startTime;
          const model = selectedModel; // Use the selected model

          // Estimate tokens
          const fullPrompt = conversationHistory
            .map(m => m.content)
            .join('\n') + '\n' + content;
          const promptTokens = estimateTokens(fullPrompt);
          const completionTokens = estimateTokens(fullResponse);
          const totalTokens = promptTokens + completionTokens;

          // Calculate cost using model-specific pricing
          const costUsd = calculateCost(model, promptTokens, completionTokens);

          // Log agent response to trace
          trace.logAgentResponse(fullResponse, {
            model,
            temperature: 0.7,
            maxTokens: 4000,
            tokensPrompt: promptTokens,
            tokensCompletion: completionTokens,
            tokensTotal: totalTokens,
            latencyMs: responseTimeMs,
            costUsd,
            metadata: {
              streaming: true,
              conversationLength: conversationHistory.length,
            },
          });

          // Save complete response to DB with workspace_id
          await db.insert(agentMessages).values({
            agentId,
            userId: auth.userId,
            workspaceId,
            content: fullResponse,
            role: 'assistant',
            metadata: {
              model,
              streaming: true,
              timestamp: new Date().toISOString(),
              traceId, // Store trace ID for reference
              tokens: totalTokens,
              costUsd: costUsd.toFixed(6),
              latencyMs: responseTimeMs,
              ...(isAgenticAgent && totalToolCalls > 0 ? { toolCalls: toolCallDetails } : {}),
            }
          });

          // Track budget usage
          await budgetService.trackUsage(auth.userId, totalTokens, costUsd);

          // Check cost-based alerts
          await budgetService.checkCostAlerts(auth.userId, costUsd);

          // ──── Memory: Save conversation insight (fire-and-forget) ────
          if (fullResponse.length > 100) {
            agentMemoryService.saveMemory(
              agentId,
              auth.userId,
              `User asked: ${content.slice(0, 200)}. Key outcome: ${fullResponse.slice(0, 300)}`,
              'conversation_insight',
              'auto_conversation',
              [agentId],
              { messageLength: fullResponse.length, tokens: totalTokens }
            ).catch(err => logger.warn('Memory insight save failed', { error: err }));
          }

          // Send completion signal with trace ID
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              done: true,
              traceId,
              metrics: {
                tokens: totalTokens,
                costUsd: costUsd.toFixed(6),
                latencyMs: responseTimeMs,
                ...(isAgenticAgent && totalToolCalls > 0 ? { toolCalls: totalToolCalls } : {}),
              }
            })}\n\n`)
          );
        } catch (error) {
          logger.error('Stream error', { error });

          success = false;
          errorType = error instanceof OpenAIError ? error.type : 'unknown';

          // Log error to trace
          trace.logError(error as Error, {
            errorType,
            timestamp: new Date().toISOString(),
          });

          // Send user-friendly error message
          const errorMessage = error instanceof OpenAIError
            ? getUserFriendlyMessage(error)
            : 'An unexpected error occurred. Please try again.';

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              error: errorMessage,
              type: errorType,
              traceId, // Include trace ID even on error
            })}\n\n`)
          );
        } finally {
          // End trace
          trace.end();
          controller.close();

          // Track token usage (estimate for streaming)
          const responseTimeMs = Date.now() - startTime;
          const model = selectedModel; // Use the selected model

          const fullPrompt = conversationHistory
            .map(m => m.content)
            .join('\n') + '\n' + content;

          const promptTokens = estimateTokens(fullPrompt);
          const completionTokens = estimateTokens(fullResponse);

          await trackUsage({
            agentId,
            userId: auth.userId,
            model,
            promptTokens,
            completionTokens,
            responseTimeMs,
            success,
            errorType,
            metadata: {
              streaming: true,
              conversationLength: conversationHistory.length,
            },
          });

          // Log to AI Telemetry Service (fire-and-forget, never blocks)
          AITelemetryService.logTrace({
            traceId,
            provider: 'openai',
            model,
            requestType: isAgenticAgent ? 'function_call' : 'streaming',
            userId: auth.userId,
            agentId,
            workspaceId,
            sessionId,
            promptTokens,
            completionTokens,
            isStreaming: true,
            responseTimeMs,
            status: success ? 'success' : (errorType === 'rate_limit' ? 'rate_limited' : 'failed'),
            errorCode: errorType,
            errorMessage: errorType ? `Stream error: ${errorType}` : undefined,
            metadata: {
              temperature,
              maxTokens,
              functionCalls: isAgenticAgent && totalToolCalls > 0 ? [`${totalToolCalls} tool calls`] : undefined,
            },
          });
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Chat POST error', { error });
    return new Response('Internal server error', { status: 500 });
  }
}, AuthConfigs.agent);

// DELETE: Clear conversation history (AUTHENTICATION REQUIRED)
export const DELETE = withAuth<AgentChatContext>(async (
  req: NextRequest,
  context,
  auth
) => {
  try {
    const agentId = context.params.id;

    // Require workspace ID for multi-tenant security
    const workspaceId = requireWorkspaceId(req);

    logger.info('Clearing chat history', { userId: auth.userId, agentId, workspaceId });

    const db = getDb();

    // Delete all messages for this agent, user, and workspace
    await db
      .delete(agentMessages)
      .where(
        and(
          eq(agentMessages.agentId, agentId),
          eq(agentMessages.userId, auth.userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Conversation cleared',
    });
  } catch (error) {
    logger.error('Failed to clear chat history', { error });
    return NextResponse.json(
      { error: 'Failed to clear conversation' },
      { status: 500 }
    );
  }
}, AuthConfigs.agent);
