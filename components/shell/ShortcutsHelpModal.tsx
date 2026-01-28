'use client';

import { X, Command, Keyboard } from 'lucide-react';
import { getModifierKey } from '@/lib/hooks/useKeyboardShortcuts';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  if (!isOpen) return null;

  const mod = getModifierKey();

  const shortcuts: Shortcut[] = [
    // Navigation
    { keys: [mod, 'K'], description: 'Open Command Palette (20+ actions)', category: 'Navigation' },
    { keys: [mod, '/'], description: 'Show keyboard shortcuts', category: 'Navigation' },
    { keys: ['ESC'], description: 'Close modal/overlay', category: 'Navigation' },

    // Quick Actions
    { keys: [mod, 'N'], description: 'Create new agent', category: 'Quick Actions' },
    { keys: [mod, 'U'], description: 'Upload document', category: 'Quick Actions' },
    { keys: [mod, '.'], description: 'Open settings', category: 'Quick Actions' },

    // Agent Chat
    { keys: ['↵'], description: 'Send message', category: 'Agent Chat' },
    { keys: ['⇧', '↵'], description: 'New line', category: 'Agent Chat' },
    { keys: [mod, '↵'], description: 'Execute command', category: 'Agent Chat' },

    // General
    { keys: [mod, 'S'], description: 'Save (when applicable)', category: 'General' },
    { keys: [mod, 'Z'], description: 'Undo', category: 'General' },
    { keys: [mod, '⇧', 'Z'], description: 'Redo', category: 'General' },
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Keyboard className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-muted-foreground">
                Boost your productivity with these shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card/10 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter(s => s.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-card/5 transition-colors"
                      >
                        <span className="text-sm text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <kbd className="px-2 py-1 rounded bg-card/10 border border-white/20 text-xs font-mono text-gray-300">
                                {key}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-muted-foreground">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-card/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-card/10 border border-white/20 font-mono">{mod}+/</kbd> anytime to see this</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {shortcuts.length} shortcuts available
          </div>
        </div>
      </div>
    </div>
  );
}
