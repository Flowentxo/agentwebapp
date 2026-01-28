'use client';

/**
 * ExecutionEdge Component
 *
 * Animated edge for pipeline execution visualization
 * Shows data flow with animated particles/dashes
 *
 * Part of Phase 5: Live Visualization
 */

import { memo, useMemo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { motion } from 'framer-motion';

export type EdgeExecutionStatus = 'idle' | 'active' | 'completed' | 'error' | 'skipped';

interface ExecutionEdgeData {
  executionStatus?: EdgeExecutionStatus;
  label?: string;
  animated?: boolean;
}

function ExecutionEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}: EdgeProps<ExecutionEdgeData>) {
  const status = data?.executionStatus || 'idle';

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Status-based styling
  const statusStyles = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          stroke: '#3b82f6', // blue-500
          strokeWidth: 3,
          filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))',
        };
      case 'completed':
        return {
          stroke: '#22c55e', // green-500
          strokeWidth: 2,
          filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))',
        };
      case 'error':
        return {
          stroke: '#ef4444', // red-500
          strokeWidth: 2,
          filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))',
        };
      case 'skipped':
        return {
          stroke: '#6b7280', // gray-500
          strokeWidth: 1,
          opacity: 0.5,
        };
      default:
        return {
          stroke: '#4b5563', // gray-600
          strokeWidth: 2,
        };
    }
  }, [status]);

  // Animation for active edges
  const isActive = status === 'active';

  return (
    <>
      {/* Background path (for glow effect) */}
      {(status === 'active' || status === 'completed') && (
        <path
          d={edgePath}
          fill="none"
          stroke={statusStyles.stroke}
          strokeWidth={statusStyles.strokeWidth + 4}
          strokeOpacity={0.2}
          className="react-flow__edge-path"
        />
      )}

      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={statusStyles.stroke}
        strokeWidth={statusStyles.strokeWidth}
        style={{
          ...style,
          filter: statusStyles.filter,
          opacity: statusStyles.opacity,
        }}
        className={`react-flow__edge-path ${selected ? 'selected' : ''}`}
      />

      {/* Animated particles for active edges */}
      {isActive && (
        <>
          {/* Particle 1 */}
          <motion.circle
            r={4}
            fill="#3b82f6"
            filter="drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))"
          >
            <animateMotion
              dur="1.5s"
              repeatCount="indefinite"
              path={edgePath}
            />
          </motion.circle>

          {/* Particle 2 (offset) */}
          <motion.circle
            r={3}
            fill="#60a5fa"
            filter="drop-shadow(0 0 3px rgba(96, 165, 250, 0.6))"
          >
            <animateMotion
              dur="1.5s"
              repeatCount="indefinite"
              path={edgePath}
              begin="0.5s"
            />
          </motion.circle>

          {/* Particle 3 (offset) */}
          <motion.circle
            r={2}
            fill="#93c5fd"
            filter="drop-shadow(0 0 2px rgba(147, 197, 253, 0.5))"
          >
            <animateMotion
              dur="1.5s"
              repeatCount="indefinite"
              path={edgePath}
              begin="1s"
            />
          </motion.circle>
        </>
      )}

      {/* Success checkmark for completed edges */}
      {status === 'completed' && (
        <motion.circle
          r={3}
          fill="#22c55e"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <animateMotion
            dur="0.5s"
            fill="freeze"
            path={edgePath}
          />
        </motion.circle>
      )}

      {/* Edge label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`
              px-2 py-0.5 rounded text-[10px] font-medium
              ${status === 'active' ? 'bg-blue-500/90 text-white' :
                status === 'completed' ? 'bg-green-500/90 text-white' :
                status === 'error' ? 'bg-red-500/90 text-white' :
                'bg-gray-700/90 text-gray-300'}
            `}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ExecutionEdge = memo(ExecutionEdgeComponent);

// Edge type definition for React Flow
export const executionEdgeTypes = {
  execution: ExecutionEdge,
};

export default ExecutionEdge;
