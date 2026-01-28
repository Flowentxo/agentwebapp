/**
 * HUBSPOT OAUTH - AUTHORIZE
 *
 * GET /api/oauth/hubspot/authorize?userId=xxx
 *
 * Redirects user to HubSpot OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/api/oauth/hubspot/callback';

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

    if (!HUBSPOT_CLIENT_ID) {
      console.error('[HUBSPOT_OAUTH] HUBSPOT_CLIENT_ID is not configured');
      return NextResponse.json(
        {
          error: 'OAuth not configured',
          message: 'HubSpot OAuth is not properly configured on the server',
        },
        { status: 500 }
      );
    }

    // Required scopes for agent integrations
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.schemas.contacts.read',
      'crm.schemas.deals.read',
    ];

    // Build HubSpot OAuth URL
    const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
    authUrl.searchParams.set('client_id', HUBSPOT_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', HUBSPOT_REDIRECT_URI);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', userId); // Store userId in state for callback

    console.log(`[HUBSPOT_OAUTH] Redirecting user ${userId} to HubSpot authorization`);
    console.log(`[HUBSPOT_OAUTH] Redirect URI: ${HUBSPOT_REDIRECT_URI}`);
    console.log(`[HUBSPOT_OAUTH] Scopes: ${scopes.join(', ')}`);

    // Redirect to HubSpot
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('[HUBSPOT_OAUTH] Authorization error:', error);
    return NextResponse.json(
      {
        error: 'Authorization failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
