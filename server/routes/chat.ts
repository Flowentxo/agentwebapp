import express from 'express'
import { ChatService } from '../services/ChatService'
import { logger } from '../utils/logger'
import { sanitizePromptInput, checkInjectionRateLimit } from '@/lib/security/prompt-sanitizer'
import { aiChatLimiter } from '../middleware/rate-limiter'

const router = express.Router()
const chatService = new ChatService()

// Apply AI chat rate limiting to all routes
router.use(aiChatLimiter)

// Middleware to check authentication (simple version without import)
const simpleAuth = (req: any, res: any, next: any) => {
  // For now, allow all requests (we'll add proper auth later)
  // TODO: Replace with real authentication
  req.user = { id: 'user-001' }
  next()
}

// Send message to agent
router.post('/:agentId/chat', simpleAuth, async (req, res) => {
  try {
    const { agentId } = req.params
    const { message, history } = req.body
    const userId = (req as any).user.id

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Check if user is rate-limited for injection attempts
    if (checkInjectionRateLimit(userId)) {
      logger.error('[SECURITY] User blocked for excessive prompt injection attempts', {
        userId,
        agentId
      })
      return res.status(429).json({
        error: 'Too many suspicious requests',
        message: 'Your account has been temporarily restricted due to suspicious activity. Please contact support if you believe this is an error.'
      })
    }

    // Sanitize user input to prevent prompt injection
    const { sanitized, wasModified, threats } = sanitizePromptInput(message)

    if (wasModified) {
      logger.warn('[SECURITY] Prompt injection attempt detected and sanitized', {
        userId,
        agentId,
        originalLength: message.length,
        sanitizedLength: sanitized.length,
        threats
      })
    }

    logger.info(`Chat request for agent ${agentId} from user ${userId}`)

    // Send sanitized message to AI
    const response = await chatService.sendMessage(agentId, sanitized, history, userId)

    res.json(response)
  } catch (error: any) {
    logger.error('Chat error:', error)
    res.status(500).json({ error: error.message || 'Failed to process message' })
  }
})

// Get chat history
router.get('/:agentId/history', simpleAuth, async (req, res) => {
  try {
    const { agentId } = req.params
    const userId = (req as any).user.id

    const history = await chatService.getChatHistory(agentId, userId)

    res.json({ messages: history })
  } catch (error: any) {
    logger.error('Error fetching chat history:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch chat history' })
  }
})

// Clear chat history
router.delete('/:agentId/history', simpleAuth, async (req, res) => {
  try {
    const { agentId } = req.params
    const userId = (req as any).user.id

    await chatService.clearChatHistory(agentId, userId)

    res.json({ success: true })
  } catch (error: any) {
    logger.error('Error clearing chat history:', error)
    res.status(500).json({ error: error.message || 'Failed to clear chat history' })
  }
})

export const chatRouter = router
