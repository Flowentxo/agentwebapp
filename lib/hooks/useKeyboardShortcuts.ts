'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description?: string;
}

/**
 * Global keyboard shortcut hook
 * Handles Cmd/Ctrl + Key combinations
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', meta: true, ctrl: true, callback: () => openCommandPalette(), description: 'Open Command Palette' },
 *   { key: 'n', meta: true, ctrl: true, callback: () => createNew(), description: 'New Agent' }
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Guard against undefined event.key
    if (!event.key) return;

    for (const shortcut of shortcuts) {
      const modifierPressed =
        (shortcut.ctrl && event.ctrlKey) ||
        (shortcut.meta && event.metaKey);

      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        modifierPressed &&
        shiftMatch &&
        altMatch
      ) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Execute callback
        shortcut.callback();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get modifier key symbol based on platform
 */
export function getModifierKey(): string {
  if (typeof window === 'undefined') return '⌘';
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const mod = getModifierKey();
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) parts.push(mod);
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push('⌥');
  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
}
