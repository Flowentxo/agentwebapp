'use client';

/**
 * EXECUTION TIMELINE
 *
 * Visual timeline of workflow execution with step-by-step details
 */

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  PlayCircle,
  Database,
  Code2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  logs: string[];
}

interface ExecutionTimelineProps {
  steps: ExecutionStep[];
  currentNodeId?: string | null;
  isRunning: boolean;
}

export function ExecutionTimeline({ steps, currentNodeId, isRunning }: ExecutionTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (nodeId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PlayCircle className="h-12 w-12 text-text-muted opacity-30 mb-3" />
        <p className="text-sm text-text-muted">
          No execution history yet
        </p>
        <p className="text-xs text-text-muted mt-1">
          Run a workflow to see the timeline
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, index) => (
        <ExecutionStepCard
          key={`${step.nodeId}-${index}`}
          step={step}
          isExpanded={expandedSteps.has(step.nodeId)}
          onToggle={() => toggleStep(step.nodeId)}
          isLast={index === steps.length - 1}
          isCurrent={step.nodeId === currentNodeId}
        />
      ))}
    </div>
  );
}

interface ExecutionStepCardProps {
  step: ExecutionStep;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
  isCurrent: boolean;
}

function ExecutionStepCard({ step, isExpanded, onToggle, isLast, isCurrent }: ExecutionStepCardProps) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-text-muted" />;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'running':
        return 'border-blue-500/30 bg-blue-500/5 shadow-sm shadow-blue-500/20';
      default:
        return 'border-white/10 bg-surface-0';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getNodeTypeIcon = () => {
    const type = step.nodeType?.toLowerCase() || '';
    if (type.includes('trigger')) return <Zap className="h-3.5 w-3.5" />;
    if (type.includes('llm') || type.includes('agent')) return <Code2 className="h-3.5 w-3.5" />;
    if (type.includes('data')) return <Database className="h-3.5 w-3.5" />;
    return <ChevronRight className="h-3.5 w-3.5" />;
  };

  return (
    <div className="relative">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[13px] top-10 bottom-0 w-[2px] bg-card/10" />
      )}

      {/* Step Card */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-lg border transition-all ${getStatusColor()} ${
          isCurrent ? 'ring-2 ring-blue-400/50' : ''
        }`}
      >
        {/* Header */}
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-card/5"
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>

          {/* Node Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text truncate">
                {step.nodeName}
              </span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                {getNodeTypeIcon()}
                <span className="capitalize">{step.nodeType}</span>
              </span>
            </div>

            {/* Duration & Time */}
            <div className="flex items-center gap-3 mt-1">
              {step.duration !== undefined && (
                <span className="text-xs text-text-muted">
                  ⏱️ {formatDuration(step.duration)}
                </span>
              )}
              {step.startTime && (
                <span className="text-xs text-text-muted">
                  {new Date(step.startTime).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Expand Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronRight className="h-4 w-4 text-text-muted" />
            )}
          </div>
        </button>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="p-3 space-y-3">
                {/* Input Data */}
                {step.input && (
                  <DataInspector
                    label="Input"
                    data={step.input}
                    color="blue"
                  />
                )}

                {/* Output Data */}
                {step.output && step.status === 'success' && (
                  <DataInspector
                    label="Output"
                    data={step.output}
                    color="green"
                  />
                )}

                {/* Error */}
                {step.error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
                    <div className="text-xs font-medium text-red-400 mb-1">Error</div>
                    <pre className="text-xs text-red-300 whitespace-pre-wrap break-words font-mono">
                      {step.error}
                    </pre>
                  </div>
                )}

                {/* Logs */}
                {step.logs && step.logs.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-text-muted">Logs</div>
                    <div className="space-y-1">
                      {step.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className="rounded border border-white/10 bg-surface-0 px-2 py-1 text-xs text-text-muted font-mono"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

interface DataInspectorProps {
  label: string;
  data: any;
  color: 'blue' | 'green' | 'purple';
}

function DataInspector({ label, data, color }: DataInspectorProps) {
  const [isJsonView, setIsJsonView] = useState(false);

  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  };

  // Format data for display
  const formatData = () => {
    if (typeof data === 'string') return data;
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className={`rounded-md border ${colorClasses[color]} p-2`}>
      <div className="flex items-center justify-between mb-1">
        <div className={`text-xs font-medium ${colorClasses[color]}`}>
          {label}
        </div>
        {typeof data === 'object' && data !== null && (
          <button
            onClick={() => setIsJsonView(!isJsonView)}
            className="text-xs text-text-muted hover:text-text transition"
          >
            {isJsonView ? 'Table' : 'JSON'}
          </button>
        )}
      </div>

      {/* Data Display */}
      {typeof data === 'object' && data !== null && !isJsonView ? (
        <div className="space-y-1">
          {Object.entries(data).slice(0, 5).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="text-text-muted font-mono">{key}:</span>
              <span className="text-text font-mono flex-1 break-words">
                {typeof value === 'object'
                  ? JSON.stringify(value).slice(0, 50) + '...'
                  : String(value).slice(0, 50)}
              </span>
            </div>
          ))}
          {Object.keys(data).length > 5 && (
            <div className="text-xs text-text-muted italic">
              +{Object.keys(data).length - 5} more fields
            </div>
          )}
        </div>
      ) : (
        <pre className="text-xs text-text-muted whitespace-pre-wrap break-words font-mono max-h-40 overflow-y-auto">
          {formatData()}
        </pre>
      )}
    </div>
  );
}
