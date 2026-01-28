/**
 * Cache API Endpoint
 *
 * Provides cache statistics and management for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/lib/agents/motion/services/CacheService';

/**
 * GET /api/motion/cache
 *
 * Get cache statistics
 */
export async function GET(req: NextRequest) {
  try {
    const stats = cacheService.getStats();

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          hits: stats.hits,
          misses: stats.misses,
          hitRate: Math.round(stats.hitRate * 100) / 100,
          itemCount: stats.itemCount,
          memoryUsedBytes: stats.memoryUsed,
          memoryUsedMB: Math.round((stats.memoryUsed / 1024 / 1024) * 100) / 100,
          evictions: stats.evictions,
          compressions: stats.compressions,
          avgAccessTimeMs: Math.round(stats.avgAccessTime * 100) / 100,
        },
        health: {
          status: stats.hitRate > 50 ? 'healthy' : stats.hitRate > 20 ? 'degraded' : 'cold',
          recommendation:
            stats.hitRate < 20
              ? 'Cache is cold. Consider warming the cache for frequently accessed data.'
              : stats.hitRate < 50
              ? 'Cache hit rate is below optimal. Consider increasing TTL for stable data.'
              : 'Cache is performing well.',
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[CACHE_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/motion/cache
 *
 * Cache management operations
 *
 * Body:
 * - action: 'clear' | 'invalidate-tag' | 'invalidate-pattern'
 * - tag?: string (for invalidate-tag)
 * - pattern?: string (for invalidate-pattern)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tag, pattern } = body;

    switch (action) {
      case 'clear':
        await cacheService.clear();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully',
        });

      case 'invalidate-tag':
        if (!tag) {
          return NextResponse.json(
            { error: 'tag is required for invalidate-tag action' },
            { status: 400 }
          );
        }
        const tagCount = await cacheService.invalidateByTag(tag);
        return NextResponse.json({
          success: true,
          message: `Invalidated ${tagCount} entries with tag: ${tag}`,
          invalidatedCount: tagCount,
        });

      case 'invalidate-pattern':
        if (!pattern) {
          return NextResponse.json(
            { error: 'pattern is required for invalidate-pattern action' },
            { status: 400 }
          );
        }
        const patternCount = await cacheService.invalidateByPattern(pattern);
        return NextResponse.json({
          success: true,
          message: `Invalidated ${patternCount} entries matching pattern: ${pattern}`,
          invalidatedCount: patternCount,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: clear, invalidate-tag, invalidate-pattern' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CACHE_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/motion/cache
 *
 * Clear all cache entries
 */
export async function DELETE(req: NextRequest) {
  try {
    await cacheService.clear();

    return NextResponse.json({
      success: true,
      message: 'All cache entries cleared',
    });
  } catch (error) {
    console.error('[CACHE_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
