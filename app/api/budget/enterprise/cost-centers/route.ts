/**
 * Enterprise Cost Centers API - Phase 4
 * GET/POST/PUT/PATCH /api/budget/enterprise/cost-centers
 *
 * Features:
 * - Hierarchical cost center management (tree structure)
 * - Budget allocation between departments
 * - Usage statistics and forecasting
 *
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService, type AuditContext } from '@/server/services/BudgetService';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { costCenters, budgetProjects } from '@/lib/db/schema-budget-enterprise';
import { eq, and, sql, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// =====================================================
// TYPES
// =====================================================

interface CostCenterNode {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  parentCostCenterId?: string | null;
  monthlyBudgetLimitUsd: number;
  usedBudgetUsd: number;
  usagePercentage: number;
  managerId?: string | null;
  isActive: boolean;
  projectCount: number;
  children: CostCenterNode[];
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Build tree structure from flat list of cost centers
 */
function buildCostCenterTree(
  centers: any[],
  projectCounts: Map<string, number>
): CostCenterNode[] {
  const nodeMap = new Map<string, CostCenterNode>();
  const roots: CostCenterNode[] = [];

  // First pass: create nodes
  for (const center of centers) {
    const usedBudget = parseFloat(String(center.usedBudgetUsd || 0));
    const budgetLimit = parseFloat(String(center.monthlyBudgetLimitUsd || 0));
    const usagePercentage = budgetLimit > 0 ? (usedBudget / budgetLimit) * 100 : 0;

    nodeMap.set(center.id, {
      id: center.id,
      name: center.name,
      code: center.code,
      description: center.description,
      parentCostCenterId: center.parentCostCenterId,
      monthlyBudgetLimitUsd: budgetLimit,
      usedBudgetUsd: usedBudget,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      managerId: center.managerId,
      isActive: center.isActive !== false,
      projectCount: projectCounts.get(center.id) || 0,
      children: [],
    });
  }

  // Second pass: build tree
  for (const node of nodeMap.values()) {
    if (node.parentCostCenterId && nodeMap.has(node.parentCostCenterId)) {
      nodeMap.get(node.parentCostCenterId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by name
  const sortChildren = (nodes: CostCenterNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

/**
 * Calculate aggregate stats for tree
 */
function calculateTreeAggregates(nodes: CostCenterNode[]): {
  totalBudget: number;
  totalUsed: number;
  totalProjects: number;
} {
  let totalBudget = 0;
  let totalUsed = 0;
  let totalProjects = 0;

  for (const node of nodes) {
    totalBudget += node.monthlyBudgetLimitUsd;
    totalUsed += node.usedBudgetUsd;
    totalProjects += node.projectCount;

    if (node.children.length > 0) {
      const childStats = calculateTreeAggregates(node.children);
      totalBudget += childStats.totalBudget;
      totalUsed += childStats.totalUsed;
      totalProjects += childStats.totalProjects;
    }
  }

  return { totalBudget, totalUsed, totalProjects };
}

// =====================================================
// GET - List Cost Centers (with Tree Structure)
// =====================================================

/**
 * GET /api/budget/enterprise/cost-centers
 *
 * Query params:
 * - organizationId: Filter by organization (default: 'default-org')
 * - format: 'tree' | 'flat' (default: 'flat')
 * - includeStats: 'true' to include usage statistics
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
    const organizationId = searchParams.get('organizationId') || 'default-org';
    const format = searchParams.get('format') || 'flat';
    const includeStats = searchParams.get('includeStats') === 'true';

    const db = getDb();
    const centers = await budgetService.getCostCenters(organizationId);

    // Get project counts per cost center
    const projectCountsResult = await db
      .select({
        costCenterId: budgetProjects.costCenterId,
        count: sql<number>`count(*)::int`,
      })
      .from(budgetProjects)
      .groupBy(budgetProjects.costCenterId);

    const projectCounts = new Map<string, number>();
    for (const row of projectCountsResult) {
      if (row.costCenterId) {
        projectCounts.set(row.costCenterId, row.count);
      }
    }

    // Build response based on format
    if (format === 'tree') {
      const tree = buildCostCenterTree(centers, projectCounts);
      const aggregates = calculateTreeAggregates(tree);

      return NextResponse.json({
        success: true,
        data: {
          tree,
          aggregates: {
            totalCostCenters: centers.length,
            totalBudget: aggregates.totalBudget,
            totalUsed: aggregates.totalUsed,
            totalProjects: aggregates.totalProjects,
            overallUtilization:
              aggregates.totalBudget > 0
                ? Math.round((aggregates.totalUsed / aggregates.totalBudget) * 10000) / 100
                : 0,
          },
        },
      });
    }

    // Flat format with optional stats
    let centersWithStats = centers.map((center) => {
      const usedBudget = parseFloat(String(center.usedBudgetUsd || 0));
      const budgetLimit = parseFloat(String(center.monthlyBudgetLimitUsd || 0));

      return {
        ...center,
        usagePercentage: budgetLimit > 0 ? Math.round((usedBudget / budgetLimit) * 10000) / 100 : 0,
        projectCount: projectCounts.get(center.id) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        costCenters: centersWithStats,
        total: centers.length,
      },
    });
  } catch (error: any) {
    console.error('[API] Cost centers GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/enterprise/cost-centers
 * Create a new cost center
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
      organizationId = 'default-org',
      name,
      code,
      description,
      parentCostCenterId,
      managerId,
      monthlyBudgetLimitUsd,
      monthlyTokenLimit,
      allowOverspend,
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

    const costCenter = await budgetService.createCostCenter(
      {
        organizationId,
        name,
        code,
        description,
        parentCostCenterId,
        managerId: managerId || session.user.id,
        monthlyBudgetLimitUsd,
        monthlyTokenLimit,
        allowOverspend,
        metadata,
      },
      auditContext
    );

    if (!costCenter) {
      return NextResponse.json(
        { error: 'Failed to create cost center' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { costCenter },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Cost centers POST error:', error);

    // Handle unique constraint violation
    if (error.message?.includes('unique') || error.code === '23505') {
      return NextResponse.json(
        { error: 'Conflict', message: 'A cost center with this code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/budget/enterprise/cost-centers
 * Update an existing cost center
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
        { error: 'Bad Request', message: 'Cost center ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get current values for audit
    const [currentCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.id, id))
      .limit(1);

    if (!currentCenter) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Cost center not found' },
        { status: 404 }
      );
    }

    // Update the cost center
    const [updatedCenter] = await db
      .update(costCenters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, id))
      .returning();

    // Log audit action
    await budgetService.logAuditAction(
      'cost_center.updated',
      'cost_center_change',
      'cost_center',
      id,
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      },
      {
        resourceName: updatedCenter.name,
        previousValue: currentCenter as Record<string, any>,
        newValue: updates,
        changeDescription: `Cost center "${updatedCenter.name}" updated`,
      }
    );

    return NextResponse.json({
      success: true,
      data: { costCenter: updatedCenter },
    });
  } catch (error: any) {
    console.error('[API] Cost centers PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Transfer Budget Between Cost Centers
// =====================================================

/**
 * PUT /api/budget/enterprise/cost-centers
 * Transfer budget allocation between cost centers
 *
 * Body:
 * {
 *   sourceCostCenterId: string,
 *   targetCostCenterId: string,
 *   amount: number,
 *   reason: string
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sourceCostCenterId, targetCostCenterId, amount, reason } = body;

    // Validate required fields
    if (!sourceCostCenterId || !targetCostCenterId || !amount) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'sourceCostCenterId, targetCostCenterId, and amount are required',
        },
        { status: 400 }
      );
    }

    if (sourceCostCenterId === targetCostCenterId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Source and target must be different' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Amount must be positive' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get both cost centers
    const [sourceCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.id, sourceCostCenterId))
      .limit(1);

    const [targetCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.id, targetCostCenterId))
      .limit(1);

    if (!sourceCenter || !targetCenter) {
      return NextResponse.json(
        { error: 'Not Found', message: 'One or both cost centers not found' },
        { status: 404 }
      );
    }

    // Check if source has enough budget
    const sourceBudget = parseFloat(String(sourceCenter.monthlyBudgetLimitUsd || 0));
    const sourceUsed = parseFloat(String(sourceCenter.usedBudgetUsd || 0));
    const availableBudget = sourceBudget - sourceUsed;

    // We allow transferring up to the total budget limit (not just available)
    if (amount > sourceBudget) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Cannot transfer more than source budget ($${sourceBudget.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Perform the transfer
    const newSourceBudget = sourceBudget - amount;
    const targetBudget = parseFloat(String(targetCenter.monthlyBudgetLimitUsd || 0));
    const newTargetBudget = targetBudget + amount;

    // Update source (decrease budget)
    const [updatedSource] = await db
      .update(costCenters)
      .set({
        monthlyBudgetLimitUsd: String(newSourceBudget),
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, sourceCostCenterId))
      .returning();

    // Update target (increase budget)
    const [updatedTarget] = await db
      .update(costCenters)
      .set({
        monthlyBudgetLimitUsd: String(newTargetBudget),
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, targetCostCenterId))
      .returning();

    // Build audit context
    const auditContext: AuditContext = {
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role || 'user',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    };

    // Log audit action for transfer
    await budgetService.logAuditAction(
      'cost_center.budget_transferred',
      'allocation',
      'cost_center',
      sourceCostCenterId,
      auditContext,
      {
        severity: 'warning',
        resourceName: `${sourceCenter.name} → ${targetCenter.name}`,
        previousValue: {
          sourceBudget,
          targetBudget,
        },
        newValue: {
          sourceBudget: newSourceBudget,
          targetBudget: newTargetBudget,
          transferAmount: amount,
        },
        changeDescription: `Budget transfer of $${amount.toFixed(2)} from "${sourceCenter.name}" to "${targetCenter.name}". Reason: ${reason || 'Not specified'}`,
        metadata: {
          sourceCostCenterId,
          targetCostCenterId,
          amount,
          reason,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        transfer: {
          from: {
            id: updatedSource.id,
            name: updatedSource.name,
            previousBudget: sourceBudget,
            newBudget: newSourceBudget,
          },
          to: {
            id: updatedTarget.id,
            name: updatedTarget.name,
            previousBudget: targetBudget,
            newBudget: newTargetBudget,
          },
          amount,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Cost centers PUT (transfer) error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
