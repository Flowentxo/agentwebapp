"use client";

import { CheckCircle, AlertTriangle, OctagonX, Activity, Clock } from 'lucide-react';
import { formatNumber, formatPercent, formatSeconds } from '@/lib/format-de';

export type Agent = {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'error';
  requests: number;
  successRate: number;
  avgTimeSec: number;
  tags: string[];
  description?: string;
  trend?: string;
  // Build/Completion status fields
  buildStatus?: 'complete' | 'incomplete' | 'deprecated';
  state?: 'ready' | 'draft' | 'disabled';
  isComplete?: boolean;
  enabled?: boolean;
  endpoints?: { primary?: string };
  health?: { uptimePct?: number };
  tools?: string[];
  version?: string;
};

interface AgentsTableProps {
  agents: Agent[];
  onOpen: (agent: Agent) => void;
  selectedId?: string;
}

const statusConfig = {
  healthy: {
    dot: 'bg-success',
    label: 'OK',
    icon: CheckCircle,
    textColor: 'text-success',
  },
  degraded: {
    dot: 'bg-warning',
    label: 'Eingeschränkt',
    icon: AlertTriangle,
    textColor: 'text-warning',
  },
  error: {
    dot: 'bg-error',
    label: 'Fehler',
    icon: OctagonX,
    textColor: 'text-error',
  },
};

// Local formatter for abbreviated numbers (requests display)
const formatNumberAbbrev = (num: number): string => {
  const formatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  if (num >= 1000000) return `${formatter.format(num / 1000000)} Mio.`;
  if (num >= 1000) return `${formatter.format(num / 1000)} Tsd.`;
  return formatter.format(num);
};

export function AgentsTable({ agents, onOpen, selectedId }: AgentsTableProps) {
  const handleRowClick = (agent: Agent) => {
    onOpen(agent);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, agent: Agent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(agent);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table
        className="w-full border-collapse"
        role="table"
        aria-label="Agents Übersicht"
      >
        <caption className="sr-only">
          Liste aller Agents mit Status, Metriken und Tags
        </caption>
        <thead>
          <tr className="border-b border-white/10 bg-surface-2">
            <th className="w-12 px-3 py-2.5 text-left">
              <span className="sr-only">Status</span>
              {/* Legend: OK · Eingeschränkt · Fehler */}
              <div className="flex items-center gap-1.5 text-[10px] text-text-subtle">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  OK
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Ein
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-error" />
                  Err
                </span>
              </div>
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted">
              Name
            </th>
            <th className="w-24 px-3 py-2.5 text-right text-xs font-medium text-text-muted">
              Anfragen
            </th>
            <th className="w-24 px-3 py-2.5 text-right text-xs font-medium text-text-muted">
              Erfolg
            </th>
            <th className="w-20 px-3 py-2.5 text-right text-xs font-medium text-text-muted">
              Ø Zeit
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted">
              Tags
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-12 text-center text-sm text-text-muted">
                Keine Agents gefunden
              </td>
            </tr>
          ) : (
            agents.map((agent) => {
              const statusCfg = statusConfig[agent.status];
              const isSelected = selectedId === agent.id;

              return (
                <tr
                  key={agent.id}
                  className={`
                    group cursor-pointer border-b border-white/6 transition-colors
                    hover:bg-card/[0.03] focus-within:bg-card/[0.04]
                    ${isSelected ? 'bg-card/[0.05]' : ''}
                  `}
                  onClick={() => handleRowClick(agent)}
                  onKeyDown={(e) => handleRowKeyDown(e, agent)}
                  tabIndex={0}
                  role="row"
                  aria-label={`${agent.name} - ${statusCfg.label}`}
                  aria-selected={isSelected}
                  aria-controls="agent-details"
                >
                  {/* Status: Only Dot */}
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${statusCfg.dot}`}
                      aria-label={statusCfg.label}
                      title={statusCfg.label}
                    />
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-text">
                        {agent.name}
                      </span>
                      {agent.description && (
                        <span className="text-xs text-text-muted line-clamp-1">
                          {agent.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Anfragen */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-sm font-medium tabular-nums text-text">
                      {formatNumberAbbrev(agent.requests)}
                    </span>
                  </td>

                  {/* Erfolgsrate */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        agent.successRate >= 95
                          ? 'text-success'
                          : agent.successRate >= 80
                          ? 'text-warning'
                          : 'text-error'
                      }`}
                    >
                      {formatPercent(agent.successRate, 1)}
                    </span>
                  </td>

                  {/* Ø Zeit */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-sm font-medium tabular-nums text-text">
                      {formatSeconds(agent.avgTimeSec, 1)}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {agent.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded border border-white/8 bg-card/5 px-2 py-0.5 text-xs text-text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                      {agent.tags.length > 2 && (
                        <span className="inline-flex items-center text-xs text-text-subtle">
                          +{agent.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
