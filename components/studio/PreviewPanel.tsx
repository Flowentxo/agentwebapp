'use client';

/**
 * PREVIEW PANEL - PRODUCTION READY
 *
 * Live testing with simulation mode AND real workflow execution
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Play,
  Square,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Zap,
  Cpu,
  List,
  GitBranch,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { MockExecutionEngine, BranchExecution } from './mockExecutionEngine';
import { getUserFriendlyMessage, getProgressPercentage, getEstimatedTimeRemaining } from './userFriendlyMessages';
import { VariableStore } from '@/lib/studio/variable-store';
import {
  executeWorkflow,
  getExecutionStatus,
  createWorkflow,
  updateWorkflow
} from '@/lib/api/workflows-client';
import { ExecutionTimeline, ExecutionStep } from './ExecutionTimeline';

const isDevelopment = process.env.NODE_ENV === 'development';

// Cost Estimation Types
interface CostEstimate {
  minCost: number;
  maxCost: number;
  avgCost: number;
  warnings: string[];
  estimatedTokens: number;
  nodeEstimates: Array<{
    nodeId: string;
    nodeName: string;
    estimatedCost: number;
    costTier: 'free' | 'low' | 'medium' | 'high' | 'premium';
  }>;
}

interface BudgetStatus {
  allowed: boolean;
  remainingBudget: number;
  percentageOfBudget: number;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

interface CostDisplayInfo {
  formattedMinCost: string;
  formattedMaxCost: string;
  formattedAvgCost: string;
  costLabel: string;
  colorClass: string;
}

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput?: string;
}

interface ExecutionLog {
  nodeId: string;
  nodeName: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
  timestamp: number;
}

interface PreviewPanelProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  isOpen: boolean;
  workflowId?: string;
  variableStore?: VariableStore;
}

export function PreviewPanel({ nodes, edges, onClose, isOpen, workflowId, variableStore }: PreviewPanelProps) {
  // Theme support
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Test Cases
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: '1',
      name: 'Test Case 1',
      input: '{"message": "Hello World"}',
      expectedOutput: ''
    }
  ]);
  const [selectedTestCase, setSelectedTestCase] = useState<string>('1');

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'pending' | 'running' | 'success' | 'error' | null>(null);
  const [activeBranches, setActiveBranches] = useState<BranchExecution[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);

  // NEW: Execution Mode Toggle
  const [useRealExecution, setUseRealExecution] = useState<boolean>(!isDevelopment); // Production default: REAL

  // NEW: View Toggle (Logs vs Timeline)
  const [viewMode, setViewMode] = useState<'logs' | 'timeline'>('timeline');

  // Cost Estimation State
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [costDisplayInfo, setCostDisplayInfo] = useState<CostDisplayInfo | null>(null);
  const [isLoadingCost, setIsLoadingCost] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);

  // Polling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLogs]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Get current test case
  const currentTestCase = testCases.find(tc => tc.id === selectedTestCase);

  /**
   * Fetch cost estimation when nodes change
   */
  const fetchCostEstimate = useCallback(async () => {
    if (nodes.length === 0) {
      setCostEstimate(null);
      setBudgetStatus(null);
      setCostDisplayInfo(null);
      return;
    }

    setIsLoadingCost(true);
    setCostError(null);

    try {
      const response = await fetch('/api/workflows/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          edges,
          includeNodeBreakdown: true,
          includeBudgetCheck: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to estimate cost');
      }

      const data = await response.json();

      if (data.success) {
        setCostEstimate(data.data.estimate);
        setBudgetStatus(data.data.budgetStatus || null);
        setCostDisplayInfo(data.data.displayInfo);
      } else {
        setCostError(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[PreviewPanel] Cost estimation error:', error);
      setCostError(error.message);
    } finally {
      setIsLoadingCost(false);
    }
  }, [nodes, edges]);

  // Fetch cost estimate when nodes/edges change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCostEstimate();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [fetchCostEstimate]);

  /**
   * Convert execution logs to timeline steps
   */
  const timelineSteps = useMemo(() => {
    const stepMap = new Map<string, ExecutionStep>();

    executionLogs.forEach(log => {
      const existingStep = stepMap.get(log.nodeId);

      if (!existingStep) {
        // Create new step
        stepMap.set(log.nodeId, {
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          nodeType: log.data?.nodeType || 'unknown',
          status: log.data?.status || (log.level === 'error' ? 'error' : log.level === 'success' ? 'success' : 'running'),
          startTime: log.data?.startTime || log.timestamp,
          endTime: log.data?.endTime,
          duration: log.data?.duration,
          input: log.data?.inputs,
          output: log.data?.output,
          error: log.data?.error || (log.level === 'error' ? log.message : undefined),
          logs: [log.message]
        });
      } else {
        // Update existing step
        existingStep.logs.push(log.message);

        if (log.data?.status) {
          existingStep.status = log.data.status;
        }

        if (log.data?.endTime) {
          existingStep.endTime = log.data.endTime;
        }

        if (log.data?.duration) {
          existingStep.duration = log.data.duration;
        }

        if (log.data?.output) {
          existingStep.output = log.data.output;
        }

        if (log.data?.error) {
          existingStep.error = log.data.error;
          existingStep.status = 'error';
        }
      }
    });

    return Array.from(stepMap.values());
  }, [executionLogs]);

  /**
   * SIMULATION MODE: Execute workflow using MockExecutionEngine
   */
  const executeSimulation = async () => {
    if (!variableStore) {
      addLog({
        nodeId: 'system',
        nodeName: 'System',
        level: 'error',
        message: 'Variable store not available',
        timestamp: Date.now()
      });
      setExecutionStatus('error');
      return;
    }

    const mockEngine = new MockExecutionEngine();

    const workflowInput = currentTestCase?.input ? JSON.parse(currentTestCase.input || '{}') : {};

    const executionLogs = await mockEngine.executeWorkflow(nodes, edges, workflowInput);
    const branches = mockEngine.getActiveBranches();
    setActiveBranches(branches);

    // Progressive log rendering
    for (let i = 1; i < executionLogs.length; i++) {
      const log = executionLogs[i];
      setExecutionLogs(prev => [...prev, log]);
      setCurrentNodeId(log.nodeId);

      if (i < executionLogs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    setExecutionStatus('success');
    setIsRunning(false);
  };

  /**
   * REAL EXECUTION MODE: Execute workflow via Backend API
   */
  const executeReal = async () => {
    let savedWorkflowId = workflowId;

    // Step 1: Save workflow if not saved yet
    if (!savedWorkflowId) {
      try {
        addLog({
          nodeId: 'system',
          nodeName: 'System',
          level: 'info',
          message: '💾 Auto-saving workflow before execution...',
          timestamp: Date.now()
        });

        const { workflow } = await createWorkflow({
          name: `Untitled Workflow - ${new Date().toISOString()}`,
          description: 'Auto-saved for test execution',
          nodes,
          edges,
          status: 'draft',
          visibility: 'private'
        });

        savedWorkflowId = workflow.id;

        addLog({
          nodeId: 'system',
          nodeName: 'System',
          level: 'success',
          message: `✅ Workflow saved (ID: ${savedWorkflowId})`,
          timestamp: Date.now()
        });
      } catch (error: any) {
        addLog({
          nodeId: 'system',
          nodeName: 'System',
          level: 'error',
          message: `❌ Failed to save workflow: ${error.message}`,
          timestamp: Date.now()
        });
        setExecutionStatus('error');
        setIsRunning(false);
        return;
      }
    } else {
      // Update existing workflow
      try {
        await updateWorkflow(savedWorkflowId, { nodes, edges });
        addLog({
          nodeId: 'system',
          nodeName: 'System',
          level: 'info',
          message: '💾 Workflow updated',
          timestamp: Date.now()
        });
      } catch (error: any) {
        addLog({
          nodeId: 'system',
          nodeName: 'System',
          level: 'warning',
          message: `⚠️ Failed to update workflow: ${error.message}`,
          timestamp: Date.now()
        });
      }
    }

    // Step 2: Start execution
    try {
      const workflowInput = currentTestCase?.input ? JSON.parse(currentTestCase.input || '{}') : {};

      addLog({
        nodeId: 'system',
        nodeName: 'System',
        level: 'info',
        message: '🚀 Starting workflow execution...',
        timestamp: Date.now()
      });

      const result = await executeWorkflow(savedWorkflowId, workflowInput, true);

      setExecutionId(result.executionId);

      addLog({
        nodeId: 'system',
        nodeName: 'System',
        level: 'success',
        message: `✅ Execution started (ID: ${result.executionId})`,
        timestamp: Date.now()
      });

      // Step 3: Poll for status
      pollExecutionStatus(result.executionId);
    } catch (error: any) {
      addLog({
        nodeId: 'system',
        nodeName: 'System',
        level: 'error',
        message: `❌ Execution failed: ${error.message}`,
        timestamp: Date.now()
      });
      setExecutionStatus('error');
      setIsRunning(false);
    }
  };

  /**
   * Poll execution status
   */
  const pollExecutionStatus = (execId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getExecutionStatus(execId);

        setExecutionStatus(status.status);
        setCurrentNodeId(status.currentNodeId || null);

        // Add logs if available
        if (status.logs && status.logs.length > 0) {
          status.logs.forEach((log: any) => {
            addLog({
              nodeId: log.nodeId || 'unknown',
              nodeName: log.nodeName || 'Unknown',
              level: log.level || 'info',
              message: log.message,
              data: log.data,
              timestamp: log.timestamp || Date.now()
            });
          });
        }

        // Stop polling if completed
        if (status.status === 'success' || status.status === 'error') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setIsRunning(false);

          if (status.status === 'success') {
            addLog({
              nodeId: 'system',
              nodeName: 'System',
              level: 'success',
              message: '🎉 Execution completed successfully',
              data: status.output,
              timestamp: Date.now()
            });
          } else {
            addLog({
              nodeId: 'system',
              nodeName: 'System',
              level: 'error',
              message: `❌ Execution failed: ${status.error}`,
              timestamp: Date.now()
            });
          }
        }
      } catch (error: any) {
        console.error('[PreviewPanel] Polling error:', error);
      }
    }, 1000); // Poll every second
  };

  /**
   * Helper: Add log
   */
  const addLog = (log: ExecutionLog) => {
    setExecutionLogs(prev => [...prev, log]);
  };

  /**
   * RUN WORKFLOW
   */
  const handleRun = async () => {
    // Validation
    if (nodes.length === 0) {
      alert('⚠️ Canvas is empty! Add some modules first.');
      return;
    }

    // Reset state
    setIsRunning(true);
    setExecutionLogs([]);
    setCurrentNodeId(null);
    setExecutionStatus('running');
    setActiveBranches([]);
    setExecutionId(null);

    // Initial log
    addLog({
      nodeId: 'system',
      nodeName: 'System',
      level: 'info',
      message: `🎬 Starting execution (Mode: ${useRealExecution ? 'LIVE' : 'SIMULATION'})`,
      timestamp: Date.now()
    });

    // Execute based on mode
    if (useRealExecution) {
      await executeReal();
    } else {
      await executeSimulation();
    }
  };

  /**
   * STOP EXECUTION
   */
  const handleStop = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsRunning(false);
    setExecutionStatus(null);
    addLog({
      nodeId: 'system',
      nodeName: 'System',
      level: 'warning',
      message: '⏹️ Execution stopped by user',
      timestamp: Date.now()
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 480, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex h-full flex-col border-l transition-colors duration-200",
        isDark ? "border-white/10 bg-zinc-900" : "border-border bg-card"
      )}
    >
      {/* Header */}
      <div className={cn(
        "border-b p-4",
        isDark ? "border-white/10" : "border-border"
      )}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={cn(
            "text-lg font-semibold",
            isDark ? "text-white" : "text-zinc-900"
          )}>Test Run</h2>
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg p-1.5 transition",
              isDark
                ? "text-zinc-400 hover:bg-card/10 hover:text-white"
                : "text-muted-foreground hover:bg-muted hover:text-zinc-900"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* NEW: Execution Mode Toggle */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg border",
          isDark ? "border-white/10 bg-zinc-800" : "border-border bg-muted/50"
        )}>
          <button
            onClick={() => setUseRealExecution(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition",
              !useRealExecution
                ? 'bg-purple-500 text-white'
                : isDark ? 'text-zinc-400 hover:bg-card/5' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Cpu className="w-4 h-4" />
            Simulation
          </button>
          <button
            onClick={() => setUseRealExecution(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition",
              useRealExecution
                ? 'bg-green-500 text-white'
                : isDark ? 'text-zinc-400 hover:bg-card/5' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Zap className="w-4 h-4" />
            Live
          </button>
        </div>

        <p className={cn(
          "text-xs mt-2",
          isDark ? "text-zinc-400" : "text-muted-foreground"
        )}>
          {useRealExecution
            ? '✅ Using real backend execution'
            : '⚡ Using fast local simulation'}
        </p>
      </div>

      {/* Test Cases */}
      <div className={cn(
        "border-b p-4",
        isDark ? "border-white/10" : "border-border"
      )}>
        <label className={cn(
          "mb-2 block text-xs font-medium",
          isDark ? "text-white" : "text-zinc-900"
        )}>Test Input</label>
        <textarea
          value={currentTestCase?.input || ''}
          onChange={(e) => {
            setTestCases(prev =>
              prev.map(tc =>
                tc.id === selectedTestCase ? { ...tc, input: e.target.value } : tc
              )
            );
          }}
          rows={4}
          placeholder='{"message": "Hello World"}'
          className={cn(
            "w-full resize-none rounded-lg border px-3 py-2 text-xs font-mono outline-none transition focus:ring-2 focus:ring-primary/20",
            isDark
              ? "border-white/10 bg-zinc-800 text-white placeholder:text-zinc-500"
              : "border-border bg-muted/50 text-zinc-900 placeholder:text-muted-foreground"
          )}
        />
      </div>

      {/* Cost Projection Section */}
      <div className={cn(
        "border-b p-4",
        isDark ? "border-white/10" : "border-border"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className={cn("h-4 w-4", isDark ? "text-zinc-400" : "text-muted-foreground")} />
            <h3 className={cn("text-sm font-medium", isDark ? "text-white" : "text-zinc-900")}>Cost Projection</h3>
          </div>
          {isLoadingCost && (
            <Loader2 className={cn("h-4 w-4 animate-spin", isDark ? "text-zinc-400" : "text-muted-foreground")} />
          )}
        </div>

        {costError && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{costError}</span>
          </div>
        )}

        {!costError && costEstimate && costDisplayInfo && (
          <div className="space-y-3">
            {/* Cost Overview */}
            <div className="grid grid-cols-3 gap-2">
              <div className={cn(
                "rounded-lg border p-2 text-center",
                isDark ? "border-white/10 bg-zinc-800" : "border-border bg-muted/50"
              )}>
                <p className={cn("text-[10px] uppercase tracking-wide", isDark ? "text-zinc-400" : "text-muted-foreground")}>Min</p>
                <p className="text-sm font-semibold text-emerald-500">{costDisplayInfo.formattedMinCost}</p>
              </div>
              <div className={cn(
                "rounded-lg border p-2 text-center",
                isDark ? "border-white/10 bg-zinc-800" : "border-border bg-muted/50"
              )}>
                <p className={cn("text-[10px] uppercase tracking-wide", isDark ? "text-zinc-400" : "text-muted-foreground")}>Avg</p>
                <p className={`text-sm font-semibold ${costDisplayInfo.colorClass}`}>{costDisplayInfo.formattedAvgCost}</p>
              </div>
              <div className={cn(
                "rounded-lg border p-2 text-center",
                isDark ? "border-white/10 bg-zinc-800" : "border-border bg-muted/50"
              )}>
                <p className={cn("text-[10px] uppercase tracking-wide", isDark ? "text-zinc-400" : "text-muted-foreground")}>Max</p>
                <p className="text-sm font-semibold text-orange-500">{costDisplayInfo.formattedMaxCost}</p>
              </div>
            </div>

            {/* Cost Tier Badge */}
            <div className="flex items-center justify-between">
              <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-muted-foreground")}>Cost Tier</span>
              <span className={`text-sm font-bold ${costDisplayInfo.colorClass}`}>
                {costDisplayInfo.costLabel}
              </span>
            </div>

            {/* Token Estimate */}
            {costEstimate.estimatedTokens > 0 && (
              <div className="flex items-center justify-between">
                <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-muted-foreground")}>Est. Tokens</span>
                <span className={cn("text-xs font-mono", isDark ? "text-white" : "text-zinc-900")}>
                  ~{costEstimate.estimatedTokens.toLocaleString()}
                </span>
              </div>
            )}

            {/* Budget Status */}
            {budgetStatus && (
              <div className={`rounded-lg p-3 border ${
                budgetStatus.warningLevel === 'critical'
                  ? 'bg-red-500/10 border-red-500/30'
                  : budgetStatus.warningLevel === 'high'
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : budgetStatus.warningLevel === 'medium'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {budgetStatus.warningLevel === 'critical' || budgetStatus.warningLevel === 'high' ? (
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
                      budgetStatus.warningLevel === 'critical' ? 'text-red-400' : 'text-orange-400'
                    }`} />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  )}
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${
                      budgetStatus.warningLevel === 'critical'
                        ? 'text-red-400'
                        : budgetStatus.warningLevel === 'high'
                        ? 'text-orange-400'
                        : 'text-emerald-400'
                    }`}>
                      {budgetStatus.allowed ? 'Within Budget' : 'Exceeds Budget'}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Remaining: ${budgetStatus.remainingBudget.toFixed(2)}
                      {budgetStatus.percentageOfBudget > 0 && (
                        <span className="ml-1">
                          ({budgetStatus.percentageOfBudget.toFixed(1)}% of monthly)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {costEstimate.warnings.length > 0 && (
              <div className="space-y-1.5">
                {costEstimate.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-yellow-400">
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!costError && !costEstimate && nodes.length === 0 && (
          <p className={cn("text-xs text-center py-2", isDark ? "text-zinc-400" : "text-muted-foreground")}>
            Add nodes to see cost projection
          </p>
        )}
      </div>

      {/* View Toggle + Execution History */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View Mode Toggle */}
        <div className={cn(
          "border-b px-4 py-2",
          isDark ? "border-white/10" : "border-border"
        )}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition",
                viewMode === 'timeline'
                  ? 'bg-primary text-white'
                  : isDark ? 'text-zinc-400 hover:bg-card/5' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('logs')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition",
                viewMode === 'logs'
                  ? 'bg-primary text-white'
                  : isDark ? 'text-zinc-400 hover:bg-card/5' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <List className="w-3.5 h-3.5" />
              Logs
            </button>
            {executionLogs.length > 0 && (
              <span className={cn("ml-auto text-xs", isDark ? "text-zinc-400" : "text-muted-foreground")}>
                {viewMode === 'timeline' ? `${timelineSteps.length} steps` : `${executionLogs.length} logs`}
              </span>
            )}
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'timeline' ? (
            <ExecutionTimeline
              steps={timelineSteps}
              currentNodeId={currentNodeId}
              isRunning={isRunning}
            />
          ) : (
            <div className="space-y-2">
              {executionLogs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-lg border p-3",
                    log.level === 'error'
                      ? 'border-red-500/30 bg-red-500/10'
                      : log.level === 'warning'
                      ? 'border-yellow-500/30 bg-yellow-500/10'
                      : log.level === 'success'
                      ? 'border-green-500/30 bg-green-500/10'
                      : isDark ? 'border-white/10 bg-zinc-800' : 'border-border bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {log.level === 'error' && <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    {log.level === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />}
                    {log.level === 'info' && <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />}
                    {log.level === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium break-words", isDark ? "text-white" : "text-zinc-900")}>{log.nodeName}</p>
                      <p className={cn("text-xs mt-0.5 break-words", isDark ? "text-zinc-400" : "text-muted-foreground")}>{log.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer: Run Button */}
      <div className={cn(
        "border-t p-4",
        isDark ? "border-white/10" : "border-border"
      )}>
        {/* Budget Warning Banner */}
        {budgetStatus && !budgetStatus.allowed && !isRunning && (
          <div className="mb-3 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-red-400">Budget Exceeded</p>
              <p className="text-[10px] text-red-400/80">
                This workflow may exceed your remaining budget. Consider using cheaper models.
              </p>
            </div>
          </div>
        )}

        {!isRunning ? (
          <button
            onClick={handleRun}
            disabled={nodes.length === 0 || (useRealExecution && budgetStatus && !budgetStatus.allowed)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${
              budgetStatus && !budgetStatus.allowed && useRealExecution
                ? 'bg-red-500/50 cursor-not-allowed'
                : 'bg-[rgb(var(--accent))]'
            }`}
            title={
              budgetStatus && !budgetStatus.allowed && useRealExecution
                ? 'Budget exceeded - switch to Simulation mode or reduce workflow cost'
                : undefined
            }
          >
            <Play className="h-4 w-4" />
            {costDisplayInfo && costEstimate && costEstimate.avgCost > 0 ? (
              <span>Run Test ({costDisplayInfo.formattedAvgCost})</span>
            ) : (
              <span>Run Test</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Square className="h-4 w-4" />
            Stop Execution
          </button>
        )}
      </div>
    </motion.div>
  );
}
