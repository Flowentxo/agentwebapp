'use client';

// ============================================================================
// HYDRATION-SAFE STORE HOOK
// Prevents hydration mismatches when using Zustand persist with Next.js SSR
// ============================================================================

import { useState, useEffect } from 'react';
import { useDashboardStore, useHasHydrated } from '@/store/useDashboardStore';

/**
 * Hook to safely access hydrated store state on the client.
 * Returns undefined during SSR and initial hydration, then the actual value.
 * This prevents "Text content does not match server-rendered HTML" errors.
 *
 * @example
 * const tokenUsage = useHydratedValue((state) => state.metrics.tokenUsage);
 * // Returns undefined on server, then actual value on client
 */
export function useHydratedValue<T>(selector: (state: ReturnType<typeof useDashboardStore.getState>) => T): T | undefined {
  const hasHydrated = useHasHydrated();
  const value = useDashboardStore(selector);
  const [hydratedValue, setHydratedValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (hasHydrated) {
      setHydratedValue(value);
    }
  }, [hasHydrated, value]);

  return hydratedValue;
}

/**
 * Hook to safely access hydrated store state with a fallback value.
 * Uses the fallback during SSR/hydration, then switches to actual value.
 *
 * @example
 * const tokenUsage = useHydratedValueWithFallback(
 *   (state) => state.metrics.tokenUsage,
 *   0 // fallback value
 * );
 */
export function useHydratedValueWithFallback<T>(
  selector: (state: ReturnType<typeof useDashboardStore.getState>) => T,
  fallback: T
): T {
  const hasHydrated = useHasHydrated();
  const value = useDashboardStore(selector);
  const [hydratedValue, setHydratedValue] = useState<T>(fallback);

  useEffect(() => {
    if (hasHydrated) {
      setHydratedValue(value);
    }
  }, [hasHydrated, value]);

  return hydratedValue;
}

/**
 * Hook that returns true only after the store has been hydrated on the client.
 * Use this to conditionally render components that depend on persisted state.
 *
 * @example
 * const isHydrated = useStoreHydration();
 * if (!isHydrated) return <Skeleton />;
 */
export function useStoreHydration(): boolean {
  const hasHydrated = useHasHydrated();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (hasHydrated) {
      setIsHydrated(true);
    }
  }, [hasHydrated]);

  return isHydrated;
}

/**
 * Higher-order component wrapper for hydration-safe rendering.
 * Shows a loading state until the store is hydrated.
 *
 * @example
 * export default withHydration(DashboardComponent, <DashboardSkeleton />);
 */
export function withHydration<P extends object>(
  Component: React.ComponentType<P>,
  LoadingComponent: React.ReactNode
): React.FC<P> {
  return function HydratedComponent(props: P) {
    const isHydrated = useStoreHydration();

    if (!isHydrated) {
      return <>{LoadingComponent}</>;
    }

    return <Component {...props} />;
  };
}

/**
 * Hook to get the relative time since last sync.
 * Updates every minute for fresh "X minutes ago" display.
 */
export function useRelativeTime(date: Date | undefined): string {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    if (!date) {
      setRelativeTime('Never');
      return;
    }

    const updateRelativeTime = () => {
      const now = new Date();
      const diffMs = now.getTime() - new Date(date).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        setRelativeTime('Just now');
      } else if (diffMins < 60) {
        setRelativeTime(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setRelativeTime(`${diffHours}h ago`);
      } else {
        setRelativeTime(`${diffDays}d ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return relativeTime;
}
