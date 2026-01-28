'use client';

/**
 * CUSTOM NODE COMPONENT
 *
 * Visual representation of modules in the agent builder canvas
 * Includes cost badge for expensive operations
 *
 * Phase 13: Added debug mode styling for Flight Recorder visualization
 * Phase 22: Added proper handle configuration based on node type
 *           - Trigger nodes: Only source handle (output)
 *           - Action/Agent nodes: Both target and source handles
 *           - Condition nodes: One target, two source handles (True/False)
 *           - Output nodes: Only target handle (input)
 *
 * Performance optimizations:
 * - React.memo with custom comparison function
 * - Memoized NodeCostBadge component
 * - Shallow selector for store state
 */

import { memo, useMemo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Brain,
  MessageSquare,
  FileText,
  Code2,
  Search,
  Calendar,
  Mail,
  Slack,
  Database,
  Zap,
  Clock,
  Webhook,
  GitBranch,
  Repeat,
  Timer,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Pause,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { ModuleConfig } from '@/lib/studio/types';
import { NodeCostBadge } from './nodes/NodeCostBadge';
import { usePipelineStore, useNodeStatus, type NodeExecutionStatus } from '@/components/pipelines/store/usePipelineStore';
import { cn } from '@/lib/utils';
import { shallow } from 'zustand/shallow';
import { getNodeType, type NodeType } from '@/lib/studio/connection-validator';

const ICON_MAP: Record<string, any> = {
  Brain,
  MessageSquare,
  FileText,
  Code2,
  Search,
  Calendar,
  Mail,
  Slack,
  Database,
  Zap,
  Clock,
  Webhook,
  GitBranch,
  Repeat,
  Timer,
  Settings
};

// Debug mode status configuration
const DEBUG_STATUS_CONFIG: Record<
  NodeExecutionStatus,
  {
    borderColor: string;
    bgColor: string;
    glowColor: string;
    icon: React.ElementType;
    iconColor: string;
    label: string;
  }
> = {
  pending: {
    borderColor: 'border-gray-500/50',
    bgColor: 'bg-muted/500/10',
    glowColor: 'rgba(107, 114, 128, 0.3)',
    icon: Clock,
    iconColor: 'text-muted-foreground',
    label: 'Pending',
  },
  running: {
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    icon: Loader2,
    iconColor: 'text-blue-400',
    label: 'Running',
  },
  success: {
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/10',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    icon: CheckCircle2,
    iconColor: 'text-green-400',
    label: 'Success',
  },
  error: {
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/10',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: XCircle,
    iconColor: 'text-red-400',
    label: 'Failed',
  },
  suspended: {
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/10',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    icon: Pause,
    iconColor: 'text-yellow-400',
    label: 'Suspended',
  },
  skipped: {
    borderColor: 'border-gray-400/50',
    bgColor: 'bg-gray-400/10',
    glowColor: 'rgba(156, 163, 175, 0.3)',
    icon: ArrowRight,
    iconColor: 'text-muted-foreground',
    label: 'Skipped',
  },
  retrying: {
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    icon: RotateCcw,
    iconColor: 'text-orange-400',
    label: 'Retrying',
  },
  continued: {
    borderColor: 'border-orange-400/50',
    bgColor: 'bg-orange-400/10',
    glowColor: 'rgba(251, 146, 60, 0.3)',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    label: 'Continued',
  },
};

type CustomNodeData = Partial<ModuleConfig> & {
  icon?: string;
  type?: string; // Allow explicit type override
  // Phase 16: Error handling settings
  settings?: {
    onError?: 'stop' | 'continue';
    hasErrorPort?: boolean; // Enable "On Error" output port for self-healing
    retryPolicy?: {
      maxAttempts: number;
      backoffMs: number;
      exponentialBackoff?: boolean;
    };
  };
};

// ============================================================================
// HANDLE STYLES
// ============================================================================

/**
 * Handle style configuration for visual feedback
 */
const HANDLE_STYLES = {
  base: 'transition-all duration-150',
  default: 'w-3 h-3 border-2 border-white/20',
  hover: 'hover:scale-125 hover:border-white/40',
  connecting: 'ring-2 ring-blue-400/50 ring-offset-1 ring-offset-transparent',
  invalid: 'ring-2 ring-red-400/50',
};

/**
 * Handle label component for condition nodes
 */
const HandleLabel = memo(function HandleLabel({
  label,
  position,
  color,
}: {
  label: string;
  position: 'top' | 'bottom';
  color: string;
}) {
  return (
    <div
      className={cn(
        'absolute text-[9px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap pointer-events-none',
        position === 'top' ? '-top-5' : '-bottom-5',
        'left-1/2 -translate-x-1/2'
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      }}
    >
      {label}
    </div>
  );
});

// Memoized NodeCostBadge wrapper to prevent re-renders
const MemoizedCostBadge = memo(function MemoizedCostBadge({
  nodeType,
  config,
}: {
  nodeType: string;
  config: Record<string, unknown>;
}) {
  // Only re-render when cost-affecting props change
  const costConfig = useMemo(() => ({
    model: config.model as string | undefined,
    selectedModel: config.selectedModel as string | undefined,
    provider: config.provider as string | undefined,
    quality: config.quality as string | undefined,
    retryCount: config.retryCount as number | undefined,
    maxRetries: config.maxRetries as number | undefined,
  }), [
    config.model,
    config.selectedModel,
    config.provider,
    config.quality,
    config.retryCount,
    config.maxRetries,
  ]);

  return (
    <NodeCostBadge
      nodeType={nodeType}
      config={costConfig}
      size="sm"
      position="top-right"
    />
  );
});

// Custom comparison function for CustomNode memo
function arePropsEqual(
  prevProps: NodeProps<CustomNodeData>,
  nextProps: NodeProps<CustomNodeData>
): boolean {
  // Always re-render if selection changes
  if (prevProps.selected !== nextProps.selected) return false;
  if (prevProps.id !== nextProps.id) return false;

  // Check data equality shallowly
  const prevData = prevProps.data;
  const nextData = nextProps.data;

  if (prevData === nextData) return true;

  // Check relevant data properties
  return (
    prevData.label === nextData.label &&
    prevData.description === nextData.description &&
    prevData.icon === nextData.icon &&
    prevData.color === nextData.color &&
    prevData.enabled === nextData.enabled &&
    prevData.type === nextData.type &&
    prevData.model === nextData.model &&
    prevData.selectedModel === nextData.selectedModel
  );
}

export const CustomNode = memo(function CustomNode({ data, selected, id }: NodeProps<CustomNodeData>) {
  // Memoize icon lookup
  const Icon = useMemo(() => {
    return data.icon && ICON_MAP[data.icon] ? ICON_MAP[data.icon] : Settings;
  }, [data.icon]);

  const nodeColor = data.color || '#6366F1';

  // Determine node type for handle configuration
  const nodeType = useMemo(() => {
    return (data.type as NodeType) || 'action';
  }, [data.type]);

  // Get debug mode state with shallow comparison
  const isDebugMode = usePipelineStore(
    useCallback((state) => state.isDebugMode, [])
  );
  const nodeStatus = useNodeStatus(id);

  // Memoize debug config lookup
  const { debugConfig, DebugStatusIcon } = useMemo(() => {
    const config = isDebugMode && nodeStatus ? DEBUG_STATUS_CONFIG[nodeStatus] : null;
    return {
      debugConfig: config,
      DebugStatusIcon: config?.icon,
    };
  }, [isDebugMode, nodeStatus]);

  // Memoize handle configuration based on node type
  const { hasInput, hasOutput, isCondition, hasErrorPort } = useMemo(() => ({
    // Trigger nodes have NO input handle
    hasInput: nodeType !== 'trigger',
    // Output nodes have NO output handle
    hasOutput: nodeType !== 'output',
    // Condition nodes have two output handles (True/False)
    isCondition: nodeType === 'condition',
    // Phase 16: Error port for self-healing fallback paths
    hasErrorPort: data.settings?.hasErrorPort ?? false,
  }), [nodeType, data.settings?.hasErrorPort]);

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        // Debug mode styling
        debugConfig ? debugConfig.borderColor : '',
        debugConfig ? debugConfig.bgColor : '',
        // Vibrant Enterprise normal mode styling
        !debugConfig && selected ? 'border-primary shadow-xl shadow-primary/20 ring-2 ring-primary/20' : '',
        !debugConfig && !selected ? 'border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10' : '',
        // Skipped nodes are dimmed
        isDebugMode && nodeStatus === 'skipped' ? 'opacity-50' : ''
      )}
      style={{
        minWidth: 200,
        minHeight: isCondition ? 100 : 80,
        // Vibrant glow effect in debug mode, subtle primary glow when selected in normal mode
        boxShadow: debugConfig
          ? `0 0 20px ${debugConfig.glowColor}`
          : selected
            ? `0 8px 32px ${nodeColor}30, 0 0 0 1px ${nodeColor}20`
            : undefined,
      }}
    >
      {/* Target Handle (Input) - Only for non-trigger nodes */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className={cn(
            HANDLE_STYLES.base,
            HANDLE_STYLES.default,
            HANDLE_STYLES.hover,
            'bg-surface-0'
          )}
          style={{ background: nodeColor }}
        />
      )}

      {/* Debug Status Badge (top-left) */}
      {debugConfig && DebugStatusIcon && (
        <div
          className={cn(
            'absolute -top-2 -left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
            debugConfig.bgColor,
            'border border-white/10 backdrop-blur-sm shadow-lg'
          )}
        >
          <DebugStatusIcon
            className={cn(
              'w-3 h-3',
              debugConfig.iconColor,
              nodeStatus === 'running' && 'animate-spin'
            )}
          />
          <span className={debugConfig.iconColor}>{debugConfig.label}</span>
        </div>
      )}

      {/* Node Type Badge (for trigger/output nodes) */}
      {(nodeType === 'trigger' || nodeType === 'output') && !debugConfig && (
        <div
          className="absolute -top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: nodeType === 'trigger' ? '#22C55E20' : '#6366F120',
            color: nodeType === 'trigger' ? '#22C55E' : '#6366F1',
            border: `1px solid ${nodeType === 'trigger' ? '#22C55E40' : '#6366F140'}`,
          }}
        >
          {nodeType === 'trigger' ? 'Start' : 'End'}
        </div>
      )}

      {/* Node Content - Vibrant Enterprise */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon - Vibrant with shadow */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/50"
            style={{
              backgroundColor: `${nodeColor}15`,
              boxShadow: `0 4px 12px ${nodeColor}25`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: nodeColor }} />
          </div>

          {/* Label & Description */}
          <div className="flex-1">
            <h4 className="text-sm font-bold text-foreground">{data.label || 'Module'}</h4>
            {data.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{data.description}</p>
            )}
          </div>
        </div>

        {/* Status Indicator (normal mode only) - Vibrant */}
        {!isDebugMode && data.enabled !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full shadow-sm ${
                data.enabled ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-muted-foreground'
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {data.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        )}

        {/* Debug Mode: Click to view details hint */}
        {isDebugMode && nodeStatus && nodeStatus !== 'pending' && (
          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <span>Click to view details</span>
          </div>
        )}
      </div>

      {/* Source Handles (Output) - Different configurations based on node type */}
      {hasOutput && !isCondition && (
        // Standard single output handle
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className={cn(
            HANDLE_STYLES.base,
            HANDLE_STYLES.default,
            HANDLE_STYLES.hover,
            'bg-surface-0'
          )}
          style={{ background: nodeColor }}
        />
      )}

      {/* Condition node: Two output handles (True/False) */}
      {isCondition && (
        <>
          {/* True handle (top) */}
          <div className="absolute right-0 top-1/3 -translate-y-1/2">
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className={cn(
                HANDLE_STYLES.base,
                HANDLE_STYLES.default,
                HANDLE_STYLES.hover,
                'bg-surface-0 relative'
              )}
              style={{ background: '#22C55E', position: 'relative', right: 0, top: 0, transform: 'none' }}
            />
            <HandleLabel label="True" position="top" color="#22C55E" />
          </div>

          {/* False handle (bottom) */}
          <div className="absolute right-0 top-2/3 -translate-y-1/2">
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className={cn(
                HANDLE_STYLES.base,
                HANDLE_STYLES.default,
                HANDLE_STYLES.hover,
                'bg-surface-0 relative'
              )}
              style={{ background: '#EF4444', position: 'relative', right: 0, top: 0, transform: 'none' }}
            />
            <HandleLabel label="False" position="bottom" color="#EF4444" />
          </div>
        </>
      )}

      {/* Phase 16: Error Output Handle for Self-Healing */}
      {hasErrorPort && hasOutput && !isCondition && (
        <div className="absolute right-0 bottom-3 translate-x-1/2">
          <Handle
            type="source"
            position={Position.Right}
            id="error"
            className={cn(
              HANDLE_STYLES.base,
              HANDLE_STYLES.default,
              HANDLE_STYLES.hover,
              'bg-surface-0 relative'
            )}
            style={{ background: '#EF4444', position: 'relative', right: 0, top: 0, transform: 'none' }}
          />
          <HandleLabel label="On Error" position="bottom" color="#EF4444" />
        </div>
      )}

      {/* Cost Badge (hide in debug mode - show step cost instead) */}
      {!isDebugMode && (
        <MemoizedCostBadge
          nodeType={(data.type as string) || 'custom'}
          config={data as Record<string, unknown>}
        />
      )}

      {/* Selection/Glow Indicator - Vibrant */}
      {selected && !debugConfig && (
        <div
          className="absolute -inset-1 rounded-xl opacity-30 blur-md -z-10"
          style={{ background: `linear-gradient(135deg, ${nodeColor}, hsl(262, 83%, 58%))` }}
        />
      )}

      {/* Running animation - Vibrant */}
      {isDebugMode && nodeStatus === 'running' && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
            style={{ animation: 'shimmer 1.5s infinite' }}
          />
        </div>
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

// Apply custom comparison for additional performance
export const OptimizedCustomNode = memo(CustomNode, arePropsEqual);
