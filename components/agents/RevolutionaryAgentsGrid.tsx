'use client';

import { useState, useEffect } from 'react';
import { AgentPersonality, getAllPersonalities } from '@/lib/agents/personas-revolutionary';
import { RevolutionaryAgentCard } from './RevolutionaryAgentCard';
import { useRouter } from 'next/navigation';

interface RevolutionaryAgentsGridProps {
  filter?: {
    voice?: AgentPersonality['voice'];
    tone?: AgentPersonality['emotionalTone'];
    energy?: AgentPersonality['energy'];
  };
  showMetrics?: boolean;
}

interface AgentMetrics {
  requests: number;
  successRate: number;
  avgTimeSec: number;
}

// Fallback metrics (used if API fails)
const fallbackMetrics: Record<string, AgentMetrics> = {
  dexter: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  cassie: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  emmie: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  aura: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  nova: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  kai: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  lex: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  finn: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  ari: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  echo: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  vera: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  omni: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  chaos: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  apex: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  rebel: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  phoenix: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  oracle: { requests: 0, successRate: 100, avgTimeSec: 1.0 },
  titan: { requests: 0, successRate: 100, avgTimeSec: 1.0 }
};

const iconMap: Record<string, string> = {
  // Classic Agents
  dexter: 'BarChart3',
  cassie: 'MessageCircle',
  emmie: 'Lightbulb',
  aura: 'Workflow',
  nova: 'Star',
  kai: 'BookOpen',
  lex: 'Scale',
  finn: 'TrendingUp',
  ari: 'MessagesSquare',
  echo: 'Bell',
  vera: 'Eye',
  omni: 'Shield',

  // Radical Agents
  chaos: 'Flame', // Die Anarchistin
  apex: 'Target', // Der Unbarmherzige Perfektionist
  rebel: 'AlertTriangle', // Der Querdenker
  phoenix: 'TrendingUp', // Die Visionäre (rising from ashes)
  oracle: 'Eye', // Die Unbequeme Wahrheit
  titan: 'Cpu' // Der Unmenschliche
};

export function RevolutionaryAgentsGrid({
  filter,
  showMetrics = false
}: RevolutionaryAgentsGridProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Record<string, AgentMetrics>>(fallbackMetrics);
  const [metricsLoading, setMetricsLoading] = useState(true);

  let personalities = getAllPersonalities();

  // Apply filters
  if (filter) {
    if (filter.voice) {
      personalities = personalities.filter(p => p.voice === filter.voice);
    }
    if (filter.tone) {
      personalities = personalities.filter(p => p.emotionalTone === filter.tone);
    }
    if (filter.energy) {
      personalities = personalities.filter(p => p.energy === filter.energy);
    }
  }

  // Fetch real metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);

        // Fetch metrics for all agents in parallel
        const metricsPromises = personalities.map(p =>
          fetch(`/api/agents/${p.id}/metrics`, {
            headers: { 'x-user-id': 'demo-user' }
          })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );

        const allMetrics = await Promise.all(metricsPromises);

        // Build metrics map
        const metricsMap: Record<string, AgentMetrics> = {};
        personalities.forEach((p, index) => {
          const metric = allMetrics[index];
          if (metric && metric.agentId) {
            metricsMap[p.id] = {
              requests: metric.requests || 0,
              successRate: metric.successRate || 100,
              avgTimeSec: metric.avgTimeSec || 1.0
            };
          } else {
            // Use fallback if API failed
            metricsMap[p.id] = fallbackMetrics[p.id];
          }
        });

        setMetrics(metricsMap);
      } catch (error) {
        console.error('[REVOLUTIONARY_GRID] Failed to fetch metrics:', error);
        // Keep fallback metrics on error
      } finally {
        setMetricsLoading(false);
      }
    };

    if (showMetrics) {
      fetchMetrics();
    }
  }, [showMetrics, filter]); // Re-fetch when filter changes

  const handleOpenChat = (agentId: string) => {
    router.push(`/agents/${agentId}/chat`);
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {personalities.map((personality, index) => (
        <div
          key={personality.id}
          style={{
            animation: 'fadeInUp 0.6s ease-out',
            animationDelay: `${index * 0.1}s`,
            animationFillMode: 'both'
          }}
        >
          <RevolutionaryAgentCard
            personality={personality}
            onOpenChat={handleOpenChat}
            icon={iconMap[personality.id]}
            showMetrics={showMetrics}
            metrics={metrics[personality.id]}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
