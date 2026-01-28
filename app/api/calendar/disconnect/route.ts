import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const response = await fetch(`${BACKEND_URL}/api/calendar/disconnect`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy] Calendar Disconnect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
