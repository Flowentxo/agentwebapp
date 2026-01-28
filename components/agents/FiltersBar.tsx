import { useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface FiltersBarProps {
  statusFilter: ('healthy' | 'degraded' | 'error')[];
  onStatusChange: (status: ('healthy' | 'degraded' | 'error')[]) => void;
  sortBy: 'requests' | 'success' | 'avgTime';
  onSortChange: (sort: 'requests' | 'success' | 'avgTime') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultsCount: number;
  onClearAll: () => void;
}

const statusOptions = [
  { value: 'healthy' as const, label: 'Healthy', color: 'bg-success' },
  { value: 'degraded' as const, label: 'Degraded', color: 'bg-warning' },
  { value: 'error' as const, label: 'Error', color: 'bg-error' },
];

const sortOptions = [
  { value: 'requests' as const, label: 'Most Requests' },
  { value: 'success' as const, label: 'Highest Success' },
  { value: 'avgTime' as const, label: 'Fastest Response' },
];

export function FiltersBar({
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  resultsCount,
  onClearAll,
}: FiltersBarProps) {
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

  const toggleStatus = (status: 'healthy' | 'degraded' | 'error') => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    onStatusChange(newFilter);
  };

  const hasActiveFilters =
    statusFilter.length > 0 || searchQuery.length > 0;

  return (
    <div
      className="sticky top-16 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
      role="search"
      aria-label="Agent filters"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Search + Status Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search agents... (Press / to focus)"
                aria-label="Search agents by name or description"
                aria-describedby="search-hint"
                className={`
                  w-full pl-10 pr-10 py-2.5 rounded-lg
                  bg-muted border border-border text-text text-sm
                  placeholder:text-text-subtle
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                  transition-all duration-150
                `}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <span id="search-hint" className="sr-only">
                Press slash to focus search
              </span>
            </div>

            {/* Status Filter Chips */}
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label="Filter by status"
            >
              {statusOptions.map(({ value, label, color }) => {
                const isActive = statusFilter.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleStatus(value)}
                    role="checkbox"
                    aria-checked={isActive}
                    aria-label={`Filter by ${label} status`}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-text-muted hover:bg-border hover:text-text'
                      }
                    `}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${color}`}
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Sort + Results + Clear */}
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-text-subtle" />
              <select
                value={sortBy}
                onChange={(e) =>
                  onSortChange(
                    e.target.value as 'requests' | 'success' | 'avgTime'
                  )
                }
                aria-label="Sort agents by"
                className={`
                  px-3 py-2 rounded-lg bg-muted border border-border text-text text-sm font-medium
                  focus:outline-none focus:ring-2 focus:ring-ring
                  cursor-pointer transition
                `}
              >
                {sortOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count (Live Region) */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="text-sm text-text-muted"
            >
              <span className="font-semibold text-text">{resultsCount}</span>{' '}
              {resultsCount === 1 ? 'Agent' : 'Agents'}
            </div>

            {/* Active Filters Counter + Clear All */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted/50 border border-border text-text-muted tabular-nums">
                  {statusFilter.length > 0 && `${statusFilter.length} Status`}
                  {statusFilter.length > 0 && searchQuery && ' · '}
                  {searchQuery && '1 Suche'}
                </span>
                <button
                  onClick={onClearAll}
                  className="text-sm text-text-muted hover:text-text underline transition"
                  aria-label="Alle Filter zurücksetzen"
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
