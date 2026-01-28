'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

export type Agent = {
  id: string;
  name: string;
  status: 'ok' | 'degraded' | 'error';
  requests24h: number;
  successRate24h: number;
  avgTimeMs24h: number;
  tags?: string[];
  buildStatus?: 'complete' | 'incomplete' | 'deprecated';
  state?: 'ready' | 'draft';
  isComplete?: boolean;
};

interface TopAgentsCompactProps {
  agents: Agent[];
  onOpen?: (id: string) => void;
}

type SortKey = 'name' | 'requests24h' | 'successRate24h' | 'avgTimeMs24h';

function getStatusColor(status: Agent['status']) {
  switch (status) {
    case 'ok':
      return 'bg-success';
    case 'degraded':
      return 'bg-warning';
    case 'error':
      return 'bg-error';
  }
}

function getStatusLabel(status: Agent['status']) {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'degraded':
      return 'Eingeschränkt';
    case 'error':
      return 'Fehler';
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace('.', ',')} Mio.`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace('.', ',')} Tsd.`;
  }
  return num.toString();
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(1).replace('.', ',')} %`;
}

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  }
  return `${ms} ms`;
}

export function TopAgentsCompact({ agents, onOpen }: TopAgentsCompactProps) {
  const [sortKey, setSortKey] = useState<SortKey>('requests24h');
  const [sortAsc, setSortAsc] = useState(false);

  // Sort agents
  const sortedAgents = useMemo(() => {
    const sorted = [...agents].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      }

      if (sortAsc) {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Limit to top 10
    return sorted.slice(0, 10);
  }, [agents, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name'); // Default asc for name, desc for numbers
    }
  };

  const SortButton = ({
    sortKey: key,
    children,
  }: {
    sortKey: SortKey;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(key)}
      className="group flex items-center gap-1 font-medium text-text-muted transition-colors hover:text-text"
      aria-label={`Sortieren nach ${children}`}
    >
      {children}
      <ArrowUpDown
        className={`h-3.5 w-3.5 transition-opacity ${
          sortKey === key ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        }`}
      />
    </button>
  );

  return (
    <div className="panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Top-Agents</h3>
          <p className="text-xs text-text-muted">
            Zeigt die {sortedAgents.length} aktivsten Agents
          </p>
        </div>

        <Link
          href="/agents"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-card/10"
        >
          Alle Agents ansehen
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs">
              <th className="pb-3 pr-4 font-medium">
                <SortButton sortKey="name">Agent</SortButton>
              </th>
              <th className="pb-3 px-4 font-medium">Status</th>
              <th className="pb-3 px-4 text-right font-medium">
                <SortButton sortKey="requests24h">Anfragen 24h</SortButton>
              </th>
              <th className="pb-3 px-4 text-right font-medium">
                <SortButton sortKey="successRate24h">Erfolg %</SortButton>
              </th>
              <th className="pb-3 px-4 text-right font-medium">
                <SortButton sortKey="avgTimeMs24h">Ø Zeit</SortButton>
              </th>
              <th className="pb-3 px-4 font-medium">Tags</th>
              <th className="pb-3 pl-4 font-medium"></th>
            </tr>
          </thead>

          <tbody>
            {sortedAgents.map((agent) => (
              <tr
                key={agent.id}
                className="border-b border-white/5 transition-colors hover:bg-card/5"
                style={{ height: '48px' }}
              >
                <td className="pr-4 font-medium text-text">{agent.name}</td>

                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`}
                      aria-label={getStatusLabel(agent.status)}
                    />
                    <span className="text-sm text-text-muted">
                      {getStatusLabel(agent.status)}
                    </span>
                  </div>
                </td>

                <td className="mono px-4 text-right text-sm text-text">
                  {formatNumber(agent.requests24h)}
                </td>

                <td className="mono px-4 text-right text-sm text-text">
                  {formatPercent(agent.successRate24h)}
                </td>

                <td className="mono px-4 text-right text-sm text-text">
                  {formatMs(agent.avgTimeMs24h)}
                </td>

                <td className="px-4">
                  <div className="flex flex-wrap gap-1">
                    {agent.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-card/5 px-2 py-0.5 text-xs text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="pl-4">
                  <button
                    onClick={() => onOpen?.(agent.id)}
                    className="rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-card/10"
                    aria-label={`${agent.name} öffnen`}
                  >
                    Öffnen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedAgents.length === 0 && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-text-muted">Keine Agents gefunden</p>
          </div>
        )}
      </div>
    </div>
  );
}
