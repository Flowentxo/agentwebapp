/**
 * VARIABLE SYSTEM - TYPE DEFINITIONS
 *
 * Core types for the Flowent AI Variable System
 * Enables dynamic workflows with context-aware variables
 */

export type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

export type VariableSourceType = 'input' | 'step' | 'env' | 'constant' | 'system';

/**
 * Variable Source - Where the variable gets its value
 */
export type VariableSource =
  | { type: 'input'; path: string }                    // User input (e.g., "customer.email")
  | { type: 'step'; stepId: string; path: string }     // Previous step output
  | { type: 'env'; key: string }                       // Environment variable
  | { type: 'constant'; value: any }                   // Static value
  | { type: 'system'; key: string };                   // System variable (timestamp, userId, etc.)

/**
 * Transform Function - Modify variable value
 */
export interface Transform {
  type: TransformType;
  params?: any[];
}

export type TransformType =
  | 'uppercase'        // Convert to uppercase
  | 'lowercase'        // Convert to lowercase
  | 'capitalize'       // Capitalize first letter
  | 'trim'             // Remove whitespace
  | 'truncate'         // Limit length
  | 'replace'          // Replace substring
  | 'split'            // Split string into array
  | 'join'             // Join array into string
  | 'parseJSON'        // Parse JSON string
  | 'stringify'        // Convert to JSON string
  | 'format';          // Custom format

/**
 * Variable Definition
 */
export interface Variable {
  id: string;
  name: string;                    // Variable name (e.g., "customer_email")
  displayName: string;             // Human-readable name (e.g., "Customer Email")
  type: VariableType;
  source: VariableSource;
  transform?: Transform[];         // Optional transformations
  defaultValue?: any;              // Fallback value
  description?: string;            // Documentation
  required?: boolean;              // Must have a value
  validation?: VariableValidation; // Value validation rules
}

/**
 * Variable Validation Rules
 */
export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;                // Regex pattern
  enum?: any[];                    // Allowed values
  custom?: (value: any) => boolean | string; // Custom validation function
}

/**
 * Workflow Context - Available data during execution
 */
export interface WorkflowContext {
  // User input data
  input: Record<string, any>;

  // Step outputs (key = stepId, value = step output)
  steps: Record<string, any>;

  // Environment variables
  env: Record<string, string>;

  // System variables
  system: {
    timestamp: number;
    userId: string;
    workflowId: string;
    executionId: string;
    [key: string]: any;
  };

  // User-defined variables
  variables: Record<string, any>;
}

/**
 * Variable Resolution Result
 */
export interface ResolvedVariable {
  name: string;
  value: any;
  type: VariableType;
  source: VariableSource;
  resolvedAt: number;
  error?: string;
}

/**
 * Variable Store State
 */
export interface VariableStoreState {
  variables: Variable[];
  context: WorkflowContext;
  resolved: Map<string, ResolvedVariable>;
}
