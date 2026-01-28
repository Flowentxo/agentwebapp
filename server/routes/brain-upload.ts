import { Router } from 'express';
import multer from 'multer';
import { documentParserService } from '../services/DocumentParserService';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/**
 * POST /api/brain/upload - Upload and process document for Brain AI
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const file = req.file;

    logger.info(`[BRAIN_UPLOAD] Processing file: ${file.originalname} (${file.size} bytes)`);

    // Process document with Brain AI integration
    const result = await documentParserService.processDocumentForBrain(
      file.buffer,
      file.originalname,
      file.mimetype,
      userId
    );

    res.json({
      success: true,
      message: 'Document uploaded and processed successfully',
      data: {
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        wordCount: result.parsed.metadata.wordCount,
        pageCount: result.parsed.metadata.pageCount,
        chunks: result.parsed.chunks.length,
        insights: result.insights,
        memoryIds: result.memoryIds,
      },
    });
  } catch (error: any) {
    logger.error('[BRAIN_UPLOAD] Upload failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process document',
    });
  }
});

/**
 * GET /api/brain/documents - Get uploaded documents from Brain AI memory
 */
router.get('/documents', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    // Query Brain AI for documents
    const response = await fetch('http://localhost:4000/api/brain/context?category=document&limit=50', {
      headers: {
        'x-user-id': userId,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch documents from Brain AI');
    }

    // Group by filename
    const documents = new Map();
    for (const memory of data.memories || []) {
      if (memory.context?.fileName) {
        const filename = memory.context.fileName;
        if (!documents.has(filename)) {
          documents.set(filename, {
            filename,
            chunks: [],
            metadata: memory.context.metadata,
            insights: memory.context.insights,
            createdAt: memory.createdAt,
          });
        }
        documents.get(filename).chunks.push(memory);
      }
    }

    res.json({
      success: true,
      documents: Array.from(documents.values()),
    });
  } catch (error: any) {
    logger.error('[BRAIN_UPLOAD] Failed to fetch documents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export const brainUploadRouter = router;
