/**
 * GitHub OAuth Login - Callback
 * GET /api/auth/oauth/github/callback
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

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[GITHUB_CALLBACK] OAuth error:', error);
      return NextResponse.redirect(new URL(`/login?error=${error}`, BASE_URL));
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(new URL('/login?error=missing_code', BASE_URL));
    }

    // Verify state
    const storedState = req.cookies.get('oauth_state_github')?.value;
    let stateData: { state: string; next: string; type: string };

    try {
      stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(new URL('/login?error=invalid_state', BASE_URL));
    }

    if (!storedState || storedState !== stateData.state) {
      console.error('[GITHUB_CALLBACK] State mismatch');
      return NextResponse.redirect(new URL('/login?error=state_mismatch', BASE_URL));
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${BASE_URL}/api/auth/oauth/github/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[GITHUB_CALLBACK] Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', BASE_URL));
    }

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('[GITHUB_CALLBACK] Token error:', tokens.error);
      return NextResponse.redirect(new URL('/login?error=token_error', BASE_URL));
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      console.error('[GITHUB_CALLBACK] Failed to get user info');
      return NextResponse.redirect(new URL('/login?error=user_info_failed', BASE_URL));
    }

    const githubUser: GitHubUser = await userResponse.json();

    // Get user's email (might be private)
    let email = githubUser.email;
    let emailVerified = false;

    if (!email) {
      // Fetch emails separately
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails: GitHubEmail[] = await emailsResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
          emailVerified = primaryEmail.verified;
        } else {
          const verifiedEmail = emails.find((e) => e.verified);
          if (verifiedEmail) {
            email = verifiedEmail.email;
            emailVerified = verifiedEmail.verified;
          }
        }
      }
    }

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', BASE_URL));
    }

    const db = getDb();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0';
    const ua = req.headers.get('user-agent') || 'unknown';

    // Find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Create new user
      console.log('[GITHUB_CALLBACK] Creating new user:', email);

      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          displayName: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url || null,
          emailVerifiedAt: emailVerified ? new Date() : null,
          githubId: String(githubUser.id),
          isActive: true,
          passwordHash: '', // No password for OAuth users
        })
        .returning();

      user = newUser;
      logAuth('oauth_register', { provider: 'github', userId: user.id, ip });
    } else {
      // Update existing user with GitHub info if needed
      if (!user.githubId) {
        await db
          .update(users)
          .set({
            githubId: String(githubUser.id),
            avatarUrl: user.avatarUrl || githubUser.avatar_url,
            emailVerifiedAt: user.emailVerifiedAt || (emailVerified ? new Date() : null),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      logAuth('oauth_login', { provider: 'github', userId: user.id, ip });
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
    response.cookies.delete('oauth_state_github');

    console.log('[GITHUB_CALLBACK] Login successful for:', user.email);
    return response;
  } catch (error: any) {
    console.error('[GITHUB_CALLBACK] Error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_error', BASE_URL));
  }
}
