/**
 * Pipeline Generator Service
 *
 * Phase 10: AI Autopilot (Text-to-Pipeline Generator)
 *
 * Uses OpenAI to generate pipeline definitions from natural language prompts.
 * Returns nodes and edges that can be loaded directly into the Pipeline Studio.
 *
 * Features:
 * - Sophisticated system prompt with agent definitions
 * - Automatic node positioning to prevent overlaps
 * - JSON mode for reliable structured output
 * - Validation and enhancement of generated pipelines
 */

import { openai } from '@/lib/ai/openai-client';
import { OPENAI_MODEL } from '@/lib/ai/config';
import { classifyOpenAIError } from '@/lib/ai/error-handler';
import { calculateCost } from '@/lib/ai/model-config';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// TYPES
// ============================================

export interface GeneratedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: 'trigger' | 'agent' | 'action' | 'condition' | 'output';
    config: Record<string, unknown>;
  };
}

export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
}

export interface GeneratedPipeline {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  name: string;
  description: string;
}

export interface GenerationResult {
  success: boolean;
  pipeline?: GeneratedPipeline;
  error?: string;
  tokensUsed?: number;
  cost?: number;
}

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `You are an expert Pipeline Architect for a visual workflow automation platform.
Your task is to convert natural language descriptions into structured pipeline definitions.

## NODE TYPES

1. **trigger** - Entry points that start the workflow
   - \`webhook\`: HTTP endpoint trigger (config: { method: "POST"|"GET", path: "/custom-path" })
   - \`schedule\`: Time-based trigger (config: { cron: "0 9 * * *", timezone: "UTC" })
   - \`manual\`: Manual start button (config: {})

2. **agent** - AI agents that process data
   Available agents:
   - \`dexter\`: Data Analyst - analyzes data, metrics, trends (Finance, Analytics)
   - \`cassie\`: Customer Support - handles tickets, classifies issues
   - \`emmie\`: Email Manager - drafts and sends emails
   - \`kai\`: Code Assistant - writes/reviews code
   - \`finn\`: Finance Expert - budgets, forecasts, ROI
   - \`lex\`: Legal Advisor - contracts, compliance

   Agent config: { agentId: "dexter", userPrompt: "Analyze {{trigger.data.input}}" }
   Use \`{{nodeId.path}}\` syntax to reference data from previous nodes.

3. **action** - Perform operations
   - \`database\`: Query/insert data (config: { operation: "query"|"insert"|"update", query: "SELECT..." })
   - \`http\`: Make HTTP requests (config: { url: "https://...", method: "POST", body: {} })
   - \`email\`: Send emails (config: { to: "{{agent.response}}", subject: "...", body: "..." })
   - \`slack\`: Send Slack message (config: { channel: "#alerts", message: "..." })
   - \`code\`: Execute JavaScript (config: { code: "return data.value * 2;" })

4. **condition** - Branch logic
   Config: {
     conditions: [
       { field: "{{agent.confidence}}", operator: ">", value: 0.8 }
     ]
   }
   Operators: "==", "!=", ">", "<", ">=", "<=", "contains", "not_contains"

5. **output** - End points
   Config: { format: "json"|"text", template: "Result: {{agent.response}}" }

## LAYOUT RULES

- Start trigger at position { x: 100, y: 200 }
- Place nodes left-to-right with x spacing of 300px
- For parallel branches, offset y by 150px
- Condition nodes should have "true" path continue right, "false" path go down

## EDGE RULES

- Edge IDs: "e_sourceId_targetId"
- For conditions: use sourceHandle "true" or "false"
- Set animated: true for the main flow path

## OUTPUT FORMAT

Return ONLY valid JSON with this exact structure:
{
  "name": "Pipeline Name",
  "description": "Brief description",
  "nodes": [...],
  "edges": [...]
}

## EXAMPLES

User: "When someone submits a support ticket, classify it with AI and route urgent ones to Slack"

Response:
{
  "name": "Support Ticket Router",
  "description": "Classifies support tickets and routes urgent ones to Slack",
  "nodes": [
    {
      "id": "trigger_1",
      "type": "pipeline-node",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Ticket Webhook",
        "nodeType": "trigger",
        "config": { "triggerType": "webhook", "method": "POST", "path": "/support-ticket" }
      }
    },
    {
      "id": "agent_1",
      "type": "pipeline-node",
      "position": { "x": 400, "y": 200 },
      "data": {
        "label": "Classify Ticket",
        "nodeType": "agent",
        "config": {
          "agentId": "cassie",
          "userPrompt": "Classify this support ticket and determine urgency (high/medium/low):\\n{{trigger_1.body}}"
        }
      }
    },
    {
      "id": "condition_1",
      "type": "pipeline-node",
      "position": { "x": 700, "y": 200 },
      "data": {
        "label": "Is Urgent?",
        "nodeType": "condition",
        "config": {
          "conditions": [
            { "field": "{{agent_1.response}}", "operator": "contains", "value": "high" }
          ]
        }
      }
    },
    {
      "id": "action_1",
      "type": "pipeline-node",
      "position": { "x": 1000, "y": 100 },
      "data": {
        "label": "Alert Slack",
        "nodeType": "action",
        "config": {
          "actionType": "slack",
          "channel": "#urgent-support",
          "message": "URGENT: {{trigger_1.body.subject}}\\n{{agent_1.response}}"
        }
      }
    },
    {
      "id": "output_1",
      "type": "pipeline-node",
      "position": { "x": 1000, "y": 300 },
      "data": {
        "label": "Log Result",
        "nodeType": "output",
        "config": { "format": "json" }
      }
    }
  ],
  "edges": [
    { "id": "e_trigger_1_agent_1", "source": "trigger_1", "target": "agent_1", "animated": true },
    { "id": "e_agent_1_condition_1", "source": "agent_1", "target": "condition_1", "animated": true },
    { "id": "e_condition_1_action_1", "source": "condition_1", "target": "action_1", "sourceHandle": "true", "animated": true },
    { "id": "e_condition_1_output_1", "source": "condition_1", "target": "output_1", "sourceHandle": "false" }
  ]
}

Remember: Return ONLY the JSON object, no markdown code blocks or extra text.`;

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export async function generatePipelineFromPrompt(
  userPrompt: string
): Promise<GenerationResult> {
  console.log(`[PipelineGenerator] Generating pipeline for: "${userPrompt.substring(0, 100)}..."`);

  try {
    // Validate input
    if (!userPrompt?.trim()) {
      return {
        success: false,
        error: 'Please provide a description of the pipeline you want to create.',
      };
    }

    if (userPrompt.length < 10) {
      return {
        success: false,
        error: 'Please provide a more detailed description (at least 10 characters).',
      };
    }

    // Call OpenAI directly with our custom system prompt
    // Use configured model and determine correct token parameter
    const model = OPENAI_MODEL;
    const maxTokensKey = model.includes('gpt-5') || model.includes('gpt-4o')
      ? 'max_completion_tokens'
      : 'max_tokens';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      [maxTokensKey]: 4000, // Need more tokens for complex pipelines
      response_format: { type: 'json_object' }, // Ensure JSON output
    } as any);

    const tokensInput = response.usage?.prompt_tokens || 0;
    const tokensOutput = response.usage?.completion_tokens || 0;
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = calculateCost(model, tokensInput, tokensOutput);
    const content = response.choices[0]?.message?.content || '';

    console.log(`[PipelineGenerator] Received response (${tokensUsed} tokens)`);

    // Parse the JSON response
    let pipeline: GeneratedPipeline;
    try {
      // Clean up the response - remove any markdown code blocks if present
      let jsonStr = content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      pipeline = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[PipelineGenerator] Failed to parse JSON:', parseError);
      console.error('[PipelineGenerator] Raw response:', content);
      return {
        success: false,
        error: 'Failed to generate valid pipeline structure. Please try rephrasing your request.',
        tokensUsed,
        cost,
      };
    }

    // Validate the pipeline structure
    const validationError = validatePipeline(pipeline);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        tokensUsed,
        cost,
      };
    }

    console.log(`[PipelineGenerator] Successfully generated pipeline: "${pipeline.name}" with ${pipeline.nodes.length} nodes`);

    return {
      success: true,
      pipeline,
      tokensUsed,
      cost,
    };
  } catch (error: any) {
    console.error('[PipelineGenerator] Error:', error);
    const classifiedError = classifyOpenAIError(error);
    return {
      success: false,
      error: classifiedError.message || 'An unexpected error occurred',
    };
  }
}

