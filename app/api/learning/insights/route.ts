import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const response = await fetch(`${BACKEND_URL}/api/learning/insights`, {
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
    // Return default insights for development
    console.warn('[LEARNING_INSIGHTS] Backend unavailable:', error.message);
    return NextResponse.json({
      success: true,
      insights: {
        currentStreak: 0,
        totalQuestionsAnswered: 0,
        averageRating: 0,
        skillLevel: 'Anfänger',
        weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
      },
    });
  }
}
