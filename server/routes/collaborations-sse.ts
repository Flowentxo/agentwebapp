/**
 * SSE (Server-Sent Events) Endpoint for Real-time Collaboration Updates
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../../lib/db/connection';
import { collaborations, collaborationMessages } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  analyzeTaskAndSelectAgents,
  generateAgentResponse,
  generateFollowUpMessage
} from '../services/OpenAICollaborationService';

const router = Router();

/**
 * GET /api/collaborations/:id/stream
 *
 * Real-time SSE stream for collaboration updates
 */
router.get('/:id/stream', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] as string || 'default-user';

  try {
    const db = getDb();

    // Verify collaboration exists and belongs to user
    const [collaboration] = await db
      .select()
      .from(collaborations)
      .where(eq(collaborations.id, id));

    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    if (collaboration.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', collaborationId: id })}\n\n`);

    // Keep connection alive
    const keepAliveInterval = setInterval(() => {
      res.write(`: keepalive\n\n`);
    }, 15000); // Every 15 seconds

    // Store response for streaming
    (global as any).sseConnections = (global as any).sseConnections || new Map();
    (global as any).sseConnections.set(id, res);

    // Cleanup on close
    req.on('close', () => {
      clearInterval(keepAliveInterval);
      (global as any).sseConnections.delete(id);
      res.end();
    });

  } catch (error) {
    console.error('[SSE_ERROR]', error);
    res.status(500).json({ error: 'Failed to setup SSE stream' });
  }
});

/**
 * Helper: Send SSE message to specific collaboration
 */
export function sendSSEMessage(collaborationId: string, data: any) {
  const connections = (global as any).sseConnections || new Map();
  const res = connections.get(collaborationId);

  if (res && !res.destroyed) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * Generate messages with SSE streaming
 */
export async function generateRealMessagesWithStreaming(
  collaborationId: string,
  agentIds: string[],
  taskDescription: string
) {
  const db = getDb();

  try {
    console.log('[GPT4O_SSE] Starting streaming for:', collaborationId);

    // Send status update
    sendSSEMessage(collaborationId, {
      type: 'status',
      status: 'executing',
      message: 'Starting collaboration...'
    });

    // Update status in DB
    await db
      .update(collaborations)
      .set({ status: 'executing', startedAt: new Date() })
      .where(eq(collaborations.id, collaborationId));

    const previousMessages: Array<{ agentName: string; content: string }> = [];

    // Round 1: Initial perspectives
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const agentName = getAgentName(agentId);

      console.log(`[GPT4O_SSE] Round 1 - Agent ${agentId} analyzing...`);

      // Send "agent thinking" status
      sendSSEMessage(collaborationId, {
        type: 'agent_thinking',
        agentId,
        agentName,
        message: `${agentName} is analyzing the task...`
      });

      // Generate response
      const response = await generateAgentResponse(agentId, taskDescription);

      // Save to database
      const [message] = await db.insert(collaborationMessages).values({
        collaborationId,
        agentId,
        agentName,
        content: response.content,
        type: 'thought',
        llmModel: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
        confidence: response.confidence,
      }).returning();

      // Send message via SSE
      sendSSEMessage(collaborationId, {
        type: 'message',
        message: {
          id: message.id,
          agentId: message.agentId,
          agentName: message.agentName,
          content: message.content,
          messageType: message.type,
          tokensUsed: message.tokensUsed,
          confidence: message.confidence,
          createdAt: message.createdAt
        }
      });

      previousMessages.push({
        agentName,
        content: response.content
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Round 2: Follow-up insights
    for (let i = 0; i < Math.min(agentIds.length, 2); i++) {
      const agentId = agentIds[i];
      const agentName = getAgentName(agentId);

      console.log(`[GPT4O_SSE] Round 2 - Agent ${agentId} following up...`);

      sendSSEMessage(collaborationId, {
        type: 'agent_thinking',
        agentId,
        agentName,
        message: `${agentName} is building on previous insights...`
      });

      const response = await generateFollowUpMessage(
        agentId,
        taskDescription,
        previousMessages
      );

      const [message] = await db.insert(collaborationMessages).values({
        collaborationId,
        agentId,
        agentName,
        content: response.content,
        type: 'insight',
        llmModel: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
        confidence: response.confidence,
      }).returning();

      sendSSEMessage(collaborationId, {
        type: 'message',
        message: {
          id: message.id,
          agentId: message.agentId,
          agentName: message.agentName,
          content: message.content,
          messageType: message.type,
          tokensUsed: message.tokensUsed,
          confidence: message.confidence,
          createdAt: message.createdAt
        }
      });

      previousMessages.push({
        agentName,
        content: response.content
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark as completed
    await db
      .update(collaborations)
      .set({
        status: 'completed',
        completedAt: new Date(),
        summary: `Collaboration completed with ${agentIds.length} agents contributing ${previousMessages.length} insights.`
      })
      .where(eq(collaborations.id, collaborationId));

    // Send completion message
    sendSSEMessage(collaborationId, {
      type: 'completed',
      message: 'Collaboration completed successfully!',
      totalMessages: previousMessages.length
    });

    console.log('[GPT4O_SSE] Completed:', collaborationId);

  } catch (error) {
    console.error('[GPT4O_SSE_ERROR]', error);

    await db
      .update(collaborations)
      .set({ status: 'failed' })
      .where(eq(collaborations.id, collaborationId));

    sendSSEMessage(collaborationId, {
      type: 'error',
      message: 'Collaboration failed'
    });
  }
}

function getAgentName(agentId: string): string {
  const names: Record<string, string> = {
    dexter: 'Dexter',
    cassie: 'Cassie',
    emmie: 'Emmie',
    kai: 'Kai',
    lex: 'Lex',
    finn: 'Finn',
    aura: 'Aura',
    nova: 'Nova',
    ari: 'Ari',
    echo: 'Echo',
    vera: 'Vera',
    omni: 'Omni',
  };
  return names[agentId] || agentId;
}

export default router;
