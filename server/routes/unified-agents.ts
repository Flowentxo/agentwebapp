/**
 * Unified Agent Routes - All 12 Agents Endpoints
 * Comprehensive routing for SINTRA.AI v3
 */

import { Router, Request, Response } from 'express'
import { agentManager } from '../services/AgentManager'
import { exportService } from '../services/ExportService'
import { logger } from '../utils/logger'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

/**
 * Get all agents overview
 * GET /api/unified-agents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const allAgents = agentManager.getAllAgents()
    const agentsList: any[] = []

    allAgents.forEach((agent, id) => {
      const health = agent.getHealth()
      const info = agent.getInfo()

      agentsList.push({
        id,
        name: info.name,
        type: info.type,
        version: info.version,
        status: health.status,
        capabilities: info.capabilities,
        endpoints: info.endpoints,
        metrics: health.metrics,
        realDataMode: info.realDataMode
      })
    })

    res.json({
      success: true,
      totalAgents: agentsList.length,
      agents: agentsList,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('[Unified-Agents] Error fetching agents:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get system health (all agents)
 * GET /api/unified-agents/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthData = agentManager.getAllAgentsHealth()
    res.json(healthData)
  } catch (error: any) {
    logger.error('[Unified-Agents] Health check error:', error)
    res.status(500).json({
      status: 'error',
      error: error.message
    })
  }
})

/**
 * Get specific agent health
 * GET /api/unified-agents/:agentId/health
 */
router.get('/:agentId/health', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const health = agentManager.getAgentHealth(agentId)
    res.json(health)
  } catch (error: any) {
    logger.error(`[Unified-Agents] Health check error for ${req.params.agentId}:`, error)
    res.status(500).json({
      status: 'error',
      error: error.message
    })
  }
})

/**
 * Execute task on specific agent
 * POST /api/unified-agents/:agentId/execute
 */
router.post('/:agentId/execute', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const { taskType, input, priority } = req.body

    const agent = agentManager.getAgent(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      })
    }

    const task = agent.createTask(taskType, input, priority || 'medium')
    const result = await agent.execute(task)

    res.json(result)
  } catch (error: any) {
    logger.error(`[Unified-Agents] Execute error for ${req.params.agentId}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get agent task history
 * GET /api/unified-agents/:agentId/history
 */
router.get('/:agentId/history', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const limit = parseInt(req.query.limit as string) || 10

    const agent = agentManager.getAgent(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      })
    }

    const history = agent.getTaskHistory(limit)
    res.json({
      success: true,
      agentId,
      history,
      count: history.length
    })
  } catch (error: any) {
    logger.error(`[Unified-Agents] History error for ${req.params.agentId}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Export agent data
 * POST /api/unified-agents/:agentId/export
 */
router.post('/:agentId/export', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const { format, reportType, data, metadata } = req.body

    const agent = agentManager.getAgent(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      })
    }

    // Validate format
    const supportedFormats = exportService.getSupportedFormats()
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported format. Supported: ${supportedFormats.join(', ')}`
      })
    }

    // Export data
    const exportResult = await exportService.export({
      format,
      data: data || { message: 'No data provided' },
      agentName: agent.getInfo().name,
      reportType: reportType || 'general',
      metadata
    })

    if (!exportResult.success) {
      return res.status(500).json(exportResult)
    }

    // Send file
    res.setHeader('Content-Type', exportResult.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`)
    res.send(exportResult.buffer)
  } catch (error: any) {
    logger.error(`[Unified-Agents] Export error for ${req.params.agentId}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get agent capabilities
 * GET /api/unified-agents/:agentId/capabilities
 */
router.get('/:agentId/capabilities', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params

    const agent = agentManager.getAgent(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      })
    }

    const info = agent.getInfo()
    res.json({
      success: true,
      agentId,
      name: info.name,
      type: info.type,
      capabilities: info.capabilities,
      endpoints: info.endpoints,
      version: info.version,
      realDataMode: info.realDataMode
    })
  } catch (error: any) {
    logger.error(`[Unified-Agents] Capabilities error for ${req.params.agentId}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get agent metrics
 * GET /api/unified-agents/:agentId/metrics
 */
router.get('/:agentId/metrics', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params

    const agent = agentManager.getAgent(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      })
    }

    const metrics = agent.getMetrics()
    const health = agent.getHealth()

    res.json({
      success: true,
      agentId,
      metrics: health.metrics,
      lastActivity: health.lastActivity,
      status: health.status
    })
  } catch (error: any) {
    logger.error(`[Unified-Agents] Metrics error for ${req.params.agentId}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get system-wide statistics
 * GET /api/unified-agents/stats/system
 */
router.get('/stats/system', async (req: Request, res: Response) => {
  try {
    const stats = agentManager.getSystemStats()
    res.json({
      success: true,
      ...stats,
      healthy: agentManager.isSystemHealthy(),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('[Unified-Agents] System stats error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export { router as unifiedAgentsRouter }
