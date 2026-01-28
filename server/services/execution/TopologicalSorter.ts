/**
 * TopologicalSorter
 *
 * DAG-aware execution analysis for workflow graphs.
 * Analyzes node dependencies, detects cycles, identifies parallel execution waves,
 * and finds merge points for branch synchronization.
 *
 * Based on Kahn's algorithm for topological sorting.
 *
 * Phase 2 Update: Added support for loop edges (feedback loops).
 * Loop edges are ignored during topological sort to prevent false cycle detection,
 * but are tracked separately for loop execution handling.
 */

import { Node, Edge } from 'reactflow';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionWave {
  /** Wave number (0-indexed) */
  waveIndex: number;
  /** Node IDs that can execute in parallel in this wave */
  nodeIds: string[];
  /** Dependencies from previous waves */
  dependencies: Map<string, string[]>;
}

export interface DAGAnalysis {
  /** Whether the graph is a valid DAG (no cycles) */
  isValid: boolean;
  /** If invalid, the cycle path */
  cyclePath?: string[];
  /** Nodes in topological order */
  sortedNodes: string[];
  /** Execution waves for parallel processing */
  waves: ExecutionWave[];
  /** Map of node ID to its depth in the graph */
  nodeDepths: Map<string, number>;
  /** Entry points (nodes with no incoming edges) */
  entryNodes: string[];
  /** Exit points (nodes with no outgoing edges) */
  exitNodes: string[];
  /** Merge points (nodes with multiple incoming edges) */
  mergePoints: string[];
  /** Branch points (nodes with multiple outgoing edges) */
  branchPoints: string[];
  /** Map of node ID to its parent node IDs */
  parentMap: Map<string, string[]>;
  /** Map of node ID to its child node IDs */
  childMap: Map<string, string[]>;
  /** Loop nodes (SplitInBatches nodes) */
  loopNodes: string[];
  /** Loop edges (edges marked as feedback loops) */
  loopEdges: Edge[];
}

/**
 * Configuration for edge type detection
 */
export interface EdgeTypeConfig {
  /** Edge types that indicate a loop feedback edge */
  loopEdgeTypes: string[];
  /** Source handle names that indicate loop output */
  loopSourceHandles: string[];
}

export interface BranchInfo {
  /** Branch ID (usually the edge ID or source node ID) */
  branchId: string;
  /** Source node where branch originates */
  sourceNodeId: string;
  /** All nodes in this branch */
  nodeIds: string[];
  /** Where this branch merges (if any) */
  mergeNodeId?: string;
}

export interface MergePointInfo {
  /** The merge node ID */
  nodeId: string;
  /** Number of incoming branches */
  incomingCount: number;
  /** IDs of parent nodes */
  parentNodeIds: string[];
  /** IDs of the branches feeding into this merge */
  branchIds: string[];
}

// ============================================================================
// TOPOLOGICAL SORTER
// ============================================================================

/** Default configuration for edge type detection */
const DEFAULT_EDGE_TYPE_CONFIG: EdgeTypeConfig = {
  loopEdgeTypes: ['loop', 'feedback', 'back-edge'],
  loopSourceHandles: ['loop', 'feedback'],
};

/** Node types that are loop controllers */
const LOOP_NODE_TYPES = [
  'splitInBatches',
  'split-in-batches',
  'SplitInBatches',
  'loop',
  'forEach',
  'for-each',
];

export class TopologicalSorter {
  private nodes: Node[];
  private edges: Edge[];
  private adjacencyList: Map<string, string[]>;
  private reverseAdjacencyList: Map<string, string[]>;
  private inDegree: Map<string, number>;
  private loopEdges: Edge[];
  private loopNodes: string[];
  private edgeTypeConfig: EdgeTypeConfig;

  constructor(nodes: Node[], edges: Edge[], config?: Partial<EdgeTypeConfig>) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    this.inDegree = new Map();
    this.loopEdges = [];
    this.loopNodes = [];
    this.edgeTypeConfig = { ...DEFAULT_EDGE_TYPE_CONFIG, ...config };

