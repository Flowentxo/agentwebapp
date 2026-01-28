/**
 * KNOWLEDGE BASE API ROUTES
 *
 * RAG (Retrieval Augmented Generation) System
 * - Upload documents and parse them
 * - Generate vector embeddings
 * - Semantic search across knowledge base
 */

import { Router } from 'express';
import multer from 'multer';
import { getDb } from '@/lib/db';
import { files } from '@/lib/db/schema';
import { documentParserService } from '../services/DocumentParserService';
import { vectorEmbeddingService } from '../services/VectorEmbeddingService';
import { storageService } from '../services/StorageService';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported for knowledge base`));
    }
  }
});

/**
 * POST /api/knowledge-base/upload
 * Upload and process document for knowledge base
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    console.log('[KNOWLEDGE_BASE] Uploading document:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });

    const db = getDb();

    // Step 1: Parse document
    console.log('[KNOWLEDGE_BASE] Step 1: Parsing document...');
    const parsed = await documentParserService.parseDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    console.log('[KNOWLEDGE_BASE] Parsed:', {
      wordCount: parsed.metadata.wordCount,
      chunks: parsed.chunks.length
    });

    // Step 2: Upload to storage
    console.log('[KNOWLEDGE_BASE] Step 2: Uploading to storage...');
    const uploadResult = await storageService.uploadFile({
      userId,
      workspaceId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      visibility: 'private',
      metadata: {
        ...parsed.metadata,
        isKnowledgeBase: true,
        chunkCount: parsed.chunks.length
      }
    });

    // Step 3: Create file record
    console.log('[KNOWLEDGE_BASE] Step 3: Creating file record...');
    const [fileRecord] = await db.insert(files).values({
      userId,
      workspaceId,
      filename: req.file.originalname,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageProvider: 'local',
      storageKey: uploadResult.storageKey,
      url: uploadResult.url,
      status: 'processing',
      visibility: 'private',
      metadata: {
        ...parsed.metadata,
        isKnowledgeBase: true,
        chunkCount: parsed.chunks.length
      }
    }).returning();

    // Step 4: Generate and store embeddings (async)
    console.log('[KNOWLEDGE_BASE] Step 4: Generating embeddings...');

    try {
      await vectorEmbeddingService.storeDocumentEmbeddings({
        fileId: fileRecord.id,
        userId,
        workspaceId,
        chunks: parsed.chunks.map(chunk => ({
          id: chunk.id,
          text: chunk.text,
          metadata: {
            pageNumber: chunk.pageNumber,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            wordCount: chunk.wordCount
          }
        }))
      });

      // Update file status to ready
      await db.update(files)
        .set({ status: 'ready' })
        .where(eq(files.id, fileRecord.id));

      console.log('[KNOWLEDGE_BASE] ✅ Document processed successfully');

      res.json({
        success: true,
        file: fileRecord,
        parsed: {
          wordCount: parsed.metadata.wordCount,
          pageCount: parsed.metadata.pageCount,
          chunkCount: parsed.chunks.length
        }
      });

    } catch (embeddingError: any) {
      console.error('[KNOWLEDGE_BASE] Embedding generation failed:', embeddingError);

      // Update file status to failed
      await db.update(files)
        .set({
          status: 'failed',
          processingError: embeddingError.message
        })
        .where(eq(files.id, fileRecord.id));

      res.status(500).json({
        error: 'Failed to generate embeddings',
        message: embeddingError.message,
        file: fileRecord
      });
    }

  } catch (error: any) {
    console.error('[KNOWLEDGE_BASE] Upload failed:', error);
    res.status(500).json({
      error: 'Failed to process document',
      message: error.message
    });
  }
});

/**
 * POST /api/knowledge-base/search
 * Semantic search across knowledge base
 */
router.post('/search', async (req, res) => {
  try {
    const { query, fileId, limit, minSimilarity } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    console.log('[KNOWLEDGE_BASE] Searching:', {
      query,
      fileId,
      userId,
      workspaceId
    });

    const results = await vectorEmbeddingService.search({
      query,
      userId,
      workspaceId,
      fileId,
      limit: limit || 10,
      minSimilarity: minSimilarity || 0.7
    });

    console.log('[KNOWLEDGE_BASE] Found', results.length, 'results');

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error: any) {
    console.error('[KNOWLEDGE_BASE] Search failed:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/knowledge-base/files
 * List all knowledge base documents
 */
router.get('/files', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    const db = getDb();

    const conditions = [
      eq(files.userId, userId),
      sql`metadata->>'isKnowledgeBase' = 'true'`
    ];

    if (workspaceId) {
      conditions.push(eq(files.workspaceId, workspaceId));
    }

    const knowledgeFiles = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.createdAt));

    res.json({
      success: true,
      files: knowledgeFiles,
      count: knowledgeFiles.length
    });

  } catch (error: any) {
    console.error('[KNOWLEDGE_BASE] List files failed:', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message
    });
  }
});

/**
 * DELETE /api/knowledge-base/files/:fileId
 * Delete knowledge base document and its embeddings
 */
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const db = getDb();

    // Verify ownership
    const [file] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        eq(files.userId, userId)
      ))
      .limit(1);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete embeddings
    await vectorEmbeddingService.deleteFileEmbeddings(fileId);

    // Delete file record
    await db
      .delete(files)
      .where(eq(files.id, fileId));

    console.log('[KNOWLEDGE_BASE] Deleted file:', fileId);

    res.json({
      success: true,
      message: 'File and embeddings deleted successfully'
    });

  } catch (error: any) {
    console.error('[KNOWLEDGE_BASE] Delete failed:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

/**
 * GET /api/knowledge-base/stats
 * Get knowledge base statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    const stats = await vectorEmbeddingService.getStats(userId, workspaceId);

    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('[KNOWLEDGE_BASE] Stats failed:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

export default router;
