'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Bot } from 'lucide-react';
import { FriendlyAgentCard } from './FriendlyAgentCard';
import { getClassicAgents, getRadicalAgents, type AgentPersona } from '@/lib/agents/personas-revolutionary';

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  category: string;
  status: 'active' | 'paused' | 'error';
  performanceScore: number;
}

// Map agent IDs to categories
const AGENT_CATEGORIES: Record<string, string> = {
  dexter: 'operations',
  cassie: 'support',
  emmie: 'marketing',
  aura: 'operations',
  nova: 'sales',
  kai: 'operations',
  lex: 'operations',
  finn: 'finance',
  ari: 'marketing',
  echo: 'support',
  vera: 'marketing',
  omni: 'operations',
  chaos: 'general',
  apex: 'general',
  rebel: 'general',
  phoenix: 'general',
  oracle: 'general',
  titan: 'operations',
};

export function FriendlyAgentsList() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(new Set(['dexter', 'cassie', 'emmie']));

  useEffect(() => {
    async function loadAgents() {
      try {
        const classicAgents = getClassicAgents();

        // Map to Agent type with status
        const mappedAgents: Agent[] = classicAgents.slice(0, 6).map(agent => ({
          id: agent.id,
          name: agent.name,
          avatar: agent.avatar,
          color: agent.color,
          category: AGENT_CATEGORIES[agent.id] || 'general',
          status: activeAgentIds.has(agent.id) ? 'active' : 'paused',
          performanceScore: 75 + Math.floor(Math.random() * 25),
        }));

        setAgents(mappedAgents);
      } catch (error) {
        console.error('[FriendlyAgentsList] Error loading agents:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAgents();
  }, [activeAgentIds]);

  const toggleAgent = (agentId: string) => {
    setActiveAgentIds(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });

    // Update agent status locally
    setAgents(prev => prev.map(agent =>
      agent.id === agentId
        ? { ...agent, status: agent.status === 'active' ? 'paused' : 'active' }
        : agent
    ));
  };

  const activeAgents = agents.filter(a => a.status === 'active');
  const pausedAgents = agents.filter(a => a.status === 'paused');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-surface rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-surface-elevated rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Meine Helfer</h2>
            <p className="text-sm text-text-muted">
              {activeAgents.length} aktiv • {pausedAgents.length} pausiert
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/revolution')}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neuer Agent
        </button>
      </div>

      {/* Active Agents */}
      {activeAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <FriendlyAgentCard
                agent={agent}
                onToggle={toggleAgent}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Paused Agents */}
      {pausedAgents.length > 0 && (
        <div>
          <p className="text-sm text-text-muted mb-3">Pausierte Agents:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pausedAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <FriendlyAgentCard
                  agent={agent}
                  onToggle={toggleAgent}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="text-center py-12 bg-surface-elevated rounded-xl border border-border">
          <Bot className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">Noch keine Agents</h3>
          <p className="text-text-muted mb-4">Erstelle deinen ersten Helfer!</p>
          <button
            onClick={() => router.push('/revolution')}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            Agent erstellen
          </button>
        </div>
      )}
    </section>
  );
}
