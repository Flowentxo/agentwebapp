/**
 * DATABASE CONNECTIONS ROUTES
 *
 * Backend API for managing database connections
 */

import express, { Request, Response } from 'express';
import { getDb } from '@/lib/db';
import { dbConnections, type DbConnection, type NewDbConnection } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptPassword, decryptPassword } from '@/lib/security/encryption';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const router = express.Router();

/**
 * GET /api/db-connections
 * List all connections for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const db = getDb();

    const connections = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.userId, userId));

    // Don't send passwords to client
    const sanitized = connections.map(conn => ({
      ...conn,
      password: conn.password ? '********' : undefined
    }));

    res.json({ connections: sanitized });
  } catch (error) {
    console.error('[DB_CONNECTIONS_LIST]', error);
    res.status(500).json({ error: 'Failed to list connections' });
  }
});

/**
 * GET /api/db-connections/:id
 * Get a single connection (without password)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const db = getDb();

    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(
        and(
          eq(dbConnections.id, id),
          eq(dbConnections.userId, userId)
        )
      );

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Don't send password
    const sanitized = {
      ...connection,
      password: connection.password ? '********' : undefined
    };

    res.json({ connection: sanitized });
  } catch (error) {
    console.error('[DB_CONNECTIONS_GET]', error);
    res.status(500).json({ error: 'Failed to get connection' });
  }
});

/**
 * POST /api/db-connections
 * Create a new connection
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const db = getDb();

    const {
      name,
      type,
      host,
      port,
      database,
      username,
      password,
      ssl
    } = req.body;

    // Validate required fields
    if (!name || !type || !host || !port || !database) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Encrypt password if provided
    const encryptedPassword = password ? encryptPassword(password) : null;

    const newConnection: NewDbConnection = {
      userId,
      name,
      type,
      host,
      port,
      database,
      username: username || null,
      password: encryptedPassword,
      ssl: ssl || false,
      status: 'untested'
    };

    const [created] = await db
      .insert(dbConnections)
      .values(newConnection)
      .returning();

    console.log('[DB_CONNECTIONS_CREATE]', `Created connection: ${created.id}`);

    // Don't send password
    const sanitized = {
      ...created,
      password: created.password ? '********' : undefined
    };

    res.status(201).json({ connection: sanitized });
  } catch (error) {
    console.error('[DB_CONNECTIONS_CREATE]', error);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

/**
 * PUT /api/db-connections/:id
 * Update an existing connection
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const db = getDb();

    const {
      name,
      type,
      host,
      port,
      database,
      username,
      password,
      ssl
    } = req.body;

    // Check if connection exists and belongs to user
    const [existing] = await db
      .select()
      .from(dbConnections)
      .where(
        and(
          eq(dbConnections.id, id),
          eq(dbConnections.userId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Prepare update data
    const updateData: Partial<DbConnection> = {
      name: name || existing.name,
      type: type || existing.type,
      host: host || existing.host,
      port: port !== undefined ? port : existing.port,
      database: database || existing.database,
      username: username !== undefined ? username : existing.username,
      ssl: ssl !== undefined ? ssl : existing.ssl,
      updatedAt: new Date(),
      // Reset status when connection details change
      status: 'untested'
    };

    // Handle password update
    if (password && password !== '********') {
      updateData.password = encryptPassword(password);
    }

    const [updated] = await db
      .update(dbConnections)
      .set(updateData)
      .where(
        and(
          eq(dbConnections.id, id),
          eq(dbConnections.userId, userId)
        )
      )
      .returning();

    console.log('[DB_CONNECTIONS_UPDATE]', `Updated connection: ${id}`);

    // Don't send password
    const sanitized = {
      ...updated,
      password: updated.password ? '********' : undefined
    };

    res.json({ connection: sanitized });
  } catch (error) {
    console.error('[DB_CONNECTIONS_UPDATE]', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

/**
 * DELETE /api/db-connections/:id
 * Delete a connection
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const db = getDb();

    // Check if connection exists and belongs to user
    const [existing] = await db
      .select()
      .from(dbConnections)
      .where(
        and(
          eq(dbConnections.id, id),
          eq(dbConnections.userId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await db
      .delete(dbConnections)
      .where(
        and(
          eq(dbConnections.id, id),
          eq(dbConnections.userId, userId)
        )
      );

    console.log('[DB_CONNECTIONS_DELETE]', `Deleted connection: ${id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[DB_CONNECTIONS_DELETE]', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

/**
 * POST /api/db-connections/:id/test
 * Test a connection
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const db = getDb();

    // Get connection details
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(
        and(
          eq(dbConnections.id, id),
          eq(dbConnections.userId, userId)
        )
      );

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Update status to testing
    await db
      .update(dbConnections)
      .set({ status: 'testing', updatedAt: new Date() })
      .where(eq(dbConnections.id, id));

    // Decrypt password
    const password = connection.password ? decryptPassword(connection.password) : '';

    let testResult: { success: boolean; error?: string } = { success: false };

    // Test connection based on type
    try {
      switch (connection.type) {
        case 'postgresql': {
          const pool = new Pool({
            host: connection.host,
            port: connection.port,
            database: connection.database,
            user: connection.username || undefined,
            password: password || undefined,
            ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: 5000,
          });

          const client = await pool.connect();
          await client.query('SELECT 1');
          client.release();
          await pool.end();

          testResult = { success: true };
          break;
        }

        case 'mysql': {
          const mysqlConnection = await mysql.createConnection({
            host: connection.host,
            port: connection.port,
            database: connection.database,
            user: connection.username || undefined,
            password: password || undefined,
            ssl: connection.ssl ? {} : undefined,
            connectTimeout: 5000,
          });

          await mysqlConnection.query('SELECT 1');
          await mysqlConnection.end();

          testResult = { success: true };
          break;
        }

        case 'mongodb': {
          const uri = `mongodb://${connection.username ? `${connection.username}:${password}@` : ''}${connection.host}:${connection.port}/${connection.database}${connection.ssl ? '?ssl=true' : ''}`;
          const client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
          });

          await client.connect();
          await client.db().admin().ping();
          await client.close();

          testResult = { success: true };
          break;
        }

        case 'sqlite': {
          // SQLite doesn't need network testing
          testResult = { success: true };
          break;
        }

        default:
          testResult = {
            success: false,
            error: `Unsupported database type: ${connection.type}`
          };
      }
    } catch (error: any) {
      testResult = {
        success: false,
        error: error.message || 'Connection test failed'
      };
    }

    // Update connection status
    await db
      .update(dbConnections)
      .set({
        status: testResult.success ? 'connected' : 'error',
        lastTested: new Date(),
        lastError: testResult.error || null,
        updatedAt: new Date()
      })
      .where(eq(dbConnections.id, id));

    console.log('[DB_CONNECTIONS_TEST]', `Test ${testResult.success ? 'succeeded' : 'failed'} for: ${id}`);

    res.json(testResult);
  } catch (error) {
    console.error('[DB_CONNECTIONS_TEST]', error);
    res.status(500).json({ success: false, error: 'Failed to test connection' });
  }
});

export default router;
