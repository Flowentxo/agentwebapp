"use client";

// ============================================================================
// LEVEL 14: DASHBOARD DATA HOOK
// Client-side hook that fetches data from server actions
// ============================================================================

import {
  useEffect,
  useState,
  useCallback,
  useTransition,
  createContext,
  useContext,
  type ReactNode,
} from "react";

// Import server actions
import {
  getAgents,
  createAgent as serverCreateAgent,
  updateAgent as serverUpdateAgent,
  deleteAgent as serverDeleteAgent,
  type AgentWithStats,
  type CreateAgentInput,
  type UpdateAgentInput,
} from "@/actions/agent-actions";

import {
  getPipelines,
  createPipeline as serverCreatePipeline,
  updatePipeline as serverUpdatePipeline,
  deletePipeline as serverDeletePipeline,
  togglePipelineActive as serverTogglePipelineActive,
  type PipelineWithSteps,
  type CreatePipelineInput,
  type UpdatePipelineInput,
} from "@/actions/pipeline-actions";

import {
  getActivityLogs,
  createActivityLog as serverCreateLog,
  getDashboardMetrics,
  type ActivityLogWithAgent,
  type CreateLogInput,
} from "@/actions/log-actions";

import {
  getUserSettings,
  updateUserSettings as serverUpdateSettings,
  getApiKeyStatus,
  type UserSettingsData,
  type UpdateSettingsInput,
} from "@/actions/settings-actions";

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardData {
  agents: AgentWithStats[];
  pipelines: PipelineWithSteps[];
  logs: ActivityLogWithAgent[];
  settings: UserSettingsData | null;
  metrics: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    successRate: number;
    activeAgents: number;
  };
  apiKeyStatus: {
    hasOpenAI: boolean;
    hasResend: boolean;
    hasSlack: boolean;
    hasTavily: boolean;
  };
}

export interface DashboardActions {
  // Agents
  createAgent: (input: CreateAgentInput) => Promise<AgentWithStats>;
  updateAgent: (id: string, input: UpdateAgentInput) => Promise<AgentWithStats>;
  deleteAgent: (id: string) => Promise<void>;

  // Pipelines
  createPipeline: (input: CreatePipelineInput) => Promise<PipelineWithSteps>;
  updatePipeline: (id: string, input: UpdatePipelineInput) => Promise<PipelineWithSteps>;
  deletePipeline: (id: string) => Promise<void>;
  togglePipelineActive: (id: string) => Promise<PipelineWithSteps>;

  // Logs
  createLog: (input: CreateLogInput) => Promise<ActivityLogWithAgent>;

  // Settings
  updateSettings: (input: UpdateSettingsInput) => Promise<UserSettingsData>;

