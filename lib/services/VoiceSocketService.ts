'use client';

/**
 * VoiceSocketService - Singleton WebSocket Service for Voice Mode
 * Manages real-time voice communication with the /voice namespace
 *
 * Features:
 * - Singleton pattern for single connection per app
 * - Audio chunk streaming with raw PCM support
 * - Agent state change callbacks
 * - Transcription and response events
 * - Automatic reconnection handling
 * - AudioQueue for gapless TTS playback with streaming chunks
 * - Barge-In support (interrupt agent while speaking)
 * - Low-latency response streaming
 */

import { io, Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

export type VoiceAgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceSessionConfig {
  language?: string;
  voiceId?: string;
  /** Continue an existing thread (for text-to-voice continuity) */
  threadId?: string;
  /** Workspace context */
  workspaceId?: string;
  /** Agent display name */
  agentName?: string;
}

export interface TranscriptionEvent {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: string;
}

export interface AgentResponseEvent {
  text: string;
  audioUrl?: string | null;
  audioData?: string;      // Base64 encoded audio
  audioFormat?: string;    // mp3, opus, etc.
  timestamp: string;
}

export interface AgentStateEvent {
  state: VoiceAgentState;
  timestamp: string;
}

export interface SessionReadyEvent {
  sessionId: string;
  agentId: string;
  timestamp: string;
}

// Generative UI Artifact Types
export type ArtifactType = 'code' | 'table' | 'markdown' | 'chart' | 'diagram';

export interface VoiceArtifactEvent {
  id: string;
  sessionId?: string;
  title: string;
  type: ArtifactType;
  content: string;
  language?: string;
  metadata?: {
    rows?: number;
    columns?: string[];
    chartType?: string;
  };
  timestamp: string;
}

export type VoiceEventCallback<T> = (event: T) => void;

// ============================================================================
// AUDIO QUEUE CLASS - Gapless Streaming Audio Playback
// ============================================================================

/**
 * Enhanced AudioQueue with streaming support for low-latency TTS playback
 * - Buffers small chunks to prevent audio gaps/clicks
 * - Supports immediate playback start on first chunk
 * - Handles Barge-In interruption gracefully
 */
class AudioQueue {
  private audioContext: AudioContext | null = null;
  private queue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlaybackStart?: () => void;
  private onPlaybackEnd?: () => void;
  private onFirstChunk?: () => void; // Called when first audio chunk arrives
  private volume = 1.0;
  private gainNode: GainNode | null = null;
  private isStreaming = false; // Track if we're in streaming mode
  private scheduledEndTime = 0; // For gapless playback scheduling
  private pendingBuffers: AudioBuffer[] = []; // Pre-decoded buffers for smooth playback
  private isDecoding = false; // Prevent concurrent decoding

  // Buffering configuration
  private minBufferChunks = 2; // Start playback after this many chunks
  private hasStartedPlayback = false;

  constructor() {
    // AudioContext is created lazily on first use
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ latencyHint: 'interactive' });

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);

      // Resume if suspended (required for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // AudioQueue initialized
    } catch (error) {
      console.error('[AudioQueue] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext?.currentTime || 0);
    }
  }

  /**
   * Start streaming mode - optimized for receiving multiple chunks
   */
  startStreaming(): void {
    this.isStreaming = true;
    this.hasStartedPlayback = false;
    this.scheduledEndTime = 0;
    this.pendingBuffers = [];
  }

  /**
   * End streaming mode
   */
  endStreaming(): void {
    this.isStreaming = false;
  }

  /**
   * Add audio data to the queue (base64 encoded)
   * In streaming mode, starts playback after minimum buffer is filled
   */
  async enqueue(base64Audio: string, format: string = 'mp3'): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Notify on first chunk (for state transitions)
      if (!this.hasStartedPlayback && this.queue.length === 0 && this.pendingBuffers.length === 0) {
        this.onFirstChunk?.();
      }

      this.queue.push(arrayBuffer);

      // In streaming mode, wait for minimum buffer before starting
      if (this.isStreaming && !this.hasStartedPlayback) {
        if (this.queue.length >= this.minBufferChunks) {
          this.hasStartedPlayback = true;
          this.decodeAndPlay();
        }
      } else if (!this.isPlaying && !this.isStreaming) {
        // Non-streaming mode: start immediately
        this.playNext();
      } else if (this.isPlaying && !this.isDecoding) {
        // Already playing, decode next chunk in background
        this.decodeNextChunk();
      }
    } catch (error) {
      console.error('[AudioQueue] Failed to enqueue audio:', error);
    }
  }

  /**
   * Decode chunks in background for gapless playback
   */
  private async decodeNextChunk(): Promise<void> {
    if (!this.audioContext || this.queue.length === 0 || this.isDecoding) return;

    this.isDecoding = true;
    const arrayBuffer = this.queue.shift()!;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.pendingBuffers.push(audioBuffer);
    } catch (error) {
      console.error('[AudioQueue] Failed to decode chunk:', error);
    }

    this.isDecoding = false;

    // Continue decoding if more chunks available
    if (this.queue.length > 0) {
      this.decodeNextChunk();
    }
  }

  /**
   * Decode and play for streaming mode - schedules buffers for gapless playback
   */
  private async decodeAndPlay(): Promise<void> {
    if (!this.audioContext) return;

    // Decode all queued chunks first
    while (this.queue.length > 0) {
      const arrayBuffer = this.queue.shift()!;
      try {
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        this.pendingBuffers.push(audioBuffer);
      } catch (error) {
        console.error('[AudioQueue] Failed to decode:', error);
      }
    }

    // Start scheduled playback
    this.playScheduled();
  }

  /**
   * Play buffers with precise scheduling for gapless audio
   */
  private playScheduled(): void {
    if (!this.audioContext || this.pendingBuffers.length === 0) {
      if (this.pendingBuffers.length === 0 && this.queue.length === 0) {
        this.isPlaying = false;
        this.onPlaybackEnd?.();
      }
      return;
    }

    const audioBuffer = this.pendingBuffers.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    if (this.gainNode) {
      source.connect(this.gainNode);
    } else {
      source.connect(this.audioContext.destination);
    }

    // Schedule playback at the end of previous buffer (gapless)
    const startTime = Math.max(this.audioContext.currentTime, this.scheduledEndTime);
    source.start(startTime);

    // Track when this buffer ends
    this.scheduledEndTime = startTime + audioBuffer.duration;

    // Store current source for stop()
    this.currentSource = source;
    this.isPlaying = true;

    // Notify playback start on first buffer
    if (!this.hasStartedPlayback || startTime === this.audioContext.currentTime) {
      this.onPlaybackStart?.();
    }

    // Playback scheduled

    // Set up completion handler
    source.onended = () => {
      // Try to play next pending buffer or decode more
      if (this.pendingBuffers.length > 0) {
        this.playScheduled();
      } else if (this.queue.length > 0) {
        this.decodeAndPlay();
      } else {
        this.currentSource = null;
        this.isPlaying = false;
        this.onPlaybackEnd?.();
      }
    };

    // Continue decoding in background
    if (this.queue.length > 0 && !this.isDecoding) {
      this.decodeNextChunk();
    }
  }

  /**
   * Play the next audio chunk in the queue (non-streaming mode)
   */
  private async playNext(): Promise<void> {
    if (!this.audioContext || this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    this.isPlaying = true;
    const arrayBuffer = this.queue.shift()!;

    try {
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));

      // Create source node
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;

      // Connect through gain node for volume control
      if (this.gainNode) {
        this.currentSource.connect(this.gainNode);
      } else {
        this.currentSource.connect(this.audioContext.destination);
      }

      // Set up completion handler
      this.currentSource.onended = () => {
        this.currentSource = null;
        this.playNext(); // Play next in queue
      };

      // Notify playback start
      this.onPlaybackStart?.();

      // Start playback
      this.currentSource.start(0);
    } catch (error) {
      console.error('[AudioQueue] Failed to play audio:', error);
      this.playNext(); // Try next chunk
    }
  }

  /**
   * Stop current playback and clear queue (for Barge-In)
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }
    this.queue = [];
    this.pendingBuffers = [];
    this.isPlaying = false;
    this.isStreaming = false;
    this.hasStartedPlayback = false;
    this.scheduledEndTime = 0;
  }

  /**
   * Set playback callbacks
   */
  onPlayback(onStart?: () => void, onEnd?: () => void, onFirst?: () => void): void {
    this.onPlaybackStart = onStart;
    this.onPlaybackEnd = onEnd;
    this.onFirstChunk = onFirst;
  }

  /**
   * Get current state
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  get queueLength(): number {
    return this.queue.length + this.pendingBuffers.length;
  }

  get streaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}

// ============================================================================
// SINGLETON SERVICE
// ============================================================================

// Reconnection state type
type ReconnectionState = 'idle' | 'reconnecting' | 'failed';

class VoiceSocketServiceClass {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private agentId: string | null = null;
  private isConnecting = false;
  private authToken: string | null = null;

  // Reconnection configuration - increased for better stability
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly BASE_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 15000; // 15 seconds
  private reconnectAttempts = 0;
  private reconnectionState: ReconnectionState = 'idle';
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Audio playback queue
  private audioQueue: AudioQueue = new AudioQueue();
  private autoPlayAudio = true;

  // Barge-In state
  private isBargeInActive = false;

  // Reconnection event callbacks
  private onReconnectingCallbacks: Set<VoiceEventCallback<{ attempt: number; maxAttempts: number; delay: number }>> = new Set();
  private onReconnectSuccessCallbacks: Set<VoiceEventCallback<{ attempts: number }>> = new Set();
  private onReconnectFailedCallbacks: Set<VoiceEventCallback<{ error: string }>> = new Set();

  // Event callbacks
  private onAgentStateChangeCallbacks: Set<VoiceEventCallback<AgentStateEvent>> = new Set();
  private onTranscriptionCallbacks: Set<VoiceEventCallback<TranscriptionEvent>> = new Set();
  private onAgentResponseCallbacks: Set<VoiceEventCallback<AgentResponseEvent>> = new Set();
  private onSessionReadyCallbacks: Set<VoiceEventCallback<SessionReadyEvent>> = new Set();
  private onErrorCallbacks: Set<VoiceEventCallback<{ message: string }>> = new Set();
  private onDisconnectCallbacks: Set<VoiceEventCallback<{ reason: string }>> = new Set();
  private onAudioPlaybackCallbacks: Set<VoiceEventCallback<{ playing: boolean }>> = new Set();
  private onAudioChunkCallbacks: Set<VoiceEventCallback<{ chunk: string; isFirst: boolean; isLast: boolean }>> = new Set();
  private onBargeInCallbacks: Set<VoiceEventCallback<{ interrupted: boolean }>> = new Set();
  private onArtifactCallbacks: Set<VoiceEventCallback<VoiceArtifactEvent>> = new Set();

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current session ID
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get reconnection state
   */
  get reconnecting(): boolean {
    return this.reconnectionState === 'reconnecting';
  }

  /**
   * Connect to the /voice namespace
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    // Store token for reconnection
    this.authToken = token;
    this.isConnecting = true;
    this.reconnectionState = 'idle';

    return new Promise((resolve, reject) => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        console.log('[VoiceSocket] Connecting to:', socketUrl);

        this.socket = io(`${socketUrl}/voice`, {
          auth: { token },
          transports: ['websocket', 'polling'], // Add polling as fallback
          // Disable built-in reconnection - we handle it manually for better UX control
          reconnection: false,
          timeout: 20000, // Increased timeout for stability
        });

        this.socket.on('connect', () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectionState = 'idle';
          this.setupEventListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[VoiceSocket] Connection error:', error.message);
          this.isConnecting = false;
          reject(error);
        });

        // Set timeout for connection
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Calculate exponential backoff delay
   */
  private getReconnectDelay(): number {
    const delay = this.BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    return Math.min(delay, this.MAX_RECONNECT_DELAY);
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async attemptReconnect(): Promise<boolean> {
    if (!this.authToken) {
      console.error('[VoiceSocket] Cannot reconnect: no auth token stored');
      return false;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectionState = 'failed';
      this.onReconnectFailedCallbacks.forEach(cb =>
        cb({ error: `Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached` })
      );
      return false;
    }

    this.reconnectionState = 'reconnecting';
    this.reconnectAttempts++;

    const delay = this.getReconnectDelay();

    // Notify listeners about reconnection attempt
    this.onReconnectingCallbacks.forEach(cb => cb({
      attempt: this.reconnectAttempts,
      maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
      delay,
    }));

    // Wait for backoff delay
    await new Promise(resolve => {
      this.reconnectTimeout = setTimeout(resolve, delay);
    });

    try {
      // Clean up existing socket
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Attempt reconnection
      await this.connect(this.authToken);

      // Success!
      this.reconnectionState = 'idle';
      this.onReconnectSuccessCallbacks.forEach(cb => cb({
        attempts: this.reconnectAttempts,
      }));
      this.reconnectAttempts = 0;

      return true;
    } catch (error: any) {
      console.error(`[VoiceSocket] Reconnection attempt ${this.reconnectAttempts} failed:`, error.message);

      // Recursively attempt next reconnection
      return this.attemptReconnect();
    }
  }

  /**
   * Cancel any pending reconnection
   */
  cancelReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectionState = 'idle';
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to reconnection attempt events
   */
  onReconnecting(callback: VoiceEventCallback<{ attempt: number; maxAttempts: number; delay: number }>): () => void {
    this.onReconnectingCallbacks.add(callback);
    return () => this.onReconnectingCallbacks.delete(callback);
  }

  /**
   * Subscribe to reconnection success events
   */
  onReconnectSuccess(callback: VoiceEventCallback<{ attempts: number }>): () => void {
    this.onReconnectSuccessCallbacks.add(callback);
    return () => this.onReconnectSuccessCallbacks.delete(callback);
  }

  /**
   * Subscribe to reconnection failure events
   */
  onReconnectFailed(callback: VoiceEventCallback<{ error: string }>): () => void {
    this.onReconnectFailedCallbacks.add(callback);
    return () => this.onReconnectFailedCallbacks.delete(callback);
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Agent state changes
    this.socket.on('agent:state', (event: AgentStateEvent) => {
      // Start streaming mode when agent starts speaking
      if (event.state === 'speaking') {
        this.audioQueue.startStreaming();
      } else if (event.state === 'listening' && this.audioQueue.streaming) {
        this.audioQueue.endStreaming();
      }

      this.onAgentStateChangeCallbacks.forEach(cb => cb(event));
    });

    // Transcription events
    this.socket.on('transcription', (event: TranscriptionEvent) => {
      this.onTranscriptionCallbacks.forEach(cb => cb(event));
    });

    // Streaming audio chunks (for low-latency TTS)
    this.socket.on('audio:chunk', async (data: { chunk: string; isFirst: boolean; isLast: boolean; format?: string }) => {
      // Skip if Barge-In is active
      if (this.isBargeInActive) {
        return;
      }

      // Notify listeners
      this.onAudioChunkCallbacks.forEach(cb => cb({
        chunk: data.chunk,
        isFirst: data.isFirst,
        isLast: data.isLast
      }));

      // Auto-play audio if enabled
      if (this.autoPlayAudio && data.chunk) {
        try {
          await this.audioQueue.enqueue(data.chunk, data.format || 'mp3');
        } catch (error) {
          console.error('[VoiceSocket] Failed to enqueue audio chunk:', error);
        }
      }

      // End streaming mode on last chunk
      if (data.isLast) {
        this.audioQueue.endStreaming();
      }
    });

    // Agent response events (with full audio - fallback for non-streaming)
    this.socket.on('agent:response', async (event: AgentResponseEvent) => {
      // Skip audio if Barge-In is active
      if (this.isBargeInActive) {
        this.onAgentResponseCallbacks.forEach(cb => cb(event));
        return;
      }

      // Auto-play audio if available (non-streaming fallback)
      if (this.autoPlayAudio && event.audioData) {
        try {
          await this.audioQueue.enqueue(event.audioData, event.audioFormat || 'mp3');
        } catch (error) {
          console.error('[VoiceSocket] Failed to enqueue audio:', error);
        }
      }

      this.onAgentResponseCallbacks.forEach(cb => cb(event));
    });

    // Session ready
    this.socket.on('session:ready', (event: SessionReadyEvent) => {
      this.sessionId = event.sessionId;
      this.onSessionReadyCallbacks.forEach(cb => cb(event));
    });

    // Barge-In acknowledgment from server
    this.socket.on('agent:stopped', () => {
      this.isBargeInActive = false;
      this.onBargeInCallbacks.forEach(cb => cb({ interrupted: true }));
    });

    // Artifact events (Generative UI) - emitted BEFORE audio starts
    this.socket.on('agent:artifact', (artifact: VoiceArtifactEvent) => {
      this.onArtifactCallbacks.forEach(cb => cb(artifact));
    });

    // Error handling
    this.socket.on('error', (error: { message: string }) => {
      console.error('[VoiceSocket] Error:', error.message);
      this.onErrorCallbacks.forEach(cb => cb(error));
    });

    // Disconnect handling - trigger auto-reconnection for unexpected disconnects
    this.socket.on('disconnect', (reason) => {
      this.sessionId = null;
      this.isBargeInActive = false;
      this.onDisconnectCallbacks.forEach(cb => cb({ reason }));

      // Auto-reconnect for unexpected disconnects (not user-initiated)
      const shouldAutoReconnect = [
        'transport close',
        'transport error',
        'ping timeout',
      ].includes(reason);

      if (shouldAutoReconnect && this.authToken) {
        // Trigger auto-reconnection
        this.attemptReconnect().catch(err => {
          console.error('[VoiceSocket] Auto-reconnection failed:', err);
        });
      }
    });
  }

  /**
   * Disconnect from the socket
   */
  disconnect(): void {
    // Cancel any pending reconnection
    this.cancelReconnection();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = null;
      this.agentId = null;
    }

    // Clear auth token to prevent auto-reconnection
    this.authToken = null;
  }

  /**
   * Start a voice session with an agent
   * @param agentId - The agent to converse with
   * @param config - Session configuration including optional threadId for continuity
   */
  async startSession(
    agentId: string,
    config?: VoiceSessionConfig
  ): Promise<{
    success: boolean;
    sessionId?: string;
    threadId?: string;
    hasContext?: boolean;
    contextMessageCount?: number;
    error?: string;
  }> {
    if (!this.socket?.connected) {
      return { success: false, error: 'Not connected' };
    }

    this.agentId = agentId;

    return new Promise((resolve) => {
      this.socket!.emit(
        'session:start',
        {
          agentId,
          agentName: config?.agentName,
          threadId: config?.threadId,
          workspaceId: config?.workspaceId,
          config: {
            language: config?.language,
            voiceId: config?.voiceId,
          },
        },
        (response: {
          success: boolean;
          sessionId?: string;
          threadId?: string;
          hasContext?: boolean;
          contextMessageCount?: number;
          error?: string;
        }) => {
          if (response.success && response.sessionId) {
            this.sessionId = response.sessionId;
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * End the current voice session
   * Returns the threadId for query invalidation
   */
  async endSession(): Promise<{ success: boolean; threadId?: string; error?: string }> {
    if (!this.socket?.connected) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit('session:end', (response: { success: boolean; threadId?: string; error?: string }) => {
        if (response.success) {
          this.sessionId = null;
        }
        resolve(response);
      });
    });
  }

  /**
   * Send an audio chunk to the server
   * @param data Float32Array audio data from Web Audio API
   */
  sendAudioChunk(data: Float32Array): void {
    if (!this.socket?.connected || !this.sessionId) {
      console.warn('[VoiceSocket] Cannot send audio: not connected or no session');
      return;
    }

    this.socket.emit('audio:stream', {
      chunk: data,
      sampleRate: 48000,
      timestamp: Date.now()
    });
  }

  /**
   * Send raw audio buffer
   * @param buffer ArrayBuffer of audio data
   */
  sendAudioBuffer(buffer: ArrayBuffer): void {
    if (!this.socket?.connected || !this.sessionId) {
      console.warn('[VoiceSocket] Cannot send audio: not connected or no session');
      return;
    }

    this.socket.emit('audio:stream', {
      chunk: buffer,
      sampleRate: 48000,
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // EVENT SUBSCRIPTION METHODS
  // ============================================================================

  /**
   * Subscribe to agent state changes
   */
  onAgentStateChange(callback: VoiceEventCallback<AgentStateEvent>): () => void {
    this.onAgentStateChangeCallbacks.add(callback);
    return () => this.onAgentStateChangeCallbacks.delete(callback);
  }

  /**
   * Subscribe to transcription events
   */
  onTranscription(callback: VoiceEventCallback<TranscriptionEvent>): () => void {
    this.onTranscriptionCallbacks.add(callback);
    return () => this.onTranscriptionCallbacks.delete(callback);
  }

  /**
   * Subscribe to agent response events
   */
  onAgentResponse(callback: VoiceEventCallback<AgentResponseEvent>): () => void {
    this.onAgentResponseCallbacks.add(callback);
    return () => this.onAgentResponseCallbacks.delete(callback);
  }

  /**
   * Subscribe to session ready events
   */
  onSessionReady(callback: VoiceEventCallback<SessionReadyEvent>): () => void {
    this.onSessionReadyCallbacks.add(callback);
    return () => this.onSessionReadyCallbacks.delete(callback);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: VoiceEventCallback<{ message: string }>): () => void {
    this.onErrorCallbacks.add(callback);
    return () => this.onErrorCallbacks.delete(callback);
  }

  /**
   * Subscribe to disconnect events
   */
  onDisconnect(callback: VoiceEventCallback<{ reason: string }>): () => void {
    this.onDisconnectCallbacks.add(callback);
    return () => this.onDisconnectCallbacks.delete(callback);
  }

  /**
   * Clear all event callbacks
   */
  clearAllCallbacks(): void {
    this.onAgentStateChangeCallbacks.clear();
    this.onTranscriptionCallbacks.clear();
    this.onAgentResponseCallbacks.clear();
    this.onSessionReadyCallbacks.clear();
    this.onErrorCallbacks.clear();
    this.onDisconnectCallbacks.clear();
    this.onAudioPlaybackCallbacks.clear();
    this.onAudioChunkCallbacks.clear();
    this.onBargeInCallbacks.clear();
    this.onArtifactCallbacks.clear();
    // Reconnection callbacks
    this.onReconnectingCallbacks.clear();
    this.onReconnectSuccessCallbacks.clear();
    this.onReconnectFailedCallbacks.clear();
  }

  // ============================================================================
  // BARGE-IN (INTERRUPT AGENT)
  // ============================================================================

  /**
   * Barge-In: Interrupt the agent while it's speaking
   * Stops audio playback immediately and notifies the server
   */
  bargeIn(): void {
    if (!this.socket?.connected) {
      return;
    }

    if (!this.audioQueue.playing) {
      return;
    }

    this.isBargeInActive = true;

    // Stop audio playback immediately
    this.audioQueue.stop();

    // Notify server to stop TTS generation
    this.socket.emit('agent:stop');

    // Notify local listeners
    this.onBargeInCallbacks.forEach(cb => cb({ interrupted: true }));
    this.onAudioPlaybackCallbacks.forEach(cb => cb({ playing: false }));
  }

  /**
   * Check if Barge-In is currently active
   */
  get isBargeIn(): boolean {
    return this.isBargeInActive;
  }

  /**
   * Subscribe to Barge-In events
   */
  onBargeIn(callback: VoiceEventCallback<{ interrupted: boolean }>): () => void {
    this.onBargeInCallbacks.add(callback);
    return () => this.onBargeInCallbacks.delete(callback);
  }

  /**
   * Subscribe to audio chunk events (for streaming TTS)
   */
  onAudioChunk(callback: VoiceEventCallback<{ chunk: string; isFirst: boolean; isLast: boolean }>): () => void {
    this.onAudioChunkCallbacks.add(callback);
    return () => this.onAudioChunkCallbacks.delete(callback);
  }

  // ============================================================================
  // GENERATIVE UI (ARTIFACTS)
  // ============================================================================

  /**
   * Subscribe to artifact events (code, tables, charts, etc.)
   * Artifacts are emitted BEFORE TTS starts, allowing UI to update immediately
   */
  onArtifact(callback: VoiceEventCallback<VoiceArtifactEvent>): () => void {
    this.onArtifactCallbacks.add(callback);
    return () => this.onArtifactCallbacks.delete(callback);
  }

  // ============================================================================
  // AUDIO PROCESSING METHODS
  // ============================================================================

  /**
   * Process accumulated audio through the AI pipeline
   * Triggers STT → LLM → TTS on the server
   */
  async processAudio(): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected || !this.sessionId) {
      return { success: false, error: 'Not connected or no session' };
    }

    return new Promise((resolve) => {
      this.socket!.emit('audio:process', (response: { success: boolean; error?: string }) => {
        resolve(response);
      });
    });
  }

  // ============================================================================
  // AUDIO PLAYBACK CONTROL
  // ============================================================================

  /**
   * Initialize audio playback (must be called after user interaction)
   */
  async initializeAudio(): Promise<void> {
    await this.audioQueue.initialize();

    // Set up playback callbacks
    this.audioQueue.onPlayback(
      // onStart
      () => {
        this.onAudioPlaybackCallbacks.forEach(cb => cb({ playing: true }));
      },
      // onEnd
      () => {
        this.isBargeInActive = false; // Reset Barge-In state when playback ends
        this.onAudioPlaybackCallbacks.forEach(cb => cb({ playing: false }));
      },
      // onFirstChunk - Called when first audio chunk arrives (for immediate state transition)
      () => {
        // Emit agent state change to 'speaking' immediately
        this.onAgentStateChangeCallbacks.forEach(cb => cb({
          state: 'speaking',
          timestamp: new Date().toISOString()
        }));
      }
    );
  }

  /**
   * Set audio volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.audioQueue.setVolume(volume);
  }

  /**
   * Stop current audio playback
   */
  stopAudio(): void {
    this.audioQueue.stop();
  }

  /**
   * Enable/disable auto-play of TTS audio
   */
  setAutoPlayAudio(enabled: boolean): void {
    this.autoPlayAudio = enabled;
  }

  /**
   * Get auto-play setting
   */
  get isAutoPlayEnabled(): boolean {
    return this.autoPlayAudio;
  }

  /**
   * Check if audio is currently playing
   */
  get isAudioPlaying(): boolean {
    return this.audioQueue.playing;
  }

  /**
   * Subscribe to audio playback events
   */
  onAudioPlayback(callback: VoiceEventCallback<{ playing: boolean }>): () => void {
    this.onAudioPlaybackCallbacks.add(callback);
    return () => this.onAudioPlaybackCallbacks.delete(callback);
  }

  /**
   * Manually play audio data
   */
  async playAudio(base64Audio: string, format: string = 'mp3'): Promise<void> {
    await this.audioQueue.enqueue(base64Audio, format);
  }

  /**
   * Close audio resources
   */
  async closeAudio(): Promise<void> {
    await this.audioQueue.close();
  }
}

// Export singleton instance
export const VoiceSocketService = new VoiceSocketServiceClass();
export default VoiceSocketService;
