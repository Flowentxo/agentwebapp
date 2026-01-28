import { NextRequest, NextResponse } from 'next/server';
import { costTrackingService } from '@/server/services/CostTrackingService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cost-tracking/agents/[id]
 * Get cost breakdown for a specific agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const { searchParams } = new URL(req.url);

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let dateRange: { startDate: Date; endDate: Date } | undefined;

    if (startDateParam && endDateParam) {
      dateRange = {
        startDate: new Date(startDateParam),
        endDate: new Date(endDateParam),
      };
    }

    const agentCosts = await costTrackingService.getCostByAgent(agentId, dateRange);

    return NextResponse.json({
      success: true,
      data: agentCosts,
    });
  } catch (error) {
    console.error('[COST_AGENT_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent costs' },
      { status: 500 }
    );
  }
}
