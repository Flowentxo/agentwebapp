/**
 * CUSTOM TOOLS API ROUTES
 *
 * REST API endpoints for managing custom tools, API connectors, and code execution
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { apiLimiter } from '../middleware/rate-limiter';
import { customToolRegistry } from '../services/CustomToolRegistry';
import { apiConnectorService } from '../services/APIConnectorService';
import { codeExecutorService } from '../services/CodeExecutorService';

export const customToolsRouter = Router();

// Apply authentication and rate limiting to all routes
customToolsRouter.use(authenticate);
customToolsRouter.use(apiLimiter);

// ============================================================
// CUSTOM TOOLS MANAGEMENT
// ============================================================

/**
 * POST /api/custom-tools
 * Register a new custom tool
 */
customToolsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      displayName,
      description,
      category,
      icon,
      type,
      config,
      parameters,
      outputSchema,
      authType,
      credentialId,
    } = req.body;

    const userId = req.user?.userId;
    const workspaceId = req.body.workspaceId || userId; // Use userId as default workspace

    // Validation
    if (!name || !displayName || !type || !config) {
      return res.status(400).json({
        error: 'Missing required fields: name, displayName, type, config',
      });
    }

    const tool = await customToolRegistry.registerTool({
      workspaceId,
      createdBy: userId,
      name,
      displayName,
      description,
      category,
      icon,
      type,
      config,
      parameters: parameters || [],
      outputSchema,
      authType,
      credentialId,
    });

    res.status(201).json({
      message: 'Tool registered successfully',
      tool,
    });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_POST]', error);
    res.status(400).json({
      error: error.message || 'Failed to register tool',
    });
  }
});

/**
 * GET /api/custom-tools
 * List all custom tools for workspace
 */
customToolsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const workspaceId = req.query.workspaceId as string || userId;
    const category = req.query.category as string;
    const type = req.query.type as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const tools = await customToolRegistry.listTools({
      workspaceId,
      category,
      type,
      isActive,
    });

    res.json({
      tools,
      count: tools.length,
    });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_GET]', error);
    res.status(500).json({
      error: 'Failed to list tools',
    });
  }
});

/**
 * GET /api/custom-tools/:id
 * Get a specific tool by ID
 */
customToolsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tool = await customToolRegistry.getTool(id);

    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
      });
    }

    res.json({ tool });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_GET_ID]', error);
    res.status(500).json({
      error: 'Failed to get tool',
    });
  }
});

/**
 * PUT /api/custom-tools/:id
 * Update a custom tool
 */
customToolsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const tool = await customToolRegistry.updateTool(id, updates);

    res.json({
      message: 'Tool updated successfully',
      tool,
    });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_PUT]', error);
    res.status(400).json({
      error: error.message || 'Failed to update tool',
    });
  }
});

/**
 * DELETE /api/custom-tools/:id
 * Delete a custom tool
 */
customToolsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await customToolRegistry.deleteTool(id);

    res.json({
      message: 'Tool deleted successfully',
    });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_DELETE]', error);
    res.status(500).json({
      error: 'Failed to delete tool',
    });
  }
});

/**
 * POST /api/custom-tools/:id/execute
 * Execute a custom tool
 */
customToolsRouter.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;
    const userId = req.user?.userId;
    const workspaceId = req.body.workspaceId || userId;

    const result = await customToolRegistry.executeTool({
      toolId: id,
      workspaceId,
      executedBy: userId,
      parameters: parameters || {},
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        logs: result.logs,
        durationMs: result.durationMs,
      });
    }

    res.json({
      message: 'Tool executed successfully',
      result: result.data,
      durationMs: result.durationMs,
      logs: result.logs,
    });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_EXECUTE]', error);
    res.status(500).json({
      error: 'Tool execution failed',
    });
  }
});

/**
 * GET /api/custom-tools/:id/logs
 * Get execution logs for a tool
 */
customToolsRouter.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await customToolRegistry.getExecutionLogs(id, limit);

    res.json({
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('[CUSTOM_TOOLS_LOGS]', error);
    res.status(500).json({
      error: 'Failed to get logs',
    });
  }
});

