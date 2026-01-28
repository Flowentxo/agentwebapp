'use client';

/**
 * PREVIEW PANEL
 *
 * Live testing and simulation of agent workflows
 */

import { useState, useEffect, useRef } from 'react';
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
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MockExecutionEngine, BranchExecution } from './mockExecutionEngine';
import { getUserFriendlyMessage, getProgressPercentage, getEstimatedTimeRemaining } from './userFriendlyMessages';
import { VariableStore } from '@/lib/studio/variable-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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
  duration?: number;
}

interface PreviewPanelProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  isOpen: boolean;
  workflowId?: string; // Optional workflow ID for saved workflows
  variableStore?: VariableStore; // Variable store for runtime resolution
}

export function PreviewPanel({ nodes, edges, onClose, isOpen, workflowId, variableStore }: PreviewPanelProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: '1',
      name: 'Test Case 1',
      input: 'Sample input for testing',
      expectedOutput: ''
    }
  ]);
  const [selectedTestCase, setSelectedTestCase] = useState<string>('1');
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'pending' | 'running' | 'success' | 'error' | null>(null);
  const [activeBranches, setActiveBranches] = useState<BranchExecution[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debug: Log when isOpen changes
  useEffect(() => {
    console.log('🟢 PreviewPanel: isOpen changed to:', isOpen);
    console.log('🟢 PreviewPanel: workflowId:', workflowId);
    console.log('🟢 PreviewPanel: nodes count:', nodes.length);
  }, [isOpen, workflowId, nodes.length]);

  // Cleanup: Stop polling when panel closes or component unmounts
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        console.log('🧹 [PreviewPanel] Cleanup: Stopping polling');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Stop polling when panel closes
  useEffect(() => {
    if (!isOpen && pollIntervalRef.current) {
      console.log('🧹 [PreviewPanel] Panel closed, stopping polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setIsRunning(false);
    }
  }, [isOpen]);

  const currentTestCase = testCases.find(tc => tc.id === selectedTestCase);

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      name: `Test Case ${testCases.length + 1}`,
      input: '',
      expectedOutput: ''
    };
    setTestCases([...testCases, newTestCase]);
    setSelectedTestCase(newTestCase.id);
  };

  const deleteTestCase = (id: string) => {
    if (testCases.length === 1) return; // Keep at least one test case
    setTestCases(testCases.filter(tc => tc.id !== id));
    if (selectedTestCase === id) {
      setSelectedTestCase(testCases[0]?.id || '');
    }
  };

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    setTestCases(testCases.map(tc =>
      tc.id === id ? { ...tc, ...updates } : tc
    ));
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const runTest = async () => {
    if (!currentTestCase || nodes.length === 0) {
      console.error('[PreviewPanel] Missing required data for execution');
      setExecutionLogs([{
        nodeId: 'workflow',
        nodeName: 'Workflow',
        level: 'error',
        message: 'Please add modules to your workflow before testing',
        timestamp: Date.now()
      }]);
      return;
    }

    // ALWAYS use simulation mode for now (until backend execution is fully tested)
    // TODO: Add toggle to switch between simulation and real execution
    console.warn('[PreviewPanel] Running in SIMULATION MODE');
    await runLocalSimulation();
    return;

    // Check if workflow is saved (DISABLED FOR NOW)
    /*
    if (!workflowId) {
      console.warn('[PreviewPanel] No workflow ID - running local simulation');
      await runLocalSimulation();
      return;
    }
    */

    setIsRunning(true);
    setExecutionLogs([]);
    setCurrentNodeId(null);
    setExecutionStatus('pending');

    try {
      // Parse input as JSON if possible
      let inputData;
      if (!currentTestCase) {
        inputData = {};
      } else {
        try {
          inputData = JSON.parse(currentTestCase!.input);
        } catch {
          inputData = currentTestCase!.input;
        }
      }

      // Trigger workflow execution
      // Use consistent user ID (same as used for saving)
      const response = await axios.post(
        `${API_BASE_URL}/api/workflows/${workflowId}/execute`,
        {
          input: inputData,
          isTest: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'default-user' // FIXED: Match with workflow creation
          }
        }
      );

      console.log('[PreviewPanel] Execution started:', response.data);

      // Start polling for status updates
      startPolling();

    } catch (error: any) {
      console.error('[PreviewPanel] Execution failed:', error);
      setExecutionStatus('error');
      setExecutionLogs([{
        nodeId: 'workflow',
        nodeName: 'Workflow',
        level: 'error',
        message: error.response?.data?.error || error.message || 'Failed to start execution',
        timestamp: Date.now()
      }]);
      setIsRunning(false);
    }
  };

  // Local simulation for unsaved workflows using Mock Engine
  const runLocalSimulation = async () => {
    console.log('[PreviewPanel] 🔵 Starting local simulation with Mock Engine');
    console.log('[PreviewPanel] 🔵 Nodes count:', nodes.length);
    console.log('[PreviewPanel] 🔵 Edges count:', edges.length);

    setIsRunning(true);
    setExecutionLogs([]);
    setCurrentNodeId(null);
    setExecutionStatus('running');
    setActiveBranches([]);

    try {
      console.log('[PreviewPanel] 🔵 Creating MockExecutionEngine instance...');
      const mockEngine = new MockExecutionEngine();

      // Set variable store for runtime resolution
      if (variableStore) {
        console.log('[PreviewPanel] 🔵 Setting variable store for runtime resolution...');
        mockEngine.setVariableStore(variableStore);
      }

      // Add initial warning about simulation mode
      const initialLog: ExecutionLog = {
        nodeId: 'system',
        nodeName: 'System',
        level: 'warning',
        message: '⚠️ Simulation-Modus aktiv. Speichere den Workflow für echte Ausführung.',
        timestamp: Date.now()
      };
      console.log('[PreviewPanel] 🔵 Setting initial log...');
      setExecutionLogs([initialLog]);

      // Parse test case input as workflow input
      const workflowInput = currentTestCase?.input ? JSON.parse(currentTestCase.input || '{}') : {};

      // Execute workflow with live updates
      console.log('[PreviewPanel] 🔵 Calling mockEngine.executeWorkflow()...');
      const executionLogs = await mockEngine.executeWorkflow(nodes, edges, workflowInput);
      console.log('[PreviewPanel] 🟢 Mock execution completed! Logs received:', executionLogs.length);

      // Get active branches for visual feedback
      const branches = mockEngine.getActiveBranches();
      console.log('[PreviewPanel] 🔍 Active branches:', branches.length);
      setActiveBranches(branches);

      // Update logs progressively for better UX
      console.log('[PreviewPanel] 🔵 Starting progressive log rendering...');
      for (let i = 1; i < executionLogs.length; i++) {
        const log = executionLogs[i];
        console.log(`[PreviewPanel] 🔵 Rendering log ${i}/${executionLogs.length}:`, log.nodeName, '-', log.message);

        setExecutionLogs(prev => {
          const updated = [...prev, log];
          console.log(`[PreviewPanel] 🟢 UI logs updated. Count: ${updated.length}`);
          return updated;
        });
        setCurrentNodeId(log.nodeId);

        // Small delay between log updates for visual effect
        if (i < executionLogs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      console.log('[PreviewPanel] 🟢 All logs rendered!');

      setExecutionStatus('success');
      console.log('[PreviewPanel] ✅ Simulation completed successfully');

    } catch (error) {
      console.error('[PreviewPanel] Simulation failed:', error);
      setExecutionLogs(prev => [...prev, {
        nodeId: 'system',
        nodeName: 'System',
        level: 'error',
        message: `❌ Simulation fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        timestamp: Date.now()
      }]);
      setExecutionStatus('error');
    } finally {
      setIsRunning(false);
      setCurrentNodeId(null);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    let pollCount = 0;
    let errorCount = 0;
    const maxPolls = 30; // Poll for up to 90 seconds (30 polls * 3s)
    const MAX_ERRORS = 3;

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      try {
        // Get latest executions for this workflow
        const response = await axios.get(
          `${API_BASE_URL}/api/workflows/${workflowId}/executions`,
          {
            headers: {
              'x-user-id': 'default-user' // FIXED: Match with workflow creation
            },
            params: {
              limit: 1
            }
          }
        );

        // Reset error count on success
        errorCount = 0;

        const latestExecution = response.data.executions[0];

        if (latestExecution) {
          setExecutionStatus(latestExecution.status);
          setExecutionLogs(latestExecution.logs || []);

          // Stop polling if execution is complete
          if (latestExecution.status === 'success' || latestExecution.status === 'error') {
            console.log('✅ [PreviewPanel] Execution completed, stopping poll');
            stopPolling();
            setIsRunning(false);
          }
        }

        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          console.warn('⚠️ [PreviewPanel] Max poll attempts reached, stopping');
          stopPolling();
          setIsRunning(false);
        }

      } catch (error: any) {
        errorCount++;
        console.error('[PreviewPanel] Polling error:', error);

        // Stop on 429 Rate Limit immediately
        if (error.response?.status === 429) {
          console.error('🔴 [PreviewPanel] Rate limit reached (429), stopping poll');
          stopPolling();
          setIsRunning(false);
          setExecutionLogs(prev => [...prev, {
            nodeId: 'system',
            nodeName: 'System',
            level: 'error',
            message: '⚠️ Rate limit erreicht. Bitte warte kurz und versuche es erneut.',
            timestamp: Date.now()
          }]);
          return;
        }

        // Stop after too many errors
        if (errorCount >= MAX_ERRORS) {
          console.error('🔴 [PreviewPanel] Too many errors, stopping poll');
          stopPolling();
          setIsRunning(false);
          setExecutionLogs(prev => [...prev, {
            nodeId: 'system',
            nodeName: 'System',
            level: 'error',
            message: '❌ Polling gestoppt wegen wiederholter Fehler. Bitte lade die Seite neu.',
            timestamp: Date.now()
          }]);
          return;
        }
      }
    }, 3000); // Poll every 3 seconds (reduced from 1s to prevent rate limiting)
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const stopTest = () => {
    stopPolling();
    setIsRunning(false);
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full w-[400px] flex-col border-l border-white/10 bg-surface-1 overflow-hidden flex-shrink-0"
    >
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text">Live Preview</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-card/5 hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Test Case Selector */}
        <div className="flex gap-2 mb-3">
          <select
            value={selectedTestCase}
            onChange={(e) => setSelectedTestCase(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
          >
            {testCases.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.name}</option>
            ))}
          </select>
          <button
            onClick={addTestCase}
            className="rounded-lg border border-white/10 bg-surface-0 p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
            title="Add Test Case"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => currentTestCase && deleteTestCase(currentTestCase.id)}
            disabled={testCases.length === 1}
            className="rounded-lg border border-white/10 bg-surface-0 p-2 text-text-muted transition hover:bg-card/5 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete Test Case"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Run Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={runTest}
              disabled={nodes.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title={nodes.length === 0 ? 'Add modules to the canvas first' : !workflowId ? 'Will run in simulation mode' : 'Run with backend execution'}
            >
              <Play className="h-4 w-4" />
              {workflowId ? 'Run Test' : 'Run Simulation'}
            </button>
          ) : (
            <button
              onClick={stopTest}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          )}
        </div>

        {/* Workflow Status */}
        {!workflowId && nodes.length > 0 && (
          <div className="mt-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🧪</span>
              <span className="text-xs font-semibold text-blue-300">Simulation-Modus</span>
            </div>
            <p className="text-xs text-blue-200/90">
              Du testest mit simulierten Daten. Workflow speichern für echte Backend-Ausführung.
            </p>
          </div>
        )}
      </div>

      {/* Test Case Configuration */}
      {currentTestCase && (
        <div className="border-b border-white/10 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-2 block">Test Case Name</label>
            <input
              type="text"
              value={currentTestCase.name}
              onChange={(e) => updateTestCase(currentTestCase.id, { name: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-2 block">Input Data</label>
            <textarea
              value={currentTestCase.input}
              onChange={(e) => updateTestCase(currentTestCase.id, { input: e.target.value })}
              rows={4}
              placeholder="Enter test input..."
              className="w-full resize-none rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text font-mono outline-none transition focus:border-[rgb(var(--accent))]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-2 block">Expected Output (Optional)</label>
            <textarea
              value={currentTestCase.expectedOutput || ''}
              onChange={(e) => updateTestCase(currentTestCase.id, { expectedOutput: e.target.value })}
              rows={3}
              placeholder="Enter expected output..."
              className="w-full resize-none rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text font-mono outline-none transition focus:border-[rgb(var(--accent))]"
            />
          </div>
        </div>
      )}

      {/* Execution Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Header with Status and Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text">Execution Logs</h3>
            {executionStatus && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                executionStatus === 'success' ? 'bg-green-400/10 text-green-400' :
                executionStatus === 'error' ? 'bg-red-400/10 text-red-400' :
                executionStatus === 'running' ? 'bg-blue-400/10 text-blue-400' :
                'bg-gray-400/10 text-muted-foreground'
              }`}>
                {executionStatus === 'success' ? '✅ SUCCESS' :
                 executionStatus === 'error' ? '❌ ERROR' :
                 executionStatus === 'running' ? '⚙️ RUNNING' :
                 'PENDING'}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {isRunning && nodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{getProgressPercentage(executionLogs, nodes.length)}% abgeschlossen</span>
                <span>{getEstimatedTimeRemaining(executionLogs, nodes.length)}</span>
              </div>
              <div className="h-1.5 bg-card/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgressPercentage(executionLogs, nodes.length)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {nodes.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              Add modules to the canvas to test
            </p>
          </div>
        ) : executionLogs.length === 0 ? (
          <div className="text-center py-8">
            <Play className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              Click "Run Test" to start execution
            </p>
            {!workflowId && (
              <p className="text-xs text-yellow-400 mt-2">
                ⚠️ Workflow nicht gespeichert - Simulation-Modus wird verwendet
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {executionLogs.map((log, index) => (
              <ExecutionLogItem
                key={`${log.nodeId}-${log.timestamp}`}
                log={log}
              />
            ))}

            {/* Active Branches Visualization */}
            {activeBranches.length > 0 && executionStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎯</span>
                  <h4 className="text-sm font-semibold text-purple-300">
                    Branch Execution Summary
                  </h4>
                </div>
                <div className="space-y-2">
                  {activeBranches.map((branch, index) => {
                    const conditionNode = nodes.find(n => n.id === branch.nodeId);
                    const nodeName = conditionNode?.data?.label || `Condition ${index + 1}`;

                    return (
                      <div
                        key={branch.nodeId}
                        className="p-3 rounded-lg bg-surface-0 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-text">
                            {nodeName}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            branch.conditionPassed
                              ? 'bg-green-400/20 text-green-400'
                              : 'bg-red-400/20 text-red-400'
                          }`}>
                            {branch.conditionPassed ? '✅ TRUE' : '❌ FALSE'}
                          </span>
                        </div>

                        {/* Branch Path Indicator */}
                        <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                          <span>→</span>
                          <span className={branch.conditionPassed ? 'text-green-400' : 'text-red-400'}>
                            {branch.branchTaken === 'true' ? 'True Branch' : 'False Branch'}
                          </span>
                        </div>

                        {/* Rules Summary */}
                        {branch.evaluatedRules.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <div className="text-xs text-text-muted mb-1">
                              Rules: {branch.evaluatedRules.filter(r => r.result).length}/{branch.evaluatedRules.length} passed
                            </div>
                            <div className="space-y-1">
                              {branch.evaluatedRules.slice(0, 3).map((rule, ruleIdx) => (
                                <div
                                  key={rule.ruleId}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className={rule.result ? 'text-green-400' : 'text-red-400'}>
                                    {rule.result ? '✓' : '✗'}
                                  </span>
                                  <span className="text-text-muted truncate">
                                    {JSON.stringify(rule.leftValue)} {rule.error ? '(error)' : `vs ${JSON.stringify(rule.rightValue)}`}
                                  </span>
                                </div>
                              ))}
                              {branch.evaluatedRules.length > 3 && (
                                <div className="text-xs text-text-muted italic">
                                  +{branch.evaluatedRules.length - 3} more rules...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Success Celebration */}
            {executionStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 p-4 text-center"
              >
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm font-semibold text-green-300 mb-1">
                  Workflow erfolgreich abgeschlossen!
                </p>
                <p className="text-xs text-green-200/80">
                  Alle {nodes.length} Module wurden erfolgreich ausgeführt
                </p>
              </motion.div>
            )}

            {/* Error Summary */}
            {executionStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-4 rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/50 p-4 text-center"
              >
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-sm font-semibold text-red-300 mb-1">
                  Workflow-Fehler
                </p>
                <p className="text-xs text-red-200/80">
                  Bitte überprüfe die Logs für Details
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Helper Component: Execution Log Item
interface ExecutionLogItemProps {
  log: ExecutionLog;
}

function ExecutionLogItem({ log }: ExecutionLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Get user-friendly message
  const friendlyMessage = getUserFriendlyMessage(
    log.nodeName,
    log.message,
    log.level,
    log.data
  );

  const getLevelColor = () => {
    switch (friendlyMessage.variant) {
      case 'info':
        return 'border-blue-400/30 bg-blue-400/5 hover:bg-blue-400/10';
      case 'warning':
        return 'border-yellow-400/30 bg-yellow-400/5 hover:bg-yellow-400/10';
      case 'error':
        return 'border-red-400/50 bg-red-400/10 hover:bg-red-400/15';
      case 'success':
        return 'border-green-400/50 bg-green-400/10 hover:bg-green-400/15';
    }
  };

  const getTextColor = () => {
    switch (friendlyMessage.variant) {
      case 'info':
        return 'text-blue-300';
      case 'warning':
        return 'text-yellow-300';
      case 'error':
        return 'text-red-300';
      case 'success':
        return 'text-green-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-lg border p-3 transition-all ${getLevelColor()}`}
    >
      {/* Main Content */}
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => log.data && setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {friendlyMessage.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text mb-0.5">
            {friendlyMessage.title}
          </p>
          <p className={`text-xs ${getTextColor()} leading-relaxed`}>
            {friendlyMessage.description}
          </p>

          {/* Duration Badge */}
          {log.duration && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-text-muted bg-card/5 px-2 py-0.5 rounded">
                ⏱️ {(log.duration / 1000).toFixed(2)}s
              </span>
            </div>
          )}
        </div>

        {/* Expand Arrow */}
        {log.data && (
          <ChevronRight
            className={`h-4 w-4 text-text-muted transition-transform flex-shrink-0 mt-1 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
      </div>

      {/* Collapsible Details Section */}
      <AnimatePresence>
        {isExpanded && log.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-white/10 overflow-hidden"
          >
            {/* Toggle for Technical Details */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-text-muted">Ausgabe-Details</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTechnicalDetails(!showTechnicalDetails);
                }}
                className="text-xs text-accent hover:text-accent/80 transition"
              >
                {showTechnicalDetails ? 'Verbergen' : 'Technische Details anzeigen'}
              </button>
            </div>

            {/* User-Friendly Data Display */}
            {!showTechnicalDetails && (
              <div className="space-y-1">
                {Object.entries(log.data).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-text-muted capitalize min-w-[80px]">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-text flex-1">
                      {typeof value === 'object'
                        ? JSON.stringify(value).substring(0, 50) + '...'
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Technical JSON Details */}
            {showTechnicalDetails && (
              <pre className="text-xs text-text bg-muted/30 rounded p-2 overflow-x-auto max-h-40">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
