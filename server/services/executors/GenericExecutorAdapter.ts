/**
 * FLOWENT AI STUDIO - GENERIC EXECUTOR ADAPTER
 *
 * Bridges the new GenericProviderExecutor/NodeExecutorRegistry with
 * the existing WorkflowExecutionEngineV2's INodeExecutor interface.
 *
 * This allows the engine to use our metadata-driven executor for any
 * node type defined in node-definitions.ts without needing individual
 * executor classes for each provider.
 *
 * @version 1.0.0
 */

import {
  getNodeExecutorRegistry,
  NodeConfig,
  ExecutionContext as GenericExecutionContext,
  ExecutionResult,
} from './index';
import {
  INodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
} from '@/types/execution';
import { getNodeById } from '@/lib/studio/node-definitions';
import { createLogger } from '@/lib/logger';

const logger = createLogger('generic-executor-adapter');

// ============================================================================
// GENERIC EXECUTOR ADAPTER
// ============================================================================

/**
 * Adapter that implements INodeExecutor using our GenericProviderExecutor
 * This is registered once in the engine to handle all provider-based nodes
 */
export class GenericExecutorAdapter implements INodeExecutor {
  private registry = getNodeExecutorRegistry();

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs, rawInputs } = input;
    const nodeType = node.type || 'unknown';
    const nodeId = node.id;

    logger.debug('GenericExecutorAdapter executing', {
      nodeId,
      nodeType,
      hasCredential: !!node.data?.credentialId,
    });

    // Check if this node type is supported by our registry
    if (!this.registry.isSupported(nodeType)) {
      logger.warn('Node type not supported by generic executor', { nodeType });
      return {
        data: null,
        success: false,
        error: `Node type "${nodeType}" is not supported by the generic executor`,
      };
    }

    try {
      // Convert to GenericProviderExecutor format
      const nodeConfig: NodeConfig = {
        type: nodeType,
        values: this.extractValues(node, inputs, rawInputs),
        credentialId: node.data?.credentialId || inputs?.credentialId,
        timeout: node.data?.timeoutMs || 30000,
        retry: node.data?.retry || {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
        },
      };

      // Build execution context
      const executionContext: GenericExecutionContext = {
        executionId: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        workspaceId: context.state.global?.workspaceId,
        nodeId: nodeId,
        variables: context.state.variables,
        nodeOutputs: this.buildNodeOutputsMap(context.state.nodes),
        requestSource: 'workflow',
      };

      // Execute using the registry
      const result = await this.registry.execute(nodeConfig, executionContext);

      // Convert result back to INodeExecutor format
      return this.convertResult(result);
    } catch (error) {
      logger.error('GenericExecutorAdapter execution failed', {
        nodeId,
        nodeType,
        error: error instanceof Error ? error.message : error,
      });

      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
      };
    }
  }

  /**
   * Extract configuration values from node data and inputs
   */
  private extractValues(
    node: NodeExecutorInput['node'],
    inputs: Record<string, unknown>,
    rawInputs: Record<string, unknown>
  ): Record<string, unknown> {
    // Start with node data
    const values: Record<string, unknown> = { ...node.data };

    // Remove non-configuration fields
    delete values.label;
    delete values.icon;
    delete values.color;
    delete values.description;

    // Merge resolved inputs (takes precedence)
    if (inputs) {
      for (const [key, value] of Object.entries(inputs)) {
        if (value !== undefined && key !== 'previousOutput' && key !== 'trigger') {
          values[key] = value;
        }
      }
    }

    // Add previous output as potential input
    if (inputs?.previousOutput !== undefined) {
      values.input = inputs.previousOutput;
    }

    return values;
  }

  /**
   * Build node outputs map from state
   */
  private buildNodeOutputsMap(
    nodes: Record<string, { output: unknown; meta: unknown }>
  ): Map<string, unknown> {
    const map = new Map<string, unknown>();
    for (const [nodeId, nodeState] of Object.entries(nodes)) {
      if (nodeState.output !== undefined) {
        map.set(nodeId, nodeState.output);
      }
    }
    return map;
  }

  /**
   * Convert GenericProviderExecutor result to INodeExecutor format
   */
  private convertResult(result: ExecutionResult): NodeExecutorOutput {
    const output: NodeExecutorOutput = {
      data: result.data,
      success: result.success,
      error: result.error?.message,
    };

    // Include token usage if available
    if (result.meta) {
      output.meta = {};

      // If this was an AI call with token tracking
      if (result.data && typeof result.data === 'object') {
        const data = result.data as Record<string, unknown>;
        if (data.usage) {
          const usage = data.usage as Record<string, number>;
          output.meta.tokenUsage = {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
          };
        }
      }

      // Include cost if tracked
      if (typeof result.data === 'object' && result.data !== null) {
        const data = result.data as Record<string, unknown>;
        if (typeof data.cost === 'number') {
          output.meta.cost = data.cost;
        }
      }
    }

    return output;
  }

  /**
   * Get list of node types this adapter can handle
   */
  getSupportedNodeTypes(): string[] {
    // Get all node types from definitions that have providers
    const nodeDefs = [
      // This would be populated from node-definitions.ts
      // For now, return the ones we know about
    ];

    return this.registry.listExecutors().flatMap(e => e.nodeTypes);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create generic executor adapters for all provider-based node types
 * Returns a map of nodeType -> INodeExecutor for registration
 */
export function createGenericExecutorAdapters(): Map<string, INodeExecutor> {
  const adapters = new Map<string, INodeExecutor>();
  const sharedAdapter = new GenericExecutorAdapter();

  // Get all node definitions that have providers
  const providerNodeTypes = [
    // HubSpot
    'hubspot_contact_list',
    'hubspot_contact_get',
    'hubspot_contact_create',
    'hubspot_contact_update',
    'hubspot_contact_delete',
    'hubspot_deal_list',
    'hubspot_deal_create',
    'hubspot_deal_update',

    // Slack
    'slack_message_send',
    'slack_channel_list',
    'slack_channel_create',

    // Gmail / Email
    'gmail_send',
    'gmail_read',
    'gmail_search',

    // Google Calendar
    'google_calendar_event_list',
    'google_calendar_event_create',

    // Google Sheets
    'google_sheets_read',
    'google_sheets_write',
    'google_sheets_append',

    // Notion
    'notion_page_get',
    'notion_page_create',
    'notion_database_query',

    // Airtable
    'airtable_record_list',
    'airtable_record_create',
    'airtable_record_update',

    // GitHub
    'github_repo_list',
    'github_issue_create',
    'github_pr_list',

    // Stripe
    'stripe_customer_create',
    'stripe_payment_create',
    'stripe_subscription_list',

    // AI Providers
    'openai_chat',
    'openai_completion',
    'openai_embedding',
    'anthropic_chat',
    'cohere_generate',

    // HTTP Generic
    'http_request',
    'webhook_trigger',
    'webhook_send',
  ];

  // Register the shared adapter for all provider node types
  for (const nodeType of providerNodeTypes) {
    adapters.set(nodeType, sharedAdapter);
  }

  logger.info('Created generic executor adapters', {
    count: adapters.size,
    nodeTypes: providerNodeTypes,
  });

  return adapters;
}

/**
 * Register all generic executors with the workflow engine
 */
export function registerGenericExecutors(
  registerFn: (nodeType: string, executor: INodeExecutor) => void
): void {
  const adapters = createGenericExecutorAdapters();

  for (const [nodeType, adapter] of adapters) {
    registerFn(nodeType, adapter);
  }

  logger.info('Registered generic executors with engine', {
    count: adapters.size,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GenericExecutorAdapter;
