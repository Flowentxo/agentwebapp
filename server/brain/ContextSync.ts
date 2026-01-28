/**
 * Context Synchronization Service
 * Manages real-time context sharing between agents via Brain AI
 */

import { MemoryStore, MemoryRecord } from './MemoryStore'
import { v4 as uuidv4 } from 'uuid'

export interface ContextMessage {
  id: string
  fromAgent: string
  toAgent: string | 'broadcast'
  timestamp: string
  payload: any
  priority: 'low' | 'medium' | 'high' | 'critical'
  acknowledged: boolean
}

export interface ContextShare {
  sourceAgent: string
  targetAgent: string
  context: any
  metadata?: any
}

export class ContextSync {
  private static instance: ContextSync
  private memoryStore: MemoryStore
  private messageQueue: Map<string, ContextMessage[]>
  private subscribers: Map<string, Set<(message: ContextMessage) => void>>

  private constructor() {
    this.memoryStore = MemoryStore.getInstance()
    this.messageQueue = new Map()
    this.subscribers = new Map()
    console.log('[ContextSync] Initialized')
  }

  public static getInstance(): ContextSync {
    if (!ContextSync.instance) {
      ContextSync.instance = new ContextSync()
    }
    return ContextSync.instance
  }

  /**
   * Share context between agents
   */
  public share(shareData: ContextShare): ContextMessage {
    const message: ContextMessage = {
      id: uuidv4(),
      fromAgent: shareData.sourceAgent,
      toAgent: shareData.targetAgent,
      timestamp: new Date().toISOString(),
      payload: shareData.context,
      priority: 'medium',
      acknowledged: false
    }

    // Add to message queue
    if (!this.messageQueue.has(shareData.targetAgent)) {
      this.messageQueue.set(shareData.targetAgent, [])
    }
    this.messageQueue.get(shareData.targetAgent)!.push(message)

    // Store in memory
    const memoryRecord: MemoryRecord = {
      id: message.id,
      agentId: shareData.sourceAgent,
      timestamp: message.timestamp,
      context: {
        type: 'context_share',
        targetAgent: shareData.targetAgent,
        payload: shareData.context,
        metadata: shareData.metadata
      },
      tags: ['context_share', shareData.sourceAgent, shareData.targetAgent],
      importance: 7
    }
    this.memoryStore.store(memoryRecord)

    // Notify subscribers
    this.notifySubscribers(shareData.targetAgent, message)

    console.log(`[ContextSync] Context shared from ${shareData.sourceAgent} to ${shareData.targetAgent}`)

    return message
  }

  /**
   * Broadcast context to all agents
   */
  public broadcast(fromAgent: string, context: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): ContextMessage {
    const message: ContextMessage = {
      id: uuidv4(),
      fromAgent,
      toAgent: 'broadcast',
      timestamp: new Date().toISOString(),
      payload: context,
      priority,
      acknowledged: false
    }

    // Store in memory
    const memoryRecord: MemoryRecord = {
      id: message.id,
      agentId: fromAgent,
      timestamp: message.timestamp,
      context: {
        type: 'broadcast',
        payload: context
      },
      tags: ['broadcast', fromAgent],
      importance: priority === 'critical' ? 10 : priority === 'high' ? 8 : 6
    }
    this.memoryStore.store(memoryRecord)

    // Notify all subscribers
    this.subscribers.forEach((_, agentId) => {
      if (agentId !== fromAgent) {
        this.notifySubscribers(agentId, message)
      }
    })

    console.log(`[ContextSync] Broadcast from ${fromAgent} with priority ${priority}`)

    return message
  }

  /**
   * Subscribe to context messages
   */
  public subscribe(agentId: string, callback: (message: ContextMessage) => void): void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set())
    }
    this.subscribers.get(agentId)!.add(callback)
    console.log(`[ContextSync] Agent ${agentId} subscribed to context updates`)
  }

  /**
   * Unsubscribe from context messages
   */
  public unsubscribe(agentId: string, callback: (message: ContextMessage) => void): void {
    const agentSubscribers = this.subscribers.get(agentId)
    if (agentSubscribers) {
      agentSubscribers.delete(callback)
      console.log(`[ContextSync] Agent ${agentId} unsubscribed from context updates`)
    }
  }

  /**
   * Get pending messages for an agent
   */
  public getPendingMessages(agentId: string): ContextMessage[] {
    const messages = this.messageQueue.get(agentId) || []
    const broadcastMessages = this.messageQueue.get('broadcast') || []
    return [...messages, ...broadcastMessages]
  }

  /**
   * Acknowledge a message
   */
  public acknowledge(messageId: string, agentId: string): boolean {
    const queues = [this.messageQueue.get(agentId), this.messageQueue.get('broadcast')]

    for (const queue of queues) {
      if (!queue) continue

      const message = queue.find(m => m.id === messageId)
      if (message) {
        message.acknowledged = true
        console.log(`[ContextSync] Message ${messageId} acknowledged by ${agentId}`)
        return true
      }
    }

    return false
  }

  /**
   * Clear acknowledged messages
   */
  public clearAcknowledged(agentId: string): number {
    const queue = this.messageQueue.get(agentId)
    if (!queue) return 0

    const before = queue.length
    this.messageQueue.set(agentId, queue.filter(m => !m.acknowledged))
    const cleared = before - queue.length

    if (cleared > 0) {
      console.log(`[ContextSync] Cleared ${cleared} acknowledged messages for ${agentId}`)
    }

    return cleared
  }

  /**
   * Get context history between agents
   */
  public getHistory(agentA: string, agentB: string, limit: number = 50): MemoryRecord[] {
    const memories = this.memoryStore.query({
      tags: [agentA, agentB],
      limit,
      minImportance: 5
    })

    return memories
  }

  /**
   * Get statistics
   */
  public getStats(): {
    totalMessages: number
    pendingMessages: number
    acknowledgedMessages: number
    subscribers: number
    queuesByAgent: Record<string, number>
  } {
    let totalMessages = 0
    let pendingMessages = 0
    let acknowledgedMessages = 0
    const queuesByAgent: Record<string, number> = {}

    this.messageQueue.forEach((messages, agentId) => {
      totalMessages += messages.length
      queuesByAgent[agentId] = messages.length

      messages.forEach(msg => {
        if (msg.acknowledged) {
          acknowledgedMessages++
        } else {
          pendingMessages++
        }
      })
    })

    return {
      totalMessages,
      pendingMessages,
      acknowledgedMessages,
      subscribers: this.subscribers.size,
      queuesByAgent
    }
  }

  /**
   * Notify subscribers of new messages
   */
  private notifySubscribers(agentId: string, message: ContextMessage): void {
    const subscribers = this.subscribers.get(agentId)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(message)
        } catch (error) {
          console.error(`[ContextSync] Error notifying subscriber for ${agentId}:`, error)
        }
      })
    }
  }

  /**
   * Clear all data (use with caution)
   */
  public clear(): void {
    this.messageQueue.clear()
    this.subscribers.clear()
    console.log('[ContextSync] Cleared all context sync data')
  }
}
