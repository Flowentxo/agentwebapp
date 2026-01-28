/**
 * Cassie Agent API Route
 * Autonomous OpenAI-powered customer support agent
 */

const express = require('express')
const path = require('path')
const CassieAgent = require('../../../../agents/cassie/cassieAgent')

const router = express.Router()

// Initialize Cassie Agent (singleton instance)
const cassieAgent = new CassieAgent()

// Validate API key on startup
if (!process.env.OPENAI_API_KEY) {
  console.error('[Cassie API] ❌ OPENAI_API_KEY fehlt oder ist leer – echte Antworten nicht möglich!')
  console.error('[Cassie API] ⚠️  Agent läuft im Fallback-Modus')
} else {
  console.log('[Cassie API] ✅ OpenAI API Key korrekt konfiguriert')
}

/**
 * POST /api/agents/cassie/chat
 * Send a message to Cassie and get a response
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      })
    }

    // Generate session ID if not provided
    const session = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Generate response from Cassie
    const response = await cassieAgent.generateResponse(session, message.trim())

    // Return 503 if using fallback (no API key or error)
    if (!response.success) {
      return res.status(503).json(response)
    }

    res.json(response)
  } catch (error) {
    console.error('[Cassie API] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/agents/cassie/history/:sessionId
 * Get conversation history for a session
 */
router.get('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params

    const history = cassieAgent.getHistory(sessionId)

    res.json({
      success: true,
      sessionId,
      messageCount: history.length,
      history
    })
  } catch (error) {
    console.error('[Cassie API] Error fetching history:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation history'
    })
  }
})

/**
 * DELETE /api/agents/cassie/session/:sessionId
 * Clear a conversation session
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params

    cassieAgent.clearSession(sessionId)

    res.json({
      success: true,
      message: 'Session cleared successfully',
      sessionId
    })
  } catch (error) {
    console.error('[Cassie API] Error clearing session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear session'
    })
  }
})

/**
 * GET /api/agents/cassie/stats
 * Get Cassie agent statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = cassieAgent.getStats()

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('[Cassie API] Error fetching stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent statistics'
    })
  }
})

/**
 * GET /api/agents/cassie/status
 * Get complete system status
 */
router.get('/status', (req, res) => {
  try {
    const status = cassieAgent.getSystemStatus()

    res.json({
      success: true,
      status
    })
  } catch (error) {
    console.error('[Cassie API] Error fetching system status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status'
    })
  }
})

/**
 * GET /api/agents/cassie/stats
 * Get live statistics and metrics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = cassieAgent.getSystemStatus()

    const liveStats = {
      success: true,
      uptime: process.uptime(),
      totalRequests: stats.statistics.totalRequests,
      successfulRequests: stats.statistics.successfulRequests,
      failedRequests: stats.statistics.failedRequests,
      successRate: stats.statistics.successRate,
      avgResponseTime: stats.statistics.averageResponseTime,
      totalTokensUsed: stats.statistics.totalTokensUsed,
      activeSessions: stats.memory.activeSessions,
      totalMessages: stats.memory.totalMessages,
      timestamp: new Date().toISOString()
    }

    // Log stats access
    console.log(`[Server] 📊 Stats requested – total requests: ${liveStats.totalRequests}, avg RT: ${liveStats.avgResponseTime}`)

    res.json(liveStats)
  } catch (error) {
    console.error('[Cassie API] Error fetching stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    })
  }
})

/**
 * GET /api/agents/cassie/health
 * Run health check with proper HTTP status codes
 */
router.get('/health', async (req, res) => {
  try {
    const health = await cassieAgent.healthCheck()
    const isHealthy = health.overall === 'healthy'

    // Log health status
    if (isHealthy) {
      console.log('[Server] 🩺 Health: OK (OpenAI reachable)')
    } else {
      console.warn('[Server] ⚠️  Health degraded - OpenAI API unreachable')
    }

    // Return 200 if healthy, 503 if degraded
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      health
    })
  } catch (error) {
    console.error('[Cassie API] ❌ Error running health check:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to run health check',
      message: error.message
    })
  }
})

/**
 * POST /api/agents/cassie/export/:sessionId
 * Export session transcript
 */
router.post('/export/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params

    const result = cassieAgent.exportSession(sessionId)

    if (result.success) {
      res.json({
        success: true,
        message: 'Session exported successfully',
        filepath: result.filepath,
        messageCount: result.messageCount
      })
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('[Cassie API] Error exporting session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export session'
    })
  }
})

/**
 * GET /api/agents/cassie
 * Get Cassie agent information
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    agent: {
      id: cassieAgent.agentId,
      name: cassieAgent.name,
      version: cassieAgent.version,
      description: 'Autonomous multilingual customer support agent powered by OpenAI GPT-4',
      status: cassieAgent.apiKey ? 'online' : 'fallback',
      languages: ['en', 'de'],
      features: [
        'Multilingual support (German & English)',
        'Automatic language detection',
        'Session-based memory',
        'OpenAI GPT-4 integration',
        'Confidence scoring',
        'Response metadata'
      ]
    },
    endpoints: {
      chat: 'POST /api/agents/cassie/chat',
      history: 'GET /api/agents/cassie/history/:sessionId',
      clearSession: 'DELETE /api/agents/cassie/session/:sessionId',
      stats: 'GET /api/agents/cassie/stats',
      status: 'GET /api/agents/cassie/status',
      health: 'GET /api/agents/cassie/health',
      export: 'POST /api/agents/cassie/export/:sessionId'
    }
  })
})

module.exports = router
