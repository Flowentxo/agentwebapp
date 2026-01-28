
import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService, ExecutionMetricParams } from '@/lib/analytics/db';

// POST /api/events/ingest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simple Validation (In prod: Use Zod)
    if (!body.agentId || !body.status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Map to internal params
    const metric: ExecutionMetricParams = {
      agentId: body.agentId,
      workspaceId: body.workspaceId || 'default-workspace',
      status: body.status,
      durationMs: body.durationMs || 0,
      tokensUsed: body.tokensUsed || 0,
      cost: body.cost || 0,
      model: body.model || 'unknown',
      errorType: body.errorType
    };

    // 1. Record Metric (Hypertable)
    await AnalyticsService.recordMetric(metric);

    // 2. Broadcast Real-time Event (for Frontend)
    // We call the internal Express API bridge to trigger Socket.IO
    // This is necessary because Next.js API routes run in a separate context
    try {
      const PORT = process.env.PORT || 4000;
      await fetch(`http://localhost:${PORT}/api/analytics/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboardId: 'team-overview', // For now, broadcast to the main dashboard
          data: {
            ...metric,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (broadcastError) {
      console.warn('Broadcast failed (non-critical):', broadcastError);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
