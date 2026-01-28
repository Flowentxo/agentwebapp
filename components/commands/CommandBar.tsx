'use client';

import { useState, useEffect, useCallback } from 'react';
import { ParsedCommand } from '@/lib/commands/command-parser';
import { CommandCenter } from './CommandCenter';
import { useSoundEffects } from '@/lib/agents/sound-engine';
import { X, Sparkles } from 'lucide-react';

interface CommandBarProps {
  onCommandExecute?: (command: ParsedCommand) => void;
}

export function CommandBar({ onCommandExecute }: CommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sound = useSoundEffects();

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    sound.playClick();
  }, [sound]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleExecute = useCallback(
    (command: ParsedCommand) => {
      onCommandExecute?.(command);
      setIsOpen(false);
      sound.playSuccess();
    },
    [onCommandExecute, sound]
  );

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        sound.playClick();
      } else if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, sound]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-6 py-3 text-sm font-medium text-purple-400 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:bg-purple-500/20 hover:scale-105 breathing micro-lift"
        style={{
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
        }}
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline">Command Center</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-card/10 px-2 py-1 text-xs">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-fadeInUp"
        onClick={handleClose}
      />

      {/* Command Modal */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-32 px-4">
        <div
          className="relative w-full max-w-4xl animate-fadeInUp"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 breathing-fast">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Command Center</h2>
                <p className="text-sm text-text-muted">Control your AI agents with natural language</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-card/10 hover:text-text micro-bounce"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Command Center */}
          <CommandCenter onCommandExecute={handleExecute} autoFocus={true} />

          {/* Keyboard Hints */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-text-subtle">
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-card/10 px-2 py-1">Enter</kbd>
              <span>to execute</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-card/10 px-2 py-1">Esc</kbd>
              <span>to close</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-card/10 px-2 py-1">⌘K</kbd>
              <span>to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
