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
    stroke: '#6366F1',
    strokeWidth: 2,
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
        panOnDrag={[1, 2]} // Middle and right click to pan
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        {/* Background Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(214 32% 85%)"
          className="bg-background"
        />

        {/* Controls */}
        <Controls
          className="!bg-card !border-border !rounded-xl !shadow-lg"
          showZoom
          showFitView
          showInteractive
        />

        {/* MiniMap */}
        <MiniMap
          className="!bg-card !border-border !rounded-xl"
          nodeColor={(node) => {
            const data = node.data as PipelineNodeData;
            return data.color || '#6366F1';
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Custom Styles for React Flow */}
      <style jsx global>{`
        .react-flow__controls-button {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        .react-flow__controls-button:hover {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--foreground)) !important;
        }
        .react-flow__controls-button svg {
          fill: currentColor !important;
        }
        .react-flow__edge-path {
          stroke: hsl(var(--primary)) !important;
          stroke-width: 2px !important;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: hsl(262 83% 68%) !important;
          stroke-width: 3px !important;
        }
        .react-flow__connection-line {
          stroke: hsl(var(--primary)) !important;
          stroke-width: 2px !important;
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
