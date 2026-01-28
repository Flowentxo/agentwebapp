import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { kbEntries, kbAudit } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/api/auth';
import { successResponse, errors, handleApiError } from '@/lib/api/http';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireRole(req, 'editor');
    const db = getDb();

    const [entry] = await db
      .select()
      .from(kbEntries)
      .where(eq(kbEntries.id, params.id))
      .limit(1);

    if (!entry) {
      return errors.notFound('Entry');
    }

    // Check if user can archive
    if (entry.authorId !== user.id && user.role !== 'admin') {
      return errors.forbidden('You can only archive your own entries');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(kbEntries)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(eq(kbEntries.id, params.id));

      await tx.insert(kbAudit).values({
        entityType: 'entry',
        entityId: params.id,
        action: 'archive',
        userId: user.id,
        payload: {
          previousStatus: entry.status,
        },
      });
    });

    return successResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
