'use client';

/**
 * Flowent Inbox v2 - Global Keyboard Shortcuts Hook
 * Productivity shortcuts for power users
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInboxStore } from '@/lib/stores/useInboxStore';

interface UseInboxShortcutsOptions {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  enabled?: boolean;
}

export function useInboxShortcuts({
  searchInputRef,
  enabled = true,
}: UseInboxShortcutsOptions = {}) {
  const router = useRouter();
  const {
    threads,
    selectedThreadId,
    setSelectedThread,
    getFilteredThreads,
    closeArtifact,
    isArtifactPanelOpen,
    setFilter,
  } = useInboxStore();

  // Track if composer is focused
  const isComposerFocused = useRef(false);

  // Update composer focus state
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable
      ) {
        isComposerFocused.current = true;
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable
      ) {
        isComposerFocused.current = false;
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Navigate to next/previous thread
  const navigateThread = useCallback(
    (direction: 'up' | 'down') => {
      const filteredThreads = getFilteredThreads();
      if (filteredThreads.length === 0) return;

      const currentIndex = selectedThreadId
        ? filteredThreads.findIndex((t) => t.id === selectedThreadId)
        : -1;

      let newIndex: number;
      if (direction === 'down') {
        newIndex = currentIndex < filteredThreads.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredThreads.length - 1;
      }

      const newThread = filteredThreads[newIndex];
      if (newThread) {
        setSelectedThread(newThread.id);
        router.push(`/inbox/${newThread.id}`);
      }
    },
    [getFilteredThreads, selectedThreadId, setSelectedThread, router]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if in input/textarea (unless it's a global shortcut)
      const target = e.target as HTMLElement;
      const isInInput =
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable;

      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }

      // Escape: Close artifact panel or blur input
      if (e.key === 'Escape') {
        if (isArtifactPanelOpen) {
          e.preventDefault();
          closeArtifact();
          return;
        }
        if (isInInput) {
          (target as HTMLElement).blur();
          return;
        }
      }

      // Don't process navigation shortcuts if in input
      if (isInInput) return;

      // Arrow Up/Down: Navigate threads
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        navigateThread('down');
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        navigateThread('up');
        return;
      }

      // Enter: Open selected thread
      if (e.key === 'Enter' && selectedThreadId) {
        e.preventDefault();
        router.push(`/inbox/${selectedThreadId}`);
        return;
      }

      // Number keys for quick filters
      if (e.key === '1') {
        e.preventDefault();
        setFilter('all');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setFilter('unread');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setFilter('mentions');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        setFilter('approvals');
        return;
      }

      // G then I: Go to inbox (vim-like)
      // This would require a key sequence handler

      // ? : Show keyboard shortcuts overlay
      if (e.key === '?') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-show-shortcuts'));
        return;
      }

      // C : Open email composer (Emmie)
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-open-composer'));
        return;
      }

      // T : Open templates (Emmie)
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-open-templates'));
        return;
      }

      // D : Open dashboard (Emmie)
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-open-dashboard'));
        return;
      }

      // E : Archive current thread
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-archive-thread'));
        return;
      }

      // U : Mark unread
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-mark-unread'));
        return;
      }

      // # : Delete/trash
      if (e.key === '#') {
        e.preventDefault();
        window.dispatchEvent(new Event('inbox-delete-thread'));
        return;
      }

      // / : Focus search
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }
    },
    [
      enabled,
      searchInputRef,
      isArtifactPanelOpen,
      closeArtifact,
      navigateThread,
      selectedThreadId,
      router,
      setFilter,
    ]
  );

  // Register keyboard listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    navigateThread,
    isComposerFocused: isComposerFocused.current,
  };
}

// Keyboard shortcut hints for UI
export const INBOX_SHORTCUTS = [
  { keys: ['⌘', 'K'], action: 'Search' },
  { keys: ['↑', '↓'], action: 'Navigate threads' },
  { keys: ['Enter'], action: 'Open thread' },
  { keys: ['Esc'], action: 'Close panel' },
  { keys: ['1-4'], action: 'Quick filters' },
  { keys: ['C'], action: 'Compose email' },
  { keys: ['T'], action: 'Open templates' },
  { keys: ['D'], action: 'Open dashboard' },
  { keys: ['E'], action: 'Archive thread' },
  { keys: ['U'], action: 'Mark unread' },
  { keys: ['#'], action: 'Delete thread' },
  { keys: ['/'], action: 'Focus search' },
  { keys: ['?'], action: 'Show shortcuts' },
] as const;
