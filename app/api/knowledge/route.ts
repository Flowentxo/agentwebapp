import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { knowledgeBases, kbEntries, kbRevisions, kbAudit } from '@/lib/db/schema';
import { eq, and, or, desc, ilike, sql } from 'drizzle-orm';
import { getCurrentUser, requireRole } from '@/lib/api/auth';
import { successResponse, errors, handleApiError } from '@/lib/api/http';
import { createEntrySchema, listEntriesSchema } from '@/lib/api/validation';
import { enqueueIndexRevision } from '@/workers/queues';
import crypto from 'crypto';

/**
 * GET /api/knowledge - List entries with filters
 */
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const params = listEntriesSchema.parse({
      kbId: searchParams.get('kbId') || undefined,
      q: searchParams.get('q') || undefined,
      tag: searchParams.get('tag') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || '25',
      offset: searchParams.get('offset') || '0',
    });

    const db = getDb();

    // Build query conditions
    const conditions = [];

    if (params.kbId) {
      conditions.push(eq(kbEntries.kbId, params.kbId));
    }

    if (params.status) {
      conditions.push(eq(kbEntries.status, params.status));
    }

    // Text search
    if (params.q) {
      conditions.push(ilike(kbEntries.title, `%${params.q}%`));
    }

    // Tag filter
    if (params.tag) {
      conditions.push(sql`${kbEntries.tags} ? ${params.tag}`);
    }

    // ACL: non-admin users can only see published or their own drafts
    if (user.role !== 'admin') {
      conditions.push(
        or(
          eq(kbEntries.status, 'published'),
          eq(kbEntries.authorId, user.id)
        )!
      );
    }

    // Execute query
    const query = conditions.length > 0
      ? db.select().from(kbEntries).where(and(...conditions))
      : db.select().from(kbEntries);

    const items = await query
      .orderBy(desc(kbEntries.updatedAt))
      .limit(params.limit)
      .offset(params.offset);

    // Get total count
    const countQuery = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(kbEntries).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(kbEntries);

    const [{ count }] = await countQuery;

    return successResponse({
      items,
      total: Number(count),
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/knowledge - Create new entry
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, 'editor');
    const body = await req.json();

    // Check for idempotency key
    const idempotencyKey = req.headers.get('idempotency-key');

    const data = createEntrySchema.parse(body);

    // Validate source
    if (data.source.type === 'note' && !data.source.contentMd) {
      return errors.badRequest('contentMd required for note type');
    }

    if (data.source.type === 'url' && !data.source.url) {
      return errors.badRequest('url required for url type');
    }

    if (data.source.type === 'file' && !data.source.fileId) {
      return errors.badRequest('fileId required for file type');
    }

    const db = getDb();

    // Verify KB exists and user has access
    const [kb] = await db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, data.kbId))
      .limit(1);

    if (!kb) {
      return errors.notFound('Knowledge base');
    }

    // Check for duplicate with idempotency key (if provided)
    if (idempotencyKey) {
      const existing = await db
        .select()
        .from(kbAudit)
        .where(
          and(
            eq(kbAudit.action, 'create'),
            sql`${kbAudit.payload}->>'idempotencyKey' = ${idempotencyKey}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const entryId = (existing[0].payload as any).entryId;
        return successResponse({ entryId, idempotent: true }, 200);
      }
    }

    // Prepare content
    let contentMd = '';
    if (data.source.type === 'note') {
      contentMd = data.source.contentMd!;
    } else if (data.source.type === 'url') {
      // TODO: Fetch and parse URL
      contentMd = `# ${data.title}\n\nSource: ${data.source.url}`;
    }

    // Generate checksum
    const checksum = crypto.createHash('sha256').update(contentMd).digest('hex');

    // Create entry and first revision in transaction
    const result = await db.transaction(async (tx) => {
      // Create entry
      const [entry] = await tx
        .insert(kbEntries)
        .values({
          kbId: data.kbId,
          title: data.title,
          status: 'draft',
          authorId: user.id,
          editorIds: [user.id],
          tags: data.tags,
          category: data.category,
        })
        .returning();

      // Create first revision
      const [revision] = await tx
        .insert(kbRevisions)
        .values({
          entryId: entry.id,
          version: 1,
          contentMd,
          sourceType: data.source.type,
          sourceUri: data.source.url || data.source.fileId,
          checksum,
          createdBy: user.id,
        })
        .returning();

      // Update entry with current revision
      await tx
        .update(kbEntries)
        .set({ currentRevisionId: revision.id })
        .where(eq(kbEntries.id, entry.id));

      // Create audit log
      await tx.insert(kbAudit).values({
        entityType: 'entry',
        entityId: entry.id,
        action: 'create',
        userId: user.id,
        payload: {
          title: entry.title,
          kbId: entry.kbId,
          revisionId: revision.id,
          idempotencyKey,
        },
      });

      return { entry, revision };
    });

    // Enqueue indexing job
    await enqueueIndexRevision(result.revision.id);

    return successResponse({
      entryId: result.entry.id,
      revisionId: result.revision.id,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
