/**
 * TRACE DETAIL DRAWER
 *
 * Enterprise White Design System - Execution Tracing UI
 * Slide-over panel showing detailed trace information with full transparency
 * into variable resolution and data transformations.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Cpu,
  DollarSign,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Hash,
  User,
  Server,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  Check,
  FileJson,
  Code,
  ArrowRight,
  Activity,
  Layers,
  RefreshCw,
  SkipForward,
  Shield,
} from 'lucide-react';

export interface RetryAttempt {
  attempt: number;
  timestamp: string;
  error: string;
  delayMs: number;
}

export interface TraceDetail {
  id: string;
  traceId: string;
  userId: string | null;
  agentId: string | null;
  workspaceId: string | null;
  sessionId: string | null;
  provider: string;
  model: string;
  requestType: string;
  status: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  isStreaming: boolean;
  responseTimeMs: number | null;
  finishReason: string | null;
  promptCost: number | null;
  completionCost: number | null;
  totalCost: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  // New fields for variable resolution
  inputsRaw?: Record<string, unknown>;
  inputsResolved?: Record<string, unknown>;
  output?: unknown;
  startedAt: string | null;
  completedAt: string | null;
  // Phase 16: Retry & Recovery fields
  retryCount?: number;
  retryAttempts?: RetryAttempt[];
  continuedOnError?: boolean;
  originalError?: string;
}

interface TraceDetailDrawerProps {
  trace: TraceDetail | null;
  onClose: () => void;
}

// ============================================================================
// JSON CODE BLOCK WITH COPY & PATH HELPER
// ============================================================================

interface JsonCodeBlockProps {
  data: unknown;
  title: string;
  subtitle?: string;
  maxHeight?: string;
  onPathClick?: (path: string) => void;
}

function JsonCodeBlock({ data, title, subtitle, maxHeight = '300px', onPathClick }: JsonCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handlePathCopy = async (path: string) => {
    const variablePath = `{{${path}}}`;
    await navigator.clipboard.writeText(variablePath);
    onPathClick?.(variablePath);
  };

  // Render JSON with clickable paths
  const renderJson = (obj: unknown, basePath: string = '', depth: number = 0): JSX.Element[] => {
    if (obj === null) return [<span key={basePath} className="text-muted-foreground">null</span>];
    if (obj === undefined) return [<span key={basePath} className="text-muted-foreground">undefined</span>];

    if (typeof obj === 'string') {
      return [<span key={basePath} className="text-emerald-500">&quot;{obj}&quot;</span>];
    }
    if (typeof obj === 'number') {
      return [<span key={basePath} className="text-violet-600">{obj}</span>];
    }
    if (typeof obj === 'boolean') {
      return [<span key={basePath} className="text-amber-600">{String(obj)}</span>];
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return [<span key={basePath}>[]</span>];
      const elements: JSX.Element[] = [];
      elements.push(<span key={`${basePath}-open`}>[</span>);
      obj.forEach((item, index) => {
        const itemPath = `${basePath}[${index}]`;
        elements.push(
          <div key={itemPath} className="ml-4">
            {renderJson(item, itemPath, depth + 1)}
            {index < obj.length - 1 && <span>,</span>}
          </div>
        );
      });
      elements.push(<span key={`${basePath}-close`}>]</span>);
      return elements;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj as Record<string, unknown>);
      if (keys.length === 0) return [<span key={basePath}>{'{}'}</span>];

      const elements: JSX.Element[] = [];
      elements.push(<span key={`${basePath}-open`}>{'{'}</span>);
      keys.forEach((key, index) => {
        const value = (obj as Record<string, unknown>)[key];
        const keyPath = basePath ? `${basePath}.${key}` : key;
        const isHovered = hoveredPath === keyPath;

        elements.push(
          <div key={keyPath} className="ml-4 group/line">
            <span
              className={`cursor-pointer transition-colors ${
                isHovered ? 'text-primary font-medium' : 'text-foreground'
              }`}
              onMouseEnter={() => setHoveredPath(keyPath)}
              onMouseLeave={() => setHoveredPath(null)}
              onClick={() => handlePathCopy(keyPath)}
              title={`Click to copy: {{${keyPath}}}`}
            >
              &quot;{key}&quot;
            </span>
            <span className="text-muted-foreground">: </span>
            {renderJson(value, keyPath, depth + 1)}
            {index < keys.length - 1 && <span className="text-muted-foreground">,</span>}
            {isHovered && (
              <span className="ml-2 text-xs text-primary opacity-0 group-hover/line:opacity-100 transition-opacity">
                <Copy className="inline w-3 h-3 mr-1" />
                {'{{'}{keyPath}{'}}'}
              </span>
            )}
          </div>
        );
      });
      elements.push(<span key={`${basePath}-close`}>{'}'}</span>);
      return elements;
    }

    return [<span key={basePath}>{String(obj)}</span>];
  };

  if (data === undefined || data === null) {
    return (
      <div className="p-4 rounded-xl bg-muted/50 border-2 border-dashed border-border text-center">
        <FileJson className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Keine {title.toLowerCase()} verfügbar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border-2 border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b-2 border-border">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">({subtitle})</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted border-2 border-border transition-colors"
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
      </div>

      {/* Code Content */}
      <pre
        className="p-4 overflow-auto font-mono text-xs text-foreground bg-muted/50/50"
        style={{ maxHeight }}
      >
        {renderJson(data)}
      </pre>
    </div>
  );
}

