'use client';

/**
 * Flowent Horizon - Audio Controller Hook (Performance Optimized)
 * Handles microphone input, audio analysis, and voice activity detection
 *
 * Features:
 * - Web Audio API integration for frequency/amplitude analysis
 * - Voice Activity Detection (VAD) for automatic speech detection
 * - Smooth interpolation for visualizer-friendly output
 * - REF-BASED analysis for R3F/useFrame compatibility (no re-renders)
 * - Throttled React state updates for UI elements
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type VoiceState = 'inactive' | 'initializing' | 'listening' | 'processing' | 'speaking';

export interface AudioAnalysis {
  amplitude: number;      // 0-1, current volume level
  frequency: number;      // 0-1, dominant frequency (normalized)
  isSpeaking: boolean;    // Voice activity detected
  rawAmplitude: number;   // Raw amplitude value (0-255)
  /** Frequency spectrum data (for advanced visualizations) */
  spectrum?: Float32Array;
  /** Bass energy (0-1) - useful for orb pulsing */
  bass: number;
  /** Mid-range energy (0-1) */
  mid: number;
  /** Treble energy (0-1) */
  treble: number;
}

export interface AudioControllerConfig {
  fftSize?: number;           // FFT size for frequency analysis (default: 256)
  smoothingTimeConstant?: number; // Smoothing factor (default: 0.8)
  silenceThreshold?: number;  // Threshold for silence detection (0-1, default: 0.05)
  speechThreshold?: number;   // Threshold for speech detection (0-1, default: 0.15)
  silenceDelay?: number;      // Ms to wait before marking as silent (default: 500)
  /** Throttle UI state updates in ms (default: 50ms = 20fps for UI) */
  uiUpdateThrottle?: number;
  /** Enable spectrum data for advanced visualizations */
  enableSpectrum?: boolean;
}

export interface AudioControllerReturn {
  // State (throttled for UI)
  state: VoiceState;
  isActive: boolean;
  analysis: AudioAnalysis;
  error: string | null;

  // Actions
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;

  // Stream access
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;

  /**
   * REF-BASED ACCESS (for R3F useFrame - no re-renders!)
   * Use this in your shader/Three.js components for 60fps updates
   */
  analysisRef: React.MutableRefObject<AudioAnalysis>;

  /**
   * Direct ref access to speaking state (for Barge-In detection)
   * Use this for real-time VAD checks without triggering re-renders
   */
  isSpeakingRef: React.MutableRefObject<boolean>;

  /**
   * Direct access to AnalyserNode for custom processing
   */
  analyserNode: AnalyserNode | null;

  /**
   * Get raw PCM audio data for streaming
   * Returns Float32Array of audio samples from the current buffer
   */
  getAudioData: () => Float32Array | null;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const defaultConfig: Required<AudioControllerConfig> = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  silenceThreshold: 0.05,
  speechThreshold: 0.15,
  silenceDelay: 500,
  uiUpdateThrottle: 50, // 20fps for UI elements
  enableSpectrum: false,
};

// Default analysis object
const createDefaultAnalysis = (): AudioAnalysis => ({
  amplitude: 0,
  frequency: 0,
  isSpeaking: false,
  rawAmplitude: 0,
  bass: 0,
  mid: 0,
  treble: 0,
});

// ============================================================================
// HOOK
// ============================================================================

