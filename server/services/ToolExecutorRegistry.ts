/**
 * TOOL EXECUTOR REGISTRY
 *
 * Registers executor functions for all tool types with the CustomToolRegistry
 */

import { customToolRegistry, CustomTool } from './CustomToolRegistry';
import { apiConnectorService } from './APIConnectorService';
import { codeExecutorService } from './CodeExecutorService';

/**
 * Initialize all tool executors
 */
export function initializeToolExecutors() {
  console.log('[TOOL_EXECUTORS] Registering tool executors...');

  // ========================================================
  // API_CALL EXECUTOR
  // ========================================================
  customToolRegistry.registerExecutor('api_call', async (tool: CustomTool, params: Record<string, any>) => {
    console.log(`[EXECUTOR:API_CALL] Executing API call for tool: ${tool.name}`);

    // The config should contain an endpointId
    const endpointId = tool.config.endpointId;

    if (!endpointId) {
      throw new Error('API call tool must have endpointId in config');
    }

    // Call the API endpoint
    const result = await apiConnectorService.callEndpoint({
      endpointId,
      pathParams: params.pathParams,
      queryParams: params.queryParams,
      headers: params.headers,
      body: params.body,
    });

    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }

    return result.data;
  });

  console.log('[TOOL_EXECUTORS] ✅ Registered: api_call');

  // ========================================================
  // CODE_EXECUTION EXECUTOR
  // ========================================================
  customToolRegistry.registerExecutor('code_execution', async (tool: CustomTool, params: Record<string, any>) => {
    console.log(`[EXECUTOR:CODE_EXECUTION] Executing code for tool: ${tool.name}`);

    // The config should contain a snippetId
    const snippetId = tool.config.snippetId;

    if (!snippetId) {
      throw new Error('Code execution tool must have snippetId in config');
    }

    // Execute the code snippet
    const result = await codeExecutorService.executeSnippet({
      snippetId,
      parameters: params,
    });

    if (!result.success) {
      throw new Error(result.error || 'Code execution failed');
    }

    return result.result;
  });

  console.log('[TOOL_EXECUTORS] ✅ Registered: code_execution');

  // ========================================================
  // DATABASE_QUERY EXECUTOR (Placeholder)
  // ========================================================
  customToolRegistry.registerExecutor('database_query', async (tool: CustomTool, params: Record<string, any>) => {
    console.log(`[EXECUTOR:DATABASE_QUERY] Executing database query for tool: ${tool.name}`);

    // TODO: Implement database query execution
    // For now, return a placeholder
    throw new Error('Database query execution not yet implemented');
  });

  console.log('[TOOL_EXECUTORS] ✅ Registered: database_query (placeholder)');

  // ========================================================
  // WEBHOOK EXECUTOR (Placeholder)
  // ========================================================
  customToolRegistry.registerExecutor('webhook', async (tool: CustomTool, params: Record<string, any>) => {
    console.log(`[EXECUTOR:WEBHOOK] Executing webhook for tool: ${tool.name}`);

    // TODO: Implement webhook execution
    // For now, return a placeholder
    throw new Error('Webhook execution not yet implemented');
  });

  console.log('[TOOL_EXECUTORS] ✅ Registered: webhook (placeholder)');

  console.log('[TOOL_EXECUTORS] All executors registered successfully');
}
