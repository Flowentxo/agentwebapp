/**
 * DATABASE QUERY EXECUTOR
 *
 * Executes database queries with security, timeout protection, and result formatting
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import mysql from 'mysql2/promise';
import { getDb } from '@/lib/db';
import { databaseConnections, databaseQueries, toolExecutionLogs } from '@/lib/db/schema-custom-tools';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

// ============================================================
// TYPES
// ============================================================

interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
}

interface DatabaseConnection {
  id: string;
  dbType: 'postgresql' | 'mysql' | 'mongodb';
  encryptedConnectionString: string;
  poolConfig: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
}

interface QueryConfig {
  id: string;
  connectionId: string;
  query: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  parameters: QueryParameter[];
  resultFormat: 'json' | 'csv' | 'array';
  maxRows?: number;
  timeout: number;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  rowCount?: number;
  error?: string;
  durationMs: number;
  fromCache?: boolean;
}

// ============================================================
// DATABASE QUERY EXECUTOR
// ============================================================

export class DatabaseQueryExecutor {
  private static connectionPools: Map<string, Pool | mysql.Pool> = new Map();
  private static resultCache: Map<string, { data: any; expiresAt: number }> = new Map();

  /**
   * Execute a database query
   */
  static async execute(
    queryId: string,
    parameters: Record<string, any>,
    userId?: string,
    workspaceId?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Load query configuration
      const queryConfig = await this.loadQueryConfig(queryId);
      if (!queryConfig) {
        throw new Error(`Query not found: ${queryId}`);
      }

      // Validate and prepare parameters
      const preparedParams = this.prepareParameters(queryConfig.parameters, parameters);

      // Check cache (for SELECT queries only)
      if (queryConfig.queryType === 'SELECT' && queryConfig.cacheEnabled) {
        const cached = this.getCachedResult(queryId, preparedParams);
        if (cached) {
          logger.info(`[DatabaseQueryExecutor] Cache hit for query ${queryId}`);
          return {
            success: true,
            data: cached,
            durationMs: Date.now() - startTime,
            fromCache: true,
          };
        }
      }

      // Load database connection
      const connection = await this.loadConnection(queryConfig.connectionId);
      if (!connection) {
        throw new Error(`Database connection not found: ${queryConfig.connectionId}`);
      }

      // Get or create connection pool
      const pool = await this.getConnectionPool(connection);

      // Execute query with timeout
      const result = await this.executeQuery(
        pool,
        connection.dbType,
        queryConfig.query,
        preparedParams,
        queryConfig.timeout,
        queryConfig.maxRows
      );

      // Format result
      const formattedResult = this.formatResult(
        result,
        queryConfig.resultFormat,
        connection.dbType
      );

      // Cache result (for SELECT queries)
      if (queryConfig.queryType === 'SELECT' && queryConfig.cacheEnabled) {
        this.cacheResult(queryId, preparedParams, formattedResult, queryConfig.cacheTtl || 300);
      }

      const durationMs = Date.now() - startTime;

      // Log execution
      await this.logExecution({
        queryId,
        userId,
        workspaceId,
        input: parameters,
        output: formattedResult,
        status: 'success',
        durationMs,
      });

      return {
        success: true,
        data: formattedResult,
        rowCount: result.rowCount,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      logger.error(`[DatabaseQueryExecutor] Query execution failed:`, error);

      // Log error
      await this.logExecution({
        queryId,
        userId,
        workspaceId,
        input: parameters,
        status: 'error',
        errorMessage: error.message,
        errorStack: error.stack,
        durationMs,
      });

      return {
        success: false,
        error: error.message,
        durationMs,
      };
    }
  }

  /**
   * Load query configuration from database
   */
  private static async loadQueryConfig(queryId: string): Promise<QueryConfig | null> {
    const db = getDb();

    const [queryRecord] = await db
      .select()
      .from(databaseQueries)
      .where(eq(databaseQueries.id, queryId))
      .limit(1);

    if (!queryRecord) {
      return null;
    }

    return {
      id: queryRecord.id,
      connectionId: queryRecord.connectionId,
      query: queryRecord.query,
      queryType: queryRecord.queryType as QueryConfig['queryType'],
      parameters: queryRecord.parameters as QueryParameter[],
      resultFormat: queryRecord.resultFormat as QueryConfig['resultFormat'],
      maxRows: queryRecord.maxRows || undefined,
      timeout: queryRecord.timeout,
      cacheEnabled: queryRecord.cacheEnabled,
      cacheTtl: queryRecord.cacheTtl || undefined,
    };
  }

  /**
   * Load database connection from database
   */
  private static async loadConnection(connectionId: string): Promise<DatabaseConnection | null> {
    const db = getDb();

    const [connectionRecord] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, connectionId))
      .limit(1);

    if (!connectionRecord) {
      return null;
    }

    return {
      id: connectionRecord.id,
      dbType: connectionRecord.dbType as DatabaseConnection['dbType'],
      encryptedConnectionString: connectionRecord.encryptedConnectionString,
      poolConfig: connectionRecord.poolConfig as DatabaseConnection['poolConfig'],
    };
  }

  /**
   * Get or create connection pool
   */
  private static async getConnectionPool(
    connection: DatabaseConnection
  ): Promise<Pool | mysql.Pool> {
    // Check if pool already exists
    if (this.connectionPools.has(connection.id)) {
      return this.connectionPools.get(connection.id)!;
    }

    // Decrypt connection string (TODO: implement encryption/decryption)
    const connectionString = this.decryptConnectionString(connection.encryptedConnectionString);

    // Create pool based on database type
    let pool: Pool | mysql.Pool;

    if (connection.dbType === 'postgresql') {
      pool = new Pool({
        connectionString,
        min: connection.poolConfig.min || 2,
        max: connection.poolConfig.max || 10,
        idleTimeoutMillis: connection.poolConfig.idleTimeoutMillis || 30000,
      });
    } else if (connection.dbType === 'mysql') {
      pool = mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: connection.poolConfig.max || 10,
        queueLimit: 0,
      });
    } else {
      throw new Error(`Unsupported database type: ${connection.dbType}`);
    }

    // Store pool
    this.connectionPools.set(connection.id, pool);

    return pool;
  }

  /**
   * Execute query with timeout protection
   */
  private static async executeQuery(
    pool: Pool | mysql.Pool,
    dbType: string,
    query: string,
    parameters: any[],
    timeout: number,
    maxRows?: number
  ): Promise<QueryResult> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query execution timeout (${timeout}ms)`));
      }, timeout);

      try {
        let result: QueryResult;

        if (dbType === 'postgresql') {
          const pgPool = pool as Pool;
          const client: PoolClient = await pgPool.connect();

          try {
            // Use parameterized query (SQL injection prevention)
            result = await client.query(query, parameters);

            // Limit rows if maxRows specified
            if (maxRows && result.rows.length > maxRows) {
              result.rows = result.rows.slice(0, maxRows);
            }
          } finally {
            client.release();
          }
        } else if (dbType === 'mysql') {
          const mysqlPool = pool as mysql.Pool;
          const [rows] = await mysqlPool.execute(query, parameters);

          result = {
            rows: Array.isArray(rows) ? rows : [],
            rowCount: Array.isArray(rows) ? rows.length : 0,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };

          // Limit rows if maxRows specified
          if (maxRows && result.rows.length > maxRows) {
            result.rows = result.rows.slice(0, maxRows);
          }
        } else {
          throw new Error(`Unsupported database type: ${dbType}`);
        }

        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Prepare and validate parameters
   */
  private static prepareParameters(
    parameterSchema: QueryParameter[],
    providedParams: Record<string, any>
  ): any[] {
    const preparedParams: any[] = [];

    for (const param of parameterSchema) {
      let value = providedParams[param.name];

      // Use default if not provided
      if (value === undefined || value === null) {
        if (param.required) {
          throw new Error(`Required parameter missing: ${param.name}`);
        }
        value = param.default;
      }

      // Type validation and conversion
      value = this.validateAndConvertType(value, param.type, param.name);

      preparedParams.push(value);
    }

    return preparedParams;
  }

  /**
   * Validate and convert parameter type
   */
  private static validateAndConvertType(value: any, expectedType: string, paramName: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (expectedType) {
      case 'string':
        return String(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Parameter ${paramName} must be a number, got: ${value}`);
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new Error(`Parameter ${paramName} must be a boolean, got: ${value}`);

      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Parameter ${paramName} must be an array, got: ${typeof value}`);
        }
        return value;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`Parameter ${paramName} must be an object, got: ${typeof value}`);
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Format query result
   */
  private static formatResult(result: QueryResult, format: string, dbType: string): any {
    const rows = result.rows || [];

    switch (format) {
      case 'json':
        return rows;

      case 'array':
        return rows.map((row: any) => Object.values(row));

      case 'csv':
        if (rows.length === 0) return '';

        const keys = Object.keys(rows[0]);
        const header = keys.join(',');
        const lines = rows.map((row: any) =>
          keys.map((key) => {
            const value = row[key];
            // Escape CSV values
            if (value === null || value === undefined) return '';
            const str = String(value);
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(',')
        );

        return [header, ...lines].join('\n');

      default:
        return rows;
    }
  }

  /**
   * Cache query result
   */
  private static cacheResult(
    queryId: string,
    parameters: any[],
    data: any,
    ttlSeconds: number
  ): void {
    const cacheKey = `${queryId}:${JSON.stringify(parameters)}`;
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.resultCache.set(cacheKey, { data, expiresAt });

    // Cleanup expired cache entries
    this.cleanupCache();
  }

  /**
   * Get cached query result
   */
  private static getCachedResult(queryId: string, parameters: any[]): any | null {
    const cacheKey = `${queryId}:${JSON.stringify(parameters)}`;
    const cached = this.resultCache.get(cacheKey);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.resultCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cleanup expired cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.resultCache.entries()) {
      if (now > value.expiresAt) {
        this.resultCache.delete(key);
      }
    }
  }

  /**
   * Decrypt connection string (placeholder - implement with crypto)
   */
  private static decryptConnectionString(encrypted: string): string {
    // TODO: Implement proper encryption/decryption with crypto module
    // For now, assume it's stored as base64
    try {
      return Buffer.from(encrypted, 'base64').toString('utf-8');
    } catch {
      // If not base64, assume it's plain text (for development)
      return encrypted;
    }
  }

  /**
   * Log query execution
   */
  private static async logExecution(logData: {
    queryId: string;
    userId?: string;
    workspaceId?: string;
    input: any;
    output?: any;
    status: 'success' | 'error';
    errorMessage?: string;
    errorStack?: string;
    durationMs: number;
  }): Promise<void> {
    try {
      const db = getDb();

      await db.insert(toolExecutionLogs).values({
        toolId: logData.queryId,
        workspaceId: logData.workspaceId || null,
        executedBy: logData.userId || null,
        executionType: 'database',
        input: logData.input,
        output: logData.output || null,
        status: logData.status,
        errorMessage: logData.errorMessage || null,
        errorStack: logData.errorStack || null,
        durationMs: logData.durationMs,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Update execution count
      await db
        .update(databaseQueries)
        .set({
          executionCount: (databaseQueries.executionCount as any) + 1,
          lastExecutedAt: new Date(),
        })
        .where(eq(databaseQueries.id, logData.queryId));
    } catch (error) {
      logger.error(`[DatabaseQueryExecutor] Failed to log execution:`, error);
    }
  }

  /**
   * Close all connection pools
   */
  static async closeAllPools(): Promise<void> {
    for (const [id, pool] of this.connectionPools.entries()) {
      try {
        if ('end' in pool) {
          await pool.end();
        }
        this.connectionPools.delete(id);
      } catch (error) {
        logger.error(`[DatabaseQueryExecutor] Failed to close pool ${id}:`, error);
      }
    }
  }
}

export default DatabaseQueryExecutor;
