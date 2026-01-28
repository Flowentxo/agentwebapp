/**
 * ValidationService - Enterprise Input Validation System
 *
 * Provides comprehensive input validation for the Motion AI system
 *
 * Features:
 * - Schema-based validation (Zod-like)
 * - Custom validation rules
 * - Sanitization utilities
 * - Type coercion
 * - Nested object validation
 * - Array validation
 * - Async validation support
 * - Detailed error messages
 * - Validation caching
 */

import { EventEmitter } from 'events';
import { logger, LoggerInstance } from './LoggingService';

// ============================================
// TYPES & INTERFACES
// ============================================

export type ValidationResult<T = unknown> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: ValidationError[];
};

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  constraint?: string | number;
}

export interface ValidatorOptions {
  abortEarly?: boolean; // Stop on first error
  stripUnknown?: boolean; // Remove unknown fields
  coerce?: boolean; // Attempt type coercion
  sanitize?: boolean; // Apply sanitization
}

export type ValidatorFn<T = unknown> = (
  value: unknown,
  context?: ValidationContext
) => Promise<ValidationResult<T>> | ValidationResult<T>;

export interface ValidationContext {
  field: string;
  parent?: unknown;
  root?: unknown;
  options?: ValidatorOptions;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email' | 'url' | 'uuid' | 'any';
  required?: boolean;
  nullable?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  enum?: unknown[];
  items?: SchemaField; // For arrays
  properties?: Record<string, SchemaField>; // For objects
  custom?: ValidatorFn;
  transform?: (value: unknown) => unknown;
  message?: string; // Custom error message
}

export type ValidationSchema = Record<string, SchemaField>;

// ============================================
// CONSTANTS
// ============================================

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROR_CODES = {
  REQUIRED: 'VALIDATION_REQUIRED',
  TYPE_MISMATCH: 'VALIDATION_TYPE_MISMATCH',
  MIN_VALUE: 'VALIDATION_MIN_VALUE',
  MAX_VALUE: 'VALIDATION_MAX_VALUE',
  MIN_LENGTH: 'VALIDATION_MIN_LENGTH',
  MAX_LENGTH: 'VALIDATION_MAX_LENGTH',
  PATTERN: 'VALIDATION_PATTERN',
  ENUM: 'VALIDATION_ENUM',
  INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  INVALID_URL: 'VALIDATION_INVALID_URL',
  INVALID_UUID: 'VALIDATION_INVALID_UUID',
  INVALID_DATE: 'VALIDATION_INVALID_DATE',
  CUSTOM: 'VALIDATION_CUSTOM',
  ARRAY_ITEMS: 'VALIDATION_ARRAY_ITEMS',
  OBJECT_PROPERTIES: 'VALIDATION_OBJECT_PROPERTIES',
} as const;

const DEFAULT_OPTIONS: ValidatorOptions = {
  abortEarly: false,
  stripUnknown: true,
  coerce: true,
  sanitize: true,
};

// ============================================
// SANITIZATION UTILITIES
// ============================================

