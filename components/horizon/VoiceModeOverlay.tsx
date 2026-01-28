'use client';

/**
 * Flowent Horizon - Voice Mode Overlay (Production-Ready)
 * Full-screen immersive voice interaction experience
 *
 * Features:
 * - State machine for voice mode lifecycle
 * - FluidOrb WebGL visualizer with real-time audio reactivity
 * - Performance-optimized with ref-based audio analysis
 * - Smooth entry/exit transitions with Framer Motion
 * - Latency masking for instant perception
 * - Live captions and haptic feedback
 * - WebSocket integration for real-time voice streaming
 * - Generative UI: Artifacts (code, tables) display during voice
 * - Database persistence: Syncs with inbox_threads/messages
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, Loader2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FluidOrbWrapper, type OrbState } from './visualizer/FluidOrbWrapper';
import { useAudioController } from '@/lib/hooks/useAudioController';
import { VoiceSocketService, type VoiceAgentState, type VoiceArtifactEvent } from '@/lib/services/VoiceSocketService';
import { ArtifactRenderer, type ArtifactData } from './ArtifactRenderer';

// ============================================================================
// TYPES
// ============================================================================

type VoiceModeState = 'idle' | 'initializing' | 'listening' | 'processing' | 'speaking' | 'error';
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Error types for better UX handling
interface VoiceError {
  code: 'CONNECTION_FAILED' | 'CONNECTION_LOST' | 'AUDIO_ERROR' | 'API_ERROR' | 'QUOTA_EXCEEDED' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  agentName?: string;
  onTranscription?: (text: string) => void;
  onResponse?: (text: string) => void;
  /** Auth token for WebSocket connection */
  authToken?: string;
  /** Optional: Continue an existing thread (for text-to-voice continuity) */
  threadId?: string;
  /** Optional: Workspace context */
  workspaceId?: string;
  /** Callback when session ends (with threadId for parent refresh) */
  onSessionEnd?: (threadId: string | null) => void;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const overlayVariants = {
  hidden: {
    opacity: 0,
    y: '100%',
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1], // Custom easing for organic feel
    },
  },
  exit: {
    opacity: 0,
    y: '50%',
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const orbContainerVariants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0.2,
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const controlsVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.4,
      duration: 0.4,
    },
  },
};

const captionVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.3,
      duration: 0.4,
    },
  },
};