// ============================================================
// API CONNECTORS
// ============================================================

/**
 * POST /api/custom-tools/connectors
 * Register a new API connector
 */
customToolsRouter.post('/connectors', async (req: Request, res: Response) => {
  try {
    const {
      name,
      displayName,
      description,
      baseUrl,
      apiType,
      authType,
      credentialId,
      defaultHeaders,
      timeout,
      retryConfig,
      rateLimitConfig,
    } = req.body;

    const userId = req.user?.userId;
    const workspaceId = req.body.workspaceId || userId;

    // Validation
    if (!name || !displayName || !baseUrl) {
      return res.status(400).json({
        error: 'Missing required fields: name, displayName, baseUrl',
      });
    }

    const connector = await apiConnectorService.registerConnector({
      workspaceId,
      createdBy: userId,
      name,
      displayName,
      description,
      baseUrl,
      apiType,
      authType,
      credentialId,
      defaultHeaders,
      timeout,
      retryConfig,
      rateLimitConfig,
    });

    res.status(201).json({
      message: 'Connector registered successfully',
      connector,
    });
  } catch (error: any) {
    console.error('[CONNECTORS_POST]', error);
    res.status(400).json({
      error: error.message || 'Failed to register connector',
    });
  }
});

/**
 * GET /api/custom-tools/connectors
 * List all API connectors
 */
customToolsRouter.get('/connectors', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const workspaceId = req.query.workspaceId as string || userId;

    const connectors = await apiConnectorService.listConnectors(workspaceId);

    res.json({
      connectors,
      count: connectors.length,
    });
  } catch (error: any) {
    console.error('[CONNECTORS_GET]', error);
    res.status(500).json({
      error: 'Failed to list connectors',
    });
  }
});

/**
 * POST /api/custom-tools/connectors/:connectorId/endpoints
 * Register an endpoint for a connector
 */
customToolsRouter.post('/connectors/:connectorId/endpoints', async (req: Request, res: Response) => {
  try {
    const { connectorId } = req.params;
    const {
      name,
      displayName,
      description,
      method,
      path,
      pathParams,
      queryParams,
      headers,
      bodySchema,
      responseSchema,
      successCodes,
      timeout,
    } = req.body;

    // Validation
    if (!name || !displayName || !method || !path) {
      return res.status(400).json({
        error: 'Missing required fields: name, displayName, method, path',
      });
    }

    const endpoint = await apiConnectorService.registerEndpoint({
      connectorId,
      name,
      displayName,
      description,
      method,
      path,
      pathParams,
      queryParams,
      headers,
      bodySchema,
      responseSchema,
      successCodes,
      timeout,
    });

    res.status(201).json({
      message: 'Endpoint registered successfully',
      endpoint,
    });
  } catch (error: any) {
    console.error('[ENDPOINTS_POST]', error);
    res.status(400).json({
      error: error.message || 'Failed to register endpoint',
    });
  }
});

/**
 * GET /api/custom-tools/connectors/:connectorId/endpoints
 * List endpoints for a connector
 */
customToolsRouter.get('/connectors/:connectorId/endpoints', async (req: Request, res: Response) => {
  try {
    const { connectorId } = req.params;

    const endpoints = await apiConnectorService.listEndpoints(connectorId);

    res.json({
      endpoints,
      count: endpoints.length,
    });
  } catch (error: any) {
    console.error('[ENDPOINTS_GET]', error);
    res.status(500).json({
      error: 'Failed to list endpoints',
    });
  }
});

/**
 * POST /api/custom-tools/connectors/endpoints/:endpointId/call
 * Call an API endpoint
 */
customToolsRouter.post('/connectors/endpoints/:endpointId/call', async (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    const { pathParams, queryParams, headers, body } = req.body;

    const result = await apiConnectorService.callEndpoint({
      endpointId,
      pathParams,
      queryParams,
      headers,
      body,
    });

    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        error: result.error,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        retryCount: result.retryCount,
      });
    }

    res.json({
      message: 'API call successful',
      data: result.data,
      statusCode: result.statusCode,
      headers: result.headers,
      durationMs: result.durationMs,
      retryCount: result.retryCount,
    });
  } catch (error: any) {
    console.error('[ENDPOINT_CALL]', error);
    res.status(500).json({
      error: 'API call failed',
    });
  }
});

