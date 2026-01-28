'use client';

/**
 * Smart Polling Hook
 * Polls at regular intervals with automatic pause when tab is not visible
 * Useful for making the UI feel real-time without WebSocket complexity
 */

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  /** Callback to execute on each poll */
  callback: () => void | Promise<void>;
  /** Polling interval in milliseconds */
  intervalMs: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Whether to run callback immediately on mount */
  immediate?: boolean;
}

/**
 * Custom hook for smart polling with visibility detection
 *
 * @example
 * ```tsx
 * usePolling({
 *   callback: () => fetchThreads(),
 *   intervalMs: 5000,
 *   enabled: true,
 *   immediate: true,
 * });
 * ```
 */
export function usePolling({
  callback,
  intervalMs,
  enabled = true,
  immediate = false,
}: UsePollingOptions): void {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Execute the callback safely
  const executeCallback = useCallback(async () => {
    try {
      await savedCallback.current();
    } catch (error) {
      console.error('[usePolling] Error during poll:', error);
    }
  }, []);

  // Start/stop polling based on visibility and enabled state
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          executeCallback();
        }
      }, intervalMs);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (isVisibleRef.current) {
        // Tab became visible - execute immediately and restart polling
        executeCallback();
        startPolling();
      } else {
        // Tab hidden - stop polling to save resources
        stopPolling();
      }
    };

    // Run immediately if requested
    if (immediate) {
      executeCallback();
    }

    // Start polling
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, executeCallback, immediate]);
}

/**
 * Utility to check if data has changed (deep comparison for arrays)
 * Uses lastMessageAt timestamps for efficient thread comparison
 */
export function hasThreadsChanged<T extends { id: string; lastMessageAt: Date }>(
  oldThreads: T[],
  newThreads: T[]
): boolean {
  if (oldThreads.length !== newThreads.length) return true;

  // Create a map of old threads for O(1) lookup
  const oldMap = new Map(oldThreads.map(t => [t.id, t.lastMessageAt.getTime()]));

  for (const newThread of newThreads) {
    const oldTime = oldMap.get(newThread.id);
    if (oldTime === undefined) return true; // New thread added
    if (oldTime !== new Date(newThread.lastMessageAt).getTime()) return true; // Thread updated
  }

  return false;
}

/**
 * Utility to check if messages have changed
 */
export function hasMessagesChanged<T extends { id: string }>(
  oldMessages: T[],
  newMessages: T[]
): boolean {
  if (oldMessages.length !== newMessages.length) return true;

  const oldIds = new Set(oldMessages.map(m => m.id));
  for (const msg of newMessages) {
    if (!oldIds.has(msg.id)) return true;
  }

  return false;
}

export default usePolling;
