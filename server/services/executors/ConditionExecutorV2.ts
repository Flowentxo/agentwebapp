/**
 * CONDITION EXECUTOR V2
 *
 * Smart condition evaluation for WorkflowExecutionEngineV2.
 * Supports:
 * - Standard operators: equals, not_equals, contains, greater_than, less_than, etc.
 * - AI/Semantic mode: Uses LLM to evaluate complex conditions
 * - Type coercion: Safely handles string/number comparisons
 * - ConditionConfig format from the visual builder
 *
 * Phase 2: Smart Condition Logic
 */

import OpenAI from 'openai';
import { createLogger } from '@/lib/logger';
import {
  INodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
  ExecutionState,
} from '@/types/execution';
import {
  ConditionConfig,
  ConditionGroup,
  ConditionRule,
  ComparisonOperator,
  ValueSource,
} from '@/lib/studio/condition-types';
import { resolveVariablePath } from '../VariableService';

const logger = createLogger('condition-executor-v2');

// ============================================================================
// TYPES
// ============================================================================

export interface ConditionEvaluationResult {
  /** The final boolean result */
  result: boolean;
  /** Human-readable reason for the result */
  reason: string;
  /** Which branch to take: 'true' or 'false' */
  branch: 'true' | 'false';
  /** Detailed evaluation of each rule */
  ruleEvaluations?: RuleEvaluation[];
  /** Was AI used for evaluation? */
  usedAI?: boolean;
  /** AI-specific metadata */
  aiMeta?: {
    model: string;
    tokensUsed: number;
    confidence?: number;
  };
}

export interface RuleEvaluation {
  ruleId: string;
  passed: boolean;
  leftValue: any;
  rightValue: any;
  operator: string;
  error?: string;
}

// ============================================================================
// HELPER: SAFE TYPE COERCION
// ============================================================================

/**
 * Safely convert a value to a number for comparison.
 * Returns NaN if conversion is not possible.
 */
function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle currency strings like "$100.50"
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned);
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return NaN;
}

/**
 * Safely convert a value to a string for comparison.
 */
function toString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Safely convert a value to a boolean for comparison.
 */
function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
}

// ============================================================================
// HELPER: RESOLVE VALUE SOURCE
// ============================================================================

/**
 * Resolve a ValueSource to an actual value using the execution state.
 */
