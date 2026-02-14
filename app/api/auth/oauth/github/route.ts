/**
 * GitHub OAuth Login - Initiate
 * GET /api/auth/oauth/github
 *
 * Redirects user to GitHub OAuth for login/signup
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  try {
    if (!GITHUB_CLIENT_ID) {
      console.error('[GITHUB_LOGIN] GITHUB_CLIENT_ID is not configured');
      return NextResponse.redirect(new URL('/login?error=oauth_not_configured', BASE_URL));
    }

    const { searchParams } = new URL(req.url);
    const next = searchParams.get('next') || '/v4';

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in a cookie for verification in callback
    const stateData = JSON.stringify({ state, next, type: 'login' });
    const encodedState = Buffer.from(stateData).toString('base64url');

    // Scopes for login (minimal - just user info and email)
    const scopes = ['read:user', 'user:email'];

    // Build GitHub OAuth URL
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${BASE_URL}/api/auth/oauth/github/callback`);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', encodedState);

    console.log('[GITHUB_LOGIN] Redirecting to GitHub OAuth');

    // Set state cookie and redirect
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('oauth_state_github', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[GITHUB_LOGIN] Error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', BASE_URL));
  }
}
