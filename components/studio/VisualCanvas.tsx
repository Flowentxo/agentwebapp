'use client';

/**
 * VISUAL CANVAS
 *
 * Main canvas for building agent workflows with drag-and-drop
 *
 * Phase 22: Enhanced with connection validation, auto-layout, and interactive edges
 * - isValidConnection prop for real-time validation during drag
 * - Visual feedback for invalid connections
 * - Connection error toast notifications
 * - Auto-layout with Dagre engine
 * - Custom interactive edges with delete button and flow animation
 * - Quick-Add menu for edge drops (edge-to-empty-canvas)
 */

import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  Panel,
  ConnectionLineType,
  OnConnectEnd,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { DatabaseQueryNode } from './DatabaseQueryNode';
import { WebhookNode } from './WebhookNode';
import { CustomEdge, AnimatedEdge } from './edges/CustomEdge';
import { QuickAddMenu, QuickNodeTemplate } from './QuickAddMenu';
import { PublishWorkflowButton } from './PublishWorkflowButton';
import { NodeSelectorModal } from './selector/NodeSelectorModal';
import { NodeDefinition, nodeDefToModuleTemplate } from '@/lib/studio/node-definitions';
import { ModuleTemplate } from '@/lib/studio/types';
import { Workflow } from '@/lib/api/workflows-client';
import {
  Play,
  Save,
  Sparkles,
  Code2,
  Store,
  FileDown,
  Wrench,
  Database,
  History,
  AlertCircle,
  X,
  LayoutGrid,
  ArrowRightLeft,
  ArrowDownUp,
  Minimize2,
  Maximize2,
  ChevronDown,
  Plus,
  Search as SearchIcon,
} from 'lucide-react';
import { validateConnection } from '@/lib/studio/connection-validator';
import { cn } from '@/lib/utils';

interface VisualCanvasProps {
  onNodeSelect?: (node: Node | null) => void;
  onSave?: () => void;
  onOpenPreview?: () => void;
  onOpenVariables?: () => void;
  onOpenTemplates?: () => void;
  onOpenMarketplace?: () => void;
  onSaveAsTemplate?: () => void;
  onOpenToolRegistry?: () => void;
  onOpenConnections?: () => void;
  onOpenVersionHistory?: () => void;
  currentWorkflow?: Workflow | null;
  onPublish?: (changeDescription?: string) => Promise<void>;
  onArchive?: () => Promise<void>;
  onUnarchive?: () => Promise<void>;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  // Phase 22: Connection validation support
  onConnect?: (connection: Connection) => void;
  connectionError?: string | null;
  onClearConnectionError?: () => void;
  // Phase 22: Auto-layout support
  onAutoLayout?: () => void;
  onAutoLayoutHorizontal?: () => void;
  onAutoLayoutVertical?: () => void;
  onAutoLayoutCompact?: () => void;
  onAutoLayoutSpread?: () => void;
}

