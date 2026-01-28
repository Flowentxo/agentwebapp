/**
 * KNOWLEDGE BASE UPLOAD API
 *
 * Upload and process files for RAG-powered knowledge
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getDb } from '@/lib/db/connection';
import { agentKnowledgeBase } from '@/lib/db/schema-custom-agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'knowledge-base');

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureUploadDir();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not supported` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Get user ID from request (you may need to get this from session/auth)
    const userId = 'default-user'; // TODO: Get from auth session
    const workspaceId = 'default-workspace'; // TODO: Get from workspace context

    // Save to database
    const db = getDb();
    const [knowledge] = await db
      .insert(agentKnowledgeBase)
      .values({
        agentId: agentId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size.toString(),
        fileUrl: filepath,
        status: 'pending',
      })
      .returning();

    // Trigger background job to process file
    try {
      // Dynamic import to avoid circular dependencies
      const { jobQueueService } = await import('@/server/services/JobQueueService');

      await jobQueueService.addJob(
        'document_processing',
        `process-file-${knowledge.id}`,
        {
          fileId: knowledge.id,
          userId,
          workspaceId,
          action: 'parse',
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }
      );

      console.log(`[KNOWLEDGE_UPLOAD] Job queued for file: ${knowledge.id}`);
    } catch (error) {
      console.error('[KNOWLEDGE_UPLOAD] Failed to queue job:', error);
      // Don't fail the upload if job queueing fails
    }

    return NextResponse.json({
      id: knowledge.id,
      fileName: file.name,
      fileSize: file.size,
      status: 'pending',
      message: 'File uploaded successfully. Processing will begin shortly.',
    });
  } catch (error) {
    console.error('[KNOWLEDGE_UPLOAD]', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
