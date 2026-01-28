'use client';

import { Command, Keyboard } from 'lucide-react';
import { getModifierKey } from '@/lib/hooks/useKeyboardShortcuts';

interface ShortcutBadgeProps {
  variant?: 'default' | 'minimal' | 'floating';
  onClick?: () => void;
}

/**
 * Shortcut Badge - Shows available keyboard shortcuts
 * Can be placed in sidebar, footer, or as floating button
 */
export function ShortcutBadge({ variant = 'default', onClick }: ShortcutBadgeProps) {
  const mod = getModifierKey();

  if (variant === 'floating') {
    return (
      <button
        onClick={onClick}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 backdrop-blur-xl border border-purple-500/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group z-40"
        title="Keyboard Shortcuts"
      >
        <Keyboard className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
        <span className="text-sm text-white font-medium">
          {mod}+K
        </span>
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-card/5 transition-colors group"
        title="Press to see shortcuts"
      >
        <Command className="h-3 w-3 text-muted-foreground group-hover:text-white transition-colors" />
        <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">
          Shortcuts
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-card/5 hover:bg-card/10 border border-white/10 rounded-lg transition-all group"
      title="Press Cmd/Ctrl + K to open command palette"
    >
      <div className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded bg-card/10 border border-white/20 text-xs font-mono text-gray-300 group-hover:bg-card/20 transition-colors">
          {mod}
        </kbd>
        <span className="text-muted-foreground">+</span>
        <kbd className="px-1.5 py-0.5 rounded bg-card/10 border border-white/20 text-xs font-mono text-gray-300 group-hover:bg-card/20 transition-colors">
          K
        </kbd>
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">
        Command Palette
      </span>
    </button>
  );
}
