/**
 * COLLABORATION LAB V2 - API ROUTES
 *
 * Backend API für Multi-Agent Collaborations mit GPT-4o-mini
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../../lib/db/connection';
import { collaborations, collaborationMessages, collaborationAgents } from '../../lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  analyzeTaskAndSelectAgents,
  generateAgentResponse,
  generateFollowUpMessage
} from '../services/OpenAICollaborationService';
import { getAgentPrompt } from '../../lib/agents/collaboration-prompts';
import { generateRealMessagesWithStreaming } from './collaborations-sse';
import {
  generateBusinessPlan,
  generateMarketingStrategy,
  generateTechnicalDoc
} from '../services/DocumentGenerationService';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const startCollaborationSchema = z.object({
  taskDescription: z.string().min(10).max(5000),
});

const interactSchema = z.object({
  content: z.string().min(1).max(2000),
  targetAgentId: z.string().optional(),
});

// ========================================
// MIDDLEWARE
// ========================================

/**
 * Extract user ID from request
 * TODO: Replace with proper auth middleware
 */
function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'default-user';
}

// ========================================
// ROUTES
// ========================================

/**
 * POST /api/collaborations/start
 *
 * Start a new collaboration
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { taskDescription } = startCollaborationSchema.parse(req.body);
    const userId = getUserId(req);

    const db = getDb();

    console.log('[COLLABORATION_START] Task:', taskDescription);

    // Step 1: Analyze task with GPT-4o-mini and select agents
    const { selectedAgentIds, reasoning, complexity } = await analyzeTaskAndSelectAgents(taskDescription);

    console.log('[COLLABORATION_START] Selected agents:', selectedAgentIds);

    // Step 2: Create collaboration
    const [collaboration] = await db
      .insert(collaborations)
      .values({
        userId,
        taskDescription,
        status: 'planning',
        semanticAnalysis: {
          reasoning,
          selectedAgents: selectedAgentIds,
          complexity
        },
        complexityScore: complexity,
        estimatedDuration: selectedAgentIds.length * 5, // 5s per agent with GPT-4o-mini
      })
      .returning();

    // Step 3: Save selected agents
    const agentInserts = selectedAgentIds.map((agentId, index) => ({
      collaborationId: collaboration.id,
      agentId,
      selectionReason: reasoning,
      relevanceScore: 90 - (index * 5), // Decrease slightly for each agent
      messagesCount: 0,
    }));

    await db.insert(collaborationAgents).values(agentInserts);

    // Step 4: Start GPT-4o-mini orchestration with SSE streaming
    generateRealMessagesWithStreaming(collaboration.id, selectedAgentIds, taskDescription).catch(error => {
      console.error('[ORCHESTRATION_ERROR]', error);
    });

    // Return response
    res.json({
      success: true,
      collaboration: {
        id: collaboration.id,
        status: collaboration.status,
        selectedAgents: selectedAgentIds.map((id, index) => ({
          id,
          name: getAgentName(id),
          relevance: (90 - index * 5) / 100,
        })),
        estimatedDuration: collaboration.estimatedDuration,
        reasoning
      },
    });
  } catch (error) {
    console.error('[COLLABORATION_START]', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Failed to start collaboration' });
    }
  }
});

/**
 * GET /api/collaborations/:id
 *
 * Get collaboration details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    // Get collaboration
    const [collaboration] = await db
      .select()
      .from(collaborations)
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    if (!collaboration) {
      return res.status(404).json({ success: false, error: 'Collaboration not found' });
    }

    // Get agents
    const agents = await db
      .select()
      .from(collaborationAgents)
      .where(eq(collaborationAgents.collaborationId, id));

    // Get messages
    const messages = await db
      .select()
      .from(collaborationMessages)
      .where(eq(collaborationMessages.collaborationId, id))
      .orderBy(collaborationMessages.createdAt);

    res.json({
      success: true,
      collaboration: {
        ...collaboration,
        agents,
        messages,
      },
    });
  } catch (error) {
    console.error('[COLLABORATION_GET]', error);
    res.status(500).json({ success: false, error: 'Failed to get collaboration' });
  }
});

/**
 * GET /api/collaborations/:id/messages
 *
 * Get collaboration messages
 */
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    // Verify ownership
    const [collaboration] = await db
      .select()
      .from(collaborations)
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    if (!collaboration) {
      return res.status(404).json({ success: false, error: 'Collaboration not found' });
    }

    // Get messages
    const messages = await db
      .select()
      .from(collaborationMessages)
      .where(eq(collaborationMessages.collaborationId, id))
      .orderBy(collaborationMessages.createdAt);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('[COLLABORATION_MESSAGES]', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

/**
 * GET /api/collaborations
 *
 * List user's collaborations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    const db = getDb();

    let query = db
      .select()
      .from(collaborations)
      .where(eq(collaborations.userId, userId))
      .orderBy(desc(collaborations.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(and(
        eq(collaborations.userId, userId),
        eq(collaborations.status, status as any)
      ));
    }

    const results = await query;

    res.json({
      success: true,
      collaborations: results,
      pagination: {
        limit,
        offset,
        total: results.length,
      },
    });
  } catch (error) {
    console.error('[COLLABORATION_LIST]', error);
    res.status(500).json({ success: false, error: 'Failed to list collaborations' });
  }
});

/**
 * POST /api/collaborations/:id/interact
 *
 * User sends message during collaboration
 */
router.post('/:id/interact', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, targetAgentId } = interactSchema.parse(req.body);
    const userId = getUserId(req);

    const db = getDb();

    // Verify ownership
    const [collaboration] = await db
      .select()
      .from(collaborations)
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    if (!collaboration) {
      return res.status(404).json({ success: false, error: 'Collaboration not found' });
    }

    // Add user message
    await db.insert(collaborationMessages).values({
      collaborationId: id,
      agentId: 'user',
      agentName: 'You',
      content,
      type: 'user_input',
      targetAgentId,
    });

    res.json({ success: true, message: 'Message sent' });

    // Trigger agent responses to user input
    (async () => {
      try {
        // Get involved agents
        const agentRecords = await db
          .select()
          .from(collaborationAgents)
          .where(eq(collaborationAgents.collaborationId, id));

        const agentIds = agentRecords.map(a => a.agentId);

        // Select which agent(s) should respond (1-2 agents)
        let respondingAgents: string[] = [];
        if (targetAgentId && agentIds.includes(targetAgentId)) {
          respondingAgents = [targetAgentId];
        } else {
          // Pick first 2 agents to respond
          respondingAgents = agentIds.slice(0, 2);
        }

        // Get conversation history
        const messages = await db
          .select()
          .from(collaborationMessages)
          .where(eq(collaborationMessages.collaborationId, id))
          .orderBy(collaborationMessages.createdAt);

        const previousMessages = messages.map(msg => ({
          agentName: msg.agentName || 'Agent',
          content: msg.content
        }));

        // Generate responses from selected agents
        const { sendSSEMessage } = await import('./collaborations-sse');

        for (const agentId of respondingAgents) {
          const agentName = getAgentName(agentId);

          // Send "thinking" status via SSE
          sendSSEMessage(id, {
            type: 'agent_thinking',
            agentId,
            agentName,
            message: `${agentName} is responding to your input...`
          });

          // Generate response
          const response = await generateFollowUpMessage(
            agentId,
            collaboration.taskDescription,
            previousMessages
          );

          // Save response
          const [savedMessage] = await db.insert(collaborationMessages).values({
            collaborationId: id,
            agentId,
            agentName,
            content: response.content,
            type: 'response',
            llmModel: response.model,
            tokensUsed: response.tokensUsed,
            latencyMs: response.latencyMs,
            confidence: response.confidence,
          }).returning();

          // Stream response via SSE
          sendSSEMessage(id, {
            type: 'message',
            message: {
              id: savedMessage.id,
              agentId: savedMessage.agentId,
              agentName: savedMessage.agentName,
              content: savedMessage.content,
              messageType: savedMessage.type,
              tokensUsed: savedMessage.tokensUsed,
              confidence: savedMessage.confidence,
              createdAt: savedMessage.createdAt
            }
          });

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`[USER_INTERACTION] ${respondingAgents.length} agent(s) responded`);
      } catch (error) {
        console.error('[USER_INTERACTION_RESPONSE]', error);
      }
    })();
  } catch (error) {
    console.error('[COLLABORATION_INTERACT]', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }
});

