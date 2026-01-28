/**
 * Error Recovery API Endpoint
 *
 * Provides error recovery management for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorRecovery } from '@/lib/agents/motion/services/ErrorRecoveryService';

/**
 * GET /api/motion/error-recovery
 *
 * Get error recovery statistics and dead letter queue
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats': {
        const stats = errorRecovery.getStats();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      }

      case 'dlq': {
        const dlq = errorRecovery.getDeadLetterQueue();
        return NextResponse.json({
          success: true,
          data: {
            entries: dlq,
            count: dlq.length,
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: stats, dlq' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[ERROR_RECOVERY_API] Error:', error);
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
 * POST /api/motion/error-recovery
 *
 * Perform error recovery actions
 *
 * Body:
 * - action: 'classify' | 'retry_dlq' | 'remove_dlq' | 'reset'
 * - For classify:
 *   - error: string (error message to classify)
 *   - context?: object
 * - For retry_dlq / remove_dlq:
 *   - id: string (dead letter queue entry ID)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'classify': {
        const { error: errorMessage, context } = body;

        if (!errorMessage) {
          return NextResponse.json(
            { error: 'error message is required' },
            { status: 400 }
          );
        }

        const errorInfo = errorRecovery.classifyError(
          new Error(errorMessage),
          context
        );

        return NextResponse.json({
          success: true,
          data: {
            code: errorInfo.code,
            message: errorInfo.message,
            category: errorInfo.category,
            retryable: errorInfo.retryable,
            recoverable: errorInfo.recoverable,
            timestamp: errorInfo.timestamp,
          },
        });
      }

      case 'retry_dlq': {
        const { id } = body;

        if (!id) {
          return NextResponse.json(
            { error: 'id is required' },
            { status: 400 }
          );
        }

        const success = await errorRecovery.retryDeadLetterEntry(id);

        if (!success) {
          return NextResponse.json(
            { error: `DLQ entry '${id}' not found` },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'DLQ entry queued for retry',
        });
      }

      case 'remove_dlq': {
        const { id } = body;

        if (!id) {
          return NextResponse.json(
            { error: 'id is required' },
            { status: 400 }
          );
        }

        const removed = errorRecovery.removeFromDeadLetterQueue(id);

        if (!removed) {
          return NextResponse.json(
            { error: `DLQ entry '${id}' not found` },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'DLQ entry removed',
        });
      }

      case 'reset': {
        errorRecovery.reset();
        return NextResponse.json({
          success: true,
          message: 'Error recovery statistics reset',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: classify, retry_dlq, remove_dlq, reset' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[ERROR_RECOVERY_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
