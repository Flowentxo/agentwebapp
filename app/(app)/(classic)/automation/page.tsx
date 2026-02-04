'use client';

/**
 * BROWSER AUTOMATION DASHBOARD
 *
 * Computer Use agent interface for web automation, scraping, and testing
 */

import { useState, useEffect } from 'react';
import {
  createSession,
  getActiveSessions,
  closeSession,
  navigate,
  click,
  type as typeText,
  screenshot,
  scrape,
  executeWorkflow,
  WorkflowBuilder,
  BrowserSession,
  AutomationTask,
  AutomationResult,
} from '@/lib/api/computer-use-client';
import {
  Monitor,
  Globe,
  MousePointer,
  Type,
  Camera,
  Code,
  Play,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'sessions' | 'workflow' | 'results';

interface WorkflowStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'scrape' | 'wait';
  config: any;
}

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<AutomationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await getActiveSessions();
      setSessions(response.sessions);
    } catch (error) {
      console.error('[AUTOMATION] Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleCreateSession = async () => {
    try {
      setIsLoading(true);
      const response = await createSession({ headless: true });
      setSelectedSession(response.sessionId);
      await loadSessions();
    } catch (error) {
      console.error('[AUTOMATION] Failed to create session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await closeSession(sessionId);
      if (selectedSession === sessionId) {
        setSelectedSession(null);
      }
      await loadSessions();
    } catch (error) {
      console.error('[AUTOMATION] Failed to close session:', error);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!selectedSession || workflowSteps.length === 0) {
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionResult(null);

      // Convert workflow steps to automation tasks
      const tasks: AutomationTask[] = workflowSteps.map((step) => ({
        type: step.type,
        params: step.config,
      }));

      const result = await executeWorkflow(selectedSession, tasks);
      setExecutionResult(result);
      setActiveTab('results');
    } catch (error: any) {
      console.error('[AUTOMATION] Workflow execution failed:', error);
      setExecutionResult({
        success: false,
        error: error.message,
        logs: [`Execution failed: ${error.message}`],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const addWorkflowStep = (type: WorkflowStep['type']) => {
    const step: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      config: getDefaultConfig(type),
    };
    setWorkflowSteps([...workflowSteps, step]);
  };

  const removeWorkflowStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== stepId));
  };

  const updateWorkflowStep = (stepId: string, config: any) => {
    setWorkflowSteps(
      workflowSteps.map((s) => (s.id === stepId ? { ...s, config } : s))
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgb(var(--accent))]/20">
              <Monitor className="h-6 w-6 text-[rgb(var(--accent))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text">Browser Automation</h1>
              <p className="text-sm text-text-muted mt-1">
                Computer Use agent for web automation, scraping, and testing
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Monitor}
            label="Active Sessions"
            value={sessions.length}
            color="#8B5CF6"
          />
          <StatCard
            icon={Play}
            label="Workflow Steps"
            value={workflowSteps.length}
            color="#10B981"
          />
          <StatCard
            icon={CheckCircle2}
            label="Last Execution"
            value={executionResult?.success ? 'Success' : executionResult ? 'Failed' : 'N/A'}
            color={executionResult?.success ? '#10B981' : executionResult ? '#EF4444' : '#6B7280'}
            isText
          />
          <StatCard
            icon={Globe}
            label="Selected Session"
            value={selectedSession ? 'Active' : 'None'}
            color="#3B82F6"
            isText
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10">
          {(['sessions', 'workflow', 'results'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition relative ${
                activeTab === tab
                  ? 'text-[rgb(var(--accent))]'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--accent))]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'sessions' && (
              <SessionsTab
                sessions={sessions}
                selectedSession={selectedSession}
                onSelectSession={setSelectedSession}
                onCreateSession={handleCreateSession}
                onCloseSession={handleCloseSession}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'workflow' && (
              <WorkflowTab
                steps={workflowSteps}
                onAddStep={addWorkflowStep}
                onRemoveStep={removeWorkflowStep}
                onUpdateStep={updateWorkflowStep}
                onExecute={handleExecuteWorkflow}
                isExecuting={isExecuting}
                hasSession={!!selectedSession}
              />
            )}
            {activeTab === 'results' && (
              <ResultsTab result={executionResult} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

interface StatCardProps {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}

function StatCard({ icon: Icon, label, value, color, isText }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-surface-1 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-text">
          {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// SESSIONS TAB
// ============================================================

interface SessionsTabProps {
  sessions: BrowserSession[];
  selectedSession: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onCloseSession: (sessionId: string) => void;
  isLoading: boolean;
}

function SessionsTab({
  sessions,
  selectedSession,
  onSelectSession,
  onCreateSession,
  onCloseSession,
  isLoading,
}: SessionsTabProps) {
  return (
    <motion.div
      key="sessions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">Browser Sessions</h2>
        <button
          onClick={onCreateSession}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--accent))] text-white rounded-lg hover:bg-[rgb(var(--accent))]/90 transition disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Monitor className="h-12 w-12 text-text-muted opacity-50 mb-4" />
          <p className="text-sm text-text-muted">No active sessions</p>
          <p className="text-xs text-text-muted mt-1">Create a session to start automating</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-lg border p-4 cursor-pointer transition ${
                selectedSession === session.id
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10'
                  : 'border-white/10 bg-surface-0 hover:border-white/20'
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-[rgb(var(--accent))]" />
                    <h3 className="text-sm font-semibold text-text">{session.id}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                    <div>Pages: {session.pageCount}</div>
                    <div>
                      Created: {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession(session.id);
                  }}
                  className="p-2 hover:bg-red-500/20 rounded transition"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// WORKFLOW TAB
// ============================================================

interface WorkflowTabProps {
  steps: WorkflowStep[];
  onAddStep: (type: WorkflowStep['type']) => void;
  onRemoveStep: (stepId: string) => void;
  onUpdateStep: (stepId: string, config: any) => void;
  onExecute: () => void;
  isExecuting: boolean;
  hasSession: boolean;
}

function WorkflowTab({
  steps,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onExecute,
  isExecuting,
  hasSession,
}: WorkflowTabProps) {
  const stepTypes: Array<{ type: WorkflowStep['type']; icon: any; label: string }> = [
    { type: 'navigate', icon: Globe, label: 'Navigate' },
    { type: 'click', icon: MousePointer, label: 'Click' },
    { type: 'type', icon: Type, label: 'Type' },
    { type: 'screenshot', icon: Camera, label: 'Screenshot' },
    { type: 'scrape', icon: Code, label: 'Scrape' },
    { type: 'wait', icon: AlertCircle, label: 'Wait' },
  ];

  return (
    <motion.div
      key="workflow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">Workflow Builder</h2>
        <button
          onClick={onExecute}
          disabled={isExecuting || !hasSession || steps.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Execute Workflow
        </button>
      </div>

      {!hasSession && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-500">
            Please create or select a session before building a workflow
          </p>
        </div>
      )}

      {/* Add Step Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {stepTypes.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => onAddStep(type)}
            disabled={!hasSession}
            className="flex flex-col items-center gap-2 p-4 border border-white/10 rounded-lg hover:border-[rgb(var(--accent))] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon className="h-5 w-5 text-[rgb(var(--accent))]" />
            <span className="text-xs text-text">{label}</span>
          </button>
        ))}
      </div>

      {/* Workflow Steps */}
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Code className="h-12 w-12 text-text-muted opacity-50 mb-4" />
          <p className="text-sm text-text-muted">No workflow steps</p>
          <p className="text-xs text-text-muted mt-1">Add steps above to build your automation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <WorkflowStepCard
              key={step.id}
              step={step}
              index={index}
              onRemove={() => onRemoveStep(step.id)}
              onUpdate={(config) => onUpdateStep(step.id, config)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// WORKFLOW STEP CARD
// ============================================================

interface WorkflowStepCardProps {
  step: WorkflowStep;
  index: number;
  onRemove: () => void;
  onUpdate: (config: any) => void;
}

function WorkflowStepCard({ step, index, onRemove, onUpdate }: WorkflowStepCardProps) {
  const getStepIcon = (type: WorkflowStep['type']) => {
    const icons = {
      navigate: Globe,
      click: MousePointer,
      type: Type,
      screenshot: Camera,
      scrape: Code,
      wait: AlertCircle,
    };
    return icons[type];
  };

  const Icon = getStepIcon(step.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-white/10 bg-surface-0 p-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-[rgb(var(--accent))]/20">
          <Icon className="h-4 w-4 text-[rgb(var(--accent))]" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              {index + 1}. {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
            </h3>
            <button
              onClick={onRemove}
              className="p-1 hover:bg-red-500/20 rounded transition"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>

          <StepConfigForm step={step} onUpdate={onUpdate} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// STEP CONFIG FORM
// ============================================================

interface StepConfigFormProps {
  step: WorkflowStep;
  onUpdate: (config: any) => void;
}

function StepConfigForm({ step, onUpdate }: StepConfigFormProps) {
  const handleChange = (field: string, value: any) => {
    onUpdate({ ...step.config, [field]: value });
  };

  switch (step.type) {
    case 'navigate':
      return (
        <input
          type="text"
          placeholder="https://example.com"
          value={step.config.url || ''}
          onChange={(e) => handleChange('url', e.target.value)}
          className="w-full px-3 py-2 bg-surface-1 border border-white/10 rounded text-sm text-text"
        />
      );

    case 'click':
      return (
        <input
          type="text"
          placeholder="CSS selector (e.g., button.submit)"
          value={step.config.selector?.selector || ''}
          onChange={(e) =>
            handleChange('selector', { ...step.config.selector, selector: e.target.value })
          }
          className="w-full px-3 py-2 bg-surface-1 border border-white/10 rounded text-sm text-text"
        />
      );

    case 'type':
      return (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="CSS selector"
            value={step.config.selector?.selector || ''}
            onChange={(e) =>
              handleChange('selector', { ...step.config.selector, selector: e.target.value })
            }
            className="w-full px-3 py-2 bg-surface-1 border border-white/10 rounded text-sm text-text"
          />
          <input
            type="text"
            placeholder="Text to type"
            value={step.config.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
            className="w-full px-3 py-2 bg-surface-1 border border-white/10 rounded text-sm text-text"
          />
        </div>
      );

    case 'scrape':
      return (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="CSS selector"
            value={step.config.config?.selector || ''}
            onChange={(e) =>
              handleChange('config', { ...step.config.config, selector: e.target.value })
            }
            className="w-full px-3 py-2 bg-surface-1 border border-white/10 rounded text-sm text-text"
          />
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={step.config.config?.multiple || false}
              onChange={(e) =>
                handleChange('config', { ...step.config.config, multiple: e.target.checked })
              }
            />
            Multiple elements
          </label>
        </div>
      );

    case 'wait':
      return (
        <input
          type="number"
          placeholder="Timeout (ms)"
          value={step.config.options?.timeout || ''}
          onChange={(e) =>
            handleChange('options', { ...step.config.options, timeout: parseInt(e.target.value) })
          }
          className="w-full px-3 py-2 bg-surface-1 border border-white/10 rounded text-sm text-text"
        />
      );

    case 'screenshot':
      return (
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={step.config.options?.fullPage || false}
            onChange={(e) =>
              handleChange('options', { ...step.config.options, fullPage: e.target.checked })
            }
          />
          Full page screenshot
        </label>
      );

    default:
      return null;
  }
}

// ============================================================
// RESULTS TAB
// ============================================================

interface ResultsTabProps {
  result: AutomationResult | null;
}

function ResultsTab({ result }: ResultsTabProps) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-text mb-4">Execution Results</h2>

      {!result ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-text-muted opacity-50 mb-4" />
          <p className="text-sm text-text-muted">No execution results yet</p>
          <p className="text-xs text-text-muted mt-1">Run a workflow to see results here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status */}
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`font-semibold ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                {result.success ? 'Execution Successful' : 'Execution Failed'}
              </span>
            </div>
            {result.error && (
              <p className="text-sm text-red-500 mt-2">{result.error}</p>
            )}
          </div>

          {/* Logs */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text">Execution Logs</h3>
            <div className="rounded-lg border border-white/10 bg-surface-0 p-4 max-h-96 overflow-y-auto">
              {result.logs.map((log, index) => (
                <div key={index} className="text-xs font-mono text-text-muted py-1">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot */}
          {result.screenshot && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Screenshot</h3>
              <img
                src={`data:image/png;base64,${result.screenshot}`}
                alt="Screenshot"
                className="rounded-lg border border-white/10 w-full"
              />
            </div>
          )}

          {/* Data */}
          {result.data && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Scraped Data</h3>
              <pre className="rounded-lg border border-white/10 bg-surface-0 p-4 text-xs font-mono text-text overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDefaultConfig(type: WorkflowStep['type']): any {
  switch (type) {
    case 'navigate':
      return { url: '', options: {} };
    case 'click':
      return { selector: { selector: '', timeout: 10000 } };
    case 'type':
      return { selector: { selector: '', timeout: 10000 }, text: '', options: { delay: 50 } };
    case 'screenshot':
      return { options: { fullPage: false, type: 'png' } };
    case 'scrape':
      return { config: { selector: '', multiple: false } };
    case 'wait':
      return { options: { timeout: 5000 } };
    default:
      return {};
  }
}
