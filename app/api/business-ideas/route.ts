import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const response = await fetch(`${BACKEND_URL}/api/business-ideas?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy] Business Ideas GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch business ideas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const response = await fetch(`${BACKEND_URL}/api/business-ideas`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy] Business Ideas POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create business idea' },
      { status: 500 }
    );
  }
}
