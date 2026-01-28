import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const response = await fetch(`${BACKEND_URL}/api/calendar/events?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // Return a graceful fallback for development
    console.warn('[CALENDAR_EVENTS] Backend unavailable:', error.message);
    return NextResponse.json({
      events: [],
      message: 'Calendar events not available',
    });
  }
}
