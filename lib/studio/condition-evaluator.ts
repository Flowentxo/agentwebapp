/**
 * CONDITION EVALUATOR
 *
 * Runtime evaluation engine for condition logic
 * Evaluates rules and determines which branch to take
 */

import {
  ConditionConfig,
  ConditionGroup,
  ConditionRule,
  ConditionResult,
  ComparisonOperator,
  ValueSource,
  LogicalOperator
} from './condition-types';
import { VariableStore } from './variable-store';
import { WorkflowContext } from './variable-types';

export class ConditionEvaluator {
  private variableStore: VariableStore;
  private context: WorkflowContext;

  constructor(variableStore: VariableStore) {
    this.variableStore = variableStore;
    this.context = variableStore.export().context;
  }

  /**
   * Evaluate a complete condition configuration
   */
  evaluate(config: ConditionConfig): ConditionResult {
    const result: ConditionResult = {
      passed: false,
      path: config.defaultPath,
      evaluatedRules: [],
      evaluatedAt: Date.now()
    };

    try {
      // Evaluate the main condition group
      const groupResult = this.evaluateGroup(config.condition, result.evaluatedRules);
      result.passed = groupResult;
      result.path = groupResult ? 'true' : 'false';
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Evaluation failed';

      if (!config.continueOnError) {
        throw error;
      }
    }

    return result;
  }

  /**
   * Evaluate a condition group (multiple rules with AND/OR)
   */
  private evaluateGroup(
    group: ConditionGroup,
    evaluatedRules: ConditionResult['evaluatedRules']
  ): boolean {
    // Evaluate all rules in this group
    const ruleResults = group.rules
      .filter(rule => rule.enabled)
      .map(rule => this.evaluateRule(rule, evaluatedRules));

    // Evaluate nested groups
    const nestedResults = (group.groups || [])
      .map(nestedGroup => this.evaluateGroup(nestedGroup, evaluatedRules));

    // Combine all results
    const allResults = [...ruleResults, ...nestedResults];

    if (allResults.length === 0) {
      return true; // Empty group passes by default
    }

    // Apply logical operator
    if (group.operator === 'AND') {
      return allResults.every(r => r === true);
    } else {
      return allResults.some(r => r === true);
    }
  }

