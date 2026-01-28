/**
 * SINGLE NODE EXECUTION API
 *
 * Execute a single node within a workflow.
 * Uses the last known output from parent nodes as input.
 * Updates the Flight Recorder with the execution result.
 *
 * Part of Phase 19: Side-by-Side Node Inspector & Single Node Execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { executionSteps, workflowRuns } from '@/lib/db/schema-flight-recorder';
import { eq, desc, and } from 'drizzle-orm';
import { workflowExecutionEngine } from '@/server/services/WorkflowExecutionEngine';
import { createLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { io as socketIOClient } from 'socket.io-client';

const logger = createLogger('execute-node-api');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExecuteNodeRequest {
  workflowId: string;
  nodeId: string;
  mockInput?: Record<string, unknown>;
}

/**
 * POST /api/workflow/execute-node
 *
 * Execute a single node in isolation.
 *
 * Body:
 *   - workflowId: The ID of the workflow containing the node
 *   - nodeId: The ID of the node to execute
 *   - mockInput: Optional mock input data (if not provided, uses parent node output from DB)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body: ExecuteNodeRequest = await req.json();
    const { workflowId, nodeId, mockInput } = body;

    if (!workflowId || !nodeId) {
      return NextResponse.json(
        { error: 'workflowId and nodeId are required' },
        { status: 400 }
      );
    }

    logger.info('Single node execution requested', { workflowId, nodeId, userId });

    const db = getDb();

    // Fetch workflow from database
    const result = await db.execute(
      `SELECT id, name, status, nodes, edges, user_id as "userId"
       FROM workflows
       WHERE id = '${workflowId}'`
    );

    const workflowRows = result.rows || result;
    const workflow = Array.isArray(workflowRows) ? workflowRows[0] : workflowRows;

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Find the target node
    const nodes = workflow.nodes as any[];
    const edges = workflow.edges as any[];
    const targetNode = nodes.find((n: any) => n.id === nodeId);

    if (!targetNode) {
      return NextResponse.json(
        { error: `Node ${nodeId} not found in workflow` },
        { status: 404 }
      );
    }

    // Find parent nodes (nodes that connect TO this node)
    const parentEdges = edges.filter((e: any) => e.target === nodeId);
    const parentNodeIds = parentEdges.map((e: any) => e.source);

    // Get the last known output from parent nodes (from Flight Recorder)
    let parentOutputs: Record<string, unknown> = {};

    if (parentNodeIds.length > 0 && !mockInput) {
      try {
        // Find the most recent execution for this workflow
        const recentRuns = await db
          .select()
          .from(workflowRuns)
          .where(eq(workflowRuns.workflowId, workflowId))
          .orderBy(desc(workflowRuns.createdAt))
          .limit(1);

        if (recentRuns.length > 0) {
          const lastRunId = recentRuns[0].id;

          // Get outputs from parent nodes in the last run
          for (const parentId of parentNodeIds) {
            const parentSteps = await db
              .select()
              .from(executionSteps)
              .where(
                and(
                  eq(executionSteps.runId, lastRunId),
                  eq(executionSteps.nodeId, parentId),
                  eq(executionSteps.status, 'success')
                )
              )
              .orderBy(desc(executionSteps.createdAt))
              .limit(1);

            if (parentSteps.length > 0 && parentSteps[0].output) {
              parentOutputs[parentId] = parentSteps[0].output;
            }
          }
        }
      } catch (dbError) {
        logger.warn('Could not fetch parent outputs from DB', { error: dbError });
      }
    }

    // Use mock input if provided, otherwise use parent outputs
    const inputData = mockInput || parentOutputs;

    logger.info('Executing single node', {
      nodeId,
      nodeType: targetNode.data?.type,
      nodeLabel: targetNode.data?.label,
      hasParentOutputs: Object.keys(parentOutputs).length > 0,
      usingMockInput: !!mockInput,
    });

    // Create a unique execution ID for this single-node run
    const executionId = `single-node-${uuidv4()}`;

    // Execute the single node using the workflow engine
    let output: unknown = null;
    let error: string | null = null;
    let tokensUsed = { prompt: 0, completion: 0, total: 0 };
    let cost = 0;
    let model: string | undefined;

    try {
      // For agent nodes, use the AI service
      if (targetNode.data?.type === 'agent') {
        const agentResult = await executeAgentNode(targetNode, inputData);
        output = agentResult.output;
        tokensUsed = agentResult.tokensUsed || tokensUsed;
        cost = agentResult.cost || 0;
        model = agentResult.model;
      } else {
        // For other node types, simulate execution
        output = await executeGenericNode(targetNode, inputData);
      }
    } catch (execError: any) {
      error = execError.message;
      logger.error('Single node execution failed', { error: execError.message });
    }

    const duration = Date.now() - startTime;

    // Store the execution step in Flight Recorder
    try {
      await db.insert(executionSteps).values({
        id: uuidv4(),
        runId: executionId,
        nodeId,
        nodeType: targetNode.data?.type || 'unknown',
        nodeName: targetNode.data?.label || nodeId,
        stepNumber: 1,
        status: error ? 'failure' : 'success',
        inputsRaw: inputData,
        inputsResolved: inputData,
        output,
        errorMessage: error,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: duration,
        tokensPrompt: tokensUsed.prompt,
        tokensCompletion: tokensUsed.completion,
        tokensTotal: tokensUsed.total,
        costUsd: cost.toString(),
        model,
        createdAt: new Date().toISOString(),
      });
    } catch (dbError) {
      logger.warn('Could not store execution step in Flight Recorder', { error: dbError });
    }

    // Emit socket event for real-time update
    try {
      emitNodeExecutionResult(workflowId, nodeId, {
        status: error ? 'error' : 'success',
        output,
        error,
        duration,
        tokensUsed,
        cost,
        model,
      });
    } catch (socketError) {
      logger.warn('Could not emit socket event', { error: socketError });
    }

    logger.info('Single node execution completed', {
      nodeId,
      status: error ? 'error' : 'success',
      duration,
    });

    return NextResponse.json({
      success: !error,
      data: {
        nodeId,
        status: error ? 'error' : 'success',
        output,
        error,
        duration,
        tokensUsed,
        cost,
        model,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    logger.error('Single node execution error', { error: error.message, stack: error.stack });

    return NextResponse.json(
      {
        success: false,
        error: 'Single node execution failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Execute an agent node using the AI service
 */
