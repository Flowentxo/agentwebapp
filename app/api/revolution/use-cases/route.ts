/**
 * REVOLUTION API - USE CASES
 *
 * GET /api/revolution/use-cases
 * Returns all available use cases, optionally filtered by category
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { revolutionUseCases, revolutionCategories } from '@/lib/db/schema-revolution';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/revolution/use-cases?categoryId=xxx
 *
 * Returns all active use cases, optionally filtered by category
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const categorySlug = searchParams.get('categorySlug');

    // Build query
    let query = db
      .select({
        id: revolutionUseCases.id,
        name: revolutionUseCases.name,
        slug: revolutionUseCases.slug,
        description: revolutionUseCases.description,
        promptTemplate: revolutionUseCases.promptTemplate,
        requiredCapabilities: revolutionUseCases.requiredCapabilities,
        suggestedIntegrations: revolutionUseCases.suggestedIntegrations,
        displayOrder: revolutionUseCases.displayOrder,
        categoryId: revolutionUseCases.categoryId,
        categoryName: revolutionCategories.name,
        categorySlug: revolutionCategories.slug,
      })
      .from(revolutionUseCases)
      .leftJoin(
        revolutionCategories,
        eq(revolutionUseCases.categoryId, revolutionCategories.id)
      )
      .where(eq(revolutionUseCases.isActive, true))
      .orderBy(revolutionUseCases.displayOrder);

    // Filter by category if provided
    if (categoryId) {
      query = query.where(eq(revolutionUseCases.categoryId, categoryId));
    } else if (categorySlug) {
      // Fetch category by slug first
      const category = await db
        .select()
        .from(revolutionCategories)
        .where(eq(revolutionCategories.slug, categorySlug))
        .limit(1);

      if (category.length > 0) {
        query = query.where(eq(revolutionUseCases.categoryId, category[0].id));
      }
    }

    const useCases = await query;

    // Group by category if no filter
    let result;
    if (!categoryId && !categorySlug) {
      const grouped = useCases.reduce((acc: any, useCase) => {
        const categoryKey = useCase.categorySlug || 'uncategorized';
        if (!acc[categoryKey]) {
          acc[categoryKey] = {
            categoryId: useCase.categoryId,
            categoryName: useCase.categoryName,
            categorySlug: useCase.categorySlug,
            useCases: [],
          };
        }
        acc[categoryKey].useCases.push({
          id: useCase.id,
          name: useCase.name,
          slug: useCase.slug,
          description: useCase.description,
          promptTemplate: useCase.promptTemplate,
          requiredCapabilities: useCase.requiredCapabilities,
          suggestedIntegrations: useCase.suggestedIntegrations,
          displayOrder: useCase.displayOrder,
        });
        return acc;
      }, {});

      result = Object.values(grouped);
    } else {
      result = useCases.map((uc) => ({
        id: uc.id,
        name: uc.name,
        slug: uc.slug,
        description: uc.description,
        promptTemplate: uc.promptTemplate,
        requiredCapabilities: uc.requiredCapabilities,
        suggestedIntegrations: uc.suggestedIntegrations,
        displayOrder: uc.displayOrder,
      }));
    }

    return NextResponse.json({
      success: true,
      count: useCases.length,
      data: result,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_USE_CASES_GET]', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch use cases',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revolution/use-cases
 *
 * Create a new use case (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    // TODO: Add admin auth check

    const [newUseCase] = await db
      .insert(revolutionUseCases)
      .values({
        categoryId: body.categoryId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        promptTemplate: body.promptTemplate,
        requiredCapabilities: body.requiredCapabilities || [],
        suggestedIntegrations: body.suggestedIntegrations || [],
        displayOrder: body.displayOrder || 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      useCase: newUseCase,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_USE_CASES_POST]', error);
    return NextResponse.json(
      {
        error: 'Failed to create use case',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
