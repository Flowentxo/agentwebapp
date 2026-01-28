'use client';

import { Agent } from '@/hooks/useAgents';
import { AllAgentCard } from './AllAgentCard';

interface AllAgentsGridProps {
  items: Agent[];
  onAction: (action: string, agent: Agent) => void;
  loading?: boolean;
}

export function AllAgentsGrid({ items, onAction, loading }: AllAgentsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-card/5 p-8 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-card/10" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 rounded bg-card/10" />
                <div className="h-4 w-full rounded bg-card/10" />
                <div className="h-4 w-3/4 rounded bg-card/10" />
              </div>
            </div>
            <div className="flex gap-2 mb-6">
              <div className="h-6 w-16 rounded-lg bg-card/10" />
              <div className="h-6 w-20 rounded-lg bg-card/10" />
              <div className="h-6 w-14 rounded-lg bg-card/10" />
            </div>
            <div className="h-10 w-full rounded-xl bg-card/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {items.map((agent, index) => (
        <div key={agent.id} style={{ animationDelay: `${index * 0.05}s` }}>
          <AllAgentCard agent={agent} onAction={onAction} />
        </div>
      ))}
    </div>
  );
}