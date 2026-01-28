import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { kbComments, kbEntries } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';
import { successResponse, errors, handleApiError } from '@/lib/api/http';
import { createCommentSchema } from '@/lib/api/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getCurrentUser(req);
    const db = getDb();

    const comments = await db
      .select()
      .from(kbComments)
      .where(eq(kbComments.entryId, params.id))
      .orderBy(desc(kbComments.createdAt));

    return successResponse({ items: comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    const body = await req.json();
    const data = createCommentSchema.parse(body);

    const db = getDb();

    // Verify entry exists
    const [entry] = await db
      .select()
      .from(kbEntries)
      .where(eq(kbEntries.id, params.id))
      .limit(1);

    if (!entry) {
      return errors.notFound('Entry');
    }

    const [comment] = await db
      .insert(kbComments)
      .values({
        entryId: params.id,
        authorId: user.id,
        bodyMd: data.bodyMd,
      })
      .returning();

    return successResponse({ id: comment.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
