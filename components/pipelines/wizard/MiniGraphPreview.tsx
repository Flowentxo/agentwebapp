'use client';

/**
 * MiniGraphPreview Component
 *
 * Renders a small, static SVG preview of a workflow graph with
 * professional icons for each node type.
 *
 * Part of Phase 7: AI Workflow Wizard - Enterprise Templates
 */

import { useMemo } from 'react';

// Type definitions
type NodeType =
  | 'trigger'
  | 'agent'
  | 'action'
  | 'condition'
  | 'transform'
  | 'delay'
  | 'human-approval';

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: {
    label?: string;
    description?: string;
    color?: string;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

interface MiniGraphPreviewProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  width?: number;
  height?: number;
  className?: string;
  showLabels?: boolean;
}

// Node type configurations with colors and shapes
const NODE_CONFIG: Record<NodeType | 'default', { color: string; shape: 'circle' | 'diamond' | 'rect' }> = {
  trigger: { color: '#8B5CF6', shape: 'circle' },
  agent: { color: '#06B6D4', shape: 'rect' },
  action: { color: '#3B82F6', shape: 'rect' },
  condition: { color: '#6366F1', shape: 'diamond' },
  transform: { color: '#F59E0B', shape: 'rect' },
  delay: { color: '#6B7280', shape: 'rect' },
  'human-approval': { color: '#F97316', shape: 'rect' },
  default: { color: '#9CA3AF', shape: 'rect' },
};

