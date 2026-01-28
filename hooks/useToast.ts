/**
 * Custom Hook: useToast
 *
 * Provides toast notification functionality with auto-dismiss
 */

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

interface ToastOptions {
  type: Toast['type'];
  title: string;
  message: string;
  duration?: number;
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = `toast-${++toastCounter}`;
    const duration = options.duration || 5000;

    const toast: Toast = {
      id,
      ...options,
      duration,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    clearAll,
  };
}

// Global toast provider hook
let globalShowToast: ((options: ToastOptions) => void) | null = null;

export function setGlobalToast(showToast: (options: ToastOptions) => void) {
  globalShowToast = showToast;
}

export function toast(options: ToastOptions) {
  if (globalShowToast) {
    globalShowToast(options);
  } else {
    console.warn('[Toast] Global toast not initialized');
  }
}