  // Refresh
  refreshAgents: () => Promise<void>;
  refreshPipelines: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDashboardData(): {
  data: DashboardData;
  actions: DashboardActions;
  isLoading: boolean;
  isPending: boolean;
  error: Error | null;
} {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Assume authenticated initially

  // Data state
  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [pipelines, setPipelines] = useState<PipelineWithSteps[]>([]);
  const [logs, setLogs] = useState<ActivityLogWithAgent[]>([]);
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [metrics, setMetrics] = useState({
    totalTokens: 0,
    totalCost: 0,
    totalRequests: 0,
    successRate: 100,
    activeAgents: 0,
  });
  const [apiKeyStatus, setApiKeyStatus] = useState({
    hasOpenAI: false,
    hasResend: false,
    hasSlack: false,
    hasTavily: false,
  });

  // =========================================================================
  // FETCH FUNCTIONS
  // =========================================================================

  const refreshAgents = useCallback(async () => {
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (err) {
      console.error("[useDashboardData] Failed to fetch agents:", err);
      throw err;
    }
  }, []);

  const refreshPipelines = useCallback(async () => {
    try {
      const data = await getPipelines();
      setPipelines(data);
    } catch (err) {
      console.error("[useDashboardData] Failed to fetch pipelines:", err);
      throw err;
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const { logs: data } = await getActivityLogs(50, 0);
      setLogs(data);
    } catch (err) {
      console.error("[useDashboardData] Failed to fetch logs:", err);
      throw err;
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics({
        totalTokens: data.totalTokens,
        totalCost: data.totalCost,
        totalRequests: data.totalRequests,
        successRate: data.successRate,
        activeAgents: data.activeAgents,
      });
    } catch (err) {
      console.error("[useDashboardData] Failed to fetch metrics:", err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const [settingsData, keyStatus] = await Promise.all([
        getUserSettings(),
        getApiKeyStatus(),
      ]);
      setSettings(settingsData);
      setApiKeyStatus(keyStatus);
    } catch (err) {
      console.error("[useDashboardData] Failed to fetch settings:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        refreshAgents(),
        refreshPipelines(),
        refreshLogs(),
        refreshMetrics(),
        refreshSettings(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  }, [refreshAgents, refreshPipelines, refreshLogs, refreshMetrics, refreshSettings]);

  // =========================================================================
  // INITIAL FETCH
  // =========================================================================

  useEffect(() => {
    // With session-based auth, we simply try to fetch data
    // The server actions will throw an error if not authenticated
    refreshAll().catch((err) => {
      // If unauthorized, mark as not authenticated
      if (err?.message?.includes("Unauthorized")) {
        setIsAuthenticated(false);
      }
    });
  }, [refreshAll]);

  // =========================================================================
  // ACTION FUNCTIONS
  // =========================================================================

  const createAgent = useCallback(
    async (input: CreateAgentInput): Promise<AgentWithStats> => {
      const newAgent = await serverCreateAgent(input);
      setAgents((prev) => [newAgent, ...prev]);
      return newAgent;
    },
    []
  );

  const updateAgent = useCallback(
    async (id: string, input: UpdateAgentInput): Promise<AgentWithStats> => {
      const updated = await serverUpdateAgent(id, input);
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    },
    []
  );

  const deleteAgent = useCallback(async (id: string): Promise<void> => {
    await serverDeleteAgent(id);
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const createPipeline = useCallback(
    async (input: CreatePipelineInput): Promise<PipelineWithSteps> => {
      const newPipeline = await serverCreatePipeline(input);
      setPipelines((prev) => [newPipeline, ...prev]);
      return newPipeline;
    },
    []
  );

  const updatePipeline = useCallback(
    async (id: string, input: UpdatePipelineInput): Promise<PipelineWithSteps> => {
      const updated = await serverUpdatePipeline(id, input);
      setPipelines((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const deletePipeline = useCallback(async (id: string): Promise<void> => {
    await serverDeletePipeline(id);
    setPipelines((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePipelineActive = useCallback(
    async (id: string): Promise<PipelineWithSteps> => {
      const updated = await serverTogglePipelineActive(id);
      setPipelines((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const createLog = useCallback(
    async (input: CreateLogInput): Promise<ActivityLogWithAgent> => {
      const newLog = await serverCreateLog(input);
      setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50
      return newLog;
    },
    []
  );

  const updateSettings = useCallback(
    async (input: UpdateSettingsInput): Promise<UserSettingsData> => {
      const updated = await serverUpdateSettings(input);
      setSettings(updated);

      // Update API key status
      setApiKeyStatus({
        hasOpenAI: !!updated.openaiApiKey,
        hasResend: !!updated.resendApiKey,
        hasSlack: !!updated.slackWebhookUrl,
        hasTavily: !!updated.tavilyApiKey,
      });

      return updated;
    },
    []
  );

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    data: {
      agents,
      pipelines,
      logs,
      settings,
      metrics,
      apiKeyStatus,
    },
    actions: {
      createAgent,
      updateAgent,
      deleteAgent,
      createPipeline,
      updatePipeline,
      deletePipeline,
      togglePipelineActive,
      createLog,
      updateSettings,
      refreshAgents,
      refreshPipelines,
      refreshLogs,
      refreshAll,
    },
    isLoading,
    isPending,
    error,
  };
}

// ============================================================================
// CONTEXT PROVIDER (Optional - for global state)
// ============================================================================

const DashboardContext = createContext<ReturnType<typeof useDashboardData> | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const dashboard = useDashboardData();

  return (
    <DashboardContext.Provider value={dashboard}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }

  return context;
}
