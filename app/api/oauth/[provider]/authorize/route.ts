/**
 * Universal OAuth Authorization Endpoint
 * GET /api/oauth/[provider]/authorize
 * POST /api/oauth/[provider]/authorize
 *
 * Initiates OAuth flow for any supported provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildAuthorizationUrl } from '@/lib/integrations/providers/oauth-service';
import { getProviderConfig } from '@/lib/integrations/providers/provider-config';
import { requireSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  return handleAuthorize(request, params.provider);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  return handleAuthorize(request, params.provider);
}

async function handleAuthorize(request: NextRequest, provider: string) {
  try {
    // Require authenticated session
    const session = await requireSession();
    const userId = session.user.id;

    // Get provider config
    const config = getProviderConfig(provider);
    if (!config) {
      return NextResponse.json(
        { error: 'Unknown provider', provider },
        { status: 400 }
      );
    }

    // Check if provider supports OAuth2
    if (config.authType !== 'oauth2') {
      return NextResponse.json(
        { error: 'Provider does not support OAuth2', authType: config.authType },
        { status: 400 }
      );
    }

    // Check if provider is configured
    const clientId = process.env[config.clientIdEnv];
    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Provider not configured',
          message: `Missing ${config.clientIdEnv} environment variable`
        },
        { status: 503 }
      );
    }

    // Get optional parameters
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get('service') || undefined;
    const returnUrl = searchParams.get('returnUrl') || '/agents/integrations';
    const additionalScopes = searchParams.get('scopes')?.split(',').filter(Boolean) || [];

    // Also try to get from body for POST requests
    let bodyParams: { service?: string; returnUrl?: string; scopes?: string[] } = {};
    if (request.method === 'POST') {
      try {
        bodyParams = await request.json();
      } catch {
        // No body, use query params only
      }
    }

    // Build authorization URL
    const { url, state, codeVerifier } = await buildAuthorizationUrl(provider, userId, {
      service: bodyParams.service || service,
      additionalScopes: bodyParams.scopes || additionalScopes,
      returnUrl: bodyParams.returnUrl || returnUrl,
    });

    // Store PKCE verifier and state in secure cookies
    const cookieStore = cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600, // 10 minutes
      path: '/',
    };

    cookieStore.set(`oauth_state_${provider}`, state, cookieOptions);

    if (codeVerifier) {
      cookieStore.set(`oauth_verifier_${provider}`, codeVerifier, cookieOptions);
    }

    // For POST requests, return JSON with URL
    if (request.method === 'POST') {
      return NextResponse.json({ authUrl: url, state });
    }

    // For GET requests, redirect directly
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error(`[OAUTH_AUTHORIZE] ${provider}:`, error);

    // Handle auth errors
    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in first' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Authorization failed', message: error.message },
      { status: 500 }
    );
  }
}
