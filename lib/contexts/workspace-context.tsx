'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  slug: string;
  iconUrl: string | null;
  isDefault: boolean;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceStats {
  enabledAgents: number;
  totalAgents: number;
  knowledgeItems: number;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (workspaceId: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  getWorkspaceStats: (workspaceId: string) => Promise<WorkspaceStats | null>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/workspaces');

      if (!response.ok) {
        throw new Error('Failed to load workspaces');
      }

      const data = await response.json();

      if (data.workspaces && Array.isArray(data.workspaces)) {
        setWorkspaces(data.workspaces);

        // Get current workspace from localStorage or use default
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        let workspace: Workspace | undefined;

        if (savedWorkspaceId) {
          workspace = data.workspaces.find((w: Workspace) => w.id === savedWorkspaceId);
        }

        // Fallback to default workspace
        if (!workspace) {
          workspace = data.workspaces.find((w: Workspace) => w.isDefault);
        }

        // Fallback to first workspace
        if (!workspace && data.workspaces.length > 0) {
          workspace = data.workspaces[0];
        }

        if (workspace) {
          setCurrentWorkspace(workspace);
          localStorage.setItem('currentWorkspaceId', workspace.id);
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }

  async function switchWorkspace(workspaceId: string) {
    const workspace = workspaces.find((w) => w.id === workspaceId);

    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);

      // Reload page to refresh workspace-scoped data
      window.location.reload();
    }
  }

  async function createWorkspace(name: string, description?: string): Promise<Workspace> {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      const { workspace } = await response.json();

      // Refresh workspaces list
      await loadWorkspaces();

      return workspace;
    } catch (err) {
      console.error('Failed to create workspace:', err);
      throw err;
    }
  }

  async function updateWorkspace(workspaceId: string, data: Partial<Workspace>) {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update workspace');
      }

      // Refresh workspaces list
      await loadWorkspaces();
    } catch (err) {
      console.error('Failed to update workspace:', err);
      throw err;
    }
  }

  async function deleteWorkspace(workspaceId: string) {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workspace');
      }

      // If deleted workspace was current, switch to default
      if (currentWorkspace?.id === workspaceId) {
        const defaultWorkspace = workspaces.find((w) => w.isDefault);
        if (defaultWorkspace) {
          await switchWorkspace(defaultWorkspace.id);
        }
      }

      // Refresh workspaces list
      await loadWorkspaces();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      throw err;
    }
  }

  async function refreshWorkspaces() {
    await loadWorkspaces();
  }

  async function getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats | null> {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.stats || null;
    } catch (err) {
      console.error('Failed to get workspace stats:', err);
      return null;
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        isLoading,
        error,
        switchWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        refreshWorkspaces,
        getWorkspaceStats,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