// ============================================
// VALIDATION
// ============================================

function validatePipeline(pipeline: unknown): string | null {
  if (!pipeline || typeof pipeline !== 'object') {
    return 'Invalid pipeline structure';
  }

  const p = pipeline as Record<string, unknown>;

  if (!p.name || typeof p.name !== 'string') {
    return 'Pipeline must have a name';
  }

  if (!Array.isArray(p.nodes)) {
    return 'Pipeline must have a nodes array';
  }

  if (!Array.isArray(p.edges)) {
    return 'Pipeline must have an edges array';
  }

  if (p.nodes.length === 0) {
    return 'Pipeline must have at least one node';
  }

  // Validate each node
  for (const node of p.nodes) {
    if (!node.id || !node.type || !node.position || !node.data) {
      return `Invalid node structure: ${JSON.stringify(node)}`;
    }

    const validNodeTypes = ['trigger', 'agent', 'action', 'condition', 'output'];
    if (!validNodeTypes.includes(node.data.nodeType)) {
      return `Invalid nodeType "${node.data.nodeType}" in node ${node.id}`;
    }
  }

  // Validate edges reference existing nodes
  const nodeIds = new Set(p.nodes.map((n: GeneratedNode) => n.id));
  for (const edge of p.edges) {
    if (!nodeIds.has(edge.source)) {
      return `Edge references non-existent source node: ${edge.source}`;
    }
    if (!nodeIds.has(edge.target)) {
      return `Edge references non-existent target node: ${edge.target}`;
    }
  }

  return null;
}

