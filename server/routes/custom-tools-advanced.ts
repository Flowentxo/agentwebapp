/**
 * CUSTOM TOOLS ADVANCED ROUTES
 *
 * API endpoints for Database Queries and Webhooks
 */

import { Router } from 'express';
import { getDb } from '@/lib/db';
import { databaseQueries, webhooks, databaseConnections, credentials } from '@/lib/db/schema-custom-tools';
import { eq, and, desc } from 'drizzle-orm';
import { DatabaseQueryExecutor } from '../services/DatabaseQueryExecutor';
import { WebhookExecutor } from '../services/WebhookExecutor';
import logger from '@/lib/logger';

const router = Router();

// ============================================================
// DATABASE QUERIES ENDPOINTS
// ============================================================

/**
 * GET /api/custom-tools/database-queries
 * List all database queries for a workspace
 */
router.get('/database-queries', async (req, res) => {
  try {
    const { workspaceId, isActive } = req.query;
    const userId = req.headers['x-user-id'] as string;

    const db = getDb();

    let queryBuilder = db
      .select()
      .from(databaseQueries)
      .orderBy(desc(databaseQueries.createdAt));

    // Apply filters
    const filters: any[] = [];
    if (workspaceId) filters.push(eq(databaseQueries.workspaceId, workspaceId as string));
    if (isActive !== undefined) filters.push(eq(databaseQueries.isActive, isActive === 'true'));

    if (filters.length > 0) {
      queryBuilder = queryBuilder.where(and(...filters)) as any;
    }

    const queries = await queryBuilder;

    res.json({
      success: true,
      data: queries,
      count: queries.length,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to list database queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list database queries',
      message: error.message,
    });
  }
});

/**
 * GET /api/custom-tools/database-queries/:id
 * Get a specific database query
 */
router.get('/database-queries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const [query] = await db
      .select()
      .from(databaseQueries)
      .where(eq(databaseQueries.id, id))
      .limit(1);

    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Database query not found',
      });
    }

    res.json({
      success: true,
      data: query,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to get database query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database query',
      message: error.message,
    });
  }
});

/**
 * POST /api/custom-tools/database-queries
 * Create a new database query
 */
router.post('/database-queries', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      toolId,
      workspaceId,
      name,
      displayName,
      description,
      connectionId,
      query,
      queryType,
      parameters,
      resultFormat,
      maxRows,
      timeout,
      cacheEnabled,
      cacheTtl,
    } = req.body;

    // Validation
    if (!name || !displayName || !connectionId || !query || !queryType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, displayName, connectionId, query, queryType',
      });
    }

    const db = getDb();

    const [newQuery] = await db
      .insert(databaseQueries)
      .values({
        toolId: toolId || null,
        workspaceId: workspaceId || null,
        createdBy: userId || null,
        name,
        displayName,
        description: description || null,
        connectionId,
        query,
        queryType,
        parameters: parameters || [],
        resultFormat: resultFormat || 'json',
        maxRows: maxRows || 10000,
        timeout: timeout || 30000,
        cacheEnabled: cacheEnabled ?? false,
        cacheTtl: cacheTtl || 300,
      })
      .returning();

    logger.info(`[CUSTOM_TOOLS] Created database query: ${newQuery.id}`);

    res.status(201).json({
      success: true,
      data: newQuery,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to create database query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create database query',
      message: error.message,
    });
  }
});

/**
 * PUT /api/custom-tools/database-queries/:id
 * Update a database query
 */
router.put('/database-queries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      description,
      connectionId,
      query,
      queryType,
      parameters,
      resultFormat,
      maxRows,
      timeout,
      cacheEnabled,
      cacheTtl,
      isActive,
    } = req.body;

    const db = getDb();

    // Build update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;
    if (connectionId !== undefined) updates.connectionId = connectionId;
    if (query !== undefined) updates.query = query;
    if (queryType !== undefined) updates.queryType = queryType;
    if (parameters !== undefined) updates.parameters = parameters;
    if (resultFormat !== undefined) updates.resultFormat = resultFormat;
    if (maxRows !== undefined) updates.maxRows = maxRows;
    if (timeout !== undefined) updates.timeout = timeout;
    if (cacheEnabled !== undefined) updates.cacheEnabled = cacheEnabled;
    if (cacheTtl !== undefined) updates.cacheTtl = cacheTtl;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updatedQuery] = await db
      .update(databaseQueries)
      .set(updates)
      .where(eq(databaseQueries.id, id))
      .returning();

    if (!updatedQuery) {
      return res.status(404).json({
        success: false,
        error: 'Database query not found',
      });
    }

    logger.info(`[CUSTOM_TOOLS] Updated database query: ${id}`);

    res.json({
      success: true,
      data: updatedQuery,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to update database query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update database query',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/custom-tools/database-queries/:id
 * Delete a database query
 */
router.delete('/database-queries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const [deletedQuery] = await db
      .delete(databaseQueries)
      .where(eq(databaseQueries.id, id))
      .returning();

    if (!deletedQuery) {
      return res.status(404).json({
        success: false,
        error: 'Database query not found',
      });
    }

    logger.info(`[CUSTOM_TOOLS] Deleted database query: ${id}`);

    res.json({
      success: true,
      message: 'Database query deleted successfully',
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to delete database query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete database query',
      message: error.message,
    });
  }
});

