/**
 * GOOGLE OAUTH - AUTHORIZE
 *
 * GET /api/oauth/google/authorize?userId=xxx
 *
 * Redirects user to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing userId',
          message: 'Please provide userId as query parameter',
        },
        { status: 400 }
      );
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error('[GOOGLE_OAUTH] GOOGLE_CLIENT_ID is not configured');
      return NextResponse.json(
        {
          error: 'OAuth not configured',
          message: 'Google OAuth is not properly configured on the server',
        },
        { status: 500 }
      );
    }

    // Required scopes for calendar integration
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    authUrl.searchParams.set('state', userId); // Store userId in state for callback

    console.log(`[GOOGLE_OAUTH] Redirecting user ${userId} to Google authorization`);
    console.log(`[GOOGLE_OAUTH] Redirect URI: ${GOOGLE_REDIRECT_URI}`);
    console.log(`[GOOGLE_OAUTH] Scopes: ${scopes.join(', ')}`);

    // Redirect to Google
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('[GOOGLE_OAUTH] Authorization error:', error);
    return NextResponse.json(
      {
        error: 'Authorization failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
