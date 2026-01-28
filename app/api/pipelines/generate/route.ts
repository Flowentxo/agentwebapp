/**
 * AI PIPELINE GENERATOR API
 *
 * Phase 10: AI Autopilot (Text-to-Pipeline Generator)
 *
 * Generate pipelines from natural language prompts using AI.
 *
 * POST /api/pipelines/generate
 * GET /api/pipelines/generate - Returns example prompts and quick examples
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowGenerator } from '@/server/services/workflow/WorkflowGenerator';
import {
  QUICK_EXAMPLES,
  EXAMPLE_PROMPTS,
} from '@/server/services/workflows/PipelineGenerator';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:pipelines:generate');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/pipelines/generate
 *
 * Returns example prompts and quick examples for the AI generator modal
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    examples: EXAMPLE_PROMPTS,
    quickExamples: QUICK_EXAMPLES,
  });
}

/**
 * POST /api/pipelines/generate
 *
 * Generate a pipeline from a natural language prompt
 * Returns the workflow data without saving to database (for immediate use in editor)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, save = false } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a detailed prompt (at least 10 characters)',
        },
        { status: 400 }
      );
    }

    console.log(`[PIPELINE_GENERATE] Generating pipeline with prompt: ${prompt}`);

    // Generate workflow using AI
    const result = await workflowGenerator.generateFromPrompt(prompt.trim());

    if (!result.success || !result.workflow) {
      console.error('[PIPELINE_GENERATE] Generation failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate pipeline',
          details: result.rawResponse,
        },
        { status: 422 }
      );
    }

    const { workflow } = result;

    // Transform nodes to use pipeline-node type with nodeType in data
    const transformedNodes = workflow.nodes.map((node: any) => ({
      ...node,
      type: 'pipeline-node',
      data: {
        ...node.data,
        nodeType: node.type, // Move the node type into data.nodeType
      },
    }));

    console.log(`[PIPELINE_GENERATE] Successfully generated pipeline: ${workflow.name}`);

    return NextResponse.json({
      success: true,
      pipeline: {
        name: workflow.name,
        description: workflow.description,
        nodes: transformedNodes,
        edges: workflow.edges,
      },
    });
  } catch (error: any) {
    console.error('[PIPELINE_GENERATE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate pipeline',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