/**
 * POST /api/custom-tools/database-queries/:id/execute
 * Execute a database query
 */
router.post('/database-queries/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const result = await DatabaseQueryExecutor.execute(
      id,
      parameters || {},
      userId,
      workspaceId
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
      rowCount: result.rowCount,
      durationMs: result.durationMs,
      fromCache: result.fromCache,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to execute database query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute database query',
      message: error.message,
    });
  }
});

// ============================================================
// WEBHOOKS ENDPOINTS
// ============================================================

/**
 * GET /api/custom-tools/webhooks
 * List all webhooks for a workspace
 */
router.get('/webhooks', async (req, res) => {
  try {
    const { workspaceId, isActive } = req.query;
    const db = getDb();

    let queryBuilder = db
      .select()
      .from(webhooks)
      .orderBy(desc(webhooks.createdAt));

    // Apply filters
    const filters: any[] = [];
    if (workspaceId) filters.push(eq(webhooks.workspaceId, workspaceId as string));
    if (isActive !== undefined) filters.push(eq(webhooks.isActive, isActive === 'true'));

    if (filters.length > 0) {
      queryBuilder = queryBuilder.where(and(...filters)) as any;
    }

    const allWebhooks = await queryBuilder;

    res.json({
      success: true,
      data: allWebhooks,
      count: allWebhooks.length,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to list webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list webhooks',
      message: error.message,
    });
  }
});

/**
 * GET /api/custom-tools/webhooks/:id
 * Get a specific webhook
 */
router.get('/webhooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    res.json({
      success: true,
      data: webhook,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to get webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook',
      message: error.message,
    });
  }
});

/**
 * POST /api/custom-tools/webhooks
 * Create a new webhook
 */
router.post('/webhooks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      toolId,
      workspaceId,
      name,
      displayName,
      description,
      url,
      method,
      headers: webhookHeaders,
      payloadTemplate,
      payloadType,
      authType,
      credentialId,
      retryEnabled,
      retryConfig,
      timeout,
      expectedStatus,
      responseSchema,
    } = req.body;

    // Validation
    if (!name || !displayName || !url || !method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, displayName, url, method',
      });
    }

    const db = getDb();

    const [newWebhook] = await db
      .insert(webhooks)
      .values({
        toolId: toolId || null,
        workspaceId: workspaceId || null,
        createdBy: userId || null,
        name,
        displayName,
        description: description || null,
        url,
        method: method || 'POST',
        headers: webhookHeaders || {},
        payloadTemplate: payloadTemplate || null,
        payloadType: payloadType || 'json',
        authType: authType || 'none',
        credentialId: credentialId || null,
        retryEnabled: retryEnabled ?? true,
        retryConfig: retryConfig || { maxRetries: 3, backoff: 'exponential', initialDelay: 1000 },
        timeout: timeout || 10000,
        expectedStatus: expectedStatus || [200, 201, 204],
        responseSchema: responseSchema || null,
      })
      .returning();

    logger.info(`[CUSTOM_TOOLS] Created webhook: ${newWebhook.id}`);

    res.status(201).json({
      success: true,
      data: newWebhook,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to create webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook',
      message: error.message,
    });
  }
});

/**
 * PUT /api/custom-tools/webhooks/:id
 * Update a webhook
 */