export function useAudioController(
  config: AudioControllerConfig = {}
): AudioControllerReturn {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);

  // State (throttled updates for UI)
  const [state, setState] = useState<VoiceState>('inactive');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysis>(createDefaultAnalysis);

  // === PERFORMANCE-CRITICAL: Ref-based analysis for R3F ===
  // This ref is updated every frame WITHOUT causing React re-renders
  const analysisRef = useRef<AudioAnalysis>(createDefaultAnalysis());

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Reusable typed arrays (avoid GC pressure)
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const frequencyArrayRef = useRef<Uint8Array | null>(null);

  // Raw PCM buffer for audio streaming (Barge-In support)
  const pcmBufferRef = useRef<Float32Array | null>(null);

  // Throttle tracking
  const lastUIUpdateRef = useRef<number>(0);

  // VAD state
  const lastSpeechTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);

  // Smoothed values for interpolation
  const smoothedRef = useRef({
    amplitude: 0,
    frequency: 0,
    bass: 0,
    mid: 0,
    treble: 0,
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;
    frequencyArrayRef.current = null;
  }, []);

  // Get raw PCM audio data for streaming (Barge-In support)
  const getAudioData = useCallback((): Float32Array | null => {
    if (!analyserRef.current) return null;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize; // Full buffer, not just frequency bins

    // Initialize or resize PCM buffer
    if (!pcmBufferRef.current || pcmBufferRef.current.length !== bufferLength) {
      pcmBufferRef.current = new Float32Array(bufferLength);
    }

    // Get time domain data as Float32 (raw PCM samples)
    analyser.getFloatTimeDomainData(pcmBufferRef.current);

    // Return a copy to prevent mutation
    return pcmBufferRef.current.slice();
  }, []);

  // Audio analysis loop - OPTIMIZED for 60fps
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;

    // Initialize reusable arrays once
    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
    if (!frequencyArrayRef.current) {
      frequencyArrayRef.current = new Uint8Array(bufferLength);
    }

    const dataArray = dataArrayRef.current;
    const frequencyArray = frequencyArrayRef.current;

    const analyze = () => {
      if (!analyserRef.current) return;

      const now = performance.now();

      // Get time domain data (waveform) for amplitude
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analyser.getByteTimeDomainData(dataArray as any);

      // Get frequency data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analyser.getByteFrequencyData(frequencyArray as any);

      // Calculate RMS amplitude (root mean square)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const value = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
        sum += value * value;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const normalizedAmplitude = Math.min(rms * 3, 1); // Scale for visibility

      // Find dominant frequency
      let maxFreqValue = 0;
      let maxFreqIndex = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (frequencyArray[i] > maxFreqValue) {
          maxFreqValue = frequencyArray[i];
          maxFreqIndex = i;
        }
      }
      const normalizedFrequency = maxFreqIndex / bufferLength;

      // Calculate frequency bands (bass, mid, treble)
      // Bass: 0-10% of spectrum, Mid: 10-50%, Treble: 50-100%
      const bassEnd = Math.floor(bufferLength * 0.1);
      const midEnd = Math.floor(bufferLength * 0.5);

      let bassSum = 0, midSum = 0, trebleSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = frequencyArray[i] / 255;
        if (i < bassEnd) bassSum += val;
        else if (i < midEnd) midSum += val;
        else trebleSum += val;
      }

      const bassEnergy = bassSum / bassEnd;
      const midEnergy = midSum / (midEnd - bassEnd);
      const trebleEnergy = trebleSum / (bufferLength - midEnd);

      // Voice Activity Detection
      const nowMs = Date.now();
      const isSpeechDetected = normalizedAmplitude > mergedConfig.speechThreshold;

      if (isSpeechDetected) {
        lastSpeechTimeRef.current = nowMs;
        isSpeakingRef.current = true;
      } else if (normalizedAmplitude < mergedConfig.silenceThreshold) {
        if (nowMs - lastSpeechTimeRef.current > mergedConfig.silenceDelay) {
          isSpeakingRef.current = false;
        }
      }

      // Smooth interpolation (done on refs, no re-render)
      const smooth = smoothedRef.current;
      smooth.amplitude = smooth.amplitude * 0.7 + normalizedAmplitude * 0.3;
      smooth.frequency = smooth.frequency * 0.8 + normalizedFrequency * 0.2;
      smooth.bass = smooth.bass * 0.6 + bassEnergy * 0.4;
      smooth.mid = smooth.mid * 0.7 + midEnergy * 0.3;
      smooth.treble = smooth.treble * 0.8 + trebleEnergy * 0.2;

      // === UPDATE REF (every frame, no React re-render) ===
      analysisRef.current = {
        amplitude: smooth.amplitude,
        frequency: smooth.frequency,
        isSpeaking: isSpeakingRef.current,
        rawAmplitude: maxFreqValue,
        bass: smooth.bass,
        mid: smooth.mid,
        treble: smooth.treble,
        spectrum: mergedConfig.enableSpectrum ? Float32Array.from(frequencyArray) : undefined,
      };

      // === THROTTLED UI STATE UPDATE ===
      if (now - lastUIUpdateRef.current > mergedConfig.uiUpdateThrottle) {
        lastUIUpdateRef.current = now;
        setAnalysis({ ...analysisRef.current });
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [mergedConfig]);

  // Start audio capture
  const start = useCallback(async () => {
    try {
      setError(null);
      setState('initializing');

      // Check for browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Higher quality for better frequency analysis
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      // Resume context if suspended (required for some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = mergedConfig.fftSize;
      analyser.smoothingTimeConstant = mergedConfig.smoothingTimeConstant;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;

      // Connect stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Reset smoothed values
      smoothedRef.current = {
        amplitude: 0,
        frequency: 0,
        bass: 0,
        mid: 0,
        treble: 0,
      };

      // Start analysis loop
      analyzeAudio();

      setState('listening');
      console.log('[AudioController] Started successfully');
    } catch (err: any) {
      console.error('[AudioController] Start error:', err);

      // Handle specific error types
      let errorMessage = 'Failed to access microphone';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Microphone is in use by another application.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setState('inactive');
      cleanup();
    }
  }, [mergedConfig, analyzeAudio, cleanup]);

  // Stop audio capture
  const stop = useCallback(() => {
    cleanup();
    setState('inactive');
    analysisRef.current = createDefaultAnalysis();
    setAnalysis(createDefaultAnalysis());
    console.log('[AudioController] Stopped');
  }, [cleanup]);

  // Toggle audio capture
  const toggle = useCallback(async () => {
    if (state === 'inactive') {
      await start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    isActive: state !== 'inactive',
    analysis,
    error,
    start,
    stop,
    toggle,
    mediaStream: mediaStreamRef.current,
    audioContext: audioContextRef.current,
    // Performance-critical refs
    analysisRef,
    isSpeakingRef, // Direct ref for Barge-In detection
    analyserNode: analyserRef.current,
    // Audio streaming
    getAudioData,
  };
}

export default useAudioController;
