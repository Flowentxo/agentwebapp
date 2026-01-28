/**
 * Prompt Guard API Endpoint
 *
 * Provides prompt injection protection for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { promptGuard } from '@/lib/agents/motion/services/PromptGuardService';

/**
 * POST /api/motion/prompt-guard
 *
 * Analyze a prompt for potential injection attacks
 *
 * Body:
 * - prompt: The prompt to analyze
 * - context?: { userId?: string; agentId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const analysis = promptGuard.analyzePrompt(prompt, context);

    return NextResponse.json({
      success: true,
      data: {
        isSafe: analysis.isSafe,
        threatLevel: analysis.threatLevel,
        score: analysis.score,
        threats: analysis.threats.map((t) => ({
          type: t.type,
          severity: t.severity,
          description: t.description,
          match: t.match.substring(0, 50) + (t.match.length > 50 ? '...' : ''),
        })),
        sanitizedInput: analysis.sanitizedInput,
        recommendations: analysis.recommendations,
      },
    });
  } catch (error) {
    console.error('[PROMPT_GUARD_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/motion/prompt-guard
 *
 * Get prompt guard statistics
 */
export async function GET(req: NextRequest) {
  try {
    const stats = promptGuard.getStats();
    const config = promptGuard.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalChecks: stats.totalChecks,
          blocked: stats.blocked,
          warned: stats.warned,
          passed: stats.passed,
          blockRate: Math.round(stats.blockRate * 100) / 100,
          threatsByType: stats.threatsByType,
        },
        config: {
          blockThreshold: config.blockThreshold,
          warnThreshold: config.warnThreshold,
          sanitizeInputs: config.sanitizeInputs,
          blockOnHighThreat: config.blockOnHighThreat,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[PROMPT_GUARD_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/motion/prompt-guard
 *
 * Update prompt guard configuration
 *
 * Body:
 * - blockThreshold?: number
 * - warnThreshold?: number
 * - sanitizeInputs?: boolean
 * - blockOnHighThreat?: boolean
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { blockThreshold, warnThreshold, sanitizeInputs, blockOnHighThreat } = body;

    const updates: Partial<{
      blockThreshold: number;
      warnThreshold: number;
      sanitizeInputs: boolean;
      blockOnHighThreat: boolean;
    }> = {};

    if (typeof blockThreshold === 'number') {
      updates.blockThreshold = Math.max(0, Math.min(100, blockThreshold));
    }
    if (typeof warnThreshold === 'number') {
      updates.warnThreshold = Math.max(0, Math.min(100, warnThreshold));
    }
    if (typeof sanitizeInputs === 'boolean') {
      updates.sanitizeInputs = sanitizeInputs;
    }
    if (typeof blockOnHighThreat === 'boolean') {
      updates.blockOnHighThreat = blockOnHighThreat;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid configuration updates provided' },
        { status: 400 }
      );
    }

    promptGuard.configure(updates);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated',
      config: promptGuard.getConfig(),
    });
  } catch (error) {
    console.error('[PROMPT_GUARD_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
