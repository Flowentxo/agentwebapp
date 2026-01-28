/**
 * Public Chat API for Chrome Extension
 * Simple endpoint without authentication for demo purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAgentResponse } from '@/lib/ai/openai-service';
import { loadAgent } from '@/lib/agents/agent-loader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory storage for conversation history (per session)
const sessions = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, agentId = 'emmie', sessionId = 'default' } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Message is required' } },
        { status: 400 }
      );
    }

    console.log(`[EXTENSION_CHAT] Request for agent: ${agentId}, message length: ${message.length}`);

    // Load agent configuration
    const agent = await loadAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: { message: 'Agent not found' } },
        { status: 404 }
      );
    }

    // Get or create session history
    const historyKey = `${agentId}-${sessionId}`;
    let history = sessions.get(historyKey) || [];

    // Limit history to last 10 messages
    if (history.length > 20) {
      history = history.slice(-20);
    }

    // Generate response using OpenAI
    const response = await generateAgentResponse(agent, message, history);

    // Update history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response.content });
    sessions.set(historyKey, history);

    console.log(`[EXTENSION_CHAT] Response generated, tokens: ${response.tokensUsed}`);

    return NextResponse.json({
      success: true,
      response: response.content,
      metadata: {
        agentId,
        model: response.model,
        tokens: response.tokensUsed
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error: any) {
    console.error('[EXTENSION_CHAT] Error:', error.message);

    // Provide helpful error message
    let errorMessage = 'Failed to generate response';
    if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API key not configured';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded, please try again';
    }

    return NextResponse.json(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
