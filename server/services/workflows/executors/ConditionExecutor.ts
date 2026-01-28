/**
 * Condition Node Executor
 *
 * Handles conditional branching nodes
 * Evaluates conditions and determines which path to take
 */

import { WorkflowNode, ExecutionContext, NodeOutput } from '../types';

// Condition operators
type Operator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';

interface Condition {
  field: string;
  operator: Operator;
  value?: unknown;
}

function evaluateCondition(condition: Condition, data: Record<string, unknown>): boolean {
  const fieldValue = data[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'contains':
      return String(fieldValue).includes(String(condition.value));
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    default:
      return false;
  }
}

export async function executeConditionNode(
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const startTime = Date.now();

  console.log(`[ConditionExecutor] Executing node: ${node.id}`);
  console.log(`[ConditionExecutor] Config:`, node.data.config);
  console.log(`[ConditionExecutor] Inputs:`, inputs);

  try {
    const config = node.data.config || {};
    const conditions = (config.conditions as Condition[]) || [];

    // Flatten inputs for evaluation
    const flatInputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'object' && value !== null) {
        // Flatten nested objects
        for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
          flatInputs[`${key}.${nestedKey}`] = nestedValue;
        }
      }
      flatInputs[key] = value;
    }

    // Evaluate all conditions (AND logic by default)
    let result = true;
    const evaluations: { condition: Condition; result: boolean }[] = [];

    if (conditions.length === 0) {
      // No conditions = always true (pass through)
      result = true;
    } else {
      for (const condition of conditions) {
        const conditionResult = evaluateCondition(condition, flatInputs);
        evaluations.push({ condition, result: conditionResult });
        if (!conditionResult) {
          result = false;
          break; // AND logic - stop on first false
        }
      }
    }

    console.log(`[ConditionExecutor] Evaluation result: ${result}`);
    console.log(`[ConditionExecutor] Evaluations:`, evaluations);

    const output = {
      conditionMet: result,
      branch: result ? 'true' : 'false',
      evaluations,
      inputData: inputs,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      data: output,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ConditionExecutor] Failed:`, message);

    return {
      success: false,
      data: null,
      error: message,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}
