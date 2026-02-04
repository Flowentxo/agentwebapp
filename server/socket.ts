import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { logger } from './utils/logger'
import { aiAgentService } from './services/AIAgentService'
import { voiceSessionPersistenceService, type VoiceSessionContext } from './services/VoiceSessionPersistenceService'
import { JWT_SECRET } from './utils/jwt'

export let io: SocketIOServer

// JWT_SECRET is now imported from ./utils/jwt for consistency across the app

// Extended Socket type with user data
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

// ============================================
// SOCKET EVENT TYPES
// ============================================

interface WorkflowExecutionEvent {
  workflowId: string;
  executionId: string;
  status: 'started' | 'step_started' | 'step_completed' | 'step_failed' | 'completed' | 'failed';
  stepId?: string;
  stepName?: string;
  progress?: number;
  output?: unknown;
  error?: string;
  timestamp: string;
}

interface AgentActivityEvent {
  agentId: string;
  userId: string;
  type: 'thinking' | 'responding' | 'tool_call' | 'completed' | 'error';
  message?: string;
  toolName?: string;
  timestamp: string;
}

interface NotificationEvent {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;
  timestamp: string;
}

export interface AnalyticsUpdateEvent {
  dashboardId: string;
  metric: string;
  value: any;
  timestamp: string;
}

// ============================================
// INBOX MESSAGE TYPES (Flowent Inbox v2)
// ============================================

export type InboxMessageType = 'text' | 'approval_request' | 'system_event' | 'artifact';
export type InboxMessageRole = 'user' | 'agent' | 'system';

export interface InboxMessagePayload {
  id: string;
  threadId: string;
  role: InboxMessageRole;
  type: InboxMessageType;
  content: string;
  agentId?: string;
  agentName?: string;
  artifactId?: string;
  approval?: {
    approvalId: string;
    actionType: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    cost?: number;
    estimatedTokens?: number;
    payload?: Record<string, unknown>;
    previewData?: string;
    expiresAt?: string;
  };
  metadata?: {
    eventType?: string;
    workflowName?: string;
    fromAgent?: string;
    toAgent?: string;
    reason?: string;
    details?: string;
    priority?: string;
  };
  timestamp: string;
  isStreaming?: boolean;
}

export interface InboxTypingIndicator {
  threadId: string;
  agentId: string;
  agentName: string;
  isTyping: boolean;
}

// ============================================
// SOCKET INITIALIZATION
// ============================================