// Orb movement animation when artifact appears
const orbMinimizedVariants = {
  centered: {
    scale: 1,
    y: 0,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  minimized: {
    scale: 0.5,
    y: '35vh', // Move to bottom
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Artifact panel slide-in
const artifactPanelVariants = {
  hidden: {
    opacity: 0,
    y: -30,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function VoiceModeOverlay({
  isOpen,
  onClose,
  agentId = 'default',
  agentName = 'AI',
  onTranscription,
  onResponse,
  authToken,
  threadId: initialThreadId,
  workspaceId,
  onSessionEnd,
}: VoiceModeOverlayProps) {
  // React Query client for invalidation
  const queryClient = useQueryClient();

  // State machine for voice mode
  const [voiceState, setVoiceState] = useState<VoiceModeState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Connection state for resilience
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastError, setLastError] = useState<VoiceError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Mobile viewport height (for iOS Safari compatibility)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Track the active thread ID (may differ from initialThreadId if new thread was created)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);

  // Refs
  const audioStreamRef = useRef<number | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasSpeakingRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio controller for microphone input (optimized with ref-based updates)
  const {
    state: audioState,
    analysis,
    analysisRef, // For R3F performance - direct ref access
    isSpeakingRef, // For Barge-In detection
    start: startAudio,
    stop: stopAudio,
    error: audioError,
    analyserNode,
    getAudioData, // For streaming raw PCM
  } = useAudioController({
    speechThreshold: 0.12,
    silenceDelay: 600,
    uiUpdateThrottle: 50, // 20fps for UI elements
    enableSpectrum: true,
  });

  // Track if agent is currently playing audio
  const [isAgentPlaying, setIsAgentPlaying] = useState(false);
  const bargeInTriggeredRef = useRef(false);

  // Generative UI: Artifact state
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<ArtifactData[]>([]);

  // Computed: Is artifact currently being displayed?
  const hasArtifact = currentArtifact !== null;

  // Map voice state to orb state
  const orbState: OrbState = useMemo(() => {
    switch (voiceState) {
      case 'initializing':
        return 'idle';
      case 'listening':
        return analysis.isSpeaking ? 'listening' : 'idle';
      case 'processing':
        return 'thinking';
      case 'speaking':
        return 'speaking';
      default:
        return 'idle';
    }
  }, [voiceState, analysis.isSpeaking]);

  // ============================================================================
  // HAPTIC FEEDBACK
  // ============================================================================

  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // ============================================================================
  // MOBILE VIEWPORT HEIGHT (iOS Safari Fix)
  // ============================================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewportHeight = () => {
      // Use visualViewport if available (better for mobile keyboards)
      const vh = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(vh);
      // Also set CSS variable for fallback
      document.documentElement.style.setProperty('--voice-overlay-height', `${vh}px`);
    };

    // Initial set
    updateViewportHeight();

    // Listen to resize and visualViewport changes
    window.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('scroll', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
    };
  }, []);

  // ============================================================================
  // ERROR HANDLING & TOAST NOTIFICATIONS
  // ============================================================================

  const handleError = useCallback((error: Error | string, code: VoiceError['code'] = 'UNKNOWN') => {
    const message = typeof error === 'string' ? error : error.message;

    // Determine if error is retryable
    const retryable = !['QUOTA_EXCEEDED', 'AUDIO_ERROR'].includes(code);

    const voiceError: VoiceError = {
      code,
      message,
      retryable,
    };

    setLastError(voiceError);
    setVoiceState('error');

    // Show toast with appropriate styling
    const toastConfig = {
      description: message,
      duration: retryable ? 5000 : 8000,
    };

    switch (code) {
      case 'CONNECTION_FAILED':
      case 'CONNECTION_LOST':
        toast.error('Connection Lost', {
          ...toastConfig,
          icon: <WifiOff className="w-4 h-4" />,
          action: retryable ? {
            label: 'Retry',
            onClick: () => handleRetry(),
          } : undefined,
        });
        break;
      case 'QUOTA_EXCEEDED':
        toast.error('API Quota Exceeded', {
          ...toastConfig,
          description: 'Please try again later or check your API limits.',
          icon: <AlertTriangle className="w-4 h-4" />,
        });
        break;
      case 'API_ERROR':
        toast.error('AI Service Error', {
          ...toastConfig,
          icon: <AlertTriangle className="w-4 h-4" />,
          action: retryable ? {
            label: 'Retry',
            onClick: () => handleRetry(),
          } : undefined,
        });
        break;
      default:
        toast.error('Voice Mode Error', toastConfig);
    }

    triggerHaptic([100, 50, 100]); // Error haptic pattern
  }, [triggerHaptic]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      toast.error('Maximum retries reached', {
        description: 'Please close and try again.',
      });
      return;
    }

    setRetryCount((prev) => prev + 1);
    setLastError(null);
    setVoiceState('initializing');
    setConnectionState('reconnecting');

    toast.loading('Reconnecting...', { id: 'voice-reconnect' });

    try {
      await setupWebSocket();
      await startAudio();
      setVoiceState('listening');
      setConnectionState('connected');
      toast.success('Reconnected!', { id: 'voice-reconnect' });
      setRetryCount(0);
    } catch (error: any) {
      toast.dismiss('voice-reconnect');
      handleError(error, 'CONNECTION_FAILED');
    }
  }, [retryCount, startAudio]);

  // ============================================================================
  // WEBSOCKET SETUP
  // ============================================================================

  const setupWebSocket = useCallback(async () => {
    if (!authToken) {
      console.warn('[VoiceMode] No auth token provided, running in demo mode');
      return false;
    }

    setConnectionState('connecting');

    try {
      await VoiceSocketService.connect(authToken);
      setIsSocketConnected(true);
      setConnectionState('connected');
      setSocketError(null);
      setLastError(null);

      // Initialize audio playback (requires user gesture context)
      await VoiceSocketService.initializeAudio();

      // Start session with persistence config (threadId for continuity, workspaceId, agentName)
      const result = await VoiceSocketService.startSession(agentId, {
        threadId: initialThreadId,
        workspaceId,
        agentName,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to start session');
      }

      // Track the active thread ID (may be new if no existing thread)
      if (result.threadId) {
        setActiveThreadId(result.threadId);
      }

      return true;
    } catch (error: any) {
      console.error('[VoiceMode] WebSocket error:', error);
      setConnectionState('disconnected');
      setSocketError(error.message);

      // Categorize error for better UX
      const errorCode: VoiceError['code'] = error.message?.includes('timeout')
        ? 'CONNECTION_FAILED'
        : error.message?.includes('quota') || error.message?.includes('429')
        ? 'QUOTA_EXCEEDED'
        : 'CONNECTION_FAILED';

      handleError(error, errorCode);
      return false;
    }
  }, [authToken, agentId, initialThreadId, workspaceId, agentName, handleError]);

  const teardownWebSocket = useCallback(async (): Promise<string | null> => {
    let sessionThreadId: string | null = null;

    try {
      VoiceSocketService.stopAudio();
      await VoiceSocketService.closeAudio();

      // End session and get the threadId for query invalidation
      const result = await VoiceSocketService.endSession();
      sessionThreadId = result.threadId || activeThreadId;

      VoiceSocketService.disconnect();
    } catch (error) {
      console.error('[VoiceMode] WebSocket teardown error:', error);
      sessionThreadId = activeThreadId;
    }

    setIsSocketConnected(false);
    return sessionThreadId;
  }, [activeThreadId]);

  // ============================================================================
  // VOICE MODE LIFECYCLE
  // ============================================================================

  // Initialize voice mode when overlay opens
  useEffect(() => {
    if (isOpen) {
      // === LATENCY MASKING: Start visual immediately ===
      setVoiceState('initializing');
      triggerHaptic(50); // Short haptic on open

      // Start audio and WebSocket in parallel
      const initialize = async () => {
        // Clear previous state
        setTranscript('');
        setResponse('');
        setSocketError(null);

        // Simulate brief initialization (latency masking)
        initTimeoutRef.current = setTimeout(async () => {
          try {
            // Start audio capture
            await startAudio();

            // Setup WebSocket (non-blocking if no token)
            await setupWebSocket();

            // Transition to listening
            setVoiceState('listening');
            triggerHaptic([30, 50, 30]); // Pattern haptic for listening

          } catch (error: any) {
            console.error('[VoiceMode] Initialization error:', error);
            setVoiceState('idle');
          }
        }, 200); // Brief delay for visual smoothness
      };

      initialize();
    } else {
      // Cleanup on close
      setVoiceState('idle');
      stopAudio();

      // Async teardown with query invalidation
      (async () => {
        const sessionThreadId = await teardownWebSocket();

        // Invalidate queries to refresh chat data after voice session
        if (sessionThreadId) {
          queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-messages', sessionThreadId] });
          queryClient.invalidateQueries({ queryKey: ['thread', sessionThreadId] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionThreadId] });
        }

        // Notify parent of session end
        onSessionEnd?.(sessionThreadId);
      })();

      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isOpen, startAudio, stopAudio, setupWebSocket, teardownWebSocket, triggerHaptic, queryClient, onSessionEnd]);

  // ============================================================================
  // WEBSOCKET EVENT HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to agent state changes
    const unsubState = VoiceSocketService.onAgentStateChange((event) => {
      const stateMap: Record<VoiceAgentState, VoiceModeState> = {
        idle: 'listening',
        listening: 'listening',
        thinking: 'processing',
        speaking: 'speaking',
      };
      setVoiceState(stateMap[event.state] || 'listening');

      // Reset Barge-In flag when returning to listening
      if (event.state === 'listening') {
        bargeInTriggeredRef.current = false;
      }
    });

    // Subscribe to transcriptions
    const unsubTranscript = VoiceSocketService.onTranscription((event) => {
      setTranscript(event.text);
      onTranscription?.(event.text);
    });

    // Subscribe to agent responses
    const unsubResponse = VoiceSocketService.onAgentResponse((event) => {
      setResponse(event.text);
      onResponse?.(event.text);
    });

    // Subscribe to audio playback state
    const unsubPlayback = VoiceSocketService.onAudioPlayback((event) => {
      setIsAgentPlaying(event.playing);
    });

    // Subscribe to Barge-In events
    const unsubBargeIn = VoiceSocketService.onBargeIn(() => {
      setIsAgentPlaying(false);
    });

    // Subscribe to errors - use enhanced error handling
    const unsubError = VoiceSocketService.onError((event) => {
      setSocketError(event.message);

      // Categorize error for toast notification
      const errorCode: VoiceError['code'] = event.message?.includes('quota') || event.message?.includes('429')
        ? 'QUOTA_EXCEEDED'
        : event.message?.includes('OpenAI') || event.message?.includes('API')
        ? 'API_ERROR'
        : 'UNKNOWN';

      handleError(event.message, errorCode);
    });

    // Subscribe to disconnect - handle reconnection state
    const unsubDisconnect = VoiceSocketService.onDisconnect((event) => {
      setIsSocketConnected(false);
      setConnectionState('disconnected');

      // Don't show error if it's a clean disconnect (user closed overlay)
      if (event.reason !== 'io client disconnect') {
        handleError(`Connection lost: ${event.reason}`, 'CONNECTION_LOST');
      }
    });

    // Subscribe to artifacts (Generative UI)
    const unsubArtifact = VoiceSocketService.onArtifact((artifact: VoiceArtifactEvent) => {
      const artifactData: ArtifactData = {
        id: artifact.id,
        title: artifact.title,
        type: artifact.type,
        content: artifact.content,
        language: artifact.language,
        metadata: artifact.metadata,
        timestamp: artifact.timestamp,
      };
      setCurrentArtifact(artifactData);
      setArtifactHistory((prev) => [...prev, artifactData]);
      triggerHaptic([30, 20, 30]); // Distinctive haptic for artifact appearance
    });

    return () => {
      unsubState();
      unsubTranscript();
      unsubResponse();
      unsubPlayback();
      unsubBargeIn();
      unsubError();
      unsubDisconnect();
      unsubArtifact();
    };
  }, [isOpen, onTranscription, onResponse, triggerHaptic, handleError]);

  // ============================================================================
  // BARGE-IN DETECTION
  // ============================================================================

  useEffect(() => {
    if (!isOpen || !isSocketConnected || !isAgentPlaying) {
      return;
    }

    // Check for Barge-In: User starts speaking while agent is playing audio
    const checkBargeIn = () => {
      // Use ref for real-time check without re-renders
      if (isSpeakingRef.current && isAgentPlaying && !bargeInTriggeredRef.current) {
        bargeInTriggeredRef.current = true;

        // Trigger Barge-In
        VoiceSocketService.bargeIn();
        triggerHaptic([50, 30, 50]); // Distinctive haptic for interruption

        // Immediately update local state
        setVoiceState('listening');
        setIsAgentPlaying(false);
      }
    };

    // Check frequently for responsive Barge-In
    const bargeInInterval = setInterval(checkBargeIn, 50); // 20Hz check

    return () => {
      clearInterval(bargeInInterval);
    };
  }, [isOpen, isSocketConnected, isAgentPlaying, isSpeakingRef, triggerHaptic]);

  // ============================================================================
  // AUDIO STREAMING TO WEBSOCKET
  // ============================================================================

  useEffect(() => {
    if (voiceState !== 'listening' || !isSocketConnected || isMuted) {
      return;
    }

    // Stream raw PCM audio data to WebSocket at regular intervals
    const streamInterval = setInterval(() => {
      // Get raw PCM audio data from the audio controller
      const audioData = getAudioData();
      if (audioData && audioData.length > 0) {
        // Only send if there's meaningful audio (not just silence)
        const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
        if (maxAmplitude > 0.01) {
          VoiceSocketService.sendAudioChunk(audioData);
        }
      }
    }, 100); // 10 chunks per second (100ms intervals)

    return () => {
      clearInterval(streamInterval);
    };
  }, [voiceState, isSocketConnected, isMuted, getAudioData]);

  // Detect when user stops speaking and trigger AI processing
  useEffect(() => {
    if (voiceState !== 'listening' || !isSocketConnected || isMuted) {
      return;
    }

    // Detect transition from speaking to silence
    if (wasSpeakingRef.current && !analysis.isSpeaking) {
      // User just stopped speaking - wait a moment then process
      silenceTimeoutRef.current = setTimeout(async () => {
        triggerHaptic([20, 30]); // Haptic feedback for processing

        // Trigger server-side STT → LLM → TTS pipeline
        const result = await VoiceSocketService.processAudio();
        if (!result.success) {
          setSocketError(result.error || 'Processing failed');
        }
      }, 800); // Wait 800ms of silence before processing
    } else if (analysis.isSpeaking && silenceTimeoutRef.current) {
      // User started speaking again, cancel processing
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    wasSpeakingRef.current = analysis.isSpeaking;

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [voiceState, isSocketConnected, isMuted, analysis.isSpeaking, triggerHaptic]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleClose = useCallback(async () => {
    triggerHaptic(30);
    stopAudio();

    // Teardown WebSocket and get the threadId
    const sessionThreadId = await teardownWebSocket();

    // Invalidate React Query caches to refresh chat/inbox data
    // This ensures voice messages appear in the text chat immediately
    if (sessionThreadId) {
      // Invalidate inbox queries to refresh messages
      queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', sessionThreadId] });
      queryClient.invalidateQueries({ queryKey: ['thread', sessionThreadId] });

      // Also invalidate any chat-related queries
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionThreadId] });
    }

    // Notify parent component of session end with threadId
    onSessionEnd?.(sessionThreadId);

    // Close the overlay
    onClose();
  }, [stopAudio, teardownWebSocket, onClose, triggerHaptic, queryClient, onSessionEnd]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    triggerHaptic(20);
  }, [triggerHaptic]);

  const handleCloseArtifact = useCallback(() => {
    setCurrentArtifact(null);
    triggerHaptic(20);
  }, [triggerHaptic]);

  // Status text based on state
  const getStatusText = useCallback(() => {
    // Check connection state first
    if (connectionState === 'reconnecting') {
      return `Reconnecting... (${retryCount}/3)`;
    }

    switch (voiceState) {
      case 'initializing':
        return 'Connecting...';
      case 'listening':
        return analysis.isSpeaking ? 'Listening...' : 'Tap to speak';
      case 'processing':
        return `${agentName} is thinking...`;
      case 'speaking':
        return `${agentName} is speaking`;
      case 'error':
        return lastError?.retryable ? 'Connection error - tap to retry' : 'Error occurred';
      default:
        return 'Voice Mode';
    }
  }, [voiceState, agentName, analysis.isSpeaking, connectionState, retryCount, lastError]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="voice-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            'fixed inset-0 z-[100] flex flex-col',
            'bg-slate-50 dark:bg-background',
            // Glassmorphism backdrop
            'backdrop-blur-3xl'
          )}
          style={{
            // Use dynamic viewport height for iOS Safari compatibility
            height: viewportHeight ? `${viewportHeight}px` : '100dvh',
            // Fallback for browsers without dvh support
            minHeight: '-webkit-fill-available',
          }}
        >
          {/* Background glow effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-[600px] h-[600px] rounded-full blur-[120px]',
                voiceState === 'listening' && analysis.isSpeaking && 'bg-cyan-500 opacity-40',
                voiceState === 'processing' && 'bg-violet-500 opacity-50',
                voiceState === 'speaking' && 'bg-emerald-500 opacity-40',
                (voiceState === 'idle' || voiceState === 'initializing') && 'bg-indigo-500 opacity-25',
                voiceState === 'listening' && !analysis.isSpeaking && 'bg-indigo-500 opacity-30'
              )}
              animate={{
                scale: voiceState === 'processing' ? [1, 1.15, 1] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: voiceState === 'processing' ? Infinity : 0,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Header */}
          <motion.header
            variants={controlsVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 flex items-center justify-between p-4 safe-area-inset-top"
          >
            {/* Agent Info */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  'bg-gradient-to-br from-violet-500 to-indigo-500 text-white font-semibold',
                  'shadow-lg shadow-violet-500/25'
                )}
              >
                {agentName.charAt(0)}
              </div>
              <div>
                <h2 className="font-medium text-slate-900 dark:text-white">
                  {agentName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      connectionState === 'connected' && 'bg-green-500',
                      connectionState === 'connecting' && 'bg-amber-500 animate-pulse',
                      connectionState === 'reconnecting' && 'bg-amber-500 animate-pulse',
                      connectionState === 'disconnected' && 'bg-red-500',
                      voiceState === 'error' && 'bg-red-500'
                    )}
                  />
                  {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Voice Mode'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Retry Button - Show when error or disconnected */}
              {(voiceState === 'error' || connectionState === 'disconnected') && lastError?.retryable && (
                <button
                  onClick={handleRetry}
                  disabled={connectionState === 'reconnecting'}
                  className={cn(
                    'p-2.5 rounded-full transition-all duration-200',
                    'bg-amber-500/20 dark:bg-amber-500/20',
                    'backdrop-blur-md border border-amber-500/30',
                    'hover:bg-amber-500/30',
                    connectionState === 'reconnecting' && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Retry connection"
                >
                  <RefreshCw
                    className={cn(
                      'w-5 h-5 text-amber-400',
                      connectionState === 'reconnecting' && 'animate-spin'
                    )}
                  />
                </button>
              )}

              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={cn(
                  'p-2.5 rounded-full transition-all duration-200',
                  'bg-white/10 dark:bg-slate-800/50',
                  'backdrop-blur-md border border-white/10',
                  isMuted && 'bg-red-500/20 border-red-500/30',
                  'hover:bg-white/20 dark:hover:bg-slate-700/50'
                )}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5 text-red-400" />
                ) : (
                  <Mic className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className={cn(
                  'p-2.5 rounded-full transition-all duration-200',
                  'bg-white/10 dark:bg-slate-800/50',
                  'backdrop-blur-md border border-white/10',
                  'hover:bg-red-500/20 hover:border-red-500/30',
                  'hover:text-red-400'
                )}
                title="Close"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </motion.header>

          {/* Main Content - Split View Layout */}
          <motion.main
            variants={orbContainerVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              'flex-1 flex relative z-10 px-6 overflow-hidden',
              // Switch layout when artifact is present
              hasArtifact ? 'flex-col' : 'flex-col items-center justify-center'
            )}
          >
            {/* Artifact Panel (slides in from top when present) */}
            <AnimatePresence mode="wait">
              {hasArtifact && currentArtifact && (
                <motion.div
                  key="artifact-panel"
                  variants={artifactPanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full max-h-[50vh] overflow-y-auto py-4"
                >
                  <ArtifactRenderer
                    artifact={currentArtifact}
                    onClose={handleCloseArtifact}
                    className="max-w-3xl mx-auto"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Orb Container - Animates to bottom when artifact present */}
            <motion.div
              variants={orbMinimizedVariants}
              animate={hasArtifact ? 'minimized' : 'centered'}
              className={cn(
                'horizon-orb-container relative',
                hasArtifact ? 'mt-auto mb-8' : ''
              )}
            >
              {/* Dynamic glow under orb */}
              <div
                className={cn(
                  'horizon-orb-glow absolute inset-0 rounded-full blur-3xl opacity-50 -z-10',
                  orbState === 'listening' && 'bg-cyan-500',
                  orbState === 'thinking' && 'bg-violet-500',
                  orbState === 'speaking' && 'bg-emerald-500',
                  orbState === 'idle' && 'bg-indigo-500'
                )}
                style={{
                  transform: `scale(${1.2 + analysis.amplitude * 0.3})`,
                  transition: 'transform 0.1s ease-out',
                }}
              />

              {/* Loading overlay during initialization */}
              {voiceState === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
              )}

              <FluidOrbWrapper
                amplitude={analysis.amplitude}
                frequency={analysis.frequency}
                state={orbState}
                size={hasArtifact ? 'md' : 'lg'}
                showParticles={!hasArtifact}
                audioRef={analysisRef}
                isAudioActive={audioState === 'listening' && !isMuted}
              />
            </motion.div>

            {/* Status Chip - Only show when no artifact */}
            <AnimatePresence>
              {!hasArtifact && (
                <motion.div
                  variants={captionVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8"
                >
                  <div
                    className={cn(
                      'horizon-chip px-4 py-2 rounded-full',
                      'bg-white/10 dark:bg-slate-800/50',
                      'backdrop-blur-md border border-white/10',
                      'flex items-center gap-2',
                      orbState === 'listening' && 'border-cyan-500/30',
                      orbState === 'thinking' && 'border-violet-500/30',
                      orbState === 'speaking' && 'border-emerald-500/30'
                    )}
                  >
                    {voiceState === 'initializing' && (
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                    )}
                    {voiceState === 'listening' && analysis.isSpeaking && (
                      <Mic className="w-4 h-4 text-cyan-400 animate-pulse" />
                    )}
                    {voiceState === 'listening' && !analysis.isSpeaking && (
                      <Mic className="w-4 h-4 text-slate-400" />
                    )}
                    {voiceState === 'processing' && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-4 h-4 text-violet-400" />
                      </motion.div>
                    )}
                    {voiceState === 'speaking' && (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        voiceState === 'listening' && analysis.isSpeaking && 'text-cyan-400',
                        voiceState === 'processing' && 'text-violet-400',
                        voiceState === 'speaking' && 'text-emerald-400',
                        (voiceState === 'idle' || voiceState === 'initializing' ||
                          (voiceState === 'listening' && !analysis.isSpeaking)) &&
                          'text-slate-400'
                      )}
                    >
                      {getStatusText()}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Minimized Status Chip - Show when artifact present */}
            <AnimatePresence>
              {hasArtifact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2"
                >
                  <div
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs',
                      'bg-slate-900/80 backdrop-blur-md border border-white/10',
                      'flex items-center gap-2',
                      orbState === 'speaking' && 'border-emerald-500/30'
                    )}
                  >
                    {voiceState === 'speaking' && (
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                    )}
                    {voiceState === 'listening' && (
                      <Mic className={cn('w-3 h-3', analysis.isSpeaking ? 'text-cyan-400' : 'text-slate-400')} />
                    )}
                    <span className="text-slate-300">{getStatusText()}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Caption Area - Only show when no artifact */}
            <AnimatePresence>
              {!hasArtifact && (
                <motion.div
                  variants={captionVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 max-w-xl text-center px-6"
                >
                  {/* User transcript */}
                  {transcript && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg text-slate-600 dark:text-slate-300 mb-3"
                    >
                      "{transcript}"
                    </motion.p>
                  )}

                  {/* Agent response */}
                  {response && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg text-slate-900 dark:text-white font-medium"
                    >
                      {response}
                    </motion.p>
                  )}

                  {/* Error display */}
                  {(audioError || socketError) && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-red-400 dark:text-red-400 mt-2"
                    >
                      {audioError || socketError}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>

          {/* Footer - Audio Levels Debug (Dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <motion.footer
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative z-10 p-4 safe-area-inset-bottom"
            >
              <div className="max-w-md mx-auto space-y-2 bg-card/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                {/* Amplitude */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16">Amplitude</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                      style={{ width: `${analysis.amplitude * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right font-mono">
                    {(analysis.amplitude * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Frequency Bands */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16">Bass</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-400"
                      style={{ width: `${(analysis.bass || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right font-mono">
                    {((analysis.bass || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16">Mid</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-500 to-amber-400"
                      style={{ width: `${(analysis.mid || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right font-mono">
                    {((analysis.mid || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16">Treble</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-400"
                      style={{ width: `${(analysis.treble || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right font-mono">
                    {((analysis.treble || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Status Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        analysis.isSpeaking ? 'bg-green-500' : 'bg-slate-500'
                      )}
                    />
                    <span className="text-xs text-slate-400">
                      {analysis.isSpeaking ? 'Voice Detected' : 'Silence'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        isSocketConnected ? 'bg-green-500' : 'bg-amber-500'
                      )}
                    />
                    <span className="text-xs text-slate-400">
                      {isSocketConnected ? 'Connected' : 'Demo Mode'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoiceModeOverlay;
