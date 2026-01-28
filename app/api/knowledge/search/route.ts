import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/api/auth';
import { successResponse, handleApiError } from '@/lib/api/http';
import { searchEntriesSchema } from '@/lib/api/validation';
import { retrieve } from '@/lib/knowledge/rag';

export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const params = searchEntriesSchema.parse({
      q: searchParams.get('q') || '',
      kb: searchParams.get('kb') || undefined,
      tags: searchParams.get('tags') || undefined,
      author: searchParams.get('author') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      topk: searchParams.get('topk') || '8',
    });

    const tags = params.tags ? params.tags.split(',') : undefined;

    const result = await retrieve({
      query: params.q,
      kb: params.kb,
      topk: params.topk,
      filters: {
        tags,
        status: ['published'],
      },
      aclContext: {
        userId: user.id,
        role: user.role,
      },
    });

    // TODO: Log search
    // await logSearch(user.id, params.q, result);

    return successResponse({
      results: result.contexts.map(ctx => ({
        entryId: ctx.entryId,
        title: ctx.entryTitle,
        snippet: ctx.text.substring(0, 200) + '...',
        score: ctx.score,
        revisionId: ctx.revisionId,
        chunkId: ctx.chunkId,
        heading: ctx.heading,
        tags: [], // TODO: Get from entry
        updatedAt: new Date().toISOString(), // TODO: Get from entry
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
