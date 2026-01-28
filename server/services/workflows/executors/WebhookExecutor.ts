/**
 * Webhook Trigger Executor
 *
 * Handles webhook trigger nodes - passes through the trigger data
 */

import { WorkflowNode, ExecutionContext, NodeOutput } from '../types';

export async function executeWebhookTrigger(
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const startTime = Date.now();

  console.log(`[WebhookExecutor] Executing node: ${node.id}`);
  console.log(`[WebhookExecutor] Config:`, node.data.config);
  console.log(`[WebhookExecutor] Trigger data:`, context.triggerData);

  try {
    // For webhook triggers, we pass through the trigger data
    // In a real implementation, this would validate the webhook payload
    const output = {
      webhookReceived: true,
      payload: context.triggerData || inputs,
      timestamp: new Date().toISOString(),
      nodeId: node.id,
    };

    console.log(`[WebhookExecutor] Success - Output:`, output);

    return {
      success: true,
      data: output,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WebhookExecutor] Failed:`, message);

    return {
      success: false,
      data: null,
      error: message,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}
