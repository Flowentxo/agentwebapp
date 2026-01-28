import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { sharedKnowledgeManager } from '../services/SharedKnowledgeManager'
import { knowledgeEvents } from '../services/KnowledgeEventEmitter'
import { logger } from '../utils/logger'

const router = Router()

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'knowledge')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|txt|docx|csv|json|md|png|jpg|jpeg|gif|svg|webp/
    const ext = path.extname(file.originalname).toLowerCase().substring(1)

    if (allowedTypes.test(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOCX, CSV, JSON, MD, PNG, JPG, GIF, SVG, WEBP are allowed.'))
    }
  }
})

/**
 * POST /api/knowledge/upload
 * Upload a document to the shared knowledge base
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    // Get userId from request (in production, extract from authenticated session)
    const userId = req.body.userId || (req as any).user?.id || 'default-user'
    const uploadedBy = (req as any).user?.name || req.body.uploadedBy || 'current-user'

    const fileExtension = path.extname(req.file.originalname).toLowerCase().substring(1)

    // Process and store document
    const document = await sharedKnowledgeManager.uploadDocument(
      userId,
      req.file.path,
      req.file.originalname,
      fileExtension,
      req.file.size,
      uploadedBy
    )

    logger.info(`Document uploaded successfully: ${document.id}`)

    res.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        content: '',
        fileType: document.fileType,
        size: document.size,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.uploadedAt,
        tags: document.tags,
        metadata: {
          summary: document.metadata.summary,
          path: document.metadata.path,
          filename: document.filename,
          totalChunks: document.metadata.totalChunks
        },
        vectorized: document.vectorized,
        agentAccess: [] // All agents have access in shared mode
      }
    })
  } catch (error: any) {
    logger.error(`Upload failed: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    })
  }
})

/**
 * POST /api/knowledge/query
 * Query the shared knowledge base
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, query, agentName, topK, threshold } = req.body

    if (!userId || !query) {
      return res.status(400).json({
        success: false,
        error: 'userId and query are required'
      })
    }

    const results = await sharedKnowledgeManager.query({
      userId,
      query,
      agentName,
      topK: topK || 5,
      threshold: threshold || 0.7
    })

    res.json({
      success: true,
      results: results.map(r => ({
        content: r.chunk.content,
        filename: r.chunk.filename,
        score: r.score,
        metadata: r.chunk.metadata
      })),
      count: results.length
    })
  } catch (error: any) {
    logger.error(`Query failed: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Query failed'
    })
  }
})

/**
 * GET /api/knowledge/documents
 * Get all documents for the current user
 */
router.get('/documents', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || (req as any).user?.id || 'default-user'

    const documents = sharedKnowledgeManager.getUserDocuments(userId)

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: '',
        fileType: doc.fileType,
        size: doc.size,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
        tags: doc.tags,
        metadata: doc.metadata,
        vectorized: doc.vectorized,
        agentAccess: [] // All agents have access
      }))
    })
  } catch (error: any) {
    logger.error(`Failed to fetch documents: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch documents'
    })
  }
})

/**
 * DELETE /api/knowledge/documents/:id
 * Delete a document and all its chunks
 */
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.query.userId as string || (req as any).user?.id || 'default-user'

    const doc = sharedKnowledgeManager.getDocument(id)

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }

    // Delete document
    await sharedKnowledgeManager.deleteDocument(userId, id)

    // Delete file from disk
    if (doc.metadata?.path && fs.existsSync(doc.metadata.path)) {
      fs.unlinkSync(doc.metadata.path)
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error: any) {
    logger.error(`Failed to delete document: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document'
    })
  }
})

/**
 * GET /api/knowledge/documents/:id/download
 * Download a document
 */
router.get('/documents/:id/download', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const doc = sharedKnowledgeManager.getDocument(id)

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }

    if (!doc.metadata?.path || !fs.existsSync(doc.metadata.path)) {
      return res.status(404).json({ success: false, error: 'File not found on disk' })
    }

    res.download(doc.metadata.path, doc.title)
  } catch (error: any) {
    logger.error(`Failed to download document: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download document'
    })
  }
})

/**
 * GET /api/knowledge/sources
 * Get all knowledge sources (uploaded documents) for a user
 */
router.get('/sources', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || (req as any).user?.id || 'default-user'

    const documents = sharedKnowledgeManager.getUserDocuments(userId)
    const stats = sharedKnowledgeManager.getUserStats(userId)

    res.json({
      success: true,
      sources: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        fileType: doc.fileType,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        chunks: doc.chunks.length,
        summary: doc.metadata.summary
      })),
      stats
    })
  } catch (error: any) {
    logger.error(`Failed to fetch sources: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sources'
    })
  }
})

/**
 * POST /api/knowledge/syncAllAgents
 * Trigger all agents to refresh their knowledge cache
 */
router.post('/syncAllAgents', (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || (req as any).user?.id || 'default-user'
    const agentName = req.body.agentName // Optional: sync specific agent

    // Emit refresh event
    knowledgeEvents.emitAgentRefreshRequested(userId, agentName)

    logger.info(`Knowledge sync requested for user ${userId}`)

    res.json({
      success: true,
      message: agentName
        ? `Refresh requested for ${agentName}`
        : 'Refresh requested for all agents'
    })
  } catch (error: any) {
    logger.error(`Sync failed: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    })
  }
})

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics for a user
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || (req as any).user?.id || 'default-user'

    const stats = sharedKnowledgeManager.getUserStats(userId)

    res.json({
      success: true,
      stats
    })
  } catch (error: any) {
    logger.error(`Failed to fetch stats: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch stats'
    })
  }
})

export { router as knowledgeRouter }
