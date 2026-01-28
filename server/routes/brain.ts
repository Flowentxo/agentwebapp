import express from 'express'
import { logger } from '../utils/logger'
import { brainAI } from '../services/BrainAIService'

const router = express.Router()

/**
 * GET /api/brain/context
 * Get shared Brain AI context
 */
router.get('/context', async (req, res) => {
  try {
    const { category, agentId, limit = 10 } = req.query

    let memories = brainAI.exportMemories()

    // Filter by category
    if (category) {
      memories = memories.filter(m => m.metadata.category === category)
    }

    // Filter by agentId
    if (agentId) {
      memories = memories.filter(m => m.metadata.agentId === agentId)
    }

    // Sort by timestamp (newest first)
    memories.sort((a, b) =>
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    )

    // Limit results
    const limitNum = parseInt(limit as string)
    memories = memories.slice(0, limitNum)

    res.json({
      success: true,
      count: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        agentId: m.metadata.agentId,
        category: m.metadata.category,
        tags: m.metadata.tags,
        timestamp: m.metadata.timestamp
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching Brain AI context:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/brain/context
 * Store new context in Brain AI
 */
router.post('/context', async (req, res) => {
  try {
    const { content, agentId, category, tags } = req.body

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      })
    }

    const memoryId = await brainAI.storeMemory(content, {
      source: 'api',
      agentId,
      category: category || 'general',
      tags: tags || []
    })

    res.json({
      success: true,
      memoryId,
      message: 'Context stored successfully'
    })
  } catch (error: any) {
    logger.error('Error storing Brain AI context:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/brain/query
 * Query Brain AI using semantic search
 */
router.post('/query', async (req, res) => {
  try {
    const { query, category, agentId, limit = 5, threshold = 0.7 } = req.body

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }

    const results = await brainAI.queryMemory(query, {
      limit,
      category,
      agentId,
      threshold
    })

    res.json({
      success: true,
      count: results.length,
      results: results.map(r => ({
        id: r.entry.id,
        content: r.entry.content,
        similarity: r.similarity,
        agentId: r.entry.metadata.agentId,
        category: r.entry.metadata.category,
        tags: r.entry.metadata.tags,
        timestamp: r.entry.metadata.timestamp
      }))
    })
  } catch (error: any) {
    logger.error('Error querying Brain AI:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/brain/stats
 * Get Brain AI statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = brainAI.getStats()

    res.json({
      success: true,
      stats
    })
  } catch (error: any) {
    logger.error('Error fetching Brain AI stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/brain/context/:id
 * Delete a specific memory
 */
router.delete('/context/:id', (req, res) => {
  try {
    const { id } = req.params
    const deleted = brainAI.deleteMemory(id)

    if (deleted) {
      res.json({
        success: true,
        message: 'Memory deleted successfully'
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Memory not found'
      })
    }
  } catch (error: any) {
    logger.error('Error deleting Brain AI memory:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export { router as brainRouter }
