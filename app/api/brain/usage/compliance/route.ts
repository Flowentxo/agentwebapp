/**
 * Brain AI - AI Usage Compliance Report API
 *
 * GET /api/brain/usage/compliance - Generate ISO 42001 compliance report
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiUsageTracker } from '@/lib/brain/AIUsageTracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Generate compliance report
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || 'default-workspace';
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    // Calculate date range
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    // Generate compliance report
    const report = await aiUsageTracker.generateComplianceReport(
      workspaceId,
      from,
      to
    );

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[COMPLIANCE_API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}
