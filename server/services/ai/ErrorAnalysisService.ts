/**
 * Error Analysis Service (Fix-It Agent)
 * Phase 8: AI-Powered Workflow Debugging
 *
 * This service analyzes workflow execution errors and suggests fixes
 * by examining error logs, node configurations, and input/output data.
 */

import OpenAI from 'openai';
import {
  generateArchitectSystemPrompt,
  generateErrorAnalysisContext,
  getNodeDefinition,
  NODE_LIBRARY,
} from './NodeDefinitionPrompt';
import { WorkflowNode, WorkflowEdge, GeneratedWorkflow } from './WorkflowGeneratorService';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionError {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  errorType: 'runtime' | 'validation' | 'timeout' | 'connection' | 'authentication' | 'unknown';
  message: string;
  stack?: string;
  input?: any;
  output?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorAnalysis {
  errorType: string;
  rootCause: string;
  explanation: string;
  suggestedFixes: SuggestedFix[];
  preventionTips: string[];
  confidence: number; // 0-1
  relatedDocumentation?: string[];
}

export interface SuggestedFix {
  id: string;
  title: string;
  description: string;
  type: 'config_change' | 'add_node' | 'remove_node' | 'reconnect' | 'variable_fix' | 'code_fix';
  priority: 'critical' | 'high' | 'medium' | 'low';
  autoApplicable: boolean;
  changes?: WorkflowChanges;
}

export interface WorkflowChanges {
  nodesToAdd?: WorkflowNode[];
  nodesToRemove?: string[];
  nodesToUpdate?: Array<{ id: string; updates: Partial<WorkflowNode> }>;
  edgesToAdd?: WorkflowEdge[];
  edgesToRemove?: string[];
}

export interface AnalysisRequest {
  error: ExecutionError;
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  executionTrace?: ExecutionStep[];
  previousErrors?: ExecutionError[];
}

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  status: 'success' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  duration?: number;
  error?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: ErrorAnalysis;
  suggestedWorkflow?: GeneratedWorkflow;
  quickFixes?: QuickFix[];
  errors?: string[];
}

export interface QuickFix {
  id: string;
  label: string;
  description: string;
  action: () => WorkflowChanges;
}

// ============================================================================
// Error Patterns Database
// ============================================================================

interface ErrorPattern {
  pattern: RegExp;
  type: string;
  commonCauses: string[];
  suggestedActions: string[];
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /undefined|is not defined|Cannot read propert/i,
    type: 'missing_variable',
    commonCauses: [
      'Variable reference points to non-existent node output',
      'Previous node did not produce expected output',
      'Typo in variable path',
    ],
    suggestedActions: [
      'Add a Set Variable node to define default values',
      'Check variable references for typos',
      'Ensure the source node runs before this node',
    ],
  },
  {
    pattern: /ECONNREFUSED|ENOTFOUND|getaddrinfo|network/i,
    type: 'connection_error',
    commonCauses: [
      'Target server is unreachable',
      'Invalid URL or hostname',
      'Network firewall blocking connection',
      'DNS resolution failed',
    ],
    suggestedActions: [
      'Verify the URL is correct',
      'Check if the target service is running',
      'Test network connectivity',
      'Add retry logic with exponential backoff',
    ],
  },
  {
    pattern: /timeout|ETIMEDOUT|exceeded/i,
    type: 'timeout',
    commonCauses: [
      'External API is slow to respond',
      'Large payload processing',
      'Network latency issues',
    ],
    suggestedActions: [
      'Increase timeout configuration',
      'Add pagination to reduce payload size',
      'Implement async processing with callbacks',
    ],
  },
  {
    pattern: /401|unauthorized|authentication|auth failed/i,
    type: 'authentication',
    commonCauses: [
      'Invalid or expired API key',
      'Missing authentication headers',
      'Token needs refresh',
    ],
    suggestedActions: [
      'Verify API credentials are correct',
      'Check if token has expired',
      'Ensure proper authentication headers are set',
    ],
  },
  {
    pattern: /403|forbidden|permission denied/i,
    type: 'authorization',
    commonCauses: [
      'Insufficient permissions',
      'Resource access restricted',
      'IP not whitelisted',
    ],
    suggestedActions: [
      'Check API permissions/scopes',
      'Verify account has access to the resource',
      'Contact API provider about access',
    ],
  },
  {
    pattern: /404|not found|does not exist/i,
    type: 'not_found',
    commonCauses: [
      'Resource ID is incorrect',
      'Resource was deleted',
      'Wrong API endpoint',
    ],
    suggestedActions: [
      'Verify the resource ID is correct',
      'Check if the resource still exists',
      'Confirm API endpoint path',
    ],
  },
  {
    pattern: /400|bad request|invalid|malformed/i,
    type: 'validation',
    commonCauses: [
      'Invalid request body format',
      'Missing required fields',
      'Data type mismatch',
    ],
    suggestedActions: [
      'Review API documentation for required fields',
      'Validate data types before sending',
      'Add a Transform node to format data correctly',
    ],
  },
  {
    pattern: /500|internal server error/i,
    type: 'server_error',
    commonCauses: [
      'Bug in external API',
      'Server overloaded',
      'Database issues on target system',
    ],
    suggestedActions: [
      'Retry the request after a delay',
      'Check external service status page',
      'Contact API support if persistent',
    ],
  },
  {
    pattern: /rate limit|too many requests|429/i,
    type: 'rate_limit',
    commonCauses: [
      'Exceeded API rate limits',
      'Too many concurrent requests',
      'Daily quota exhausted',
    ],
    suggestedActions: [
      'Add delay between requests',
      'Implement request batching',
      'Upgrade API plan for higher limits',
      'Add a Wait node between API calls',
    ],
  },
  {
    pattern: /json|parse|syntax error|unexpected token/i,
    type: 'parse_error',
    commonCauses: [
      'Invalid JSON response from API',
      'HTML error page returned instead of JSON',
      'Malformed data in payload',
    ],
    suggestedActions: [
      'Check the raw response for HTML error pages',
      'Validate JSON structure before parsing',
      'Add error handling for non-JSON responses',
    ],
  },
];

