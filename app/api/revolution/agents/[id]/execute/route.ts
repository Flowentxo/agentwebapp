/**
 * REVOLUTION API - AGENT EXECUTION
 *
 * POST /api/revolution/agents/[id]/execute
 * Executes an agent with given input (queued via BullMQ)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { agentExecutions } from '@/lib/db/schema-revolution';
import { canExecuteAgent, incrementExecutionCount } from '@/lib/services/subscription-service';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Initialize BullMQ queue for agent executions
let agentExecutionQueue: Queue | null = null;

function getExecutionQueue() {
  if (!agentExecutionQueue) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisConfig = {
      connection: {
        host: redisUrl.includes('localhost') ? 'localhost' : redisUrl.split('@')[1]?.split(':')[0],
        port: parseInt(redisUrl.split(':').pop() || '6379'),
      },
    };

    agentExecutionQueue = new Queue('agent-executions', redisConfig);
    console.log('[AGENT_EXECUTION_QUEUE] Initialized');
  }
  return agentExecutionQueue;
}

// Validation schema
const executeAgentSchema = z.object({
  input: z.any(), // Can be string, object, array, etc.
  metadata: z.record(z.any()).optional(),
  priority: z.number().min(1).max(10).default(5), // 1 = highest, 10 = lowest
});

/**
 * POST /api/revolution/agents/[id]/execute
 *
 * Queue an agent execution
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body = await req.json();

    // Validate input
    const validation = executeAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { input, metadata, priority } = validation.data;

    // Check subscription limits
    const canExecute = await canExecuteAgent(userId);
    if (!canExecute.allowed) {
      return NextResponse.json(
        {
          error: 'Execution limit reached',
          message: canExecute.reason,
        },
        { status: 403 }
      );
    }

    // Check if agent exists and user has access
    const db = getDb();
    const [agent] = await db
      .select()
      .from(customAgents)
      .where(
        and(
          eq(customAgents.id, agentId),
          eq(customAgents.createdBy, userId)
        )
      )
      .limit(1);

    if (!agent) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: 'Agent does not exist or you do not have access',
        },
        { status: 404 }
      );
    }

    // Check agent status
    if (agent.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Agent not active',
          message: `Agent status is ${agent.status}. Only active agents can be executed.`,
        },
        { status: 400 }
      );
    }

    // Create execution record
    const executionId = randomUUID();
    const jobId = `execution-${executionId}`;

    const [execution] = await db
      .insert(agentExecutions)
      .values({
        id: executionId,
        agentId,
        userId,
        jobId,
        status: 'pending',
        input,
        metadata: {
          ...metadata,
          triggeredBy: 'manual',
          agentName: agent.name,
        },
      })
      .returning();

    console.log(`[AGENT_EXECUTION] Created execution: ${executionId}`);

    // Queue the job
    try {
      const queue = getExecutionQueue();

      await queue.add(
        'execute-agent',
        {
          executionId,
          agentId,
          userId,
          agentConfig: {
            name: agent.name,
            systemInstructions: agent.systemInstructions,
            model: agent.model,
            temperature: parseFloat(agent.temperature || '0.7'),
            maxTokens: parseInt(agent.maxTokens || '4000'),
          },
          input,
          metadata,
        },
        {
          jobId,
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 500, // Keep last 500 failed jobs
        }
      );

      // Increment execution count
      await incrementExecutionCount(userId);

      console.log(`[AGENT_EXECUTION] Job queued: ${jobId}`);

      return NextResponse.json({
        success: true,
        execution: {
          id: execution.id,
          agentId: execution.agentId,
          status: execution.status,
          jobId: execution.jobId,
          createdAt: execution.createdAt,
        },
        message: 'Agent execution queued successfully',
      });
    } catch (queueError: any) {
      console.error('[AGENT_EXECUTION] Queue error:', queueError);

      // Update execution status to failed
      await db
        .update(agentExecutions)
        .set({
          status: 'failed',
          error: `Queue error: ${queueError.message}`,
          updatedAt: new Date(),
        })
        .where(eq(agentExecutions.id, executionId));

      return NextResponse.json(
        {
          error: 'Failed to queue execution',
          message: queueError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[AGENT_EXECUTION] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revolution/agents/[id]/execute?executionId=xxx
 *
 * Get execution status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('executionId');
    const userId = req.headers.get('x-user-id') || 'demo-user';

    if (!executionId) {
      return NextResponse.json(
        {
          error: 'Missing executionId',
          message: 'Please provide executionId as query parameter',
        },
        { status: 400 }
      );
    }

    const db = getDb();

    const [execution] = await db
      .select()
      .from(agentExecutions)
      .where(
        and(
          eq(agentExecutions.id, executionId),
          eq(agentExecutions.userId, userId)
        )
      )
      .limit(1);

    if (!execution) {
      return NextResponse.json(
        {
          error: 'Execution not found',
          message: 'Execution does not exist or you do not have access',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: {
        id: execution.id,
        agentId: execution.agentId,
        status: execution.status,
        input: execution.input,
        output: execution.output,
        error: execution.error,
        retryCount: execution.retryCount,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        executionTimeMs: execution.executionTimeMs,
        tokensUsed: execution.tokensUsed,
        cost: execution.cost,
        metadata: execution.metadata,
        createdAt: execution.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[AGENT_EXECUTION_STATUS] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch execution status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