// ============================================
// EXAMPLE PROMPTS (for UI hints)
// ============================================

export const EXAMPLE_PROMPTS = [
  'When I receive a webhook, analyze the data with AI and send a summary email',
  'Create a daily report that queries our database, analyzes trends, and posts to Slack',
  'Build a customer support classifier that routes urgent tickets to the team',
  'Process incoming invoices: extract data, validate amounts, and update the database',
  'Monitor form submissions, classify with AI, and respond based on category',
];

// ============================================
// QUICK CHIP EXAMPLES (for UI)
// ============================================

export interface QuickExample {
  title: string;
  prompt: string;
  icon: string;
  category: 'support' | 'sales' | 'finance' | 'general';
}

export const QUICK_EXAMPLES: QuickExample[] = [
  {
    title: 'Summarize Support Tickets',
    prompt: 'Every morning at 9am, fetch all open support tickets from the last 24 hours, have Cassie summarize them by category and priority, and send me an email digest.',
    icon: 'MessageSquare',
    category: 'support',
  },
  {
    title: 'Qualify Leads',
    prompt: 'When a new lead comes in via webhook, have Dexter analyze their company and requirements, score them from 1-100, and if score > 70 notify the sales team on Slack, otherwise add to nurture database.',
    icon: 'UserCheck',
    category: 'sales',
  },
  {
    title: 'Invoice Extraction',
    prompt: 'When I receive an email with an invoice attachment, have Dexter extract the vendor name, invoice number, date, line items, and total amount, then save to our finance database as JSON.',
    icon: 'Receipt',
    category: 'finance',
  },
  {
    title: 'Contract Review',
    prompt: 'When a contract document is uploaded via webhook, have Lex review it for key terms, risks, and obligations, then generate a summary report and email it to the legal team.',
    icon: 'FileText',
    category: 'general',
  },
];

// ============================================
// STATIC CLASS WRAPPER (for consistent API)
// ============================================

export class PipelineGenerator {
  /**
   * Generate a pipeline from natural language prompt
   */
  static async generate(prompt: string): Promise<GenerationResult> {
    return generatePipelineFromPrompt(prompt);
  }

  /**
   * Get example prompts for quick selection
   */
  static getExamples(): QuickExample[] {
    return QUICK_EXAMPLES;
  }

  /**
   * Get simple prompt suggestions
   */
  static getPromptSuggestions(): string[] {
    return EXAMPLE_PROMPTS;
  }

  /**
   * Enhance a generated pipeline with additional defaults
   */
  static enhancePipeline(pipeline: GeneratedPipeline): GeneratedPipeline {
    // Ensure all nodes have proper types and colors
    const nodeTypeColors: Record<string, string> = {
      trigger: '#22C55E',
      agent: '#8B5CF6',
      action: '#3B82F6',
      condition: '#F59E0B',
      output: '#EC4899',
    };

    const nodeTypeIcons: Record<string, string> = {
      trigger: 'Zap',
      agent: 'Bot',
      action: 'Send',
      condition: 'GitBranch',
      output: 'Send',
    };

    const enhancedNodes = pipeline.nodes.map((node, index) => ({
      ...node,
      id: node.id || `node-${uuidv4().slice(0, 8)}`,
      type: 'custom', // Ensure React Flow custom type
      position: node.position || { x: 100 + index * 350, y: 200 },
      data: {
        ...node.data,
        type: node.data.nodeType, // Map nodeType to type for compatibility
        color: nodeTypeColors[node.data.nodeType] || '#6366F1',
        icon: nodeTypeIcons[node.data.nodeType] || 'Box',
      },
    }));

    const enhancedEdges = pipeline.edges.map((edge) => ({
      ...edge,
      type: edge.type || 'smoothstep',
      animated: edge.animated !== false,
      style: { stroke: '#6366F1', strokeWidth: 2 },
    }));

    return {
      ...pipeline,
      nodes: enhancedNodes,
      edges: enhancedEdges,
    };
  }
}

export default PipelineGenerator;
