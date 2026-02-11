/**
 * PIPELINE MODIFIER SERVICE
 *
 * AI-powered pipeline modification from natural language instructions.
 * Takes an existing pipeline (nodes + edges) and a modification prompt,
 * returns the complete modified pipeline with an explanation of changes.
 *
 * Part of Phase IV: Lifecycle Management ("Trainer Mode")
 */

import OpenAI from 'openai';
import { Node, Edge } from 'reactflow';
import { OPENAI_MODEL } from '@/lib/ai/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ─── Types ──────────────────────────────────────────────────────────

export interface ModifyRequest {
  currentNodes: Node[];
  currentEdges: Edge[];
  modificationPrompt: string;
}

export interface ModifyResult {
  success: boolean;
  modifiedNodes?: Node[];
  modifiedEdges?: Edge[];
  explanation?: string;
  changes?: string[];
  error?: string;
}

// ─── System Prompt ──────────────────────────────────────────────────

const MODIFIER_SYSTEM_PROMPT = `You are a Pipeline Modifier AI. You receive an existing workflow pipeline (as nodes and edges in React Flow JSON format) and a modification request in natural language.

Your task is to return the COMPLETE modified pipeline - all nodes and edges, not just the changes.

AVAILABLE NODE TYPES:
- trigger: Entry point (subtypes: manual, webhook, schedule)
- agent: AI Agent (subtypes: dexter, cassie, emmie, custom)
- action: Performs an operation (subtypes: http, database, email, slack, hubspot)
- condition: Branching logic (if/else with "true"/"false" sourceHandles)
- transform: Data transformation
- delay: Wait for specified time
- human-approval: Pause for human approval

RULES:
1. Always maintain exactly ONE trigger node
2. Keep existing node IDs where possible (for stable references)
3. New nodes should use format "node-N" where N is the next available number
4. Position new nodes with ~180px vertical spacing
5. All nodes must be connected via edges
6. Use smoothstep edge type for all connections
7. Use German labels when the existing labels are in German

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "nodes": [...all nodes...],
  "edges": [...all edges...],
  "explanation": "Brief German explanation of what was changed",
  "changes": ["Change 1", "Change 2", ...]
}

Do not include any explanation or markdown - just the raw JSON.`;

// ─── Main Function ──────────────────────────────────────────────────

export async function modifyPipeline(request: ModifyRequest): Promise<ModifyResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    const { currentNodes, currentEdges, modificationPrompt } = request;

    // Build the user message with current pipeline state
    const currentPipeline = JSON.stringify(
      { nodes: currentNodes, edges: currentEdges },
      null,
      2
    );

    const userMessage = `CURRENT PIPELINE:
${currentPipeline}

MODIFICATION REQUEST:
${modificationPrompt}

Return the complete modified pipeline as JSON.`;

    const model = process.env.OPENAI_MODEL || OPENAI_MODEL;
    const maxTokensKey = model.includes('gpt-5') || model.includes('gpt-4o')
      ? 'max_completion_tokens'
      : 'max_tokens';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: MODIFIER_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      [maxTokensKey]: 4000,
      response_format: { type: 'json_object' },
    } as any);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'No response from AI' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'Failed to parse AI response' };
    }

    // Validate structure
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return { success: false, error: 'Invalid response structure' };
    }

    // Ensure nodes have required properties
    const modifiedNodes = parsed.nodes.map((node: any, index: number) => ({
      ...node,
      id: node.id || `node-${index + 1}`,
      position: node.position || { x: 250, y: 100 + index * 180 },
      data: node.data || { label: `Node ${index + 1}` },
    }));

    const modifiedEdges = parsed.edges.map((edge: any, index: number) => ({
      ...edge,
      id: edge.id || `edge-${index + 1}`,
      type: edge.type || 'smoothstep',
    }));

    return {
      success: true,
      modifiedNodes,
      modifiedEdges,
      explanation: parsed.explanation || 'Pipeline wurde modifiziert.',
      changes: parsed.changes || [],
    };
  } catch (error: any) {
    console.error('[PipelineModifier] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to modify pipeline',
    };
  }
}
