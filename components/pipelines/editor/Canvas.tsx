'use client';

import { useCallback } from 'react';
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
  useReactFlow,
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
// CANVAS COMPONENT
// ============================================

interface CanvasProps {
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
}

export function PipelineCanvas({ onDrop, onDragOver }: CanvasProps) {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    setViewport,
  } = usePipelineStore();

  const { setViewport: setReactFlowViewport } = useReactFlow();

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
      // Only update if viewport actually changed to avoid unnecessary dirty flags
      if (
        newViewport.x !== viewport.x ||
        newViewport.y !== viewport.y ||
        newViewport.zoom !== viewport.zoom
      ) {
        setViewport(newViewport);
      }
    },
    [viewport, setViewport]
  );

  return (
    <div
      className="flex-1 h-full canvas-dot-pattern"
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
        defaultViewport={viewport}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        fitView={nodes.length === 0}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift']}
        panOnDrag={[1, 2]}
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
        className="!bg-[#050505]"
      >
        {/* Background Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.05)"
          className="!bg-[#050505]"
        />

        {/* Controls */}
        <Controls
          className="!bg-[#111] !border-[rgba(255,255,255,0.08)] !rounded-xl !shadow-none"
          showZoom
          showFitView
          showInteractive={false}
        />

        {/* MiniMap */}
        <MiniMap
          className="!bg-[#111] !border-[rgba(255,255,255,0.08)] !rounded-xl"
          nodeColor={() => '#8b5cf6'}
          maskColor="rgba(0,0,0,0.8)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Custom Styles for React Flow */}
      <style jsx global>{`
        .react-flow__controls-button {
          background: #111111 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }
        .react-flow__controls-button:hover {
          background: #1a1a1a !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .react-flow__controls-button svg {
          fill: currentColor !important;
        }
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
