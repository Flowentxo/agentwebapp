/**
 * HUBSPOT OAUTH - CALLBACK
 *
 * Handles HubSpot OAuth callback and exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { hubspotOAuthService } from '@/server/services/HubSpotOAuthService';

/**
 * GET /api/integrations/hubspot/callback
 *
 * Receives authorization code from HubSpot and exchanges it for tokens
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract OAuth parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for authorization errors
    if (error) {
      console.error('[HUBSPOT_CALLBACK] Authorization error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'Authorization code or state parameter is missing',
        },
        { status: 400 }
      );
    }

    // Decode state to get user ID
    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      userId = decodedState.userId;

      if (!userId) {
        throw new Error('User ID not found in state');
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid state parameter',
          message: 'Failed to decode state parameter',
        },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const result = await hubspotOAuthService.handleCallback(code, userId);

    if (!result.success) {
      console.error('[HUBSPOT_CALLBACK] Callback failed:', result.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent(result.error || 'Unknown error')}`
      );
    }

    console.log(`[HUBSPOT_CALLBACK] Successfully connected HubSpot for user: ${userId}`);

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/integrations?success=true&provider=hubspot`
    );
  } catch (error: any) {
    console.error('[HUBSPOT_CALLBACK] Unexpected error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent('Failed to complete authorization')}`
    );
  }
}