export const sanitizers = {
  /**
   * Trim whitespace from string
   */
  trim(value: string): string {
    return value.trim();
  },

  /**
   * Convert to lowercase
   */
  lowercase(value: string): string {
    return value.toLowerCase();
  },

  /**
   * Convert to uppercase
   */
  uppercase(value: string): string {
    return value.toUpperCase();
  },

  /**
   * Remove HTML tags
   */
  stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape HTML entities
   */
  escapeHtml(value: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return value.replace(/[&<>"']/g, (char) => htmlEntities[char]);
  },

  /**
   * Remove control characters
   */
  stripControlChars(value: string): string {
    return value.replace(/[\x00-\x1F\x7F]/g, '');
  },

  /**
   * Normalize whitespace
   */
  normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  },

  /**
   * Remove null bytes
   */
  stripNullBytes(value: string): string {
    return value.replace(/\0/g, '');
  },

  /**
   * Apply all basic sanitizations
   */
  basic(value: string): string {
    return sanitizers.stripNullBytes(
      sanitizers.stripControlChars(
        sanitizers.trim(value)
      )
    );
  },

  /**
   * Full sanitization for user input
   */
  full(value: string): string {
    return sanitizers.normalizeWhitespace(
      sanitizers.escapeHtml(
        sanitizers.stripHtml(
          sanitizers.basic(value)
        )
      )
    );
  },
};

// ============================================
// VALIDATION SERVICE
// ============================================

export class ValidationService extends EventEmitter {
  private static instance: ValidationService;
  private log: LoggerInstance;
  private validationCache: Map<string, ValidationResult> = new Map();
  private cacheMaxAge: number = 60000; // 1 minute

  private constructor() {
    super();
    this.log = logger.createLogger({
      service: 'validation',
      component: 'validator',
    });
    this.log.info('ValidationService initialized');
  }

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // ============================================
  // SCHEMA VALIDATION
  // ============================================

  /**
   * Validate data against a schema
   */
  async validate<T>(
    data: unknown,
    schema: ValidationSchema,
    options: ValidatorOptions = {}
  ): Promise<ValidationResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: ValidationError[] = [];
    const validated: Record<string, unknown> = {};

    if (typeof data !== 'object' || data === null) {
      return {
        success: false,
        errors: [
          {
            field: '$root',
            message: 'Data must be an object',
            code: ERROR_CODES.TYPE_MISMATCH,
            value: data,
          },
        ],
      };
    }

    const dataObj = data as Record<string, unknown>;

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = dataObj[fieldName];
      const context: ValidationContext = {
        field: fieldName,
        parent: data,
        root: data,
        options: opts,
      };

      const fieldResult = await this.validateField(value, fieldSchema, context);

      if (!fieldResult.success) {
        errors.push(...fieldResult.errors);
        if (opts.abortEarly) {
          return { success: false, errors };
        }
      } else {
        validated[fieldName] = fieldResult.data;
      }
    }

    // Copy unknown fields if not stripping
    if (!opts.stripUnknown) {
      for (const key of Object.keys(dataObj)) {
        if (!(key in schema)) {
          validated[key] = dataObj[key];
        }
      }
    }

    if (errors.length > 0) {
      this.emit('validation:failed', { errors, data });
      return { success: false, errors };
    }

    this.emit('validation:success', { data: validated });
    return { success: true, data: validated as T };
  }

  /**
   * Validate a single field
   */
  private async validateField(
    value: unknown,
    schema: SchemaField,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    let processedValue = value;

    // Handle undefined/null
    if (processedValue === undefined || processedValue === null) {
      if (schema.nullable && processedValue === null) {
        return { success: true, data: null };
      }
      if (schema.default !== undefined) {
        return { success: true, data: schema.default };
      }
      if (schema.required !== false) {
        errors.push({
          field: context.field,
          message: schema.message || `${context.field} is required`,
          code: ERROR_CODES.REQUIRED,
          value: processedValue,
        });
        return { success: false, errors };
      }
      return { success: true, data: undefined };
    }

    // Coerce type if enabled
    if (context.options?.coerce) {
      processedValue = this.coerceType(processedValue, schema.type);
    }

    // Apply sanitization if enabled and value is string
    if (context.options?.sanitize && typeof processedValue === 'string') {
      processedValue = sanitizers.basic(processedValue);
    }

    // Type validation
    const typeResult = this.validateType(processedValue, schema, context);
    if (!typeResult.success) {
      return typeResult;
    }

    // Type-specific validations
    switch (schema.type) {
      case 'string':
      case 'email':
      case 'url':
      case 'uuid':
        const stringErrors = this.validateString(
          processedValue as string,
          schema,
          context
        );
        errors.push(...stringErrors);
        break;

      case 'number':
        const numberErrors = this.validateNumber(
          processedValue as number,
          schema,
          context
        );
        errors.push(...numberErrors);
        break;

      case 'array':
        const arrayResult = await this.validateArray(
          processedValue as unknown[],
          schema,
          context
        );
        if (!arrayResult.success) {
          errors.push(...arrayResult.errors);
        } else {
          processedValue = arrayResult.data;
        }
        break;

      case 'object':
        const objectResult = await this.validateObject(
          processedValue as Record<string, unknown>,
          schema,
          context
        );
        if (!objectResult.success) {
          errors.push(...objectResult.errors);
        } else {
          processedValue = objectResult.data;
        }
        break;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(processedValue)) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must be one of: ${schema.enum.join(', ')}`,
        code: ERROR_CODES.ENUM,
        value: processedValue,
        constraint: schema.enum.join(', '),
      });
    }

    // Custom validation
    if (schema.custom && errors.length === 0) {
      const customResult = await schema.custom(processedValue, context);
      if (!customResult.success) {
        errors.push(...customResult.errors);
      }
    }

    // Apply transform
    if (schema.transform && errors.length === 0) {
      processedValue = schema.transform(processedValue);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: processedValue };
  }

  /**
   * Validate type
   */
  private validateType(
    value: unknown,
    schema: SchemaField,
    context: ValidationContext
  ): ValidationResult {
    const typeChecks: Record<SchemaField['type'], () => boolean> = {
      string: () => typeof value === 'string',
      number: () => typeof value === 'number' && !isNaN(value),
      boolean: () => typeof value === 'boolean',
      array: () => Array.isArray(value),
      object: () => typeof value === 'object' && value !== null && !Array.isArray(value),
      date: () => value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value))),
      email: () => typeof value === 'string' && EMAIL_REGEX.test(value),
      url: () => typeof value === 'string' && URL_REGEX.test(value),
      uuid: () => typeof value === 'string' && UUID_REGEX.test(value),
      any: () => true,
    };

    if (!typeChecks[schema.type]()) {
      return {
        success: false,
        errors: [
          {
            field: context.field,
            message: schema.message || `${context.field} must be a valid ${schema.type}`,
            code: this.getTypeErrorCode(schema.type),
            value,
            constraint: schema.type,
          },
        ],
      };
    }

    return { success: true, data: value };
  }

  /**
   * Validate string
   */
  private validateString(
    value: string,
    schema: SchemaField,
    context: ValidationContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must be at least ${schema.minLength} characters`,
        code: ERROR_CODES.MIN_LENGTH,
        value,
        constraint: schema.minLength,
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must be at most ${schema.maxLength} characters`,
        code: ERROR_CODES.MAX_LENGTH,
        value,
        constraint: schema.maxLength,
      });
    }

    if (schema.pattern) {
      const regex = typeof schema.pattern === 'string'
        ? new RegExp(schema.pattern)
        : schema.pattern;
      if (!regex.test(value)) {
        errors.push({
          field: context.field,
          message: schema.message || `${context.field} has invalid format`,
          code: ERROR_CODES.PATTERN,
          value,
        });
      }
    }

    return errors;
  }

  /**
   * Validate number
   */
  private validateNumber(
    value: number,
    schema: SchemaField,
    context: ValidationContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (schema.min !== undefined && value < schema.min) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must be at least ${schema.min}`,
        code: ERROR_CODES.MIN_VALUE,
        value,
        constraint: schema.min,
      });
    }

    if (schema.max !== undefined && value > schema.max) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must be at most ${schema.max}`,
        code: ERROR_CODES.MAX_VALUE,
        value,
        constraint: schema.max,
      });
    }

    return errors;
  }

  /**
   * Validate array
   */
  private async validateArray(
    value: unknown[],
    schema: SchemaField,
    context: ValidationContext
  ): Promise<ValidationResult<unknown[]>> {
    const errors: ValidationError[] = [];
    const validated: unknown[] = [];

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must have at least ${schema.minLength} items`,
        code: ERROR_CODES.MIN_LENGTH,
        value,
        constraint: schema.minLength,
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: context.field,
        message: schema.message || `${context.field} must have at most ${schema.maxLength} items`,
        code: ERROR_CODES.MAX_LENGTH,
        value,
        constraint: schema.maxLength,
      });
    }

    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemContext: ValidationContext = {
          field: `${context.field}[${i}]`,
          parent: value,
          root: context.root,
          options: context.options,
        };

        const itemResult = await this.validateField(value[i], schema.items, itemContext);
        if (!itemResult.success) {
          errors.push(...itemResult.errors);
        } else {
          validated.push(itemResult.data);
        }
      }
    } else {
      validated.push(...value);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: validated };
  }

  /**
   * Validate object
   */
  private async validateObject(
    value: Record<string, unknown>,
    schema: SchemaField,
    context: ValidationContext
  ): Promise<ValidationResult<Record<string, unknown>>> {
    if (!schema.properties) {
      return { success: true, data: value };
    }

    const errors: ValidationError[] = [];
    const validated: Record<string, unknown> = {};

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propContext: ValidationContext = {
        field: `${context.field}.${key}`,
        parent: value,
        root: context.root,
        options: context.options,
      };

      const propResult = await this.validateField(value[key], propSchema, propContext);
      if (!propResult.success) {
        errors.push(...propResult.errors);
      } else {
        validated[key] = propResult.data;
      }
    }

    // Copy unknown fields if not stripping
    if (!context.options?.stripUnknown) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          validated[key] = value[key];
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: validated };
  }

  /**
   * Coerce value to target type
   */
  private coerceType(value: unknown, targetType: SchemaField['type']): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case 'string':
        return String(value);

      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;

      case 'boolean':
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'true') return true;
          if (value.toLowerCase() === 'false') return false;
        }
        return Boolean(value);

      case 'date':
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date;
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Get error code for type mismatch
   */
  private getTypeErrorCode(type: SchemaField['type']): string {
    switch (type) {
      case 'email':
        return ERROR_CODES.INVALID_EMAIL;
      case 'url':
        return ERROR_CODES.INVALID_URL;
      case 'uuid':
        return ERROR_CODES.INVALID_UUID;
      case 'date':
        return ERROR_CODES.INVALID_DATE;
      default:
        return ERROR_CODES.TYPE_MISMATCH;
    }
  }

  // ============================================
  // COMMON SCHEMAS
  // ============================================

  /**
   * Get common validation schemas for Motion agents
   */
  getCommonSchemas() {
    return {
      /**
       * Agent chat message validation
       */
      chatMessage: {
        content: {
          type: 'string' as const,
          required: true,
          minLength: 1,
          maxLength: 10000,
          message: 'Message content is required and must be 1-10000 characters',
        },
        userId: {
          type: 'string' as const,
          required: true,
          minLength: 1,
          maxLength: 255,
        },
        agentId: {
          type: 'string' as const,
          required: true,
          enum: ['alfred', 'suki', 'millie', 'chip', 'dot', 'clide', 'spec'],
        },
        sessionId: {
          type: 'uuid' as const,
          required: false,
        },
      },

      /**
       * Tool execution context validation
       */
      toolContext: {
        userId: {
          type: 'string' as const,
          required: true,
          minLength: 1,
        },
        workspaceId: {
          type: 'string' as const,
          required: true,
          minLength: 1,
        },
        agentId: {
          type: 'string' as const,
          required: true,
          enum: ['alfred', 'suki', 'millie', 'chip', 'dot', 'clide', 'spec'],
        },
        permissions: {
          type: 'array' as const,
          required: false,
          items: {
            type: 'string' as const,
            enum: ['read', 'write', 'execute', 'admin'],
          },
        },
      },

      /**
       * Email generation params
       */
      emailParams: {
        purpose: {
          type: 'string' as const,
          required: true,
          minLength: 10,
          maxLength: 2000,
        },
        recipient: {
          type: 'object' as const,
          required: true,
          properties: {
            name: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 },
            email: { type: 'email' as const, required: false },
            title: { type: 'string' as const, required: false, maxLength: 100 },
            company: { type: 'string' as const, required: false, maxLength: 100 },
          },
        },
        tone: {
          type: 'string' as const,
          required: false,
          enum: ['professional', 'friendly', 'formal', 'urgent'],
          default: 'professional',
        },
      },

      /**
       * Rate limit context validation
       */
      rateLimitContext: {
        userId: {
          type: 'string' as const,
          required: true,
          minLength: 1,
        },
        workspaceId: {
          type: 'string' as const,
          required: false,
        },
        agentId: {
          type: 'string' as const,
          required: false,
        },
        priority: {
          type: 'string' as const,
          required: false,
          enum: ['low', 'normal', 'high', 'critical'],
          default: 'normal',
        },
      },

      /**
       * Project creation validation
       */
      project: {
        name: {
          type: 'string' as const,
          required: true,
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string' as const,
          required: false,
          maxLength: 5000,
        },
        status: {
          type: 'string' as const,
          required: false,
          enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
          default: 'planning',
        },
        priority: {
          type: 'string' as const,
          required: false,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        startDate: {
          type: 'date' as const,
          required: false,
        },
        endDate: {
          type: 'date' as const,
          required: false,
        },
      },
    };
  }

  // ============================================
  // QUICK VALIDATORS
  // ============================================

  /**
   * Quick validate string
   */
  isValidString(value: unknown, options?: { minLength?: number; maxLength?: number; pattern?: RegExp }): boolean {
    if (typeof value !== 'string') return false;
    if (options?.minLength !== undefined && value.length < options.minLength) return false;
    if (options?.maxLength !== undefined && value.length > options.maxLength) return false;
    if (options?.pattern && !options.pattern.test(value)) return false;
    return true;
  }

  /**
   * Quick validate number
   */
  isValidNumber(value: unknown, options?: { min?: number; max?: number; integer?: boolean }): boolean {
    if (typeof value !== 'number' || isNaN(value)) return false;
    if (options?.min !== undefined && value < options.min) return false;
    if (options?.max !== undefined && value > options.max) return false;
    if (options?.integer && !Number.isInteger(value)) return false;
    return true;
  }

  /**
   * Quick validate email
   */
  isValidEmail(value: unknown): boolean {
    return typeof value === 'string' && EMAIL_REGEX.test(value);
  }

  /**
   * Quick validate URL
   */
  isValidUrl(value: unknown): boolean {
    return typeof value === 'string' && URL_REGEX.test(value);
  }

  /**
   * Quick validate UUID
   */
  isValidUuid(value: unknown): boolean {
    return typeof value === 'string' && UUID_REGEX.test(value);
  }

  /**
   * Quick validate date
   */
  isValidDate(value: unknown): boolean {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string') return !isNaN(Date.parse(value));
    return false;
  }

  /**
   * Quick validate array
   */
  isValidArray(value: unknown, options?: { minLength?: number; maxLength?: number }): boolean {
    if (!Array.isArray(value)) return false;
    if (options?.minLength !== undefined && value.length < options.minLength) return false;
    if (options?.maxLength !== undefined && value.length > options.maxLength) return false;
    return true;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const validator = ValidationService.getInstance();

export default ValidationService;
