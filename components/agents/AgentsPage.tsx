'use client';

import { useState, useMemo } from 'react';
import { AgentCard } from './AgentCard';
import { AgentsTable, type Agent } from './AgentsTable';
import { AgentsGrid } from './AgentsGrid';
import { AgentsToolbarCompact, type SortOption, type StatusFilter } from './AgentsToolbarCompact';
import { type ViewMode } from './ViewSwitch';
import { AgentDetailsSheet } from './AgentDetailsSheet';
import { CommandCenter } from './CommandCenter';
import { CommandPalette } from './CommandPalette';
import { StatusSummary } from './StatusSummary';
import { ChatInterface } from './chat/ChatInterface';
import { EmptyCompleteAgents } from './EmptyCompleteAgents';
import { useCompleteAgents } from '@/lib/agents/useCompleteAgents';
import { countAgentsByStatus } from '@/lib/agents/selectors';
import { AlertCircle, RefreshCw, Inbox, Search } from 'lucide-react';

// Demo Data - now with proper Agent type structure
const DEMO_AGENTS: Agent[] = [
  {
    id: 'cassie',
    name: 'Cassie',
    description: 'Customer support agent with multilingual capabilities.',
    requests: 120,
    successRate: 89,
    avgTimeSec: 0.9,
    tags: ['support', 'reports'],
    status: 'healthy',
    trend: '+4%',
  },
  {
    id: 'dexter',
    name: 'Dexter',
    description: 'Advanced data analysis agent powered by GPT-4.',
    requests: 4567,
    successRate: 96.8,
    avgTimeSec: 0.8,
    tags: ['support', 'nlp', 'prod'],
    status: 'healthy',
    trend: '+1%',
  },
  {
    id: 'emmie',
    name: 'Emmie',
    description: 'AI reasoning and insights engine for business intelligence.',
    requests: 2340,
    successRate: 94.2,
    avgTimeSec: 1.2,
    tags: ['insights', 'ai'],
    status: 'healthy',
    trend: '+2%',
  },
  {
    id: 'aura',
    name: 'Aura',
    description: 'Workflow orchestration and automation specialist.',
    requests: 890,
    successRate: 78.5,
    avgTimeSec: 2.1,
    tags: ['automation', 'workflows'],
    status: 'degraded',
    trend: '–3%',
  },
  {
    id: 'nova',
    name: 'Nova',
    description: 'Cross-agent reporting and analytics coordinator.',
    requests: 456,
    successRate: 92.0,
    avgTimeSec: 1.5,
    tags: ['reporting', 'analytics'],
    status: 'healthy',
    trend: '+5%',
  },
  {
    id: 'kai',
    name: 'Kai',
    description: 'RAG-based knowledge retrieval system.',
    requests: 3210,
    successRate: 88.7,
    avgTimeSec: 0.7,
    tags: ['knowledge', 'rag'],
    status: 'healthy',
  },
  {
    id: 'lex',
    name: 'Lex',
    description: 'Compliance and policy validation engine.',
    requests: 1890,
    successRate: 95.5,
    avgTimeSec: 1.1,
    tags: ['compliance', 'legal'],
    status: 'healthy',
    trend: '+3%',
  },
  {
    id: 'finn',
    name: 'Finn',
    description: 'Finance and forecasting capabilities specialist.',
    requests: 678,
    successRate: 91.2,
    avgTimeSec: 1.8,
    tags: ['finance', 'forecasting'],
    status: 'healthy',
  },
  {
    id: 'ari',
    name: 'Ari',
    description: 'Conversational AI interface with routing capabilities.',
    requests: 5432,
    successRate: 97.1,
    avgTimeSec: 0.6,
    tags: ['chat', 'routing'],
    status: 'healthy',
    trend: '+6%',
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Event and notification system coordinator.',
    requests: 234,
    successRate: 85.3,
    avgTimeSec: 0.9,
    tags: ['events', 'notifications'],
    status: 'healthy',
  },
  {
    id: 'vera',
    name: 'Vera',
    description: 'Visualization and business intelligence capabilities.',
    requests: 1567,
    successRate: 93.8,
    avgTimeSec: 1.4,
    tags: ['visualization', 'bi'],
    status: 'healthy',
    trend: '+4%',
  },
  {
    id: 'omni',
    name: 'Omni',
    description: 'System operations and monitoring specialist.',
    requests: 890,
    successRate: 89.9,
    avgTimeSec: 1.0,
    tags: ['ops', 'monitoring'],
    status: 'healthy',
  },
];

