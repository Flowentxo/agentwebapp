/**
 * KNOWLEDGE FILE PROCESSING JOB
 *
 * Background job to process uploaded knowledge files:
 * 1. Parse document (PDF, DOCX, etc.)
 * 2. Create text chunks
 * 3. Generate embeddings
 * 4. Store in vector database
 */

import { readFile } from 'fs/promises';
import { getDb } from '@/lib/db/connection';
import { agentKnowledgeBase } from '@/lib/db/schema-custom-agents';
import { eq } from 'drizzle-orm';
import { DocumentParserService } from '../services/DocumentParserService';
import { VectorEmbeddingService } from '../services/VectorEmbeddingService';

export interface ProcessFileJobData {
  fileId: string;
  userId: string;
  workspaceId?: string;
}

export async function processKnowledgeFile(data: ProcessFileJobData): Promise<void> {
  console.log('[ProcessKnowledgeFile] Starting job:', data);

  const db = getDb();
  const documentParser = new DocumentParserService();
  const vectorService = new VectorEmbeddingService();

  try {
    // Get file record from database
    const [file] = await db
      .select()
      .from(agentKnowledgeBase)
      .where(eq(agentKnowledgeBase.id, data.fileId))
      .limit(1);

    if (!file) {
      throw new Error(`File not found: ${data.fileId}`);
    }

    // Update status to processing
    await db
      .update(agentKnowledgeBase)
      .set({ status: 'processing' })
      .where(eq(agentKnowledgeBase.id, data.fileId));

    // Read file from disk
    const buffer = await readFile(file.fileUrl);

    // Parse document
    console.log('[ProcessKnowledgeFile] Parsing document...');
    const parsed = await documentParser.parseDocument(
      buffer,
      file.fileName,
      file.fileType
    );

    console.log('[ProcessKnowledgeFile] Document parsed:', {
      chunks: parsed.chunks.length,
      wordCount: parsed.metadata.wordCount,
    });

    // Store embeddings in vector database
    console.log('[ProcessKnowledgeFile] Generating and storing embeddings...');
    await vectorService.storeDocumentEmbeddings({
      fileId: data.fileId,
      userId: data.userId,
      workspaceId: data.workspaceId,
      chunks: parsed.chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        metadata: {
          pageNumber: chunk.pageNumber,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          wordCount: chunk.wordCount,
        }
      }))
    });

    // Update file status to completed
    await db
      .update(agentKnowledgeBase)
      .set({
        status: 'completed',
        processedAt: new Date(),
        chunkCount: parsed.chunks.length.toString(),
      })
      .where(eq(agentKnowledgeBase.id, data.fileId));

    console.log('[ProcessKnowledgeFile] Job completed successfully');
  } catch (error: any) {
    console.error('[ProcessKnowledgeFile] Job failed:', error);

    // Update file status to failed
    await db
      .update(agentKnowledgeBase)
      .set({ status: 'failed' })
      .where(eq(agentKnowledgeBase.id, data.fileId));

    throw error;
  }
}
