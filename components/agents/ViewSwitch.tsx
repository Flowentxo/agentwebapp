"use client";

import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

interface ViewSwitchProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewSwitch({ value, onChange }: ViewSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Ansicht wechseln"
      className="inline-flex rounded-md border border-white/10 bg-transparent"
    >
      <button
        onClick={() => onChange('grid')}
        aria-label="Grid-Ansicht"
        aria-pressed={value === 'grid'}
        className={`
          inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium transition-colors
          ${
            value === 'grid'
              ? 'bg-card/10 text-text'
              : 'text-text-muted hover:bg-card/5 hover:text-text'
          }
          rounded-l-md
        `}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <div className="w-px bg-card/10" />
      <button
        onClick={() => onChange('list')}
        aria-label="Listen-Ansicht"
        aria-pressed={value === 'list'}
        className={`
          inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium transition-colors
          ${
            value === 'list'
              ? 'bg-card/10 text-text'
              : 'text-text-muted hover:bg-card/5 hover:text-text'
          }
          rounded-r-md
        `}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
