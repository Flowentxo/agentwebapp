import { NextRequest, NextResponse } from 'next/server';
import { agentBuilder } from '@/server/services/AgentBuilderService';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';

// Input validation schema
const ChatMessageSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  context: z.array(z.object({
    id: z.string(),
    content: z.string(),
    sender: z.enum(['user', 'agent']),
    timestamp: z.string()
  })).optional()
});

// Response interface
interface ChatResponse {
  success: boolean;
  response?: string;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    agentId: string;
    timestamp: string;
    processingTime: number;
    model?: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'anonymous';

  try {
    // Extract user information
    const sessionData = await getSession();
    userId = sessionData?.user?.id || request.headers.get('x-user-id') || 'anonymous';

    // Parse and validate request
    const body = await request.json();
    const validation = ChatMessageSchema.safeParse(body);

    if (!validation.success) {
      logger.warn(`[CHAT] Invalid request format from user: ${userId}`, validation.error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request format',
            details: validation.error.errors
          }
        },
        { status: 400 }
      );
    }

    const { agentId, message, context } = validation.data;

    logger.info(`[CHAT] Chat request from user: ${userId}`, {
      agentId,
      messageLength: message.length,
      contextLength: context?.length || 0
    });

    // Get agent context
    const agentInstance = await agentBuilder.getAgentInstance(agentId);
    
    if (!agentInstance) {
      logger.warn(`[CHAT] Agent not found: ${agentId} for user: ${userId}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found or access denied'
          }
        },
        { status: 404 }
      );
    }

    // Convert context to ChatMessage format for ChatService
    const chatHistory = (context || []).map(msg => ({
      id: msg.id,
      agentId: agentId,
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    // Use ChatService for response (includes Gmail tool support)
    const { ChatService } = await import('@/server/services/ChatService');
    const chatService = new ChatService();
    
    const chatResponse = await chatService.sendMessage(
      agentId,
      message,
      chatHistory,
      userId
    );

    const processingTime = Date.now() - startTime;

    logger.info(`[CHAT] Response generated successfully:`, {
      agentId,
      userId,
      processingTime,
      responseLength: chatResponse.message.length
    });

    // Return successful response
    const response: ChatResponse = {
      success: true,
      response: chatResponse.message,
      metadata: {
        agentId,
        timestamp: new Date().toISOString(),
        processingTime,
        model: chatResponse.model
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    logger.error('[CHAT] Chat request failed:', {
      userId,
      error: error.message,
      stack: error.stack,
      processingTime
    });

    // Determine appropriate error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'An unexpected error occurred';

    if (error.message.includes('Agent not found')) {
      statusCode = 404;
      errorCode = 'AGENT_NOT_FOUND';
      errorMessage = 'Agent not found';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Invalid request data';
    }

    const errorResponse: ChatResponse = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
