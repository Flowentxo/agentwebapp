/**
 * WORKFLOW GENERATOR SERVICE
 *
 * AI-powered workflow generation from natural language prompts.
 * Uses OpenAI GPT-4 to convert user descriptions into valid React Flow pipelines.
 *
 * Part of Phase 7: AI Workflow Wizard
 */

import OpenAI from 'openai';
import { Node, Edge } from 'reactflow';
import { randomUUID } from 'crypto';
import { OPENAI_MODEL } from '@/lib/ai/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available node types for the AI to use
const AVAILABLE_NODE_TYPES = `
AVAILABLE NODE TYPES:

1. trigger - Entry point for workflow
   - subTypes: "manual" (user clicks run), "webhook" (external HTTP call), "schedule" (cron-based)
   - Required data: { label, triggerType, schedule? (cron string for schedule type) }

2. agent - AI Agent that processes data
   - subTypes: "dexter" (data analysis), "cassie" (customer support), "emmie" (email), "custom"
   - Required data: { label, agentId?, systemPrompt?, model? }

3. action - Performs an operation
   - subTypes: "http" (API call), "database" (DB query), "email" (send email), "slack" (send message), "hubspot" (CRM)
   - Required data: { label, actionType, parameters: {} }

4. condition - Branching logic (if/else)
   - Required data: { label, condition (JavaScript expression) }
   - Has two output handles: "true" and "false"

5. transform - Data transformation
   - Required data: { label, transformType, expression? }

6. delay - Wait for specified time
   - Required data: { label, delay (milliseconds) }

7. human-approval - Pause for human approval
   - Required data: { label, approvalMessage?, timeout? }
`;

const SYSTEM_PROMPT = `You are a Workflow Architect AI specialized in creating visual automation pipelines.

Your task is to convert natural language workflow descriptions into valid React Flow JSON structures.

${AVAILABLE_NODE_TYPES}

RULES:
1. Always start with exactly ONE trigger node
2. Position nodes vertically with ~180px spacing (y-axis)
3. Use horizontal spacing (~250px) for parallel branches
4. Connect all nodes with edges
5. Use meaningful labels that describe what each node does
6. Include appropriate colors for each node type:
   - trigger: #8B5CF6 (purple)
   - agent: #06B6D4 (cyan)
   - action: #3B82F6 (blue)
   - condition: #6366F1 (indigo)
   - transform: #F59E0B (amber)
   - delay: #6B7280 (gray)
   - human-approval: #F97316 (orange)

7. For condition nodes, create edges with sourceHandle "true" or "false"
8. Generate unique IDs for each node (use format: "node-1", "node-2", etc.)
9. Use smoothstep edge type for all connections

OUTPUT FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "name": "Workflow Name",
  "description": "Brief description of what this workflow does",
  "nodes": [...],
  "edges": [...]
}

Do not include any explanation or markdown - just the raw JSON.`;

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export interface GenerationResult {
  success: boolean;
  workflow?: GeneratedWorkflow;
  error?: string;
  rawResponse?: string;
}

/**
 * Generate a workflow from a natural language prompt
 */