/**
 * POST /api/collaborations/:id/pause
 *
 * Pause a collaboration
 */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    await db
      .update(collaborations)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    res.json({ success: true, message: 'Collaboration paused' });
  } catch (error) {
    console.error('[COLLABORATION_PAUSE]', error);
    res.status(500).json({ success: false, error: 'Failed to pause collaboration' });
  }
});

/**
 * POST /api/collaborations/:id/resume
 *
 * Resume a paused collaboration
 */
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    await db
      .update(collaborations)
      .set({ status: 'executing', updatedAt: new Date() })
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    res.json({ success: true, message: 'Collaboration resumed' });

    // TODO: Continue orchestration
  } catch (error) {
    console.error('[COLLABORATION_RESUME]', error);
    res.status(500).json({ success: false, error: 'Failed to resume collaboration' });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Select agents based on task description
 * TODO: Make this smart with LLM
 */
function selectAgents(taskDescription: string): string[] {
  const task = taskDescription.toLowerCase();
  const agents: string[] = [];

  // Simple keyword matching for now
  if (task.includes('data') || task.includes('analytics')) agents.push('dexter');
  if (task.includes('customer') || task.includes('support')) agents.push('cassie');
  if (task.includes('strategy') || task.includes('plan')) agents.push('emmie');
  if (task.includes('code') || task.includes('technical')) agents.push('kai');
  if (task.includes('legal') || task.includes('compliance')) agents.push('lex');
  if (task.includes('finance') || task.includes('budget')) agents.push('finn');
  if (task.includes('workflow') || task.includes('process')) agents.push('aura');

  // Default: at least 2 agents
  if (agents.length === 0) {
    agents.push('aura', 'emmie');
  } else if (agents.length === 1) {
    agents.push('aura');
  }

  return agents;
}

/**
 * Get agent name by ID
 */
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

/**
 * Generate real messages using GPT-4o-mini
 * Orchestrates agent conversation with actual AI
 */
async function generateRealMessages(
  collaborationId: string,
  agentIds: string[],
  taskDescription: string
) {
  const db = getDb();

  try {
    console.log('[GPT4O_ORCHESTRATION] Starting for:', collaborationId);

    // Update status to executing
    await db
      .update(collaborations)
      .set({ status: 'executing', startedAt: new Date() })
      .where(eq(collaborations.id, collaborationId));

    const previousMessages: Array<{ agentName: string; content: string }> = [];

    // Round 1: Initial perspectives (all agents think independently)
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];

      console.log(`[GPT4O] Round 1 - Agent ${agentId} analyzing...`);

      // Generate response
      const response = await generateAgentResponse(agentId, taskDescription);

      // Save message
      await db.insert(collaborationMessages).values({
        collaborationId,
        agentId,
        agentName: getAgentName(agentId),
        content: response.content,
        type: 'thought',
        llmModel: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
        confidence: response.confidence,
      });

      previousMessages.push({
        agentName: getAgentName(agentId),
        content: response.content
      });

      // Small delay between agents
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Round 2: Follow-up insights (agents build on each other)
    for (let i = 0; i < Math.min(agentIds.length, 2); i++) {
      const agentId = agentIds[i];

      console.log(`[GPT4O] Round 2 - Agent ${agentId} following up...`);

      // Generate follow-up
      const response = await generateFollowUpMessage(
        agentId,
        taskDescription,
        previousMessages
      );

      // Save message
      await db.insert(collaborationMessages).values({
        collaborationId,
        agentId,
        agentName: getAgentName(agentId),
        content: response.content,
        type: 'insight',
        llmModel: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
        confidence: response.confidence,
      });

      previousMessages.push({
        agentName: getAgentName(agentId),
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

    console.log('[GPT4O_ORCHESTRATION] Completed:', collaborationId);

  } catch (error) {
    console.error('[GPT4O_ORCHESTRATION_ERROR]', error);

    // Mark as failed
    await db
      .update(collaborations)
      .set({ status: 'failed' })
      .where(eq(collaborations.id, collaborationId));
  }
}

// ========================================
// DOCUMENT GENERATION & DELIVERABLES
// ========================================

/**
 * POST /api/collaborations/:id/generate-document
 *
 * Generate downloadable business document from collaboration
 */
router.post('/:id/generate-document', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body; // 'business-plan', 'marketing-strategy', 'technical-doc'
    const userId = getUserId(req);

    const db = getDb();

    // Get collaboration
    const [collaboration] = await db
      .select()
      .from(collaborations)
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    if (!collaboration) {
      return res.status(404).json({ success: false, error: 'Collaboration not found' });
    }

    // Get all messages
    const messages = await db
      .select()
      .from(collaborationMessages)
      .where(eq(collaborationMessages.collaborationId, id))
      .orderBy(collaborationMessages.createdAt);

    const agentMessages = messages
      .filter(m => m.agentId !== 'user')
      .map(m => ({
        agentName: m.agentName || m.agentId,
        content: m.content
      }));

    // Generate document based on type
    let pdfBuffer: Buffer;
    let filename: string;

    switch (documentType) {
      case 'business-plan':
        pdfBuffer = await generateBusinessPlan(
          collaboration.taskDescription,
          agentMessages,
          id
        );
        filename = `business-plan-${id}.pdf`;
        break;

      case 'marketing-strategy':
        pdfBuffer = await generateMarketingStrategy(
          collaboration.taskDescription,
          agentMessages,
          id
        );
        filename = `marketing-strategy-${id}.pdf`;
        break;

      case 'technical-doc':
        pdfBuffer = await generateTechnicalDoc(
          collaboration.taskDescription,
          agentMessages,
          id
        );
        filename = `technical-doc-${id}.pdf`;
        break;

      default:
        // Generic document
        pdfBuffer = await generateBusinessPlan(
          collaboration.taskDescription,
          agentMessages,
          id
        );
        filename = `collaboration-report-${id}.pdf`;
    }

    // Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    console.log(`[DOCUMENT_GENERATION] Generated ${documentType} for collaboration ${id}`);
  } catch (error) {
    console.error('[DOCUMENT_GENERATION]', error);
    res.status(500).json({ success: false, error: 'Failed to generate document' });
  }
});

/**
 * GET /api/collaborations/:id/deliverables
 *
 * Get available deliverables/outputs from collaboration
 */
router.get('/:id/deliverables', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    // Get collaboration
    const [collaboration] = await db
      .select()
      .from(collaborations)
      .where(and(
        eq(collaborations.id, id),
        eq(collaborations.userId, userId)
      ));

    if (!collaboration) {
      return res.status(404).json({ success: false, error: 'Collaboration not found' });
    }

    // Get involved agents to determine available deliverables
    const agents = await db
      .select()
      .from(collaborationAgents)
      .where(eq(collaborationAgents.collaborationId, id));

    const agentIds = agents.map(a => a.agentId);

    // Determine available document types based on agents
    const availableDocuments = [];

    if (agentIds.includes('emmie') || agentIds.includes('finn')) {
      availableDocuments.push({
        type: 'business-plan',
        title: 'Business Plan',
        description: 'Comprehensive business plan with financials and strategy',
        icon: 'FileText'
      });
    }

    if (agentIds.includes('emmie') || agentIds.includes('dexter')) {
      availableDocuments.push({
        type: 'marketing-strategy',
        title: 'Marketing Strategy',
        description: 'Complete marketing strategy with audience analysis',
        icon: 'TrendingUp'
      });
    }

    if (agentIds.includes('kai')) {
      availableDocuments.push({
        type: 'technical-doc',
        title: 'Technical Documentation',
        description: 'Detailed technical documentation and architecture',
        icon: 'Code'
      });
    }

    // Always available: Generic report
    availableDocuments.push({
      type: 'generic-report',
      title: 'Collaboration Report',
      description: 'Complete report of all agent contributions',
      icon: 'FileText'
    });

    res.json({
      success: true,
      deliverables: {
        documents: availableDocuments,
        status: collaboration.status,
        completedAt: collaboration.completedAt
      }
    });
  } catch (error) {
    console.error('[DELIVERABLES]', error);
    res.status(500).json({ success: false, error: 'Failed to get deliverables' });
  }
});

export default router;
