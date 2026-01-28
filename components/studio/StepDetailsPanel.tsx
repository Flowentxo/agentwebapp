/**
 * STEP DETAILS PANEL
 *
 * Enterprise White Design System - Execution Tracing UI
 * Visual debugger showing detailed execution information for pipeline nodes.
 * Displays inputs (raw & resolved), outputs, errors, timing, and cost.
 */

'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Timer,
  Zap,
  DollarSign,
  RotateCcw,
  Copy,
  Check,
  ArrowRight,
  ArrowDown,
  Code,
  FileJson,
  Bug,
  Activity,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePipelineStore,
  useStepForNode,
  type ExecutionStep,
} from '@/components/pipelines/store/usePipelineStore';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'inputs' | 'output' | 'error' | 'timing' | 'cost';

// ============================================================================
// JSON VIEWER WITH PATH HELPER
// ============================================================================

interface JsonViewerProps {
  data: unknown;
  label?: string;
  maxHeight?: string;
  basePath?: string;
  onPathClick?: (path: string) => void;
}

function JsonViewer({ data, label, maxHeight = '300px', basePath = '', onPathClick }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePathCopy = async (path: string) => {
    const variablePath = `{{${path}}}`;
    try {
      await navigator.clipboard.writeText(variablePath);
      onPathClick?.(variablePath);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  // Render JSON with clickable paths
  const renderJsonWithPaths = (obj: unknown, currentPath: string = '', depth: number = 0): React.ReactNode => {
    if (obj === null) return <span className="text-muted-foreground">null</span>;
    if (obj === undefined) return <span className="text-muted-foreground">undefined</span>;

    if (typeof obj === 'string') {
      // Check if it's a template variable
      const isTemplate = /\{\{.+?\}\}/.test(obj);
      return (
        <span className={isTemplate ? 'text-primary font-medium' : 'text-emerald-500'}>
          &quot;{obj}&quot;
        </span>
      );
    }
    if (typeof obj === 'number') {
      return <span className="text-violet-600">{obj}</span>;
    }
    if (typeof obj === 'boolean') {
      return <span className="text-amber-600">{String(obj)}</span>;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span className="text-muted-foreground">[]</span>;
      return (
        <>
          <span className="text-muted-foreground">[</span>
          {obj.map((item, index) => {
            const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
            return (
              <div key={index} className="ml-4">
                {renderJsonWithPaths(item, itemPath, depth + 1)}
                {index < obj.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            );
          })}
          <span className="text-muted-foreground">]</span>
        </>
      );
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj as Record<string, unknown>);
      if (keys.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;

      return (
        <>
          <span className="text-muted-foreground">{'{'}</span>
          {keys.map((key, index) => {
            const value = (obj as Record<string, unknown>)[key];
            const keyPath = currentPath ? `${currentPath}.${key}` : key;
            const isHovered = hoveredPath === keyPath;

            return (
              <div key={key} className="ml-4 group/line relative">
                <span
                  className={cn(
                    'cursor-pointer transition-colors',
                    isHovered ? 'text-primary font-medium' : 'text-foreground'
                  )}
                  onMouseEnter={() => setHoveredPath(keyPath)}
                  onMouseLeave={() => setHoveredPath(null)}
                  onClick={() => handlePathCopy(keyPath)}
                  title={`Klicken zum Kopieren: {{${keyPath}}}`}
                >
                  &quot;{key}&quot;
                </span>
                <span className="text-muted-foreground">: </span>
                {renderJsonWithPaths(value, keyPath, depth + 1)}
                {index < keys.length - 1 && <span className="text-muted-foreground">,</span>}
                {isHovered && (
                  <span className="absolute right-0 top-0 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    <Copy className="inline w-3 h-3 mr-1" />
                    {'{{'}{keyPath}{'}}'}
                  </span>
                )}
              </div>
            );
          })}
          <span className="text-muted-foreground">{'}'}</span>
        </>
      );
    }

    return <span className="text-muted-foreground">{String(obj)}</span>;
  };

  if (data === undefined || data === null) {
    return (
      <div className="p-4 rounded-xl bg-muted/50 border-2 border-dashed border-border text-center">
        <FileJson className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {label ? `Keine ${label.toLowerCase()} verfügbar` : 'Keine Daten'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative group rounded-xl bg-card border-2 border-border overflow-hidden">
      <button
        onClick={handleCopy}
        className={cn(
          'absolute right-2 top-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg',
          'bg-card border-2 border-border text-xs font-medium text-muted-foreground',
          'opacity-0 group-hover:opacity-100 hover:bg-muted/50 transition-all shadow-sm'
        )}
        title="In Zwischenablage kopieren"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500">Kopiert!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Kopieren</span>
          </>
        )}
      </button>
      <pre
        className="p-4 overflow-auto text-xs font-mono text-foreground bg-muted/50/50"
        style={{ maxHeight }}
      >
        {renderJsonWithPaths(data, basePath)}
      </pre>
    </div>
  );
}

// ============================================================================
// STATUS CONFIG - ENTERPRISE WHITE
// ============================================================================

const stepStatusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; borderColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    label: 'Pending',
  },
  running: {
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Running',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Success',
  },
  failure: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Failed',
  },
  skipped: {
    icon: ArrowRight,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    label: 'Skipped',
  },
  waiting: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Waiting',
  },
  retrying: {
    icon: RotateCcw,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Retrying',
  },
  timeout: {
    icon: Timer,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Timeout',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface StepDetailsPanelProps {
  nodeId: string;
  onClose: () => void;
}

