/**
 * FILE MANAGEMENT API ROUTES
 *
 * Endpoints:
 * - POST   /api/files/upload          - Upload file
 * - GET    /api/files                 - List files
 * - GET    /api/files/:id             - Get file metadata
 * - GET    /api/files/:id/download    - Download file
 * - DELETE /api/files/:id             - Delete file
 * - POST   /api/files/:id/share       - Share file
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb } from '../../lib/db/connection';
import { files, fileAccessLogs, fileShares } from '../../lib/db/schema';
import { storageService, StorageService } from '../services/StorageService';
import { eq, and, desc, or, isNull } from 'drizzle-orm';

const router = Router();

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: StorageService.getMaxFileSize(),
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = StorageService.getAllowedMimeTypes();

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const shareFileSchema = z.object({
  userId: z.string().optional(),
  expiresIn: z.number().optional(), // hours
  canDownload: z.boolean().optional(),
  canEdit: z.boolean().optional(),
});

// ==========================================
// MIDDLEWARE
// ==========================================

function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'default-user';
}

function getWorkspaceId(req: Request): string | undefined {
  return req.headers['x-workspace-id'] as string | undefined;
}

// ==========================================
// ROUTES
// ==========================================

/**
 * POST /api/files/upload
 *
 * Upload a file
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    const visibility = (req.body.visibility || 'private') as 'private' | 'workspace' | 'public';
    const category = req.body.category;
    const description = req.body.description;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    console.log('[FILE_UPLOAD] Starting upload:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      userId,
      workspaceId,
    });

    const db = getDb();

    // Upload to S3
    const uploadResult = await storageService.uploadFile({
      userId,
      workspaceId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      visibility,
      metadata: {
        category,
        description,
        tags,
      },
    });

    // Save to database
    const [fileRecord] = await db
      .insert(files)
      .values({
        userId,
        workspaceId,
        filename: req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: uploadResult.size,
        storageProvider: 's3',
        storageKey: uploadResult.storageKey,
        storageBucket: process.env.AWS_S3_BUCKET || 'flowent-ai-files',
        storageRegion: process.env.AWS_REGION || 'us-east-1',
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        status: 'ready',
        visibility,
        metadata: {
          ...uploadResult.imageMetadata,
          category,
          description,
          tags,
        },
      })
      .returning();

    // Log access
    await db.insert(fileAccessLogs).values({
      fileId: fileRecord.id,
      userId,
      action: 'upload',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    console.log('[FILE_UPLOAD] Success:', fileRecord.id);

    res.json({
      success: true,
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalFilename: fileRecord.originalFilename,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        url: fileRecord.url,
        thumbnailUrl: fileRecord.thumbnailUrl,
        status: fileRecord.status,
        uploadedAt: fileRecord.uploadedAt,
        metadata: fileRecord.metadata,
      },
    });
  } catch (error) {
    console.error('[FILE_UPLOAD]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

/**
 * GET /api/files
 *
 * List user's files
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const mimeType = req.query.mimeType as string | undefined;

    const db = getDb();

    let query = db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          isNull(files.deletedAt),
          workspaceId ? eq(files.workspaceId, workspaceId) : undefined
        )
      )
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset);

    if (mimeType) {
      query = query.where(
        and(
          eq(files.userId, userId),
          eq(files.mimeType, mimeType),
          isNull(files.deletedAt)
        )
      );
    }

    const results = await query;

    res.json({
      success: true,
      files: results.map((file) => ({
        id: file.id,
        filename: file.filename,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        status: file.status,
        visibility: file.visibility,
        uploadedAt: file.uploadedAt,
        metadata: file.metadata,
      })),
      pagination: {
        limit,
        offset,
        total: results.length,
      },
    });
  } catch (error) {
    console.error('[FILES_LIST]', error);
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

/**
 * GET /api/files/:id
 *
 * Get file metadata
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    const [file] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          or(
            eq(files.userId, userId),
            eq(files.visibility, 'public')
          ),
          isNull(files.deletedAt)
        )
      );

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Update last accessed
    await db
      .update(files)
      .set({ lastAccessedAt: new Date() })
      .where(eq(files.id, id));

    // Log access
    await db.insert(fileAccessLogs).values({
      fileId: id,
      userId,
      action: 'view',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      file: {
        id: file.id,
        filename: file.filename,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        status: file.status,
        visibility: file.visibility,
        uploadedAt: file.uploadedAt,
        lastAccessedAt: file.lastAccessedAt,
        metadata: file.metadata,
      },
    });
  } catch (error) {
    console.error('[FILE_GET]', error);
    res.status(500).json({ success: false, error: 'Failed to get file' });
  }
});

/**
 * GET /api/files/:id/download
 *
 * Get download URL for file
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    const [file] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          or(
            eq(files.userId, userId),
            eq(files.visibility, 'public')
          ),
          isNull(files.deletedAt)
        )
      );

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Generate presigned URL
    const downloadUrl = await storageService.getSignedUrl(file.storageKey, 300); // 5 minutes

    // Log download
    await db.insert(fileAccessLogs).values({
      fileId: id,
      userId,
      action: 'download',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      downloadUrl,
      filename: file.originalFilename,
      expiresIn: 300,
    });
  } catch (error) {
    console.error('[FILE_DOWNLOAD]', error);
    res.status(500).json({ success: false, error: 'Failed to get download URL' });
  }
});

/**
 * DELETE /api/files/:id
 *
 * Delete file (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const db = getDb();

    // Check ownership
    const [file] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          eq(files.userId, userId),
          isNull(files.deletedAt)
        )
      );

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Soft delete
    await db
      .update(files)
      .set({ deletedAt: new Date(), status: 'deleted' })
      .where(eq(files.id, id));

    // Log deletion
    await db.insert(fileAccessLogs).values({
      fileId: id,
      userId,
      action: 'delete',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    console.log('[FILE_DELETE] Soft deleted:', id);

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('[FILE_DELETE]', error);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

/**
 * POST /api/files/:id/share
 *
 * Create share link for file
 */
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { userId: shareWithUserId, expiresIn, canDownload, canEdit } = shareFileSchema.parse(req.body);

    const db = getDb();

    // Check ownership
    const [file] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          eq(files.userId, userId),
          isNull(files.deletedAt)
        )
      );

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Create share
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : undefined;

    const [share] = await db
      .insert(fileShares)
      .values({
        fileId: id,
        sharedWithUserId: shareWithUserId,
        shareToken,
        canDownload: canDownload ?? true,
        canEdit: canEdit ?? false,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/files/shared/${shareToken}`;

    console.log('[FILE_SHARE] Created share:', share.id);

    res.json({
      success: true,
      share: {
        id: share.id,
        shareUrl,
        expiresAt: share.expiresAt,
        canDownload: share.canDownload,
        canEdit: share.canEdit,
      },
    });
  } catch (error) {
    console.error('[FILE_SHARE]', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Failed to share file' });
    }
  }
});

export default router;