// ============================================================================
// ErrorAnalysisService
// ============================================================================

export class ErrorAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // --------------------------------------------------------------------------
  // Main Analysis Methods
  // --------------------------------------------------------------------------

  /**
   * Analyzes a workflow execution error and suggests fixes
   */
  async analyzeError(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      // Step 1: Pattern matching for quick diagnosis
      const patternAnalysis = this.matchErrorPatterns(request.error);

      // Step 2: Analyze variable references
      const variableIssues = this.analyzeVariableReferences(
        request.error,
        request.workflow.nodes,
        request.workflow.edges
      );

      // Step 3: Generate AI analysis for complex issues
      const aiAnalysis = await this.generateAIAnalysis(request, patternAnalysis);

      // Step 4: Generate suggested workflow fixes
      const suggestedFixes = this.generateSuggestedFixes(
        request.error,
        request.workflow,
        patternAnalysis,
        variableIssues,
        aiAnalysis
      );

      // Step 5: Generate quick fixes (auto-applicable)
      const quickFixes = this.generateQuickFixes(
        request.error,
        request.workflow,
        variableIssues
      );

      // Combine all analysis
      const analysis: ErrorAnalysis = {
        errorType: patternAnalysis?.type || 'unknown',
        rootCause: aiAnalysis.rootCause || 'Unable to determine root cause',
        explanation: aiAnalysis.explanation || patternAnalysis?.commonCauses[0] || 'Unknown error',
        suggestedFixes,
        preventionTips: [
          ...new Set([
            ...(patternAnalysis?.suggestedActions || []),
            ...aiAnalysis.preventionTips,
          ]),
        ],
        confidence: aiAnalysis.confidence,
        relatedDocumentation: aiAnalysis.relatedDocumentation,
      };

      return {
        success: true,
        analysis,
        suggestedWorkflow: aiAnalysis.suggestedWorkflow,
        quickFixes,
      };
    } catch (error) {
      console.error('[ERROR_ANALYSIS] Analysis failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Analysis failed'],
      };
    }
  }

  /**
   * Generates a fixed workflow based on error analysis
   */
  async generateFixedWorkflow(request: AnalysisRequest): Promise<GeneratedWorkflow | null> {
    try {
      const systemPrompt = this.buildFixSystemPrompt();
      const userPrompt = this.buildFixUserPrompt(request);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '';

      // Extract workflow JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]) as GeneratedWorkflow;
      }

      return null;
    } catch (error) {
      console.error('[ERROR_ANALYSIS] Fix generation failed:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Pattern Matching
  // --------------------------------------------------------------------------

  /**
   * Matches error message against known patterns
   */
  private matchErrorPatterns(error: ExecutionError): ErrorPattern | null {
    const message = error.message.toLowerCase();

    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(error.message)) {
        return pattern;
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Variable Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyzes variable references for issues
   */
  private analyzeVariableReferences(
    error: ExecutionError,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): VariableIssue[] {
    const issues: VariableIssue[] = [];
    const failedNode = nodes.find((n) => n.id === error.nodeId);

    if (!failedNode) return issues;

    const variablePattern = /\{\{([^}]+)\}\}/g;
    const config = failedNode.data?.config || {};

    // Check all config values for variable references
    const checkValue = (value: any, path: string): void => {
      if (typeof value === 'string') {
        let match;
        while ((match = variablePattern.exec(value)) !== null) {
          const ref = match[1];
          const parts = ref.split('.');
          const referencedNodeId = parts[0];
          const outputPath = parts.slice(1).join('.');

          // Check if referenced node exists
          const referencedNode = nodes.find((n) => n.id === referencedNodeId);
          if (!referencedNode) {
            issues.push({
              type: 'missing_node',
              variablePath: ref,
              configPath: path,
              message: `References non-existent node "${referencedNodeId}"`,
              suggestion: `Create a node with ID "${referencedNodeId}" or update the reference`,
            });
            continue;
          }

          // Check if there's a path from referenced node to failed node
          const hasPath = this.hasPathBetweenNodes(referencedNodeId, error.nodeId, edges);
          if (!hasPath) {
            issues.push({
              type: 'no_connection',
              variablePath: ref,
              configPath: path,
              message: `Node "${referencedNodeId}" is not connected to this node`,
              suggestion: `Add a connection from "${referencedNodeId}" to "${error.nodeId}"`,
            });
          }

          // Check if output exists on referenced node
          const nodeDef = getNodeDefinition(referencedNode.type);
          if (nodeDef && outputPath) {
            const outputName = parts[1];
            const hasOutput = nodeDef.outputs.some((o) => o.id === outputName);
            if (!hasOutput) {
              issues.push({
                type: 'invalid_output',
                variablePath: ref,
                configPath: path,
                message: `Output "${outputName}" does not exist on node type "${referencedNode.type}"`,
                suggestion: `Available outputs: ${nodeDef.outputs.map((o) => o.id).join(', ')}`,
              });
            }
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

    return issues;
  }

  /**
   * Checks if there's a path between two nodes
   */
  private hasPathBetweenNodes(
    sourceId: string,
    targetId: string,
    edges: WorkflowEdge[]
  ): boolean {
    const visited = new Set<string>();
    const queue = [sourceId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetId) return true;

      if (visited.has(current)) continue;
      visited.add(current);

      // Find all outgoing edges from current node
      for (const edge of edges) {
        if (edge.source === current && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // AI Analysis
  // --------------------------------------------------------------------------

  /**
   * Generates AI-powered analysis for complex errors
   */
  private async generateAIAnalysis(
    request: AnalysisRequest,
    patternMatch: ErrorPattern | null
  ): Promise<AIAnalysisResult> {
    try {
      const systemPrompt = `You are an expert workflow debugger for Flowent AI Studio.
Analyze the following workflow execution error and provide:
1. Root cause identification
2. Clear explanation of what went wrong
3. Specific fixes to resolve the issue
4. Prevention tips for the future

Be concise and actionable. Focus on practical solutions.`;

      const context = generateErrorAnalysisContext(
        {
          message: request.error.message,
          stack: request.error.stack,
          nodeId: request.error.nodeId,
          nodeName: request.error.nodeName,
          input: request.error.input,
          output: request.error.output,
        },
        request.workflow.nodes,
        request.workflow.edges
      );

      let userPrompt = `## Error to Analyze\n\n`;
      userPrompt += `**Error Type**: ${request.error.errorType}\n`;
      userPrompt += `**Message**: ${request.error.message}\n`;
      userPrompt += `**Node**: ${request.error.nodeName || request.error.nodeId}\n\n`;

      if (patternMatch) {
        userPrompt += `**Pattern Match**: ${patternMatch.type}\n`;
        userPrompt += `**Common Causes**: ${patternMatch.commonCauses.join(', ')}\n\n`;
      }

      if (request.executionTrace) {
        userPrompt += `## Execution Trace\n\n`;
        for (const step of request.executionTrace) {
          userPrompt += `- ${step.nodeName} (${step.nodeId}): ${step.status}`;
          if (step.error) userPrompt += ` - ${step.error}`;
          userPrompt += '\n';
        }
        userPrompt += '\n';
      }

      userPrompt += context;
      userPrompt += `\n\nProvide your analysis in this JSON format:
\`\`\`json
{
  "rootCause": "Brief description of the root cause",
  "explanation": "Detailed explanation of what went wrong",
  "fixes": ["Specific fix 1", "Specific fix 2"],
  "preventionTips": ["Tip 1", "Tip 2"],
  "confidence": 0.8,
  "documentation": ["Relevant doc link or topic"]
}
\`\`\``;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '';

      // Parse JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          rootCause: parsed.rootCause || '',
          explanation: parsed.explanation || '',
          fixes: parsed.fixes || [],
          preventionTips: parsed.preventionTips || [],
          confidence: parsed.confidence || 0.5,
          relatedDocumentation: parsed.documentation || [],
        };
      }

      return {
        rootCause: '',
        explanation: content,
        fixes: [],
        preventionTips: [],
        confidence: 0.5,
      };
    } catch (error) {
      console.error('[ERROR_ANALYSIS] AI analysis failed:', error);
      return {
        rootCause: 'Unable to determine',
        explanation: request.error.message,
        fixes: [],
        preventionTips: [],
        confidence: 0,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Fix Generation
  // --------------------------------------------------------------------------

  /**
   * Generates suggested fixes based on all analysis
   */
  private generateSuggestedFixes(
    error: ExecutionError,
    workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
    patternMatch: ErrorPattern | null,
    variableIssues: VariableIssue[],
    aiAnalysis: AIAnalysisResult
  ): SuggestedFix[] {
    const fixes: SuggestedFix[] = [];
    let fixId = 1;

    // Variable-related fixes
    for (const issue of variableIssues) {
      if (issue.type === 'missing_node') {
        fixes.push({
          id: `fix_${fixId++}`,
          title: 'Add missing node',
          description: issue.message,
          type: 'add_node',
          priority: 'critical',
          autoApplicable: false,
        });
      } else if (issue.type === 'no_connection') {
        fixes.push({
          id: `fix_${fixId++}`,
          title: 'Add connection',
          description: issue.message,
          type: 'reconnect',
          priority: 'high',
          autoApplicable: true,
          changes: {
            edgesToAdd: [
              {
                id: `edge_fix_${fixId}`,
                source: issue.variablePath.split('.')[0],
                target: error.nodeId,
              },
            ],
          },
        });
      } else if (issue.type === 'invalid_output') {
        fixes.push({
          id: `fix_${fixId++}`,
          title: 'Fix variable reference',
          description: `${issue.message}\n${issue.suggestion}`,
          type: 'variable_fix',
          priority: 'high',
          autoApplicable: false,
        });
      }
    }

    // Pattern-based fixes
    if (patternMatch) {
      if (patternMatch.type === 'timeout') {
        fixes.push({
          id: `fix_${fixId++}`,
          title: 'Increase timeout',
          description: 'Increase the timeout configuration for this node',
          type: 'config_change',
          priority: 'medium',
          autoApplicable: true,
          changes: {
            nodesToUpdate: [
              {
                id: error.nodeId,
                updates: {
                  data: {
                    config: { timeout: 60000 }, // 60 seconds
                  },
                },
              },
            ],
          },
        });
      }

      if (patternMatch.type === 'rate_limit') {
        fixes.push({
          id: `fix_${fixId++}`,
          title: 'Add delay between requests',
          description: 'Insert a Wait node before this node to prevent rate limiting',
          type: 'add_node',
          priority: 'high',
          autoApplicable: true,
          changes: this.generateWaitNodeFix(error.nodeId, workflow),
        });
      }

      if (patternMatch.type === 'missing_variable') {
        fixes.push({
          id: `fix_${fixId++}`,
          title: 'Add default value',
          description: 'Add a Set Variable node to define default values',
          type: 'add_node',
          priority: 'high',
          autoApplicable: false,
        });
      }
    }

    // AI-suggested fixes
    for (const fix of aiAnalysis.fixes) {
      fixes.push({
        id: `fix_${fixId++}`,
        title: fix,
        description: fix,
        type: 'code_fix',
        priority: 'medium',
        autoApplicable: false,
      });
    }

    return fixes;
  }

  /**
   * Generates quick fixes that can be auto-applied
   */
  private generateQuickFixes(
    error: ExecutionError,
    workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
    variableIssues: VariableIssue[]
  ): QuickFix[] {
    const quickFixes: QuickFix[] = [];

    // Quick fix for missing connections
    const connectionIssues = variableIssues.filter((i) => i.type === 'no_connection');
    for (const issue of connectionIssues) {
      const sourceId = issue.variablePath.split('.')[0];
      quickFixes.push({
        id: `quick_connect_${sourceId}`,
        label: `Connect ${sourceId} → ${error.nodeId}`,
        description: `Add missing connection from ${sourceId}`,
        action: () => ({
          edgesToAdd: [
            {
              id: `edge_${sourceId}_${error.nodeId}`,
              source: sourceId,
              target: error.nodeId,
            },
          ],
        }),
      });
    }

    // Quick fix: retry with longer timeout
    if (error.errorType === 'timeout') {
      quickFixes.push({
        id: 'quick_increase_timeout',
        label: 'Increase timeout to 60s',
        description: 'Set timeout to 60 seconds',
        action: () => {
          const node = workflow.nodes.find((n) => n.id === error.nodeId);
          if (!node) return {};
          return {
            nodesToUpdate: [
              {
                id: error.nodeId,
                updates: {
                  data: {
                    ...node.data,
                    config: {
                      ...node.data.config,
                      timeout: 60000,
                    },
                  },
                },
              },
            ],
          };
        },
      });
    }

    return quickFixes;
  }

  /**
   * Generates changes to add a Wait node before the target node
   */
  private generateWaitNodeFix(
    targetNodeId: string,
    workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  ): WorkflowChanges {
    const targetNode = workflow.nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return {};

    // Find incoming edges to target node
    const incomingEdges = workflow.edges.filter((e) => e.target === targetNodeId);

    const waitNodeId = `wait_before_${targetNodeId}`;
    const waitNode: WorkflowNode = {
      id: waitNodeId,
      type: 'logic_wait',
      position: {
        x: targetNode.position.x,
        y: targetNode.position.y - 100,
      },
      data: {
        label: 'Wait (Rate Limit)',
        config: {
          duration: 1, // 1 second delay
        },
      },
    };

    // Redirect incoming edges to wait node, connect wait to target
    const edgesToRemove = incomingEdges.map((e) => e.id);
    const edgesToAdd: WorkflowEdge[] = [
      ...incomingEdges.map((e) => ({
        ...e,
        id: `${e.id}_to_wait`,
        target: waitNodeId,
      })),
      {
        id: `edge_wait_to_${targetNodeId}`,
        source: waitNodeId,
        target: targetNodeId,
        sourceHandle: 'continued',
      },
    ];

    return {
      nodesToAdd: [waitNode],
      edgesToRemove,
      edgesToAdd,
    };
  }

  // --------------------------------------------------------------------------
  // Prompt Building
  // --------------------------------------------------------------------------

  /**
   * Builds the system prompt for fix generation
   */
  private buildFixSystemPrompt(): string {
    return `${generateArchitectSystemPrompt()}

## ADDITIONAL CONTEXT: ERROR FIXING

You are now in FIX mode. Your goal is to modify the existing workflow to resolve the error.
When fixing:
1. Preserve as much of the original workflow as possible
2. Only make changes necessary to fix the error
3. Ensure variable references are valid
4. Add error handling if appropriate
5. Return the COMPLETE fixed workflow (all nodes and edges)`;
  }

  /**
   * Builds the user prompt for fix generation
   */
  private buildFixUserPrompt(request: AnalysisRequest): string {
    let prompt = `## FIX THIS WORKFLOW ERROR\n\n`;

    prompt += `**Error Message**: ${request.error.message}\n`;
    prompt += `**Failed Node**: ${request.error.nodeId} (${request.error.nodeType || 'unknown'})\n`;

    if (request.error.input) {
      prompt += `\n**Input at failure**:\n\`\`\`json\n${JSON.stringify(request.error.input, null, 2)}\n\`\`\`\n`;
    }

    prompt += `\n## Current Workflow\n\n`;
    prompt += `\`\`\`json\n${JSON.stringify(request.workflow, null, 2)}\n\`\`\`\n`;

    prompt += `\nPlease return the FIXED workflow with necessary modifications to resolve the error.`;

    return prompt;
  }

  // --------------------------------------------------------------------------
  // Batch Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyzes multiple errors to find patterns
   */
  async analyzeErrorPatterns(errors: ExecutionError[]): Promise<ErrorPatternAnalysis> {
    const byType = new Map<string, ExecutionError[]>();
    const byNode = new Map<string, ExecutionError[]>();

    // Group errors
    for (const error of errors) {
      const pattern = this.matchErrorPatterns(error);
      const type = pattern?.type || 'unknown';

      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(error);

      if (!byNode.has(error.nodeId)) byNode.set(error.nodeId, []);
      byNode.get(error.nodeId)!.push(error);
    }

    // Find most problematic nodes
    const problematicNodes = Array.from(byNode.entries())
      .map(([nodeId, nodeErrors]) => ({
        nodeId,
        errorCount: nodeErrors.length,
        commonError: nodeErrors[0].message,
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5);

    // Find most common error types
    const commonTypes = Array.from(byType.entries())
      .map(([type, typeErrors]) => ({
        type,
        count: typeErrors.length,
        percentage: (typeErrors.length / errors.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalErrors: errors.length,
      problematicNodes,
      commonTypes,
      recommendations: this.generatePatternRecommendations(commonTypes, problematicNodes),
    };
  }

  /**
   * Generates recommendations based on error patterns
   */
  private generatePatternRecommendations(
    types: Array<{ type: string; count: number; percentage: number }>,
    nodes: Array<{ nodeId: string; errorCount: number; commonError: string }>
  ): string[] {
    const recommendations: string[] = [];

    // Type-based recommendations
    for (const { type, percentage } of types) {
      if (percentage > 30) {
        switch (type) {
          case 'timeout':
            recommendations.push(
              'High timeout rate detected. Consider adding retry logic and increasing timeout values.'
            );
            break;
          case 'rate_limit':
            recommendations.push(
              'Frequent rate limiting. Add delays between API calls and implement request queuing.'
            );
            break;
          case 'authentication':
            recommendations.push(
              'Authentication issues are common. Review credential management and token refresh logic.'
            );
            break;
          case 'missing_variable':
            recommendations.push(
              'Many variable reference errors. Add Set Variable nodes with default values.'
            );
            break;
        }
      }
    }

    // Node-based recommendations
    if (nodes.length > 0 && nodes[0].errorCount > 5) {
      recommendations.push(
        `Node "${nodes[0].nodeId}" has ${nodes[0].errorCount} errors. Consider reviewing its configuration or adding error handling.`
      );
    }

    return recommendations;
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

interface VariableIssue {
  type: 'missing_node' | 'no_connection' | 'invalid_output';
  variablePath: string;
  configPath: string;
  message: string;
  suggestion?: string;
}

interface AIAnalysisResult {
  rootCause: string;
  explanation: string;
  fixes: string[];
  preventionTips: string[];
  confidence: number;
  relatedDocumentation?: string[];
  suggestedWorkflow?: GeneratedWorkflow;
}

interface ErrorPatternAnalysis {
  totalErrors: number;
  problematicNodes: Array<{
    nodeId: string;
    errorCount: number;
    commonError: string;
  }>;
  commonTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  recommendations: string[];
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: ErrorAnalysisService | null = null;

export function getErrorAnalysisService(): ErrorAnalysisService {
  if (!instance) {
    instance = new ErrorAnalysisService();
  }
  return instance;
}

export default ErrorAnalysisService;
