/**
 * User Preferences Hook
 * Manages user preferences with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/lib/types/preferences';

const STORAGE_KEY = 'sintra_user_preferences';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('[usePreferences] Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('[usePreferences] Failed to save preferences:', error);
      }
      return updated;
    });
  }, []);

  // Update specific preference
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      savePreferences({ [key]: value } as Partial<UserPreferences>);
    },
    [savePreferences]
  );

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[usePreferences] Failed to reset preferences:', error);
    }
  }, []);

  // Toggle boolean preference
  const togglePreference = useCallback(
    (key: keyof UserPreferences) => {
      const currentValue = preferences[key];
      if (typeof currentValue === 'boolean') {
        updatePreference(key, !currentValue as any);
      }
    },
    [preferences, updatePreference]
  );

  // Agent favorites
  const toggleFavoriteAgent = useCallback(
    (agentId: string) => {
      const current = preferences.favoriteAgents;
      const updated = current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId];
      updatePreference('favoriteAgents', updated);
    },
    [preferences.favoriteAgents, updatePreference]
  );

  const togglePinnedAgent = useCallback(
    (agentId: string) => {
      const current = preferences.pinnedAgents;
      const updated = current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId];
      updatePreference('pinnedAgents', updated);
    },
    [preferences.pinnedAgents, updatePreference]
  );

  // Metric visibility
  const toggleMetric = useCallback(
    (metricId: string) => {
      const updated = preferences.metrics.map((m) =>
        m.id === metricId ? { ...m, enabled: !m.enabled } : m
      );
      updatePreference('metrics', updated);
    },
    [preferences.metrics, updatePreference]
  );

  const reorderMetrics = useCallback(
    (metricId: string, newOrder: number) => {
      const updated = preferences.metrics.map((m) =>
        m.id === metricId ? { ...m, order: newOrder } : m
      );
      updatePreference('metrics', updated.sort((a, b) => a.order - b.order));
    },
    [preferences.metrics, updatePreference]
  );

  return {
    preferences,
    isLoading,
    savePreferences,
    updatePreference,
    resetPreferences,
    togglePreference,
    toggleFavoriteAgent,
    togglePinnedAgent,
    toggleMetric,
    reorderMetrics,
  };
}
