/**
 * REVOLUTION API - CATEGORIES
 *
 * GET /api/revolution/categories
 * Returns all available agent categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { revolutionCategories } from '@/lib/db/schema-revolution';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/revolution/categories
 *
 * Returns all active agent categories
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    // Fetch active categories, ordered by display_order
    const categories = await db
      .select()
      .from(revolutionCategories)
      .where(eq(revolutionCategories.isActive, true))
      .orderBy(revolutionCategories.displayOrder);

    return NextResponse.json({
      success: true,
      count: categories.length,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        displayOrder: cat.displayOrder,
        metadata: cat.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[REVOLUTION_CATEGORIES_GET]', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revolution/categories
 *
 * Create a new category (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    // TODO: Add admin auth check

    const [newCategory] = await db
      .insert(revolutionCategories)
      .values({
        name: body.name,
        slug: body.slug,
        description: body.description,
        icon: body.icon || '📁',
        color: body.color || '#3B82F6',
        displayOrder: body.displayOrder || 0,
        metadata: body.metadata || {},
      })
      .returning();

    return NextResponse.json({
      success: true,
      category: newCategory,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_CATEGORIES_POST]', error);
    return NextResponse.json(
      {
        error: 'Failed to create category',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