export function MiniGraphPreview({
  nodes,
  edges,
  width = 200,
  height = 120,
  className = '',
}: MiniGraphPreviewProps) {
  // Calculate the bounds and scale to fit
  const { scaledNodes, scaledEdges, viewBox } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        scaledNodes: [],
        scaledEdges: [],
        viewBox: '0 0 200 120',
      };
    }

    // Find bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
      const x = node.position?.x || 0;
      const y = node.position?.y || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 100);
      maxY = Math.max(maxY, y + 50);
    });

    // Add padding
    const padding = 30;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    // Scale to fit
    const scaleX = width / graphWidth;
    const scaleY = height / graphHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Center the graph
    const offsetX = (width - graphWidth * scale) / 2;
    const offsetY = (height - graphHeight * scale) / 2;

    // Scale nodes
    const scaled = nodes.map((node) => {
      const nodeType = node.type as NodeType;
      const config = NODE_CONFIG[nodeType] || NODE_CONFIG.default;
      return {
        ...node,
        scaledX: ((node.position?.x || 0) - minX) * scale + offsetX,
        scaledY: ((node.position?.y || 0) - minY) * scale + offsetY,
        scaledWidth: 44 * scale,
        scaledHeight: 28 * scale,
        config,
      };
    });

    // Create node position lookup
    const nodePositions: Record<string, { x: number; y: number; width: number; height: number }> = {};
    scaled.forEach((node) => {
      nodePositions[node.id] = {
        x: node.scaledX,
        y: node.scaledY,
        width: node.scaledWidth,
        height: node.scaledHeight,
      };
    });

    // Scale edges
    const scaledEdgesList = edges.map((edge) => {
      const sourcePos = nodePositions[edge.source];
      const targetPos = nodePositions[edge.target];

      if (!sourcePos || !targetPos) return null;

      return {
        ...edge,
        x1: sourcePos.x + sourcePos.width / 2,
        y1: sourcePos.y + sourcePos.height,
        x2: targetPos.x + targetPos.width / 2,
        y2: targetPos.y,
      };
    }).filter(Boolean);

    return {
      scaledNodes: scaled,
      scaledEdges: scaledEdgesList,
      viewBox: `0 0 ${width} ${height}`,
    };
  }, [nodes, edges, width, height]);

  if (nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800/30 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-muted-foreground">Keine Vorschau</span>
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      className={className}
      style={{ background: 'transparent' }}
    >
      {/* Definitions */}
      <defs>
        <filter id="glow-mini" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Arrow marker */}
        <marker
          id="arrowhead-mini"
          markerWidth="6"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <polygon points="0 0, 6 2, 0 4" fill="#6B7280" opacity="0.7" />
        </marker>
      </defs>

      {/* Edges */}
      {scaledEdges.map((edge: any, index: number) => {
        if (!edge) return null;

        const midY = (edge.y1 + edge.y2) / 2;
        const isAnimated = edge.animated;

        return (
          <g key={edge.id || `edge-${index}`}>
            <path
              d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`}
              fill="none"
              stroke={isAnimated ? '#8B5CF6' : '#4B5563'}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={isAnimated ? 0.8 : 0.5}
              markerEnd="url(#arrowhead-mini)"
              strokeDasharray={isAnimated ? '4 2' : undefined}
            >
              {isAnimated && (
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-6"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              )}
            </path>
          </g>
        );
      })}

      {/* Nodes */}
      {scaledNodes.map((node: any) => {
        const { color, shape } = node.config;
        const cx = node.scaledX + node.scaledWidth / 2;
        const cy = node.scaledY + node.scaledHeight / 2;
        const iconSize = Math.min(node.scaledWidth, node.scaledHeight) * 0.5;
        const nodeType = node.type as NodeType;

        if (shape === 'circle') {
          const radius = Math.min(node.scaledWidth, node.scaledHeight) / 2;
          return (
            <g key={node.id}>
              {/* Outer glow */}
              <circle
                cx={cx}
                cy={cy}
                r={radius + 2}
                fill={color}
                opacity={0.2}
              />
              {/* Main circle */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                opacity={0.9}
                filter="url(#glow-mini)"
              />
              {/* Zap icon for trigger */}
              <path
                d={`M ${cx - iconSize/4} ${cy + iconSize/6} L ${cx} ${cy - iconSize/3} L ${cx - iconSize/8} ${cy} L ${cx + iconSize/4} ${cy - iconSize/6} L ${cx} ${cy + iconSize/3} L ${cx + iconSize/8} ${cy}`}
                fill="white"
                opacity={0.95}
              />
            </g>
          );
        }

        if (shape === 'diamond') {
          const size = Math.min(node.scaledWidth, node.scaledHeight) / 2;
          return (
            <g key={node.id}>
              {/* Outer glow */}
              <polygon
                points={`${cx},${cy - size - 2} ${cx + size + 2},${cy} ${cx},${cy + size + 2} ${cx - size - 2},${cy}`}
                fill={color}
                opacity={0.2}
              />
              {/* Main diamond */}
              <polygon
                points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
                fill={color}
                opacity={0.9}
                filter="url(#glow-mini)"
              />
              {/* Branch icon */}
              <g>
                <line
                  x1={cx}
                  y1={cy + iconSize/3}
                  x2={cx}
                  y2={cy - iconSize/6}
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <line
                  x1={cx}
                  y1={cy - iconSize/6}
                  x2={cx - iconSize/3}
                  y2={cy - iconSize/3}
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <line
                  x1={cx}
                  y1={cy - iconSize/6}
                  x2={cx + iconSize/3}
                  y2={cy - iconSize/3}
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
              </g>
            </g>
          );
        }

        // Rectangle (default for agent, action, etc.)
        return (
          <g key={node.id}>
            {/* Outer glow */}
            <rect
              x={node.scaledX - 2}
              y={node.scaledY - 2}
              width={node.scaledWidth + 4}
              height={node.scaledHeight + 4}
              rx={6}
              ry={6}
              fill={color}
              opacity={0.15}
            />
            {/* Main rect */}
            <rect
              x={node.scaledX}
              y={node.scaledY}
              width={node.scaledWidth}
              height={node.scaledHeight}
              rx={4}
              ry={4}
              fill={color}
              opacity={0.9}
              filter="url(#glow-mini)"
            />
            {/* Type-specific icons */}
            {nodeType === 'agent' && (
              <g>
                {/* Robot head */}
                <rect
                  x={cx - iconSize/3}
                  y={cy - iconSize/4}
                  width={iconSize/1.5}
                  height={iconSize/2}
                  rx={2}
                  fill="white"
                  opacity={0.95}
                />
                {/* Antenna */}
                <line
                  x1={cx}
                  y1={cy - iconSize/4}
                  x2={cx}
                  y2={cy - iconSize/2}
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <circle cx={cx} cy={cy - iconSize/2} r={1.5} fill="white" opacity={0.95} />
              </g>
            )}
            {nodeType === 'action' && (
              <g>
                {/* Play triangle */}
                <polygon
                  points={`${cx - iconSize/4},${cy - iconSize/3} ${cx + iconSize/3},${cy} ${cx - iconSize/4},${cy + iconSize/3}`}
                  fill="white"
                  opacity={0.95}
                />
              </g>
            )}
            {nodeType === 'transform' && (
              <g>
                {/* Shuffle arrows */}
                <path
                  d={`M ${cx - iconSize/3} ${cy - iconSize/6} L ${cx + iconSize/3} ${cy + iconSize/6}`}
                  stroke="white"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <path
                  d={`M ${cx - iconSize/3} ${cy + iconSize/6} L ${cx + iconSize/3} ${cy - iconSize/6}`}
                  stroke="white"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={0.95}
                />
              </g>
            )}
            {nodeType === 'delay' && (
              <g>
                {/* Clock face */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={iconSize/2.5}
                  stroke="white"
                  strokeWidth={1.2}
                  fill="none"
                  opacity={0.95}
                />
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={cy - iconSize/4}
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx + iconSize/4}
                  y2={cy}
                  stroke="white"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
              </g>
            )}
            {nodeType === 'human-approval' && (
              <g>
                {/* User with check */}
                <circle
                  cx={cx}
                  cy={cy - iconSize/5}
                  r={iconSize/4}
                  stroke="white"
                  strokeWidth={1.2}
                  fill="none"
                  opacity={0.95}
                />
                <path
                  d={`M ${cx - iconSize/4} ${cy + iconSize/3} Q ${cx} ${cy + iconSize/6} ${cx + iconSize/4} ${cy + iconSize/3}`}
                  stroke="white"
                  strokeWidth={1.2}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.95}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default MiniGraphPreview;
