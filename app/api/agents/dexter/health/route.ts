/**
 * Dexter Health Check Endpoint
 *
 * GET /api/agents/dexter/health - Check Dexter agent status
 */

import { NextResponse } from 'next/server';
import { getDexterService } from '@/lib/agents/dexter/dexter-service';
import { DEXTER_METADATA } from '@/lib/agents/dexter/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Health check
 */
export async function GET() {
  try {
    const dexter = getDexterService();
    const healthStatus = await dexter.healthCheck();

    return NextResponse.json({
      agent: DEXTER_METADATA.name,
      version: DEXTER_METADATA.version,
      ...healthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        agent: DEXTER_METADATA.name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
