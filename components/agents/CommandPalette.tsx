"use client";

import { useEffect, useState, useRef } from 'react';
import { Search, ArrowRight, Hash, RotateCw, StopCircle } from 'lucide-react';
import { type Agent } from './AgentsTable';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  onOpenAgent: (agent: Agent) => void;
  onAction?: (action: string, agentId?: string) => void;
}

interface Command {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: 'agent' | 'action';
  keywords?: string[];
}

export function CommandPalette({
  open,
  onOpenChange,
  agents,
  onOpenAgent,
  onAction,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build commands list
  const commands: Command[] = [
    // Agent commands
    ...agents.map((agent) => ({
      id: `agent-${agent.id}`,
      label: `${agent.name} öffnen`,
      icon: Hash,
      action: () => {
        onOpenAgent(agent);
        onOpenChange(false);
      },
      category: 'agent' as const,
      keywords: [agent.name.toLowerCase(), agent.description?.toLowerCase() || ''],
    })),
    // Quick actions
    {
      id: 'restart-all',
      label: 'Alle Agents neu starten',
      icon: RotateCw,
      action: () => {
        onAction?.('restart-all');
        onOpenChange(false);
      },
      category: 'action' as const,
    },
    {
      id: 'stop-all',
      label: 'Alle Agents stoppen',
      icon: StopCircle,
      action: () => {
        onAction?.('stop-all');
        onOpenChange(false);
      },
      category: 'action' as const,
    },
  ];

  // Filter commands
  const filteredCommands = search
    ? commands.filter((cmd) => {
        const searchLower = search.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some((kw) => kw.includes(searchLower))
        );
      })
    : commands;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }

      // ESC to close
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange(false);
      }

      if (!open) return;

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }

      // Enter to execute
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, filteredCommands, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-xl border border-white/10 bg-surface-1 shadow-2xl"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3">
          <Search className="h-5 w-5 text-text-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Agents oder Aktionen..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={
              filteredCommands[selectedIndex]
                ? `command-${filteredCommands[selectedIndex].id}`
                : undefined
            }
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono text-xs text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div
          id="command-list"
          role="listbox"
          className="max-h-[400px] overflow-y-auto p-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              Keine Ergebnisse gefunden
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    id={`command-${cmd.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={cmd.action}
                    className={`
                      flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors
                      ${
                        isSelected
                          ? 'bg-card/10 text-text'
                          : 'text-text-muted hover:bg-card/5 hover:text-text'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1">{cmd.label}</span>
                    <ArrowRight className="h-3 w-3 text-text-subtle" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/6 px-4 py-2 text-xs text-text-subtle">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono">
                ↑↓
              </kbd>
              Navigation
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono">
                ↵
              </kbd>
              Auswählen
            </span>
          </div>
          <span>
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-card/5 px-1.5 font-mono">
              ⌘K
            </kbd>
          </span>
        </div>
      </div>
    </>
  );
}
