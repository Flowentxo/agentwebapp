'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { StatusChip } from '@/components/common/StatusChip';
import { PanelHeader } from '@/components/common/PanelHeader';
import { formatThousandsDE, formatPercentDE, formatMsToSecOneDecimal } from '@/lib/format/number';

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

interface AgentsSnapshotTableProps {
  agents: Agent[];
  onOpen?: (id: string) => void;
}

type SortColumn = 'name' | 'requests' | 'success' | 'time';
type SortDirection = 'asc' | 'desc';

export function AgentsSnapshotTable({ agents, onOpen }: AgentsSnapshotTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('requests');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Debounce search query for live region (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle / keyboard shortcut for search focus (only if no other input is focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isInputFocused && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('agents-table-search')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let result = [...agents];

    // Filter by search query (use debounced for live region announcement)
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort by column
    result.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'requests':
          aValue = a.requests24h;
          bValue = b.requests24h;
          break;
        case 'success':
          aValue = a.successRate24h;
          bValue = b.successRate24h;
          break;
        case 'time':
          aValue = a.avgTimeMs24h;
          bValue = b.avgTimeMs24h;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Limit to top 10
    return result.slice(0, 10);
  }, [agents, debouncedQuery, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (agentId: string) => {
    onOpen?.(agentId);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, agentId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen?.(agentId);
    }
  };

  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    );
  };

  const getAriaSort = (column: SortColumn): 'ascending' | 'descending' | 'none' => {
    if (sortColumn !== column) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="panel p-0 overflow-hidden">
      <PanelHeader
        title="Top-Agents"
        subtitle={`Die ${filteredAndSortedAgents.length} aktivsten Agents`}
        info="Zeigt die Top 10 Agents sortiert nach Aktivität der letzten 24 Stunden"
        actions={
          <Link
            href="/agents"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))]"
          >
            Alle Agents ansehen
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="px-5 py-4">
        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            id="agents-table-search"
            type="text"
            placeholder="Suchen… (/ zum Fokussieren)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-card/5 pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] motion-safe:duration-200 motion-reduce:transition-none"
            aria-label="Agents suchen"
          />
        </div>

      {/* Live Region for search results */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {filteredAndSortedAgents.length} Agents gefunden
      </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 bg-[rgb(var(--surface-1))] backdrop-blur-[2px] hairline-b text-left text-xs text-text-muted">
                <th
                  scope="col"
                  className="pb-3 pr-4 font-medium cursor-pointer select-none hover:text-text transition-colors motion-safe:duration-200 motion-reduce:transition-none"
                  onClick={() => handleSort('name')}
                  aria-sort={getAriaSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Agent
                    {getSortIndicator('name')}
                  </div>
                </th>
                <th scope="col" className="pb-3 px-4 font-medium">
                  Status
                </th>
                <th
                  scope="col"
                  className="pb-3 px-4 text-right font-medium cursor-pointer select-none hover:text-text transition-colors motion-safe:duration-200 motion-reduce:transition-none"
                  onClick={() => handleSort('requests')}
                  aria-sort={getAriaSort('requests')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Anfragen 24h
                    {getSortIndicator('requests')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="pb-3 px-4 text-right font-medium cursor-pointer select-none hover:text-text transition-colors motion-safe:duration-200 motion-reduce:transition-none"
                  onClick={() => handleSort('success')}
                  aria-sort={getAriaSort('success')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Erfolg %
                    {getSortIndicator('success')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="pb-3 px-4 text-right font-medium cursor-pointer select-none hover:text-text transition-colors motion-safe:duration-200 motion-reduce:transition-none"
                  onClick={() => handleSort('time')}
                  aria-sort={getAriaSort('time')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Ø Zeit
                    {getSortIndicator('time')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedAgents.map((agent, index) => (
                <tr
                  key={agent.id}
                  className={`hairline-b cursor-pointer transition-colors hover:bg-card/5 focus-within:bg-card/5 motion-safe:duration-200 motion-reduce:transition-none ${
                    index % 2 === 0 ? 'even:hover:bg-card/[0.02]' : ''
                  }`}
                  style={{ height: '48px' }}
                  onClick={() => handleRowClick(agent.id)}
                  onKeyDown={(e) => handleRowKeyDown(e, agent.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${agent.name} öffnen`}
                >
                  <td className="pr-4 font-medium text-text">{agent.name}</td>

                  <td className="px-4">
                    <StatusChip status={agent.status} />
                  </td>

                  <td className="mono px-4 text-right text-sm text-text">
                    {formatThousandsDE(agent.requests24h)}
                  </td>

                  <td className="mono px-4 text-right text-sm text-text">
                    {formatPercentDE(agent.successRate24h)}
                  </td>

                  <td className="mono px-4 text-right text-sm text-text">
                    {formatMsToSecOneDecimal(agent.avgTimeMs24h)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedAgents.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-text-muted">Keine Agents gefunden</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
