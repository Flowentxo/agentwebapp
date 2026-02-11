/**
 * Flowent Inbox v2 - Zustand Store
 * State management for Mission Control Inbox
 *
 * Note: Thread data is now fetched via React Query (useThreads hook).
 * This store handles UI state only.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InboxFilter, InboxAgent, Artifact, AgentRoutedData } from '@/types/inbox';

// Agent configuration (static data - could be fetched from API later)
const agents: InboxAgent[] = [
  { id: 'dexter', name: 'Dexter', color: '#3b82f6', isOnline: true, activeThreads: 0 },
  { id: 'emmie', name: 'Emmie', color: '#a855f7', isOnline: true, activeThreads: 0 },
  { id: 'kai', name: 'Kai', color: '#22c55e', isOnline: false, activeThreads: 0 },
  { id: 'cassie', name: 'Cassie', color: '#f59e0b', isOnline: true, activeThreads: 0 },
];

// View mode for sidebar task board
type ViewMode = 'active' | 'completed' | 'drafts';

interface InboxState {
  // UI State
  activeFilter: InboxFilter;
  selectedThreadId: string | null;
  activeAgentId: string | null; // Filter by agent
  isSidebarOpen: boolean;
  searchQuery: string;
  debouncedSearchQuery: string; // Used for API calls (debounced)
  agents: InboxAgent[];
  viewMode: ViewMode; // Toggle between active and archived threads

  // Artifact State
  activeArtifact: Artifact | null;
  activeArtifactId: string | null; // For lazy loading
  isArtifactPanelOpen: boolean;

  // Orchestration State
  routingFeedback: Record<string, { agentId?: string; agentName: string; confidence: number; reasoning: string; previousAgent?: string; timestamp: number }>;

  // Processing Stage State (per-thread, transient)
  processingStages: Record<string, { stage: string; agentName: string; label: string } | null>;

  // UI Version (Classic v3 vs Next/Vicy v4)
  uiVersion: 'classic' | 'next';

  // Actions
  setFilter: (filter: InboxFilter) => void;
  setSelectedThread: (threadId: string | null) => void;
  setActiveAgent: (agentId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setDebouncedSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setViewMode: (mode: ViewMode) => void;
  setUiVersion: (version: 'classic' | 'next') => void;

  // Artifact Actions
  openArtifact: (artifact: Artifact) => void;
  openArtifactById: (artifactId: string) => void;
  setActiveArtifact: (artifact: Artifact | null) => void;
  closeArtifact: () => void;
  updateArtifactContent: (content: string) => void;

  // Orchestration Actions
  setRoutingFeedback: (threadId: string, feedback: { agentId?: string; agentName: string; confidence: number; reasoning: string; previousAgent?: string }) => void;
  clearRoutingFeedback: (threadId: string) => void;

  // Processing Stage Actions
  setProcessingStage: (threadId: string, stage: { stage: string; agentName: string; label: string }) => void;
  clearProcessingStage: (threadId: string) => void;
}

export const useInboxStore = create<InboxState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeFilter: 'all',
      selectedThreadId: null,
      activeAgentId: null,
      isSidebarOpen: true,
      searchQuery: '',
      debouncedSearchQuery: '',
      agents,
      viewMode: 'active',

      // Artifact initial state
      activeArtifact: null,
      activeArtifactId: null,
      isArtifactPanelOpen: false,

      // Orchestration initial state
      routingFeedback: {},

      // Processing stage initial state
      processingStages: {},

      // UI Version
      uiVersion: 'classic',

      // Actions
      setFilter: (filter) => set({
        activeFilter: filter,
        selectedThreadId: null,
        // Clear agent filter when selecting "All Threads"
        activeAgentId: filter === 'all' ? null : get().activeAgentId,
      }),

      setSelectedThread: (threadId) => set({ selectedThreadId: threadId }),

      setActiveAgent: (agentId) => set({
        activeAgentId: agentId,
        selectedThreadId: null,
        // Reset to 'all' filter when selecting an agent (or clear it when null)
        activeFilter: agentId ? 'all' : get().activeFilter,
      }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setDebouncedSearchQuery: (query) => set({ debouncedSearchQuery: query }),

      clearSearch: () => set({ searchQuery: '', debouncedSearchQuery: '' }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setUiVersion: (version) => set({ uiVersion: version }),

      // Artifact Actions
      openArtifact: (artifact) => set({
        activeArtifact: artifact,
        activeArtifactId: artifact.id,
        isArtifactPanelOpen: true,
      }),

      openArtifactById: (artifactId) => set({
        activeArtifactId: artifactId,
        isArtifactPanelOpen: true,
        // activeArtifact will be set when content is loaded
      }),

      setActiveArtifact: (artifact) => set({
        activeArtifact: artifact,
      }),

      closeArtifact: () => set({
        activeArtifact: null,
        activeArtifactId: null,
        isArtifactPanelOpen: false,
      }),

      updateArtifactContent: (content) => set((state) => ({
        activeArtifact: state.activeArtifact
          ? {
              ...state.activeArtifact,
              content,
              version: state.activeArtifact.version + 1,
              updatedAt: new Date().toISOString(),
            }
          : null,
      })),

      // Orchestration Actions
      setRoutingFeedback: (threadId, feedback) => set((state) => ({
        routingFeedback: {
          ...state.routingFeedback,
          [threadId]: { ...feedback, timestamp: Date.now() },
        },
      })),

      clearRoutingFeedback: (threadId) => set((state) => {
        const { [threadId]: _, ...rest } = state.routingFeedback;
        return { routingFeedback: rest };
      }),

      // Processing Stage Actions
      setProcessingStage: (threadId, stage) => set((state) => ({
        processingStages: { ...state.processingStages, [threadId]: stage },
      })),

      clearProcessingStage: (threadId) => set((state) => ({
        processingStages: { ...state.processingStages, [threadId]: null },
      })),
    }),
    {
      name: 'flowent-inbox-store',
      partialize: (state) => ({
        activeFilter: state.activeFilter,
        activeAgentId: state.activeAgentId,
        isSidebarOpen: state.isSidebarOpen,
        viewMode: state.viewMode,
        uiVersion: state.uiVersion,
      }),
    }
  )
);
