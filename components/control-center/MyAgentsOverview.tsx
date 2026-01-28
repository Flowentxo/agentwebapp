'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  Play,
  Pause,
  Settings,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Headphones,
  Megaphone,
  Users,
  DollarSign,
  Zap,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { getClassicAgents, getRadicalAgents, type AgentPersona } from '@/lib/agents/personas-revolutionary';

type AgentCategory = 'sales' | 'support' | 'marketing' | 'hr' | 'finance' | 'operations' | 'general';

interface AgentWithStats extends AgentPersona {
  category: AgentCategory;
  isActive: boolean;
  todayStats?: {
    conversations: number;
    successRate: number;
    avgResponseTime: number;
  };
}

const CATEGORY_CONFIG: Record<AgentCategory, { label: string; icon: typeof Bot; color: string }> = {
  sales: { label: 'Vertrieb', icon: TrendingUp, color: '#10B981' },
  support: { label: 'Support', icon: Headphones, color: '#3B82F6' },
  marketing: { label: 'Marketing', icon: Megaphone, color: '#F59E0B' },
  hr: { label: 'HR', icon: Users, color: '#EC4899' },
  finance: { label: 'Finanzen', icon: DollarSign, color: '#06B6D4' },
  operations: { label: 'Betrieb', icon: Settings, color: '#8B5CF6' },
  general: { label: 'Allgemein', icon: Zap, color: '#6366F1' },
};

// Map agent IDs to categories
const AGENT_CATEGORIES: Record<string, AgentCategory> = {
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

export function MyAgentsOverview() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [customAgents, setCustomAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(new Set(['dexter', 'cassie', 'kai']));

  useEffect(() => {
    async function loadAgents() {
      try {
        // Load built-in agents
        const classicAgents = getClassicAgents();
        const radicalAgents = getRadicalAgents();
        const allBuiltIn = [...classicAgents, ...radicalAgents];

        // Map to AgentWithStats
        const agentsWithStats: AgentWithStats[] = allBuiltIn.map(agent => ({
          ...agent,
          category: AGENT_CATEGORIES[agent.id] || 'general',
          isActive: activeAgentIds.has(agent.id),
          todayStats: activeAgentIds.has(agent.id) ? {
            conversations: Math.floor(Math.random() * 50) + 5,
            successRate: Math.floor(Math.random() * 20) + 80,
            avgResponseTime: Math.floor(Math.random() * 3) + 1,
          } : undefined,
        }));

        setAgents(agentsWithStats);

        // Load custom agents
        const response = await fetch('/api/agents/custom');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCustomAgents(data.data || []);
          }
        }
      } catch (error) {
        console.error('[MyAgentsOverview] Failed to load agents:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAgents();
  }, [activeAgentIds]);

  const activeAgents = useMemo(() =>
    agents.filter(a => a.isActive),
  [agents]);

  const inactiveAgents = useMemo(() =>
    agents.filter(a => !a.isActive),
  [agents]);

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
  };

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-surface rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Meine Agents</h2>
            <p className="text-sm text-text-muted">
              {activeAgents.length} aktiv · {inactiveAgents.length} verfügbar
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/revolution')}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Neuer Agent
        </button>
      </div>

      {/* Active Agents */}
      <div className="p-6">
        {activeAgents.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted mb-4">Keine aktiven Agents</p>
            <button
              onClick={() => setShowInactive(true)}
              className="text-primary hover:text-primary-hover text-sm font-medium"
            >
              Agents aktivieren
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onToggle={toggleAgent}
                onView={() => router.push(`/agents/${agent.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom Agents */}
      {customAgents.length > 0 && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-text">Eigene Agents</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customAgents.map(agent => (
              <div
                key={agent.id}
                className="p-4 bg-surface rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/agents/${agent.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: `${agent.color}20` }}
                  >
                    {agent.icon || '🤖'}
                  </div>
                  <div>
                    <p className="font-medium text-text">{agent.name}</p>
                    <p className="text-xs text-text-muted">
                      {agent.status === 'active' ? 'Aktiv' : 'Entwurf'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Agents (Collapsible) */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm text-text-muted hover:bg-surface/50 transition-colors"
        >
          <span>
            Weitere {inactiveAgents.length} Agents verfügbar
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showInactive ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showInactive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {inactiveAgents.map(agent => (
                  <CompactAgentCard
                    key={agent.id}
                    agent={agent}
                    onActivate={() => toggleAgent(agent.id)}
                    onView={() => router.push(`/agents/${agent.id}`)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface AgentCardProps {
  agent: AgentWithStats;
  onToggle: (id: string) => void;
  onView: () => void;
}

function AgentCard({ agent, onToggle, onView }: AgentCardProps) {
  const categoryConfig = CATEGORY_CONFIG[agent.category];
  const CategoryIcon = categoryConfig.icon;

  return (
    <motion.div
      layout
      className="p-4 bg-surface rounded-lg border border-border hover:border-primary/30 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${agent.color}40, ${agent.color}20)` }}
          >
            {agent.avatar}
          </div>
          <div>
            <h3 className="font-semibold text-text">{agent.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CategoryIcon className="w-3 h-3" style={{ color: categoryConfig.color }} />
              <span className="text-xs text-text-muted">{categoryConfig.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400">Aktiv</span>
        </div>
      </div>

      {/* Today Stats */}
      {agent.todayStats && (
        <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-surface-elevated/50 rounded-lg">
          <div className="text-center">
            <MessageSquare className="w-3.5 h-3.5 mx-auto text-text-muted mb-1" />
            <p className="text-sm font-semibold text-text">{agent.todayStats.conversations}</p>
            <p className="text-xs text-text-muted">Chats</p>
          </div>
          <div className="text-center">
            <CheckCircle className="w-3.5 h-3.5 mx-auto text-green-400 mb-1" />
            <p className="text-sm font-semibold text-text">{agent.todayStats.successRate}%</p>
            <p className="text-xs text-text-muted">Erfolg</p>
          </div>
          <div className="text-center">
            <Clock className="w-3.5 h-3.5 mx-auto text-text-muted mb-1" />
            <p className="text-sm font-semibold text-text">{agent.todayStats.avgResponseTime}s</p>
            <p className="text-xs text-text-muted">Ø Zeit</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
        >
          Öffnen
        </button>
        <button
          onClick={() => onToggle(agent.id)}
          className="px-3 py-1.5 bg-surface-elevated hover:bg-red-500/10 text-text-muted hover:text-red-400 rounded-lg transition-colors"
          title="Pausieren"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

interface CompactAgentCardProps {
  agent: AgentWithStats;
  onActivate: () => void;
  onView: () => void;
}

function CompactAgentCard({ agent, onActivate, onView }: CompactAgentCardProps) {
  const categoryConfig = CATEGORY_CONFIG[agent.category];

  return (
    <div className="p-3 bg-surface rounded-lg border border-border hover:border-primary/30 transition-all group">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
          style={{ background: `${agent.color}20` }}
        >
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text text-sm truncate">{agent.name}</p>
          <p className="text-xs text-text-muted truncate">{agent.role}</p>
        </div>
        <button
          onClick={onActivate}
          className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Aktivieren"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