router.put('/webhooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      description,
      url,
      method,
      headers: webhookHeaders,
      payloadTemplate,
      payloadType,
      authType,
      credentialId,
      retryEnabled,
      retryConfig,
      timeout,
      expectedStatus,
      responseSchema,
      isActive,
    } = req.body;

    const db = getDb();

    // Build update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;
    if (url !== undefined) updates.url = url;
    if (method !== undefined) updates.method = method;
    if (webhookHeaders !== undefined) updates.headers = webhookHeaders;
    if (payloadTemplate !== undefined) updates.payloadTemplate = payloadTemplate;
    if (payloadType !== undefined) updates.payloadType = payloadType;
    if (authType !== undefined) updates.authType = authType;
    if (credentialId !== undefined) updates.credentialId = credentialId;
    if (retryEnabled !== undefined) updates.retryEnabled = retryEnabled;
    if (retryConfig !== undefined) updates.retryConfig = retryConfig;
    if (timeout !== undefined) updates.timeout = timeout;
    if (expectedStatus !== undefined) updates.expectedStatus = expectedStatus;
    if (responseSchema !== undefined) updates.responseSchema = responseSchema;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updatedWebhook] = await db
      .update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, id))
      .returning();

    if (!updatedWebhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    logger.info(`[CUSTOM_TOOLS] Updated webhook: ${id}`);

    res.json({
      success: true,
      data: updatedWebhook,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to update webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update webhook',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/custom-tools/webhooks/:id
 * Delete a webhook
 */
router.delete('/webhooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const [deletedWebhook] = await db
      .delete(webhooks)
      .where(eq(webhooks.id, id))
      .returning();

    if (!deletedWebhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    logger.info(`[CUSTOM_TOOLS] Deleted webhook: ${id}`);

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to delete webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
      message: error.message,
    });
  }
});

/**
 * POST /api/custom-tools/webhooks/:id/execute
 * Execute a webhook
 */
router.post('/webhooks/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const result = await WebhookExecutor.execute(
      id,
      parameters || {},
      userId,
      workspaceId
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      statusCode: result.statusCode,
      data: result.data,
      durationMs: result.durationMs,
      retryCount: result.retryCount,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to execute webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute webhook',
      message: error.message,
    });
  }
});

/**
 * POST /api/custom-tools/webhooks/:id/test
 * Test a webhook with sample data (without saving to logs)
 */
router.post('/webhooks/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;

    const db = getDb();

    // Load webhook config
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    // Execute without logging
    const result = await WebhookExecutor.execute(
      id,
      parameters || {},
      undefined, // No userId for test
      undefined  // No workspaceId for test
    );

    res.json({
      success: result.success,
      statusCode: result.statusCode,
      data: result.data,
      error: result.error,
      durationMs: result.durationMs,
      retryCount: result.retryCount,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to test webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test webhook',
      message: error.message,
    });
  }
});

// ============================================================
// DATABASE CONNECTIONS ENDPOINTS (Helper endpoints)
// ============================================================

/**
 * GET /api/custom-tools/database-connections
 * List all database connections
 */
router.get('/database-connections', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const db = getDb();

    let queryBuilder = db
      .select()
      .from(databaseConnections)
      .orderBy(desc(databaseConnections.createdAt));

    if (workspaceId) {
      queryBuilder = queryBuilder.where(eq(databaseConnections.workspaceId, workspaceId as string)) as any;
    }

    const connections = await queryBuilder;

    res.json({
      success: true,
      data: connections,
      count: connections.length,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to list database connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list database connections',
      message: error.message,
    });
  }
});

/**
 * GET /api/custom-tools/credentials
 * List all credentials
 */
router.get('/credentials', async (req, res) => {
  try {
    const { workspaceId, type } = req.query;
    const db = getDb();

    let queryBuilder = db
      .select({
        id: credentials.id,
        name: credentials.name,
        displayName: credentials.displayName,
        type: credentials.type,
        workspaceId: credentials.workspaceId,
        createdAt: credentials.createdAt,
        // Exclude encryptedData for security
      })
      .from(credentials)
      .orderBy(desc(credentials.createdAt));

    const filters: any[] = [];
    if (workspaceId) filters.push(eq(credentials.workspaceId, workspaceId as string));
    if (type) filters.push(eq(credentials.type, type as string));

    if (filters.length > 0) {
      queryBuilder = queryBuilder.where(and(...filters)) as any;
    }

    const allCredentials = await queryBuilder;

    res.json({
      success: true,
      data: allCredentials,
      count: allCredentials.length,
    });
  } catch (error: any) {
    logger.error('[CUSTOM_TOOLS] Failed to list credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list credentials',
      message: error.message,
    });
  }
});

export default router;
