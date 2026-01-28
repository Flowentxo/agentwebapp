/**
 * Tool System Initialization
 * Phase 12: Tool Execution Layer
 *
 * Registers all available tools with the ToolRegistry singleton
 * Import this file at server startup to initialize all tools
 */

import { toolRegistry } from './ToolRegistry';
import { createLogger } from '@/lib/logger';

// Import tool implementations
import {
  gmailSendMessageTool,
  gmailReadMessagesTool,
} from './implementations/GmailSendMessageTool';

import {
  hubspotCreateContactTool,
  hubspotUpdateContactTool,
  hubspotCreateDealTool,
  hubspotSearchContactsTool,
} from './implementations/HubSpotTools';

const logger = createLogger('ToolInit');

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

let isInitialized = false;

/**
 * Initialize and register all tools with the ToolRegistry
 * Safe to call multiple times - will only initialize once
 */
export function initializeTools(): void {
  if (isInitialized) {
    logger.debug('Tools already initialized, skipping...');
    return;
  }

  logger.info('🔧 Initializing Tool Execution Layer...');

  try {
    // Register Gmail tools
    toolRegistry.register(gmailSendMessageTool);
    toolRegistry.register(gmailReadMessagesTool);

    // Register HubSpot tools
    toolRegistry.register(hubspotCreateContactTool);
    toolRegistry.register(hubspotUpdateContactTool);
    toolRegistry.register(hubspotCreateDealTool);
    toolRegistry.register(hubspotSearchContactsTool);

    isInitialized = true;

    const toolCount = toolRegistry.getAllTools().length;
    logger.info(`✅ Tool Execution Layer initialized with ${toolCount} tools`);

    // Log registered tools by category
    const catalog = toolRegistry.getCatalog();
    const byCategory = catalog.reduce((acc, tool) => {
      acc[tool.category] = acc[tool.category] || [];
      acc[tool.category].push(tool.name);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [category, tools] of Object.entries(byCategory)) {
      logger.info(`  [${category}]: ${tools.join(', ')}`);
    }
  } catch (error) {
    logger.error('❌ Failed to initialize tools:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export ToolRegistry for convenience
export { toolRegistry } from './ToolRegistry';

// Re-export interfaces
export type {
  ITool,
  ToolContext,
  ToolResult,
  ToolParameter,
  ToolCategory,
  ToolRegistryConfig,
  ToolExecutionLog,
} from '@/lib/tools/interfaces';

// Re-export individual tools for direct access
export {
  gmailSendMessageTool,
  gmailReadMessagesTool,
} from './implementations/GmailSendMessageTool';

export {
  hubspotCreateContactTool,
  hubspotUpdateContactTool,
  hubspotCreateDealTool,
  hubspotSearchContactsTool,
} from './implementations/HubSpotTools';

// Re-export base class for custom tool creation
export { AuthenticatedTool, MockAuthenticatedTool } from './implementations/AuthenticatedTool';