async function executeAgentNode(
  node: any,
  inputData: Record<string, unknown>
): Promise<{
  output: unknown;
  tokensUsed?: { prompt: number; completion: number; total: number };
  cost?: number;
  model?: string;
}> {
  const config = node.data?.config || {};
  const agentId = config.agentId || node.id.split('-')[0];
  const userPrompt = config.userPrompt || '{{input}}';
  const model = config.model || 'gpt-4-turbo-preview';

  // Build the prompt with input data
  let resolvedPrompt = userPrompt;
  if (typeof inputData === 'object') {
    resolvedPrompt = resolvedPrompt.replace(/\{\{input\}\}/g, JSON.stringify(inputData, null, 2));
    // Also replace specific field references
    for (const [key, value] of Object.entries(inputData)) {
      resolvedPrompt = resolvedPrompt.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    }
  }

  // Import and use OpenAI service
  try {
    const { generateAgentResponse } = await import('@/lib/ai/openai-service');
    const { getAgentById } = await import('@/lib/agents/personas');

    const agent = getAgentById(agentId);

    if (!agent) {
      return {
        output: { error: `Agent ${agentId} not found`, agentId },
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
        model,
      };
    }

    const response = await generateAgentResponse(agent, resolvedPrompt, []);

    // Calculate estimated cost
    const estimatedCost = calculateCost(response.tokensUsed, model);

    return {
      output: {
        response: response.content,
        agentId,
        agentName: agent.name,
        model: response.model,
        tokensUsed: {
          total: response.tokensUsed,
          prompt: Math.floor(response.tokensUsed * 0.6),
          completion: Math.floor(response.tokensUsed * 0.4),
        },
        cost: estimatedCost,
        timestamp: new Date().toISOString(),
      },
      tokensUsed: {
        total: response.tokensUsed,
        prompt: Math.floor(response.tokensUsed * 0.6),
        completion: Math.floor(response.tokensUsed * 0.4),
      },
      cost: estimatedCost,
      model: response.model,
    };
  } catch (error: any) {
    logger.error('Agent execution failed', { error: error.message, agentId });
    throw new Error(`Agent execution failed: ${error.message}`);
  }
}

