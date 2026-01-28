// ============================================================================
// LEVEL 14: PRISMA CLIENT SINGLETON
// Prevents multiple instances in development due to hot reloading
// Prisma 7: Uses pg adapter for direct database connection
//
// FIX-002: Added query timeout extension to prevent 60s+ hangs
// All queries now have a 10-second timeout by default
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Query timeout configuration (in milliseconds)
const QUERY_TIMEOUT_MS = parseInt(process.env.PRISMA_QUERY_TIMEOUT || '10000', 10);
const SLOW_QUERY_THRESHOLD_MS = 2000; // Log queries taking more than 2s

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create a promise that rejects after a timeout
 */
function createTimeoutPromise<T>(timeoutMs: number, operation: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms: ${operation}`));
    }, timeoutMs);
  });
}

function createPrismaClient(): PrismaClient {
  // Create a PostgreSQL connection pool with timeout settings
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings to prevent exhaustion
    max: 10, // Maximum connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout connecting to DB after 5s
    statement_timeout: QUERY_TIMEOUT_MS, // PostgreSQL statement timeout
  });

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  // Create the base Prisma client
  const baseClient = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"] // Reduced logging - removed "query" for performance
        : ["error"],
  });

  // FIX-002: Extend with query timeout and slow query logging
  // This wraps all queries with a timeout to prevent indefinite hangs
  const extendedClient = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const startTime = Date.now();
          const operationName = `${model}.${operation}`;

          try {
            // Race the query against a timeout
            const result = await Promise.race([
              query(args),
              createTimeoutPromise(QUERY_TIMEOUT_MS, operationName),
            ]);

            // Log slow queries for monitoring
            const duration = Date.now() - startTime;
            if (duration > SLOW_QUERY_THRESHOLD_MS) {
              console.warn(
                `[PRISMA] ⚠️ Slow query: ${operationName} took ${duration}ms`
              );
            }

            return result;
          } catch (error: any) {
            const duration = Date.now() - startTime;

            // Enhanced error logging for timeouts
            if (error.message?.includes('Query timeout')) {
              console.error(
                `[PRISMA] ❌ Query timeout: ${operationName} after ${duration}ms`
              );
              console.error(`[PRISMA] Args:`, JSON.stringify(args).slice(0, 200));
            }

            throw error;
          }
        },
      },
    },
  });

  console.log(`[PRISMA] ✅ Client initialized with ${QUERY_TIMEOUT_MS}ms query timeout`);

  return extendedClient as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