export function initializeSocketIO(server: HttpServer) {
  // Initialize Socket.IO with CORS
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:4000',
        'https://sintra.ai',
        process.env.FRONTEND_URL || ''
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST']
    },
    path: '/socket.io/',
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // ============================================
  // DEFAULT NAMESPACE
  // ============================================
  io.on('connection', (socket: Socket) => {
    logger.info(`✅ Socket.IO client connected: ${socket.id}`)

    // Join user-specific room
    socket.on('user:join', (userId: string) => {
      socket.join(`user:${userId}`)
      logger.info(`User ${userId} joined their room`)
    })

    // Join workflow execution room
    socket.on('workflow:subscribe', (data: { workflowId: string; executionId?: string }) => {
      socket.join(`workflow:${data.workflowId}`)
      if (data.executionId) {
        socket.join(`execution:${data.executionId}`)
      }
      logger.info(`Socket ${socket.id} subscribed to workflow ${data.workflowId}`)
    })

    // Join agent activity room
    socket.on('agent:subscribe', (agentId: string) => {
      socket.join(`agent:${agentId}`)
      logger.info(`Socket ${socket.id} subscribed to agent ${agentId}`)
    })

    // Unsubscribe handlers
    socket.on('workflow:unsubscribe', (workflowId: string) => {
      socket.leave(`workflow:${workflowId}`)
    })

    // Unsubscribe handlers
    socket.on('agent:unsubscribe', (agentId: string) => {
      socket.leave(`agent:${agentId}`)
    })

    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket.IO client disconnected: ${socket.id}, reason: ${reason}`)
    })

    socket.on('error', (error) => {
      logger.error(`🔴 Socket.IO error for ${socket.id}:`, error)
    })
  })

  // ============================================
  // /v1 NAMESPACE (für Frontend-Kompatibilität)
  // ============================================
  const v1Namespace = io.of('/v1');

  v1Namespace.on('connection', (socket: Socket) => {
    logger.info(`✅ Socket.IO client connected to /v1: ${socket.id}`)

    // Activity subscription
    socket.on('subscribe:activity', (userId: string) => {
      socket.join(`activity:${userId}`)
      logger.info(`User ${userId} subscribed to activity feed on /v1`)
    })

    // Email updates subscription
    socket.on('subscribe:email', (userId: string) => {
      socket.join(`email:${userId}`)
      logger.info(`User ${userId} subscribed to email updates on /v1`)
    })

    // Workflow subscription
    socket.on('subscribe:workflow', (workflowId: string) => {
      socket.join(`workflow:${workflowId}`)
      logger.info(`Socket subscribed to workflow ${workflowId} on /v1`)
    })

    // Pipeline subscription
    socket.on('subscribe:pipeline', (pipelineId: string) => {
      socket.join(`pipeline:${pipelineId}`)
      logger.info(`Socket subscribed to pipeline ${pipelineId} on /v1`)
    })

    // Notifications subscription
    socket.on('subscribe:notifications', (userId: string) => {
      socket.join(`notifications:${userId}`)
      logger.info(`User ${userId} subscribed to notifications on /v1`)
    })

    // Analytics subscription (NEW)
    socket.on('subscribe:analytics', (dashboardId: string) => {
      socket.join(`analytics:dashboard:${dashboardId}`)
      logger.info(`User subscribed to analytics dashboard: ${dashboardId}`)
    })

    // Unsubscribe handlers
    socket.on('unsubscribe:activity', (userId: string) => {
      socket.leave(`activity:${userId}`)
    })

    socket.on('unsubscribe:email', (userId: string) => {
      socket.leave(`email:${userId}`)
    })
    
    socket.on('unsubscribe:analytics', (dashboardId: string) => {
      socket.leave(`analytics:dashboard:${dashboardId}`)
    })

    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket.IO /v1 client disconnected: ${socket.id}, reason: ${reason}`)
    })

    socket.on('error', (error) => {
      logger.error(`🔴 Socket.IO /v1 error for ${socket.id}:`, error)
    })
  })

  // ============================================
  // /pipelines NAMESPACE
  // ============================================
  const pipelinesNamespace = io.of('/pipelines');

  pipelinesNamespace.on('connection', (socket: Socket) => {
    logger.info(`✅ Socket.IO client connected to /pipelines: ${socket.id}`)

    socket.on('subscribe', (executionId: string) => {
      socket.join(`execution:${executionId}`)
      logger.info(`Socket subscribed to pipeline execution ${executionId}`)
    })

    socket.on('unsubscribe', (executionId: string) => {
      socket.leave(`execution:${executionId}`)
    })

    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket.IO /pipelines client disconnected: ${socket.id}, reason: ${reason}`)
    })
  })

  // ============================================
  // /inbox NAMESPACE (Flowent Inbox v2)
  // ============================================
  const inboxNamespace = io.of('/inbox');

  // JWT Authentication Middleware for /inbox namespace
  inboxNamespace.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn('[SOCKET /inbox] Connection rejected - no token provided');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; id?: string; email?: string; role?: string };
      socket.userId = decoded.userId || decoded.id;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;
      logger.info(`[SOCKET /inbox] Authenticated: ${socket.userId} (${socket.userEmail})`);
      next();
    } catch (err: any) {
      logger.warn(`[SOCKET /inbox] Auth failed: ${err.message}`);
      return next(new Error('Invalid or expired token'));
    }
  });

  inboxNamespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`✅ Socket.IO client connected to /inbox: ${socket.id} (user: ${socket.userId})`);

    // Auto-subscribe to user's inbox on connection
    if (socket.userId) {
      socket.join(`inbox:${socket.userId}`);
      logger.info(`[SOCKET /inbox] User ${socket.userId} auto-subscribed to inbox updates`);
    }

    // Join a thread room
    socket.on('thread:join', (data: { threadId: string }) => {
      socket.join(`thread:${data.threadId}`)
      logger.info(`Socket ${socket.id} joined thread ${data.threadId}`)
    })

    // Leave a thread room
    socket.on('thread:leave', (data: { threadId: string }) => {
      socket.leave(`thread:${data.threadId}`)
      logger.info(`Socket ${socket.id} left thread ${data.threadId}`)
    })

    // Subscribe to user's inbox
    socket.on('inbox:subscribe', (userId: string) => {
      socket.join(`inbox:${userId}`)
      logger.info(`User ${userId} subscribed to inbox updates`)
    })

    socket.on('inbox:unsubscribe', (userId: string) => {
      socket.leave(`inbox:${userId}`)
    })

    // Handle typing indicators
    socket.on('typing:start', (data: InboxTypingIndicator) => {
      socket.to(`thread:${data.threadId}`).emit('typing:start', data)
    })

    socket.on('typing:stop', (data: InboxTypingIndicator) => {
      socket.to(`thread:${data.threadId}`).emit('typing:stop', data)
    })

    // Handle message sending - Routes to REST API which triggers AI response with Omni-Orchestrator
    socket.on('message:send', async (payload: { threadId: string; content: string }, callback) => {
      try {
        const { threadId, content } = payload;
        const userId = socket.userId;
        const token = socket.handshake.auth?.token;

        if (!userId) {
          logger.warn('[INBOX] message:send rejected - not authenticated');
          return callback({ success: false, error: 'Not authenticated' });
        }

        if (!content || !content.trim()) {
          return callback({ success: false, error: 'Message content required' });
        }

        logger.info(`[INBOX] Processing message for thread ${threadId} from user ${userId}`);

        // Call the REST API which handles:
        // 1. Saving the message to DB
        // 2. Omni-Orchestrator routing (if agent is 'omni' or 'assistant')
        // 3. Generating AI response
        // 4. Emitting socket events for real-time updates
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
        const response = await fetch(`${backendUrl}/api/inbox/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ content: content.trim(), role: 'user' }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        logger.info(`[INBOX] Message saved successfully: ${result.message?.id}`);

        callback({
          success: true,
          messageId: result.message?.id || `msg-${Date.now()}`,
          agentRouted: result.agentRouted || false
        });

      } catch (error: any) {
        logger.error('[INBOX] message:send error:', error.message);
        callback({ success: false, error: error.message || 'Failed to send message' });
      }
    })

    // Handle approval actions
    socket.on('approval:action', async (payload: { threadId: string; messageId: string; action: 'approve' | 'reject'; comment?: string }, callback) => {
      try {
        logger.info(`[INBOX] Approval action: ${payload.action} for ${payload.messageId}`)
        callback({ success: true })
      } catch (error) {
        callback({ success: false, error: 'Failed to process approval' })
      }
    })

    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket.IO /inbox client disconnected: ${socket.id}, reason: ${reason}`)
    })

    socket.on('error', (error) => {
      logger.error(`🔴 Socket.IO /inbox error for ${socket.id}:`, error)
    })
  })

  // ============================================
  // /voice NAMESPACE (Flowent Horizon Voice Mode)
  // ============================================
  const voiceNamespace = io.of('/voice');

  // Voice session state tracking
  interface VoiceSession {
    userId: string;
    agentId: string;
    agentName: string;
    sessionId: string;
    startTime: Date;
    chunksReceived: number;
    totalBytesReceived: number;
    audioBuffer: Buffer[];  // Accumulated audio chunks
    isProcessing: boolean;  // Prevent concurrent processing
    language?: string;
    // Database persistence
    threadId?: string;        // Linked inbox thread ID
    workspaceId?: string;     // Workspace context
    hasLoadedContext: boolean; // Whether we loaded existing thread context
  }

  const voiceSessions = new Map<string, VoiceSession>();

  // Helper: Convert Float32Array to WAV buffer for Whisper API
  function float32ArrayToWavBuffer(audioData: Float32Array, sampleRate: number = 48000): Buffer {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit audio
    const dataLength = audioData.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataLength);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
    buffer.writeUInt16LE(bytesPerSample * 8, 34); // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    // Convert Float32 to Int16 and write audio data
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      buffer.writeInt16LE(Math.round(int16Sample), 44 + i * 2);
    }

    return buffer;
  }

  // Helper: Combine audio buffers
  function combineAudioBuffers(buffers: Buffer[]): Buffer {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    return Buffer.concat(buffers, totalLength);
  }

  // JWT Authentication Middleware for /voice namespace
  voiceNamespace.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn('[SOCKET /voice] Connection rejected - no token provided');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; id?: string; email?: string; role?: string };
      socket.userId = decoded.userId || decoded.id;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;
      logger.info(`[SOCKET /voice] Authenticated: ${socket.userId} (${socket.userEmail})`);
      next();
    } catch (err: any) {
      logger.warn(`[SOCKET /voice] Auth failed: ${err.message}`);
      return next(new Error('Invalid or expired token'));
    }
  });

  voiceNamespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`✅ Socket.IO client connected to /voice: ${socket.id} (user: ${socket.userId})`);

    // ================================
    // SESSION START (with Context Loading)
    // ================================
    socket.on('session:start', async (data: {
      agentId: string;
      agentName?: string;
      threadId?: string;      // Optional: Continue existing conversation
      workspaceId?: string;
      config?: { language?: string; voiceId?: string }
    }, callback) => {
      try {
        const sessionId = `voice-${socket.userId}-${Date.now()}`;
        const userId = socket.userId || 'anonymous';
        const agentName = data.agentName || aiAgentService.getAgentConfig(data.agentId).name;

        logger.info(`[SOCKET /voice] Starting session: ${sessionId} (agent: ${data.agentId}, threadId: ${data.threadId || 'new'})`);

        // === CONTEXT INJECTION ===
        // Load existing conversation context if threadId provided
        let threadId = data.threadId;
        let hasLoadedContext = false;
        let contextMessages: VoiceSessionContext['conversationHistory'] = [];

        if (data.threadId) {
          // Load existing thread context
          const context = await voiceSessionPersistenceService.loadThreadContext(
            data.threadId,
            userId,
            10 // Load last 10 messages
          );

          if (context) {
            contextMessages = context.conversationHistory;
            hasLoadedContext = true;
            logger.info(`[SOCKET /voice] Loaded ${contextMessages.length} messages from thread: ${data.threadId}`);
          }
        }

        // Create or get thread if we need one for persistence
        if (!threadId) {
          const result = await voiceSessionPersistenceService.getOrCreateThread(
            userId,
            data.agentId,
            agentName,
            undefined,
            data.workspaceId
          );
          threadId = result.threadId;
          logger.info(`[SOCKET /voice] Created new thread: ${threadId}`);
        }

        // Inject context into AI conversation history
        if (hasLoadedContext && contextMessages.length > 0) {
          // Pre-populate the AI's conversation history with text chat context
          const historyKey = `${data.agentId}:${sessionId}`;
          const config = aiAgentService.getAgentConfig(data.agentId);

          // Build history with system prompt + existing context
          const initialHistory = [
            { role: 'system' as const, content: config.systemPrompt },
            ...contextMessages
          ];

          // Store in AIAgentService's conversation history
          // This requires exposing a method, or we set it here manually
          (aiAgentService as any).conversationHistory.set(historyKey, initialHistory);

          logger.info(`[SOCKET /voice] Injected ${contextMessages.length} context messages into LLM history`);
        }

        // Create session with audio buffer
        voiceSessions.set(socket.id, {
          userId,
          agentId: data.agentId,
          agentName,
          sessionId,
          startTime: new Date(),
          chunksReceived: 0,
          totalBytesReceived: 0,
          audioBuffer: [],
          isProcessing: false,
          language: data.config?.language,
          threadId,
          workspaceId: data.workspaceId,
          hasLoadedContext
        });

        // Join session room
        socket.join(`voice:${sessionId}`);

        logger.info(`[SOCKET /voice] Session started: ${sessionId} (agent: ${data.agentId}, thread: ${threadId})`);

        // Acknowledge with session info
        callback?.({
          success: true,
          sessionId,
          threadId,
          hasContext: hasLoadedContext,
          contextMessageCount: contextMessages.length,
          message: 'Voice session started'
        });

        // Emit ready event after brief initialization
        setTimeout(() => {
          socket.emit('session:ready', {
            sessionId,
            agentId: data.agentId,
            threadId,
            hasContext: hasLoadedContext,
            timestamp: new Date().toISOString()
          });

          // Emit initial listening state
          socket.emit('agent:state', {
            state: 'listening',
            timestamp: new Date().toISOString()
          });
        }, 100);

      } catch (error: any) {
        logger.error(`[SOCKET /voice] Session start error:`, error);
        callback?.({ success: false, error: error.message });
      }
    });

    // ================================
    // BARGE-IN: STOP AGENT (Interrupt TTS)
    // ================================
    socket.on('agent:stop', () => {
      const session = voiceSessions.get(socket.id);
      if (!session) {
        logger.warn('[SOCKET /voice] agent:stop - No active session');
        return;
      }

      logger.info(`[SOCKET /voice] Barge-In received for session: ${session.sessionId}`);

      // Abort any active TTS stream
      const aborted = aiAgentService.abortStream(session.sessionId);
      if (aborted) {
        logger.info(`[SOCKET /voice] TTS stream aborted for session: ${session.sessionId}`);
      }

      // Reset processing state
      session.isProcessing = false;

      // Acknowledge the stop
      socket.emit('agent:stopped', {
        timestamp: new Date().toISOString()
      });

      // Return to listening state
      socket.emit('agent:state', {
        state: 'listening',
        timestamp: new Date().toISOString()
      });
    });

    // ================================
    // AUDIO STREAM HANDLING
    // ================================
    socket.on('audio:stream', (data: { chunk: ArrayBuffer | Float32Array; sampleRate?: number; timestamp?: number }) => {
      const session = voiceSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'No active voice session' });
        return;
      }

      // Convert incoming data to Buffer
      let audioChunk: Buffer;
      if (data.chunk instanceof ArrayBuffer) {
        audioChunk = Buffer.from(data.chunk);
      } else if (data.chunk instanceof Float32Array || (data.chunk && typeof data.chunk === 'object')) {
        // Convert Float32Array to WAV buffer
        const float32Data = data.chunk instanceof Float32Array
          ? data.chunk
          : new Float32Array(Object.values(data.chunk));
        audioChunk = float32ArrayToWavBuffer(float32Data, data.sampleRate || 48000);
      } else {
        audioChunk = Buffer.from([]);
      }

      // Update session stats
      session.chunksReceived++;
      session.totalBytesReceived += audioChunk.length;
      session.audioBuffer.push(audioChunk);

      // Log every 50 chunks (for debugging)
      if (session.chunksReceived % 50 === 0) {
        logger.info(`[SOCKET /voice] Session ${socket.id}: ${session.chunksReceived} chunks, ${(session.totalBytesReceived / 1024).toFixed(1)}KB total`);
      }
    });

    // ================================
    // PROCESS AUDIO (Trigger AI Pipeline + Incremental Persistence)
    // ================================
    socket.on('audio:process', async (callback?: (result: { success: boolean; error?: string }) => void) => {
      const session = voiceSessions.get(socket.id);
      if (!session) {
        callback?.({ success: false, error: 'No active voice session' });
        return;
      }

      if (session.isProcessing) {
        callback?.({ success: false, error: 'Already processing' });
        return;
      }

      if (session.audioBuffer.length === 0) {
        callback?.({ success: false, error: 'No audio data to process' });
        return;
      }

      session.isProcessing = true;
      const interactionStartTime = Date.now();

      try {
        // Combine all audio chunks
        const combinedAudio = combineAudioBuffers(session.audioBuffer);
        logger.info(`[SOCKET /voice] Processing audio: ${(combinedAudio.length / 1024).toFixed(1)}KB`);

        // Clear buffer for next recording
        session.audioBuffer = [];

        // Emit thinking state
        socket.emit('agent:state', {
          state: 'thinking',
          timestamp: new Date().toISOString()
        });

        // Step 1: Transcribe audio (STT)
        logger.info(`[SOCKET /voice] Starting STT...`);
        const transcription = await aiAgentService.transcribe(combinedAudio, session.language);

        socket.emit('transcription', {
          text: transcription.text,
          confidence: 0.95,
          isFinal: true,
          timestamp: new Date().toISOString()
        });

        logger.info(`[SOCKET /voice] Transcription: "${transcription.text}"`);

        if (!transcription.text.trim()) {
          // No speech detected, return to listening
          socket.emit('agent:state', {
            state: 'listening',
            timestamp: new Date().toISOString()
          });
          session.isProcessing = false;
          callback?.({ success: true });
          return;
        }

        // Step 2: Generate LLM response with artifact support
        logger.info(`[SOCKET /voice] Starting LLM with artifacts...`);

        // Collect artifacts for persistence
        const collectedArtifacts: import('./services/AIAgentService').GeneratedArtifact[] = [];

        const llmResponse = await aiAgentService.generateResponseWithArtifacts(
          session.agentId,
          session.sessionId,
          transcription.text,
          // Artifact callback - emits IMMEDIATELY before TTS starts
          (artifact) => {
            logger.info(`[SOCKET /voice] Emitting artifact: ${artifact.title} (${artifact.type})`);
            collectedArtifacts.push(artifact);
            socket.emit('agent:artifact', {
              ...artifact,
              sessionId: session.sessionId
            });
          }
        );

        logger.info(`[SOCKET /voice] LLM response: "${llmResponse.text.substring(0, 50)}..." (${llmResponse.artifacts.length} artifacts)`);

        // Step 3: Synthesize TTS with streaming
        logger.info(`[SOCKET /voice] Starting streaming TTS...`);
        const agentConfig = aiAgentService.getAgentConfig(session.agentId);

        // Emit response text immediately (before audio starts)
        socket.emit('agent:response', {
          text: llmResponse.text,
          audioData: null, // Audio will be streamed separately
          audioFormat: 'mp3',
          hasArtifacts: llmResponse.artifacts.length > 0,
          timestamp: new Date().toISOString()
        });

        // Stream TTS audio in chunks for low-latency playback
        await aiAgentService.streamSynthesizeWithCallback(
          llmResponse.text,
          session.sessionId,
          (chunk) => {
            // Emit each chunk immediately
            socket.emit('audio:chunk', {
              chunk: chunk.chunk.toString('base64'),
              isFirst: chunk.isFirst,
              isLast: chunk.isLast,
              format: chunk.format
            });

            // Emit speaking state on first chunk (transitions UI faster)
            if (chunk.isFirst) {
              socket.emit('agent:state', {
                state: 'speaking',
                timestamp: new Date().toISOString()
              });
            }

            // Log progress
            if (chunk.isFirst) {
              logger.info(`[SOCKET /voice] First TTS chunk sent - audio playback starting`);
            } else if (chunk.isLast) {
              logger.info(`[SOCKET /voice] Last TTS chunk sent - streaming complete`);
            }
          },
          agentConfig.voice
        );

        // === INCREMENTAL PERSISTENCE ===
        // Save this interaction to the database immediately after successful completion
        if (session.threadId) {
          const interactionDurationMs = Date.now() - interactionStartTime;

          logger.info(`[SOCKET /voice] Persisting interaction to thread: ${session.threadId}`);

          const persistResult = await voiceSessionPersistenceService.persistInteraction(
            session.threadId,
            session.userId,
            session.agentId,
            session.agentName,
            {
              userTranscript: transcription.text,
              agentResponse: llmResponse.text,
              artifacts: collectedArtifacts,
              durationMs: interactionDurationMs,
              tokensUsed: llmResponse.tokensUsed,
            }
          );

          if (persistResult.success) {
            logger.info(`[SOCKET /voice] Interaction persisted: messageId=${persistResult.messageId}, artifacts=${persistResult.artifactIds?.length || 0}`);

            // Notify client that interaction was saved (for potential UI update)
            socket.emit('interaction:persisted', {
              threadId: session.threadId,
              messageId: persistResult.messageId,
              artifactIds: persistResult.artifactIds,
              timestamp: new Date().toISOString()
            });
          } else {
            logger.error(`[SOCKET /voice] Failed to persist interaction: ${persistResult.error}`);
          }
        }

        // Return to listening state after streaming completes
        setTimeout(() => {
          socket.emit('agent:state', {
            state: 'listening',
            timestamp: new Date().toISOString()
          });
        }, 300);

        session.isProcessing = false;
        callback?.({ success: true });

      } catch (error: any) {
        logger.error(`[SOCKET /voice] Pipeline error:`, error);

        socket.emit('error', {
          message: error.message || 'AI processing failed'
        });

        // Return to listening state
        socket.emit('agent:state', {
          state: 'listening',
          timestamp: new Date().toISOString()
        });

        session.isProcessing = false;
        callback?.({ success: false, error: error.message });
      }
    });

    // ================================
    // STREAM AUDIO PROCESSING (Alternative: real-time chunks)
    // ================================
    socket.on('audio:stream-process', async (data: { finalChunk: boolean }) => {
      const session = voiceSessions.get(socket.id);
      if (!session || !data.finalChunk) return;

      // Trigger processing when final chunk is received
      socket.emit('audio:process');
    });

    // ================================
    // SESSION END (with persistence finalization)
    // ================================
    socket.on('session:end', async (callback) => {
      const session = voiceSessions.get(socket.id);

      if (session) {
        const duration = Date.now() - session.startTime.getTime();
        logger.info(`[SOCKET /voice] Session ended: ${socket.id} (duration: ${(duration / 1000).toFixed(1)}s, chunks: ${session.chunksReceived})`);

        // Mark session as ended in database
        if (session.threadId) {
          await voiceSessionPersistenceService.endVoiceSession(session.threadId, duration);
        }

        // Clear AI conversation history
        aiAgentService.clearHistory(session.agentId, session.sessionId);

        voiceSessions.delete(socket.id);
      }

      callback?.({
        success: true,
        message: 'Voice session ended',
        threadId: session?.threadId
      });
    });

    // ================================
    // DISCONNECT HANDLING (with cleanup)
    // ================================
    socket.on('disconnect', async (reason) => {
      const session = voiceSessions.get(socket.id);
      if (session) {
        const duration = Date.now() - session.startTime.getTime();
        logger.info(`[SOCKET /voice] Session disconnected: ${socket.id} (duration: ${(duration / 1000).toFixed(1)}s, reason: ${reason})`);

        // Mark session as ended in database (even on disconnect)
        if (session.threadId) {
          await voiceSessionPersistenceService.endVoiceSession(session.threadId, duration);
        }

        // Clear AI conversation history
        aiAgentService.clearHistory(session.agentId, session.sessionId);

        voiceSessions.delete(socket.id);
      }
      logger.info(`❌ Socket.IO /voice client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`🔴 Socket.IO /voice error for ${socket.id}:`, error);
    });
  });

  // ============================================
  // SYSTEM METRICS BROADCAST
  // ============================================
  setInterval(() => {
    io.emit('metrics:update', {
      timestamp: new Date().toISOString(),
      activeAgents: 4,
      totalRequests: Math.floor(Math.random() * 1000) + 5000,
      cpuUsage: Math.random() * 40 + 20,
      memoryUsage: Math.random() * 30 + 40
    })
  }, 5000)

  return io
}

