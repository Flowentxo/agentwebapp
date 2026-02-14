'use client';

/**
 * Inbox Keyboard Shortcuts Overlay
 * Shows all available keyboard shortcuts in a grid
 */

import { AnimatePresence, motion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['C'], action: 'E-Mail verfassen' },
  { keys: ['T'], action: 'Vorlagen oeffnen' },
  { keys: ['D'], action: 'Dashboard oeffnen' },
  { keys: ['R'], action: 'Antworten' },
  { keys: ['E'], action: 'Archivieren' },
  { keys: ['#'], action: 'Loeschen' },
  { keys: ['U'], action: 'Als ungelesen' },
  { keys: ['J / ↓'], action: 'Naechster Thread' },
  { keys: ['K / ↑'], action: 'Vorheriger Thread' },
  { keys: ['Enter'], action: 'Thread oeffnen' },
  { keys: ['⌘', 'K'], action: 'Suche fokussieren' },
  { keys: ['/'], action: 'Suche fokussieren' },
  { keys: ['1-4'], action: 'Schnellfilter' },
  { keys: ['Esc'], action: 'Panel schliessen' },
  { keys: ['?'], action: 'Shortcuts anzeigen' },
];

export function ShortcutsOverlay({ isOpen, onClose }: ShortcutsOverlayProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-medium text-white">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div className="px-5 py-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-sm text-white/60">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-white/20 mx-0.5">+</span>}
                      <kbd className="px-2 py-0.5 text-[11px] font-mono text-white/60 bg-white/[0.06] border border-white/[0.08] rounded">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
            <p className="text-[11px] text-white/30 text-center">
              Shortcuts sind nur aktiv wenn kein Textfeld fokussiert ist
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
