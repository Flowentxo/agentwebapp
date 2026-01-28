/**
 * Workflow Generator Service
 * Phase 8: AI-Powered Workflow Generation
 *
 * This service uses LLM (GPT-4o/Claude) to generate React Flow workflows
 * from natural language prompts, with proper variable mapping and validation.
 */

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  generateArchitectSystemPrompt,
  generateCurrentWorkflowContext,
  isValidNodeType,
  getNodeDefinition,
  NODE_LIBRARY,
} from './NodeDefinitionPrompt';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface GeneratedWorkflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface GenerationRequest {
  prompt: string;
  currentNodes?: WorkflowNode[];
  currentEdges?: WorkflowEdge[];
  mode: 'create' | 'modify' | 'fix';
  workspaceId?: string;
  userId?: string;
}

export interface GenerationResponse {
  success: boolean;
  workflow?: GeneratedWorkflow;
  explanation?: string;
  suggestions?: string[];
  errors?: string[];
  tokensUsed?: number;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onWorkflow?: (workflow: GeneratedWorkflow) => void;
  onExplanation?: (text: string) => void;
  onComplete?: (response: GenerationResponse) => void;
  onError?: (error: Error) => void;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VariableReference {
  nodeId: string;
  outputPath: string;
  fullPath: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MODEL = process.env.WORKFLOW_AI_MODEL || 'gpt-4o';
const MAX_TOKENS = parseInt(process.env.WORKFLOW_AI_MAX_TOKENS || '4000', 10);
const TEMPERATURE = parseFloat(process.env.WORKFLOW_AI_TEMPERATURE || '0.3');

// ============================================================================
// WorkflowGeneratorService
// ============================================================================

export class WorkflowGeneratorService {
  private openai: OpenAI;
  private conversationHistory: Map<string, ConversationMessage[]>;
  private systemPrompt: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.conversationHistory = new Map();
    this.systemPrompt = generateArchitectSystemPrompt();
  }

  // --------------------------------------------------------------------------
  // Main Generation Methods
  // --------------------------------------------------------------------------

  /**
   * Generates a workflow from a natural language prompt (non-streaming)
   */
  async generateWorkflow(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const messages = this.buildMessages(request);

      const response = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: 'text' },
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      return this.parseResponse(content, tokensUsed);
    } catch (error) {
      console.error('[WORKFLOW_GENERATOR] Generation failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Generates a workflow with streaming response
   */
  async *generateWorkflowStream(
    request: GenerationRequest
  ): AsyncGenerator<{ type: 'token' | 'workflow' | 'explanation' | 'complete'; data: any }> {
    try {
      const messages = this.buildMessages(request);

      const stream = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        stream: true,
      });

      let fullContent = '';
      let inCodeBlock = false;
      let codeBlockContent = '';

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        fullContent += token;

        yield { type: 'token', data: token };

        // Detect JSON code block
        if (token.includes('```json')) {
          inCodeBlock = true;
          codeBlockContent = '';
        } else if (inCodeBlock) {
          if (token.includes('```')) {
            inCodeBlock = false;
            // Try to parse the workflow
            try {
              const workflow = JSON.parse(codeBlockContent) as GeneratedWorkflow;
              const validated = this.validateWorkflow(workflow);
              yield { type: 'workflow', data: validated.workflow };
            } catch (e) {
              // Not valid JSON yet, continue
            }
          } else {
            codeBlockContent += token;
          }
        }
      }

      // Parse final response
      const finalResponse = this.parseResponse(fullContent, 0);
      yield { type: 'complete', data: finalResponse };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Continues a conversation for iterative workflow building
   */
  async continueConversation(
    sessionId: string,
    userMessage: string,
    currentNodes?: WorkflowNode[],
    currentEdges?: WorkflowEdge[]
  ): Promise<GenerationResponse> {
    // Get or initialize conversation history
    let history = this.conversationHistory.get(sessionId) || [];

    // Add current workflow context if provided
    let contextualMessage = userMessage;
    if (currentNodes && currentNodes.length > 0) {
      contextualMessage +=
        '\n\n' + generateCurrentWorkflowContext(currentNodes, currentEdges || []);
    }

    // Add user message to history
    history.push({ role: 'user', content: contextualMessage });

    // Build messages with history
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      });

      const content = response.choices[0]?.message?.content || '';

      // Add assistant response to history
      history.push({ role: 'assistant', content });
      this.conversationHistory.set(sessionId, history);