/**
 * Execute a generic (non-agent) node
 */
async function executeGenericNode(
  node: any,
  inputData: Record<string, unknown>
): Promise<unknown> {
  const nodeType = node.data?.type;
  const config = node.data?.config || {};

  switch (nodeType) {
    case 'trigger':
      // Trigger nodes just pass through the input
      return {
        type: 'trigger',
        data: inputData,
        timestamp: new Date().toISOString(),
      };

    case 'condition':
      // Evaluate condition
      const field = config.field as string;
      const operator = config.operator as string;
      const value = config.value;

      let conditionResult = false;
      const fieldValue = getNestedValue(inputData, field);

      switch (operator) {
        case 'equals':
          conditionResult = fieldValue === value;
          break;
        case 'notEquals':
          conditionResult = fieldValue !== value;
          break;
        case 'contains':
          conditionResult = String(fieldValue).includes(String(value));
          break;
        case 'greaterThan':
          conditionResult = Number(fieldValue) > Number(value);
          break;
        case 'lessThan':
          conditionResult = Number(fieldValue) < Number(value);
          break;
        case 'exists':
          conditionResult = fieldValue !== undefined && fieldValue !== null;
          break;
        case 'isEmpty':
          conditionResult = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
          break;
        default:
          conditionResult = Boolean(fieldValue);
      }

      return {
        type: 'condition',
        field,
        operator,
        value,
        fieldValue,
        result: conditionResult,
        branch: conditionResult ? 'true' : 'false',
        timestamp: new Date().toISOString(),
      };

    case 'action':
      // Simulate action execution
      return {
        type: 'action',
        action: config.actionType || 'unknown',
        status: 'simulated',
        input: inputData,
        config,
        message: 'Action simulated in single-node mode',
        timestamp: new Date().toISOString(),
      };

    case 'output':
      // Format output according to template
      const template = config.template || '{{result}}';
      let formattedOutput = template;

      if (typeof inputData === 'object') {
        formattedOutput = formattedOutput.replace(
          /\{\{result\}\}/g,
          JSON.stringify(inputData, null, 2)
        );
      }

      return {
        type: 'output',
        formatted: formattedOutput,
        raw: inputData,
        timestamp: new Date().toISOString(),
      };

    default:
      return {
        type: nodeType || 'unknown',
        data: inputData,
        message: 'Node executed in single-node mode',
        timestamp: new Date().toISOString(),
      };
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as any)[key] : undefined;
  }, obj);
}

/**
 * Calculate estimated cost based on tokens and model
 */
function calculateCost(tokens: number, model: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const rate = rates[model] || rates['gpt-4-turbo-preview'];
  const inputTokens = Math.floor(tokens * 0.6);
  const outputTokens = Math.floor(tokens * 0.4);

  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
}

/**
 * Emit socket event for real-time node execution update
 */
function emitNodeExecutionResult(
  workflowId: string,
  nodeId: string,
  result: {
    status: string;
    output: unknown;
    error: string | null;
    duration: number;
    tokensUsed: { prompt: number; completion: number; total: number };
    cost: number;
    model?: string;
  }
) {
  // Get socket server URL from environment
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  try {
    // Emit via internal event system instead of client connection
    // The server-side socket handling should pick this up
    if (typeof globalThis !== 'undefined' && (globalThis as any).__socketIO) {
      const io = (globalThis as any).__socketIO;
      io.to(`workflow:${workflowId}`).emit('node:finish', {
        nodeId,
        status: result.status,
        output: result.output,
        error: result.error,
        duration: result.duration,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        model: result.model,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.debug('Socket emit skipped (no server instance)', { error });
  }
}
