/**
 * PIPELINE TEMPLATES API
 *
 * GET /api/pipelines/templates - List all available templates
 * POST /api/pipelines/templates/clone - Clone a template to user's workflows
 *
 * Part of Phase 7: AI Workflow Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { eq, desc, and, sql } from 'drizzle-orm';
import type {
  PipelineTemplateListItem,
  TemplatesApiResponse,
  TemplateCategory,
  NodeType,
  WorkflowNode,
} from '@/lib/types/pipeline-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache templates for 5 minutes
let cachedTemplates: PipelineTemplateListItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/pipelines/templates
 *
 * Returns all active pipeline templates, sorted by featured status and popularity.
 * Includes category counts and metadata for the template gallery UI.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as TemplateCategory | null;
    const featured = searchParams.get('featured') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const bypassCache = searchParams.get('nocache') === 'true';

    const now = Date.now();
    const isCacheValid = cachedTemplates && (now - cacheTimestamp) < CACHE_TTL_MS && !bypassCache;

    let templates: PipelineTemplateListItem[];

    if (isCacheValid && !category && !featured) {
      // Use cached data for default requests
      templates = cachedTemplates!;
    } else {
      // Fetch from database
      const db = getDb();

      const conditions = [
        eq(workflows.isTemplate, true),
        eq(workflows.status, 'active'),
        eq(workflows.visibility, 'public'),
      ];

      if (category) {
        conditions.push(eq(workflows.templateCategory, category));
      }

      if (featured) {
        conditions.push(eq(workflows.isFeatured, true));
      }

      const rawTemplates = await db
        .select({
          id: workflows.id,
          name: workflows.name,
          description: workflows.description,
          templateCategory: workflows.templateCategory,
          tags: workflows.tags,
          roiBadge: workflows.roiBadge,
          businessBenefit: workflows.businessBenefit,
          complexity: workflows.complexity,
          estimatedSetupMinutes: workflows.estimatedSetupMinutes,
          isFeatured: workflows.isFeatured,
          downloadCount: workflows.downloadCount,
          rating: workflows.rating,
          ratingCount: workflows.ratingCount,
          iconName: workflows.iconName,
          colorAccent: workflows.colorAccent,
          nodes: workflows.nodes,
          edges: workflows.edges,
        })
        .from(workflows)
        .where(and(...conditions))
        .orderBy(
          desc(workflows.isFeatured),
          desc(workflows.downloadCount),
          desc(workflows.rating)
        )
        .limit(limit);

      // Transform to list items
      templates = rawTemplates.map((t): PipelineTemplateListItem => {
        const nodes = (t.nodes || []) as WorkflowNode[];
        const edges = (t.edges || []) as { id: string; source: string; target: string }[];
        const nodeTypes = [...new Set(nodes.map(n => n.type as NodeType))];

        return {
          id: t.id,
          name: t.name,
          description: t.description,
          templateCategory: t.templateCategory as TemplateCategory | null,
          tags: (t.tags || []) as string[],
          roiBadge: t.roiBadge,
          businessBenefit: t.businessBenefit,
          complexity: t.complexity as 'beginner' | 'intermediate' | 'advanced' | null,
          estimatedSetupMinutes: t.estimatedSetupMinutes,
          isFeatured: t.isFeatured || false,
          downloadCount: t.downloadCount || 0,
          rating: parseFloat(t.rating || '0'),
          ratingCount: t.ratingCount || 0,
          iconName: t.iconName || 'Zap',
          colorAccent: t.colorAccent || '#8B5CF6',
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodeTypes,
          nodes,
          edges: edges as any,
        };
      });

      // Update cache for default requests
      if (!category && !featured) {
        cachedTemplates = templates;
        cacheTimestamp = now;
      }
    }

    // Calculate category counts
    const categoryCounts = templates.reduce((acc, t) => {
      const cat = t.templateCategory || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categories = Object.entries(categoryCounts).map(([category, count]) => ({
      category: category as TemplateCategory,
      count,
    }));

    const response: TemplatesApiResponse = {
      success: true,
      data: {
        templates,
        total: templates.length,
        featured: templates.filter(t => t.isFeatured).length,
        categories,
      },
      meta: {
        timestamp: new Date().toISOString(),
        cached: isCacheValid && !category && !featured,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[TEMPLATES_API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch templates',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipelines/templates
 *
 * Increment download count when a template is cloned.
 * (Actual cloning happens in /api/pipelines/templates/clone)
 */
export async function POST(req: NextRequest) {
  try {
    const { templateId, action } = await req.json();

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'templateId is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    if (action === 'increment-download') {
      // Increment download count
      await db
        .update(workflows)
        .set({
          downloadCount: sql`${workflows.downloadCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, templateId));

      // Invalidate cache
      cachedTemplates = null;

      return NextResponse.json({
        success: true,
        message: 'Download count incremented',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[TEMPLATES_API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update template',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
