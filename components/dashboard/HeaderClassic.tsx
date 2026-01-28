'use client';

import { useEffect } from 'react';
import { Command } from 'lucide-react';

interface HeaderClassicProps {
  onCommandPaletteOpen?: () => void;
}

export function HeaderClassic({ onCommandPaletteOpen }: HeaderClassicProps) {
  // Handle ⌘K/Ctrl+K keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === 'K') {
        e.preventDefault();
        onCommandPaletteOpen?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCommandPaletteOpen]);

  return (
    <header role="banner" className="mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Title and period info */}
        <div>
          <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
          <p className="text-sm text-text-muted">
            Überblick über Systeme & Metriken
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Zeitraum: letzte 24 h · Vergleich: Vortag
          </p>
        </div>

        {/* Right: Command Palette Button */}
        <button
          onClick={onCommandPaletteOpen}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-card/5 px-3 text-sm font-medium text-text transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Befehlspalette öffnen (⌘K)"
        >
          <Command className="h-4 w-4" />
          <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono text-xs text-text-muted">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
