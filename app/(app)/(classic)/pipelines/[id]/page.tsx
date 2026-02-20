"use client";

/**
 * Pipeline Detail Page - Cockpit Layout
 *
 * Transformed from static dashboard to operational control system.
 * Features: Workflow graph center, HITL approvals, live execution, autopilot.
 *
 * Vicy-Style: Deep Black (#0f172a) + Violet Glow
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  GitBranch,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MoreVertical,
  Activity,
  Settings,
  Pencil,
  RefreshCw,
  Beaker,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePipelines, useHasHydrated } from "@/store/useDashboardStore";
import { useSession } from "@/store/session";
import { toast } from "sonner";

// Cockpit Components
import {
  CockpitCanvas,
  CockpitSidebar,
  ApprovalRequest,
  ExecutionStep,
  AutopilotConfig,
  TriggerType,
  ActionDeck,
} from "@/components/pipelines/cockpit";
import { DEFAULT_AUTOPILOT_CONFIG } from "@/components/pipelines/cockpit/AutopilotToggle";
import { EmergencyStopButton } from "@/components/pipelines/cockpit/EmergencyStopButton";

// Real-Time Execution Stream
import { useExecutionStreamV2 } from "@/hooks/useExecutionStreamV2";

// ============================================
// TYPES
// ============================================

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: string;
  created_at: string;
  updated_at: string;
  nodes?: any[];
  edges?: any[];
  viewport?: { x: number; y: number; zoom: number };
  execution_count: number;
  successful_count: number;
  failed_count: number;
}

// ============================================
// COMPONENT
// ============================================

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function PipelineDetailPage() {
  const params = useParams();
  const pipelineId = params.id as string;
  const router = useRouter();
  const isValidPipelineId = UUID_REGEX.test(pipelineId);

  // Auth - get current user from session store (initialized in Providers)
  const { user, isLoading: isSessionLoading, isAuthenticated } = useSession();
  const userId = user.id;

  // Ref to stop polling on persistent errors (400/401/404)
  const pollingErrorRef = useRef(false);

  // Store-first lookup
  const hasHydrated = useHasHydrated();
  const storePipelines = usePipelines();
  const storePipeline = useMemo(() => {
    return storePipelines.find((p) => p.id === pipelineId);
  }, [storePipelines, pipelineId]);

  // Pipeline State
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Trigger & Autopilot State
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [autopilotConfig, setAutopilotConfig] = useState<AutopilotConfig>(
    DEFAULT_AUTOPILOT_CONFIG
  );

  // Approval State
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  // Current execution ID for Socket.IO subscription
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  // Real-Time Execution Stream (Socket.IO)
  const {
    isSuspended,
    approvalData,
    logs: streamLogs,
    status: executionStatus,
    activeNodeId: streamActiveNodeId,
    executionState,
    subscribe,
    unsubscribe,
    reset: resetStream,
  } = useExecutionStreamV2();

  // Build node status map from execution steps (muss vor bedingten Returns stehen)
  const nodeStatuses = useMemo(() => {
    const statuses: Record<string, any> = {};

    // First, use execution steps from simulation
    executionSteps.forEach((step) => {
      statuses[step.nodeId] = step.status;
    });

    // Override with real-time status from Socket.IO if available
    if (executionState?.nodes) {
      Object.entries(executionState.nodes).forEach(([nodeId, nodeState]) => {
        statuses[nodeId] = nodeState.meta.status;
      });
    }

    return statuses;
  }, [executionSteps, executionState]);

  // Fetch pipeline details
  const fetchPipeline = useCallback(async () => {
    // Guard: Wait for session to be loaded and userId to be available
    if (!userId || isSessionLoading) {
      return;
    }

    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        headers: { "x-user-id": userId },
      });

      if (res.ok) {
        const data = await res.json();
        setPipeline(data.pipeline);

        // Set trigger type from pipeline
        if (data.pipeline.trigger_type) {
          setTriggerType(data.pipeline.trigger_type as TriggerType);
        }
      } else if (res.status === 400 || res.status === 404) {
        // Invalid ID or not found - stop all polling
        pollingErrorRef.current = true;
      }
    } catch (error) {
      console.error("Failed to fetch pipeline:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId, userId, isSessionLoading]);

  // Load pending approvals
  const loadApprovals = useCallback(async () => {
    // Guard: Wait for session to be loaded and userId to be available
    if (!userId || isSessionLoading) {
      return;
    }
    // Guard: Stop polling if a persistent error was flagged
    if (pollingErrorRef.current) {
      return;
    }

    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/approve?status=pending`,
        {
          headers: { "x-user-id": userId },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data.approvals || []);
      } else if (res.status === 400 || res.status === 401 || res.status === 404) {
        // Stop polling on persistent errors
        pollingErrorRef.current = true;
      }
    } catch (error) {
      console.error("Failed to load approvals:", error);
    }
  }, [pipelineId, userId, isSessionLoading]);

  // Store-first effect
  useEffect(() => {
    if (hasHydrated && storePipeline && !pipeline) {
      const convertedPipeline: Pipeline = {
        id: storePipeline.id,
        name: storePipeline.name,
        description: storePipeline.description,
        is_active: storePipeline.isActive,
        trigger_type: storePipeline.triggerType || "manual",
        created_at:
          storePipeline.createdAt instanceof Date
            ? storePipeline.createdAt.toISOString()
            : String(storePipeline.createdAt),
        updated_at:
          storePipeline.updatedAt instanceof Date
            ? storePipeline.updatedAt.toISOString()
            : String(storePipeline.updatedAt),
        nodes: storePipeline.steps?.map((s) => ({
          id: s.id,
          type: "custom",
          position: { x: 0, y: 0 },
          data: s,
        })) || [],
        edges: [],
        execution_count: storePipeline.runCount || 0,
        successful_count:
          storePipeline.runs?.filter((r) => r.status === "completed").length || 0,
        failed_count:
          storePipeline.runs?.filter((r) => r.status === "failed").length || 0,
      };
      setPipeline(convertedPipeline);
      setIsLoading(false);
    }
  }, [hasHydrated, storePipeline, pipeline]);

  // Fetch from API (skip entirely for non-UUID pipeline IDs)
  useEffect(() => {
    if (!isValidPipelineId) {
      setIsLoading(false);
      return;
    }

    fetchPipeline();
    loadApprovals();

    // Refresh approvals every 10 seconds
    const interval = setInterval(loadApprovals, 10000);
    return () => clearInterval(interval);
  }, [fetchPipeline, loadApprovals, isValidPipelineId]);

  // Handle Socket.IO approval events (node:suspended)
  useEffect(() => {
    if (isSuspended && approvalData && currentExecutionId) {
      // Map Socket.IO approval data to ApprovalRequest format
      const newApproval: ApprovalRequest = {
        id: approvalData.approvalId,
        executionId: currentExecutionId,
        nodeId: approvalData.nodeId,
        nodeName: approvalData.nodeName,
        nodeType: "human_approval",
        status: "pending",
        requestedAt: approvalData.requestedAt,
        expiresAt: approvalData.expiresAt,
        contextData: approvalData.contextData as ApprovalRequest["contextData"],
      };

      // Add to pending approvals if not already present
      setPendingApprovals((prev) => {
        const exists = prev.some((a) => a.id === newApproval.id);
        if (exists) return prev;
        return [...prev, newApproval];
      });

      // Show notification
      toast.info("Genehmigung erforderlich", {
        description: approvalData.description,
        duration: 10000,
      });
    }
  }, [isSuspended, approvalData, currentExecutionId]);

  // Sync active node from Socket.IO stream
  useEffect(() => {
    if (streamActiveNodeId && isRunning) {
      setActiveNodeId(streamActiveNodeId);
    }
  }, [streamActiveNodeId, isRunning]);

  // Cleanup Socket.IO subscription on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  // Execute pipeline
  const executePipeline = async () => {
    if (!pipeline) return;

    setIsRunning(true);
    setExecutionSteps([]);
    setActiveNodeId(null);
    resetStream();

    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const executionId = data.executionId || data.execution_id;

        if (executionId) {
          // Subscribe to real-time execution events via Socket.IO
          setCurrentExecutionId(executionId);
          subscribe(pipelineId, executionId);
          console.log("[COCKPIT] Subscribed to execution:", executionId);
        }

        toast.success("Pipeline gestartet", {
          description: "Die Ausführung läuft...",
        });

        // Simulate execution steps for demo (fallback if no Socket.IO)
        simulateExecution();
      } else {
        toast.error("Fehler beim Starten der Pipeline");
        setIsRunning(false);
      }
    } catch (error) {
      console.error("Failed to execute pipeline:", error);
      toast.error("Fehler beim Starten der Pipeline");
      setIsRunning(false);
    }
  };

  // Emergency Stop Handler
  const handleEmergencyStop = useCallback(() => {
    setIsRunning(false);
    setIsDryRun(false);
    setActiveNodeId(null);
    setExecutionSteps([]);
    if (currentExecutionId) {
      unsubscribe();
      setCurrentExecutionId(null);
    }
    resetStream();
  }, [currentExecutionId, unsubscribe, resetStream]);

  // Dry-Run (Test Mode)
  const startDryRun = () => {
    setIsDryRun(true);
    setIsRunning(true);
    setExecutionSteps([]);
    toast.info("Test-Modus", {
      description: "Simulation ohne echte API-Aufrufe",
    });
    simulateExecution(true);
  };

  // Simulate execution for demo
  const simulateExecution = (dryRun = false) => {
    const nodes = pipeline?.nodes || [];
    let currentIndex = 0;

    const runStep = () => {
      if (currentIndex >= nodes.length) {
        setIsRunning(false);
        setIsDryRun(false);
        setActiveNodeId(null);
        toast.success(dryRun ? "Test abgeschlossen" : "Pipeline abgeschlossen");
        return;
      }

      const node = nodes[currentIndex];
      setActiveNodeId(node.id);

      // Add running step
      setExecutionSteps((prev) => [
        ...prev,
        {
          id: `step-${node.id}`,
          nodeId: node.id,
          nodeName: node.data?.label || node.data?.name || `Step ${currentIndex + 1}`,
          nodeType: node.data?.type || "action",
          status: "running",
          startedAt: new Date().toISOString(),
        },
      ]);

      // Complete after delay
      const duration = Math.random() * 500 + 300;
      setTimeout(() => {
        setExecutionSteps((prev) =>
          prev.map((s) =>
            s.nodeId === node.id
              ? {
                  ...s,
                  status: "success" as const,
                  durationMs: Math.round(duration),
                  completedAt: new Date().toISOString(),
                }
              : s
          )
        );

        currentIndex++;
        runStep();
      }, duration);
    };

    setTimeout(runStep, 500);
  };

  // Toggle pipeline active state
  const togglePipeline = async () => {
    if (!pipeline) return;
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ is_active: !pipeline.is_active }),
      });

      if (res.ok) {
        setPipeline((prev) =>
          prev ? { ...prev, is_active: !prev.is_active } : null
        );
        toast.success(pipeline.is_active ? "Pipeline deaktiviert" : "Pipeline aktiviert");
      }
    } catch (error) {
      console.error("Failed to toggle pipeline:", error);
    }
  };

  // Trigger change handler
  const handleTriggerChange = async (type: TriggerType, config?: any) => {
    setTriggerType(type);

    // Persist to API
    try {
      await fetch(`/api/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          trigger_type: type,
          trigger_config: config,
        }),
      });
      console.log("[TRIGGER] Saved:", type, config);
    } catch (error) {
      console.error("[TRIGGER] Failed to save:", error);
      toast.error("Trigger-Änderung konnte nicht gespeichert werden");
    }
  };

  // Autopilot change handler
  const handleAutopilotChange = async (config: AutopilotConfig) => {
    setAutopilotConfig(config);

    // Persist to API
    try {
      await fetch(`/api/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          autopilot_config: config,
        }),
      });
      console.log("[AUTOPILOT] Saved:", config);
    } catch (error) {
      console.error("[AUTOPILOT] Failed to save:", error);
      toast.error("Autopilot-Änderung konnte nicht gespeichert werden");
    }
  };

  // Approval handlers
  const handleApprove = async (approvalId: string, comment?: string) => {
    try {
      const approval = pendingApprovals.find((a) => a.id === approvalId);
      if (!approval) return;

      const res = await fetch(`/api/pipelines/${pipelineId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          executionId: approval.executionId,
          nodeId: approval.nodeId,
          action: "approve",
          comment,
        }),
      });

      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        toast.success("Freigegeben", { description: "Pipeline fährt fort" });
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      toast.error("Fehler bei der Freigabe");
    }
  };

  const handleReject = async (approvalId: string, reason?: string) => {
    try {
      const approval = pendingApprovals.find((a) => a.id === approvalId);
      if (!approval) return;

      const res = await fetch(`/api/pipelines/${pipelineId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          executionId: approval.executionId,
          nodeId: approval.nodeId,
          action: "reject",
          reason,
        }),
      });

      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        toast.info("Abgelehnt", { description: "Pipeline gestoppt" });
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error("Fehler bei der Ablehnung");
    }
  };

  // Node click handler
  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
    // Could open node inspector here
  };

  // Loading state (wait for session and pipeline)
  if (isLoading || isSessionLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: "#0f172a" }}
      >
        <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !userId) {
    return (
      <div className="p-6" style={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
        <div className="text-center py-16">
          <GitBranch className="h-12 w-12 text-white/25 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Bitte melden Sie sich an
          </h3>
          <Button onClick={() => router.push("/login")} variant="outline">
            Zum Login
          </Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!pipeline) {
    return (
      <div className="p-6" style={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
        <div className="text-center py-16">
          <GitBranch className="h-12 w-12 text-white/25 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Pipeline nicht gefunden
          </h3>
          <Button onClick={() => router.push("/pipelines")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zu Pipelines
          </Button>
        </div>
      </div>
    );
  }

  // Calculate KPIs
  const successRate =
    pipeline.execution_count > 0
      ? Math.round((pipeline.successful_count / pipeline.execution_count) * 100)
      : 0;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: "#0f172a" }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        {/* Left: Back + Name + Inline KPIs */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/pipelines")}
            className="text-white/50 hover:text-white p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl",
                pipeline.is_active ? "bg-violet-500/20" : "bg-white/[0.04]"
              )}
            >
              <GitBranch
                className={cn(
                  "h-5 w-5",
                  pipeline.is_active ? "text-violet-400" : "text-white/40"
                )}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                {pipeline.name}
                {!pipeline.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/40 font-normal uppercase">
                    Inaktiv
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Inline KPIs */}
          <div className="flex items-center gap-4 ml-6 text-sm text-white/40">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {pipeline.execution_count}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {pipeline.successful_count}
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              {pipeline.failed_count}
            </span>
            <span className="text-white/20">|</span>
            <span className={cn(successRate >= 80 ? "text-emerald-400" : "text-amber-400")}>
              {successRate}%
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startDryRun}
            disabled={isRunning}
            className="bg-[#0f172a] border-white/[0.06] text-white/50 hover:text-amber-400 hover:border-amber-500/30"
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePipeline}
            className="bg-[#0f172a] border-white/[0.06] text-white/50 hover:text-white"
          >
            {pipeline.is_active ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Deaktivieren
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Aktivieren
              </>
            )}
          </Button>
          <Button
            onClick={executePipeline}
            disabled={isRunning || !pipeline.is_active}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Läuft...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Ausführen
              </>
            )}
          </Button>
          {/* Emergency Stop Button */}
          <EmergencyStopButton
            pipelineId={pipelineId}
            isRunning={isRunning}
            executionCount={1}
            onStop={handleEmergencyStop}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/pipelines/${pipelineId}/editor`)}
            className="text-white/50 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content: Canvas + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Workflow Canvas (Center) */}
        <div className="flex-1 relative">
          <CockpitCanvas
            nodes={pipeline.nodes || []}
            edges={pipeline.edges || []}
            viewport={pipeline.viewport}
            activeNodeId={activeNodeId}
            nodeStatuses={nodeStatuses}
            onNodeClick={handleNodeClick}
          />

          {/* ActionDeck Overlay - Swipeable Approval Cards */}
          {pendingApprovals.length > 0 && (
            <ActionDeck
              approvals={pendingApprovals}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {/* Dry-Run Badge */}
          {isDryRun && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
              <Beaker className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium uppercase">
                Test Mode
              </span>
            </div>
          )}
        </div>

        {/* Right: Cockpit Sidebar */}
        <CockpitSidebar
          pipelineId={pipelineId}
          currentTrigger={triggerType}
          onTriggerChange={handleTriggerChange}
          onRunNow={executePipeline}
          autopilotConfig={autopilotConfig}
          onAutopilotChange={handleAutopilotChange}
          pendingApprovals={pendingApprovals}
          onApprove={handleApprove}
          onReject={handleReject}
          executionSteps={executionSteps}
          isRunning={isRunning}
          isDryRun={isDryRun}
          activeNodeId={activeNodeId}
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  );
}
