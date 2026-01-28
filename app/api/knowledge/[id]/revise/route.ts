import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { kbEntries, kbRevisions, kbChunks, kbAudit } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/api/auth';
import { successResponse, errors, handleApiError } from '@/lib/api/http';
import { reviseEntrySchema } from '@/lib/api/validation';
import { enqueueIndexRevision } from '@/workers/queues';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireRole(req, 'editor');
    const body = await req.json();
    const data = reviseEntrySchema.parse(body);

    const db = getDb();

    // Get entry
    const [entry] = await db
      .select()
      .from(kbEntries)
      .where(eq(kbEntries.id, params.id))
      .limit(1);

    if (!entry) {
      return errors.notFound('Entry');
    }

    // Check if user can edit
    if (entry.authorId !== user.id && user.role !== 'admin') {
      return errors.forbidden('You can only revise your own entries');
    }

    // Get latest version number
    const revisions = await db
      .select()
      .from(kbRevisions)
      .where(eq(kbRevisions.entryId, params.id))
      .orderBy(desc(kbRevisions.version))
      .limit(1);

    const nextVersion = revisions.length > 0 ? revisions[0].version + 1 : 1;

    // Prepare content
    const contentMd = data.contentMd || '';
    const checksum = crypto.createHash('sha256').update(contentMd).digest('hex');

    // Create new revision
    const result = await db.transaction(async (tx) => {
      const [revision] = await tx
        .insert(kbRevisions)
        .values({
          entryId: params.id,
          version: nextVersion,
          contentMd,
          sourceType: data.sourceType,
          sourceUri: data.url,
          checksum,
          createdBy: user.id,
        })
        .returning();

      // Update entry's current revision
      await tx
        .update(kbEntries)
        .set({
          currentRevisionId: revision.id,
          updatedAt: new Date(),
        })
        .where(eq(kbEntries.id, params.id));

      // Soft-delete old chunks for this entry
      await tx
        .update(kbChunks)
        .set({ isDeleted: true })
        .where(
          sql`revision_id IN (
            SELECT id FROM kb_revisions
            WHERE entry_id = ${params.id} AND id != ${revision.id}
          )`
        );

      // Audit log
      await tx.insert(kbAudit).values({
        entityType: 'revision',
        entityId: revision.id,
        action: 'create',
        userId: user.id,
        payload: { entryId: params.id, version: nextVersion },
      });

      return revision;
    });

    // Enqueue indexing job
    await enqueueIndexRevision(result.id);

    return successResponse({
      revisionId: result.id,
      version: nextVersion,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