    this.identifyLoopElements();
    this.buildGraph();
  }

  /**
   * Identify loop nodes and loop edges before building the main graph
   */
  private identifyLoopElements(): void {
    // Identify loop nodes by type
    for (const node of this.nodes) {
      const nodeType = (node.type || node.data?.type || '').toLowerCase();
      if (LOOP_NODE_TYPES.some(lt => nodeType.includes(lt.toLowerCase()))) {
        this.loopNodes.push(node.id);
      }
    }

    // Identify loop edges
    for (const edge of this.edges) {
      if (this.isLoopEdge(edge)) {
        this.loopEdges.push(edge);
      }
    }
  }

  /**
   * Check if an edge is a loop feedback edge
   */
  private isLoopEdge(edge: Edge): boolean {
    // Check edge type
    const edgeType = (edge.type || '').toLowerCase();
    if (this.edgeTypeConfig.loopEdgeTypes.some(lt => edgeType.includes(lt))) {
      return true;
    }

    // Check edge data
    const dataEdgeType = ((edge.data?.edgeType || edge.data?.type) as string || '').toLowerCase();
    if (this.edgeTypeConfig.loopEdgeTypes.some(lt => dataEdgeType.includes(lt))) {
      return true;
    }

    // Check source handle
    const sourceHandle = (edge.sourceHandle || '').toLowerCase();
    if (this.edgeTypeConfig.loopSourceHandles.some(lh => sourceHandle.includes(lh))) {
      // Additionally check if this edge goes back to a loop node
      if (this.loopNodes.includes(edge.target)) {
        return true;
      }
    }

    // Check if edge explicitly connects back to a known loop node
    // and originates from within the loop scope
    if (edge.data?.isLoopFeedback === true) {
      return true;
    }

    return false;
  }

  /**
   * Build adjacency lists from nodes and edges
   * NOTE: Loop edges are excluded from the main graph to prevent cycle detection issues
   */
  private buildGraph(): void {
    // Initialize all nodes
    for (const node of this.nodes) {
      this.adjacencyList.set(node.id, []);
      this.reverseAdjacencyList.set(node.id, []);
      this.inDegree.set(node.id, 0);
    }

    // Build adjacency from edges, EXCLUDING loop edges
    for (const edge of this.edges) {
      const { source, target } = edge;

      // Skip self-loops
      if (source === target) continue;

      // Skip loop feedback edges - they create intentional cycles
      if (this.loopEdges.includes(edge)) {
        continue;
      }

      // Forward adjacency (source -> target)
      const children = this.adjacencyList.get(source) || [];
      if (!children.includes(target)) {
        children.push(target);
        this.adjacencyList.set(source, children);
      }

      // Reverse adjacency (target <- source)
      const parents = this.reverseAdjacencyList.get(target) || [];
      if (!parents.includes(source)) {
        parents.push(source);
        this.reverseAdjacencyList.set(target, parents);
      }

      // Update in-degree
      this.inDegree.set(target, (this.inDegree.get(target) || 0) + 1);
    }
  }

  /**
   * Perform full DAG analysis
   */
  analyze(): DAGAnalysis {
    const { isValid, cyclePath, sortedNodes } = this.topologicalSort();

    if (!isValid) {
      return {
        isValid: false,
        cyclePath,
        sortedNodes: [],
        waves: [],
        nodeDepths: new Map(),
        entryNodes: [],
        exitNodes: [],
        mergePoints: [],
        branchPoints: [],
        parentMap: this.reverseAdjacencyList,
        childMap: this.adjacencyList,
        loopNodes: this.loopNodes,
        loopEdges: this.loopEdges,
      };
    }

    const waves = this.computeExecutionWaves();
    const nodeDepths = this.computeNodeDepths();
    const entryNodes = this.findEntryNodes();
    const exitNodes = this.findExitNodes();
    const mergePoints = this.findMergePoints();
    const branchPoints = this.findBranchPoints();

    return {
      isValid: true,
      sortedNodes,
      waves,
      nodeDepths,
      entryNodes,
      exitNodes,
      mergePoints,
      branchPoints,
      parentMap: this.reverseAdjacencyList,
      childMap: this.adjacencyList,
      loopNodes: this.loopNodes,
      loopEdges: this.loopEdges,
    };
  }

  /**
   * Get loop edges (for execution engine to handle iteration)
   */
  getLoopEdges(): Edge[] {
    return this.loopEdges;
  }

  /**
   * Get loop nodes (SplitInBatches nodes)
   */
  getLoopNodes(): string[] {
    return this.loopNodes;
  }

  /**
   * Check if a node is a loop controller
   */
  isLoopNode(nodeId: string): boolean {
    return this.loopNodes.includes(nodeId);
  }

  /**
   * Get the feedback nodes for a specific loop node
   * (nodes that connect back to the loop node)
   */
  getLoopFeedbackNodes(loopNodeId: string): string[] {
    return this.loopEdges
      .filter(edge => edge.target === loopNodeId)
      .map(edge => edge.source);
  }

  /**
   * Get all nodes within a loop's scope (downstream of 'loop' output)
   */
  getLoopScopeNodes(loopNodeId: string): string[] {
    const scopeNodes: string[] = [];
    const visited = new Set<string>();

    // Find edges from loop node with 'loop' handle
    const loopOutputEdges = this.edges.filter(
      edge => edge.source === loopNodeId &&
        (edge.sourceHandle === 'loop' || edge.data?.edgeType === 'loop')
    );

    // BFS to find all nodes in scope
    const queue = loopOutputEdges.map(e => e.target);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) continue;
      if (nodeId === loopNodeId) continue; // Don't include the loop node itself

      visited.add(nodeId);
      scopeNodes.push(nodeId);

      // Get children, but don't follow edges that go to the loop node (feedback)
      const children = this.adjacencyList.get(nodeId) || [];
      for (const child of children) {
        if (!visited.has(child) && child !== loopNodeId) {
          queue.push(child);
        }
      }
    }

    return scopeNodes;
  }

  /**
   * Kahn's algorithm for topological sort with cycle detection
   */
  private topologicalSort(): {
    isValid: boolean;
    cyclePath?: string[];
    sortedNodes: string[];
  } {
    const inDegree = new Map(this.inDegree);
    const queue: string[] = [];
    const sorted: string[] = [];

    // Find all nodes with no incoming edges
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const children = this.adjacencyList.get(current) || [];
      for (const child of children) {
        const newDegree = (inDegree.get(child) || 0) - 1;
        inDegree.set(child, newDegree);

        if (newDegree === 0) {
          queue.push(child);
        }
      }
    }

    // If we didn't visit all nodes, there's a cycle
    if (sorted.length !== this.nodes.length) {
      const cyclePath = this.findCycle();
      return { isValid: false, cyclePath, sortedNodes: [] };
    }

    return { isValid: true, sortedNodes: sorted };
  }

  /**
   * Find a cycle in the graph using DFS
   */
  private findCycle(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const parent = new Map<string, string>();

    const dfs = (nodeId: string): string[] | null => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const children = this.adjacencyList.get(nodeId) || [];
      for (const child of children) {
        if (!visited.has(child)) {
          parent.set(child, nodeId);
          const cycle = dfs(child);
          if (cycle) return cycle;
        } else if (recursionStack.has(child)) {
          // Found cycle, reconstruct path
          const cyclePath: string[] = [child];
          let current = nodeId;
          while (current !== child) {
            cyclePath.unshift(current);
            current = parent.get(current)!;
          }
          cyclePath.unshift(child);
          return cyclePath;
        }
      }

      recursionStack.delete(nodeId);
      return null;
    };

    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        const cycle = dfs(node.id);
        if (cycle) return cycle;
      }
    }

    return [];
  }

  /**
   * Compute execution waves for parallel processing
   * Each wave contains nodes that can execute simultaneously
   */
  private computeExecutionWaves(): ExecutionWave[] {
    const waves: ExecutionWave[] = [];
    const inDegree = new Map(this.inDegree);
    const executed = new Set<string>();

    while (executed.size < this.nodes.length) {
      const waveNodes: string[] = [];
      const dependencies = new Map<string, string[]>();

      // Find all nodes with in-degree 0 that haven't been executed
      for (const [nodeId, degree] of inDegree) {
        if (degree === 0 && !executed.has(nodeId)) {
          waveNodes.push(nodeId);

          // Record dependencies (already executed parents)
          const parents = this.reverseAdjacencyList.get(nodeId) || [];
          if (parents.length > 0) {
            dependencies.set(nodeId, parents.filter(p => executed.has(p)));
          }
        }
      }

      if (waveNodes.length === 0) {
        // This shouldn't happen in a valid DAG, but safety check
        break;
      }

      waves.push({
        waveIndex: waves.length,
        nodeIds: waveNodes,
        dependencies,
      });

      // Mark nodes as executed and update in-degrees
      for (const nodeId of waveNodes) {
        executed.add(nodeId);

        const children = this.adjacencyList.get(nodeId) || [];
        for (const child of children) {
          inDegree.set(child, (inDegree.get(child) || 0) - 1);
        }
      }
    }

    return waves;
  }

  /**
   * Compute depth of each node (longest path from any entry)
   */
  private computeNodeDepths(): Map<string, number> {
    const depths = new Map<string, number>();
    const entryNodes = this.findEntryNodes();

    // Initialize entry nodes with depth 0
    for (const nodeId of entryNodes) {
      depths.set(nodeId, 0);
    }

    // BFS to compute depths
    const queue = [...entryNodes];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depths.get(current) || 0;

      const children = this.adjacencyList.get(current) || [];
      for (const child of children) {
        const existingDepth = depths.get(child);
        const newDepth = currentDepth + 1;

        // Take the maximum depth (longest path)
        if (existingDepth === undefined || newDepth > existingDepth) {
          depths.set(child, newDepth);
        }

        // Only add to queue if all parents have been processed
        const parents = this.reverseAdjacencyList.get(child) || [];
        const allParentsProcessed = parents.every(p => depths.has(p));
        if (allParentsProcessed && !queue.includes(child)) {
          queue.push(child);
        }
      }
    }

    return depths;
  }

  /**
   * Find entry nodes (no incoming edges)
   */
  private findEntryNodes(): string[] {
    return this.nodes
      .filter(node => (this.inDegree.get(node.id) || 0) === 0)
      .map(node => node.id);
  }

  /**
   * Find exit nodes (no outgoing edges)
   */
  private findExitNodes(): string[] {
    return this.nodes
      .filter(node => (this.adjacencyList.get(node.id) || []).length === 0)
      .map(node => node.id);
  }

  /**
   * Find merge points (nodes with multiple incoming edges)
   */
  private findMergePoints(): string[] {
    return this.nodes
      .filter(node => (this.reverseAdjacencyList.get(node.id) || []).length > 1)
      .map(node => node.id);
  }

  /**
   * Find branch points (nodes with multiple outgoing edges)
   */
  private findBranchPoints(): string[] {
    return this.nodes
      .filter(node => (this.adjacencyList.get(node.id) || []).length > 1)
      .map(node => node.id);
  }

  /**
   * Get detailed info about merge points
   */
  getMergePointsInfo(): MergePointInfo[] {
    const mergePoints = this.findMergePoints();

    return mergePoints.map(nodeId => {
      const parentNodeIds = this.reverseAdjacencyList.get(nodeId) || [];

      // Generate branch IDs based on parent nodes
      const branchIds = parentNodeIds.map((parentId, index) => {
        const edge = this.edges.find(e => e.source === parentId && e.target === nodeId);
        return edge?.id || `branch-${parentId}-${index}`;
      });

      return {
        nodeId,
        incomingCount: parentNodeIds.length,
        parentNodeIds,
        branchIds,
      };
    });
  }

  /**
   * Analyze branches from a branch point to its merge points
   */
  analyzeBranches(branchPointId: string): BranchInfo[] {
    const children = this.adjacencyList.get(branchPointId) || [];
    const branches: BranchInfo[] = [];

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const branchNodes: string[] = [];
      let mergeNodeId: string | undefined;

      // DFS to find all nodes in this branch
      const visited = new Set<string>();
      const stack = [childId];

      while (stack.length > 0) {
        const current = stack.pop()!;

        if (visited.has(current)) continue;
        visited.add(current);

        // Check if this is a merge point
        const parents = this.reverseAdjacencyList.get(current) || [];
        if (parents.length > 1) {
          // This is where branches merge
          mergeNodeId = current;
          continue; // Don't add merge node to branch, don't continue past it
        }

        branchNodes.push(current);

        const nextChildren = this.adjacencyList.get(current) || [];
        stack.push(...nextChildren);
      }

      branches.push({
        branchId: `${branchPointId}-branch-${i}`,
        sourceNodeId: branchPointId,
        nodeIds: branchNodes,
        mergeNodeId,
      });
    }

    return branches;
  }

  /**
   * Get execution order for a specific node (all nodes that must complete before it)
   */
  getExecutionOrderFor(nodeId: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const dfs = (current: string) => {
      if (visited.has(current)) return;
      visited.add(current);

      const parents = this.reverseAdjacencyList.get(current) || [];
      for (const parent of parents) {
        dfs(parent);
      }

      if (current !== nodeId) {
        result.push(current);
      }
    };

    dfs(nodeId);
    return result;
  }

  /**
   * Check if nodeA must complete before nodeB
   */
  isAncestor(nodeA: string, nodeB: string): boolean {
    const visited = new Set<string>();

    const dfs = (current: string): boolean => {
      if (current === nodeA) return true;
      if (visited.has(current)) return false;
      visited.add(current);

      const parents = this.reverseAdjacencyList.get(current) || [];
      return parents.some(parent => dfs(parent));
    };

    return dfs(nodeB);
  }

  /**
   * Get all paths between two nodes
   */
  getAllPaths(startId: string, endId: string): string[][] {
    const paths: string[][] = [];

    const dfs = (current: string, path: string[]) => {
      if (current === endId) {
        paths.push([...path, current]);
        return;
      }

      const children = this.adjacencyList.get(current) || [];
      for (const child of children) {
        if (!path.includes(child)) {
          dfs(child, [...path, current]);
        }
      }
    };

    dfs(startId, []);
    return paths;
  }

  /**
   * Get the longest path in the graph (critical path)
   */
  getCriticalPath(): string[] {
    const { sortedNodes } = this.topologicalSort();
    if (sortedNodes.length === 0) return [];

    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();

    // Initialize
    for (const nodeId of sortedNodes) {
      distances.set(nodeId, this.inDegree.get(nodeId) === 0 ? 0 : -Infinity);
    }

    // Compute longest paths
    for (const nodeId of sortedNodes) {
      const currentDist = distances.get(nodeId)!;
      if (currentDist === -Infinity) continue;

      const children = this.adjacencyList.get(nodeId) || [];
      for (const child of children) {
        const newDist = currentDist + 1;
        if (newDist > (distances.get(child) || -Infinity)) {
          distances.set(child, newDist);
          predecessors.set(child, nodeId);
        }
      }
    }

    // Find the node with maximum distance
    let maxNode = sortedNodes[0];
    let maxDist = 0;
    for (const [nodeId, dist] of distances) {
      if (dist > maxDist) {
        maxDist = dist;
        maxNode = nodeId;
      }
    }

    // Reconstruct path
    const path: string[] = [maxNode];
    let current = maxNode;
    while (predecessors.has(current)) {
      current = predecessors.get(current)!;
      path.unshift(current);
    }

    return path;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a TopologicalSorter and perform analysis
 */
export function analyzeWorkflowDAG(
  nodes: Node[],
  edges: Edge[],
  config?: Partial<EdgeTypeConfig>
): DAGAnalysis {
  const sorter = new TopologicalSorter(nodes, edges, config);
  return sorter.analyze();
}

/**
 * Create a TopologicalSorter for extended analysis (loop handling, etc.)
 */
export function createTopologicalSorter(
  nodes: Node[],
  edges: Edge[],
  config?: Partial<EdgeTypeConfig>
): TopologicalSorter {
  return new TopologicalSorter(nodes, edges, config);
}

export default TopologicalSorter;
