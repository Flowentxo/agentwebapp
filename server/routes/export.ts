/**
 * Export Routes - Universal Export API
 * Supports PDF, CSV, XLSX, PPTX for any agent data
 */

import { Router, Request, Response } from 'express'
import { exportService } from '../services/ExportService'
import { agentManager } from '../services/AgentManager'
import { logger } from '../utils/logger'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// Apply authentication
router.use(authenticate)

/**
 * Get supported export formats
 * GET /api/export/formats
 */
router.get('/formats', (req: Request, res: Response) => {
  try {
    const formats = exportService.getSupportedFormats()
    res.json({
      success: true,
      formats,
      descriptions: {
        csv: 'Comma-separated values (Excel compatible)',
        xlsx: 'Microsoft Excel format',
        pdf: 'Portable Document Format',
        pptx: 'Microsoft PowerPoint format'
      }
    })
  } catch (error: any) {
    logger.error('[Export] Formats error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Export agent data
 * POST /api/export
 * Body: {
 *   format: 'pdf' | 'csv' | 'xlsx' | 'pptx',
 *   agentId: string,
 *   data: any,
 *   reportType: string,
 *   metadata?: { title, description, author }
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { format, agentId, data, reportType, metadata } = req.body

    // Validate format
    const supportedFormats = exportService.getSupportedFormats()
    if (!format || !supportedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: `Invalid format. Supported: ${supportedFormats.join(', ')}`
      })
    }

    // Validate agent
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required'
      })
    }

    const agent = agentManager.getAgent(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      })
    }

    // Validate data
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'No data provided for export. Real data mode enforcement.'
      })
    }

    // Perform export
    const agentInfo = agent.getInfo()
    const exportResult = await exportService.export({
      format,
      data,
      agentName: agentInfo.name,
      reportType: reportType || 'general',
      metadata: {
        ...metadata,
        author: metadata?.author || 'SINTRA.AI System'
      }
    })

    if (!exportResult.success) {
      return res.status(500).json(exportResult)
    }

    // Send file
    res.setHeader('Content-Type', exportResult.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`)
    res.setHeader('X-Export-Status', 'success')
    res.send(exportResult.buffer)

    logger.info(`[Export] Successfully exported ${format} for ${agentInfo.name}`)
  } catch (error: any) {
    logger.error('[Export] Export error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Export Nova aggregated report (multi-agent)
 * POST /api/export/nova-report
 * Body: {
 *   format: string,
 *   agentIds: string[],
 *   reportType: string
 * }
 */
router.post('/nova-report', async (req: Request, res: Response) => {
  try {
    const { format, agentIds, reportType } = req.body

    if (!format || !agentIds || !Array.isArray(agentIds)) {
      return res.status(400).json({
        success: false,
        error: 'format and agentIds[] are required'
      })
    }

    // Collect data from all specified agents
    const aggregatedData: any = {
      reportType: reportType || 'Multi-Agent Insights',
      generatedAt: new Date().toISOString(),
      agents: {}
    }

    for (const agentId of agentIds) {
      const agent = agentManager.getAgent(agentId)
      if (agent) {
        const health = agent.getHealth()
        const info = agent.getInfo()
        aggregatedData.agents[agentId] = {
          name: info.name,
          type: info.type,
          status: health.status,
          metrics: health.metrics,
          capabilities: info.capabilities
        }
      }
    }

    // Export aggregated data
    const exportResult = await exportService.export({
      format,
      data: aggregatedData,
      agentName: 'Nova',
      reportType: reportType || 'Aggregated Report',
      metadata: {
        title: 'Multi-Agent System Report',
        description: `Insights from ${agentIds.length} agents`,
        author: 'Nova - SINTRA.AI'
      }
    })

    if (!exportResult.success) {
      return res.status(500).json(exportResult)
    }

    res.setHeader('Content-Type', exportResult.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`)
    res.send(exportResult.buffer)

    logger.info(`[Export] Nova report exported for ${agentIds.length} agents`)
  } catch (error: any) {
    logger.error('[Export] Nova report error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Export Brain AI context
 * POST /api/export/brain-context
 */
router.post('/brain-context', async (req: Request, res: Response) => {
  try {
    const { format, filters } = req.body

    const brainAI = agentManager.getBrainAI()
    const stats = brainAI.getStats()

    const contextData = {
      stats,
      registeredAgents: brainAI.getRegisteredAgents(),
      timestamp: new Date().toISOString()
    }

    const exportResult = await exportService.export({
      format: format || 'xlsx',
      data: contextData,
      agentName: 'Brain AI',
      reportType: 'Context Export',
      metadata: {
        title: 'Brain AI Context & Memory',
        description: 'Complete system context and agent memory'
      }
    })

    if (!exportResult.success) {
      return res.status(500).json(exportResult)
    }

    res.setHeader('Content-Type', exportResult.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`)
    res.send(exportResult.buffer)

    logger.info('[Export] Brain AI context exported')
  } catch (error: any) {
    logger.error('[Export] Brain context export error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export { router as exportRouter }
