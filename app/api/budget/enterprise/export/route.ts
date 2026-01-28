/**
 * Enterprise Budget Data Export API
 * GET /api/budget/enterprise/export
 *
 * Exports budget data in various formats for reporting and compliance
 * Supports: JSON, CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { budgetUsageHistory } from '@/lib/db/schema-user-budgets';
import { costCenters, budgetProjects, enterpriseAuditLogs } from '@/lib/db/schema-budget-enterprise';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ExportOptions {
  format: 'json' | 'csv';
  dataType: 'usage' | 'cost-centers' | 'projects' | 'audit-logs' | 'summary';
  startDate?: Date;
  endDate?: Date;
  costCenterId?: string;
  projectId?: string;
}

/**
 * GET /api/budget/enterprise/export
 * Export budget data in specified format
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

    // Parse export options
    const options: ExportOptions = {
      format: (searchParams.get('format') as 'json' | 'csv') || 'json',
      dataType: (searchParams.get('type') as ExportOptions['dataType']) || 'summary',
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date(),
      costCenterId: searchParams.get('costCenterId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
    };

    // Validate format
    if (!['json', 'csv'].includes(options.format)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Format must be json or csv' },
        { status: 400 }
      );
    }

    // Fetch data based on type
    let data: any;
    let filename: string;

    switch (options.dataType) {
      case 'usage':
        data = await exportUsageData(session.user.id, options);
        filename = `budget-usage-${formatDate(options.startDate!)}-${formatDate(options.endDate!)}`;
        break;

      case 'cost-centers':
        data = await exportCostCenters(session.user.id, options);
        filename = `cost-centers-${formatDate(new Date())}`;
        break;

      case 'projects':
        data = await exportProjects(session.user.id, options);
        filename = `projects-${formatDate(new Date())}`;
        break;

      case 'audit-logs':
        data = await exportAuditLogs(session.user.id, options);
        filename = `audit-logs-${formatDate(options.startDate!)}-${formatDate(options.endDate!)}`;
        break;

      case 'summary':
      default:
        data = await exportSummary(session.user.id, options);
        filename = `budget-summary-${formatDate(new Date())}`;
        break;
    }

    // Log export action
    await budgetService.logAuditAction(
      'data.exported',
      'user_action',
      'export',
      session.user.id,
      {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      },
      {
        changeDescription: `Exported ${options.dataType} data in ${options.format} format`,
        metadata: {
          dataType: options.dataType,
          format: options.format,
          dateRange: {
            start: options.startDate?.toISOString(),
            end: options.endDate?.toISOString(),
          },
        },
      }
    );

    // Return based on format
    if (options.format === 'csv') {
      const csv = convertToCSV(data);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // JSON format
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[API] Export error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

async function exportUsageData(userId: string, options: ExportOptions) {
  const db = getDb();

  const conditions = [
    eq(budgetUsageHistory.userId, userId),
    gte(budgetUsageHistory.periodStart, options.startDate!),
    lte(budgetUsageHistory.periodEnd, options.endDate!),
  ];

  if (options.costCenterId) {
    conditions.push(eq(budgetUsageHistory.costCenterId, options.costCenterId));
  }
  if (options.projectId) {
    conditions.push(eq(budgetUsageHistory.projectId, options.projectId));
  }

  const usage = await db
    .select()
    .from(budgetUsageHistory)
    .where(and(...conditions))
    .orderBy(desc(budgetUsageHistory.periodStart));

  return {
    exportDate: new Date().toISOString(),
    exportType: 'usage',
    dateRange: {
      start: options.startDate?.toISOString(),
      end: options.endDate?.toISOString(),
    },
    totalRecords: usage.length,
    summary: {
      totalTokens: usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0),
      totalCost: usage.reduce((sum, u) => sum + parseFloat(String(u.costUsd || 0)), 0),
      totalRequests: usage.reduce((sum, u) => sum + (u.requestCount || 0), 0),
    },
    records: usage.map(u => ({
      date: u.periodStart,
      period: u.period,
      tokensUsed: u.tokensUsed,
      costUsd: parseFloat(String(u.costUsd || 0)),
      requestCount: u.requestCount,
      costCenterId: u.costCenterId,
      projectId: u.projectId,
      modelUsage: u.modelUsage,
      agentUsage: u.agentUsage,
      avgResponseTimeMs: u.avgResponseTimeMs,
      successRate: u.successRate,
      errorCount: u.errorCount,
    })),
  };
}

async function exportCostCenters(userId: string, options: ExportOptions) {
  const centers = await budgetService.getCostCenters('default-org');

  return {
    exportDate: new Date().toISOString(),
    exportType: 'cost-centers',
    totalRecords: centers.length,
    records: centers.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      status: c.status,
      allocatedBudgetUsd: parseFloat(String(c.allocatedBudgetUsd || 0)),
      usedBudgetUsd: parseFloat(String(c.usedBudgetUsd || 0)),
      allocatedTokens: c.allocatedTokens,
      usedTokens: c.usedTokens,
      monthlyBudgetLimitUsd: c.monthlyBudgetLimitUsd
        ? parseFloat(String(c.monthlyBudgetLimitUsd))
        : null,
      monthlyTokenLimit: c.monthlyTokenLimit,
      managerId: c.managerId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  };
}

async function exportProjects(userId: string, options: ExportOptions) {
  const projects = await budgetService.getProjects(options.costCenterId);

  return {
    exportDate: new Date().toISOString(),
    exportType: 'projects',
    totalRecords: projects.length,
    records: projects.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      status: p.status,
      costCenterId: p.costCenterId,
      ownerId: p.ownerId,
      allocatedBudgetUsd: parseFloat(String(p.allocatedBudgetUsd || 0)),
      usedBudgetUsd: parseFloat(String(p.usedBudgetUsd || 0)),
      allocatedTokens: p.allocatedTokens,
      usedTokens: p.usedTokens,
      totalRequests: p.totalRequests,
      startDate: p.startDate,
      endDate: p.endDate,
      completedAt: p.completedAt,
      lastActivityAt: p.lastActivityAt,
      createdAt: p.createdAt,
    })),
  };
}

async function exportAuditLogs(userId: string, options: ExportOptions) {
  const logs = await budgetService.getAuditLogs({
    userId,
    startDate: options.startDate,
    endDate: options.endDate,
    limit: 1000, // Max export size
  });

  return {
    exportDate: new Date().toISOString(),
    exportType: 'audit-logs',
    dateRange: {
      start: options.startDate?.toISOString(),
      end: options.endDate?.toISOString(),
    },
    totalRecords: logs.length,
    records: logs.map(l => ({
      id: l.id,
      timestamp: l.createdAt,
      action: l.action,
      actionCategory: l.actionCategory,
      severity: l.severity,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      resourceName: l.resourceName,
      changeDescription: l.changeDescription,
      userId: l.userId,
      userEmail: l.userEmail,
    })),
  };
}

async function exportSummary(userId: string, options: ExportOptions) {
  const budget = await budgetService.getUserBudget(userId);
  const forecast = await budgetService.calculateForecast(userId);
  const centers = await budgetService.getCostCenters('default-org');
  const projects = await budgetService.getProjects();
  const anomalies = await budgetService.detectAnomalies(userId);

  return {
    exportDate: new Date().toISOString(),
    exportType: 'summary',
    budget: {
      monthlyLimit: parseFloat(String(budget.monthlyCostLimitUsd || 0)),
      dailyLimit: parseFloat(String(budget.dailyCostLimitUsd || 0)),
      currentMonthSpend: parseFloat(String(budget.currentMonthCostUsd || 0)),
      currentDaySpend: parseFloat(String(budget.currentDayCostUsd || 0)),
      currentMonthTokens: budget.currentMonthTokens,
      currentDayTokens: budget.currentDayTokens,
      isEnterprise: budget.isEnterprise,
    },
    forecast: {
      projectedMonthEnd: forecast.projectedMonthEnd,
      projectedOverage: forecast.projectedOverage,
      runOutDate: forecast.runOutDate?.toISOString() || null,
      trend: forecast.trend,
      confidenceScore: forecast.confidenceScore,
      recommendation: forecast.recommendation,
    },
    costCenters: {
      total: centers.length,
      activeCount: centers.filter(c => c.status === 'active').length,
      totalAllocated: centers.reduce(
        (sum, c) => sum + parseFloat(String(c.allocatedBudgetUsd || 0)),
        0
      ),
      totalUsed: centers.reduce(
        (sum, c) => sum + parseFloat(String(c.usedBudgetUsd || 0)),
        0
      ),
    },
    projects: {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      planning: projects.filter(p => p.status === 'planning').length,
      completed: projects.filter(p => p.status === 'completed').length,
    },
    anomalies: {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      warning: anomalies.filter(a => a.severity === 'warning').length,
    },
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function convertToCSV(data: any): string {
  if (!data.records || !Array.isArray(data.records)) {
    // For summary, flatten the object
    return flattenToCSV(data);
  }

  const records = data.records;
  if (records.length === 0) {
    return '';
  }

  // Get headers from first record
  const headers = Object.keys(records[0]);

  // Build CSV
  const csvRows = [
    headers.join(','),
    ...records.map((record: any) =>
      headers
        .map(header => {
          let value = record[header];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          // Escape quotes and wrap in quotes if needed
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ];

  return csvRows.join('\n');
}

function flattenToCSV(obj: any, prefix = ''): string {
  const rows: string[] = [];

  function flatten(o: any, p: string) {
    for (const key of Object.keys(o)) {
      const fullKey = p ? `${p}.${key}` : key;
      if (typeof o[key] === 'object' && o[key] !== null && !Array.isArray(o[key])) {
        flatten(o[key], fullKey);
      } else {
        rows.push(`${fullKey},${JSON.stringify(o[key])}`);
      }
    }
  }

  flatten(obj, prefix);
  return 'Key,Value\n' + rows.join('\n');
}
