'use client';

import { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { usePipelineStore, NodeExecutionStatus } from '../store/usePipelineStore';

// ============================================
// TYPES
// ============================================

interface CustomEdgeData {
  label?: string;
  animated?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getEdgeColor(sourceStatus: NodeExecutionStatus | null, targetStatus: NodeExecutionStatus | null): string {
  // If source is running and target is pending, show active color
  if (sourceStatus === 'running') {
    return '#F59E0B'; // Amber - data flowing out
  }

  // If source completed successfully
  if (sourceStatus === 'success') {
    if (targetStatus === 'running') {
      return '#3B82F6'; // Blue - data flowing in
    }
    if (targetStatus === 'success') {
      return '#22C55E'; // Green - completed flow
    }
    return '#22C55E'; // Green - ready to flow
  }

  // If source errored
  if (sourceStatus === 'error') {
    return '#EF4444'; // Red
  }

  // Default
  return '#6366F1'; // Indigo
}

function shouldAnimate(sourceStatus: NodeExecutionStatus | null, targetStatus: NodeExecutionStatus | null): boolean {
  // Animate when data is flowing
  if (sourceStatus === 'running') return true;
  if (sourceStatus === 'success' && targetStatus === 'running') return true;
  if (sourceStatus === 'success' && targetStatus === 'pending') return true;
  return false;
}

function getEdgeOpacity(sourceStatus: NodeExecutionStatus | null): number {
  if (sourceStatus === 'skipped') return 0.3;
  if (sourceStatus === 'error') return 0.6;
  return 1;
}

// ============================================
// CUSTOM EDGE COMPONENT
// ============================================

function CustomEdgeComponent({
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
}: EdgeProps<CustomEdgeData>) {
  // Get execution status for source and target nodes
  const nodeStatus = usePipelineStore((state) => state.nodeStatus);
  const sourceStatus = nodeStatus[source] || null;
  const targetStatus = nodeStatus[target] || null;

  // Calculate path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge styling based on execution state
  const edgeColor = getEdgeColor(sourceStatus, targetStatus);
  const isAnimated = shouldAnimate(sourceStatus, targetStatus);
  const opacity = getEdgeOpacity(sourceStatus);

  return (
    <>
      {/* Glow effect for active edges */}
      {isAnimated && (
        <path
          d={edgePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={8}
          strokeOpacity={0.2}
          className="animate-pulse"
          style={{ filter: 'blur(4px)' }}
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: isAnimated ? 3 : 2,
          opacity,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease',
        }}
      />

      {/* Animated flow particles */}
      {isAnimated && (
        <g>
          <circle r="4" fill={edgeColor} opacity="0.8">
            <animateMotion
              dur="1s"
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
          <circle r="3" fill="white" opacity="0.6">
            <animateMotion
              dur="1s"
              repeatCount="indefinite"
              path={edgePath}
              begin="0.5s"
            />
          </circle>
        </g>
      )}

      {/* Success checkmark on completed edges */}
      {sourceStatus === 'success' && targetStatus === 'success' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white shadow-lg"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Error indicator on failed edges */}
      {sourceStatus === 'error' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white shadow-lg animate-pulse"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Edge label if provided */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="px-2 py-0.5 rounded-full bg-slate-800 text-white/70 text-xs font-medium border border-white/10"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
