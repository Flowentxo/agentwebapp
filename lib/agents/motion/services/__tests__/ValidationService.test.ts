/**
 * ValidationService Unit Tests
 *
 * Tests for the enterprise input validation system
 */

import {
  ValidationService,
  validator,
  sanitizers,
  ValidationSchema,
  ValidationResult,
} from '../ValidationService';

describe('ValidationService', () => {
  describe('Basic Validation', () => {
    it('should validate required string field', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true },
      };

      const result = await validator.validate({ name: 'John' }, schema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John');
      }
    });

    it('should fail on missing required field', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true },
      };

      const result = await validator.validate({}, schema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe('VALIDATION_REQUIRED');
      }
    });

    it('should use default value for optional field', async () => {
      const schema: ValidationSchema = {
        status: { type: 'string', required: false, default: 'active' },
      };

      const result = await validator.validate({}, schema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });

    it('should allow nullable fields', async () => {
      const schema: ValidationSchema = {
        description: { type: 'string', nullable: true },
      };

      const result = await validator.validate({ description: null }, schema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });
  });

  describe('String Validation', () => {
    it('should validate string type', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string' },
      };

      const result = await validator.validate({ name: 'John' }, schema);
      expect(result.success).toBe(true);
    });

    it('should fail on wrong type', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string' },
      };

      const result = await validator.validate({ name: 123 }, schema, { coerce: false });
      expect(result.success).toBe(false);
    });

    it('should validate minLength', async () => {
      const schema: ValidationSchema = {
        password: { type: 'string', minLength: 8 },
      };

      const resultShort = await validator.validate({ password: 'short' }, schema);
      expect(resultShort.success).toBe(false);

      const resultLong = await validator.validate({ password: 'longenough123' }, schema);
      expect(resultLong.success).toBe(true);
    });

    it('should validate maxLength', async () => {
      const schema: ValidationSchema = {
        code: { type: 'string', maxLength: 6 },
      };

      const resultLong = await validator.validate({ code: 'TOOLONGCODE' }, schema);
      expect(resultLong.success).toBe(false);

      const resultOk = await validator.validate({ code: 'ABC123' }, schema);
      expect(resultOk.success).toBe(true);
    });

    it('should validate pattern', async () => {
      const schema: ValidationSchema = {
        code: { type: 'string', pattern: /^[A-Z]{3}[0-9]{3}$/ },
      };

      const resultInvalid = await validator.validate({ code: 'abc123' }, schema);
      expect(resultInvalid.success).toBe(false);

      const resultValid = await validator.validate({ code: 'ABC123' }, schema);
      expect(resultValid.success).toBe(true);
    });
  });

  describe('Number Validation', () => {
    it('should validate number type', async () => {
      const schema: ValidationSchema = {
        age: { type: 'number' },
      };

      const result = await validator.validate({ age: 25 }, schema);
      expect(result.success).toBe(true);
    });

    it('should coerce string to number', async () => {
      const schema: ValidationSchema = {
        age: { type: 'number' },
      };

      const result = await validator.validate({ age: '25' }, schema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(25);
      }
    });

    it('should validate min value', async () => {
      const schema: ValidationSchema = {
        age: { type: 'number', min: 18 },
      };

      const resultLow = await validator.validate({ age: 15 }, schema);
      expect(resultLow.success).toBe(false);

      const resultOk = await validator.validate({ age: 21 }, schema);
      expect(resultOk.success).toBe(true);
    });

    it('should validate max value', async () => {
      const schema: ValidationSchema = {
        score: { type: 'number', max: 100 },
      };

      const resultHigh = await validator.validate({ score: 150 }, schema);
      expect(resultHigh.success).toBe(false);

      const resultOk = await validator.validate({ score: 85 }, schema);
      expect(resultOk.success).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', async () => {
      const schema: ValidationSchema = {
        email: { type: 'email' },
      };

      const resultValid = await validator.validate({ email: 'user@example.com' }, schema);
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ email: 'invalid-email' }, schema);
      expect(resultInvalid.success).toBe(false);
    });

    it('should fail on invalid email formats', async () => {
      const schema: ValidationSchema = {
        email: { type: 'email' },
      };

      const invalidEmails = ['@example.com', 'user@', 'user@.com', 'user.example.com'];
      for (const email of invalidEmails) {
        const result = await validator.validate({ email }, schema);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('URL Validation', () => {
    it('should validate URL format', async () => {
      const schema: ValidationSchema = {
        website: { type: 'url' },
      };

      const resultValid = await validator.validate({ website: 'https://example.com' }, schema);
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ website: 'not-a-url' }, schema);
      expect(resultInvalid.success).toBe(false);
    });
  });

  describe('UUID Validation', () => {
    it('should validate UUID format', async () => {
      const schema: ValidationSchema = {
        id: { type: 'uuid' },
      };

      const resultValid = await validator.validate(
        { id: '123e4567-e89b-12d3-a456-426614174000' },
        schema
      );
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ id: 'not-a-uuid' }, schema);
      expect(resultInvalid.success).toBe(false);
    });
  });

  describe('Enum Validation', () => {
    it('should validate enum values', async () => {
      const schema: ValidationSchema = {
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
      };

      const resultValid = await validator.validate({ status: 'active' }, schema);
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ status: 'unknown' }, schema);
      expect(resultInvalid.success).toBe(false);
    });
  });

  describe('Array Validation', () => {
    it('should validate array type', async () => {
      const schema: ValidationSchema = {
        tags: { type: 'array' },
      };

      const resultValid = await validator.validate({ tags: ['a', 'b', 'c'] }, schema);
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ tags: 'not-an-array' }, schema);
      expect(resultInvalid.success).toBe(false);
    });

    it('should validate array items', async () => {
      const schema: ValidationSchema = {
        scores: {
          type: 'array',
          items: { type: 'number', min: 0, max: 100 },
        },
      };

      const resultValid = await validator.validate({ scores: [85, 90, 75] }, schema);
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ scores: [85, 150, 75] }, schema);
      expect(resultInvalid.success).toBe(false);
    });

    it('should validate array length', async () => {
      const schema: ValidationSchema = {
        items: { type: 'array', minLength: 1, maxLength: 5 },
      };

      const resultEmpty = await validator.validate({ items: [] }, schema);
      expect(resultEmpty.success).toBe(false);

      const resultTooLong = await validator.validate({ items: [1, 2, 3, 4, 5, 6] }, schema);
      expect(resultTooLong.success).toBe(false);

      const resultOk = await validator.validate({ items: [1, 2, 3] }, schema);
      expect(resultOk.success).toBe(true);
    });
  });

  describe('Object Validation', () => {
    it('should validate nested object properties', async () => {
      const schema: ValidationSchema = {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number', min: 0 },
          },
        },
      };

      const resultValid = await validator.validate(
        { user: { name: 'John', age: 30 } },
        schema
      );
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate(
        { user: { age: 30 } },
        schema
      );
      expect(resultInvalid.success).toBe(false);
    });
  });

  describe('Custom Validation', () => {
    it('should run custom validator', async () => {
      const schema: ValidationSchema = {
        password: {
          type: 'string',
          custom: async (value) => {
            const password = value as string;
            if (!/[A-Z]/.test(password)) {
              return {
                success: false,
                errors: [{ field: 'password', message: 'Must contain uppercase', code: 'CUSTOM' }],
              };
            }
            return { success: true, data: value };
          },
        },
      };

      const resultValid = await validator.validate({ password: 'Password123' }, schema);
      expect(resultValid.success).toBe(true);

      const resultInvalid = await validator.validate({ password: 'password123' }, schema);
      expect(resultInvalid.success).toBe(false);
    });
  });

  describe('Transform', () => {
    it('should apply transform function', async () => {
      const schema: ValidationSchema = {
        email: {
          type: 'email',
          transform: (value) => (value as string).toLowerCase(),
        },
      };

      const result = await validator.validate({ email: 'USER@EXAMPLE.COM' }, schema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('Sanitizers', () => {
    it('should trim whitespace', () => {
      expect(sanitizers.trim('  hello  ')).toBe('hello');
    });

    it('should convert to lowercase', () => {
      expect(sanitizers.lowercase('HELLO')).toBe('hello');
    });

    it('should convert to uppercase', () => {
      expect(sanitizers.uppercase('hello')).toBe('HELLO');
    });

    it('should strip HTML tags', () => {
      expect(sanitizers.stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('should escape HTML entities', () => {
      expect(sanitizers.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should strip control characters', () => {
      expect(sanitizers.stripControlChars('hello\x00world')).toBe('helloworld');
    });

    it('should normalize whitespace', () => {
      expect(sanitizers.normalizeWhitespace('  hello   world  ')).toBe('hello world');
    });

    it('should apply full sanitization', () => {
      const input = '<script>alert("xss")</script>  Hello   World  \x00';
      const sanitized = sanitizers.full(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('\x00');
    });
  });

  describe('Quick Validators', () => {
    it('isValidString should work correctly', () => {
      expect(validator.isValidString('hello')).toBe(true);
      expect(validator.isValidString(123)).toBe(false);
      expect(validator.isValidString('hi', { minLength: 5 })).toBe(false);
      expect(validator.isValidString('hello world', { maxLength: 5 })).toBe(false);
      expect(validator.isValidString('hello', { pattern: /^[a-z]+$/ })).toBe(true);
    });

    it('isValidNumber should work correctly', () => {
      expect(validator.isValidNumber(42)).toBe(true);
      expect(validator.isValidNumber('42')).toBe(false);
      expect(validator.isValidNumber(NaN)).toBe(false);
      expect(validator.isValidNumber(5, { min: 10 })).toBe(false);
      expect(validator.isValidNumber(15, { max: 10 })).toBe(false);
      expect(validator.isValidNumber(3.14, { integer: true })).toBe(false);
    });

    it('isValidEmail should work correctly', () => {
      expect(validator.isValidEmail('user@example.com')).toBe(true);
      expect(validator.isValidEmail('invalid')).toBe(false);
    });

    it('isValidUrl should work correctly', () => {
      expect(validator.isValidUrl('https://example.com')).toBe(true);
      expect(validator.isValidUrl('not-a-url')).toBe(false);
    });

    it('isValidUuid should work correctly', () => {
      expect(validator.isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validator.isValidUuid('not-a-uuid')).toBe(false);
    });

    it('isValidDate should work correctly', () => {
      expect(validator.isValidDate(new Date())).toBe(true);
      expect(validator.isValidDate('2024-01-01')).toBe(true);
      expect(validator.isValidDate('invalid-date')).toBe(false);
    });

    it('isValidArray should work correctly', () => {
      expect(validator.isValidArray([1, 2, 3])).toBe(true);
      expect(validator.isValidArray('not-array')).toBe(false);
      expect(validator.isValidArray([], { minLength: 1 })).toBe(false);
      expect(validator.isValidArray([1, 2, 3, 4, 5, 6], { maxLength: 5 })).toBe(false);
    });
  });

  describe('Common Schemas', () => {
    it('should provide chat message schema', async () => {
      const schemas = validator.getCommonSchemas();
      expect(schemas.chatMessage).toBeDefined();

      const result = await validator.validate(
        {
          content: 'Hello, agent!',
          userId: 'user-123',
          agentId: 'alfred',
        },
        schemas.chatMessage
      );
      expect(result.success).toBe(true);
    });

    it('should validate email params schema', async () => {
      const schemas = validator.getCommonSchemas();

      const result = await validator.validate(
        {
          purpose: 'Schedule a meeting for next week',
          recipient: {
            name: 'John Doe',
            title: 'CEO',
            company: 'Acme Corp',
          },
          tone: 'professional',
        },
        schemas.emailParams
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Options', () => {
    it('should abort early when option is set', async () => {
      const schema: ValidationSchema = {
        field1: { type: 'string', required: true },
        field2: { type: 'string', required: true },
        field3: { type: 'string', required: true },
      };

      const result = await validator.validate({}, schema, { abortEarly: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBe(1);
      }
    });

    it('should strip unknown fields when option is set', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string' },
      };

      const result = await validator.validate(
        { name: 'John', extra: 'field' },
        schema,
        { stripUnknown: true }
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extra).toBeUndefined();
      }
    });

    it('should keep unknown fields when stripUnknown is false', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string' },
      };

      const result = await validator.validate(
        { name: 'John', extra: 'field' },
        schema,
        { stripUnknown: false }
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).extra).toBe('field');
      }
    });
  });
});

describe('ValidationService Singleton', () => {
  it('should return the same instance', () => {
    const instance1 = ValidationService.getInstance();
    const instance2 = ValidationService.getInstance();
    expect(instance1).toBe(instance2);
  });
});
