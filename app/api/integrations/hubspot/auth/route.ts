/**
 * HUBSPOT OAUTH - AUTHORIZATION
 *
 * Initiates HubSpot OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { hubspotOAuthService } from '@/server/services/HubSpotOAuthService';

/**
 * GET /api/integrations/hubspot/auth
 *
 * Redirects user to HubSpot authorization page
 */
export async function GET(req: NextRequest) {
  try {
    // Get user ID from headers
    const userId = req.headers.get('x-user-id') || 'demo-user';

    // Generate authorization URL
    // Note: This is now async as it checks DB for credentials
    const authUrl = await hubspotOAuthService.getAuthUrl(userId);

    console.log(`[HUBSPOT_AUTH] Redirecting user ${userId} to HubSpot authorization`);

    // Redirect to HubSpot authorization page
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[HUBSPOT_AUTH] Error initiating OAuth flow:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate HubSpot authorization',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
