
import { Router } from 'express'
import { emitAnalyticsUpdate } from '../socket'
import { logger } from '../utils/logger'

const router = Router()

/**
 * POST /broadcast
 * Internal endpoint to trigger analytics socket broadcast
 * Called by Next.js API routes or Background Jobs
 */
router.post('/broadcast', (req, res) => {
  try {
    const { dashboardId, data } = req.body

    if (!dashboardId || !data) {
      return res.status(400).json({ error: 'Missing dashboardId or data' })
    }

    emitAnalyticsUpdate(dashboardId, data)
    
    logger.info(`[AnalyticsBridge] Broadcasted update for dashboard: ${dashboardId}`)
    res.json({ success: true })
  } catch (error) {
    logger.error('[AnalyticsBridge] Error broadcasting:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export const analyticsRouter = router
