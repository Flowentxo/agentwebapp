import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { kbEntries, kbRevisions, kbAudit } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser, requireRole } from '@/lib/api/auth';
import { successResponse, errors, handleApiError } from '@/lib/api/http';
import { canAccessEntry } from '@/lib/knowledge/acl';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getCurrentUser(req);
    const db = getDb();

    // Check access
    const hasAccess = await canAccessEntry(
      { userId: user.id, role: user.role },
      params.id
    );

    if (!hasAccess) {
      return errors.forbidden('You do not have access to this entry');
    }

    // Get entry with revisions
    const [entry] = await db
      .select()
      .from(kbEntries)
      .where(eq(kbEntries.id, params.id))
      .limit(1);

    if (!entry) {
      return errors.notFound('Entry');
    }

    const revisions = await db
      .select()
      .from(kbRevisions)
      .where(eq(kbRevisions.entryId, params.id))
      .orderBy(desc(kbRevisions.version));

    return successResponse({ entry, revisions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireRole(req, 'admin');
    const db = getDb();

    const [entry] = await db
      .select()
      .from(kbEntries)
      .where(eq(kbEntries.id, params.id))
      .limit(1);

    if (!entry) {
      return errors.notFound('Entry');
    }

    await db.transaction(async (tx) => {
      // Delete entry (cascades to revisions, chunks, comments)
      await tx.delete(kbEntries).where(eq(kbEntries.id, params.id));

      // Audit log
      await tx.insert(kbAudit).values({
        entityType: 'entry',
        entityId: params.id,
        action: 'delete',
        userId: user.id,
        payload: { title: entry.title },
      });
    });

    return successResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
