import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LOG_LEVELS = ["info", "warn", "error", "debug"] as const;
const LOG_SOURCES = ["api", "database", "cache", "agent", "system"] as const;

// Generate mock log entries
function generateLogEntry(index: number): any {
  const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
  const source = LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)];
  const timestamp = new Date(Date.now() - index * 1000 * 30).toISOString(); // 30s intervals

  const messages: Record<string, string[]> = {
    info: [
      "Request processed successfully",
      "Database connection established",
      "Cache invalidated",
      "Agent task completed",
      "System health check passed",
    ],
    warn: [
      "High memory usage detected",
      "Slow query execution time",
      "Cache miss rate increasing",
      "API rate limit approaching",
      "Background job delayed",
    ],
    error: [
      "Failed to connect to database",
      "API request timeout",
      "Cache write failed",
      "Agent execution error",
      "System resource exhausted",
    ],
    debug: [
      "Debug: Request headers validated",
      "Debug: Cache lookup performed",
      "Debug: Database query executed",
      "Debug: Agent state updated",
      "Debug: System metric collected",
    ],
  };

  const message = messages[level][Math.floor(Math.random() * messages[level].length)];

  return {
    id: `log-${Date.now()}-${index}`,
    timestamp,
    level,
    source,
    message,
    metadata: {
      userId: Math.random() > 0.5 ? `user-${Math.floor(Math.random() * 100)}` : undefined,
      requestId: `req-${Math.random().toString(36).substring(7)}`,
      duration: Math.floor(Math.random() * 1000) + "ms",
    },
  };
}

/**
 * GET /api/admin/logs
 * Get system logs with optional filtering
 * Query params: level, source, limit
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const levelFilter = searchParams.get("level");
  const sourceFilter = searchParams.get("source");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Generate logs
  let logs = Array.from({ length: Math.min(limit, 100) }, (_, i) => generateLogEntry(i));

  // Apply filters
  if (levelFilter) {
    logs = logs.filter((log) => log.level === levelFilter);
  }

  if (sourceFilter) {
    logs = logs.filter((log) => log.source === sourceFilter);
  }

  return NextResponse.json(
    {
      logs: logs.slice(0, limit),
      ts: Date.now(),
      filters: {
        level: levelFilter || "all",
        source: sourceFilter || "all",
      },
    },
    { status: 200 }
  );
}

/**
 * POST /api/admin/logs/stream
 * Simulate streaming logs
 */
export async function POST() {
  // Generate a batch of recent logs
  const logs = Array.from({ length: 5 }, (_, i) => generateLogEntry(i));

  return NextResponse.json(
    {
      logs,
      ts: Date.now(),
      hasMore: true,
    },
    { status: 200 }
  );
}
