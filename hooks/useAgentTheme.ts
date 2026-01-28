import { useEffect, useCallback } from 'react';
import { AgentPersonality } from '@/lib/agents/personas-revolutionary';
import {
  applyAgentTheme,
  resetTheme,
  transitionToAgent,
  createAgentParticles
} from '@/lib/agents/theme-engine';

/**
 * Hook to manage agent theme
 */
export function useAgentTheme(personality: AgentPersonality | null, options?: {
  enableParticles?: boolean;
  transitionDuration?: number;
}) {
  const { enableParticles = false, transitionDuration = 1000 } = options || {};

  // Apply theme when personality changes
  useEffect(() => {
    if (!personality) {
      resetTheme();
      return;
    }

    transitionToAgent(personality, transitionDuration);
  }, [personality, transitionDuration]);

  // Create particles if enabled
  useEffect(() => {
    if (!enableParticles || !personality) return;

    const container = document.getElementById('particle-container');
    if (!container) return;

    const cleanup = createAgentParticles(container, personality);
    return cleanup;
  }, [enableParticles, personality]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetTheme();
  }, []);

  return {
    applyTheme: useCallback((p: AgentPersonality) => {
      transitionToAgent(p, transitionDuration);
    }, [transitionDuration]),
    resetTheme
  };
}

/**
 * Hook for magnetic cursor effect
 */
export function useMagneticCursor(ref: React.RefObject<HTMLElement>, strength: number = 0.3) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      element.style.setProperty('--magnetic-x', `${deltaX}px`);
      element.style.setProperty('--magnetic-y', `${deltaY}px`);
      element.setAttribute('data-magnetic', 'active');
    };

    const handleMouseLeave = () => {
      element.style.setProperty('--magnetic-x', '0px');
      element.style.setProperty('--magnetic-y', '0px');
      element.removeAttribute('data-magnetic');
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, strength]);
}

/**
 * Hook for ripple effect on click
 */
export function useRippleEffect(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleClick = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      element.style.setProperty('--ripple-x', `${x}%`);
      element.style.setProperty('--ripple-y', `${y}%`);
      element.classList.add('active');

      setTimeout(() => {
        element.classList.remove('active');
      }, 600);
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }, [ref]);
}

/**
 * Hook for 3D card tilt effect
 */
export function useCardTilt(ref: React.RefObject<HTMLElement>, intensity: number = 10) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rotateY = ((e.clientX - centerX) / rect.width) * intensity;
      const rotateX = -((e.clientY - centerY) / rect.height) * intensity;

      element.style.setProperty('--rotate-x', `${rotateX}deg`);
      element.style.setProperty('--rotate-y', `${rotateY}deg`);
    };

    const handleMouseLeave = () => {
      element.style.setProperty('--rotate-x', '0deg');
      element.style.setProperty('--rotate-y', '0deg');
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, intensity]);
}
