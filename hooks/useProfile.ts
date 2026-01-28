/**
 * SINTRA Profile System - Profile Hook
 * Client-side profile data management with SWR-like behavior
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchJSON } from '@/lib/profile/client-utils';
import type { ProfileResponse } from '@/lib/profile/schemas';

export function useProfile(initialData?: ProfileResponse) {
  const [data, setData] = useState<ProfileResponse | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchJSON<ProfileResponse>('/api/profile');
      setData(profile);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (updates: Partial<ProfileResponse>) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await fetchJSON<ProfileResponse>('/api/profile', {
          method: 'PUT',
          headers: {
            'x-csrf-token': 'TEST', // TODO: Proper CSRF
          },
          body: JSON.stringify(updates),
        });
        setData(updated);
        return updated;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    data,
    loading,
    error,
    refresh,
    update,
  };
}
