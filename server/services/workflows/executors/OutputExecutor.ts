/**
 * Output Node Executor
 *
 * Handles output/terminal nodes - collects and formats final workflow output
 */

import { WorkflowNode, ExecutionContext, NodeOutput } from '../types';

export async function executeOutputNode(
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const startTime = Date.now();

  console.log(`[OutputExecutor] Executing node: ${node.id}`);
  console.log(`[OutputExecutor] Collecting final output from inputs:`, inputs);

  try {
    const config = node.data.config || {};
    const outputFormat = (config.format as string) || 'json';

    // Collect all inputs into final output
    let formattedOutput: unknown;

    switch (outputFormat) {
      case 'json':
        formattedOutput = inputs;
        break;
      case 'text':
        formattedOutput = Object.entries(inputs)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        break;
      case 'summary':
        formattedOutput = {
          nodeCount: Object.keys(context.nodeOutputs).length,
          executionTime: Date.now() - context.startedAt.getTime(),
          lastInputs: inputs,
        };
        break;
      default:
        formattedOutput = inputs;
    }

    const output = {
      isTerminal: true,
      format: outputFormat,
      result: formattedOutput,
      executionId: context.executionId,
      timestamp: new Date().toISOString(),
    };

    console.log(`[OutputExecutor] Final output collected successfully`);

    return {
      success: true,
      data: output,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[OutputExecutor] Failed:`, message);

    return {
      success: false,
      data: null,
      error: message,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}
