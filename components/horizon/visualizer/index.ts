/**
 * Flowent Horizon - Visualizer Components
 * WebGL-based visualization for voice and audio interactions
 */

// SSR-safe wrapper (preferred for Next.js usage)
export { FluidOrbWrapper, type OrbState } from './FluidOrbWrapper';
export { default } from './FluidOrbWrapper';

// Raw component (only use in client-only contexts)
export { FluidOrb } from './FluidOrb';
