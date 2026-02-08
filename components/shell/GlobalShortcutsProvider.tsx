'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { CommandPaletteOverlay } from './CommandPaletteOverlay';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';

/**
 * Global Shortcuts Provider
 * Registers all keyboard shortcuts and manages modals
 *
 * Add this to your root layout to enable shortcuts throughout the app
 */
export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const router = useRouter();

  // Register global shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      ctrl: true,
      callback: () => setIsCommandPaletteOpen(true),
      description: 'Open Command Palette'
    },
    {
      key: '/',
      meta: true,
      ctrl: true,
      callback: () => setIsShortcutsHelpOpen(true),
      description: 'Show Keyboard Shortcuts'
    },
    {
      key: 'n',
      meta: true,
      ctrl: true,
      callback: () => router.push('/studio'),
      description: 'New Agent'
    },
    {
      key: 'u',
      meta: true,
      ctrl: true,
      callback: () => router.push('/brain?upload=true'),
      description: 'Upload Document'
    },
    {
      key: '.',
      meta: true,
      ctrl: true,
      callback: () => router.push('/settings'),
      description: 'Settings'
    },
  ]);

  return (
    <>
      {children}

      {/* Command Palette Modal */}
      <CommandPaletteOverlay
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </>
  );
}
