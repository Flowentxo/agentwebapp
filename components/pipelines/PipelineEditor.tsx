'use client';

/**
 * PipelineEditor - Visual Workflow Editor
 *
 * A full-featured visual editor using React Flow (xyflow) for building
 * AI automation pipelines with drag-and-drop support.
 *
 * Features:
 * - Drag & Drop nodes from sidebar
 * - Custom node types (Trigger, Agent, Action)
 * - Zoom/Pan controls with MiniMap
 * - Save workflow as JSON
 *
 * @version 1.0.0
 */

import { useState, useCallback, useMemo, useRef, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Bot,
  Code,
  Mail,
  Database,
  Globe,
  Webhook,
  Clock,
  Play,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  CheckCircle,
  FileText,
  Settings,
  Trash2,
  Undo,
  Redo,
} from 'lucide-react';

// Import custom nodes
import { TriggerNode } from './nodes/TriggerNode';
import { AgentNode } from './nodes/AgentNode';
import { ActionNode } from './nodes/ActionNode';

// ============================================================================
// TYPES
// ============================================================================

interface PipelineEditorProps {
  workflowId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

interface DraggableNodeType {
  type: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  category: 'trigger' | 'agent' | 'action';
  defaultData?: Record<string, unknown>;
}

// ============================================================================
// DRAGGABLE NODE TYPES
// ============================================================================

const DRAGGABLE_NODES: DraggableNodeType[] = [
  // Triggers
  {
    type: 'trigger',
    label: 'Webhook',
    icon: Webhook,
    color: '#22C55E',
    description: 'HTTP-Anfrage als Trigger',
    category: 'trigger',
    defaultData: { label: 'Webhook Trigger', subType: 'webhook' },
  },
  {
    type: 'trigger',
    label: 'Schedule',
    icon: Clock,
    color: '#F59E0B',
    description: 'Zeitbasierter Trigger',
    category: 'trigger',
    defaultData: { label: 'Scheduled Trigger', subType: 'schedule' },
  },
  {
    type: 'trigger',
    label: 'Manual',
    icon: Play,
    color: '#10B981',
    description: 'Manueller Start',
    category: 'trigger',
    defaultData: { label: 'Manual Trigger', subType: 'manual' },
  },
  // Agents
  {
    type: 'agent',
    label: 'Dexter',
    icon: Bot,
    color: '#3B82F6',
    description: 'Data Analyst Agent',
    category: 'agent',
    defaultData: { label: 'Dexter - Data Analysis', agentId: 'dexter' },
  },
  {
    type: 'agent',
    label: 'Cassie',
    icon: Bot,
    color: '#EC4899',
    description: 'Customer Support Agent',
    category: 'agent',
    defaultData: { label: 'Cassie - Support', agentId: 'cassie' },
  },
  {
    type: 'agent',
    label: 'Emmie',
    icon: Bot,
    color: '#8B5CF6',
    description: 'Email Manager Agent',
    category: 'agent',
    defaultData: { label: 'Emmie - Email', agentId: 'emmie' },
  },
  {
    type: 'agent',
    label: 'Kai',
    icon: Bot,
    color: '#06B6D4',
    description: 'Code Assistant Agent',
    category: 'agent',
    defaultData: { label: 'Kai - Code', agentId: 'kai' },
  },
  // Actions
  {
    type: 'action',
    label: 'HTTP Request',
    icon: Globe,
    color: '#A855F7',
    description: 'API-Aufruf ausführen',
    category: 'action',
    defaultData: { label: 'HTTP Request', subType: 'http' },
  },
  {
    type: 'action',
    label: 'Database',
    icon: Database,
    color: '#F97316',
    description: 'Datenbank-Query',
    category: 'action',
    defaultData: { label: 'Database Query', subType: 'database' },
  },
  {
    type: 'action',
    label: 'Send Email',
    icon: Mail,
    color: '#EF4444',
    description: 'E-Mail versenden',
    category: 'action',
    defaultData: { label: 'Send Email', subType: 'email' },
  },
  {
    type: 'action',
    label: 'End',
    icon: CheckCircle,
    color: '#10B981',
    description: 'Workflow beenden',
    category: 'action',
    defaultData: { label: 'End', subType: 'end' },
  },
];

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

interface NodeSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

function NodeSidebar({ isCollapsed, onToggle }: NodeSidebarProps) {
  const onDragStart = (event: DragEvent, nodeType: DraggableNodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const groupedNodes = useMemo(() => {
    const groups: Record<string, DraggableNodeType[]> = {
      trigger: [],
      agent: [],
      action: [],
    };
    DRAGGABLE_NODES.forEach((node) => {
      groups[node.category].push(node);
    });
    return groups;
  }, []);

  return (
    <motion.div
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 48 : 280 }}
      transition={{ duration: 0.2 }}
      className="h-full bg-zinc-900/80 backdrop-blur-sm border-r border-zinc-800 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        {!isCollapsed && (
          <h3 className="text-sm font-semibold text-white">Node-Bibliothek</h3>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Node Categories */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Triggers */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Triggers
            </h4>
            <div className="space-y-2">
              {groupedNodes.trigger.map((node) => (
                <DraggableNode key={node.label} node={node} onDragStart={onDragStart} />
              ))}
            </div>
          </div>

          {/* Agents */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
              <Bot className="w-3 h-3" />
              AI Agents
            </h4>
            <div className="space-y-2">
              {groupedNodes.agent.map((node) => (
                <DraggableNode key={node.label} node={node} onDragStart={onDragStart} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Code className="w-3 h-3" />
              Actions
            </h4>
            <div className="space-y-2">
              {groupedNodes.action.map((node) => (
                <DraggableNode key={node.label} node={node} onDragStart={onDragStart} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed Icons */}
      {isCollapsed && (
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {DRAGGABLE_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.label}
                draggable
                onDragStart={(e) => onDragStart(e, node)}
                className="p-2 mx-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 cursor-grab active:cursor-grabbing transition-colors"
                style={{ borderLeft: `3px solid ${node.color}` }}
                title={node.label}
              >
                <Icon className="w-4 h-4 text-zinc-300" />
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// Draggable Node Item
function DraggableNode({
  node,
  onDragStart,
}: {
  node: DraggableNodeType;
  onDragStart: (event: DragEvent, node: DraggableNodeType) => void;
}) {
  const Icon = node.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node)}
      className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 cursor-grab active:cursor-grabbing transition-all"
    >
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: `${node.color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: node.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{node.label}</p>
        <p className="text-[10px] text-zinc-500 truncate">{node.description}</p>
      </div>
      <GripVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ============================================================================
// MAIN EDITOR COMPONENT
// ============================================================================

function PipelineEditorInner({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  readOnly = false,
}: PipelineEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Custom node types - memoized for performance
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      trigger: TriggerNode,
      agent: AgentNode,
      action: ActionNode,
    }),
    []
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `${params.source}-${params.target}-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366F1', strokeWidth: 2 },
      } as Edge;
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle drag over
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop - create new node
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data || !reactFlowInstance || !reactFlowWrapper.current) return;

      const nodeType: DraggableNodeType = JSON.parse(data);
      const bounds = reactFlowWrapper.current.getBoundingClientRect();

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: `${nodeType.type}-${Date.now()}`,
        type: nodeType.type,
        position,
        data: {
          ...nodeType.defaultData,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Handle save
  const handleSave = useCallback(() => {
    console.log('=== Pipeline Saved ===');
    console.log('Nodes:', JSON.stringify(nodes, null, 2));
    console.log('Edges:', JSON.stringify(edges, null, 2));

    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  // Delete selected node
  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
      );
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      {!readOnly && (
        <NodeSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 relative">
        {/* Top Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Save className="w-4 h-4" />
              Speichern
            </button>
            {selectedNode && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            )}
          </div>

          {/* Right Info */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-zinc-800/80 rounded-lg text-xs text-zinc-400">
              {nodes.length} Nodes • {edges.length} Connections
            </div>
            <div className="px-3 py-1.5 bg-zinc-800/80 rounded-lg text-xs text-zinc-400">
              {workflowId ? `ID: ${workflowId.slice(0, 8)}...` : 'Neuer Workflow'}
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366F1', strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#27272a"
          />
          <Controls
            className="!bg-zinc-900 !border-zinc-700 !rounded-xl !shadow-lg"
            showZoom
            showFitView
            showInteractive={false}
          />
          <MiniMap
            className="!bg-zinc-900 !border-zinc-700 !rounded-xl"
            nodeColor={(node) => {
              switch (node.type) {
                case 'trigger':
                  return '#22C55E';
                case 'agent':
                  return '#3B82F6';
                case 'action':
                  return '#A855F7';
                default:
                  return '#6B7280';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
          />
        </ReactFlow>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                <Zap className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Starte mit deinem Workflow
              </h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                Ziehe Nodes aus der linken Sidebar auf den Canvas,
                um deinen ersten Automatisierungs-Workflow zu erstellen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider for drag & drop
export function PipelineEditor(props: PipelineEditorProps) {
  return (
    <ReactFlowProvider>
      <PipelineEditorInner {...props} />
    </ReactFlowProvider>
  );
}

export default PipelineEditor;
