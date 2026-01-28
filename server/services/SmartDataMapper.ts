/**
 * SmartDataMapper
 *
 * Utility service that intelligently transforms unstructured outputs
 * (e.g., LLM text responses) into structured inputs for downstream nodes.
 *
 * Features:
 * - JSON extraction from text
 * - Schema-based mapping
 * - Type coercion
 * - Field inference
 */

import OpenAI from 'openai';

// =====================================================
// TYPES
// =====================================================

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  required?: boolean;
  description?: string;
  default?: any;
  enum?: any[];
}

export interface MappingSchema {
  fields: FieldSchema[];
  strict?: boolean; // Fail if required fields missing
}

export interface MappingResult {
  success: boolean;
  data: Record<string, any>;
  mappedFields: string[];
  missingFields: string[];
  errors: string[];
  confidence: number; // 0-1
}

export interface ExtractionOptions {
  schema?: MappingSchema;
  useAI?: boolean;
  fallbackDefaults?: boolean;
  preserveUnmapped?: boolean;
}

// =====================================================
// EXTRACTION PATTERNS
// =====================================================

const JSON_PATTERNS = [
  // Full JSON object
  /```json\s*([\s\S]*?)\s*```/g,
  /```\s*([\s\S]*?)\s*```/g,
  /\{[\s\S]*\}/g,
  /\[[\s\S]*\]/g,
];

const KEY_VALUE_PATTERNS = [
  // Key: Value patterns
  /(\w+):\s*([^\n,}]+)/g,
  // Key = Value patterns
  /(\w+)\s*=\s*([^\n,}]+)/g,
  // **Key**: Value (markdown)
  /\*\*(\w+)\*\*:\s*([^\n]+)/g,
];

// =====================================================
// SMART DATA MAPPER
// =====================================================

