/**
 * WORKFLOW NODE EXECUTORS (Epic 6 - Updated for Direct Execution)
 *
 * Executors for database queries and webhooks using the new Epic 6 schema
 * with direct execution (no lookup of saved queries/webhooks)
 */

import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutor } from './WorkflowExecutionEngine';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { getDb } from '@/lib/db';
import { dbConnections } from '@/lib/db/schema-connections';
import { eq } from 'drizzle-orm';
import { decryptPassword } from '@/lib/security/encryption';

// ============================================================
// HELPER: VARIABLE RESOLUTION
// ============================================================

/**
 * Resolve workflow variables from context
 * Example: "trigger_1.output.userId" -> context.nodeOutputs.get("trigger_1").output.userId
 */
function resolveVariableValue(variablePath: string, context: ExecutionContext): any {
  if (!variablePath || variablePath.trim() === '') {
    return undefined;
  }

  // Split path (e.g., "trigger_1.output.userId")
  const parts = variablePath.split('.');

  if (parts.length === 0) {
    return undefined;
  }

  // First part is node ID
  const nodeId = parts[0];

  // Get node output from context
  let value = context.nodeOutputs.get(nodeId);

  if (value === undefined) {
    // Try getting from context.variables as fallback
    value = context.variables[nodeId];
  }

  // Navigate nested path
  for (let i = 1; i < parts.length; i++) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[parts[i]];
  }

  return value;
}

/**
 * Apply transform expression to a value
 * Example: "value.toUpperCase()" or "value * 2"
 */
function applyTransform(value: any, transformExpression: string): any {
  if (!transformExpression || transformExpression.trim() === '') {
    return value;
  }

  try {
    // Create safe function with 'value' parameter
    const func = new Function('value', `return ${transformExpression}`);
    return func(value);
  } catch (error: any) {
    console.error('[TRANSFORM_ERROR]', error.message);
    return value; // Return original value on error
  }
}

// ============================================================
// DATABASE QUERY EXECUTOR (Epic 6 - Direct Execution)
// ============================================================

interface ParameterMapping {
  parameterName: string;        // SQL parameter name (e.g., "userId")
  mappedTo: string;              // Workflow variable path (e.g., "trigger_1.output.id")
  transformExpression?: string;  // Optional transform (e.g., "value.toString()")
}

