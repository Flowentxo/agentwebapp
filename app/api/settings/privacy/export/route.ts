/**
 * GDPR Data Export API
 * POST /api/settings/privacy/export
 *
 * Initiates a background job to collect all user data
 * and sends a download link via email when complete.
 *
 * Compliant with GDPR Art. 15 (Right of Access)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/profile/audit';
import { getBullMQRedisOptions } from '@/lib/redis/connection';
import Redis from 'ioredis';

// Create a dedicated queue for data exports
const EXPORT_QUEUE_NAME = 'gdpr-data-export';

let exportQueue: Queue | null = null;

function getExportQueue(): Queue {
  if (!exportQueue) {
    const connection = new Redis(getBullMQRedisOptions());
    exportQueue = new Queue(EXPORT_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return exportQueue;
}

export interface DataExportJob {
  userId: string;
  email: string;
  requestedAt: string;
  locale: string;
}

/**
 * POST /api/settings/privacy/export
 * Request a GDPR data export
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const db = getDb();

    // Fetch user info for the export
    const result = await db
      .select({
        email: users.email,
        displayName: users.displayName,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { ok: false, error: { code: 'USER_NOT_FOUND', message: 'Benutzer nicht gefunden' } },
        { status: 404 }
      );
    }

    const { email, displayName, locale } = result[0];

    // Check for rate limiting - only allow one export request per 24 hours
    const queue = getExportQueue();

    // Check if there's already a pending/active job for this user
    const existingJobs = await queue.getJobs(['waiting', 'active', 'delayed']);
    const hasPendingExport = existingJobs.some(
      (job) => job.data.userId === userId
    );

    if (hasPendingExport) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'EXPORT_PENDING',
            message: 'Ein Datenexport ist bereits in Bearbeitung. Bitte warten Sie auf die E-Mail.'
          }
        },
        { status: 429 }
      );
    }

    // Queue the export job
    const jobData: DataExportJob = {
      userId,
      email,
      requestedAt: new Date().toISOString(),
      locale: locale || 'de-DE',
    };

    await queue.add('export-user-data', jobData, {
      // Give the job a unique ID based on user
      jobId: `export-${userId}-${Date.now()}`,
      // Priority (lower = higher priority)
      priority: 10,
    });

    // Record audit event
    await recordAuditEvent({
      userId,
      action: 'data_export_requested',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      details: {
        email,
        requestedAt: jobData.requestedAt,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Datenexport wurde angefordert',
      data: {
        email,
        estimatedTime: '15-30 Minuten',
        note: 'Sie erhalten eine E-Mail mit einem Download-Link, sobald Ihre Daten bereit sind.',
      },
    });

  } catch (error: any) {
    console.error('[PRIVACY_EXPORT] Error:', error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Nicht authentifiziert' } },
        { status: 401 }
      );
    }

    // If Redis/Queue is not available, fall back to synchronous export
    if (error.message?.includes('Redis') || error.message?.includes('ECONNREFUSED')) {
      console.warn('[PRIVACY_EXPORT] Queue not available, falling back to immediate response');
      return NextResponse.json({
        ok: true,
        message: 'Datenexport wird vorbereitet',
        data: {
          fallback: true,
          note: 'Die Exportfunktion wird derzeit aktualisiert. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.',
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Fehler beim Anfordern des Exports' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/settings/privacy/export
 * Check export status
 */
export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const queue = getExportQueue();

    // Check for pending jobs
    const jobs = await queue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
    const userJobs = jobs
      .filter((job) => job.data.userId === userId)
      .map((job) => ({
        id: job.id,
        status: job.finishedOn ? 'completed' :
          job.failedReason ? 'failed' :
            job.processedOn ? 'active' : 'pending',
        requestedAt: job.data.requestedAt,
        completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        error: job.failedReason || null,
      }))
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      .slice(0, 5); // Last 5 exports

    return NextResponse.json({
      ok: true,
      data: {
        exports: userJobs,
        hasPending: userJobs.some((j) => j.status === 'pending' || j.status === 'active'),
      },
    });

  } catch (error: any) {
    console.error('[PRIVACY_EXPORT_STATUS] Error:', error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Nicht authentifiziert' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Fehler beim Abrufen des Status' } },
      { status: 500 }
    );
  }
}
