/**
 * OAuth2 Initiate Endpoint - Google
 *
 * Starts the OAuth2 flow with PKCE (Proof Key for Code Exchange)
 *
 * Security Features:
 * - PKCE code_verifier and code_challenge
 * - State parameter for CSRF protection
 * - Secure httpOnly cookies
 * - Service-specific scopes
 *
 * @route POST /api/oauth/google/initiate
 * @body { service: string } OR { services: string[] }
 * @returns { authUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  getOAuthConfig,
} from '@/lib/auth/oauth';
import { getSessionByToken } from '@/lib/auth/session';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';

/**
 * Supported Google services
 */
type GoogleService = 'gmail' | 'calendar' | 'drive' | 'contacts' | 'tasks' | 'sheets' | 'all';

/**
 * Request body interface - supports single service OR array of services
 */
interface InitiateRequest {
  service?: GoogleService;
  services?: GoogleService[]; // Array of services for multi-select modal
}

/**
 * Google OAuth2 Scopes per Service
 * Maps internal service IDs to their required OAuth scopes
 */
const GOOGLE_SERVICE_SCOPES: Record<GoogleService, string[]> = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
  ],
  contacts: [
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  tasks: [
    'https://www.googleapis.com/auth/tasks.readonly',
    'https://www.googleapis.com/auth/tasks',
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
  all: [], // Will be computed dynamically
};

/**
 * Build authorization URL with dynamic scopes for multiple services
 * @throws Error if GOOGLE_CLIENT_ID is not configured
 */
function buildMultiServiceAuthUrl(
  services: GoogleService[],
  codeChallenge: string,
  state: string
): string {
  const config = getOAuthConfig('google');

  // CRITICAL: Validate that client_id is configured
  if (!config.clientId) {
    console.error('[OAUTH_INITIATE] GOOGLE_CLIENT_ID is not set in environment variables');
    throw new Error('GOOGLE_CLIENT_ID is not configured. Please set this environment variable.');
  }

  // Start with base scopes (profile + email)
  const allScopes = new Set<string>(config.scopes);

  // Add scopes for each selected service
  for (const service of services) {
    const serviceScopes = GOOGLE_SERVICE_SCOPES[service] || [];
    serviceScopes.forEach(scope => allScopes.add(scope));
  }

  // Log the configuration for debugging (without exposing secrets)
  console.log('[OAUTH_INITIATE] Building auth URL with:', {
    clientIdPresent: !!config.clientId,
    clientIdLength: config.clientId.length,
    redirectUri: config.redirectUri,
    scopeCount: allScopes.size,
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: Array.from(allScopes).join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen (needed for refresh token)
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * POST /api/oauth/google/initiate
 *
 * Initiates OAuth2 flow by:
 * 1. Generating PKCE challenge
 * 2. Generating state token (CSRF protection)
 * 3. Storing verifier and state in secure cookies
 * 4. Building authorization URL with ONLY selected service scopes
 * 5. Returning URL to frontend
 *
 * Supports two formats:
 * - { service: 'gmail' } - Single service (legacy)
 * - { services: ['gmail', 'calendar'] } - Multiple services (new modal)
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json() as InitiateRequest;
    const { service, services } = body;

    // Validate: must have either service or services array
    const validServices: GoogleService[] = ['gmail', 'calendar', 'drive', 'contacts', 'tasks', 'sheets', 'all'];

    // Normalize to array of services
    let selectedServices: GoogleService[] = [];

    if (services && Array.isArray(services) && services.length > 0) {
      // Multi-service mode (from modal)
      const invalidServices = services.filter(s => !validServices.includes(s));
      if (invalidServices.length > 0) {
        return NextResponse.json(
          { error: `Invalid services: ${invalidServices.join(', ')}` },
          { status: 400 }
        );
      }
      selectedServices = services;
    } else if (service && validServices.includes(service)) {
      // Single service mode (legacy)
      selectedServices = [service];
    } else {
      return NextResponse.json(
        { error: 'Must provide either "service" or "services" array. Valid: gmail, calendar, drive, contacts, tasks, sheets, all' },
        { status: 400 }
      );
    }

    console.log('[OAUTH_INITIATE] Selected services:', selectedServices);

    // Generate PKCE challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Generate state token (CSRF protection)
    const state = generateState();

    // Build authorization URL with ONLY the selected service scopes
    const authUrl = buildMultiServiceAuthUrl(selectedServices, codeChallenge, state);

    // Serialize selected services for storage in cookie
    const servicesString = selectedServices.join(',');

    // Create response with authorization URL
    const response = NextResponse.json({
      authUrl,
      services: selectedServices,
      scopeCount: selectedServices.length,
    });

    // Store PKCE verifier and state in secure httpOnly cookies
    // These will be used in the callback to complete the OAuth flow
    response.cookies.set('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/', // Changed from '/api/oauth' to '/' for broader compatibility
    });

    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/', // Changed from '/api/oauth' to '/' for broader compatibility
    });

    // Store selected services as comma-separated string
    response.cookies.set('oauth_services', servicesString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Get authenticated user ID from session
    let userId = 'demo-user';
    try {
      const sessionToken = getSessionTokenFromRequest(req);
      console.log('[OAUTH_INITIATE] Session token from request:', sessionToken ? 'found' : 'not found');
      if (sessionToken) {
        const session = await getSessionByToken(sessionToken);
        console.log('[OAUTH_INITIATE] Session lookup result:', session ? `userId: ${session.userId}` : 'no session');
        if (session?.userId) {
          userId = session.userId;
          console.log('[OAUTH_INITIATE] Found authenticated user:', userId);
        }
      }
    } catch (err) {
      console.warn('[OAUTH_INITIATE] Failed to get user from session:', err);
    }

    // Fallback to header if session lookup failed
    if (userId === 'demo-user') {
      const headerUserId = req.headers.get('x-user-id');
      if (headerUserId && headerUserId !== 'demo-user') {
        userId = headerUserId;
      }
    }

    console.log('[OAUTH_INITIATE] Using userId:', userId);

    response.cookies.set('oauth_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    // Log initiation (for audit trail)
    console.log('[OAUTH_INITIATE]', {
      provider: 'google',
      services: selectedServices,
      scopeCount: selectedServices.length,
      timestamp: new Date().toISOString(),
    });

    return response;
  } catch (error) {
    console.error('[OAUTH_INITIATE_ERROR]', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific configuration errors
    if (errorMessage.includes('GOOGLE_CLIENT_ID')) {
      return NextResponse.json(
        {
          error: 'OAuth configuration error',
          details: 'Google OAuth is not properly configured. Please contact the administrator.',
          code: 'MISSING_CLIENT_ID',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to initiate OAuth flow',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