// ============================================================
// CODE SNIPPETS
// ============================================================

/**
 * POST /api/custom-tools/code-snippets
 * Register a code snippet
 */
customToolsRouter.post('/code-snippets', async (req: Request, res: Response) => {
  try {
    const {
      name,
      displayName,
      description,
      language,
      code,
      timeout,
      memoryLimit,
      parameters,
      returnType,
      dependencies,
    } = req.body;

    const userId = req.user?.userId;
    const workspaceId = req.body.workspaceId || userId;

    // Validation
    if (!name || !displayName || !language || !code) {
      return res.status(400).json({
        error: 'Missing required fields: name, displayName, language, code',
      });
    }

    const snippet = await codeExecutorService.registerSnippet({
      workspaceId,
      createdBy: userId,
      name,
      displayName,
      description,
      language,
      code,
      timeout,
      memoryLimit,
      parameters,
      returnType,
      dependencies,
    });

    res.status(201).json({
      message: 'Code snippet registered successfully',
      snippet,
    });
  } catch (error: any) {
    console.error('[CODE_SNIPPETS_POST]', error);
    res.status(400).json({
      error: error.message || 'Failed to register code snippet',
    });
  }
});

/**
 * GET /api/custom-tools/code-snippets
 * List code snippets
 */
customToolsRouter.get('/code-snippets', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const workspaceId = req.query.workspaceId as string || userId;

    const snippets = await codeExecutorService.listSnippets(workspaceId);

    res.json({
      snippets,
      count: snippets.length,
    });
  } catch (error: any) {
    console.error('[CODE_SNIPPETS_GET]', error);
    res.status(500).json({
      error: 'Failed to list code snippets',
    });
  }
});

/**
 * GET /api/custom-tools/code-snippets/:id
 * Get a code snippet by ID
 */
customToolsRouter.get('/code-snippets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const snippet = await codeExecutorService.getSnippet(id);

    if (!snippet) {
      return res.status(404).json({
        error: 'Code snippet not found',
      });
    }

    res.json({ snippet });
  } catch (error: any) {
    console.error('[CODE_SNIPPETS_GET_ID]', error);
    res.status(500).json({
      error: 'Failed to get code snippet',
    });
  }
});

/**
 * POST /api/custom-tools/code-snippets/:id/execute
 * Execute a code snippet
 */
customToolsRouter.post('/code-snippets/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;

    const result = await codeExecutorService.executeSnippet({
      snippetId: id,
      parameters: parameters || {},
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        logs: result.logs,
        durationMs: result.durationMs,
      });
    }

    res.json({
      message: 'Code executed successfully',
      result: result.result,
      logs: result.logs,
      durationMs: result.durationMs,
      memoryUsed: result.memoryUsed,
    });
  } catch (error: any) {
    console.error('[CODE_SNIPPETS_EXECUTE]', error);
    res.status(500).json({
      error: 'Code execution failed',
    });
  }
});

// ============================================================
// CREDENTIALS MANAGEMENT
// ============================================================

/**
 * POST /api/custom-tools/credentials
 * Store a credential
 */
customToolsRouter.post('/credentials', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      type,
      data,
      tokenUrl,
      scopes,
    } = req.body;

    const userId = req.user?.userId;
    const workspaceId = req.body.workspaceId || userId;

    // Validation
    if (!name || !type || !data) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, data',
      });
    }

    const credential = await apiConnectorService.storeCredential({
      workspaceId,
      createdBy: userId,
      name,
      description,
      type,
      data,
      tokenUrl,
      scopes,
    });

    // Don't return the encrypted data
    const { encryptedData, ...safeCredential } = credential as any;

    res.status(201).json({
      message: 'Credential stored successfully',
      credential: safeCredential,
    });
  } catch (error: any) {
    console.error('[CREDENTIALS_POST]', error);
    res.status(400).json({
      error: error.message || 'Failed to store credential',
    });
  }
});

export default customToolsRouter;