  /**
   * Evaluate a single condition rule
   */
  private evaluateRule(
    rule: ConditionRule,
    evaluatedRules: ConditionResult['evaluatedRules']
  ): boolean {
    try {
      // Get left value
      const leftValue = this.resolveValue(rule.left);

      // Get right value (if needed)
      const rightValue = rule.right ? this.resolveValue(rule.right) : undefined;

      // Perform comparison
      const result = this.compare(leftValue, rule.operator, rightValue);

      // Record evaluation
      evaluatedRules.push({
        ruleId: rule.id,
        result,
        leftValue,
        rightValue
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      evaluatedRules.push({
        ruleId: rule.id,
        result: false,
        leftValue: undefined,
        rightValue: undefined,
        error: errorMsg
      });

      return false;
    }
  }

  /**
   * Resolve a value from its source
   */
  private resolveValue(source: ValueSource): any {
    switch (source.type) {
      case 'variable':
        const resolved = this.variableStore.resolve(source.variableName);
        if (resolved.error) {
          throw new Error(`Variable resolution failed: ${resolved.error}`);
        }
        return resolved.value;

      case 'constant':
        return source.value;

      case 'input':
        return this.getNestedValue(this.context.input, source.path);

      case 'step':
        const stepOutput = this.context.steps[source.stepId];
        return stepOutput ? this.getNestedValue(stepOutput, source.path) : undefined;

      default:
        return undefined;
    }
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Compare two values using an operator
   */
  private compare(left: any, operator: ComparisonOperator, right?: any): boolean {
    switch (operator) {
      case 'equals':
        return left == right;

      case 'not_equals':
        return left != right;

      case 'contains':
        if (typeof left === 'string' && typeof right === 'string') {
          return left.includes(right);
        }
        if (Array.isArray(left)) {
          return left.includes(right);
        }
        return false;

      case 'not_contains':
        if (typeof left === 'string' && typeof right === 'string') {
          return !left.includes(right);
        }
        if (Array.isArray(left)) {
          return !left.includes(right);
        }
        return true;

      case 'starts_with':
        return typeof left === 'string' && typeof right === 'string'
          ? left.startsWith(right)
          : false;

      case 'ends_with':
        return typeof left === 'string' && typeof right === 'string'
          ? left.endsWith(right)
          : false;

      case 'greater_than':
        return Number(left) > Number(right);

      case 'greater_than_equal':
        return Number(left) >= Number(right);

      case 'less_than':
        return Number(left) < Number(right);

      case 'less_than_equal':
        return Number(left) <= Number(right);

      case 'is_empty':
        return left === null || left === undefined || left === '' ||
               (Array.isArray(left) && left.length === 0);

      case 'is_not_empty':
        return left !== null && left !== undefined && left !== '' &&
               !(Array.isArray(left) && left.length === 0);

      case 'is_true':
        return left === true || left === 'true' || left === 1;

      case 'is_false':
        return left === false || left === 'false' || left === 0;

      case 'matches_regex':
        if (typeof left === 'string' && typeof right === 'string') {
          try {
            const regex = new RegExp(right);
            return regex.test(left);
          } catch {
            return false;
          }
        }
        return false;

      default:
        return false;
    }
  }
}

/**
 * Operator metadata for UI
 */
export const OPERATOR_INFO: Record<ComparisonOperator, {
  label: string;
  symbol: string;
  description: string;
  requiresRightValue: boolean;
  supportedTypes: ('string' | 'number' | 'boolean' | 'any')[];
}> = {
  equals: {
    label: 'Equals',
    symbol: '==',
    description: 'Values are equal',
    requiresRightValue: true,
    supportedTypes: ['any']
  },
  not_equals: {
    label: 'Not Equals',
    symbol: '!=',
    description: 'Values are not equal',
    requiresRightValue: true,
    supportedTypes: ['any']
  },
  contains: {
    label: 'Contains',
    symbol: '⊃',
    description: 'String contains substring or array contains item',
    requiresRightValue: true,
    supportedTypes: ['string', 'any']
  },
  not_contains: {
    label: 'Not Contains',
    symbol: '⊅',
    description: 'String does not contain substring',
    requiresRightValue: true,
    supportedTypes: ['string', 'any']
  },
  starts_with: {
    label: 'Starts With',
    symbol: '^',
    description: 'String starts with value',
    requiresRightValue: true,
    supportedTypes: ['string']
  },
  ends_with: {
    label: 'Ends With',
    symbol: '$',
    description: 'String ends with value',
    requiresRightValue: true,
    supportedTypes: ['string']
  },
  greater_than: {
    label: 'Greater Than',
    symbol: '>',
    description: 'Number is greater than',
    requiresRightValue: true,
    supportedTypes: ['number']
  },
  greater_than_equal: {
    label: 'Greater or Equal',
    symbol: '≥',
    description: 'Number is greater than or equal to',
    requiresRightValue: true,
    supportedTypes: ['number']
  },
  less_than: {
    label: 'Less Than',
    symbol: '<',
    description: 'Number is less than',
    requiresRightValue: true,
    supportedTypes: ['number']
  },
  less_than_equal: {
    label: 'Less or Equal',
    symbol: '≤',
    description: 'Number is less than or equal to',
    requiresRightValue: true,
    supportedTypes: ['number']
  },
  is_empty: {
    label: 'Is Empty',
    symbol: '∅',
    description: 'Value is null, undefined, or empty',
    requiresRightValue: false,
    supportedTypes: ['any']
  },
  is_not_empty: {
    label: 'Is Not Empty',
    symbol: '∄',
    description: 'Value has content',
    requiresRightValue: false,
    supportedTypes: ['any']
  },
  is_true: {
    label: 'Is True',
    symbol: '✓',
    description: 'Boolean value is true',
    requiresRightValue: false,
    supportedTypes: ['boolean']
  },
  is_false: {
    label: 'Is False',
    symbol: '✗',
    description: 'Boolean value is false',
    requiresRightValue: false,
    supportedTypes: ['boolean']
  },
  matches_regex: {
    label: 'Matches Regex',
    symbol: '/./',
    description: 'String matches regular expression',
    requiresRightValue: true,
    supportedTypes: ['string']
  }
};

/**
 * Preset condition templates
 */
export const CONDITION_TEMPLATES = [
  {
    id: 'is_premium',
    name: 'Premium User Check',
    description: 'Check if user has premium subscription',
    icon: '👑',
    category: 'common' as const,
    condition: {
      operator: 'AND' as LogicalOperator,
      rules: [{
        id: 'rule_1',
        left: { type: 'variable' as const, variableName: 'user_plan' },
        operator: 'equals' as ComparisonOperator,
        right: { type: 'constant' as const, value: 'premium' },
        enabled: true
      }],
      groups: []
    }
  },
  {
    id: 'high_priority',
    name: 'High Priority Item',
    description: 'Check if priority is high or urgent',
    icon: '🔥',
    category: 'common' as const,
    condition: {
      operator: 'OR' as LogicalOperator,
      rules: [
        {
          id: 'rule_1',
          left: { type: 'variable' as const, variableName: 'priority' },
          operator: 'equals' as ComparisonOperator,
          right: { type: 'constant' as const, value: 'high' },
          enabled: true
        },
        {
          id: 'rule_2',
          left: { type: 'variable' as const, variableName: 'priority' },
          operator: 'equals' as ComparisonOperator,
          right: { type: 'constant' as const, value: 'urgent' },
          enabled: true
        }
      ],
      groups: []
    }
  },
  {
    id: 'value_range',
    name: 'Value in Range',
    description: 'Check if number is within range',
    icon: '📊',
    category: 'data' as const,
    condition: {
      operator: 'AND' as LogicalOperator,
      rules: [
        {
          id: 'rule_1',
          left: { type: 'variable' as const, variableName: 'value' },
          operator: 'greater_than_equal' as ComparisonOperator,
          right: { type: 'constant' as const, value: 0 },
          enabled: true
        },
        {
          id: 'rule_2',
          left: { type: 'variable' as const, variableName: 'value' },
          operator: 'less_than_equal' as ComparisonOperator,
          right: { type: 'constant' as const, value: 100 },
          enabled: true
        }
      ],
      groups: []
    }
  },
  {
    id: 'text_contains',
    name: 'Text Contains Keyword',
    description: 'Check if text contains specific word',
    icon: '🔍',
    category: 'text' as const,
    condition: {
      operator: 'AND' as LogicalOperator,
      rules: [{
        id: 'rule_1',
        left: { type: 'variable' as const, variableName: 'text' },
        operator: 'contains' as ComparisonOperator,
        right: { type: 'constant' as const, value: 'keyword' },
        enabled: true
      }],
      groups: []
    }
  }
];
