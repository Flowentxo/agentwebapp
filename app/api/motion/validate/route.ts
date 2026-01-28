/**
 * Validation API Endpoint
 *
 * Provides input validation capabilities for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { validator } from '@/lib/agents/motion/services/ValidationService';

/**
 * POST /api/motion/validate
 *
 * Validate data against a schema
 *
 * Body:
 * - data: The data to validate
 * - schema: The validation schema (optional, use schemaName instead)
 * - schemaName: Name of a predefined schema (e.g., 'chatMessage', 'emailParams')
 * - options: Validation options
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, schema, schemaName, options } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'data is required' },
        { status: 400 }
      );
    }

    // Get schema from predefined or custom
    let validationSchema = schema;
    if (schemaName) {
      const commonSchemas = validator.getCommonSchemas();
      validationSchema = commonSchemas[schemaName as keyof typeof commonSchemas];

      if (!validationSchema) {
        return NextResponse.json(
          {
            error: `Unknown schema: ${schemaName}`,
            availableSchemas: Object.keys(commonSchemas),
          },
          { status: 400 }
        );
      }
    }

    if (!validationSchema) {
      return NextResponse.json(
        { error: 'Either schema or schemaName is required' },
        { status: 400 }
      );
    }

    // Validate
    const result = await validator.validate(data, validationSchema, options);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Validation passed',
      });
    } else {
      return NextResponse.json({
        success: false,
        errors: result.errors,
        message: 'Validation failed',
      });
    }
  } catch (error) {
    console.error('[VALIDATION_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/motion/validate/schemas
 *
 * Get available validation schemas
 */
export async function GET(req: NextRequest) {
  try {
    const commonSchemas = validator.getCommonSchemas();

    return NextResponse.json({
      success: true,
      data: {
        schemas: Object.keys(commonSchemas),
        descriptions: {
          chatMessage: 'Validates agent chat messages',
          toolContext: 'Validates tool execution context',
          emailParams: 'Validates email generation parameters',
          rateLimitContext: 'Validates rate limiting context',
          project: 'Validates project creation data',
        },
      },
    });
  } catch (error) {
    console.error('[VALIDATION_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
