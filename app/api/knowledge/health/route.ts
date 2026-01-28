import { NextRequest } from 'next/server';
import { getDb, checkDbHealth } from '@/lib/db/connection';
import { kbEntries, kbChunks } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { successResponse, handleApiError } from '@/lib/api/http';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const dbHealth = await checkDbHealth();

    const [entriesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbEntries);

    const [chunksCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbChunks)
      .where(eq(kbChunks.isDeleted, false));

    return successResponse({
      ok: dbHealth.healthy,
      checks: {
        database: dbHealth.healthy,
        latencyMs: dbHealth.latencyMs,
      },
      entries: Number(entriesCount.count),
      chunks: Number(chunksCount.count),
      backlog: 0, // TODO: Get from queue
      time: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
