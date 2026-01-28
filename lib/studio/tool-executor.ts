/**
 * CUSTOM TOOL EXECUTOR
 *
 * Safely execute user-defined custom tool code
 */

import { CustomTool, ToolExecutionResult } from './types';

/**
 * Execute a custom tool with given parameters
 */
export async function executeCustomTool(
  tool: CustomTool,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // Validate required parameters
    for (const param of tool.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }

    // Apply default values
    const params: Record<string, any> = { ...parameters };
    for (const param of tool.parameters) {
      if (!(param.name in params) && param.default !== undefined) {
        params[param.name] = param.default;
      }
    }

    // Validate parameter types
    for (const param of tool.parameters) {
      if (param.name in params) {
        const value = params[param.name];
        const expectedType = param.type;

        if (!validateParameterType(value, expectedType)) {
          throw new Error(
            `Parameter "${param.name}" has invalid type. Expected ${expectedType}, got ${typeof value}`
          );
        }
      }
    }

    // Execute tool code with timeout
    const output = await executeWithTimeout(
      tool.code,
      params,
      tool.timeout || 5000,
      logs
    );

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      output,
      executionTime,
      logs
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    return {
      success: false,
      error: error.message || 'Unknown execution error',
      executionTime,
      logs
    };
  }
}

/**
 * Execute code with timeout
 */
async function executeWithTimeout(
  code: string,
  params: Record<string, any>,
  timeout: number,
  logs: string[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Execution timeout after ${timeout}ms`));
    }, timeout);

    try {
      // Create sandboxed execution context
      const sandbox = createSandbox(params, logs);

      // Execute user code
      const wrappedCode = `
        ${code}
        return execute(params);
      `;

      const func = new Function('params', 'console', wrappedCode);
      const result = func(params, sandbox.console);

      clearTimeout(timeoutId);
      resolve(result);
    } catch (error: any) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Create sandboxed execution context
 */
function createSandbox(params: Record<string, any>, logs: string[]) {
  return {
    console: {
      log: (...args: any[]) => {
        logs.push(args.map(arg => String(arg)).join(' '));
      },
      error: (...args: any[]) => {
        logs.push('[ERROR] ' + args.map(arg => String(arg)).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('[WARN] ' + args.map(arg => String(arg)).join(' '));
      },
      info: (...args: any[]) => {
        logs.push('[INFO] ' + args.map(arg => String(arg)).join(' '));
      }
    }
  };
}

/**
 * Validate parameter type
 */
function validateParameterType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';

    case 'number':
      return typeof value === 'number' && !isNaN(value);

    case 'boolean':
      return typeof value === 'boolean';

    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);

    case 'array':
      return Array.isArray(value);

    default:
      return false;
  }
}

/**
 * Test a custom tool with test cases
 */
export async function testCustomTool(tool: CustomTool): Promise<{
  passed: number;
  failed: number;
  results: Array<{
    testCase: string;
    passed: boolean;
    error?: string;
    output?: any;
    expectedOutput?: any;
  }>;
}> {
  if (!tool.testCases || tool.testCases.length === 0) {
    return { passed: 0, failed: 0, results: [] };
  }

  let passed = 0;
  let failed = 0;
  const results: Array<{
    testCase: string;
    passed: boolean;
    error?: string;
    output?: any;
    expectedOutput?: any;
  }> = [];

  for (const testCase of tool.testCases) {
    const result = await executeCustomTool(tool, testCase.input);

    const testPassed = result.success &&
      (testCase.shouldPass
        ? JSON.stringify(result.output) === JSON.stringify(testCase.expectedOutput)
        : !result.success);

    if (testPassed) {
      passed++;
    } else {
      failed++;
    }

    results.push({
      testCase: testCase.name,
      passed: testPassed,
      error: result.error,
      output: result.output,
      expectedOutput: testCase.expectedOutput
    });
  }

  return { passed, failed, results };
}

/**
 * Validate custom tool code syntax
 */
export function validateToolCode(code: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if code contains execute function
  if (!code.includes('function execute')) {
    errors.push('Code must contain a function named "execute"');
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /require\s*\(/, message: 'require() is not allowed' },
    { pattern: /import\s+/, message: 'import statements are not allowed' },
    { pattern: /process\./, message: 'Access to process object is not allowed' },
    { pattern: /__dirname/, message: '__dirname is not allowed' },
    { pattern: /__filename/, message: '__filename is not allowed' },
    { pattern: /child_process/, message: 'child_process module is not allowed' },
    { pattern: /fs\./, message: 'File system access is not allowed' }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(message);
    }
  }

  // Try to parse as JavaScript
  try {
    new Function('params', code);
  } catch (error: any) {
    errors.push(`Syntax error: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