// ============================================
// EMIT HELPER FUNCTIONS
// ============================================

/**
 * Emit workflow execution update
 */
export function emitWorkflowUpdate(event: WorkflowExecutionEvent) {
  if (!io) return;

  // Emit to workflow room
  io.to(`workflow:${event.workflowId}`).emit('workflow:update', event);

  // Emit to execution room
  if (event.executionId) {
    io.to(`execution:${event.executionId}`).emit('execution:update', event);
  }

  // Also emit on /v1 namespace
  const v1 = io.of('/v1');
  v1.to(`workflow:${event.workflowId}`).emit('workflow:update', event);

  // And /pipelines namespace
  const pipelines = io.of('/pipelines');
  if (event.executionId) {
    pipelines.to(`execution:${event.executionId}`).emit('execution:update', event);
  }
}

/**
 * Emit agent activity
 */
export function emitAgentActivity(event: AgentActivityEvent) {
  if (!io) return;

  // Emit to agent room
  io.to(`agent:${event.agentId}`).emit('agent:activity', event);

  // Emit to user's activity feed
  const v1 = io.of('/v1');
  v1.to(`activity:${event.userId}`).emit('activity:update', event);
}

/**
 * Emit notification to user
 */
export function emitNotification(event: NotificationEvent) {
  if (!io) return;

  // Emit on default namespace
  io.to(`user:${event.userId}`).emit('notification', event);

  // Emit on /v1 namespace
  const v1 = io.of('/v1');
  v1.to(`notifications:${event.userId}`).emit('notification', event);
}

