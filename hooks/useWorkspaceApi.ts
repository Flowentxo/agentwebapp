import { useWorkspace } from '@/lib/contexts/workspace-context';
import { useCallback } from 'react';

/**
 * Hook that provides fetch wrappers with automatic workspace-id header injection
 */
export function useWorkspaceApi() {
  const { currentWorkspace } = useWorkspace();

  /**
   * Fetch with automatic workspace-id header
   */
  const workspaceFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      if (!currentWorkspace) {
        throw new Error('No workspace selected');
      }

      const headers = new Headers(options?.headers || {});
      headers.set('x-workspace-id', currentWorkspace.id);
      headers.set('Content-Type', 'application/json');

      const response = await fetch(url, {
        ...options,
        headers,
      });

      return response;
    },
    [currentWorkspace]
  );

  /**
   * GET request with workspace context
   */
  const get = useCallback(
    async <T = any>(url: string): Promise<T> => {
      const response = await workspaceFetch(url, { method: 'GET' });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      return response.json();
    },
    [workspaceFetch]
  );

  /**
   * POST request with workspace context
   */
  const post = useCallback(
    async <T = any>(url: string, data?: any): Promise<T> => {
      const response = await workspaceFetch(url, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      return response.json();
    },
    [workspaceFetch]
  );

  /**
   * PUT request with workspace context
   */
  const put = useCallback(
    async <T = any>(url: string, data?: any): Promise<T> => {
      const response = await workspaceFetch(url, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      return response.json();
    },
    [workspaceFetch]
  );

  /**
   * DELETE request with workspace context
   */
  const del = useCallback(
    async <T = any>(url: string): Promise<T> => {
      const response = await workspaceFetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      return response.json();
    },
    [workspaceFetch]
  );

  return {
    fetch: workspaceFetch,
    get,
    post,
    put,
    delete: del,
    workspaceId: currentWorkspace?.id || null,
  };
}
