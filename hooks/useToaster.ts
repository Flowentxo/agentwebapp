/**
 * SINTRA Profile System - Toaster Hook
 * Simple toast notifications
 */

'use client';

import { useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Simple toaster hook
 * In production, integrate with shadcn/ui toast or similar
 */
export function useToaster() {
  const show = useCallback((options: ToastOptions) => {
    // TODO: Integrate with proper toast library
    console.log(`[Toast ${options.type || 'info'}]`, options.title, options.description);

    // Fallback to alert for now
    if (typeof window !== 'undefined') {
      const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
      }[options.type || 'info'];

      const message = options.description
        ? `${icon} ${options.title}\n${options.description}`
        : `${icon} ${options.title}`;

      // Use a non-blocking notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, {
          body: options.description,
          icon: '/icon.png',
        });
      }
    }
  }, []);

  const success = useCallback(
    (title: string, description?: string) => {
      show({ title, description, type: 'success' });
    },
    [show]
  );

  const error = useCallback(
    (title: string, description?: string) => {
      show({ title, description, type: 'error' });
    },
    [show]
  );

  const info = useCallback(
    (title: string, description?: string) => {
      show({ title, description, type: 'info' });
    },
    [show]
  );

  const warning = useCallback(
    (title: string, description?: string) => {
      show({ title, description, type: 'warning' });
    },
    [show]
  );

  return {
    show,
    success,
    error,
    info,
    warning,
  };
}