// ============================================================================
// VARIABLE TRANSFORMATION VIEW
// ============================================================================

interface VariableTransformViewProps {
  rawInputs?: Record<string, unknown>;
  resolvedInputs?: Record<string, unknown>;
}

function VariableTransformView({ rawInputs, resolvedInputs }: VariableTransformViewProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handlePathCopied = (path: string) => {
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  if (!rawInputs && !resolvedInputs) {
    return (
      <div className="p-6 rounded-xl bg-muted/50 border-2 border-dashed border-border text-center">
        <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Keine Eingabedaten verfügbar</p>
      </div>
    );
  }

  return (
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
      {rawInputs && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileJson className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Raw Inputs</h4>
            <span className="text-xs text-muted-foreground">(vor Variable Resolution)</span>
          </div>
          <JsonCodeBlock
            data={rawInputs}
            title="Raw Configuration"
            subtitle="Template-Werte"
            maxHeight="200px"
            onPathClick={handlePathCopied}
          />
        </div>
      )}

      {/* Arrow */}
      {rawInputs && resolvedInputs && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <ArrowRight className="w-4 h-4" />
            <span>Variable Resolution</span>
          </div>
        </div>
      )}

      {/* Resolved Inputs */}
      {resolvedInputs && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-medium text-foreground">Resolved Inputs</h4>
            <span className="text-xs text-emerald-500">(echte Werte)</span>
          </div>
          <JsonCodeBlock
            data={resolvedInputs}
            title="Resolved Configuration"
            subtitle="Finale Werte"
            maxHeight="300px"
            onPathClick={handlePathCopied}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RETRY INDICATOR COMPONENT (Phase 16)
// ============================================================================

interface RetryIndicatorProps {
  retryCount?: number;
  retryAttempts?: RetryAttempt[];
  continuedOnError?: boolean;
  originalError?: string;
}

function RetryIndicator({ retryCount, retryAttempts, continuedOnError, originalError }: RetryIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const hasRetries = retryCount && retryCount > 0;

  if (!hasRetries && !continuedOnError) return null;

  return (
    <div className="space-y-3">
      {/* Recovery Badge */}
      {hasRetries && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/30"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-300 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-amber-700">
                Recovered
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-medium">
                {retryCount} {retryCount === 1 ? 'Retry' : 'Retries'}
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-0.5">
              Node succeeded after automatic retry attempts
            </p>
          </div>
          {retryAttempts && retryAttempts.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-lg hover:bg-amber-500/20 text-amber-600 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </motion.div>
      )}

      {/* Continued On Error Badge */}
      {continuedOnError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border-2 border-blue-500/30"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border-2 border-blue-300 flex items-center justify-center">
            <SkipForward className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-700">
                Continued on Error
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-0.5">
              Workflow continued despite this node failing
            </p>
            {originalError && (
              <p className="text-xs text-blue-500 mt-1 font-mono truncate">
                Original: {originalError}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Retry Attempts Timeline */}
      <AnimatePresence>
        {expanded && retryAttempts && retryAttempts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-card border-2 border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Retry Timeline
              </h4>
              <div className="space-y-3">
                {retryAttempts.map((attempt, index) => (
                  <div
                    key={index}
                    className="relative pl-6 pb-3 border-l-2 border-border last:border-l-transparent last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full ${
                      index === retryAttempts.length - 1 && !continuedOnError
                        ? 'bg-emerald-500'
                        : 'bg-red-400'
                    }`} />

                    {/* Attempt info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-medium text-foreground">
                          Attempt {attempt.attempt}
                        </span>
                        <p className="text-xs text-red-600 mt-0.5 font-mono">
                          {attempt.error}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {new Date(attempt.timestamp).toLocaleTimeString('de-DE')}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          +{attempt.delayMs}ms delay
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Final success indicator */}
                {!continuedOnError && (
                  <div className="relative pl-6">
                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Success on final attempt
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TraceDetailDrawer({ trace, onClose }: TraceDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'inputs' | 'output' | 'metadata'>('overview');
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!trace) return null;

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          icon: CheckCircle
        };
      case 'failed':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          icon: XCircle
        };
      case 'rate_limited':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          icon: Timer
        };
      case 'timeout':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: Clock
        };
      default:
        return {
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-border',
          icon: AlertTriangle
        };
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'anthropic':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'google':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'azure_openai':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      default:
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const formatCost = (cost: number | null) => {
    if (cost === null || cost === undefined) return '–';
    return `$${cost.toFixed(6)}`;
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '–';
    return num.toLocaleString('de-DE');
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const statusConfig = getStatusConfig(trace.status);
  const StatusIcon = statusConfig.icon;

  const tabs = [
    { id: 'overview' as const, label: 'Übersicht', icon: Activity },
    { id: 'inputs' as const, label: 'Inputs', icon: FileJson },
    { id: 'output' as const, label: 'Output', icon: Code },
    { id: 'metadata' as const, label: 'Metadata', icon: Hash },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-card/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl"
      >
        <div className="h-full flex flex-col bg-card border-l-2 border-border shadow-2xl">
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b-2 border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${statusConfig.bgColor} border-2 ${statusConfig.borderColor}`}>
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Trace Details</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {trace.traceId.substring(0, 8)}...
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors border-2 border-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-border bg-muted/50">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Retry Indicator (Phase 16) */}
                <RetryIndicator
                  retryCount={trace.retryCount}
                  retryAttempts={trace.retryAttempts}
                  continuedOnError={trace.continuedOnError}
                  originalError={trace.originalError}
                />

                {/* Status & Model Info */}
                <div className="p-4 rounded-xl bg-card border-2 border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Request Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${statusConfig.bgColor} ${statusConfig.color} border-2 ${statusConfig.borderColor}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {trace.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Request Type</p>
                      <p className="text-sm text-foreground font-mono">
                        {trace.requestType}
                        {trace.isStreaming && (
                          <span className="ml-2 text-xs text-primary">[Streaming]</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Provider</p>
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg font-medium border-2 ${getProviderColor(trace.provider)}`}>
                        {trace.provider.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Model</p>
                      <p className="text-sm text-foreground font-mono">{trace.model}</p>
                    </div>
                    {trace.finishReason && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Finish Reason</p>
                        <p className="text-sm text-foreground">{trace.finishReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Token Usage */}
                <div className="p-4 rounded-xl bg-card border-2 border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-medium text-foreground">Token Usage</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-muted/50 border-2 border-border">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {formatNumber(trace.promptTokens)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Prompt</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50 border-2 border-border">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {formatNumber(trace.completionTokens)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Completion</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-primary/10 border-2 border-primary/20">
                      <p className="text-2xl font-bold text-primary tabular-nums">
                        {formatNumber(trace.totalTokens)}
                      </p>
                      <p className="text-xs text-primary mt-1">Total</p>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="p-4 rounded-xl bg-card border-2 border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-medium text-foreground">Cost Breakdown</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b-2 border-border">
                      <span className="text-sm text-muted-foreground">Prompt Cost</span>
                      <span className="text-sm text-foreground font-mono">{formatCost(trace.promptCost)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b-2 border-border">
                      <span className="text-sm text-muted-foreground">Completion Cost</span>
                      <span className="text-sm text-foreground font-mono">{formatCost(trace.completionCost)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-emerald-500 font-semibold">Total Cost</span>
                      <span className="text-lg text-emerald-500 font-bold font-mono">
                        {formatCost(trace.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="p-4 rounded-xl bg-card border-2 border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-violet-600" />
                    <h3 className="text-sm font-medium text-foreground">Performance</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Response Time</p>
                      <p className="text-xl font-bold text-foreground tabular-nums">
                        {trace.responseTimeMs ? `${trace.responseTimeMs.toLocaleString()}ms` : '–'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Throughput</p>
                      <p className="text-xl font-bold text-foreground tabular-nums">
                        {trace.responseTimeMs && trace.totalTokens
                          ? `${((trace.totalTokens / trace.responseTimeMs) * 1000).toFixed(1)} tok/s`
                          : '–'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Started At</p>
                      <p className="text-sm text-foreground">{formatTime(trace.startedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Completed At</p>
                      <p className="text-sm text-foreground">{formatTime(trace.completedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Context IDs */}
                <div className="p-4 rounded-xl bg-card border-2 border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Server className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-medium text-foreground">Context</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Trace ID', value: trace.traceId, field: 'traceId' },
                      { label: 'User ID', value: trace.userId, field: 'userId' },
                      { label: 'Agent ID', value: trace.agentId, field: 'agentId' },
                      { label: 'Workspace ID', value: trace.workspaceId, field: 'workspaceId' },
                      { label: 'Session ID', value: trace.sessionId, field: 'sessionId' },
                    ].map(({ label, value, field }) => (
                      <div key={field} className="flex items-center justify-between group">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground font-mono">
                            {value || '–'}
                          </span>
                          {value && (
                            <button
                              onClick={() => copyToClipboard(value, field)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-all"
                            >
                              {copiedField === field ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error Information */}
                {trace.status === 'failed' && (trace.errorCode || trace.errorMessage) && (
                  <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-medium text-red-600">Error Details</h3>
                    </div>
                    {trace.errorCode && (
                      <div className="mb-3">
                        <p className="text-xs text-red-500 mb-1">Error Code</p>
                        <p className="text-sm text-red-700 font-mono">{trace.errorCode}</p>
                      </div>
                    )}
                    {trace.errorMessage && (
                      <div>
                        <p className="text-xs text-red-500 mb-1">Error Message</p>
                        <p className="text-sm text-red-700">{trace.errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Inputs Tab */}
            {activeTab === 'inputs' && (
              <VariableTransformView
                rawInputs={trace.inputsRaw}
                resolvedInputs={trace.inputsResolved}
              />
            )}

            {/* Output Tab */}
            {activeTab === 'output' && (
              <JsonCodeBlock
                data={trace.output}
                title="Raw Output"
                subtitle="Tool-Antwort"
                maxHeight="500px"
              />
            )}

            {/* Metadata Tab */}
            {activeTab === 'metadata' && trace.metadata && Object.keys(trace.metadata).length > 0 && (
              <div className="p-4 rounded-xl bg-card border-2 border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Metadata</h3>
                  </div>
                  <button
                    onClick={() => setMetadataExpanded(!metadataExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {metadataExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Expand
                      </>
                    )}
                  </button>
                </div>
                {metadataExpanded ? (
                  <JsonCodeBlock
                    data={trace.metadata}
                    title="Full Metadata"
                    maxHeight="400px"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(trace.metadata).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="p-2 rounded-lg bg-muted/50 border-2 border-border">
                        <p className="text-xs text-muted-foreground mb-0.5">{key}</p>
                        <p className="text-sm text-foreground truncate font-mono">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t-2 border-border bg-muted/50">
            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 rounded-xl bg-muted hover:bg-slate-200 text-foreground font-medium transition-colors border-2 border-border"
            >
              Schließen
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
