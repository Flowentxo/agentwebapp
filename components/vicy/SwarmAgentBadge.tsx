'use client';

import { motion } from 'framer-motion';
import type { AgentPersona } from '@/lib/agents/personas';

export interface SwarmAgentState {
  agent: AgentPersona;
  status: 'thinking' | 'writing' | 'done';
  joinedAt: number;
}

interface SwarmAgentBadgeProps {
  state: SwarmAgentState;
  index: number;
  total: number;
}

export function SwarmAgentBadge({ state, index, total }: SwarmAgentBadgeProps) {
  const { agent, status } = state;

  // Calculate radial position around center
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  const radius = 80;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x, y }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="absolute flex flex-col items-center gap-1"
      style={{ left: '50%', top: '50%', marginLeft: -16, marginTop: -16 }}
    >
      {/* Agent avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white relative"
        style={{ backgroundColor: agent.color }}
      >
        {agent.name.charAt(0)}

        {/* Status: thinking = ping */}
        {status === 'thinking' && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: agent.color }}
          />
        )}

        {/* Status: writing = pulsing border */}
        {status === 'writing' && (
          <div
            className="absolute -inset-0.5 rounded-full border-2 animate-pulse"
            style={{ borderColor: agent.color }}
          />
        )}

        {/* Status: done = green dot */}
        {status === 'done' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-zinc-900" />
        )}
      </div>

      {/* Agent name */}
      <span className="text-[9px] font-medium whitespace-nowrap" style={{ color: agent.color }}>
        {agent.name}
      </span>
    </motion.div>
  );
}