export function StepDetailsPanel({ nodeId, onClose }: StepDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('inputs');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const step = useStepForNode(nodeId);
  const { isDebugMode } = usePipelineStore();

  if (!isDebugMode || !step) {
    return null;
  }

  const status = stepStatusConfig[step.status] || stepStatusConfig.pending;
  const StatusIcon = status.icon;

  const handlePathCopied = (path: string) => {
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Tab content renderers
  const renderInputsTab = () => (
    <div className="space-y-4">
      {/* Copied Notification */}
      <AnimatePresence>
        {copiedPath && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border-2 border-primary/20 text-sm"
          >
            <Check className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Variablenpfad kopiert:</span>
            <code className="font-mono text-primary">{copiedPath}</code>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Raw Inputs */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileJson className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">Raw Inputs</h4>
          <span className="text-xs text-muted-foreground">(vor Variable Resolution)</span>
        </div>
        <JsonViewer
          data={step.inputsRaw}
          label="raw inputs"
          maxHeight="200px"
          basePath={`${nodeId}.input`}
          onPathClick={handlePathCopied}
        />
      </div>

      {/* Transformation Arrow */}
      {step.inputsRaw && step.inputsResolved && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <ArrowDown className="w-4 h-4" />
            <span>Variable Resolution</span>
          </div>
        </div>
      )}

      {/* Resolved Inputs */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <h4 className="text-sm font-medium text-foreground">Resolved Inputs</h4>
          <span className="text-xs text-emerald-500">(echte Werte)</span>
        </div>
        <JsonViewer
          data={step.inputsResolved}
          label="resolved inputs"
          maxHeight="400px"
          basePath={`${nodeId}.resolved`}
          onPathClick={handlePathCopied}
        />
      </div>

      {/* Condition Result */}
      {step.conditionResult !== undefined && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border-2 border-border">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Condition Result:</span>
          <span
            className={cn(
              'font-mono font-medium px-2 py-0.5 rounded-lg',
              step.conditionResult
                ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30'
                : 'text-red-600 bg-red-500/10 border border-red-500/30'
            )}
          >
            {String(step.conditionResult)}
          </span>
        </div>
      )}

      {/* Branch Path */}
      {step.branchPath && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border-2 border-border">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Branch Path:</span>
          <code className="font-mono text-primary text-sm bg-primary/10 px-2 py-0.5 rounded-lg">
            {step.branchPath}
          </code>
        </div>
      )}
    </div>
  );

  const renderOutputTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Code className="w-4 h-4 text-emerald-500" />
        <h4 className="text-sm font-medium text-foreground">Output Data</h4>
        <span className="text-xs text-muted-foreground">(klicken zum Kopieren des Pfads)</span>
      </div>
      <JsonViewer
        data={step.output}
        label="output"
        maxHeight="500px"
        basePath={`${nodeId}.output`}
        onPathClick={handlePathCopied}
      />

      {/* Copied Notification */}
      <AnimatePresence>
        {copiedPath && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border-2 border-primary/20 text-sm"
          >
            <Check className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Kopiert:</span>
            <code className="font-mono text-primary">{copiedPath}</code>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderErrorTab = () => (
    <div className="space-y-4">
      {step.status === 'failure' || step.errorMessage ? (
        <>
          {/* Error Summary */}
          <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                {step.errorCode && (
                  <div className="text-xs text-red-500 font-mono mb-1">
                    {step.errorCode}
                  </div>
                )}
                <div className="text-red-700 font-medium">{step.errorMessage}</div>
              </div>
            </div>
          </div>

          {/* Stack Trace */}
          {step.errorStack && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Stack Trace</h4>
              <pre className="p-4 rounded-xl bg-card border-2 border-border overflow-auto text-xs font-mono text-red-600 max-h-[300px]">
                {step.errorStack}
              </pre>
            </div>
          )}

          {/* Error Details */}
          {step.errorDetails && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Error Details</h4>
              <JsonViewer data={step.errorDetails} label="error details" />
            </div>
          )}

          {/* Retry Information */}
          {(step.retryAttempt !== undefined || step.previousErrors) && (
            <div className="p-4 rounded-xl bg-orange-50 border-2 border-orange-200">
              <div className="flex items-center gap-2 text-orange-600 mb-3">
                <RotateCcw className="w-4 h-4" />
                <span className="font-medium">Retry Information</span>
              </div>

              {step.retryAttempt !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>Attempt:</span>
                  <span className="font-mono bg-card px-2 py-0.5 rounded border border-orange-200">
                    {step.retryAttempt + 1} / {(step.maxRetries || 0) + 1}
                  </span>
                </div>
              )}

              {step.retryDelayMs !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>Retry Delay:</span>
                  <span className="font-mono bg-card px-2 py-0.5 rounded border border-orange-200">
                    {step.retryDelayMs}ms
                  </span>
                </div>
              )}

              {step.previousErrors && step.previousErrors.length > 0 && (
                <div>
                  <h5 className="text-xs text-muted-foreground mb-1">Previous Errors:</h5>
                  <ul className="text-xs text-orange-700 space-y-1">
                    {step.previousErrors.map((err, i) => (
                      <li key={i} className="font-mono bg-card px-2 py-1 rounded border border-orange-200">
                        {i + 1}. {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground">Keine Fehler aufgetreten</p>
        </div>
      )}
    </div>
  );

  const renderTimingTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Started At */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="text-xs text-muted-foreground mb-1">Started At</div>
          <div className="text-sm text-foreground font-mono">
            {step.startedAt
              ? format(new Date(step.startedAt), 'MMM d, HH:mm:ss.SSS')
              : '-'}
          </div>
        </div>

        {/* Completed At */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="text-xs text-muted-foreground mb-1">Completed At</div>
          <div className="text-sm text-foreground font-mono">
            {step.completedAt
              ? format(new Date(step.completedAt), 'MMM d, HH:mm:ss.SSS')
              : '-'}
          </div>
        </div>

        {/* Duration */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Timer className="w-3 h-3" />
            <span>Duration</span>
          </div>
          <div className="text-lg font-semibold text-foreground">
            {formatDuration(step.durationMs)}
          </div>
        </div>

        {/* Waiting Duration */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span>Waiting Duration</span>
          </div>
          <div className="text-lg font-semibold text-foreground">
            {formatDuration(step.waitingDurationMs)}
          </div>
        </div>
      </div>

      {/* Step Order */}
      <div className="p-4 rounded-xl bg-card border-2 border-border">
        <div className="text-xs text-muted-foreground mb-2">Execution Order</div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground text-sm">Step #</span>
            <span className="ml-2 text-lg font-bold text-foreground">{step.stepNumber}</span>
          </div>
          {step.depth !== undefined && (
            <div className="pl-4 border-l-2 border-border">
              <span className="text-muted-foreground text-sm">Depth:</span>
              <span className="ml-2 text-foreground">{step.depth}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCostTab = () => (
    <div className="space-y-4">
      {step.tokensTotal || step.costUsd ? (
        <>
          {/* Token Usage */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-card border-2 border-border text-center">
              <div className="text-xs text-muted-foreground mb-1">Prompt Tokens</div>
              <div className="text-lg font-semibold text-foreground">
                {step.tokensPrompt?.toLocaleString() || '-'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border-2 border-border text-center">
              <div className="text-xs text-muted-foreground mb-1">Completion Tokens</div>
              <div className="text-lg font-semibold text-foreground">
                {step.tokensCompletion?.toLocaleString() || '-'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/20 text-center">
              <div className="text-xs text-primary mb-1">Total Tokens</div>
              <div className="text-lg font-semibold text-primary">
                {step.tokensTotal?.toLocaleString() || '-'}
              </div>
            </div>
          </div>

          {/* Cost */}
          {step.costUsd !== undefined && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30">
              <div className="flex items-center gap-2 text-xs text-emerald-500 mb-1">
                <DollarSign className="w-3 h-3" />
                <span>Estimated Cost</span>
              </div>
              <div className="text-2xl font-bold text-emerald-500">
                ${step.costUsd.toFixed(6)}
              </div>
            </div>
          )}

          {/* Model */}
          {step.model && (
            <div className="p-4 rounded-xl bg-card border-2 border-border">
              <div className="text-xs text-muted-foreground mb-1">Model</div>
              <div className="text-sm font-mono text-foreground">{step.model}</div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 border-2 border-border flex items-center justify-center mb-3">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Keine Kostendaten verfügbar</p>
          <p className="text-xs text-muted-foreground mt-1">Dieser Node verwendet keine AI-Modelle</p>
        </div>
      )}
    </div>
  );

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'inputs', label: 'Inputs', icon: FileJson },
    { id: 'output', label: 'Output', icon: Code },
    { id: 'error', label: 'Errors', icon: Bug },
    { id: 'timing', label: 'Timing', icon: Timer },
    { id: 'cost', label: 'Cost', icon: DollarSign },
  ];

  return (
    <div className="h-full flex flex-col bg-muted/50">
      {/* Header */}
      <div className="p-4 border-b-2 border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-xl border-2', status.bgColor, status.borderColor)}>
              <StatusIcon className={cn('w-4 h-4', status.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{step.nodeName}</h3>
              <div className="text-xs text-muted-foreground">
                {step.nodeType} • Step #{step.stepNumber}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-xl transition-colors border-2 border-border"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border-2',
            status.bgColor,
            status.color,
            status.borderColor
          )}
        >
          <StatusIcon className="w-3 h-3" />
          <span>{status.label}</span>
          {step.durationMs && (
            <span className="opacity-70">• {formatDuration(step.durationMs)}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border bg-card">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors relative',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'error' && step.errorMessage && (
                <span className="w-2 h-2 rounded-full bg-red-600" />
              )}
              {isActive && (
                <motion.div
                  layoutId="activeStepTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'inputs' && renderInputsTab()}
        {activeTab === 'output' && renderOutputTab()}
        {activeTab === 'error' && renderErrorTab()}
        {activeTab === 'timing' && renderTimingTab()}
        {activeTab === 'cost' && renderCostTab()}
      </div>
    </div>
  );
}

export default StepDetailsPanel;
