import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/analytics/service';

// GET /api/analytics/dashboard/[id]/data
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const dashboardId = params.id;
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('time_range') || '7d';

  try {
    // 2. Fetch Real Data from Database via Service
    const dashboard = await getDashboardData(dashboardId, timeRange);

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('[AnalyticsAPI] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
