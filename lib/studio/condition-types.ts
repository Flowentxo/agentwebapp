/**
 * CONDITION SYSTEM - TYPE DEFINITIONS
 *
 * Visual IF/THEN/ELSE logic builder for workflows
 * Enables branching based on variable values and dynamic conditions
 */

/**
 * Comparison Operators
 */
export type ComparisonOperator =
  | 'equals'              // ==
  | 'not_equals'          // !=
  | 'contains'            // includes substring
  | 'not_contains'        // does not include substring
  | 'starts_with'         // string starts with
  | 'ends_with'           // string ends with
  | 'greater_than'        // >
  | 'greater_than_equal'  // >=
  | 'less_than'           // <
  | 'less_than_equal'     // <=
  | 'is_empty'            // null, undefined, or empty string
  | 'is_not_empty'        // has value
  | 'is_true'             // boolean true
  | 'is_false'            // boolean false
  | 'matches_regex';      // regex pattern match

/**
 * Logical Operators for combining multiple conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Value Source - where the comparison value comes from
 */
export type ValueSource =
  | { type: 'variable'; variableName: string }
  | { type: 'constant'; value: any }
  | { type: 'input'; path: string }
  | { type: 'step'; stepId: string; path: string };

/**
 * Single Condition Rule
 */
export interface ConditionRule {
  id: string;
  left: ValueSource;           // Left side of comparison (usually a variable)
  operator: ComparisonOperator;
  right?: ValueSource;         // Right side (not needed for is_empty, is_true, etc.)
  enabled: boolean;            // Can temporarily disable a rule
}

/**
 * Condition Group - multiple rules combined with AND/OR
 */
export interface ConditionGroup {
  id: string;
  operator: LogicalOperator;  // How to combine rules in this group
  rules: ConditionRule[];
  groups?: ConditionGroup[];  // Nested groups for complex logic
}

/**
 * Branch Path - what happens when condition is met
 */
export interface BranchPath {
  id: string;
  label: string;
  description?: string;
  targetNodeId?: string;      // Which node to execute next
  color: string;              // Visual color for the path
}

/**
 * Complete Condition Configuration
 */
export interface ConditionConfig {
  id: string;
  name: string;
  description?: string;

  // Main condition logic
  condition: ConditionGroup;

  // Branching paths
  trueBranch: BranchPath;     // When condition is true
  falseBranch: BranchPath;    // When condition is false

  // Settings
  continueOnError: boolean;   // Continue workflow if evaluation fails
  defaultPath: 'true' | 'false'; // Default path if error occurs

  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Condition Evaluation Result
 */
export interface ConditionResult {
  passed: boolean;            // Final result (true/false)
  path: 'true' | 'false';     // Which branch to take
  evaluatedRules: {
    ruleId: string;
    result: boolean;
    leftValue: any;
    rightValue?: any;
    error?: string;
  }[];
  error?: string;
  evaluatedAt: number;
}

/**
 * Preset Condition Templates
 */
export interface ConditionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'common' | 'data' | 'text' | 'logic' | 'advanced';
  condition: Partial<ConditionGroup>;
}

/**
 * Operator Metadata for UI
 */
export interface OperatorInfo {
  operator: ComparisonOperator;
  label: string;
  symbol: string;
  description: string;
  requiresRightValue: boolean;
  supportedTypes: ('string' | 'number' | 'boolean' | 'any')[];
}
