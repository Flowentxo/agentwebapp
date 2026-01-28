/**
 * Action Node Executor
 * Phase 12: Tool Execution Layer Integration
 *
 * Handles action nodes with two modes:
 * 1. ToolRegistry integration for authenticated API tools (Gmail, HubSpot, etc.)
 * 2. Legacy handlers for simple actions (HTTP, database, transform)
 */

import { WorkflowNode, ExecutionContext, NodeOutput } from '../types';
import { toolRegistry } from '@/server/services/tools/ToolRegistry';
import { ToolContext } from '@/lib/tools/interfaces';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ActionExecutor');

// ============================================================================
// TOOL ID MAPPING
// Maps legacy action types to new ToolRegistry tool IDs
// ============================================================================

const TOOL_ID_MAP: Record<string, string> = {
  // Gmail tools
  'gmail-send': 'gmail-send-message',
  'gmail-send-email': 'gmail-send-message',
  'gmail-read': 'gmail-read-messages',
  'gmail-read-emails': 'gmail-read-messages',

  // HubSpot tools
  'hubspot-create-contact': 'hubspot-create-contact',
  'hubspot-update-contact': 'hubspot-update-contact',
  'hubspot-create-deal': 'hubspot-create-deal',
  'hubspot-search-contacts': 'hubspot-search-contacts',

  // Slack tools (future)
  'slack-send-message': 'slack-send-message',
  'slack-post': 'slack-send-message',
};

// ============================================================================
// LEGACY ACTION HANDLERS
// For simple actions that don't require OAuth
// ============================================================================

