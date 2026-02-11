'use client';

/**
 * LivePulse Component - WhatsApp-Style Execution Feed
 *
 * Transforms ExecutionStep data into conversational German chat bubbles.
 * Replaces LiveStepTracker with a more intuitive, message-based UX.
 *
 * Part of Phase III: Operational Cockpit
 */

import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExecutionStep } from './LiveStepTracker';

// ============================================
// TYPES
// ============================================

interface LivePulseProps {
  steps: ExecutionStep[];
  isRunning: boolean;
  isDryRun?: boolean;
  activeNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

interface PulseMessage {
  id: string;
  nodeId: string;
  emoji: string;
  text: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'pending';
}

// ============================================
// MESSAGE TEMPLATES (German)
// ============================================

function stepToMessages(step: ExecutionStep): PulseMessage[] {
  const messages: PulseMessage[] = [];
  const nodeName = step.nodeName || step.nodeId;
  const nodeType = (step.nodeType || '').toLowerCase();
  const ts = step.startedAt || new Date().toISOString();

  // Running message
  if (step.status === 'running') {
    let emoji = '⚡';
    let text = `${nodeName} wird ausgeführt...`;

    if (nodeType.includes('trigger')) {
      emoji = '🚀';
      text = `Trigger ausgelöst: ${nodeName}`;
    } else if (nodeType.includes('agent')) {
      emoji = '🤖';
      text = `Agent ${nodeName} analysiert...`;
    } else if (nodeType.includes('email')) {
      emoji = '📧';
      text = `E-Mail wird vorbereitet...`;
    } else if (nodeType.includes('condition')) {
      emoji = '🔀';
      text = `Bedingung wird geprüft: ${nodeName}`;
    } else if (nodeType.includes('transform')) {
      emoji = '🔄';
      text = `Daten werden transformiert...`;
    } else if (nodeType.includes('delay')) {
      emoji = '⏳';
      text = `Wartezeit: ${nodeName}`;
    } else if (nodeType.includes('approval') || nodeType.includes('human')) {
      emoji = '✋';
      text = `Warte auf deine Freigabe`;
    }

    messages.push({
      id: `${step.id}-running`,
      nodeId: step.nodeId,
      emoji,
      text,
      timestamp: ts,
      type: 'info',
    });
  }

  // Success message
  if (step.status === 'success') {
    let emoji = '✅';
    let text = `${nodeName} abgeschlossen`;

    if (nodeType.includes('trigger')) {
      emoji = '✅';
      text = `Trigger erfolgreich: Neue Daten empfangen`;
    } else if (nodeType.includes('agent')) {
      emoji = '✅';
      text = `${nodeName}: Analyse abgeschlossen`;
      if (step.tokensUsed) {
        text += ` (${step.tokensUsed} Tokens)`;
      }
    } else if (nodeType.includes('email')) {
      emoji = '📬';
      text = `E-Mail erfolgreich gesendet`;
    } else if (nodeType.includes('condition')) {
      emoji = '✅';
      text = `Bedingung ausgewertet: ${nodeName}`;
    } else if (nodeType.includes('approval') || nodeType.includes('human')) {
      emoji = '👍';
      text = `Freigabe erteilt`;
    }

    if (step.durationMs) {
      text += ` · ${step.durationMs}ms`;
    }

    messages.push({
      id: `${step.id}-success`,
      nodeId: step.nodeId,
      emoji,
      text,
      timestamp: step.completedAt || ts,
      type: 'success',
    });
  }

  // Error message
  if (step.status === 'error') {
    messages.push({
      id: `${step.id}-error`,
      nodeId: step.nodeId,
      emoji: '❌',
      text: `Fehler: ${step.error || nodeName + ' fehlgeschlagen'}`,
      timestamp: step.completedAt || ts,
      type: 'error',
    });

    if (step.suggestedFix) {
      messages.push({
        id: `${step.id}-fix`,
        nodeId: step.nodeId,
        emoji: '💡',
        text: step.suggestedFix,
        timestamp: step.completedAt || ts,
        type: 'warning',
      });
    }
  }

  // Suspended message
  if (step.status === 'suspended') {
    messages.push({
      id: `${step.id}-suspended`,
      nodeId: step.nodeId,
      emoji: '✋',
      text: `Warte auf deine Freigabe für: ${nodeName}`,
      timestamp: ts,
      type: 'pending',
    });
  }

  return messages;
}

// ============================================
// TIME FORMATTER
// ============================================

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

// ============================================
// MESSAGE BUBBLE
// ============================================

function PulseBubble({
  message,
  onNodeClick,
}: {
  message: PulseMessage;
  onNodeClick?: (nodeId: string) => void;
}) {
  const typeStyles = {
    info: 'bg-white/[0.03] border-white/[0.06]',
    success: 'bg-emerald-500/5 border-emerald-500/10',
    warning: 'bg-amber-500/5 border-amber-500/10',
    error: 'bg-red-500/5 border-red-500/10',
    pending: 'bg-violet-500/5 border-violet-500/10',
  };

  const textStyles = {
    info: 'text-white/70',
    success: 'text-emerald-300/80',
    warning: 'text-amber-300/80',
    error: 'text-red-300/80',
    pending: 'text-violet-300/80',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'px-3 py-2 rounded-xl border cursor-pointer hover:brightness-110 transition-all',
        typeStyles[message.type]
      )}
      onClick={() => onNodeClick?.(message.nodeId)}
    >
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0 mt-0.5">{message.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm leading-relaxed', textStyles[message.type])}>
            {message.text}
          </p>
          <p className="text-[10px] text-white/20 mt-1">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LivePulse({
  steps,
  isRunning,
  isDryRun = false,
  activeNodeId,
  onNodeClick,
}: LivePulseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate messages from steps
  const messages = useMemo(() => {
    const allMessages: PulseMessage[] = [];
    for (const step of steps) {
      allMessages.push(...stepToMessages(step));
    }
    // Deduplicate by id
    const seen = new Set<string>();
    return allMessages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [steps]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            {isDryRun ? 'Test-Modus' : 'Live Pulse'}
          </span>
        </div>
        {messages.length > 0 && (
          <span className="text-[10px] text-white/20">
            {messages.length} {messages.length === 1 ? 'Nachricht' : 'Nachrichten'}
          </span>
        )}
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        <AnimatePresence>
          {messages.map((message) => (
            <PulseBubble key={message.id} message={message} onNodeClick={onNodeClick} />
          ))}
        </AnimatePresence>

        {/* Typing indicator when running and no recent messages */}
        {isRunning && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
          </motion.div>
        )}
      </div>

      {/* Empty State */}
      {messages.length === 0 && !isRunning && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-white/20 text-center">
            Starten Sie die Pipeline, um den Live-Feed zu sehen
          </p>
        </div>
      )}
    </div>
  );
}

export default LivePulse;
