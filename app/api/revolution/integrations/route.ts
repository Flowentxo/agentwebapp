/**
 * REVOLUTION API - INTEGRATIONS
 *
 * GET /api/revolution/integrations
 * Returns all available integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { revolutionIntegrations } from '@/lib/db/schema-revolution';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/revolution/integrations
 *
 * Returns all active integrations
 *
 * Query params:
 * - popular: boolean - Filter by popular integrations only
 * - type: string - Filter by integration type (oauth, api_key, webhook)
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const popular = searchParams.get('popular') === 'true';
    const type = searchParams.get('type');

    // Build query
    let query = db
      .select()
      .from(revolutionIntegrations)
      .where(eq(revolutionIntegrations.isActive, true))
      .orderBy(revolutionIntegrations.displayOrder);

    const integrations = await query;

    // Apply filters
    let filtered = integrations;

    if (popular) {
      filtered = filtered.filter((int) => int.isPopular);
    }

    if (type) {
      filtered = filtered.filter((int) => int.type === type);
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      integrations: filtered.map((integration) => ({
        id: integration.id,
        name: integration.name,
        slug: integration.slug,
        description: integration.description,
        provider: integration.provider,
        type: integration.type,
        icon: integration.icon,
        logoUrl: integration.logoUrl,
        authConfig: integration.authConfig,
        capabilities: integration.capabilities,
        docUrl: integration.docUrl,
        setupInstructions: integration.setupInstructions,
        displayOrder: integration.displayOrder,
        isPopular: integration.isPopular,
      })),
    });
  } catch (error: any) {
    console.error('[REVOLUTION_INTEGRATIONS_GET]', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch integrations',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revolution/integrations
 *
 * Create a new integration (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    // TODO: Add admin auth check

    const [newIntegration] = await db
      .insert(revolutionIntegrations)
      .values({
        name: body.name,
        slug: body.slug,
        description: body.description,
        provider: body.provider,
        type: body.type,
        icon: body.icon,
        logoUrl: body.logoUrl,
        authConfig: body.authConfig,
        capabilities: body.capabilities || [],
        docUrl: body.docUrl,
        setupInstructions: body.setupInstructions,
        displayOrder: body.displayOrder || 0,
        isPopular: body.isPopular || false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      integration: newIntegration,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_INTEGRATIONS_POST]', error);
    return NextResponse.json(
      {
        error: 'Failed to create integration',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
