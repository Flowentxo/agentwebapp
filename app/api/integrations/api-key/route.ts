import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { encrypt } from '@/lib/auth/oauth';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/integrations/api-key
 * 
 * Safely stores a custom API key for an integration.
 * - Authenticates the user
 * - Encrypts the key using AES-256-GCM
 * - Persists to the 'integrations' table
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { provider, name, apiKey, baseUrl, service = 'custom-api', metadata = {} } = body;

    // Validate required fields
    if (!provider || !name || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields: provider, name, or apiKey' }, { status: 400 });
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    const db = getDb();

    // Check if this specific name/service combination already exists for this user/provider
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, provider),
          eq(integrations.service, service),
          eq(integrations.connectedName, name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(integrations)
        .set({
          accessToken: encryptedKey, // Store API key in accessToken field
          metadata: {
            ...metadata,
            baseUrl,
            lastModifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
          status: 'connected',
        })
        .where(eq(integrations.id, existing[0].id));

      return NextResponse.json({ 
        success: true, 
        message: 'Integration updated successfully',
        id: existing[0].id 
      });
    } else {
      // Insert new
      const [newIntegration] = await db.insert(integrations).values({
        userId,
        provider,
        service,
        accessToken: encryptedKey,
        tokenType: 'API_KEY',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10), // Set 10 years expiry for API keys
        connectedName: name,
        status: 'connected',
        metadata: {
          ...metadata,
          baseUrl,
          isCustomApi: true,
        },
        connectedAt: new Date(),
        updatedAt: new Date(),
      }).returning({ id: integrations.id });

      return NextResponse.json({ 
        success: true, 
        message: 'Integration created successfully',
        id: newIntegration.id 
      });
    }

  } catch (error) {
    console.error('[API_KEY_STORAGE_ERROR]', error);
    return NextResponse.json({ 
      error: 'Failed to store credentials',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
