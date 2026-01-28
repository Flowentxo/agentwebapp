'use client';

import { useState, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { StatusSummary } from '@/components/common/StatusSummary';

interface DashboardHeaderProps {
  health: {
    ok: number;
    degraded: number;
    error: number;
  };
  total: number;
  onSearchChange?: (query: string) => void;
  onActiveOnlyChange?: (active: boolean) => void;
  onCommandPaletteOpen?: () => void;
}

export function DashboardHeader({
  health,
  total,
  onSearchChange,
  onActiveOnlyChange,
  onCommandPaletteOpen,
}: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  // Handle / keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('dashboard-search')?.focus();
      }
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === 'K') {
        e.preventDefault();
        onCommandPaletteOpen?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCommandPaletteOpen]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleActiveOnlyChange = (checked: boolean) => {
    setActiveOnly(checked);
    onActiveOnlyChange?.(checked);
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-sticky bg-surface-0/95 backdrop-blur-sm hairline-bottom"
    >
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Left: Title and subtitle */}
          <div>
            <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
            <p className="text-sm text-text-muted">
              Überblick über Systeme & Metriken
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                id="dashboard-search"
                type="text"
                placeholder="Suchen… (/ zum Fokussieren)"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-10 w-64 rounded-lg border border-white/10 bg-card/5 pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Suche im Dashboard"
              />
            </div>

            {/* Status Summary */}
            <StatusSummary counts={health} />

            {/* Command Palette Button */}
            <button
              onClick={onCommandPaletteOpen}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-card/5 px-3 text-sm font-medium text-text transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Befehlspalette öffnen (⌘K)"
            >
              <Command className="h-4 w-4" />
              <span className="hidden sm:inline">Befehle</span>
              <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono text-xs text-text-muted">
                ⌘K
              </kbd>
            </button>

            {/* Active Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => handleActiveOnlyChange(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-card/5 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Nur aktive anzeigen"
              />
              <span className="text-sm font-medium text-text">Nur aktive</span>
            </label>
          </div>
        </div>

        {/* Live Region for screen readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {total} Agents gefunden: {health.ok} OK, {health.degraded} Eingeschränkt,{' '}
          {health.error} Fehler
        </div>
      </div>
    </header>
  );
}
