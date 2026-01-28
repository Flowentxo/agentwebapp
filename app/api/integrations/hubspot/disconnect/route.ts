/**
 * HUBSPOT INTEGRATION - DISCONNECT
 *
 * Disconnects HubSpot integration for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { hubspotOAuthService } from '@/server/services/HubSpotOAuthService';

/**
 * POST /api/integrations/hubspot/disconnect
 *
 * Disconnects HubSpot integration
 */
export async function POST(req: NextRequest) {
  try {
    // Get user ID from headers
    const userId = req.headers.get('x-user-id') || 'demo-user';

    // Disconnect
    const result = await hubspotOAuthService.disconnect(userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to disconnect HubSpot',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'HubSpot disconnected successfully',
    });
  } catch (error: any) {
    console.error('[HUBSPOT_DISCONNECT] Error disconnecting:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to disconnect',
      },
      { status: 500 }
    );
  }
}
