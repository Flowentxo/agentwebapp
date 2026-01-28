import { EventEmitter } from 'events'
import { logger } from '../utils/logger'

/**
 * KnowledgeEventEmitter - Central event bus for knowledge updates
 *
 * Events:
 * - knowledgeUpdated: { userId, documentId, chunkCount }
 * - knowledgeDeleted: { userId, documentId }
 * - agentRefreshRequested: { userId, agentName }
 */
class KnowledgeEventEmitter extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100) // Support many agents listening
  }

  emitKnowledgeUpdated(userId: string, documentId: string, chunkCount: number) {
    logger.info(`Knowledge updated event: user=${userId}, doc=${documentId}, chunks=${chunkCount}`)
    this.emit('knowledgeUpdated', { userId, documentId, chunkCount })
  }

  emitKnowledgeDeleted(userId: string, documentId: string) {
    logger.info(`Knowledge deleted event: user=${userId}, doc=${documentId}`)
    this.emit('knowledgeDeleted', { userId, documentId })
  }

  emitAgentRefreshRequested(userId: string, agentName?: string) {
    logger.info(`Agent refresh requested: user=${userId}, agent=${agentName || 'all'}`)
    this.emit('agentRefreshRequested', { userId, agentName })
  }

  onKnowledgeUpdated(callback: (data: { userId: string; documentId: string; chunkCount: number }) => void) {
    this.on('knowledgeUpdated', callback)
  }

  onKnowledgeDeleted(callback: (data: { userId: string; documentId: string }) => void) {
    this.on('knowledgeDeleted', callback)
  }

  onAgentRefreshRequested(callback: (data: { userId: string; agentName?: string }) => void) {
    this.on('agentRefreshRequested', callback)
  }
}

// Singleton instance
export const knowledgeEvents = new KnowledgeEventEmitter()
