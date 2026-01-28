'use server';

/**
 * Level 16: Inbox Server Actions
 * Handles thread and message CRUD operations
 * Phase 2: Includes AI response generation
 */

import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { generateAgentResponse, executeApprovedTool } from '@/lib/ai/agent-service';

// ============================================================================
// HELPER: Get authenticated user ID
// ============================================================================

async function getAuthUserId(): Promise<string> {
  const session = await getSession();

  if (!session || !session.user?.id) {
    throw new Error('Unauthorized: Please sign in to access this resource');
  }

  return session.user.id;
}

// ============================================================================
// Types
// ============================================================================

export type ThreadStatus = 'OPEN' | 'PENDING_APPROVAL' | 'ARCHIVED' | 'RESOLVED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export interface Thread {
  id: string;
  userId: string;
  agentId: string | null;
  agentName: string | null;
  agentColor: string | null;
  agentIcon: string | null;
  title: string;
  preview: string | null;
  status: ThreadStatus;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
  _count?: { messages: number };
}

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  toolInvocations: any | null;
  pendingAction: PendingAction | null;
  tokensUsed: number | null;
  model: string | null;
  metadata: any | null;
  createdAt: Date;
}

export interface PendingAction {
  id: string;
  type: 'sendEmail' | 'sendSlackNotification' | 'postSlack' | 'executeCode' | 'apiCall';
  data: any;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface CreateThreadInput {
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  agentIcon?: string;
  title: string;
  initialMessage?: string;
}

export interface SendMessageInput {
  threadId: string;
  content: string;
  role?: MessageRole;
  toolInvocations?: any;
  pendingAction?: PendingAction;
}

// ============================================================================
// Thread Actions
// ============================================================================

/**
 * Get all threads for the current user
 * Limited to 50 threads to prevent overload
 */
export async function getThreads(filter?: ThreadStatus): Promise<Thread[]> {
  try {
    const userId = await getAuthUserId();

    const threads = await prisma.thread.findMany({
      where: {
        userId,
        ...(filter ? { status: filter } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50, // Limit to prevent overload
      include: {
        _count: { select: { messages: true } },
      },
    });

    return threads as Thread[];
  } catch (error) {
    console.error('[GET_THREADS] Error fetching threads:', error);
    return []; // Return empty array on error instead of crashing
  }
}

/**
 * Get a single thread with messages
 */
export async function getThread(threadId: string): Promise<Thread | null> {
  const userId = await getAuthUserId();

  const thread = await prisma.thread.findFirst({
    where: {
      id: threadId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return thread as Thread | null;
}

/**
 * Find an existing thread for a specific agent
 * Returns the most recent non-archived thread for this user+agent combination
 * Used for "Resume Conversation" logic to avoid creating duplicate threads
 */
export async function findThreadByAgent(agentId: string): Promise<Thread | null> {
  try {
    const userId = await getAuthUserId();

    console.log('[FIND_THREAD_BY_AGENT] Looking for thread with agentId:', agentId, 'userId:', userId);

    const thread = await prisma.thread.findFirst({
      where: {
        userId,
        agentId,
        status: { not: 'ARCHIVED' }, // Exclude archived threads
      },
      orderBy: { lastMessageAt: 'desc' }, // Get the most recent one
      include: {
        _count: { select: { messages: true } },
      },
    });

    if (thread) {
      console.log('[FIND_THREAD_BY_AGENT] ✅ Found existing thread:', thread.id);
    } else {
      console.log('[FIND_THREAD_BY_AGENT] No existing thread found for agent:', agentId);
    }

    return thread as Thread | null;
  } catch (error) {
    console.error('[FIND_THREAD_BY_AGENT] Error:', error);
    return null;
  }
}

/**
 * Create a new thread - OPTIMIZED for speed
 * This should be instant (< 500ms) - no blocking operations
 */
export async function createThread(input: CreateThreadInput): Promise<Thread> {
  console.log('[CREATE_THREAD] Starting with input:', {
    agentId: input.agentId,
    agentName: input.agentName,
    title: input.title
  });
  const startTime = Date.now();

  // Validate required fields
  if (!input.title?.trim()) {
    throw new Error('Thread title is required');
  }

  const userId = await getAuthUserId();
  console.log('[CREATE_THREAD] Got userId in', Date.now() - startTime, 'ms');

  const thread = await prisma.thread.create({
    data: {
      userId,
      agentId: input.agentId,
      agentName: input.agentName,
      agentColor: input.agentColor,
      agentIcon: input.agentIcon,
      title: input.title,
      preview: input.initialMessage?.slice(0, 100) || null,
      status: 'OPEN',
    },
  });
  console.log('[CREATE_THREAD] Thread created in', Date.now() - startTime, 'ms');

  // If there's an initial message, create it (but don't block)
  if (input.initialMessage) {
    // Fire and forget - don't await
    prisma.message.create({
      data: {
        threadId: thread.id,
        role: 'USER',
        content: input.initialMessage,
      },
    }).catch(err => console.error('[CREATE_THREAD] Failed to create initial message:', err));
  }

  // Skip revalidatePath - it's slow and we do optimistic updates on client
  // revalidatePath('/inbox');

  console.log('[CREATE_THREAD] Completed in', Date.now() - startTime, 'ms');
  return thread as Thread;
}

/**
 * Update thread status
 */
export async function updateThreadStatus(
  threadId: string,
  status: ThreadStatus
): Promise<Thread> {
  const userId = await getAuthUserId();

  const thread = await prisma.thread.update({
    where: {
      id: threadId,
      userId,
    },
    data: { status },
  });

  revalidatePath('/inbox');
  return thread as Thread;
}

/**
 * Archive a thread
 */
export async function archiveThread(threadId: string): Promise<Thread> {
  return updateThreadStatus(threadId, 'ARCHIVED');
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string): Promise<void> {
  const userId = await getAuthUserId();

  await prisma.thread.delete({
    where: {
      id: threadId,
      userId,
    },
  });

  revalidatePath('/inbox');
}

// ============================================================================
// Message Actions
// ============================================================================

/**
 * Send a message in a thread
 * Phase 2: Now triggers AI response generation for USER messages
 */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const userId = await getAuthUserId();

  // Verify thread ownership
  const thread = await prisma.thread.findFirst({
    where: { id: input.threadId, userId },
  });
  if (!thread) throw new Error('Thread not found');

  // Create message
  const message = await prisma.message.create({
    data: {
      threadId: input.threadId,
      role: input.role || 'USER',
      content: input.content,
      toolInvocations: input.toolInvocations,
      pendingAction: input.pendingAction as any,
    },
  });

  // Update thread's lastMessageAt and preview
  await prisma.thread.update({
    where: { id: input.threadId },
    data: {
      lastMessageAt: new Date(),
      preview: input.content.slice(0, 100),
      // If there's a pending action, set thread to PENDING_APPROVAL
      ...(input.pendingAction?.status === 'pending'
        ? { status: 'PENDING_APPROVAL' }
        : {}),
    },
  });

  // Phase 2: Generate AI response for USER messages
  // Skip AI generation for ASSISTANT, SYSTEM, or TOOL messages
  const messageRole = input.role || 'USER';
  console.log('[INBOX_ACTIONS] Message role:', messageRole);

  if (messageRole === 'USER') {
    try {
      console.log('[INBOX_ACTIONS] Triggering AI response generation for thread:', input.threadId);
      console.log('[INBOX_ACTIONS] Thread agentId:', thread.agentId);
      const aiResult = await generateAgentResponse(input.threadId);

      if (aiResult.success) {
        console.log('[INBOX_ACTIONS] AI response generated successfully');
        console.log('[INBOX_ACTIONS] AI response content preview:', aiResult.message?.content?.slice(0, 100));
      } else {
        // Log the error but don't fail the user message send
        console.error('[INBOX_ACTIONS] AI response generation failed:', aiResult.error);
      }
    } catch (aiError) {
      // Log but don't throw - user message was saved successfully
      console.error('[INBOX_ACTIONS] AI generation error:', aiError);
    }
  } else {
    console.log('[INBOX_ACTIONS] Skipping AI generation for non-USER role:', messageRole);
  }

  revalidatePath('/inbox');
  return message as Message;
}

/**
 * FIX-003: Get messages for a thread with pagination
 * Returns empty array if thread not found (resilient - no crash)
 *
 * Pagination prevents memory bloat on threads with many messages.
 * Default limit of 100 messages per request.
 * Use cursor-based pagination for efficiency.
 */
export async function getMessages(
  threadId: string,
  options?: {
    limit?: number;
    cursor?: string; // Message ID to start after
    includeOlderMessages?: boolean; // If true, fetches messages BEFORE cursor
  }
): Promise<Message[]> {
  try {
    const userId = await getAuthUserId();
    const limit = Math.min(options?.limit || 100, 500); // Cap at 500 max

    // Verify thread ownership - return empty array if not found (no crash)
    const thread = await prisma.thread.findFirst({
      where: { id: threadId, userId },
      select: { id: true }, // Only select ID for speed
    });

    if (!thread) {
      console.warn('[GET_MESSAGES] Thread not found or not owned by user:', threadId);
      return []; // Return empty array instead of throwing
    }

    // Build cursor-based pagination query
    const cursorConfig = options?.cursor
      ? {
          cursor: { id: options.cursor },
          skip: 1, // Skip the cursor message itself
        }
      : {};

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: options?.includeOlderMessages ? 'desc' : 'asc' },
      take: limit,
      ...cursorConfig,
    });

    // If we fetched in reverse order, reverse back to chronological
    if (options?.includeOlderMessages) {
      messages.reverse();
    }

    return messages as Message[];
  } catch (error: any) {
    // Handle timeout errors gracefully
    if (error.message?.includes('Query timeout')) {
      console.error('[GET_MESSAGES] Query timed out for thread:', threadId);
      return []; // Return empty on timeout
    }
    console.error('[GET_MESSAGES] Error fetching messages:', error);
    return []; // Return empty array on any error
  }
}

/**
 * Get total message count for a thread (for pagination UI)
 */
export async function getMessageCount(threadId: string): Promise<number> {
  try {
    const userId = await getAuthUserId();

    const count = await prisma.message.count({
      where: {
        threadId,
        thread: { userId }, // Verify ownership
      },
    });

    return count;
  } catch (error) {
    console.error('[GET_MESSAGE_COUNT] Error:', error);
    return 0;
  }
}

// ============================================================================
// Level 16.5: Stability Fix - Combined Send + AI Response
// ============================================================================

export interface SendMessageAndGetResponseResult {
  success: boolean;
  messages: Message[];
  userMessage?: Message;
  aiGenerated?: boolean;
  error?: string;
}

/**
 * Send a message AND wait for AI response, then return ALL messages
 * This fixes the "ghost response" issue by:
 * 1. Saving user message
 * 2. AWAITING AI generation fully
 * 3. Fetching and returning ALL messages including AI response
 */
export async function sendMessageAndGetResponse(
  input: SendMessageInput
): Promise<SendMessageAndGetResponseResult> {
  const userId = await getAuthUserId();

  console.log('[SEND_AND_GET] Starting for thread:', input.threadId);

  // Verify thread ownership
  const thread = await prisma.thread.findFirst({
    where: { id: input.threadId, userId },
  });
  if (!thread) {
    return { success: false, messages: [], error: 'Thread not found' };
  }

  let userMessage: Message | undefined;
  let aiGenerated = false;

  try {
    // Step 1: Create user message
    const createdUserMessage = await prisma.message.create({
      data: {
        threadId: input.threadId,
        role: input.role || 'USER',
        content: input.content,
        toolInvocations: input.toolInvocations,
        pendingAction: input.pendingAction as any,
      },
    });
    userMessage = createdUserMessage as Message;
    console.log('[SEND_AND_GET] User message saved:', userMessage.id);

    // Update thread's lastMessageAt and preview
    await prisma.thread.update({
      where: { id: input.threadId },
      data: {
        lastMessageAt: new Date(),
        preview: input.content.slice(0, 100),
        ...(input.pendingAction?.status === 'pending'
          ? { status: 'PENDING_APPROVAL' }
          : {}),
      },
    });

    // Step 2: Generate AI response with TIMEOUT protection
    const messageRole = input.role || 'USER';
    if (messageRole === 'USER') {
      console.log('[SEND_AND_GET] ═══════════════════════════════════════════════');
      console.log('[SEND_AND_GET] Generating AI response...');
      console.log('[SEND_AND_GET] Thread ID:', input.threadId);
      console.log('[SEND_AND_GET] Agent ID:', thread.agentId || 'Generic Assistant');
      console.log('[SEND_AND_GET] ═══════════════════════════════════════════════');

      const aiStartTime = Date.now();

      try {
        // Wrap AI generation in a timeout to prevent infinite waiting
        // Increased from 30s to 55s to allow for complex AI responses
        // (Must be less than maxDuration of 60s to allow for message saving)
        const AI_TIMEOUT = 55000; // 55 seconds max
        console.log('[SEND_AND_GET] Starting AI generation with', AI_TIMEOUT / 1000, 's timeout');

        const aiPromise = generateAgentResponse(input.threadId);
        const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'AI generation timed out' }), AI_TIMEOUT)
        );

        const aiResult = await Promise.race([aiPromise, timeoutPromise]);
        const aiDuration = Date.now() - aiStartTime;

        console.log('[SEND_AND_GET] AI generation completed in', aiDuration, 'ms');
        console.log('[SEND_AND_GET] AI Result:', {
          success: aiResult.success,
          hasMessage: !!('message' in aiResult && aiResult.message),
          error: aiResult.success ? null : aiResult.error,
          tokensUsed: 'tokensUsed' in aiResult ? aiResult.tokensUsed : null,
          model: 'model' in aiResult ? aiResult.model : null,
        });

        if (aiResult.success && 'message' in aiResult && aiResult.message) {
          console.log('[SEND_AND_GET] AI Response Details:', {
            messageId: aiResult.message.id,
            contentLength: aiResult.message.content.length,
            contentPreview: aiResult.message.content.substring(0, 100) + (aiResult.message.content.length > 100 ? '...' : ''),
            hasToolInvocations: !!aiResult.message.toolInvocations,
            hasPendingAction: !!aiResult.message.pendingAction,
          });
          aiGenerated = true;
        } else {
          // AI GENERATION FAILED - LOUD ERROR!
          // Pass the error to the client so they can see what went wrong
          const errorReason = aiResult.error || 'Unknown AI error';
          console.error('[SEND_AND_GET] ═══════════════════════════════════════════════');
          console.error('[SEND_AND_GET] AI GENERATION FAILED - LOUD ERROR');
          console.error('[SEND_AND_GET] Error:', errorReason);
          console.error('[SEND_AND_GET] Full aiResult:', JSON.stringify(aiResult, null, 2));
          console.error('[SEND_AND_GET] ═══════════════════════════════════════════════');

          // Fetch messages to include the user's saved message
          const savedMessages = await prisma.message.findMany({
            where: { threadId: input.threadId },
            orderBy: { createdAt: 'asc' },
          });

          // Return with explicit error - the client MUST see this
          return {
            success: false,
            messages: savedMessages as Message[],
            userMessage,
            aiGenerated: false,
            error: `AI Generation Failed: ${errorReason}`,
          };
        }
      } catch (aiError: any) {
        const aiDuration = Date.now() - aiStartTime;
        console.error('[SEND_AND_GET] ═══════════════════════════════════════════════');
        console.error('[SEND_AND_GET] AI GENERATION EXCEPTION - LOUD ERROR');
        console.error('[SEND_AND_GET] Duration:', aiDuration, 'ms');
        console.error('[SEND_AND_GET] Error Name:', aiError?.name);
        console.error('[SEND_AND_GET] Error Message:', aiError?.message);
        console.error('[SEND_AND_GET] Error Stack:', aiError?.stack?.split('\n').slice(0, 3).join('\n'));
        console.error('[SEND_AND_GET] ═══════════════════════════════════════════════');

        // Fetch messages to include the user's saved message
        const savedMessages = await prisma.message.findMany({
          where: { threadId: input.threadId },
          orderBy: { createdAt: 'asc' },
        });

        // Return with explicit error - the client MUST see this
        const errorMessage = aiError?.message || 'AI exception occurred';
        return {
          success: false,
          messages: savedMessages as Message[],
          userMessage,
          aiGenerated: false,
          error: `AI Exception: ${errorMessage}`,
        };
      }
    }

    // Step 3: Fetch ALL messages (including the new AI response)
    console.log('[SEND_AND_GET] Fetching all messages for thread...');
    const allMessages = await prisma.message.findMany({
      where: { threadId: input.threadId },
      orderBy: { createdAt: 'asc' },
    });

    // Validate we have messages
    if (!allMessages || allMessages.length === 0) {
      console.error('[SEND_AND_GET] No messages found after save - this should not happen');
      return {
        success: false,
        messages: [],
        userMessage,
        error: 'Failed to retrieve messages after save',
      };
    }

    console.log('[SEND_AND_GET] ═══════════════════════════════════════════════');
    console.log('[SEND_AND_GET] COMPLETED SUCCESSFULLY');
    console.log('[SEND_AND_GET] Total messages:', allMessages.length);
    console.log('[SEND_AND_GET] AI Generated:', aiGenerated);
    const lastMsg = allMessages[allMessages.length - 1];
    console.log('[SEND_AND_GET] Last message role:', lastMsg?.role);
    console.log('[SEND_AND_GET] Last message preview:', lastMsg?.content?.substring(0, 50) + '...');
    console.log('[SEND_AND_GET] ═══════════════════════════════════════════════');

    revalidatePath('/inbox');
    return {
      success: true,
      messages: allMessages as Message[],
      userMessage,
      aiGenerated,
    };
  } catch (error: any) {
    console.error('[SEND_AND_GET] ═══════════════════════════════════════════════');
    console.error('[SEND_AND_GET] FAILED WITH ERROR');
    console.error('[SEND_AND_GET] Error name:', error?.name);
    console.error('[SEND_AND_GET] Error message:', error?.message);
    console.error('[SEND_AND_GET] Error stack:', error?.stack?.split('\n').slice(0, 3).join('\n'));
    console.error('[SEND_AND_GET] ═══════════════════════════════════════════════');

    // Return specific error message for frontend
    const errorMessage = error?.message || 'An unexpected error occurred';
    return {
      success: false,
      messages: [],
      userMessage,
      error: errorMessage,
    };
  }
}

