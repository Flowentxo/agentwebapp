'use client';

/**
 * FluidOrb Wrapper - Client-only dynamic import
 * Prevents SSR issues with Three.js/WebGL
 *
 * Use this wrapper in Next.js pages/components to safely render
 * the WebGL-based FluidOrb visualizer.
 */

import dynamic from 'next/dynamic';
import type { OrbState } from './FluidOrb';
import type { AudioAnalysis } from '@/lib/hooks/useAudioController';

// Dynamic import with SSR disabled
const FluidOrbCore = dynamic(
  () => import('./FluidOrb').then((mod) => mod.FluidOrb),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 animate-pulse" />
      </div>
    ),
  }
);

interface FluidOrbWrapperProps {
  /** Direct amplitude value (0-1) - fallback when audioRef not provided */
  amplitude?: number;
  /** Direct frequency value (0-1) - fallback when audioRef not provided */
  frequency?: number;
  /** Current orb state for visual styling */
  state?: OrbState;
  /** Additional CSS classes */
  className?: string;
  /** Orb size preset */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Show ambient particles around the orb */
  showParticles?: boolean;
  /**
   * REF-BASED audio analysis for 60fps updates.
   * Pass this from useAudioController's analysisRef for optimal performance.
   * When provided and isAudioActive=true, this takes priority over amplitude/frequency props.
   */
  audioRef?: React.MutableRefObject<AudioAnalysis> | null;
  /** Whether audio capture is currently active */
  isAudioActive?: boolean;
}

export function FluidOrbWrapper(props: FluidOrbWrapperProps) {
  return <FluidOrbCore {...props} />;
}

export default FluidOrbWrapper;

// Re-export types
export type { OrbState } from './FluidOrb';