export function AgentsPage() {
  const [view, setView] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Apply complete agents filter (respects env flag + dev override)
  const completeAgents = useCompleteAgents(DEMO_AGENTS);

  // Filtering + Sorting Logic
  const filteredAgents = useMemo(() => {
    let result = completeAgents;

    // Filter by status
    if (statusFilter.length > 0) {
      result = result.filter((agent) => statusFilter.includes(agent.status));
    }

    // Filter by active only (for now, all demo agents are considered active)
    // In production, you'd check agent.isActive or similar
    if (activeOnly) {
      result = result; // All demo agents are active
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'requests') return b.requests - a.requests;
      if (sortBy === 'success') return b.successRate - a.successRate;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [completeAgents, statusFilter, searchQuery, sortBy, activeOnly]);

  const handleOpenAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setDetailsOpen(true);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  // Calculate status counts from complete agents only
  const statusCounts = useMemo(() => {
    return countAgentsByStatus(completeAgents);
  }, [completeAgents]);

  // Handle toggle status filter from StatusSummary
  const handleToggleStatusFilter = (status: StatusFilter) => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    setStatusFilter(newFilter);
  };

  // Error State
  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-error/30 bg-error-bg p-12 text-center"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-12 w-12 text-error" />
          <h2 className="text-xl font-semibold text-text">
            Fehler beim Laden der Agents
          </h2>
          <p className="max-w-md text-text-muted">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Loading State (Skeleton)
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <header>
          <h1 className="text-xl font-semibold text-text">Agents</h1>
          <p className="text-sm text-text-muted">Lädt...</p>
        </header>

        <div className="h-16 animate-pulse rounded-xl border border-white/10 bg-surface-2" />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-start gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                <div className="h-6 w-32 rounded bg-muted" />
              </div>
              <div className="mb-2 h-4 w-full rounded bg-muted" />
              <div className="mb-5 h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (filteredAgents.length === 0) {
    // Check if this is due to complete agents filter or user filters
    const isCompleteAgentsEmpty = completeAgents.length === 0;
    const hasUserFilters = searchQuery || statusFilter.length > 0 || activeOnly;

    return (
      <div className="space-y-6 p-6">
        <header>
          <h1 className="text-xl font-semibold text-text">Agents</h1>
          <p className="text-sm text-text-muted">0 aktiv · Orchestrator OK</p>
        </header>

        <AgentsToolbarCompact
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onViewChange={setView}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeOnly={activeOnly}
          onActiveOnlyChange={setActiveOnly}
          resultsCount={0}
          statusCounts={statusCounts}
        />

        {/* Show appropriate empty state */}
        {isCompleteAgentsEmpty && !hasUserFilters ? (
          <EmptyCompleteAgents />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-12 text-center">
            <Inbox className="h-16 w-16 text-text-subtle" />
            <h2 className="text-xl font-semibold text-text">Keine Agents gefunden</h2>
            <p className="max-w-md text-text-muted">
              {hasUserFilters
                ? 'Versuche, deine Filter oder Suchanfrage anzupassen.'
                : 'Derzeit sind keine Agents verfügbar.'}
            </p>
            {hasUserFilters && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter([]);
                  setActiveOnly(false);
                }}
                className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary-hover"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Success State (Cockpit, List, or Graph View)
  return (
    <div className="min-h-screen">
      {/* Header with StatusSummary */}
      <header className="space-y-4 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text">Agents</h1>
            <p className="text-sm text-text-muted">
              {filteredAgents.length} aktiv · Orchestrator OK
            </p>
          </div>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-card/5 px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Command Palette öffnen (⌘K)"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Befehle</span>
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono text-xs text-text-muted">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Status Summary - Zero UI */}
        <StatusSummary
          counts={statusCounts}
          activeFilters={statusFilter}
          onToggleFilter={handleToggleStatusFilter}
        />
      </header>

      {/* Compact Toolbar (sticky with ViewSwitch integrated) */}
      <AgentsToolbarCompact
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        view={view}
        onViewChange={setView}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        activeOnly={activeOnly}
        onActiveOnlyChange={setActiveOnly}
        resultsCount={filteredAgents.length}
        statusCounts={statusCounts}
      />

      {/* Content: List or Grid */}
      <main className="px-6 pt-4 pb-6">
        {view === 'list' && (
          <AgentsTable
            agents={filteredAgents}
              onOpen={handleOpenAgent}
              selectedId={selectedAgent?.id}
            />
          )}

          {view === 'grid' && (
            <AgentsGrid agents={filteredAgents} />
          )}
        </main>

      {/* Details Sheet */}
      <AgentDetailsSheet
        agent={selectedAgent}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        agents={DEMO_AGENTS}
        onOpenAgent={handleOpenAgent}
        onAction={(action) => {
          console.log('Action:', action);
          // TODO: Implement actions
        }}
      />
    </div>
  );
}
