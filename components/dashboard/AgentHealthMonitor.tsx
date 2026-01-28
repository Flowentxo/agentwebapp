'use client';

import { useState, useEffect } from 'react';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';

interface AgentHealth {
  agentId: string;
  status: 'online' | 'busy' | 'idle';
  uptime: number; // percentage
  tasksCompleted: number;
  responseTime: number; // ms
}

export function AgentHealthMonitor() {
  const [agentsHealth, setAgentsHealth] = useState<AgentHealth[]>([]);

  const agents = Object.values(REVOLUTIONARY_PERSONAS).slice(0, 12);

  // Initialize agent health
  useEffect(() => {
    const initialHealth: AgentHealth[] = agents.map(agent => ({
      agentId: agent.id,
      status: Math.random() > 0.3 ? 'online' : 'idle',
      uptime: 95 + Math.random() * 5,
      tasksCompleted: Math.floor(Math.random() * 50),
      responseTime: 200 + Math.random() * 300
    }));

    setAgentsHealth(initialHealth);

    // Update health periodically
    const interval = setInterval(() => {
      setAgentsHealth(prev =>
        prev.map(health => ({
          ...health,
          status: Math.random() > 0.7 ? 'busy' : health.status,
          tasksCompleted: health.tasksCompleted + (Math.random() > 0.5 ? 1 : 0),
          responseTime: 200 + Math.random() * 300
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: AgentHealth['status']) => {
    switch (status) {
      case 'online': return { bg: '#34d39920', border: '#34d39940', text: '#34d399', dot: '#34d399' };
      case 'busy': return { bg: '#fbbf2420', border: '#fbbf2440', text: '#fbbf24', dot: '#fbbf24' };
      case 'idle': return { bg: '#6b728020', border: '#6b728040', text: '#6b7280', dot: '#6b7280' };
      default: return { bg: '#6b728020', border: '#6b728040', text: '#6b7280', dot: '#6b7280' };
    }
  };

  const getStatusIcon = (status: AgentHealth['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-3 w-3" />;
      case 'busy': return <Activity className="h-3 w-3 animate-pulse" />;
      case 'idle': return <AlertCircle className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const overallHealth = agentsHealth.length > 0
    ? Math.round(agentsHealth.reduce((sum, h) => sum + h.uptime, 0) / agentsHealth.length)
    : 0;

  const onlineCount = agentsHealth.filter(h => h.status === 'online').length;

  return (
    <div className="rounded-2xl border border-white/10 bg-card/5 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-text">System Health</h3>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-text">{overallHealth}%</div>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Overall Stats */}
      <div className="mb-4 rounded-xl border border-white/10 bg-card/5 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-text-muted">Agents Online</div>
            <div className="text-2xl font-bold text-text">{onlineCount}/{agentsHealth.length}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Avg Uptime</div>
            <div className="text-2xl font-bold text-text">{overallHealth}%</div>
          </div>
        </div>

        {/* Uptime Bar */}
        <div className="mt-3 h-2 rounded-full bg-card/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
            style={{ width: `${overallHealth}%` }}
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {agentsHealth.map((health, index) => {
          const agent = agents.find(a => a.id === health.agentId);
          if (!agent) return null;

          const colors = getStatusColor(health.status);

          return (
            <div
              key={health.agentId}
              className="flex items-center justify-between rounded-lg border p-2 transition-all duration-300 hover:bg-card/5 animate-fadeInUp"
              style={{
                background: colors.bg,
                borderColor: colors.border,
                animationDelay: `${index * 0.05}s`
              }}
            >
              {/* Agent Name & Status */}
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full breathing-fast"
                  style={{ backgroundColor: colors.dot }}
                />
                <span className="text-sm font-medium text-text">{agent.name}</span>
                <span
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium capitalize"
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  {getStatusIcon(health.status)}
                  {health.status}
                </span>
              </div>

              {/* Mini Stats */}
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <div>
                  <span className="font-medium text-text">{health.tasksCompleted}</span> tasks
                </div>
                <div className="h-3 w-px bg-card/10" />
                <div>
                  <span className="font-medium text-text">{Math.round(health.uptime)}%</span> up
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
