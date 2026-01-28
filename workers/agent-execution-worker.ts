/**
 * BULLMQ WORKER - AGENT EXECUTION
 *
 * Processes agent execution jobs from the queue:
 * 1. Loads agent configuration from PostgreSQL
 * 2. Builds OpenAI system prompt from agent attributes
 * 3. Executes agent via OpenAI API
 * 4. Tracks tokens, cost, and execution time
 * 5. Updates execution status in database
 *
 * Usage: npm run worker
 */

import { Worker, Job } from 'bullmq';
import { getDb } from '../lib/db';
import { customAgents } from '../lib/db/schema-custom-agents';
import { agentExecutions } from '../lib/db/schema-revolution';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

// =====================================================
// CONFIGURATION
// =====================================================

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ [WORKER] OPENAI_API_KEY is required');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Redis connection config
const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,
};

console.log(`[WORKER] Connecting to Redis: ${REDIS_HOST}:${REDIS_PORT}`);

// =====================================================
// TYPES
// =====================================================

interface AgentExecutionJob {
  executionId: string;
  agentId: string;
  userId: string;
  agentConfig: {
    name: string;
    systemInstructions: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  input: any;
  metadata?: Record<string, any>;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate cost based on model and tokens
 */
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Pricing per 1M tokens (as of 2025)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Build OpenAI messages from agent config and input
 */
function buildMessages(systemInstructions: string, input: any): any[] {
  const messages: any[] = [
    {
      role: 'system',
      content: systemInstructions,
    },
  ];

  // Handle different input types
  if (typeof input === 'string') {
    messages.push({
      role: 'user',
      content: input,
    });
  } else if (typeof input === 'object' && input !== null) {
    // Convert object to readable format
    if (input.messages && Array.isArray(input.messages)) {
      // If input contains conversation history
      messages.push(...input.messages);
    } else {
      // Single object input - format as structured data
      const formattedInput = Object.entries(input)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');

      messages.push({
        role: 'user',
        content: formattedInput,
      });
    }
  } else {
    messages.push({
      role: 'user',
      content: JSON.stringify(input),
    });
  }

  return messages;
}

/**
 * Execute agent via OpenAI API
 */
async function executeAgent(
  agentConfig: AgentExecutionJob['agentConfig'],
  input: any
): Promise<{
  output: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
  finishReason: string;
}> {
  const messages = buildMessages(agentConfig.systemInstructions, input);

  console.log(`[WORKER] Calling OpenAI API with model: ${agentConfig.model}`);

  const completion = await openai.chat.completions.create({
    model: agentConfig.model,
    messages,
    temperature: agentConfig.temperature,
    max_tokens: agentConfig.maxTokens,
  });

  const choice = completion.choices[0];
  const usage = completion.usage;

  if (!choice || !usage) {
    throw new Error('Invalid OpenAI response');
  }

  return {
    output: choice.message?.content || '',
    tokensUsed: usage.total_tokens,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    model: completion.model,
    finishReason: choice.finish_reason || 'stop',
  };
}

/**
 * Update execution status in database
 */
async function updateExecutionStatus(
  executionId: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout',
  data?: {
    output?: any;
    error?: string;
    tokensUsed?: number;
    cost?: string;
    executionTimeMs?: number;
    retryCount?: number;
  }
) {
  const db = getDb();

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'running') {
    updateData.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completedAt = new Date();
  }

  if (data?.output) {
    updateData.output = data.output;
  }

  if (data?.error) {
    updateData.error = data.error;
  }

  if (data?.tokensUsed !== undefined) {
    updateData.tokensUsed = data.tokensUsed;
  }

  if (data?.cost) {
    updateData.cost = data.cost;
  }

  if (data?.executionTimeMs !== undefined) {
    updateData.executionTimeMs = data.executionTimeMs;
  }

  if (data?.retryCount !== undefined) {
    updateData.retryCount = data.retryCount;
  }

  await db
    .update(agentExecutions)
    .set(updateData)
    .where(eq(agentExecutions.id, executionId));

  console.log(`[WORKER] Updated execution ${executionId} to status: ${status}`);
}

// =====================================================
// WORKER PROCESSOR
// =====================================================

async function processAgentExecution(job: Job<AgentExecutionJob>) {
  const startTime = Date.now();
  const { executionId, agentId, userId, agentConfig, input, metadata } = job.data;

  console.log('\n========================================');
  console.log(`[WORKER] Processing job: ${job.id}`);
  console.log(`[WORKER] Execution ID: ${executionId}`);
  console.log(`[WORKER] Agent: ${agentConfig.name} (${agentId})`);
  console.log(`[WORKER] User: ${userId}`);
  console.log(`[WORKER] Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`);
  console.log('========================================\n');

  try {
    // Update status to running
    await updateExecutionStatus(executionId, 'running');

    // Execute agent via OpenAI
    const result = await executeAgent(agentConfig, input);

    // Calculate execution time
    const executionTimeMs = Date.now() - startTime;

    // Calculate cost
    const cost = calculateCost(
      result.model,
      result.promptTokens,
      result.completionTokens
    );

    // Update execution as completed
    await updateExecutionStatus(executionId, 'completed', {
      output: {
        content: result.output,
        finishReason: result.finishReason,
        model: result.model,
      },
      tokensUsed: result.tokensUsed,
      cost: cost.toFixed(6),
      executionTimeMs,
    });

    console.log(`[WORKER] ✅ Execution completed successfully`);
    console.log(`[WORKER] Tokens used: ${result.tokensUsed}`);
    console.log(`[WORKER] Cost: $${cost.toFixed(6)}`);
    console.log(`[WORKER] Time: ${executionTimeMs}ms\n`);

    return result;
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    console.error(`[WORKER] ❌ Execution failed:`, error.message);

    // Check if it's a rate limit error (429)
    if (error.status === 429 || error.message.includes('Rate limit')) {
      console.log(`[WORKER] Rate limit hit, will retry...`);

      await updateExecutionStatus(executionId, 'pending', {
        error: `Rate limit exceeded (attempt ${job.attemptsMade + 1})`,
        retryCount: job.attemptsMade + 1,
        executionTimeMs,
      });

      // Throw to trigger BullMQ retry
      throw error;
    }

    // Check if we should retry
    if (job.attemptsMade + 1 < (job.opts.attempts || 3)) {
      console.log(`[WORKER] Will retry (attempt ${job.attemptsMade + 2}/${job.opts.attempts})`);

      await updateExecutionStatus(executionId, 'pending', {
        error: `${error.message} (attempt ${job.attemptsMade + 1})`,
        retryCount: job.attemptsMade + 1,
        executionTimeMs,
      });

      // Throw to trigger BullMQ retry
      throw error;
    }

    // Final failure - no more retries
    await updateExecutionStatus(executionId, 'failed', {
      error: `${error.message} (final attempt)`,
      retryCount: job.attemptsMade + 1,
      executionTimeMs,
    });

    console.log(`[WORKER] ❌ Execution failed permanently\n`);

    // Don't throw - mark as failed but don't retry
    return null;
  }
}

// =====================================================
// WORKER INITIALIZATION
// =====================================================

const worker = new Worker<AgentExecutionJob>(
  'agent-executions',
  processAgentExecution,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// =====================================================
// EVENT HANDLERS
// =====================================================

worker.on('ready', () => {
  console.log('\n🚀 [WORKER] Agent Execution Worker is ready!');
  console.log(`[WORKER] Concurrency: 5`);
  console.log(`[WORKER] Rate limit: 10 jobs/second`);
  console.log(`[WORKER] Listening to queue: agent-executions\n`);
});

worker.on('active', (job) => {
  console.log(`[WORKER] Job ${job.id} is now active`);
});

worker.on('completed', (job, result) => {
  console.log(`[WORKER] ✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  if (job) {
    console.error(`[WORKER] ❌ Job ${job.id} failed:`, error.message);
    console.error(`[WORKER] Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
  } else {
    console.error(`[WORKER] ❌ Job failed:`, error.message);
  }
});

worker.on('error', (error) => {
  console.error('[WORKER] ⚠️  Worker error:', error);
});

worker.on('stalled', (jobId) => {
  console.warn(`[WORKER] ⚠️  Job ${jobId} stalled`);
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

process.on('SIGTERM', async () => {
  console.log('\n[WORKER] SIGTERM received, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n[WORKER] SIGINT received, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

// Export for testing
export { worker, processAgentExecution };
