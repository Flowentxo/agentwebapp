import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy endpoint - redirects to /api/board
 * This exists for backward compatibility with older frontend code
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '100';

    // Get auth cookie from request
    const cookies = req.headers.get('Cookie') || '';

    // Fetch from backend board API
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:4000';

    const response = await fetch(`${backendUrl}/api/board?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch opportunities', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform board cards to opportunities format
    const opportunities = data.cards || [];

    return NextResponse.json({
      opportunities,
      stats: data.stats,
      total: opportunities.length
    });
  } catch (error) {
    console.error('[OPPORTUNITIES_API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