// ============================================================================
// HITL (Human-in-the-Loop) Actions
// ============================================================================

/**
 * Approve a pending action
 * Phase 3: Uses real tool execution via executeApprovedTool
 */
export async function approvePendingAction(
  messageId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const userId = await getAuthUserId();

  // Get the message with pending action
  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { thread: true },
  });

  if (!message || message.thread.userId !== userId) {
    throw new Error('Message not found');
  }

  const pendingAction = message.pendingAction as PendingAction | null;
  if (!pendingAction || pendingAction.status !== 'pending') {
    throw new Error('No pending action found');
  }

  console.log('[INBOX_ACTIONS] Approving action:', pendingAction.type);

  try {
    // Execute the tool using the agent-service
    const executionResult = await executeApprovedTool(pendingAction);

    if (!executionResult.success) {
      // Update action status to reflect failure
      await prisma.message.update({
        where: { id: messageId },
        data: {
          pendingAction: {
            ...pendingAction,
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectionReason: executionResult.error || 'Execution failed',
          },
        },
      });

      // Update thread status back to OPEN
      await prisma.thread.update({
        where: { id: message.threadId },
        data: { status: 'OPEN' },
      });

      // Add a system message noting the failure
      await prisma.message.create({
        data: {
          threadId: message.threadId,
          role: 'SYSTEM',
          content: `Action execution failed: ${executionResult.error || 'Unknown error'}`,
        },
      });

      revalidatePath('/inbox');
      return { success: false, error: executionResult.error };
    }

    // Update the pending action status to approved
    await prisma.message.update({
      where: { id: messageId },
      data: {
        pendingAction: {
          ...pendingAction,
          status: 'approved',
          approvedAt: new Date().toISOString(),
        },
      },
    });

    // Update thread status back to OPEN
    await prisma.thread.update({
      where: { id: message.threadId },
      data: { status: 'OPEN' },
    });

    // Add a system message confirming the action
    let confirmationMessage = '';
    switch (pendingAction.type) {
      case 'sendEmail':
        confirmationMessage = `✅ Email sent successfully to ${pendingAction.data.to}`;
        break;
      case 'sendSlackNotification':
        confirmationMessage = `✅ Slack message sent to ${pendingAction.data.channel}`;
        break;
      default:
        confirmationMessage = `✅ Action "${pendingAction.type}" executed successfully`;
    }

    await prisma.message.create({
      data: {
        threadId: message.threadId,
        role: 'SYSTEM',
        content: confirmationMessage,
        metadata: { actionResult: executionResult.result },
      },
    });

    console.log('[INBOX_ACTIONS] Action executed successfully');
    revalidatePath('/inbox');
    return { success: true, result: executionResult.result };
  } catch (error: any) {
    console.error('[INBOX_ACTIONS] Action execution error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a pending action
 */
export async function rejectPendingAction(
  messageId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  // Get the message with pending action
  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { thread: true },
  });

  if (!message || message.thread.userId !== userId) {
    throw new Error('Message not found');
  }

  const pendingAction = message.pendingAction as PendingAction | null;
  if (!pendingAction || pendingAction.status !== 'pending') {
    throw new Error('No pending action found');
  }

  // Update the pending action status
  await prisma.message.update({
    where: { id: messageId },
    data: {
      pendingAction: {
        ...pendingAction,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      },
    },
  });

  // Update thread status back to OPEN
  await prisma.thread.update({
    where: { id: message.threadId },
    data: { status: 'OPEN' },
  });

  // Add a system message noting the rejection
  await prisma.message.create({
    data: {
      threadId: message.threadId,
      role: 'SYSTEM',
      content: `Action rejected: ${pendingAction.type}${reason ? `. Reason: ${reason}` : ''}`,
    },
  });

  revalidatePath('/inbox');
  return { success: true };
}

// ============================================================================
// Dashboard Integration
// ============================================================================

/**
 * Create a thread from a dashboard command
 */
export async function createThreadFromCommand(
  command: string,
  agentId?: string,
  agentName?: string,
  agentColor?: string
): Promise<Thread> {
  const userId = await getAuthUserId();

  // Create thread with the command as title
  const thread = await prisma.thread.create({
    data: {
      userId,
      agentId,
      agentName,
      agentColor,
      title: command.slice(0, 100),
      preview: command.slice(0, 100),
      status: 'OPEN',
    },
  });

  // Create initial user message
  await prisma.message.create({
    data: {
      threadId: thread.id,
      role: 'USER',
      content: command,
    },
  });

  revalidatePath('/inbox');
  return thread as Thread;
}

/**
 * Get threads that need approval (for badge count)
 */
export async function getPendingApprovalCount(): Promise<number> {
  try {
    const userId = await getAuthUserId();

    const count = await prisma.thread.count({
      where: {
        userId,
        status: 'PENDING_APPROVAL',
      },
    });

    return count;
  } catch {
    return 0;
  }
}