export function VisualCanvas({
  onNodeSelect,
  onSave,
  onOpenPreview,
  onOpenVariables,
  onOpenTemplates,
  onOpenMarketplace,
  onSaveAsTemplate,
  onOpenToolRegistry,
  onOpenConnections,
  onOpenVersionHistory,
  currentWorkflow,
  onPublish,
  onArchive,
  onUnarchive,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect: onConnectProp,
  connectionError,
  onClearConnectionError,
  onAutoLayout,
  onAutoLayoutHorizontal,
  onAutoLayoutVertical,
  onAutoLayoutCompact,
  onAutoLayoutSpread,
}: VisualCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Quick-Add Menu state (Phase 22)
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddPosition, setQuickAddPosition] = useState({ x: 0, y: 0 });

  // Node Selector Modal state (Phase 23 - n8n-style hierarchical node browser)
  const [nodeSelectorOpen, setNodeSelectorOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    source: string;
    sourceHandle: string | null;
  } | null>(null);
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);

  // Auto-dismiss connection error after 3 seconds
  useEffect(() => {
    if (connectionError) {
      const timeout = setTimeout(() => {
        onClearConnectionError?.();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [connectionError, onClearConnectionError]);

  // Keyboard shortcut: Cmd/Ctrl+K to open node selector (Phase 23)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setNodeSelectorOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoize nodeTypes to prevent React Flow re-renders (performance optimization)
  const nodeTypes = useMemo<NodeTypes>(() => ({
    custom: CustomNode,
    'database-query': DatabaseQueryNode,
    webhook: WebhookNode
  }), []);

  // Memoize edgeTypes for interactive edges (Phase 22)
  const edgeTypes = useMemo<EdgeTypes>(() => ({
    custom: CustomEdge,
    animated: AnimatedEdge,
    // Use custom edge as default for smoothstep
    smoothstep: CustomEdge,
  }), []);

  // NO internal state management - fully controlled component
  // React Flow will call onNodesChange/onEdgesChange with changes,
  // parent applies them and passes new nodes/edges back via props

  // ============================================
  // CONNECTION VALIDATION (Phase 22)
  // ============================================

  /**
   * Check if a connection is valid during drag
   * This provides real-time visual feedback
   */
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const result = validateConnection(connection, nodes, edges);
      return result.isValid;
    },
    [nodes, edges]
  );

  /**
   * Handle new connections with validation
   * Uses store onConnect if provided, otherwise creates edge directly
   */
  const handleConnect = useCallback(
    (params: Connection) => {
      // If parent provides onConnect (from store), use it
      if (onConnectProp) {
        onConnectProp(params);
        return;
      }

      // Fallback: Create edge directly (legacy behavior)
      const newEdge: Edge = {
        ...params,
        id: `${params.source}-${params.target}-${Date.now()}`,
        type: 'custom',
        animated: true,
        style: { stroke: 'rgb(var(--accent))' }
      } as Edge;

      onEdgesChange([
        {
          type: 'add',
          item: newEdge
        }
      ]);
    },
    [onConnectProp, onEdgesChange]
  );

  // ============================================
  // QUICK-ADD MENU HANDLERS (Phase 22)
  // ============================================

  /**
   * Track when edge dragging starts
   */
  const onConnectStart = useCallback(
    (_: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null }) => {
      connectingNodeId.current = params.nodeId;
      connectingHandleId.current = params.handleId;
    },
    []
  );

  /**
   * Handle edge drop - show Quick-Add menu if dropped on empty canvas
   */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!reactFlowInstance) return;

      // Get the target element
      const targetElement = event.target as HTMLElement;

      // Check if dropped on empty canvas (not on a node or handle)
      const isOnPane = targetElement.classList.contains('react-flow__pane');
      const isOnBackground = targetElement.classList.contains('react-flow__background');
      const isOnEmpty = isOnPane || isOnBackground || targetElement.closest('.react-flow__pane');

      if (isOnEmpty && connectingNodeId.current) {
        // Get mouse/touch position
        let clientX: number, clientY: number;
        if ('touches' in event) {
          clientX = event.touches[0]?.clientX || 0;
          clientY = event.touches[0]?.clientY || 0;
        } else {
          clientX = event.clientX;
          clientY = event.clientY;
        }

        // Store the pending connection
        setPendingConnection({
          source: connectingNodeId.current,
          sourceHandle: connectingHandleId.current,
        });

        // Show Quick-Add menu at drop position
        setQuickAddPosition({ x: clientX, y: clientY });
        setQuickAddMenuOpen(true);
      }

      // Reset refs
      connectingNodeId.current = null;
      connectingHandleId.current = null;
    },
    [reactFlowInstance]
  );

  /**
   * Handle Quick-Add node selection
   */
  const handleQuickAddSelect = useCallback(
    (nodeTemplate: QuickNodeTemplate) => {
      if (!reactFlowInstance || !pendingConnection) return;

      // Convert screen position to flow position
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: quickAddPosition.x,
        y: quickAddPosition.y,
      });

      // Create the new node
      const newNodeId = `${nodeTemplate.id}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: 'custom',
        position: flowPosition,
        data: {
          label: nodeTemplate.label,
          description: nodeTemplate.description,
          icon: nodeTemplate.icon,
          color: nodeTemplate.color,
          type: nodeTemplate.type,
          enabled: true,
        },
      };

      // Add the node
      onNodesChange([
        {
          type: 'add',
          item: newNode,
        },
      ]);

      // Create the edge connecting source to new node
      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${pendingConnection.sourceHandle || 'output'}-${newNodeId}-input-${Date.now()}`,
        source: pendingConnection.source,
        sourceHandle: pendingConnection.sourceHandle,
        target: newNodeId,
        targetHandle: 'input',
        type: 'custom',
        animated: true,
        data: {
          sourceHandle: pendingConnection.sourceHandle || 'output',
          targetHandle: 'input',
        },
      };

      onEdgesChange([
        {
          type: 'add',
          item: newEdge,
        },
      ]);

      // Close menu and reset
      setQuickAddMenuOpen(false);
      setPendingConnection(null);
    },
    [reactFlowInstance, pendingConnection, quickAddPosition, onNodesChange, onEdgesChange]
  );

  /**
   * Close Quick-Add menu
   */
  const handleQuickAddClose = useCallback(() => {
    setQuickAddMenuOpen(false);
    setPendingConnection(null);
  }, []);

  // ============================================
  // NODE SELECTOR MODAL HANDLERS (Phase 23)
  // ============================================

  /**
   * Handle node selection from the hierarchical modal
   */
  const handleNodeSelectorSelect = useCallback(
    (nodeDef: NodeDefinition) => {
      if (!reactFlowInstance) return;

      // Calculate center position of viewport
      const viewport = reactFlowInstance.getViewport();
      const { width, height } = reactFlowWrapper.current?.getBoundingClientRect() || { width: 800, height: 600 };

      const centerX = (-viewport.x + width / 2) / viewport.zoom;
      const centerY = (-viewport.y + height / 2) / viewport.zoom;

      // Offset slightly based on existing nodes to avoid overlap
      const offset = nodes.length * 20;

      // Determine node type based on definition
      let nodeType = 'custom';
      if (nodeDef.id === 'database-query') {
        nodeType = 'database-query';
      } else if (nodeDef.id === 'webhook-trigger') {
        nodeType = 'webhook';
      }

      // Create the new node
      const newNode: Node = {
        id: `${nodeDef.id}-${Date.now()}`,
        type: nodeType,
        position: { x: centerX + offset, y: centerY + offset },
        data: {
          ...(nodeDef.defaults || {}),
          label: nodeDef.name,
          description: nodeDef.description,
          icon: nodeDef.icon,
          color: nodeDef.color,
          type: nodeDef.category === 'triggers' ? 'trigger' :
                nodeDef.category === 'ai' ? 'agent' :
                nodeDef.category === 'flow' ? 'logic' :
                nodeDef.category === 'data' ? 'action' :
                'action',
          enabled: true,
          nodeDefinition: nodeDef, // Store the full definition for config panel
        },
      };

      // Add the node
      onNodesChange([
        {
          type: 'add',
          item: newNode,
        },
      ]);

      // Select the new node
      setSelectedNode(newNode);
      onNodeSelect?.(newNode);

      // Close the modal
      setNodeSelectorOpen(false);
    },
    [reactFlowInstance, nodes.length, onNodesChange, onNodeSelect]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop - create new node
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const moduleData = event.dataTransfer.getData('application/reactflow');

      if (!moduleData) return;

      const module: ModuleTemplate = JSON.parse(moduleData);
      // FIXED: Use screenToFlowPosition instead of deprecated project()
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      // Determine node type based on module type
      let nodeType = 'custom';
      if (module.type === 'database-query') {
        nodeType = 'database-query';
      } else if (module.type === 'webhook') {
        nodeType = 'webhook';
      }

      const newNode: Node = {
        id: `${module.id}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          ...module.defaultConfig,
          label: module.name,
          description: module.description,
          icon: module.icon,
          color: module.color,
          enabled: true
        }
      };

      // Notify parent via node change (add)
      onNodesChange([
        {
          type: 'add',
          item: newNode
        }
      ]);
    },
    [reactFlowInstance, onNodesChange]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.();
  }, [onSave]);

  return (
    <div ref={reactFlowWrapper} className="h-full w-full relative bg-background canvas-dot-pattern">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'custom',
          animated: true,
          style: { strokeWidth: 2 }
        }}
      >
        {/* Background Pattern */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="hsl(214 32% 91%)"
        />

        {/* Mini Map */}
        <MiniMap
          nodeColor={(node) => {
            return (node.data as any).color || '#6366F1';
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          style={{
            background: 'hsl(0 0% 100%)',
            border: '1px solid hsl(214 32% 91%)',
            borderRadius: '12px'
          }}
        />

        {/* Controls */}
        <Controls
          showInteractive={false}
          style={{
            background: 'hsl(0 0% 100%)',
            border: '1px solid hsl(214 32% 91%)',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}
        />

        {/* Floating Add Node Button (Phase 23) */}
        <Panel position="top-left" className="ml-4">
          <button
            onClick={() => setNodeSelectorOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            Add Node
          </button>
        </Panel>

        {/* Top Toolbar */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={onOpenMarketplace}
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 shadow-sm"
          >
            <Store className="h-4 w-4" />
            Marketplace
          </button>

          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Templates
          </button>

          <button
            onClick={onOpenVariables}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
          >
            <Code2 className="h-4 w-4" />
            Variables
          </button>

          <button
            onClick={onOpenConnections}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
          >
            <Database className="h-4 w-4" />
            Connections
          </button>

          <button
            onClick={onOpenToolRegistry}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
          >
            <Wrench className="h-4 w-4" />
            Tools
          </button>

          {/* Auto-Layout Dropdown (Phase 22) */}
          {onAutoLayout && (
            <div className="relative">
              <button
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                disabled={nodes.length < 2}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                  showLayoutMenu && "bg-muted"
                )}
                title="Arrange Workflow"
              >
                <LayoutGrid className="h-4 w-4" />
                Arrange
                <ChevronDown className={cn("h-3 w-3 transition-transform", showLayoutMenu && "rotate-180")} />
              </button>

              {/* Dropdown Menu */}
              {showLayoutMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setShowLayoutMenu(false)}
                >
                  <button
                    onClick={() => {
                      onAutoLayoutHorizontal?.();
                      setShowLayoutMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    <span>Horizontal (L→R)</span>
                  </button>
                  <button
                    onClick={() => {
                      onAutoLayoutVertical?.();
                      setShowLayoutMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                    <span>Vertical (T→B)</span>
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => {
                      onAutoLayoutCompact?.();
                      setShowLayoutMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Minimize2 className="h-4 w-4 text-muted-foreground" />
                    <span>Compact</span>
                  </button>
                  <button
                    onClick={() => {
                      onAutoLayoutSpread?.();
                      setShowLayoutMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                    <span>Spread</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
          >
            <Save className="h-4 w-4" />
            Save
          </button>

          <button
            onClick={onSaveAsTemplate}
            disabled={nodes.length === 0}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save as Template"
          >
            <FileDown className="h-4 w-4" />
            Save as Template
          </button>

          {/* Version History Button */}
          {currentWorkflow && (
            <button
              onClick={onOpenVersionHistory}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
              title="Version History"
            >
              <History className="h-4 w-4" />
              Versions
            </button>
          )}

          {/* Publish/Deploy Status */}
          {currentWorkflow && onPublish && onArchive && onUnarchive && (
            <PublishWorkflowButton
              workflowId={currentWorkflow.id}
              currentStatus={currentWorkflow.status}
              workflowName={currentWorkflow.name}
              hasUnsavedChanges={false}
              onPublish={onPublish}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          )}

          <button
            onClick={onOpenPreview}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 shadow-sm"
          >
            <Play className="h-4 w-4" />
            Test Run
          </button>
        </Panel>

        {/* Empty State */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="pointer-events-auto">
            <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-6 text-center shadow-lg max-w-lg">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start Building Your Workflow
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add nodes from the library to create your automation workflow.
                Connect nodes to define the flow of data and actions.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setNodeSelectorOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:from-purple-700 hover:to-indigo-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add First Node
                </button>
                <span className="text-muted-foreground text-sm">or</span>
                <button
                  onClick={onOpenTemplates}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Use Template
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <SearchIcon className="h-3 w-3" />
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Cmd+K</kbd> for quick search
              </p>
            </div>
          </Panel>
        )}

        {/* Node Count */}
        <Panel position="bottom-left" className="bg-card rounded-xl border border-border px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">
            {nodes.length} module{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}
          </p>
        </Panel>

        {/* Connection Error Toast (Phase 22) */}
        {connectionError && (
          <Panel position="bottom-center">
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 shadow-lg animate-in slide-in-from-bottom-2 duration-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{connectionError}</p>
              <button
                onClick={onClearConnectionError}
                className="ml-2 p-1 rounded-full hover:bg-red-500/20 transition-colors"
              >
                <X className="h-3 w-3 text-red-500" />
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Quick-Add Menu (Phase 22) */}
      <QuickAddMenu
        position={quickAddPosition}
        onSelectNode={handleQuickAddSelect}
        onClose={handleQuickAddClose}
        isOpen={quickAddMenuOpen}
      />

      {/* Node Selector Modal (Phase 23 - n8n-style hierarchical browser) */}
      <NodeSelectorModal
        isOpen={nodeSelectorOpen}
        onClose={() => setNodeSelectorOpen(false)}
        onSelectNode={handleNodeSelectorSelect}
      />
    </div>
  );
}
