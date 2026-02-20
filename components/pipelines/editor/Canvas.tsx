'use client';

import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
  ConnectionMode,
  Node,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePipelineStore, PipelineNodeData } from '../store/usePipelineStore';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';

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
// STABLE PROP CONSTANTS (must be outside component to avoid new refs each render)
// xyflow's StoreUpdater compares props by reference — inline objects cause infinite loops
// ============================================

const FIT_VIEW_OPTIONS = { padding: 0.2 };
const PRO_OPTIONS = { hideAttribution: true };
const DELETE_KEY_CODE = ['Backspace', 'Delete'];
const MULTI_SELECTION_KEY_CODE = ['Shift'];
const PAN_ON_DRAG: number[] = [1, 2];
const MINIMAP_NODE_COLOR = () => '#8b5cf6';

// ============================================
// CANVAS COMPONENT
// ============================================

interface CanvasProps {
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
}

export function PipelineCanvas({ onDrop, onDragOver }: CanvasProps) {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const viewport = usePipelineStore((s) => s.viewport);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const onConnect = usePipelineStore((s) => s.onConnect);
  const setSelectedNode = usePipelineStore((s) => s.setSelectedNode);
  const setViewport = usePipelineStore((s) => s.setViewport);

  // Capture initial viewport once for defaultViewport (must not change between renders)
  const initialViewportRef = useRef(viewport);
  // Keep a mutable ref of viewport for comparison inside callbacks (avoids deps on viewport)
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Handle node selection
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<PipelineNodeData>) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Handle viewport changes (pan, zoom)
  const handleMoveEnd = useCallback(
    (_: MouseEvent | TouchEvent | null, newViewport: Viewport) => {
      const cur = viewportRef.current;
      // Only update if viewport actually changed to avoid unnecessary dirty flags
      if (
        newViewport.x !== cur.x ||
        newViewport.y !== cur.y ||
        newViewport.zoom !== cur.zoom
      ) {
        setViewport(newViewport);
      }
    },
    [setViewport]
  );

  return (
    <div
      className="flex-1 h-full pipeline-canvas-atmosphere"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onMoveEnd={handleMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={initialViewportRef.current}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        fitView={nodes.length === 0}
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={DELETE_KEY_CODE}
        multiSelectionKeyCode={MULTI_SELECTION_KEY_CODE}
        panOnDrag={PAN_ON_DRAG}
        selectionOnDrag
        proOptions={PRO_OPTIONS}
        className="!bg-transparent"
      >
        {/* Background Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.08)"
          className="!bg-transparent"
        />

        {/* Controls */}
        <Controls
          className="pipeline-controls"
          showZoom
          showFitView
          showInteractive={false}
        />

        {/* MiniMap */}
        <MiniMap
          className="pipeline-minimap"
          nodeColor={MINIMAP_NODE_COLOR}
          maskColor="rgba(0, 0, 0, 0.5)"
          pannable
          zoomable
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
          }}
        />
      </ReactFlow>

      {/* Custom Styles for React Flow */}
      <style jsx global>{`
        .react-flow__edge-path {
          stroke: rgba(139, 92, 246, 0.6) !important;
          stroke-width: 1.5px !important;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #8b5cf6 !important;
          stroke-width: 2px !important;
        }
        .react-flow__connection-line {
          stroke: #8b5cf6 !important;
          stroke-width: 1.5px !important;
          stroke-dasharray: 5 5;
        }
        .react-flow__minimap {
          bottom: 20px !important;
          right: 20px !important;
        }
        .react-flow__controls {
          bottom: 20px !important;
          left: 20px !important;
        }
      `}</style>
    </div>
  );
}
