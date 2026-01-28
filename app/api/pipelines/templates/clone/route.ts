/**
 * CLONE TEMPLATE API
 *
 * POST /api/pipelines/templates/clone
 *
 * Clones a template to the user's workflows, incrementing the template's
 * download count and creating a new draft workflow.
 *
 * Part of Phase 7: AI Workflow Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { CloneTemplateRequest, CloneTemplateResponse } from '@/lib/types/pipeline-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body: CloneTemplateRequest = await req.json();
    const { templateId, name, workspaceId } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'templateId is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Fetch the template
    const [template] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (!template.isTemplate) {
      return NextResponse.json(
        { success: false, error: 'Workflow is not a template' },
        { status: 400 }
      );
    }

    // Generate new workflow name
    const newName = name || `${template.name} (Kopie)`;
    const newWorkflowId = randomUUID();

    // Create the cloned workflow
    await db.insert(workflows).values({
      id: newWorkflowId,
      name: newName,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      status: 'draft',
      visibility: 'private',
      isTemplate: false,
      templateCategory: template.templateCategory,
      tags: [...(template.tags as string[] || []), 'cloned-from-template'],

      // Keep some template metadata for reference
      roiBadge: template.roiBadge,
      businessBenefit: template.businessBenefit,
      complexity: template.complexity,
      iconName: template.iconName,
      colorAccent: template.colorAccent,

      // Reset user-specific fields
      downloadCount: 0,
      rating: '0.0',
      ratingCount: 0,
      isFeatured: false,
      estimatedSetupMinutes: template.estimatedSetupMinutes,
      targetAudience: template.targetAudience,
      useCases: template.useCases,

      // Set ownership
      userId,
      workspaceId: workspaceId || null,
      parentWorkflowId: templateId, // Link to original template

      // Versioning
      version: '1.0.0',
      executionCount: 0,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Increment the template's download count
    await db
      .update(workflows)
      .set({
        downloadCount: sql`${workflows.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, templateId));

    console.log(`[CLONE_TEMPLATE] User ${userId} cloned template ${template.name} (${templateId}) -> ${newWorkflowId}`);

    const response: CloneTemplateResponse = {
      success: true,
      data: {
        workflowId: newWorkflowId,
        name: newName,
        message: `Vorlage "${template.name}" erfolgreich kopiert`,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[CLONE_TEMPLATE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clone template',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
