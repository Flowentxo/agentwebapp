/**
 * Brain AI Health Check API
 * Endpoint: GET /api/brain/health
 * Returns status of all Brain AI services
 */

import { NextResponse } from 'next/server';
import { redisCache } from '@/lib/brain/RedisCache';
import { getDb } from '@/lib/db';
import { brainDocuments } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
    };

    // Check PostgreSQL
    try {
      const db = getDb();
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM brain_documents WHERE is_active = true`);
      health.services.postgresql = {
        status: 'healthy',
        documentsCount: (result.rows[0] as any).count,
      };
    } catch (error: any) {
      health.services.postgresql = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Check pgvector extension
    try {
      const db = getDb();
      await db.execute(sql`SELECT '1'::vector`);
      health.services.pgvector = {
        status: 'healthy',
      };
    } catch (error: any) {
      health.services.pgvector = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Check Redis
    try {
      const redisStats = await redisCache.getStats();
      health.services.redis = {
        status: redisStats.connected ? 'healthy' : 'unhealthy',
        connected: redisStats.connected,
        cachedKeys: redisStats.keys,
        memory: redisStats.memory,
      };

      if (!redisStats.connected) {
        health.status = 'degraded';
      }
    } catch (error: any) {
      health.services.redis = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Check OpenAI API key
    health.services.openai = {
      status: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured',
      model: 'text-embedding-3-small',
    };

    if (!process.env.OPENAI_API_KEY) {
      health.status = 'degraded';
    }

    // Overall response time
    health.responseTime = Date.now() - startTime;

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
