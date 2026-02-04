"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  GitBranch,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  MoreVertical,
  Activity,
  Zap,
  AlertTriangle,
  Timer,
  ChevronRight,
  Circle,
  Settings,
  Trash2,
  Copy,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface ExecutionStep {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  duration?: number;
  result?: unknown;
  error?: string;
}

interface PipelineExecution {
  id: string;
  status: "running" | "completed" | "failed" | "cancelled" | "pending";
  started_at: string;
  completed_at?: string;
  current_step?: number;
  total_steps?: number;
  error?: string;
  steps?: ExecutionStep[];
  trigger?: string;
  duration?: number;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: string;
  created_at: string;
  updated_at: string;
  nodes?: unknown[];
  edges?: unknown[];
  executions?: PipelineExecution[];
  execution_count: number;
  successful_count: number;
  failed_count: number;
}

// ============================================
// COMPONENT
// ============================================

export default function PipelineDetailPage() {
  const params = useParams();
  const pipelineId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const executionIdParam = searchParams.get("execution");

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [executions, setExecutions] = useState<PipelineExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<PipelineExecution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "executions" | "settings">("overview");

  // Fetch pipeline details
  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        headers: { "x-user-id": localStorage.getItem("userId") || "demo-user" }
      });

      if (res.ok) {
        const data = await res.json();
        setPipeline(data.pipeline);
        setExecutions(data.executions || []);

        // Select execution from URL or latest
        if (executionIdParam) {
          const exec = data.executions?.find((e: PipelineExecution) => e.id === executionIdParam);
          if (exec) setSelectedExecution(exec);
        } else if (data.executions?.length > 0) {
          setSelectedExecution(data.executions[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch pipeline:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId, executionIdParam]);

  useEffect(() => {
    fetchPipeline();
    // Refresh every 5 seconds if there's a running execution
    const interval = setInterval(() => {
      if (selectedExecution?.status === "running") {
        fetchPipeline();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchPipeline, selectedExecution?.status]);

  // Execute pipeline
  const executePipeline = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || "demo-user"
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh to get new execution
        await fetchPipeline();
        // Select the new execution
        if (data.executionId) {
          const newExec = executions.find(e => e.id === data.executionId);
          if (newExec) setSelectedExecution(newExec);
        }
      }
    } catch (error) {
      console.error("Failed to execute pipeline:", error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Toggle pipeline active state
  const togglePipeline = async () => {
    if (!pipeline) return;
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || "demo-user"
        },
        body: JSON.stringify({ is_active: !pipeline.is_active })
      });

      if (res.ok) {
        await fetchPipeline();
      }
    } catch (error) {
      console.error("Failed to toggle pipeline:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <GitBranch className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Pipeline nicht gefunden</h3>
          <Button onClick={() => router.push("/pipelines")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zu Pipelines
          </Button>
        </div>
      </div>
    );
  }

  const successRate = pipeline.execution_count > 0
    ? Math.round((pipeline.successful_count / pipeline.execution_count) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/pipelines")}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                pipeline.is_active ? "bg-indigo-500/20" : "bg-zinc-800"
              )}>
                <GitBranch className={cn(
                  "h-6 w-6",
                  pipeline.is_active ? "text-indigo-400" : "text-zinc-500"
                )} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {pipeline.name}
                  {!pipeline.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-normal">
                      Inaktiv
                    </span>
                  )}
                </h1>
                {pipeline.description && (
                  <p className="text-zinc-400 mt-1">{pipeline.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePipeline}
            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
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
            disabled={isExecuting || !pipeline.is_active}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Wird ausgeführt...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Jetzt ausführen
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Ausführungen"
          value={pipeline.execution_count.toString()}
          icon={Activity}
          color="blue"
        />
        <StatCard
          label="Erfolgreich"
          value={pipeline.successful_count.toString()}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Fehlgeschlagen"
          value={pipeline.failed_count.toString()}
          icon={XCircle}
          color="red"
        />
        <StatCard
          label="Erfolgsrate"
          value={`${successRate}%`}
          icon={Zap}
          color={successRate >= 90 ? "green" : successRate >= 70 ? "yellow" : "red"}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 w-fit">
        {(["overview", "executions", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === tab
                ? "bg-indigo-500/20 text-indigo-400"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {tab === "overview" ? "Übersicht" : tab === "executions" ? "Ausführungen" : "Einstellungen"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Execution Viewer */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-white">Letzte Ausführung</h2>
            {selectedExecution ? (
              <ExecutionViewer execution={selectedExecution} />
            ) : (
              <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 text-center">
                <Clock className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">Noch keine Ausführungen</p>
                <Button
                  onClick={executePipeline}
                  disabled={!pipeline.is_active}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Erste Ausführung starten
                </Button>
              </div>
            )}
          </div>

          {/* Execution History */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Verlauf</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {executions.length > 0 ? (
                executions.slice(0, 10).map((exec) => (
                  <ExecutionHistoryItem
                    key={exec.id}
                    execution={exec}
                    isSelected={selectedExecution?.id === exec.id}
                    onClick={() => setSelectedExecution(exec)}
                  />
                ))
              ) : (
                <p className="text-zinc-500 text-sm">Keine Ausführungen vorhanden</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "executions" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Alle Ausführungen</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Gestartet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Dauer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Trigger</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {new Date(exec.started_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {exec.trigger || "Manuell"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedExecution(exec)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
            <h3 className="text-lg font-semibold text-white">Pipeline-Einstellungen</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={pipeline.name}
                  readOnly
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Beschreibung</label>
                <textarea
                  value={pipeline.description || ""}
                  readOnly
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Trigger-Typ</label>
                <input
                  type="text"
                  value={pipeline.trigger_type}
                  readOnly
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 space-y-4">
            <h3 className="text-lg font-semibold text-red-400">Gefahrenzone</h3>
            <p className="text-sm text-zinc-400">
              Diese Aktionen können nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Pipeline löschen
              </Button>
              <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white">
                <Copy className="h-4 w-4 mr-2" />
                Pipeline duplizieren
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "green" | "red" | "yellow";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };

  return (
    <div className={cn("p-4 rounded-xl border", colorClasses[color])}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    running: { icon: Activity, color: "text-blue-400 bg-blue-500/10", label: "Läuft" },
    completed: { icon: CheckCircle2, color: "text-green-400 bg-green-500/10", label: "Erfolgreich" },
    failed: { icon: XCircle, color: "text-red-400 bg-red-500/10", label: "Fehlgeschlagen" },
    cancelled: { icon: AlertTriangle, color: "text-yellow-400 bg-yellow-500/10", label: "Abgebrochen" },
    pending: { icon: Clock, color: "text-zinc-400 bg-zinc-500/10", label: "Ausstehend" },
  };

  const { icon: Icon, color, label } = config[status] || config.pending;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", color)}>
      <Icon className={cn("h-3.5 w-3.5", status === "running" && "animate-pulse")} />
      {label}
    </span>
  );
}

function ExecutionViewer({ execution }: { execution: PipelineExecution }) {
  // Generate mock steps if not provided
  const steps: ExecutionStep[] = execution.steps || [
    { id: "1", name: "Trigger", type: "trigger", status: "completed", duration: 120 },
    { id: "2", name: "Daten abrufen", type: "tool", status: "completed", duration: 850 },
    { id: "3", name: "AI Analyse", type: "agent", status: execution.status === "running" ? "running" : "completed", duration: 2400 },
    { id: "4", name: "Ergebnis speichern", type: "tool", status: execution.status === "running" ? "pending" : execution.status === "completed" ? "completed" : "failed" },
    { id: "5", name: "Benachrichtigung", type: "tool", status: execution.status === "completed" ? "completed" : "pending" },
  ];

  return (
    <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={execution.status} />
          <span className="text-sm text-zinc-500">
            Gestartet: {new Date(execution.started_at).toLocaleString("de-DE")}
          </span>
        </div>
        {execution.duration && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <Timer className="h-4 w-4" />
            {(execution.duration / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {/* Progress */}
      {execution.status === "running" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Fortschritt</span>
            <span>{execution.current_step || 0} / {execution.total_steps || steps.length}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{
                width: `${((execution.current_step || 0) / (execution.total_steps || steps.length)) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              step.status === "running" && "bg-blue-500/5 border border-blue-500/20",
              step.status === "completed" && "bg-green-500/5",
              step.status === "failed" && "bg-red-500/5 border border-red-500/20"
            )}
          >
            <div className="flex-shrink-0">
              {step.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-400" />}
              {step.status === "running" && <Activity className="h-5 w-5 text-blue-400 animate-pulse" />}
              {step.status === "failed" && <XCircle className="h-5 w-5 text-red-400" />}
              {step.status === "pending" && <Circle className="h-5 w-5 text-zinc-600" />}
              {step.status === "skipped" && <Circle className="h-5 w-5 text-zinc-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.status === "pending" ? "text-zinc-500" : "text-white"
              )}>
                {step.name}
              </p>
              <p className="text-xs text-zinc-600 capitalize">{step.type}</p>
            </div>
            {step.duration && (
              <span className="text-xs text-zinc-500">
                {step.duration}ms
              </span>
            )}
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-zinc-700 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {execution.error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Fehler aufgetreten</p>
              <p className="text-sm text-zinc-400 mt-1">{execution.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionHistoryItem({
  execution,
  isSelected,
  onClick,
}: {
  execution: PipelineExecution;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border transition-all text-left",
        isSelected
          ? "border-indigo-500/30 bg-indigo-500/10"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={execution.status} />
        {execution.duration && (
          <span className="text-xs text-zinc-500">
            {(execution.duration / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {new Date(execution.started_at).toLocaleString("de-DE")}
      </p>
    </button>
  );
}
