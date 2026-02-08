'use client';

/**
 * Flowent Inbox v2 - System Message Component
 * Compact centered message for system events, handoffs, and workflow updates
 */

import React from 'react';
import {
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Zap,
  Play,
  Pause,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/inbox';

// System event types
export type SystemEventType =
  | 'handoff'
  | 'workflow_started'
  | 'workflow_resumed'
  | 'workflow_paused'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_step'
  | 'workflow_step_started'
  | 'workflow_step_completed'
  | 'workflow_step_failed'
  | 'agent_joined'
  | 'agent_left'
  | 'context_shared'
  | 'approval_granted'
  | 'approval_denied';

interface SystemMessageProps {
  message: ChatMessage;
  eventType?: SystemEventType;
}

// Icon mapping for event types
const eventIcons: Record<SystemEventType, React.ElementType> = {
  handoff: ArrowRight,
  workflow_started: Play,
  workflow_resumed: RefreshCw,
  workflow_paused: Pause,
  workflow_completed: CheckCircle2,
  workflow_failed: XCircle,
  agent_joined: Users,
  agent_left: Users,
  context_shared: Zap,
  workflow_step: ArrowRight,
  workflow_step_started: Play,
  workflow_step_completed: CheckCircle2,
  workflow_step_failed: XCircle,
  approval_granted: CheckCircle2,
  approval_denied: AlertCircle,
};

// Color mapping for event types
const eventColors: Record<SystemEventType, { icon: string; bg: string; border: string }> = {
  handoff: {
    icon: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  workflow_started: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  workflow_resumed: {
    icon: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  workflow_paused: {
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  workflow_completed: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  workflow_failed: {
    icon: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  agent_joined: {
    icon: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  agent_left: {
    icon: 'text-white/40',
    bg: 'bg-white/[0.04]',
    border: 'border-white/[0.06]',
  },
  context_shared: {
    icon: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  approval_granted: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  approval_denied: {
    icon: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  workflow_step: {
    icon: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  workflow_step_started: {
    icon: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  workflow_step_completed: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  workflow_step_failed: {
    icon: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

// Parse event type from message metadata or content
function parseEventType(message: ChatMessage): SystemEventType {
  // Check metadata first
  const metadataType = message.metadata?.eventType as SystemEventType | undefined;
  if (metadataType && eventIcons[metadataType]) {
    return metadataType;
  }

  // Parse from content
  const content = message.content.toLowerCase();
  if (content.includes('handed off') || content.includes('passed context') || content.includes('handoff')) {
    return 'handoff';
  }
  if (content.includes('workflow started') || content.includes('started workflow')) {
    return 'workflow_started';
  }
  if (content.includes('resumed') || content.includes('continuing')) {
    return 'workflow_resumed';
  }
  if (content.includes('paused') || content.includes('waiting')) {
    return 'workflow_paused';
  }
  if (content.includes('completed') || content.includes('finished')) {
    return 'workflow_completed';
  }
  if (content.includes('failed') || content.includes('error')) {
    return 'workflow_failed';
  }
  if (content.includes('joined')) {
    return 'agent_joined';
  }
  if (content.includes('left') || content.includes('departed')) {
    return 'agent_left';
  }
  if (content.includes('shared') || content.includes('context')) {
    return 'context_shared';
  }
  if (content.includes('approved') || content.includes('granted')) {
    return 'approval_granted';
  }
  if (content.includes('rejected') || content.includes('denied')) {
    return 'approval_denied';
  }

  // Default to handoff
  return 'handoff';
}

// Format timestamp
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function SystemMessage({ message, eventType: propEventType }: SystemMessageProps) {
  const eventType = propEventType || parseEventType(message);
  const Icon = eventIcons[eventType];
  const colors = eventColors[eventType];

  return (
    <div className="flex justify-center my-4">
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border',
          colors.bg,
          colors.border
        )}
      >
        <Icon className={cn('w-3.5 h-3.5', colors.icon)} />
        <span className="text-xs text-white/50">
          {message.content}
        </span>
        <span className="text-[10px] text-white/50">
          {formatTime(new Date(message.timestamp))}
        </span>
      </div>
    </div>
  );
}

// Day divider component
interface DayDividerProps {
  date: Date;
}

export function DayDivider({ date }: DayDividerProps) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;

  if (date.toDateString() === today.toDateString()) {
    label = 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = 'Yesterday';
  } else {
    label = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <span className="text-xs text-white/50 font-medium px-3 py-1 bg-[#111] rounded-full border border-white/[0.08]">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}
