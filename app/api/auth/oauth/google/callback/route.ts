/**
 * Google OAuth Login - Callback
 * GET /api/auth/oauth/google/callback
 *
 * Handles OAuth callback, creates/finds user, creates session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/auth/session';
import { logAuth } from '@/lib/auth/logger';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[GOOGLE_CALLBACK] OAuth error:', error);
      return NextResponse.redirect(new URL(`/login?error=${error}`, BASE_URL));
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(new URL('/login?error=missing_code', BASE_URL));
    }

    // Verify state
    const storedState = req.cookies.get('oauth_state')?.value;
    let stateData: { state: string; next: string; type: string };

    try {
      stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(new URL('/login?error=invalid_state', BASE_URL));
    }

    if (!storedState || storedState !== stateData.state) {
      console.error('[GOOGLE_CALLBACK] State mismatch');
      return NextResponse.redirect(new URL('/login?error=state_mismatch', BASE_URL));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${BASE_URL}/api/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[GOOGLE_CALLBACK] Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', BASE_URL));
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('[GOOGLE_CALLBACK] Failed to get user info');
      return NextResponse.redirect(new URL('/login?error=user_info_failed', BASE_URL));
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', BASE_URL));
    }

    const db = getDb();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0';
    const ua = req.headers.get('user-agent') || 'unknown';

    // Find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, googleUser.email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Create new user
      console.log('[GOOGLE_CALLBACK] Creating new user:', googleUser.email);

      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUser.email.toLowerCase(),
          displayName: googleUser.name || googleUser.email.split('@')[0],
          avatarUrl: googleUser.picture || null,
          emailVerifiedAt: googleUser.email_verified ? new Date() : null,
          googleId: googleUser.sub,
          isActive: true,
          passwordHash: '', // No password for OAuth users
        })
        .returning();

      user = newUser;
      logAuth('oauth_register', { provider: 'google', userId: user.id, ip });
    } else {
      // Update existing user with Google info if needed
      if (!user.googleId) {
        await db
          .update(users)
          .set({
            googleId: googleUser.sub,
            avatarUrl: user.avatarUrl || googleUser.picture,
            emailVerifiedAt: user.emailVerifiedAt || (googleUser.email_verified ? new Date() : null),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      logAuth('oauth_login', { provider: 'google', userId: user.id, ip });
    }

    // Check if user is active
    if (user.isActive === false) {
      return NextResponse.redirect(new URL('/login?error=account_inactive', BASE_URL));
    }

    // Create session
    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent: ua,
      ip,
    });

    // Redirect with session cookie
    const redirectUrl = stateData.next || '/dashboard';
    const response = NextResponse.redirect(new URL(redirectUrl, BASE_URL));

    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    });

    // Clear OAuth state cookie
    response.cookies.delete('oauth_state');

    console.log('[GOOGLE_CALLBACK] Login successful for:', user.email);
    return response;
  } catch (error: any) {
    console.error('[GOOGLE_CALLBACK] Error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_error', BASE_URL));
  }
}
