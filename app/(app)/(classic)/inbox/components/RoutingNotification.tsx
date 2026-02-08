'use client';

/**
 * RoutingNotification - Inline notification when agent is auto-routed
 *
 * Shows in the chat stream: "Routed to {AgentName} - {reasoning}"
 * with agent color accent and confidence badge.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { getAgentById } from '@/lib/agents/personas';
import { cn } from '@/lib/utils';

interface RoutingNotificationProps {
  agentId?: string;
  agentName: string;
  confidence: number;
  reasoning: string;
  previousAgent?: string;
  onDismiss?: () => void;
}

export function RoutingNotification({
  agentId,
  agentName,
  confidence,
  reasoning,
  previousAgent,
  onDismiss,
}: RoutingNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Get agent color - prefer agentId, fallback to name-based lookup
  const agentPersona = getAgentById(agentId || agentName.toLowerCase());
  const agentColor = agentPersona?.color || '#6b7280';

  const confidenceLabel = confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low';
  const confidenceColor = confidence >= 0.8 ? 'text-emerald-500 bg-emerald-500/10' : confidence >= 0.5 ? 'text-amber-500 bg-amber-500/10' : 'text-gray-500 bg-gray-500/10';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 mx-4 my-2 rounded-xl border transition-all duration-300',
        'bg-white/[0.03] border-white/[0.06]',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      {/* Routing icon */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: agentColor + '18' }}
      >
        <Zap className="w-3.5 h-3.5" style={{ color: agentColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs">
          {previousAgent && (
            <>
              <span className="text-white/40">{previousAgent}</span>
              <ArrowRight className="w-3 h-3 text-white/20" />
            </>
          )}
          <span className="font-medium" style={{ color: agentColor }}>
            {agentName}
          </span>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', confidenceColor)}>
            {confidenceLabel}
          </span>
        </div>
        <p className="text-[11px] text-white/40 truncate mt-0.5">
          {reasoning}
        </p>
      </div>
    </div>
  );
}
