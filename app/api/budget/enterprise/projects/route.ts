/**
 * Enterprise Budget Projects API
 * GET/POST /api/budget/enterprise/projects
 *
 * Manages projects for granular cost tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService, type AuditContext } from '@/server/services/BudgetService';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { budgetProjects, costCenters } from '@/lib/db/schema-budget-enterprise';
import { eq, and, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/budget/enterprise/projects
 * List all projects, optionally filtered by cost center
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const costCenterId = searchParams.get('costCenterId') || undefined;
    const status = searchParams.get('status') || undefined;
    const ownerId = searchParams.get('ownerId') || undefined;
    const includeUsage = searchParams.get('includeUsage') === 'true';

    const db = getDb();

    // Build query
    let query = db.select().from(budgetProjects);

    const conditions: any[] = [];
    if (costCenterId) {
      conditions.push(eq(budgetProjects.costCenterId, costCenterId));
    }
    if (ownerId) {
      conditions.push(eq(budgetProjects.ownerId, ownerId));
    }

    let projects;
    if (conditions.length > 0) {
      projects = await query
        .where(and(...conditions))
        .orderBy(desc(budgetProjects.lastActivityAt));
    } else {
      projects = await query.orderBy(desc(budgetProjects.lastActivityAt));
    }

    // Filter by status if provided
    if (status) {
      projects = projects.filter(p => p.status === status);
    }

    // Enrich with cost center name if needed
    let enrichedProjects = projects;
    if (includeUsage) {
      const costCenterIds = [...new Set(projects.map(p => p.costCenterId).filter(Boolean))];
      const centers = costCenterIds.length > 0
        ? await db
            .select({ id: costCenters.id, name: costCenters.name })
            .from(costCenters)
            .where(sql`${costCenters.id} IN ${costCenterIds}`)
        : [];

      const centerMap = new Map(centers.map(c => [c.id, c.name]));

      enrichedProjects = projects.map(p => ({
        ...p,
        costCenterName: p.costCenterId ? centerMap.get(p.costCenterId) : null,
        usagePercentage: p.allocatedBudgetUsd && parseFloat(String(p.allocatedBudgetUsd)) > 0
          ? Math.round(
              (parseFloat(String(p.usedBudgetUsd || 0)) /
                parseFloat(String(p.allocatedBudgetUsd))) *
                10000
            ) / 100
          : 0,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: enrichedProjects,
        total: projects.length,
        summary: {
          active: projects.filter(p => p.status === 'active').length,
          planning: projects.filter(p => p.status === 'planning').length,
          completed: projects.filter(p => p.status === 'completed').length,
          paused: projects.filter(p => p.status === 'paused').length,
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Projects GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/enterprise/projects
 * Create a new project
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      code,
      description,
      costCenterId,
      allocatedBudgetUsd,
      allocatedTokens,
      startDate,
      endDate,
      dailyBudgetLimitUsd,
      dailyTokenLimit,
      allowedModels,
      allowedAgents,
      metadata,
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Build audit context
    const auditContext: AuditContext = {
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role || 'user',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    };

    const project = await budgetService.createProject(
      {
        name,
        code,
        description,
        ownerId: session.user.id,
        costCenterId,
        allocatedBudgetUsd,
        allocatedTokens,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        dailyBudgetLimitUsd,
        dailyTokenLimit,
        allowedModels,
        allowedAgents,
        metadata,
      },
      auditContext
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { project },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Projects POST error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/budget/enterprise/projects
 * Update project status or details
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get current values for audit
    const [currentProject] = await db
      .select()
      .from(budgetProjects)
      .where(eq(budgetProjects.id, id))
      .limit(1);

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Project not found' },
        { status: 404 }
      );
    }

    // Handle date conversions
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    // Update completion timestamp if status changed to completed
    if (updates.status === 'completed' && currentProject.status !== 'completed') {
      updates.completedAt = new Date();
    }

    // Update the project
    const [updatedProject] = await db
      .update(budgetProjects)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(budgetProjects.id, id))
      .returning();

    // Log audit action
    await budgetService.logAuditAction(
      'project.updated',
      'project_change',
      'project',
      id,
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      },
      {
        resourceName: updatedProject.name,
        previousValue: currentProject as Record<string, any>,
        newValue: updates,
        changeDescription: `Project "${updatedProject.name}" updated`,
      }
    );

    return NextResponse.json({
      success: true,
      data: { project: updatedProject },
    });
  } catch (error: any) {
    console.error('[API] Projects PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget/enterprise/projects
 * Archive a project (soft delete)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get current project
    const [currentProject] = await db
      .select()
      .from(budgetProjects)
      .where(eq(budgetProjects.id, id))
      .limit(1);

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Project not found' },
        { status: 404 }
      );
    }

    // Soft delete (archive)
    await db
      .update(budgetProjects)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(budgetProjects.id, id));

    // Log audit action
    await budgetService.logAuditAction(
      'project.archived',
      'project_change',
      'project',
      id,
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      },
      {
        severity: 'warning',
        resourceName: currentProject.name,
        changeDescription: `Project "${currentProject.name}" archived`,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully',
    });
  } catch (error: any) {
    console.error('[API] Projects DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
