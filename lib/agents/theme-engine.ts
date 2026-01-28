/**
 * REVOLUTIONARY THEME ENGINE
 *
 * Dynamically transforms the entire UI based on active agent.
 * This is not theming. This is immersion.
 */

import { AgentPersonality } from './personas-revolutionary';

export interface ThemeState {
  agentId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
  energy: 'high' | 'medium' | 'low';
  rhythm: 'fast' | 'steady' | 'slow';
  atmosphere: {
    backgroundPattern: string;
    particleCount: number;
    blurIntensity: number;
  };
}

/**
 * Apply agent theme to document root
 */
export function applyAgentTheme(personality: AgentPersonality) {
  const root = document.documentElement;

  // Primary Colors
  root.style.setProperty('--agent-primary', personality.colors.primary);
  root.style.setProperty('--agent-secondary', personality.colors.secondary);
  root.style.setProperty('--agent-accent', personality.colors.accent);
  root.style.setProperty('--agent-glow', personality.colors.glow);
  root.style.setProperty('--agent-gradient', personality.colors.gradient);

  // Energy-based variables
  const animationSpeed = personality.energy === 'high' ? '0.3s' :
                         personality.energy === 'medium' ? '0.5s' : '0.8s';
  root.style.setProperty('--agent-animation-speed', animationSpeed);

  // Rhythm-based pulse
  const pulseInterval = personality.rhythm === 'fast' ? '1s' :
                        personality.rhythm === 'steady' ? '2s' : '3s';
  root.style.setProperty('--agent-pulse-interval', pulseInterval);

  // Atmosphere intensity
  const glowIntensity = personality.energy === 'high' ? '40px' :
                       personality.energy === 'medium' ? '20px' : '10px';
  root.style.setProperty('--agent-glow-radius', glowIntensity);

  // Store current agent
  root.setAttribute('data-active-agent', personality.id);
  root.setAttribute('data-agent-energy', personality.energy);
  root.setAttribute('data-agent-tone', personality.emotionalTone);
}

/**
 * Reset to neutral theme
 */
export function resetTheme() {
  const root = document.documentElement;
  root.style.removeProperty('--agent-primary');
  root.style.removeProperty('--agent-secondary');
  root.style.removeProperty('--agent-accent');
  root.style.removeProperty('--agent-glow');
  root.style.removeProperty('--agent-gradient');
  root.removeAttribute('data-active-agent');
  root.removeAttribute('data-agent-energy');
  root.removeAttribute('data-agent-tone');
}

/**
 * Generate CSS cursor based on agent
 */
export function getAgentCursor(personality: AgentPersonality): string {
  // Create SVG cursor with agent color
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="8" fill="${personality.colors.primary}" filter="url(#glow)" opacity="0.8"/>
      <circle cx="16" cy="16" r="4" fill="white"/>
    </svg>
  `;

  const encoded = encodeURIComponent(svg);
  return `url('data:image/svg+xml,${encoded}') 16 16, auto`;
}

/**
 * Get particle configuration for agent
 */
export function getParticleConfig(personality: AgentPersonality) {
  return {
    count: personality.energy === 'high' ? 50 :
           personality.energy === 'medium' ? 30 : 15,
    speed: personality.rhythm === 'fast' ? 2 :
           personality.rhythm === 'steady' ? 1 : 0.5,
    color: personality.colors.accent,
    size: personality.emotionalTone === 'fierce' ? 4 : 2
  };
}

/**
 * Generate dynamic background based on agent
 */
export function getAgentBackground(personality: AgentPersonality): string {
  const baseOpacity = personality.energy === 'high' ? 0.15 :
                     personality.energy === 'medium' ? 0.1 : 0.05;

  return `
    radial-gradient(circle at 20% 50%, ${personality.colors.primary}${Math.round(baseOpacity * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, ${personality.colors.secondary}${Math.round(baseOpacity * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
    var(--background)
  `;
}

/**
 * Smooth transition between themes
 */
export function transitionToAgent(personality: AgentPersonality, duration: number = 1000) {
  const root = document.documentElement;

  // Add transition class
  root.classList.add('theme-transitioning');

  // Apply new theme
  applyAgentTheme(personality);

  // Remove transition class after duration
  setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, duration);
}

/**
 * Create ambient particles for agent
 */
export function createAgentParticles(
  container: HTMLElement,
  personality: AgentPersonality
): () => void {
  const config = getParticleConfig(personality);
  const particles: HTMLDivElement[] = [];

  for (let i = 0; i < config.count; i++) {
    const particle = document.createElement('div');
    particle.className = 'agent-particle';
    particle.style.cssText = `
      position: absolute;
      width: ${config.size}px;
      height: ${config.size}px;
      background: ${config.color};
      border-radius: 50%;
      pointer-events: none;
      opacity: ${Math.random() * 0.5 + 0.3};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: float ${10 / config.speed}s infinite ease-in-out;
      animation-delay: ${Math.random() * 5}s;
      filter: blur(1px);
    `;
    container.appendChild(particle);
    particles.push(particle);
  }

  // Cleanup function
  return () => {
    particles.forEach(p => p.remove());
  };
}
