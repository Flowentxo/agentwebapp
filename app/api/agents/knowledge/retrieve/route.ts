import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api/http';
import { retrieveSchema } from '@/lib/api/validation';
import { retrieve } from '@/lib/knowledge/rag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = retrieveSchema.parse(body);

    const result = await retrieve({
      query: data.query,
      kb: data.kb,
      topk: data.topk || 6,
      filters: data.filters || { status: ['published'] },
      aclContext: {
        userId: 'agent-system',
        role: 'admin',
      },
    });

    return successResponse({
      query: data.query,
      contexts: result.contexts,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
