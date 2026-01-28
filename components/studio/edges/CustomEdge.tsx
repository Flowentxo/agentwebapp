'use client';

/**
 * CUSTOM EDGE COMPONENT
 *
 * Phase 22: Premium Studio Features
 *
 * Interactive edge with:
 * - Delete button on hover
 * - Data flow animation during execution
 * - Data type badge
 * - Smooth bezier styling
 *
 * @version 1.0.0
 */

import { memo, useState, useCallback, useMemo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
} from 'reactflow';
import { X, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore, useNodeStatus } from '@/components/pipelines/store/usePipelineStore';

// ============================================================================
// TYPES
// ============================================================================

interface CustomEdgeData {
  /** Handle ID on source node */
  sourceHandle?: string;
  /** Handle ID on target node */
  targetHandle?: string;
  /** Data type being passed */
  dataType?: string;
  /** Label to display on edge */
  label?: string;
  /** Whether this edge is animated (data flowing) */
  isAnimated?: boolean;
}

// ============================================================================
// EDGE STYLES
// ============================================================================

const EDGE_STYLES = {
  default: {
    stroke: '#6366F1',
    strokeWidth: 2,
  },
  hover: {
    stroke: '#818CF8',
    strokeWidth: 3,
  },
  active: {
    stroke: '#22C55E',
    strokeWidth: 3,
  },
  error: {
    stroke: '#EF4444',
    strokeWidth: 3,
  },
  selected: {
    stroke: '#A855F7',
    strokeWidth: 3,
  },
};

// ============================================================================
// CUSTOM EDGE COMPONENT
// ============================================================================

export const CustomEdge = memo(function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<CustomEdgeData>) {
  const [isHovered, setIsHovered] = useState(false);
  const { setEdges } = useReactFlow();

  // Get execution state for source and target nodes
  const sourceStatus = useNodeStatus(source);
  const targetStatus = useNodeStatus(target);
  const isDebugMode = usePipelineStore((state) => state.isDebugMode);
  const isRunning = usePipelineStore((state) => state.isRunning);

  // Determine if data is flowing through this edge
  const isDataFlowing = useMemo(() => {
    if (!isRunning && !isDebugMode) return false;
    // Data flows when source is success and target is running or success
    return (
      sourceStatus === 'success' &&
      (targetStatus === 'running' || targetStatus === 'success')
    );
  }, [isRunning, isDebugMode, sourceStatus, targetStatus]);

  // Calculate edge path using smooth step for n8n-style
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  // Determine edge color based on state
  const edgeColor = useMemo(() => {
    if (selected) return EDGE_STYLES.selected.stroke;
    if (isDataFlowing) return EDGE_STYLES.active.stroke;
    if (sourceStatus === 'error' || targetStatus === 'error') return EDGE_STYLES.error.stroke;
    if (isHovered) return EDGE_STYLES.hover.stroke;
    return EDGE_STYLES.default.stroke;
  }, [selected, isDataFlowing, sourceStatus, targetStatus, isHovered]);

  const edgeWidth = useMemo(() => {
    if (selected || isHovered || isDataFlowing) return 3;
    return 2;
  }, [selected, isHovered, isDataFlowing]);

  // Handle edge deletion
  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
    },
    [id, setEdges]
  );

  // Handle hover events
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="react-flow__edge-interaction"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={edgeWidth}
        className={cn(
          'react-flow__edge-path transition-all duration-200',
          isDataFlowing && 'animate-pulse'
        )}
        style={{
          ...style,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
        markerEnd={markerEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Animated data flow indicator */}
      {isDataFlowing && (
        <circle r={4} fill="#22C55E" className="animate-flow-particle">
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Edge label renderer for interactive elements */}
      <EdgeLabelRenderer>
        {/* Delete button (shown on hover) */}
        {isHovered && !isDebugMode && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full',
                'bg-red-500 text-white shadow-lg',
                'hover:bg-red-600 hover:scale-110',
                'transition-all duration-150',
                'border-2 border-white'
              )}
              title="Delete connection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Data flow indicator (shown during execution) */}
        {isDataFlowing && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 20}px)`,
              pointerEvents: 'none',
            }}
          >
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full',
                'bg-green-500/20 border border-green-500/40',
                'text-[10px] font-medium text-green-400',
                'animate-pulse'
              )}
            >
              <Zap className="w-3 h-3" />
              <span>Flowing</span>
            </div>
          </div>
        )}

        {/* Data type badge (if provided) */}
        {data?.dataType && !isHovered && !isDataFlowing && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
          >
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-md',
                'bg-surface-1/80 backdrop-blur-sm border border-white/10',
                'text-[9px] font-medium text-text-muted'
              )}
            >
              <ArrowRight className="w-2.5 h-2.5" />
              <span>{data.dataType}</span>
            </div>
          </div>
        )}

        {/* Handle label (for condition edges) */}
        {data?.sourceHandle && (data.sourceHandle === 'true' || data.sourceHandle === 'false') && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + 30}px, ${sourceY}px)`,
              pointerEvents: 'none',
            }}
          >
            <div
              className={cn(
                'px-1.5 py-0.5 rounded-md text-[9px] font-semibold',
                data.sourceHandle === 'true'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              )}
            >
              {data.sourceHandle === 'true' ? 'True' : 'False'}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';

// ============================================================================
// ANIMATED EDGE VARIANT
// ============================================================================

/**
 * Animated edge with constant flow animation
 * Used for live/streaming connections
 */
export const AnimatedEdge = memo(function AnimatedEdge(props: EdgeProps<CustomEdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      <path
        id={props.id}
        d={edgePath}
        fill="none"
        stroke="#6366F1"
        strokeWidth={2}
        strokeDasharray="5,5"
        className="react-flow__edge-path"
        style={{ animation: 'dashmove 0.5s linear infinite' }}
      />
    </>
  );
});

AnimatedEdge.displayName = 'AnimatedEdge';

// ============================================================================
// CSS ANIMATIONS (add to globals.css)
// ============================================================================

/**
 * Add these styles to globals.css:
 *
 * @keyframes dashmove {
 *   from {
 *     stroke-dashoffset: 10;
 *   }
 *   to {
 *     stroke-dashoffset: 0;
 *   }
 * }
 *
 * @keyframes flow-particle {
 *   0% {
 *     opacity: 0;
 *   }
 *   10% {
 *     opacity: 1;
 *   }
 *   90% {
 *     opacity: 1;
 *   }
 *   100% {
 *     opacity: 0;
 *   }
 * }
 *
 * .animate-flow-particle {
 *   animation: flow-particle 1s ease-in-out infinite;
 * }
 */

export default CustomEdge;