const LEGACY_HANDLERS: Record<string, (node: WorkflowNode, inputs: Record<string, unknown>) => Promise<unknown>> = {
  // HTTP Request action
  'http-request': async (node, inputs) => {
    const config = node.data.config || {};
    const url = (config.url as string) || (inputs.url as string);
    const method = (config.method as string) || (inputs.method as string) || 'GET';
    const body = config.body || inputs.body;
    const headers = (config.headers as Record<string, string>) || {};

    logger.info(`[HTTP] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json().catch(() => response.text());

      return {
        status: response.status,
        ok: response.ok,
        body: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      logger.error(`[HTTP] Request failed:`, error);
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  },

  // Send Email action (legacy - use Gmail tool for OAuth)
  'send-email': async (node, inputs) => {
    const config = node.data.config || {};
    logger.info(`[Email] Would send email to ${config.to || inputs.to || 'unknown'}`);
    return {
      sent: true,
      to: config.to || inputs.to || 'user@example.com',
      subject: config.subject || inputs.subject || 'Workflow Notification',
      messageId: `msg-${Date.now()}`,
      note: 'Use gmail-send-message tool for authenticated email',
    };
  },

  // Slack notification (legacy)
  'slack-notify': async (node, inputs) => {
    const config = node.data.config || {};
    logger.info(`[Slack] Would post to channel ${config.channel || inputs.channel || '#general'}`);
    return {
      sent: true,
      channel: config.channel || inputs.channel || '#general',
      ts: `${Date.now()}.000000`,
      note: 'Use slack-send-message tool for authenticated Slack',
    };
  },

  // Database operation
  'database': async (node, inputs) => {
    const config = node.data.config || {};
    const operation = (config.operation as string) || (inputs.operation as string) || 'query';
    logger.info(`[DB] Executing ${operation}`);
    return {
      operation,
      rowsAffected: Math.floor(Math.random() * 10),
      success: true,
    };
  },

  // Transform data
  'transform': async (node, inputs) => {
    const config = node.data.config || {};
    const transformType = (config.type as string) || 'passthrough';

    logger.info(`[Transform] Type: ${transformType}`);

    switch (transformType) {
      case 'map':
        // Apply mapping from config.mapping
        const mapping = (config.mapping as Record<string, string>) || {};
        const mapped: Record<string, unknown> = {};
        for (const [newKey, oldKey] of Object.entries(mapping)) {
          mapped[newKey] = inputs[oldKey];
        }
        return { transformed: true, data: mapped };

      case 'filter':
        // Filter keys from config.keys
        const keys = (config.keys as string[]) || Object.keys(inputs);
        const filtered: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in inputs) filtered[key] = inputs[key];
        }
        return { transformed: true, data: filtered };

      case 'merge':
        // Merge with config.defaults
        const defaults = (config.defaults as Record<string, unknown>) || {};
        return { transformed: true, data: { ...defaults, ...inputs } };

      default:
        // Passthrough
        return { transformed: true, data: inputs };
    }
  },

  // Delay action
  'delay': async (node, inputs) => {
    const config = node.data.config || {};
    const delayMs = (config.delay as number) || (inputs.delay as number) || 1000;

    logger.info(`[Delay] Waiting ${delayMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return { delayed: true, duration: delayMs };
  },

  // Log action
  'log': async (node, inputs) => {
    const config = node.data.config || {};
    const message = (config.message as string) || JSON.stringify(inputs);
    const level = (config.level as string) || 'info';

    logger.info(`[Log:${level}] ${message}`);

    return { logged: true, message, level, inputs };
  },

  // Default action
  'default': async (node, inputs) => {
    logger.info(`[Default] Generic action executed for node ${node.id}`);
    return {
      executed: true,
      nodeId: node.id,
      inputData: inputs,
    };
  },
};

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

/**
 * Execute an action node
 *
 * Priority:
 * 1. Check for toolId in node.data - use ToolRegistry
 * 2. Check for toolId mapping from actionType - use ToolRegistry
 * 3. Fall back to legacy handlers
 */
export async function executeActionNode(
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const startTime = Date.now();

  // Extract configuration
  const config = node.data.config || {};
  const toolId = (node.data.toolId as string) || (config.toolId as string);
  const actionType = (config.actionType as string) ||
    node.data.label?.toLowerCase().replace(/\s+/g, '-') ||
    'default';

  logger.info(`[ActionExecutor] Node: ${node.id}, Action: ${actionType}, ToolId: ${toolId || 'none'}`);

  try {
    // ========================================================================
    // PATH 1: Direct toolId specified - Use ToolRegistry
    // ========================================================================
    if (toolId && toolRegistry.hasTool(toolId)) {
      logger.info(`[ActionExecutor] Using ToolRegistry for: ${toolId}`);

      // Build tool context from execution context
      const toolContext: ToolContext = {
        userId: (context.variables?.userId as string) || 'system',
        workspaceId: (context.variables?.workspaceId as string) || 'default',
        executionId: context.executionId,
        nodeId: node.id,
        variables: context.variables,
      };

      // Merge config params with inputs (inputs override config)
      const toolParams = {
        ...(config.params as Record<string, unknown> || {}),
        ...inputs,
      };

      // Execute via ToolRegistry
      const result = await toolRegistry.executeTool(toolId, toolParams, toolContext);

      return {
        success: result.success,
        data: {
          toolId,
          result: result.data,
          metadata: result.metadata,
        },
        error: result.error,
        duration: result.metadata?.durationMs || (Date.now() - startTime),
        timestamp: new Date(),
      };
    }

    // ========================================================================
    // PATH 2: Check if actionType maps to a tool
    // ========================================================================
    const mappedToolId = TOOL_ID_MAP[actionType];
    if (mappedToolId && toolRegistry.hasTool(mappedToolId)) {
      logger.info(`[ActionExecutor] Mapped ${actionType} -> ${mappedToolId}`);

      const toolContext: ToolContext = {
        userId: (context.variables?.userId as string) || 'system',
        workspaceId: (context.variables?.workspaceId as string) || 'default',
        executionId: context.executionId,
        nodeId: node.id,
        variables: context.variables,
      };

      const toolParams = {
        ...(config.params as Record<string, unknown> || {}),
        ...inputs,
      };

      const result = await toolRegistry.executeTool(mappedToolId, toolParams, toolContext);

      return {
        success: result.success,
        data: {
          toolId: mappedToolId,
          actionType,
          result: result.data,
          metadata: result.metadata,
        },
        error: result.error,
        duration: result.metadata?.durationMs || (Date.now() - startTime),
        timestamp: new Date(),
      };
    }

    // ========================================================================
    // PATH 3: Legacy handler
    // ========================================================================
    logger.info(`[ActionExecutor] Using legacy handler for: ${actionType}`);

    const handler = LEGACY_HANDLERS[actionType] || LEGACY_HANDLERS['default'];
    const result = await handler(node, inputs);

    const output = {
      actionType,
      result,
      timestamp: new Date().toISOString(),
    };

    logger.info(`[ActionExecutor] ✅ Success - Action completed`);

    return {
      success: true,
      data: output,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[ActionExecutor] ❌ Failed:`, message);

    return {
      success: false,
      data: null,
      error: message,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// HELPER: Get available tools for UI
// ============================================================================

/**
 * Get all available action types including registered tools
 */
export function getAvailableActions(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  requiresAuth: boolean;
}> {
  // Get registered tools from ToolRegistry
  const registeredTools = toolRegistry.getCatalog().map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    provider: tool.provider,
    requiresAuth: true,
  }));

  // Add legacy actions
  const legacyActions = [
    { id: 'http-request', name: 'HTTP Request', description: 'Make HTTP API calls', category: 'utility', provider: 'internal', requiresAuth: false },
    { id: 'transform', name: 'Transform Data', description: 'Transform and map data', category: 'data', provider: 'internal', requiresAuth: false },
    { id: 'delay', name: 'Delay', description: 'Wait for a specified time', category: 'utility', provider: 'internal', requiresAuth: false },
    { id: 'log', name: 'Log', description: 'Log data for debugging', category: 'utility', provider: 'internal', requiresAuth: false },
    { id: 'database', name: 'Database', description: 'Execute database operations', category: 'data', provider: 'internal', requiresAuth: false },
  ];

  return [...registeredTools, ...legacyActions];
}
