import { NextRequest, NextResponse } from 'next/server';
import { saveProviderConfig, hasProviderConfig } from '@/lib/integrations/settings';

// Dynamic route context
interface Context {
  params: {
    provider: string;
  };
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    // In production, get user from session. For now, use header or mock
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const { provider } = params;
    
    const body = await req.json();
    const { clientId, clientSecret, redirectUri } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'clientId and clientSecret are required' },
        { status: 400 }
      );
    }

    console.log(`[CONFIG_POST] Saving config for ${provider} userId=${userId}`);
    console.log(`[CONFIG_POST] Payload:`, { clientId: clientId?.substring(0, 5) + '...', hasSecret: !!clientSecret });

    const result = await saveProviderConfig(userId, provider, {
      clientId,
      clientSecret,
      redirectUri
    });
    console.log(`[CONFIG_POST] Save result:`, result);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[POST /config/${params.provider}] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const { provider } = params;

    let isConfigured = await hasProviderConfig(userId, provider);

    // Fallback: Check global environment variables
    const hasEnvClientId = !!process.env.HUBSPOT_CLIENT_ID;
    const hasEnvClientSecret = !!process.env.HUBSPOT_CLIENT_SECRET;
    
    console.log(`[CONFIG_CHECK] Provider: ${provider}`);
    console.log(`[CONFIG_CHECK] Database Configured: ${isConfigured}`);
    console.log(`[CONFIG_CHECK] Env Vars Present: ID=${hasEnvClientId}, Secret=${hasEnvClientSecret}`);

    if (!isConfigured) {
       // HubSpot Fallback
       if (provider === 'hubspot' && !!process.env.HUBSPOT_CLIENT_ID && !!process.env.HUBSPOT_CLIENT_SECRET) {
         console.log('[CONFIG_CHECK] Using Global Env Vars for HubSpot');
         isConfigured = true;
       }
       // Google Fallback (Gmail/Calendar)
       if (['gmail', 'google-calendar', 'google'].includes(provider) && !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET) {
          console.log('[CONFIG_CHECK] Using Global Env Vars for Google');
          isConfigured = true;
       }
    }

    return NextResponse.json({ configured: isConfigured });
  } catch (error: any) {
    console.error(`[GET /config/${params.provider}] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}