export class DatabaseQueryNodeExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { connectionId, query, parameterMappings } = node.data;

    if (!connectionId) {
      throw new Error('Database connection is required');
    }

    if (!query || query.trim() === '') {
      throw new Error('SQL query is required');
    }

    try {
      const startTime = Date.now();

      // 1. Fetch connection from database
      const db = getDb();
      const [connection] = await db
        .select()
        .from(dbConnections)
        .where(eq(dbConnections.id, connectionId))
        .limit(1);

      if (!connection) {
        throw new Error(`Database connection not found: ${connectionId}`);
      }

      // 2. Decrypt password
      const password = connection.password ? decryptPassword(connection.password) : '';

      // 3. Resolve parameters from workflow context
      const resolvedParams = this.resolveParameters(parameterMappings || [], context);

      // 4. Execute query based on database type
      let result;

      if (connection.type === 'postgresql') {
        result = await this.executePostgreSQLQuery(
          connection,
          password,
          query,
          resolvedParams
        );
      } else if (connection.type === 'mysql') {
        result = await this.executeMySQLQuery(
          connection,
          password,
          query,
          resolvedParams
        );
      } else if (connection.type === 'mongodb') {
        result = await this.executeMongoDBQuery(
          connection,
          password,
          query,
          resolvedParams
        );
      } else if (connection.type === 'sqlite') {
        throw new Error('SQLite execution not yet implemented (requires file path)');
      } else {
        throw new Error(`Unsupported database type: ${connection.type}`);
      }

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        connectionId,
        connectionName: connection.name,
        dbType: connection.type,
        data: result.rows,
        rowCount: result.rowCount,
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Database query execution failed: ${error.message}`);
    }
  }

  /**
   * Resolve parameters from workflow context using parameter mappings
   */
  private resolveParameters(
    mappings: ParameterMapping[],
    context: ExecutionContext
  ): any[] {
    if (!Array.isArray(mappings)) {
      return [];
    }

    const resolved: any[] = [];

    for (const mapping of mappings) {
      // Get value from workflow context
      let value = resolveVariableValue(mapping.mappedTo, context);

      // Apply transform if provided
      if (mapping.transformExpression) {
        value = applyTransform(value, mapping.transformExpression);
      }

      resolved.push(value);
    }

    return resolved;
  }

  /**
   * Execute PostgreSQL query
   */
  private async executePostgreSQLQuery(
    connection: any,
    password: string,
    query: string,
    parameters: any[]
  ): Promise<{ rows: any[]; rowCount: number }> {
    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username || 'postgres',
      password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
      max: 1, // Single connection for workflow execution
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });

    try {
      const client = await pool.connect();

      try {
        const result = await client.query(query, parameters);
        return {
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
        };
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  }

  /**
   * Execute MySQL query
   */
  private async executeMySQLQuery(
    connection: any,
    password: string,
    query: string,
    parameters: any[]
  ): Promise<{ rows: any[]; rowCount: number }> {
    const mysqlConnection = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username || 'root',
      password,
      ssl: connection.ssl ? {} : undefined,
      connectTimeout: 10000,
    });

    try {
      const [rows] = await mysqlConnection.execute(query, parameters);
      return {
        rows: Array.isArray(rows) ? rows : [],
        rowCount: Array.isArray(rows) ? rows.length : 0,
      };
    } finally {
      await mysqlConnection.end();
    }
  }

  /**
   * Execute MongoDB query
   */
  private async executeMongoDBQuery(
    connection: any,
    password: string,
    query: string,
    parameters: any[]
  ): Promise<{ rows: any[]; rowCount: number }> {
    // Build MongoDB connection string
    const username = encodeURIComponent(connection.username || '');
    const encodedPassword = encodeURIComponent(password);
    const authPart = username && password ? `${username}:${encodedPassword}@` : '';
    const sslPart = connection.ssl ? '?ssl=true' : '';

    const connectionString = `mongodb://${authPart}${connection.host}:${connection.port}/${connection.database}${sslPart}`;

    const client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 10000,
    });

    try {
      await client.connect();
      const db = client.db(connection.database);

      // Parse MongoDB query (expected format: { collection: "name", operation: "find", filter: {...} })
      let queryObj;
      try {
        queryObj = typeof query === 'string' ? JSON.parse(query) : query;
      } catch {
        throw new Error('MongoDB query must be valid JSON');
      }

      const { collection, operation = 'find', filter = {}, options = {} } = queryObj;

      if (!collection) {
        throw new Error('MongoDB query must specify a collection');
      }

      const coll = db.collection(collection);

      let rows: any[] = [];

      switch (operation) {
        case 'find':
          rows = await coll.find(filter, options).toArray();
          break;
        case 'findOne':
          const doc = await coll.findOne(filter, options);
          rows = doc ? [doc] : [];
          break;
        case 'aggregate':
          rows = await coll.aggregate(filter).toArray();
          break;
        default:
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
      }

      return {
        rows,
        rowCount: rows.length,
      };
    } finally {
      await client.close();
    }
  }
}

// ============================================================
// WEBHOOK EXECUTOR (Epic 6 - Direct Execution)
// ============================================================

interface PayloadMapping {
  fieldName: string;             // Payload field name (e.g., "userId")
  mappedTo: string;              // Workflow variable path (e.g., "trigger_1.output.id")
  transformExpression?: string;  // Optional transform (e.g., "value.toString()")
}

export class WebhookNodeExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { url, method = 'POST', headers = {}, payloadMappings } = node.data;

    if (!url || url.trim() === '') {
      throw new Error('Webhook URL is required');
    }

    try {
      const startTime = Date.now();

      // 1. Resolve payload from workflow context
      const resolvedPayload = this.resolvePayload(payloadMappings || [], context);

      // 2. Make HTTP request
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method !== 'GET' ? JSON.stringify(resolvedPayload) : undefined,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const durationMs = Date.now() - startTime;

      // 3. Parse response
      let responseData;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        success: true,
        url,
        method,
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Webhook execution failed: ${error.message}`);
    }
  }

  /**
   * Resolve payload from workflow context using payload mappings
   */
  private resolvePayload(
    mappings: PayloadMapping[],
    context: ExecutionContext
  ): Record<string, any> {
    if (!Array.isArray(mappings)) {
      return {};
    }

    const payload: Record<string, any> = {};

    for (const mapping of mappings) {
      // Get value from workflow context
      let value = resolveVariableValue(mapping.mappedTo, context);

      // Apply transform if provided
      if (mapping.transformExpression) {
        value = applyTransform(value, mapping.transformExpression);
      }

      // Set in payload
      payload[mapping.fieldName] = value;
    }

    return payload;
  }
}