function resolveValueSource(
  source: ValueSource | any,
  state: ExecutionState,
  inputs: any
): any {
  // If source is already a primitive, return it
  if (typeof source !== 'object' || source === null) {
    return source;
  }

  // Handle ValueSource format
  if ('type' in source) {
    switch (source.type) {
      case 'variable': {
        // Resolve from execution state using {{variableName}} format
        const resolved = resolveVariablePath(source.variableName, state);
        return resolved.found ? resolved.value : undefined;
      }

      case 'constant':
        return source.value;

      case 'input': {
        // Resolve from trigger input
        const path = source.path;
        return getNestedValue(inputs, path);
      }

      case 'step': {
        // Resolve from specific node output
        const nodeState = state.nodes[source.stepId];
        if (!nodeState) return undefined;
        return getNestedValue(nodeState.output, source.path);
      }

      default:
        return source;
    }
  }

  return source;
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return obj;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ============================================================================
// OPERATOR EVALUATION
// ============================================================================

/**
 * Evaluate a comparison operator on two values.
 * Handles type coercion safely.
 */
function evaluateOperator(
  left: any,
  right: any,
  operator: ComparisonOperator | string
): boolean {
  switch (operator) {
    // Equality
    case 'equals':
    case 'equal':
    case '==':
      // Loose equality with type coercion
      return left == right || toString(left) === toString(right);

    case 'not_equals':
    case 'not_equal':
    case '!=':
      return left != right && toString(left) !== toString(right);

    case 'strict_equals':
    case '===':
      return left === right;

    case 'strict_not_equals':
    case '!==':
      return left !== right;

    // Numeric comparisons
    case 'greater_than':
    case '>':
      return toNumber(left) > toNumber(right);

    case 'greater_than_equal':
    case 'greater_than_or_equal':
    case '>=':
      return toNumber(left) >= toNumber(right);

    case 'less_than':
    case '<':
      return toNumber(left) < toNumber(right);

    case 'less_than_equal':
    case 'less_than_or_equal':
    case '<=':
      return toNumber(left) <= toNumber(right);

    // String operations
    case 'contains':
      return toString(left).toLowerCase().includes(toString(right).toLowerCase());

    case 'not_contains':
      return !toString(left).toLowerCase().includes(toString(right).toLowerCase());

    case 'starts_with':
      return toString(left).toLowerCase().startsWith(toString(right).toLowerCase());

    case 'ends_with':
      return toString(left).toLowerCase().endsWith(toString(right).toLowerCase());

    case 'matches_regex':
      try {
        const regex = new RegExp(toString(right));
        return regex.test(toString(left));
      } catch {
        return false;
      }

    // Empty checks
    case 'is_empty':
      return (
        left === null ||
        left === undefined ||
        left === '' ||
        (Array.isArray(left) && left.length === 0) ||
        (typeof left === 'object' && Object.keys(left).length === 0)
      );

    case 'is_not_empty':
      return !(
        left === null ||
        left === undefined ||
        left === '' ||
        (Array.isArray(left) && left.length === 0) ||
        (typeof left === 'object' && Object.keys(left).length === 0)
      );

    // Boolean checks
    case 'is_true':
      return toBoolean(left) === true;

    case 'is_false':
      return toBoolean(left) === false;

    // Type checks
    case 'is_number':
      return typeof left === 'number' && !isNaN(left);

    case 'is_string':
      return typeof left === 'string';

    case 'is_array':
      return Array.isArray(left);

    case 'is_object':
      return typeof left === 'object' && left !== null && !Array.isArray(left);

    default:
      logger.warn('Unknown operator', { operator });
      return false;
  }
}

// ============================================================================
// CONDITION GROUP EVALUATION
// ============================================================================

/**
 * Evaluate a condition group (with AND/OR logic).
 */
function evaluateConditionGroup(
  group: ConditionGroup,
  state: ExecutionState,
  inputs: any,
  evaluations: RuleEvaluation[] = []
): boolean {
  // Evaluate all enabled rules
  const ruleResults = group.rules
    .filter((rule) => rule.enabled)
    .map((rule) => {
      const result = evaluateConditionRule(rule, state, inputs, evaluations);
      return result;
    });

  // Evaluate nested groups recursively
  const nestedResults = (group.groups || []).map((nestedGroup) =>
    evaluateConditionGroup(nestedGroup, state, inputs, evaluations)
  );

  // Combine all results
  const allResults = [...ruleResults, ...nestedResults];

  if (allResults.length === 0) {
    return true; // Empty group passes by default
  }

  // Apply logical operator
  if (group.operator === 'AND') {
    return allResults.every((r) => r === true);
  } else {
    return allResults.some((r) => r === true);
  }
}

/**
 * Evaluate a single condition rule.
 */
function evaluateConditionRule(
  rule: ConditionRule,
  state: ExecutionState,
  inputs: any,
  evaluations: RuleEvaluation[]
): boolean {
  try {
    // Resolve left value
    const leftValue = resolveValueSource(rule.left, state, inputs);

    // Resolve right value (if needed)
    const rightValue = rule.right
      ? resolveValueSource(rule.right, state, inputs)
      : undefined;

    // Evaluate the operator
    const passed = evaluateOperator(leftValue, rightValue, rule.operator);

    // Record evaluation
    evaluations.push({
      ruleId: rule.id,
      passed,
      leftValue,
      rightValue,
      operator: rule.operator,
    });

    return passed;
  } catch (error: any) {
    logger.error('Rule evaluation failed', {
      ruleId: rule.id,
      error: error.message,
    });

    evaluations.push({
      ruleId: rule.id,
      passed: false,
      leftValue: undefined,
      rightValue: undefined,
      operator: rule.operator,
      error: error.message,
    });

    return false;
  }
}

// ============================================================================
// AI CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a semantic condition using AI.
 * Used when operator is 'ai_check' or 'semantic'.
 */
async function evaluateWithAI(
  prompt: string,
  context: any,
  inputs: any
): Promise<ConditionEvaluationResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured, falling back to false');
    return {
      result: false,
      reason: 'AI evaluation unavailable (no API key)',
      branch: 'false',
      usedAI: true,
    };
  }

  try {
    // Build the evaluation prompt
    const systemPrompt = `You are a condition evaluator. Your task is to evaluate whether a condition is TRUE or FALSE based on the given context.

IMPORTANT RULES:
1. You must respond with a JSON object in this exact format: {"result": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}
2. Be objective and precise
3. If you cannot determine the answer, default to false
4. Consider the full context provided`;

    const userPrompt = `Evaluate this condition:
"${prompt}"

Context:
${JSON.stringify(context, null, 2)}

Input data:
${JSON.stringify(inputs, null, 2)}

Respond with JSON only:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for consistent evaluation
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    const result = Boolean(parsed.result);
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;

    logger.info('AI condition evaluation completed', {
      prompt: prompt.substring(0, 100),
      result,
      confidence,
      tokensUsed: response.usage?.total_tokens || 0,
    });

    return {
      result,
      reason: parsed.reason || 'AI evaluation',
      branch: result ? 'true' : 'false',
      usedAI: true,
      aiMeta: {
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        confidence,
      },
    };
  } catch (error: any) {
    logger.error('AI condition evaluation failed', { error: error.message });

    return {
      result: false,
      reason: `AI evaluation error: ${error.message}`,
      branch: 'false',
      usedAI: true,
    };
  }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

export class ConditionExecutorV2 implements INodeExecutor {
  /**
   * Execute a condition node and return the evaluation result.
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeData = node.data || {};

    logger.debug('Evaluating condition', {
      nodeId: node.id,
      nodeName: nodeData.label,
      hasConditionConfig: !!nodeData.conditionConfig,
    });

    try {
      let evaluationResult: ConditionEvaluationResult;

      // Check for AI/semantic evaluation mode
      if (nodeData.operator === 'ai_check' || nodeData.operator === 'semantic') {
        const aiPrompt = nodeData.aiPrompt || nodeData.prompt || '';
        evaluationResult = await evaluateWithAI(
          aiPrompt,
          { state: context.state, previousOutput: inputs.previousOutput },
          inputs
        );
      }
      // Check for structured ConditionConfig (from visual builder)
      else if (nodeData.conditionConfig) {
        const config = nodeData.conditionConfig as ConditionConfig;
        const ruleEvaluations: RuleEvaluation[] = [];

        const passed = evaluateConditionGroup(
          config.condition,
          context.state,
          inputs,
          ruleEvaluations
        );

        evaluationResult = {
          result: passed,
          reason: passed
            ? `Condition "${config.name || 'condition'}" passed`
            : `Condition "${config.name || 'condition'}" failed`,
          branch: passed ? 'true' : 'false',
          ruleEvaluations,
        };
      }
      // Check for simple condition object (legacy format)
      else if (nodeData.condition && typeof nodeData.condition === 'object') {
        const { left, right, operator } = nodeData.condition;

        // Resolve values (they might be {{variable}} references)
        const leftValue = resolveConditionValue(left, context.state, inputs);
        const rightValue = resolveConditionValue(right, context.state, inputs);

        const passed = evaluateOperator(leftValue, rightValue, operator);

        evaluationResult = {
          result: passed,
          reason: `${leftValue} ${operator} ${rightValue} = ${passed}`,
          branch: passed ? 'true' : 'false',
          ruleEvaluations: [
            {
              ruleId: 'simple',
              passed,
              leftValue,
              rightValue,
              operator,
            },
          ],
        };
      }
      // Check for JavaScript expression (legacy)
      else if (typeof nodeData.condition === 'string') {
        const conditionFn = new Function(
          'input',
          'state',
          'variables',
          `return ${nodeData.condition}`
        );

        const passed = Boolean(
          conditionFn(inputs, context.state, context.state.variables)
        );

        evaluationResult = {
          result: passed,
          reason: `JS expression evaluated to ${passed}`,
          branch: passed ? 'true' : 'false',
        };
      }
      // Default: always true
      else {
        evaluationResult = {
          result: true,
          reason: 'No condition configured, defaulting to true',
          branch: 'true',
        };
      }

      logger.info('Condition evaluated', {
        nodeId: node.id,
        result: evaluationResult.result,
        branch: evaluationResult.branch,
        usedAI: evaluationResult.usedAI || false,
      });

      return {
        data: {
          result: evaluationResult.result,
          branch: evaluationResult.branch,
          reason: evaluationResult.reason,
          ruleEvaluations: evaluationResult.ruleEvaluations,
          usedAI: evaluationResult.usedAI,
          aiMeta: evaluationResult.aiMeta,
        },
        success: true,
        meta: evaluationResult.aiMeta
          ? {
              tokenUsage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: evaluationResult.aiMeta.tokensUsed,
              },
            }
          : undefined,
      };
    } catch (error: any) {
      logger.error('Condition execution failed', {
        nodeId: node.id,
        error: error.message,
      });

      return {
        data: null,
        success: false,
        error: `Condition evaluation failed: ${error.message}`,
      };
    }
  }
}

/**
 * Helper to resolve condition values that might be variable references.
 */
function resolveConditionValue(
  value: any,
  state: ExecutionState,
  inputs: any
): any {
  // If it's a string that looks like a variable reference
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const path = value.slice(2, -2).trim();
    const resolved = resolveVariablePath(path, state);
    return resolved.found ? resolved.value : value;
  }
  return value;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conditionExecutorV2 = new ConditionExecutorV2();
export default conditionExecutorV2;