export async function generateFromPrompt(userPrompt: string): Promise<GenerationResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    console.log('[WorkflowGenerator] Generating workflow for prompt:', userPrompt);

    // Use configured model and determine correct token parameter
    const model = process.env.OPENAI_MODEL || OPENAI_MODEL;
    const maxTokensKey = model.includes('gpt-5') || model.includes('gpt-4o')
      ? 'max_completion_tokens'
      : 'max_tokens';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Create a workflow for: ${userPrompt}` },
      ],
      [maxTokensKey]: 4000,
      response_format: { type: 'json_object' },
    } as any);

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No response from AI',
      };
    }

    console.log('[WorkflowGenerator] Raw AI response:', content);

    // Parse the JSON response
    let workflow: GeneratedWorkflow;
    try {
      workflow = JSON.parse(content);
    } catch (parseError) {
      console.error('[WorkflowGenerator] JSON parse error:', parseError);
      return {
        success: false,
        error: 'Failed to parse AI response as JSON',
        rawResponse: content,
      };
    }

    // Validate the workflow structure
    const validationError = validateWorkflow(workflow);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        rawResponse: content,
      };
    }

    // Enhance nodes with required React Flow properties
    workflow.nodes = workflow.nodes.map((node, index) => ({
      ...node,
      id: node.id || `node-${index + 1}`,
      position: node.position || { x: 100, y: 100 + index * 180 },
      data: {
        ...node.data,
        label: node.data?.label || `Node ${index + 1}`,
      },
    }));

    // Enhance edges with required properties
    workflow.edges = workflow.edges.map((edge, index) => ({
      ...edge,
      id: edge.id || `edge-${index + 1}`,
      type: edge.type || 'smoothstep',
      animated: edge.animated ?? false,
    }));

    console.log('[WorkflowGenerator] Successfully generated workflow:', workflow.name);

    return {
      success: true,
      workflow,
    };
  } catch (error: any) {
    console.error('[WorkflowGenerator] Error:', error);

    return {
      success: false,
      error: error.message || 'Failed to generate workflow',
    };
  }
}

/**
 * Validate the generated workflow structure
 */
function validateWorkflow(workflow: any): string | null {
  if (!workflow) {
    return 'Workflow is empty';
  }

  if (!workflow.name || typeof workflow.name !== 'string') {
    return 'Workflow must have a name';
  }

  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    return 'Workflow must have at least one node';
  }

  if (!Array.isArray(workflow.edges)) {
    return 'Workflow must have an edges array';
  }

  // Check for trigger node
  const hasTrigger = workflow.nodes.some(
    (node: any) => node.type === 'trigger'
  );
  if (!hasTrigger) {
    return 'Workflow must have a trigger node';
  }

  // Validate each node
  for (const node of workflow.nodes) {
    if (!node.type) {
      return `Node ${node.id || 'unknown'} is missing a type`;
    }
    if (!node.data) {
      return `Node ${node.id || 'unknown'} is missing data`;
    }
  }

  // Validate each edge
  for (const edge of workflow.edges) {
    if (!edge.source || !edge.target) {
      return `Edge ${edge.id || 'unknown'} is missing source or target`;
    }
  }

  return null;
}

/**
 * Generate example workflows for testing
 */
export function getExampleWorkflows(): GeneratedWorkflow[] {
  return [
    {
      name: 'Customer Onboarding',
      description: 'Automated customer onboarding sequence with welcome email and follow-up',
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: { label: 'New Customer Signup', triggerType: 'webhook', color: '#8B5CF6' },
        },
        {
          id: 'node-2',
          type: 'action',
          position: { x: 250, y: 200 },
          data: { label: 'Send Welcome Email', actionType: 'email', color: '#3B82F6' },
        },
        {
          id: 'node-3',
          type: 'delay',
          position: { x: 250, y: 350 },
          data: { label: 'Wait 24 Hours', delay: 86400000, color: '#6B7280' },
        },
        {
          id: 'node-4',
          type: 'agent',
          position: { x: 250, y: 500 },
          data: { label: 'Generate Personalized Tips', agentId: 'emmie', color: '#06B6D4' },
        },
        {
          id: 'node-5',
          type: 'action',
          position: { x: 250, y: 650 },
          data: { label: 'Send Follow-up Email', actionType: 'email', color: '#3B82F6' },
        },
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', type: 'smoothstep' },
        { id: 'e2', source: 'node-2', target: 'node-3', type: 'smoothstep' },
        { id: 'e3', source: 'node-3', target: 'node-4', type: 'smoothstep' },
        { id: 'e4', source: 'node-4', target: 'node-5', type: 'smoothstep' },
      ],
    },
    {
      name: 'Support Ticket Router',
      description: 'AI-powered ticket classification and routing',
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: { label: 'New Ticket Received', triggerType: 'webhook', color: '#8B5CF6' },
        },
        {
          id: 'node-2',
          type: 'agent',
          position: { x: 250, y: 200 },
          data: { label: 'Analyze & Classify', agentId: 'cassie', color: '#06B6D4' },
        },
        {
          id: 'node-3',
          type: 'condition',
          position: { x: 250, y: 350 },
          data: { label: 'Is Urgent?', condition: 'priority === "urgent"', color: '#6366F1' },
        },
        {
          id: 'node-4',
          type: 'action',
          position: { x: 50, y: 500 },
          data: { label: 'Alert Support Team', actionType: 'slack', color: '#3B82F6' },
        },
        {
          id: 'node-5',
          type: 'action',
          position: { x: 450, y: 500 },
          data: { label: 'Queue for Review', actionType: 'database', color: '#3B82F6' },
        },
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', type: 'smoothstep' },
        { id: 'e2', source: 'node-2', target: 'node-3', type: 'smoothstep' },
        { id: 'e3', source: 'node-3', target: 'node-4', sourceHandle: 'true', type: 'smoothstep' },
        { id: 'e4', source: 'node-3', target: 'node-5', sourceHandle: 'false', type: 'smoothstep' },
      ],
    },
  ];
}

export const workflowGenerator = {
  generateFromPrompt,
  getExampleWorkflows,
};

export default workflowGenerator;
