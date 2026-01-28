'use client';

import { useState, useRef } from 'react';
import { AgentPersonality } from '@/lib/agents/personas-revolutionary';
import { RevolutionaryAvatar } from './RevolutionaryAvatar';
import { useMagneticCursor, useRippleEffect, useCardTilt } from '@/hooks/useAgentTheme';
import { useSoundEffects } from '@/lib/agents/sound-engine';
import { MessageSquare, Zap, Sparkles, ChevronRight } from 'lucide-react';

interface RevolutionaryAgentCardProps {
  personality: AgentPersonality;
  onOpenChat: (agentId: string) => void;
  icon?: string;
  showMetrics?: boolean;
  metrics?: {
    requests?: number;
    successRate?: number;
    avgTimeSec?: number;
  };
}

export function RevolutionaryAgentCard({
  personality,
  onOpenChat,
  icon,
  showMetrics = false,
  metrics
}: RevolutionaryAgentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Apply living effects
  useCardTilt(cardRef, 8);
  useMagneticCursor(buttonRef, 0.2);
  useRippleEffect(buttonRef);

  // Sound effects
  const sound = useSoundEffects();

  const handleHover = () => {
    setIsHovered(true);
    sound.playHover();
  };

  const handleClick = () => {
    sound.playAgentSound(personality.id, 'select');
    onOpenChat(personality.id);
  };

  const getEnergyIcon = () => {
    switch (personality.energy) {
      case 'high': return <Zap className="h-3 w-3" />;
      case 'medium': return <Sparkles className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div
      ref={cardRef}
      className="group relative overflow-hidden rounded-2xl transition-all duration-500 card-3d breathing micro-lift"
      onMouseEnter={handleHover}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: `linear-gradient(135deg, ${personality.colors.primary}08 0%, ${personality.colors.secondary}05 100%)`,
        border: `1px solid ${personality.colors.primary}20`,
        boxShadow: isHovered
          ? `0 20px 60px ${personality.colors.glow}, 0 0 0 1px ${personality.colors.primary}40`
          : `0 4px 20px rgba(0,0,0,0.1)`,
        animationDuration: personality.energy === 'high' ? '3s' :
                           personality.energy === 'medium' ? '5s' : '7s'
      }}
    >
      {/* Glow Background on Hover */}
      {isHovered && (
        <div
          className="absolute inset-0 opacity-20 blur-3xl transition-opacity duration-500"
          style={{
            background: personality.colors.gradient
          }}
        />
      )}

      {/* Content */}
      <div className="relative p-8">
        {/* Header with Avatar */}
        <div className="mb-6 flex items-start gap-4">
          <RevolutionaryAvatar
            personality={personality}
            size="lg"
            animated={true}
            showGlow={isHovered}
            icon={icon}
          />

          <div className="flex-1 min-w-0">
            {/* Title Badge */}
            <div
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 mb-2 text-xs font-bold tracking-wide"
              style={{
                background: `${personality.colors.primary}20`,
                color: personality.colors.primary,
                border: `1px solid ${personality.colors.primary}40`
              }}
            >
              {getEnergyIcon()}
              {personality.title}
            </div>

            {/* Name */}
            <h3
              className="text-2xl font-bold tracking-tight mb-1"
              style={{
                background: personality.colors.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {personality.name}
            </h3>

            {/* Rhythm Indicator */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{
                      backgroundColor: personality.colors.accent,
                      opacity: i < (personality.rhythm === 'fast' ? 3 : personality.rhythm === 'steady' ? 2 : 1) ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
              <span className="capitalize">{personality.rhythm} Rhythm</span>
            </div>
          </div>
        </div>

        {/* Motto */}
        <blockquote
          className="mb-6 border-l-4 pl-4 py-2 text-lg font-medium italic leading-relaxed"
          style={{
            borderColor: personality.colors.primary,
            color: 'rgb(var(--text))'
          }}
        >
          "{personality.motto}"
        </blockquote>

        {/* Traits */}
        <div className="mb-6 flex flex-wrap gap-2">
          {personality.traits.slice(0, 4).map((trait, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: `${personality.colors.secondary}15`,
                color: personality.colors.secondary,
                border: `1px solid ${personality.colors.secondary}30`
              }}
            >
              {trait}
            </span>
          ))}
        </div>

        {/* Superpowers Preview */}
        <div className="mb-6 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Superpowers
          </div>
          <div className="space-y-1">
            {personality.superpowers.slice(0, 2).map((power, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-text-muted">
                <div
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: personality.colors.accent }}
                />
                <span className="line-clamp-1">{power}</span>
              </div>
            ))}
            {personality.superpowers.length > 2 && (
              <div className="text-xs text-text-subtle">
                +{personality.superpowers.length - 2} more...
              </div>
            )}
          </div>
        </div>

        {/* Extra Weapon (Radical Agents Only) */}
        {personality.extraWeapon && personality.category === 'radical' && (
          <div className="mb-6 rounded-xl border-2 p-4" style={{
            borderColor: personality.colors.primary,
            background: `${personality.colors.primary}10`
          }}>
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: personality.colors.primary }} />
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: personality.colors.primary }}>
                Extrawaffe
              </div>
            </div>
            <p className="text-sm font-medium text-text">
              {personality.extraWeapon}
            </p>
          </div>
        )}

        {/* Challenge (Radical Agents Only) */}
        {personality.challenge && personality.category === 'radical' && (
          <div className="mb-6 border-l-4 pl-4 py-2" style={{
            borderColor: personality.colors.primary
          }}>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
              Challenge
            </div>
            <p className="text-sm font-bold italic" style={{ color: personality.colors.primary }}>
              "{personality.challenge}"
            </p>
          </div>
        )}

        {/* Metrics (Optional) */}
        {showMetrics && metrics && (
          <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl border border-white/10 bg-card/5 p-4">
            <div>
              <div className="text-xs text-text-muted">Requests</div>
              <div className="text-lg font-bold text-text">{metrics.requests?.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Success</div>
              <div className="text-lg font-bold" style={{ color: personality.colors.primary }}>
                {metrics.successRate}%
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Avg Time</div>
              <div className="text-lg font-bold text-text">{metrics.avgTimeSec}s</div>
            </div>
          </div>
        )}

        {/* CTA - Appears on Hover */}
        <button
          ref={buttonRef}
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold tracking-wide text-white shadow-lg transition-all duration-300 magnetic ripple-effect micro-bounce shine-effect"
          style={{
            background: personality.colors.gradient,
            opacity: isHovered ? 1 : 0.9,
            boxShadow: isHovered
              ? `0 10px 40px ${personality.colors.glow}`
              : `0 4px 20px ${personality.colors.glow}`
          }}
        >
          <MessageSquare className="h-5 w-5" />
          <span>Start Conversation</span>
          <ChevronRight
            className="h-5 w-5 transition-transform duration-300"
            style={{
              transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
            }}
          />
        </button>
      </div>

      {/* Corner Accent */}
      <div
        className="absolute top-0 right-0 h-32 w-32 opacity-10 blur-3xl transition-opacity duration-500"
        style={{
          background: personality.colors.gradient,
          opacity: isHovered ? 0.2 : 0.1
        }}
      />
    </div>
  );
}
