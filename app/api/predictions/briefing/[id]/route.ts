import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const response = await fetch(`${BACKEND_URL}/api/predictions/briefing/${params.id}`, {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy] Predictions Briefing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meeting briefing' },
      { status: 500 }
    );
  }
}