/**
 * Emit email update
 */
export function emitEmailUpdate(userId: string, data: { type: string; email?: unknown; count?: number }) {
  if (!io) return;

  const v1 = io.of('/v1');
  v1.to(`email:${userId}`).emit('email:update', data);
}

/**
 * Emit pipeline execution update
 */
export function emitPipelineUpdate(executionId: string, data: {
  status: string;
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  output?: unknown;
  error?: string;
}) {
  if (!io) return;

  const pipelines = io.of('/pipelines');
  pipelines.to(`execution:${executionId}`).emit('execution:update', {
    executionId,
    ...data,
    timestamp: new Date().toISOString()
  });
}

// ============================================
// PIPELINE EXECUTION EVENTS (Phase 5)
// ============================================

export interface PipelineExecutionStartEvent {
  executionId: string;
  workflowId: string;
  totalNodes: number;
}

export interface PipelineNodeStartEvent {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

export interface PipelineNodeFinishEvent {
  executionId: string;
  workflowId: string;
  nodeId: string;
  success: boolean;
  output?: unknown;
  duration: number;
}

export interface PipelineNodeErrorEvent {
  executionId: string;
  workflowId: string;
  nodeId: string;
  error: string;
}

export interface PipelineExecutionFinishEvent {
  executionId: string;
  workflowId: string;
  status: 'success' | 'failed' | 'partial';
  duration: number;
  nodeCount: number;
}

/**
 * Emit pipeline execution started
 */
export function emitPipelineExecutionStart(event: PipelineExecutionStartEvent) {
  if (!io) return;

  const pipelines = io.of('/pipelines');
  pipelines.to(`execution:${event.executionId}`).emit('execution:start', {
    ...event,
    timestamp: new Date().toISOString()
  });

  // Also emit to workflow room for any subscribers
  io.to(`workflow:${event.workflowId}`).emit('execution:start', {
    ...event,
    timestamp: new Date().toISOString()
  });

  logger.info(`[SOCKET] Emitted execution:start for ${event.executionId}`);
}

/**
 * Emit node execution started
 */
export function emitPipelineNodeStart(event: PipelineNodeStartEvent) {
  if (!io) return;

  const pipelines = io.of('/pipelines');
  pipelines.to(`execution:${event.executionId}`).emit('node:start', {
    ...event,
    timestamp: new Date().toISOString()
  });

  logger.info(`[SOCKET] Emitted node:start for node ${event.nodeId}`);
}

/**
 * Emit node execution finished
 */
export function emitPipelineNodeFinish(event: PipelineNodeFinishEvent) {
  if (!io) return;

  const pipelines = io.of('/pipelines');
  pipelines.to(`execution:${event.executionId}`).emit('node:finish', {
    ...event,
    timestamp: new Date().toISOString()
  });

  logger.info(`[SOCKET] Emitted node:finish for node ${event.nodeId} (success: ${event.success})`);
}

/**
 * Emit node execution error
 */
export function emitPipelineNodeError(event: PipelineNodeErrorEvent) {
  if (!io) return;

  const pipelines = io.of('/pipelines');
  pipelines.to(`execution:${event.executionId}`).emit('node:error', {
    ...event,
    timestamp: new Date().toISOString()
  });

  logger.error(`[SOCKET] Emitted node:error for node ${event.nodeId}: ${event.error}`);
}

/**
 * Emit pipeline execution finished
 */
export function emitPipelineExecutionFinish(event: PipelineExecutionFinishEvent) {
  if (!io) return;

  const pipelines = io.of('/pipelines');
  pipelines.to(`execution:${event.executionId}`).emit('execution:finish', {
    ...event,
    timestamp: new Date().toISOString()
  });

  // Also emit to workflow room
  io.to(`workflow:${event.workflowId}`).emit('execution:finish', {
    ...event,
    timestamp: new Date().toISOString()
  });

  logger.info(`[SOCKET] Emitted execution:finish for ${event.executionId} (status: ${event.status})`);
}

/**
 * Emit analytics dashboard update
 */
export function emitAnalyticsUpdate(dashboardId: string, data: any) {
  if (!io) return;

  const v1 = io.of('/v1');
  // Broadcast to all clients viewing this dashboard
  v1.to(`analytics:dashboard:${dashboardId}`).emit('analytics:update', {
    dashboardId,
    data,
    timestamp: new Date().toISOString()
  });
}

// ============================================
// INBOX EMIT FUNCTIONS (Flowent Inbox v2)
// ============================================

/**
 * Emit new message to a thread
 */
export function emitInboxMessage(message: InboxMessagePayload) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${message.threadId}`).emit('message:new', message);
}

/**
 * Emit message stream chunk (for streaming responses)
 */
export function emitInboxMessageStream(threadId: string, chunk: { messageId: string; content: string }) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('message:stream', chunk);
}

/**
 * Emit message stream complete
 */
export function emitInboxMessageComplete(threadId: string, messageId: string) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('message:complete', messageId);
}

/**
 * Emit thread history (initial load)
 */
export function emitInboxThreadHistory(threadId: string, messages: InboxMessagePayload[]) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('thread:history', messages);
}

/**
 * Emit typing indicator
 */
export function emitInboxTyping(indicator: InboxTypingIndicator) {
  if (!io) return;

  const inbox = io.of('/inbox');
  const event = indicator.isTyping ? 'typing:start' : 'typing:stop';
  inbox.to(`thread:${indicator.threadId}`).emit(event, indicator);
}

/**
 * Emit thread update (status change, new message preview, etc.)
 */
export function emitInboxThreadUpdate(userId: string, thread: {
  id: string;
  subject: string;
  preview?: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
}) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`inbox:${userId}`).emit('thread:update', thread);
}

/**
 * Emit approval status change
 */
export function emitApprovalUpdate(threadId: string, approval: {
  approvalId: string;
  status: 'approved' | 'rejected' | 'expired';
  resolvedBy?: string;
  resolvedAt?: string;
  comment?: string;
}) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('approval:update', approval);
}

/**
 * Emit system event (handoff, workflow status, etc.)
 */
export function emitInboxSystemEvent(threadId: string, event: {
  id: string;
  type: 'handoff' | 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 'workflow_paused' | 'agent_joined' | 'agent_left' | 'context_shared';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('system:event', event);
}

/**
 * Emit agent routing event (Omni-Orchestrator)
 * Notifies the frontend when a message is routed to a different agent
 */
export function emitAgentRouted(threadId: string, routing: {
  selectedAgent: string;
  agentName: string;
  confidence: number;
  reasoning: string;
  previousAgent?: string;
}) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('agent:routed', {
    threadId,
    agentId: routing.selectedAgent,
    agentName: routing.agentName,
    confidence: routing.confidence,
    reasoning: routing.reasoning,
    previousAgent: routing.previousAgent,
    timestamp: new Date().toISOString()
  });

  logger.info(`[SOCKET] Emitted agent:routed for thread ${threadId}: ${routing.selectedAgent}`);
}

/**
 * Emit artifact created notification
 */
export function emitArtifactCreated(threadId: string, artifact: {
  id: string;
  type: string;
  title: string;
  language?: string;
  agentId?: string;
  agentName?: string;
}) {
  if (!io) return;

  const inbox = io.of('/inbox');
  inbox.to(`thread:${threadId}`).emit('artifact:created', {
    ...artifact,
    timestamp: new Date().toISOString()
  });
}

// ============================================
// SINGLE NODE EXECUTION EVENTS (Phase 19)
// ============================================

export interface SingleNodeExecutionEvent {
  workflowId: string;
  nodeId: string;
  status: 'running' | 'success' | 'error';
  output?: unknown;
  error?: string | null;
  duration?: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  model?: string;
  timestamp: string;
}

/**
 * Emit single node execution update
 * Used for "Run Node Only" feature to push results back to the inspector
 */
export function emitSingleNodeExecution(event: SingleNodeExecutionEvent) {
  if (!io) return;

  // Emit to workflow room
  io.to(`workflow:${event.workflowId}`).emit('node:single-execution', event);

  // Also emit to /v1 namespace for frontend compatibility
  const v1 = io.of('/v1');
  v1.to(`workflow:${event.workflowId}`).emit('node:single-execution', event);
  v1.to(`pipeline:${event.workflowId}`).emit('node:single-execution', event);

  // Also emit on /pipelines namespace
  const pipelines = io.of('/pipelines');
  pipelines.emit('node:single-execution', event);

  logger.info(`[SOCKET] Emitted node:single-execution for node ${event.nodeId} (status: ${event.status})`);
}

// ============================================
// AGENT CHAT EVENTS (Multi-Agent System)
// ============================================

export interface AgentChatStartEvent {
  chatId: string;
  agentId: string;
  agentName: string;
  userId: string;
  timestamp: string;
}

export interface AgentChatMessageEvent {
  chatId: string;
  messageId: string;
  agentId: string;
  agentName: string;
  userId: string;
  role: 'user' | 'agent';
  content: string;
  isStreaming?: boolean;
  timestamp: string;
}

export interface AgentChatStreamEvent {
  chatId: string;
  messageId: string;
  agentId: string;
  chunk: string;
  timestamp: string;
}

export interface AgentChatCompleteEvent {
  chatId: string;
  messageId: string;
  agentId: string;
  tokensUsed?: number;
  duration?: number;
  timestamp: string;
}

export interface AgentChatErrorEvent {
  chatId: string;
  agentId: string;
  error: string;
  timestamp: string;
}

export interface AgentToolCallEvent {
  chatId: string;
  agentId: string;
  agentName: string;
  toolId: string;
  toolName: string;
  status: 'calling' | 'success' | 'error' | 'denied';
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  requiresApproval?: boolean;
  timestamp: string;
}

/**
 * Emit agent chat start event
 */
export function emitAgentChatStart(event: AgentChatStartEvent) {
  if (!io) return;

  // Emit to user's room
  io.to(`user:${event.userId}`).emit('agent:chat:start', event);

  // Emit to agent room
  io.to(`agent:${event.agentId}`).emit('agent:chat:start', event);

  logger.info(`[SOCKET] Agent chat started: ${event.chatId} (agent: ${event.agentId})`);
}

/**
 * Emit agent chat message
 */
export function emitAgentChatMessage(event: AgentChatMessageEvent) {
  if (!io) return;

  // Emit to user's room
  io.to(`user:${event.userId}`).emit('agent:chat:message', event);

  // Emit to agent room
  io.to(`agent:${event.agentId}`).emit('agent:chat:message', event);

  // Also emit on /v1 namespace
  const v1 = io.of('/v1');
  v1.to(`activity:${event.userId}`).emit('agent:chat:message', event);
}

/**
 * Emit agent chat stream chunk (for streaming responses)
 */
export function emitAgentChatStream(event: AgentChatStreamEvent) {
  if (!io) return;

  // Get user ID from chat context (would need to be stored)
  io.to(`agent:${event.agentId}`).emit('agent:chat:stream', event);
}

/**
 * Emit agent chat complete event
 */
export function emitAgentChatComplete(event: AgentChatCompleteEvent) {
  if (!io) return;

  io.to(`agent:${event.agentId}`).emit('agent:chat:complete', event);

  logger.info(`[SOCKET] Agent chat completed: ${event.chatId} (tokens: ${event.tokensUsed})`);
}

/**
 * Emit agent chat error
 */
export function emitAgentChatError(event: AgentChatErrorEvent) {
  if (!io) return;

  io.to(`agent:${event.agentId}`).emit('agent:chat:error', event);

  logger.error(`[SOCKET] Agent chat error: ${event.chatId} - ${event.error}`);
}

/**
 * Emit agent tool call event
 */
export function emitAgentToolCall(event: AgentToolCallEvent) {
  if (!io) return;

  io.to(`agent:${event.agentId}`).emit('agent:tool:call', event);

  // Also emit on /v1 namespace for activity feed
  const v1 = io.of('/v1');
  v1.emit('agent:tool:call', event);

  logger.info(`[SOCKET] Agent tool call: ${event.toolName} (status: ${event.status})`);
}

/**
 * Emit agent thinking indicator
 */
export function emitAgentThinking(agentId: string, userId: string, isThinking: boolean) {
  if (!io) return;

  const event = {
    agentId,
    userId,
    isThinking,
    timestamp: new Date().toISOString()
  };

  io.to(`user:${userId}`).emit('agent:thinking', event);
  io.to(`agent:${agentId}`).emit('agent:thinking', event);
}

/**
 * Subscribe to agent chat updates
 * This should be called when a user opens a chat with an agent
 */
export function subscribeToAgentChat(socket: Socket, agentId: string, userId: string) {
  socket.join(`agent:${agentId}`);
  socket.join(`user:${userId}`);
  logger.info(`[SOCKET] User ${userId} subscribed to agent ${agentId} chat`);
}

/**
 * Unsubscribe from agent chat updates
 */
export function unsubscribeFromAgentChat(socket: Socket, agentId: string, userId: string) {
  socket.leave(`agent:${agentId}`);
  logger.info(`[SOCKET] User ${userId} unsubscribed from agent ${agentId} chat`);
}

/**
 * Make io available globally for use in API routes
 */
export function getSocketIO() {
  return io;
}

// ============================================
// VOICE MODE EMIT FUNCTIONS (Flowent Horizon)
// ============================================

export interface VoiceAgentStateEvent {
  sessionId?: string;
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  timestamp: string;
}

export interface VoiceTranscriptionEvent {
  sessionId?: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: string;
}

export interface VoiceAgentResponseEvent {
  sessionId?: string;
  text: string;
  audioUrl?: string | null;
  timestamp: string;
}

/**
 * Emit voice agent state change to a specific socket
 */
export function emitVoiceAgentState(socketId: string, event: VoiceAgentStateEvent) {
  if (!io) return;

  const voice = io.of('/voice');
  voice.to(socketId).emit('agent:state', event);
}

/**
 * Emit transcription to a specific socket
 */
export function emitVoiceTranscription(socketId: string, event: VoiceTranscriptionEvent) {
  if (!io) return;

  const voice = io.of('/voice');
  voice.to(socketId).emit('transcription', event);
}

/**
 * Emit agent response to a specific socket
 */
export function emitVoiceAgentResponse(socketId: string, event: VoiceAgentResponseEvent) {
  if (!io) return;

  const voice = io.of('/voice');
  voice.to(socketId).emit('agent:response', event);
}

/**
 * Broadcast to all clients in a voice session room
 */
export function emitToVoiceSession(sessionId: string, eventName: string, data: unknown) {
  if (!io) return;

  const voice = io.of('/voice');
  voice.to(`voice:${sessionId}`).emit(eventName, data);
}

// ============================================
// VOICE ARTIFACT EVENTS (Generative UI)
// ============================================

export interface VoiceArtifactEvent {
  id: string;
  sessionId?: string;
  title: string;
  type: 'code' | 'table' | 'markdown' | 'chart' | 'diagram';
  content: string;
  language?: string;
  metadata?: {
    rows?: number;
    columns?: string[];
    chartType?: string;
  };
  timestamp: string;
}

/**
 * Emit artifact to a specific voice session
 * Called by LLM when it generates visual content
 */
export function emitVoiceArtifact(socketId: string, artifact: VoiceArtifactEvent) {
  if (!io) return;

  const voice = io.of('/voice');
  voice.to(socketId).emit('agent:artifact', artifact);
  logger.info(`[SOCKET] Emitted voice artifact: ${artifact.title} (${artifact.type})`);
}

