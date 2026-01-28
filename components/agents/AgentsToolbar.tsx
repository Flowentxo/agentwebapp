"use client";

import { useRef, useEffect, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export type SortOption = 'requests' | 'name' | 'success';
export type StatusFilter = 'healthy' | 'degraded' | 'error';

interface AgentsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter[];
  onStatusChange: (filter: StatusFilter[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeOnly: boolean;
  onActiveOnlyChange: (active: boolean) => void;
  resultsCount: number;
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

export function AgentsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  activeOnly,
  onActiveOnlyChange,
  resultsCount,
}: AgentsToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const getStatusCount = (status: StatusFilter) => {
    // This would normally come from props, but for now we show the filter count
    return statusFilter.includes(status) ? 1 : 0;
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-surface-2 p-3">
      {/* Search */}
      <div className="relative min-w-[240px] flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
          aria-hidden="true"
        />
        <Input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Suchen... (Drücke / zum Fokussieren)"
          role="searchbox"
          aria-label="Agents durchsuchen"
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Suche löschen"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle transition hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-2" role="group" aria-label="Nach Status filtern">
        {statusOptions.map(({ value, label, color }) => {
          const isActive = statusFilter.includes(value);
          const count = getStatusCount(value);

          return (
            <button
              key={value}
              onClick={() => toggleStatus(value)}
              role="checkbox"
              aria-checked={isActive}
              aria-label={`Filter ${label}`}
              className={`
                inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${
                  isActive
                    ? 'border-white/20 bg-card/10 text-text shadow-sm'
                    : 'border-white/10 bg-transparent text-text-muted hover:bg-card/5 hover:text-text'
                }
              `}
            >
              <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
              {label}
              {isActive && count > 0 && (
                <span className="ml-1 text-xs text-text-subtle">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label="Sortierung"
          aria-expanded={isDropdownOpen}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-card/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sortOptions.find((opt) => opt.value === sortBy)?.label}
          <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-lg border border-white/10 bg-surface-1 shadow-lg">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setIsDropdownOpen(false);
                }}
                className={`
                  w-full px-4 py-2.5 text-left text-sm transition-colors
                  ${
                    sortBy === option.value
                      ? 'bg-card/10 font-medium text-text'
                      : 'text-text-muted hover:bg-card/5 hover:text-text'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Only Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={activeOnly}
          onChange={(e) => onActiveOnlyChange(e.target.checked)}
        />
        <label
          onClick={() => onActiveOnlyChange(!activeOnly)}
          className="cursor-pointer text-sm text-text-muted"
        >
          Nur aktive
        </label>
      </div>

      {/* Results Count */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="ml-auto text-sm text-text-muted"
      >
        <span className="font-semibold text-text">{resultsCount}</span>{' '}
        {resultsCount === 1 ? 'Agent' : 'Agents'}
      </div>
    </div>
  );
}