      return this.parseResponse(content, response.usage?.total_tokens || 0);
    } catch (error) {
      console.error('[WORKFLOW_GENERATOR] Conversation failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Clears conversation history for a session
   */
  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  // --------------------------------------------------------------------------
  // Message Building
  // --------------------------------------------------------------------------

  /**
   * Builds the messages array for the LLM request
   */
  private buildMessages(request: GenerationRequest): OpenAI.ChatCompletionMessageParam[] {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
    ];

    // Add current workflow context if editing
    if (request.mode === 'modify' && request.currentNodes && request.currentNodes.length > 0) {
      const context = generateCurrentWorkflowContext(
        request.currentNodes,
        request.currentEdges || []
      );
      messages.push({
        role: 'system',
        content: `The user wants to modify an existing workflow. Here is the current state:${context}`,
      });
    }

    // Add the user's prompt
    let userPrompt = request.prompt;

    if (request.mode === 'create') {
      userPrompt = `Create a new workflow: ${request.prompt}

Please generate the complete workflow JSON with nodes and edges.`;
    } else if (request.mode === 'modify') {
      userPrompt = `Modify the existing workflow: ${request.prompt}

Update the workflow JSON, preserving unchanged nodes. Return the complete updated workflow.`;
    } else if (request.mode === 'fix') {
      userPrompt = `Fix the workflow issue: ${request.prompt}

Analyze the error and return the corrected workflow JSON.`;
    }

    messages.push({ role: 'user', content: userPrompt });

    return messages;
  }

  // --------------------------------------------------------------------------
  // Response Parsing
  // --------------------------------------------------------------------------

  /**
   * Parses the LLM response to extract workflow and explanation
   */
  private parseResponse(content: string, tokensUsed: number): GenerationResponse {
    try {
      // Extract JSON from code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

      if (!jsonMatch) {
        // Try to find raw JSON
        const rawJsonMatch = content.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
        if (!rawJsonMatch) {
          // No workflow found, return explanation only
          return {
            success: true,
            explanation: content,
            tokensUsed,
          };
        }

        try {
          const workflow = JSON.parse(rawJsonMatch[0]) as GeneratedWorkflow;
          return this.validateAndReturn(workflow, content, tokensUsed);
        } catch {
          return {
            success: false,
            explanation: content,
            errors: ['Could not parse workflow JSON from response'],
            tokensUsed,
          };
        }
      }

      // Parse the JSON from code block
      const workflow = JSON.parse(jsonMatch[1]) as GeneratedWorkflow;

      // Extract explanation (text before/after the code block)
      const explanation = content
        .replace(/```json[\s\S]*?```/g, '')
        .trim();

      return this.validateAndReturn(workflow, explanation, tokensUsed);
    } catch (error) {
      console.error('[WORKFLOW_GENERATOR] Parse error:', error);
      return {
        success: false,
        explanation: content,
        errors: [error instanceof Error ? error.message : 'Failed to parse response'],
        tokensUsed,
      };
    }
  }

  /**
   * Validates the workflow and returns the response
   */
  private validateAndReturn(
    workflow: GeneratedWorkflow,
    explanation: string,
    tokensUsed: number
  ): GenerationResponse {
    const validation = this.validateWorkflow(workflow);

    if (validation.errors.length > 0) {
      return {
        success: false,
        workflow: validation.workflow,
        explanation,
        errors: validation.errors,
        suggestions: validation.suggestions,
        tokensUsed,
      };
    }

    return {
      success: true,
      workflow: validation.workflow,
      explanation,
      suggestions: validation.suggestions,
      tokensUsed,
    };
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  /**
   * Validates the generated workflow for correctness
   */
  validateWorkflow(workflow: GeneratedWorkflow): {
    workflow: GeneratedWorkflow;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    const validatedNodes: WorkflowNode[] = [];
    const validatedEdges: WorkflowEdge[] = [];
    const nodeIds = new Set<string>();

    // Validate nodes
    for (const node of workflow.nodes || []) {
      // Check for valid node type
      if (!isValidNodeType(node.type)) {
        errors.push(`Invalid node type: ${node.type}`);
        continue;
      }

      // Check for unique ID
      if (nodeIds.has(node.id)) {
        const newId = `${node.type}_${uuidv4().slice(0, 8)}`;
        suggestions.push(`Renamed duplicate node ID ${node.id} to ${newId}`);
        node.id = newId;
      }
      nodeIds.add(node.id);

      // Validate position
      if (!node.position || typeof node.position.x !== 'number') {
        node.position = { x: 100, y: validatedNodes.length * 150 };
        suggestions.push(`Auto-positioned node ${node.id}`);
      }

      // Validate data
      if (!node.data) {
        node.data = { label: node.id, config: {} };
      }
      if (!node.data.label) {
        node.data.label = node.id;
      }
      if (!node.data.config) {
        node.data.config = {};
      }

      // Validate variable references in config
      const variableErrors = this.validateVariableReferences(node.data.config, nodeIds, node.id);
      errors.push(...variableErrors);

      validatedNodes.push(node);
    }

    // Validate edges
    for (const edge of workflow.edges || []) {
      // Check source and target exist
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
        continue;
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
        continue;
      }

      // Ensure edge has an ID
      if (!edge.id) {
        edge.id = `edge_${edge.source}_${edge.target}`;
      }

      // Validate handles exist on node types
      const sourceNode = validatedNodes.find((n) => n.id === edge.source);
      const targetNode = validatedNodes.find((n) => n.id === edge.target);

      if (sourceNode && edge.sourceHandle) {
        const sourceNodeDef = getNodeDefinition(sourceNode.type);
        if (sourceNodeDef && !sourceNodeDef.outputs.some((o) => o.id === edge.sourceHandle)) {
          suggestions.push(
            `Source handle "${edge.sourceHandle}" may not exist on ${sourceNode.type}`
          );
        }
      }

      if (targetNode && edge.targetHandle) {
        const targetNodeDef = getNodeDefinition(targetNode.type);
        if (targetNodeDef && !targetNodeDef.inputs.some((i) => i.id === edge.targetHandle)) {
          suggestions.push(
            `Target handle "${edge.targetHandle}" may not exist on ${targetNode.type}`
          );
        }
      }

      validatedEdges.push(edge);
    }

    // Check for orphan nodes (no connections)
    for (const node of validatedNodes) {
      const hasConnection = validatedEdges.some(
        (e) => e.source === node.id || e.target === node.id
      );
      if (!hasConnection && validatedNodes.length > 1) {
        suggestions.push(`Node ${node.id} has no connections`);
      }
    }

    // Check for trigger node
    const hasTrigger = validatedNodes.some((n) => n.type.startsWith('trigger_'));
    if (!hasTrigger && validatedNodes.length > 0) {
      suggestions.push('Workflow has no trigger node - it won\'t start automatically');
    }

    return {
      workflow: { nodes: validatedNodes, edges: validatedEdges },
      errors,
      suggestions,
    };
  }

  /**
   * Validates variable references in node configuration
   */
  private validateVariableReferences(
    config: Record<string, any>,
    existingNodeIds: Set<string>,
    currentNodeId: string
  ): string[] {
    const errors: string[] = [];
    const variablePattern = /\{\{([^}]+)\}\}/g;

    const checkValue = (value: any, path: string): void => {
      if (typeof value === 'string') {
        let match;
        while ((match = variablePattern.exec(value)) !== null) {
          const ref = match[1];
          const parts = ref.split('.');
          const referencedNodeId = parts[0];

          // Check if referenced node exists (and it's not the current node)
          if (referencedNodeId !== currentNodeId && !existingNodeIds.has(referencedNodeId)) {
            errors.push(
              `Variable reference {{${ref}}} in ${currentNodeId}.${path} references non-existent node "${referencedNodeId}"`
            );
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, `${path}.${key}`);
        }
      }
    };

    for (const [key, value] of Object.entries(config)) {
      checkValue(value, key);
    }

    return errors;
  }

  // --------------------------------------------------------------------------
  // Variable Extraction
  // --------------------------------------------------------------------------

  /**
   * Extracts all variable references from a workflow
   */
  extractVariableReferences(workflow: GeneratedWorkflow): VariableReference[] {
    const references: VariableReference[] = [];
    const variablePattern = /\{\{([^}]+)\}\}/g;

    const extractFromValue = (value: any): void => {
      if (typeof value === 'string') {
        let match;
        while ((match = variablePattern.exec(value)) !== null) {
          const fullPath = match[1];
          const parts = fullPath.split('.');
          references.push({
            nodeId: parts[0],
            outputPath: parts.slice(1).join('.'),
            fullPath,
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const val of Object.values(value)) {
          extractFromValue(val);
        }
      }
    };

    for (const node of workflow.nodes) {
      if (node.data?.config) {
        extractFromValue(node.data.config);
      }
    }

    return references;
  }

  // --------------------------------------------------------------------------
  // Smart Variable Mapping
  // --------------------------------------------------------------------------

  /**
   * Suggests variable mappings based on node outputs and requirements
   */
  suggestVariableMappings(
    targetNode: WorkflowNode,
    availableNodes: WorkflowNode[]
  ): Map<string, string[]> {
    const suggestions = new Map<string, string[]>();
    const targetDef = getNodeDefinition(targetNode.type);

    if (!targetDef) return suggestions;

    // For each input/config field, find compatible outputs
    for (const input of targetDef.inputs) {
      const compatibleOutputs: string[] = [];

      for (const sourceNode of availableNodes) {
        if (sourceNode.id === targetNode.id) continue;

        const sourceDef = getNodeDefinition(sourceNode.type);
        if (!sourceDef) continue;

        for (const output of sourceDef.outputs) {
          // Check type compatibility
          if (this.isTypeCompatible(output.type, input.type)) {
            compatibleOutputs.push(`{{${sourceNode.id}.${output.id}}}`);
          }
        }
      }

      if (compatibleOutputs.length > 0) {
        suggestions.set(input.id, compatibleOutputs);
      }
    }

    return suggestions;
  }

  /**
   * Checks if output type is compatible with input type
   */
  private isTypeCompatible(outputType: string, inputType: string): boolean {
    if (inputType === 'any' || outputType === 'any') return true;
    if (inputType === outputType) return true;

    // String can accept most types
    if (inputType === 'string') {
      return ['string', 'number', 'boolean'].includes(outputType);
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // Workflow Templates
  // --------------------------------------------------------------------------

  /**
   * Generates a workflow from a predefined template
   */
  async generateFromTemplate(
    templateId: string,
    customizations: Record<string, any>
  ): Promise<GenerationResponse> {
    const templates: Record<string, string> = {
      'lead-notification': 'When I receive a new lead via webhook, send an email to the sales team and post to Slack',
      'data-sync': 'Every hour, fetch data from an API and update the database',
      'approval-flow': 'When a request comes in, check if amount is over 1000, if yes send for approval via email, if no auto-approve',
      'customer-onboarding': 'When a new user signs up, send welcome email, create HubSpot contact, and notify team on Slack',
    };

    const templatePrompt = templates[templateId];
    if (!templatePrompt) {
      return {
        success: false,
        errors: [`Unknown template: ${templateId}`],
      };
    }

    // Combine template with customizations
    let prompt = templatePrompt;
    for (const [key, value] of Object.entries(customizations)) {
      prompt += ` Use ${value} for ${key}.`;
    }

    return this.generateWorkflow({ prompt, mode: 'create' });
  }

  // --------------------------------------------------------------------------
  // Layout Optimization
  // --------------------------------------------------------------------------

  /**
   * Optimizes the layout of a generated workflow
   */
  optimizeLayout(workflow: GeneratedWorkflow): GeneratedWorkflow {
    const { nodes, edges } = workflow;

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adjacency.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Topological sort for levels
    const levels: string[][] = [];
    const queue: string[] = [];

    // Find all nodes with no incoming edges (triggers)
    for (const node of nodes) {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    }

    while (queue.length > 0) {
      const level: string[] = [];
      const size = queue.length;

      for (let i = 0; i < size; i++) {
        const nodeId = queue.shift()!;
        level.push(nodeId);

        for (const next of adjacency.get(nodeId) || []) {
          inDegree.set(next, (inDegree.get(next) || 0) - 1);
          if (inDegree.get(next) === 0) {
            queue.push(next);
          }
        }
      }

      if (level.length > 0) {
        levels.push(level);
      }
    }

    // Assign positions based on levels
    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 150;
    const START_X = 100;
    const START_Y = 50;

    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      const level = levels[levelIdx];
      const levelWidth = level.length * HORIZONTAL_SPACING;
      const startX = START_X + (levelWidth > HORIZONTAL_SPACING ? 0 : HORIZONTAL_SPACING / 2);

      for (let nodeIdx = 0; nodeIdx < level.length; nodeIdx++) {
        const node = nodes.find((n) => n.id === level[nodeIdx]);
        if (node) {
          node.position = {
            x: startX + nodeIdx * HORIZONTAL_SPACING,
            y: START_Y + levelIdx * VERTICAL_SPACING,
          };
        }
      }
    }

    return { nodes, edges };
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Gets available node types for suggestions
   */
  getAvailableNodeTypes(): Array<{ type: string; name: string; category: string }> {
    return NODE_LIBRARY.map((n) => ({
      type: n.type,
      name: n.name,
      category: n.category,
    }));
  }

  /**
   * Gets the system prompt for debugging
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: WorkflowGeneratorService | null = null;

export function getWorkflowGeneratorService(): WorkflowGeneratorService {
  if (!instance) {
    instance = new WorkflowGeneratorService();
  }
  return instance;
}

export default WorkflowGeneratorService;
