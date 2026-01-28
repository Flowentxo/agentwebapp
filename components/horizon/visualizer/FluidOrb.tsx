'use client';

/**
 * Flowent Horizon - FluidOrb Visualizer
 * WebGL-based fluid sphere with GLSL shaders
 * Inspired by Grok AI's voice visualization
 *
 * Features:
 * - Real-time audio reactivity via analysisRef (60fps, no re-renders)
 * - Bass-driven pulsing, treble-driven glow intensity
 * - Organic "lava lamp" effect with multi-layered noise distortion
 * - State-based color transitions (idle, listening, thinking, speaking)
 * - Smooth interpolation with damping for natural physics
 * - Fallback idle animation when audio is inactive
 */

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import type { AudioAnalysis } from '@/lib/hooks/useAudioController';

// ============================================================================
// SHADER DEFINITIONS
// ============================================================================

const vertexShader = `
  uniform float u_time;
  uniform float u_amplitude;
  uniform float u_frequency;
  uniform float u_bass;
  uniform float u_pulse;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;

    // Create organic noise-based displacement
    // Bass affects noise frequency (lower = more bloby)
    float noiseFreq = 1.2 + u_frequency * 0.3 - u_bass * 0.3;

    // Amplitude + bass for displacement strength (bass = pulsing)
    float noiseAmp = 0.1 + u_amplitude * 0.35 + u_bass * 0.15;

    // Time scale affected by bass for rhythmic feel
    float timeScale = u_time * (0.4 + u_bass * 0.3);

    // Multi-layered noise for organic feel
    float noise1 = snoise(position * noiseFreq + timeScale);
    float noise2 = snoise(position * noiseFreq * 2.0 + timeScale * 1.3) * 0.5;
    float noise3 = snoise(position * noiseFreq * 4.0 + timeScale * 1.7) * 0.25;

    // Add pulse effect from bass (uniform scale)
    float bassPulse = 1.0 + u_pulse * 0.08;

    float displacement = (noise1 + noise2 + noise3) * noiseAmp;
    vDisplacement = displacement;

    // Apply displacement along normal with bass pulse
    vec3 newPosition = position * bassPulse + normal * displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform float u_amplitude;
  uniform float u_frequency;
  uniform float u_bass;
  uniform float u_treble;
  uniform float u_intensity;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_colorMix;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Create gradient based on displacement and position
    float mixFactor = (vDisplacement + 0.5) * 0.5 + u_colorMix;
    mixFactor = clamp(mixFactor, 0.0, 1.0);

    // Multi-color gradient
    vec3 color = mix(u_color1, u_color2, mixFactor);
    color = mix(color, u_color3, sin(u_time * 0.5 + vPosition.y * 2.0) * 0.5 + 0.5);

    // Fresnel effect for rim lighting
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.5);

    // Treble-driven glow intensity (high frequencies = brighter glow)
    float baseGlow = 0.25 + u_amplitude * 0.4;
    float trebleGlow = u_treble * 0.6;
    float glowIntensity = baseGlow + trebleGlow;

    // Intensity uniform for overall brightness control
    glowIntensity *= u_intensity;

    vec3 glow = u_color2 * fresnel * glowIntensity;

    // Add rim highlight that reacts to treble
    vec3 rimColor = mix(u_color2, u_color3, u_treble);
    vec3 rim = rimColor * fresnel * fresnel * (0.5 + u_treble * 0.5);

    // Final color with glow and rim
    vec3 finalColor = color + glow + rim;

    // Alpha based on amplitude for breathing effect
    float alpha = 0.88 + u_amplitude * 0.12;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ============================================================================
// TYPES & STATE MACHINE
// ============================================================================

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface OrbColors {
  color1: THREE.Color;
  color2: THREE.Color;
  color3: THREE.Color;
}

// Color palettes for each state
const stateColors: Record<OrbState, OrbColors> = {
  idle: {
    color1: new THREE.Color('#1e1b4b'), // Deep indigo
    color2: new THREE.Color('#4338ca'), // Indigo
    color3: new THREE.Color('#7c3aed'), // Violet
  },
  listening: {
    color1: new THREE.Color('#042f2e'), // Deep teal
    color2: new THREE.Color('#00E5FF'), // Cyan neon
    color3: new THREE.Color('#06b6d4'), // Cyan
  },
  thinking: {
    color1: new THREE.Color('#2e1065'), // Deep purple
    color2: new THREE.Color('#a855f7'), // Purple
    color3: new THREE.Color('#f0abfc'), // Pink
  },
  speaking: {
    color1: new THREE.Color('#052e16'), // Deep green
    color2: new THREE.Color('#10b981'), // Emerald
    color3: new THREE.Color('#34d399'), // Light emerald
  },
};

// ============================================================================
// INTERNAL ANIMATION STATE (for smooth physics)
// ============================================================================

interface AnimationState {
  amplitude: number;
  frequency: number;
  bass: number;
  mid: number;
  treble: number;
  pulse: number;
  intensity: number;
  rotationY: number;
  rotationX: number;
}

// ============================================================================
// ORB MESH COMPONENT
// ============================================================================

interface OrbMeshProps {
  /** Direct amplitude value (0-1) - used when audioRef is not provided */
  amplitude: number;
  /** Direct frequency value (0-1) - used when audioRef is not provided */
  frequency: number;
  /** Current orb state for color transitions */
  state: OrbState;
  /** Base rotation speed */
  rotationSpeed?: number;
  /**
   * REF-BASED audio analysis for 60fps updates without re-renders.
   * When provided, this takes priority over amplitude/frequency props.
   */
  audioRef?: React.MutableRefObject<AudioAnalysis> | null;
  /** Whether audio is currently active (for idle fallback) */
  isAudioActive?: boolean;
}

function OrbMesh({
  amplitude,
  frequency,
  state,
  rotationSpeed = 0.2,
  audioRef,
  isAudioActive = false,
}: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Shader uniforms (mutable, updated every frame)
  const uniformsRef = useRef({
    u_time: { value: 0 },
    u_amplitude: { value: 0 },
    u_frequency: { value: 0 },
    u_bass: { value: 0 },
    u_treble: { value: 0 },
    u_pulse: { value: 0 },
    u_intensity: { value: 1 },
    u_color1: { value: stateColors.idle.color1.clone() },
    u_color2: { value: stateColors.idle.color2.clone() },
    u_color3: { value: stateColors.idle.color3.clone() },
    u_colorMix: { value: 0 },
  });

  // Smoothed animation state (for damping/physics)
  const animState = useRef<AnimationState>({
    amplitude: 0,
    frequency: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    pulse: 0,
    intensity: 1,
    rotationY: 0,
    rotationX: 0,
  });

  // Target colors for smooth transitions
  const targetColors = useRef(stateColors.idle);

  // Update target colors when state changes
  useEffect(() => {
    targetColors.current = stateColors[state];
  }, [state]);

  // Animation loop - runs at 60fps
  useFrame((frameState, delta) => {
    if (!meshRef.current) return;

    const uniforms = uniformsRef.current;
    const anim = animState.current;
    const time = frameState.clock.getElapsedTime();

    // Update time
    uniforms.u_time.value = time;

    // === AUDIO DATA SOURCE ===
    // Priority: audioRef (real-time) > props (fallback) > idle animation
    let targetAmplitude: number;
    let targetFrequency: number;
    let targetBass: number;
    let targetMid: number;
    let targetTreble: number;

    if (audioRef?.current && isAudioActive) {
      // Real-time audio from ref (no re-renders!)
      const audio = audioRef.current;
      targetAmplitude = audio.amplitude;
      targetFrequency = audio.frequency;
      targetBass = audio.bass;
      targetMid = audio.mid;
      targetTreble = audio.treble;
    } else if (isAudioActive) {
      // Fallback to props if audioRef not available
      targetAmplitude = amplitude;
      targetFrequency = frequency;
      targetBass = 0;
      targetMid = 0;
      targetTreble = 0;
    } else {
      // === IDLE ANIMATION (organic breathing) ===
      // When audio is inactive, create gentle sine-wave animation
      const idleTime = time * 0.5;
      targetAmplitude = 0.15 + Math.sin(idleTime) * 0.1;
      targetFrequency = 0.3 + Math.sin(idleTime * 0.7) * 0.15;
      targetBass = 0.2 + Math.sin(idleTime * 0.8) * 0.1;
      targetMid = 0.15 + Math.sin(idleTime * 1.2) * 0.08;
      targetTreble = 0.1 + Math.sin(idleTime * 1.5) * 0.05;
    }

    // === SMOOTH INTERPOLATION (damping for organic feel) ===
    // Lower lerp values = smoother/slower, higher = more responsive
    const dampingFast = 0.12;   // For amplitude (responsive)
    const dampingMed = 0.08;    // For bass (punchy but smooth)
    const dampingSlow = 0.05;   // For frequency/treble (smooth transitions)

    anim.amplitude = THREE.MathUtils.lerp(anim.amplitude, targetAmplitude, dampingFast);
    anim.frequency = THREE.MathUtils.lerp(anim.frequency, targetFrequency, dampingSlow);
    anim.bass = THREE.MathUtils.lerp(anim.bass, targetBass, dampingMed);
    anim.mid = THREE.MathUtils.lerp(anim.mid, targetMid, dampingSlow);
    anim.treble = THREE.MathUtils.lerp(anim.treble, targetTreble, dampingSlow);

    // Pulse effect driven by bass (creates "heartbeat" on low frequencies)
    const targetPulse = anim.bass * 1.5;
    anim.pulse = THREE.MathUtils.lerp(anim.pulse, targetPulse, 0.15);

    // Intensity driven by treble + amplitude (bright on high frequencies)
    const targetIntensity = 0.8 + anim.treble * 0.4 + anim.amplitude * 0.3;
    anim.intensity = THREE.MathUtils.lerp(anim.intensity, targetIntensity, 0.1);

    // === UPDATE SHADER UNIFORMS ===
    uniforms.u_amplitude.value = anim.amplitude;
    uniforms.u_frequency.value = anim.frequency;
    uniforms.u_bass.value = anim.bass;
    uniforms.u_treble.value = anim.treble;
    uniforms.u_pulse.value = anim.pulse;
    uniforms.u_intensity.value = anim.intensity;

    // === SMOOTH COLOR TRANSITIONS ===
    uniforms.u_color1.value.lerp(targetColors.current.color1, 0.04);
    uniforms.u_color2.value.lerp(targetColors.current.color2, 0.04);
    uniforms.u_color3.value.lerp(targetColors.current.color3, 0.04);

    // Color mix animation based on state
    const targetMix = state === 'thinking' ? 0.7 : state === 'speaking' ? 0.5 : 0.3;
    uniforms.u_colorMix.value = THREE.MathUtils.lerp(
      uniforms.u_colorMix.value,
      targetMix,
      0.04
    );

    // === ROTATION (state and bass influenced) ===
    const stateMultiplier = state === 'thinking' ? 2.5 : state === 'speaking' ? 1.5 : 1;
    const bassBoost = 1 + anim.bass * 0.5; // Bass speeds up rotation slightly

    anim.rotationY += delta * rotationSpeed * stateMultiplier * bassBoost;
    anim.rotationX += delta * rotationSpeed * 0.3 * stateMultiplier;

    meshRef.current.rotation.y = anim.rotationY;
    meshRef.current.rotation.x = anim.rotationX;
  });

  // Create shader material (memoized, uniforms updated via refs)
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: uniformsRef.current,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

// ============================================================================
// PARTICLE SYSTEM (AMBIENT EFFECT)
// ============================================================================

interface ParticleProps {
  count?: number;
  state: OrbState;
  audioRef?: React.MutableRefObject<AudioAnalysis> | null;
  isAudioActive?: boolean;
}

function AmbientParticles({
  count = 50,
  state,
  audioRef,
  isAudioActive = false,
}: ParticleProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Smoothed particle state
  const particleState = useRef({
    opacity: 0.5,
    size: 0.05,
  });

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute particles in a sphere around the orb
      const radius = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.02 + Math.random() * 0.04;
    }

    return [positions, sizes];
  }, [count]);

  useFrame((frameState) => {
    if (!particlesRef.current || !materialRef.current) return;

    const time = frameState.clock.getElapsedTime();
    const ps = particleState.current;

    // Get audio data
    let amplitude = 0;
    let treble = 0;
    if (audioRef?.current && isAudioActive) {
      amplitude = audioRef.current.amplitude;
      treble = audioRef.current.treble;
    }

    // Particles react to audio
    const targetOpacity = 0.4 + amplitude * 0.4 + treble * 0.2;
    const targetSize = 0.04 + amplitude * 0.03;

    ps.opacity = THREE.MathUtils.lerp(ps.opacity, targetOpacity, 0.1);
    ps.size = THREE.MathUtils.lerp(ps.size, targetSize, 0.1);

    materialRef.current.opacity = ps.opacity;
    materialRef.current.size = ps.size;

    // Rotation affected by audio
    const rotationSpeed = 0.05 + amplitude * 0.03;
    particlesRef.current.rotation.y = time * rotationSpeed;
    particlesRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;
  });

  const particleColor = useMemo(() => {
    switch (state) {
      case 'listening': return '#00E5FF';
      case 'thinking': return '#a855f7';
      case 'speaking': return '#10b981';
      default: return '#7c3aed';
    }
  }, [state]);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.05}
        color={particleColor}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface FluidOrbProps {
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

export function FluidOrb({
  amplitude = 0,
  frequency = 0,
  state = 'idle',
  className = '',
  size = 'md',
  showParticles = true,
  audioRef = null,
  isAudioActive = false,
}: FluidOrbProps) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
    full: 'w-full h-full',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`${sizeClasses[size]} ${className}`}
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color="#00E5FF" />

        <Float
          speed={2}
          rotationIntensity={0.2}
          floatIntensity={0.3}
          floatingRange={[-0.1, 0.1]}
        >
          <OrbMesh
            amplitude={amplitude}
            frequency={frequency}
            state={state}
            audioRef={audioRef}
            isAudioActive={isAudioActive}
          />
        </Float>

        {showParticles && (
          <AmbientParticles
            state={state}
            audioRef={audioRef}
            isAudioActive={isAudioActive}
          />
        )}
      </Canvas>
    </motion.div>
  );
}

export default FluidOrb;
