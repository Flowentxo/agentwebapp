import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy endpoint - returns opportunity stages
 * This exists for backward compatibility with older frontend code
 */

export async function GET(req: NextRequest) {
  try {
    // Return standard sales pipeline stages
    const stages = [
      {
        id: 'active',
        name: 'Active',
        color: '#22c55e',
        order: 1
      },
      {
        id: 'pending',
        name: 'Pending',
        color: '#f59e0b',
        order: 2
      },
      {
        id: 'stopped',
        name: 'Stopped',
        color: '#ef4444',
        order: 3
      },
      {
        id: 'archived',
        name: 'Archived',
        color: '#6b7280',
        order: 4
      }
    ];

    return NextResponse.json({
      stages,
      total: stages.length
    });
  } catch (error) {
    console.error('[OPPORTUNITIES_STAGES_API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
