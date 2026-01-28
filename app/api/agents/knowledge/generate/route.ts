import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api/http';
import { generateSchema } from '@/lib/api/validation';
import { generate } from '@/lib/knowledge/rag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = generateSchema.parse(body);

    const result = await generate({
      query: data.query,
      kb: data.kb,
      topk: data.topk,
      answerStyle: data.answerStyle || 'concise',
      aclContext: {
        userId: 'agent-system',
        role: 'admin',
      },
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
