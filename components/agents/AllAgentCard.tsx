'use client';

import { useState } from 'react';
import { Agent } from '@/hooks/useAgents';
import {
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface AllAgentCardProps {
  agent: Agent;
  onAction: (action: string, agent: Agent) => void;
}

export function AllAgentCard({ agent, onAction }: AllAgentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get icon component
  const IconComponent = agent.icon ? (LucideIcons as any)[agent.icon] || MessageSquare : MessageSquare;

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
      case 'healthy':
        return {
          dot: 'bg-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          text: 'text-green-400',
        };
      case 'disabled':
      case 'error':
        return {
          dot: 'bg-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          text: 'text-red-400',
        };
      case 'degraded':
        return {
          dot: 'bg-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          text: 'text-amber-400',
        };
      default:
        return {
          dot: 'bg-gray-400',
          bg: 'bg-muted/500/10',
          border: 'border-gray-500/20',
          text: 'text-muted-foreground',
        };
    }
  };

  const statusStyles = getStatusStyles(agent.status);
  const visibleTags = agent.tags?.slice(0, 3) || [];
  const hiddenTagsCount = (agent.tags?.length || 0) - 3;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 hover:scale-[1.02] animate-fade-in-up"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`flex items-center gap-1.5 rounded-lg border ${statusStyles.border} ${statusStyles.bg} px-2 py-1 backdrop-blur-sm`}>
          <div className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot} animate-pulse`} />
          <span className={`text-xs font-medium ${statusStyles.text}`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-8">
        {/* Avatar & Title */}
        <div className="mb-6 flex items-start gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{
              background: agent.color
                ? `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`
                : 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-secondary)))'
            }}
          >
            <IconComponent size={28} color="white" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-text leading-tight tracking-tight mb-1">
              {agent.name}
            </h3>
            <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          </div>
        </div>

        {/* Tags */}
        {agent.tags && agent.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {visibleTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-lg border border-white/10 bg-card/5 px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-white/20 hover:bg-card/10"
              >
                {tag}
              </span>
            ))}
            {hiddenTagsCount > 0 && (
              <span className="inline-flex items-center rounded-lg border border-white/10 bg-card/5 px-2.5 py-1 text-xs font-medium text-text-muted">
                +{hiddenTagsCount}
              </span>
            )}
          </div>
        )}

        {/* Primary Action - Appears on Hover */}
        <div
          className={`transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <button
            onClick={() => onAction('open', agent)}
            className="btn-premium w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent-secondary))] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[rgb(var(--accent))]/30 transition-all hover:shadow-xl hover:shadow-[rgb(var(--accent))]/40 hover:scale-105 active:scale-95"
            aria-label={`Open ${agent.name}`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Open & Chat</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}