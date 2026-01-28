/**
 * Learning Generate API
 * SECURED: JWT Authentication Required
 * Proxy endpoint for learning question generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthConfigs } from '@/lib/auth/jwt-middleware';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    const body = await req.json();
    
    console.log(`[LEARNING_GENERATE] User: ${auth.userId} generating learning questions`);

    const response = await fetch(`${BACKEND_URL}/api/learning/generate`, {
      method: 'POST',
      headers: {
        'x-user-id': auth.userId,
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    // Log successful generation
    console.log(`[LEARNING_GENERATE] Successfully generated for user: ${auth.userId}`);

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy] Learning Generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate learning questions', user: auth.userId },
      { status: 500 }
    );
  }
}, AuthConfigs.learning);
