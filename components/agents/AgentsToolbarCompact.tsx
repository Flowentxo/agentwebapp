"use client";

import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ViewSwitch, type ViewMode } from './ViewSwitch';

export type SortOption = 'requests' | 'name' | 'success';
export type StatusFilter = 'healthy' | 'degraded' | 'error';

interface AgentsToolbarCompactProps {
  // Search & View
  searchQuery: string;
  onSearchChange: (query: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;

  // Filters
  statusFilter: StatusFilter[];
  onStatusChange: (filter: StatusFilter[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeOnly: boolean;
  onActiveOnlyChange: (active: boolean) => void;

  // Counts
  resultsCount: number;
  statusCounts?: { healthy: number; degraded: number; error: number };
}

const statusOptions = [
  { value: 'healthy' as const, label: 'OK', color: 'bg-success' },
  { value: 'degraded' as const, label: 'Eingeschränkt', color: 'bg-warning' },
  { value: 'error' as const, label: 'Fehler', color: 'bg-error' },
];

const sortOptions = [
  { value: 'requests' as const, label: 'Meiste Anfragen' },
  { value: 'name' as const, label: 'Name' },
  { value: 'success' as const, label: 'Höchste Erfolgsrate' },
];

export function AgentsToolbarCompact({
  searchQuery,
  onSearchChange,
  view,
  onViewChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  activeOnly,
  onActiveOnlyChange,
  resultsCount,
  statusCounts = { healthy: 0, degraded: 0, error: 0 },
}: AgentsToolbarCompactProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hotkey: "/" focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleStatus = (status: StatusFilter) => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    onStatusChange(newFilter);
  };

  return (
    <div className="sticky top-16 z-20 border-b border-white/6 bg-surface-1/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        {/* Left: Search (max 480px) */}
        <div className="relative w-full max-w-[480px]">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Suchen... (/ zum Fokusieren)"
            role="searchbox"
            aria-label="Agents durchsuchen"
            className="h-9 pl-10 pr-10 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Suche löschen"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle transition hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Filters + Sort + Toggle + View + Count */}
        <div className="flex items-center gap-3">
          {/* Status Filter Chips (compact) */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Nach Status filtern">
            {statusOptions.map(({ value, label, color }) => {
              const isActive = statusFilter.includes(value);
              const count = statusCounts[value] || 0;

              return (
                <button
                  key={value}
                  onClick={() => toggleStatus(value)}
                  role="checkbox"
                  aria-checked={isActive}
                  aria-label={`Filter ${label}`}
                  className={`
                    inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium
                    transition-colors
                    ${
                      isActive
                        ? 'border-white/20 bg-card/10 text-text'
                        : 'border-white/8 bg-transparent text-text-muted hover:bg-card/5 hover:text-text'
                    }
                  `}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />
                  {label}
                  {count > 0 && (
                    <span className="ml-0.5 text-[10px] text-text-subtle tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort (compact select) */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sortierung"
            className="h-9 rounded-md border border-white/10 bg-transparent px-3 text-xs font-medium text-text transition-colors hover:bg-card/5 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-surface-2 text-text">
                {option.label}
              </option>
            ))}
          </select>

          {/* Active Only Toggle (compact) */}
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
            <Switch
              checked={activeOnly}
              onChange={(e) => onActiveOnlyChange(e.target.checked)}
            />
            Nur aktive
          </label>

          {/* Divider */}
          <div className="h-6 w-px bg-card/10" />

          {/* ViewSwitch */}
          <ViewSwitch value={view} onChange={onViewChange} />

          {/* Results Count */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="text-xs text-text-muted tabular-nums"
          >
            <span className="font-semibold text-text">{resultsCount}</span>{' '}
            {resultsCount === 1 ? 'Agent' : 'Agents'}
          </div>
        </div>
      </div>
    </div>
  );
}
