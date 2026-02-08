'use client';

/**
 * CockpitCanvas Component
 *
 * Read-only workflow visualization for the Pipeline Cockpit.
 * Shows the workflow graph with active node glow during execution.
 *
 * Vicy-Style: Deep Black (#050505) + Violet Glow
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Viewport,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import { usePipelineStore, PipelineNodeData, NodeExecutionStatus } from '../store/usePipelineStore';
import { CustomNode } from '../editor/CustomNode';
import { CustomEdge } from '../editor/CustomEdge';

// ============================================
// TYPES
// ============================================

interface CockpitCanvasProps {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  viewport?: Viewport;
  activeNodeId?: string | null;
  nodeStatuses?: Record<string, NodeExecutionStatus>;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================
// NODE TYPES
// ============================================

const nodeTypes = {
  custom: CustomNode,
};

// ============================================
// EDGE TYPES
// ============================================

const edgeTypes = {
  default: CustomEdge,
  smoothstep: CustomEdge,
  bezier: CustomEdge,
};

// ============================================
// DEFAULT EDGE OPTIONS
// ============================================

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: {
    stroke: 'rgba(139, 92, 246, 0.4)',
    strokeWidth: 1.5,
  },
};

// ============================================
// READ-ONLY PROPS
// ============================================

const readOnlyProps = {
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: true,
  panOnDrag: true,
  zoomOnScroll: true,
  deleteKeyCode: null,
  edgesFocusable: false,
  nodesFocusable: true,
};

// ============================================
// INNER CANVAS COMPONENT
// ============================================

function CockpitCanvasInner({
  nodes,
  edges,
  viewport,
  activeNodeId,
  nodeStatuses,
  onNodeClick,
}: CockpitCanvasProps) {
  const { fitView } = useReactFlow();

  // Auto-fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 500 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  // Sync cockpit nodeStatuses into the pipeline store so NodeStatusWrapper can read them.
  // Uses a ref to track last-synced values and avoid triggering infinite re-render loops.
  const lastSyncedStatuses = useRef<Record<string, NodeExecutionStatus>>({});
  useEffect(() => {
    if (!nodeStatuses) return;

    // Check if anything actually changed since last sync
    let hasChanges = false;
    for (const [nodeId, status] of Object.entries(nodeStatuses)) {
      if (lastSyncedStatuses.current[nodeId] !== status) {
        hasChanges = true;
        break;
      }
    }
    if (!hasChanges) return;

    // Batch update: build new status map and set once
    const currentStore = usePipelineStore.getState();
    const newNodeStatus = { ...currentStore.nodeStatus };
    for (const [nodeId, status] of Object.entries(nodeStatuses)) {
      newNodeStatus[nodeId] = status;
    }
    usePipelineStore.setState({ nodeStatus: newNodeStatus });
    lastSyncedStatuses.current = { ...nodeStatuses };
  }, [nodeStatuses]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<PipelineNodeData>) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Enhanced nodes with status-based styling
  const enhancedNodes = useMemo(() => {
    return nodes.map((node) => {
      const status = nodeStatuses?.[node.id];
      const isActive = node.id === activeNodeId;

      return {
        ...node,
        data: {
          ...node.data,
          // Pass execution status to node
          executionStatus: status,
          isActiveInCockpit: isActive,
        },
        // Add selection state for active node
        selected: isActive,
      };
    });
  }, [nodes, nodeStatuses, activeNodeId]);

  // Enhanced edges based on execution flow
  const enhancedEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceStatus = nodeStatuses?.[edge.source];
      const targetStatus = nodeStatuses?.[edge.target];

      // Animate edge if source is success and target is running
      const isFlowing = sourceStatus === 'success' && targetStatus === 'running';
      const isCompleted = sourceStatus === 'success' && targetStatus === 'success';

      return {
        ...edge,
        animated: isFlowing,
        style: {
          ...edge.style,
          stroke: isCompleted
            ? 'rgba(16, 185, 129, 0.6)' // Green for completed
            : isFlowing
            ? 'rgba(139, 92, 246, 0.8)' // Violet for flowing
            : 'rgba(139, 92, 246, 0.4)', // Default
          strokeWidth: isFlowing ? 2 : 1.5,
        },
      };
    });
  }, [edges, nodeStatuses]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={enhancedNodes}
        edges={enhancedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={viewport || { x: 0, y: 0, zoom: 1 }}
        onNodeClick={handleNodeClick}
        {...readOnlyProps}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="!bg-[#050505]"
      >
        {/* Background Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.03)"
          className="!bg-[#050505]"
        />

      </ReactFlow>

      {/* Active Node Glow Overlay */}
      <AnimatePresence>
        {activeNodeId && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Ambient glow effect */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white/20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            <p className="text-white/30 text-sm">No workflow nodes</p>
            <p className="text-white/20 text-xs mt-1">
              Edit the pipeline to add nodes
            </p>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        .react-flow__edge-path {
          stroke: rgba(139, 92, 246, 0.6) !important;
          stroke-width: 1.5px !important;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #8b5cf6 !important;
          stroke-width: 2px !important;
        }
      `}</style>
    </div>
  );
}

// ============================================
// MAIN COMPONENT WITH PROVIDER
// ============================================

export function CockpitCanvas(props: CockpitCanvasProps) {
  return (
    <ReactFlowProvider>
      <CockpitCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default CockpitCanvas;