/**
 * Workflow Execution Engine
 *
 * Orchestrates the execution of workflow pipelines.
 * Traverses the node graph, executes nodes in order, and passes context between them.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import {
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  ExecutionResult,
  NodeOutput,
} from './types';
import { nodeRegistry } from './NodeRegistry';
import { resolveVariables } from './VariableResolver';
import {
  emitPipelineExecutionStart,
  emitPipelineNodeStart,
  emitPipelineNodeFinish,
  emitPipelineNodeError,
  emitPipelineExecutionFinish,
} from '@/server/socket';

/**
 * WorkflowEngine class
 *
 * Main orchestrator for workflow execution
 */
export class WorkflowEngine {
  /**
   * Run a workflow by ID
   */
  async run(workflowId: string, triggerData?: unknown): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const startedAt = new Date();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Engine] Starting workflow execution`);
    console.log(`[Engine] Workflow ID: ${workflowId}`);
    console.log(`[Engine] Execution ID: ${executionId}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Fetch workflow from database
      const db = getDb();
      const [workflow] = await db
        .select({
          id: workflows.id,
          name: workflows.name,
          nodes: workflows.nodes,
          edges: workflows.edges,
        })
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const nodeCount = workflow.nodes?.length || 0;
      console.log(`[Engine] Loaded workflow: ${workflow.name}`);
      console.log(`[Engine] Nodes: ${nodeCount}, Edges: ${workflow.edges?.length || 0}`);

      // Emit execution start via Socket.IO
      emitPipelineExecutionStart({
        executionId,
        workflowId,
        totalNodes: nodeCount,
      });

      // Create execution context
      const context: ExecutionContext = {
        workflowId,
        executionId,
        startedAt,
        variables: {},
        nodeOutputs: {},
        triggerData,
      };

      // Execute the graph
      const nodeResults = await this.executeGraph(
        workflow.nodes as WorkflowNode[],
        workflow.edges as WorkflowEdge[],
        context
      );

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      // Determine final output (from last executed node)
      const outputNodes = (workflow.nodes as WorkflowNode[]).filter(
        (n) => n.data.type === 'output' || n.data.type === 'end'
      );
      const finalOutput = outputNodes.length > 0
        ? nodeResults[outputNodes[0].id]?.data
        : Object.values(nodeResults).pop()?.data;

      // Check if any node failed
      const hasFailure = Object.values(nodeResults).some((r) => !r.success);

      const result: ExecutionResult = {
        executionId,
        workflowId,
        status: hasFailure ? 'partial' : 'success',
        startedAt,
        completedAt,
        duration,
        nodeResults,
        finalOutput,
      };

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Engine] Execution completed`);
      console.log(`[Engine] Status: ${result.status}`);
      console.log(`[Engine] Duration: ${duration}ms`);
      console.log(`${'='.repeat(60)}\n`);

      // Emit execution finish via Socket.IO
      emitPipelineExecutionFinish({
        executionId,
        workflowId,
        status: result.status,
        duration,
        nodeCount: Object.keys(nodeResults).length,
      });

      return result;
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`\n${'='.repeat(60)}`);
      console.error(`[Engine] Execution failed: ${errorMessage}`);
      console.error(`${'='.repeat(60)}\n`);

      // Emit execution finish with failed status
      emitPipelineExecutionFinish({
        executionId,
        workflowId,
        status: 'failed',
        duration: completedAt.getTime() - startedAt.getTime(),
        nodeCount: 0,
      });

      return {
        executionId,
        workflowId,
        status: 'failed',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        nodeResults: {},
        error: errorMessage,
      };
    }
  }

  /**
   * Execute a graph of nodes
   * Uses topological sort to determine execution order
   */
  async executeGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: ExecutionContext
  ): Promise<Record<string, NodeOutput>> {
    if (!nodes || nodes.length === 0) {
      console.log('[Engine] No nodes to execute');
      return {};
    }

    // Build adjacency list and in-degree map for topological sort
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, WorkflowNode>();

    // Initialize
    for (const node of nodes) {
      nodeMap.set(node.id, node);
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // Build graph from edges
    for (const edge of edges) {
      const targets = adjacencyList.get(edge.source) || [];
      targets.push(edge.target);
      adjacencyList.set(edge.source, targets);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Find trigger nodes (nodes with no incoming edges) as starting points
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    console.log(`[Engine] Trigger nodes: ${queue.join(', ')}`);

    // Track which nodes have been executed
    const results: Record<string, NodeOutput> = {};
    const executed = new Set<string>();

    // BFS traversal with topological ordering
    while (queue.length > 0) {
      // Get next node to execute
      const nodeId = queue.shift()!;

      if (executed.has(nodeId)) {
        continue;
      }

      const node = nodeMap.get(nodeId);
      if (!node) {
        console.warn(`[Engine] Node not found: ${nodeId}`);
        continue;
      }

      // Gather inputs from predecessor nodes
      const inputs = this.gatherInputs(nodeId, edges, context.nodeOutputs);

      console.log(`\n[Engine] Executing Node: ${node.id}`);
      console.log(`[Engine] Type: ${node.data.type} | Label: ${node.data.label}`);

      // Resolve variables in node configuration
      // This replaces {{nodeId.path}} placeholders with actual values from previous nodes
      const resolvedConfig = node.data.config
        ? resolveVariables(node.data.config, context)
        : {};

      // Create a copy of the node with resolved configuration
      const resolvedNode: WorkflowNode = {
        ...node,
        data: {
          ...node.data,
          config: resolvedConfig,
        },
      };

      console.log(`[Engine] Resolved config:`, JSON.stringify(resolvedConfig, null, 2));

      // Emit node started event via Socket.IO
      emitPipelineNodeStart({
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId: node.id,
        nodeLabel: node.data.label,
        nodeType: node.data.type,
      });

      // Get executor and run with resolved node
      const executor = nodeRegistry.getExecutorForNode(resolvedNode);
      const startTime = Date.now();
      const output = await executor(resolvedNode, context, inputs);
      const duration = Date.now() - startTime;

      // Store result
      results[nodeId] = output;
      context.nodeOutputs[nodeId] = output;
      executed.add(nodeId);

      // Emit node finished event via Socket.IO
      if (output.success) {
        emitPipelineNodeFinish({
          executionId: context.executionId,
          workflowId: context.workflowId,
          nodeId: node.id,
          success: true,
          output: output.data,
          duration,
        });
      } else {
        emitPipelineNodeError({
          executionId: context.executionId,
          workflowId: context.workflowId,
          nodeId: node.id,
          error: output.error || 'Unknown error',
        });
        emitPipelineNodeFinish({
          executionId: context.executionId,
          workflowId: context.workflowId,
          nodeId: node.id,
          success: false,
          duration,
        });
      }

      // If node failed, decide whether to continue
      // For now, we continue execution but log the failure
      if (!output.success) {
        console.warn(`[Engine] Node ${nodeId} failed, continuing execution...`);
      }

      // Add successor nodes to queue if all their dependencies are met
      const successors = adjacencyList.get(nodeId) || [];
      for (const successorId of successors) {
        const currentDegree = inDegree.get(successorId) || 0;
        inDegree.set(successorId, currentDegree - 1);

        // Check if all predecessors have been executed
        if (inDegree.get(successorId) === 0) {
          queue.push(successorId);
        }
      }
    }

    // Check for nodes that weren't executed (cycle detection)
    const unexecuted = nodes.filter((n) => !executed.has(n.id));
    if (unexecuted.length > 0) {
      console.warn(`[Engine] Warning: ${unexecuted.length} nodes were not executed (possible cycle)`);
      console.warn(`[Engine] Unexecuted: ${unexecuted.map((n) => n.id).join(', ')}`);
    }

    return results;
  }

  /**
   * Gather inputs from predecessor nodes
   */
  private gatherInputs(
    nodeId: string,
    edges: WorkflowEdge[],
    nodeOutputs: Record<string, NodeOutput>
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    // Find all edges pointing to this node
    const incomingEdges = edges.filter((e) => e.target === nodeId);

    for (const edge of incomingEdges) {
      const sourceOutput = nodeOutputs[edge.source];
      if (sourceOutput && sourceOutput.success) {
        // Use source node ID as key, or handle name if available
        inputs[edge.source] = sourceOutput.data;
      }
    }

    return inputs;
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
