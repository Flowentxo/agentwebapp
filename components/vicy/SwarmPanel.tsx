'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { SwarmAgentBadge, type SwarmAgentState } from './SwarmAgentBadge';
import { getAgentById } from '@/lib/agents/personas';
import { useInboxSocket } from '@/lib/socket';

interface SwarmPanelProps {
  threadId: string | null;
  prompt: string | null;
  onReady: () => void;
}

const STATUS_MESSAGES = {
  analyzing: 'Analysiere deine Anfrage...',
  routing: 'Finde den richtigen Experten...',
  complete: 'Dein Experte arbeitet an der Antwort...',
};

export function SwarmPanel({ threadId, prompt, onReady }: SwarmPanelProps) {
  const { onTypingStart, onAgentRouted, onNewMessage } = useInboxSocket();
  const [activeAgents, setActiveAgents] = useState<Map<string, SwarmAgentState>>(new Map());
  const [orchestratorStatus, setOrchestratorStatus] = useState<'analyzing' | 'routing' | 'complete'>('analyzing');

  // Listen for socket events
  useEffect(() => {
    if (!threadId) return;

    // Agent starts typing -> joins swarm as 'thinking'
    const unsubTyping = onTypingStart((indicator) => {
      if (indicator.threadId !== threadId) return;
      const agent = getAgentById(indicator.agentId);
      if (!agent) return;

      setActiveAgents((prev) => {
        const next = new Map(prev);
        next.set(indicator.agentId, {
          agent,
          status: 'thinking',
          joinedAt: Date.now(),
        });
        return next;
      });
    });

    // Agent routed -> update status
    const unsubRouted = onAgentRouted((data) => {
      if (data.threadId !== threadId) return;
      setOrchestratorStatus('routing');

      const agent = getAgentById(data.agentId);
      if (agent) {
        setActiveAgents((prev) => {
          const next = new Map(prev);
          next.set(data.agentId, {
            agent,
            status: 'writing',
            joinedAt: Date.now(),
          });
          return next;
        });
      }
    });

    // First message arrives -> transition to chat
    const unsubMessage = onNewMessage((message) => {
      if (message.threadId !== threadId) return;
      if (message.role === 'agent') {
        setOrchestratorStatus('complete');
        // Small delay so user sees the transition
        setTimeout(() => onReady(), 600);
      }
    });

    return () => {
      unsubTyping();
      unsubRouted();
      unsubMessage();
    };
  }, [threadId, onTypingStart, onAgentRouted, onNewMessage, onReady]);

  // Auto-advance to 'routing' after 2s if still analyzing (in case no socket events arrive)
  useEffect(() => {
    if (orchestratorStatus !== 'analyzing') return;
    const timer = setTimeout(() => setOrchestratorStatus('routing'), 2000);
    return () => clearTimeout(timer);
  }, [orchestratorStatus]);

  // Fallback: if no socket events after 8s, transition to chat anyway
  useEffect(() => {
    const timer = setTimeout(() => onReady(), 8000);
    return () => clearTimeout(timer);
  }, [onReady]);

  const agentArray = Array.from(activeAgents.values());

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Swarm Visualization */}
      <div className="relative w-[240px] h-[240px] flex items-center justify-center mb-8">
        {/* Center: Omni Orb */}
        <div className="swarm-center-orb w-12 h-12 rounded-full flex items-center justify-center bg-violet-600/20 border border-violet-500/30">
          <Bot className="w-6 h-6 text-violet-400" />
        </div>

        {/* Satellite Agent Badges */}
        <AnimatePresence>
          {agentArray.map((state, i) => (
            <SwarmAgentBadge
              key={state.agent.id}
              state={state}
              index={i}
              total={agentArray.length}
            />
          ))}
        </AnimatePresence>

        {/* Subtle ring around center */}
        <div className="absolute inset-0 rounded-full border border-violet-500/10 pointer-events-none" />
        <div
          className="absolute rounded-full border border-violet-500/5 pointer-events-none"
          style={{ inset: '-20px' }}
        />
      </div>

      {/* Status Text */}
      <motion.p
        key={orchestratorStatus}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-white/70 mb-2"
      >
        {STATUS_MESSAGES[orchestratorStatus]}
      </motion.p>

      <p className="text-xs text-white/30 mb-6">
        Beschreibe dein Anliegen — Omni findet den passenden Experten.
      </p>

      {/* User's prompt */}
      {prompt && (
        <div className="max-w-[400px] px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-white/40 line-clamp-2 text-center">{prompt}</p>
        </div>
      )}
    </motion.div>
  );
}
