/**
 * Toast Notification System - Apple Style
 *
 * "Design is how it works." - Steve Jobs
 *
 * Enhanced with:
 * - Icon variants (Success, Error, Info, Warning)
 * - Progress bar auto-dismiss
 * - Framer Motion animations
 * - Apple design tokens
 * - Top-right positioning
 */

"use client";
import * as React from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastVariant = "default" | "success" | "warn" | "error" | "info";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

const toastConfig = {
  success: {
    icon: CheckCircle,
    color: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.1)',
  },
  error: {
    icon: AlertCircle,
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.1)',
  },
  warn: {
    icon: AlertTriangle,
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.1)',
  },
  info: {
    icon: Info,
    color: '#0071E3',
    bgLight: 'rgba(0, 113, 227, 0.1)',
  },
  default: {
    icon: Info,
    color: '#86868B',
    bgLight: 'rgba(134, 134, 139, 0.1)',
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [progress, setProgress] = React.useState(100);
  const config = toastConfig[toast.variant || 'default'];
  const Icon = config.icon;
  const duration = toast.duration || 5000;

  React.useEffect(() => {
    if (duration <= 0) return;

    const interval = 50;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          onRemove(toast.id);
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, toast.id, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-lg backdrop-blur-md"
      style={{
        background: 'var(--oracle-surface-primary)',
        border: '1px solid var(--oracle-surface-secondary)',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
          style={{
            background: config.bgLight,
            color: config.color,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-1">
          {toast.title && (
            <p
              className="font-semibold mb-1"
              style={{
                fontSize: 'var(--oracle-text-callout)',
                color: 'var(--oracle-text-primary)',
              }}
            >
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p
              className="text-sm"
              style={{
                color: 'var(--oracle-text-secondary)',
                lineHeight: '1.4',
              }}
            >
              {toast.description}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onRemove(toast.id)}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 hover:bg-[var(--oracle-surface-secondary)] flex-shrink-0"
          aria-label="Close notification"
        >
          <X
            className="h-4 w-4"
            style={{ color: 'var(--oracle-text-tertiary)' }}
          />
        </button>
      </div>

      {/* Progress Bar */}
      {duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-1 transition-all duration-50"
          style={{
            width: `${progress}%`,
            background: config.color,
          }}
        />
      )}
    </motion.div>
  );
}

const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, duration: 5000, variant: "default", ...t };
    setItems(s => [...s, toast]);
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems(s => s.filter(i => i.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        className="fixed top-4 right-4 flex flex-col gap-3 pointer-events-none"
        style={{ zIndex: 'var(--oracle-z-tooltip)' }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