export class SmartDataMapper {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && !apiKey.includes('YOUR_')) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Main mapping function - transforms input to structured output
   */
  async map(
    input: any,
    options: ExtractionOptions = {}
  ): Promise<MappingResult> {
    const { schema, useAI = false, fallbackDefaults = true, preserveUnmapped = false } = options;

    // If input is already structured and matches schema
    if (this.isStructuredData(input)) {
      return this.mapStructuredData(input, schema, fallbackDefaults);
    }

    // If input is a string, try to extract structure
    if (typeof input === 'string') {
      // First, try regex-based extraction
      const regexResult = this.extractFromString(input, schema);

      if (regexResult.success && regexResult.confidence > 0.7) {
        return regexResult;
      }

      // If regex fails and AI is enabled, use LLM for extraction
      if (useAI && this.openai && schema) {
        const aiResult = await this.extractWithAI(input, schema);
        if (aiResult.success) {
          return aiResult;
        }
      }

      // Return partial regex result if available
      if (regexResult.mappedFields.length > 0) {
        return regexResult;
      }
    }

    // Fallback: return input as-is
    return {
      success: false,
      data: typeof input === 'object' ? input : { raw: input },
      mappedFields: [],
      missingFields: schema?.fields.filter(f => f.required).map(f => f.name) || [],
      errors: ['Could not extract structured data from input'],
      confidence: 0,
    };
  }

  /**
   * Extract JSON from a string
   */
  extractJSON(text: string): any | null {
    for (const pattern of JSON_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          try {
            // Clean up the match
            let cleaned = match
              .replace(/```json\s*/g, '')
              .replace(/```\s*/g, '')
              .trim();

            const parsed = JSON.parse(cleaned);
            return parsed;
          } catch {
            // Continue to next pattern
          }
        }
      }
    }
    return null;
  }

  /**
   * Map structured data against a schema
   */
  private mapStructuredData(
    data: Record<string, any>,
    schema?: MappingSchema,
    fallbackDefaults: boolean = true
  ): MappingResult {
    if (!schema) {
      return {
        success: true,
        data,
        mappedFields: Object.keys(data),
        missingFields: [],
        errors: [],
        confidence: 1,
      };
    }

    const result: Record<string, any> = {};
    const mappedFields: string[] = [];
    const missingFields: string[] = [];
    const errors: string[] = [];

    for (const field of schema.fields) {
      const value = this.findFieldValue(data, field);

      if (value !== undefined) {
        const coerced = this.coerceType(value, field.type);
        if (coerced.success) {
          result[field.name] = coerced.value;
          mappedFields.push(field.name);
        } else {
          errors.push(`Failed to coerce ${field.name} to ${field.type}`);
          if (fallbackDefaults && field.default !== undefined) {
            result[field.name] = field.default;
            mappedFields.push(field.name);
          } else if (field.required) {
            missingFields.push(field.name);
          }
        }
      } else if (fallbackDefaults && field.default !== undefined) {
        result[field.name] = field.default;
        mappedFields.push(field.name);
      } else if (field.required) {
        missingFields.push(field.name);
      }
    }

    const confidence = mappedFields.length / schema.fields.length;
    const success = missingFields.length === 0 || !schema.strict;

    return {
      success,
      data: result,
      mappedFields,
      missingFields,
      errors,
      confidence,
    };
  }

  /**
   * Find field value in data using various key formats
   */
  private findFieldValue(data: Record<string, any>, field: FieldSchema): any {
    // Direct match
    if (data[field.name] !== undefined) {
      return data[field.name];
    }

    // Case-insensitive match
    const lowerName = field.name.toLowerCase();
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    // Snake case to camel case and vice versa
    const snakeCase = field.name.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
    const camelCase = field.name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    if (data[snakeCase] !== undefined) return data[snakeCase];
    if (data[camelCase] !== undefined) return data[camelCase];

    // Nested path search
    if (field.name.includes('.')) {
      const parts = field.name.split('.');
      let current = data;
      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return current;
    }

    return undefined;
  }

  /**
   * Extract structured data from text using regex
   */
  private extractFromString(
    text: string,
    schema?: MappingSchema
  ): MappingResult {
    // First, try to extract JSON
    const jsonData = this.extractJSON(text);
    if (jsonData) {
      return this.mapStructuredData(jsonData, schema);
    }

    // Try key-value extraction
    const extracted: Record<string, string> = {};

    for (const pattern of KEY_VALUE_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key && value) {
          extracted[key] = value;
        }
      }
    }

    if (Object.keys(extracted).length > 0) {
      return this.mapStructuredData(extracted, schema);
    }

    return {
      success: false,
      data: { raw: text },
      mappedFields: [],
      missingFields: schema?.fields.filter(f => f.required).map(f => f.name) || [],
      errors: ['No structured data patterns found in text'],
      confidence: 0,
    };
  }

  /**
   * Use AI to extract structured data from text
   */
  private async extractWithAI(
    text: string,
    schema: MappingSchema
  ): Promise<MappingResult> {
    if (!this.openai) {
      return {
        success: false,
        data: {},
        mappedFields: [],
        missingFields: schema.fields.filter(f => f.required).map(f => f.name),
        errors: ['AI extraction unavailable - no OpenAI API key'],
        confidence: 0,
      };
    }

    const fieldDescriptions = schema.fields
      .map(f => `- ${f.name} (${f.type}${f.required ? ', required' : ''}): ${f.description || 'No description'}`)
      .join('\n');

    const prompt = `Extract the following fields from the text below. Return ONLY valid JSON.

Fields to extract:
${fieldDescriptions}

Text:
"""
${text.substring(0, 3000)}
"""

Respond with a JSON object containing the extracted fields. Use null for missing optional fields.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract structured data from text and return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const extracted = JSON.parse(content);

      return this.mapStructuredData(extracted, schema);
    } catch (error: any) {
      console.error('[SmartDataMapper] AI extraction failed:', error.message);
      return {
        success: false,
        data: {},
        mappedFields: [],
        missingFields: schema.fields.filter(f => f.required).map(f => f.name),
        errors: [`AI extraction failed: ${error.message}`],
        confidence: 0,
      };
    }
  }

  /**
   * Coerce value to target type
   */
  private coerceType(
    value: any,
    targetType: FieldSchema['type']
  ): { success: boolean; value: any } {
    if (targetType === 'any') {
      return { success: true, value };
    }

    try {
      switch (targetType) {
        case 'string':
          return { success: true, value: String(value) };

        case 'number': {
          const num = Number(value);
          if (isNaN(num)) {
            // Try to extract number from string
            const match = String(value).match(/[-+]?\d*\.?\d+/);
            if (match) {
              return { success: true, value: Number(match[0]) };
            }
            return { success: false, value };
          }
          return { success: true, value: num };
        }

        case 'boolean': {
          if (typeof value === 'boolean') return { success: true, value };
          const str = String(value).toLowerCase();
          if (['true', 'yes', '1', 'on'].includes(str)) {
            return { success: true, value: true };
          }
          if (['false', 'no', '0', 'off'].includes(str)) {
            return { success: true, value: false };
          }
          return { success: false, value };
        }

        case 'array': {
          if (Array.isArray(value)) return { success: true, value };
          if (typeof value === 'string') {
            // Try to parse as JSON array
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) return { success: true, value: parsed };
            } catch {}
            // Try comma-separated
            return { success: true, value: value.split(',').map(s => s.trim()) };
          }
          return { success: true, value: [value] };
        }

        case 'object': {
          if (typeof value === 'object' && value !== null) {
            return { success: true, value };
          }
          if (typeof value === 'string') {
            try {
              return { success: true, value: JSON.parse(value) };
            } catch {
              return { success: false, value };
            }
          }
          return { success: false, value };
        }

        default:
          return { success: true, value };
      }
    } catch {
      return { success: false, value };
    }
  }

  /**
   * Check if data is already structured
   */
  private isStructuredData(data: any): data is Record<string, any> {
    return (
      typeof data === 'object' &&
      data !== null &&
      !Array.isArray(data) &&
      Object.keys(data).length > 0
    );
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Infer schema from sample data
   */
  inferSchema(sampleData: Record<string, any>): MappingSchema {
    const fields: FieldSchema[] = [];

    for (const [key, value] of Object.entries(sampleData)) {
      let type: FieldSchema['type'] = 'any';

      if (typeof value === 'string') type = 'string';
      else if (typeof value === 'number') type = 'number';
      else if (typeof value === 'boolean') type = 'boolean';
      else if (Array.isArray(value)) type = 'array';
      else if (typeof value === 'object' && value !== null) type = 'object';

      fields.push({
        name: key,
        type,
        required: false,
      });
    }

    return { fields };
  }

  /**
   * Transform data using a mapping configuration
   */
  transform(
    data: Record<string, any>,
    mapping: Record<string, string | ((val: any) => any)>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [targetKey, source] of Object.entries(mapping)) {
      if (typeof source === 'function') {
        result[targetKey] = source(data);
      } else if (typeof source === 'string') {
        // Source is a key path
        result[targetKey] = this.getNestedValue(data, source);
      }
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Merge multiple data sources
   */
  merge(...sources: Record<string, any>[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const source of sources) {
      for (const [key, value] of Object.entries(source)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value) && result[key]) {
            // Deep merge objects
            result[key] = this.merge(result[key], value);
          } else {
            result[key] = value;
          }
        }
      }
    }

    return result;
  }
}

// Singleton instance
export const smartDataMapper = new SmartDataMapper();
