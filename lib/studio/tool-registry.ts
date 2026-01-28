/**
 * CUSTOM TOOL REGISTRY
 *
 * Registry for custom user-defined tools (function calling)
 */

import { CustomTool, ToolParameter, ToolTestCase } from './types';

// ============================================================================
// PRE-BUILT UTILITY TOOLS
// ============================================================================

export const UTILITY_TOOLS: CustomTool[] = [
  {
    id: 'tool-format-date',
    name: 'Format Date',
    description: 'Format a date string using a specified format pattern',
    parameters: [
      {
        name: 'date',
        type: 'string',
        description: 'Date string to format (ISO 8601 or timestamp)',
        required: true
      },
      {
        name: 'format',
        type: 'string',
        description: 'Date format pattern (e.g., "YYYY-MM-DD", "DD/MM/YYYY HH:mm")',
        required: true,
        default: 'YYYY-MM-DD'
      }
    ],
    code: `function execute(params) {
  const { date, format } = params;

  // Parse input date
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date format');
  }

  // Simple format replacement
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  let result = format;
  result = result.replace('YYYY', year);
  result = result.replace('MM', month);
  result = result.replace('DD', day);
  result = result.replace('HH', hours);
  result = result.replace('mm', minutes);
  result = result.replace('ss', seconds);

  return result;
}`,
    runtime: 'javascript',
    timeout: 1000,
    author: 'Flowent AI',
    version: '1.0.0',
    tags: ['date', 'formatting', 'utility'],
    category: 'utility',
    verified: true,
    public: true,
    testCases: [
      {
        id: 'test-1',
        name: 'Format to YYYY-MM-DD',
        input: { date: '2024-01-15T10:30:00Z', format: 'YYYY-MM-DD' },
        expectedOutput: '2024-01-15',
        shouldPass: true
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  {
    id: 'tool-json-parse',
    name: 'Parse JSON',
    description: 'Parse a JSON string into an object',
    parameters: [
      {
        name: 'json',
        type: 'string',
        description: 'JSON string to parse',
        required: true
      }
    ],
    code: `function execute(params) {
  const { json } = params;

  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid JSON: ' + error.message);
  }
}`,
    runtime: 'javascript',
    timeout: 1000,
    author: 'Flowent AI',
    version: '1.0.0',
    tags: ['json', 'parsing', 'utility'],
    category: 'utility',
    verified: true,
    public: true,
    testCases: [
      {
        id: 'test-1',
        name: 'Parse valid JSON',
        input: { json: '{"name":"John","age":30}' },
        expectedOutput: { name: 'John', age: 30 },
        shouldPass: true
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  {
    id: 'tool-validate-email',
    name: 'Validate Email',
    description: 'Validate if a string is a valid email address',
    parameters: [
      {
        name: 'email',
        type: 'string',
        description: 'Email address to validate',
        required: true
      }
    ],
    code: `function execute(params) {
  const { email } = params;

  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  const isValid = emailRegex.test(email);

  return {
    valid: isValid,
    email: email
  };
}`,
    runtime: 'javascript',
    timeout: 1000,
    author: 'Flowent AI',
    version: '1.0.0',
    tags: ['email', 'validation', 'utility'],
    category: 'validation',
    verified: true,
    public: true,
    testCases: [
      {
        id: 'test-1',
        name: 'Valid email',
        input: { email: 'test@example.com' },
        expectedOutput: { valid: true, email: 'test@example.com' },
        shouldPass: true
      },
      {
        id: 'test-2',
        name: 'Invalid email',
        input: { email: 'not-an-email' },
        expectedOutput: { valid: false, email: 'not-an-email' },
        shouldPass: true
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  {
    id: 'tool-extract-domain',
    name: 'Extract Domain',
    description: 'Extract domain name from a URL or email address',
    parameters: [
      {
        name: 'input',
        type: 'string',
        description: 'URL or email address',
        required: true
      }
    ],
    code: `function execute(params) {
  const { input } = params;

  let domain = '';

  // Check if URL
  if (input.includes('://')) {
    try {
      const url = new URL(input);
      domain = url.hostname;
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }
  // Check if email
  else if (input.includes('@')) {
    const parts = input.split('@');
    if (parts.length === 2) {
      domain = parts[1];
    } else {
      throw new Error('Invalid email format');
    }
  }
  else {
    throw new Error('Input must be a URL or email address');
  }

  return domain;
}`,
    runtime: 'javascript',
    timeout: 1000,
    author: 'Flowent AI',
    version: '1.0.0',
    tags: ['url', 'email', 'parsing', 'utility'],
    category: 'utility',
    verified: true,
    public: true,
    testCases: [
      {
        id: 'test-1',
        name: 'Extract from URL',
        input: { input: 'https://example.com/path' },
        expectedOutput: 'example.com',
        shouldPass: true
      },
      {
        id: 'test-2',
        name: 'Extract from email',
        input: { input: 'user@example.com' },
        expectedOutput: 'example.com',
        shouldPass: true
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  {
    id: 'tool-calculate',
    name: 'Calculate Expression',
    description: 'Safely evaluate a mathematical expression',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2 * 3")',
        required: true
      }
    ],
    code: `function execute(params) {
  const { expression } = params;

  // Security: Only allow numbers and basic operators
  const safeExpression = expression.replace(/[^0-9+\\-*/().\\s]/g, '');

  if (safeExpression !== expression) {
    throw new Error('Expression contains invalid characters');
  }

  try {
    // Use Function constructor for safer eval
    const result = Function('"use strict"; return (' + safeExpression + ')')();

    return {
      expression: expression,
      result: result
    };
  } catch (error) {
    throw new Error('Invalid expression: ' + error.message);
  }
}`,
    runtime: 'javascript',
    timeout: 1000,
    author: 'Flowent AI',
    version: '1.0.0',
    tags: ['math', 'calculation', 'utility'],
    category: 'utility',
    verified: true,
    public: true,
    testCases: [
      {
        id: 'test-1',
        name: 'Simple addition',
        input: { expression: '2 + 2' },
        expectedOutput: { expression: '2 + 2', result: 4 },
        shouldPass: true
      },
      {
        id: 'test-2',
        name: 'Complex expression',
        input: { expression: '(10 + 5) * 2 - 3' },
        expectedOutput: { expression: '(10 + 5) * 2 - 3', result: 27 },
        shouldPass: true
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  {
    id: 'tool-text-transform',
    name: 'Transform Text',
    description: 'Transform text using various methods (uppercase, lowercase, title case, etc.)',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'Text to transform',
        required: true
      },
      {
        name: 'method',
        type: 'string',
        description: 'Transformation method',
        required: true,
        enum: ['uppercase', 'lowercase', 'titlecase', 'reverse', 'trim']
      }
    ],
    code: `function execute(params) {
  const { text, method } = params;

  switch (method) {
    case 'uppercase':
      return text.toUpperCase();

    case 'lowercase':
      return text.toLowerCase();

    case 'titlecase':
      return text.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

    case 'reverse':
      return text.split('').reverse().join('');

    case 'trim':
      return text.trim();

    default:
      throw new Error('Unknown transformation method: ' + method);
  }
}`,
    runtime: 'javascript',
    timeout: 1000,
    author: 'Flowent AI',
    version: '1.0.0',
    tags: ['text', 'transformation', 'utility'],
    category: 'transformation',
    verified: true,
    public: true,
    testCases: [
      {
        id: 'test-1',
        name: 'Uppercase',
        input: { text: 'hello world', method: 'uppercase' },
        expectedOutput: 'HELLO WORLD',
        shouldPass: true
      },
      {
        id: 'test-2',
        name: 'Title case',
        input: { text: 'hello world', method: 'titlecase' },
        expectedOutput: 'Hello World',
        shouldPass: true
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// ============================================================================
// TOOL REGISTRY CLASS
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, CustomTool> = new Map();

  constructor() {
    // Register built-in utility tools
    UTILITY_TOOLS.forEach(tool => {
      this.tools.set(tool.id, tool);
    });
  }

  /**
   * Register a new custom tool
   */
  registerTool(tool: CustomTool): void {
    // Validate tool
    this.validateTool(tool);

    // Check for duplicates
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with ID "${tool.id}" already exists`);
    }

    this.tools.set(tool.id, tool);
  }

  /**
   * Get a tool by ID
   */
  getTool(id: string): CustomTool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all tools
   */
  getAllTools(): CustomTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): CustomTool[] {
    return this.getAllTools().filter(tool => tool.category === category);
  }

  /**
   * Get public tools only
   */
  getPublicTools(): CustomTool[] {
    return this.getAllTools().filter(tool => tool.public);
  }

  /**
   * Get verified tools only
   */
  getVerifiedTools(): CustomTool[] {
    return this.getAllTools().filter(tool => tool.verified);
  }

  /**
   * Search tools by name or tags
   */
  searchTools(query: string): CustomTool[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTools().filter(tool =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Validate tool structure
   */
  private validateTool(tool: CustomTool): void {
    if (!tool.id) throw new Error('Tool ID is required');
    if (!tool.name) throw new Error('Tool name is required');
    if (!tool.description) throw new Error('Tool description is required');
    if (!tool.code) throw new Error('Tool code is required');
    if (!Array.isArray(tool.parameters)) throw new Error('Tool parameters must be an array');

    // Validate code contains execute function
    if (!tool.code.includes('function execute')) {
      throw new Error('Tool code must contain an "execute" function');
    }
  }

  /**
   * Delete a tool
   */
  deleteTool(id: string): boolean {
    return this.tools.delete(id);
  }

  /**
   * Update a tool
   */
  updateTool(id: string, updates: Partial<CustomTool>): void {
    const existing = this.tools.get(id);
    if (!existing) {
      throw new Error(`Tool with ID "${id}" not found`);
    }

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    this.validateTool(updated);
    this.tools.set(id, updated);
  }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}
