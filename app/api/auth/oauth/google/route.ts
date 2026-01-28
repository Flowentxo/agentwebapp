/**
 * Google OAuth Login - Initiate
 * GET /api/auth/oauth/google
 *
 * Redirects user to Google OAuth for login/signup
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      console.error('[GOOGLE_LOGIN] GOOGLE_CLIENT_ID is not configured');
      return NextResponse.redirect(new URL('/login?error=oauth_not_configured', BASE_URL));
    }

    const { searchParams } = new URL(req.url);
    const next = searchParams.get('next') || '/dashboard';

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in a cookie for verification in callback
    const stateData = JSON.stringify({ state, next, type: 'login' });
    const encodedState = Buffer.from(stateData).toString('base64url');

    // Scopes for login (minimal - just profile info)
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${BASE_URL}/api/auth/oauth/google/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('state', encodedState);

    console.log('[GOOGLE_LOGIN] Redirecting to Google OAuth');

    // Set state cookie and redirect
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[GOOGLE_LOGIN] Error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', BASE_URL));
  }
}
