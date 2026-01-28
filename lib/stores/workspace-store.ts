/**
 * In-Memory Workspace Store
 *
 * This is a simple in-memory store for development.
 * In production, replace this with database calls.
 */

export interface WorkspaceData {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  slug: string;
  iconUrl: string | null;
  isDefault: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage (persists during server runtime)
let workspaces: WorkspaceData[] = [
  {
    id: 'default-workspace',
    userId: 'default-user',
    name: 'Default Workspace',
    description: 'Your default workspace',
    slug: 'default',
    iconUrl: null,
    isDefault: true,
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const workspaceStore = {
  // Get all workspaces
  getAll(): WorkspaceData[] {
    return [...workspaces];
  },

  // Get workspace by ID
  getById(id: string): WorkspaceData | undefined {
    return workspaces.find(w => w.id === id);
  },

  // Get default workspace
  getDefault(): WorkspaceData | undefined {
    return workspaces.find(w => w.isDefault) || workspaces[0];
  },

  // Create a new workspace
  create(data: {
    name: string;
    description?: string;
    userId?: string;
  }): WorkspaceData {
    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check for duplicate slug
    if (workspaces.some(w => w.slug === slug)) {
      throw new Error('Ein Workspace mit diesem Namen existiert bereits');
    }

    const newWorkspace: WorkspaceData = {
      id: `workspace-${Date.now()}`,
      userId: data.userId || 'default-user',
      name: data.name.trim(),
      description: data.description?.trim() || null,
      slug,
      iconUrl: null,
      isDefault: false,
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    workspaces.push(newWorkspace);
    return newWorkspace;
  },

  // Update a workspace
  update(id: string, data: Partial<WorkspaceData>): WorkspaceData | null {
    const index = workspaces.findIndex(w => w.id === id);
    if (index === -1) return null;

    workspaces[index] = {
      ...workspaces[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return workspaces[index];
  },

  // Delete a workspace
  delete(id: string): boolean {
    const workspace = workspaces.find(w => w.id === id);

    // If workspace not found, consider it already deleted (success)
    if (!workspace) {
      return true;
    }

    if (workspace.isDefault) {
      throw new Error('Der Standard-Workspace kann nicht gelöscht werden');
    }

    workspaces = workspaces.filter(w => w.id !== id);
    return true;
  },

  // Check if slug exists
  slugExists(slug: string): boolean {
    return workspaces.some(w => w.slug === slug);
  },
};
