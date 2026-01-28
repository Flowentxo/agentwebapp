'use client';

/**
 * ExecutionInspector Component
 *
 * Enterprise White Design System - Execution Tracing UI
 * A DevTools-like panel for inspecting workflow node execution data.
 * Shows input, output, and metadata for selected nodes with support
 * for large offloaded payloads via the SmartDataViewer.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  SkipForward,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Terminal,
  Cpu,
  DollarSign,
  Zap,
  FileInput,
  FileOutput,
  Settings,
  Activity,
  Copy,
  Check,
} from 'lucide-react';
import { SmartDataViewer } from './SmartDataViewer';
import {
  usePipelineStore,
  NodeExecutionStatus,
  NodeExecutionOutput,
  PipelineNode,
} from '../../store/usePipelineStore';

// ============================================================================
// TYPES
// ============================================================================

type InspectorTab = 'output' | 'input' | 'meta';

interface ExecutionInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

// ============================================================================
// STATUS UTILITIES - ENTERPRISE WHITE
// ============================================================================

const STATUS_CONFIG: Record<
  NodeExecutionStatus,
  { icon: typeof Clock; label: string; color: string; bgColor: string; borderColor: string }
> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
  },
  running: {
    icon: Loader2,
    label: 'Running',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  success: {
    icon: CheckCircle,
    label: 'Success',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  suspended: {
    icon: Pause,
    label: 'Suspended',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  skipped: {
    icon: SkipForward,
    label: 'Skipped',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
  },
};

// ============================================================================
// TAB BUTTON COMPONENT
// ============================================================================

interface TabButtonProps {
  tab: InspectorTab;
  activeTab: InspectorTab;
  onClick: () => void;
  icon: typeof FileOutput;
  label: string;
  hasData: boolean;
}

function TabButton({ tab, activeTab, onClick, icon: Icon, label, hasData }: TabButtonProps) {
  const isActive = tab === activeTab;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative
        ${isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
        }
      `}
    >
      <Icon size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
      <span>{label}</span>
      {hasData && !isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      )}
      {isActive && (
        <motion.div
          layoutId="activeInspectorTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        />
      )}
    </button>
  );
}

// ============================================================================
// META INFO ROW COMPONENT
// ============================================================================

interface MetaRowProps {
  icon: typeof Clock;
  label: string;
  value: string | number | undefined;
  unit?: string;
  color?: string;
}

function MetaRow({ icon: Icon, label, value, unit, color = 'text-foreground' }: MetaRowProps) {
  if (value === undefined || value === null) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b-2 border-border last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-sm font-medium font-mono ${color}`}>
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  icon: typeof Clock;
  title: string;
  description: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-muted/50 border-2 border-border flex items-center justify-center mb-4">
        <Icon size={24} className="text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExecutionInspector({
  isOpen,
  onClose,
  width = 400,
  onWidthChange,
}: ExecutionInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('output');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Get store state
  const selectedNodeId = usePipelineStore((state) => state.selectedNodeId);
  const nodes = usePipelineStore((state) => state.nodes);
  const nodeStatus = usePipelineStore((state) =>
    selectedNodeId ? state.nodeStatus[selectedNodeId] : null
  );
  const nodeOutput = usePipelineStore((state) =>
    selectedNodeId ? state.nodeOutputs[selectedNodeId] : null
  );
  const isRunning = usePipelineStore((state) => state.isRunning);

  // Find the selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('output');
  }, [selectedNodeId]);

  // Handle loading offloaded data from blob storage
  const handleLoadOffloaded = useCallback(async (key: string): Promise<unknown> => {
    try {
      const response = await fetch('/api/pipelines/logs/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch data');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[ExecutionInspector] Failed to load offloaded data:', error);
      throw error;
    }
  }, []);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(320, Math.min(800, startWidth + delta));
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onWidthChange]);

  // Get status config
  const status = nodeStatus || 'pending';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  // Prepare data for tabs
  const hasOutput = nodeOutput?.data !== undefined;
  const hasError = nodeOutput?.error !== undefined;
  const hasInput = selectedNode?.data?.config !== undefined;
  const hasMeta = nodeOutput?.duration !== undefined || nodeOutput?.timestamp !== undefined;

  // Calculate panel width
  const panelWidth = isExpanded ? Math.max(width, 600) : width;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: panelWidth, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: panelWidth, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ width: panelWidth }}
          className="absolute right-0 top-0 bottom-0 bg-card border-l-2 border-border shadow-2xl z-50 flex flex-col"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`
              absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize
              hover:bg-primary/50 transition-colors
              ${isResizing ? 'bg-primary' : ''}
            `}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Execution Inspector</h3>
              </div>
              {isRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium border-2 border-blue-500/30">
                  <Activity size={10} className="animate-pulse" />
                  Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors border-2 border-border"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors border-2 border-border"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {selectedNodeId && selectedNode ? (
            <>
              {/* Node Info */}
              <div className="px-4 py-3 border-b-2 border-border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-xl border-2 ${statusConfig.bgColor} ${statusConfig.borderColor}`}
                  >
                    <StatusIcon
                      size={16}
                      className={`${statusConfig.color} ${status === 'running' ? 'animate-spin' : ''}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {selectedNode.data.label || selectedNodeId}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}
                      >
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedNode.data.type}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedNode.data.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {selectedNode.data.description}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b-2 border-border bg-card">
                <TabButton
                  tab="output"
                  activeTab={activeTab}
                  onClick={() => setActiveTab('output')}
                  icon={FileOutput}
                  label="Output"
                  hasData={hasOutput || hasError}
                />
                <TabButton
                  tab="input"
                  activeTab={activeTab}
                  onClick={() => setActiveTab('input')}
                  icon={FileInput}
                  label="Input"
                  hasData={hasInput}
                />
                <TabButton
                  tab="meta"
                  activeTab={activeTab}
                  onClick={() => setActiveTab('meta')}
                  icon={Settings}
                  label="Meta"
                  hasData={hasMeta}
                />
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-4 bg-muted/50">
                {/* Output Tab */}
                {activeTab === 'output' && (
                  <div>
                    {hasError && (
                      <div className="mb-4 p-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl">
                        <div className="flex items-center gap-2 text-red-600 font-medium text-sm mb-2">
                          <XCircle size={14} />
                          <span>Execution Error</span>
                        </div>
                        <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                          {nodeOutput?.error}
                        </pre>
                      </div>
                    )}

                    {hasOutput ? (
                      <div className="bg-card rounded-xl p-3 overflow-x-auto border-2 border-border">
                        <SmartDataViewer
                          data={nodeOutput?.data}
                          onLoadOffloaded={handleLoadOffloaded}
                        />
                      </div>
                    ) : status === 'pending' ? (
                      <EmptyState
                        icon={Clock}
                        title="Waiting for Execution"
                        description="This node hasn't been executed yet. Run the pipeline to see output."
                      />
                    ) : status === 'running' ? (
                      <EmptyState
                        icon={Loader2}
                        title="Executing..."
                        description="Node is currently running. Output will appear here when complete."
                      />
                    ) : !hasError ? (
                      <EmptyState
                        icon={FileOutput}
                        title="No Output Data"
                        description="This node completed without producing output data."
                      />
                    ) : null}
                  </div>
                )}

                {/* Input Tab */}
                {activeTab === 'input' && (
                  <div>
                    {hasInput ? (
                      <div className="bg-card rounded-xl p-3 overflow-x-auto border-2 border-border">
                        <SmartDataViewer
                          data={selectedNode.data.config}
                          onLoadOffloaded={handleLoadOffloaded}
                        />
                      </div>
                    ) : (
                      <EmptyState
                        icon={FileInput}
                        title="No Input Configuration"
                        description="This node has no input configuration defined."
                      />
                    )}
                  </div>
                )}

                {/* Meta Tab */}
                {activeTab === 'meta' && (
                  <div className="space-y-4">
                    {/* Timing */}
                    <div className="bg-card rounded-xl p-3 border-2 border-border">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Timing
                      </h5>
                      <MetaRow
                        icon={Clock}
                        label="Duration"
                        value={nodeOutput?.duration}
                        unit="ms"
                        color="text-blue-600"
                      />
                      <MetaRow
                        icon={Activity}
                        label="Timestamp"
                        value={nodeOutput?.timestamp ? new Date(nodeOutput.timestamp).toLocaleString() : undefined}
                      />
                    </div>

                    {/* Node Info */}
                    <div className="bg-card rounded-xl p-3 border-2 border-border">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Node Info
                      </h5>
                      <MetaRow icon={Terminal} label="Node ID" value={selectedNodeId} />
                      <MetaRow icon={Cpu} label="Type" value={selectedNode.data.type} />
                      <MetaRow icon={Settings} label="Status" value={statusConfig.label} color={statusConfig.color} />
                    </div>

                    {/* Position */}
                    <div className="bg-card rounded-xl p-3 border-2 border-border">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Position
                      </h5>
                      <MetaRow icon={ChevronRight} label="X" value={selectedNode.position.x.toFixed(0)} />
                      <MetaRow icon={ChevronLeft} label="Y" value={selectedNode.position.y.toFixed(0)} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/50">
              <div className="text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-card border-2 border-border flex items-center justify-center mx-auto mb-4">
                  <Terminal size={32} className="text-muted-foreground" />
                </div>
                <h4 className="text-base font-medium text-foreground mb-2">
                  Select a Node to Inspect
                </h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Click on any node in the canvas to view its execution data, input configuration, and metadata.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExecutionInspector;
