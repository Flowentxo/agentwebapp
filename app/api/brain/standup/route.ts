/**
 * Brain AI - Standup Generator API
 *
 * POST /api/brain/standup - Generate automated standup report
 *
 * Features:
 * - Multi-source activity aggregation
 * - Noise filtering
 * - Multiple output formats
 * - Team standups
 */

import { NextRequest, NextResponse } from 'next/server';
import { standupGenerator, StandupConfig } from '@/lib/brain/StandupGenerator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StandupRequest {
  workspaceId?: string;
  timeRange?: StandupConfig['timeRange'];
  sources?: StandupConfig['sources'];
  format?: StandupConfig['format'];
  language?: 'de' | 'en';
  teamUserIds?: string[];
  filters?: {
    excludeMinor?: boolean;
    projects?: string[];
  };
}

/**
 * POST - Generate standup report
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body: StandupRequest = await req.json();

    const workspaceId = body.workspaceId || 'default-workspace';

    // Build config
    const config: Partial<StandupConfig> = {
      timeRange: body.timeRange || '24h',
      sources: body.sources || ['tasks', 'documents', 'meetings', 'ideas'],
      format: body.format || 'structured',
      language: body.language || 'de',
      filters: {
        excludeMinor: body.filters?.excludeMinor ?? true,
        projects: body.filters?.projects
      }
    };

    let report;

    if (body.teamUserIds && body.teamUserIds.length > 0) {
      // Generate team standup
      report = await standupGenerator.generateTeamStandup(
        workspaceId,
        body.teamUserIds,
        config
      );
    } else {
      // Generate individual standup
      report = await standupGenerator.generateStandup(
        workspaceId,
        userId,
        config
      );
    }

    return NextResponse.json({
      success: true,
      report: {
        summary: report.summary,
        highlights: report.highlights,
        sections: report.sections,
        metrics: report.metrics,
        timeRange: {
          start: report.timeRange.start.toISOString(),
          end: report.timeRange.end.toISOString()
        },
        generatedAt: report.generatedAt.toISOString(),
        format: report.format
      }
    });
  } catch (error) {
    console.error('[STANDUP_API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate standup' },
      { status: 500 }
    );
  }
}
