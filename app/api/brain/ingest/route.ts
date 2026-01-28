/**
 * Brain AI Ingest API
 * Endpoint: POST /api/brain/ingest
 * Uploads and indexes documents into knowledge base
 *
 * SECURITY: Protected with API Key authentication, rate limiting, RBAC
 * Required role: editor
 * Required permissions: knowledge:write
 */

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeIndexer, type DocumentInput } from '@/lib/brain';
import { withBrainSecurity, type SecurityContext } from '@/lib/brain/security/SecurityMiddleware';
import { BRAIN_PERMISSIONS } from '@/lib/db/schema-brain-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for large documents

interface IngestRequest {
  documents: Array<{
    title: string;
    content: string;
    metadata?: {
      source?: string;
      sourceType?: 'upload' | 'url' | 'agent' | 'conversation';
      tags?: string[];
      category?: string;
      language?: string;
      fileType?: string;
      url?: string;
    };
  }>;
  workspaceId?: string;
  createdBy: string;
  chunkConfig?: {
    chunkSize?: number;
    chunkOverlap?: number;
    minChunkSize?: number;
  };
}

export const POST = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    try {
      const body: IngestRequest = await req.json();

    // Validation
    if (!body.documents || !Array.isArray(body.documents) || body.documents.length === 0) {
      return NextResponse.json(
        { error: 'At least one document is required' },
        { status: 400 }
      );
    }

    if (body.documents.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 documents per request' },
        { status: 400 }
      );
    }

      // Validate each document
      for (const doc of body.documents) {
        if (!doc.title || doc.title.trim().length === 0) {
          return NextResponse.json(
            { error: 'Each document must have a title' },
            { status: 400 }
          );
        }

        if (!doc.content || doc.content.trim().length === 0) {
          return NextResponse.json(
            { error: 'Each document must have content' },
            { status: 400 }
          );
        }

        if (doc.content.length > 100000) {
          return NextResponse.json(
            { error: `Document "${doc.title}" exceeds maximum length (100,000 characters)` },
            { status: 400 }
          );
        }
      }

      const workspaceId = body.workspaceId || context.workspaceId || 'default-workspace';
      const createdBy = body.createdBy || context.userId || 'system';
      const startTime = Date.now();

      // Prepare documents for indexing
      const documentsToIndex: DocumentInput[] = body.documents.map(doc => ({
        title: doc.title,
        content: doc.content,
        workspaceId,
        createdBy,
        metadata: doc.metadata,
      }));

    // Index documents
    const results = await knowledgeIndexer.indexDocuments(
      documentsToIndex,
      body.chunkConfig
    );

    const processingTime = Date.now() - startTime;

    // Calculate statistics
    const totalChunks = results.reduce((sum, r) => sum + r.chunkCount, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.totalTokens, 0);
    const successCount = results.filter(r => r.id).length;

      return NextResponse.json({
        success: true,
        message: `Successfully indexed ${successCount} of ${body.documents.length} documents`,
        results: results.map(r => ({
          id: r.id,
          chunkCount: r.chunkCount,
          totalTokens: r.totalTokens,
        })),
        statistics: {
          documentsProcessed: body.documents.length,
          documentsIndexed: successCount,
          totalChunks,
          totalTokens,
          processingTime,
          avgTokensPerDocument: Math.round(totalTokens / successCount),
        },
      });
    } catch (error: any) {
      console.error('[Brain Ingest API] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to ingest documents',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireRole: 'editor',
    requireScopes: [BRAIN_PERMISSIONS.KNOWLEDGE_WRITE],
    rateLimitKey: 'user',
    customRateLimit: { limit: 20, window: 60 }, // 20 req/min for ingestion
  }
);

// GET method to check ingestion status
export const GET = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    return NextResponse.json({
      endpoint: '/api/brain/ingest',
      method: 'POST',
      description: 'Upload and index documents into Brain AI knowledge base',
      maxDocuments: 50,
      maxDocumentSize: 100000,
      supportedFormats: ['text', 'markdown', 'json'],
      authentication: 'API Key required (editor role)',
      permissions: ['knowledge:write'],
      rateLimit: '20 requests per minute',
      example: {
        documents: [
          {
            title: 'Example Document',
            content: 'This is the document content...',
            metadata: {
              source: 'api-upload',
              sourceType: 'upload',
              tags: ['example', 'demo'],
              category: 'documentation',
            },
          },
        ],
        chunkConfig: {
          chunkSize: 1000,
          chunkOverlap: 200,
        },
      },
    });
  },
  {
    requireAuth: true,
    requireRole: 'viewer',
    skipAudit: true, // Don't audit documentation requests
  }
);
