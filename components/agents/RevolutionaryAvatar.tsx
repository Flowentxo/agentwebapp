'use client';

import { useState, useEffect } from 'react';
import { AgentPersonality } from '@/lib/agents/personas-revolutionary';
import * as LucideIcons from 'lucide-react';
import { MessageSquare } from 'lucide-react';

interface RevolutionaryAvatarProps {
  personality: AgentPersonality;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showGlow?: boolean;
  icon?: string;
}

const sizeMap = {
  sm: { container: 48, icon: 20 },
  md: { container: 64, icon: 28 },
  lg: { container: 96, icon: 40 },
  xl: { container: 128, icon: 56 }
};

export function RevolutionaryAvatar({
  personality,
  size = 'md',
  animated = true,
  showGlow = true,
  icon
}: RevolutionaryAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  const sizes = sizeMap[size];
  const IconComponent = icon ? (LucideIcons as any)[icon] || MessageSquare : MessageSquare;

  // Pulse animation for high-energy agents
  useEffect(() => {
    if (!animated || personality.energy !== 'high') return;

    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 3);
    }, 1000);

    return () => clearInterval(interval);
  }, [animated, personality.energy]);

  const getAnimationStyles = () => {
    if (!animated) return {};

    const baseTransform = isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)';

    if (personality.energy === 'high') {
      return {
        transform: `${baseTransform} ${pulsePhase === 1 ? 'scale(1.05)' : ''}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }

    return {
      transform: baseTransform,
      transition: 'all 0.4s ease'
    };
  };

  const glowIntensity = isHovered ? 1 : 0.6;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: sizes.container,
        height: sizes.container
      }}
    >
      {/* Glow Effect */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-xl transition-opacity duration-500"
          style={{
            background: personality.colors.gradient,
            opacity: glowIntensity * 0.4,
            transform: isHovered ? 'scale(1.3)' : 'scale(1.1)'
          }}
        />
      )}

      {/* Main Avatar Container */}
      <div
        className="relative flex items-center justify-center rounded-full shadow-2xl"
        style={{
          width: '100%',
          height: '100%',
          background: personality.colors.gradient,
          ...getAnimationStyles()
        }}
      >
        {/* Icon */}
        <IconComponent
          size={sizes.icon}
          color="white"
          strokeWidth={1.5}
          className="relative z-10"
        />

        {/* Energy Ring (for high-energy agents) */}
        {animated && personality.energy === 'high' && (
          <div
            className="absolute inset-0 rounded-full border-2 animate-ping"
            style={{
              borderColor: personality.colors.accent,
              opacity: 0.3
            }}
          />
        )}

        {/* Hover Ring */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: 'white',
              opacity: 0.5,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        )}
      </div>

      {/* Status Indicator (bottom right) */}
      <div
        className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[rgb(var(--background))]"
        style={{
          backgroundColor: personality.colors.accent,
          boxShadow: `0 0 10px ${personality.colors.glow}`
        }}
      />
    </div>
  );
}
