/**
 * AUTO-LAYOUT UTILITY
 *
 * Phase 22: Premium Studio Features
 *
 * Uses Dagre for automatic graph layout calculations.
 * Provides optimal node positioning based on edges.
 *
 * @version 1.0.0
 */

import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

// ============================================================================
// TYPES
// ============================================================================

export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

export interface LayoutOptions {
  /** Layout direction: TB (top-bottom), LR (left-right), etc. */
  direction?: LayoutDirection;
  /** Horizontal spacing between nodes */
  nodeSpacingX?: number;
  /** Vertical spacing between nodes */
  nodeSpacingY?: number;
  /** Default node width if not specified */
  defaultNodeWidth?: number;
  /** Default node height if not specified */
  defaultNodeHeight?: number;
  /** Padding around the entire graph */
  padding?: number;
  /** Ranking algorithm: 'network-simplex', 'tight-tree', 'longest-path' */
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  /** Alignment for nodes within their rank */
  align?: 'UL' | 'UR' | 'DL' | 'DR' | undefined;
}

export interface LayoutResult {
  nodes: Node[];
  width: number;
  height: number;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'LR',
  nodeSpacingX: 100,
  nodeSpacingY: 50,
  defaultNodeWidth: 200,
  defaultNodeHeight: 80,
  padding: 50,
  ranker: 'network-simplex',
  align: undefined,
};

// ============================================================================
// LAYOUT FUNCTION
// ============================================================================

/**
 * Calculate optimal positions for nodes using Dagre layout algorithm
 *
 * @param nodes - React Flow nodes
 * @param edges - React Flow edges
 * @param options - Layout configuration options
 * @returns Layout result with positioned nodes
 *
 * @example
 * ```ts
 * const { nodes: layoutedNodes } = layoutNodes(nodes, edges, { direction: 'LR' });
 * ```
 */
export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): LayoutResult {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();

  // Set graph properties
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: config.direction,
    nodesep: config.nodeSpacingY,
    ranksep: config.nodeSpacingX,
    ranker: config.ranker,
    align: config.align,
    marginx: config.padding,
    marginy: config.padding,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    // Try to get dimensions from node data or use defaults
    const width = (node.width as number) || config.defaultNodeWidth;
    const height = (node.height as number) || config.defaultNodeHeight;

    dagreGraph.setNode(node.id, { width, height });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Get the graph dimensions
  const graphLabel = dagreGraph.graph();
  const graphWidth = graphLabel.width || 0;
  const graphHeight = graphLabel.height || 0;

  // Map the calculated positions back to React Flow nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    if (!nodeWithPosition) {
      return node;
    }

    // Dagre returns center positions, React Flow uses top-left
    // Adjust the position to account for node dimensions
    const width = (node.width as number) || config.defaultNodeWidth;
    const height = (node.height as number) || config.defaultNodeHeight;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    width: graphWidth,
    height: graphHeight,
  };
}

/**
 * Calculate layout with animation-ready intermediate positions
 *
 * @param nodes - Current nodes with positions
 * @param edges - Edges for layout calculation
 * @param options - Layout options
 * @returns Array of animation frames (start and end positions)
 */
export function layoutNodesAnimated(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { start: Node[]; end: Node[] } {
  const endLayout = layoutNodes(nodes, edges, options);

  return {
    start: nodes, // Current positions
    end: endLayout.nodes, // Target positions
  };
}

// ============================================================================
// LAYOUT PRESETS
// ============================================================================

/**
 * Horizontal layout (left to right) - default for workflows
 */
export function layoutHorizontal(nodes: Node[], edges: Edge[]): LayoutResult {
  return layoutNodes(nodes, edges, {
    direction: 'LR',
    nodeSpacingX: 120,
    nodeSpacingY: 60,
  });
}

/**
 * Vertical layout (top to bottom) - for tall workflows
 */
export function layoutVertical(nodes: Node[], edges: Edge[]): LayoutResult {
  return layoutNodes(nodes, edges, {
    direction: 'TB',
    nodeSpacingX: 80,
    nodeSpacingY: 100,
  });
}

/**
 * Compact layout - minimize space usage
 */
export function layoutCompact(nodes: Node[], edges: Edge[]): LayoutResult {
  return layoutNodes(nodes, edges, {
    direction: 'LR',
    nodeSpacingX: 80,
    nodeSpacingY: 40,
    ranker: 'tight-tree',
  });
}

/**
 * Spread layout - maximize readability
 */
export function layoutSpread(nodes: Node[], edges: Edge[]): LayoutResult {
  return layoutNodes(nodes, edges, {
    direction: 'LR',
    nodeSpacingX: 180,
    nodeSpacingY: 100,
    ranker: 'longest-path',
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Center the graph in the viewport
 *
 * @param nodes - Positioned nodes
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @returns Nodes with centered positions
 */
export function centerGraph(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number
): Node[] {
  if (nodes.length === 0) return nodes;

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const width = (node.width as number) || 200;
    const height = (node.height as number) || 80;

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  });

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;

  // Calculate offset to center
  const offsetX = (viewportWidth - graphWidth) / 2 - minX;
  const offsetY = (viewportHeight - graphHeight) / 2 - minY;

  // Apply offset
  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
}

/**
 * Get suggested layout direction based on node count and aspect ratio
 */
export function suggestLayoutDirection(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number
): LayoutDirection {
  const aspectRatio = viewportWidth / viewportHeight;
  const nodeCount = nodes.length;

  // For wide viewports or many nodes, use horizontal layout
  if (aspectRatio > 1.5 || nodeCount > 5) {
    return 'LR';
  }

  // For tall viewports, use vertical layout
  if (aspectRatio < 0.7) {
    return 'TB';
  }

  // Default to horizontal
  return 'LR';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  layoutNodes,
  layoutNodesAnimated,
  layoutHorizontal,
  layoutVertical,
  layoutCompact,
  layoutSpread,
  centerGraph,
  suggestLayoutDirection,
};
