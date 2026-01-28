import { WebSocket, WebSocketServer } from 'ws'
import { logger } from '../utils/logger'

interface WebSocketMessage {
  type: 'agent-status' | 'metrics-update' | 'task-update' | 'notification' | 'chat-message'
  data: any
  timestamp: string
}

interface ConnectedClient {
  ws: WebSocket
  userId?: string
  subscribedChannels: Set<string>
}

/**
 * WebSocket Service for Real-time Updates
 * Provides live updates for agent status, metrics, tasks, and notifications
 */
export class WebSocketService {
  private clients: Map<WebSocket, ConnectedClient> = new Map()
  private channels: Map<string, Set<WebSocket>> = new Map()

  constructor(private wss: WebSocketServer) {
    this.setupWebSocket()
  }

  /**
   * Setup WebSocket server and handle connections
   */
  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      const client: ConnectedClient = {
        ws,
        subscribedChannels: new Set()
      }

      this.clients.set(ws, client)
      logger.info(`WebSocket client connected. Total: ${this.clients.size}`)

      // Send welcome message
      this.sendToClient(ws, {
        type: 'notification',
        data: { message: 'Connected to Sintra System' },
        timestamp: new Date().toISOString()
      })

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleClientMessage(ws, message)
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error)
        }
      })

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(ws)
      })

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error)
      })
    })
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(ws: WebSocket, message: any) {
    const client = this.clients.get(ws)
    if (!client) return

    switch (message.type) {
      case 'subscribe':
        this.subscribeToChannel(ws, message.channel)
        break

      case 'unsubscribe':
        this.unsubscribeFromChannel(ws, message.channel)
        break

      case 'authenticate':
        client.userId = message.userId
        logger.info(`Client authenticated: ${message.userId}`)
        break

      case 'ping':
        this.sendToClient(ws, {
          type: 'notification',
          data: { message: 'pong' },
          timestamp: new Date().toISOString()
        })
        break

      default:
        logger.warn(`Unknown message type: ${message.type}`)
    }
  }

  /**
   * Subscribe client to a channel
   */
  private subscribeToChannel(ws: WebSocket, channel: string) {
    const client = this.clients.get(ws)
    if (!client) return

    client.subscribedChannels.add(channel)

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }

    this.channels.get(channel)!.add(ws)
    logger.info(`Client subscribed to channel: ${channel}`)

    // Send confirmation
    this.sendToClient(ws, {
      type: 'notification',
      data: { message: `Subscribed to ${channel}` },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Unsubscribe client from a channel
   */
  private unsubscribeFromChannel(ws: WebSocket, channel: string) {
    const client = this.clients.get(ws)
    if (!client) return

    client.subscribedChannels.delete(channel)

    const channelSubs = this.channels.get(channel)
    if (channelSubs) {
      channelSubs.delete(ws)
      if (channelSubs.size === 0) {
        this.channels.delete(channel)
      }
    }

    logger.info(`Client unsubscribed from channel: ${channel}`)
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws)
    if (client) {
      // Remove from all subscribed channels
      for (const channel of client.subscribedChannels) {
        const channelSubs = this.channels.get(channel)
        if (channelSubs) {
          channelSubs.delete(ws)
          if (channelSubs.size === 0) {
            this.channels.delete(channel)
          }
        }
      }
    }

    this.clients.delete(ws)
    logger.info(`WebSocket client disconnected. Total: ${this.clients.size}`)
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * Broadcast agent status update
   */
  broadcastAgentStatus(agentId: string, status: {
    status: string
    metrics?: any
    lastAction?: string
  }) {
    this.broadcast({
      type: 'agent-status',
      data: {
        agentId,
        ...status
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Broadcast metrics update
   */
  broadcastMetricsUpdate(metrics: any) {
    this.broadcast({
      type: 'metrics-update',
      data: metrics,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Broadcast task update
   */
  broadcastTaskUpdate(taskId: string, update: {
    status: string
    progress?: number
    result?: any
  }) {
    this.broadcast({
      type: 'task-update',
      data: {
        taskId,
        ...update
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Send notification to all clients
   */
  sendNotification(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.broadcast({
      type: 'notification',
      data: { message, level },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Broadcast chat message
   */
  broadcastChatMessage(agentId: string, message: {
    role: string
    content: string
    userId?: string
  }) {
    this.broadcast({
      type: 'chat-message',
      data: {
        agentId,
        ...message
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Broadcast to all connected clients
   */
  private broadcast(message: WebSocketMessage, channel?: string) {
    let recipients: Set<WebSocket>

    if (channel && this.channels.has(channel)) {
      recipients = this.channels.get(channel)!
    } else {
      recipients = new Set(this.clients.keys())
    }

    let sent = 0
    for (const ws of recipients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
        sent++
      }
    }

    logger.debug(`Broadcast ${message.type} to ${sent} clients${channel ? ` (channel: ${channel})` : ''}`)
  }

  /**
   * Broadcast to specific channel
   */
  broadcastToChannel(channel: string, message: WebSocketMessage) {
    this.broadcast(message, channel)
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalClients: number
    authenticatedClients: number
    totalChannels: number
    channelSubscriptions: Record<string, number>
  } {
    let authenticatedClients = 0

    for (const client of this.clients.values()) {
      if (client.userId) {
        authenticatedClients++
      }
    }

    const channelSubscriptions: Record<string, number> = {}
    for (const [channel, subs] of this.channels.entries()) {
      channelSubscriptions[channel] = subs.size
    }

    return {
      totalClients: this.clients.size,
      authenticatedClients,
      totalChannels: this.channels.size,
      channelSubscriptions
    }
  }

  /**
   * Send heartbeat to keep connections alive
   */
  startHeartbeat(interval: number = 30000) {
    setInterval(() => {
      for (const ws of this.clients.keys()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping()
        }
      }
    }, interval)

    logger.info('WebSocket heartbeat started')
  }
}
